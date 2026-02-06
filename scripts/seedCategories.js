/**
 * Standalone script to run categories seed (dedupe + migrate legacy + bulkWrite).
 * Run from project root: npm run seed:categories
 * Uses MONGO_URI from .env. Safe to run multiple times (idempotent).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import mongoose from 'mongoose';
import { seedCategories } from '../src/seed/categories.seed.js';

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('[seed:categories] MONGO_URI is required');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const result = await seedCategories();
    console.log('[seed:categories] Done.', result);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('[seed:categories] Failed:', err.message);
  process.exit(1);
});
