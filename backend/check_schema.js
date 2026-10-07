import { pool } from './src/config/db.js';

async function main() {
  const t = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('TABLES:', t.rows.map(r => r.table_name));

  const cCheck = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cameras'");
  console.log('CAMERAS COLUMNS:', cCheck.rows);

  if (cCheck.rows.length > 0) {
    const cData = await pool.query("SELECT * FROM cameras");
    console.log('CAMERAS DATA:', cData.rows);
  }

  await pool.end();
}

main().catch(console.error);
