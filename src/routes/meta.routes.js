import express from 'express';
import { getMetaHealth, getCarMakes, getCarModels } from '../controllers/meta.controller.js';

const router = express.Router();

router.get('/health', getMetaHealth);
router.get('/cars/makes', getCarMakes);
router.get('/cars/models', getCarModels);

export default router;
