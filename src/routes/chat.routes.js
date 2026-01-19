import express from 'express';
import { startChat } from '../controllers/chat.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/chats/start
 * @desc    Start or get existing chat for an ad
 * @access  Private
 * @middleware protect - JWT authentication required
 */
router.post('/start', startChat);

export default router;
