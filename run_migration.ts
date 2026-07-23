import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm',
  });
  
  try {
    const [segments] = await pool.query('SELECT * FROM segments WHERE name LIKE "%statn%"');
    console.log(segments);
    
    // Check if it exists
    let ostatniId = (segments as any[])[0]?.id;
    if (!ostatniId) {
      console.log('Ostatni not found, creating...');
      await pool.query("INSERT INTO segments (id, name, isActive) VALUES (UUID(), 'Ostatní', TRUE)");
      const [newSegs] = await pool.query('SELECT * FROM segments WHERE name = "Ostatní"');
      ostatniId = (newSegs as any[])[0].id;
    }
    console.log('Ostatni ID:', ostatniId);
    
    const [res] = await pool.query("UPDATE companies SET segment = ? WHERE LENGTH(segment) != 36 AND segment IS NOT NULL AND segment != ''", [ostatniId]);
    console.log('Updated companies:', res);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
