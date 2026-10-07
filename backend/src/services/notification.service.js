import { pool, isPostgresConnected } from '../config/db.js';

// In-memory fallback if database is offline
let memoryNotifications = [];
let nextNotifId = 1;

function formatRelativeTime(date) {
  if (!date) return 'Just now';
  const now = Date.now();
  const diffMs = now - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatNotificationRow(r) {
  return {
    id: r.id,
    eventId: r.event_id,
    type: r.type,
    severity: r.severity || 'medium',
    title: r.title,
    message: r.message,
    cameraId: r.camera_id,
    referenceId: r.reference_id,
    targetTab: r.target_tab || 'Reports',
    read: Boolean(r.is_read),
    isRead: Boolean(r.is_read),
    time: formatRelativeTime(r.created_at),
    timestamp: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    readAt: r.read_at,
    metadata: r.metadata || {}
  };
}

export const notificationService = {
  /**
   * Get operational notifications with optional limit and filter
   */
  async getNotifications({ limit = 50, offset = 0, isRead = null } = {}) {
    if (isPostgresConnected()) {
      try {
        let query = `
          SELECT * FROM notifications
        `;
        const params = [];
        if (isRead !== null) {
          query += ` WHERE is_read = $1`;
          params.push(isRead);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const res = await pool.query(query, params);
        return res.rows.map(formatNotificationRow);
      } catch (err) {
        console.warn('⚠️ [NOTIFICATION SERVICE] PostgreSQL read failed, using in-memory store:', err.message);
      }
    }

    let records = [...memoryNotifications];
    if (isRead !== null) {
      records = records.filter(n => n.read === isRead);
    }
    return records.slice(offset, offset + limit);
  },

  /**
   * Create an operational notification with idempotent event_id deduplication
   */
  async createNotification({
    eventId,
    event_id,
    type = 'violation',
    severity = 'medium',
    title,
    message,
    cameraId = null,
    camera_id = null,
    referenceId = null,
    reference_id = null,
    targetTab = 'Reports',
    target_tab = 'Reports',
    metadata = {}
  }) {
    const finalEventId = (eventId || event_id || `EVENT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`).trim();
    const finalCamId = (cameraId || camera_id || '').toLowerCase() || null;
    const finalRefId = referenceId || reference_id || null;
    const finalTab = targetTab || target_tab || 'Reports';

    if (!title || !message) {
      throw new Error('Notification title and message are required.');
    }

    if (isPostgresConnected()) {
      try {
        const query = `
          INSERT INTO notifications (
            event_id, type, severity, title, message, camera_id, reference_id, target_tab, is_read, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9)
          ON CONFLICT (event_id) DO UPDATE SET
            title = EXCLUDED.title,
            message = EXCLUDED.message
          RETURNING *;
        `;
        const params = [
          finalEventId,
          type,
          severity,
          title,
          message,
          finalCamId,
          finalRefId,
          finalTab,
          JSON.stringify(metadata)
        ];

        const res = await pool.query(query, params);
        if (res.rows.length > 0) {
          return formatNotificationRow(res.rows[0]);
        }
      } catch (err) {
        console.warn('⚠️ [NOTIFICATION SERVICE] PostgreSQL write failed, storing in-memory:', err.message);
      }
    }

    // In-memory fallback with deduplication
    const existingIdx = memoryNotifications.findIndex(n => n.eventId === finalEventId);
    const newNotif = {
      id: nextNotifId++,
      eventId: finalEventId,
      type,
      severity,
      title,
      message,
      cameraId: finalCamId,
      referenceId: finalRefId,
      targetTab: finalTab,
      read: false,
      isRead: false,
      time: 'Just now',
      timestamp: new Date().toISOString(),
      metadata
    };

    if (existingIdx >= 0) {
      memoryNotifications[existingIdx] = { ...memoryNotifications[existingIdx], title, message };
      return memoryNotifications[existingIdx];
    } else {
      memoryNotifications.unshift(newNotif);
      return newNotif;
    }
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId) {
    if (isPostgresConnected()) {
      try {
        const query = `
          UPDATE notifications
          SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *;
        `;
        const res = await pool.query(query, [notificationId]);
        if (res.rows.length > 0) {
          return formatNotificationRow(res.rows[0]);
        }
      } catch (err) {
        console.warn('⚠️ [NOTIFICATION SERVICE] markAsRead error:', err.message);
      }
    }

    const notif = memoryNotifications.find(n => String(n.id) === String(notificationId));
    if (notif) {
      notif.read = true;
      notif.isRead = true;
      notif.readAt = new Date().toISOString();
      return notif;
    }
    return { id: notificationId, read: true };
  },

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead() {
    if (isPostgresConnected()) {
      try {
        await pool.query(`
          UPDATE notifications
          SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
          WHERE is_read = FALSE;
        `);
        return { success: true, message: 'All notifications marked as read in PostgreSQL.' };
      } catch (err) {
        console.warn('⚠️ [NOTIFICATION SERVICE] markAllAsRead error:', err.message);
      }
    }

    memoryNotifications.forEach(n => {
      n.read = true;
      n.isRead = true;
      n.readAt = new Date().toISOString();
    });

    return { success: true, message: 'All notifications marked as read.' };
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId) {
    if (isPostgresConnected()) {
      try {
        await pool.query(`DELETE FROM notifications WHERE id = $1`, [notificationId]);
        return { success: true, message: `Notification ${notificationId} deleted.` };
      } catch (err) {
        console.warn('⚠️ [NOTIFICATION SERVICE] deleteNotification error:', err.message);
      }
    }

    memoryNotifications = memoryNotifications.filter(n => String(n.id) !== String(notificationId));
    return { success: true, message: `Notification ${notificationId} deleted.` };
  }
};
