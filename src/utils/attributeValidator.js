import Category from '../models/Category.js';

/**
 * Get allowed attributes for a category (from DB).
 * @param {string} categorySlug
 * @returns {array} Array of allowed attribute keys from category.fields
 */
export const getAllowedAttributes = async (categorySlug) => {
  if (!categorySlug || typeof categorySlug !== 'string') {
    return [];
  }
  const category = await Category.findOne({ slug: categorySlug.toLowerCase() }).lean();
  if (!category || !Array.isArray(category.fields)) {
    return [];
  }
  return category.fields.map((f) => f.key);
};

/**
 * Validate attributes object against category schema from DB.
 * Returns { valid, errors[] } where errors have { field, message }.
 * - Required: each category.fields where required=true must have attributes[field.key] present and not empty.
 * - Select: if field.type === 'select' and field.options exists, value must be in options.
 * - Number: if field has min/max, value must be within range.
 * @param {string} categorySlug
 * @param {object} attributes - plain object of key -> value (values can be string or number or boolean)
 * @returns {Promise<{ valid: boolean, errors: Array<{ field: string, message: string }> }>}
 */
export const validateAttributesAgainstCategory = async (categorySlug, attributes) => {
  const errors = [];
  if (!categorySlug || typeof categorySlug !== 'string') {
    return { valid: true, errors: [] };
  }
  const category = await Category.findOne({ slug: categorySlug.toLowerCase() }).lean();
  if (!category || !Array.isArray(category.fields)) {
    return { valid: true, errors: [] };
  }

  const attrs = attributes && typeof attributes === 'object' && !Array.isArray(attributes)
    ? attributes
    : {};

  for (const field of category.fields) {
    const key = field.key;
    const value = attrs[key];
    const hasValue = value !== undefined && value !== null && value !== '';

    if (field.required) {
      if (!hasValue) {
        errors.push({ field: key, message: `${field.label || key} is required` });
        continue;
      }
    }

    if (!hasValue) continue;

    if (field.type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
      const strVal = String(value).trim();
      if (!field.options.includes(strVal)) {
        errors.push({
          field: key,
          message: `${field.label || key} must be one of: ${field.options.join(', ')}`,
        });
      }
    }

    if (field.type === 'number') {
      const num = Number(value);
      if (Number.isNaN(num)) {
        errors.push({ field: key, message: `${field.label || key} must be a number` });
      } else {
        if (field.min !== undefined && num < field.min) {
          errors.push({ field: key, message: `${field.label || key} must be at least ${field.min}` });
        }
        if (field.max !== undefined && num > field.max) {
          errors.push({ field: key, message: `${field.label || key} must be at most ${field.max}` });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Legacy: validate attributes object against category rules (allowed keys only).
 * Used by middleware when Category might not be loaded yet. Prefer validateAttributesAgainstCategory in controller.
 * @param {string} categorySlug
 * @param {object} attributes
 * @returns {object} { valid: boolean, invalidKeys: array }
 */
export const validateAttributes = async (categorySlug, attributes) => {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    return { valid: true, invalidKeys: [] };
  }
  const allowedKeys = await getAllowedAttributes(categorySlug);
  const providedKeys = Object.keys(attributes);
  const invalidKeys = providedKeys.filter((key) => !allowedKeys.includes(key));
  return {
    valid: invalidKeys.length === 0,
    invalidKeys,
  };
};
