import { Router } from 'express';
import { PromotionController } from './promotion.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

// ─── Authenticated customer: validate code ──────────
router.post('/validate', authenticate, PromotionController.validateCode);

// ─── Admin only ─────────────────────────────────────
router.get('/', authenticate, requireRole(['ADMIN']), PromotionController.list);
router.get('/:id', authenticate, requireRole(['ADMIN']), PromotionController.getById);
router.post('/', authenticate, requireRole(['ADMIN']), PromotionController.create);
router.patch('/:id', authenticate, requireRole(['ADMIN']), PromotionController.update);
router.delete('/:id', authenticate, requireRole(['ADMIN']), PromotionController.delete);

export default router;