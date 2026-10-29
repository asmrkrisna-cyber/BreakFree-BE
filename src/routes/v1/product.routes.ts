import { Router } from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
} from '../../controllers/product.controller';

const router = Router();

router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.patch('/:id/toggle', toggleProductStatus);
router.delete('/:id', deleteProduct);

export default router;