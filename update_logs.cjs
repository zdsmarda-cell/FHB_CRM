const mysql = require('mysql2/promise');
const dns = require('dns');
require('dotenv').config();

async function updateLoginLogs() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    const [rows] = await pool.query("SELECT id, ip FROM login_logs WHERE resolvedHost IS NULL OR resolvedHost = ''");
    console.log(`Found ${rows.length} rows to check.`);
    
    for (const row of rows) {
      if (row.ip && row.ip !== '127.0.0.1' && row.ip !== '::1') {
        let lookupIp = row.ip;
        if (lookupIp.startsWith('::ffff:')) {
            lookupIp = lookupIp.substring(7);
        }
        
        try {
          const hostnames = await dns.promises.reverse(lookupIp);
          if (hostnames && hostnames.length > 0) {
            const resolvedHost = hostnames[0];
            await pool.query("UPDATE login_logs SET resolvedHost = ? WHERE id = ?", [resolvedHost, row.id]);
            console.log(`Updated ID ${row.id}: ${lookupIp} -> ${resolvedHost}`);
          }
        } catch (err) {
          console.log(`Could not resolve ${lookupIp} for ID ${row.id}: ${err.message}`);
        }
      }
    }
    console.log("Done updating login logs.");
  } catch (err) {
    console.error("Error connecting to DB:", err);
  } finally {
    pool.end();
  }
}

updateLoginLogs();
