/**
 * Seed script: upsert 7 categories with dynamic fields and subcategories.
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

const currentYear = new Date().getFullYear();

const CATEGORIES = [
  {
    name: 'Servicii',
    slug: 'servicii',
    fields: [
      { key: 'serviceType', label: 'Tip serviciu', type: 'select', required: true, options: ['Reparatii', 'Curatenie', 'Transport', 'Constructii', 'IT & Software', 'Design', 'Foto/Video', 'Evenimente', 'Consultanta', 'Altele'], order: 1 },
      { key: 'providerType', label: 'Tip furnizor', type: 'select', required: true, options: ['Persoana Fizica', 'Persoana Juridica'], order: 2 },
      { key: 'location', label: 'Locatie', type: 'select', required: true, options: ['Chisinau', 'Balti', 'Cahul', 'Orhei', 'Ungheni', 'Edinet', 'Hincesti', 'Ialoveni', 'Alt oras / sat'], order: 3 },
      { key: 'experienceYears', label: 'Ani experienta', type: 'number', required: false, min: 0, max: 60, unit: 'ani', order: 4 },
      { key: 'availability', label: 'Disponibilitate', type: 'select', required: false, options: ['Disponibil acum', 'Programare', 'Doar weekend', 'Doar seara'], order: 5 },
      { key: 'travelToClient', label: 'Deplasare la client', type: 'boolean', required: false, order: 6 },
      { key: 'warranty', label: 'Garantie', type: 'select', required: false, options: ['Da', 'Nu', 'Depinde de lucrare'], order: 7 },
      { key: 'contractAvailable', label: 'Contract disponibil', type: 'boolean', required: false, order: 8 },
    ],
    subcategories: [
      {
        slug: 'it-software',
        name: 'IT & Software (Website, App, Automatizare)',
        fields: [
          { key: 'techStack', label: 'Tehnologii', type: 'text', required: false, placeholder: 'ex. React, Node.js' },
          { key: 'deliveryTimeDays', label: 'Termen livrare', type: 'number', required: false, min: 0, unit: 'zile' },
          { key: 'supportIncluded', label: 'Suport inclus', type: 'select', required: false, options: ['Da', 'Nu'] },
          { key: 'portfolioLink', label: 'Link portofoliu', type: 'text', required: false, placeholder: 'https://...' },
        ],
      },
      {
        slug: 'transport',
        name: 'Transport',
        fields: [
          { key: 'vehicleType', label: 'Tip vehicul', type: 'select', required: false, options: ['Dubă', 'Camion', 'Remorca', 'Autoutilitară', 'Altele'] },
          { key: 'maxLoadKg', label: 'Încărcătură maximă', type: 'number', required: false, min: 0, unit: 'kg' },
          { key: 'priceType', label: 'Tip preț', type: 'select', required: false, options: ['Per cursă', 'Per km'] },
        ],
      },
      {
        slug: 'constructii',
        name: 'Construcții',
        fields: [
          { key: 'specialization', label: 'Specializare', type: 'select', required: false, options: ['Finisaje', 'Electric', 'Instalații', 'Zidărie', 'Acoperiș', 'Altele'] },
          { key: 'materialIncluded', label: 'Material inclus', type: 'boolean', required: false },
        ],
      },
    ],
  },
  {
    name: 'Afaceri & Echipamente',
    slug: 'afaceri-echipamente',
    fields: [
      { key: 'itemType', label: 'Tip articol', type: 'select', required: true, options: ['Echipament', 'Utilaj', 'Stoc marfa', 'Afacere la cheie', 'Mobilier comercial', 'Altele'], order: 1 },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Buna', 'Necesita reparatii'], order: 2 },
      { key: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'ex. Bosch' },
      { key: 'model', label: 'Model', type: 'text', required: false },
      { key: 'year', label: 'An', type: 'number', required: false, min: 1950, max: currentYear + 1, unit: 'an' },
      { key: 'invoiceAvailable', label: 'Factură disponibilă', type: 'boolean', required: false },
      { key: 'warranty', label: 'Garantie', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'delivery', label: 'Livrare', type: 'select', required: false, options: ['Ridicare personala', 'Livrare in oras', 'Livrare in tara'] },
    ],
    subcategories: [
      {
        slug: 'horeca',
        name: 'HoReCa',
        fields: [
          { key: 'powerKw', label: 'Putere', type: 'number', required: false, min: 0, unit: 'kW' },
          { key: 'voltage', label: 'Tensiune', type: 'select', required: false, options: ['220V', '380V'] },
          { key: 'capacity', label: 'Capacitate', type: 'text', required: false, placeholder: 'ex. 20L, 60x40 cm' },
        ],
      },
      {
        slug: 'office',
        name: 'Birou',
        fields: [
          { key: 'usageType', label: 'Tip utilizare', type: 'select', required: false, options: ['Calculatoare', 'Printare', 'Mobilier', 'Altele'] },
          { key: 'compatibility', label: 'Compatibilitate', type: 'text', required: false, placeholder: 'ex. Windows, Mac' },
        ],
      },
      {
        slug: 'business-for-sale',
        name: 'Afacere la vânzare',
        fields: [
          { key: 'turnoverMonthly', label: 'Cifra de afaceri lunară', type: 'number', required: false, min: 0, unit: 'MDL' },
          { key: 'profitMonthly', label: 'Profit lunar', type: 'number', required: false, min: 0, unit: 'MDL' },
          { key: 'employees', label: 'Număr angajați', type: 'number', required: false, min: 0 },
          { key: 'leaseAvailable', label: 'Închiriere disponibilă', type: 'boolean', required: false },
        ],
      },
    ],
  },
  {
    name: 'Copii & Bebelusi',
    slug: 'copii-bebelusi',
    fields: [
      { key: 'productType', label: 'Tip produs', type: 'select', required: true, options: ['Carucior', 'Patut', 'Haine', 'Incaltaminte', 'Jucarii', 'Scaun auto', 'Alimentatie', 'Igiena', 'Altele'], order: 1 },
      { key: 'ageRange', label: 'Vârstă', type: 'select', required: true, options: ['0-6 luni', '6-12 luni', '1-2 ani', '2-4 ani', '4-7 ani', '7-12 ani', '12+ ani'], order: 2 },
      { key: 'gender', label: 'Gen', type: 'select', required: false, options: ['Baiat', 'Fata', 'Unisex'] },
      { key: 'size', label: 'Mărime', type: 'text', required: false, placeholder: 'ex: 74cm / 2-3 ani / 28 EU' },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Foarte bun', 'Bun', 'Uzura vizibila'], order: 3 },
      { key: 'material', label: 'Material', type: 'text', required: false },
      { key: 'originalBox', label: 'Cutie originală', type: 'boolean', required: false },
    ],
    subcategories: [
      {
        slug: 'stroller',
        name: 'Carucioare',
        fields: [
          { key: 'strollerType', label: 'Tip carucior', type: 'select', required: false, options: ['Clasic', 'Sport', 'Gemene', '3 în 1', 'Altele'] },
          { key: 'foldable', label: 'Pliazabil', type: 'boolean', required: false },
          { key: 'weightKg', label: 'Greutate', type: 'number', required: false, min: 0, unit: 'kg' },
        ],
      },
      {
        slug: 'car-seat',
        name: 'Scaune auto',
        fields: [
          { key: 'group', label: 'Grup', type: 'select', required: false, options: ['0', '0+', '1', '2', '3', '0-1', '1-2-3'] },
          { key: 'isofix', label: 'Isofix', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'clothes',
        name: 'Haine',
        fields: [
          { key: 'season', label: 'Sezon', type: 'select', required: false, options: ['Vara', 'Iarna', 'Demisezon', 'Toate'] },
          { key: 'brand', label: 'Brand', type: 'text', required: false },
        ],
      },
    ],
  },
  {
    name: 'Sport & Timp Liber',
    slug: 'sport-timp-liber',
    fields: [
      { key: 'sportType', label: 'Tip sport', type: 'select', required: true, options: ['Fitness', 'Fotbal', 'Tenis', 'Schi/Snowboard', 'Pescuit', 'Camping', 'Ciclism', 'Alergare', 'Altele'], order: 1 },
      { key: 'itemType', label: 'Tip articol', type: 'select', required: true, options: ['Echipament', 'Haine', 'Accesorii', 'Bicicleta', 'Abonament', 'Altele'], order: 2 },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Bun', 'Uzura vizibila'], order: 3 },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'size', label: 'Mărime', type: 'text', required: false },
      { key: 'forWho', label: 'Pentru', type: 'select', required: false, options: ['Adult', 'Copil', 'Unisex'] },
    ],
    subcategories: [
      {
        slug: 'bicycles',
        name: 'Biciclete',
        fields: [
          { key: 'bikeType', label: 'Tip bicicletă', type: 'select', required: false, options: ['Oraș', 'MTB', 'Șosea', 'Electrică', 'Copil', 'Altele'] },
          { key: 'frameSize', label: 'Mărime cadru', type: 'select', required: false, options: ['XS', 'S', 'M', 'L', 'XL', 'Universal'] },
          { key: 'wheelSize', label: 'Mărime roți', type: 'number', required: false, min: 12, max: 29, unit: 'inch' },
          { key: 'gears', label: 'Număr viteze', type: 'number', required: false, min: 1, max: 33 },
        ],
      },
      {
        slug: 'camping',
        name: 'Camping',
        fields: [
          { key: 'capacityPersons', label: 'Capacitate', type: 'number', required: false, min: 1, unit: 'persoane' },
          { key: 'seasonRating', label: 'Sezon', type: 'select', required: false, options: ['3 sezoane', '4 sezoane'] },
          { key: 'weightKg', label: 'Greutate', type: 'number', required: false, min: 0, unit: 'kg' },
        ],
      },
      {
        slug: 'fishing',
        name: 'Pescuit',
        fields: [
          { key: 'rodLengthM', label: 'Lungime undiță', type: 'number', required: false, min: 0, unit: 'm' },
          { key: 'reelIncluded', label: 'Mulinetă inclusă', type: 'boolean', required: false },
        ],
      },
    ],
  },
  {
    name: 'Animale',
    slug: 'animale',
    fields: [
      { key: 'animalType', label: 'Tip animal', type: 'select', required: true, options: ['Caini', 'Pisici', 'Pasari', 'Rozatoare', 'Pesti', 'Reptile', 'Altele'], order: 1 },
      { key: 'offerType', label: 'Tip ofertă', type: 'select', required: true, options: ['Adoptie', 'Vanzare', 'Imperechere', 'Servicii (grooming/vet)', 'Altele'], order: 2 },
      { key: 'breed', label: 'Rasă', type: 'text', required: false },
      { key: 'ageMonths', label: 'Vârstă', type: 'number', required: false, min: 0, max: 360, unit: 'luni' },
      { key: 'gender', label: 'Gen', type: 'select', required: false, options: ['Mascul', 'Femela'] },
      { key: 'vaccinated', label: 'Vaccinat', type: 'select', required: false, options: ['Da', 'Nu', 'Partial'] },
      { key: 'dewormed', label: 'Dewormat', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'passport', label: 'Pașaport', type: 'boolean', required: false },
    ],
    subcategories: [
      {
        slug: 'dogs',
        name: 'Câini',
        fields: [
          { key: 'sizeCategory', label: 'Mărime', type: 'select', required: false, options: ['Mic', 'Mediu', 'Mare', 'Foarte mare'] },
          { key: 'trained', label: 'Dresat', type: 'select', required: false, options: ['Da', 'Nu', 'Parțial'] },
          { key: 'microchipped', label: 'Cipat', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'cats',
        name: 'Pisici',
        fields: [
          { key: 'indoorOnly', label: 'Doar în casă', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'services',
        name: 'Servicii (grooming, vet)',
        fields: [
          { key: 'serviceType', label: 'Tip serviciu', type: 'select', required: false, options: ['Grooming', 'Veterinar', 'Pensiune', 'Dresaj', 'Altele'] },
          { key: 'homeVisit', label: 'Vizită la domiciliu', type: 'boolean', required: false },
        ],
      },
    ],
  },
  {
    name: 'Agricultura',
    slug: 'agricultura',
    fields: [
      { key: 'categoryType', label: 'Tip', type: 'select', required: true, options: ['Tehnica agricola', 'Seminte', 'Ingrasaminte', 'Furaje', 'Animale de ferma', 'Produse agricole', 'Altele'], order: 1 },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Bun', 'Necesita reparatii'], order: 2 },
      { key: 'year', label: 'An', type: 'number', required: false, min: 1950, max: currentYear + 1 },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'model', label: 'Model', type: 'text', required: false },
      { key: 'quantity', label: 'Cantitate', type: 'number', required: false, min: 0 },
      { key: 'unit', label: 'Unitate', type: 'select', required: false, options: ['kg', 't', 'l', 'buc', 'saci', 'm3'] },
    ],
    subcategories: [
      {
        slug: 'machinery',
        name: 'Tehnică agricolă',
        fields: [
          { key: 'enginePowerHp', label: 'Putere motor', type: 'number', required: false, min: 0, unit: 'CP' },
          { key: 'workingWidthM', label: 'Lățime lucru', type: 'number', required: false, min: 0, unit: 'm' },
          { key: 'hoursWorked', label: 'Ore lucrate', type: 'number', required: false, min: 0 },
        ],
      },
      {
        slug: 'seeds',
        name: 'Semințe',
        fields: [
          { key: 'cropType', label: 'Tip cultură', type: 'select', required: false, options: ['Cereale', 'Leguminoase', 'Legume', 'Fructe', 'Furaje', 'Altele'] },
          { key: 'season', label: 'Sezon', type: 'select', required: false, options: ['Primăvară', 'Toamna', 'Anual'] },
          { key: 'origin', label: 'Origine', type: 'text', required: false },
        ],
      },
      {
        slug: 'products',
        name: 'Produse agricole',
        fields: [
          { key: 'harvestYear', label: 'An recoltă', type: 'number', required: false, min: 2000, max: currentYear },
          { key: 'organic', label: 'Organic', type: 'boolean', required: false },
        ],
      },
    ],
  },
  {
    name: 'Educatie & Cursuri',
    slug: 'educatie-cursuri',
    fields: [
      { key: 'courseType', label: 'Tip curs', type: 'select', required: true, options: ['Limbi straine', 'IT & Programare', 'Meditatii', 'Muzica', 'Sport', 'Business', 'Altele'], order: 1 },
      { key: 'level', label: 'Nivel', type: 'select', required: true, options: ['Incepator', 'Intermediar', 'Avansat', 'Toate nivelurile'], order: 2 },
      { key: 'format', label: 'Format', type: 'select', required: true, options: ['Online', 'Offline', 'Online + Offline'], order: 3 },
      { key: 'city', label: 'Oraș', type: 'select', required: false, options: ['Chisinau', 'Balti', 'Cahul', 'Orhei', 'Ungheni', 'Alt oras / sat'] },
      { key: 'durationWeeks', label: 'Durată', type: 'number', required: false, min: 1, max: 520, unit: 'săptămâni' },
      { key: 'certificate', label: 'Certificat', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'groupOr1to1', label: 'Grup / Individual', type: 'select', required: false, options: ['Grup', 'Individual', 'Ambele'] },
    ],
    subcategories: [
      {
        slug: 'it-programming',
        name: 'IT & Programare',
        fields: [
          { key: 'language', label: 'Limbaj / tehnologie', type: 'select', required: false, options: ['JavaScript', 'Python', 'Java', 'C#', 'React', 'Node.js', 'Altele'] },
          { key: 'projectsIncluded', label: 'Proiecte practice incluse', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'languages',
        name: 'Limbi străine',
        fields: [
          { key: 'languageName', label: 'Limbă', type: 'select', required: false, options: ['Engleză', 'Germană', 'Franceză', 'Română', 'Rusă', 'Italiană', 'Spaniolă', 'Altele'] },
          { key: 'nativeTeacher', label: 'Profesor nativ', type: 'boolean', required: false },
        ],
      },
      {
        slug: 'tutoring',
        name: 'Meditații',
        fields: [
          { key: 'subject', label: 'Materie', type: 'text', required: false, placeholder: 'ex. Matematică, Fizică' },
          { key: 'examPrep', label: 'Pregătire examene', type: 'boolean', required: false },
        ],
      },
    ],
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
