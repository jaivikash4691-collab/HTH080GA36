import api from './api';

export const analyzerService = {
  async analyze(options = {}) {
    return api.post('/analyzer/analyze', options);
  },

  async ask(query, context = {}) {
    return api.post('/analyzer/ask', { query, ...context });
  },
};

export default analyzerService;
