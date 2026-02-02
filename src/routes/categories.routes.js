import express from 'express';
import { getCategories, getCategoryBySlug } from '../controllers/categories.controller.js';

const router = express.Router();

/**
 * @route   GET /api/categories
 * @desc    Get all categories (name, slug, fields)
 * @access  Public
 */
router.get('/', getCategories);

/**
 * @route   GET /api/categories/:slug
 * @desc    Get single category by slug (including fields schema)
 * @access  Public
 */
router.get('/:slug', getCategoryBySlug);

export default router;

