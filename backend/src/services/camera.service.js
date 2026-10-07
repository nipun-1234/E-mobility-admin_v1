import http from 'http';
import { pool, isPostgresConnected } from '../config/db.js';
import { realtimeService } from './realtime.service.js';
import { cameraWatchdog } from './watchdog.service.js';

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';

function notifyAiServerOfCameraSpeedLimit(camCode, speedLimit) {
  try {
    const data = JSON.stringify({ cameraId: camCode, speedLimit: Number(speedLimit) });
    const baseUrl = (AI_SERVER_URL || 'http://localhost:8000').replace(/\/+$/, '');
    const url = new URL(`${baseUrl}/api/config/camera_speed_limit`);
    
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 8000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 2000
    }, (res) => {
      // Consume response
      res.resume();
    });

    req.on('error', (err) => {
      console.warn(`⚠️ [CAMERA SERVICE] AI server sync warning for ${camCode}:`, err.message);
    });

    req.write(data);
    req.end();
  } catch (err) {
    console.warn(`⚠️ [CAMERA SERVICE] Could not notify AI server:`, err.message);
  }
}

export const cameraService = {
  /**
   * Get all active cameras with real-time health and persistent speed limits
   */
  async getCameras() {
    let dbCameras = [];
    if (isPostgresConnected()) {
      try {
        const res = await pool.query(`
          SELECT 
            camera_id AS id,
            cam_code,
            name,
            location,
            speed_limit_kmh,
            status,
            latitude,
            longitude,
            accuracy,
            active_tracks,
            updated_at
          FROM cameras
          WHERE cam_code IS NOT NULL OR camera_id <= 8
          ORDER BY camera_id ASC
        `);
        dbCameras = res.rows;
      } catch (err) {
        console.warn('⚠️ [CAMERA SERVICE] DB read error:', err.message);
      }
    }

    const watchdogStatus = cameraWatchdog.getStatus();
    const liveNodes = watchdogStatus.cameras || {};

    // Merge database configuration with live watchdog telemetry
    return dbCameras.map(cam => {
      const code = cam.cam_code || `cam_${String(cam.id).padStart(2, '0')}`;
      const live = liveNodes[code] || {};

      return {
        id: cam.id,
        camId: code,
        name: cam.name || `Cam-${String(cam.id).padStart(2, '0')} (${cam.location})`,
        location: cam.location || 'Highway Checkpoint',
        speedLimit: parseFloat(cam.speed_limit_kmh || 100),
        status: live.status || cam.status || 'Online',
        fps: live.fps || 25.0,
        activeTracks: live.activeTracks !== undefined ? live.activeTracks : (cam.active_tracks || 0),
        accuracy: parseFloat(cam.accuracy || 98.5),
        latitude: cam.latitude ? parseFloat(cam.latitude) : null,
        longitude: cam.longitude ? parseFloat(cam.longitude) : null,
        inferenceLatencyMs: live.inferenceLatencyMs || 7.5,
        updatedAt: cam.updated_at
      };
    });
  },

  /**
   * Get a single camera by ID or code
   */
  async getCameraById(camIdOrCode) {
    const cameras = await this.getCameras();
    const identifier = String(camIdOrCode).toLowerCase().trim();
    return cameras.find(c => String(c.id) === identifier || c.camId.toLowerCase() === identifier) || null;
  },

  /**
   * Update speed limit for a specific camera in PostgreSQL and hot-update AI server
   */
  async updateCameraSpeedLimit(camIdOrCode, speedLimit) {
    const numLimit = parseFloat(speedLimit);

    // Strict validation
    if (isNaN(numLimit) || !isFinite(numLimit) || numLimit < 30 || numLimit > 200) {
      throw new Error(`Invalid speed limit ${speedLimit}. Must be a valid positive number between 30 and 200 km/h.`);
    }

    const identifier = String(camIdOrCode).toLowerCase().trim();
    let updatedCam = null;

    if (isPostgresConnected()) {
      const isNum = !isNaN(parseInt(identifier, 10)) && String(parseInt(identifier, 10)) === identifier;
      const query = isNum
        ? `UPDATE cameras SET speed_limit_kmh = $1, updated_at = CURRENT_TIMESTAMP WHERE camera_id = $2 RETURNING *`
        : `UPDATE cameras SET speed_limit_kmh = $1, updated_at = CURRENT_TIMESTAMP WHERE LOWER(cam_code) = $2 RETURNING *`;

      const params = isNum ? [numLimit, parseInt(identifier, 10)] : [numLimit, identifier];
      const res = await pool.query(query, params);

      if (res.rows.length === 0) {
        throw new Error(`Camera "${camIdOrCode}" not found.`);
      }

      const row = res.rows[0];
      const camCode = row.cam_code || `cam_${String(row.camera_id).padStart(2, '0')}`;

      // 1. Hot update AI Server worker in real time
      notifyAiServerOfCameraSpeedLimit(camCode, numLimit);

      // 2. Broadcast via WebSocket to connected dashboard clients
      realtimeService.broadcast('CAMERA_CONFIG_UPDATED', {
        cameraId: camCode,
        speedLimit: numLimit,
        timestamp: Date.now()
      });

      return {
        id: row.camera_id,
        camId: camCode,
        name: row.name,
        location: row.location,
        speedLimit: numLimit,
        message: `Speed limit for ${row.name || camCode} updated to ${numLimit} km/h in PostgreSQL & AI server.`
      };
    }

    throw new Error('Database is offline. Cannot persist camera speed limit.');
  },

  /**
   * Bulk update speed limit across all cameras
   */
  async updateAllCameraSpeedLimits(speedLimit) {
    const numLimit = parseFloat(speedLimit);
    if (isNaN(numLimit) || !isFinite(numLimit) || numLimit < 30 || numLimit > 200) {
      throw new Error(`Invalid speed limit ${speedLimit}. Must be a valid positive number between 30 and 200 km/h.`);
    }

    if (isPostgresConnected()) {
      await pool.query(`
        UPDATE cameras 
        SET speed_limit_kmh = $1, updated_at = CURRENT_TIMESTAMP
        WHERE cam_code IS NOT NULL OR camera_id <= 8
      `, [numLimit]);

      // Notify AI server for all 8 cameras
      for (let i = 1; i <= 8; i++) {
        notifyAiServerOfCameraSpeedLimit(`cam_0${i}`, numLimit);
      }

      realtimeService.broadcast('CAMERA_CONFIG_UPDATED', {
        cameraId: 'ALL',
        speedLimit: numLimit,
        timestamp: Date.now()
      });

      return {
        success: true,
        speedLimit: numLimit,
        message: `All 8 expressway cameras updated to ${numLimit} km/h.`
      };
    }

    throw new Error('Database offline.');
  }
};
