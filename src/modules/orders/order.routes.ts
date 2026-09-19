import { Router } from 'express';
import { OrderController } from './order.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

// All order routes require auth
router.use(authenticate);

// ─── Customer routes ────────────────────────────────
router.post('/checkout', OrderController.checkout);
router.get('/', OrderController.myOrders);
router.post('/:id/cancel', OrderController.cancel);

// ─── Admin routes (put BEFORE :id to avoid conflicts) ─
router.get('/admin/all', requireRole(['ADMIN']), OrderController.listAll);
router.patch(
  '/admin/:id/status',
  requireRole(['ADMIN']),
  OrderController.updateStatus
);

// ─── Single order (last — matches anything) ─────────
router.get('/:id', OrderController.getById);

export default router;