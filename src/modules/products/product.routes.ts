import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';
import { optionalAuth } from '../../middleware/optionalAuth';

const router = Router();

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products
 *     description: Public users see only active + published products. Admins see all including costPrice.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, price, name, updatedAt] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: categorySlug
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: brand
 *         schema: { type: string }
 *       - in: query
 *         name: material
 *         schema: { type: string }
 *       - in: query
 *         name: tags
 *         schema: { type: string }
 *       - in: query
 *         name: priceMin
 *         schema: { type: number }
 *       - in: query
 *         name: priceMax
 *         schema: { type: number }
 *       - in: query
 *         name: featured
 *         schema: { type: boolean }
 *       - in: query
 *         name: topPick
 *         schema: { type: boolean }
 *       - in: query
 *         name: isNew
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Product' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 */
router.get('/', optionalAuth, ProductController.list);

/**
 * @openapi
 * /products/slug/{slug}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product with variants, inventory, category }
 *       404: { description: Not found }
 */
router.get('/slug/:slug', optionalAuth, ProductController.getBySlug);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Product details }
 */
router.get('/:id', optionalAuth, ProductController.getById);

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create product (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, sku]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               shortDescription: { type: string }
 *               categoryId: { type: string, format: uuid }
 *               price: { type: number }
 *               compareAtPrice: { type: number }
 *               costPrice: { type: number }
 *               sku: { type: string }
 *               brand: { type: string }
 *               material: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               images: { type: array, items: { type: string } }
 *               featured: { type: boolean }
 *               isNew: { type: boolean }
 *               status: { type: string, enum: [DRAFT, ACTIVE, INACTIVE, OUT_OF_STOCK, ARCHIVED] }
 *               isActive: { type: boolean }
 *               isPublished: { type: boolean }
 *               initialStock: { type: integer }
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [sku, price]
 *                   properties:
 *                     colour: { type: string }
 *                     size: { type: string }
 *                     material: { type: string }
 *                     sku: { type: string }
 *                     price: { type: number }
 *                     stock: { type: integer }
 *     responses:
 *       201: { description: Product created }
 *       400: { description: Validation error or duplicate SKU }
 */
router.post('/', authenticate, requireRole(['ADMIN']), ProductController.create);

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update product (admin only)
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
 *               name: { type: string }
 *               price: { type: number }
 *               status: { type: string }
 *               isActive: { type: boolean }
 *               isPublished: { type: boolean }
 *               initialStock: { type: integer }
 *     responses:
 *       200: { description: Product updated }
 */
router.put('/:id', authenticate, requireRole(['ADMIN']), ProductController.update);

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete product (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Product deleted }
 */
router.delete('/:id', authenticate, requireRole(['ADMIN']), ProductController.delete);

export default router;