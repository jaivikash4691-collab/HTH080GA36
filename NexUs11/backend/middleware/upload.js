import multer from 'multer';

// Memory storage keeps the file in buffer for instant in-memory extraction
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(pdf|docx?|pptx?|txt)$/i;
    if (allowedExtensions.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Supported formats: PDF, DOC, DOCX, PPT, PPTX, TXT.'));
    }
  },
});

export default upload;
