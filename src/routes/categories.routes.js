import express from 'express';
import { getCategories, getCategoryBySlug, getCategorySchema } from '../controllers/categories.controller.js';

const router = express.Router();

/**
 * @route   GET /api/categories
 * @desc    Get all categories (name, slug, fields)
 * @access  Public
 */
router.get('/', getCategories);

/**
 * @route   GET /api/categories/:slug/schema
 * @desc    Get category schema/criteria for CreateAd (slug, title, submitAllowed, criteria)
 * @access  Public
 * IMPORTANT: Must be defined before /:slug so /auto/schema matches.
 */
router.get('/:slug/schema', getCategorySchema);

/**
 * @route   GET /api/categories/:slug
 * @desc    Get single category by slug (including fields schema)
 * @access  Public
 */
router.get('/:slug', getCategoryBySlug);

export default router;

