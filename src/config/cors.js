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
  const frontendUrl = process.env.FRONTEND_URL.replace(/\/+$/, ''); // Remove trailing slashes
  if (!allowedOriginsList.includes(frontendUrl)) {
    allowedOriginsList.push(frontendUrl);
  }
}

// Add ALLOWED_ORIGINS if they exist (comma separated)
if (process.env.ALLOWED_ORIGINS) {
  const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, '')) // Remove trailing slashes
    .filter((origin) => origin.length > 0);
  
  additionalOrigins.forEach((origin) => {
    if (!allowedOriginsList.includes(origin)) {
      allowedOriginsList.push(origin);
    }
  });
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, server-to-server, mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOriginsList.includes(origin)) {
      return callback(null, true);
    }

    // Block with clear error message
    callback(
      new Error(
        `CORS: Origin "${origin}" is not allowed. Allowed origins: ${allowedOriginsList.join(', ')}`
      ),
      false
    );
  },
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export default corsOptions;

