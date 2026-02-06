import { body, validationResult } from 'express-validator';
import { AppError } from './error.middleware.js';
import Category from '../models/Category.js';
import { validateAttributes } from '../utils/attributeValidator.js';

// Resolve request slug to canonical (must match categories.controller ALIASES and ads.controller CATEGORY_SLUG_ALIASES).
const resolveCategorySlug = (slug) => {
  if (!slug || typeof slug !== 'string') return '';
  const s = slug.trim().toLowerCase();
  const ALIASES = {
    automobile: 'auto', imobiliare: 'real-estate', 'electronice-tehnica': 'electronics', 'casa-gradina': 'home-garden',
    'moda-frumusete': 'fashion-beauty', 'locuri-de-munca': 'jobs', servicii: 'services', 'afaceri-echipamente': 'business-equipment',
    'copii-bebelusi': 'kids', 'kids-babies': 'kids', 'sport-timp-liber': 'sport', 'sport-leisure': 'sport', animale: 'animals',
    agricultura: 'agriculture', 'educatie-cursuri': 'education', 'education-courses': 'education',
  };
  return ALIASES[s] || s;
};

// Middleware to handle validation errors (include debug keys for createAd)
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      fieldErrors: Object.fromEntries(errorDetails.map((e) => [e.field, e.message])),
      receivedBodyKeys: Object.keys(req.body || {}),
    });
  }
  next();
};

// Check for extra fields (not allowed)
const checkExtraFields = (allowedFields) => {
  return (req, res, next) => {
    const bodyKeys = Object.keys(req.body || {});
    const extraFields = bodyKeys.filter((key) => !allowedFields.includes(key));

    if (extraFields.length > 0) {
      return next(
        new AppError('Extra fields not allowed', 400, {
          errors: extraFields.map((field) => ({
            field,
            message: `Field '${field}' is not allowed`,
          })),
        })
      );
    }

    next();
  };
};

// Allowed for create ad: base fields + details (JSON string or object) + flat keys details[key], detail_*
const CREATE_AD_ALLOWED = ['title', 'description', 'price', 'currency', 'images', 'categorySlug', 'subCategorySlug', 'attributes', 'details'];
// Regex: details[anything] or detail_alphanumeric_ (so criteria at root are never "extra")
const DETAILS_KEY_REGEX = /^details\[[^\]]+\]$/;
const DETAIL_PREFIX_REGEX = /^detail_[A-Za-z0-9_]+$/;
const isAllowedCreateAdKey = (key) =>
  CREATE_AD_ALLOWED.includes(key) ||
  DETAILS_KEY_REGEX.test(key) ||
  DETAIL_PREFIX_REGEX.test(key);

// Aliasuri: formularul poate trimite snake_case; le mapăm la câmpurile așteptate
const BODY_ALIASES = {
  category_slug: 'categorySlug',
  sub_category_slug: 'subCategorySlug',
  subcategory_slug: 'subCategorySlug',
};
// Câmpuri adăugate de multer/upload – nu le muta în details, le ștergem ca să nu dea "extra fields"
const UPLOAD_KEYS_IGNORE = ['fieldname', 'originalname', 'encoding', 'mimetype', 'size', 'destination', 'filename', 'path'];

/**
 * Merge top-level criteria (make, model, year, etc.) into details and replace req.body
 * with ONLY allowed keys so "Extra fields not allowed" never triggers for criteria.
 */
const mergeCriteriaIntoDetails = (req, res, next) => {
  const body = req.body || {};
  if (typeof body !== 'object') return next();

  // Normalizează aliasuri (category_slug -> categorySlug)
  for (const [alias, canonical] of Object.entries(BODY_ALIASES)) {
    if (body[alias] !== undefined && body[canonical] === undefined) {
      body[canonical] = body[alias];
    }
  }

  let detailsObj = {};
  const raw = body.details;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) detailsObj = { ...parsed };
    } catch {
      // leave detailsObj empty; controller will handle invalid JSON
    }
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    detailsObj = { ...raw };
  }

  // Collect flat keys details[key] and detail_key into detailsObj
  for (const key of Object.keys(body)) {
    if (key.startsWith('details[') && key.endsWith(']')) {
      const inner = key.slice(8, -1);
      const v = body[key];
      if (v !== undefined && v !== null && v !== '') detailsObj[inner] = typeof v === 'string' ? v.trim() : v;
    } else if (key.startsWith('detail_')) {
      const inner = key.slice(7);
      const v = body[key];
      if (v !== undefined && v !== null && v !== '') detailsObj[inner] = typeof v === 'string' ? v.trim() : v;
    }
  }

  // Any other non-allowed key = criteria; merge into detailsObj (flatten objects like criterii: { make, model })
  for (const key of Object.keys(body)) {
    if (CREATE_AD_ALLOWED.includes(key)) continue;
    if (key.startsWith('details[') && key.endsWith(']')) continue;
    if (key.startsWith('detail_')) continue;
    if (UPLOAD_KEYS_IGNORE.includes(key)) continue;
    const v = body[key];
    if (v === undefined) continue;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(detailsObj, v);
    } else {
      const val = v === null || v === '' ? undefined : (typeof v === 'string' ? v.trim() : v);
      if (val !== undefined && val !== '') detailsObj[key] = val;
    }
  }

  // Replace req.body with ONLY allowed keys so checkExtraFieldsCreateAd never sees "extra" keys
  req.body = {
    title: body.title,
    description: body.description,
    price: body.price,
    currency: body.currency,
    images: body.images,
    categorySlug: body.categorySlug,
    subCategorySlug: body.subCategorySlug,
    attributes: body.attributes,
    details: detailsObj,
  };
  next();
};

const checkExtraFieldsCreateAd = (req, res, next) => {
  const receivedBodyKeys = Object.keys(req.body || {});
  const extraBodyKeys = receivedBodyKeys.filter((key) => !isAllowedCreateAdKey(key));
  const allowedBodyKeys = [...CREATE_AD_ALLOWED, 'details[key]', 'detail_*'];

  if (extraBodyKeys.length > 0) {
    return res.status(400).json({
      success: false,
      code: 'EXTRA_FIELDS_NOT_ALLOWED',
      message: 'Extra fields not allowed. Criterii (make, model, year, etc.) trebuie trimise în "details" sau ca detail_* / details[key]. Câmpuri permise: title, description, price, currency, images, categorySlug, subCategorySlug, attributes, details.',
      receivedBodyKeys,
      extraBodyKeys,
      allowedBodyKeys,
      fieldErrors: Object.fromEntries(extraBodyKeys.map((k) => [k, `Câmpul '${k}' nu este permis. Folosește "details" pentru criterii.`])),
    });
  }
  next();
};

// Validation rules for create ad
export const validateCreateAd = [
  // Merge all criteria into details and replace req.body with ONLY allowed keys (no "extra fields" possible)
  mergeCriteriaIntoDetails,
  // Explicit extra-fields check: only reject truly unknown root keys; details[key] and detail_* are always allowed
  checkExtraFieldsCreateAd,

  // Validate title
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 120 })
    .withMessage('Title must be between 3 and 120 characters'),
  
  // Validate description
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters'),
  
  // Validate price
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  // Validate currency (optional, defaults to EUR)
  body('currency')
    .optional()
    .isIn(['EUR', 'USD', 'MDL'])
    .withMessage('Currency must be one of: EUR, USD, MDL'),
  
  // Validate images: optional here (uploadToCloudinary sets req.body.images; controller checks length)
  body('images')
    .optional()
    .custom(() => true),
  
  // Validate categorySlug (required) - must exist in Category collection (resolve alias before lookup)
  body('categorySlug')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .custom(async (value) => {
      const resolvedSlug = resolveCategorySlug(value);
      if (!resolvedSlug) {
        throw new Error('Category is required');
      }
      const cat = await Category.findOne({ slug: resolvedSlug });
      if (!cat) {
        throw new Error('Invalid category');
      }
      return true;
    }),
  
  // Validate subCategorySlug (optional; if provided, any non-empty string allowed)
  body('subCategorySlug')
    .optional()
    .trim(),
  
  // Validate attributes (optional) - allowed keys only; full validation in controller
  body('attributes')
    .optional()
    .custom((value) => {
      if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
        throw new Error('Attributes must be an object');
      }
      return true;
    })
    .custom(async (attributes, { req }) => {
      const categorySlug = req.body.categorySlug;
      if (!categorySlug || !attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
        return true;
      }
      const validation = await validateAttributes(categorySlug, attributes);
      if (!validation.valid) {
        throw new Error(`Invalid attribute keys for category: ${validation.invalidKeys.join(', ')}`);
      }
      return true;
    }),
  
  handleValidationErrors,
];

// Validation rules for update ad
export const validateUpdateAd = [
  // Check for extra fields first
  // Only categorySlug and subCategorySlug are accepted (not category/subcategory)
  checkExtraFields(['title', 'description', 'price', 'currency', 'images', 'status', 'categorySlug', 'subCategorySlug', 'attributes']),
  
  // Validate title (optional for update)
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ min: 3, max: 120 })
    .withMessage('Title must be between 3 and 120 characters'),
  
  // Validate description (optional for update)
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty')
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters'),
  
  // Validate price (optional for update)
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  // Validate currency (optional for update)
  body('currency')
    .optional()
    .isIn(['EUR', 'USD', 'MDL'])
    .withMessage('Currency must be one of: EUR, USD, MDL'),
  
  // Validate images (optional for update)
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array')
    .custom((images) => {
      if (images && (images.length < 1 || images.length > 5)) {
        throw new Error('You must provide between 1 and 5 images');
      }
      return true;
    }),
  
  // Validate status (optional for update)
  body('status')
    .optional()
    .isIn(['draft', 'active', 'sold'])
    .withMessage('Status must be one of: draft, active, sold'),
  
  // Validate categorySlug (optional for update) - must exist in Category collection
  body('categorySlug')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty')
    .custom(async (value) => {
      const cat = await Category.findOne({ slug: (value || '').toLowerCase() });
      if (!cat) throw new Error('Invalid category');
      return true;
    }),

  // Validate subCategorySlug (optional for update)
  body('subCategorySlug')
    .optional()
    .trim(),

  // Validate attributes (optional for update)
  body('attributes')
    .optional()
    .custom((value) => {
      if (value !== undefined && (typeof value !== 'object' || value === null || Array.isArray(value))) {
        throw new Error('Attributes must be an object');
      }
      return true;
    })
    .custom(async (attributes, { req }) => {
      const categorySlug = req.body.categorySlug;
      if (!categorySlug || !attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
        return true;
      }
      const validation = await validateAttributes(categorySlug, attributes);
      if (!validation.valid) {
        throw new Error(`Invalid attribute keys for category: ${validation.invalidKeys.join(', ')}`);
      }
      return true;
    }),

  handleValidationErrors,
];

