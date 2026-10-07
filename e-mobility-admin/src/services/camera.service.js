import api from './auth.service';

export const cameraService = {
  /**
   * Get list of all CCTV highway cameras with persistent speed limits & status
   */
  getCameras: async () => {
    const response = await api.get('/cameras');
    return response.data;
  },

  /**
   * Get specific camera by ID
   */
  getCameraById: async (id) => {
    const response = await api.get(`/cameras/${id}`);
    return response.data;
  },

  /**
   * Update individual camera speed limit (persisted in PostgreSQL and hot-reloaded in AI)
   */
  updateCameraSpeedLimit: async (camId, speedLimit) => {
    const response = await api.patch(`/cameras/${camId}/speed-limit`, { speedLimit: Number(speedLimit) });
    return response.data;
  },

  /**
   * Bulk update all camera speed limits
   */
  updateAllSpeedLimits: async (speedLimit) => {
    const response = await api.post('/cameras/speed-limit', { speedLimit: Number(speedLimit) });
    return response.data;
  }
};

export default cameraService;
