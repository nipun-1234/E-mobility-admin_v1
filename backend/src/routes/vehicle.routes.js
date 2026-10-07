import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

// National Vehicle Registry Lookup (Public / Unrestricted)
router.get('/lookup/:plate', vehicleController.lookup);
router.get('/lookup', vehicleController.lookup);

// Vehicle Management (Protected by vehicles.manage permission)
router.get('/', requireAuth, requirePermission('vehicles.manage'), vehicleController.getAll);
router.post('/', requireAuth, requirePermission('vehicles.manage'), vehicleController.addVehicle);

export default router;

