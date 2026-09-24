import { supabase } from '../config/supabase.js';

let feedbackStore = [];

export const feedbackController = {
  async submitFeedback(req, res, next) {
    try {
      const { rating, likes, improvements, suggestions, message, email } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to submit feedback.',
          error: 'Authentication required.',
        });
      }

      if (!rating) {
        return res.status(400).json({
          success: false,
          message: 'Rating (1-5) is required.',
          error: 'Rating (1-5) is required.',
        });
      }

      const feedbackMessage = message || suggestions || (improvements || []).join('; ') || (likes || []).join('; ') || 'Researcher Feedback';

      const feedbackItem = {
        user_id: userId,
        message: feedbackMessage,
        rating: Math.max(1, Math.min(5, Number(rating) || 5)),
        created_at: new Date().toISOString(),
      };

      if (supabase) {
        try {
          await supabase.from('feedback').insert([feedbackItem]);
        } catch {}
      }

      feedbackStore.push({ ...feedbackItem, id: 'fb_' + Date.now(), email: email || req.user?.email });

      res.status(201).json({
        success: true,
        message: 'Feedback recorded successfully. Thank you for helping advance academic research!',
        feedback: feedbackItem,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default feedbackController;
