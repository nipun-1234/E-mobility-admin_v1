import { notificationService } from '../services/notification.service.js';

export const notificationController = {
  /**
   * GET /api/notifications
   */
  async getNotifications(req, res) {
    try {
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);
      const isRead = req.query.is_read !== undefined ? req.query.is_read === 'true' : (req.query.read !== undefined ? req.query.read === 'true' : null);

      const notifications = await notificationService.getNotifications({ limit, offset, isRead });
      return res.status(200).json({
        success: true,
        notifications
      });
    } catch (err) {
      console.error('❌ [NOTIFICATION CONTROLLER] getNotifications error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve notifications.'
      });
    }
  },

  /**
   * POST /api/notifications
   */
  async createNotification(req, res) {
    try {
      const notifData = req.body || {};
      const newNotif = await notificationService.createNotification(notifData);
      return res.status(201).json({
        success: true,
        notification: newNotif,
        message: 'Notification logged successfully.'
      });
    } catch (err) {
      console.error('❌ [NOTIFICATION CONTROLLER] createNotification error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to create notification.'
      });
    }
  },

  /**
   * PATCH /api/notifications/:id/read
   */
  async markAsRead(req, res) {
    try {
      const id = req.params.id;
      const updated = await notificationService.markAsRead(id);
      return res.status(200).json({
        success: true,
        notification: updated,
        message: 'Notification marked as read.'
      });
    } catch (err) {
      console.error('❌ [NOTIFICATION CONTROLLER] markAsRead error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to update notification.'
      });
    }
  },

  /**
   * PATCH /api/notifications/read-all
   */
  async markAllAsRead(req, res) {
    try {
      const result = await notificationService.markAllAsRead();
      return res.status(200).json(result);
    } catch (err) {
      console.error('❌ [NOTIFICATION CONTROLLER] markAllAsRead error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to mark notifications as read.'
      });
    }
  },

  /**
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req, res) {
    try {
      const id = req.params.id;
      const result = await notificationService.deleteNotification(id);
      return res.status(200).json(result);
    } catch (err) {
      console.error('❌ [NOTIFICATION CONTROLLER] deleteNotification error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to delete notification.'
      });
    }
  }
};
