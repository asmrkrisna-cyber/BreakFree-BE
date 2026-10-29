import { Router } from 'express';
import {
  getKitchenOrders,
  updateKitchenStatus,
  cancelKitchenOrder,
} from '../../controllers/kitchen.controller';

const router = Router();

router.get('/', getKitchenOrders);
router.patch('/:id/status', updateKitchenStatus);
router.post('/:id/cancel', cancelKitchenOrder);

export default router;
