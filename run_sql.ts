import { pool } from './server.ts';

async function run() {
  try {
    await pool.query('ALTER TABLE storage_types CHANGE isVisible isActive BOOLEAN DEFAULT TRUE;');
    console.log('Column renamed.');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
