import api from './api';

export const conversationService = {
  async getConversations() {
    return api.get('/conversations');
  },

  async getConversationById(id) {
    return api.get(`/conversations/${id}`);
  },

  async deleteConversation(id) {
    return api.delete(`/conversations/${id}`);
  },
};

export default conversationService;
