import mysql from 'mysql2/promise';
async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db.mobilgroup.cz',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'fhb_maintain',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  });
  const [rows] = await pool.query('SELECT 1');
  console.log(rows);
  pool.end();
}
run();
