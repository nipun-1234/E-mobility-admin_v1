import express from 'express';
import { cameraController } from '../controllers/camera.controller.js';
import { cameraWatchdog } from '../services/watchdog.service.js';
import { realtimeService } from '../services/realtime.service.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * GET /api/cameras/events/stream
 * Server-Sent Events (SSE) Live Stream
 */
router.get('/events/stream', (req, res) => {
  realtimeService.registerSSE(req, res);
});

/**
 * GET /api/cameras/health
 * Watchdog operational health
 */
router.get('/health', (req, res) => {
  const status = cameraWatchdog.getStatus();
  res.json({
    success: true,
    aiServerOnline: status.aiServerOnline,
    cameras: status.cameras,
    timestamp: status.timestamp
  });
});

/**
 * GET /api/cameras
 * List all highway CCTV cameras with PostgreSQL configuration and speed limits
 */
router.get('/', requireAuth, requirePermission('cctv.view'), cameraController.getCameras);

/**
 * GET /api/cameras/:id
 * Retrieve specific camera configuration
 */
router.get('/:id', requireAuth, requirePermission('cctv.view'), cameraController.getCameraById);

/**
 * PATCH /api/cameras/:id/speed-limit
 * Update per-camera speed limit (Requires settings.manage permission)
 */
router.patch('/:id/speed-limit', requireAuth, requirePermission('settings.manage'), cameraController.updateCameraSpeedLimit);

/**
 * POST /api/cameras/speed-limit
 * Bulk update all camera speed limits
 */
router.post('/speed-limit', requireAuth, requirePermission('settings.manage'), cameraController.updateAllSpeedLimits);

export default router;
