import { Router } from 'express';
import { SalesController } from './sales.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

// All sales routes require SALES_REP or ADMIN
router.use(authenticate);
router.use(requireRole(['SALES_REP', 'ADMIN']));

// Product search + stock check
router.get('/products/search', SalesController.searchProducts);
router.get('/products/:id/stock', SalesController.checkStock);

// Customer lookup
router.get('/customers/search', SalesController.searchCustomers);

// Sales (orders)
router.post('/orders', SalesController.createSale);
router.get('/orders', SalesController.mySales);
router.get('/orders/:id', SalesController.getSale);

export default router;