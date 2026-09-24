import paperService from '../services/paperService.js';

export const paperController = {
  async getPapers(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in to access your papers.',
          error: 'Authentication required.',
        });
      }
      const data = await paperService.getPapers(userId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getPaperById(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          error: 'Authentication required.',
        });
      }
      const paper = await paperService.getPaperById(userId, req.params.id);
      res.json({ success: true, paper });
    } catch (err) {
      next(err);
    }
  },

  async uploadPaper(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to upload papers.',
          error: 'Authentication required.',
        });
      }
      const result = await paperService.uploadPaper(userId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async deletePaper(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          error: 'Authentication required.',
        });
      }
      const result = await paperService.deletePaper(userId, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async resetPapers(req, res, next) {
    try {
      res.json({ success: true, count: 0, message: 'Reset completed.' });
    } catch (err) {
      next(err);
    }
  },
};

export default paperController;
