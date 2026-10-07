import jwt from 'jsonwebtoken';
import http from 'http';
import { config } from './src/config/env.js';

const JWT_SECRET = config.jwtSecret;

const adminToken = jwt.sign(
  { id: 2, email: 'admin@example.com', role: 'admin', name: 'Operations Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const superAdminToken = jwt.sign(
  { id: 1, email: 'emobilitysuperadmin@gmail.com', role: 'super_admin', name: 'Super Admin' },
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
  console.log('🧪 ====================================================');
  console.log('🧪 RUNNING STEP 7 NOTIFICATIONS VERIFICATION SUITE');
  console.log('🧪 ====================================================\n');

  const results = {};

  // Test 1: No JWT -> 401
  console.log('1️⃣  Testing unauthenticated access: GET /api/notifications...');
  const res1 = await request('GET', '/api/notifications');
  console.log(`   Status: ${res1.status}, Msg: ${res1.body?.message || res1.body}`);
  results.noJwt401 = res1.status === 401;

  // Test 2: Admin JWT -> 200
  console.log('\n2️⃣  Testing Admin authorized access: GET /api/notifications...');
  const res2 = await request('GET', '/api/notifications', { Authorization: `Bearer ${adminToken}` });
  console.log(`   Status: ${res2.status}, Initial Notifs Count: ${res2.body?.notifications?.length}`);
  results.adminGet200 = res2.status === 200 && Array.isArray(res2.body?.notifications);

  // Test 3: Record AI Speed Violation & Auto-Persist Notification
  const testVioId = `VIO-STEP7-${Date.now()}`;
  console.log(`\n3️⃣  Simulating AI speed violation ingest: ${testVioId}...`);
  const res3 = await request('POST', '/api/fines/violations', {
    Authorization: `Bearer ${adminToken}`,
    'x-ai-service-key': config.aiServiceApiKey || 'test-key'
  }, {
    id: testVioId,
    violationId: testVioId,
    vehiclePlate: 'WP CAB-7788',
    speed_kmh: 138,
    limit_kmh: 100,
    camera_id: 'cam_03',
    police_station: 'Katunayake Expressway Division'
  });
  console.log(`   Status: ${res3.status}, Fine Created: ${res3.body?.fine?.id || res3.body?.message}`);
  results.violationRecorded = res3.status === 201;

  // Test 4: Verify notification row created in PostgreSQL
  console.log('\n4️⃣  Verifying notification created in PostgreSQL...');
  const res4 = await request('GET', '/api/notifications', { Authorization: `Bearer ${adminToken}` });
  const createdNotif = res4.body?.notifications?.find(n => n.eventId === testVioId || n.referenceId === testVioId);
  console.log(`   Found Notification:`, createdNotif ? { id: createdNotif.id, title: createdNotif.title, read: createdNotif.read } : 'NOT FOUND');
  results.notificationPersisted = Boolean(createdNotif);

  // Test 5: Test Deduplication (retry same violation ID)
  console.log('\n5️⃣  Testing Deduplication (submitting identical violation ID)...');
  await request('POST', '/api/fines/violations', {
    Authorization: `Bearer ${adminToken}`,
    'x-ai-service-key': config.aiServiceApiKey || 'test-key'
  }, {
    id: testVioId,
    violationId: testVioId,
    vehiclePlate: 'WP CAB-7788',
    speed_kmh: 138,
    limit_kmh: 100,
    camera_id: 'cam_03',
    police_station: 'Katunayake Expressway Division'
  });

  const res5 = await request('GET', '/api/notifications', { Authorization: `Bearer ${adminToken}` });
  const matchingNotifs = res5.body?.notifications?.filter(n => n.eventId === testVioId || n.referenceId === testVioId);
  console.log(`   Matching Notifications for ${testVioId}: ${matchingNotifs?.length} (Expected: 1)`);
  results.deduplicationPass = matchingNotifs?.length === 1;

  // Test 6: Mark Single Notification As Read
  if (createdNotif) {
    console.log(`\n6️⃣  Marking notification #${createdNotif.id} as read...`);
    const res6 = await request('PATCH', `/api/notifications/${createdNotif.id}/read`, {
      Authorization: `Bearer ${adminToken}`
    });
    console.log(`   Status: ${res6.status}, Result:`, res6.body?.notification?.read);
    results.singleMarkReadPass = res6.status === 200 && res6.body?.notification?.read === true;

    // Test 7: Verify Read Persistence on New Query (Browser Refresh Simulation)
    console.log('\n7️⃣  Verifying Read State Persistence after Refresh Simulation...');
    const res7 = await request('GET', '/api/notifications', { Authorization: `Bearer ${adminToken}` });
    const refreshedNotif = res7.body?.notifications?.find(n => n.id === createdNotif.id);
    console.log(`   Refreshed Notification Read State: ${refreshedNotif?.read}`);
    results.readStatePersistent = refreshedNotif?.read === true;
  } else {
    results.singleMarkReadPass = false;
    results.readStatePersistent = false;
  }

  // Test 8: Mark All Notifications As Read
  console.log('\n8️⃣  Testing Mark All As Read...');
  const res8 = await request('PATCH', '/api/notifications/read-all', {
    Authorization: `Bearer ${adminToken}`
  });
  console.log(`   Status: ${res8.status}, Result: ${res8.body?.message}`);
  
  const res8b = await request('GET', '/api/notifications', { Authorization: `Bearer ${adminToken}` });
  const unreadRemaining = res8b.body?.notifications?.filter(n => !n.read).length;
  console.log(`   Unread Notifications Remaining: ${unreadRemaining} (Expected: 0)`);
  results.markAllReadPass = res8.status === 200 && unreadRemaining === 0;

  // Test 9: Create Operational System / Edge Alert
  console.log('\n9️⃣  Testing Manual / Edge Notification Logging (POST /api/notifications)...');
  const res9 = await request('POST', '/api/notifications', {
    Authorization: `Bearer ${adminToken}`
  }, {
    eventId: `CAM-OFFLINE-${Date.now()}`,
    type: 'warning',
    severity: 'high',
    title: 'Camera Edge Offline: Cam-04',
    message: 'Central Expressway Km 22.1 node ping timeout. Switched to backup relay.',
    cameraId: 'cam_04',
    targetTab: 'AI Diagnostics'
  });
  console.log(`   Status: ${res9.status}, Created: ${res9.body?.notification?.title}`);
  results.manualNotifPass = res9.status === 201;

  console.log('\n====================================================');
  console.log('📊 FINAL TEST SUITE RESULTS:');
  console.log('====================================================');
  for (const [k, v] of Object.entries(results)) {
    console.log(`   ${k}: ${v ? '✅ PASS' : '❌ FAIL'}`);
  }

  const allPassed = Object.values(results).every(Boolean);
  console.log(`\nOVERALL STEP 7 STATUS: ${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
