import api from './api';

export const authService = {
  async register({ fullName, email, password, confirmPassword }) {
    return api.post('/auth/register', { fullName, email, password, confirmPassword });
  },

  async login({ email, password }) {
    const res = await api.post('/auth/login', { email, password });
    if (res?.token) {
      localStorage.setItem('nexus_token', res.token);
    }
    if (res?.user) {
      localStorage.setItem('nexus_user', JSON.stringify(res.user));
    }
    return res;
  },

  async forgotPassword(email) {
    return api.post('/auth/forgot-password', { email });
  },

  async resetPassword({ email, newPassword }) {
    return api.post('/auth/reset-password', { email, newPassword });
  },

  logout() {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
  },

  getCurrentUser() {
    try {
      const u = localStorage.getItem('nexus_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
};

export default authService;
