import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [deals] = await pool.query("SELECT * FROM deals WHERE stage = 'lead'");
  console.log("Deals in lead:", (deals as any[]).map(d => d.id));
  for (const d of (deals as any[])) {
      const [acts] = await pool.query("SELECT id, type, date FROM activities WHERE dealId = ?", [d.id]);
      console.log(`Deal ${d.id} activities:`, acts);
  }
  process.exit(0);
}
run();
