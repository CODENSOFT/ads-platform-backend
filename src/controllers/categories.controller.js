import Category from '../models/Category.js';
import { AppError } from '../middlewares/error.middleware.js';

/**
 * Get all categories (slug, name, fields, subcategories with fields).
 * GET /api/categories
 * Ensures fields arrays are always arrays (default empty).
 */
export const getCategories = async (req, res, next) => {
  try {
    const docs = await Category.find({}).sort({ slug: 1 }).lean();
    const categories = docs.map((doc) => ({
      slug: doc.slug,
      name: doc.name,
      fields: Array.isArray(doc.fields) ? doc.fields : [],
      subcategories: (Array.isArray(doc.subcategories) ? doc.subcategories : []).map((s) => ({
        slug: s.slug,
        name: s.name,
        fields: Array.isArray(s.fields) ? s.fields : [],
      })),
    }));
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single category by slug (slug, name, fields, subcategories with fields).
 * GET /api/categories/:slug
 * Ensures fields arrays are always arrays (default empty).
 */
export const getCategoryBySlug = async (req, res, next) => {
  try {
    const slug = (req.params.slug || '').trim().toLowerCase();
    if (!slug) {
      return next(
        new AppError('Category slug is required', 400, {
          type: 'INVALID_SLUG',
        })
      );
    }
    const doc = await Category.findOne({ slug }).lean();
    if (!doc) {
      return next(
        new AppError('Category not found', 404, {
          type: 'NOT_FOUND',
          slug,
        })
      );
    }
    const category = {
      slug: doc.slug,
      name: doc.name,
      fields: Array.isArray(doc.fields) ? doc.fields : [],
      subcategories: (Array.isArray(doc.subcategories) ? doc.subcategories : []).map((s) => ({
        slug: s.slug,
        name: s.name,
        fields: Array.isArray(s.fields) ? s.fields : [],
      })),
    };
    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
};
