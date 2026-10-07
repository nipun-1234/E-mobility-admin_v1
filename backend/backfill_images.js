import { pool } from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function backfill() {
  try {
    const uploadDir = path.resolve(__dirname, '../uploads/violations');
    const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    
    if (files.length === 0) {
      console.log('No files found in uploads/violations');
      return;
    }

    const { rows } = await pool.query("SELECT id, camera_id FROM fines WHERE evidence_image_url IS NULL OR evidence_image_url = '' OR evidence_image_url = '/uploads/violations/1.jpg'");
    console.log(`Found ${rows.length} rows needing evidence image...`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sampleImg = files[i % files.length];
      const imgPath = `/uploads/violations/${sampleImg}`;
      await pool.query('UPDATE fines SET evidence_image_url = $1 WHERE id = $2', [imgPath, row.id]);
    }

    console.log(`✅ Successfully backfilled evidence images for ${rows.length} records!`);
  } catch (err) {
    console.error('Backfill error:', err);
  } finally {
    await pool.end();
  }
}

backfill();
