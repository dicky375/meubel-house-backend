import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

/**
 * @openapi
 * /inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: List all inventory (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: productId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: lowStock
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated inventory list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Inventory' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
router.get('/', authenticate, requireRole(['ADMIN']), InventoryController.list);

/**
 * @openapi
 * /inventory/low-stock:
 *   get:
 *     tags: [Inventory]
 *     summary: Items below reorder level (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Low-stock items }
 */
router.get(
  '/low-stock',
  authenticate,
  requireRole(['ADMIN']),
  InventoryController.lowStock
);

/**
 * @openapi
 * /inventory/transactions:
 *   get:
 *     tags: [Inventory]
 *     summary: Full audit trail (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: variantId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [STOCK_IN, SALE, RESERVATION, RELEASE, ADJUSTMENT, RETURN, DAMAGED, TRANSFER]
 *     responses:
 *       200: { description: Paginated transaction list }
 */
router.get(
  '/transactions',
  authenticate,
  requireRole(['ADMIN']),
  InventoryController.transactions
);

/**
 * @openapi
 * /inventory/variant/{variantId}:
 *   patch:
 *     tags: [Inventory]
 *     summary: Adjust stock for a variant (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 description: Signed delta (positive or negative)
 *                 example: -5
 *               type:
 *                 type: string
 *                 enum: [STOCK_IN, SALE, ADJUSTMENT, RETURN, DAMAGED]
 *                 default: ADJUSTMENT
 *               reason: { type: string }
 *     responses:
 *       200: { description: Inventory adjusted }
 *       400: { description: Would result in negative stock }
 */
router.patch(
  '/variant/:variantId',
  authenticate,
  requireRole(['ADMIN']),
  InventoryController.adjust
);

/**
 * @openapi
 * /inventory/product/{productId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Inventory for a product (admin + sales rep)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Inventory with variants }
 */
router.get(
  '/product/:productId',
  authenticate,
  requireRole(['ADMIN', 'SALES_REP']),
  InventoryController.getByProduct
);

/**
 * @openapi
 * /inventory/variant/{variantId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Inventory for a variant (admin + sales rep)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Inventory details }
 */
router.get(
  '/variant/:variantId',
  authenticate,
  requireRole(['ADMIN', 'SALES_REP']),
  InventoryController.getByVariant
);

export default router;