import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

router.get('/', authenticate, requireRole(['ADMIN']), InventoryController.list);
router.get(
  '/low-stock',
  authenticate,
  requireRole(['ADMIN']),
  InventoryController.lowStock
);
router.get(
  '/transactions',
  authenticate,
  requireRole(['ADMIN']),
  InventoryController.transactions
);
router.patch(
  '/variant/:variantId',
  authenticate,
  requireRole(['ADMIN']),
  InventoryController.adjust
);
router.get(
  '/product/:productId',
  authenticate,
  requireRole(['ADMIN', 'SALES_REP']),
  InventoryController.getByProduct
);
router.get(
  '/variant/:variantId',
  authenticate,
  requireRole(['ADMIN', 'SALES_REP']),
  InventoryController.getByVariant
);

export default router;