import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authMiddleware from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import papersRoutes from './routes/papers.js';
import analyzerRoutes from './routes/analyzer.js';
import conversationsRoutes from './routes/conversations.js';
import researchRoutes from './routes/research.js';
import feedbackRoutes from './routes/feedback.js';

// Controllers for compatibility layer
import paperController from './controllers/paperController.js';
import researchController from './controllers/researchController.js';
import analyzerController from './controllers/analyzerController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());
app.use(authMiddleware);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NEXUS Academic AI Engine',
    timestamp: new Date().toISOString(),
  });
});

// Primary API Routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/analyzer', analyzerRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/feedback', feedbackRoutes);

// Project-based report & analysis endpoints (Req 56, 57, 58)
app.post('/api/projects/:projectId/analyze', analyzerController.analyze);
app.get('/api/projects/:projectId/analyzed-paper', analyzerController.getReport);
app.get('/api/projects/:projectId/analyzed-paper/download', analyzerController.downloadReportPdf);
app.get('/api/research/analyzed-paper', analyzerController.getReport);
app.get('/api/research/analyzed-paper/download', analyzerController.downloadReportPdf);

// Compatibility alias routes (/api/literature/*)
app.get('/api/literature/papers', paperController.getPapers);
app.post('/api/literature/upload', paperController.uploadPaper);
app.get('/api/literature/findings', researchController.getFindings);
app.post('/api/literature/reset', (req, res) => res.json({ success: true, count: 0 }));
app.get('/api/literature/contradictions', researchController.getContradictions);
app.get('/api/literature/gaps', researchController.getGaps);
app.get('/api/literature/strategy', researchController.getDirections);
app.get('/api/literature/brain', researchController.getBrain);
app.get('/api/literature/radar', researchController.getGaps);
app.get('/api/literature/contradiction-hunter', researchController.getContradictions);
app.get('/api/literature/timeline', researchController.getTimeline);
app.get('/api/literature/combinations', researchController.getCombinations);
app.get('/api/literature/opportunities', researchController.getOpportunities);
app.get('/api/literature/experiments', researchController.getExperiments);
app.get('/api/literature/lineage', researchController.getLineage);
app.get('/api/literature/frontier', researchController.getFrontier);
app.get('/api/literature/impact', researchController.getImpact);
app.post('/api/literature/ask', analyzerController.ask);

// Error Handling Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[NEXUS Server] Running on http://localhost:${PORT}`);
});

export default app;
