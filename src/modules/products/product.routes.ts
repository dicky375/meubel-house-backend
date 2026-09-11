
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

// Public: List products with filters
router.get('/', (req, res) => {
  res.json({ 
    message: 'Products list endpoint',
    filters: ['category', 'priceMin', 'priceMax', 'brand', 'material', 'tags', 'featured', 'topPick'],
    sort: ['price', 'name', 'createdAt', 'rating'],
    pagination: ['page', 'limit']
  });
});

// Public: Get single product by slug
router.get('/:slug', (req, res) => {
  res.json({ message: `Get product: ${req.params.slug}` });
});

// Admin: Create product
router.post('/', authenticate, requireRole(['ADMIN']), (req, res) => {
  res.json({ message: 'Create product' });
});

// Admin: Update product
router.put('/:id', authenticate, requireRole(['ADMIN']), (req, res) => {
  res.json({ message: `Update product: ${req.params.id}` });
});

// Admin: Delete product
router.delete('/:id', authenticate, requireRole(['ADMIN']), (req, res) => {
  res.json({ message: `Delete product: ${req.params.id}` });
});

export default router;