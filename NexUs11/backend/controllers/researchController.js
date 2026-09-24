import researchService from '../services/researchService.js';

function requireUser(req, res) {
  if (!req.user?.id) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
      error: 'Authentication required.',
    });
    return false;
  }
  return true;
}

export const researchController = {
  async getFindings(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getFindings(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getGaps(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getGaps(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getDirections(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getDirections(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getBrain(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getBrain(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getContradictions(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getContradictions(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getTimeline(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getTimeline(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getCombinations(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getCombinations(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getOpportunities(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getOpportunities(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getExperiments(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getExperiments(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getLineage(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getLineage(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getFrontier(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const data = await researchService.getFrontier(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getImpact(req, res, next) {
    try {
      if (!requireUser(req, res)) return;
      const months = Number(req.query?.months) || 6;
      const data = await researchService.getImpact(req.user.id, months);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
};

export default researchController;
