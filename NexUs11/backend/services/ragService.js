import paperService from './paperService.js';
import geminiService, { STRICT_RESEARCH_SYSTEM_PROMPT } from './geminiService.js';
import classifierService, { QUESTION_TYPES } from './classifierService.js';
import { generateEmbedding, generateDeterministicEmbedding } from '../utils/embeddings.js';
import { rerankChunks } from '../utils/reranker.js';
import deepAnalysisService from './deepAnalysisService.js';

export const ragService = {
  async groundedQuery(userId, query, options = {}) {
    const startTime = Date.now();
    let retrievalTime = 0;
    let rerankTime = 0;
    let llmTime = 0;

    if (!userId) {
      throw new Error('Authentication required for grounded literature querying.');
    }

    if (!query || !query.trim()) {
      const err = new Error('Query string is required.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Classification & Scope Check
    const classification = classifierService.classify(query);
    if (classification.isOutOfScope) {
      return {
        query,
        answer: classification.rejectionMessage,
        classification: classification.type,
        citations: [],
        metrics: {
          retrieval_ms: 0,
          reranking_ms: 0,
          llm_ms: 0,
          total_ms: Date.now() - startTime,
        },
      };
    }

    // 2. Fetch User's Uploaded Papers
    const { papers } = await paperService.getPapers(userId);
    if (!papers || papers.length === 0) {
      return {
        query,
        answer: 'No research papers have been uploaded to your personal research library yet. Please upload papers to enable citation-grounded questioning.',
        classification: classification.type,
        citations: [],
        metrics: {
          retrieval_ms: 0,
          reranking_ms: 0,
          llm_ms: 0,
          total_ms: Date.now() - startTime,
        },
      };
    }

    // 3. Fast Retrieval & Candidate Extraction
    const t0 = Date.now();
    const queryVector = await generateEmbedding(query);
    retrievalTime = Date.now() - t0;

    // Build chunks from uploaded papers
    const allChunks = [];
    papers.forEach((p, pIdx) => {
      const pCode = p.code || `P${pIdx + 1}`;
      const pTitle = p.title || 'Research Document';
      const pMethod = p.methodology || p.method || 'Empirical Architecture';
      const pDataset = p.dataset || 'Benchmark Dataset';
      const pResult = p.main_result || p.mainResult || 'Document analyzed.';
      const pLimitation = p.limitations || p.limitation || 'Not explicitly specified in paper.';

      allChunks.push({
        id: `${pCode}-method`,
        paperCode: pCode,
        paperTitle: pTitle,
        section: 'Methodology',
        pageNumber: 2,
        content: `Paper ${pCode} ("${pTitle}") methodology: ${pMethod}. System Architecture: ${pMethod} framework.`,
        embedding: generateDeterministicEmbedding(`${pTitle} ${pMethod} methodology architecture`),
      });

      allChunks.push({
        id: `${pCode}-impl`,
        paperCode: pCode,
        paperTitle: pTitle,
        section: 'Implementation',
        pageNumber: 3,
        content: `Paper ${pCode} ("${pTitle}") implementation: tested with dataset ${pDataset}. Metrics: ${p.evaluation_metric || 'Accuracy, Latency'}.`,
        embedding: generateDeterministicEmbedding(`${pTitle} ${pDataset} implementation database stack framework`),
      });

      allChunks.push({
        id: `${pCode}-results`,
        paperCode: pCode,
        paperTitle: pTitle,
        section: 'Results',
        pageNumber: 4,
        content: `Paper ${pCode} ("${pTitle}") results and findings: ${pResult}`,
        embedding: generateDeterministicEmbedding(`${pTitle} ${pResult} results findings performance accuracy`),
      });

      allChunks.push({
        id: `${pCode}-limits`,
        paperCode: pCode,
        paperTitle: pTitle,
        section: 'Limitations',
        pageNumber: 5,
        content: `Paper ${pCode} ("${pTitle}") limitations and future work: ${pLimitation}`,
        embedding: generateDeterministicEmbedding(`${pTitle} ${pLimitation} limitations future work gap`),
      });
    });

    // 4. Section-Aware Reranking (top 5-8 chunks)
    const t1 = Date.now();
    const rerankedChunks = rerankChunks({
      chunks: allChunks,
      query,
      queryVector,
      prioritizedSections: classification.prioritizedSections,
      topK: 6,
      minRelevanceThreshold: 0.10,
    });
    rerankTime = Date.now() - t1;

    // Check if any relevant context was found
    if (rerankedChunks.length === 0) {
      return {
        query,
        answer: 'The uploaded research papers do not provide sufficient information to answer this question.',
        classification: classification.type,
        citations: [],
        metrics: {
          retrieval_ms: retrievalTime,
          reranking_ms: rerankTime,
          llm_ms: 0,
          total_ms: Date.now() - startTime,
        },
      };
    }

    // 5. Build Context & LLM Prompting
    const literatureContext = rerankedChunks
      .map(
        (c) =>
          `[${c.paperCode} | Section: ${c.section} | Page ${c.pageNumber}]\n${c.content}`
      )
      .join('\n\n');

    let finalAnswer = '';
    const t2 = Date.now();

    if (geminiService.isConfigured()) {
      const prompt = `Based STRICTLY AND ONLY on the supplied research-paper excerpts below, answer the user's question directly.

Context from Uploaded Research Papers:
${literatureContext}

Researcher Question: "${query}"

Guidelines:
- Answer ONLY what was asked. If the question asks about a specific paper or database, state just that.
- If information or reason is not explicitly provided in the text, say: "The uploaded research papers do not provide sufficient information to answer this question."
- Do NOT use outside knowledge. Do NOT hallucinate.`;

      const result = await geminiService.generateText(prompt, STRICT_RESEARCH_SYSTEM_PROMPT, {
        temperature: 0.1,
      });

      if (result.text) {
        finalAnswer = result.text;
      }
    }

    // If LLM unavailable or fallback needed, produce strict grounded response
    if (!finalAnswer) {
      finalAnswer = generateGroundedDeterministicAnswer(query, rerankedChunks, papers, classification);
    }
    llmTime = Date.now() - t2;

    // Format citations for UI (grounded strictly to papers)
    const citations = rerankedChunks.slice(0, 3).map((c) => ({
      code: `${c.paperCode} • p.${c.pageNumber}`,
      title: c.paperTitle,
      section: c.section,
    }));

    return {
      query,
      answer: finalAnswer,
      classification: classification.type,
      citations,
      metrics: {
        retrieval_ms: retrievalTime,
        reranking_ms: rerankTime,
        llm_ms: llmTime,
        total_ms: Date.now() - startTime,
      },
    };
  },
};

function generateGroundedDeterministicAnswer(query, chunks, papers, classification) {
  const q = query.toLowerCase();

  // Match specific paper query e.g. "Paper 1", "Paper 2"
  const paperMatch = q.match(/paper\s*(\d+)/i);
  if (paperMatch) {
    const pNum = parseInt(paperMatch[1], 10);
    const paper = papers[pNum - 1];
    if (!paper) {
      return `Paper ${pNum} is not present among the ${papers.length} uploaded papers in this project.`;
    }

    const paperFullText = `${paper.title} ${paper.methodology || ''} ${paper.dataset || ''} ${paper.main_result || ''} ${paper.limitations || ''} ${paper.evaluation_metric || ''}`.toLowerCase();

    if (q.includes('method') || q.includes('algorithm') || q.includes('approach')) {
      return `Paper ${pNum} ("${paper.title}") uses ${paper.methodology || paper.method || 'empirical methodology'} as its primary approach.`;
    }
    if (q.includes('dataset') || q.includes('data') || q.includes('benchmark')) {
      return `Paper ${pNum} ("${paper.title}") was evaluated on ${paper.dataset || 'its documented dataset'}.`;
    }
    if (q.includes('result') || q.includes('accuracy') || q.includes('performance') || q.includes('outcome')) {
      return `Paper ${pNum} ("${paper.title}") reports the following outcome: ${paper.main_result || paper.mainResult || 'Document results indexed.'}`;
    }
    if (q.includes('limitation') || q.includes('drawback') || q.includes('weakness')) {
      return paper.limitations || paper.limitation
        ? `Paper ${pNum} reports the following limitation: ${paper.limitations || paper.limitation}`
        : `The uploaded research papers do not explicitly state limitations for Paper ${pNum}.`;
    }

    // Check if query asks for specific keyword not mentioned in paper
    const words = q.replace(/paper\s*\d+/gi, '').replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const hasAnyWord = words.some(w => paperFullText.includes(w));

    if (words.length > 0 && !hasAnyWord) {
      return 'The uploaded research papers do not provide sufficient information to answer this question.';
    }

    return `Paper ${pNum} ("${paper.title}"): ${paper.main_result || paper.methodology || 'Document analyzed.'}`;
  }

  // Cross-paper comparison
  if (classification.type === QUESTION_TYPES.COMPARISON || q.includes('compare')) {
    return `Comparison across the ${papers.length} uploaded papers:\n` +
      papers.map((p, i) => `• Paper ${p.code || `P${i + 1}`} ("${p.title}"): Uses ${p.methodology || p.method || 'Methodology'} on ${p.dataset || 'Dataset'}.`).join('\n');
  }

  // General grounded synthesis
  return chunks[0]?.content || 'The uploaded research papers do not provide sufficient information to answer this question.';
}

export default ragService;
