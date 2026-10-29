import { Router } from 'express';
import { 
  startShift, 
  getActiveShift, 
  closeShift, 
  getShiftSummary, 
  getShiftHistory 
} from '../../controllers/shift.controller';

const router = Router();

router.post('/start', startShift);
router.get('/active', getActiveShift);
router.post('/close', closeShift);
router.get('/summary', getShiftSummary);
router.get('/history', getShiftHistory); // <--- Baris endpoint riwayat shift yang baru

export default router;