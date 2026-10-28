import { Question } from "../types";
import JSZip from "jszip";
import * as XLSX from "xlsx";

export function getSavedApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("GEMINI_API_KEY") || localStorage.getItem("gemini_api_key") || ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || "";
}

export function saveApiKey(key: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("GEMINI_API_KEY", key);
    localStorage.setItem("gemini_api_key", key);
  }
}

export function removeApiKey() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("GEMINI_API_KEY");
    localStorage.removeItem("gemini_api_key");
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
    // Decode base64 to binary string on client
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

      if (response.ok) {
        let data: any;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new Error("ទទួលបានទិន្នន័យមិនត្រឹមត្រូវពីម៉ាស៊ីនបម្រើ (Invalid response format from server)");
        }
        const rawQuestions: any[] = data.questions || [];
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

      // If it returned 404 (static hosting like Vercel with no custom node running)
      // or other issues, throw to fall back
      if (response.status === 404) {
        throw new Error("SERVER_404");
      } else {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMsg = errorData.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }
    } catch (serverError: any) {
      const savedKey = getSavedApiKey();
      if (serverError.message === "SERVER_404" || (savedKey && savedKey.trim().length > 0)) {
        console.log("Server proxy call failed or returned 404, falling back to direct client-side request using client's API key. Error was:", serverError);
      } else {
        throw serverError; // Propagate normal server errors if no local key is available to fall back to
      }
      
      // Calculate API key
      const apiKey = savedKey;
      if (!apiKey) {
        // Throw a specific error that the UI can catch to ask for a key
        throw new Error("NEED_API_KEY");
      }

      // 2. Direct Gemini API call from the client (Client-side Fallback helper)
      let extractedClientText = "";
      for (const of of reqOfficeFiles) {
        const name = of.name || "Doc";
        const rawType = of.mimeType || "";
        if (name.toLowerCase().endsWith(".docx") || rawType.includes("wordprocessingml")) {
          const txt = await extractClientDocx(of.data);
          extractedClientText += `\n[Word Document: ${name}]\n${txt}\n`;
        } else if (name.toLowerCase().endsWith(".pptx") || rawType.includes("presentationml")) {
          const txt = await extractClientPptx(of.data);
        } else if (name.toLowerCase().endsWith(".xlsx") || name.toLowerCase().endsWith(".xls") || name.toLowerCase().endsWith(".csv") || rawType.includes("spreadsheet") || rawType.includes("excel")) {
          const txt = extractClientExcel(of.data);
          extractedClientText += `\n[Excel Sheet: ${name}]\n${txt}\n`;
        }
      }

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
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error?.message) {
            errMsg = `កំហុសពី Gemini API៖ ${errJson.error.message}`;
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

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
    }
  } catch (error: any) {
    console.error("Error in generateQuestions:", error);
    throw error;
  }
}


