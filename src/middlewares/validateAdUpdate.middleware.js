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

// Check if at least one valid field is provided
const checkAtLeastOneField = (req, res, next) => {
  const allowedFields = ['title', 'description', 'price', 'currency', 'categorySlug', 'subCategorySlug', 'attributes', 'details'];
  const bodyKeys = Object.keys(req.body || {});
  const hasValidField = bodyKeys.some((key) => allowedFields.includes(key));

  if (!hasValidField) {
    return next(
      new AppError('At least one field must be provided for update', 400, {
        type: 'NO_FIELDS',
        allowedFields,
      })
    );
  }

  next();
};

/**
 * Validation rules for updating an ad
 * Only allows: title, description, price, currency, categorySlug, subCategorySlug, attributes
 * All fields are optional (PATCH)
 * Does NOT allow: status, user, isDeleted, images
 */
export const validateAdUpdate = [
  // Check for extra fields first - only allow title, description, price, currency, categorySlug, subCategorySlug, attributes
  checkExtraFields(['title', 'description', 'price', 'currency', 'categorySlug', 'subCategorySlug', 'attributes', 'details']),

  // Check that at least one field is provided
  checkAtLeastOneField,

  // Validate title (optional for update)
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),

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
    .isFloat({ min: 0.01 }) // Must be greater than 0
    .withMessage('Price must be a positive number greater than 0'),

  // Validate currency (optional for update)
  body('currency')
    .optional()
    .isIn(['EUR', 'USD', 'MDL'])
    .withMessage('Currency must be one of: EUR, USD, MDL'),

  // Validate categorySlug (optional for update) - must exist in Category collection
  body('categorySlug')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty')
    .custom(async (value) => {
      const cat = await Category.findOne({ slug: (value || '').toLowerCase() });
      if (!cat) {
        throw new Error('Invalid category');
      }
      return true;
    }),

  // Validate subCategorySlug (optional for update)
  body('subCategorySlug')
    .optional()
    .trim(),

  // Validate attributes (optional for update) - allowed keys only; full validation in controller
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

