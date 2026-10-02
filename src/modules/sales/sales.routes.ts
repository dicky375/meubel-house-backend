import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

router.use(authenticate);
router.use(requireRole(['SALES_REP', 'ADMIN']));

/**
 * @openapi
 * /sales/products/search:
 *   get:
 *     tags: [Sales]
 *     summary: Search products for in-store sales
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200: { description: Matching products }
 */
router.get('/products/search', SalesController.searchProducts);

/**
 * @openapi
 * /sales/products/{id}/stock:
 *   get:
 *     tags: [Sales]
 *     summary: Check stock for a product
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Stock levels }
 */
router.get('/products/:id/stock', SalesController.checkStock);

/**
 * @openapi
 * /sales/customers/search:
 *   get:
 *     tags: [Sales]
 *     summary: Search customers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *     responses:
 *       200: { description: Matching customers }
 */
router.get('/customers/search', SalesController.searchCustomers);

/**
 * @openapi
 * /sales/orders:
 *   post:
 *     tags: [Sales]
 *     summary: Create an in-store sale
 *     description: Creates an Order with salesChannel=IN_STORE. Supports walk-in customers.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, paymentMethod]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string, format: uuid }
 *                     variantId: { type: string, format: uuid }
 *                     quantity: { type: integer }
 *               customerId: { type: string, format: uuid }
 *               walkInCustomer:
 *                 type: object
 *                 properties:
 *                   name: { type: string }
 *                   phone: { type: string }
 *               paymentMethod: { type: string, enum: [CASH, CARD, TRANSFER] }
 *               amountPaid: { type: number }
 *     responses:
 *       201: { description: Sale created }
 */
router.post('/orders', SalesController.createSale);

/**
 * @openapi
 * /sales/orders:
 *   get:
 *     tags: [Sales]
 *     summary: Get my sales
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Sales by this rep }
 */
router.get('/orders', SalesController.mySales);

/**
 * @openapi
 * /sales/orders/{id}:
 *   get:
 *     tags: [Sales]
 *     summary: Get a specific sale
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Sale details }
 */
router.get('/orders/:id', SalesController.getSale);

export default router;
