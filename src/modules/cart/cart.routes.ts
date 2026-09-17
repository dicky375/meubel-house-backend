import { Router } from 'express';
import { CartController } from './cart.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

router.get('/', CartController.get);
router.post('/items', CartController.addItem);
router.patch('/items/:index', CartController.updateItem);
router.delete('/items/:index', CartController.removeItem);
router.delete('/', CartController.clear);

export default router;