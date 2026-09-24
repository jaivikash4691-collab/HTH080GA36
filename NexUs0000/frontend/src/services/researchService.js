import api from './api';

export const researchService = {
  async getFindings() {
    return api.get('/research/findings');
  },

  async getGaps() {
    return api.get('/research/gaps');
  },

  async getDirections() {
    return api.get('/research/directions');
  },

  async getBrain() {
    return api.get('/research/brain');
  },

  async getContradictions() {
    return api.get('/research/contradictions');
  },

  async getTimeline() {
    return api.get('/research/timeline');
  },

  async getCombinations() {
    return api.get('/research/combinations');
  },

  async getOpportunities() {
    return api.get('/research/opportunities');
  },

  async getExperiments() {
    return api.get('/research/experiments');
  },

  async getLineage() {
    return api.get('/research/lineage');
  },

  async getFrontier() {
    return api.get('/research/frontier');
  },

  async getImpact() {
    return api.get('/research/impact');
  },
};

export default researchService;
