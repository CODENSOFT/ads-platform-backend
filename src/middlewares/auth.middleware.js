import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from './error.middleware.js';

/**
 * Middleware to protect routes with JWT authentication
 * 
 * Reads token from Authorization: Bearer TOKEN header
 * Verifies JWT token and attaches user to request
 * 
 * @returns {Function} Express middleware
 */
export const protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header
  // Format: Authorization: Bearer <token>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Case 1: No token provided
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      details: { type: 'AUTH_REQUIRED' },
    });
  }

  try {
    // Validate JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      return next(
        new AppError('JWT configuration error', 500, {
          type: 'JWT_CONFIG_ERROR',
        })
      );
    }

    // Verify JWT token (signature + expiration)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists in database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token invalid or expired',
        details: { type: 'TOKEN_INVALID' },
      });
    }

    // Attach user to request object with STRICT structure
    // req.user must contain: { id: userId, _id: userId }
    // Both id and _id are strings for consistency
    const userIdString = user._id.toString();
    req.user = {
      id: userIdString, // Always use string for comparison
      _id: userIdString, // Also set _id as string for consistency
      name: user.name,
      email: user.email,
    };
    
    next();
  } catch (error) {
    // Case 2: Token expired or invalid (malformed, wrong signature, etc.)
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token invalid or expired',
        details: { type: 'TOKEN_INVALID' },
      });
    }

    // Other unexpected errors
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      details: { type: 'AUTH_ERROR' },
    });
  }
};

