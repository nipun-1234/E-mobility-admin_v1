import { pool } from './src/config/db.js';

async function update() {
  await pool.query(`
    INSERT INTO role_permissions (role_id, permission_id, access_level)
    SELECT r.id, p.id, 'full'
    FROM roles r, permissions p
    WHERE r.code IN ('ROLE_SUPER_ADMIN', 'ROLE_ADMIN')
      AND p.permission_key IN ('notifications.view', 'notifications.manage', 'settings.manage', 'cctv.view')
    ON CONFLICT (role_id, permission_id) DO UPDATE SET access_level = 'full';
  `);
  await pool.query(`
    INSERT INTO role_permissions (role_id, permission_id, access_level)
    SELECT r.id, p.id, 'read'
    FROM roles r, permissions p
    WHERE r.code IN ('ROLE_OPERATOR', 'ROLE_INSPECTOR')
      AND p.permission_key IN ('notifications.view', 'cctv.view')
    ON CONFLICT (role_id, permission_id) DO UPDATE SET access_level = 'read';
  `);
  console.log('✅ Role permissions updated successfully.');
  await pool.end();
}

update().catch(err => {
  console.error(err);
  process.exit(1);
});
