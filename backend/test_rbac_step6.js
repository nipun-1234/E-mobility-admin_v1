import jwt from 'jsonwebtoken';
import http from 'http';
import { config } from './src/config/env.js';

const JWT_SECRET = config.jwtSecret;

// Generate test tokens
const superAdminToken = jwt.sign(
  { id: 1, email: 'emobilitysuperadmin@gmail.com', role: 'super_admin', name: 'Super Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const adminToken = jwt.sign(
  { id: 2, email: 'admin@example.com', role: 'admin', name: 'Operations Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const userToken = jwt.sign(
  { id: 3, email: 'user@example.com', role: 'user', name: 'Standard Citizen' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (dataString) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(rawData); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || rawData });
      });
    });

    req.on('error', (e) => reject(e));
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 ==========================================');
  console.log('🧪 RUNNING STEP 6 RBAC VERIFICATION SUITE');
  console.log('🧪 ==========================================\n');

  const results = {};

  // Test 1: No JWT -> 401
  console.log('1️⃣  Testing No JWT on RBAC endpoint: GET /api/rbac/roles...');
  const res1 = await request('GET', '/api/rbac/roles');
  console.log(`   Status: ${res1.status}, Msg: ${res1.body?.message || res1.body}`);
  results.noJwt401 = res1.status === 401;

  // Test 2: User JWT -> 403
  console.log('\n2️⃣  Testing Citizen User JWT on RBAC endpoint: GET /api/rbac/roles...');
  const res2 = await request('GET', '/api/rbac/roles', { Authorization: `Bearer ${userToken}` });
  console.log(`   Status: ${res2.status}, Msg: ${res2.body?.message}`);
  results.userRbac403 = res2.status === 403;

  // Test 3: Admin JWT -> 403 on RBAC endpoint
  console.log('\n3️⃣  Testing Operations Admin JWT on RBAC endpoint: GET /api/rbac/roles...');
  const res3 = await request('GET', '/api/rbac/roles', { Authorization: `Bearer ${adminToken}` });
  console.log(`   Status: ${res3.status}, Msg: ${res3.body?.message}`);
  results.adminRbac403 = res3.status === 403;

  // Test 4: Super Admin JWT -> 200 on RBAC endpoint
  console.log('\n4️⃣  Testing Super Admin JWT on RBAC endpoint: GET /api/rbac/roles...');
  const res4 = await request('GET', '/api/rbac/roles', { Authorization: `Bearer ${superAdminToken}` });
  console.log(`   Status: ${res4.status}, Roles Count: ${res4.body?.roles?.length}`);
  results.superAdmin200 = res4.status === 200 && Array.isArray(res4.body?.roles) && res4.body.roles.length >= 6;

  // Test 5: Super Admin root protection (attempting to restrict Super Admin permissions)
  console.log('\n5️⃣  Testing Super Admin root authority protection (locking root from modification)...');
  const res5 = await request('PUT', '/api/rbac/roles/1/permissions', { Authorization: `Bearer ${superAdminToken}` }, {
    permissions: [{ module: 'Dashboard', access: 'Restricted', level: 'none' }]
  });
  console.log(`   Status: ${res5.status}, Response: ${res5.body?.message}`);
  results.superAdminProtection = res5.status === 400 && res5.body?.message?.includes('Super Admin root authority is cryptographically locked');

  // Test 6: Remove 'reports.view' from Admin (Role ID 2)
  console.log('\n6️⃣  Temporarily removing "Reports" permission from Operations Admin...');
  const adminRole = res4.body?.roles?.find(r => r.id === 2);
  const modifiedPermissions = adminRole.permissions.map(p => {
    if (p.module === 'Reports') {
      return { ...p, access: 'Restricted', level: 'none' };
    }
    return p;
  });

  const res6 = await request('PUT', '/api/rbac/roles/2/permissions', { Authorization: `Bearer ${superAdminToken}` }, {
    permissions: modifiedPermissions
  });
  console.log(`   Status: ${res6.status}, Result: ${res6.body?.message}`);
  results.adminPermissionRemoved = res6.status === 200;

  // Test 7: Backend Enforcement - Admin calls GET /api/fines -> Expect 403
  console.log('\n7️⃣  Testing Backend Enforcement: Admin calling GET /api/fines (Reports module)...');
  const res7 = await request('GET', '/api/fines', { Authorization: `Bearer ${adminToken}` });
  console.log(`   Status: ${res7.status}, Msg: ${res7.body?.message}`);
  results.backendEnforcement403 = res7.status === 403 && res7.body?.message?.includes("Missing required permission 'reports.view'");

  // Test 8: Super Admin calls GET /api/fines -> Expect 200 (Super Admin bypass / full root)
  console.log('\n8️⃣  Testing Super Admin Root Access: Super Admin calling GET /api/fines...');
  const res8 = await request('GET', '/api/fines', { Authorization: `Bearer ${superAdminToken}` });
  console.log(`   Status: ${res8.status}, Records: ${res8.body?.fines?.length ?? res8.body?.length}`);
  results.superAdminReports200 = res8.status === 200;

  // Test 9: Restore 'reports.view' for Admin (Role ID 2)
  console.log('\n9️⃣  Restoring "Reports" permission to Full Access for Operations Admin...');
  const restoredPermissions = adminRole.permissions.map(p => {
    if (p.module === 'Reports') {
      return { ...p, access: 'Full Access', level: 'full' };
    }
    return p;
  });

  const res9 = await request('PUT', '/api/rbac/roles/2/permissions', { Authorization: `Bearer ${superAdminToken}` }, {
    permissions: restoredPermissions
  });
  console.log(`   Status: ${res9.status}, Result: ${res9.body?.message}`);

  // Test 10: Admin calls GET /api/fines again -> Expect 200 OK
  console.log('\n🔟 Testing Authorized Admin calling GET /api/fines after restoration...');
  const res10 = await request('GET', '/api/fines', { Authorization: `Bearer ${adminToken}` });
  console.log(`   Status: ${res10.status}, Success: ${res10.body?.success ?? Array.isArray(res10.body)}`);
  results.restoredAdminAccess200 = res10.status === 200;

  // Test 11: Check public citizen endpoints
  console.log('\n1️⃣1️⃣ Testing public citizen vehicle lookup /api/vehicles/lookup/CAB-1234...');
  const res11 = await request('GET', '/api/vehicles/lookup/CAB-1234');
  console.log(`   Status: ${res11.status}, Vehicle Found: ${res11.body?.plateNumber || res11.body?.plate_number || res11.status}`);
  results.publicCitizenEndpointsPreserved = res11.status === 200;

  // Test 12: Check RBAC audit logs
  console.log('\n1️⃣2️⃣ Checking RBAC administrative audit trail GET /api/rbac/audits...');
  const res12 = await request('GET', '/api/rbac/audits', { Authorization: `Bearer ${superAdminToken}` });
  console.log(`   Status: ${res12.status}, Audit Logs Count: ${res12.body?.audits?.length}`);
  results.rbacAuditTrail = res12.status === 200 && res12.body?.audits?.length > 0;

  console.log('\n==========================================');
  console.log('📊 FINAL TEST SUITE RESULTS:');
  console.log('==========================================');
  for (const [k, v] of Object.entries(results)) {
    console.log(`   ${k}: ${v ? '✅ PASS' : '❌ FAIL'}`);
  }

  const allPassed = Object.values(results).every(Boolean);
  console.log(`\nOVERALL SUITE STATUS: ${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
