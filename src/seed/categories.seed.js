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
