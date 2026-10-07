import api from './auth.service';

export const notificationService = {
  /**
   * Fetch all operational notifications from PostgreSQL
   */
  getNotifications: async (params = {}) => {
    try {
      const response = await api.get('/notifications', { params });
      return response.data?.notifications || [];
    } catch (err) {
      console.warn('⚠️ [NOTIFICATION CLIENT] Error fetching notifications:', err.message);
      return [];
    }
  },

  /**
   * Log an operational notification
   */
  createNotification: async (data) => {
    const response = await api.post('/notifications', data);
    return response.data?.notification;
  },

  /**
   * Mark a single notification as read in PostgreSQL
   */
  markAsRead: async (id) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      return response.data?.notification;
    } catch (err) {
      console.warn('⚠️ [NOTIFICATION CLIENT] Error marking notification as read:', err.message);
      return { id, read: true };
    }
  },

  /**
   * Mark all notifications as read in PostgreSQL
   */
  markAllAsRead: async () => {
    try {
      const response = await api.patch('/notifications/read-all');
      return response.data;
    } catch (err) {
      console.warn('⚠️ [NOTIFICATION CLIENT] Error marking all notifications as read:', err.message);
      return { success: true };
    }
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  }
};
