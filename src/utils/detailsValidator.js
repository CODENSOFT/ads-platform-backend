/**
 * Get merged allowed fields for a category and optional subcategory.
 * Base = category.fields; if subSlug matches a subcategory with fields, merge base + sub.fields (sub overrides on duplicate key).
 * @param {object} category - Category doc with fields: [], subcategories: [{ slug, name, fields?: [] }]
 * @param {string} [subSlug] - Optional subcategory slug (trimmed, lowercase)
 * @returns {array} Array of field definitions { key, label, type, required, options?, min?, max?, placeholder?, unit? }
 */
export function getAllowedFields(category, subSlug) {
  if (!category || !Array.isArray(category.fields)) {
    return [];
  }
  const base = category.fields.map((f) => ({ ...(f.toObject ? f.toObject() : f) }));
  const slug = subSlug ? String(subSlug).trim().toLowerCase() : '';
  if (!slug || !Array.isArray(category.subcategories) || category.subcategories.length === 0) {
    return base;
  }
  const sub = category.subcategories.find(
    (s) => (s.slug || '').toString().toLowerCase() === slug
  );
  if (!sub || !Array.isArray(sub.fields) || sub.fields.length === 0) {
    return base;
  }
  const byKey = new Map(base.map((f) => [f.key, f]));
  for (const f of sub.fields) {
    const plain = f.toObject ? f.toObject() : f;
    byKey.set(plain.key, plain);
  }
  return Array.from(byKey.values());
}

/**
 * Validate details against allowed fields. Remove unknown keys; validate required and types.
 * number -> finite, min/max; select -> value in options; boolean -> true/false; text/textarea -> string trimmed.
 * @param {object} details - Raw details from request
 * @param {array} allowedFields - From getAllowedFields(category, subSlug)
 * @returns {{ cleanedDetails: object, fieldErrors: object }}
 */
export function validateDetails(details, allowedFields) {
  const fieldErrors = {};
  const cleanedDetails = {};
  const raw = details && typeof details === 'object' && !Array.isArray(details) ? details : {};

  if (!Array.isArray(allowedFields) || allowedFields.length === 0) {
    return { cleanedDetails: {}, fieldErrors: {} };
  }

  const fieldMap = new Map(allowedFields.map((f) => [f.key, f]));

  for (const key of Object.keys(raw)) {
    if (!fieldMap.has(key)) {
      fieldErrors[key] = `Unknown field '${key}'`;
    }
  }

  for (const field of allowedFields) {
    const key = field.key;
    let value = raw[key];
    const hasValue = value !== undefined && value !== null && value !== '';

    if (field.required && !hasValue) {
      fieldErrors[key] = `${field.label || key} is required`;
      continue;
    }

    if (!hasValue) continue;

    if (typeof value === 'string') {
      value = value.trim();
      if (value === '' && field.required) {
        fieldErrors[key] = `${field.label || key} is required`;
        continue;
      }
    }

    if (fieldErrors[key]) continue;

    switch (field.type) {
      case 'number': {
        const num = Number(value);
        if (!Number.isFinite(num)) {
          fieldErrors[key] = `${field.label || key} must be a number`;
        } else if (field.min !== undefined && num < field.min) {
          fieldErrors[key] = `${field.label || key} must be at least ${field.min}`;
        } else if (field.max !== undefined && num > field.max) {
          fieldErrors[key] = `${field.label || key} must be at most ${field.max}`;
        } else {
          cleanedDetails[key] = num;
        }
        break;
      }
      case 'select': {
        const strVal = String(value).trim();
        if (Array.isArray(field.options) && field.options.length > 0) {
          if (!field.options.includes(strVal)) {
            fieldErrors[key] = `${field.label || key} must be one of: ${field.options.join(', ')}`;
          } else {
            cleanedDetails[key] = strVal;
          }
        } else {
          cleanedDetails[key] = strVal;
        }
        break;
      }
      case 'boolean': {
        if (typeof value === 'boolean') {
          cleanedDetails[key] = value;
        } else if (typeof value === 'string') {
          const lower = value.trim().toLowerCase();
          if (lower === 'true' || lower === '1') cleanedDetails[key] = true;
          else if (lower === 'false' || lower === '0') cleanedDetails[key] = false;
          else fieldErrors[key] = `${field.label || key} must be true or false`;
        } else if (typeof value === 'number') {
          cleanedDetails[key] = value !== 0;
        } else {
          fieldErrors[key] = `${field.label || key} must be true or false`;
        }
        break;
      }
      case 'text':
      case 'textarea':
      default: {
        cleanedDetails[key] = String(value).trim();
        break;
      }
    }
  }

  return {
    cleanedDetails,
    fieldErrors,
  };
}

/**
 * Legacy: validate and sanitize against category (no subcategory). Uses getAllowedFields + validateDetails.
 * @param {object} category - Category doc
 * @param {object} details - Raw details
 * @returns {{ valid: boolean, fieldErrors: object, sanitizedDetails: object }}
 */
export function validateDetailsAgainstCategory(category, details) {
  const allowed = getAllowedFields(category, null);
  const { cleanedDetails, fieldErrors } = validateDetails(details, allowed);
  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    sanitizedDetails: cleanedDetails,
  };
}
