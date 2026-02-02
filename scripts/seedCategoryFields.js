/**
 * Seed script: upsert 7 categories with dynamic fields (999.md-style).
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
  // A) Servicii
  {
    name: 'Servicii',
    slug: 'servicii',
    fields: [
      { key: 'serviceType', label: 'Tip', type: 'select', required: true, options: ['Ofer', 'Caut'], order: 1 },
      { key: 'serviceDomain', label: 'Domeniu', type: 'select', required: true, options: ['IT', 'Constructii', 'Curatenie', 'Auto', 'Beauty', 'Consultanta', 'Transport', 'Evenimente', 'Altele'], order: 2 },
      { key: 'location', label: 'Locatie', type: 'select', required: true, options: ['Chisinau', 'Balti', 'Orhei', 'Cahul', 'Alt oras', 'Online'], order: 3 },
      { key: 'availability', label: 'Disponibilitate', type: 'select', required: false, options: ['Imediat', '1-3 zile', '1 saptamana', 'Programare'], order: 4 },
      { key: 'pricingType', label: 'Tip pret', type: 'select', required: false, options: ['Fix', 'Pe ora', 'Pe proiect', 'Negociabil', 'Gratuit'], order: 5 },
      { key: 'experienceLevel', label: 'Nivel experienta', type: 'select', required: false, options: ['Incepator', 'Intermediar', 'Avansat', 'Expert'], order: 6 },
      { key: 'deliveryMode', label: 'Mod livrare', type: 'select', required: false, options: ['La client', 'La mine', 'Online', 'Nu conteaza'], order: 7 },
      { key: 'warranty', label: 'Garantie', type: 'boolean', required: false, order: 8 },
      { key: 'legalForm', label: 'Forma juridica', type: 'select', required: false, options: ['Persoana fizica', 'Persoana juridica', 'Contract posibil'], order: 9 },
    ],
    subcategories: [],
  },
  // B) Afaceri & Echipamente
  {
    name: 'Afaceri & Echipamente',
    slug: 'afaceri-echipamente',
    fields: [
      { key: 'offerType', label: 'Tip oferta', type: 'select', required: true, options: ['Vand', 'Cumpar', 'Inchiriez'], order: 1 },
      { key: 'equipmentCategory', label: 'Categorie echipament', type: 'select', required: true, options: ['HoReCa', 'Industrial', 'Birou', 'Medical', 'Comercial', 'IT/Servere', 'Altele'], order: 2 },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Buna', 'Necesita reparatii'], order: 3 },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'model', label: 'Model', type: 'text', required: false },
      { key: 'year', label: 'An', type: 'number', required: false },
      { key: 'originCountry', label: 'Tara origine', type: 'text', required: false },
      { key: 'documents', label: 'Documente', type: 'boolean', required: false },
      { key: 'warranty', label: 'Garantie', type: 'boolean', required: false },
      { key: 'delivery', label: 'Livrare', type: 'select', required: false, options: ['Da', 'Nu', 'Doar ridicare'] },
      { key: 'weightKg', label: 'Greutate', type: 'number', required: false, unit: 'kg' },
      { key: 'dimensions', label: 'Dimensiuni', type: 'text', required: false },
    ],
    subcategories: [],
  },
  // C) Copii & Bebelusi
  {
    name: 'Copii & Bebelusi',
    slug: 'copii-bebelusi',
    fields: [
      { key: 'productType', label: 'Tip produs', type: 'select', required: true, options: ['Haine', 'Incaltaminte', 'Carucior', 'Patut', 'Jucarii', 'Alimentatie', 'Igiena', 'Altele'], order: 1 },
      { key: 'ageGroup', label: 'Varsta', type: 'select', required: true, options: ['0-6 luni', '6-12 luni', '1-2 ani', '3-5 ani', '6-9 ani', '10+'], order: 2 },
      { key: 'gender', label: 'Gen', type: 'select', required: false, options: ['Fata', 'Baiat', 'Unisex'] },
      { key: 'size', label: 'Marime', type: 'text', required: false },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Buna', 'Uzata'], order: 3 },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'material', label: 'Material', type: 'text', required: false },
      { key: 'sealed', label: 'Sigilat', type: 'boolean', required: false },
      { key: 'delivery', label: 'Livrare', type: 'boolean', required: false },
    ],
    subcategories: [],
  },
  // D) Sport & Timp Liber
  {
    name: 'Sport & Timp Liber',
    slug: 'sport-timp-liber',
    fields: [
      { key: 'sportType', label: 'Tip sport', type: 'select', required: true, options: ['Echipament', 'Biciclete', 'Fitness', 'Camping', 'Pescuit', 'Vanatoare', 'Jocuri', 'Altele'], order: 1 },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Buna', 'Uzata'], order: 2 },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'model', label: 'Model', type: 'text', required: false },
      { key: 'size', label: 'Marime', type: 'text', required: false },
      { key: 'weightKg', label: 'Greutate', type: 'number', required: false, unit: 'kg' },
      { key: 'material', label: 'Material', type: 'text', required: false },
      { key: 'level', label: 'Nivel', type: 'select', required: false, options: ['Incepator', 'Intermediar', 'Avansat', 'Pro'] },
      { key: 'delivery', label: 'Livrare', type: 'boolean', required: false },
    ],
    subcategories: [],
  },
  // E) Animale
  {
    name: 'Animale',
    slug: 'animale',
    fields: [
      { key: 'listingType', label: 'Tip anunt', type: 'select', required: true, options: ['Vand', 'Donez', 'Monta', 'Adoptie', 'Pierdut/Gasit'], order: 1 },
      { key: 'species', label: 'Specie', type: 'select', required: true, options: ['Caine', 'Pisica', 'Pasari', 'Rozatoare', 'Pesti', 'Reptile', 'Animale de ferma', 'Altele'], order: 2 },
      { key: 'breed', label: 'Rasa', type: 'text', required: false },
      { key: 'ageValue', label: 'Varsta (valoare)', type: 'number', required: true, min: 0, order: 3 },
      { key: 'ageUnit', label: 'Unitate varsta', type: 'select', required: true, options: ['Luni', 'Ani'], order: 4 },
      { key: 'sex', label: 'Sex', type: 'select', required: false, options: ['Mascul', 'Femela'] },
      { key: 'vaccinated', label: 'Vaccinat', type: 'select', required: false, options: ['Da', 'Nu', 'Partial'] },
      { key: 'dewormed', label: 'Dewormat', type: 'boolean', required: false },
      { key: 'sterilized', label: 'Sterilizat', type: 'select', required: false, options: ['Da', 'Nu', 'Nu stiu'] },
      { key: 'passport', label: 'Pasaport', type: 'boolean', required: false },
      { key: 'microchip', label: 'Microcip', type: 'boolean', required: false },
      { key: 'pedigree', label: 'Pedigree', type: 'boolean', required: false },
      { key: 'delivery', label: 'Livrare', type: 'boolean', required: false },
    ],
    subcategories: [],
  },
  // F) Agricultura
  {
    name: 'Agricultura',
    slug: 'agricultura',
    fields: [
      { key: 'agriType', label: 'Tip', type: 'select', required: true, options: ['Utilaje', 'Piese', 'Seminte', 'Ingrasaminte', 'Produse', 'Servicii agricole', 'Altele'], order: 1 },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Buna', 'Necesita reparatii'], order: 2 },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'model', label: 'Model', type: 'text', required: false },
      { key: 'year', label: 'An', type: 'number', required: false },
      { key: 'power', label: 'Putere', type: 'number', required: false, unit: 'HP/kW' },
      { key: 'workingHours', label: 'Ore lucrate', type: 'number', required: false },
      { key: 'capacity', label: 'Capacitate', type: 'text', required: false },
      { key: 'documents', label: 'Documente', type: 'boolean', required: false },
      { key: 'delivery', label: 'Livrare', type: 'boolean', required: false },
    ],
    subcategories: [],
  },
  // G) Educatie & Cursuri
  {
    name: 'Educatie & Cursuri',
    slug: 'educatie-cursuri',
    fields: [
      { key: 'educationType', label: 'Tip educatie', type: 'select', required: true, options: ['Curs', 'Meditatii', 'Training', 'Workshop'], order: 1 },
      { key: 'domain', label: 'Domeniu', type: 'select', required: true, options: ['Limbi', 'IT', 'Matematica', 'Muzica', 'Business', 'Auto', 'Altele'], order: 2 },
      { key: 'level', label: 'Nivel', type: 'select', required: true, options: ['Incepator', 'Intermediar', 'Avansat'], order: 3 },
      { key: 'format', label: 'Format', type: 'select', required: true, options: ['Online', 'Fizic', 'Hibrid'], order: 4 },
      { key: 'location', label: 'Locatie', type: 'text', required: false },
      { key: 'duration', label: 'Durata', type: 'text', required: false },
      { key: 'schedule', label: 'Program', type: 'text', required: false },
      { key: 'certificate', label: 'Certificat', type: 'boolean', required: false },
      { key: 'pricingType', label: 'Tip pret', type: 'select', required: false, options: ['Pe sedinta', 'Pe curs', 'Negociabil'] },
      { key: 'studyMode', label: 'Mod studiu', type: 'select', required: false, options: ['Individual', 'Grup', 'Ambele'] },
    ],
    subcategories: [],
  },
];

/**
 * Upsert categories by slug. Safe to call when DB is already connected (e.g. from server).
 * Does not connect or disconnect.
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

// Run as standalone script: node scripts/seedCategoryFields.js
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
