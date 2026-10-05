import { Router } from 'express';
import { fineController } from '../controllers/fine.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, fineController.getFines);
router.post('/violations', fineController.recordViolation);
router.get('/:id', requireAuth, fineController.getFineById);
router.post('/pay', fineController.payFine);
router.post('/:id/pay', fineController.payFine);
router.post('/dispute', fineController.disputeFine);
router.post('/:id/dispute', fineController.disputeFine);

export default router;
