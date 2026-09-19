import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import productRoutes from '../modules/products/product.routes';
import categoryRoutes from '../modules/categories/category.routes';
import inventoryRoutes from '../modules/inventory/inventory.routes';
import cartRoutes from '../modules/cart/cart.routes';
import orderRoutes from '../modules/orders/order.routes';
import salesRoutes from '../modules/sales/sales.routes';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/sales', salesRoutes);

export default router;
