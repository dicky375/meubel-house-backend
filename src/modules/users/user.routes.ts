import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Not authenticated }
 */
router.get('/me', authenticate, UserController.me);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [CUSTOMER, SALES_REP, ADMIN] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated user list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       403: { description: Admin required }
 */
router.get('/', authenticate, requireRole(['ADMIN']), UserController.list);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User details }
 *       404: { description: Not found }
 */
router.get('/:id', authenticate, requireRole(['ADMIN']), UserController.getById);

/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user's role (admin only)
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
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [CUSTOMER, SALES_REP, ADMIN] }
 *     responses:
 *       200: { description: Role updated }
 */
router.patch('/:id/role', authenticate, requireRole(['ADMIN']), UserController.updateRole);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate a user (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User deactivated }
 */
router.delete('/:id', authenticate, requireRole(['ADMIN']), UserController.deactivate);

export default router;
