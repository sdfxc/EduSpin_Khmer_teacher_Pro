import { Question } from "../types";

export function getSavedApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("GEMINI_API_KEY") || ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || "";
}

export function saveApiKey(key: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("GEMINI_API_KEY", key);
  }
}

export function removeApiKey() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("GEMINI_API_KEY");
  }
}

export async function generateQuestions(lessonText: string, count: number = 25): Promise<Question[]> {
  try {
    // 1. First, try to request the custom backend server proxy
    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ lessonText, count })
      });

      if (response.ok) {
        const data = await response.json();
        const rawQuestions: any[] = data.questions || [];
        return rawQuestions.map((q: any, i: number) => ({
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          id: `q-${i}-${Date.now()}`
        }));
      }

      // If it returned 404 (static hosting like Vercel with no custom node running)
      // or other issues, throw to fall back
      if (response.status === 404) {
        throw new Error("SERVER_404");
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (serverError: any) {
      // If it's not a server 404, propagate up unless we wish to fallback anyway
      console.log("Server proxy call failed or not found, falling back to direct client-side request. Reason:", serverError.message);
      
      // Calculate API key
      const apiKey = getSavedApiKey();
      if (!apiKey) {
        // Throw a specific error that the UI can catch to ask for a key
        throw new Error("NEED_API_KEY");
      }

      // 2. Direct Gemini API call from the client
      const prompt = `Based on the following lesson text, generate ${count} multiple-choice questions for students in Khmer language. 
Each question should be high-quality and have exactly 4 options.
The language of the output questions and options must be in Khmer language, matching the theme.

CRITICAL EXAM SPECIFICATIONS FOR MATHEMATICS, PHYSICS, AND CHEMISTRY FORMULAS:
If the questions involve math, physics, or chemistry:
- Use standard notations for formulas so they can be processed and rendered beautifully:
  - Exponents (powers): write using "^" (e.g., "x^2", "10^{-5}", "y^{2x}").
  - Subscripts (indices or molecular numbers): write using "_" (e.g., "H_2O", "CO_2", "x_i", "C_nH_{2n+2}"). Note: common formulas like "H2O", "CO2", "H2SO4" can also just be written directly without underscores and will be auto-subscripted.
  - Fractions: write using LaTeX style "\\frac{numerator}{denominator}" (e.g., "\\frac{s}{t}", "\\frac{1}{2}").
  - Square roots: write using "\\sqrt{expression}" (e.g., "\\sqrt{16}", "\\sqrt{x}").
  - Chemical reaction arrows: write using "->" or "-->" or "\\rightarrow" (e.g., "2H_2 + O_2 -> 2H_2O").
  - Mathematics symbols: use LaTeX style formatting: "\\pm" for ±, "\\times" for ×, "\\div" for ÷, "\\le" for ≤, "\\ge" for ≥, "\\pi" for π, "\\Delta" for Δ, "\\alpha" for α, "\\beta" for β, "\\theta" for θ.

Provide the response in JSON format.

Lesson Text:
${lessonText}`;

      const directRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    text: { type: "STRING", description: "The question text, written in Khmer" },
                    options: { 
                      type: "ARRAY", 
                      items: { type: "STRING" },
                      description: "Exactly 4 multiple choice options, written in Khmer"
                    },
                    correctIndex: { type: "INTEGER", description: "The 0-based index of the correct option" }
                  },
                  required: ["text", "options", "correctIndex"]
                }
              }
            }
          })
        }
      );

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

      const jsonResult = await directRes.ok ? await directRes.json() : {};
      const textContent = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error("គ្មានទិន្នន័យត្រឡប់មកវិញពី Gemini API ទេ។");
      }

      const rawQuestions = JSON.parse(textContent);
      return rawQuestions.map((q: any, i: number) => ({
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        id: `q-${i}-${Date.now()}`
      }));
    }
  } catch (error: any) {
    console.error("Error in generateQuestions:", error);
    throw error;
  }
}


