import { Router } from 'express';
import {
  getCashiers,
  createCashier,
  updateCashierPin,
  deleteCashier,
  verifyCashierPin,
} from '../../controllers/cashier.controller';

const router = Router();

router.get('/', getCashiers);
router.post('/', createCashier);
router.patch('/:id/pin', updateCashierPin);
router.delete('/:id', deleteCashier);
router.post('/verify-pin', verifyCashierPin);

export default router;
