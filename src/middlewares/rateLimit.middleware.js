import rateLimit from 'express-rate-limit';

// Rate limiting for auth routes (anti brute force)
// Disabled in development, active in production
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests too
  validate: false, // Disable validation to prevent ERR_ERL_UNEXPECTED_X_FORWARDED_FOR crash
  keyGenerator: (req) => req.ip, // Safe key generator that does not depend on X-Forwarded-For
});

// Conditional middleware: only apply rate limiting in production
export const authLimiter = (req, res, next) => {
  // Skip OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  if (process.env.NODE_ENV === 'production') {
    return authRateLimiter(req, res, next);
  }
  // In development, skip rate limiting
  next();
};

// Rate limiting for general API routes
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  validate: false, // Disable validation to prevent ERR_ERL_UNEXPECTED_X_FORWARDED_FOR crash
  keyGenerator: (req) => req.ip, // Safe key generator that does not depend on X-Forwarded-For
});

// Wrapper to skip OPTIONS requests (preflight)
export const apiLimiter = (req, res, next) => {
  // Skip OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  return apiRateLimiter(req, res, next);
};

// Rate limiting for forgot-password (more lenient than general auth)
const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 in production, 20 in development
  message: {
    success: false,
    message: 'Too many reset attempts, try again later',
    details: {
      type: 'RATE_LIMIT',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful requests too
  validate: false, // Disable validation to prevent ERR_ERL_UNEXPECTED_X_FORWARDED_FOR crash
  keyGenerator: (req) => req.ip, // Safe key generator that does not depend on X-Forwarded-For
});

// Wrapper for forgot-password limiter
export const forgotPasswordLimiter = (req, res, next) => {
  // Skip OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  return forgotPasswordRateLimiter(req, res, next);
};

// Rate limiting for reset-password (more lenient than forgot-password)
const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 30, // 10 in production, 30 in development
  message: {
    success: false,
    message: 'Too many reset attempts, try again later',
    details: {
      type: 'RATE_LIMIT',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful requests too
  validate: false, // Disable validation to prevent ERR_ERL_UNEXPECTED_X_FORWARDED_FOR crash
  keyGenerator: (req) => req.ip, // Safe key generator that does not depend on X-Forwarded-For
});

// Wrapper for reset-password limiter
export const resetPasswordLimiter = (req, res, next) => {
  // Skip OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  return resetPasswordRateLimiter(req, res, next);
};

