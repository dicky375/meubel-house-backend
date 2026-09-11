import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

// Get current user profile
router.get('/me', authenticate, async (req: any, res) => {
  res.json({ user: req.user });
});

// Admin: Get all users
router.get('/', authenticate, requireRole(['ADMIN']), async (req, res) => {
  // Will implement later
  res.json({ message: 'List users' });
});

export default router;