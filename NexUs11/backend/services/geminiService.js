import dotenv from 'dotenv';
dotenv.config();

const LLM_PROVIDER = (process.env.LLM_PROVIDER || '').toLowerCase();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '';
const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

const LLM_MODEL = process.env.LLM_MODEL || (NVIDIA_NIM_API_KEY ? 'moonshotai/kimi-k3' : 'gemini-1.5-flash');

export const STRICT_RESEARCH_SYSTEM_PROMPT = `You are a research-paper analysis assistant.

You must analyze uploaded research papers using ONLY the provided document content.

Do not invent a completely different research topic.
Do not use generic/default content.
If information is missing from the document, explicitly state that it was not found.

Follow the user's task strictly and ground every assertion in the provided document excerpts.`;

export const geminiService = {
  isConfigured() {
    return Boolean(
      (GEMINI_API_KEY && !GEMINI_API_KEY.includes('mock') && GEMINI_API_KEY.length > 10) ||
      (NVIDIA_NIM_API_KEY && NVIDIA_NIM_API_KEY.length > 10) ||
      (OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 10) ||
      (OPENAI_API_KEY && OPENAI_API_KEY.length > 10)
    );
  },

  getActiveProvider() {
    if (LLM_PROVIDER) return LLM_PROVIDER;
    if (GEMINI_API_KEY && !GEMINI_API_KEY.includes('mock')) return 'gemini';
    if (NVIDIA_NIM_API_KEY) return 'nvidia_nim';
    if (OPENROUTER_API_KEY) return 'openrouter';
    if (OPENAI_API_KEY) return 'openai';
    return 'unconfigured';
  },

  async generateText(prompt, systemInstruction = STRICT_RESEARCH_SYSTEM_PROMPT, options = {}) {
    if (!this.isConfigured()) {
      return {
        text: null,
        model: 'unconfigured',
        isConfigured: false,
      };
    }

    const provider = this.getActiveProvider();
    const temperature = options.temperature ?? 0.1;

    try {
      if (provider === 'gemini') {
        const model = options.model || LLM_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              temperature,
              maxOutputTokens: options.maxTokens || 4096,
              ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
            },
          }),
        });

        const data = await response.json();
        const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return {
          text: generatedText.trim(),
          model,
          isConfigured: true,
        };
      }

      // OpenAI / NVIDIA NIM / OpenRouter Chat Completion format
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      let apiKey = OPENAI_API_KEY;
      let model = options.model || LLM_MODEL || 'gpt-4o-mini';

      if (provider === 'nvidia_nim') {
        endpoint = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
        apiKey = NVIDIA_NIM_API_KEY;
        model = options.model || process.env.LLM_MODEL || 'moonshotai/kimi-k3';
      } else if (provider === 'openrouter') {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        apiKey = OPENROUTER_API_KEY;
        model = options.model || process.env.LLM_MODEL || 'google/gemini-2.0-flash-001';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: options.maxTokens || 4096,
          ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
        }),
      });

      const data = await response.json();
      const generatedText = data?.choices?.[0]?.message?.content || '';
      return {
        text: generatedText.trim(),
        model,
        isConfigured: true,
      };
    } catch (err) {
      console.warn(`[LLM Service] Generation error with ${provider}:`, err.message);
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
      responseFormat: { type: 'json_object' },
    });

    if (!result.text) return null;

    try {
      let cleanJson = result.text.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn('[LLM Service] Failed to parse JSON response:', e.message);
      return null;
    }
  },
};

export default geminiService;
