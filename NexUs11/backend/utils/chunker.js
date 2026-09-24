import { detectSection } from './sectionDetector.js';

/**
 * Section-Aware Semantic Text Chunker for Academic Literature
 * Splits paper text into anchored chunks with section, page, token count, and isolation metadata.
 */
export function chunkPaperText({
  pages = [],
  fullText = '',
  paperId = 'paper_1',
  paperCode = 'P1',
  userId = 'default_user',
  projectId = null,
  sessionId = null,
  chunkSize = 650,
  overlap = 100,
}) {
  const chunks = [];
  let chunkIndex = 1;

  // If structured pages array is provided
  if (Array.isArray(pages) && pages.length > 0) {
    let currentActiveSection = 'Introduction';

    pages.forEach((page) => {
      const pageNumber = page.pageNumber || 1;
      const pageText = (page.text || '').trim();
      if (!pageText) return;

      const paragraphs = pageText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

      paragraphs.forEach((para) => {
        // Check if paragraph starts with a new section header
        currentActiveSection = detectSection(para, currentActiveSection);

        if (para.length > chunkSize) {
          for (let i = 0; i < para.length; i += (chunkSize - overlap)) {
            const slice = para.slice(i, i + chunkSize).trim();
            if (slice && slice.length > 30) {
              chunks.push({
                id: `chunk_${paperCode}_${chunkIndex}`,
                chunk_id: `chunk_${paperCode}_${chunkIndex++}`,
                paper_id: paperId,
                paper_code: paperCode,
                project_id: projectId,
                session_id: sessionId,
                user_id: userId,
                page_number: pageNumber,
                section: currentActiveSection,
                content: slice,
                token_count: Math.ceil(slice.length / 4),
                created_at: new Date().toISOString(),
              });
            }
          }
        } else {
          chunks.push({
            id: `chunk_${paperCode}_${chunkIndex}`,
            chunk_id: `chunk_${paperCode}_${chunkIndex++}`,
            paper_id: paperId,
            paper_code: paperCode,
            project_id: projectId,
            session_id: sessionId,
            user_id: userId,
            page_number: pageNumber,
            section: currentActiveSection,
            content: para.trim(),
            token_count: Math.ceil(para.length / 4),
            created_at: new Date().toISOString(),
          });
        }
      });
    });
  } else if (fullText) {
    // Single block fallback
    const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    let currentActiveSection = 'Introduction';
    let approxPage = 1;

    paragraphs.forEach((para, idx) => {
      approxPage = Math.floor(idx / 3) + 1;
      currentActiveSection = detectSection(para, currentActiveSection);

      if (para.length > chunkSize) {
        for (let i = 0; i < para.length; i += (chunkSize - overlap)) {
          const slice = para.slice(i, i + chunkSize).trim();
          if (slice && slice.length > 30) {
            chunks.push({
              id: `chunk_${paperCode}_${chunkIndex}`,
              chunk_id: `chunk_${paperCode}_${chunkIndex++}`,
              paper_id: paperId,
              paper_code: paperCode,
              project_id: projectId,
              session_id: sessionId,
              user_id: userId,
              page_number: approxPage,
              section: currentActiveSection,
              content: slice,
              token_count: Math.ceil(slice.length / 4),
              created_at: new Date().toISOString(),
            });
          }
        }
      } else {
        chunks.push({
          id: `chunk_${paperCode}_${chunkIndex}`,
          chunk_id: `chunk_${paperCode}_${chunkIndex++}`,
          paper_id: paperId,
          paper_code: paperCode,
          project_id: projectId,
          session_id: sessionId,
          user_id: userId,
          page_number: approxPage,
          section: currentActiveSection,
          content: para.trim(),
          token_count: Math.ceil(para.length / 4),
          created_at: new Date().toISOString(),
        });
      }
    });
  }

  return chunks;
}

export default { chunkPaperText };
