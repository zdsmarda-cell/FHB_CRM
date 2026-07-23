const { createPool } = require('mysql2/promise');

async function run() {
  const pool = createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'app_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'crm_db',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
  });

  try {
    await pool.query('ALTER TABLE storage_types CHANGE isVisible isActive BOOLEAN DEFAULT TRUE;');
    console.log('Column renamed.');
  } catch (err) {
    console.error(err);
  }
  pool.end();
}
run();
