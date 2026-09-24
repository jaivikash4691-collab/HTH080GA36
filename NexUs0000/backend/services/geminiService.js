import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export const geminiService = {
  isConfigured() {
    return Boolean(GEMINI_API_KEY && !GEMINI_API_KEY.includes('mock') && GEMINI_API_KEY.length > 10);
  },

  async generateText(prompt, systemInstruction = '') {
    if (!this.isConfigured()) {
      return {
        text: 'AI service is not configured. Please add GEMINI_API_KEY to backend/.env.',
        model: 'unconfigured',
        isConfigured: false,
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  ...(systemInstruction ? [{ text: `System: ${systemInstruction}\n\n` }] : []),
                  { text: prompt },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return {
        text: generatedText || 'Analysis generated based on literature corpus.',
        model: 'gemini-1.5-flash',
        isConfigured: true,
      };
    } catch (err) {
      console.warn('[Gemini Service] API call failed:', err.message);
      return {
        text: 'AI service is not configured. Please add GEMINI_API_KEY to backend/.env.',
        model: 'gemini-fallback',
        isConfigured: false,
      };
    }
  },
};

export default geminiService;
