// @ts-ignore
if (typeof global.DOMMatrix === 'undefined') {
    // @ts-ignore
    global.DOMMatrix = class DOMMatrix {
        constructor() {}
    };
}
let pdf = require('pdf-parse');
// Handle default export if it exists (ESM interop)
if (pdf.default) {
    pdf = pdf.default;
}
import mammoth from 'mammoth';
import { callGemini } from "@/lib/agents/ai-client";

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
        const data = await pdf(buffer);
        return data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }
    return "";
}

export interface ResumeAnalysisResult {
    skills: string[];
    experienceYears: number;
    credibilityScore: number;
    summary: string;
}

export async function analyzeResumeWithGemini(text: string): Promise<ResumeAnalysisResult> {
    const prompt = `
    You are an expert HR and Technical Recruiter. Analyze the following resume text and extract key information.
    
    Resume Text:
    """
    ${text.slice(0, 10000)}
    """
    
    Return a JSON object with the following fields:
    - "skills": Array of strings (technical and soft skills found).
    - "experienceYears": Number (total years of professional experience).
    - "credibilityScore": Number (0-100, based on the quality, detail, and coherence of the resume. A standard good resume should be around 70-80. Exceptional ones 90+. Poor/Sparse ones <50).
    - "summary": String (a brief 2-sentence professional summary).

    Ensure the output is valid JSON. Do not include markdown formatting like \`\`\`json.
    `;

    try {
        const response = await callGemini(prompt, 1000);
        const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanText);

        return {
            skills: Array.isArray(data.skills) ? data.skills : [],
            experienceYears: typeof data.experienceYears === 'number' ? data.experienceYears : 0,
            credibilityScore: typeof data.credibilityScore === 'number' ? data.credibilityScore : 50,
            summary: data.summary || "No summary available."
        };
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        // Fallback or rethrow
        return {
            skills: [],
            experienceYears: 0,
            credibilityScore: 40, // Default low score on error
            summary: "Could not analyze resume."
        };
    }
}
