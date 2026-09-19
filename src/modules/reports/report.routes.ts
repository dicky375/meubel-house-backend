import { Router } from 'express';
import { ReportController } from './report.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/role';

const router = Router();

// All report endpoints require ADMIN
router.use(authenticate);
router.use(requireRole(['ADMIN']));

router.get('/summary', ReportController.summary);
router.get('/sales', ReportController.salesOverTime);
router.get('/products/top', ReportController.topProducts);
router.get('/products/low-stock', ReportController.lowStock);
router.get('/sales-reps', ReportController.salesRepPerformance);
router.get('/orders/status', ReportController.orderStatus);
router.get('/payments/status', ReportController.paymentStatus);
router.get('/users', ReportController.userStats);

export default router;
