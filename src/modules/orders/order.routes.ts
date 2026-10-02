import { Router } from 'express';
import { OrderController } from './order.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /orders/checkout:
 *   post:
 *     tags: [Orders]
 *     summary: Checkout — convert cart to order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   street: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   country: { type: string }
 *                   zipCode: { type: string }
 *               customerNote: { type: string }
 *     responses:
 *       201: { description: Order created }
 *       400: { description: Cart empty or stock unavailable }
 */
router.post('/checkout', OrderController.checkout);

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: Get my orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of my orders }
 */
router.get('/', OrderController.myOrders);

/**
 * @openapi
 * /orders/{id}/cancel:
 *   post:
 *     tags: [Orders]
 *     summary: Cancel an order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Order cancelled }
 */
router.post('/:id/cancel', OrderController.cancel);

/**
 * @openapi
 * /orders/admin/all:
 *   get:
 *     tags: [Orders]
 *     summary: List all orders (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: All orders }
 */
router.get('/admin/all', requireRole(['ADMIN']), OrderController.listAll);

/**
 * @openapi
 * /orders/admin/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Update order status (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderStatus:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, PROCESSING, READY_FOR_DELIVERY, SHIPPED, DELIVERED, COMPLETED, CANCELLED, RETURNED, REFUNDED]
 *     responses:
 *       200: { description: Order updated }
 */
router.patch('/admin/:id/status', requireRole(['ADMIN']), OrderController.updateStatus);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Order details }
 */
router.get('/:id', OrderController.getById);

export default router;
