import { Router } from 'express';
import { ProductController } from './product.controller';
import { ReviewController } from '../reviews/review.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { optionalAuth } from '../../middleware/optionalAuth';

const router = Router();

// ─── Public product endpoints ─────────────────────────
router.get('/', optionalAuth, ProductController.list);
router.get('/slug/:slug', optionalAuth, ProductController.getBySlug);

// ─── Product reviews ──────────────────────────────────
router.get('/:productId/reviews', ReviewController.listForProduct);
router.post(
  '/:productId/reviews',
  authenticate,
  ReviewController.create
);

// ─── Single product by id (LAST - matches anything) ───
router.get('/:id', optionalAuth, ProductController.getById);

// ─── Admin only ───────────────────────────────────────
router.post('/', authenticate, requireRole(['ADMIN']), ProductController.create);
router.put('/:id', authenticate, requireRole(['ADMIN']), ProductController.update);
router.delete('/:id', authenticate, requireRole(['ADMIN']), ProductController.delete);

export default router;
