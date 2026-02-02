import Category from '../models/Category.js';
import logger from '../config/logger.js';

const CATEGORIES = [
  {
    name: 'Automobile',
    slug: 'automobiles',
    fields: [
      { key: 'brand', label: 'Marca', type: 'text', required: true, placeholder: 'ex. BMW', unit: '' },
      { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'ex. Seria 3', unit: '' },
      { key: 'year', label: 'An', type: 'number', required: true, min: 1900, max: 2030, unit: 'an' },
      { key: 'engineCc', label: 'Capacitate motor', type: 'number', required: false, min: 0, max: 10000, unit: 'cc' },
      { key: 'registration', label: 'Înmatriculat', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Bună', 'Acceptabilă', 'De reparații'] },
      { key: 'sellerType', label: 'Tip vânzător', type: 'select', required: false, options: ['person', 'company'] },
      { key: 'steering', label: 'Volan', type: 'select', required: false, options: ['left', 'right'] },
      { key: 'bodyType', label: 'Caroserie', type: 'select', required: false, options: ['Sedan', 'SUV', 'Hatchback', 'Break', 'Coupe', 'Cabrio', 'Monovolume', 'Pick-up', 'Altele'] },
      { key: 'seats', label: 'Locuri', type: 'number', required: false, min: 1, max: 50 },
      { key: 'mileageKm', label: 'Kilometraj', type: 'number', required: false, min: 0, unit: 'km' },
      { key: 'fuelType', label: 'Combustibil', type: 'select', required: false, options: ['Benzină', 'Motorină', 'GPL', 'Electric', 'Hibrid', 'Hibrid plug-in'] },
      { key: 'gearbox', label: 'Cutie de viteze', type: 'select', required: false, options: ['Manuală', 'Automată', 'Semi-automată'] },
      { key: 'drivetrain', label: 'Tracțiune', type: 'select', required: false, options: ['Față', 'Spate', 'Integrală 4x4'] },
      { key: 'color', label: 'Culoare', type: 'text', required: false, placeholder: 'ex. Negru' },
    ],
    subcategories: [
      { slug: 'cars', name: 'Autoturisme', fields: [] },
      { slug: 'motorcycles', name: 'Motociclete', fields: [{ key: 'engineStroke', label: '2T / 4T', type: 'select', required: false, options: ['2T', '4T'] }] },
      { slug: 'trucks-buses', name: 'Camioane & autobuze', fields: [{ key: 'payloadTons', label: 'Capacitate tonaj', type: 'number', required: false, min: 0, unit: 't' }] },
    ],
  },
  {
    name: 'Imobiliare',
    slug: 'imobiliare',
    fields: [
      { key: 'propertyType', label: 'Tip proprietate', type: 'select', required: true, options: ['apartment', 'house', 'land', 'commercial'] },
      { key: 'areaM2', label: 'Suprafață', type: 'number', required: true, min: 0, unit: 'm2' },
      { key: 'rooms', label: 'Camere', type: 'number', required: false, min: 0, max: 50 },
      { key: 'floor', label: 'Etaj', type: 'number', required: false, min: -5, max: 200 },
      { key: 'totalFloors', label: 'Etaje total', type: 'number', required: false, min: 0, max: 200 },
      { key: 'condition', label: 'Stare', type: 'select', required: false, options: ['Nou', 'Renovat', 'Bună', 'Acceptabilă', 'De recondiționat'] },
      { key: 'sellerType', label: 'Tip vânzător', type: 'select', required: false, options: ['person', 'company'] },
      { key: 'city', label: 'Oraș', type: 'text', required: false },
      { key: 'district', label: 'Cartier / Sector', type: 'text', required: false },
    ],
    subcategories: [
      { slug: 'apartments-sale', name: 'Apartamente vânzare', fields: [{ key: 'furnished', label: 'Mobilat', type: 'select', required: false, options: ['Da', 'Nu', 'Parțial'] }] },
      { slug: 'apartments-rent', name: 'Apartamente închiriat', fields: [{ key: 'furnished', label: 'Mobilat', type: 'select', required: false, options: ['Da', 'Nu', 'Parțial'] }, { key: 'leaseMonths', label: 'Perioadă minimă (luni)', type: 'number', required: false, min: 1, unit: '' }] },
      { slug: 'houses-villas', name: 'Case & vile', fields: [{ key: 'plotM2', label: 'Teren anexă (m²)', type: 'number', required: false, min: 0, unit: 'm2' }] },
      { slug: 'lands', name: 'Terenuri', fields: [{ key: 'zone', label: 'Zonă (destinație)', type: 'text', required: false }] },
    ],
  },
  {
    name: 'Electronice & Tehnică',
    slug: 'electronics',
    fields: [
      { key: 'brand', label: 'Marca', type: 'text', required: true, placeholder: 'ex. Apple' },
      { key: 'model', label: 'Model', type: 'text', required: false, placeholder: 'ex. iPhone 14' },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Bună', 'Acceptabilă', 'Defect'] },
      { key: 'warranty', label: 'Garanție', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'warrantyMonths', label: 'Luni garanție', type: 'number', required: false, min: 0, max: 120 },
      { key: 'productType', label: 'Tip produs', type: 'select', required: false, options: ['Telefon', 'Laptop', 'Tabletă', 'TV', 'Audio', 'Electrocasnic mare', 'Electrocasnic mic', 'Gadget', 'Console & jocuri', 'Altele'] },
    ],
    subcategories: [
      { slug: 'phones', name: 'Telefoane mobile', fields: [{ key: 'screenSize', label: 'Diagonală ecran (inch)', type: 'number', required: false, min: 0, unit: '' }] },
      { slug: 'laptops-pc', name: 'Laptopuri & PC', fields: [{ key: 'ramGb', label: 'RAM (GB)', type: 'number', required: false, min: 0, unit: 'gb' }, { key: 'storageGb', label: 'Stocare (GB)', type: 'number', required: false, min: 0, unit: 'gb' }] },
      { slug: 'tvs', name: 'Televizoare', fields: [{ key: 'screenSizeInch', label: 'Diagonală (inch)', type: 'number', required: false, min: 0, unit: '' }] },
    ],
  },
  {
    name: 'Casă & Grădină',
    slug: 'home-garden',
    fields: [
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Bună', 'Acceptabilă', 'De recondiționat'] },
      { key: 'material', label: 'Material', type: 'text', required: false, placeholder: 'ex. Lemn, metal' },
      { key: 'dimensions', label: 'Dimensiuni', type: 'text', required: false, placeholder: 'ex. 120x80 cm' },
      { key: 'category', label: 'Categorie', type: 'select', required: false, options: ['Mobilă', 'Decorațiuni', 'Textile', 'Unelte', 'Materiale construcții', 'Grădinărit', 'Iluminat', 'Încălzire', 'Altele'] },
    ],
    subcategories: [
      { slug: 'furniture', name: 'Mobilă', fields: [{ key: 'room', label: 'Cameră', type: 'select', required: false, options: ['Living', 'Dormitor', 'Bucătărie', 'Birou', 'Copii', 'Altele'] }] },
      { slug: 'tools', name: 'Unelte & scule', fields: [{ key: 'powerType', label: 'Alimentare', type: 'select', required: false, options: ['Electric', 'Benzină', 'Manual', 'Baterie'] }] },
      { slug: 'gardening', name: 'Grădinărit', fields: [{ key: 'outdoor', label: 'Exterior / Interior', type: 'select', required: false, options: ['Exterior', 'Interior', 'Ambele'] }] },
    ],
  },
  {
    name: 'Modă & Frumusețe',
    slug: 'fashion-beauty',
    fields: [
      { key: 'brand', label: 'Marca', type: 'text', required: false, placeholder: 'ex. Zara' },
      { key: 'size', label: 'Mărime', type: 'text', required: false, placeholder: 'ex. M, 42, 36' },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Nepurtat', 'Ca nou', 'Bună', 'Acceptabilă'] },
      { key: 'color', label: 'Culoare', type: 'text', required: false, placeholder: 'ex. Negru' },
      { key: 'material', label: 'Material', type: 'text', required: false, placeholder: 'ex. Bumbac, piele' },
      { key: 'category', label: 'Categorie', type: 'select', required: false, options: ['Îmbrăcăminte femei', 'Îmbrăcăminte bărbați', 'Îmbrăcăminte copii', 'Încălțăminte', 'Genți & accesorii', 'Ceasuri', 'Bijuterii', 'Cosmetice', 'Altele'] },
    ],
    subcategories: [
      { slug: 'women-clothing', name: 'Îmbrăcăminte femei', fields: [] },
      { slug: 'men-clothing', name: 'Îmbrăcăminte bărbați', fields: [] },
      { slug: 'shoes', name: 'Încălțăminte', fields: [{ key: 'shoeSize', label: 'Număr', type: 'text', required: false, placeholder: 'ex. 42, 42.5' }] },
      { slug: 'watches', name: 'Ceasuri', fields: [{ key: 'watchType', label: 'Tip', type: 'select', required: false, options: ['Cu cureaua', 'Sport', 'Smartwatch', 'Clasic'] }] },
    ],
  },
  {
    name: 'Locuri de muncă',
    slug: 'jobs',
    fields: [
      { key: 'jobType', label: 'Tip job', type: 'select', required: true, options: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Practică', 'Voluntariat'] },
      { key: 'industry', label: 'Industrie', type: 'select', required: false, options: ['IT & Tehnologie', 'Vânzări & marketing', 'Construcții', 'Transport & logistică', 'HORECA', 'Contabilitate & finanțe', 'Juridic', 'Educație', 'Medicină', 'Altele'] },
      { key: 'seniority', label: 'Nivel', type: 'select', required: false, options: ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director'] },
      { key: 'salaryFrom', label: 'Salariu de la', type: 'number', required: false, min: 0, unit: 'MDL' },
      { key: 'salaryTo', label: 'Salariu până la', type: 'number', required: false, min: 0, unit: 'MDL' },
      { key: 'currency', label: 'Monedă salariu', type: 'select', required: false, options: ['MDL', 'EUR', 'USD'] },
      { key: 'location', label: 'Locație', type: 'text', required: false, placeholder: 'Oraș sau regiune' },
      { key: 'remote', label: 'Remote', type: 'select', required: false, options: ['Da', 'Nu', 'Hibrid'] },
      { key: 'companyName', label: 'Companie', type: 'text', required: false, placeholder: 'Nume firmă' },
    ],
    subcategories: [
      { slug: 'it', name: 'IT & Tehnologie', fields: [{ key: 'techStack', label: 'Tehnologii', type: 'textarea', required: false, placeholder: 'ex. React, Node.js' }] },
      { slug: 'sales-marketing', name: 'Vânzări & marketing', fields: [] },
      { slug: 'freelance', name: 'Freelance & remote', fields: [{ key: 'projectType', label: 'Tip proiect', type: 'select', required: false, options: ['One-time', 'Recurring', 'Ongoing'] }] },
    ],
  },
];

/**
 * Ensures all categories exist with fields and subcategories.
 * Upserts by slug (creates if missing, updates name, fields, subcategories if slug exists).
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
