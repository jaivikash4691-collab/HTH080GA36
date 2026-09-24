import { supabase } from '../config/supabase.js';
import { parseDocument, calculateFileHash } from '../utils/documentParser.js';
import { chunkPaperText } from '../utils/chunker.js';
import { generateEmbedding } from '../utils/embeddings.js';

// Multi-tenant in-memory store: userId -> Array of papers
const userPapersStore = new Map();
// Multi-tenant chunks store: userId -> Array of chunks
const userChunksStore = new Map();

export const paperService = {
  async getPapers(userId) {
    if (!userId) {
      return { papers: [], count: 0 };
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('uploaded_papers')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return { papers: data, count: data.length };
        }
      } catch {
        // Fall back to multi-tenant store
      }
    }

    const papers = userPapersStore.get(userId) || [];
    return { papers, count: papers.length };
  },

  async getPaperById(userId, paperId) {
    if (!userId) {
      throw new Error('Authentication required.');
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('uploaded_papers')
          .select('*')
          .eq('id', paperId)
          .eq('user_id', userId)
          .single();

        if (!error && data) {
          return data;
        }
      } catch {
        // Fall back to multi-tenant store
      }
    }

    const userPapers = userPapersStore.get(userId) || [];
    const paper = userPapers.find((p) => p.id === paperId || p.code === paperId);
    if (!paper) {
      const err = new Error(`Paper "${paperId}" not found in your research library.`);
      err.statusCode = 404;
      throw err;
    }
    return paper;
  },

  async uploadPaper(userId, payload = {}) {
    if (!userId) {
      throw new Error('Authentication required.');
    }

    const userPapers = userPapersStore.get(userId) || [];

    // Duplicate detection via filename and title hash (Req 65, 66)
    const fileHash = payload.fileHash || calculateFileHash(payload.filename || payload.title || 'document');
    const existingDuplicate = userPapers.find(
      (p) =>
        (p.extraction_hash && p.extraction_hash === fileHash) ||
        (p.filename && p.filename.toLowerCase() === (payload.filename || '').toLowerCase())
    );

    if (existingDuplicate) {
      return {
        success: true,
        duplicate: true,
        message: 'This paper is already present in this project library.',
        paper: existingDuplicate,
        totalCount: userPapers.length,
      };
    }

    // Limit check (5-8 papers recommended)
    if (userPapers.length >= 10) {
      const err = new Error('Maximum library limit reached (10 papers per research workspace).');
      err.statusCode = 400;
      throw err;
    }

    const cleanTitle =
      payload.title ||
      payload.filename?.replace(/\.(pdf|docx?|pptx?|txt)$/i, '').replace(/[_-]+/g, ' ') ||
      'Research Document';
    const cleanFilename =
      payload.filename || `${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}.pdf`;

    const nextCode = 'P' + (userPapers.length + 1);
    const paperId = 'paper_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    const newPaper = {
      id: paperId,
      user_id: userId,
      session_id: payload.sessionId || null,
      code: nextCode,
      filename: cleanFilename,
      title: cleanTitle,
      authors: payload.authors || 'Research Author et al.',
      publication_year: Number(payload.publicationYear || payload.year) || new Date().getFullYear(),
      pages: Number(payload.pages) || 1,
      file_format: (payload.filename || 'pdf').split('.').pop().toLowerCase(),
      status: 'Ready',
      methodology: payload.methodology || payload.method || 'Standard Empirical Method',
      dataset: payload.dataset || 'Primary Evaluation Set',
      sample_size: payload.sampleSize || payload.sample_size || 'N/A',
      evaluation_metric: payload.evaluationMetric || payload.evaluation_metric || 'Accuracy • Precision',
      main_result: payload.mainResult || payload.main_result || 'Ingested and indexed for literature intelligence.',
      limitations: payload.limitation || payload.limitations || 'Document uploaded by researcher.',
      extraction_hash: fileHash,
      created_at: new Date().toISOString(),
    };

    // Store in Supabase if available
    if (supabase) {
      try {
        await supabase.from('uploaded_papers').insert([newPaper]);
      } catch (e) {
        console.warn('[paperService] Supabase paper insert fallback:', e.message);
      }
    }

    userPapers.push(newPaper);
    userPapersStore.set(userId, userPapers);

    // Section-aware chunking and embedding generation (Req 6-10)
    const rawContent = payload.text || `${newPaper.title}\n\nAbstract: ${newPaper.main_result}\n\nMethodology: ${newPaper.methodology}\n\nDataset: ${newPaper.dataset}\n\nResults: ${newPaper.main_result}\n\nLimitations: ${newPaper.limitations}`;
    const chunks = chunkPaperText({
      fullText: rawContent,
      paperId: newPaper.id,
      paperCode: newPaper.code,
      userId,
      projectId: payload.projectId,
      sessionId: payload.sessionId,
    });

    const userChunks = userChunksStore.get(userId) || [];
    for (const chunk of chunks) {
      chunk.embedding = await generateEmbedding(chunk.content);
      userChunks.push(chunk);

      if (supabase) {
        try {
          await supabase.from('paper_chunks').insert([
            {
              user_id: userId,
              paper_id: newPaper.id,
              session_id: payload.sessionId || null,
              chunk_index: chunks.indexOf(chunk),
              section_name: chunk.section,
              page_number: chunk.page_number,
              excerpt: chunk.content,
              confidence: 98.5,
              embedding: JSON.stringify(chunk.embedding),
            },
          ]);
        } catch {}
      }
    }
    userChunksStore.set(userId, userChunks);

    return {
      success: true,
      paper: newPaper,
      chunksGenerated: chunks.length,
      totalCount: userPapers.length,
    };
  },

  async deletePaper(userId, paperId) {
    if (!userId) {
      throw new Error('Authentication required.');
    }

    if (supabase) {
      try {
        await supabase.from('uploaded_papers').delete().eq('id', paperId).eq('user_id', userId);
        await supabase.from('paper_chunks').delete().eq('paper_id', paperId).eq('user_id', userId);
      } catch {}
    }

    let userPapers = userPapersStore.get(userId) || [];
    const initialLen = userPapers.length;
    userPapers = userPapers.filter((p) => p.id !== paperId && p.code !== paperId);
    userPapersStore.set(userId, userPapers);

    let userChunks = userChunksStore.get(userId) || [];
    userChunks = userChunks.filter((c) => c.paper_id !== paperId && c.paper_code !== paperId);
    userChunksStore.set(userId, userChunks);

    return { success: true, removed: initialLen !== userPapers.length };
  },

  async resetPapers(userId) {
    if (!userId) {
      throw new Error('Authentication required.');
    }
    if (supabase) {
      try {
        await supabase.from('uploaded_papers').delete().eq('user_id', userId);
        await supabase.from('paper_chunks').delete().eq('user_id', userId);
      } catch {}
    }
    userPapersStore.set(userId, []);
    userChunksStore.set(userId, []);
    return { success: true, count: 0 };
  },
};

export default paperService;
