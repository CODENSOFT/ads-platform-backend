import crypto from 'crypto';

/**
 * Hash input string using SHA-256
 * @param {string} input - String to hash
 * @returns {string} - Hexadecimal hash string
 */
export function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

