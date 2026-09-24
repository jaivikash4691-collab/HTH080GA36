import express from 'express';
import researchController from '../controllers/researchController.js';

const router = express.Router();

router.get('/findings', researchController.getFindings);
router.get('/gaps', researchController.getGaps);
router.get('/directions', researchController.getDirections);
router.get('/brain', researchController.getBrain);
router.get('/contradictions', researchController.getContradictions);
router.get('/timeline', researchController.getTimeline);
router.get('/combinations', researchController.getCombinations);
router.get('/opportunities', researchController.getOpportunities);
router.get('/experiments', researchController.getExperiments);
router.get('/lineage', researchController.getLineage);
router.get('/frontier', researchController.getFrontier);
router.get('/impact', researchController.getImpact);

export default router;
