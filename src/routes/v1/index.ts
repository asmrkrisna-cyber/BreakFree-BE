import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import shiftRoutes from './shift.routes';
import transactionRoutes from './transaction.routes';
import discountRoutes from './discount.routes';
import kitchenRoutes from './kitchen.routes';
import cashierRoutes from './cashier.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/shifts', shiftRoutes);
router.use('/transactions', transactionRoutes);
router.use('/discounts', discountRoutes);
router.use('/kitchen-orders', kitchenRoutes);
router.use('/cashiers', cashierRoutes);

export default router;