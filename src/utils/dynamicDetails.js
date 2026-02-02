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
        sanitizedDetails[key] = String(value).trim();
        break;
      }
    }
  }

  return { sanitizedDetails };
}
