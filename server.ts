import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Health check routes for Cloud Run deployment health checks & uptime monitors
app.get(["/api/health", "/health", "/_health", "/_ah/health", "/healthz"], (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Force JSON parsing with increased payload limits for images and PDFs
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

import * as XLSX from "xlsx";
import JSZip from "jszip";

// Core function to extract content from .docx
async function extractTextFromDocx(base64Data: string): Promise<string> {
  const cleanBase64 = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
  const buffer = Buffer.from(cleanBase64, "base64");
  
  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    return "";
  }
  
  const xmlText = await docXmlFile.async("string");
  const paragraphs: string[] = [];
  
  // Parse paragraphs <w:p>...</w:p>
  const wPRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let match;
  while ((match = wPRegex.exec(xmlText)) !== null) {
    const paragraphXml = match[1];
    const wTRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let textMatch;
    let paragraphText = "";
    while ((textMatch = wTRegex.exec(paragraphXml)) !== null) {
      let runText = textMatch[1];
      runText = runText
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      paragraphText += runText;
    }
    if (paragraphText.trim()) {
      paragraphs.push(paragraphText.trim());
    }
  }
  
  if (paragraphs.length === 0) {
    // Direct backup fallback matching any xml text block
    const wTRegexDirect = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let tMatch;
    while ((tMatch = wTRegexDirect.exec(xmlText)) !== null) {
      paragraphs.push(tMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"));
    }
  }
  
  return paragraphs.join("\n");
}

// Core function to extract content from .pptx
async function extractTextFromPptx(base64Data: string): Promise<string> {
  const cleanBase64 = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
  const buffer = Buffer.from(cleanBase64, "base64");
  
  const zip = await JSZip.loadAsync(buffer);
  
  // Find all slide XML files
  const slideFiles = Object.keys(zip.files).filter(path => 
    path.startsWith("ppt/slides/slide") && path.endsWith(".xml")
  );
  
  // Sort slide files numerically
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
    return numA - numB;
  });
  
  let extractedText = "";
  
  for (const slidePath of slideFiles) {
    const slideFile = zip.file(slidePath);
    if (!slideFile) continue;
    
    const xmlText = await slideFile.async("string");
    const slideNumber = slidePath.replace(/[^0-9]/g, "");
    
    extractedText += `\n--- Slide ${slideNumber} ---\n`;
    
    // Match all text elements inside <a:t>...</a:t>
    const aTRegex = /<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/g;
    let match;
    const slideTexts: string[] = [];
    while ((match = aTRegex.exec(xmlText)) !== null) {
      const tText = match[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
      if (tText.trim()) {
        slideTexts.push(tText.trim());
      }
    }
    extractedText += slideTexts.join("  ") + "\n";
  }
  
  return extractedText;
}

// Core function to extract Excel and CSV content
function extractTextFromExcel(base64Data: string): string {
  const cleanBase64 = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
  const buffer = Buffer.from(cleanBase64, "base64");
  
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let extractedText = "";
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    if (csv && csv.trim()) {
      extractedText += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
    }
  });
  
  return extractedText;
}

// Advanced fallback pattern parsing to extract readable string fragments from binary blobs (.doc, .ppt, .xls)
function extractCleanTextFromBinary(buffer: Buffer): string {
  const textUtf16 = buffer.toString("utf16le");
  const textUtf8 = buffer.toString("utf8");
  
  // Match contiguous words of Cambodia Khmer (Unicode 0x1780 to 0x17FF) or English alphanumeric strings
  const cleanRegex = /[\u1780-\u17FFa-zA-Z0-9\s.,!?()\-+=]{4,}/g;
  
  const matches16 = textUtf16.match(cleanRegex) || [];
  const matches8 = textUtf8.match(cleanRegex) || [];
  
  const words16 = matches16.filter(w => w.trim().length > 6).join(" ");
  const words8 = matches8.filter(w => w.trim().length > 6).join("\n");
  
  return words16.length > words8.length ? words16 : words8;
}

// Robust JSON parsing helper that extracts JSON from markdown fences or surrounding text
function cleanAndParseJson<T = any>(rawText: string, fallback: T): T {
  if (!rawText || !rawText.trim()) return fallback;
  const trimmed = rawText.trim();
  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return fallback;
  }
}

// API route to proxy Gemini API call
app.post("/api/generate-questions", async (req, res) => {
  const { 
    lessonText, 
    count = 25, 
    images, 
    pdfs, 
    officeFiles, 
    questionType = 'general', 
    pisaLanguage = 'khmer', 
    categoryCounts,
    grade = '',
    subject = '',
    chapter = '',
    lesson = '',
    topic = '',
    bloomLevel = 'all',
    difficulty = 'medium',
    points = 2,
    includeExplanation = true,
    customInstructions = ''
  } = req.body;
  
  // Extract API key dynamically from request headers or use environment variable
  const clientApiKey = (req.headers["x-api-key"] as string || "").trim();
  const activeApiKey = clientApiKey || process.env.GEMINI_API_KEY || "";

  if (!activeApiKey) {
    return res.status(400).json({ 
      error: "សូមបញ្ចូលសោរ API Key របស់អ្នកជាមុនសិន! (Please enter your Gemini API Key first before generating questions)" 
    });
  }

  // Local instance using the resolved API Key
  const activeAi = new GoogleGenAI({
    apiKey: activeApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const hasText = lessonText && lessonText.trim().length > 0;
  const hasImages = images && Array.isArray(images) && images.length > 0;
  const hasPdfs = pdfs && Array.isArray(pdfs) && pdfs.length > 0;
  const hasOffice = officeFiles && Array.isArray(officeFiles) && officeFiles.length > 0;

  if (!hasText && !hasImages && !hasPdfs && !hasOffice && !subject && !topic) {
    return res.status(400).json({ 
      error: "ខ្លឹមសារមេរៀន មុខវិជ្ជា រូបភាព ឯកសារ PDF ឬឯកសារការិយាល័យតម្រូវឱ្យបញ្ចូលយ៉ាងហោចណាស់មួយ (Please provide lesson topic, text, images, PDF, or Office files)" 
    });
  }

  // Extract text from Office documents if any
  let extractedOfficeText = "";
  if (hasOffice) {
    for (const file of officeFiles) {
      const fileName = file.name || "Document";
      const mimeType = file.mimeType || "";
      const base64Data = file.data || "";
      
      try {
        if (fileName.toLowerCase().endsWith(".docx") || mimeType.includes("wordprocessingml") || mimeType === "application/docx") {
          const text = await extractTextFromDocx(base64Data);
          extractedOfficeText += `\n[Extracted from Word: ${fileName}]\n${text}\n`;
        } else if (fileName.toLowerCase().endsWith(".pptx") || mimeType.includes("presentationml") || mimeType === "application/pptx") {
          const text = await extractTextFromPptx(base64Data);
          extractedOfficeText += `\n[Extracted from PowerPoint: ${fileName}]\n${text}\n`;
        } else if (
          fileName.toLowerCase().endsWith(".xlsx") || 
          fileName.toLowerCase().endsWith(".xls") || 
          fileName.toLowerCase().endsWith(".csv") || 
          mimeType.includes("spreadsheet") || 
          mimeType.includes("excel") || 
          mimeType.includes("csv")
        ) {
          const text = extractTextFromExcel(base64Data);
          extractedOfficeText += `\n[Extracted from Sheet: ${fileName}]\n${text}\n`;
        } else {
          // Fallback parsing (e.g. .doc, .ppt, .xls, .txt, etc.)
          const cleanBase64 = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
          const buffer = Buffer.from(cleanBase64, "base64");
          
          if (fileName.toLowerCase().endsWith(".txt")) {
            const text = buffer.toString("utf8");
            extractedOfficeText += `\n[Extracted from Text File: ${fileName}]\n${text}\n`;
          } else {
            const text = extractCleanTextFromBinary(buffer);
            if (text.trim().length > 10) {
              extractedOfficeText += `\n[Extracted from Doc File: ${fileName}]\n${text}\n`;
            }
          }
        }
      } catch (err) {
        console.error(`Failed to extract text from ${fileName}:`, err);
      }
    }
  }

  const isPisa = questionType === 'pisa';
  const isBilingual = pisaLanguage === 'bilingual';
  const isEnglish = pisaLanguage === 'english';

  let languagePrompt = `The language of the output questions and options must be in Khmer language, matching the Cambodian curriculum context.`;
  if (isEnglish) {
    languagePrompt = `CRITICAL LANGUAGE REQUIREMENT: Your output questions, options, and explanations MUST be written entirely in English language because this is an international standard evaluation. Do not use Khmer. Everything must be high-quality, clear, correct academic English translation.`;
  } else if (isBilingual) {
    languagePrompt = `CRITICAL LANGUAGE REQUIREMENT: Your output questions, options, and explanations MUST have both Khmer and English side-by-side (English support) because this is an international standard evaluation. For every question text, each option, and explanation text, write the Khmer text first, immediately followed by the English translation in parentheses. Example format:
- Question: "តើអ្វីទៅជាប្រភពថាមពលចម្បងរបស់ផែនដី? (What is the main energy source of the Earth?)"
- Options:
  1. "ព្រះអាទិត្យ (The Sun)"
  2. "ធ្យូងថ្ម (Coal)"
  3. "ខ្យល់ (Wind)"
  4. "ប្រេងកាត (Petroleum)"
- Explanation: "ព្រះអាទិត្យគឺជាប្រភពថាមពលចម្បងដោយសារ... (The sun is the main source of energy because...)"
Make sure everything including the options represents exact equivalent translations so that students can understand both Khmer and English.`;
  }

  // Handle specific category counts requested by the user
  let categoryRatiosPrompt = "";
  let totalRequestedCount = count || 25;

  if (categoryCounts) {
    const { 
      choice = 0, 
      matching = 0, 
      fill_blank = 0, 
      theory = 0, 
      exercise = 0 
    } = categoryCounts;
    
    totalRequestedCount = choice + matching + fill_blank + theory + exercise;
    if (totalRequestedCount === 0) {
      totalRequestedCount = 10;
    }

    categoryRatiosPrompt = `
CRITICAL QUANTITY AND CATEGORY REQUIREMENTS:
You MUST generate exactly the following quantities of questions for each category:
- Category "choice" (Multiple choice questions / សំណួរ គូសធីច): ${choice} questions.
- Category "matching" (Matching columns A & B / សំណួរ ផ្គូផ្គង សំណួរ-ចម្លើយ): ${matching} questions.
- Category "fill_blank" (Fill in blanks / សំណួរ បំពេញចន្លោះ): ${fill_blank} questions.
- Category "theory" (General theory & daily life lessons / សំណួរ ទូទៅទ្រឹស្ដី និងការរស់នៅអំពីមេរៀន): ${theory} questions.
- Category "exercise" (Calculations or essays / លំហាត់): ${exercise} questions.

For each generated question, set its "category" field strictly to the corresponding string key: "choice", "matching", "fill_blank", "theory", or "exercise".
Total number of questions to generate under these constraints is exactly ${totalRequestedCount}.
`;
  }

  const bloomPrompt = bloomLevel && bloomLevel !== 'all' 
    ? `BLOOM'S TAXONOMY LEVEL: Strictly generate questions targeting Bloom's Level: ${bloomLevel.toUpperCase()} (Remember, Understand, Apply, Analyze, Evaluate, or Create).` 
    : `BLOOM'S TAXONOMY LEVEL: Provide a balanced progression across Bloom's Taxonomy Levels:
- Level 1 — Remember (កំណត់, រំលឹក, រាយ, សម្គាល់)
- Level 2 — Understand (ពន្យល់, បកស្រាយ, ប្រៀបធៀប, សង្ខេប)
- Level 3 — Apply (គណនា, អនុវត្ត, ប្រើរូបមន្ត, ដោះស្រាយបញ្ហា)
- Level 4 — Analyze (វិភាគ, បែងចែក, រកមូលហេតុ, រកទំនាក់ទំនង)
- Level 5 — Evaluate (វាយតម្លៃ, បង្ហាញហេតុផល, ជ្រើសរើសដោយមានភស្តុតាង)
- Level 6 — Create (បង្កើត, រចនា, ផ្តល់ដំណោះស្រាយ, គម្រោង STEM)`;

  const questionTypeDescription = (questionType === 'all_mixed' || questionType === 'mixed' || questionType === 'all')
    ? 'ចម្រុះគ្រប់ប្រភេទទាំងអស់ (Mixed Assessment Types: Balanced combination of QCM/MCQ, True/False, Short Answer, Problem Solving, Application & Scenario, HOTS, PISA-style, and STEM projects)'
    : questionType;

  const masterPromptText = `
# SYSTEM IDENTITY & ROLE:
អ្នកគឺជា "AI Educational Assessment Expert សម្រាប់កម្មវិធីសិក្សាកម្ពុជា" (Cambodian MoEYS Curriculum Assessment Expert).
ភារកិច្ចរបស់អ្នកគឺបង្កើត សំណួរ ចម្លើយ លំហាត់ QCM/MCQ, True/False, Short Answer, Problem Solving, Application, HOTS, PISA-style និង STEM questions ស្របតាមកម្មវិធីសិក្សា និងឯកសារផ្លូវការរបស់ក្រសួងអប់រំ យុវជន និងកីឡា (MoEYS Cambodia: https://sala.moeys.gov.kh/).

# 1. ព័ត៌មាននៃការបង្កើត (INPUT CONTEXT):
- ថ្នាក់ទី (Grade): ${grade || 'គ្រប់កម្រិតថ្នាក់ MoEYS'}
- មុខវិជ្ជា (Subject): ${subject || 'មុខវិជ្ជាទូទៅ'}
- ជំពូក (Chapter): ${chapter || 'ជំពូកពាក់ព័ន្ធ'}
- មេរៀន (Lesson): ${lesson || 'មេរៀនពាក់ព័ន្ធ'}
- ប្រធានបទ (Topic): ${topic || 'ប្រធានបទគោល'}
- ចំនួនសំណួរដែលត្រូវបង្កើត (Total Count): ${totalRequestedCount} សំណួរ
- ប្រភេទសំណួរ (Question Type): ${questionTypeDescription}
- កម្រិតលំបាក (Difficulty): ${difficulty}
- ពិន្ទុក្នុងមួយសំណួរ (Points): ${points} ពិន្ទុ
- បង្ហាញដំណោះស្រាយលម្អិត (Include Step-by-Step Solutions): ${includeExplanation ? 'Yes' : 'No'}
${customInstructions ? `- ការណែនាំបន្ថែមពិសេសពីគ្រូ (Custom Teacher Directive): ${customInstructions}` : ''}

# 2. ប្រភពចំណេះដឹងដែលត្រូវគោរពតាមលំដាប់អាទិភាព៖
1. កម្មវិធីសិក្សាលម្អិតរបស់ក្រសួងអប់រំ យុវជន និងកីឡា (MoEYS Detailed Curriculum)
2. សៀវភៅសិក្សាគោលរបស់ក្រសួង (Official MoEYS Textbooks)
3. សៀវភៅគ្រូ / Teacher Guide
4. ឯកសារពិសោធន៍ និងឯកសារ STEM របស់ MoEYS
5. ឯកសារសំណួរ និងការវាយតម្លៃ PISA របស់ MoEYS (https://sala.moeys.gov.kh/)

${bloomPrompt}

# 3. គោលការណ៍តាមមុខវិជ្ជាជាក់លាក់ (SUBJECT-SPECIFIC RULES):
- គណិតវិទ្យា (Math): បង្ហាញ Given (បម្រាប់), Formula (រូបមន្ត), Calculation (ការគណនា), Answer (ចម្លើយ) និងផ្ទៀងផ្ទាត់លេខនព្វន្តឱ្យបានត្រឹមត្រូវ ១០០%។
- រូបវិទ្យា (Physics): បង្ហាញ Known (បម្រាប់), Find (ស្វែងរក), Formula (រូបមន្ត), Substitution (ជំនួសលេខ), Calculation, SI Unit (ឯកតា), Final Answer។ ពិនិត្យ dimensional consistency។
- គីមីវិទ្យា (Chemistry): ពិនិត្យ Chemical formula, Chemical equation, Balance equation, Valency, Mole calculation, Concentration, pH, Reaction type។
- ជីវវិទ្យា (Biology): ផ្តោតលើ Structure, Function, Biological Process, Human/Plant biology, Ecology, Genetics, Environment។
- ផែនដីវិទ្យា (Earth Science): Earth structure, Rocks, Minerals, Plate tectonics, Weather, Climate, Natural resources of Cambodia។
- ភូមិវិទ្យា (Geography): ផែនទីកម្ពុជា, ប្រព័ន្ធទន្លេមេគង្គ-បឹងទន្លេសាប, កសិកម្ម, អាកាសធាតុ, ធនធានធម្មជាតិ, ASEAN និងពិភពលោក។
- ប្រវត្តិវិទ្យា (History): សម័យបុរេប្រវត្តិ, នគរភ្នំ (Funan), ចេនឡា (Chenla), មហានគរ (Angkor), ក្រោយអង្គរ, កាលបរិច្ឆេទ, តួអង្គប្រវត្តិសាស្ត្រ, សារៈសំខាន់ប្រវត្តិសាស្ត្រ។
- សីលធម៌–ពលរដ្ឋវិជ្ជា (Moral-Civics): បង្កើតសំណួរ Scenario-based, ការទទួលខុសត្រូវ, វិន័យ, សីលធម៌រស់នៅ, ច្បាប់ចរាចរណ៍, សិទ្ធិ និងករណីយកិច្ច។
- ភាសាខ្មែរ (Khmer): អក្ខរាវិរុទ្ធ, វេយ្យាករណ៍, អក្សរសិល្ប៍, ការអានស្វែងយល់, សិក្សាអត្ថបទ, តែងសេចក្ដី។
- ភាសាអង់គ្លេស (English): Grammar tenses, prepositions, reading comprehension, vocabulary in context.
- STEM & ICT & បច្ចេកវិទ្យា: Problem-solving scenarios, engineering design, coding logic, practical application.

# 4. ច្បាប់សម្រាប់ជម្រើស A B C D (DISTRACTOR RULES):
- មានចម្លើយត្រឹមត្រូវតែ 1 គត់។
- Distractors (ជម្រើសខុស) ត្រូវមានភាពសមហេតុផល និងឆ្លុះបញ្ចាំងពីកំហុសដែលសិស្សងាយនឹងច្រឡំ (Misconceptions).
- ហាមប្រើ "All of the above" ឬ "None of the above" ប្រសិនបើមិនចាំបាច់។
- Randomize ទីតាំងចម្លើយត្រឹមត្រូវ (correctIndex ត្រូវផ្លាស់ប្តូរឆ្លាស់គ្នា 0, 1, 2, 3)។

# 5. រចនាប័ទ្មសរសេររូបមន្ត (FORMULA NOTATION):
- ស្វ័យគុណ (Exponents): សរសេរប្រើ "^" (ឧ. "x^2", "10^{-5}")។
- សន្ទស្សន៍ (Subscripts): សរសេរប្រើ "_" (ឧ. "H_2O", "CO_2")។
- ប្រភាគ (Fractions): សរសេរតាមរបៀប LaTeX "\\frac{a}{b}" (ឧ. "\\frac{s}{t}")។
- ឫស (Square roots): សរសេរប្រើ "\\sqrt{x}"។
- សញ្ញាព្រួញប្រតិកម្ម: សរសេរប្រើ "->" ឬ "\\rightarrow"។
- និមិត្តសញ្ញា: "\\pm", "\\times", "\\div", "\\pi", "\\Delta", "\\alpha", "\\theta"។

${languagePrompt}
${categoryRatiosPrompt}

Generate exactly ${totalRequestedCount} structured questions in JSON format matching the schema.`;

  const parts: any[] = [];
  parts.push({ text: masterPromptText });

  if (hasText || extractedOfficeText.trim()) {
    let textMaterial = "";
    if (hasText) {
      textMaterial += `Lesson Text Notes:\n${lessonText}\n\n`;
    }
    if (extractedOfficeText.trim()) {
      textMaterial += `Extracted Content from Documents:\n${extractedOfficeText}\n`;
    }
    parts.push({ text: textMaterial });
  }

  if (hasImages) {
    images.forEach((img: { mimeType: string, data: string }) => {
      let base64 = img.data;
      if (base64.includes(";base64,")) {
        base64 = base64.split(";base64,").pop() || "";
      }
      parts.push({
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: base64
        }
      });
    });
  }

  if (hasPdfs) {
    pdfs.forEach((pdf: { mimeType: string, data: string }) => {
      let base64 = pdf.data;
      if (base64.includes(";base64,")) {
        base64 = base64.split(";base64,").pop() || "";
      }
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: base64
        }
      });
    });
  }

  try {
    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];

    const generateWithFallback = async (partsList: any[]): Promise<any> => {
      let lastError: any = null;
      
      for (const modelName of modelsToTry) {
        const attempts = 2;
        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            console.log(`Attempting question generation with model: ${modelName} (attempt ${attempt}/${attempts})`);
            const result = await activeAi.models.generateContent({
              model: modelName,
              contents: partsList,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { 
                        type: Type.STRING, 
                        description: "Question text in accordance with MoEYS curriculum" 
                      },
                      options: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "Array of 4 options (or 2 for True/False) with plausible distractors"
                      },
                      correctIndex: { type: Type.INTEGER, description: "The 0-based index of the correct option" },
                      category: { type: Type.STRING, description: "The category: choice, matching, fill_blank, theory, or exercise" },
                      explanation: { type: Type.STRING, description: "Clear and comprehensive explanation for why the answer is correct" },
                      bloomLevel: { type: Type.STRING, description: "Bloom's taxonomy: remember, understand, apply, analyze, evaluate, or create" },
                      difficulty: { type: Type.STRING, description: "Difficulty: easy, medium, or hard" },
                      learningObjective: { type: Type.STRING, description: "Expected learning outcome / objective aligned with MoEYS" },
                      solutionStepByStep: { type: Type.STRING, description: "Step by step calculation or proof (Given, Formula, Calculation, Answer)" },
                      points: { type: Type.INTEGER, description: "Points allocated for this question" }
                    },
                    required: ["text", "options", "correctIndex", "category"]
                  }
                }
              }
            });
            return result;
          } catch (error: any) {
            lastError = error;
            const errorMsg = error?.message || String(error);
            console.warn(`Model ${modelName} failed on attempt ${attempt}: ${errorMsg}`);
            
            if (attempt < attempts) {
              const delay = 1000 * attempt;
              console.log(`Retrying ${modelName} in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        console.log(`Failing over to standard fallback model after ${modelName} encountered errors...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      throw lastError || new Error("Failed after attempting all generative models and retries.");
    };

    const response = await generateWithFallback(parts);

    const jsonParsed = cleanAndParseJson<any[]>(response.text || "[]", []);
    const mappedQuestions = Array.isArray(jsonParsed) ? jsonParsed.map((q: any) => ({
      ...q,
      questionType: questionType || 'general',
      category: q.category || 'choice',
      grade: grade || q.grade || '',
      subject: subject || q.subject || '',
      chapter: chapter || q.chapter || '',
      lesson: lesson || q.lesson || '',
      topic: topic || q.topic || '',
      points: q.points || points || 2,
      bloomLevel: q.bloomLevel || 'apply',
      difficulty: q.difficulty || difficulty || 'medium'
    })) : [];
    res.json({ questions: mappedQuestions });
  } catch (error: any) {
    console.error("Error generating questions from Gemini API:", error);
    let errorMessage = error.message || String(error);
    if (errorMessage.includes("The caller does not have permission")) {
      errorMessage = "កំហុសពី Gemini API៖ The caller does not have permission - សោរ API Key របស់អ្នកអាចមិនត្រឹមត្រូវ ឬគ្មានសិទ្ធិដំណើរការម៉ូដែលនេះទេ។ សូមពិនិត្យ ឬផ្លាស់ប្តូរ API Key របស់អ្នកនៅក្នុងប្រអប់ (Gemini API Key Input) នៅក្នុងផ្ទាំងបញ្ជាខាងលើជាមុនសិន!";
    } else if (errorMessage.includes("API key not valid")) {
      errorMessage = "កំហុសពី Gemini API៖ API key not valid - សោរ API Key ដែលអ្នកបានបញ្ចូលមិនត្រឹមត្រូវទេ។ សូមពិនិត្យ ឬផ្លាស់ប្តូរ API Key របស់អ្នកឡើងវិញ!";
    }
    res.status(500).json({ error: errorMessage });
  }
});

// API route to generate Cambodian MoEYS 5-step Lesson Plan
app.post("/api/generate-lesson-plan", async (req, res) => {
  const {
    subject = "រូបវិទ្យា",
    grade = "ថ្នាក់ទី ៩",
    chapter = "",
    lessonTitle = "ច្បាប់អូម",
    duration = "៥០ នាទី",
    schoolName = "សាលារៀនសុវណ្ណភូមិ",
    teacherName = "លោកគ្រូ / អ្នកគ្រូ",
    extraInstructions = ""
  } = req.body;

  const clientApiKey = (req.headers["x-api-key"] as string || "").trim();
  const activeApiKey = clientApiKey || process.env.GEMINI_API_KEY || "";

  if (!activeApiKey) {
    return res.status(400).json({
      error: "សូមបញ្ចូលសោរ API Key របស់អ្នកជាមុនសិន! (Please configure Gemini API Key first)"
    });
  }

  const activeAi = new GoogleGenAI({
    apiKey: activeApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const prompt = `អ្នកជាអ្នកជំនាញរៀបចំកិច្ចតែងការបង្រៀនគរុកោសល្យខ្មែរ (MoEYS Standard Lesson Plan Expert) ប្រចាំប្រទេសកម្ពុជា។
សូមរៀបចំកិច្ចតែងការបង្រៀនស្តង់ដារ ៥ ជំហាន ឱ្យបានលម្អិត ត្រឹមត្រូវ និងទាក់ទាញបំផុត ដូចខាងក្រោម៖

ព័ត៌មានមេរៀន៖
- សាលារៀន៖ ${schoolName}
- មុខវិជ្ជា៖ ${subject}
- ថ្នាក់ទី៖ ${grade}
- ជំពូក៖ ${chapter || 'ជំពូកពាក់ព័ន្ធ'}
- ចំណងជើងមេរៀន៖ ${lessonTitle}
- រយៈពេល៖ ${duration}
- គ្រូបង្រៀន៖ ${teacherName}
${extraInstructions ? `- សេចក្តីណែនាំបន្ថែម៖ ${extraInstructions}` : ''}

សូមបង្កើតជាទម្រង់ JSON ត្រឹមត្រូវ 100% តាមរចនាសម្ព័ន្ធខាងក្រោម (ជាភាសាខ្មែរទាំងអស់ ហាមសរសេរអក្សរឡាតាំង លើកលែងរូបមន្ត ឬពាក្យបច្ចេកទេស)៖
{
  "title": "កិច្ចតែងការបង្រៀន៖ ${lessonTitle}",
  "objectives": {
    "knowledge": ["ចំណេះដឹងទី១...", "ចំណេះដឹងទី២..."],
    "skills": ["បំណិនទី១...", "បំណិនទី២..."],
    "attitude": ["ឥរិយាបថទី១...", "ឥរិយាបថទី២..."]
  },
  "teachingAids": {
    "teacher": "សម្ភារឧបទេសគ្រូ (សៀវភៅពុម្ព, ស្លាយ, ឧបករណ៍ពិសោធន៍...)",
    "student": "សម្ភារឧបទេសសិស្ស (សៀវភៅសរសេរ, ប៊ិច, បន្ទាត់...)"
  },
  "steps": {
    "step1Admin": {
      "teacherActivity": "ពិនិត្យអនាម័យ សណ្ដាប់ធ្នាប់ វត្តមានសិស្ស និងសម្តែងការស្វាគមន៍",
      "studentActivity": "ប្រធានថ្នាក់រាយការណ៍វត្តមាន និងសិស្សអង្គុយប្រកបដោយរបៀបរៀបរយ",
      "duration": "៥ នាទី"
    },
    "step2Review": {
      "teacherActivity": "សួរសំណួររំលឹកមេរៀនចាស់...",
      "content": "ខ្លឹមសារសង្ខេបនៃមេរៀនចាស់ និងចម្លើយត្រឹមត្រូវ...",
      "studentActivity": "សិស្សលើកដៃឆ្លើយសំណួរ និងផ្ទៀងផ្ទាត់...",
      "duration": "៥ នាទី"
    },
    "step3NewLesson": {
      "teacherActivity": "សកម្មភាពគ្រូក្នុងដំណើរការបង្រៀនមេរៀនថ្មី ពន្យល់ ធ្វើពិសោធន៍ ឬលើកឧទាហរណ៍...",
      "content": "ខ្លឹមសារលម្អិតនៃមេរៀនថ្មី រូបមន្ត និយមន័យ ចំណុចសំខាន់ៗ...",
      "studentActivity": "សិស្សសង្កេត ស្ដាប់ កត់ត្រា និងសួរដេញដោល...",
      "duration": "២៥ នាទី"
    },
    "step4Strengthen": {
      "teacherActivity": "ដាក់សំណួរពង្រឹង ឬលំហាត់អនុវត្តជាក់ស្តែង...",
      "content": "ខ្លឹមសារសំណួរពង្រឹង និងដំណោះស្រាយ...",
      "studentActivity": "សិស្សអនុវត្តជាបុគ្គល ឬជាក្រុម...",
      "duration": "១០ នាទី"
    },
    "step5Homework": {
      "teacherActivity": "ដាក់កិច្ចការផ្ទះ និងផ្តាំផ្ញើសិស្ស...",
      "content": "ប្រធានកិច្ចការផ្ទះ ឬការណែនាំរំលឹកមេរៀន...",
      "studentActivity": "សិស្សកត់ត្រាកិច្ចការផ្ទះ...",
      "duration": "៥ នាទី"
    }
  },
  "evaluation": "ការវាយតម្លៃលទ្ធផលការបង្រៀនរំពឹងទុក...",
  "selfReflection": "ការកែលម្អផ្ទាល់ខ្លួនសម្រាប់ម៉ោងបង្រៀនបន្ទាប់..."
}`;

  try {
    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];

    let rawText = "";
    let lastError = null;
    for (const modelName of modelsToTry) {
      try {
        const result = await activeAi.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        });
        rawText = result.text || "";
        if (rawText.trim()) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed for lesson plan:`, err?.message);
      }
    }

    if (!rawText.trim()) {
      throw new Error(lastError?.message || "Unable to generate lesson plan content from Gemini");
    }

    const parsed = cleanAndParseJson(rawText, null);
    if (!parsed) {
      throw new Error("Unable to parse generated lesson plan JSON");
    }
    res.json(parsed);
  } catch (error: any) {
    console.error("Error generating lesson plan:", error);
    res.status(500).json({
      error: "មិនអាចបង្កើតកិច្ចតែងការដោយ AI បានទេ សូមព្យាយាមម្តងទៀត ឬបញ្ចូលដោយដៃ។ " + (error?.message || "")
    });
  }
});

// API route to generate Comprehensive MoEYS Teaching Lesson Article & Summary Note
app.post("/api/generate-lesson-article", async (req, res) => {
  const {
    subject = "ភាសាខ្មែរ",
    grade = "ថ្នាក់ទី ៩",
    chapter = "",
    lessonTitle = "",
    lessonText = "",
    images = [],
    pdfs = [],
    officeFiles = [],
    customInstructions = "",
    schoolName = "សាលារៀនសុវណ្ណភូមិ",
    teacherName = "លោកគ្រូ / អ្នកគ្រូ"
  } = req.body;

  const clientApiKey = (req.headers["x-api-key"] as string || "").trim();
  const activeApiKey = clientApiKey || process.env.GEMINI_API_KEY || "";

  if (!activeApiKey) {
    return res.status(400).json({
      error: "សូមបញ្ចូលសោរ API Key របស់អ្នកជាមុនសិន! (Please configure Gemini API Key first)"
    });
  }

  const activeAi = new GoogleGenAI({
    apiKey: activeApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const hasText = lessonText && lessonText.trim().length > 0;
  const hasImages = images && Array.isArray(images) && images.length > 0;
  const hasPdfs = pdfs && Array.isArray(pdfs) && pdfs.length > 0;
  const hasOffice = officeFiles && Array.isArray(officeFiles) && officeFiles.length > 0;

  if (!hasText && !hasImages && !hasPdfs && !hasOffice && !lessonTitle && !subject) {
    return res.status(400).json({
      error: "សូមបញ្ចូលចំណងជើងមេរៀន ខ្លឹមសារ ឬឯកសារ (រូបភាព/PDF/Word) ជាមុនសិន"
    });
  }

  // Extract text from Office documents if any
  let extractedOfficeText = "";
  if (hasOffice) {
    for (const file of officeFiles) {
      const fileName = file.name || "Document";
      const mimeType = file.mimeType || "";
      const base64Data = file.data || "";

      try {
        if (fileName.toLowerCase().endsWith(".docx") || mimeType.includes("wordprocessingml") || mimeType === "application/docx") {
          const text = await extractTextFromDocx(base64Data);
          extractedOfficeText += `\n[Extracted from Word: ${fileName}]\n${text}\n`;
        } else if (fileName.toLowerCase().endsWith(".pptx") || mimeType.includes("presentationml") || mimeType === "application/pptx") {
          const text = await extractTextFromPptx(base64Data);
          extractedOfficeText += `\n[Extracted from PowerPoint: ${fileName}]\n${text}\n`;
        } else if (
          fileName.toLowerCase().endsWith(".xlsx") || 
          fileName.toLowerCase().endsWith(".xls") || 
          fileName.toLowerCase().endsWith(".csv") || 
          mimeType.includes("spreadsheet") || 
          mimeType.includes("excel") || 
          mimeType.includes("csv")
        ) {
          const text = extractTextFromExcel(base64Data);
          extractedOfficeText += `\n[Extracted from Sheet: ${fileName}]\n${text}\n`;
        } else {
          const cleanBase64 = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
          const buffer = Buffer.from(cleanBase64, "base64");
          if (fileName.toLowerCase().endsWith(".txt")) {
            const text = buffer.toString("utf8");
            extractedOfficeText += `\n[Extracted from Text: ${fileName}]\n${text}\n`;
          } else {
            const text = extractCleanTextFromBinary(buffer);
            if (text.trim().length > 10) {
              extractedOfficeText += `\n[Extracted from Doc File: ${fileName}]\n${text}\n`;
            }
          }
        }
      } catch (err) {
        console.error(`Failed to extract text from ${fileName}:`, err);
      }
    }
  }

  const masterPromptText = `
# SYSTEM IDENTITY & ROLE:
អ្នកគឺជា "AI MoEYS Curriculum Lesson Content & Teaching Expert" (អ្នកឯកទេសសរសេរអត្ថបទមេរៀនបង្រៀន និងសង្ខេបមេរៀន ស្របតាមកម្មវិធីសិក្សាថ្មីរបស់ក្រសួងអប់រំ យុវជន និងកីឡាកម្ពុជា)។

# គោលបំណងចម្បង (MAIN OBJECTIVE):
សរសេរអត្ថបទមេរៀនបង្រៀនពេញលេញ និងទាក់ទាញបំផុត សម្រាប់គ្រូបង្រៀនយកទៅបង្រៀនសិស្សក្នុងថ្នាក់ ឬចែកជាឯកសារ Word ដោយបែងចែកជា ២ ផ្នែកសំខាន់ច្បាស់លាស់៖
1. **ផ្នែកទី ១៖ អត្ថបទមេរៀនលម្អិតសម្រាប់បង្រៀន (Detailed Teaching Lesson)** — ពន្យល់ទ្រឹស្តី និយមន័យ រូបមន្ត ឧទាហរណ៍ជាក់ស្តែង ដំណោះស្រាយគំរូមួយជំហានម្តងៗ សំណួរត្រិះរិះ និងសកម្មភាពក្នុងថ្នាក់។
2. **ផ្នែកទី ២៖ មេរៀនសង្ខេបនៅខាងក្រោយ (Lesson Summary Note at the Back)** — សង្ខេបខ្លឹមសារគន្លឹះខ្លីខ្លឹម បណ្តុំរូបមន្ត/តារាងសង្ខេប ចំណុចសំខាន់ៗដែលត្រូវចងចាំ និងសំណួរស្វ័យវាយតម្លៃ/លំហាត់ពង្រឹងចំណេះដឹង។

# ព័ត៌មានមេរៀន (LESSON CONTEXT):
- គ្រឹះស្ថានសិក្សា / សាលារៀន៖ ${schoolName}
- គ្រូបង្រៀន៖ ${teacherName}
- មុខវិជ្ជា៖ ${subject}
- ថ្នាក់ទី៖ ${grade}
- ជំពូក៖ ${chapter || 'ជំពូកពាក់ព័ន្ធ'}
- ចំណងជើងមេរៀន / ប្រធានបទ៖ ${lessonTitle || 'មេរៀនប្រចាំថ្នាក់'}
${customInstructions ? `- ការណែនាំបន្ថែមពិសេសពីគ្រូ៖ ${customInstructions}` : ''}

# គោលការណ៍គរុកោសល្យតាមមុខវិជ្ជា (MoEYS Standard Rules):
- ភាសាខ្មែរ៖ អក្ខរាវិរុទ្ធត្រឹមត្រូវ វេយ្យាករណ៍ ការវិភាគអត្ថបទ អត្ថន័យពាក្យ និងការតែងសេចក្តី។
- គណិតវិទ្យា៖ និយមន័យ រូបមន្ត បម្រាប់ ដំណោះស្រាយលម្អិត និងលំហាត់អនុវត្ត។
- រូបវិទ្យា/គីមីវិទ្យា/ជីវវិទ្យា/ផែនដីវិទ្យា៖ ទ្រឹស្តី ពិសោធន៍ ឧទាហរណ៍ក្នុងជីវភាពរស់នៅប្រទេសកម្ពុជា រូបមន្ត សមីការ តុល្យការ និងការអនុវត្តជាក់ស្តែង។
- ប្រវត្តិវិទ្យា/ភូមិវិទ្យា/សីលធម៌-ពលរដ្ឋ៖ កាលបរិច្ឆេទ ព្រឹត្តិការណ៍ សារៈសំខាន់ប្រវត្តិសាស្ត្រ ផែនទីកម្ពុជា បរិស្ថាន សីលធម៌រស់នៅ និងច្បាប់។
- ភាសាអង់គ្លេស/STEM៖ វេយ្យាករណ៍ ពាក្យគន្លឹះ និងការអនុវត្តដោះស្រាយបញ្ហា។

# ទម្រង់លទ្ធផល (OUTPUT FORMAT - JSON STRICT):
សូមបង្កើតជាទម្រង់ JSON ត្រឹមត្រូវ 100% តាម Schema ដូចខាងក្រោម៖
{
  "title": "ចំណងជើងមេរៀនផ្លូវការ",
  "subject": "${subject}",
  "grade": "${grade}",
  "chapter": "${chapter || 'ជំពូកពាក់ព័ន្ធ'}",
  "objectives": {
    "knowledge": ["ចំណេះដឹងទី១...", "ចំណេះដឹងទី២..."],
    "skills": ["បំណិនទី១...", "បំណិនទី២..."],
    "attitude": ["ឥរិយាបថទី១...", "ឥរិយាបថទី២..."]
  },
  "introduction": "សេចក្តីផ្តើមទាក់ទាញចំណាប់អារម្មណ៍ និងការផ្សារភ្ជាប់ទៅនឹងជីវភាពរស់នៅជាក់ស្តែង...",
  "detailedContent": "អត្ថបទមេរៀនលម្អិតជាទម្រង់ Markdown (មានប្រើ #, ##, ###, bullet points, bold, formulas, code blocks ឬ tables) ដែលមានក្បាលមេរៀន និយមន័យ ការពន្យល់ស៊ីជម្រៅ ឧទាហរណ៍ជាក់ស្តែង ដំណោះស្រាយលំហាត់គំរូ និងសកម្មភាពក្នុងថ្នាក់...",
  "summaryContent": "ខ្លឹមសារមេរៀនសង្ខេបនៅខាងក្រោយជាទម្រង់ Markdown (មានចំណុចគន្លឹះខ្លីខ្លឹម បណ្តុំរូបមន្ត/តារាង និងសំណួរស្វ័យវាយតម្លៃ)...",
  "keyTakeaways": [
    "ចំណុចគន្លឹះសំខាន់ទី១ ដែលត្រូវចងចាំ...",
    "ចំណុចគន្លឹះសំខាន់ទី២...",
    "ចំណុចគន្លឹះសំខាន់ទី៣..."
  ],
  "exercises": [
    {
      "question": "សំណួរ ឬលំហាត់ទី១...",
      "answerOrSolution": "ចម្លើយ ឬដំណោះស្រាយលម្អិត...",
      "points": 2
    },
    {
      "question": "សំណួរ ឬលំហាត់ទី២...",
      "answerOrSolution": "ចម្លើយ ឬដំណោះស្រាយលម្អិត...",
      "points": 2
    }
  ]
}
`;

  const parts: any[] = [];
  parts.push({ text: masterPromptText });

  if (hasText || extractedOfficeText.trim()) {
    let textMaterial = "";
    if (hasText) {
      textMaterial += `\n[Input Lesson Text Notes]:\n${lessonText}\n\n`;
    }
    if (extractedOfficeText.trim()) {
      textMaterial += `\n[Extracted Material from Uploaded Word/Office Documents]:\n${extractedOfficeText}\n`;
    }
    parts.push({ text: textMaterial });
  }

  if (hasImages) {
    images.forEach((img: { mimeType: string, data: string }) => {
      let base64 = img.data;
      if (base64.includes(";base64,")) {
        base64 = base64.split(";base64,").pop() || "";
      }
      parts.push({
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: base64
        }
      });
    });
  }

  if (hasPdfs) {
    pdfs.forEach((pdf: { mimeType: string, data: string }) => {
      let base64 = pdf.data;
      if (base64.includes(";base64,")) {
        base64 = base64.split(";base64,").pop() || "";
      }
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: base64
        }
      });
    });
  }

  try {
    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];

    let rawText = "";
    let lastError = null;
    for (const modelName of modelsToTry) {
      try {
        console.log(`Generating lesson article with model: ${modelName}`);
        const result = await activeAi.models.generateContent({
          model: modelName,
          contents: parts,
          config: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        });
        rawText = result.text || "";
        if (rawText.trim()) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed for lesson article:`, err?.message);
      }
    }

    if (!rawText.trim()) {
      throw new Error(lastError?.message || "Unable to generate lesson article content from Gemini");
    }

    const parsed = cleanAndParseJson(rawText, null);
    if (!parsed) {
      throw new Error("Unable to parse generated lesson article JSON");
    }
    res.json(parsed);
  } catch (error: any) {
    console.error("Error generating lesson article:", error);
    res.status(500).json({
      error: "មិនអាចបង្កើតអត្ថបទមេរៀនដោយ AI បានទេ៖ " + (error?.message || "សូមពិនិត្យមើល API Key ឬទំហំឯកសារ")
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const cwdDist = path.join(process.cwd(), 'dist');
    const localDist = path.join(__dirname, '../dist');
    const directDist = __dirname;

    let distPath = cwdDist;
    if (fs.existsSync(path.join(cwdDist, 'index.html'))) {
      distPath = cwdDist;
    } else if (fs.existsSync(path.join(directDist, 'index.html'))) {
      distPath = directDist;
    } else if (fs.existsSync(path.join(localDist, 'index.html'))) {
      distPath = localDist;
    }

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Error serving index.html:", err);
          res.status(200).send('<!DOCTYPE html><html><head><title>Teacher EduSpin</title></head><body><div id="root"></div></body></html>');
        }
      });
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Handle termination signals gracefully for Cloud Run
  const shutdown = () => {
    console.log("Shutting down server gracefully...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((err) => {
  console.error("Critical server startup error:", err);
  process.exit(1);
});
