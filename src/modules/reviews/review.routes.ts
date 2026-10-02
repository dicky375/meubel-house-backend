import { Router } from 'express';
import { ReviewController } from './review.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

/**
 * @openapi
 * /reviews/admin/all:
 *   get:
 *     tags: [Reviews]
 *     summary: List all reviews (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: All reviews }
 */
router.get('/admin/all', authenticate, requireRole(['ADMIN']), ReviewController.listAll);

/**
 * @openapi
 * /reviews/me:
 *   get:
 *     tags: [Reviews]
 *     summary: Get my reviews
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: My reviews }
 */
router.get('/me', authenticate, ReviewController.myReviews);

/**
 * @openapi
 * /reviews/{id}:
 *   patch:
 *     tags: [Reviews]
 *     summary: Update a review
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
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       200: { description: Review updated }
 */
router.patch('/:id', authenticate, ReviewController.update);

/**
 * @openapi
 * /reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete a review
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Review deleted }
 */
router.delete('/:id', authenticate, ReviewController.delete);

/**
 * @openapi
 * /reviews/{id}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get a review by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Review details }
 */
router.get('/:id', ReviewController.getById);

export default router;
