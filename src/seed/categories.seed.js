import Category from '../models/Category.js';
import logger from '../config/logger.js';

const CATEGORIES = [
  {
    name: 'Automobile',
    slug: 'automobile',
    fields: [
      { key: 'make', label: 'Marca', type: 'select', required: true, filterable: true, options: [] },
      { key: 'model', label: 'Model', type: 'text', required: true, filterable: true },
      { key: 'year', label: 'An', type: 'number', required: false, min: 1950, filterable: true },
      { key: 'mileage_km', label: 'Kilometraj (km)', type: 'number', required: false, min: 0, filterable: true, unit: 'km' },
      { key: 'engine_cc', label: 'Capacitate motor (cm³)', type: 'number', required: false, min: 0, filterable: true, unit: 'cc' },
      { key: 'fuel', label: 'Combustibil', type: 'select', required: false, filterable: true, options: ['Petrol', 'Diesel', 'Hybrid', 'Electric'] },
      { key: 'gearbox', label: 'Cutie de viteze', type: 'select', required: false, filterable: true, options: ['Manual', 'Automatic'] },
      { key: 'drive', label: 'Tracțiune', type: 'select', required: false, filterable: true, options: ['FWD', 'RWD', 'AWD'] },
      { key: 'body_type', label: 'Caroserie', type: 'select', required: false, filterable: true, options: ['Sedan', 'SUV', 'Hatchback', 'Break', 'Coupe', 'Cabrio', 'Monovolume', 'Pick-up', 'Altele'] },
      { key: 'steering', label: 'Volan', type: 'select', required: false, filterable: true, options: ['Left', 'Right'] },
      { key: 'seats', label: 'Locuri', type: 'number', required: false, min: 1, max: 50 },
      { key: 'color', label: 'Culoare', type: 'text', required: false },
      { key: 'condition', label: 'Stare', type: 'select', required: true, filterable: true, options: ['Nou', 'Ca nou', 'Bună', 'Acceptabilă', 'De reparații'] },
      { key: 'registration', label: 'Înmatriculat', type: 'select', required: false, filterable: true, options: ['Da', 'Nu'] },
      { key: 'seller_type', label: 'Tip vânzător', type: 'select', required: true, filterable: true, options: ['person', 'company'] },
    ],
    subcategories: [],
  },
  {
    name: 'Imobiliare',
    slug: 'imobiliare',
    fields: [
      { key: 'property_type', label: 'Tip proprietate', type: 'select', required: true, options: ['apartment', 'house', 'land', 'commercial'] },
      { key: 'transaction', label: 'Tranzacție', type: 'select', required: true, options: ['sale', 'rent'] },
      { key: 'rooms', label: 'Camere', type: 'number', required: false, min: 0, max: 50 },
      { key: 'area_m2', label: 'Suprafață (m²)', type: 'number', required: true, min: 0, unit: 'm2' },
      { key: 'floor', label: 'Etaj', type: 'number', required: false, min: -5, max: 200 },
      { key: 'furnished', label: 'Mobilat', type: 'boolean', required: false },
      { key: 'location_city', label: 'Oraș', type: 'text', required: true },
    ],
    subcategories: [],
  },
  {
    name: 'Electronice & Tehnică',
    slug: 'electronice-tehnica',
    fields: [
      { key: 'device_type', label: 'Tip dispozitiv', type: 'select', required: true, options: ['Telefon', 'Laptop', 'Tabletă', 'TV', 'Audio', 'Electrocasnic', 'Gadget', 'Console', 'Altele'] },
      { key: 'brand', label: 'Marca', type: 'text', required: false },
      { key: 'model', label: 'Model', type: 'text', required: false },
      { key: 'condition', label: 'Stare', type: 'select', required: false, options: ['Nou', 'Ca nou', 'Bună', 'Acceptabilă', 'Defect'] },
      { key: 'warranty', label: 'Garanție', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'storage_gb', label: 'Stocare (GB)', type: 'number', required: false, min: 0, unit: 'gb' },
      { key: 'ram_gb', label: 'RAM (GB)', type: 'number', required: false, min: 0, unit: 'gb' },
    ],
    subcategories: [],
  },
];

/**
 * Ensures all categories exist with fields and subcategories.
 * Upserts by slug.
 */
export const seedCategories = async () => {
  try {
    let created = 0;
    let updated = 0;
    for (const cat of CATEGORIES) {
      const result = await Category.findOneAndUpdate(
        { slug: cat.slug },
        { $set: { name: cat.name, fields: cat.fields, subcategories: cat.subcategories || [] } },
        { new: true, upsert: true, runValidators: true }
      );
      if (result.createdAt?.getTime() === result.updatedAt?.getTime()) {
        created += 1;
      } else {
        updated += 1;
      }
    }
    logger.info('Categories seed completed', { created, updated, total: CATEGORIES.length });
    return { created, updated, total: CATEGORIES.length };
  } catch (error) {
    logger.error('Categories seed failed', { message: error.message });
    throw error;
  }
};

export default seedCategories;
