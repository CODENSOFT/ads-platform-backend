#!/usr/bin/env node
/**
 * Quick test: GET /api/categories/:slug/schema for each expected slug.
 * Asserts status 200 and (optionally) criteria.length > 0.
 * Usage: node scripts/testCategorySchema.js [BASE_URL]
 * Example: node scripts/testCategorySchema.js
 *          node scripts/testCategorySchema.js https://zooming-dream-backend.up.railway.app
 */

const BASE_URL = process.argv[2] || process.env.API_BASE_URL || 'http://localhost:5001';

const SLUGS = [
  'real-estate',
  'auto',
  'fashion',
  'electronics',
  'home-garden',
  'jobs',
  'services',
  'business',
  'kids',
  'sports',
  'pets',
  'agriculture',
  'courses',
];

async function testSlug(slug) {
  const url = `${BASE_URL}/api/categories/${encodeURIComponent(slug)}/schema`;
  try {
    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));
    if (res.status !== 200) {
      return { slug, ok: false, status: res.status, error: body.error || body.message || res.statusText };
    }
    const criteriaLen = Array.isArray(body.criteria) ? body.criteria.length : 0;
    const submitAllowed = body.submitAllowed === true;
    return {
      slug,
      ok: true,
      status: 200,
      title: body.title,
      criteriaCount: criteriaLen,
      submitAllowed,
    };
  } catch (err) {
    return { slug, ok: false, error: err.message };
  }
}

async function main() {
  console.log(`Testing GET /api/categories/:slug/schema (BASE_URL=${BASE_URL})\n`);
  let failed = 0;
  for (const slug of SLUGS) {
    const result = await testSlug(slug);
    if (result.ok) {
      console.log(
        `  ✓ ${slug.padEnd(14)} 200  title="${result.title || '-'}"  criteria=${result.criteriaCount}  submitAllowed=${result.submitAllowed}`
      );
    } else {
      failed++;
      console.log(`  ✗ ${slug.padEnd(14)} ${result.status || 'ERR'}  ${result.error || JSON.stringify(result)}`);
    }
  }
  console.log('');
  if (failed > 0) {
    console.log(`Result: ${failed} failed, ${SLUGS.length - failed} passed.`);
    process.exit(1);
  }
  console.log(`Result: All ${SLUGS.length} slugs returned 200.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
