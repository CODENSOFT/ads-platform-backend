import Category from '../models/Category.js';
import logger from '../config/logger.js';

const CATEGORIES = [
  {
    name: 'Automobile',
    slug: 'automobiles',
    fields: [
      { key: 'make', label: 'Marca', type: 'text', required: true, placeholder: 'ex. BMW' },
      { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'ex. Seria 3' },
      { key: 'year', label: 'An', type: 'number', required: true, min: 1900, max: 2030, unit: 'an' },
      { key: 'engineCapacity', label: 'Capacitate cilindrică', type: 'number', required: false, min: 0, max: 10000, unit: 'cm³' },
      { key: 'registration', label: 'Înmatriculat', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'condition', label: 'Stare', type: 'select', required: true, options: ['Nou', 'Ca nou', 'Bună', 'Acceptabilă', 'De reparații'] },
      { key: 'sellerType', label: 'Tip vânzător', type: 'select', required: false, options: ['Persoană fizică', 'Dealer'] },
      { key: 'steeringWheel', label: 'Volan', type: 'select', required: false, options: ['Stânga', 'Dreapta'] },
      { key: 'bodyType', label: 'Caroserie', type: 'select', required: false, options: ['Sedan', 'SUV', 'Hatchback', 'Break', 'Coupe', 'Cabrio', 'Monovolume', 'Pick-up', 'Altele'] },
      { key: 'seats', label: 'Număr locuri', type: 'number', required: false, min: 1, max: 50 },
      { key: 'mileage', label: 'Kilometraj', type: 'number', required: false, min: 0, unit: 'km' },
      { key: 'fuelType', label: 'Combustibil', type: 'select', required: false, options: ['Benzină', 'Motorină', 'GPL', 'Electric', 'Hibrid', 'Hibrid plug-in'] },
      { key: 'gearbox', label: 'Cutie de viteze', type: 'select', required: false, options: ['Manuală', 'Automată', 'Semi-automată'] },
      { key: 'driveType', label: 'Tracțiune', type: 'select', required: false, options: ['Față', 'Spate', 'Integrală 4x4'] },
      { key: 'color', label: 'Culoare', type: 'text', required: false, placeholder: 'ex. Negru' },
    ],
  },
  {
    name: 'Imobiliare',
    slug: 'real-estate',
    fields: [
      { key: 'propertyType', label: 'Tip proprietate', type: 'select', required: true, options: ['Apartament', 'Casă', 'Vilă', 'Teren', 'Spațiu comercial', 'Birou', 'Garaj'] },
      { key: 'areaSqm', label: 'Suprafață', type: 'number', required: true, min: 0, unit: 'm²' },
      { key: 'rooms', label: 'Număr camere', type: 'number', required: false, min: 0, max: 50 },
      { key: 'floor', label: 'Etaj', type: 'number', required: false, min: -5, max: 200 },
      { key: 'totalFloors', label: 'Etaje total clădire', type: 'number', required: false, min: 0, max: 200 },
      { key: 'furnished', label: 'Mobilat', type: 'select', required: false, options: ['Da', 'Nu', 'Parțial'] },
      { key: 'heating', label: 'Încălzire', type: 'select', required: false, options: ['Centrală', 'Individuală', 'Gaz', 'Electric', 'Pompă căldură', 'Altele'] },
      { key: 'builtYear', label: 'An construcție', type: 'number', required: false, min: 1800, max: 2030 },
      { key: 'negotiable', label: 'Negociabil', type: 'boolean', required: false },
      { key: 'location', label: 'Locație', type: 'text', required: false, placeholder: 'Oraș, zonă' },
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
      { key: 'category', label: 'Tip produs', type: 'select', required: false, options: ['Telefon', 'Laptop', 'Tabletă', 'TV', 'Audio', 'Electrocasnic mare', 'Electrocasnic mic', 'Gadget', 'Console & jocuri', 'Altele'] },
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
  },
];

/**
 * Ensures all 6 categories exist in the database.
 * Upserts by slug (creates if missing, updates fields if slug exists).
 */
export const seedCategories = async () => {
  try {
    let created = 0;
    let updated = 0;
    for (const cat of CATEGORIES) {
      const result = await Category.findOneAndUpdate(
        { slug: cat.slug },
        { $set: { name: cat.name, fields: cat.fields } },
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
