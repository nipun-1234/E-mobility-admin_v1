import { Router } from 'express';
import { fineController } from '../controllers/fine.controller.js';
import { requireAuth, requireAiServiceAuth, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Admin fine / violation retrieval (Protected by RBAC permission)
router.get('/', requireAuth, requirePermission('reports.view'), fineController.getFines);
router.get('/:id', requireAuth, requirePermission('reports.view'), fineController.getFineById);

// AI CCTV speed violation ingest (Service Auth or Admin Auth)
router.post('/violations', requireAiServiceAuth, fineController.recordViolation);

// Public citizen payment & dispute endpoints (Unrestricted)
router.post('/pay', fineController.payFine);
router.post('/:id/pay', fineController.payFine);
router.post('/dispute', fineController.disputeFine);
router.post('/:id/dispute', fineController.disputeFine);

export default router;

