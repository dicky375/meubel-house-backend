import { Router } from 'express';
import { ReviewController } from './review.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

// ─── Admin (must come before generic :id routes) ────
router.get(
  '/admin/all',
  authenticate,
  requireRole(['ADMIN']),
  ReviewController.listAll
);

// ─── My reviews (must come BEFORE /:id) ─────────────
router.get('/me', authenticate, ReviewController.myReviews);

// ─── Authenticated user actions ─────────────────────
router.patch('/:id', authenticate, ReviewController.update);
router.delete('/:id', authenticate, ReviewController.delete);

// ─── Public (LAST - matches anything) ───────────────
router.get('/:id', ReviewController.getById);

export default router;
