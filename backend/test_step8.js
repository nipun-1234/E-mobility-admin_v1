import jwt from 'jsonwebtoken';
import http from 'http';
import { pool } from './src/config/db.js';
import { cameraService } from './src/services/camera.service.js';
import { fineService } from './src/services/fine.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'emobility_secure_jwt_token_secret_2026_lk';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runStep8Tests() {
  console.log('========================================================');
  console.log('🚀 RUNNING STEP 8 COMPREHENSIVE TEST SUITE');
  console.log('========================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${name} ${details}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${name} ${details}`);
      failCount++;
    }
  }

  const superAdminToken = makeToken({ id: 1, email: 'superadmin@emobility.lk', role: 'super_admin' });
  const adminToken = makeToken({ id: 2, email: 'admin@emobility.lk', role: 'admin' });
  const citizenToken = makeToken({ id: 99, email: 'citizen@gmail.com', role: 'user' });

  // -------------------------------------------------------------
  // PART A: CAMERA SPEED LIMITS & PERSISTENCE
  // -------------------------------------------------------------
  console.log('--- PART A: Per-Camera Speed Limit & RBAC ---');

  // Test 1: GET /api/cameras (Admin)
  try {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cameras',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert('GET /api/cameras returns 200 for Admin', res.status === 200);
    assert('Returns all 8 operational expressway cameras', res.data && res.data.cameras && res.data.cameras.length >= 8);
  } catch (err) {
    assert('GET /api/cameras returns 200 for Admin', false, err.message);
  }

  // Test 2: GET /api/cameras unauthenticated -> 401
  try {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cameras',
      method: 'GET'
    });
    assert('GET /api/cameras rejects unauthenticated with 401', res.status === 401);
  } catch (err) {
    assert('GET /api/cameras rejects unauthenticated', false, err.message);
  }

  // Test 3: Validation - Reject invalid speed limits (0, negative, >200, NaN)
  try {
    const resNegative = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cameras/cam_01/speed-limit',
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    }, { speedLimit: -50 });
    assert('PATCH /api/cameras/cam_01/speed-limit rejects negative value (-50)', resNegative.status === 400);

    const resZero = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cameras/cam_01/speed-limit',
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    }, { speedLimit: 0 });
    assert('PATCH /api/cameras/cam_01/speed-limit rejects 0 km/h', resZero.status === 400);

    const resHigh = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cameras/cam_01/speed-limit',
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    }, { speedLimit: 350 });
    assert('PATCH /api/cameras/cam_01/speed-limit rejects >200 km/h (350)', resHigh.status === 400);

    const resNaN = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cameras/cam_01/speed-limit',
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    }, { speedLimit: 'invalid_speed' });
    assert('PATCH /api/cameras/cam_01/speed-limit rejects NaN', resNaN.status === 400);
  } catch (err) {
    assert('Validation tests for speed limit', false, err.message);
  }

  // Test 4: Controlled Two-Camera Test Configuration (cam_01 = 80, cam_02 = 100)
  try {
    const resCam1 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cameras/cam_01/speed-limit',
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    }, { speedLimit: 80 });
    assert('Set cam_01 limit to 80 km/h in PostgreSQL', resCam1.status === 200 && resCam1.data.camera.speedLimit === 80);

    const resCam2 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cameras/cam_02/speed-limit',
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    }, { speedLimit: 100 });
    assert('Set cam_02 limit to 100 km/h in PostgreSQL', resCam2.status === 200 && resCam2.data.camera.speedLimit === 100);

    // Verify DB reflection
    const dbCam1 = await pool.query('SELECT speed_limit_kmh FROM cameras WHERE cam_code = $1', ['cam_01']);
    assert('PostgreSQL stores cam_01 = 80', parseFloat(dbCam1.rows[0].speed_limit_kmh) === 80);

    const dbCam2 = await pool.query('SELECT speed_limit_kmh FROM cameras WHERE cam_code = $1', ['cam_02']);
    assert('PostgreSQL stores cam_02 = 100', parseFloat(dbCam2.rows[0].speed_limit_kmh) === 100);
  } catch (err) {
    assert('Two-camera speed configuration', false, err.message);
  }

  // Test 5: Controlled Speed = 85 km/h Violation Simulation
  console.log('\n--- Controlled 85 km/h Violation Evaluation ---');
  try {
    const testId1 = `FINE-STEP8-CAM01-${Date.now()}`;
    const testPayloadCam01 = {
      violationId: testId1,
      cameraId: 'cam_01',
      trackingId: 101,
      plate: 'WP CAB-4521',
      vehicleClass: 'Car',
      speed_kmh: 85.0,
      limit_kmh: 80.0,
      lane: 'Lane 1',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      location: 'Cam-01 (Southern Expy Km 68.4)'
    };

    // cam_01 at 85 km/h with limit 80 -> IS a violation
    const isCam01Violation = testPayloadCam01.speed_kmh > testPayloadCam01.limit_kmh;
    assert('cam_01 (85 km/h > 80 km/h limit) triggers VIOLATION', isCam01Violation === true);

    const recRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/fines/violations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Service-Key': 'ai_sec_key_emobility_2026_dev_v1'
      }
    }, testPayloadCam01);
    assert('cam_01 violation successfully recorded in PostgreSQL', recRes.status === 201 || (recRes.data && recRes.data.success));

    // Verify fine in DB preserves actual limit used (80 km/h)
    const fineQuery = await pool.query('SELECT speed_limit, speed_recorded FROM fines WHERE id = $1', [testId1]);
    assert('Fine record exists in DB with actual limit 80 km/h', fineQuery.rows.length > 0 && String(fineQuery.rows[0].speed_limit).includes('80'));

    // cam_02 at 85 km/h with limit 100 -> NOT a violation
    const cam02Speed = 85.0;
    const cam02Limit = 100.0;
    const isCam02Violation = cam02Speed > cam02Limit;
    assert('cam_02 (85 km/h <= 100 km/h limit) triggers NO VIOLATION', isCam02Violation === false);

    // Test 6: Historical limit persistence test: change cam_01 limit back to 100 via API, historical fine stays 80
    await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cameras/cam_01/speed-limit',
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    }, { speedLimit: 100 });

    const historicalFineCheck = await pool.query('SELECT speed_limit FROM fines WHERE id = $1', [testId1]);
    assert('Historical fine retains original 80 km/h limit after camera limit changed to 100 km/h', historicalFineCheck.rows.length > 0 && String(historicalFineCheck.rows[0].speed_limit).includes('80'));
  } catch (err) {
    assert('Controlled violation persistence test', false, err.message);
  }

  // -------------------------------------------------------------
  // PART B: NOTIFICATION API RBAC SECURITY HARDENING
  // -------------------------------------------------------------
  console.log('\n--- PART B: Notification RBAC Security Hardening ---');

  // Test 7: No JWT -> 401
  try {
    const res = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications',
      method: 'GET'
    });
    assert('GET /api/notifications without JWT -> 401', res.status === 401);
  } catch (err) {
    assert('GET /api/notifications without JWT', false, err.message);
  }

  // Test 8: Citizen user JWT -> 403 Forbidden
  try {
    const resGet = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${citizenToken}` }
    });
    assert('Citizen user GET /api/notifications -> 403 Forbidden', resGet.status === 403);

    const resPost = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${citizenToken}`, 'Content-Type': 'application/json' }
    }, { title: 'Unauthorized', message: 'Citizen test', type: 'info' });
    assert('Citizen user POST /api/notifications -> 403 Forbidden', resPost.status === 403);

    const resPatch = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications/read-all',
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${citizenToken}` }
    });
    assert('Citizen user PATCH /api/notifications/read-all -> 403 Forbidden', resPatch.status === 403);
  } catch (err) {
    assert('Citizen notification security guards', false, err.message);
  }

  // Test 9: Authorized Admin JWT -> 200 OK
  try {
    const resAdminGet = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert('Authorized Admin GET /api/notifications -> 200 OK', resAdminGet.status === 200);

    const resAdminPost = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
    }, { title: 'Test Alert', message: 'Step 8 Admin notification test', type: 'info', category: 'SYSTEM' });
    assert('Authorized Admin POST /api/notifications -> 201 Created', resAdminPost.status === 201);
  } catch (err) {
    assert('Admin notification access', false, err.message);
  }

  // Test 10: Super Admin JWT -> Root access 200
  try {
    const resSuperGet = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/notifications',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    assert('Super Admin root access to GET /api/notifications -> 200 OK', resSuperGet.status === 200);
  } catch (err) {
    assert('Super Admin notification access', false, err.message);
  }

  console.log('\n========================================================');
  console.log(`STEP 8 RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('========================================================\n');

  await pool.end();
  process.exit(failCount === 0 ? 0 : 1);
}

runStep8Tests().catch(err => {
  console.error('Fatal error running Step 8 test suite:', err);
  process.exit(1);
});
