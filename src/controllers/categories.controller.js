import Category from '../models/Category.js';

/**
 * Get all categories (name, slug, fields, fieldsCount, subcategories with name, slug, fields).
 * GET /api/categories
 * Complete schema for frontend; fieldsCount for convenience.
 */
export const getCategories = async (req, res, next) => {
  try {
    const docs = await Category.find({}).sort({ slug: 1 }).lean();
    const categories = docs.map((doc) => {
      const fields = Array.isArray(doc.fields) ? doc.fields : [];
      const subcategories = (Array.isArray(doc.subcategories) ? doc.subcategories : []).map((s) => ({
        name: s.name,
        slug: s.slug,
        fields: Array.isArray(s.fields) ? s.fields : [],
      }));
      return {
        name: doc.name,
        slug: doc.slug,
        fields,
        fieldsCount: fields.length,
        subcategories,
      };
    });
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

// Map request slug -> canonical DB slug (apply BEFORE DB lookup).
// Canonical: auto, real-estate, electronics, home-garden, fashion-beauty, jobs, services, business-equipment, kids, sport, animals, agriculture, education.
const ALIASES = {
  auto: 'auto',
  automobile: 'auto',
  'real-estate': 'real-estate',
  imobiliare: 'real-estate',
  electronics: 'electronics',
  'electronice-tehnica': 'electronics',
  'electronics-tehnica': 'electronics',
  'home-garden': 'home-garden',
  'casa-gradina': 'home-garden',
  fashion: 'fashion-beauty',
  'fashion-beauty': 'fashion-beauty',
  'moda-frumusete': 'fashion-beauty',
  jobs: 'jobs',
  'locuri-de-munca': 'jobs',
  services: 'services',
  business: 'business-equipment',
  'business-equipment': 'business-equipment',
  kids: 'kids',
  'kids-babies': 'kids',
  sports: 'sport',
  'sport-leisure': 'sport',
  'sport-timp-liber': 'sport',
  pets: 'animals',
  animals: 'animals',
  agriculture: 'agriculture',
  courses: 'education',
  'education-courses': 'education',
  'educatie-cursuri': 'education',
};

/**
 * Map Category field document to frontend criteria item.
 * Criteria shape: { key, label, type, required, sortOrder, config?, options? }.
 * options only for select/multiselect: [{ value, label, sortOrder }].
 */
function fieldToCriteria(field, index) {
  const criteria = {
    key: field.key,
    label: field.label,
    type: field.type || 'text',
    required: !!field.required,
    sortOrder: field.order != null ? field.order : index,
  };
  const config = {};
  if (field.min != null) config.min = field.min;
  if (field.max != null) config.max = field.max;
  if (field.placeholder) config.placeholder = field.placeholder;
  if (field.unit) config.unit = field.unit;
  if (field.group) config.group = field.group;
  if (Object.keys(config).length) criteria.config = config;
  if (field.options && Array.isArray(field.options) && ['select', 'multiselect'].includes(field.type)) {
    criteria.options = field.options.map((val, i) => ({
      value: String(val),
      label: String(val),
      sortOrder: i,
    }));
  }
  return criteria;
}

/**
 * GET /api/categories/:slug/schema (public).
 * Returns schema/criteria for CreateAd so frontend can enable Submit and render dynamic fields.
 * Response: { slug, title, submitAllowed, criteria: [...], message? }.
 * If not found -> 404 { error: "Unknown category" }.
 * If no criteria -> criteria: [], submitAllowed: false, message: "Category criteria not configured".
 */
export const getCategorySchema = async (req, res, next) => {
  try {
    const slug = (req.params.slug || '').trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ success: false, error: 'Slug is required' });
    }
    const resolvedSlug = ALIASES[slug] ?? slug;
    const doc = await Category.findOne({ slug: resolvedSlug }).lean();
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: 'Unknown category',
        slug: resolvedSlug,
      });
    }
    const fields = Array.isArray(doc.fields) ? doc.fields : [];
    const criteria = fields.map((f, i) => fieldToCriteria(f, i)).sort((a, b) => a.sortOrder - b.sortOrder);
    const submitAllowed = criteria.length > 0;
    const payload = {
      success: true,
      slug: doc.slug,
      title: doc.name,
      submitAllowed,
      criteria,
    };
    if (!submitAllowed) {
      payload.message = 'No criteria configured';
    }
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single category by slug. GET /api/categories/:slug (public).
 * Returns { success: true, category: { name, slug, fields, subcategories: [{ name, slug, fields }] } }.
 * If not found -> 404 { success: false, code: 'CATEGORY_NOT_FOUND', message, slug }.
 */
export const getCategoryBySlug = async (req, res, next) => {
  try {
    const slug = (req.params.slug || '').trim().toLowerCase();
    if (!slug) {
      return res.status(400).json({ success: false, code: 'INVALID_SLUG', message: 'Category slug is required' });
    }
    const resolvedSlug = ALIASES[slug] ?? slug;
    const doc = await Category.findOne({ slug: resolvedSlug }).lean();
    if (!doc) {
      return res.status(404).json({
        success: false,
        code: 'CATEGORY_NOT_FOUND',
        message: 'Category not found',
        slug: resolvedSlug,
      });
    }
    // Ensure fields and subcategories are always arrays
    const category = {
      name: doc.name,
      slug: doc.slug,
      fields: Array.isArray(doc.fields) ? doc.fields : [],
      subcategories: (Array.isArray(doc.subcategories) ? doc.subcategories : []).map((s) => ({
        name: s.name,
        slug: s.slug,
        fields: Array.isArray(s.fields) ? s.fields : [],
      })),
    };
    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};
