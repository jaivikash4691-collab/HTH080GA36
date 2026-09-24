import express from 'express';
import analyzerController from '../controllers/analyzerController.js';

const router = express.Router();

router.post('/analyze', analyzerController.analyze);
router.post('/ask', analyzerController.ask);

export default router;
