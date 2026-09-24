/**
 * Embeddings & Vector Similarity Utilities
 */

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
 * (dimension 64 for high-speed calculation or fallback)
 */
export function generateDeterministicEmbedding(text, dimension = 64) {
  const embedding = new Array(dimension).fill(0);
  const clean = (text || '').toLowerCase();

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const index = (charCode * (i + 1)) % dimension;
    embedding[index] += Math.sin(charCode + i);
  }

  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? embedding.map((v) => v / norm) : embedding;
}

export default {
  cosineSimilarity,
  generateDeterministicEmbedding,
};
