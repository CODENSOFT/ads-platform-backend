/**
 * Seed script: upsert 4 categories with dynamic fields (999.md style).
 * Slugs: business-equipment, kids-babies, sport-leisure, education-courses.
 * Run from project root: node scripts/seedCategoryFields.js
 * Uses MONGO_URI from .env. Safe to run multiple times (upsert by slug).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import mongoose from 'mongoose';
import Category from '../src/models/Category.js';

const CATEGORIES = [
  // 1) Afaceri & Echipamente (business-equipment)
  {
    name: 'Afaceri & Echipamente',
    slug: 'business-equipment',
    fields: [
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Second-hand', 'Reconditionat'], order: 1 },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'model', label: 'Model', type: 'text', required: false },
      { key: 'equipmentType', label: 'Tip echipament', type: 'select', required: true, options: ['Utilaj', 'Echipament magazin', 'Echipament birou', 'POS', 'Frigider industrial', 'Altul'], order: 2 },
      { key: 'power', label: 'Putere', type: 'number', required: false, min: 0, unit: 'W' },
      { key: 'voltage', label: 'Tensiune', type: 'select', required: false, options: ['110V', '220V', '380V'] },
      { key: 'warranty', label: 'Garantie', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'invoiceVat', label: 'Factura TVA', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'delivery', label: 'Livrare', type: 'select', required: false, options: ['Da', 'Nu'] },
    ],
    subcategories: [],
  },
  // 2) Copii & Bebelusi (kids-babies)
  {
    name: 'Copii & Bebelusi',
    slug: 'kids-babies',
    fields: [
      { key: 'ageRange', label: 'Varsta', type: 'select', required: true, options: ['0-6 luni', '6-12 luni', '1-2 ani', '3-5 ani', '6-9 ani', '10+ ani'], order: 1 },
      { key: 'gender', label: 'Gen', type: 'select', required: false, options: ['Baiat', 'Fata', 'Unisex'] },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Folosit'], order: 2 },
      { key: 'size', label: 'Marime', type: 'text', required: false },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'material', label: 'Material', type: 'text', required: false },
      { key: 'safetyCertified', label: 'Certificat siguranta', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'setIncluded', label: 'Set inclus', type: 'text', required: false },
    ],
    subcategories: [],
  },
  // 3) Sport & Timp Liber (sport-leisure)
  {
    name: 'Sport & Timp Liber',
    slug: 'sport-leisure',
    fields: [
      { key: 'sportType', label: 'Tip sport', type: 'select', required: true, options: ['Fitness', 'Ciclism', 'Fotbal', 'Tenis', 'Pescuit', 'Camping', 'Ski', 'Altul'], order: 1 },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Folosit'], order: 2 },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'model', label: 'Model', type: 'text', required: false },
      { key: 'size', label: 'Marime', type: 'text', required: false },
      { key: 'weight', label: 'Greutate', type: 'number', required: false, min: 0, unit: 'kg' },
      { key: 'material', label: 'Material', type: 'text', required: false },
      { key: 'isOriginal', label: 'Original', type: 'select', required: false, options: ['Da', 'Nu', 'Nu stiu'] },
    ],
    subcategories: [],
  },
  // 4) Educatie & Cursuri (education-courses)
  {
    name: 'Educatie & Cursuri',
    slug: 'education-courses',
    fields: [
      { key: 'courseType', label: 'Tip curs', type: 'select', required: true, options: ['Meditatii', 'Curs online', 'Curs offline', 'Training companie'], order: 1 },
      { key: 'subject', label: 'Materie / Domeniu', type: 'text', required: true, order: 2 },
      { key: 'level', label: 'Nivel', type: 'select', required: true, options: ['Incepator', 'Intermediar', 'Avansat'], order: 3 },
      { key: 'language', label: 'Limba', type: 'select', required: true, options: ['Romana', 'Rusa', 'Engleza', 'Alta'], order: 4 },
      { key: 'format', label: 'Format', type: 'select', required: true, options: ['Online', 'La domiciliu', 'La centru'], order: 5 },
      { key: 'durationHours', label: 'Durata', type: 'number', required: false, min: 0, unit: 'ore' },
      { key: 'certificate', label: 'Certificat', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'groupOrIndividual', label: 'Individual / Grup', type: 'select', required: false, options: ['Individual', 'Grup'] },
    ],
    subcategories: [],
  },
];

/**
 * Upsert categories by slug. Safe to call when DB is already connected (e.g. from server).
 */
export async function run() {
  const isDev = process.env.NODE_ENV !== 'production';
  let created = 0;
  let updated = 0;
  for (const cat of CATEGORIES) {
    const result = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $set: { name: cat.name, fields: cat.fields, subcategories: cat.subcategories || [] } },
      { new: true, upsert: true, runValidators: true }
    );
    const isNew = result.createdAt && result.updatedAt && result.createdAt.getTime() === result.updatedAt.getTime();
    if (isNew) created += 1;
    else updated += 1;
    if (isDev) {
      console.log(`[seedCategoryFields] ${isNew ? 'Created' : 'Updated'} category: ${cat.slug} (${cat.name})`);
    }
  }
  if (isDev) {
    console.log('[seedCategoryFields] Done.', { created, updated, total: CATEGORIES.length });
  }
  return { created, updated, total: CATEGORIES.length };
}

const isMain = process.argv[1]?.endsWith('seedCategoryFields.js');
if (isMain) {
  if (!process.env.MONGO_URI) {
    console.error('[seedCategoryFields] MONGO_URI is required');
    process.exit(1);
  }
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      if (process.env.NODE_ENV !== 'production') console.log('[seedCategoryFields] Connected to DB');
      return run();
    })
    .then((r) => {
      if (process.env.NODE_ENV !== 'production') console.log('[seedCategoryFields] Result:', r);
    })
    .catch((err) => {
      console.error('[seedCategoryFields] Error:', err.message);
      process.exit(1);
    })
    .finally(() => {
      mongoose.disconnect().then(() => process.exit(0));
    });
}
