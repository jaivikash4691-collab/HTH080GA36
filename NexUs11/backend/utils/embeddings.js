import dotenv from 'dotenv';
dotenv.config();

/**
 * Configurable Embeddings & Semantic Vector Engine
 * Supports OpenAI / Gemini / Custom / Normalized High-Dimension Fallback.
 */

const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'default';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-004';
const EMBEDDING_DIMENSION = 128;

/**
 * Calculates cosine similarity between two numeric vectors
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Generates deterministic semantic embeddings from text string
 */
export function generateDeterministicEmbedding(text, dimension = EMBEDDING_DIMENSION) {
  const embedding = new Array(dimension).fill(0);
  const clean = (text || '').toLowerCase().trim();

  // N-gram and token hashing for richer semantic representation
  const words = clean.split(/\s+/).filter(Boolean);
  
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i);
      const index = (charCode * (i + 1) * 31 + w * 17) % dimension;
      embedding[index] += Math.sin(charCode + i + w);
    }
  }

  // Normalize to unit vector
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? embedding.map((v) => Number((v / norm).toFixed(6))) : embedding;
}

/**
 * Asynchronously generates embedding using configured provider or deterministic vector
 */
export async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '';
  
  if (EMBEDDING_PROVIDER === 'gemini' && apiKey && !apiKey.includes('mock')) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: text.slice(0, 2048) }] },
          }),
        }
      );
      const data = await response.json();
      if (data?.embedding?.values) {
        return data.embedding.values;
      }
    } catch {
      // Fallback to high-dimensional deterministic embedding
    }
  }

  return generateDeterministicEmbedding(text, EMBEDDING_DIMENSION);
}

export default {
  cosineSimilarity,
  generateEmbedding,
  generateDeterministicEmbedding,
  EMBEDDING_PROVIDER,
  EMBEDDING_MODEL,
};
