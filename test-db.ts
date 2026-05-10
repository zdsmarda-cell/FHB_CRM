import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env')
];
for(const p of possibleEnvPaths) {
  if (fs.existsSync(p)) dotenv.config({path: p});
}
console.log(process.env.DB_HOST);

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'db.mobilgroup.cz',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'fhb_maintain',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const migrations = [
    "ALTER TABLE deals ADD COLUMN postponedReason TEXT;",
    "ALTER TABLE deals ADD COLUMN postponedBy VARCHAR(50);",
    "ALTER TABLE deals ADD COLUMN postponedAt DATETIME;",
    "ALTER TABLE deals ADD COLUMN lostPermanently BOOLEAN;",
    "ALTER TABLE deals ADD COLUMN lostBy VARCHAR(50);",
    "ALTER TABLE deals ADD COLUMN lostAt DATETIME;",
    "ALTER TABLE activities ADD COLUMN transcript TEXT;"
  ];
  for (const m of migrations) {
    try {
      await connection.query(m);
      console.log(`[MIGRATE] Applied: ${m}`);
    } catch (e: any) {
      console.log(`[MIGRATE] Skipped: ${m} - ${e.message}`);
    }
  }

  const [cols] = await connection.query("SHOW COLUMNS FROM deals");
  console.log(cols);

  await connection.end();
}

run();
