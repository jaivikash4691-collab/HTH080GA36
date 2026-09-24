import api from './api';

export const feedbackService = {
  async submitFeedback({ rating, likes, improvements, suggestions, email }) {
    return api.post('/feedback', { rating, likes, improvements, suggestions, email });
  },
};

export default feedbackService;
