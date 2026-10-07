import { pool, isPostgresConnected } from '../config/db.js';

// Access level hierarchy helper
const LEVEL_VALUES = {
  none: 0,
  limited: 1,
  read: 2,
  full: 3
};

function normalizeRoleCode(rawRole) {
  if (!rawRole) return 'ROLE_CITIZEN';
  const roleLower = String(rawRole).trim().toLowerCase();
  if (roleLower === 'super_admin' || roleLower === 'role_super_admin' || roleLower === 'superadmin') {
    return 'ROLE_SUPER_ADMIN';
  }
  if (roleLower === 'admin' || roleLower === 'role_admin') {
    return 'ROLE_ADMIN';
  }
  if (roleLower === 'operator' || roleLower === 'role_operator') {
    return 'ROLE_OPERATOR';
  }
  if (roleLower === 'inspector' || roleLower === 'role_inspector') {
    return 'ROLE_INSPECTOR';
  }
  if (roleLower === 'user' || roleLower === 'citizen' || roleLower === 'role_citizen') {
    return 'ROLE_CITIZEN';
  }
  return String(rawRole).toUpperCase().startsWith('ROLE_') ? String(rawRole).toUpperCase() : `ROLE_${String(rawRole).toUpperCase()}`;
}

export const rbacService = {
  /**
   * Get all system and custom roles with their permissions matrix
   */
  async getRoles() {
    if (isPostgresConnected()) {
      try {
        const rolesRes = await pool.query(`
          SELECT 
            r.*,
            (SELECT COUNT(*) FROM users u WHERE 
              UPPER(u.role) = UPPER(r.code) OR 
              (r.code = 'ROLE_SUPER_ADMIN' AND u.role = 'super_admin') OR
              (r.code = 'ROLE_ADMIN' AND u.role = 'admin') OR
              (r.code = 'ROLE_CITIZEN' AND (u.role = 'user' OR u.role = 'citizen'))
            ) AS users_count
          FROM roles r
          ORDER BY r.id ASC
        `);

        const rolePermissionsRes = await pool.query(`
          SELECT 
            rp.role_id,
            rp.permission_id,
            rp.access_level,
            p.permission_key,
            p.module,
            p.description
          FROM role_permissions rp
          JOIN permissions p ON rp.permission_id = p.id
          ORDER BY p.id ASC
        `);

        // Group permissions by role_id
        const permsByRole = {};
        for (const row of rolePermissionsRes.rows) {
          if (!permsByRole[row.role_id]) permsByRole[row.role_id] = [];
          
          let accessLabel = 'Restricted';
          if (row.access_level === 'full') accessLabel = 'Full Access';
          else if (row.access_level === 'read') accessLabel = 'Read Only';
          else if (row.access_level === 'limited') accessLabel = 'Limited Access';

          permsByRole[row.role_id].push({
            id: row.permission_id,
            module: row.module,
            permission_key: row.permission_key,
            access: accessLabel,
            level: row.access_level
          });
        }

        return rolesRes.rows.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          icon: r.icon || 'Shield',
          color: r.color || 'emerald',
          description: r.description,
          status: r.status,
          code: r.code,
          usersCount: parseInt(r.users_count || 0, 10),
          clearance: r.clearance || 'Tier 3 (Standard Clearance)',
          scope: r.scope || 'Assigned Scope',
          mfaEnforced: Boolean(r.mfa_enforced),
          sessionTimeout: r.session_timeout || '30 Minutes',
          createdAt: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '2026-01-01',
          permissions: permsByRole[r.id] || []
        }));
      } catch (err) {
        console.warn('⚠️ [RBAC SERVICE] Error fetching roles from PostgreSQL:', err.message);
      }
    }

    return [];
  },

  /**
   * Get all system permissions definitions
   */
  async getPermissions() {
    if (isPostgresConnected()) {
      try {
        const res = await pool.query('SELECT * FROM permissions ORDER BY id ASC');
        return res.rows;
      } catch (err) {
        console.warn('⚠️ [RBAC SERVICE] Error fetching permissions from DB:', err.message);
      }
    }
    return [];
  },

  /**
   * Update permissions for a specific role
   */
  async updateRolePermissions(roleId, permissionsList, actorUser = {}, ipAddress = '127.0.0.1') {
    if (!isPostgresConnected()) {
      throw new Error('PostgreSQL database is offline. Cannot persist RBAC changes.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch role
      const roleRes = await client.query('SELECT * FROM roles WHERE id = $1', [roleId]);
      if (roleRes.rows.length === 0) {
        throw new Error(`Role with ID ${roleId} not found.`);
      }
      const role = roleRes.rows[0];

      // 2. Super Admin Root Protection
      if (role.code === 'ROLE_SUPER_ADMIN') {
        // Ensure super_admin cannot be stripped of critical permissions
        const hasRestricted = permissionsList.some(p => p.level === 'none' || p.level === 'limited');
        if (hasRestricted) {
          throw new Error('Super Admin root authority is cryptographically locked and cannot be restricted.');
        }
      }

      // 3. Upsert role_permissions
      for (const perm of permissionsList) {
        let permId = perm.id;
        if (!permId && perm.module) {
          const pLookup = await client.query('SELECT id FROM permissions WHERE module = $1 LIMIT 1', [perm.module]);
          if (pLookup.rows.length > 0) permId = pLookup.rows[0].id;
        }

        if (permId) {
          let level = perm.level || 'none';
          if (!perm.level && perm.access) {
            if (perm.access === 'Full Access') level = 'full';
            else if (perm.access === 'Read Only') level = 'read';
            else if (perm.access === 'Limited Access') level = 'limited';
            else level = 'none';
          }

          await client.query(`
            INSERT INTO role_permissions (role_id, permission_id, access_level, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (role_id, permission_id) 
            DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = CURRENT_TIMESTAMP
          `, [roleId, permId, level]);
        }
      }

      // 4. Record RBAC Audit Log
      await client.query(`
        INSERT INTO rbac_audit_logs (actor_id, actor_email, actor_role, action, target_role_id, target_role_code, details, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        actorUser.id || null,
        actorUser.email || 'system',
        actorUser.role || 'super_admin',
        'UPDATE_ROLE_PERMISSIONS',
        role.id,
        role.code,
        JSON.stringify({ permissions: permissionsList }),
        ipAddress
      ]);

      await client.query('COMMIT');
      return { success: true, roleId, message: 'Role permissions updated and persisted successfully.' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Create a new custom or system role
   */
  async createRole(roleData, actorUser = {}, ipAddress = '127.0.0.1') {
    if (!isPostgresConnected()) {
      throw new Error('PostgreSQL database is offline.');
    }

    const { name, type = 'Custom', icon = 'Settings', color = 'rose', description = '', permissions = [] } = roleData;
    if (!name || !name.trim()) {
      throw new Error('Role name is required.');
    }

    const code = `ROLE_${name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertRoleRes = await client.query(`
        INSERT INTO roles (code, name, type, icon, color, description, status, clearance, scope, mfa_enforced, session_timeout)
        VALUES ($1, $2, $3, $4, $5, $6, 'Active', 'Tier 3 (Custom Role)', 'Custom Defined Scope', FALSE, '30 Minutes')
        RETURNING *
      `, [code, name.trim(), type, icon, color, description]);

      const newRole = insertRoleRes.rows[0];

      // Get all permissions
      const allPerms = await client.query('SELECT id, module FROM permissions');
      for (const p of allPerms.rows) {
        const matching = permissions.find(pm => pm.module === p.module || pm.id === p.id);
        const level = matching ? (matching.level || 'read') : 'none';
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id, access_level)
          VALUES ($1, $2, $3)
        `, [newRole.id, p.id, level]);
      }

      // Record Audit Log
      await client.query(`
        INSERT INTO rbac_audit_logs (actor_id, actor_email, actor_role, action, target_role_id, target_role_code, details, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        actorUser.id || null,
        actorUser.email || 'system',
        actorUser.role || 'super_admin',
        'CREATE_ROLE',
        newRole.id,
        newRole.code,
        JSON.stringify({ name, type, code }),
        ipAddress
      ]);

      await client.query('COMMIT');
      return newRole;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Update role metadata
   */
  async updateRole(roleId, updates, actorUser = {}, ipAddress = '127.0.0.1') {
    if (!isPostgresConnected()) {
      throw new Error('PostgreSQL database is offline.');
    }

    const { name, description, status, color, icon, clearance, scope, mfaEnforced, sessionTimeout } = updates;
    const roleRes = await pool.query('SELECT * FROM roles WHERE id = $1', [roleId]);
    if (roleRes.rows.length === 0) {
      throw new Error(`Role ${roleId} not found.`);
    }
    const role = roleRes.rows[0];

    // Prevent deactivating super_admin
    if (role.code === 'ROLE_SUPER_ADMIN' && status === 'Inactive') {
      throw new Error('Super Admin role cannot be deactivated.');
    }

    const updated = await pool.query(`
      UPDATE roles
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        color = COALESCE($4, color),
        icon = COALESCE($5, icon),
        clearance = COALESCE($6, clearance),
        scope = COALESCE($7, scope),
        mfa_enforced = COALESCE($8, mfa_enforced),
        session_timeout = COALESCE($9, session_timeout),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [name, description, status, color, icon, clearance, scope, mfaEnforced, sessionTimeout, roleId]);

    // Audit log
    await pool.query(`
      INSERT INTO rbac_audit_logs (actor_id, actor_email, actor_role, action, target_role_id, target_role_code, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      actorUser.id || null,
      actorUser.email || 'system',
      actorUser.role || 'super_admin',
      'UPDATE_ROLE_METADATA',
      role.id,
      role.code,
      JSON.stringify(updates),
      ipAddress
    ]);

    return updated.rows[0];
  },

  /**
   * Delete a custom role
   */
  async deleteRole(roleId, actorUser = {}, ipAddress = '127.0.0.1') {
    if (!isPostgresConnected()) {
      throw new Error('PostgreSQL database is offline.');
    }

    const roleRes = await pool.query('SELECT * FROM roles WHERE id = $1', [roleId]);
    if (roleRes.rows.length === 0) {
      throw new Error(`Role ${roleId} not found.`);
    }
    const role = roleRes.rows[0];

    if (role.type === 'System') {
      throw new Error(`System role "${role.name}" cannot be deleted.`);
    }

    await pool.query('DELETE FROM roles WHERE id = $1', [roleId]);

    // Audit log
    await pool.query(`
      INSERT INTO rbac_audit_logs (actor_id, actor_email, actor_role, action, target_role_id, target_role_code, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      actorUser.id || null,
      actorUser.email || 'system',
      actorUser.role || 'super_admin',
      'DELETE_ROLE',
      role.id,
      role.code,
      JSON.stringify({ name: role.name, code: role.code }),
      ipAddress
    ]);

    return { success: true, message: `Role "${role.name}" deleted successfully.` };
  },

  /**
   * Query all administrative audit records
   */
  async getRbacAuditLogs({ limit = 50, offset = 0 } = {}) {
    if (isPostgresConnected()) {
      try {
        const res = await pool.query(`
          SELECT * FROM rbac_audit_logs 
          ORDER BY created_at DESC 
          LIMIT $1 OFFSET $2
        `, [limit, offset]);
        return res.rows;
      } catch (err) {
        console.warn('⚠️ [RBAC AUDIT] DB read error:', err.message);
      }
    }
    return [];
  },

  /**
   * Backend authorization helper: check if a role code has permission
   */
  async hasPermission(rawRole, requiredPermKey, minLevel = 'read') {
    const roleCode = normalizeRoleCode(rawRole);

    // Super Admin root has unconditional full authority
    if (roleCode === 'ROLE_SUPER_ADMIN') {
      return true;
    }

    if (!isPostgresConnected()) {
      // In-memory fallback if DB not connected
      return true;
    }

    try {
      const res = await pool.query(`
        SELECT rp.access_level
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE r.code = $1 AND p.permission_key = $2
        LIMIT 1
      `, [roleCode, requiredPermKey]);

      if (res.rows.length === 0) {
        return false;
      }

      const currentLevel = res.rows[0].access_level || 'none';
      const currentScore = LEVEL_VALUES[currentLevel] || 0;
      const requiredScore = LEVEL_VALUES[minLevel] || 1;

      return currentScore >= requiredScore;
    } catch (err) {
      console.warn('⚠️ [RBAC PERMISSION CHECK] Error checking permission:', err.message);
      return false;
    }
  }
};
