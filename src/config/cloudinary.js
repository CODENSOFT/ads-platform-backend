import { v2 as cloudinaryLib } from 'cloudinary';
import logger from './logger.js';

const CLOUDINARY_ERROR_MSG =
  'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.';

/**
 * Stub client used when env vars are missing. Throws only when upload/delete is called.
 */
function createStubClient() {
  const throwNotConfigured = () => {
    throw new Error(CLOUDINARY_ERROR_MSG);
  };
  return {
    config: () => {},
    uploader: {
      upload_stream: function () {
        throwNotConfigured();
      },
      destroy: function () {
        throwNotConfigured();
      },
    },
    api: {},
  };
}

/**
 * Configure Cloudinary with environment variables.
 * If any required var is missing, log a warning and export a stub that throws on use.
 */
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const hasAllVars = cloudName && apiKey && apiSecret;

let cloudinary;

if (!hasAllVars) {
  const missing = [];
  if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!apiKey) missing.push('CLOUDINARY_API_KEY');
  if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');

  logger.warn('Cloudinary not configured — uploads and deletes will fail until env is set', {
    missing,
  });

  cloudinary = createStubClient();
} else {
  cloudinaryLib.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  logger.info('Cloudinary configured successfully', { cloud_name: cloudName });
  cloudinary = cloudinaryLib;
}

export default cloudinary;
