import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { optionalAuth } from '../../middleware/optionalAuth';

const router = Router();

// ─── Public (with optional auth for admin visibility) ─
router.get('/', optionalAuth, ProductController.list);
router.get('/slug/:slug', optionalAuth, ProductController.getBySlug);
router.get('/:id', optionalAuth, ProductController.getById);

// ─── Admin only ─────────────────────────────────────
router.post('/', authenticate, requireRole(['ADMIN']), ProductController.create);
router.put('/:id', authenticate, requireRole(['ADMIN']), ProductController.update);
router.delete('/:id', authenticate, requireRole(['ADMIN']), ProductController.delete);

export default router;