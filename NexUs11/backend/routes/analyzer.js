import express from 'express';
import analyzerController from '../controllers/analyzerController.js';

const router = express.Router();

router.post('/analyze', analyzerController.analyze);
router.post('/ask', analyzerController.ask);
router.get('/report', analyzerController.getReport);
router.get('/report/download', analyzerController.downloadReportPdf);
router.get('/status/:jobId', analyzerController.getJobStatus);

export default router;
