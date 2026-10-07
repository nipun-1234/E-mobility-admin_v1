import api from './auth.service';

export const fineService = {
  /**
   * Get recent citations/violations from backend PostgreSQL
   */
  getFines: async (plate) => {
    const response = await api.get('/fines', { params: plate ? { plate } : {} });
    return response.data;
  },

  /**
   * Get specific fine citation details by ID
   */
  getFineById: async (id) => {
    const response = await api.get(`/fines/${id}`);
    return response.data;
  },

  /**
   * Record new violation event
   */
  recordViolation: async (data) => {
    const response = await api.post('/fines/violations', data);
    return response.data;
  }
};

export default fineService;
