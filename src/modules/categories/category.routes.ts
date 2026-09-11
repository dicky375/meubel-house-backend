import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

// Public: List categories
router.get('/', (req, res) => {
  res.json({ message: 'List categories' });
});

// Public: Get single category
router.get('/:slug', (req, res) => {
  res.json({ message: `Get category: ${req.params.slug}` });
});

// Admin: Create category
router.post('/', authenticate, requireRole(['ADMIN']), (req, res) => {
  res.json({ message: 'Create category' });
});

// Admin: Update category
router.put('/:id', authenticate, requireRole(['ADMIN']), (req, res) => {
  res.json({ message: `Update category: ${req.params.id}` });
});

// Admin: Delete category
router.delete('/:id', authenticate, requireRole(['ADMIN']), (req, res) => {
  res.json({ message: `Delete category: ${req.params.id}` });
});

export default router;