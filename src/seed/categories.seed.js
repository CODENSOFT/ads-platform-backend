import Category from '../models/Category.js';
import logger from '../config/logger.js';

const CATEGORIES = [
  {
    name: 'Automobile',
    slug: 'automobile',
    fields: [
      { key: 'make', label: 'Marca', type: 'select', required: true, options: ['BMW', 'Audi', 'Mercedes-Benz', 'Volkswagen', 'Toyota', 'Ford', 'Honda', 'Hyundai', 'Kia', 'Dacia', 'Skoda', 'Renault', 'Peugeot', 'Opel', 'Nissan', 'Mazda', 'Altele'] },
      { key: 'model', label: 'Model', type: 'text', required: true, placeholder: 'ex. Seria 3' },
      { key: 'year', label: 'An', type: 'number', required: false, min: 1950, max: 2030, unit: 'an' },
      { key: 'engineCc', label: 'Capacitatea Cilindrica', type: 'number', required: false, min: 0, max: 10000, unit: 'cm³' },
      { key: 'mileageKm', label: 'Rulaj', type: 'number', required: false, min: 0, unit: 'km' },
      { key: 'fuel', label: 'Combustibil', type: 'select', required: false, options: ['Benzină', 'Motorină', 'GPL', 'Electric', 'Hibrid', 'Hibrid plug-in'] },
      { key: 'gearbox', label: 'Cutie Viteze', type: 'select', required: false, options: ['Manuală', 'Automată', 'Semi-automată'] },
      { key: 'drive', label: 'Tip Tractiune', type: 'select', required: false, options: ['Față', 'Spate', 'Integrală 4x4'] },
      { key: 'body', label: 'Tip Caroserie', type: 'select', required: false, options: ['Sedan', 'SUV', 'Hatchback', 'Break', 'Coupe', 'Cabrio', 'Monovolume', 'Pick-up', 'Altele'] },
      { key: 'seats', label: 'Nr Locuri', type: 'number', required: false, min: 1, max: 50 },
      { key: 'steering', label: 'Volan', type: 'select', required: false, options: ['Stânga', 'Dreapta'] },
      { key: 'color', label: 'Culoare', type: 'text', required: false, placeholder: 'ex. Negru' },
      { key: 'condition', label: 'Stare', type: 'select', required: false, options: ['Nou', 'Ca nou', 'Bună', 'Acceptabilă', 'De reparații'] },
      { key: 'registered', label: 'Inmatriculare', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'sellerType', label: 'Autor Anunt', type: 'select', required: false, options: ['PF', 'PJ'] },
    ],
    subcategories: [],
  },
  {
    name: 'Imobiliare',
    slug: 'imobiliare',
    fields: [
      { key: 'propertyType', label: 'Tip Imobil', type: 'select', required: true, options: ['Apartament', 'Casă', 'Vilă', 'Teren', 'Spațiu comercial', 'Birou', 'Garaj'] },
      { key: 'areaM2', label: 'Suprafata m2', type: 'number', required: true, min: 0, unit: 'm²' },
      { key: 'rooms', label: 'Camere', type: 'number', required: false, min: 0, max: 50 },
      { key: 'floor', label: 'Etaj', type: 'number', required: false, min: -5, max: 200 },
      { key: 'totalFloors', label: 'Etaje Total', type: 'number', required: false, min: 0, max: 200 },
      { key: 'condition', label: 'Stare', type: 'select', required: false, options: ['Nou', 'Renovat', 'Bună', 'Acceptabilă', 'De recondiționat'] },
      { key: 'heating', label: 'Incalzire', type: 'select', required: false, options: ['Centrală', 'Individuală', 'Gaz', 'Electric', 'Pompă căldură', 'Altele'] },
      { key: 'sellerType', label: 'Autor Anunt', type: 'select', required: false, options: ['PF', 'PJ'] },
    ],
    subcategories: [],
  },
  {
    name: 'Electronice & Tehnică',
    slug: 'electronice-tehnica',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'ex. Apple' },
      { key: 'model', label: 'Model', type: 'text', required: false, placeholder: 'ex. iPhone 14' },
      { key: 'condition', label: 'Stare', type: 'select', required: false, options: ['Nou', 'Ca nou', 'Bună', 'Acceptabilă', 'Defect'] },
      { key: 'warranty', label: 'Garantie', type: 'select', required: false, options: ['Da', 'Nu'] },
      { key: 'yearMade', label: 'An Fabricatie', type: 'number', required: false, min: 1990, max: 2030 },
      { key: 'color', label: 'Culoare', type: 'text', required: false },
      { key: 'delivery', label: 'Livrare', type: 'select', required: false, options: ['Da', 'Nu'] },
    ],
    subcategories: [],
  },
  {
    name: 'Casă & Grădină',
    slug: 'casa-gradina',
    fields: [
      { key: 'productType', label: 'Tip Produs', type: 'select', required: false, options: ['Mobilă', 'Decorațiuni', 'Textile', 'Unelte', 'Materiale construcții', 'Grădinărit', 'Iluminat', 'Încălzire', 'Altele'] },
      { key: 'material', label: 'Material', type: 'text', required: false, placeholder: 'ex. Lemn, metal' },
      { key: 'condition', label: 'Stare', type: 'select', required: false, options: ['Nou', 'Ca nou', 'Bună', 'Acceptabilă', 'De recondiționat'] },
      { key: 'dimensions', label: 'Dimensiuni', type: 'text', required: false, placeholder: 'ex. 120x80 cm' },
      { key: 'color', label: 'Culoare', type: 'text', required: false },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
    ],
    subcategories: [],
  },
  {
    name: 'Modă & Frumusețe',
    slug: 'moda-frumusete',
    fields: [
      { key: 'itemType', label: 'Tip Articol', type: 'select', required: false, options: ['Îmbrăcăminte femei', 'Îmbrăcăminte bărbați', 'Îmbrăcăminte copii', 'Încălțăminte', 'Genți & accesorii', 'Ceasuri', 'Bijuterii', 'Cosmetice', 'Altele'] },
      { key: 'size', label: 'Marime', type: 'text', required: false, placeholder: 'ex. M, 42, 36' },
      { key: 'brand', label: 'Brand', type: 'text', required: false },
      { key: 'color', label: 'Culoare', type: 'text', required: false },
      { key: 'material', label: 'Material', type: 'text', required: false, placeholder: 'ex. Bumbac, piele' },
      { key: 'condition', label: 'Stare', type: 'select', required: false, options: ['Nou', 'Nepurtat', 'Ca nou', 'Bună', 'Acceptabilă'] },
    ],
    subcategories: [],
  },
  {
    name: 'Locuri de muncă',
    slug: 'locuri-de-munca',
    fields: [
      { key: 'jobType', label: 'Tip Job', type: 'select', required: true, options: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Practică', 'Voluntariat'] },
      { key: 'schedule', label: 'Program', type: 'select', required: false, options: ['Zi', 'Noapte', 'Ture', 'Flexibil'] },
      { key: 'experience', label: 'Experienta', type: 'select', required: false, options: ['Fără experiență', '1-3 ani', '3-5 ani', '5+ ani'] },
      { key: 'salary', label: 'Salariu', type: 'number', required: false, min: 0, unit: 'MDL' },
      { key: 'company', label: 'Companie', type: 'text', required: false, placeholder: 'Nume firmă' },
      { key: 'location', label: 'Locatie', type: 'text', required: false, placeholder: 'Oraș sau regiune' },
      { key: 'remote', label: 'Remote', type: 'select', required: false, options: ['Da', 'Nu'] },
    ],
    subcategories: [],
  },
];

/**
 * Upserts the 6 main categories with fields and subcategories.
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
