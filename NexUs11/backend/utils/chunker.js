/**
 * Semantic Text Chunker for Academic Literature
 * Splits paper text into anchored chunks with section and page metadata.
 */
export function chunkPaperText(pages = [], paperCode = 'P1', chunkSize = 600) {
  const chunks = [];
  let chunkIndex = 1;

  pages.forEach((page) => {
    const text = page.text || '';
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    paragraphs.forEach((para) => {
      if (para.length > chunkSize) {
        // Sub-chunk long paragraphs
        for (let i = 0; i < para.length; i += chunkSize) {
          const slice = para.slice(i, i + chunkSize).trim();
          if (slice) {
            chunks.push({
              id: `${paperCode}-c${chunkIndex++}`,
              paperCode,
              pageNumber: page.pageNumber,
              text: slice,
              tokenCount: Math.ceil(slice.length / 4),
            });
          }
        }
      } else {
        chunks.push({
          id: `${paperCode}-c${chunkIndex++}`,
          paperCode,
          pageNumber: page.pageNumber,
          text: para.trim(),
          tokenCount: Math.ceil(para.length / 4),
        });
      }
    });
  });

  return chunks;
}

export default { chunkPaperText };
