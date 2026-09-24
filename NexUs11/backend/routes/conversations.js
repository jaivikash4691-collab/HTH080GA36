import express from 'express';
import conversationController from '../controllers/conversationController.js';

const router = express.Router();

router.get('/', conversationController.getConversations);
router.get('/:id', conversationController.getConversationById);
router.delete('/:id', conversationController.deleteConversation);

export default router;
