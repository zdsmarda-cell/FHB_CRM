import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db.mobilgroup.cz',
    user: process.env.DB_USER || 'fhb_maintain',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  });
  
  const uuidRes = await pool.query("SELECT UUID() as uuid");
  console.log(uuidRes[0]);
  process.exit(0);
}
run();
