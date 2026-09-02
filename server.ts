import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Health check routes for Cloud Run deployment health checks & uptime monitors
app.get(["/api/health", "/health", "/_health"], (_req, res) => {
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

// API route to proxy Gemini API call
app.post("/api/generate-questions", async (req, res) => {
  const { lessonText, count, images, pdfs, officeFiles, questionType, pisaLanguage = 'khmer', categoryCounts } = req.body;
  
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

  if (!hasText && !hasImages && !hasPdfs && !hasOffice) {
    return res.status(400).json({ 
      error: "ខ្លឹមសារមេរៀន រូបភាព ឯកសារ PDF ឬឯកសារការិយាល័យតម្រូវឱ្យបញ្ចូលយ៉ាងហោចណាស់មួយ (Please provide text, images, PDF, or Office files)" 
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

  let languagePrompt = `The language of the output questions and options must be in Khmer language, matching the theme of the material.`;
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

If a requested category has a count of 0, DO NOT generate any questions of that category.

CATEGORY FORMATTING SPECIFICATIONS:
1. For questions in the "matching" category:
   - The question 'text' should ask to match Column A with Column B.
   - The 'options' array MUST contain exactly 4 items, representing Column A and Column B terms beautifully:
     * options[0] is Column A Item 1 (represented by number 1, e.g., "១. <term1>")
     * options[1] is Column A Item 2 (represented by number 2, e.g., "២. <term2>")
     * options[2] is Column B Item 1 (represented by letter 'ក', e.g., "ក. <definition1>")
     * options[3] is Column B Item 2 (represented by letter 'ខ', e.g., "ខ. <definition2>")
   - The explanation should detail which matches which (e.g., 1 with ខ, 2 with ក).

2. For questions in the "fill_blank" category:
   - The question 'text' MUST contain blank spaces represented by dots (e.g., ".......") where key terms are omitted, asking the student to complete the blank space.
   - Set 4 plausible words or choices inside the 'options' array, with the truly correct filled term inside options corresponding to 'correctIndex'.

3. For questions in the "theory" category:
   - The question 'text' should be a general academic theoretical question, or a question exploring real daily-life scenarios (ការរស់នៅអំពីមេរៀន) and student reflections.
   - Set 4 plausible solutions/answers inside the 'options' array.

4. For questions in the "exercise" category:
   - The question 'text' should describe an academic calculation problem or essay problem.
   - Set 4 numeric or formulaic options in the 'options' array.
`;
  } else {
    categoryRatiosPrompt = `
All questions must belong to the "choice" category. 
Ensure that approximately 20% of these questions connect directly to real daily-life situations (ជីវភាពរស់នៅប្រចាំថ្ងៃ) related to the lesson formulas or theories.
`;
  }

  const promptText = `Based on the provided input materials (which may contain text notes, images, PDF files, or Microsoft Office documents), generate exactly ${totalRequestedCount} high-quality questions for students. 

${languagePrompt}

${categoryRatiosPrompt}

CRITICAL EXAM SPECIFICATIONS FOR MATHEMATICS, PHYSICS, AND CHEMISTRY FORMULAS:
If the questions involve math, physics, or chemistry:
- Use standard notations for formulas so they can be processed and rendered beautifully:
  - Exponents (powers): write using "^" (e.g., "x^2", "10^{-5}", "y^{2x}").
  - Subscripts (indices or molecular numbers): write using "_" (e.g., "H_2O", "CO_2", "x_i", "C_nH_{2n+2}"). Note: common formulas like "H2O", "CO2", "H2SO4" can also just be written directly without underscores and will be auto-subscripted.
  - Fractions: write using LaTeX style "\\frac{numerator}{denominator}" (e.g., "\\frac{s}{t}", "\\frac{1}{2}").
  - Square roots: write using "\\sqrt{expression}" (e.g., "\\sqrt{16}", "\\sqrt{x}").
  - Chemical reaction arrows: write using "->" or "-->" or "\\rightarrow" (e.g., "2H_2 + O_2 -> 2H_2O").
  - Mathematics symbols: use LaTeX style formatting: "\\pm" for ±, "\\times" for ×, "\\div" for ÷, "\\le" for ≤, "\\ge" for ≥, "\\pi" for π, "\\Delta" for Δ, "\\alpha" for α, "\\beta" for β, "\\theta" for θ.

Please thoroughly analyze all provided resource attachments (images, PDF documents, and extracted text from Word, PowerPoint, or Excel files) and formulate questions testing the main concepts.

Provide the response in JSON format.`;

  const parts: any[] = [];
  parts.push({ text: promptText });

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
      "gemini-2.5-flash",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest"
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
              contents: { parts: partsList },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "The question text, written in the selected language scheme (Khmer, English, or bilingual Khmer/English in parentheses)" },
                      options: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "Exactly 4 multiple choice options, matching Column A and B for matching, plausible terms/numerical/text for others"
                      },
                      correctIndex: { type: Type.INTEGER, description: "The 0-based index of the correct option" },
                      category: { type: Type.STRING, description: "The precise category of the question: choice, matching, fill_blank, theory, or exercise" },
                      explanation: { type: Type.STRING, description: "Detailed explanation and steps" }
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

    const generatedText = response.text || "[]";
    const jsonParsed = JSON.parse(generatedText);
    const mappedQuestions = Array.isArray(jsonParsed) ? jsonParsed.map((q: any) => ({
      ...q,
      questionType: questionType || 'general',
      category: q.category || 'choice'
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

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
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
          res.status(200).send('<!DOCTYPE html><html><head><title>EduSpin Quiz Master</title></head><body><div id="root"></div></body></html>');
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server startup error:", err);
  process.exit(1);
});
