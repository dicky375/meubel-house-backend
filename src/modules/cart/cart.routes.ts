import { Router } from 'express';
import { CartController } from './cart.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get my cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Current user's cart }
 */
router.get('/', CartController.get);

/**
 * @openapi
 * /cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add item to cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: string, format: uuid }
 *               variantId: { type: string, format: uuid }
 *               quantity: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Item added }
 *       400: { description: Product inactive or out of stock }
 */
router.post('/items', CartController.addItem);

/**
 * @openapi
 * /cart/items/{index}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update cart item quantity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: index
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, minimum: 0 }
 *     responses:
 *       200: { description: Cart updated }
 */
router.patch('/items/:index', CartController.updateItem);

/**
 * @openapi
 * /cart/items/{index}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove item from cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: index
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Item removed }
 */
router.delete('/items/:index', CartController.removeItem);

/**
 * @openapi
 * /cart:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Cart cleared }
 */
router.delete('/', CartController.clear);

export default router;
