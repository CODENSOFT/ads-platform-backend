import dotenv from 'dotenv';

// Only load .env file in development (not required in production if env vars are provided)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Build allowed origins array
const allowedOriginsList = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

// Add FRONTEND_URL if it exists (for Vercel production)
if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL.trim().replace(/\/+$/, ''); // Normalize: trim and remove trailing slash
  if (!allowedOriginsList.includes(frontendUrl)) {
    allowedOriginsList.push(frontendUrl);
  }
}

// Read ALLOWED_ORIGINS from env and split by comma
// Normalize entries: trim spaces, remove trailing slash
if (process.env.ALLOWED_ORIGINS) {
  const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, '')) // Normalize: trim and remove trailing slash
    .filter((origin) => origin.length > 0);
  
  additionalOrigins.forEach((origin) => {
    if (!allowedOriginsList.includes(origin)) {
      allowedOriginsList.push(origin);
    }
  });
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow if origin is undefined (Postman, server-to-server, mobile apps, curl, etc.)
    if (!origin) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[CORS] origin:', origin, 'allowed: true (no origin)');
      }
      return callback(null, true);
    }

    // Normalize incoming origin: remove trailing slash
    const normalizedOrigin = origin.replace(/\/+$/, '');

    // Check if normalized origin is in normalized list
    const isAllowed = allowedOriginsList.includes(normalizedOrigin);

    // Debug log in development only
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CORS] origin:', normalizedOrigin, 'allowed:', isAllowed);
    }

    // Do NOT throw. If not allowed: callback(null, false)
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

export default corsOptions;

