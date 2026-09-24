import { supabase } from '../config/supabase.js';

// Multi-tenant user conversations store: userId -> Array of conversations
const userConversationsStore = new Map();

export const conversationController = {
  async getConversations(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in.',
          error: 'Authentication required.',
        });
      }

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            return res.json({ success: true, conversations: data });
          }
        } catch {}
      }

      const conversations = userConversationsStore.get(userId) || [];
      res.json({ success: true, conversations });
    } catch (err) {
      next(err);
    }
  },

  async getConversationById(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          error: 'Authentication required.',
        });
      }
      const { id } = req.params;

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select('*, messages(*)')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

          if (!error && data) {
            return res.json({ success: true, conversation: data });
          }
        } catch {}
      }

      const userConvs = userConversationsStore.get(userId) || [];
      const conv = userConvs.find((c) => c.id === id);
      if (!conv) {
        return res.status(404).json({
          success: false,
          message: `Conversation not found in your research history.`,
          error: `Conversation not found in your research history.`,
        });
      }

      res.json({ success: true, conversation: conv });
    } catch (err) {
      next(err);
    }
  },

  async deleteConversation(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
          error: 'Authentication required.',
        });
      }
      const { id } = req.params;

      if (supabase) {
        try {
          await supabase
            .from('conversations')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        } catch {}
      }

      let userConvs = userConversationsStore.get(userId) || [];
      userConvs = userConvs.filter((c) => c.id !== id);
      userConversationsStore.set(userId, userConvs);

      res.json({ success: true, deletedId: id });
    } catch (err) {
      next(err);
    }
  },
};

export default conversationController;
