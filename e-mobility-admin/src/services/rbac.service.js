import api from './auth.service';

export const rbacService = {
  /**
   * Fetch all roles with their module permissions matrix from PostgreSQL
   */
  fetchRoles: async () => {
    const response = await api.get('/rbac/roles');
    return response.data?.roles || [];
  },

  /**
   * Fetch all system permission definitions
   */
  fetchPermissions: async () => {
    const response = await api.get('/rbac/permissions');
    return response.data?.permissions || [];
  },

  /**
   * Update and persist role permissions to PostgreSQL
   */
  updateRolePermissions: async (roleId, permissions) => {
    const response = await api.put(`/rbac/roles/${roleId}/permissions`, { permissions });
    return response.data;
  },

  /**
   * Create a new role with assigned permissions
   */
  createRole: async (roleData) => {
    const response = await api.post('/rbac/roles', roleData);
    return response.data;
  },

  /**
   * Update role metadata (name, description, status, etc.)
   */
  updateRole: async (roleId, updates) => {
    const response = await api.put(`/rbac/roles/${roleId}`, updates);
    return response.data;
  },

  /**
   * Delete a custom role
   */
  deleteRole: async (roleId) => {
    const response = await api.delete(`/rbac/roles/${roleId}`);
    return response.data;
  },

  /**
   * Fetch RBAC administrative audit trail
   */
  fetchRbacAudits: async (params = {}) => {
    const response = await api.get('/rbac/audits', { params });
    return response.data?.audits || [];
  }
};
