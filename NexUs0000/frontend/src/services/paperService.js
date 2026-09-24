import api from './api';

export const paperService = {
  async getPapers() {
    return api.get('/papers');
  },

  async getPaperById(id) {
    return api.get(`/papers/${id}`);
  },

  async uploadPaper(paperData) {
    return api.post('/papers/upload', paperData);
  },

  async deletePaper(id) {
    return api.delete(`/papers/${id}`);
  },
};

export default paperService;
