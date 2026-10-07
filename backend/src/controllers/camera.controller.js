import { cameraService } from '../services/camera.service.js';

export const cameraController = {
  /**
   * GET /api/cameras
   */
  async getCameras(req, res) {
    try {
      const cameras = await cameraService.getCameras();
      return res.status(200).json({
        success: true,
        cameras
      });
    } catch (err) {
      console.error('❌ [CAMERA CONTROLLER] getCameras error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve camera list.'
      });
    }
  },

  /**
   * GET /api/cameras/:id
   */
  async getCameraById(req, res) {
    try {
      const camera = await cameraService.getCameraById(req.params.id);
      if (!camera) {
        return res.status(404).json({ success: false, message: 'Camera not found.' });
      }
      return res.status(200).json({ success: true, camera });
    } catch (err) {
      console.error('❌ [CAMERA CONTROLLER] getCameraById error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve camera.'
      });
    }
  },

  /**
   * PATCH /api/cameras/:id/speed-limit
   */
  async updateCameraSpeedLimit(req, res) {
    try {
      const camId = req.params.id;
      const { speedLimit, speed_limit_kmh, speed_limit } = req.body || {};
      const limit = speedLimit !== undefined ? speedLimit : (speed_limit_kmh !== undefined ? speed_limit_kmh : speed_limit);

      if (limit === undefined || limit === null) {
        return res.status(400).json({
          success: false,
          message: 'speedLimit numeric value is required.'
        });
      }

      const result = await cameraService.updateCameraSpeedLimit(camId, limit);
      return res.status(200).json({
        success: true,
        camera: result,
        message: result.message
      });
    } catch (err) {
      console.error('❌ [CAMERA CONTROLLER] updateCameraSpeedLimit error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to update camera speed limit.'
      });
    }
  },

  /**
   * POST /api/cameras/speed-limit (Bulk update)
   */
  async updateAllSpeedLimits(req, res) {
    try {
      const { speedLimit, speed_limit_kmh } = req.body || {};
      const limit = speedLimit !== undefined ? speedLimit : speed_limit_kmh;

      if (limit === undefined || limit === null) {
        return res.status(400).json({
          success: false,
          message: 'speedLimit is required.'
        });
      }

      const result = await cameraService.updateAllCameraSpeedLimits(limit);
      return res.status(200).json(result);
    } catch (err) {
      console.error('❌ [CAMERA CONTROLLER] updateAllSpeedLimits error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to bulk update speed limits.'
      });
    }
  }
};
