// src/routes/users.routes.js
import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getMe, getUserPublicProfile } from '../controllers/users.controller.js';

const router = Router();

router.get('/me', protect, getMe);
router.get('/:id', getUserPublicProfile);

export default router;
