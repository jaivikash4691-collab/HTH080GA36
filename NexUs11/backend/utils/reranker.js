import { cosineSimilarity } from './embeddings.js';

/**
 * Section & Semantic Reranker for Academic Literature
 * Reranks top candidates using section priority, keyword match, and semantic vector similarity.
 */

export function rerankChunks({
  chunks = [],
  query = '',
  queryVector = null,
  prioritizedSections = [],
  topK = 6,
  minRelevanceThreshold = 0.15,
}) {
  if (!chunks || chunks.length === 0) return [];

  const cleanQuery = (query || '').toLowerCase();
  const queryTerms = cleanQuery.split(/\s+/).filter((t) => t.length > 2);

  const scored = chunks.map((chunk) => {
    let score = 0;

    // 1. Vector similarity score
    if (queryVector && Array.isArray(chunk.embedding)) {
      const sim = cosineSimilarity(queryVector, chunk.embedding);
      score += sim * 0.55;
    }

    // 2. Section priority bonus
    const section = chunk.section || '';
    if (prioritizedSections.length > 0) {
      const matchIndex = prioritizedSections.findIndex(
        (ps) => ps.toLowerCase() === section.toLowerCase()
      );
      if (matchIndex !== -1) {
        // Boost from 0.15 to 0.35 depending on priority order
        score += Math.max(0.15, 0.35 - matchIndex * 0.05);
      }
    }

    // 3. Exact keyword / term overlap score
    const content = (chunk.content || '').toLowerCase();
    let termMatches = 0;
    queryTerms.forEach((term) => {
      if (content.includes(term)) termMatches++;
    });

    if (queryTerms.length > 0) {
      score += (termMatches / queryTerms.length) * 0.30;
    }

    // Exact phrase match bonus
    if (cleanQuery.length > 5 && content.includes(cleanQuery)) {
      score += 0.25;
    }

    return {
      ...chunk,
      relevanceScore: Number(score.toFixed(4)),
    };
  });

  // Sort descending by relevance score
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Filter by threshold and take topK
  const filtered = scored.filter((c) => c.relevanceScore >= minRelevanceThreshold);
  return filtered.slice(0, topK);
}

export default { rerankChunks };
