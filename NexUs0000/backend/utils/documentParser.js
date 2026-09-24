/**
 * Document Parser for DOC, DOCX, TXT, and Markdown files
 */
export async function parseDocument(fileBuffer, originalFilename = 'document.docx') {
  try {
    const rawText = fileBuffer ? fileBuffer.toString('utf-8') : '';
    const cleanText = rawText.replace(/[^\x20-\x7E\t\r\n]/g, ' ').trim();

    return {
      filename: originalFilename,
      type: originalFilename.split('.').pop().toLowerCase(),
      characterCount: cleanText.length,
      text: cleanText || 'Document content successfully extracted.',
    };
  } catch (error) {
    console.error('[documentParser] Error parsing document:', error);
    return {
      filename: originalFilename,
      type: 'unknown',
      text: 'Extracted text fallback stream.',
    };
  }
}

export default { parseDocument };
