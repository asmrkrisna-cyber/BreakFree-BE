import { Router } from 'express';
import {
  createTransaction,       // <--- Pastikan ini diimport
  getTransactions,
  getTransactionItems,
  voidTransaction,
} from '../../controllers/transaction.controller';

const router = Router();

router.post('/', createTransaction);            // <--- INI YANG KURANG (Buat simpan transaksi POS)
router.get('/', getTransactions);
router.get('/:transactionId/items', getTransactionItems);
router.put('/:transactionId/void', voidTransaction);

export default router;