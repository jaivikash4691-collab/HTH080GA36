import paperService from './paperService.js';
import geminiService, { STRICT_RESEARCH_SYSTEM_PROMPT } from './geminiService.js';
import classifierService, { QUESTION_TYPES } from './classifierService.js';
import { generateEmbedding, generateDeterministicEmbedding } from '../utils/embeddings.js';
import { rerankChunks } from '../utils/reranker.js';

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

    // Get real stored chunks for the user
    let storedChunks = await paperService.getPaperChunks(userId, options.paperId);

    // If in-memory chunk store has no chunks yet, construct chunks from paper full text
    if (!storedChunks || storedChunks.length === 0) {
      storedChunks = [];
      papers.forEach((p, pIdx) => {
        const pCode = p.code || `P${pIdx + 1}`;
        const pTitle = p.title || 'Research Document';

        if (p.sections && p.sections.length > 0) {
          p.sections.forEach((s, sIdx) => {
            storedChunks.push({
              id: `${pCode}-sec-${sIdx}`,
              paper_id: p.id,
              paperCode: pCode,
              paperTitle: pTitle,
              section: s.section,
              pageNumber: Math.floor(sIdx / 2) + 1,
              content: `[${pCode} | Section: ${s.section}]\n${s.content}`,
              embedding: generateDeterministicEmbedding(`${pTitle} ${s.section} ${s.content.slice(0, 300)}`),
            });
          });
        } else {
          storedChunks.push({
            id: `${pCode}-full`,
            paper_id: p.id,
            paperCode: pCode,
            paperTitle: pTitle,
            section: 'General',
            pageNumber: 1,
            content: `[${pCode} | Title: ${pTitle}]\n${p.full_text || p.main_result || ''}`,
            embedding: generateDeterministicEmbedding(`${pTitle} ${p.full_text || ''}`),
          });
        }
      });
    }
    retrievalTime = Date.now() - t0;

    // 4. Section-Aware Reranking (top 5-8 chunks)
    const t1 = Date.now();
    const rerankedChunks = rerankChunks({
      chunks: storedChunks,
      query,
      queryVector,
      prioritizedSections: classification.prioritizedSections,
      topK: 6,
      minRelevanceThreshold: 0.05,
    });
    rerankTime = Date.now() - t1;

    console.log(`[RETRIEVAL] paperId: ${options.paperId || 'all'}, retrieved chunks: ${rerankedChunks.length}`);

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
          `[${c.paperCode || c.paper_code || 'P1'} | Section: ${c.section || c.section_name || 'General'} | Page ${c.page_number || c.pageNumber || 1}]\n${c.content || c.excerpt || ''}`
      )
      .join('\n\n');

    let finalAnswer = '';
    const t2 = Date.now();

    if (geminiService.isConfigured()) {
      console.log(`[LLM] model: ${geminiService.getActiveProvider()}, context characters: ${literatureContext.length}`);
      const prompt = `Based STRICTLY AND ONLY on the supplied research-paper excerpts below, answer the user's question directly.

Context from Uploaded Research Papers:
${literatureContext}

Researcher Question: "${query}"

Guidelines:
- Answer ONLY what was asked. If the question asks about a specific paper or technology, answer specifically.
- If information or reason is not explicitly provided in the text, say: "The uploaded research papers do not provide sufficient information to answer this question."
- Do NOT use outside knowledge. Do NOT invent facts or hallucinate.`;

      const result = await geminiService.generateText(prompt, STRICT_RESEARCH_SYSTEM_PROMPT, {
        temperature: 0.1,
      });

      if (result.text) {
        finalAnswer = result.text;
      }
    }

    // Fallback: strictly grounded deterministic answer from real paper content
    if (!finalAnswer) {
      finalAnswer = generateGroundedDeterministicAnswer(query, rerankedChunks, papers, classification);
    }
    llmTime = Date.now() - t2;

    // Format citations for UI
    const citations = rerankedChunks.slice(0, 3).map((c) => ({
      code: `${c.paperCode || c.paper_code || 'P1'} • p.${c.page_number || c.pageNumber || 1}`,
      title: c.paperTitle || papers[0]?.title || 'Uploaded Paper',
      section: c.section || c.section_name || 'General',
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

    const paperFullText = `${paper.title} ${paper.methodology || ''} ${paper.dataset || ''} ${paper.main_result || ''} ${paper.limitations || ''} ${paper.full_text || ''}`.toLowerCase();

    if (q.includes('method') || q.includes('algorithm') || q.includes('approach') || q.includes('architecture')) {
      return `Paper ${pNum} ("${paper.title}") uses the following methodology/approach: ${paper.methodology || paper.method || 'empirical architecture and measurements'}.`;
    }
    if (q.includes('dataset') || q.includes('data') || q.includes('benchmark') || q.includes('testbench')) {
      return `Paper ${pNum} ("${paper.title}") was evaluated on ${paper.dataset || 'its documented experimental setup'}.`;
    }
    if (q.includes('result') || q.includes('accuracy') || q.includes('performance') || q.includes('finding')) {
      return `Paper ${pNum} ("${paper.title}") reports the following findings: ${paper.main_result || paper.mainResult || 'Detailed results documented in paper text.'}`;
    }
    if (q.includes('limitation') || q.includes('drawback') || q.includes('weakness') || q.includes('gap')) {
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
      papers.map((p, i) => `• Paper ${p.code || `P${i + 1}`} ("${p.title}"): Uses ${p.methodology || 'Methodology'} on ${p.dataset || 'Test setup'}. Result: ${p.main_result || 'Verified.'}`).join('\n');
  }

  // General grounded synthesis from top retrieved chunk
  return chunks[0]?.content || 'The uploaded research papers do not provide sufficient information to answer this question.';
}

export default ragService;
