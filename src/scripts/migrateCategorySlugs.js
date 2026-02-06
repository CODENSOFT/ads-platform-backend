/**
 * Migration: Map legacy category slugs to canonical slugs in Category and Ad collections.
 * Run once after deploying canonical slugs (kids, sport, education).
 *
 * Old -> Canonical:
 *   automobile -> auto
 *   imobiliare -> real-estate
 *   kids-babies -> kids
 *   sport-leisure, sport-timp-liber -> sport
 *   education-courses, educatie-cursuri -> education
 *
 * Usage: node src/scripts/migrateCategorySlugs.js
 * Or: npm run migrate:slugs (from backend root)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const LEGACY_TO_CANONICAL = {
  automobile: 'auto',
  imobiliare: 'real-estate',
  'kids-babies': 'kids',
  'sport-leisure': 'sport',
  'sport-timp-liber': 'sport',
  'education-courses': 'education',
  'educatie-cursuri': 'education',
};

export async function migrateCategorySlugs() {
  const mongoose = await import('mongoose');
  const Category = (await import('../models/Category.js')).default;
  const Ad = (await import('../models/Ad.js')).default;

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('[migrateCategorySlugs] MONGO_URI (or MONGODB_URI) is required');
    return { categoriesUpdated: 0, adsUpdated: 0, error: 'Missing MONGO_URI' };
  }

  await mongoose.default.connect(uri);
  console.log('[migrateCategorySlugs] Connected to MongoDB');

  let categoriesUpdated = 0;
  let adsUpdated = 0;

  try {
    // 1) Category collection: update slug from legacy -> canonical
    for (const [legacySlug, canonicalSlug] of Object.entries(LEGACY_TO_CANONICAL)) {
      const existingCanonical = await Category.findOne({ slug: canonicalSlug }).lean();
      const existingLegacy = await Category.findOne({ slug: legacySlug }).lean();

      if (existingLegacy && !existingCanonical) {
        await Category.updateOne(
          { slug: legacySlug },
          { $set: { slug: canonicalSlug, updatedAt: new Date() } },
          { runValidators: true }
        );
        categoriesUpdated++;
        console.log(`[migrateCategorySlugs] Category: ${legacySlug} -> ${canonicalSlug}`);
      } else if (existingLegacy && existingCanonical) {
        // Canonical already exists; remove duplicate legacy doc
        await Category.deleteOne({ slug: legacySlug });
        categoriesUpdated++;
        console.log(`[migrateCategorySlugs] Category: removed duplicate ${legacySlug} (canonical ${canonicalSlug} exists)`);
      }
    }

    // 2) Ad collection: update categorySlug (and optionally subCategorySlug if we had mappings)
    for (const [legacySlug, canonicalSlug] of Object.entries(LEGACY_TO_CANONICAL)) {
      const result = await Ad.updateMany(
        { categorySlug: legacySlug },
        { $set: { categorySlug: canonicalSlug, updatedAt: new Date() } }
      );
      if (result.modifiedCount > 0) {
        adsUpdated += result.modifiedCount;
        console.log(`[migrateCategorySlugs] Ads: categorySlug ${legacySlug} -> ${canonicalSlug}, count=${result.modifiedCount}`);
      }
    }

    console.log('[migrateCategorySlugs] Done.', { categoriesUpdated, adsUpdated });
    return { categoriesUpdated, adsUpdated };
  } finally {
    await mongoose.default.disconnect();
    console.log('[migrateCategorySlugs] Disconnected');
  }
}

const isMain = process.argv[1]?.endsWith('migrateCategorySlugs.js');
if (isMain) {
  migrateCategorySlugs()
    .then((r) => {
      if (r?.error) process.exit(1);
    })
    .catch((err) => {
      console.error('[migrateCategorySlugs]', err);
      process.exit(1);
    });
}
