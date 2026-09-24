import analyzerService from '../services/analyzerService.js';

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
};

export default analyzerController;
