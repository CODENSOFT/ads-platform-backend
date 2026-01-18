import express from 'express';
import { register, login, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { validateRegister, validateLogin, validateForgotPassword, validateResetPassword } from '../middlewares/validate.middleware.js';
import { authLimiter, forgotPasswordLimiter, resetPasswordLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @middleware validateRegister - Validate input data (name, email, password)
 */
router.post('/register', validateRegister, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get JWT token
 * @access  Public
 * @middleware validateLogin - Validate input data (email, password format)
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset link
 * @access  Public
 * @middleware forgotPasswordLimiter - Rate limit to prevent abuse (5 prod / 20 dev per 15min)
 * @middleware validateForgotPassword - Validate email format
 */
router.post('/forgot-password', forgotPasswordLimiter, validateForgotPassword, forgotPassword);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password using reset token
 * @access  Public
 * @middleware resetPasswordLimiter - Rate limit to prevent abuse (10 prod / 30 dev per 15min)
 * @middleware validateResetPassword - Validate password and token param
 */
router.post('/reset-password/:token', resetPasswordLimiter, validateResetPassword, resetPassword);

export default router;

