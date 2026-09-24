import dotenv from 'dotenv';
dotenv.config();

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'gemini';
const LLM_MODEL = process.env.LLM_MODEL || 'gemini-1.5-flash';
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || '';
const LLM_BASE_URL = process.env.LLM_BASE_URL || '';

export const STRICT_RESEARCH_SYSTEM_PROMPT = `You are NEXUS Research Analyzer.

Your task is to analyze uploaded research papers.

You must answer using ONLY information contained in the supplied research-paper context.

Do not use your pretrained knowledge to fill missing information.

Do not invent facts.
Do not invent results.
Do not invent statistics.
Do not invent algorithms.
Do not invent technologies.
Do not invent datasets.
Do not invent research gaps.
Do not invent citations.

If the information is not present in the supplied research-paper context, explicitly state:
"The uploaded research papers do not provide sufficient information to answer this question."

Distinguish clearly between:
1. Information explicitly stated in the papers.
2. Cross-paper analysis.
3. AI-derived interpretation.
4. Suggested research directions.

Never present a suggestion as an established fact.

Remain relevant to the user's question. If the user asks about a specific paper or technology, answer only that question without dumping unrelated summaries.

Do not answer questions outside the uploaded research papers. If the question is unrelated, state:
"This question is outside the scope of the uploaded research papers. I can answer questions related to the papers in this project."`;

export const geminiService = {
  isConfigured() {
    return Boolean(
      LLM_API_KEY &&
        !LLM_API_KEY.includes('mock') &&
        !LLM_API_KEY.includes('unconfigured') &&
        LLM_API_KEY.length > 10
    );
  },

  async generateText(prompt, systemInstruction = STRICT_RESEARCH_SYSTEM_PROMPT, options = {}) {
    if (!this.isConfigured()) {
      return {
        text: null,
        model: 'unconfigured',
        isConfigured: false,
      };
    }

    const temperature = options.temperature ?? 0.1;

    try {
      const url =
        LLM_BASE_URL ||
        `https://generativelanguage.googleapis.com/v1beta/models/${LLM_MODEL}:generateContent?key=${LLM_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction || STRICT_RESEARCH_SYSTEM_PROMPT }],
          },
          generationConfig: {
            temperature: temperature,
            topK: 1,
            topP: 0.1,
            maxOutputTokens: options.maxTokens || 4096,
            ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
          },
        }),
      });

      const data = await response.json();
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        text: generatedText.trim(),
        model: LLM_MODEL,
        isConfigured: true,
      };
    } catch (err) {
      console.warn('[LLM Service] Generation failed:', err.message);
      return {
        text: null,
        model: LLM_MODEL,
        isConfigured: false,
        error: err.message,
      };
    }
  },

  async generateJson(prompt, systemInstruction = STRICT_RESEARCH_SYSTEM_PROMPT) {
    const result = await this.generateText(prompt, systemInstruction, {
      temperature: 0.0,
      responseMimeType: 'application/json',
    });

    if (!result.text) return null;

    try {
      const cleanJson = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn('[LLM Service] Failed to parse JSON response:', e.message);
      return null;
    }
  },
};

export default geminiService;
