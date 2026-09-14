import { Router } from 'express';
import { CategoryController } from './category.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

// ─── Public routes ─────────────────────────────────
router.get('/', CategoryController.list);
router.get('/slug/:slug', CategoryController.getBySlug);
router.get('/:id', CategoryController.getById);

// ─── Admin-only routes ─────────────────────────────
router.post('/', authenticate, requireRole(['ADMIN']), CategoryController.create);
router.put('/:id', authenticate, requireRole(['ADMIN']), CategoryController.update);
router.delete('/:id', authenticate, requireRole(['ADMIN']), CategoryController.delete);

export default router;