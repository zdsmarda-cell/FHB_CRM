// worker.ts
import cron from "node-cron";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var possibleEnvPaths = [
  process.env.ENV_FILE_PATH,
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "../.env")
].filter(Boolean);
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
async function checkPostponedDealsWorker() {
  console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] PM2 Worker: Spou\u0161t\xEDm kontrolu odlo\u017Een\xFDch p\u0159\xEDle\u017Eitost\xED...`);
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || "db.mobilgroup.cz",
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || "fhb_maintain",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "",
      waitForConnections: true,
      connectionLimit: 5
    });
    const now = /* @__PURE__ */ new Date();
    const [rows] = await pool.query(
      `SELECT * FROM deals WHERE stage = 'lost' AND postponedUntil IS NOT NULL AND postponedUntil <= ? AND (lostPermanently IS NULL OR lostPermanently = 0)`,
      [now]
    );
    const dealsToRestore = rows;
    if (dealsToRestore.length > 0) {
      console.log(`[Worker] Nalezeno ${dealsToRestore.length} odlo\u017Een\xFDch p\u0159\xEDle\u017Eitost\xED k obnoven\xED.`);
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      try {
        for (const deal of dealsToRestore) {
          const newStage = "lead_opportunity";
          const updateTime = /* @__PURE__ */ new Date();
          await connection.query(
            `UPDATE deals SET 
              stage = ?, 
              postponedUntil = NULL, 
              postponedReason = NULL, 
              postponedBy = NULL, 
              postponedAt = NULL, 
              updatedAt = ? 
            WHERE id = ?`,
            [newStage, updateTime, deal.id]
          );
          const auditLogId = uuidv4();
          await connection.query(
            `INSERT INTO audit_logs (id, dealId, companyId, field, oldValue, newValue, changedBy, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              auditLogId,
              deal.id,
              deal.companyId,
              "stage",
              deal.stage,
              newStage,
              "System",
              updateTime
            ]
          );
          console.log(`[Worker] O\u017Eiven deal: ${deal.id}`);
        }
        await connection.commit();
      } catch (e) {
        await connection.rollback();
        console.error("[Worker] Chyba p\u0159i zpracov\xE1n\xED transakce:", e);
      } finally {
        connection.release();
      }
    } else {
      console.log(`[Worker] \u017D\xE1dn\xE9 p\u0159\xEDle\u017Eitosti k obnoven\xED.`);
    }
    await pool.end();
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] PM2 Worker: Kontrola dokon\u010Dena.`);
  } catch (error) {
    console.error("Do\u0161lo k chyb\u011B p\u0159i kontrole dealov\xE1n\xED:", error);
  }
}
cron.schedule("0 1 0 * * *", () => {
  checkPostponedDealsWorker();
});
console.log("Worker pro kontrolu odlo\u017Een\xFDch p\u0159\xEDle\u017Eitost\xED spu\u0161t\u011Bn. (Napl\xE1nov\xE1no na 00:01 ka\u017Ed\xFD den)");
