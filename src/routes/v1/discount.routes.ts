import { Router } from 'express';
import {
  getDiscounts,
  createDiscount,
  toggleDiscountStatus,
  deleteDiscount,
} from '../../controllers/discount.controller';

const router = Router();

router.get('/', getDiscounts);
router.post('/', createDiscount);
router.patch('/:id/toggle', toggleDiscountStatus);
router.delete('/:id', deleteDiscount);

export default router;
