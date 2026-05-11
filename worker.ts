import cron from 'node-cron';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const possibleEnvPaths = [
  process.env.ENV_FILE_PATH,
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
].filter(Boolean) as string[];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

async function checkPostponedDealsWorker() {
  console.log(`[${new Date().toISOString()}] PM2 Worker: Spouštím kontrolu odložených příležitostí...`);
  
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'db.mobilgroup.cz',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || 'fhb_maintain',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || '',
      waitForConnections: true,
      connectionLimit: 5,
    });

    const now = new Date();
    
    // ZDE LOGIKA PRO NAČTENÍ DAT Z DATABÁZE
    const [rows] = await pool.query(
      `SELECT * FROM deals WHERE stage = 'lost' AND postponedUntil IS NOT NULL AND postponedUntil <= ? AND (lostPermanently IS NULL OR lostPermanently = 0)`,
      [now]
    );
    const dealsToRestore = rows as any[];
    
    if (dealsToRestore.length > 0) {
      console.log(`[Worker] Nalezeno ${dealsToRestore.length} odložených příležitostí k obnovení.`);
      
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        for (const deal of dealsToRestore) {
          const newStage = 'lead_opportunity';
          const updateTime = new Date();
          
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
              'stage', 
              deal.stage, 
              newStage, 
              'System', 
              updateTime
            ]
          );
          
          console.log(`[Worker] Oživen deal: ${deal.id}`);
        }
        
        await connection.commit();
      } catch (e) {
        await connection.rollback();
        console.error('[Worker] Chyba při zpracování transakce:', e);
      } finally {
        connection.release();
      }
    } else {
      console.log(`[Worker] Žádné příležitosti k obnovení.`);
    }

    await pool.end();
    
    console.log(`[${new Date().toISOString()}] PM2 Worker: Kontrola dokončena.`);
  } catch (error) {
    console.error('Došlo k chybě při kontrole dealování:', error);
  }
}

// Naplánování spuštění minutu po půlnoci každý den
// Formát: sekunda minuta hodina den-v-měsíci měsíc den-v-týdnu
cron.schedule('0 1 0 * * *', () => {
  checkPostponedDealsWorker();
});

console.log('Worker pro kontrolu odložených příležitostí spuštěn. (Naplánováno na 00:01 každý den)');
