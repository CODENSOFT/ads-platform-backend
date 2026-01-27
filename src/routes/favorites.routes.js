import express from 'express';
import {
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  getMyFavorites,
} from '../controllers/favorites.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { apiLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

/**
 * @route   GET /api/favorites/my
 * @desc    Get current user's favorite ads
 * @access  Private
 * @middleware protect - JWT authentication required
 * 
 * NOTE: This route MUST be before /:adId to be matched correctly
 */
router.get('/my', protect, getMyFavorites);

/**
 * @route   GET /api/favorites
 * @desc    Get user's favorite ads
 * @access  Private
 * @middleware protect - JWT authentication required
 * 
 * NOTE: This route MUST be before /:adId to be matched correctly
 */
router.get('/', protect, getFavorites);

/**
 * @route   POST /api/favorites/:adId
 * @desc    Add ad to user's favorites
 * @access  Private
 * @middleware protect - JWT authentication required, apiLimiter - rate limited
 */
router.post('/:adId', protect, apiLimiter, addToFavorites);

/**
 * @route   DELETE /api/favorites/:adId
 * @desc    Remove ad from user's favorites
 * @access  Private
 * @middleware protect - JWT authentication required, apiLimiter - rate limited
 */
router.delete('/:adId', protect, apiLimiter, removeFromFavorites);

export default router;

