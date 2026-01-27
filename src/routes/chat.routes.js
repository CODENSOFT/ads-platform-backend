import express from 'express';
import {
  startChat,
  getChats,
  getMessages,
  sendMessage,
  unreadCount,
  deleteChat,
} from '../controllers/chat.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { apiLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// Debug: Log route registration (development only)
if (process.env.NODE_ENV !== 'production') {
  console.log('[CHAT ROUTES] Registering chat routes...');
}

/**
 * @route   GET /api/chats/unread-count
 * @desc    Get unread messages count for current user
 * @access  Private
 * @middleware protect - JWT authentication required
 * 
 * IMPORTANT: This route MUST be defined before /:id routes to avoid route conflicts
 */
router.get('/unread-count', protect, unreadCount);

/**
 * @route   GET /api/chats
 * @desc    Get all chats for current user
 * @access  Private
 * @middleware protect - JWT authentication required
 */
router.get('/', protect, getChats);

/**
 * @route   POST /api/chats/start
 * @desc    Start or get existing chat for an ad
 * @access  Private
 * @middleware protect - JWT authentication required, apiLimiter - rate limited
 * 
 * IMPORTANT: This route MUST be defined before /:id routes to avoid route conflicts
 */
router.post('/start', protect, apiLimiter, startChat);

/**
 * @route   GET /api/chats/:id/messages
 * @desc    Get messages for a chat
 * @access  Private
 * @middleware protect - JWT authentication required
 */
router.get('/:id/messages', protect, getMessages);

/**
 * @route   POST /api/chats/:id/messages
 * @desc    Send a message in a chat
 * @access  Private
 * @middleware protect - JWT authentication required, apiLimiter - rate limited
 */
router.post('/:id/messages', protect, apiLimiter, sendMessage);

/**
 * @route   DELETE /api/chats/:id
 * @desc    Delete a chat and all its messages
 * @access  Private
 * @middleware protect - JWT authentication required, apiLimiter - rate limited
 * 
 * Only participants can delete a chat.
 * This will delete all messages in the chat as well.
 * 
 * IMPORTANT: This route is defined AFTER /:id/messages routes to avoid route conflicts
 */
router.delete('/:id', protect, apiLimiter, deleteChat);

export default router;
