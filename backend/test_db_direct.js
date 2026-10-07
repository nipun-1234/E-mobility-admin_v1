import { pool } from './src/config/db.js';

async function test() {
  try {
    const query = `
      INSERT INTO fines (
        id, police_station, offence, date, due_date, amount, demerit_points,
        vehicle_plate, plate_raw_text, plate_confidence, plate_status, plate_crop_url,
        status, due_days, location_coords, evidence_image,
        speed_recorded, speed_limit, officer_badge, camera_id, tracking_id, evidence_image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        vehicle_plate = COALESCE(EXCLUDED.vehicle_plate, fines.vehicle_plate),
        plate_raw_text = COALESCE(EXCLUDED.plate_raw_text, fines.plate_raw_text),
        plate_confidence = COALESCE(EXCLUDED.plate_confidence, fines.plate_confidence),
        plate_status = COALESCE(EXCLUDED.plate_status, fines.plate_status),
        plate_crop_url = COALESCE(EXCLUDED.plate_crop_url, fines.plate_crop_url)
      RETURNING *;
    `;
    const params = [
      'TX-DEBUG-1',
      'Expressway Police Division (CAM_01)',
      'Speeding — 124 km/h in 100 km/h zone (+24 km/h excess)',
      '2026-10-05',
      '19 Oct 2026',
      5000,
      4,
      'WP CAB-4521',
      'WP CAB-4521',
      0.96,
      'VALID',
      '/uploads/plates/1.jpg',
      'Unpaid',
      14,
      'Southern Expressway KM 68.4',
      true,
      '124 km/h',
      '100 km/h',
      'AI Radar Surveillance (CAM_01)',
      'cam_01',
      '42',
      '/uploads/violations/1.jpg'
    ];
    const res = await pool.query(query, params);
    console.log('INSERT SUCCESS:', res.rows[0]);
  } catch (err) {
    console.error('SQL EXECUTION ERROR:', err);
  } finally {
    await pool.end();
  }
}

test();
