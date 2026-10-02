import { Router } from 'express';
import { UploadController } from './upload.controller';
import { upload } from '../../config/multer';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

/**
 * @openapi
 * /uploads/image:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload a single image (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201: { description: Image uploaded }
 */
router.post('/image', authenticate, requireRole(['ADMIN']), upload.single('file'), UploadController.uploadSingle);

/**
 * @openapi
 * /uploads/images:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload up to 10 images (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201: { description: Images uploaded }
 */
router.post('/images', authenticate, requireRole(['ADMIN']), upload.array('files', 10), UploadController.uploadMultiple);

export default router;
