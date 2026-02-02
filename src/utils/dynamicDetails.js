/**
 * Merge field definitions by key. Sub fields override base on duplicate key.
 * @param {array} baseFields - category.fields (plain objects: { key, label, type, required, options?, min?, max? })
 * @param {array} [subFields] - subcategory.fields (optional)
 * @returns {array} Merged field definitions
 */
export function mergeFieldsByKey(baseFields, subFields) {
  const base = Array.isArray(baseFields) ? baseFields.map((f) => (f && typeof f === 'object' && f.toObject ? f.toObject() : { ...f })) : [];
  const byKey = new Map(base.map((f) => [f.key, f]));
  const sub = Array.isArray(subFields) ? subFields : [];
  for (const f of sub) {
    const plain = f && typeof f === 'object' && f.toObject ? f.toObject() : { ...f };
    if (plain.key) byKey.set(plain.key, plain);
  }
  return Array.from(byKey.values());
}

/**
 * Validation error for details (status 400, fieldKey, optional allowedOptions for select).
 */
export class DetailsValidationError extends Error {
  constructor(message, fieldKey, allowedOptions = null) {
    super(message);
    this.status = 400;
    this.fieldKey = fieldKey;
    this.allowedOptions = allowedOptions;
    this.name = 'DetailsValidationError';
  }
}

/**
 * Sanitize and validate details against field definitions.
 * - Only allow keys present in fields; drop extra keys.
 * - Required: field.required === true must exist and be non-empty.
 * - Types: text => string, number => finite number, select => one of field.options, boolean => boolean.
 * - Coerce: numbers from strings (Number()), boolean from "true"/"false", trim strings.
 * @param {array} fields - Merged field definitions from mergeFieldsByKey(category.fields, subcategory.fields)
 * @param {object} details - Raw details from request (parsed from JSON string if multipart)
 * @returns {{ sanitizedDetails: object }} On success
 * @throws {DetailsValidationError} On validation failure (status 400, message, fieldKey, allowedOptions for select)
 */
export function sanitizeAndValidateDetails(fields, details) {
  const raw = details && typeof details === 'object' && !Array.isArray(details) ? details : {};
  const sanitizedDetails = {};
  const fieldList = Array.isArray(fields) ? fields : [];
  const fieldMap = new Map(fieldList.map((f) => [f.key, f]));

  for (const key of Object.keys(raw)) {
    if (!fieldMap.has(key)) {
      throw new DetailsValidationError(`Unknown field '${key}'`, key, null);
    }
  }

  for (const field of fieldList) {
    const key = field.key;
    let value = raw[key];
    const hasValue = value !== undefined && value !== null && value !== '';

    if (field.required && !hasValue) {
      throw new DetailsValidationError(
        `${field.label || key} is required`,
        key,
        null
      );
    }

    if (!hasValue) continue;

    if (typeof value === 'string') {
      value = value.trim();
      if (value === '' && field.required) {
        throw new DetailsValidationError(`${field.label || key} is required`, key, null);
      }
    }

    switch (field.type) {
      case 'number': {
        const num = Number(value);
        if (!Number.isFinite(num)) {
          throw new DetailsValidationError(`${field.label || key} must be a number`, key, null);
        }
        if (field.min !== undefined && num < field.min) {
          throw new DetailsValidationError(`${field.label || key} must be at least ${field.min}`, key, null);
        }
        if (field.max !== undefined && num > field.max) {
          throw new DetailsValidationError(`${field.label || key} must be at most ${field.max}`, key, null);
        }
        sanitizedDetails[key] = num;
        break;
      }
      case 'select': {
        const strVal = String(value).trim();
        if (Array.isArray(field.options) && field.options.length > 0) {
          if (!field.options.includes(strVal)) {
            throw new DetailsValidationError(
              `${field.label || key} must be one of: ${field.options.join(', ')}`,
              key,
              field.options
            );
          }
        }
        sanitizedDetails[key] = strVal;
        break;
      }
      case 'multiselect': {
        const arr = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : []);
        if (Array.isArray(field.options) && field.options.length > 0) {
          for (const item of arr) {
            if (!field.options.includes(item)) {
              throw new DetailsValidationError(
                `${field.label || key} must contain only: ${field.options.join(', ')}`,
                key,
                field.options
              );
            }
          }
        }
        sanitizedDetails[key] = arr;
        break;
      }
      case 'date': {
        let dateVal = value;
        if (typeof value === 'string') dateVal = value.trim();
        if (dateVal instanceof Date && Number.isFinite(dateVal.getTime())) {
          sanitizedDetails[key] = dateVal.toISOString().slice(0, 10);
        } else if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
          sanitizedDetails[key] = dateVal;
        } else if (typeof dateVal === 'string') {
          const d = new Date(dateVal);
          if (Number.isFinite(d.getTime())) sanitizedDetails[key] = d.toISOString().slice(0, 10);
          else throw new DetailsValidationError(`${field.label || key} must be a valid date (YYYY-MM-DD)`, key, null);
        } else {
          throw new DetailsValidationError(`${field.label || key} must be a valid date`, key, null);
        }
        break;
      }
      case 'boolean': {
        if (typeof value === 'boolean') {
          sanitizedDetails[key] = value;
        } else if (typeof value === 'string') {
          const lower = value.trim().toLowerCase();
          if (lower === 'true' || lower === '1') sanitizedDetails[key] = true;
          else if (lower === 'false' || lower === '0') sanitizedDetails[key] = false;
          else throw new DetailsValidationError(`${field.label || key} must be true or false`, key, ['true', 'false']);
        } else if (typeof value === 'number') {
          sanitizedDetails[key] = value !== 0;
        } else {
          throw new DetailsValidationError(`${field.label || key} must be true or false`, key, ['true', 'false']);
        }
        break;
      }
      case 'text':
      case 'textarea':
      default: {
        sanitizedDetails[key] = typeof value === 'string' ? value.trim() : String(value).trim();
        break;
      }
    }
  }

  return { sanitizedDetails };
}

/**
 * Validate details against field definitions and return sanitized object + field-level errors.
 * Does not throw; collects all errors. Keys in fieldErrors use "detail_<key>" for frontend.
 * @param {array} fields - Merged field definitions (category + subcategory)
 * @param {object} details - Raw details from request
 * @param {{ categorySlug?: string }} [options] - e.g. { categorySlug: 'educatie-cursuri' } for special rules
 * @returns {{ sanitized: object, fieldErrors: object }}
 */
export function validateDetails(fields, details, options = {}) {
  const raw = details && typeof details === 'object' && !Array.isArray(details) ? details : {};
  const sanitized = {};
  const fieldErrors = {};
  const fieldList = Array.isArray(fields) ? fields : [];
  const fieldMap = new Map(fieldList.map((f) => [f.key, f]));

  // Strip unknown keys (only validate/sanitize known keys)
  for (const field of fieldList) {
    const key = field.key;
    const errKey = `detail_${key}`;
    let value = raw[key];
    const hasValue = value !== undefined && value !== null && value !== '';

    if (field.required && !hasValue) {
      fieldErrors[errKey] = `${field.label || key} is required`;
      continue;
    }

    if (!hasValue) continue;

    if (typeof value === 'string') {
      value = value.trim();
      if (value === '' && field.required) {
        fieldErrors[errKey] = `${field.label || key} is required`;
        continue;
      }
      if (value === '' && !field.required) continue;
    }

    try {
      switch (field.type) {
        case 'number': {
          const num = Number(value);
          if (!Number.isFinite(num)) {
            fieldErrors[errKey] = `${field.label || key} must be a number`;
            break;
          }
          if (field.min !== undefined && num < field.min) {
            fieldErrors[errKey] = `${field.label || key} must be at least ${field.min}`;
            break;
          }
          if (field.max !== undefined && num > field.max) {
            fieldErrors[errKey] = `${field.label || key} must be at most ${field.max}`;
            break;
          }
          sanitized[key] = num;
          break;
        }
        case 'select': {
          const strVal = String(value).trim();
          if (Array.isArray(field.options) && field.options.length > 0) {
            if (!field.options.includes(strVal)) {
              fieldErrors[errKey] = `${field.label || key} must be one of: ${field.options.join(', ')}`;
              break;
            }
          }
          sanitized[key] = strVal;
          break;
        }
        case 'multiselect': {
          const arr = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : []);
          if (Array.isArray(field.options) && field.options.length > 0) {
            for (const item of arr) {
              if (!field.options.includes(item)) {
                fieldErrors[errKey] = `${field.label || key} must contain only: ${field.options.join(', ')}`;
                break;
              }
            }
            if (fieldErrors[errKey]) break;
          }
          sanitized[key] = arr;
          break;
        }
        case 'date': {
          let dateVal = value;
          if (typeof value === 'string') dateVal = value.trim();
          if (dateVal instanceof Date && Number.isFinite(dateVal.getTime())) {
            sanitized[key] = dateVal.toISOString().slice(0, 10);
          } else if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
            sanitized[key] = dateVal;
          } else if (typeof dateVal === 'string') {
            const d = new Date(dateVal);
            if (Number.isFinite(d.getTime())) sanitized[key] = d.toISOString().slice(0, 10);
            else fieldErrors[errKey] = `${field.label || key} must be a valid date (YYYY-MM-DD)`;
          } else {
            fieldErrors[errKey] = `${field.label || key} must be a valid date`;
          }
          break;
        }
        case 'boolean': {
          if (typeof value === 'boolean') {
            sanitized[key] = value;
          } else if (typeof value === 'string') {
            const lower = value.trim().toLowerCase();
            if (lower === 'true' || lower === '1') sanitized[key] = true;
            else if (lower === 'false' || lower === '0') sanitized[key] = false;
            else fieldErrors[errKey] = `${field.label || key} must be true or false`;
          } else if (typeof value === 'number') {
            sanitized[key] = value !== 0;
          } else {
            fieldErrors[errKey] = `${field.label || key} must be true or false`;
          }
          break;
        }
        case 'text':
        case 'textarea':
        default: {
          sanitized[key] = typeof value === 'string' ? value.trim() : String(value).trim();
          break;
        }
      }
    } catch (_) {
      fieldErrors[errKey] = `${field.label || key} has invalid value`;
    }
  }

  // Special rule: educatie-cursuri + format Fizic/Hibrid => require location
  if (options.categorySlug === 'educatie-cursuri' && (sanitized.format === 'Fizic' || sanitized.format === 'Hibrid')) {
    const loc = raw.location ?? sanitized.location;
    if (loc === undefined || loc === null || String(loc).trim() === '') {
      fieldErrors.detail_location = 'Location is required for offline/hybrid format';
    } else {
      sanitized.location = typeof loc === 'string' ? loc.trim() : String(loc).trim();
    }
  }

  return { sanitized, fieldErrors };
}
