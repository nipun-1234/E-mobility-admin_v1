import { Router } from 'express';
import { rbacController } from '../controllers/rbac.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// All RBAC endpoints require authenticated Super Admin session
router.use(requireAuth, requireRole('super_admin'));

router.get('/roles', rbacController.getRoles);
router.get('/permissions', rbacController.getPermissions);
router.post('/roles', rbacController.createRole);
router.put('/roles/:id', rbacController.updateRole);
router.put('/roles/:id/permissions', rbacController.updateRolePermissions);
router.delete('/roles/:id', rbacController.deleteRole);
router.get('/audits', rbacController.getRbacAudits);

export default router;
