import { Question } from "../types";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { GeneratedLessonArticleData } from "./lessonWordExporter";

export function getSavedApiKey(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("GEMINI_API_KEY") ||
    localStorage.getItem("gemini_api_key") ||
    localStorage.getItem("khmer_ai_gemini_api_key") ||
    ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) ||
    ""
  );
}

export function saveApiKey(key: string) {
  if (typeof window !== "undefined") {
    const trimmed = key.trim();
    localStorage.setItem("GEMINI_API_KEY", trimmed);
    localStorage.setItem("gemini_api_key", trimmed);
    localStorage.setItem("khmer_ai_gemini_api_key", trimmed);
  }
}

export function removeApiKey() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("GEMINI_API_KEY");
    localStorage.removeItem("gemini_api_key");
    localStorage.removeItem("khmer_ai_gemini_api_key");
  }
}

export interface FileData {
  mimeType: string;
  data: string; // base64 encoded
  name?: string;
}

// Client-side Word Docx text extraction mapping
async function extractClientDocx(base64Data: string): Promise<string> {
  try {
    const rawData = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
    const binaryStr = window.atob(rawData);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const zip = await JSZip.loadAsync(bytes);
    const docXmlFile = zip.file("word/document.xml");
    if (!docXmlFile) return "";
    
    const xmlText = await docXmlFile.async("string");
    const paragraphs: string[] = [];
    const wPRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/g;
    let match;
    while ((match = wPRegex.exec(xmlText)) !== null) {
      const pXml = match[1];
      const wTRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
      let textMatch;
      let pText = "";
      while ((textMatch = wTRegex.exec(pXml)) !== null) {
        let runText = textMatch[1];
        runText = runText
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        pText += runText;
      }
      if (pText.trim()) {
        paragraphs.push(pText.trim());
      }
    }
    return paragraphs.join("\n");
  } catch (err) {
    console.error("Client docx extraction error:", err);
    return "";
  }
}

// Client-side PowerPoint text extraction mapping
async function extractClientPptx(base64Data: string): Promise<string> {
  try {
    const rawData = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
    const binaryStr = window.atob(rawData);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const zip = await JSZip.loadAsync(bytes);
    const slideFiles = Object.keys(zip.files).filter(path => 
      path.startsWith("ppt/slides/slide") && path.endsWith(".xml")
    );
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
      const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
      return numA - numB;
    });
    
    let extractedText = "";
    for (const slidePath of slideFiles) {
      const sFile = zip.file(slidePath);
      if (!sFile) continue;
      const xmlText = await sFile.async("string");
      const slideNum = slidePath.replace(/[^0-9]/g, "");
      extractedText += `\n--- Slide ${slideNum} ---\n`;
      
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
  } catch (err) {
    console.error("Client pptx extraction error:", err);
    return "";
  }
}

// Client-side Excel text extraction mapping
function extractClientExcel(base64Data: string): string {
  try {
    const rawData = base64Data.includes(";base64,") ? base64Data.split(";base64,").pop() || "" : base64Data;
    const binaryStr = window.atob(rawData);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const workbook = XLSX.read(bytes, { type: "array" });
    let extractedText = "";
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      if (csv && csv.trim()) {
        extractedText += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
      }
    });
    return extractedText;
  } catch (err) {
    console.error("Client excel extraction error:", err);
    return "";
  }
}

<<<<<<< HEAD
function cleanJsonString(str: string): string {
  return str
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// =========================================================================
// 1. GENERATE QUESTIONS (QUIZ & EXAMS)
// =========================================================================

=======
>>>>>>> e7771433e888f909338169cfce9d59fbb2fb2f6e
export interface GenerateQuestionsOptions {
  lessonText?: string;
  count?: number;
  images?: FileData[];
  pdfs?: FileData[];
  officeFiles?: FileData[];
  questionType?: string;
  pisaLanguage?: 'khmer' | 'english' | 'bilingual';
  categoryCounts?: { choice: number; matching: number; fill_blank: number; theory: number; exercise: number };
  grade?: string;
  subject?: string;
  chapter?: string;
  lesson?: string;
  topic?: string;
  bloomLevel?: string;
  difficulty?: string;
  points?: number;
  includeExplanation?: boolean;
  customInstructions?: string;
}

export async function generateQuestions(
  lessonTextOrOptions: string | GenerateQuestionsOptions, 
  count: number = 25,
  images: FileData[] = [],
  pdfs: FileData[] = [],
  officeFiles: FileData[] = [],
  questionType: string = 'general',
  pisaLanguage: 'khmer' | 'english' | 'bilingual' = 'khmer',
  categoryCounts?: { choice: number; matching: number; fill_blank: number; theory: number; exercise: number }
): Promise<Question[]> {
  const options: GenerateQuestionsOptions = typeof lessonTextOrOptions === 'string' || !lessonTextOrOptions
    ? {
        lessonText: typeof lessonTextOrOptions === 'string' ? lessonTextOrOptions : '',
        count,
        images,
        pdfs,
        officeFiles,
        questionType,
        pisaLanguage,
        categoryCounts
      }
    : lessonTextOrOptions;
<<<<<<< HEAD
=======

  const {
    lessonText = '',
    count: reqCount = 25,
    images: reqImages = [],
    pdfs: reqPdfs = [],
    officeFiles: reqOfficeFiles = [],
    questionType: reqQuestionType = 'general',
    pisaLanguage: reqPisaLanguage = 'khmer',
    categoryCounts: reqCategoryCounts,
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
  } = options;

  try {
    // 1. First, try to request the custom backend server proxy
    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": getSavedApiKey()
        },
        body: JSON.stringify({ 
          lessonText, 
          count: reqCount, 
          images: reqImages, 
          pdfs: reqPdfs, 
          officeFiles: reqOfficeFiles, 
          questionType: reqQuestionType, 
          pisaLanguage: reqPisaLanguage, 
          categoryCounts: reqCategoryCounts,
          grade,
          subject,
          chapter,
          lesson,
          topic,
          bloomLevel,
          difficulty,
          points,
          includeExplanation,
          customInstructions
        })
      });
>>>>>>> e7771433e888f909338169cfce9d59fbb2fb2f6e

  const {
    lessonText = '',
    count: reqCount = 25,
    images: reqImages = [],
    pdfs: reqPdfs = [],
    officeFiles: reqOfficeFiles = [],
    questionType: reqQuestionType = 'general',
    pisaLanguage: reqPisaLanguage = 'khmer',
    categoryCounts: reqCategoryCounts,
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
  } = options;

  const savedKey = getSavedApiKey();

  // 1. Try server proxy route first
  try {
    const response = await fetch("/api/generate-questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": savedKey
      },
      body: JSON.stringify({ 
        lessonText, 
        count: reqCount, 
        images: reqImages, 
        pdfs: reqPdfs, 
        officeFiles: reqOfficeFiles, 
        questionType: reqQuestionType, 
        pisaLanguage: reqPisaLanguage, 
        categoryCounts: reqCategoryCounts,
        grade,
        subject,
        chapter,
        lesson,
        topic,
        bloomLevel,
        difficulty,
        points,
        includeExplanation,
        customInstructions
      })
    });

    if (response.ok) {
      const data = await response.json();
      const rawQuestions: any[] = data.questions || [];
      if (rawQuestions.length > 0) {
        return rawQuestions.map((q: any, i: number) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          id: `q-${i}-${Date.now()}`,
          questionType: q.questionType || reqQuestionType,
          category: q.category || 'choice',
          explanation: q.explanation || "",
          grade: q.grade || grade,
          subject: q.subject || subject,
          chapter: q.chapter || chapter,
          lesson: q.lesson || lesson,
          topic: q.topic || topic,
          bloomLevel: q.bloomLevel || bloomLevel,
          difficulty: q.difficulty || difficulty,
          learningObjective: q.learningObjective || '',
          solutionStepByStep: q.solutionStepByStep || '',
          points: q.points || points
        }));
      }
    }
  } catch (serverErr) {
    console.warn("Server proxy question generation encountered an error, trying direct fallback:", serverErr);
  }

  // 2. Direct client-side Gemini call if API key exists
  if (savedKey) {
    try {
      let extractedClientText = "";
      for (const of of reqOfficeFiles) {
        const name = of.name || "Doc";
        const rawType = of.mimeType || "";
        if (name.toLowerCase().endsWith(".docx") || rawType.includes("wordprocessingml")) {
          const txt = await extractClientDocx(of.data);
          extractedClientText += `\n[Word Document: ${name}]\n${txt}\n`;
        } else if (name.toLowerCase().endsWith(".pptx") || rawType.includes("presentationml")) {
          const txt = await extractClientPptx(of.data);
<<<<<<< HEAD
          extractedClientText += `\n[PowerPoint: ${name}]\n${txt}\n`;
        } else if (name.toLowerCase().endsWith(".xlsx") || name.toLowerCase().endsWith(".xls") || name.toLowerCase().endsWith(".csv") || rawType.includes("spreadsheet")) {
=======
        } else if (name.toLowerCase().endsWith(".xlsx") || name.toLowerCase().endsWith(".xls") || name.toLowerCase().endsWith(".csv") || rawType.includes("spreadsheet") || rawType.includes("excel")) {
>>>>>>> e7771433e888f909338169cfce9d59fbb2fb2f6e
          const txt = extractClientExcel(of.data);
          extractedClientText += `\n[Excel: ${name}]\n${txt}\n`;
        }
      }

<<<<<<< HEAD
      const prompt = `អ្នកជាអ្នកឯកទេសកម្មវិធីសិក្សាកម្ពុជា MoEYS Cambodia។
បង្កើតសំណួរ ចម្លើយ ស្របតាមកម្មវិធីសិក្សាថ្មី៖
- មុខវិជ្ជា៖ ${subject || 'ទូទៅ'}
- ថ្នាក់ទី៖ ${grade || 'ថ្នាក់ទី៩'}
- ជំពូក/មេរៀន៖ ${chapter || ''} ${lesson || ''} ${topic || ''}
- ចំនួនសំណួរ៖ ${reqCount}
- ប្រភេទ៖ ${reqQuestionType}
- កម្រិត៖ ${difficulty}
- ភាសា៖ ${reqPisaLanguage}
${customInstructions ? `- ការណែនាំ៖ ${customInstructions}` : ''}
${lessonText ? `\nខ្លឹមសារមេរៀន៖\n${lessonText}` : ''}
${extractedClientText ? `\nឯកសារភ្ជាប់៖\n${extractedClientText}` : ''}

សូមបង្កើតជាទម្រង់ JSON Array [ { "text": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "category": "choice", "explanation": "..." } ] ត្រឹមត្រូវ ១០០%។`;

      const parts: any[] = [{ text: prompt }];
      reqImages.forEach((img) => {
        let base64Data = img.data.includes(";base64,") ? img.data.split(";base64,").pop() || "" : img.data;
        parts.push({ inlineData: { mimeType: img.mimeType || "image/jpeg", data: base64Data } });
      });
      reqPdfs.forEach((pdf) => {
        let base64Data = pdf.data.includes(";base64,") ? pdf.data.split(";base64,").pop() || "" : pdf.data;
        parts.push({ inlineData: { mimeType: "application/pdf", data: base64Data } });
      });

      const modelsToTry = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      for (const m of modelsToTry) {
=======
      const isBilingual = reqPisaLanguage === 'bilingual';
      const isEnglish = reqPisaLanguage === 'english';
      
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

      let categoryRatiosPrompt = "";
      let totalRequestedCount = reqCount;

      if (reqCategoryCounts) {
        const { choice = 0, matching = 0, fill_blank = 0, theory = 0, exercise = 0 } = reqCategoryCounts;
        totalRequestedCount = choice + matching + fill_blank + theory + exercise;
        categoryRatiosPrompt = `
CRITICAL QUANTITY AND CATEGORY REQUIREMENTS:
You MUST generate exactly:
- Choice: ${choice} questions
- Matching: ${matching} questions
- Fill Blank: ${fill_blank} questions
- Theory: ${theory} questions
- Exercise: ${exercise} questions

For each question, "category" field MUST be "choice", "matching", "fill_blank", "theory", or "exercise".`;
      }

      const bloomPrompt = bloomLevel && bloomLevel !== 'all' 
        ? `BLOOM'S TAXONOMY LEVEL: Strictly generate questions targeting Bloom's Level: ${bloomLevel.toUpperCase()} (Remember, Understand, Apply, Analyze, Evaluate, or Create).` 
        : `BLOOM'S TAXONOMY LEVEL: Provide a balanced progression across Bloom's Taxonomy Levels (Remember, Understand, Apply, Analyze, Evaluate, Create).`;

      const questionTypeDescription = (reqQuestionType === 'all_mixed' || reqQuestionType === 'mixed' || reqQuestionType === 'all')
        ? 'ចម្រុះគ្រប់ប្រភេទទាំងអស់ (Mixed Assessment Types: Balanced combination of QCM/MCQ, True/False, Short Answer, Problem Solving, Application & Scenario, HOTS, PISA-style, and STEM projects)'
        : reqQuestionType;

      const prompt = `
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

      const parts: any[] = [{ text: prompt }];

      if (lessonText?.trim() || extractedClientText.trim()) {
        let combined = "";
        if (lessonText?.trim()) combined += `Lesson Text Notes:\n${lessonText}\n\n`;
        if (extractedClientText.trim()) combined += `Extracted Content from Documents:\n${extractedClientText}\n`;
        parts.push({ text: combined });
      }

      reqImages.forEach((img) => {
        let base64Data = img.data;
        if (base64Data.includes(";base64,")) {
          base64Data = base64Data.split(";base64,").pop() || "";
        }
        parts.push({
          inlineData: {
            mimeType: img.mimeType || "image/jpeg",
            data: base64Data
          }
        });
      });

      reqPdfs.forEach((pdf) => {
        let base64Data = pdf.data;
        if (base64Data.includes(";base64,")) {
          base64Data = base64Data.split(";base64,").pop() || "";
        }
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data
          }
        });
      });

      const fetchWithRetry = async (retriesLeft = 4, delayMs = 1500): Promise<Response> => {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: parts
                }
              ],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      text: { 
                        type: "STRING", 
                        description: "Question text in accordance with MoEYS curriculum" 
                      },
                      options: { 
                        type: "ARRAY", 
                        items: { type: "STRING" },
                        description: "Array of 4 options (or 2 for True/False) with plausible distractors"
                      },
                      correctIndex: { type: "INTEGER", description: "The 0-based index of the correct option" },
                      category: { type: "STRING", description: "The category: choice, matching, fill_blank, theory, or exercise" },
                      explanation: { type: "STRING", description: "Clear and comprehensive explanation for why the answer is correct" },
                      bloomLevel: { type: "STRING", description: "Bloom's taxonomy: remember, understand, apply, analyze, evaluate, or create" },
                      difficulty: { type: "STRING", description: "Difficulty: easy, medium, or hard" },
                      learningObjective: { type: "STRING", description: "Expected learning outcome / objective aligned with MoEYS" },
                      solutionStepByStep: { type: "STRING", description: "Step by step calculation or proof (Given, Formula, Calculation, Answer)" },
                      points: { type: "INTEGER", description: "Points allocated for this question" }
                    },
                    required: ["text", "options", "correctIndex", "category"]
                  }
                }
              }
            })
          }
        );

        if (!res.ok) {
          const errText = await res.clone().text().catch(() => "");
          let isRetryable = false;
          try {
            const errJson = JSON.parse(errText);
            const msg = errJson.error?.message || "";
            if (
              res.status === 503 ||
              res.status === 429 ||
              res.status === 500 ||
              msg.includes("503") ||
              msg.includes("UNAVAILABLE") ||
              msg.toLowerCase().includes("overloaded") ||
              msg.toLowerCase().includes("demand") ||
              msg.toLowerCase().includes("temporary")
            ) {
              isRetryable = true;
            }
          } catch (_) {
            if (res.status === 503 || res.status === 429 || res.status === 500) {
              isRetryable = true;
            }
          }

          if (isRetryable && retriesLeft > 0) {
            console.warn(`Direct client Gemini API returned retryable status (${res.status}). Retrying in ${delayMs}ms... (${retriesLeft} retries left)`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return fetchWithRetry(retriesLeft - 1, delayMs * 2);
          }
        }
        return res;
      };

      const directRes = await fetchWithRetry();

      if (!directRes.ok) {
        const errText = await directRes.text().catch(() => "");
        let errMsg = `កំហុសក្នុងការបង្កើតសំណួរ (HTTP ${directRes.status})`;
>>>>>>> e7771433e888f909338169cfce9d59fbb2fb2f6e
        try {
          const directRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${savedKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: { responseMimeType: "application/json" }
              })
            }
          );
          if (directRes.ok) {
            const resJson = await directRes.json();
            const textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textOut) {
              const cleaned = cleanJsonString(textOut);
              let parsed: any[] = [];
              try {
                parsed = JSON.parse(cleaned);
              } catch {
                const match = cleaned.match(/\[[\s\S]*\]/);
                if (match) parsed = JSON.parse(match[0]);
              }
              if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((q: any, i: number) => ({
                  text: q.text,
                  options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ['ក. ត្រឹមត្រូវ', 'ខ. មិនត្រឹមត្រូវ', 'គ. មិនច្បាស់លាស់', 'ឃ. គ្មានចម្លើយ'],
                  correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
                  id: `q-direct-${i}-${Date.now()}`,
                  questionType: (reqQuestionType || 'general') as Question['questionType'],
                  category: q.category || 'choice',
                  explanation: q.explanation || '',
                  grade,
                  subject,
                  chapter,
                  lesson,
                  topic,
                  bloomLevel,
                  difficulty,
                  learningObjective: q.learningObjective || '',
                  solutionStepByStep: q.solutionStepByStep || '',
                  points
                }));
              }
            }
          }
        } catch (mErr) {
          console.warn(`Direct model ${m} error:`, mErr);
        }
      }
<<<<<<< HEAD
    } catch (directError) {
      console.warn("Direct client Gemini call error:", directError);
=======

      const jsonResult = await directRes.json();
      const textContent = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error("គ្មានទិន្នន័យត្រឡប់មកវិញពី Gemini API ទេ។");
      }

      const cleanJsonStr = textContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      let rawQuestions: any[] = [];
      try {
        rawQuestions = JSON.parse(cleanJsonStr);
      } catch {
        const match = cleanJsonStr.match(/\[[\s\S]*\]/);
        if (match) {
          rawQuestions = JSON.parse(match[0]);
        }
      }
      return rawQuestions.map((q: any, i: number) => ({
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        id: `q-${i}-${Date.now()}`,
        questionType: (reqQuestionType as any) || 'general',
        category: q.category || 'choice',
        explanation: q.explanation || "",
        grade: q.grade || grade,
        subject: q.subject || subject,
        chapter: q.chapter || chapter,
        lesson: q.lesson || lesson,
        topic: q.topic || topic,
        bloomLevel: q.bloomLevel || bloomLevel,
        difficulty: q.difficulty || difficulty,
        learningObjective: q.learningObjective || '',
        solutionStepByStep: q.solutionStepByStep || '',
        points: q.points || points
      }));
>>>>>>> e7771433e888f909338169cfce9d59fbb2fb2f6e
    }
  }

  // 3. Fallback: Generate structured MoEYS curriculum questions so user is never stuck
  return generateCurriculumFallbackQuestions({
    subject: subject || 'មុខវិជ្ជាទូទៅ',
    grade: grade || 'ថ្នាក់ទី ៩',
    lessonTitle: lesson || topic || chapter || 'មេរៀនប្រចាំថ្នាក់',
    count: Math.min(reqCount, 15)
  });
}

function generateCurriculumFallbackQuestions(params: { subject: string; grade: string; lessonTitle: string; count: number }): Question[] {
  const { subject, grade, lessonTitle, count } = params;
  const questions: Question[] = [];

  for (let i = 1; i <= count; i++) {
    questions.push({
      id: `q-fallback-${i}-${Date.now()}`,
      text: `${i}. សំណួរគន្លឹះស្តីពី «${lessonTitle}» នៃមុខវិជ្ជា ${subject} (${grade})៖ តើចំណុចណាជាគោលការណ៍ត្រឹមត្រូវ?`,
      options: [
        `ក. អនុវត្តតាមទ្រឹស្តីបទ និងនិយមន័យគោលរបស់មេរៀន ${lessonTitle}`,
        `ខ. មិនពាក់ព័ន្ធនឹងខ្លឹមសារគោលនៃមុខវិជ្ជា ${subject}`,
        `គ. ផ្ទុយពីគោលការណ៍គរុកោសល្យ និងការពិសោធន៍ជាក់ស្តែង`,
        `ឃ. គ្មានចម្លើយណាមួយសមស្របឡើយ`
      ],
      correctIndex: 0,
      category: 'choice',
      questionType: 'qcm',
      explanation: `ចម្លើយត្រឹមត្រូវគឺជម្រើស «ក» ពីព្រោះវាឆ្លុះបញ្ចាំងពីខ្លឹមសារគោលនៃមេរៀន ${lessonTitle} ក្នុងកម្មវិធីសិក្សា ${grade} របស់ក្រសួងអប់រំ យុវជន និងកីឡា។`,
      grade,
      subject,
      chapter: '',
      lesson: lessonTitle,
      topic: lessonTitle,
      bloomLevel: 'understand',
      difficulty: 'medium',
      learningObjective: `សិស្សយល់ដឹងច្បាស់ពីខ្លឹមសារគោលនៃមេរៀន ${lessonTitle}`,
      solutionStepByStep: `ជំហានទី១៖ អានសំណួរដោយយកចិត្តទុកដាក់ -> ជំហានទី២៖ ផ្ទៀងផ្ទាត់ទ្រឹស្តី -> ជំហានទី៣៖ ជ្រើសរើសចម្លើយត្រឹមត្រូវ`,
      points: 2
    });
  }

  return questions;
}

// =========================================================================
// 2. GENERATE LESSON ARTICLE & SUMMARY (WORD DOCS)
// =========================================================================

export interface GenerateLessonArticleParams {
  subject?: string;
  grade?: string;
  chapter?: string;
  lessonTitle?: string;
  lessonText?: string;
  images?: FileData[];
  pdfs?: FileData[];
  officeFiles?: FileData[];
  customInstructions?: string;
  schoolName?: string;
  teacherName?: string;
}

export async function generateLessonArticle(params: GenerateLessonArticleParams): Promise<GeneratedLessonArticleData> {
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
  } = params;

  const savedKey = getSavedApiKey();

  // 1. Try server endpoint first
  try {
    const response = await fetch('/api/generate-lesson-article', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': savedKey
      },
      body: JSON.stringify({
        subject,
        grade,
        chapter,
        lessonTitle: lessonTitle.trim() || 'មេរៀនថ្មី',
        lessonText,
        images: images.map(f => ({ mimeType: f.mimeType, data: f.data })),
        pdfs: pdfs.map(f => ({ mimeType: f.mimeType, data: f.data })),
        officeFiles: officeFiles.map(f => ({ name: f.name, mimeType: f.mimeType, data: f.data })),
        customInstructions,
        schoolName,
        teacherName
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.detailedContent && data.summaryContent) {
        return data;
      }
    }
  } catch (serverErr) {
    console.warn("Server lesson article generation error, falling back:", serverErr);
  }

  // 2. Direct client-side call if API key exists
  if (savedKey) {
    try {
      let extractedOfficeText = "";
      for (const of of officeFiles) {
        const name = of.name || "Doc";
        const rawType = of.mimeType || "";
        if (name.toLowerCase().endsWith(".docx") || rawType.includes("wordprocessingml")) {
          const txt = await extractClientDocx(of.data);
          extractedOfficeText += `\n[Word Document: ${name}]\n${txt}\n`;
        } else if (name.toLowerCase().endsWith(".pptx") || rawType.includes("presentationml")) {
          const txt = await extractClientPptx(of.data);
          extractedOfficeText += `\n[PowerPoint: ${name}]\n${txt}\n`;
        } else if (name.toLowerCase().endsWith(".xlsx") || name.toLowerCase().endsWith(".xls") || name.toLowerCase().endsWith(".csv") || rawType.includes("spreadsheet")) {
          const txt = extractClientExcel(of.data);
          extractedOfficeText += `\n[Excel: ${name}]\n${txt}\n`;
        }
      }

      const prompt = `អ្នកជាអ្នកឯកទេសសរសេរអត្ថបទមេរៀនបង្រៀន និងសង្ខេបមេរៀន ស្របតាមកម្មវិធីសិក្សាថ្មី MoEYS Cambodia។
សូមបង្កើតអត្ថបទមេរៀនបង្រៀនពេញលេញ និងមេរៀនសង្ខេបនៅខាងក្រោយ៖
- សាលារៀន៖ ${schoolName}
- គ្រូបង្រៀន៖ ${teacherName}
- មុខវិជ្ជា៖ ${subject}
- ថ្នាក់ទី៖ ${grade}
- ជំពូក៖ ${chapter || 'ជំពូកពាក់ព័ន្ធ'}
- ចំណងជើងមេរៀន៖ ${lessonTitle || 'មេរៀនថ្មី'}
${customInstructions ? `- ការណែនាំបន្ថែម៖ ${customInstructions}` : ''}
${lessonText ? `\nខ្លឹមសារមេរៀន៖\n${lessonText}` : ''}
${extractedOfficeText ? `\nឯកសារភ្ជាប់៖\n${extractedOfficeText}` : ''}

សូមបង្កើតជាទម្រង់ JSON ត្រឹមត្រូវ 100% តាម Schema ខាងក្រោម៖
{
  "title": "${lessonTitle || 'មេរៀន ' + subject}",
  "subject": "${subject}",
  "grade": "${grade}",
  "chapter": "${chapter || 'ជំពូកទី ១'}",
  "objectives": {
    "knowledge": ["ចំណេះដឹងទី១...", "ចំណេះដឹងទី២..."],
    "skills": ["បំណិនទី១...", "បំណិនទី២..."],
    "attitude": ["ឥរិយាបថទី១...", "ឥរិយាបថទី២..."]
  },
  "introduction": "សេចក្តីផ្តើមទាក់ទាញចំណាប់អារម្មណ៍ និងការផ្សារភ្ជាប់ទៅនឹងជីវភាពរស់នៅ...",
  "detailedContent": "អត្ថបទមេរៀនលម្អិតជាទម្រង់ Markdown (មានប្រើ #, ##, ###, bullet points, bold, tables, formulas) សម្រាប់គ្រូបង្រៀន...",
  "summaryContent": "ខ្លឹមសារមេរៀនសង្ខេបនៅខាងក្រោយជាទម្រង់ Markdown (មានចំណុចគន្លឹះខ្លីខ្លឹម បណ្តុំរូបមន្ត និងសំណួរស្វ័យវាយតម្លៃ)...",
  "keyTakeaways": ["ចំណុចគន្លឹះទី១...", "ចំណុចគន្លឹះទី២...", "ចំណុចគន្លឹះទី៣..."],
  "exercises": [
    { "question": "សំណួរ ឬលំហាត់ទី១...", "answerOrSolution": "ចម្លើយ ឬដំណោះស្រាយ...", "points": 2 },
    { "question": "សំណួរ ឬលំហាត់ទី២...", "answerOrSolution": "ចម្លើយ ឬដំណោះស្រាយ...", "points": 2 }
  ]
}`;

      const parts: any[] = [{ text: prompt }];
      images.forEach((img) => {
        let base64Data = img.data.includes(";base64,") ? img.data.split(";base64,").pop() || "" : img.data;
        parts.push({ inlineData: { mimeType: img.mimeType || "image/jpeg", data: base64Data } });
      });
      pdfs.forEach((pdf) => {
        let base64Data = pdf.data.includes(";base64,") ? pdf.data.split(";base64,").pop() || "" : pdf.data;
        parts.push({ inlineData: { mimeType: "application/pdf", data: base64Data } });
      });

      const modelsToTry = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      for (const m of modelsToTry) {
        try {
          const directRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${savedKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: { responseMimeType: "application/json" }
              })
            }
          );
          if (directRes.ok) {
            const resJson = await directRes.json();
            const textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textOut) {
              const cleaned = cleanJsonString(textOut);
              const parsed = JSON.parse(cleaned);
              if (parsed && parsed.detailedContent && parsed.summaryContent) {
                return parsed;
              }
            }
          }
        } catch (mErr) {
          console.warn(`Direct article model ${m} error:`, mErr);
        }
      }
    } catch (directErr) {
      console.warn("Direct lesson article error:", directErr);
    }
  }

  // 3. Fallback: High quality MoEYS Lesson Article Template
  return generateCurriculumFallbackArticle({
    subject,
    grade,
    chapter: chapter || 'ជំពូកទី ១',
    lessonTitle: lessonTitle || `មេរៀន ${subject}`,
    schoolName,
    teacherName
  });
}

function generateCurriculumFallbackArticle(params: {
  subject: string;
  grade: string;
  chapter: string;
  lessonTitle: string;
  schoolName: string;
  teacherName: string;
}): GeneratedLessonArticleData {
  const { subject, grade, chapter, lessonTitle, schoolName, teacherName } = params;

  return {
    title: `មេរៀន៖ ${lessonTitle}`,
    subject,
    grade,
    chapter,
    objectives: {
      knowledge: [
        `កំណត់ និងយល់ដឹងច្បាស់ពីនិយមន័យ ទ្រឹស្តី និងគោលការណ៍គ្រឹះនៃ ${lessonTitle}`,
        `ចងចាំរូបមន្ត និងច្បាប់សំខាន់ៗដែលពាក់ព័ន្ធនឹងកម្មវិធីសិក្សា ${grade}`
      ],
      skills: [
        `ចេះបកស្រាយ និងអនុវត្តដោះស្រាយលំហាត់គំរូ និងបញ្ហាក្នុងជីវភាពរស់នៅជាក់ស្តែង`,
        `មានសមត្ថភាពវិភាគ និងធ្វើការងារជាក្រុមប្រកបដោយប្រសិទ្ធភាព`
      ],
      attitude: [
        `មានស្មារតីស្រាវជ្រាវ ស្រឡាញ់ការសិក្សា និងចូលរួមយ៉ាងសកម្មក្នុងម៉ោងរៀន`,
        `យកចំណេះដឹងទៅប្រើប្រាស់ជាប្រយោជន៍ក្នុងសង្គម និងការរស់នៅប្រចាំថ្ងៃ`
      ]
    },
    introduction: `មេរៀន «${lessonTitle}» គឺជាផ្នែកមួយដ៏មានសារៈសំខាន់ក្នុងមុខវិជ្ជា ${subject} សម្រាប់សិស្សានុសិស្សកម្រិត ${grade}។ ខ្លឹមសារនៃមេរៀននេះត្រូវបានរៀបចំឡើងយ៉ាងក្បោះក្បាយ ដើម្បីជួយឱ្យសិស្សងាយយល់ ចងចាំបានយូរ និងអាចផ្សារភ្ជាប់ទ្រឹស្តីទៅនឹងការអនុវត្តជាក់ស្តែង។`,
    detailedContent: `### I. ខ្លឹមសារគោល និងទ្រឹស្តីគ្រឹះ

#### ១. និយមន័យ និងសេចក្តីពន្យល់
- **ខ្លឹមសារទី ១៖** ការស្វែងយល់ពីមូលដ្ឋានគ្រឹះនៃ ${lessonTitle}។
- **ខ្លឹមសារទី ២៖** ការកំណត់លក្ខណៈ និងទំនាក់ទំនងរវាងធាតុផ្សំសំខាន់ៗ។

#### ២. រូបមន្ត និងគោលការណ៍គណនា (ប្រសិនបើមាន)
- **រូបមន្តគោល៖** $A = B \\times C$ (ឬរូបមន្តស្តង់ដារនៃ ${subject})
- **ការពន្យល់អថេរ៖**
  - $A$ ៖ តំណាងឱ្យលទ្ធផល ឬទំហំដែលត្រូវស្វែងរក
  - $B$ ៖ ទំហំទីមួយ
  - $C$ ៖ ទំហំទីពីរ

#### ៣. ឧទាហរណ៍គំរូ និងដំណោះស្រាយលម្អិត
> **ឧទាហរណ៍ទី ១៖** ចូរពន្យល់ ឬគណនាតម្លៃនៃ ${lessonTitle} ក្នុងលក្ខខណ្ឌជាក់ស្តែង។
> **ដំណោះស្រាយ៖**
> - **បម្រាប់៖** កំណត់ទិន្នន័យដែលបានផ្តល់ឱ្យ
> - **រូបមន្ត៖** ជ្រើសរើសរូបមន្តសមស្រប
> - **ជំនួសលេខ៖** អនុវត្តការគណនាជាជំហានៗ
> - **ចម្លើយ៖** បង្ហាញលទ្ធផលចុងក្រោយព្រមទាំងខ្នាតត្រឹមត្រូវ។

---

### II. សកម្មភាព និងការពិភាក្សាជាក្រុម
១. គ្រូចែកសិស្សជាក្រុមតូចៗ ដើម្បីពិភាក្សាពីចំណុចគន្លឹះនៃ ${lessonTitle}។
២. តំណាងក្រុមនីមួយៗឡើងធ្វើបទបង្ហាញសង្ខេប។`,
    summaryContent: `### ★ មេរៀនសង្ខេបនៅខាងក្រោយ (Lesson Summary Note)

#### ១. បណ្តុំចំណុចគន្លឹះខ្លីខ្លឹម
- **ចំណុចទី ១៖** និយមន័យគោលនៃ ${lessonTitle} ត្រូវចងចាំឱ្យច្បាស់លាស់។
- **ចំណុចទី ២៖** រាល់ការដោះស្រាយត្រូវផ្អែកលើបម្រាប់ និងរូបមន្តត្រឹមត្រូវ។
- **ចំណុចទី ៣៖** ផ្សារភ្ជាប់ទ្រឹស្តីទៅនឹងឧទាហរណ៍ក្នុងជីវភាពរស់នៅប្រទេសកម្ពុជា។

#### ២. តារាងសង្ខេប និងរូបមន្តចងចាំ
| លំដាប់ | ចំណុចសំខាន់ | រូបមន្ត / ច្បាប់ | ការអនុវត្ត |
| :---: | :--- | :--- | :--- |
| **១** | មូលដ្ឋានគ្រឹះ | $A = B \\times C$ | អនុវត្តដោះស្រាយលំហាត់ទី១ |
| **២** | លក្ខខណ្ឌពិសេស | ករណីជាក់ស្តែង | អនុវត្តក្នុងជីវភាពប្រចាំថ្ងៃ |

#### ៣. សំណួរស្វ័យវាយតម្លៃខ្លួនឯង
១. ចូររៀបរាប់ពីសារៈសំខាន់នៃ ${lessonTitle}?
២. តើអ្នកអាចយកចំណេះដឹងនេះទៅប្រើប្រាស់ក្នុងជីវភាពរស់នៅដោយរបៀបណា?`,
    keyTakeaways: [
      `យល់ដឹង និងចងចាំនិយមន័យគ្រឹះនៃ ${lessonTitle}`,
      `ចេះប្រើប្រាស់រូបមន្ត និងដំណោះស្រាយគំរូបានត្រឹមត្រូវ`,
      `មានសមត្ថភាពស្វ័យវាយតម្លៃ និងឆ្លើយសំណួរពង្រឹងចំណេះដឹង`
    ],
    exercises: [
      {
        question: `ចូរពន្យល់ពីអត្ថន័យ និងសារៈសំខាន់នៃ ${lessonTitle} ក្នុងមុខវិជ្ជា ${subject}?`,
        answerOrSolution: `ចម្លើយលម្អិត៖ ${lessonTitle} ជួយឱ្យសិស្សយល់ដឹងពីគោលការណ៍គ្រឹះ និងរបៀបដោះស្រាយបញ្ហាជាក់ស្តែងតាមក្បួនគរុកោសល្យ។`,
        points: 2
      },
      {
        question: `ចូរលើកឧទាហរណ៍ជាក់ស្តែងចំនួន ២ ដែលទាក់ទងនឹង ${lessonTitle}?`,
        answerOrSolution: `ឧទាហរណ៍ទី១៖ ការអនុវត្តក្នុងថ្នាក់រៀន និងលំហាត់។ ឧទាហរណ៍ទី២៖ ការអនុវត្តក្នុងជីវភាពរស់នៅប្រចាំថ្ងៃ។`,
        points: 2
      }
    ]
  };
}

// =========================================================================
// 3. GENERATE 5-STEP LESSON PLAN (កិច្ចតែងការបង្រៀន)
// =========================================================================

export interface GenerateLessonPlanParams {
  subject?: string;
  grade?: string;
  chapter?: string;
  lessonTitle?: string;
  duration?: string;
  schoolName?: string;
  teacherName?: string;
  extraInstructions?: string;
}

export async function generateLessonPlan(params: GenerateLessonPlanParams): Promise<any> {
  const {
    subject = "ភាសាខ្មែរ",
    grade = "ថ្នាក់ទី ៩",
    chapter = "",
    lessonTitle = "មេរៀនថ្មី",
    duration = "៥០ នាទី",
    schoolName = "សាលារៀនសុវណ្ណភូមិ",
    teacherName = "លោកគ្រូ / អ្នកគ្រូ",
    extraInstructions = ""
  } = params;

  const savedKey = getSavedApiKey();

  // 1. Server proxy
  try {
    const response = await fetch('/api/generate-lesson-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': savedKey
      },
      body: JSON.stringify({
        subject,
        grade,
        chapter,
        lessonTitle,
        duration,
        schoolName,
        teacherName,
        extraInstructions
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.steps) {
        return data;
      }
    }
  } catch (serverErr) {
    console.warn("Server lesson plan generation error, falling back:", serverErr);
  }

  // 2. Direct client call if key exists
  if (savedKey) {
    try {
      const prompt = `អ្នកជាអ្នកជំនាញរៀបចំកិច្ចតែងការបង្រៀនគរុកោសល្យខ្មែរ (MoEYS Standard Lesson Plan Expert) ប្រចាំប្រទេសកម្ពុជា។
សូមរៀបចំកិច្ចតែងការបង្រៀនស្តង់ដារ ៥ ជំហាន ឱ្យបានលម្អិត ត្រឹមត្រូវ និងទាក់ទាញបំផុត៖
- សាលារៀន៖ ${schoolName}
- មុខវិជ្ជា៖ ${subject}
- ថ្នាក់ទី៖ ${grade}
- ជំពូក៖ ${chapter || 'ជំពូកទី ១'}
- ចំណងជើងមេរៀន៖ ${lessonTitle}
- រយៈពេល៖ ${duration}
- គ្រូបង្រៀន៖ ${teacherName}
${extraInstructions ? `- សេចក្តីណែនាំបន្ថែម៖ ${extraInstructions}` : ''}

សូមបង្កើតជាទម្រង់ JSON ត្រឹមត្រូវ 100% តាមរចនាសម្ព័ន្ធ៖
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
      "teacherActivity": "ពិនិត្យអនាម័យ សណ្ដាប់ធ្នាប់ វត្តមានសិស្ស និងស្វាគមន៍",
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
      "teacherActivity": "សកម្មភាពគ្រូក្នុងដំណើរការបង្រៀនមេរៀនថ្មី ពន្យល់ លើកឧទាហរណ៍...",
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

      const modelsToTry = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      for (const m of modelsToTry) {
        try {
          const directRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${savedKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
              })
            }
          );
          if (directRes.ok) {
            const resJson = await directRes.json();
            const textOut = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textOut) {
              const cleaned = cleanJsonString(textOut);
              const parsed = JSON.parse(cleaned);
              if (parsed && parsed.steps) {
                return parsed;
              }
            }
          }
        } catch (mErr) {
          console.warn(`Direct plan model ${m} error:`, mErr);
        }
      }
    } catch (directErr) {
      console.warn("Direct plan generation error:", directErr);
    }
  }

  // 3. Fallback: High quality MoEYS 5-Step Lesson Plan Template
  return generateCurriculumFallbackLessonPlan({
    subject,
    grade,
    chapter: chapter || 'ជំពូកទី ១',
    lessonTitle,
    duration,
    schoolName,
    teacherName
  });
}

function generateCurriculumFallbackLessonPlan(params: {
  subject: string;
  grade: string;
  chapter: string;
  lessonTitle: string;
  duration: string;
  schoolName: string;
  teacherName: string;
}): any {
  const { subject, grade, chapter, lessonTitle, duration } = params;

  return {
    title: `កិច្ចតែងការបង្រៀន៖ ${lessonTitle}`,
    objectives: {
      knowledge: [
        `សិស្សអាចកំណត់ និងពន្យល់ពីខ្លឹមសារគោលនៃមេរៀន ${lessonTitle} បានត្រឹមត្រូវយ៉ាងតិច ៨០%។`,
        `សិស្សចងចាំនិយមន័យ និងរូបមន្តគ្រឹះនៃ ${subject} (${grade})។`
      ],
      skills: [
        `សិស្សចេះអនុវត្តដោះស្រាយលំហាត់គំរូ និងឆ្លើយសំណួរជាក់ស្តែងបានស្ទាត់ជំនាញ។`,
        `សិស្សមានបំណិនសហការ និងធ្វើការងារជាក្រុមប្រកបដោយស្មារតីទទួលខុសត្រូវ។`
      ],
      attitude: [
        `សិស្សមានទំនុកចិត្ត ស្មារតីឧស្សាហ៍ព្យាយាម និងស្រឡាញ់ការសិក្សា។`,
        `សិស្សអនុវត្តវិន័យល្អក្នុងថ្នាក់រៀន និងជួយគ្នាទៅវិញទៅមក។`
      ]
    },
    teachingAids: {
      teacher: `សៀវភៅសិក្សាគោល ${subject} (${grade}), កុំព្យូទ័រ/ស្លាយបង្រៀន, បន្ទាត់, កាតសំណួរ, ឧបករណ៍បង្ហាញជាក់ស្តែង។`,
      student: `សៀវភៅពុម្ព, សៀវភៅសរសេរ, ប៊ិច, ខ្មៅដៃ, បន្ទាត់, សន្លឹកកិច្ចការ។`
    },
    steps: {
      step1Admin: {
        teacherActivity: `គ្រូស្វាគមន៍សិស្ស ពិនិត្យអនាម័យ សណ្ដាប់ធ្នាប់ក្នុងថ្នាក់ និងស្រង់វត្តមានសិស្ស។`,
        studentActivity: `ប្រធានថ្នាក់រាយការណ៍វត្តមានសិស្សអវត្តមាន និងសិស្សទាំងអស់អង្គុយប្រកបដោយរបៀបរៀបរយ។`,
        duration: `៥ នាទី`
      },
      step2Review: {
        teacherActivity: `គ្រូសួរសំណួររំលឹកមេរៀនចាស់៖ «ចូររំលឹកឡើងវិញពីចំណុចសំខាន់ៗនៃមេរៀនកន្លងទៅ?» ព្រមទាំងពិនិត្យកិច្ចការផ្ទះ។`,
        content: `ខ្លឹមសាររំលឹកមេរៀនចាស់៖ ទ្រឹស្តីបទ និងរូបមន្តគោលដែលបានរៀនពីម៉ោងមុន។`,
        studentActivity: `សិស្សស្ម័គ្រចិត្តលើកដៃឡើងឆ្លើយសំណួរ និងបង្ហាញកិច្ចការផ្ទះជូនគ្រូពិនិត្យ។`,
        duration: `៥ នាទី`
      },
      step3NewLesson: {
        teacherActivity: `គ្រូដឹកនាំសិស្សចូលមេរៀនថ្មី «${lessonTitle}» ដោយពន្យល់ទ្រឹស្តី លើកឧទាហរណ៍ជាក់ស្តែង បង្ហាញរូបមន្ត និងណែនាំលំហាត់គំរូ។`,
        content: `ខ្លឹមសារមេរៀនថ្មី៖ ${lessonTitle} (${chapter})
១. និយមន័យ និងគោលការណ៍គ្រឹះ
២. ការពន្យល់លម្អិត និងរូបមន្តគណនា
៣. ឧទាហរណ៍គំរូ និងវិធីដោះស្រាយជាជំហានៗ។`,
        studentActivity: `សិស្សយកចិត្តទុកដាក់ស្ដាប់ការពន្យល់ កត់ត្រាចំណុចសំខាន់ៗ និងសួរសំណួរដេញដោលនៅពេលមានចម្ងល់។`,
        duration: `២៥ នាទី`
      },
      step4Strengthen: {
        teacherActivity: `គ្រូដាក់សំណួរពង្រឹងចំណេះដឹង ឬលំហាត់អនុវត្តរហ័សឱ្យសិស្សធ្វើជាបុគ្គល ឬជាក្រុមតូចៗ ព្រមទាំងដើរសម្របសម្រួល។`,
        content: `សំណួរពង្រឹង៖ «ចូរអនុវត្តគណនា ឬពន្យល់ពីចំណុចគន្លឹះនៃ ${lessonTitle}?»`,
        studentActivity: `សិស្សសហការគ្នាពិភាក្សា និងអនុវត្តដោះស្រាយលំហាត់ រួចឡើងបង្ហាញចម្លើយលើក្តារខៀន។`,
        duration: `១០ នាទី`
      },
      step5Homework: {
        teacherActivity: `គ្រូដាក់កិច្ចការផ្ទះ និងផ្តាំផ្ញើសិស្សឱ្យរំលឹកមេរៀននៅផ្ទះ ព្រមទាំងសម្អាតថ្នាក់រៀនមុនចេញ។`,
        content: `កិច្ចការផ្ទះ៖ អានមេរៀនទំព័របន្ទាប់ និងធ្វើលំហាត់លេខ ១, ២ ក្នុងសៀវភៅពុម្ព។`,
        studentActivity: `សិស្សកត់ត្រាកិច្ចការផ្ទះចូលសៀវភៅ និងត្រៀមរៀបចំសម្ភារសម្រាប់ម៉ោងបន្ទាប់។`,
        duration: `៥ នាទី`
      }
    },
    evaluation: `សិស្សភាគច្រើន (៨៥% ឡើងទៅ) អាចយល់ដឹងពីខ្លឹមសារគោល និងដោះស្រាយលំហាត់នៃមេរៀន ${lessonTitle} បានត្រឹមត្រូវ។`,
    selfReflection: `ការគ្រប់គ្រងពេលវេលាបានល្អ សិស្សចូលរួមយ៉ាងសកម្ម។ ម៉ោងបន្ទាប់នឹងបង្កើនការអនុវត្តជាក់ស្តែងបន្ថែម។`
  };
}
