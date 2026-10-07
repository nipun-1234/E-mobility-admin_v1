import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Protected notification management routes for Admin operations
router.get('/', requireAuth, requirePermission('notifications.view'), notificationController.getNotifications);
router.post('/', requireAuth, requirePermission('notifications.manage'), notificationController.createNotification);
router.patch('/read-all', requireAuth, requirePermission('notifications.view'), notificationController.markAllAsRead);
router.patch('/:id/read', requireAuth, requirePermission('notifications.view'), notificationController.markAsRead);
router.delete('/:id', requireAuth, requirePermission('notifications.manage'), notificationController.deleteNotification);

export default router;
