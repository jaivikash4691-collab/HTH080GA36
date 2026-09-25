import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * PDF Parsing Utility for Academic Literature Ingestion
 * Uses PDFParse to extract genuine text, pages, and metadata from binary PDF buffers.
 */
export async function parsePdf(fileBuffer, originalFilename = 'document.pdf') {
  if (!fileBuffer || fileBuffer.length === 0) {
    return {
      success: false,
      isScanned: true,
      error: 'Empty PDF buffer received.',
      errorMessage: 'This PDF appears to contain scanned/image pages. Text extraction could not retrieve sufficient content.',
      filename: originalFilename,
      characterCount: 0,
      totalPages: 0,
      pages: [],
      text: '',
    };
  }

  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: fileBuffer });
    await parser.load();

    const parsedData = await parser.getText();
    const rawPages = parsedData.pages || [];
    const totalPages = parsedData.total || rawPages.length || 1;

    let fullText = (parsedData.text || '').trim();

    // Clean page marker lines e.g. "-- 1 of 5 --" if present
    fullText = fullText.replace(/--\s*\d+\s+of\s+\d+\s*--/g, '').trim();

    const pages = [];
    if (rawPages.length > 0) {
      rawPages.forEach((p, idx) => {
        const cleanedPageText = (p.text || '').replace(/--\s*\d+\s+of\s+\d+\s*--/g, '').trim();
        if (cleanedPageText) {
          pages.push({
            pageNumber: p.num || idx + 1,
            text: cleanedPageText,
          });
        }
      });
    }

    if (pages.length === 0 && fullText.length > 0) {
      const pageSize = 1800;
      const calculatedPages = Math.max(1, Math.ceil(fullText.length / pageSize));
      for (let i = 0; i < calculatedPages; i++) {
        pages.push({
          pageNumber: i + 1,
          text: fullText.slice(i * pageSize, (i + 1) * pageSize).trim(),
        });
      }
    }

    // Clean non-printable characters
    const cleanedText = fullText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    // Check if the PDF is scanned or contains no extractable text
    const charCount = cleanedText.length;
    if (charCount < 50) {
      return {
        success: false,
        isScanned: true,
        error: 'Insufficient text extracted from PDF.',
        errorMessage: 'This PDF appears to contain scanned/image pages. Text extraction could not retrieve sufficient content.',
        filename: originalFilename,
        characterCount: charCount,
        totalPages,
        pages: [],
        text: '',
      };
    }

    return {
      success: true,
      isScanned: false,
      filename: originalFilename,
      characterCount: charCount,
      totalPages: pages.length || totalPages,
      pages,
      text: cleanedText,
    };
  } catch (err) {
    console.error(`[pdfParser] Error extracting text from ${originalFilename}:`, err.message);
    return {
      success: false,
      isScanned: true,
      error: err.message,
      errorMessage: 'This PDF appears to contain scanned/image pages. Text extraction could not retrieve sufficient content.',
      filename: originalFilename,
      characterCount: 0,
      totalPages: 0,
      pages: [],
      text: '',
    };
  }
}

export default { parsePdf };
