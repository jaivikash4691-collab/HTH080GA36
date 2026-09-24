import analyzerService from '../services/analyzerService.js';
import reportService from '../services/reportService.js';

export const analyzerController = {
  async analyze(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in to run research analysis.',
          error: 'Authentication required.',
        });
      }

      // Check if async processing requested
      if (req.query.async === 'true' || req.body.async === true) {
        const job = await reportService.startAnalysisJob(userId, req.params.projectId || req.body.projectId);
        return res.status(202).json({
          success: true,
          jobId: job.id,
          status: job.status,
          message: 'Analysis job started in background.',
        });
      }

      const result = await analyzerService.analyze(userId, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async ask(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to ask questions.',
          error: 'Authentication required.',
        });
      }
      const { query } = req.body;
      const result = await analyzerService.ask(userId, query, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getReport(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to view research report.',
          error: 'Authentication required.',
        });
      }
      const projectId = req.params.projectId || req.query.projectId || null;
      const report = await analyzerService.getReport(userId, projectId);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'No research report found. Please run analysis first.',
        });
      }
      res.json({ success: true, report });
    } catch (err) {
      next(err);
    }
  },

  async downloadReportPdf(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to download research report.',
          error: 'Authentication required.',
        });
      }
      const projectId = req.params.projectId || req.query.projectId || null;
      const pdfBuffer = await analyzerService.getReportPdfBuffer(userId, projectId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="NEXUS_AI_Research_Report_${Date.now()}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  },

  async getJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const job = reportService.getJobStatus(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }
      res.json({ success: true, job });
    } catch (err) {
      next(err);
    }
  },
};

export default analyzerController;
