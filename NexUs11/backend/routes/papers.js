import express from 'express';
import paperController from '../controllers/paperController.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/', paperController.getPapers);
router.post('/upload', upload.single('file'), paperController.uploadPaper);
router.post('/reset', paperController.resetPapers);
router.get('/:id', paperController.getPaperById);
router.delete('/:id', paperController.deletePaper);

export default router;
