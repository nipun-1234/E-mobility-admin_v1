import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// National Vehicle Registry Lookup (7,000 Records)
router.get('/lookup/:plate', vehicleController.lookup);
router.get('/lookup', vehicleController.lookup);

// Vehicle Management (Protected)
router.get('/', requireAuth, vehicleController.getAll);
router.post('/', requireAuth, vehicleController.addVehicle);

export default router;
