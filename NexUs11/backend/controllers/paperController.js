import paperService from '../services/paperService.js';

export const paperController = {
  async getPapers(req, res, next) {
    try {
      const userId = req.user?.id || 'default_user';
      const data = await paperService.getPapers(userId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getPaperById(req, res, next) {
    try {
      const userId = req.user?.id || 'default_user';
      const paper = await paperService.getPaperById(userId, req.params.id);
      res.json({ success: true, paper });
    } catch (err) {
      next(err);
    }
  },

  async uploadPaper(req, res, next) {
    try {
      const userId = req.user?.id || 'default_user';

      const payload = {
        ...(req.body || {}),
        fileBuffer: req.file?.buffer || (req.body?.fileData ? Buffer.from(req.body.fileData, 'base64') : null),
        filename: req.file?.originalname || req.body?.filename || req.body?.title || 'document.pdf',
        originalFile: req.file || null,
      };

      const result = await paperService.uploadPaper(userId, payload);
      res.status(201).json(result);
    } catch (err) {
      if (err.statusCode || err.message?.includes('scanned') || err.message?.includes('extraction')) {
        return res.status(err.statusCode || 400).json({
          success: false,
          error: err.message,
          message: err.message,
        });
      }
      next(err);
    }
  },

  async deletePaper(req, res, next) {
    try {
      const userId = req.user?.id || 'default_user';
      const result = await paperService.deletePaper(userId, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async resetPapers(req, res, next) {
    try {
      const userId = req.user?.id || 'default_user';
      const result = await paperService.resetPapers(userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};

export default paperController;
