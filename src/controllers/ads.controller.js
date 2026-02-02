import Ad from '../models/Ad.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { AppError } from '../middlewares/error.middleware.js';
import cloudinary from '../config/cloudinary.js';
import logger from '../config/logger.js';
import { validateAttributesAgainstCategory } from '../utils/attributeValidator.js';
import { mergeFieldsByKey, validateDetails } from '../utils/dynamicDetails.js';

/**
 * Escape regex special characters to prevent regex injection
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for use in regex
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Normalize query string: treat null, undefined, '', 'null', 'undefined' as missing.
 * @param {*} v - Raw value (string or other)
 * @returns {string} '' if invalid/missing, else trimmed string
 */
const normalizeString = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') return '';
  const t = v.trim();
  if (t === '' || t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined') return '';
  return t;
};

/**
 * Parse attributes from request body (multipart may send JSON string).
 * @param {*} raw - req.body.attributes
 * @returns {object} Plain object or {}
 */
const parseAttributes = (raw) => {
  if (raw === undefined || raw === null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

/**
 * Parse details from request body (multipart may send stringified JSON).
 * @param {*} raw - req.body.details
 * @returns {object} Plain object or {}
 */
const parseDetails = (raw) => {
  if (raw === undefined || raw === null) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

export const getAds = async (req, res, next) => {
  try {
    // Parse and normalize query params (category/categorySlug, subCategory/subCategorySlug aliases)
    const categorySlugRaw = normalizeString(req.query.categorySlug || req.query.category || '');
    let subCategorySlugRaw = normalizeString(req.query.subCategorySlug || req.query.subCategory || '');
    const search = normalizeString(req.query.search || req.query.q || '');
    const sortParam = normalizeString(req.query.sort || '-createdAt');
    const minPriceRaw = normalizeString(req.query.minPrice || '');
    const maxPriceRaw = normalizeString(req.query.maxPrice || '');
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10) || 20));

    // Optional: resolve categoryId -> categorySlug (prioritize slugs from query)
    let categorySlug = categorySlugRaw ? categorySlugRaw.toLowerCase() : '';
    const categoryId = req.query.categoryId;
    if (!categorySlug && categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      const cat = await Category.findById(categoryId).select('slug').lean();
      if (cat && cat.slug) categorySlug = cat.slug.toLowerCase();
    }
    const subCategorySlug = subCategorySlugRaw ? subCategorySlugRaw.toLowerCase() : '';

    // Build Mongo query: active, non-deleted only
    const q = {
      status: 'active',
      isDeleted: false,
    };

    if (categorySlug) q.categorySlug = categorySlug;
    if (subCategorySlug) q.subCategorySlug = subCategorySlug;

    // Details filters: d_<key> (exact or $in if comma-separated), d_<key>_min / d_<key>_max (range)
    const detailsFilters = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (value === undefined || value === null || value === '') continue;
      if (!key.startsWith('d_')) continue;
      const rest = key.slice(2);
      if (rest.endsWith('_min')) {
        const field = rest.slice(0, -4);
        const num = Number(value);
        if (!Number.isNaN(num)) {
          if (!detailsFilters[field] || typeof detailsFilters[field] !== 'object' || Array.isArray(detailsFilters[field])) detailsFilters[field] = {};
          detailsFilters[field].$gte = num;
        }
      } else if (rest.endsWith('_max')) {
        const field = rest.slice(0, -4);
        const num = Number(value);
        if (!Number.isNaN(num)) {
          if (!detailsFilters[field] || typeof detailsFilters[field] !== 'object' || Array.isArray(detailsFilters[field])) detailsFilters[field] = {};
          detailsFilters[field].$lte = num;
        }
      }
    }
    for (const [key, value] of Object.entries(req.query)) {
      if (value === undefined || value === null || value === '') continue;
      if (!key.startsWith('d_') || key.endsWith('_min') || key.endsWith('_max')) continue;
      const rest = key.slice(2);
      const str = String(value).trim();
      if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') continue;
      if (detailsFilters[rest] && typeof detailsFilters[rest] === 'object' && !Array.isArray(detailsFilters[rest]) && ('$gte' in detailsFilters[rest] || '$lte' in detailsFilters[rest])) continue;
      if (str.includes(',')) {
        const values = str.split(',').map((s) => s.trim()).filter(Boolean);
        if (values.length > 0) q[`details.${rest}`] = { $in: values };
      } else {
        const num = Number(value);
        if (!Number.isNaN(num)) {
          detailsFilters[rest] = num;
        } else {
          const escaped = escapeRegex(str);
          q[`details.${rest}`] = new RegExp(escaped, 'i');
        }
      }
    }
    for (const [field, cond] of Object.entries(detailsFilters)) {
      q[`details.${field}`] = cond;
    }

    // Search: title OR description (case-insensitive, regex escaped)
    if (search) {
      const searchEscaped = escapeRegex(search);
      const searchRegex = new RegExp(searchEscaped, 'i');
      q.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    // Price range
    const minPriceNum = minPriceRaw !== '' ? parseFloat(minPriceRaw) : NaN;
    const maxPriceNum = maxPriceRaw !== '' ? parseFloat(maxPriceRaw) : NaN;
    if (!isNaN(minPriceNum) && minPriceNum >= 0) {
      q.price = q.price || {};
      q.price.$gte = minPriceNum;
    }
    if (!isNaN(maxPriceNum) && maxPriceNum >= 0) {
      q.price = q.price || {};
      q.price.$lte = maxPriceNum;
    }

    // Optional: currency and attribute filters (backward compatibility)
    const currency = normalizeString(req.query.currency || '');
    if (currency && ['EUR', 'USD', 'MDL'].includes(currency)) q.currency = currency;
    const brand = normalizeString(req.query.brand || '');
    if (brand) q['attributes.brand'] = brand;
    const condition = normalizeString(req.query.condition || '');
    if (condition) q['attributes.condition'] = condition;
    const year = normalizeString(req.query.year || '');
    if (year) {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum) && yearNum > 1900 && yearNum <= new Date().getFullYear() + 1) {
        q['attributes.year'] = String(yearNum);
      }
    }
    const rooms = normalizeString(req.query.rooms || '');
    if (rooms) {
      const roomsNum = parseInt(rooms, 10);
      if (!isNaN(roomsNum) && roomsNum > 0) q['attributes.rooms'] = String(roomsNum);
    }
    const areaMin = normalizeString(req.query.areaMin || '');
    const areaMax = normalizeString(req.query.areaMax || '');
    const areaConditions = [];
    if (areaMin) {
      const n = parseFloat(areaMin);
      if (!isNaN(n) && n >= 0) areaConditions.push({ $gte: [{ $toDouble: { $ifNull: ['$attributes.areaSqm', '$attributes.area', '0'] } }, n] });
    }
    if (areaMax) {
      const n = parseFloat(areaMax);
      if (!isNaN(n) && n >= 0) areaConditions.push({ $lte: [{ $toDouble: { $ifNull: ['$attributes.areaSqm', '$attributes.area', '0'] } }, n] });
    }
    if (areaConditions.length) q.$expr = areaConditions.length === 1 ? areaConditions[0] : { $and: areaConditions };

    // Sort: '-createdAt' (default), 'price', '-price'
    let sortOption = { createdAt: -1 };
    if (sortParam === 'price') sortOption = { price: 1, createdAt: -1 };
    else if (sortParam === '-price') sortOption = { price: -1, createdAt: -1 };
    else if (sortParam === 'createdAt') sortOption = { createdAt: 1 };
    // else '-createdAt' or any other -> default

    const skip = (page - 1) * limit;

    const [ads, total] = await Promise.all([
      Ad.find(q).populate('user', 'name email').sort(sortOption).skip(skip).limit(limit).lean(),
      Ad.countDocuments(q),
    ]);

    const pages = Math.ceil(total / limit) || 1;
    const pagination = {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    };

    // Prefer ONE structure: response.data.ads; keep top-level ads + pagination for compatibility
    res.json({
      success: true,
      ads,
      pagination,
      data: {
        ads,
        pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAds = async (req, res, next) => {
  try {
    // Ensure req.user exists and has id (should be set by protect middleware)
    if (!req.user || !req.user.id) {
      return next(
        new AppError('Authentication required', 401, {
          type: 'AUTH_REQUIRED',
        })
      );
    }

    // Fetch all ads for the authenticated user
    // Include all statuses (draft/active/sold)
    // Exclude soft-deleted ads
    const ads = await Ad.find({
      user: req.user.id,
      isDeleted: false,
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 }) // Sort by newest first
      .lean();

    res.json({
      success: true,
      ads,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdById = async (req, res, next) => {
  try {
    // Validate ObjectId format to prevent ID injection
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(
        new AppError('Invalid ID format', 400, {
          type: 'INVALID_ID',
        })
      );
    }

    // Find ad (excluding deleted) - don't filter by status yet
    const ad = await Ad.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate('user', 'name email');

    // If ad doesn't exist, return 404
    if (!ad) {
      return next(
        new AppError('Ad not found', 404, {
          type: 'NOT_FOUND',
        })
      );
    }

    // If ad is ACTIVE: return it publicly (no auth required)
    if (ad.status === 'active') {
      return res.json({
        success: true,
        ad,
      });
    }

    // If ad is NOT active (draft/sold): check if user is authenticated and is owner
    // Extract token from Authorization header (optional - no error if missing)
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token provided, return 404 (don't leak that ad exists)
    if (!token) {
      return next(
        new AppError('Ad not found', 404, {
          type: 'NOT_FOUND',
        })
      );
    }

    // Verify JWT token
    try {
      if (!process.env.JWT_SECRET) {
        // If JWT_SECRET not configured, treat as no auth
        return next(
          new AppError('Ad not found', 404, {
            type: 'NOT_FOUND',
          })
        );
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user still exists
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        // User doesn't exist, return 404 (don't leak ad existence)
        return next(
          new AppError('Ad not found', 404, {
            type: 'NOT_FOUND',
          })
        );
      }

      // Check if user is the owner of the ad
      const adUserId = ad.user._id.toString();
      const currentUserId = user._id.toString();

      if (adUserId === currentUserId) {
        // User is owner: return ad (any status)
        return res.json({
      success: true,
      ad,
    });
      } else {
        // User is authenticated but not owner: return 404 (don't leak ad existence)
        return next(
          new AppError('Ad not found', 404, {
            type: 'NOT_FOUND',
          })
        );
      }
    } catch (error) {
      // Token invalid, expired, or malformed: return 404 (don't leak ad existence)
      return next(
        new AppError('Ad not found', 404, {
          type: 'NOT_FOUND',
        })
      );
    }
  } catch (error) {
    next(error);
  }
};

export const createAd = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(
        new AppError('Authentication required', 401, {
          type: 'AUTH_REQUIRED',
        })
      );
    }

    if (req.body.status) {
      return res.status(400).json({
        success: false,
        code: 'STATUS_NOT_ALLOWED',
        message: 'Cannot set status during creation. Ad is created as draft',
        fieldErrors: { status: 'Status cannot be set on create' },
      });
    }

    // Robust extraction from multipart body
    const title = (req.body.title || '').trim();
    const description = (req.body.description || '').trim();
    const priceRaw = req.body.price;
    const currency = (req.body.currency || 'EUR').trim();
    const categorySlug = (req.body.categorySlug || '').trim().toLowerCase();
    const subCategorySlug = (req.body.subCategorySlug || '').trim().toLowerCase();
    const detailsRaw = req.body.details;

    if (process.env.NODE_ENV !== 'production') {
      console.log('[CREATE_AD] body keys:', Object.keys(req.body || {}));
      console.log('[CREATE_AD] categorySlug:', categorySlug, 'subCategorySlug:', subCategorySlug);
      console.log('[CREATE_AD] detailsRaw type:', typeof detailsRaw);
    }

    const fieldErrors = {};

    // Parse details safely: JSON string, or object, or flat keys details[key] / detail_key from multipart
    let detailsObj = {};
    if (typeof detailsRaw === 'string' && detailsRaw.trim()) {
      try {
        detailsObj = JSON.parse(detailsRaw);
        if (typeof detailsObj !== 'object' || detailsObj === null || Array.isArray(detailsObj)) {
          detailsObj = {};
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_DETAILS_JSON',
          message: 'Invalid details JSON',
          fieldErrors: { details: 'Details must be valid JSON' },
        });
      }
    } else if (detailsRaw && typeof detailsRaw === 'object' && !Array.isArray(detailsRaw)) {
      detailsObj = detailsRaw;
    } else {
      // Build from flat multipart keys: details[key] or detail_key
      const body = req.body || {};
      for (const key of Object.keys(body)) {
        if (key === 'details') continue;
        let inner = null;
        if (key.startsWith('details[') && key.endsWith(']')) {
          inner = key.slice(8, -1);
        } else if (key.startsWith('detail_')) {
          inner = key.slice(7);
        }
        if (inner) {
          const v = body[key];
          if (v !== undefined && v !== null) detailsObj[inner] = typeof v === 'string' ? v.trim() : v;
        }
      }
    }

    // Basic field validation
    if (!title) fieldErrors.title = 'Title is required';
    else if (title.length < 3 || title.length > 120) fieldErrors.title = 'Title must be between 3 and 120 characters';
    if (!description) fieldErrors.description = 'Description is required';
    else if (description.length < 20) fieldErrors.description = 'Description must be at least 20 characters';
    const priceNum = priceRaw !== undefined && priceRaw !== null && priceRaw !== '' ? Number(priceRaw) : NaN;
    if (priceRaw === undefined || priceRaw === null || priceRaw === '') fieldErrors.price = 'Price is required';
    else if (!Number.isFinite(priceNum) || priceNum < 0) fieldErrors.price = 'Price must be a positive number';
    const allowedCurrencies = ['EUR', 'USD', 'MDL'];
    if (currency && !allowedCurrencies.includes(currency)) fieldErrors.currency = 'Currency must be one of: EUR, USD, MDL';

    const images = req.body.images;
    if (!images || !Array.isArray(images) || images.length === 0) {
      fieldErrors.images = 'At least one image is required';
    }

    if (!categorySlug) {
      fieldErrors.categorySlug = 'Category is required';
    }

    // Load category (including fields + subcategories.fields)
    let category = null;
    if (categorySlug) {
      category = await Category.findOne({ slug: categorySlug }).lean();
      if (!category) {
        fieldErrors.categorySlug = 'Category not found';
      }
    }

    let sub = null;
    if (categorySlug && subCategorySlug && category) {
      const subs = Array.isArray(category.subcategories) ? category.subcategories : [];
      sub = subs.find((s) => (s.slug || '').toLowerCase() === subCategorySlug);
      if (!sub) {
        fieldErrors.subCategorySlug = 'Subcategory not found for this category';
      }
    }

    // Merge schema fields and validate details (only if category loaded)
    if (category && Object.keys(fieldErrors).length === 0) {
      const baseFields = Array.isArray(category.fields) ? category.fields : [];
      const subFields = Array.isArray(sub?.fields) ? sub.fields : [];
      const fields = mergeFieldsByKey(baseFields, subFields);
      const { sanitized: sanitizedDetails, fieldErrors: detailErrs } = validateDetails(fields, detailsObj, { categorySlug });
      Object.assign(fieldErrors, detailErrs);

      // Attributes validation (optional)
      const attributes = parseAttributes(req.body.attributes);
      const attrValidation = await validateAttributesAgainstCategory(categorySlug, attributes);
      if (!attrValidation.valid && attrValidation.errors?.length) {
        fieldErrors.attributes = attrValidation.errors.map((e) => e.message || e).join('; ');
      }

      // If no validation errors, create ad
      if (Object.keys(fieldErrors).length === 0) {
        const adData = {
          title,
          description,
          price: priceNum,
          currency: currency || 'EUR',
          categorySlug,
          subCategorySlug: subCategorySlug || undefined,
          details: sanitizedDetails,
          attributes: parseAttributes(req.body.attributes),
          images,
          status: 'draft',
          user: req.user.id,
        };

        const ad = await Ad.create(adData);
        const populatedAd = await Ad.findById(ad._id).populate('user', 'name email');

        if (process.env.NODE_ENV !== 'production') {
          console.log('[CREATE_AD] ad created', ad._id, 'details keys:', Object.keys(sanitizedDetails));
        }

        return res.status(201).json({
          success: true,
          message: 'Ad created successfully',
          ad: populatedAd,
        });
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[CREATE_AD] 400 validation', { fieldErrors, detailsKeys: Object.keys(detailsObj) });
    }
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Please fill in required details',
      fieldErrors,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CREATE_AD] error:', error.message);
    }
    next(error);
  }
};

/**
 * Update ad status
 * Validates status transitions: draft -> active -> sold
 * Only owner can change status
 */
export const updateAdStatus = async (req, res, next) => {
  try {
    // Ensure req.user exists and has id
    if (!req.user || !req.user.id) {
      return next(
        new AppError('Authentication required', 401, {
          type: 'AUTH_REQUIRED',
        })
      );
    }

    // Validate ObjectId format to prevent ID injection
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(
        new AppError('Invalid ID format', 400, {
          type: 'INVALID_ID',
        })
      );
    }

    // Find ad in database - exclude deleted ads
    const ad = await Ad.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    // Check if ad exists (404 - not found)
    if (!ad) {
      return next(
        new AppError('Ad not found', 404, {
          type: 'NOT_FOUND',
        })
      );
    }

    // Check if ad is deleted (404 - not found)
    if (ad.isDeleted === true) {
      return next(
        new AppError('Ad not found', 404, {
          type: 'NOT_FOUND',
        })
      );
    }

    // Verify ownership: compare as strings (403 - forbidden)
    const adUserId = ad.user.toString();
    const currentUserId = req.user.id.toString();

    if (adUserId !== currentUserId) {
      return next(
        new AppError('You do not own this resource', 403, {
          type: 'FORBIDDEN',
        })
      );
    }

    // Extract status from request body (already validated by middleware)
    const { status } = req.body;

    // Validate status is one of allowed values (double-check, should be validated by middleware)
    const allowedStatuses = ['draft', 'active', 'sold'];
    if (!allowedStatuses.includes(status)) {
      return next(
        new AppError(`Status must be one of: ${allowedStatuses.join(', ')}`, 400, {
          type: 'INVALID_STATUS',
        })
      );
    }

    // Status transition validation
    // Allowed transitions:
    // - draft -> active (OK)
    // - active -> sold (OK)
    // - draft -> sold (NOT ALLOWED)
    // - active -> draft (NOT ALLOWED)
    // - sold -> anything (NOT ALLOWED)
    const validTransitions = {
      draft: ['active'], // draft can only become active
      active: ['sold'], // active can only become sold
      sold: [], // sold cannot change status
    };

    // Check if current status allows transition to new status
    if (ad.status === 'sold') {
      return next(
        new AppError('Cannot change status of sold ad', 400, {
          type: 'INVALID_STATUS_TRANSITION',
          currentStatus: ad.status,
          requestedStatus: status,
        })
      );
    }

    // Check if transition is valid
    if (!validTransitions[ad.status] || !validTransitions[ad.status].includes(status)) {
      const allowed = validTransitions[ad.status]?.join(', ') || 'none';
      return next(
        new AppError(
          `Invalid status transition. Current status: "${ad.status}", Allowed transitions: ${allowed}`,
          400,
          {
            type: 'INVALID_STATUS_TRANSITION',
            currentStatus: ad.status,
            requestedStatus: status,
            allowedTransitions: validTransitions[ad.status] || [],
          }
        )
      );
    }

    // Update status
    ad.status = status;
    await ad.save();

    // Populate user data for response
    const populatedAd = await Ad.findById(ad._id).populate('user', 'name email');

    // Return consistent JSON format
    res.json({
      success: true,
      data: populatedAd,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update ad details
 * Only allows editing: title, description, price, currency
 * Does NOT allow editing: user, status, isDeleted, images
 * Blocks editing for sold ads
 */
export const updateAd = async (req, res, next) => {
  try {
    // Use ad from checkAdOwnership middleware (already verified for ownership and existence)
    const ad = req.ad;

    // Check if ad is sold - sold ads cannot be edited
    if (ad.status === 'sold') {
      return next(
        new AppError('Cannot edit sold ad', 400, {
          type: 'SOLD_AD_NOT_EDITABLE',
          message: 'Sold ads cannot be edited',
        })
      );
    }

    // Extract ONLY allowed fields from request body
    const { title, description, price, currency, categorySlug, subCategorySlug, attributes: rawAttributes, details: rawDetails } = req.body;
    const attributes = rawAttributes !== undefined ? parseAttributes(rawAttributes) : undefined;
    const details = rawDetails !== undefined ? parseDetails(rawDetails) : undefined;

    const hasUpdates =
      title !== undefined ||
      description !== undefined ||
      price !== undefined ||
      currency !== undefined ||
      categorySlug !== undefined ||
      subCategorySlug !== undefined ||
      rawAttributes !== undefined ||
      rawDetails !== undefined;

    if (!hasUpdates) {
      return next(
        new AppError('At least one field must be provided for update', 400, {
          type: 'NO_FIELDS',
        })
      );
    }

    // Effective category after update (for attribute validation)
    const effectiveCategorySlug = (categorySlug !== undefined ? categorySlug.trim() : ad.categorySlug) || '';

    // When attributes are being updated, validate against category schema (required, select, min/max)
    if (attributes !== undefined) {
      const category = await Category.findOne({ slug: effectiveCategorySlug.toLowerCase() });
      if (category) {
        const attrValidation = await validateAttributesAgainstCategory(effectiveCategorySlug, attributes);
        if (!attrValidation.valid) {
          return next(
            new AppError('Attribute validation failed', 400, {
              type: 'ATTRIBUTE_VALIDATION',
              errors: attrValidation.errors,
            })
          );
        }
      }
      ad.attributes = attributes && typeof attributes === 'object' ? attributes : {};
    }

    // When details are being updated, validate against category + optional subcategory (effective after update)
    if (details !== undefined) {
      const categoryForDetails = await Category.findOne({ slug: effectiveCategorySlug.toLowerCase() }).lean();
      if (categoryForDetails) {
        const effectiveSubSlug = (subCategorySlug !== undefined ? String(subCategorySlug).trim() : (ad.subCategorySlug || '').toString().trim()).toLowerCase();
        const subs = Array.isArray(categoryForDetails.subcategories) ? categoryForDetails.subcategories : [];
        const subMatch = effectiveSubSlug ? subs.find((s) => (s.slug || '').toString().toLowerCase() === effectiveSubSlug) : null;
        if (effectiveSubSlug && !subMatch) {
          return next(
            new AppError('Invalid subcategory for this category', 400, {
              type: 'INVALID_SUBCATEGORY',
              subCategorySlug: effectiveSubSlug,
            })
          );
        }
        const baseFields = Array.isArray(categoryForDetails.fields) ? categoryForDetails.fields : [];
        const subFields = subMatch && Array.isArray(subMatch.fields) ? subMatch.fields : [];
        const mergedFields = mergeFieldsByKey(baseFields, subFields);
        try {
          const result = sanitizeAndValidateDetails(mergedFields, details);
          ad.details = result.sanitizedDetails;
        } catch (err) {
          if (err instanceof DetailsValidationError) {
            return res.status(400).json({
              success: false,
              message: err.message,
              fieldKey: err.fieldKey,
              ...(err.allowedOptions && { allowedOptions: err.allowedOptions }),
            });
          }
          throw err;
        }
      } else {
        ad.details = details && typeof details === 'object' ? details : {};
      }
    }

    if (title !== undefined) ad.title = title.trim();
    if (description !== undefined) ad.description = description.trim();
    if (price !== undefined) {
      ad.price = parseFloat(price);
      if (isNaN(ad.price) || ad.price <= 0) {
        return next(
          new AppError('Price must be a positive number greater than 0', 400, {
            type: 'INVALID_PRICE',
          })
        );
      }
    }
    if (currency !== undefined) ad.currency = currency;
    if (categorySlug !== undefined) ad.categorySlug = categorySlug.trim();
    if (subCategorySlug !== undefined) {
      ad.subCategorySlug = subCategorySlug.trim() || undefined;
    }

    // Save changes (Mongoose will validate schema constraints)
    await ad.save();

    // Populate user data for response
    const populatedAd = await Ad.findById(ad._id).populate('user', 'name email');

    // Return success response
    res.json({
      success: true,
      message: 'Ad updated successfully',
      ad: populatedAd,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAd = async (req, res, next) => {
  try {
    // Ensure req.user exists and has id
    if (!req.user || !req.user.id) {
      return next(
        new AppError('Authentication required', 401, {
          type: 'AUTH_REQUIRED',
        })
      );
    }

    // Validate ObjectId format to prevent ID injection
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return next(
        new AppError('Invalid ID format', 400, {
          type: 'INVALID_ID',
        })
      );
    }

    // Find ad in database - exclude already deleted ads
    const ad = await Ad.findOne({
      _id: req.params.id,
      isDeleted: false,
    });

    // Check if ad exists (404 - not found)
    if (!ad) {
      return next(
        new AppError('Ad not found', 404, {
          type: 'NOT_FOUND',
        })
      );
    }

    // Verify ownership: compare as strings (403 - forbidden)
    const adUserId = ad.user.toString();
    const currentUserId = req.user.id.toString();

    if (adUserId !== currentUserId) {
      return next(
        new AppError('You do not own this resource', 403, {
          type: 'FORBIDDEN',
        })
      );
    }

    // Soft delete: set isDeleted = true
    ad.isDeleted = true;
    await ad.save();

    res.json({
      success: true,
      message: 'Ad deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Extract public_id from Cloudinary URL
 * Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{format}
 * Or: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{format}
 * 
 * @param {string} imageUrl - Full Cloudinary URL
 * @returns {string} public_id (with folder if present)
 */
const extractPublicIdFromUrl = (imageUrl) => {
  try {
    // Parse Cloudinary URL
    // Format: https://res.cloudinary.com/{cloud_name}/image/upload/{path}
    const url = new URL(imageUrl);
    
    // Extract path after /image/upload/
    const pathParts = url.pathname.split('/image/upload/');
    if (pathParts.length !== 2) {
      throw new Error('Invalid Cloudinary URL format');
    }
    
    // Get the path after /image/upload/
    let uploadPath = pathParts[1];
    
    // Remove version prefix if present (v1234567890/)
    uploadPath = uploadPath.replace(/^v\d+\//, '');
    
    // Remove file extension (.jpg, .png, etc.)
    uploadPath = uploadPath.replace(/\.[^/.]+$/, '');
    
    return uploadPath;
  } catch (error) {
    throw new Error(`Invalid Cloudinary URL: ${error.message}`);
  }
};

/**
 * Delete an image from an ad
 * Removes image from Cloudinary and from ad.images array
 * Only owner can delete images
 * Cannot delete last image (minimum 1 image required)
 * Cannot delete from sold ads
 */
export const deleteAdImage = async (req, res, next) => {
  try {
    // Use ad from checkAdOwnership middleware (already verified for ownership and existence)
    const ad = req.ad;

    // Check if ad is sold - sold ads cannot be edited
    if (ad.status === 'sold') {
      return next(
        new AppError('Cannot delete images from sold ad', 400, {
          type: 'SOLD_AD_NOT_EDITABLE',
          message: 'Sold ads cannot be modified',
        })
      );
    }

    // Extract imageUrl from request body
    // Only allow imageUrl field - reject any extra fields
    const bodyKeys = Object.keys(req.body || {});
    const allowedFields = ['imageUrl'];
    const extraFields = bodyKeys.filter((key) => !allowedFields.includes(key));

    if (extraFields.length > 0) {
      return next(
        new AppError('Extra fields not allowed', 400, {
          type: 'EXTRA_FIELDS',
          errors: extraFields.map((field) => ({
            field,
            message: `Field '${field}' is not allowed. Only 'imageUrl' is accepted.`,
          })),
        })
      );
    }

    const { imageUrl } = req.body;

    // Validate imageUrl is provided
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      return next(
        new AppError('imageUrl is required and must be a non-empty string', 400, {
          type: 'MISSING_IMAGE_URL',
        })
      );
    }

    // Check if imageUrl exists in ad.images array
    if (!ad.images || !Array.isArray(ad.images) || !ad.images.includes(imageUrl)) {
      return next(
        new AppError('Image not found in ad', 400, {
          type: 'IMAGE_NOT_FOUND',
          message: 'The specified image URL does not exist in this ad',
        })
      );
    }

    // Check that ad has more than 1 image (cannot delete last image)
    if (ad.images.length <= 1) {
      return next(
        new AppError('Cannot delete last image', 400, {
          type: 'LAST_IMAGE',
          message: 'An ad must have at least one image',
        })
      );
    }

    // Extract public_id from Cloudinary URL
    let publicId;
    try {
      publicId = extractPublicIdFromUrl(imageUrl);
    } catch (error) {
      return next(
        new AppError(`Invalid Cloudinary URL: ${error.message}`, 400, {
          type: 'INVALID_CLOUDINARY_URL',
        })
      );
    }

    // Delete image from Cloudinary
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });

      // Check if deletion was successful
      if (result.result !== 'ok' && result.result !== 'not found') {
        // 'not found' is acceptable (image might already be deleted)
        logger.warn('Cloudinary delete result', {
          result: result.result,
          publicId,
          adId: ad._id,
        });
      }

      logger.info('Image deleted from Cloudinary', {
        publicId,
        result: result.result,
        adId: ad._id,
      });
    } catch (cloudinaryError) {
      // Log error but don't fail the request if image doesn't exist in Cloudinary
      logger.error('Cloudinary delete error', {
        message: cloudinaryError.message,
        publicId,
        adId: ad._id,
      });

      // If it's not a "not found" error, fail the request
      if (!cloudinaryError.message?.includes('not found')) {
        return next(
          new AppError('Failed to delete image from Cloudinary', 500, {
            type: 'CLOUDINARY_DELETE_ERROR',
          })
        );
      }
      // If image not found in Cloudinary, continue (might already be deleted)
    }

    // Remove image from ad.images array
    ad.images = ad.images.filter((url) => url !== imageUrl);

    // Save ad with updated images array
    await ad.save();

    // Return success response with updated images list
    res.json({
      success: true,
      message: 'Image deleted successfully',
      images: ad.images,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set cover image (first image in array)
 * Reorders ad.images array to place specified image at index 0
 * Only owner can set cover image
 * Cannot modify sold ads
 */
export const setAdCover = async (req, res, next) => {
  try {
    // Use ad from checkAdOwnership middleware (already verified for ownership and existence)
    const ad = req.ad;

    // Check if ad is sold - sold ads cannot be edited
    if (ad.status === 'sold') {
      return next(
        new AppError('Cannot modify sold ad', 400, {
          type: 'SOLD_AD_NOT_EDITABLE',
          message: 'Sold ads cannot be modified',
        })
      );
    }

    // Extract imageUrl from request body
    // Only allow imageUrl field - reject any extra fields
    const bodyKeys = Object.keys(req.body || {});
    const allowedFields = ['imageUrl'];
    const extraFields = bodyKeys.filter((key) => !allowedFields.includes(key));

    if (extraFields.length > 0) {
      return next(
        new AppError('Extra fields not allowed', 400, {
          type: 'EXTRA_FIELDS',
          errors: extraFields.map((field) => ({
            field,
            message: `Field '${field}' is not allowed. Only 'imageUrl' is accepted.`,
          })),
        })
      );
    }

    const { imageUrl } = req.body;

    // Validate imageUrl is provided
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      return next(
        new AppError('imageUrl is required and must be a non-empty string', 400, {
          type: 'MISSING_IMAGE_URL',
        })
      );
    }

    // Validate that ad has images array
    if (!ad.images || !Array.isArray(ad.images) || ad.images.length === 0) {
      return next(
        new AppError('Ad has no images', 400, {
          type: 'NO_IMAGES',
          message: 'This ad does not have any images',
        })
      );
    }

    // Check if imageUrl exists in ad.images array
    const imageIndex = ad.images.indexOf(imageUrl);
    if (imageIndex === -1) {
      return next(
        new AppError('Image not found in ad', 400, {
          type: 'IMAGE_NOT_FOUND',
          message: 'The specified image URL does not exist in this ad',
        })
      );
    }

    // Check if imageUrl is already the first image (cover)
    if (imageIndex === 0) {
      // Already the cover image, return success without modification
      return res.json({
        success: true,
        message: 'Cover image is already set',
        images: ad.images,
      });
    }

    // Reorder images array: move imageUrl to position 0
    // Remove imageUrl from current position
    const updatedImages = [...ad.images];
    updatedImages.splice(imageIndex, 1);
    
    // Insert imageUrl at the beginning
    updatedImages.unshift(imageUrl);

    // Update ad.images array
    ad.images = updatedImages;

    // Save ad with reordered images array
    await ad.save();

    // Return success response with updated images list
    res.json({
      success: true,
      message: 'Cover image updated successfully',
      images: ad.images,
    });
  } catch (error) {
    next(error);
  }
};

