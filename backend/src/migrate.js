import { pool } from './config/db.js';
import { encryptEmail, hashEmail } from './utils/crypto.utils.js';

export async function runMigrations() {
  console.log('🔄 [MIGRATION] Running Database Migrations...');
  try {
    const client = await pool.connect();
    try {
      // 1. Check if users table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'users'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        console.log('ℹ️ [MIGRATION] Users table does not exist yet. Will be initialized on startup.');
        return;
      }

      // 2. Alter column types & add email_hash
      await client.query(`
        ALTER TABLE users ALTER COLUMN email TYPE TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin';
        CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users (email_hash);
      `);
      console.log('✅ [MIGRATION] Schema updated: email (TEXT), email_hash (VARCHAR(64)), role (VARCHAR(20)).');

      // 3. Migrate any existing plaintext emails to AES-256-GCM encrypted + HMAC email_hash
      const unmigrated = await client.query(`
        SELECT id, email FROM users WHERE email IS NOT NULL AND email_hash IS NULL;
      `);

      if (unmigrated.rows.length > 0) {
        console.log(`🔒 [MIGRATION] Encrypting and hashing emails for ${unmigrated.rows.length} existing user(s)...`);
        for (const row of unmigrated.rows) {
          const plainEmail = row.email;
          const encrypted = encryptEmail(plainEmail);
          const hash = hashEmail(plainEmail);
          await client.query(
            `UPDATE users SET email = $1, email_hash = $2 WHERE id = $3`,
            [encrypted, hash, row.id]
          );
        }
        console.log('✅ [MIGRATION] Existing emails encrypted and hashed successfully.');
      }

      // 4. Ensure existing NULL or 'user' admin accounts keep admin role if appropriate
      await client.query(`
        UPDATE users SET role = 'admin' WHERE role IS NULL;
      `);

      // 5. Add Admin Activation, Set-Password, and Profile Photo fields to users
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token VARCHAR(128);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMP;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_email TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_email_hash VARCHAR(64);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_setup_token VARCHAR(128);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_setup_expires_at TIMESTAMP;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT TRUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
        CREATE INDEX IF NOT EXISTS idx_users_activation_token ON users (activation_token);
        CREATE INDEX IF NOT EXISTS idx_users_password_setup_token ON users (password_setup_token);
        CREATE INDEX IF NOT EXISTS idx_users_personal_email_hash ON users (personal_email_hash);
      `);

      // 6. Create login_audits table for daily login verification & 14-day retention
      await client.query(`
        CREATE TABLE IF NOT EXISTS login_audits (
          id SERIAL PRIMARY KEY,
          user_id INT,
          user_name VARCHAR(100),
          user_email VARCHAR(150),
          role VARCHAR(30) DEFAULT 'admin',
          ip_address VARCHAR(64),
          device_info TEXT,
          login_status VARCHAR(20) DEFAULT 'SUCCESS',
          verification_status VARCHAR(20) DEFAULT 'VERIFIED',
          photo_filename TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '14 days')
        );
        CREATE INDEX IF NOT EXISTS idx_login_audits_user_id ON login_audits(user_id);
        CREATE INDEX IF NOT EXISTS idx_login_audits_timestamp ON login_audits(timestamp);
      `);

      // 7. Create audit_photo_views table to track when Super Admins view verification photos
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_photo_views (
          id SERIAL PRIMARY KEY,
          audit_id INT REFERENCES login_audits(id) ON DELETE CASCADE,
          super_admin_id INT,
          super_admin_email VARCHAR(150),
          ip_address VARCHAR(64),
          viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_audit_photo_views_audit_id ON audit_photo_views(audit_id);
      `);

      // 8. Add AI CCTV violation integration and real ANPR fields to fines table
      await client.query(`
        ALTER TABLE fines ADD COLUMN IF NOT EXISTS camera_id VARCHAR(50);
        ALTER TABLE fines ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(50);
        ALTER TABLE fines ADD COLUMN IF NOT EXISTS evidence_image_url TEXT;
        ALTER TABLE fines ADD COLUMN IF NOT EXISTS plate_raw_text VARCHAR(100);
        ALTER TABLE fines ADD COLUMN IF NOT EXISTS plate_confidence NUMERIC;
        ALTER TABLE fines ADD COLUMN IF NOT EXISTS plate_status VARCHAR(50);
        ALTER TABLE fines ADD COLUMN IF NOT EXISTS plate_crop_url TEXT;
        ALTER TABLE fines ALTER COLUMN vehicle_plate DROP NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_fines_camera_id ON fines (camera_id);
        CREATE INDEX IF NOT EXISTS idx_fines_tracking_id ON fines (tracking_id);
        CREATE INDEX IF NOT EXISTS idx_fines_plate_status ON fines (plate_status);
      `);

      // 9. Create RBAC schema: roles, permissions, role_permissions, and rbac_audit_logs
      await client.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          type VARCHAR(20) DEFAULT 'System',
          icon VARCHAR(50) DEFAULT 'Shield',
          color VARCHAR(30) DEFAULT 'emerald',
          description TEXT,
          status VARCHAR(20) DEFAULT 'Active',
          clearance VARCHAR(100),
          scope TEXT,
          mfa_enforced BOOLEAN DEFAULT FALSE,
          session_timeout VARCHAR(50) DEFAULT '30 Minutes',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS permissions (
          id SERIAL PRIMARY KEY,
          permission_key VARCHAR(100) UNIQUE NOT NULL,
          module VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS role_permissions (
          id SERIAL PRIMARY KEY,
          role_id INT REFERENCES roles(id) ON DELETE CASCADE,
          permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
          access_level VARCHAR(20) DEFAULT 'none',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(role_id, permission_id)
        );

        CREATE TABLE IF NOT EXISTS rbac_audit_logs (
          id SERIAL PRIMARY KEY,
          actor_id INT,
          actor_email VARCHAR(150),
          actor_role VARCHAR(50),
          action VARCHAR(100) NOT NULL,
          target_role_id INT,
          target_role_code VARCHAR(50),
          details JSONB,
          ip_address VARCHAR(64),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
        CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(permission_key);
        CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
        CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_created_at ON rbac_audit_logs(created_at);
      `);

      // 10. Seed baseline permissions (idempotent)
      const baselinePermissions = [
        { key: 'dashboard.view', module: 'Dashboard', desc: 'View operational and executive dashboards' },
        { key: 'admins.manage', module: 'Admins', desc: 'Manage and provision system administrators' },
        { key: 'audit.photos.view', module: 'Login Photo Audit', desc: 'View facial login verification audits' },
        { key: 'users.manage', module: 'Users', desc: 'View and manage registered user accounts' },
        { key: 'roles.manage', module: 'Roles & Permissions', desc: 'Configure system roles and RBAC privileges' },
        { key: 'vehicles.manage', module: 'Vehicles', desc: 'Manage vehicle registry and lookups' },
        { key: 'cctv.view', module: 'ANPR & CCTV', desc: 'Access real-time CCTV feeds and ANPR radar' },
        { key: 'toll.view', module: 'Toll & Revenue', desc: 'Access toll transactions and revenue telemetry' },
        { key: 'reports.view', module: 'Reports', desc: 'View audit reports and speed violation logs' },
        { key: 'reports.export', module: 'Reports', desc: 'Export and download e-Challan PDFs and CSVs' },
        { key: 'audit.logs.view', module: 'Audit Logs', desc: 'View system audit trails and security logs' },
        { key: 'settings.manage', module: 'Settings', desc: 'Manage system-level configurations and policies' },
        { key: 'notifications.view', module: 'Notifications', desc: 'View operational notifications and live highway alerts' },
        { key: 'notifications.manage', module: 'Notifications', desc: 'Manage, dispatch, and clear operational alerts' }
      ];

      for (const p of baselinePermissions) {
        await client.query(
          `INSERT INTO permissions (permission_key, module, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (permission_key) DO UPDATE SET module = EXCLUDED.module, description = EXCLUDED.description`,
          [p.key, p.module, p.desc]
        );
      }


      // 11. Seed baseline roles (idempotent)
      const baselineRoles = [
        {
          code: 'ROLE_SUPER_ADMIN',
          name: 'Super Admin',
          type: 'System',
          icon: 'Crown',
          color: 'purple',
          description: 'Full system access. Can manage all modules and configurations.',
          status: 'Active',
          clearance: 'Tier 1 (Root / Kernel)',
          scope: 'Global Infrastructure & All Corridors',
          mfa_enforced: true,
          session_timeout: '15 Minutes',
          default_levels: {
            'Dashboard': 'full',
            'Admins': 'full',
            'Login Photo Audit': 'full',
            'Users': 'full',
            'Roles & Permissions': 'full',
            'Vehicles': 'full',
            'ANPR & CCTV': 'full',
            'Toll & Revenue': 'full',
            'Reports': 'full',
            'Audit Logs': 'full',
            'Settings': 'full',
            'Notifications': 'full'
          }
        },
        {
          code: 'ROLE_ADMIN',
          name: 'Admin',
          type: 'System',
          icon: 'Shield',
          color: 'emerald',
          description: 'Operational administration access to assigned modules.',
          status: 'Active',
          clearance: 'Tier 2 (High Clearance)',
          scope: 'Assigned Highway Corridors',
          mfa_enforced: true,
          session_timeout: '30 Minutes',
          default_levels: {
            'Dashboard': 'full',
            'Admins': 'full',
            'Login Photo Audit': 'full',
            'Users': 'full',
            'Roles & Permissions': 'full',
            'Vehicles': 'full',
            'ANPR & CCTV': 'full',
            'Toll & Revenue': 'full',
            'Reports': 'full',
            'Audit Logs': 'read',
            'Settings': 'full',
            'Notifications': 'full'
          }
        },
        {
          code: 'ROLE_OPERATOR',
          name: 'Operator',
          type: 'System',
          icon: 'Users',
          color: 'blue',
          description: 'Daily operations (ANPR, toll, vehicle verification).',
          status: 'Active',
          clearance: 'Tier 3 (Field Operations)',
          scope: 'Toll Plazas & ANPR Monitoring Desks',
          mfa_enforced: false,
          session_timeout: '60 Minutes',
          default_levels: {
            'Dashboard': 'read',
            'Admins': 'none',
            'Login Photo Audit': 'none',
            'Users': 'read',
            'Roles & Permissions': 'none',
            'Vehicles': 'full',
            'ANPR & CCTV': 'full',
            'Toll & Revenue': 'full',
            'Reports': 'read',
            'Audit Logs': 'none',
            'Settings': 'none',
            'Notifications': 'read'
          }
        },
        {
          code: 'ROLE_INSPECTOR',
          name: 'Inspector',
          type: 'System',
          icon: 'Search',
          color: 'amber',
          description: 'Field inspection and verification access.',
          status: 'Active',
          clearance: 'Tier 3 (Enforcement Officer)',
          scope: 'Mobile Patrol & Speed Verification Stations',
          mfa_enforced: true,
          session_timeout: '45 Minutes',
          default_levels: {
            'Dashboard': 'read',
            'Admins': 'none',
            'Login Photo Audit': 'none',
            'Users': 'read',
            'Roles & Permissions': 'none',
            'Vehicles': 'full',
            'ANPR & CCTV': 'full',
            'Toll & Revenue': 'read',
            'Reports': 'full',
            'Audit Logs': 'none',
            'Settings': 'none',
            'Notifications': 'read'
          }
        },
        {
          code: 'ROLE_CITIZEN',
          name: 'Citizen',
          type: 'System',
          icon: 'Car',
          color: 'cyan',
          description: 'Public user access (limited features).',
          status: 'Active',
          clearance: 'Tier 4 (Public Portal)',
          scope: 'Personal Vehicle Registry & e-Pass Wallet',
          mfa_enforced: false,
          session_timeout: '120 Minutes',
          default_levels: {
            'Dashboard': 'none',
            'Admins': 'none',
            'Login Photo Audit': 'none',
            'Users': 'none',
            'Roles & Permissions': 'none',
            'Vehicles': 'none',
            'ANPR & CCTV': 'none',
            'Toll & Revenue': 'none',
            'Reports': 'none',
            'Audit Logs': 'none',
            'Settings': 'none',
            'Notifications': 'none'
          }
        },
        {
          code: 'ROLE_CUSTOM_REGIONAL_OPS',
          name: 'Custom Role 1',
          type: 'Custom',
          icon: 'Settings',
          color: 'rose',
          description: 'Custom role for regional operators.',
          status: 'Active',
          clearance: 'Tier 3 (Regional Custom)',
          scope: 'Southern Expressway Zone 2',
          mfa_enforced: true,
          session_timeout: '30 Minutes',
          default_levels: {
            'Dashboard': 'read',
            'Admins': 'none',
            'Login Photo Audit': 'none',
            'Users': 'read',
            'Roles & Permissions': 'none',
            'Vehicles': 'full',
            'ANPR & CCTV': 'full',
            'Toll & Revenue': 'read',
            'Reports': 'read',
            'Audit Logs': 'none',
            'Settings': 'none',
            'Notifications': 'read'
          }
        }
      ];

      for (const r of baselineRoles) {
        const roleRes = await client.query(
          `INSERT INTO roles (code, name, type, icon, color, description, status, clearance, scope, mfa_enforced, session_timeout)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (code) DO UPDATE SET
             name = EXCLUDED.name,
             type = EXCLUDED.type,
             icon = EXCLUDED.icon,
             color = EXCLUDED.color,
             description = EXCLUDED.description,
             status = EXCLUDED.status,
             clearance = EXCLUDED.clearance,
             scope = EXCLUDED.scope,
             session_timeout = EXCLUDED.session_timeout
           RETURNING id`,
          [r.code, r.name, r.type, r.icon, r.color, r.description, r.status, r.clearance, r.scope, r.mfa_enforced, r.session_timeout]
        );

        const roleId = roleRes.rows[0].id;

        // Ensure all permissions are mapped for each role
        const allPerms = await client.query('SELECT id, module FROM permissions');
        for (const perm of allPerms.rows) {
          const level = r.default_levels[perm.module] || 'none';
          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id, access_level)
             VALUES ($1, $2, $3)
             ON CONFLICT (role_id, permission_id) DO UPDATE SET access_level = EXCLUDED.access_level`,
            [roleId, perm.id, level]
          );
        }
      }

      // 12. Create notifications table for real persistent operational alerts
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          event_id VARCHAR(100) UNIQUE NOT NULL,
          type VARCHAR(50) NOT NULL,
          severity VARCHAR(30) DEFAULT 'medium',
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          camera_id VARCHAR(50),
          reference_id VARCHAR(100),
          target_tab VARCHAR(50) DEFAULT 'Reports',
          is_read BOOLEAN DEFAULT FALSE,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          read_at TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      `);

      // 13. Extend cameras table with per-camera speed limit configuration
      await client.query(`
        ALTER TABLE cameras ADD COLUMN IF NOT EXISTS cam_code VARCHAR(50);
        ALTER TABLE cameras ADD COLUMN IF NOT EXISTS name VARCHAR(100);
        ALTER TABLE cameras ADD COLUMN IF NOT EXISTS speed_limit_kmh NUMERIC DEFAULT 100;
        ALTER TABLE cameras ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Online';
        ALTER TABLE cameras ADD COLUMN IF NOT EXISTS active_tracks INT DEFAULT 0;
        ALTER TABLE cameras ADD COLUMN IF NOT EXISTS accuracy NUMERIC DEFAULT 98.5;
        ALTER TABLE cameras ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        CREATE INDEX IF NOT EXISTS idx_cameras_cam_code ON cameras(cam_code);
      `);

      // Seed & synchronize the 8 operational highway cameras
      const masterCams = [
        { id: 1, code: 'cam_01', name: 'Cam-01 (Southern Expy Km 68.4)', location: 'Pinnaduwa Interchange', speedLimit: 100, lat: 6.0534, lng: 80.2167, accuracy: 98.6 },
        { id: 2, code: 'cam_02', name: 'Cam-02 (Outer Circular Km 14.2)', location: 'Kadawatha Interchange', speedLimit: 100, lat: 7.0012, lng: 79.9498, accuracy: 97.4 },
        { id: 3, code: 'cam_03', name: 'Cam-03 (Katunayake Expy Km 8.5)', location: 'Peliyagoda Interchange', speedLimit: 100, lat: 6.9654, lng: 79.8876, accuracy: 99.1 },
        { id: 4, code: 'cam_04', name: 'Cam-04 (Central Expy Km 22.1)', location: 'Mirigama Interchange', speedLimit: 100, lat: 7.2456, lng: 80.1234, accuracy: 99.4 },
        { id: 5, code: 'cam_05', name: 'Cam-05 (Southern Expy Km 34.8)', location: 'Dodangoda Interchange', speedLimit: 100, lat: 6.5623, lng: 80.0345, accuracy: 98.2 },
        { id: 6, code: 'cam_06', name: 'Cam-06 (Outer Circular Km 8.1)', location: 'Kaduwela Interchange', speedLimit: 100, lat: 6.9321, lng: 79.9812, accuracy: 97.9 },
        { id: 7, code: 'cam_07', name: 'Cam-07 (Katunayake Expy Km 19.4)', location: 'Ja-Ela Interchange', speedLimit: 100, lat: 7.0789, lng: 79.8923, accuracy: 99.0 },
        { id: 8, code: 'cam_08', name: 'Cam-08 (Central Expy Km 39.5)', location: 'Kurunegala Interchange', speedLimit: 100, lat: 7.4867, lng: 80.3645, accuracy: 98.8 },
      ];

      for (const mc of masterCams) {
        // Update if camera_id exists or insert if missing
        const existsCheck = await client.query('SELECT camera_id FROM cameras WHERE camera_id = $1 OR cam_code = $2', [mc.id, mc.code]);
        if (existsCheck.rows.length > 0) {
          await client.query(`
            UPDATE cameras
            SET 
              cam_code = $1,
              name = $2,
              location = $3,
              speed_limit_kmh = COALESCE(speed_limit_kmh, $4),
              latitude = $5,
              longitude = $6,
              accuracy = $7
            WHERE camera_id = $8
          `, [mc.code, mc.name, mc.location, mc.speedLimit, mc.lat, mc.lng, mc.accuracy, mc.id]);
        } else {
          await client.query(`
            INSERT INTO cameras (camera_id, cam_code, name, location, speed_limit_kmh, latitude, longitude, accuracy, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Online')
          `, [mc.id, mc.code, mc.name, mc.location, mc.speedLimit, mc.lat, mc.lng, mc.accuracy]);
        }
      }

      console.log('🎉 [MIGRATION] All migrations executed successfully.');
    } finally {
      client.release();
    }


  } catch (err) {
    console.warn('⚠️ [MIGRATION] Database connection warning:', err.message);
  }
}

// Allow direct CLI execution: node src/migrate.js
// Also used in start:prod chain: node src/migrate.js && node src/index.js
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ [MIGRATION ERROR]:', err);
      await pool.end();
      process.exit(1);
    });
}
