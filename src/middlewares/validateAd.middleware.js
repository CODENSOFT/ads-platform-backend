import { body, validationResult } from 'express-validator';
import { AppError } from './error.middleware.js';
import Category from '../models/Category.js';
import { validateAttributes } from '../utils/attributeValidator.js';

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return next(
      new AppError('Validation failed', 400, {
        errors: errorDetails,
      })
    );
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

// Allowed for create ad: base fields + details (JSON or flat keys details[key], detail_key)
const CREATE_AD_ALLOWED = ['title', 'description', 'price', 'currency', 'images', 'categorySlug', 'subCategorySlug', 'attributes', 'details'];
const isAllowedCreateAdKey = (key) =>
  CREATE_AD_ALLOWED.includes(key) || key.startsWith('details[') || key.startsWith('detail_');

const checkExtraFieldsCreateAd = (req, res, next) => {
  const bodyKeys = Object.keys(req.body || {});
  const extraFields = bodyKeys.filter((key) => !isAllowedCreateAdKey(key));

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

// Validation rules for create ad
export const validateCreateAd = [
  // Allow: title, description, price, currency, images, categorySlug, subCategorySlug, attributes, details (+ details[key], detail_*)
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
  
  // Validate images (optional, handled by upload middleware)
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  
  // Validate categorySlug (required) - must exist in Category collection
  body('categorySlug')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .custom(async (value) => {
      const cat = await Category.findOne({ slug: (value || '').toLowerCase() });
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

