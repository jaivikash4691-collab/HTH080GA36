import { supabase } from '../config/supabase.js';

// Multi-tenant in-memory store: userId -> Array of papers
const userPapersStore = new Map();

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

    const cleanTitle = payload.title || payload.filename?.replace(/\.(pdf|docx?|txt)$/i, '').replace(/_/g, ' ') || 'Research Document';
    const cleanFilename = payload.filename || `${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}.pdf`;

    const userPapers = userPapersStore.get(userId) || [];
    const nextCode = 'P' + (userPapers.length + 1);
    const paperId = 'paper_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    const newPaper = {
      id: paperId,
      user_id: userId,
      code: nextCode,
      filename: cleanFilename,
      title: cleanTitle,
      authors: payload.authors || 'Research Author et al.',
      publication_year: Number(payload.publicationYear || payload.year) || new Date().getFullYear(),
      pages: Number(payload.pages) || 1,
      status: 'Ready',
      methodology: payload.methodology || payload.method || 'Standard Empirical Method',
      dataset: payload.dataset || 'Primary Evaluation Set',
      sample_size: payload.sampleSize || payload.sample_size || 'N/A',
      evaluation_metric: payload.evaluationMetric || payload.evaluation_metric || 'Accuracy • Precision',
      main_result: payload.mainResult || payload.main_result || 'Ingested and indexed for literature intelligence.',
      limitations: payload.limitation || payload.limitations || 'Document uploaded by researcher.',
      created_at: new Date().toISOString(),
    };

    if (supabase) {
      try {
        await supabase.from('uploaded_papers').insert([newPaper]);
      } catch {}
    }

    userPapers.push(newPaper);
    userPapersStore.set(userId, userPapers);

    return {
      success: true,
      paper: newPaper,
      totalCount: userPapers.length,
    };
  },

  async deletePaper(userId, paperId) {
    if (!userId) {
      throw new Error('Authentication required.');
    }

    if (supabase) {
      try {
        await supabase
          .from('uploaded_papers')
          .delete()
          .eq('id', paperId)
          .eq('user_id', userId);
      } catch {}
    }

    let userPapers = userPapersStore.get(userId) || [];
    const initialLen = userPapers.length;
    userPapers = userPapers.filter((p) => p.id !== paperId && p.code !== paperId);
    userPapersStore.set(userId, userPapers);

    return { success: true, removed: initialLen !== userPapers.length };
  },
};

export default paperService;
