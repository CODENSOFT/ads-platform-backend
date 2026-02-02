import Category from '../models/Category.js';
import { AppError } from '../middlewares/error.middleware.js';

/**
 * Get all categories (name, slug, fields).
 * GET /api/categories
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ slug: 1 }).lean();
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single category by slug (including fields schema).
 * GET /api/categories/:slug
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
    const category = await Category.findOne({ slug }).lean();
    if (!category) {
      return next(
        new AppError('Category not found', 404, {
          type: 'NOT_FOUND',
          slug,
        })
      );
    }
    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
};
