import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [rows] = await pool.query("SELECT * FROM login_logs WHERE ip LIKE '%91.127.65.251%' LIMIT 5");
  console.log(rows);
  process.exit(0);
}
check();
