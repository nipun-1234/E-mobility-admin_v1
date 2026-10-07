import { rbacService } from '../services/rbac.service.js';

export const rbacController = {
  /**
   * GET /api/rbac/roles
   */
  async getRoles(req, res) {
    try {
      const roles = await rbacService.getRoles();
      return res.status(200).json({
        success: true,
        roles
      });
    } catch (err) {
      console.error('❌ [RBAC CONTROLLER] getRoles error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve roles.'
      });
    }
  },

  /**
   * GET /api/rbac/permissions
   */
  async getPermissions(req, res) {
    try {
      const permissions = await rbacService.getPermissions();
      return res.status(200).json({
        success: true,
        permissions
      });
    } catch (err) {
      console.error('❌ [RBAC CONTROLLER] getPermissions error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve permissions.'
      });
    }
  },

  /**
   * PUT /api/rbac/roles/:id/permissions
   */
  async updateRolePermissions(req, res) {
    try {
      const roleId = parseInt(req.params.id, 10);
      const { permissions } = req.body;

      if (!roleId || !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payload: role ID and permissions array required.'
        });
      }

      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const result = await rbacService.updateRolePermissions(roleId, permissions, req.user, ipAddress);

      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err) {
      console.error('❌ [RBAC CONTROLLER] updateRolePermissions error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to update role permissions.'
      });
    }
  },

  /**
   * POST /api/rbac/roles
   */
  async createRole(req, res) {
    try {
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const newRole = await rbacService.createRole(req.body, req.user, ipAddress);
      return res.status(201).json({
        success: true,
        role: newRole,
        message: `Role "${newRole.name}" created successfully.`
      });
    } catch (err) {
      console.error('❌ [RBAC CONTROLLER] createRole error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to create role.'
      });
    }
  },

  /**
   * PUT /api/rbac/roles/:id
   */
  async updateRole(req, res) {
    try {
      const roleId = parseInt(req.params.id, 10);
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const updated = await rbacService.updateRole(roleId, req.body, req.user, ipAddress);
      return res.status(200).json({
        success: true,
        role: updated,
        message: 'Role details updated successfully.'
      });
    } catch (err) {
      console.error('❌ [RBAC CONTROLLER] updateRole error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to update role details.'
      });
    }
  },

  /**
   * DELETE /api/rbac/roles/:id
   */
  async deleteRole(req, res) {
    try {
      const roleId = parseInt(req.params.id, 10);
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      const result = await rbacService.deleteRole(roleId, req.user, ipAddress);
      return res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (err) {
      console.error('❌ [RBAC CONTROLLER] deleteRole error:', err);
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to delete role.'
      });
    }
  },

  /**
   * GET /api/rbac/audits
   */
  async getRbacAudits(req, res) {
    try {
      const limit = parseInt(req.query.limit || '50', 10);
      const offset = parseInt(req.query.offset || '0', 10);
      const audits = await rbacService.getRbacAuditLogs({ limit, offset });
      return res.status(200).json({
        success: true,
        audits
      });
    } catch (err) {
      console.error('❌ [RBAC CONTROLLER] getRbacAudits error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve RBAC audit trail.'
      });
    }
  }
};
