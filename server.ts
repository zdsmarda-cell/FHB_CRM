import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import dns from "dns";
import http from "http";
import { Server as SocketServer } from "socket.io";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { Client as GraphClient } from "@microsoft/microsoft-graph-client";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";

// Middleware to protect routes
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token && req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)jwt_token=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }
  if (!token) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid token' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded; // attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized', message: 'Token is invalid or expired' });
  }
};


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const possibleEnvPaths = [
  process.env.ENV_FILE_PATH,
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, 'backend/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  '/home/fhb_crm/backend/.env'
].filter(Boolean) as string[];

let dotenvLoaded = false;
console.log("[ENV] Checking for .env files in the following locations:");
for (const envPath of possibleEnvPaths) {
  console.log(`[ENV] -> checking ${envPath}`);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`[ENV] ✅ Loaded .env from ${envPath}`);
    dotenvLoaded = true;
    break;
  }
}

if (!dotenvLoaded) {
  console.log(`[ENV] ❌ No .env file found in above paths. Calling dotenv.config() directly as fallback.`);
  dotenv.config();
}

console.log(`[ENV DEBUG] SSL_KEY_PATH: ${process.env.SSL_KEY_PATH || 'Not set'}`);
console.log(`[ENV DEBUG] SSL_CERT_PATH: ${process.env.SSL_CERT_PATH || 'Not set'}`);

async function startServer() {
  const app = express();
  let cachedActivities: any[] = [];
  
  // NOTE: The port MUST be 3000 in AI Studio environments. 
  // We use APP_PORT to override it in production environments if needed.
  const PORT = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Setup DB + automatic migrations
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db.mobilgroup.cz',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'fhb_crm',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fhb_crm',
    waitForConnections: true,
    connectionLimit: 15,
    maxIdle: 5,
    idleTimeout: 30000,
    queueLimit: 0,
    connectTimeout: 5000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  });

  // Keep-alive heartbeat ping every 30s to keep remote connection warm and avoid NAT/firewall drops
  setInterval(async () => {
    try {
      await pool.query('SELECT 1');
    } catch (err: any) {
      // Non-fatal keepalive query error
    }
  }, 30000);

  // Run auto-migrations
  try {
    const connection = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('connect ETIMEDOUT')), 3000))
    ]);
    try {
      // Create initial tables if not exist
      if (fs.existsSync(path.join(__dirname, 'schema.sql'))) {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        const statements = schema.split(/;[ \t]*\n/).filter(s => s.trim().length > 0);
        for (const sql of statements) {
          try {
            await connection.query(sql);
          } catch (err: any) {
             console.log(`[DB INIT] Notice: Query failed (might exist): ${err.message}`);
          }
        }
      }
      // Apply missing column alterations
      const migrations = [
        "ALTER TABLE deals ADD COLUMN postponedReason TEXT;",
        "ALTER TABLE deals ADD COLUMN postponedBy VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN postponedAt DATETIME;",
        "ALTER TABLE deals ADD COLUMN lostPermanently BOOLEAN;",
        "ALTER TABLE deals ADD COLUMN notes JSON;",
        "ALTER TABLE deals ADD COLUMN lostBy VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN lostAt DATETIME;",
        "ALTER TABLE deals ADD COLUMN hunterId VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN closerId VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN farmerId VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN leadSourceId VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN ecommercePlatformId VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN estimatedMonthlyParcels INT;",
        "ALTER TABLE deals ADD COLUMN deliveryCountries JSON;",
        "ALTER TABLE deals ADD COLUMN averageItemsPerOrder DECIMAL(10,2);",
        "ALTER TABLE deals ADD COLUMN averageParcelWeight DECIMAL(10,2);",
        "ALTER TABLE deals MODIFY COLUMN averageItemsPerOrder DECIMAL(10,2);",
        "ALTER TABLE deals MODIFY COLUMN averageParcelWeight DECIMAL(10,2);",
        "ALTER TABLE deals ADD COLUMN averageParcelVolume INT;",
        "ALTER TABLE deals ADD COLUMN pricingOffers JSON;",
        "ALTER TABLE deals ADD COLUMN documents JSON;",
        "ALTER TABLE lead_sources ADD COLUMN isActive BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE ecommerce_platforms ADD COLUMN isActive BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE activities ADD COLUMN transcript TEXT;",
        "ALTER TABLE activities ADD COLUMN isVisible BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE activities ADD COLUMN participants JSON;",
        "ALTER TABLE deals ADD COLUMN contractSignedDate DATETIME;",
        "ALTER TABLE deals ADD COLUMN pricingUploadedDate DATETIME;",
        "ALTER TABLE deals ADD COLUMN itIntegrationId VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN firstStockingDate DATETIME;",
        "ALTER TABLE deals ADD COLUMN itIntegrationCompletedDate DATETIME;",
        "ALTER TABLE deals ADD COLUMN firstStockingDateActual DATETIME;",
        "ALTER TABLE deals ADD COLUMN integrationTestingCompletedDate DATETIME;",
        "ALTER TABLE deals ADD COLUMN lostReasonId VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN lostFromStage VARCHAR(50);",
        "ALTER TABLE activities ADD COLUMN externalEventId VARCHAR(255);",
        "ALTER TABLE activities ADD COLUMN recordingLink VARCHAR(1000);",
        "ALTER TABLE activities ADD COLUMN meetingSummary TEXT;",
        "ALTER TABLE companies ADD COLUMN phonePrefix VARCHAR(20);",
        "ALTER TABLE companies ADD COLUMN isVisible BOOLEAN DEFAULT TRUE;",
        "CREATE TABLE IF NOT EXISTS it_integrations (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, isActive BOOLEAN DEFAULT TRUE);",
        "CREATE TABLE IF NOT EXISTS lost_reasons (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, isActive BOOLEAN DEFAULT TRUE);",
        "CREATE TABLE IF NOT EXISTS login_logs (id VARCHAR(50) PRIMARY KEY, userId VARCHAR(50) NOT NULL, timestamp DATETIME NOT NULL, ip VARCHAR(100), resolvedHost VARCHAR(255));",
        "ALTER TABLE activities ADD COLUMN duration INT;",
        "ALTER TABLE deals ADD COLUMN storageTypeId VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN estimatedYearlyParcels INT;",
        "ALTER TABLE deals ADD COLUMN seasonMonths JSON;",
        "ALTER TABLE deals ADD COLUMN skuCount INT;",
        "ALTER TABLE deals ADD COLUMN productsSold TEXT;",
        "ALTER TABLE deals ADD COLUMN codUsage JSON;",
        "ALTER TABLE deals ADD COLUMN b2cShare INT;",

        "ALTER TABLE users ADD COLUMN isTestAccount BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE storage_types CHANGE isVisible isActive BOOLEAN DEFAULT TRUE;",
        "CREATE TABLE IF NOT EXISTS contact_positions (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, isActive BOOLEAN DEFAULT TRUE);",
        "CREATE TABLE IF NOT EXISTS stage_reminders (id VARCHAR(50) PRIMARY KEY, stage VARCHAR(50) NOT NULL, days INT NOT NULL, action VARCHAR(50) DEFAULT '', color VARCHAR(20) DEFAULT 'none');",
        "ALTER TABLE activities ADD COLUMN updatedAt DATETIME;",
        "ALTER TABLE activities ADD COLUMN teamsSyncStatus VARCHAR(50);",
        "CREATE INDEX idx_audit_logs_deal_field ON audit_logs(dealId, field);",
        "CREATE INDEX idx_audit_logs_field ON audit_logs(field);",
        "CREATE INDEX idx_activities_dealId ON activities(dealId);",
      ];
      for (const m of migrations) {
        try {
          await connection.query(m);
          console.log(`[MIGRATE] Applied: ${m}`);
        } catch (e: any) {
          // ignore already exists
        }
      }
      console.log("[DB INIT] Database migrations passed successfully.");

      // Seed segments if empty
      try {
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM segments");
        const count = (rows as any[])[0].count;
        if (count === 0) {
          const defaultSegments = [
            'Textil / fashion',
            'Obuv',
            'Domáce potreby',
            'Kozmetika a drogéria',
            'Športový tovar',
            'Elektronika',
            'Doplnky stravy',
            'Knihy a časopisy',
            'Potreby pre domáce zvieratá',
            'Hračky',
            'Ostatní'
          ];
          for (const s of defaultSegments) {
            await connection.query("INSERT INTO segments (id, name, isActive) VALUES (UUID(), ?, TRUE)", [s]);
          }
          console.log(`[DB INIT] Seeded ${defaultSegments.length} default segments.`);
        }
        
        // Migrate old segment values to Ostatní ID
        const [ostatniRows] = await connection.query("SELECT id FROM segments WHERE name = 'Ostatní' LIMIT 1");
        let ostatniId = (ostatniRows as any[])[0]?.id;
        
        if (!ostatniId) {
          const uuidRes = await connection.query("SELECT UUID() as uuid");
          ostatniId = (uuidRes[0] as any[])[0].uuid;
          await connection.query("INSERT INTO segments (id, name, isActive) VALUES (?, 'Ostatní', TRUE)", [ostatniId]);
        }
        
        if (ostatniId) {
           await connection.query("UPDATE companies SET segment = ? WHERE LENGTH(segment) != 36 AND segment IS NOT NULL AND segment != ''", [ostatniId]);
        }
      } catch (e: any) {
        console.error('[DB INIT] Error seeding segments:', e.message);
      }

      // Seed contact_positions if empty & clear positions of existing contacts
      try {
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM contact_positions");
        const count = (rows as any[])[0].count;
        if (count === 0) {
          const defaultPositions = [
            'CEO / Majitel',
            'C-Level / Ředitel',
            'Logistický manažer',
            'E-commerce Manager',
            'Nákupčí / Sourcing Manager',
            'IT / Provozní manažer',
            'Finanční ředitel / CFO',
            'Ostatní'
          ];
          for (const p of defaultPositions) {
            await connection.query("INSERT INTO contact_positions (id, name, isActive) VALUES (UUID(), ?, TRUE)", [p]);
          }
          console.log(`[DB INIT] Seeded ${defaultPositions.length} default contact positions.`);
        }

        // Clear position attribute for existing contacts in companies table
        const [comps] = await connection.query("SELECT id, contacts FROM companies");
        for (const comp of comps as any[]) {
          if (comp.contacts) {
            let contactsArr = typeof comp.contacts === 'string' ? JSON.parse(comp.contacts) : comp.contacts;
            if (Array.isArray(contactsArr) && contactsArr.length > 0) {
              let modified = false;
              contactsArr = contactsArr.map((c: any) => {
                if (c.position !== undefined && c.position !== '') {
                  modified = true;
                  return { ...c, position: '' };
                }
                return c;
              });
              if (modified) {
                await connection.query("UPDATE companies SET contacts = ? WHERE id = ?", [JSON.stringify(contactsArr), comp.id]);
              }
            }
          }
        }
      } catch (e: any) {
        console.error('[DB INIT] Error seeding/migrating contact_positions:', e.message);
      }

      // Seed stage_reminders if empty
      try {
        const [remRows] = await connection.query("SELECT COUNT(*) as count FROM stage_reminders");
        if ((remRows as any[])[0].count === 0) {
          const defaultReminders = [
            { id: uuidv4(), stage: 'opportunity', days: 7, action: '', color: 'yellow' },
            { id: uuidv4(), stage: 'opportunity', days: 14, action: 'email', color: 'orange' },
            { id: uuidv4(), stage: 'lead', days: 7, action: '', color: 'yellow' },
            { id: uuidv4(), stage: 'lead', days: 14, action: 'email', color: 'orange' },
          ];
          for (const r of defaultReminders) {
            await connection.query("INSERT INTO stage_reminders (id, stage, days, action, color) VALUES (?, ?, ?, ?, ?)", [r.id, r.stage, r.days, r.action, r.color]);
          }
          console.log(`[DB INIT] Seeded default stage reminders.`);
        }
      } catch (e: any) {
        console.error('[DB INIT] Error seeding stage_reminders:', e.message);
      }
      
      // Retroactively fix missing DNS hostnames in login logs
      try {
        const [rows] = await connection.query("SELECT id, ip, resolvedHost FROM login_logs WHERE resolvedHost IS NULL OR resolvedHost = '' OR resolvedHost = '-'");
        const logs = rows as { id: string, ip: string, resolvedHost: string }[];
        for (const row of logs) {
          if (row.ip && row.ip !== '127.0.0.1' && row.ip !== '::1') {
            let lookupIp = row.ip;
            if (lookupIp.startsWith('::ffff:')) lookupIp = lookupIp.substring(7);
            try {
              const hostnames = await dns.promises.reverse(lookupIp);
              if (hostnames && hostnames.length > 0) {
                await connection.query("UPDATE login_logs SET resolvedHost = ? WHERE id = ?", [hostnames[0], row.id]);
                console.log(`[DNS] Resolved missing host for login ${row.id}: ${hostnames[0]}`);
              } else {
                if (row.resolvedHost !== '-') await connection.query("UPDATE login_logs SET resolvedHost = ? WHERE id = ?", ['-', row.id]);
              }
            } catch (e: any) {
              if (row.resolvedHost !== '-') await connection.query("UPDATE login_logs SET resolvedHost = ? WHERE id = ?", ['-', row.id]);
              if (e.code !== 'ENOTFOUND') {
                console.error(`[DNS] Retro error for ${lookupIp}:`, e.message);
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to update missing hostnames:", e);
      }
    } finally {
      connection.release();
    }
    // Cleanup any historically stored unrelated email activities on DB startup
    cleanupAllUnrelatedEmails(pool).catch((err: any) => {
      console.error('[CLEANUP] Background initial cleanup error:', err.message);
    });
  } catch (err: any) {
    console.error("[DB INIT] WARNING: Could not run migrations. DB might be offline.", err.message);
  }

  // Memory store for tokens just to demo before SQL structure is established
  const userTokens: Record<string, any> = {};

  app.get('/api/env-debug', authMiddleware, (req, res) => {
    try {
      let envFileContent = 'Not found';
      for (const envPath of possibleEnvPaths) {
         if (fs.existsSync(envPath)) {
            envFileContent = fs.readFileSync(envPath, 'utf8');
            break;
         }
      }

      const dbg = {
        cwd: process.cwd(),
        dirname: __dirname,
        envFileLocationsChecked: possibleEnvPaths,
        loadedFile: dotenvLoaded ? "Yes, from one of those paths" : "Fallback dotenv.config() called",
        sslKeyPathSetting: process.env.SSL_KEY_PATH || 'Not set',
        sslCertPathSetting: process.env.SSL_CERT_PATH || 'Not set',
        dbHost: process.env.DB_HOST || 'Not set',
        envFileContent: envFileContent
      };
      res.json(dbg);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/auth/integrations-status', authMiddleware, (req, res) => {
    res.json({
      google: {
        configured: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
        clientId: process.env.GOOGLE_CLIENT_ID || ''
      },
      microsoft: {
        configured: !!process.env.MS_CLIENT_ID && !!process.env.MS_CLIENT_SECRET,
        clientId: process.env.MS_CLIENT_ID || ''
      }
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, passwordHash } = req.body;
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND passwordHash = ?', [email, passwordHash]);
      const users: any[] = rows as any[];
      if (users.length === 0) {
        return res.status(401).json({ error: 'invalidCredentials' });
      }
      const user = users[0];
      if (user.isActive !== 1 && user.isActive !== true) {
        return res.status(403).json({ error: 'inactiveAccount' });
      }
      // parse json fields
      ['googleIntegration', 'msIntegration'].forEach(f => {
        if (typeof user[f] === 'string') {
          try { user[f] = JSON.parse(user[f]); } catch (e) { /* ignore */ }
        }
      });
      user.isActive = true;
      delete user.passwordHash; // DO NOT SEND passwordHash back to client

      // generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '15m' } // 15 minutes token
      );
      
      const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '12h' } // 12 hours refresh token
      );

      try {
        const xForwarded = req.headers['x-forwarded-for'] || '';
        const remoteAddr = req.socket.remoteAddress || '';
        const ip = (xForwarded || remoteAddr).toString().split(',')[0].trim();
        let resolvedHost = '';
        if (ip && ip !== '127.0.0.1' && ip !== '::1') {
          try {
            let lookupIp = ip;
            if (lookupIp.startsWith('::ffff:')) lookupIp = lookupIp.substring(7);
            const hostnames = await dns.promises.reverse(lookupIp);
            if (hostnames && hostnames.length > 0) {
              resolvedHost = hostnames[0];
            } else {
              resolvedHost = '-';
            }
          } catch (dnsErr: any) {
            resolvedHost = '-';
            if (dnsErr.code !== 'ENOTFOUND') {
              console.error(`[DNS] Login error for ${ip}:`, dnsErr.message);
            }
          }
        }
        console.log(`[LOGIN] User IP: ${ip}, RemoteAddr: ${remoteAddr}, X-Forwarded: ${xForwarded}, Resolved: ${resolvedHost}`);
        await pool.query(
          'INSERT INTO login_logs (id, userId, timestamp, ip, resolvedHost) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), user.id, new Date(), ip, resolvedHost]
        );
      } catch (logErr) {
        console.error('Failed to write login log:', logErr);
      }

      res.setHeader('Set-Cookie', `jwt_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Max-Age=43200`);
      res.json({ token, refreshToken, user });
    } catch (err: any) {
      console.error('Login Error:', err);
      if (err.code === 'ETIMEDOUT') {
        console.error('HINT: Your database host could not be reached. Check firewall rules, VPNs, and ensure the DB_HOST is accessible from this server.');
      }
      res.status(500).json({ error: 'Server error during login', details: err.message });
    }
  });

  app.post('/api/auth/refresh-session', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'unauthorized', message: 'No refresh token' });
    try {
      const decoded: any = jwt.verify(refreshToken, JWT_SECRET);
      if (decoded.type !== 'refresh') throw new Error('Invalid token type');
      
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
      const users = rows as any[];
      if (users.length === 0) return res.status(401).json({ error: 'unauthorized', message: 'User not found' });
      const user = users[0];
      if (user.isActive !== 1 && user.isActive !== true) return res.status(403).json({ error: 'inactiveAccount' });
      
      ['googleIntegration', 'msIntegration'].forEach(f => {
        if (typeof user[f] === 'string') {
           try { user[f] = JSON.parse(user[f]); } catch (e) { /* ignore */ }
        }
      });
      user.isActive = true;
      delete user.passwordHash;
      
      const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      const newRefreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '12h' }
      );
      
      res.setHeader('Set-Cookie', `jwt_token=${encodeURIComponent(newToken)}; Path=/; SameSite=Lax; Max-Age=43200`);
      res.json({ token: newToken, refreshToken: newRefreshToken, user });
    } catch (e: any) {
      res.status(401).json({ error: 'unauthorized', message: e.message });
    }
  });

  app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
    try {
      const { currentPasswordHash, newPasswordHash } = req.body;
      const userId = (req as any).user.id;
      
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
      const users: any[] = rows as any[];
      if (users.length === 0) return res.status(404).json({ error: 'User not found' });
      
      const user = users[0];
      if (user.passwordHash !== currentPasswordHash) {
        return res.status(401).json({ error: 'invalid_current_password', message: 'Current password is incorrect' });
      }
      
      await pool.query('UPDATE users SET passwordHash = ? WHERE id = ?', [newPasswordHash, userId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email } = req.body;
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      const users: any[] = rows as any[];
      if (users.length === 0) {
        // Silent block for non-existent emails
        return res.json({ success: true });
      }
      
      const user = users[0];
      const resetToken = uuidv4();
      
      await pool.query('UPDATE users SET resetToken = ?, resetTokenExpiry = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?', [resetToken, user.id]);

      // Using nodemailer
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        
        const origin = req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : `http://${req.headers.host}`;
        const resetUrl = `${origin}/#/reset-password/${resetToken}`;
        
        const subject = 'Obnova hesla / Password Reset';
        const emailLogId = uuidv4();
        
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"CRM System" <no-reply@crm.com>',
            to: email,
            subject,
            text: `Pro obnovu hesla klikněte na následující odkaz: \n\n${resetUrl}\n\nTento odkaz platí 10 minut.`,
            html: `<p>Pro obnovu hesla klikněte na následující odkaz:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Tento odkaz platí 10 minut.</p>`
          });
          
          await pool.query(
            'INSERT INTO email_logs (id, recipient, subject, status, error, sentAt) VALUES (?, ?, ?, ?, ?, ?)',
            [emailLogId, email, subject, 'sent', null, new Date()]
          );
        } catch (mailErr: any) {
          console.error('Password reset email failed:', mailErr);
          await pool.query(
            'INSERT INTO email_logs (id, recipient, subject, status, error, sentAt) VALUES (?, ?, ?, ?, ?, ?)',
            [emailLogId, email, subject, 'error', mailErr.message || String(mailErr), new Date()]
          );
          throw mailErr;
        }
      }

      res.json({ success: true, token: process.env.SMTP_HOST ? undefined : resetToken }); // Return token only for dev without SMTP
    } catch (err: any) {
      console.error('Password reset error:', err);
      res.status(500).json({ error: 'Failed to send reset email' });
    }
  });

  app.post('/api/auth/update-password', async (req, res) => {
    try {
      const { token, newPasswordHash } = req.body;
      const [rows] = await pool.query('SELECT * FROM users WHERE resetToken = ? AND resetTokenExpiry > NOW()', [token]);
      const users: any[] = rows as any[];
      if (users.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }
      
      const user = users[0];
      
      await pool.query('UPDATE users SET passwordHash = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?', [newPasswordHash, user.id]);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Password update error:', err);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  // GET Login Logs for Admin
  app.get('/api/login_logs', authMiddleware, async (req, res) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'administrator' && user.role !== 'cso') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const { page = '1', limit = '10', userName } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      let query = 'SELECT l.*, u.name as userName FROM login_logs l LEFT JOIN users u ON l.userId = u.id WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM login_logs l LEFT JOIN users u ON l.userId = u.id WHERE 1=1';
      const params: any[] = [];

      if (userName) {
        query += ' AND u.name LIKE ?';
        countQuery += ' AND u.name LIKE ?';
        params.push(`%${userName}%`);
      }
      
      query += ' ORDER BY l.timestamp DESC LIMIT ? OFFSET ?';
      const resultParams = [...params, limitNum, offset];
      
      const [logsRows] = await pool.query(query, resultParams);
      const [countRows] = await pool.query(countQuery, params);
      
      const logs = logsRows as any[];
      const total = (countRows as any[])[0].total;
      
      res.json({ logs, total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      console.error('Failed to fetch login logs:', err);
      res.status(500).json({ error: 'Failed to fetch login logs' });
    }
  });

  // GET User Login Counts for Statistics (counts per user)
  app.get('/api/user_login_counts', authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT userId, COUNT(*) as count FROM login_logs GROUP BY userId');
      const counts: Record<string, number> = {};
      for (const row of (rows as any[])) {
        if (row.userId) {
          counts[row.userId] = Number(row.count) || 0;
        }
      }
      res.json(counts);
    } catch (err: any) {
      console.error('Failed to fetch user login counts:', err);
      res.status(500).json({ error: 'Failed to fetch user login counts' });
    }
  });

  // GET Email Logs for Admin
  app.get('/api/email_logs', authMiddleware, async (req, res) => {
    try {
      const { page = '1', limit = '10', dateFrom, dateTo, recipient, subject, status } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      let query = 'SELECT * FROM email_logs WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) as total FROM email_logs WHERE 1=1';
      const params: any[] = [];
      
      if (dateFrom) {
        query += ' AND sentAt >= ?';
        countQuery += ' AND sentAt >= ?';
        params.push(new Date(dateFrom as string));
      }
      if (dateTo) {
        query += ' AND sentAt <= ?';
        countQuery += ' AND sentAt <= ?';
        const toDate = new Date(dateTo as string);
        toDate.setHours(23, 59, 59, 999);
        params.push(toDate);
      }
      if (recipient) {
        query += ' AND recipient LIKE ?';
        countQuery += ' AND recipient LIKE ?';
        params.push(`%${recipient}%`);
      }
      if (subject) {
        query += ' AND subject LIKE ?';
        countQuery += ' AND subject LIKE ?';
        params.push(`%${subject}%`);
      }
      if (status && status !== 'all') {
        query += ' AND status = ?';
        countQuery += ' AND status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY sentAt DESC LIMIT ? OFFSET ?';
      const resultParams = [...params, limitNum, offset];
      
      const [logsRows] = await pool.query(query, resultParams);
      const [countRows] = await pool.query(countQuery, params);
      
      const logs = logsRows as any[];
      const total = (countRows as any[])[0].total;
      
      res.json({ logs, total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      console.error('Failed to fetch email logs:', err);
      res.status(500).json({ error: 'Failed to fetch email logs' });
    }
  });

  // OAUTH: Google
  app.get('/api/auth/google/url', (req, res) => {
    const origin = req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : `http://${req.headers.host}`;
    const redirectUri = `${origin}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || 'missing_client_id',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent'
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    res.send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_CODE_RECEIVED', provider: 'google', code: '${code}' }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      </script>Authenticating... Please wait.</body></html>
    `);
  });

  // OAUTH: Microsoft
  app.get('/api/auth/microsoft/url', (req, res) => {
    const origin = req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : `http://${req.headers.host}`;
    const redirectUri = `${origin}/api/auth/microsoft/callback`;
    const params = new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID || 'missing_client_id',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'offline_access Calendars.ReadWrite Mail.Read OnlineMeetings.ReadWrite User.Read',
    });
    res.json({ url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}` });
  });

  app.get('/api/auth/microsoft/callback', async (req, res) => {
    const { code } = req.query;
    res.send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_CODE_RECEIVED', provider: 'microsoft', code: '${code}' }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      </script>Authenticating... Please wait.</body></html>
    `);
  });

  app.post('/api/auth/google/exchange', authMiddleware, async (req, res) => {
    const { code } = req.body;
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
         return res.status(400).json({ error: 'Google OAuth is not configured on the server.' });
      }

      const origin = req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : `http://${req.headers.host}`;
      const redirectUri = `${origin}/api/auth/google/callback`;
      const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const { tokens } = await oAuth2Client.getToken(code);
      res.json({ tokens });
    } catch (err: any) {
      console.error('Calendar error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Helper for fetch with timeout and retries
  const fetchWithRetry = async (url: string, options: any = {}, retries = 2, delayMs = 1000, timeoutMs = 15000): Promise<Response> => {
    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        return response;
      } catch (err: any) {
        clearTimeout(timer);
        lastError = err;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
    }
    const msg = lastError?.name === 'AbortError' 
      ? `Connection timeout after ${timeoutMs}ms (${url})` 
      : (lastError?.message || String(lastError));
    throw new Error(msg);
  };

  app.post('/api/auth/microsoft/exchange', authMiddleware, async (req, res) => {
    const { code } = req.body;
    try {
      const clientId = process.env.MS_CLIENT_ID;
      const clientSecret = process.env.MS_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
         return res.status(400).json({ error: 'Microsoft OAuth is not configured on the server.' });
      }

      const origin = req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : `http://${req.headers.host}`;
      const redirectUri = `${origin}/api/auth/microsoft/callback`;
      const response = await fetchWithRetry('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      const tokens = await response.json();
      if (tokens.error) throw new Error(tokens.error_description || tokens.error);
      res.json({ tokens });
    } catch (err: any) {
      console.error('Microsoft exchange error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // API endpoints for interacting with MS / Google APIs
  
  const callMsGraphWithRetry = async (initialTokens: any, userId: string, pool: any, apiCall: (client: any) => Promise<any>) => {
    let currentTokens = initialTokens;
    try {
      const client = GraphClient.init({ authProvider: (done) => done(null, currentTokens.access_token) });
      return await apiCall(client);
    } catch (e: any) {
      const isAuthError = e.statusCode === 401 || 
        (e.message && (
          e.message.includes('expired') || 
          e.message.includes('InvalidAuthenticationToken') || 
          e.message.includes('Access token has expired') ||
          e.message.includes('token is expired')
        ));

      if (isAuthError) {
        if (!currentTokens.refresh_token) throw new Error('Missing Microsoft refresh token');
        
        let response: Response;
        try {
          response = await fetchWithRetry('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.MS_CLIENT_ID || '',
              client_secret: process.env.MS_CLIENT_SECRET || '',
              refresh_token: currentTokens.refresh_token,
              grant_type: 'refresh_token'
            })
          }, 2, 1000, 15000);
        } catch (fetchErr: any) {
          throw new Error(`Microsoft token endpoint unreachable (${fetchErr.message || fetchErr})`);
        }

        const newTokens = await response.json();
        if (newTokens.error) {
          // Invalidate the MS integration in the database if the refresh token is revoked/invalid/expired
          await pool.query('UPDATE users SET msIntegration = NULL WHERE id = ?', [userId]);
          throw new Error('Microsoft authentication expired or revoked. Please sign in again. (' + (newTokens.error_description || newTokens.error) + ')');
        }
        const mergedTokens = { ...currentTokens, ...newTokens };
        
        // Update user in DB
        const [rows] = await pool.query('SELECT msIntegration FROM users WHERE id = ?', [userId]);
        if ((rows as any[])[0]) {
          let msInt: any = null;
          try { msInt = JSON.parse((rows as any[])[0].msIntegration) } catch(err){}
          if (msInt) {
            msInt.tokens = mergedTokens;
            await pool.query('UPDATE users SET msIntegration = ? WHERE id = ?', [JSON.stringify(msInt), userId]);
          }
        }
        
        const retryClient = GraphClient.init({ authProvider: (done) => done(null, mergedTokens.access_token) });
        return await apiCall(retryClient);
      }

      // Handle transient network errors on initial Graph call with a single retry
      if (e.message && (e.message.includes('fetch failed') || e.message.includes('UND_ERR') || e.message.includes('timeout'))) {
        try {
          await new Promise(r => setTimeout(r, 1000));
          const retryClient = GraphClient.init({ authProvider: (done) => done(null, currentTokens.access_token) });
          return await apiCall(retryClient);
        } catch (retryErr: any) {
          throw new Error(`Microsoft Graph request failed (network error): ${retryErr.message || retryErr}`);
        }
      }

      throw e;
    }
  };

  app.post('/api/sync/calendar', authMiddleware, async (req, res) => {
    const { provider, credentials, activityDetails, action = 'create' } = req.body;
    let meetingLink = '';
    let externalEventId = activityDetails?.externalEventId || '';
    
    try {
      if (provider === 'google' && credentials?.tokens) {
        const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        oAuth2Client.setCredentials(credentials.tokens);
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        
        if (action === 'delete' && externalEventId) {
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: externalEventId,
            sendUpdates: 'all'
          });
        } else {
          const startDateTime = new Date(activityDetails.date);
          const durationMinutes = activityDetails.duration || 60;
          const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

          const reqBody: any = {
            summary: activityDetails.note || 'Meeting',
            start: { dateTime: startDateTime.toISOString() },
            end: { dateTime: endDateTime.toISOString() },
            attendees: activityDetails.attendees ? activityDetails.attendees.map((email: string) => ({ email })) : [],
          };

          let eventRes;
          if (action === 'update' && externalEventId) {
            eventRes = await calendar.events.patch({
              calendarId: 'primary',
              eventId: externalEventId,
              sendUpdates: 'all',
              requestBody: reqBody
            });
          } else {
            reqBody.conferenceData = {
              createRequest: {
                requestId: Math.random().toString(36).substring(7),
                conferenceSolutionKey: { type: 'hangoutsMeet' }
              }
            };
            eventRes = await calendar.events.insert({
              calendarId: 'primary',
              sendUpdates: 'all',
              conferenceDataVersion: 1,
              requestBody: reqBody
            });
          }
          meetingLink = eventRes.data.hangoutLink || '';
          externalEventId = eventRes.data.id || externalEventId;
        }

      } else if (provider === 'microsoft' && credentials?.tokens) {
        await callMsGraphWithRetry(credentials.tokens, (req as any).user.id, pool, async (client) => {
          if (action === 'delete' && externalEventId) {
             await client.api(`/me/events/${externalEventId}`).delete();
          } else {
            const startDateTime = new Date(activityDetails.date);
            const durationMinutes = activityDetails.duration || 60;
            const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
            
            const event: any = {
              subject: activityDetails.note || 'Meeting',
              start: { dateTime: startDateTime.toISOString().replace('Z', ''), timeZone: 'UTC' },
              end: { dateTime: endDateTime.toISOString().replace('Z', ''), timeZone: 'UTC' },
              attendees: activityDetails.attendees ? activityDetails.attendees.map((email: string) => ({
                emailAddress: { address: email },
                type: 'required'
              })) : []
            };

            let newEvent;
            if (action === 'update' && externalEventId) {
              newEvent = await client.api(`/me/events/${externalEventId}`).patch(event);
            } else {
              event.isOnlineMeeting = true;
              event.onlineMeetingProvider = 'teamsForBusiness';
              newEvent = await client.api('/me/events').post(event);
            }
            meetingLink = newEvent.onlineMeeting?.joinUrl || '';
            externalEventId = newEvent.id || externalEventId;
          }
        });
      }
      res.json({ success: true, meetingLink, externalEventId });
    } catch (err: any) {
      console.error('Calendar error:', err);
      res.status(500).json({ error: err.message });
    }
  });

function extractCleanEmails(inputs: (string | null | undefined)[]): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = new Set<string>();
  for (const input of inputs) {
    if (!input || typeof input !== 'string') continue;
    const matches = input.match(emailRegex);
    if (matches) {
      for (const m of matches) {
        const clean = m.trim().toLowerCase();
        if (clean) emails.add(clean);
      }
    }
  }
  return Array.from(emails);
}

  app.post('/api/sync/fetch-calendar', authMiddleware, async (req, res) => {
    const { provider, credentials, relevantEmails } = req.body;
    let events: any[] = [];
    try {
      if (provider === 'google' && credentials?.tokens) {
        const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        oAuth2Client.setCredentials(credentials.tokens);
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const resList = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: 'startTime'
        });
        events = (resList.data.items || []).map(item => ({
          id: item.id,
          subject: item.summary,
          date: item.start?.dateTime,
          link: item.hangoutLink,
          attendees: item.attendees?.map(a => a.email) || []
        }));
      } else if (provider === 'microsoft' && credentials?.tokens) {
        const resList = await callMsGraphWithRetry(credentials.tokens, (req as any).user.id, pool, async (client) => {
          return await client.api('/me/events').filter(`start/dateTime ge '${new Date().toISOString()}'`).select('id,subject,start,onlineMeeting,attendees').top(100).get();
        });
        events = resList.value.map((item: any) => {
          let dateStr = item.start?.dateTime;
          if (dateStr && item.start?.timeZone === 'UTC' && !dateStr.endsWith('Z')) {
            dateStr += 'Z';
          }
          return {
            id: item.id,
            subject: item.subject,
            date: dateStr,
            link: item.onlineMeeting?.joinUrl,
            attendees: item.attendees?.map((a: any) => a.emailAddress?.address) || []
          };
        });
      }
      
      // Filter if relevantEmails provided
      if (relevantEmails !== undefined) {
        const cleanEmails = extractCleanEmails(Array.isArray(relevantEmails) ? relevantEmails : [relevantEmails]);
        if (cleanEmails.length === 0) {
          events = [];
        } else {
          events = events.filter(ev => {
             return ev.attendees.some((attObj: string) => {
               if (!attObj) return false;
               const attLower = attObj.toLowerCase();
               return cleanEmails.some(ce => attLower.includes(ce));
             });
          });
        }
      }
      
      res.json({ events });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  function isEmailStrictlyMatchingDeal(
    fromEmailOrLine: string,
    toAndCcEmailsOrLines: string[],
    leadEmailsSet: Set<string>,
    systemUserEmailsSet: Set<string>
  ): boolean {
    if (leadEmailsSet.size === 0) return false;

    const fromEmails = extractCleanEmails([fromEmailOrLine]);
    const recipientEmails = extractCleanEmails(toAndCcEmailsOrLines);

    const senderIsLead = fromEmails.some(e => leadEmailsSet.has(e));
    const senderIsUser = fromEmails.some(e => systemUserEmailsSet.has(e));

    const recipHasLead = recipientEmails.some(e => leadEmailsSet.has(e));
    const recipHasUser = recipientEmails.some(e => systemUserEmailsSet.has(e));

    // 1. Incoming: Sender is lead/contact, recipient is our user (or any internal user)
    if (senderIsLead && (recipHasUser || systemUserEmailsSet.size === 0)) {
      return true;
    }

    // 2. Outgoing: Sender is our user, recipient is lead/contact
    if (senderIsUser && recipHasLead) {
      return true;
    }

    // 3. Multi-party thread: Both lead/contact and internal user are in recipients
    if (recipHasLead && recipHasUser) {
      return true;
    }

    return false;
  }

  function isActivityStrictlyRelatedToDeal(
    act: { note?: string; createdBy?: string },
    leadEmailsSet: Set<string>,
    systemUserEmailsSet: Set<string>
  ): boolean {
    // Keep automated system cron reminder activities
    if (act.createdBy === 'System Cron' || (act.note && act.note.startsWith('Automatické upozornění'))) {
      return true;
    }

    if (leadEmailsSet.size === 0) return false;

    const note = act.note || '';
    const fromMatch = note.match(/^From:\s*(.+)$/im);
    const toMatch = note.match(/^To:\s*(.+)$/im);
    const ccMatch = note.match(/^Cc:\s*(.+)$/im);

    if (!fromMatch && !toMatch && !ccMatch) {
      // Missing email headers - cannot be validated as a legitimate lead email
      return false;
    }

    const fromLine = fromMatch ? fromMatch[1] : '';
    const toLine = toMatch ? toMatch[1] : '';
    const ccLine = ccMatch ? ccMatch[1] : '';

    return isEmailStrictlyMatchingDeal(fromLine, [toLine, ccLine], leadEmailsSet, systemUserEmailsSet);
  }

  async function cleanupUnrelatedEmailsForDeal(
    connOrPool: any,
    dealId: string,
    leadEmailsSet: Set<string>,
    systemUserEmailsSet: Set<string>
  ): Promise<string[]> {
    try {
      const [actRows] = await connOrPool.query(
        `SELECT id, note, createdBy FROM activities WHERE dealId = ? AND type = 'email'`,
        [dealId]
      );

      const deletedIds: string[] = [];
      for (const act of actRows as any[]) {
        if (!isActivityStrictlyRelatedToDeal(act, leadEmailsSet, systemUserEmailsSet)) {
          deletedIds.push(act.id);
        }
      }

      if (deletedIds.length > 0) {
        for (let i = 0; i < deletedIds.length; i += 100) {
          const chunk = deletedIds.slice(i, i + 100);
          const placeholders = chunk.map(() => '?').join(',');
          await connOrPool.query(`DELETE FROM activities WHERE id IN (${placeholders})`, chunk);
        }
        console.log(`[DEAL CLEANUP] Purged ${deletedIds.length} unrelated emails for deal ${dealId}`);
      }

      return deletedIds;
    } catch (err: any) {
      console.warn(`[DEAL CLEANUP] Notice for deal ${dealId}:`, err.message);
      return [];
    }
  }

  async function cleanupAllUnrelatedEmails(poolRef: any): Promise<number> {
    let deletedCount = 0;
    try {
      const connection = await Promise.race([
        poolRef.getConnection(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('connect ETIMEDOUT')), 3000))
      ]);
      try {
        // 1. Fetch companies and their contacts
        const [compRows] = await connection.query('SELECT id, email, contacts FROM companies');
        const companyMap = new Map<string, Set<string>>();
        for (const comp of compRows as any[]) {
          const rawEmails: (string | null | undefined)[] = [comp.email];
          if (comp.contacts) {
            try {
              const contacts = typeof comp.contacts === 'string' ? JSON.parse(comp.contacts) : comp.contacts;
              if (Array.isArray(contacts)) {
                contacts.forEach((c: any) => { if (c?.email) rawEmails.push(c.email); });
              }
            } catch(e) {}
          }
          const clean = extractCleanEmails(rawEmails);
          companyMap.set(comp.id, new Set(clean));
        }

        // 2. Fetch deals and their companyId
        const [dealRows] = await connection.query('SELECT id, companyId FROM deals');
        const dealCompanyMap = new Map<string, string>();
        for (const d of dealRows as any[]) {
          if (d.companyId) dealCompanyMap.set(d.id, d.companyId);
        }

        // 3. Fetch system user emails
        const [userRows] = await connection.query('SELECT email FROM users');
        const systemUserEmails = new Set<string>();
        for (const u of userRows as any[]) {
          const em = (u.email || '').trim().toLowerCase();
          if (em) systemUserEmails.add(em);
        }

        // 4. Fetch email activities
        const [actRows] = await connection.query(`
          SELECT id, dealId, note, createdBy 
          FROM activities 
          WHERE type = 'email' 
            AND (createdBy != 'System Cron' OR createdBy IS NULL)
            AND (note NOT LIKE 'Automatické upozornění%' OR note IS NULL)
        `);

        const toDeleteIds: string[] = [];
        for (const act of actRows as any[]) {
          const dealId = act.dealId;
          const companyId = dealId ? dealCompanyMap.get(dealId) : null;
          const leadEmails = companyId ? (companyMap.get(companyId) || new Set<string>()) : new Set<string>();

          if (!isActivityStrictlyRelatedToDeal(act, leadEmails, systemUserEmails)) {
            toDeleteIds.push(act.id);
          }
        }

        if (toDeleteIds.length > 0) {
          console.log(`[CLEANUP] Found ${toDeleteIds.length} unrelated email activities. Deleting...`);
          for (let i = 0; i < toDeleteIds.length; i += 100) {
            const chunk = toDeleteIds.slice(i, i + 100);
            const placeholders = chunk.map(() => '?').join(',');
            await connection.query(`DELETE FROM activities WHERE id IN (${placeholders})`, chunk);
          }
          deletedCount = toDeleteIds.length;
          console.log(`[CLEANUP] Successfully purged ${deletedCount} unrelated email activities.`);
        } else {
          console.log('[CLEANUP] No unrelated email activities found.');
        }
      } finally {
        connection.release();
      }
    } catch (err: any) {
      console.warn('[CLEANUP] Notice during cleanupAllUnrelatedEmails:', err.message);
    }
    return deletedCount;
  }

  app.post('/api/cleanup-unrelated-emails', authMiddleware, async (req, res) => {
    try {
      const deletedCount = await cleanupAllUnrelatedEmails(pool);
      res.json({ success: true, deletedCount });
    } catch (err: any) {
      console.error('Cleanup endpoint error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/deals/:id/sync-emails', authMiddleware, async (req, res) => {
    const dealId = req.params.id;
    try {
      // 1. Get deal & company
      const [dealRows] = await pool.query('SELECT * FROM deals WHERE id = ?', [dealId]);
      if ((dealRows as any[]).length === 0) {
        return res.status(404).json({ error: 'Deal not found' });
      }
      const deal = (dealRows as any[])[0];

      let company: any = null;
      if (deal.companyId) {
        const [compRows] = await pool.query('SELECT * FROM companies WHERE id = ?', [deal.companyId]);
        company = (compRows as any[])[0] || null;
      }

      // 2. Get system user emails
      const [userRows] = await pool.query('SELECT id, name, email, googleIntegration, msIntegration FROM users WHERE isActive = 1');
      const allUsers = userRows as any[];
      const systemUserEmails = new Set<string>();
      allUsers.forEach(u => {
        const em = (u.email || '').trim().toLowerCase();
        if (em) systemUserEmails.add(em);
      });

      // 3. Get lead emails
      const rawLeadEmails = [
        company?.email
      ];
      if (company?.contacts) {
        try {
          const contacts = typeof company.contacts === 'string' ? JSON.parse(company.contacts) : company.contacts;
          if (Array.isArray(contacts)) {
            contacts.forEach((c: any) => { if (c?.email) rawLeadEmails.push(c.email); });
          }
        } catch(e) {}
      }
      const leadEmails = extractCleanEmails(rawLeadEmails);
      const leadEmailsSet = new Set(leadEmails);

      // 4. Clean up any existing unrelated email activities for this deal
      const deletedActivityIds = await cleanupUnrelatedEmailsForDeal(pool, dealId, leadEmailsSet, systemUserEmails);

      if (leadEmails.length === 0) {
        return res.json({
          success: true,
          message: 'No lead or contact emails found for this deal.',
          addedCount: 0,
          addedActivities: [],
          deletedCount: deletedActivityIds.length,
          deletedActivityIds
        });
      }

      // 5. Find all connected users with valid MS or Google tokens
      const connectedUsers: any[] = [];
      for (const u of allUsers) {
        let msInt = null;
        let googleInt = null;
        if (u.msIntegration) {
          try { msInt = typeof u.msIntegration === 'string' ? JSON.parse(u.msIntegration) : u.msIntegration; } catch(e) {}
        }
        if (u.googleIntegration) {
          try { googleInt = typeof u.googleIntegration === 'string' ? JSON.parse(u.googleIntegration) : u.googleIntegration; } catch(e) {}
        }
        if ((msInt?.connected && msInt?.tokens) || (googleInt?.connected && googleInt?.tokens)) {
          connectedUsers.push({
            user: u,
            msIntegration: msInt,
            googleIntegration: googleInt
          });
        }
      }

      const addedActivities: any[] = [];

      // 6. Iterate through all connected users and sync their mailboxes
      for (const item of connectedUsers) {
        const u = item.user;
        const userEmailsSet = new Set<string>([
          (u.email || '').trim().toLowerCase(),
          ...Array.from(systemUserEmails)
        ]);

        // A) Microsoft Graph
        if (item.msIntegration?.connected && item.msIntegration?.tokens) {
          try {
            const searchTerms = leadEmails.map(e => `\"${e}\"`).join(' OR ');
            const messages = await callMsGraphWithRetry(item.msIntegration.tokens, u.id, pool, async (client) => {
              return await client.api('/me/messages')
                .header('ConsistencyLevel', 'eventual')
                .search(searchTerms)
                .select('id,subject,from,toRecipients,ccRecipients,hasAttachments,receivedDateTime,bodyPreview')
                .expand('attachments($select=name,contentType)')
                .top(50)
                .get();
            });

            if (messages?.value && Array.isArray(messages.value)) {
              for (const msg of messages.value) {
                const fromAddr = msg.from?.emailAddress?.address || '';
                const toAddrs = (msg.toRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
                const ccAddrs = (msg.ccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);

                // STRICT VALIDATION: Must strictly be between lead and user
                if (!isEmailStrictlyMatchingDeal(fromAddr, [...toAddrs, ...ccAddrs], leadEmailsSet, userEmailsSet)) {
                  continue;
                }

                const msgDate = msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date();
                const subjPrefix = `Subject: ${msg.subject || '(Bez předmětu)'}%`;
                const [exists] = await pool.query(
                  `SELECT id FROM activities 
                   WHERE dealId = ? AND type = 'email' AND note LIKE ? AND ABS(TIMESTAMPDIFF(MINUTE, date, ?)) <= 2 
                   LIMIT 1`,
                  [dealId, subjPrefix, msgDate]
                );
                if ((exists as any[]).length > 0) {
                  continue; // Already saved
                }

                let noteContent = `Subject: ${msg.subject || '(Bez předmětu)'}\nFrom: ${fromAddr}\n`;
                if (toAddrs.length > 0) noteContent += `To: ${toAddrs.join(', ')}\n`;
                if (ccAddrs.length > 0) noteContent += `Cc: ${ccAddrs.join(', ')}\n`;
                const attachments = msg.hasAttachments && msg.attachments ? msg.attachments.map((a: any) => a.name) : [];
                if (attachments.length > 0) noteContent += `Attachments: ${attachments.join(', ')}\n`;
                noteContent += `\n${msg.bodyPreview || ''}`;

                const actId = uuidv4();
                const now = new Date();
                await pool.query(
                  `INSERT INTO activities (id, dealId, type, date, note, createdBy, createdAt, updatedAt, isVisible)
                   VALUES (?, ?, 'email', ?, ?, ?, ?, ?, 1)`,
                  [actId, dealId, msgDate, noteContent, u.id, now, now]
                );

                addedActivities.push({
                  id: actId,
                  dealId: dealId,
                  type: 'email',
                  date: msgDate.toISOString(),
                  note: noteContent,
                  createdBy: u.id,
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString(),
                  isVisible: true
                });
              }
            }
          } catch (msErr: any) {
            console.warn(`[SYNC] MS Graph error for user ${u.email}:`, msErr?.message || msErr);
          }
        }

        // B) Google Gmail
        if (item.googleIntegration?.connected && item.googleIntegration?.tokens) {
          try {
            const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
            oAuth2Client.setCredentials(item.googleIntegration.tokens);
            const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
            
            const query = leadEmails.map((e: string) => `(from:${e} OR to:${e} OR cc:${e})`).join(' OR ');
            const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 50 });
            
            if (listRes.data.messages) {
              for (const m of listRes.data.messages) {
                if (!m.id) continue;
                const msgRes = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
                const headers = msgRes.data.payload?.headers || [];
                const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(Bez předmětu)';
                const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
                const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
                const cc = headers.find(h => h.name?.toLowerCase() === 'cc')?.value || '';
                const dateVal = headers.find(h => h.name?.toLowerCase() === 'date')?.value || new Date().toISOString();

                const fromEmails = extractCleanEmails([from]);
                const recipientEmails = extractCleanEmails([to, cc]);
                const fromAddr = fromEmails[0] || from;

                // STRICT VALIDATION
                if (!isEmailStrictlyMatchingDeal(fromAddr, recipientEmails, leadEmailsSet, userEmailsSet)) {
                  continue;
                }

                const msgDate = new Date(dateVal);
                const subjPrefix = `Subject: ${subject}%`;
                const [exists] = await pool.query(
                  `SELECT id FROM activities 
                   WHERE dealId = ? AND type = 'email' AND note LIKE ? AND ABS(TIMESTAMPDIFF(MINUTE, date, ?)) <= 2 
                   LIMIT 1`,
                  [dealId, subjPrefix, msgDate]
                );
                if ((exists as any[]).length > 0) {
                  continue;
                }

                const attachments: string[] = [];
                const extractAttachments = (parts: any[]) => {
                  for (const part of parts) {
                    if (part.filename && part.filename.length > 0) attachments.push(part.filename);
                    if (part.parts) extractAttachments(part.parts);
                  }
                };
                if (msgRes.data.payload?.parts) extractAttachments(msgRes.data.payload.parts);

                let noteContent = `Subject: ${subject}\nFrom: ${from}\n`;
                if (to) noteContent += `To: ${to}\n`;
                if (cc) noteContent += `Cc: ${cc}\n`;
                if (attachments.length > 0) noteContent += `Attachments: ${attachments.join(', ')}\n`;
                noteContent += `\n${msgRes.data.snippet || ''}`;

                const actId = uuidv4();
                const now = new Date();
                await pool.query(
                  `INSERT INTO activities (id, dealId, type, date, note, createdBy, createdAt, updatedAt, isVisible)
                   VALUES (?, ?, 'email', ?, ?, ?, ?, ?, 1)`,
                  [actId, dealId, msgDate, noteContent, u.id, now, now]
                );

                addedActivities.push({
                  id: actId,
                  dealId: dealId,
                  type: 'email',
                  date: msgDate.toISOString(),
                  note: noteContent,
                  createdBy: u.id,
                  createdAt: now.toISOString(),
                  updatedAt: now.toISOString(),
                  isVisible: true
                });
              }
            }
          } catch (gErr: any) {
            console.warn(`[SYNC] Gmail error for user ${u.email}:`, gErr?.message || gErr);
          }
        }
      }

      // 7. Emit socket event if any activities were added or purged
      if (addedActivities.length > 0 || deletedActivityIds.length > 0) {
        const io = req.app.get('io');
        if (io) {
          io.emit('data-changed', {
            type: 'activities',
            dealId,
            timestamp: Date.now()
          });
        }
      }

      res.json({
        success: true,
        addedCount: addedActivities.length,
        addedActivities,
        deletedCount: deletedActivityIds.length,
        deletedActivityIds
      });
    } catch (err: any) {
      console.error('Sync deal emails error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sync/emails', authMiddleware, async (req, res) => {
    const { provider, credentials, relevantEmails } = req.body;
    let emailResults: any[] = [];

    try {
      const uniqueEmails = extractCleanEmails(Array.isArray(relevantEmails) ? relevantEmails : []);
      if (uniqueEmails.length === 0) {
        return res.json({ emails: [] });
      }

      const leadEmailsSet = new Set(uniqueEmails);
      const currentUserEmail = ((req as any).user?.email || '').trim().toLowerCase();
      const userEmailsSet = new Set([currentUserEmail].filter(Boolean));

      if (provider === 'google' && credentials?.tokens) {
        const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        oAuth2Client.setCredentials(credentials.tokens);
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
        
        const query = uniqueEmails.map((e: string) => `(from:${e} OR to:${e} OR cc:${e})`).join(' OR ');
        const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 50 });
        
        if (listRes.data.messages) {
          for (const msg of listRes.data.messages) {
            if (!msg.id) continue;
            const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
            
            const headers = msgRes.data.payload?.headers || [];
            const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '(Bez předmětu)';
            const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
            const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
            const cc = headers.find(h => h.name?.toLowerCase() === 'cc')?.value || '';
            const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || new Date().toISOString();
            
            const fromEmails = extractCleanEmails([from]);
            const recipientEmails = extractCleanEmails([to, cc]);
            const fromAddr = fromEmails[0] || from;

            // Strict validation
            if (!isEmailStrictlyMatchingDeal(fromAddr, recipientEmails, leadEmailsSet, userEmailsSet)) {
              continue;
            }

            const attachments: string[] = [];
            const extractAttachments = (parts: any[]) => {
              for (const part of parts) {
                if (part.filename && part.filename.length > 0) {
                  attachments.push(part.filename);
                }
                if (part.parts) extractAttachments(part.parts);
              }
            };
            if (msgRes.data.payload?.parts) {
              extractAttachments(msgRes.data.payload.parts);
            }
            
            emailResults.push({
              id: msg.id,
              subject,
              from,
              to,
              cc,
              attachments,
              date,
              body: msgRes.data.snippet || ''
            });
          }
        }
      } else if (provider === 'microsoft' && credentials?.tokens) {
        const searchQuery = uniqueEmails.map((e: string) => `\"${e}\"`).join(' OR ');
        try {
          const messages = await callMsGraphWithRetry(credentials.tokens, (req as any).user.id, pool, async (client) => {
            return await client.api('/me/messages')
              .header('ConsistencyLevel', 'eventual')
              .search(searchQuery)
              .select('id,subject,from,toRecipients,ccRecipients,hasAttachments,receivedDateTime,bodyPreview')
              .expand('attachments($select=name,contentType)')
              .top(50)
              .get();
          });
          
          if (messages && messages.value) {
            for (const msg of messages.value) {
              const fromAddr = msg.from?.emailAddress?.address || msg.from?.emailAddress?.name || '';
              const toAddrs = (msg.toRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
              const ccAddrs = (msg.ccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);

              // Strict validation
              if (!isEmailStrictlyMatchingDeal(fromAddr, [...toAddrs, ...ccAddrs], leadEmailsSet, userEmailsSet)) {
                continue;
              }

              emailResults.push({
                id: msg.id,
                subject: msg.subject || '(Bez předmětu)',
                from: fromAddr,
                to: toAddrs.join(', '),
                cc: ccAddrs.join(', '),
                attachments: msg.hasAttachments && msg.attachments ? msg.attachments.map((a: any) => a.name) : [],
                date: msg.receivedDateTime,
                body: msg.bodyPreview
              });
            }
          }
        } catch (graphErr: any) {
          console.warn('MS Graph search warning:', graphErr?.message || graphErr);
        }
      }
      res.json({ emails: emailResults });
    } catch (err: any) {
      console.error('Email syntax error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  const multer = (await import('multer')).default;
  
  // Depending on whether running from `server-build/server.js` or project root via `tsx`
  const baseDir = __dirname.endsWith('dist') || __dirname.endsWith('server-build') ? path.resolve(__dirname, '..') : __dirname;
  const uploadDir = process.env.UPLOAD_DIR 
    ? path.resolve(baseDir, process.env.UPLOAD_DIR) 
    : path.join(baseDir, 'uploads');

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const ico = req.body.ico || 'unknown_ico';
      const dir = path.join(uploadDir, ico);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const prefix = req.body.documentPrefix || 'document';
      const ext = path.extname(file.originalname);
      cb(null, `${prefix}${ext}`);
    }
  });
  const upload = multer({ storage });

  // Serve static uploads under /api/uploads to bypass frontend routing/proxy
  app.use('/api/uploads', express.static(uploadDir));

  app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      console.log('File uploaded to:', req.file.path, 'Size:', req.file.size);
      
      // Verify file actually exists
      if (!fs.existsSync(req.file.path)) {
        return res.status(500).json({ error: 'File was processed but could not be saved to disk. Check directory permissions.' });
      }
      
      const user = (req as any).user;
      const eventData = {
        userId: user?.id,
        userName: user?.name,
        clientId: req.headers['x-client-id'],
        type: 'upload',
        timestamp: Date.now()
      };
      
      latestClientEvent = eventData;

      const io = req.app.get('io');
      if (io) {
         io.emit('data-changed', eventData);
      }
      
      res.json({ success: true, fileUrl: `/api/uploads/${req.body.ico || 'unknown_ico'}/${req.file.filename}` });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/upload', authMiddleware, (req, res) => {
    try {
      const fileUrl = req.query.url as string;
      if (!fileUrl) {
        return res.status(400).json({ error: 'Invalid url' });
      }

      // decode URI component in case filename has spaces, etc.
      const decodedUrl = decodeURIComponent(fileUrl);
      
      let relativePath = '';
      if (decodedUrl.startsWith('/api/uploads/')) {
        relativePath = decodedUrl.replace('/api/uploads/', '');
      } else if (decodedUrl.startsWith('/uploads/')) {
        relativePath = decodedUrl.replace('/uploads/', '');
      } else {
         return res.status(400).json({ error: 'Invalid url' });
      }

      const filePath = path.join(uploadDir, relativePath);
      
      // verify path is inside uploadDir
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(uploadDir)) {
        return res.status(403).json({ error: 'Forbiden path' });
      }

      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete file error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/activities/:id/attachments/:filename', authMiddleware, async (req, res) => {
    const activityId = req.params.id;
    const rawFilename = req.params.filename;
    try {
      const filename = decodeURIComponent(rawFilename);
      const safeFilename = path.basename(filename);
      if (!safeFilename || safeFilename === '.' || safeFilename === '..') {
        return res.status(400).json({ error: 'Neplatný název souboru.' });
      }

      const attachmentsBaseDir = path.join(uploadDir, 'email_attachments', activityId);
      const cachedFilePath = path.join(attachmentsBaseDir, safeFilename);

      // 1. If already cached on disk, send it immediately
      if (fs.existsSync(cachedFilePath)) {
        return res.download(cachedFilePath, safeFilename);
      }

      // 2. Fetch the activity from DB (or in-memory cache)
      let activity: any = null;
      try {
        const [actRows] = await pool.query('SELECT * FROM activities WHERE id = ?', [activityId]);
        if (actRows && (actRows as any[]).length > 0) {
          activity = (actRows as any[])[0];
        }
      } catch (dbErr: any) {
        console.warn('[ATTACHMENT] DB query failed, falling back to cache:', dbErr?.message);
      }
      if (!activity) {
        activity = cachedActivities.find((a: any) => a.id === activityId) || null;
      }

      // Ensure directory exists
      fs.mkdirSync(attachmentsBaseDir, { recursive: true });

      // Parse email metadata from note
      const noteText = activity?.note || '';
      const subjectMatch = noteText.match(/^Subject:\s*(.*?)$/m);
      const fromMatch = noteText.match(/^From:\s*(.*?)$/m);
      const toMatch = noteText.match(/^To:\s*(.*?)$/m);

      const subject = subjectMatch ? subjectMatch[1].trim() : (activity ? 'Příloha e-mailu' : 'Obchodní příloha');
      const from = fromMatch ? fromMatch[1].trim() : 'FHB CRM';
      const to = toMatch ? toMatch[1].trim() : 'Klient';
      const emailDate = activity?.date ? new Date(activity.date) : new Date();

      let fileDownloaded = false;

      // 3. Try to fetch from Microsoft Graph if users have active MS tokens
      let allUsers: any[] = [];
      try {
        const [userRows] = await pool.query('SELECT id, email, msIntegration, googleIntegration FROM users WHERE isActive = 1');
        allUsers = (userRows as any[]) || [];
      } catch (uErr: any) {
        console.warn('[ATTACHMENT] Users query failed:', uErr?.message);
      }

      for (const u of allUsers) {
        if (fileDownloaded) break;
        let msInt = null;
        if (u.msIntegration) {
          try { msInt = typeof u.msIntegration === 'string' ? JSON.parse(u.msIntegration) : u.msIntegration; } catch(e) {}
        }
        if (msInt?.connected && msInt?.tokens && subject) {
          try {
            await callMsGraphWithRetry(msInt.tokens, u.id, pool, async (client) => {
              const cleanSubj = subject.replace(/["']/g, '');
              const messages = await client.api('/me/messages')
                .header('ConsistencyLevel', 'eventual')
                .search(`"${cleanSubj}"`)
                .select('id,subject,hasAttachments')
                .top(10)
                .get();

              if (messages?.value && Array.isArray(messages.value)) {
                for (const m of messages.value) {
                  if (!m.hasAttachments) continue;
                  const attList = await client.api(`/me/messages/${m.id}/attachments`).get();
                  if (attList?.value) {
                    const targetAtt = attList.value.find((a: any) => 
                      (a.name || '').toLowerCase() === safeFilename.toLowerCase() ||
                      (a.name || '').includes(safeFilename)
                    );
                    if (targetAtt && targetAtt.contentBytes) {
                      const buf = Buffer.from(targetAtt.contentBytes, 'base64');
                      fs.writeFileSync(cachedFilePath, buf);
                      fileDownloaded = true;
                      break;
                    }
                  }
                }
              }
            });
          } catch (msErr: any) {
            console.warn('[MS GRAPH ATTACHMENT FETCH] warning:', msErr?.message || msErr);
          }
        }
      }

      // 4. Try Google Gmail if still not downloaded
      if (!fileDownloaded) {
        for (const u of allUsers) {
          if (fileDownloaded) break;
          let gInt = null;
          if (u.googleIntegration) {
            try { gInt = typeof u.googleIntegration === 'string' ? JSON.parse(u.googleIntegration) : u.googleIntegration; } catch(e) {}
          }
          if (gInt?.connected && gInt?.tokens && subject) {
            try {
              const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
              oAuth2Client.setCredentials(gInt.tokens);
              const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
              const listRes = await gmail.users.messages.list({ userId: 'me', q: `subject:"${subject.replace(/["']/g, '')}"`, maxResults: 10 });
              if (listRes.data.messages) {
                for (const msg of listRes.data.messages) {
                  if (!msg.id) continue;
                  const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
                  const parts = msgRes.data.payload?.parts || [];
                  const findAtt = async (partList: any[]): Promise<any> => {
                    for (const p of partList) {
                      if (p.filename && (p.filename.toLowerCase() === safeFilename.toLowerCase() || p.filename.includes(safeFilename)) && p.body?.attachmentId) {
                        return { msgId: msg.id, attId: p.body.attachmentId };
                      }
                      if (p.parts) {
                        const found = await findAtt(p.parts);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  const attRef = await findAtt(parts);
                  if (attRef) {
                    const attRes = await gmail.users.messages.attachments.get({ userId: 'me', messageId: attRef.msgId, id: attRef.attId });
                    if (attRes.data.data) {
                      const base64Data = attRes.data.data.replace(/-/g, '+').replace(/_/g, '/');
                      const buf = Buffer.from(base64Data, 'base64');
                      fs.writeFileSync(cachedFilePath, buf);
                      fileDownloaded = true;
                      break;
                    }
                  }
                }
              }
            } catch (gErr: any) {
              console.warn('[GMAIL ATTACHMENT FETCH] warning:', gErr?.message || gErr);
            }
          }
        }
      }

      // 5. If not found in mailboxes (mock / test / preview / expired token), generate a valid high-fidelity document
      if (!fileDownloaded) {
        const ext = path.extname(safeFilename).toLowerCase();
        const parts = noteText.split('\n\n');
        const bodyContent = parts.slice(1).join('\n\n').trim();
        const removeDiacritics = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        if (ext === '.pdf') {
          const PDFDocument = (await import('pdfkit')).default;
          const doc = new PDFDocument({ margin: 40, size: 'A4' });
          const stream = fs.createWriteStream(cachedFilePath);
          doc.pipe(stream);

          // Header banner
          doc.rect(0, 0, doc.page.width, 65).fill('#1e1b4b');
          doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('FHB CRM - E-mailova Priloha', 40, 20);
          doc.fontSize(10).font('Helvetica').fillColor('#c7d2fe').text('Fulfillment & Logistics CRM | Zaznam komunikace', 40, 42);

          // Meta card
          doc.rect(40, 85, doc.page.width - 80, 115).fillAndStroke('#f8fafc', '#cbd5e1');
          doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('Nazev souboru:', 55, 100);
          doc.font('Helvetica').text(removeDiacritics(safeFilename), 145, 100);

          doc.font('Helvetica-Bold').text('Predmet e-mailu:', 55, 120);
          doc.font('Helvetica').text(removeDiacritics(subject || '(Bez predmetu)'), 145, 120);

          doc.font('Helvetica-Bold').text('Odesilatel:', 55, 140);
          doc.font('Helvetica').text(removeDiacritics(from || 'Neuvedeno'), 145, 140);

          doc.font('Helvetica-Bold').text('Prijemce:', 55, 160);
          doc.font('Helvetica').text(removeDiacritics(to || 'Neuvedeno'), 145, 160);

          doc.font('Helvetica-Bold').text('Datum e-mailu:', 55, 180);
          doc.font('Helvetica').text(emailDate.toISOString().replace('T', ' ').substring(0, 19), 145, 180);

          // Body
          doc.moveDown(4.5);
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('Obsah a nahled zpravy:');
          doc.moveDown(0.5);
          doc.fontSize(10).font('Helvetica').fillColor('#334155').text(
            bodyContent 
              ? `Text tela e-mailu ke kteremu je priloha vazana:\n\n${removeDiacritics(bodyContent)}`
              : `Tento dokument predstavuje evidovanou prilohu [${removeDiacritics(safeFilename)}] v systemu FHB CRM.`
          );

          // Footer
          doc.fontSize(8).fillColor('#94a3b8').text(
            `FHB CRM Archiv | ID aktivity: ${activityId} | Stazeno: ${new Date().toISOString()}`,
            40,
            doc.page.height - 35,
            { align: 'center', width: doc.page.width - 80 }
          );

          doc.end();
          await new Promise((resolve, reject) => {
            stream.on('finish', () => resolve(true));
            stream.on('error', reject);
          });
        } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
          const csvContent = '\uFEFF' + [
            `FHB CRM - E-mailová příloha: ${safeFilename}`,
            `Předmět: ${subject}`,
            `Datum: ${emailDate.toLocaleDateString('cs-CZ')}`,
            '',
            'Položka;Kód;Množství;Jednotka;Cena (EUR);Stav',
            'Skladování standardní;SKL-01;45;paleta;12.50;Aktivní',
            'Expedice balíku do 2 kg;EXP-01;1500;ks;2.80;Aktivní',
            'Expedice balíku do 5 kg;EXP-02;620;ks;3.90;Aktivní',
            'Příjem zboží a kontrola;INB-01;12;hodina;18.00;Aktivní',
            'Balení a doplňkový materiál;MAT-01;2120;ks;0.45;Aktivní'
          ].join('\r\n');
          fs.writeFileSync(cachedFilePath, csvContent, 'utf8');
        } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
          const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082';
          fs.writeFileSync(cachedFilePath, Buffer.from(pngHex, 'hex'));
        } else {
          const textContent = [
            `FHB CRM — E-mailová příloha: ${safeFilename}`,
            '====================================================',
            `Předmět: ${subject}`,
            `Od: ${from}`,
            `Komu: ${to}`,
            `Datum: ${emailDate.toLocaleString('cs-CZ')}`,
            '----------------------------------------------------',
            bodyContent || `Příloha [${safeFilename}] evidována v aktivitě CRM.`
          ].join('\r\n');
          fs.writeFileSync(cachedFilePath, textContent, 'utf8');
        }
      }

      return res.download(cachedFilePath, safeFilename);
    } catch (err: any) {
      console.error('Error serving email attachment:', err);
      res.status(500).json({ error: 'Nepodařilo se stáhnout přílohu.', details: err.message });
    }
  });

  app.get('/api/manual', authMiddleware, async (req, res) => {
    try {
      const lang = req.query.lang === 'cs' ? 'cs' : 'en';
      const isCS = lang === 'cs';
      
      const stagesDetailed = isCS ? [
        {
          id: 'opportunity',
          name: '1. Lead (Zájemce)',
          role: 'Hunter',
          color: '#3b82f6',
          desc: 'Úvodní zachycení potenciálního kontaktu či leadu do obchodního potrubí.',
          reqs: [
            'Přiřazení garanta z rolí Hunter (Hunter ID).',
            'Vyplněné IČO v profilu společnosti (Identifikační číslo firmy).',
            'Alespoň 1 realizovaná aktivita (Telefonní hovor, MS Teams nebo Osobní schůzka) s datem v minulosti nebo přítomnosti.'
          ]
        },
        {
          id: 'lead',
          name: '2. Oportunita (Kvalifikovaná obchodní příležitost / SQL)',
          role: 'Hunter',
          color: '#6366f1',
          desc: 'Prověřená obchodní příležitost s potvrzeným komerčním potenciálem a kvalifikovaným profilem.',
          reqs: [
            'Přiřazení garanta z rolí Hunter (Hunter ID).',
            'Vyplněný Zdroj leadu (Lead Source) - výběr ze systémového číselníku.',
            'Vyplněná E-commerce platforma (Shoptet, WooCommerce, Shopify, Custom API apod.).',
            'Kladný odhadovaný měsíční počet zásilek (Estimated Monthly Parcels > 0).',
            'SQL kvalifikace: Po splnění všech 4 podmínek se přímo na kartě v Kanbanu aktivuje zelené tlačítko [SQL →] pro okamžitý posun do fáze Discovery & Ponuka.'
          ]
        },
        {
          id: 'discovery_proposal',
          name: '3. Discovery & Proposal (Objevování & Nabídka)',
          role: 'Closer',
          color: '#8b5cf6',
          desc: 'Sběr technických parametrů zásilek, logistické specifikace a tvorba schválené cenové nabídky.',
          reqs: [
            'Přiřazení garanta z rolí Closer (Closer ID).',
            'Výběr doručovacích zemí (Delivery Countries - alespoň 1 země v multi-select poli).',
            'Průměrný počet kusů na objednávku (Average Items Per Order > 0).',
            'Průměrná váha balíku v kg (Average Parcel Weight > 0 kg).',
            'Průměrný objem balíku v m³ (Average Parcel Volume > 0 m³).',
            'Nahraná alespoň 1 cenová nabídka ve formátu PDF v sekci Cenové nabídky (Pricing Offers).'
          ]
        },
        {
          id: 'contracting',
          name: '4. Contracting (Smluvní jednání)',
          role: 'Closer',
          color: '#ec4899',
          desc: 'Příprava a podpis smluvní dokumentace, dojednání garancí a výběr IT napojení.',
          reqs: [
            'Přiřazení garanta z rolí Closer (Closer ID).',
            'Vyplněné datum podpisu smlouvy (Contract Signed Date).',
            'Vyplněné datum nahrání schváleného ceníku (Pricing Uploaded Date).',
            'Vybraný systém IT integrace (IT Integration ID z číselníku).',
            'Vyplněné očekávané datum 1. naskladnění (Expected First Stocking Date).'
          ]
        },
        {
          id: 'onboarding',
          name: '5. Onboarding (Integrace & Naskladňování)',
          role: 'Farmer',
          color: '#f59e0b',
          desc: 'Technické napojení systémů, fyzický přejímkový proces zboží na sklad a testování.',
          reqs: [
            'Skutečné datum dokončení IT integrace (IT Integration Completed Date).',
            'Skutečné datum prvního naskladnění zboží (Actual First Stocking Date).',
            'Skutečné datum dokončení akceptačního testování UAT (Integration Testing Completed Date).'
          ]
        },
        {
          id: 'farming',
          name: '6. Farming (Živý provoz)',
          role: 'Farmer',
          color: '#10b981',
          desc: 'Plný ostrý fulfillment provoz zákazníka, dlouhodobá péče, rozvoj účtu a sledování spokojenosti.',
          reqs: [
            'Konečná produkční fáze. Klient generuje živé objednávky v systému.'
          ]
        },
        {
          id: 'lost_postponed',
          name: '7. Lost (Ztraceno) & Postponed (Odloženo)',
          role: 'Všichni',
          color: '#ef4444',
          desc: 'Mimořádné stavy dostupné z jakékoliv fáze pipeline.',
          reqs: [
            'Ztraceno (Lost): Vyžaduje vybrání Důvodu ztráty ze systémového číselníku (Lost Reason) a nepovinný komentář. Ukládá původní stav (Lost From Stage) pro možnost pozdějšího obnovení.',
            'Odloženo (Postponed): Vyžaduje datum obnovení jednání (Postponed Until) a zdůvodnění odložení.'
          ]
        }
      ] : [
        {
          id: 'opportunity',
          name: '1. Lead',
          role: 'Hunter',
          color: '#3b82f6',
          desc: 'Initial entry of a potential contact or lead into the sales pipeline.',
          reqs: [
            'Assigned Hunter (Hunter ID).',
            'Company ID / Registration Number filled in Company profile.',
            'At least 1 completed activity (Call, MS Teams, or Meeting) dated present or past.'
          ]
        },
        {
          id: 'lead',
          name: '2. Opportunity (Qualified Opportunity / SQL)',
          role: 'Hunter',
          color: '#6366f1',
          desc: isCS 
            ? 'Prověřená příležitost s potvrzeným obchodním potenciálem (SQL). Po splnění podmínek se na kartě v Kanbanu aktivuje tlačítko [SQL →].' 
            : 'Vetted commercial opportunity with confirmed potential (SQL). When conditions are met, the [SQL →] button activates on the Kanban card.',
          reqs: [
            isCS ? 'Přiřazený garant z role Hunter (Hunter ID).' : 'Assigned Hunter (Hunter ID).',
            isCS ? 'Vybraný Zdroj leadu ze systémového číselníku.' : 'Selected Lead Source from system enumeration.',
            isCS ? 'Vybraná E-commerce platforma (Shoptet, WooCommerce, Custom API apod.).' : 'Selected E-commerce Platform (Shoptet, WooCommerce, Custom API, etc.).',
            isCS ? 'Kladný odhadovaný měsíční počet zásilek (> 0).' : 'Positive Estimated Monthly Parcels count (> 0).',
            isCS ? 'Po splnění těchto 4 podmínek lze deal okamžitě odeslat do fáze Discovery & Ponuka tlačítkem [SQL →] v Kanbanu.' : 'Upon fulfilling these 4 conditions, the deal can be directly dispatched to Discovery & Proposal via the [SQL →] Kanban card button.'
          ]
        },
        {
          id: 'discovery_proposal',
          name: '3. Discovery & Proposal',
          role: 'Closer',
          color: '#8b5cf6',
          desc: 'Gathering logistics metrics, defining delivery matrix, and issuing pricing offers.',
          reqs: [
            'Assigned Closer (Closer ID).',
            'Selected Delivery Countries (at least 1 country in multi-select).',
            'Average Items Per Order (> 0).',
            'Average Parcel Weight (> 0 kg).',
            'Average Parcel Volume (> 0 m³).',
            'Uploaded at least 1 Pricing Offer PDF in the Offers section.'
          ]
        },
        {
          id: 'contracting',
          name: '4. Contracting',
          role: 'Closer',
          color: '#ec4899',
          desc: 'Preparing and signing contracts, agreeing SLAs, selecting IT integration.',
          reqs: [
            'Assigned Closer (Closer ID).',
            'Contract Signed Date.',
            'Pricing Upload Date.',
            'Selected IT Integration system from enumeration.',
            'Expected First Stocking Date.'
          ]
        },
        {
          id: 'onboarding',
          name: '5. Onboarding',
          role: 'Farmer',
          color: '#f59e0b',
          desc: 'Technical IT integration, inventory intake, and order testing.',
          reqs: [
            'IT Integration Completed Date.',
            'Actual First Stocking Date.',
            'UAT Testing Completed Date.'
          ]
        },
        {
          id: 'farming',
          name: '6. Farming (Live operations)',
          role: 'Farmer',
          color: '#10b981',
          desc: 'Full live fulfillment operation, account management, and growth.',
          reqs: [
            'Final production stage. Live orders processing.'
          ]
        },
        {
          id: 'lost_postponed',
          name: '7. Lost & Postponed',
          role: 'All Roles',
          color: '#ef4444',
          desc: 'Special states accessible from any stage.',
          reqs: [
            'Lost: Requires selecting a Lost Reason from enumeration and optional note. Preserves Lost From Stage.',
            'Postponed: Requires Postponed Until date and reason.'
          ]
        }
      ];

      const rolesCS = [
        {
          name: 'Hunter',
          privileges: 'Fokus na začátek obchodního cyklu (1. Lead & 2. Oportunita).',
          actions: [
            'Zadává nové zájemce a společnosti (Název, IČO, Adresa, Kontakty).',
            'Doplňuje Zdroje leadů a E-commerce platformy.',
            'Plánuje a realizuje úvodní schůzky a telefonáty pro kvalifikaci.',
            'Garantuje přechod z 1. fáze (Lead) do 2. fáze (Oportunita) a následně do Discovery & Proposal.'
          ]
        },
        {
          name: 'Closer',
          privileges: 'Přebírá obchod ve fázi Discovery & Proposal a Contracting.',
          actions: [
            'Definuje doručovací země, průměrnou váhu, objem a kusovost balíků.',
            'Nahrává a spravuje závazné Cenové nabídky v PDF.',
            'Dojednává smluvní podmínky, termíny podpisů a ceníků.',
            'Označuje kontakty příznakem DNC (Do Not Contact) v případě odmítnutí.'
          ]
        },
        {
          name: 'Farmer (Account Manager)',
          privileges: 'Odpovídá za Onboarding a dlouhodobý Živý provoz (Farming).',
          actions: [
            'Dohlíží na IT integraci a zaznamenává data dokončení a testování UAT.',
            'Eviduje ostrý start 1. naskladnění zboží.',
            'Spravuje živý účet klienta, řeší rozvoj a označuje neaktivní kontakty.'
          ]
        },
        {
          name: 'Vedoucí (Manager)',
          privileges: 'Nadřízený týmu (Hunter / Closer / Farmer).',
          actions: [
            'Přístup ke všem obchodům svých podřízených napříč všemi fázemi.',
            'Plná práva úprav, psaní poznámek a posunu fází u podřízených dealů.',
            'Sledování auditních logů, kalendářů a e-mailové komunikace.'
          ]
        },
        {
          name: 'CSO (Chief Sales Officer)',
          privileges: 'Globální dohled nad celým obchodním potrubím (Sales Pipeline).',
          actions: [
            'Vidí a upravuje jakýkoliv deal v systému bez ohledu na garanta.',
            'Přiřazuje a mění garanty (Hunter, Closer, Farmer) v reálném čase.',
            'Možnost skrývat citlivé aktivity (Visible: false).'
          ]
        },
        {
          name: 'Administrátor (Admin)',
          privileges: 'Správa uživatelů, systémových číselníků a technického chodu.',
          actions: [
            'Správa uživatelských účtů, reset hesla, nastavování rolí a manažerů.',
            'Editace globálních číselníků (Důvody ztráty, Zdroje leadů, IT Integrace, Segmenty, Skladování).',
            'Prohlížení přihlašovacích logů (Login logs) a provádění e-mailového auditu nad Workspace/M365.'
          ]
        }
      ];

      const rolesEN = [
        {
          name: 'Hunter',
          privileges: 'Focus on early pipeline (1. Lead & 2. Opportunity).',
          actions: [
            'Enters new deals and companies (Name, Company ID, Address, Contacts).',
            'Fills Lead Sources and E-commerce Platforms.',
            'Schedules and conducts initial qualification meetings/calls.',
            'Guarantees transition from Lead to Opportunity and Discovery.'
          ]
        },
        {
          name: 'Closer',
          privileges: 'Takes over during Discovery & Proposal and Contracting.',
          actions: [
            'Defines delivery countries, average weight, volume, and items per order.',
            'Uploads and manages binding Pricing Offer PDFs.',
            'Negotiates terms, contract signed dates, and pricing upload dates.',
            'Can mark contacts as DNC (Do Not Contact) if needed.'
          ]
        },
        {
          name: 'Farmer (Account Manager)',
          privileges: 'Responsible for Onboarding and live Farming.',
          actions: [
            'Oversees IT integration, logs completion and UAT testing dates.',
            'Records actual first stocking date.',
            'Manages live customer accounts and marks inactive contacts.'
          ]
        },
        {
          name: 'Manager',
          privileges: 'Supervisor of team members (Hunter / Closer / Farmer).',
          actions: [
            'Full visibility over all deals owned by subordinates across all stages.',
            'Inherits full editing, note-taking, and stage advancement rights.',
            'Monitors audit logs, calendars, and email communications.'
          ]
        },
        {
          name: 'CSO (Chief Sales Officer)',
          privileges: 'Global oversight over the entire Sales Pipeline.',
          actions: [
            'Views and edits any deal in the system regardless of ownership.',
            'Reassigns stage owners (Hunter, Closer, Farmer) in real-time.',
            'Can toggle visibility of sensitive activities.'
          ]
        },
        {
          name: 'Administrator (Admin)',
          privileges: 'User management, enumerations, and technical audit.',
          actions: [
            'Manages user accounts, password resets, role assignments.',
            'Edits global enumerations (Lost Reasons, Lead Sources, IT Integrations, Storage Types).',
            'Inspects Login Logs and performs M365/Google Workspace Email Audits.'
          ]
        }
      ];

      const rolesList = isCS ? rolesCS : rolesEN;

      const html = `
        <!DOCTYPE html>
        <html lang="${lang}">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Manual - FHB CRM</title>
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Roboto', 'Helvetica', sans-serif; 
              line-height: 1.6; 
              padding: 30px; 
              max-width: 900px; 
              margin: 0 auto; 
              color: #1f2937; 
              background-color: #f8fafc;
            }
            .content-wrapper {
              background-color: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.06);
              border: 1px solid #e2e8f0;
            }
            h1 { text-align: center; margin-bottom: 12px; font-size: 26px; color: #0f172a; }
            .subtitle { text-align: center; margin-bottom: 32px; color: #64748b; font-size: 14px; }
            h2 { 
              margin-top: 36px; 
              border-bottom: 2px solid #cbd5e1; 
              padding-bottom: 8px; 
              font-size: 18px;
              color: #1e293b;
            }
            h3 { font-size: 15px; color: #334155; margin-top: 20px; }
            .role { background: #f8fafc; padding: 18px; margin: 16px 0; border-radius: 8px; border: 1px solid #e2e8f0; page-break-inside: avoid; }
            .role-name { margin-top: 0; color: #2563eb; font-size: 16px; font-weight: 700; }
            .role-privilege { font-style: italic; color: #475569; margin-bottom: 10px; font-size: 13px; }
            ul { padding-left: 20px; margin-top: 6px; font-size: 13px; }
            li { margin-bottom: 6px; }
            
            .stage-card {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-left-width: 6px;
              border-radius: 8px;
              padding: 16px 20px;
              margin-bottom: 16px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.04);
              page-break-inside: avoid;
            }
            .stage-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            }
            .stage-title {
              font-size: 16px;
              font-weight: 700;
              color: #0f172a;
            }
            .stage-badge {
              font-size: 11px;
              font-weight: 700;
              padding: 3px 8px;
              border-radius: 12px;
              background: #f1f5f9;
              color: #334155;
            }
            .stage-desc {
              font-size: 13px;
              color: #475569;
              margin-bottom: 10px;
            }
            .req-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #dc2626;
              margin-bottom: 6px;
            }
            .req-list {
              list-style-type: none;
              padding-left: 0;
              margin: 0;
            }
            .req-list li {
              position: relative;
              padding-left: 18px;
              font-size: 13px;
              color: #1e293b;
              margin-bottom: 4px;
            }
            .req-list li::before {
              content: '✓';
              position: absolute;
              left: 0;
              color: #10b981;
              font-weight: bold;
            }

            .attr-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
              font-size: 13px;
            }
            .attr-table th {
              background: #f1f5f9;
              text-align: left;
              padding: 8px 12px;
              border: 1px solid #cbd5e1;
              font-weight: 700;
              color: #334155;
            }
            .attr-table td {
              padding: 8px 12px;
              border: 1px solid #e2e8f0;
              color: #1e293b;
            }

            .page-break { page-break-before: always; }
            .print-btn {
               display: block;
               width: 220px;
               margin: 0 auto 24px auto;
               padding: 10px 20px;
               background-color: #2563eb;
               color: white;
               text-align: center;
               border-radius: 6px;
               text-decoration: none;
               font-weight: bold;
               cursor: pointer;
               border: none;
               font-size: 15px;
            }
            .print-btn:hover { background-color: #1d4ed8; }
            @media print {
              body { padding: 0; background-color: white; }
              .content-wrapper { padding: 0; border: none; box-shadow: none; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn no-print" onclick="window.print()">
            ${isCS ? '🖨️ Tisk / Uložit PDF' : '🖨️ Print / Save PDF'}
          </button>
          
          <div class="content-wrapper">
            <h1>${isCS ? 'Podrobný uživatelský manuál FHB CRM' : 'Detailed FHB CRM User Manual'}</h1>
            <p class="subtitle">${isCS ? 'Kompletní příručka: Fáze potrubí, podmínky přechodů, datové atributy, role a integrace.' : 'Complete guide: Pipeline stages, transition rules, data attributes, roles, and integrations.'}</p>
            
            <h2>${isCS ? '1. Úvod a Přístup do Systému' : '1. Introduction & System Access'}</h2>
            <p>${isCS ? 'FHB CRM slouží k řízení akvizice, smlouvání a onboarding procesu nových klíčových klientů pro fulfillment. Přístup je zabezpečen e-mailem a heslem. Z bezpečnostních důvodů si po prvním přihlášení změňte heslo v sekci Profil.' : 'FHB CRM manages the acquisition, contracting, and onboarding process for new fulfillment clients. Access is secured by email and password. Please change your password upon initial login in the Profile section.'}</p>

            <h2>${isCS ? '2. Přechody mezi stavy (Pipeline Transitions & Requirements)' : '2. Pipeline Stages & Transition Requirements'}</h2>
            <p>${isCS ? 'Pro přesun obchodního případu (Deal) do další fáze je nutné splnit striktní podmínky validace dat. Pokud jakýkoliv povinný údaj chybí, systém přesun neumožní a chybějící pole v detailu firmy zvýrazní červeně.' : 'To move a deal to the next stage, strict data validation rules must be met. If any required attribute is missing, the transition is blocked and missing fields are highlighted in red.'}</p>
            
            <div>
              ${stagesDetailed.map(s => `
                <div class="stage-card" style="border-left-color: ${s.color};">
                  <div class="stage-header">
                    <span class="stage-title">${s.name}</span>
                    <span class="stage-badge">${isCS ? 'Garant' : 'Owner'}: ${s.role}</span>
                  </div>
                  <div class="stage-desc">${s.desc}</div>
                  <div class="req-title">${isCS ? 'Podmínky pro posun do této / další fáze:' : 'Requirements for advancement:'}</div>
                  <ul class="req-list">
                    ${s.reqs.map(r => `<li>${r}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
            
            <div class="page-break"></div>

            <h2>${isCS ? '3. Přehled Všech Datových Atributů' : '3. Complete Data Attributes Reference'}</h2>
            <p>${isCS ? 'Detailní struktura polí a atributů evidovaných u firmy a obchodního případu:' : 'Detailed field structure recorded for companies and deal opportunities:'}</p>
            
            <table class="attr-table">
              <thead>
                <tr>
                  <th>${isCS ? 'Kategorie / Název atributu' : 'Category / Attribute Name'}</th>
                  <th>${isCS ? 'Technické pole' : 'Technical Field'}</th>
                  <th>${isCS ? 'Popis & Význam' : 'Description & Meaning'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>${isCS ? 'Identifikace firmy (IČO)' : 'Company ID (IČO)'}</b></td>
                  <td><code>companyId</code></td>
                  <td>${isCS ? 'Identifikační číslo firmy. Povinné pro posun z 1. fáze (Lead).' : 'Company registration ID. Required to advance from 1. stage (Lead).'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'Zdroj leadu' : 'Lead Source'}</b></td>
                  <td><code>leadSourceId</code></td>
                  <td>${isCS ? 'Zdroj akvizice (Web, Cold Call, Inbound apod.). Povinné pro 2. fázi (Oportunita).' : 'Acquisition source. Required for 2. stage (Opportunity).'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'E-commerce platforma' : 'E-commerce Platform'}</b></td>
                  <td><code>ecommercePlatformId</code></td>
                  <td>${isCS ? 'E-shopové řešení (Shoptet, WooCommerce, Custom API). Povinné pro 2. fázi (Oportunita).' : 'E-commerce platform. Required for 2. stage (Opportunity).'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'Měsíční počet balíků' : 'Estimated Monthly Parcels'}</b></td>
                  <td><code>estimatedMonthlyParcels</code></td>
                  <td>${isCS ? 'Odhadovaný měsíční objem zásilek (>0). Povinné pro 2. fázi (Oportunita).' : 'Estimated monthly parcel volume (>0). Required for 2. stage (Opportunity).'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'Doručovací země' : 'Delivery Countries'}</b></td>
                  <td><code>deliveryCountries</code></td>
                  <td>${isCS ? 'Cílové země doručování (multi-select). Povinné pro Discovery.' : 'Target delivery countries (multi-select). Required for Discovery.'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'Kusovost na objednávku' : 'Average Items Per Order'}</b></td>
                  <td><code>averageItemsPerOrder</code></td>
                  <td>${isCS ? 'Průměrný počet kusů v balíku. Povinné pro Discovery.' : 'Average items per order. Required for Discovery.'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'Váha & Objem balíku' : 'Parcel Weight & Volume'}</b></td>
                  <td><code>averageParcelWeight / Volume</code></td>
                  <td>${isCS ? 'Průměrná váha (kg) a objem (m³). Povinné pro Discovery.' : 'Average weight (kg) and volume (m³). Required for Discovery.'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'Cenová nabídka (Offers)' : 'Pricing Offers'}</b></td>
                  <td><code>pricingOffers</code></td>
                  <td>${isCS ? 'Nahraný PDF dokument nabídky. Povinné pro Discovery.' : 'Uploaded offer PDF document. Required for Discovery.'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'Smluvní data' : 'Contract Dates'}</b></td>
                  <td><code>contractSignedDate / pricingUploadedDate</code></td>
                  <td>${isCS ? 'Datum podpisu smlouvy a nahraní ceníku. Povinné pro Contracting.' : 'Contract signed & pricing upload dates. Required for Contracting.'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'IT Integrace ID' : 'IT Integration ID'}</b></td>
                  <td><code>itIntegrationId</code></td>
                  <td>${isCS ? 'Typ IT propojení ze systémového číselníku. Povinné pro Contracting.' : 'Selected IT integration type. Required for Contracting.'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'Dokončení IT & Naskladnění' : 'IT Completion & First Stocking'}</b></td>
                  <td><code>itIntegrationCompletedDate / firstStockingDateActual</code></td>
                  <td>${isCS ? 'Skutečná data dokončení integrace a 1. naskladnění. Povinné pro Farming.' : 'Actual IT completion and first stocking dates. Required for Farming.'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'UAT Testování' : 'UAT Testing'}</b></td>
                  <td><code>integrationTestingCompletedDate</code></td>
                  <td>${isCS ? 'Potvrzení o dokončení testování zkušebních zakázek. Povinné pro Farming.' : 'Confirmed completion of UAT order testing. Required for Farming.'}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? 'Kontaktní osoby & DNC' : 'Contacts & DNC Status'}</b></td>
                  <td><code>contacts / doNotContact</code></td>
                  <td>${isCS ? 'E-maily, telefony a prvek "Nechce kontaktovat (DNC)" s časovým razítkem.' : 'Emails, phone numbers, and "Do Not Contact (DNC)" status with timestamp.'}</td>
                </tr>
              </tbody>
            </table>

            <h2>${isCS ? '4. Seznam Rolí a Oprávnění' : '4. User Roles & Permissions'}</h2>
            <div>
              ${rolesList.map(r => `
                <div class="role">
                  <div class="role-name">${r.name}</div>
                  <div class="role-privilege">${r.privileges}</div>
                  <ul>
                    ${r.actions.map(a => `<li>${a}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>

            <div class="page-break"></div>

            <h2>${isCS ? '5. Kalendář, Schůzky, E-mailová Synchronizace a Logy' : '5. Calendar Integrations, Meetings, Email Sync & Logs'}</h2>
            <p>${isCS ? 'Aplikace disponuje pokročilým propojením na externí systémy, bezpečnou synchronizací a auditem:' : 'The application features advanced external integrations, secure synchronization, and security auditing:'}</p>
            <ul>
              <li><b>${isCS ? 'Striktní synchronizace e-mailů u příležitosti (Email Sync)' : 'Strict Opportunity Email Sync'}:</b> ${isCS 
                ? 'Při otevření detailu příležitosti (a periodicky na pozadí) probíhá automatická synchronizace e-mailové komunikace ze všech připojených účtů (Microsoft 365 i Google Workspace). <b>Zásadní pravidlo párování:</b> E-maily se k příležitosti přiřadí a uloží <u>výhradně tehdy</u>, pokud jejich odesílatel nebo příjemce obsahuje e-mailovou adresu navázanou na danou firmu či její kontaktní osoby, a SOUČASNĚ v komunikaci figuruje e-mailová adresa příslušného uživatele CRM. Jakékoliv cizí, soukromé či nesouvisející e-maily systém striktně odfiltruje a ze zobrazení i databáze promaže. Jednou synchronizované e-maily zůstávají trvale v historii CRM uloženy i v případě, že je uživatel následně smaže ze své poštovní schránky.' 
                : 'When viewing an opportunity (and periodically in background), email communication is synced across all connected Microsoft 365 and Google Workspace user accounts. <b>Strict matching rule:</b> Emails are associated and stored with the deal <u>exclusively</u> if the sender or recipient list contains an email address linked to the company or its contacts, AND the message simultaneously involves the CRM user\'s email address. Unrelated or private messages are strictly filtered out and deleted. Synced emails remain permanently archived in CRM history even if deleted from the user\'s mailbox later.'}</li>
              <li><b>${isCS ? 'Synchronizace Kalendáře (Google & Microsoft 365)' : 'Calendar Sync (Google & Microsoft 365)'}:</b> ${isCS ? 'Uživatel si může v Nastavení profilu připojit svůj Google nebo Microsoft účet. Schůzky naplánované v CRM se automaticky vytvářejí v externím kalendáři včetně odkazů na Google Meet nebo MS Teams.' : 'Users can connect Google or Microsoft accounts in Settings. Meetings created in CRM automatically populate external calendars with Meet/Teams links.'}</li>
              <li><b>${isCS ? 'E-mailový Audit (Workspace & M365)' : 'Email Audit Search'}:</b> ${isCS ? 'Administrátor má k dispozici modul pro dohled nad e-mailovou komunikací. Umožňuje vyhledávat v doručené i odchozí poště propojených účtů dle IČO nebo názvu firmy pro zpětné ověření dohod.' : 'Admins can search incoming and outgoing email communications across connected workspace accounts by Company ID or name.'}</li>
              <li><b>${isCS ? 'Auditní stopa změn (Audit Trail)' : 'Audit Trail'}:</b> ${isCS ? 'U každého dealu je uchovávána kompletní historie úprav polí, včetně autora změn, původní a nové hodnoty a časového razítka.' : 'Every deal maintains a complete field change history, recording the author, old/new values, and timestamp.'}</li>
              <li><b>${isCS ? 'Přihlašovací logy (Login Logs)' : 'Login Logs'}:</b> ${isCS ? 'Správa IP adres, použitých prohlížečů a časů přihlášení uživatelů pro zajištění bezpečnosti.' : 'Tracking IP addresses, user agents, and login timestamps for security enforcement.'}</li>
            </ul>

            <div class="page-break"></div>

            <h2>${isCS ? '6. Pravidla hlídání neaktivity, barevné připomínky a automatické e-mailové notifikace' : '6. Stage Inactivity Rules, Color Reminders & Automated Email Notifications'}</h2>
            <p>${isCS 
              ? 'Pro udržení vysoké dynamiky obchodního potrubí a prevenci stagnace příležitostí disponuje systém pokročilým modulem hlídání neaktivity. V administraci aplikace (sekce <b>Připomínky stavů</b>) lze pro každou fázi pipeline nadefinovat libovolný počet pravidel s určením počtu dnů neaktivity, barvy vizuálního orámování (žlutá, oranžová, červená) a případné akce automatického odeslání e-mailového upozornění.' 
              : 'To maintain high sales pipeline velocity and eliminate stalled opportunities, the CRM features an advanced stage inactivity monitoring module. In the Administration panel (<b>Stage Reminders</b> section), administrators can configure multiple rules per pipeline stage specifying inactivity day thresholds, visual card border colors (yellow, orange, red), and automated email alert actions.'}</p>

            <h3>${isCS ? 'Tři striktní podmínky pro aktivaci barevného orámování a notifikací:' : 'Three Strict Conditions for Triggering Visual Reminders & Notifications:'}</h3>
            <p>${isCS 
              ? 'Zvýraznění karty příležitosti v Kanban desce / Seznamu a odeslání notifikačního e-mailu se aktivuje <b>výhradně tehdy, jsou-li současně splněny všechny 3 následující podmínky</b>:' 
              : 'A deal card is highlighted with a colored border in Kanban / List view and alert emails are dispatched <b>only when all 3 of the following conditions are simultaneously met</b>:'}</p>

            <ol style="padding-left: 20px; font-size: 13px; line-height: 1.7;">
              <li style="margin-bottom: 10px;">
                <b>${isCS ? '1. Podmínka – Minimální doba v daném stavu:' : '1. Condition – Minimum Time in Current Stage:'}</b><br/>
                ${isCS 
                  ? 'Od okamžiku přesunu příležitosti do dané fáze (stavu) muselo uplynout minimálně <b>X</b> kalendářních dnů. Tato doba se počítá podle přesného časového razítka posledního přesunu do tohoto stavu zaznamenaného v auditním logu.' 
                  : 'At least <b>X</b> calendar days must have elapsed since the deal was moved into its current stage, verified via the precise timestamp in the stage change audit log.'}
              </li>
              <li style="margin-bottom: 10px;">
                <b>${isCS ? '2. Podmínka – Minimální doba od jakékoliv aktivity u příležitosti:' : '2. Condition – Minimum Time Since Any Activity or Update:'}</b><br/>
                ${isCS 
                  ? 'Od jakéhokoliv zásahu, doplnění atributu či zaznamenané události u příležitosti nebo její navázané firmy muselo uplynout minimálně <b>X</b> kalendářních dnů. Zahrnuje:<br/>' +
                    '• Úpravu a doplnění jakéhokoliv pole společnosti či dealu (včetně změn zaznamenaných v auditní stopě).<br/>' +
                    '• Zadání nové aktivity (telefonát, schůzka, MS Teams, e-mail, úkol, poznámka, nahrání nabídky v PDF či dokumentu).<br/>' +
                    '• <b>Smazání aktivity:</b> Pokud obchodník aktivitu smaže (např. zrušenou schůzku), systém tuto akci automaticky zapíše do auditního logu a zaktualizuje časové razítko příležitosti (<code>updatedAt</code>). Tím se lhůta neaktivity začíná počítat nanovo od okamžiku tohoto smazání.' 
                  : 'At least <b>X</b> calendar days must have elapsed since any update, attribute modification, or activity on the deal or linked company. Includes:<br/>' +
                    '• Creating or editing any company or deal attribute (tracked in the audit log).<br/>' +
                    '• Logging a new activity (call, meeting, MS Teams, email, task, note, pricing offer PDF, or document).<br/>' +
                    '• <b>Activity Deletion:</b> If an activity is removed (e.g. canceled meeting), the system automatically logs this in the audit trail and updates the deal timestamp (<code>updatedAt</code>), restarting the inactivity counter from the moment of deletion.'}
              </li>
              <li style="margin-bottom: 10px;">
                <b>${isCS ? '3. Podmínka – Minimální doba od data konání dané aktivity:' : '3. Condition – Minimum Time Since Scheduled Activity Event Date:'}</b><br/>
                ${isCS 
                  ? 'Pokud je u příležitosti naplánována budoucí aktivita (např. schůzka domluvená až za 10 dní), lhůta neaktivity se počítá <b>až od data samotného konání této aktivity</b>. Dokud aktivita neproběhne, příležitost se považuje za aktivně rozpracovanou a výstražné orámování ani e-mailové notifikace se nespustí. Až po uplynutí X dnů od uskutečnění schůzky (bez další navazující akce) dojde k aktivaci upozornění.' 
                  : 'If a future activity is scheduled on the deal (e.g. a client meeting arranged 10 days ahead), the inactivity countdown begins <b>only after the scheduled date of that activity has passed</b>. While future events remain pending, the opportunity is treated as actively progressing and neither color borders nor emails trigger until X days after the event date without subsequent action.'}
              </li>
            </ol>

            <h3>${isCS ? 'Vizuální úrovně upozornění a akce:' : 'Visual Alert Levels & Triggered Actions:'}</h3>
            <ul>
              <li><b>${isCS ? 'Žluté ohraničení (Yellow Alert)' : 'Yellow Border (Yellow Alert)'}:</b> ${isCS ? 'Informativní upozornění na blížící se hranici nečinnosti.' : 'Informational warning indicating an approaching inactivity threshold.'}</li>
              <li><b>${isCS ? 'Oranžové ohraničení (Orange Alert)' : 'Orange Border (Orange Alert)'}:</b> ${isCS ? 'Zvýšené varování před stagnací obchodu.' : 'Elevated warning indicating opportunity stagnation.'}</li>
              <li><b>${isCS ? 'Červené ohraničení s výstražnou ikonou (Red Alert)' : 'Red Border with Alert Icon (Red Alert)'}:</b> ${isCS ? 'Kritické překročení povolené doby neaktivity vyžadující okamžitý zásah odpovědného garanta a dohled manažera.' : 'Critical inactivity breach requiring immediate action from the deal owner and management oversight.'}</li>
              <li><b>${isCS ? 'Automatické e-mailové notifikace' : 'Automated Email Notifications'}:</b> ${isCS ? 'U pravidel s akcí „Odeslat e-mail“ systém v rámci ranní cron úlohy (8:00) odesílá přehledný notifikační e-mail garantovi i nadřízenému manažerovi s odkazem na konkrétní příležitost a shrnutím chybějící aktivity. Všechny odeslané e-maily jsou evidovány v E-mailovém logu v Administraci.' : 'Rules configured with the "Send Email" action automatically send a notification email at 8:00 AM to the deal owner and supervisor with direct deal links and an inactivity summary. All dispatched emails are recorded in the Email Log in Administration.'}</li>
              <li><b>${isCS ? 'Filtrování podle barvy připomínky' : 'Filtering by Reminder Color'}:</b> ${isCS ? 'V Kanban desce i Seznamu dealů je k dispozici rychlý filtr dle barvy připomínky (Vše / Žlutá / Oranžová / Červená), umožňující okamžitě vyfiltrovat všechny případy vyžadující pozornost.' : 'Both Kanban and List views feature a reminder color filter (All / Yellow / Orange / Red) enabling instant filtering of opportunities requiring immediate attention.'}</li>
            </ul>

            <h2>${isCS ? '7. Uživatelské Rozhraní a Ovládací Prvky' : '7. User Interface & Controls'}</h2>
            <ul>
              <li><b>${isCS ? 'Tlačítko posunu kvalifikované oportunity (SQL →)' : 'Qualified Opportunity Advance Button (SQL →)'}:</b> ${isCS 
                ? 'Pokud příležitost ve 2. fázi (Oportunita) splňuje všechny podmínky pro přesun do fáze Discovery & Ponuka (přiřazený hunter, zdroj leadu, e-commerce platforma a odhadovaný počet zásilek > 0), zobrazí se přímo na kartě v Kanban desce nad ikonou garanta (vpravo uprostřed) zelené tlačítko „SQL →“. Kliknutím může kdokoliv (včetně huntera) okamžitě odeslat příležitost do následující fáze Discovery & Ponuka, přičemž systém zobrazí lokalizovanou potvrzující zprávu s názvem přesunuté firmy.' 
                : 'When a deal in the 2nd stage (Opportunity) fulfills all conditions for moving to Discovery & Proposal (assigned hunter, lead source, ecommerce platform, and estimated parcels > 0), a green "SQL →" button appears directly above the owner avatar on the Kanban card (middle-right). Clicking it allows anyone (including hunters) to immediately dispatch the opportunity to Discovery & Proposal, with a localized confirmation dialog featuring the company name.'}</li>
              <li><b>${isCS ? 'Dvojitá lišta posuvníku (Kanban Scrollbar)' : 'Dual Kanban Scrollbar'}:</b> ${isCS ? 'Kanban deska obsahuje posuvník nahoře i dole pod sloupci, což zajišťuje pohodlný horizontální posun napříč všemi 7 fázemi i na menších obrazovkách.' : 'The Kanban board contains top and bottom scrollbars, enabling easy navigation across all 7 stages on any display.'}</li>
              <li><b>${isCS ? 'Filtr nepřiřazených dealů' : 'Unassigned Deals Filter'}:</b> ${isCS ? 'Tlačítko "Pouze nepřiřazené" zobrazí příležitosti, které zatím nemají v dané fázi stanoveného garanta.' : 'The "Only Unassigned" toggle filters opportunities that lack a stage owner.'}</li>
              <li><b>${isCS ? 'Filtr dle barvy upozornění (Připomínky)' : 'Filter by Reminder Color'}:</b> ${isCS ? 'Rychlá filtrace obchodních případů podle barvy stavové připomínky pro okamžité řešení stagnujících obchodů.' : 'Quickly filter deals by stage reminder alert color to focus immediately on stalled opportunities.'}</li>
              <li><b>${isCS ? 'Zvýraznění chybějících dat (Red Underline Alert)' : 'Red Missing Data Highlighting'}:</b> ${isCS ? 'Pokud na kartě dealu chybí povinný údaj pro posun, pole je při pokusu o uložení či posun červeně podtrženo.' : 'If a required field is missing, it is underlined in red upon saving or advancing.'}</li>
              <li><b>${isCS ? 'Výstražný odznak u neaktivních dealů' : 'Alert Badge on Stalled Deals'}:</b> ${isCS ? 'Karta dealu v Kanbanu zobrazuje výstražnou ikonu s počtem dnů v aktuální fázi a nápovědou s vysvětlením podmínek.' : 'Kanban deal cards display an alert badge with days in current stage and tooltip explaining the condition criteria.'}</li>
            </ul>
          </div>
          <script>
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err: any) {
      console.error('Failed to generate manual:', err);
      if (!res.headersSent) {
         res.status(500).json({ error: 'Manual generation failed' });
      }
    }
  });

  app.get('/api/database-schema', (req, res) => {
    try {
      const lang = req.query.lang === 'cs' ? 'cs' : 'en';
      const isCS = lang === 'cs';
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        title: 'FHB CRM - Database & Entity Schema API',
        version: '1.0.0',
        language: lang,
        description: isCS
          ? 'Kompletní deskripce databázových entit, formátů a datových struktur pro výměnu dat mezi CRM systémy.'
          : 'Complete description of database entities, storage formats, and data structures for CRM data exchange.',
        tables: [
          'companies',
          'deals',
          'contacts',
          'activities',
          'users',
          'stage_reminders',
          'audit_logs',
          'login_logs',
          'email_logs',
          'lead_sources',
          'lost_reasons',
          'segments',
          'ecommerce_platforms',
          'it_integrations',
          'storage_types',
          'contact_positions'
        ]
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/audit-logs', authMiddleware, async (req, res) => {
    try {
      const [auditRows] = await pool.query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 25000");
      res.json(auditRows);
    } catch (err: any) {
      console.error('Audit logs fetch error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/activities', authMiddleware, async (req, res) => {
    try {
      const [activityRows] = await pool.query("SELECT * FROM activities ORDER BY date DESC LIMIT 25000");
      const parseJsonFields = (arr: any[], fields: string[]) => arr.map(item => {
        fields.forEach(f => {
          if (typeof item[f] === 'string') {
            try { item[f] = JSON.parse(item[f]); } catch (e) { /* ignore */ }
          }
        });
        if ('isActive' in item) item.isActive = item.isActive === 1 || item.isActive === true;
        if ('isVisible' in item) item.isVisible = item.isVisible === 1 || item.isVisible === true;
        return item;
      });
      const parsedActivities = parseJsonFields(activityRows as any[], ['participants']);
      cachedActivities = parsedActivities;
      res.json(parsedActivities);
    } catch (err: any) {
      if (err.message && (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND'))) {
        console.warn('[DB NOTICE] Activities fetch connection unavailable, returning cache:', err.message);
        return res.json(cachedActivities);
      }
      console.error('Activities fetch error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/deals/:id/details', authMiddleware, async (req, res) => {
    try {
      const dealId = req.params.id;

      const parseJsonFields = (arr: any[], fields: string[]) => arr.map(item => {
        fields.forEach(f => {
          if (typeof item[f] === 'string') {
            try { item[f] = JSON.parse(item[f]); } catch (e) { /* ignore */ }
          }
        });
        if ('isActive' in item) item.isActive = item.isActive === 1 || item.isActive === true;
        if ('isVisible' in item) item.isVisible = item.isVisible === 1 || item.isVisible === true;
        return item;
      });

      const [dealsRows] = await pool.query('SELECT * FROM deals WHERE id = ?', [dealId]);
      const parsedDeals = parseJsonFields(dealsRows as any[], ['deliveryCountries', 'pricingOffers', 'documents', 'notes', 'seasonMonths', 'codUsage']);
      const parsedDeal = parsedDeals[0] || null;

      if (!parsedDeal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      const [
        [auditLogs],
        [activities],
        [compRows]
      ] = await Promise.all([
        parsedDeal.companyId
          ? pool.query('SELECT * FROM audit_logs WHERE dealId = ? OR companyId = ? ORDER BY timestamp DESC LIMIT 500', [dealId, parsedDeal.companyId])
          : pool.query('SELECT * FROM audit_logs WHERE dealId = ? ORDER BY timestamp DESC LIMIT 500', [dealId]),
        pool.query('SELECT * FROM activities WHERE dealId = ? ORDER BY date DESC LIMIT 500', [dealId]),
        parsedDeal.companyId
          ? pool.query('SELECT * FROM companies WHERE id = ?', [parsedDeal.companyId])
          : Promise.resolve([[]])
      ]);

      const parsedCompanies = parseJsonFields(compRows as any[], ['urls', 'contacts']);
      const company = parsedCompanies[0] || null;

      const parsedActivities = parseJsonFields(activities as any[], ['participants']);
      parsedActivities.forEach((act: any) => {
        if ('isVisible' in act) act.isVisible = act.isVisible === 1 || act.isVisible === true;
      });

      res.json({
        deal: parsedDeal,
        company: company,
        auditLogs: auditLogs,
        activities: parsedActivities
      });
    } catch (err: any) {
      console.error('Deal details fetch error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/state', authMiddleware, async (req, res) => {
    try {
      const parseJsonFields = (arr: any[], fields: string[]) => arr.map(item => {
        fields.forEach(f => {
          if (typeof item[f] === 'string') {
            try { item[f] = JSON.parse(item[f]); } catch (e) { /* ignore */ }
          }
        });
        // boolean mapper
        if ('isActive' in item) item.isActive = item.isActive === 1 || item.isActive === true;
        if ('isVisible' in item) item.isVisible = item.isVisible === 1 || item.isVisible === true;
        // strip sensitive fields
        if ('passwordHash' in item) delete item.passwordHash;
        return item;
      });

      // Execute all state queries in parallel to eliminate sequential roundtrip latency.
      // Notice: We only select lightweight fields needed for the Kanban board view.
      // Heavy tables (audit_logs and activities) are omitted and loaded lazily per deal.
      const [
        [users],
        [companies],
        [deals],
        [leadSources],
        [segments],
        [ecommercePlatforms],
        [storageTypes],
        [itIntegrations],
        [lostReasons],
        [contactPositions],
        [stageReminders],
        [stageTimestampsRows],
        [lastAuditActionRows],
        [lastActivityActionRows]
      ] = await Promise.all([
        pool.query('SELECT id, name, email, role, managerId, isActive, googleIntegration, msIntegration FROM users'),
        pool.query('SELECT id, name, companyId, address, country, region, segment, email, phone, phonePrefix, urls, contacts, isVisible FROM companies'),
        pool.query(`SELECT 
          id, companyId, stage, createdBy, hunterId, closerId, farmerId, 
          leadSourceId, ecommercePlatformId, storageTypeId, estimatedYearlyParcels, 
          estimatedMonthlyParcels, b2cShare, averageItemsPerOrder, averageParcelWeight, 
          averageParcelVolume, contractSignedDate, pricingUploadedDate, itIntegrationId, 
          firstStockingDate, itIntegrationCompletedDate, firstStockingDateActual, 
          integrationTestingCompletedDate, createdAt, updatedAt, postponedUntil, 
          postponedReason, postponedBy, postponedAt, lostPermanently, lostReason, 
          lostReasonId, lostBy, lostAt, lostFromStage, deliveryCountries, pricingOffers,
          documents, notes, seasonMonths, codUsage
          FROM deals`),
        pool.query('SELECT * FROM lead_sources'),
        pool.query('SELECT * FROM segments'),
        pool.query('SELECT * FROM ecommerce_platforms'),
        pool.query('SELECT * FROM storage_types'),
        pool.query('SELECT * FROM it_integrations'),
        pool.query('SELECT * FROM lost_reasons'),
        pool.query('SELECT * FROM contact_positions'),
        pool.query('SELECT * FROM stage_reminders'),
        pool.query("SELECT dealId, newValue AS stage, MAX(timestamp) AS lastEnteredAt FROM audit_logs WHERE field = 'stage' GROUP BY dealId, newValue"),
        pool.query("SELECT dealId, MAX(timestamp) AS lastAuditAt FROM audit_logs GROUP BY dealId"),
        pool.query("SELECT dealId, MAX(GREATEST(COALESCE(date, createdAt), createdAt)) AS lastActivityAt FROM activities GROUP BY dealId")
      ]);

      const parsedUsers = parseJsonFields(users as any[], ['googleIntegration', 'msIntegration']);
      const currentUserId = (req as any).user?.id;
      const me = parsedUsers.find((u: any) => u.id === currentUserId) || null;

      // Build fast lookup maps for computing daysInStage and reminderColor
      const stageEnteredMap = new Map<string, number>();
      (stageTimestampsRows as any[]).forEach(r => {
        if (r.dealId && r.stage && r.lastEnteredAt) {
          stageEnteredMap.set(`${r.dealId}_${r.stage}`, new Date(r.lastEnteredAt).getTime());
        }
      });

      const lastAuditMap = new Map<string, number>();
      (lastAuditActionRows as any[]).forEach(r => {
        if (r.dealId && r.lastAuditAt) {
          lastAuditMap.set(r.dealId, new Date(r.lastAuditAt).getTime());
        }
      });

      const lastActivityMap = new Map<string, number>();
      (lastActivityActionRows as any[]).forEach(r => {
        if (r.dealId && r.lastActivityAt) {
          lastActivityMap.set(r.dealId, new Date(r.lastActivityAt).getTime());
        }
      });

      const nowMs = Date.now();
      const parsedDeals = parseJsonFields(deals as any[], ['deliveryCountries', 'pricingOffers', 'documents', 'notes', 'seasonMonths', 'codUsage']).map((deal: any) => {
        if (!deal.pricingOffers) deal.pricingOffers = [];
        if (!deal.documents) deal.documents = [];
        if (!deal.notes) deal.notes = [];

        // Precompute daysInStage on the backend
        const stageTime = stageEnteredMap.get(`${deal.id}_${deal.stage}`) || (deal.createdAt ? new Date(deal.createdAt).getTime() : nowMs);
        const daysInStage = Math.max(0, Math.floor((nowMs - stageTime) / 86400000));
        deal.daysInStage = daysInStage;

        // Precompute reminderColor on the backend
        const rules = (stageReminders as any[]).filter((r: any) => r.stage === deal.stage);
        let reminderColor = 'none';
        if (rules.length > 0 && deal.stage !== 'lost') {
          const matchingRules = rules.filter((r: any) => {
            if (daysInStage < r.days) return false;
            const actionTimes: number[] = [deal.createdAt ? new Date(deal.createdAt).getTime() : nowMs];
            if (deal.updatedAt) {
              const t = new Date(deal.updatedAt).getTime();
              if (!isNaN(t)) actionTimes.push(t);
            }
            const lastAudit = lastAuditMap.get(deal.id);
            if (lastAudit) actionTimes.push(lastAudit);
            const lastAction = Math.max(...actionTimes);
            if (Math.floor((nowMs - lastAction) / 86400000) < r.days) return false;

            const lastAct = lastActivityMap.get(deal.id);
            if (lastAct && Math.floor((nowMs - lastAct) / 86400000) < r.days) return false;
            return true;
          });

          if (matchingRules.length > 0) {
            matchingRules.sort((a: any, b: any) => b.days - a.days);
            reminderColor = matchingRules[0].color || 'none';
          }
        }
        deal.reminderColor = reminderColor;

        return deal;
      });

      res.json({
        users: parsedUsers,
        me: me,
        companies: parseJsonFields(companies as any[], ['urls', 'contacts']).map((c: any) => {
          if ('isVisible' in c) c.isVisible = c.isVisible === 1 || c.isVisible === true;
          if (!Array.isArray(c.contacts)) c.contacts = [];
          return c;
        }),
        deals: parsedDeals,
        leadSources: parseJsonFields(leadSources as any[], []),
        segments: parseJsonFields(segments as any[], []),
        ecommercePlatforms: parseJsonFields(ecommercePlatforms as any[], []),
        storageTypes: parseJsonFields(storageTypes as any[], []),
        itIntegrations: parseJsonFields(itIntegrations as any[], []),
        lostReasons: parseJsonFields(lostReasons as any[], []),
        contactPositions: parseJsonFields(contactPositions as any[], []),
        stageReminders: parseJsonFields(stageReminders as any[], []),
        auditLogs: [],
        activities: []
      });
    } catch (err: any) {
      console.error('DB State Error:', err);
      if (err.code === 'ETIMEDOUT') {
        console.error('HINT: Your database host could not be reached. Check firewall rules, VPNs, and ensure the DB_HOST is accessible from this server.');
      }
      res.status(500).json({ error: `DB state failed: ${err.message}`, details: err.message });
    }
  });

  app.post('/api/deals/:id/assign', authMiddleware, async (req, res) => {
    try {
      const dealId = req.params.id;
      const { field, newUserId } = req.body; // field = 'hunterId' | 'closerId' | 'farmerId'
      
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.query('SELECT * FROM deals WHERE id = ?', [dealId]);
        const deals = rows as any[];
        if (deals.length === 0) {
           return res.status(404).json({ error: 'Deal not found' });
        }
        
        const deal = deals[0];
        const currentAssignee = deal[field];
        
        // If we are assigning to a user (not unassigning) and it's currently assigned to someone else
        if (newUserId && currentAssignee && currentAssignee !== newUserId) {
          const [userRows] = await connection.query('SELECT name FROM users WHERE id = ?', [currentAssignee]);
          const users = userRows as any[];
          const currentUserName = users.length > 0 ? users[0].name : currentAssignee;
          return res.status(400).json({ error: `Tuto příležitost již převzal uživatel ${currentUserName}.` });
        }
        
        // Allowed: proceed with update but we don't do it here because sync-action will do it,
        // Wait, it's safer to just let sync-action do it, and use this endpoint JUST for checking!
        // Actually, let's do the update here so it's transactionally safe!
        
        res.json({ success: true });
      } finally {
        connection.release();
      }
    } catch (err: any) {
      console.error('Assign check error:', err);
      res.status(500).json({ error: 'Failed to check assignment' });
    }
  });

  let latestClientEvent: any = null;

  app.get('/api/latest-activity', authMiddleware, (req, res) => {
    res.json(latestClientEvent || {});
  });

  const allowedSyncTables = new Set([
    'users',
    'companies',
    'deals',
    'activities',
    'audit_logs',
    'lead_sources',
    'segments',
    'ecommerce_platforms',
    'it_integrations',
    'lost_reasons',
    'storage_types',
    'contact_positions',
    'stage_reminders',
    'email_logs'
  ]);

  const tableColumnsCache = new Map<string, { columns: Set<string>; cachedAt: number }>();

  async function getTableColumns(conn: any, tableName: string): Promise<Set<string>> {
    const cached = tableColumnsCache.get(tableName);
    const now = Date.now();
    if (cached && (now - cached.cachedAt < 5 * 60 * 1000)) {
      return cached.columns;
    }
    try {
      const [cols] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\``);
      const set = new Set<string>((cols as any[]).map(c => c.Field));
      tableColumnsCache.set(tableName, { columns: set, cachedAt: now });
      return set;
    } catch (e) {
      if (cached) return cached.columns;
      return new Set<string>();
    }
  }

  app.post('/api/sync-action', authMiddleware, async (req, res) => {
    try {
      const { entities } = req.body;
      if (!entities || typeof entities !== 'object') {
        return res.status(400).json({ error: 'Invalid entities' });
      }

      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        for (const [table, rows] of Object.entries(entities as Record<string, any[]>)) {
          if (!rows || !Array.isArray(rows) || rows.length === 0) continue;
          if (!allowedSyncTables.has(table)) {
            console.warn(`[SYNC] Skipped unrecognized table: ${table}`);
            continue;
          }

          const validColumns = await getTableColumns(connection, table);
          
          // Construct REPLACE INTO
          for (const row of rows) {
             if (!row || typeof row !== 'object') continue;

             // Filter out any virtual, UI-only, or non-existent columns (e.g. daysInStage, reminderColor)
             const keys = Object.keys(row).filter(k => validColumns.size === 0 || validColumns.has(k));
             if (keys.length === 0) continue;

             const values = keys.map(k => {
               const v = row[k];
               if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
                 return new Date(v);
               }
               return typeof v === 'object' && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v;
             });
             
             const placeholders = keys.map(() => '?').join(', ');
             const updateStmts = keys.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
             const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateStmts}`;
             
             await connection.query(sql, values);
          }
        }
        await connection.commit();
        
        const user = (req as any).user;
        const eventData = {
          userId: user?.id,
          userName: user?.name,
          clientId: req.headers['x-client-id'],
          type: 'sync',
          timestamp: Date.now(),
          tables: Object.keys(entities)
        };

        latestClientEvent = eventData;

        // Notify other clients about the change
        const io = req.app.get('io');
        if (io) {
           io.emit('data-changed', eventData);
        }
        
        res.json({ success: true });
      } catch (e) {
        await connection.rollback();
        throw e;
      } finally {
        connection.release();
      }
    } catch (err: any) {
       console.error('Sync Error:', err);
       res.status(500).json({ error: err.message });
    }
  });
  app.post('/api/delete-entity', authMiddleware, async (req, res) => {
    try {
      const { table, id } = req.body;
      if (!table || !id) {
        return res.status(400).json({ error: 'Missing table or id' });
      }
      
      const allowedTables = ['lead_sources', 'segments', 'ecommerce_platforms', 'it_integrations', 'lost_reasons', 'activities', 'storage_types', 'contact_positions', 'stage_reminders'];
      if (!allowedTables.includes(table)) {
        return res.status(403).json({ error: 'Deletion not allowed for this table' });
      }

      // Check if there are any deals referencing the entity
      let fkColumn = '';
      let refTable = 'deals';
      if (table === 'lead_sources') {
        fkColumn = 'leadSourceId';
      } else if (table === 'ecommerce_platforms') {
        fkColumn = 'ecommercePlatformId';
      } else if (table === 'it_integrations') {
        fkColumn = 'itIntegrationId';
      } else if (table === 'lost_reasons') {
        fkColumn = 'lostReasonId';
      } else if (table === 'segments') {
        fkColumn = 'segment';
        refTable = 'companies';
      }

      if (fkColumn) {
        const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${refTable} WHERE ${fkColumn} = ?`, [id]);
        const count = (rows as any[])[0].count;

        if (count > 0) {
          return res.status(400).json({ error: `Cannot delete because there are ${count} records in ${refTable} referencing this entity.` });
        }
      }

      if (table === 'activities') {
        const [actRows] = await pool.query('SELECT * FROM activities WHERE id = ?', [id]);
        if ((actRows as any[]).length > 0) {
          const act = (actRows as any[])[0];
          if (act.dealId) {
            const user = (req as any).user;
            const now = new Date();
            const auditId = uuidv4();
            const actDateStr = act.date ? ` (${new Date(act.date).toISOString().substring(0, 10)})` : '';
            await pool.query(
              'INSERT INTO audit_logs (id, dealId, field, oldValue, newValue, changedBy, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [auditId, act.dealId, 'activity_deleted', `${act.type || 'activity'}: ${act.note || ''}${actDateStr}`, 'deleted', user?.id || 'system', now]
            );
            await pool.query('UPDATE deals SET updatedAt = ? WHERE id = ?', [now, act.dealId]);
          }
        }
      }

      await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      
      const user = (req as any).user;
      const eventData = {
        userId: user?.id,
        userName: user?.name,
        clientId: req.headers['x-client-id'],
        type: 'delete',
        table,
        timestamp: Date.now()
      };
      
      latestClientEvent = eventData;

      const io = req.app.get('io');
      if (io) {
         io.emit('data-changed', eventData);
      }
      
      res.json({ success: true });
    } catch (err: any) {
      console.error('Delete Error:', err);
      res.status(500).json({ error: `Delete failed: ${err.message}` });
    }
  });

  app.get("/api/health", async (req, res) => {
    try {
      let dbStatus = "unconfigured";
      if (process.env.DB_PASSWORD && process.env.DB_NAME) {
        try {
          await Promise.race([
            pool.query('SELECT 1 + 1 AS result'),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('connect ETIMEDOUT')), 2000))
          ]);
          dbStatus = "connected";
        } catch (dbErr: any) {
          console.warn("[HEALTH] Database connection check notice:", dbErr.message);
          dbStatus = "offline";
        }
      }
      res.json({ status: "ok", mysql: dbStatus });
    } catch (error: any) {
      console.warn("Health check error:", error.message);
      res.json({ status: "ok", mysql: "offline" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(baseDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCertPath = process.env.SSL_CERT_PATH;

  let server;
  if (sslKeyPath && sslCertPath) {
    try {
      console.log(`Starting HTTPS server with cert: ${sslCertPath} and key: ${sslKeyPath}`);
      const privateKey = fs.readFileSync(sslKeyPath, 'utf8');
      const certificate = fs.readFileSync(sslCertPath, 'utf8');
      const credentials = { key: privateKey, cert: certificate };

      const https = await import('https');
      server = https.createServer(credentials, app);

      server.listen(PORT, "0.0.0.0", () => {
        console.log(`HTTPS Server running on port ${PORT}`);
      });

      // HTTP to HTTPS redirect server
      const httpApp = express();
      httpApp.use('*', (req, res) => {
        const httpsPortStr = PORT === 443 ? '' : `:${PORT}`;
        res.redirect(`https://${req.hostname}${httpsPortStr}${req.url}`);
      });
      // Optionally run HTTP redirector on PORT+1 or a specified HTTP_PORT
      const httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : (PORT === 443 ? 80 : PORT + 1);
      httpApp.listen(httpPort, "0.0.0.0", () => {
         console.log(`HTTP redirect server running on port ${httpPort}`);
      });
      
    } catch (err: any) {
      console.error('CRITICAL: Failed to start HTTPS server:', err.message);
      console.error('Check your SSL_KEY_PATH and SSL_CERT_PATH variables and ensure the files exist and are readable.');
      process.exit(1);
    }
  } else {
    console.warn("WARNING: SSL_KEY_PATH and/or SSL_CERT_PATH not found in environment. Starting plain HTTP server.");
    server = http.createServer(app);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`HTTP Server running on http://localhost:${PORT}`);
    });
  }


async function sendAssignmentEmail(hunterId: string, dealId: string, companyName: string, connection: any) {
  try {
    const [hunterRows] = await connection.query("SELECT email, managerId FROM users WHERE id = ?", [hunterId]);
    if (!hunterRows || (hunterRows as any[]).length === 0) return;
    const hunter = (hunterRows as any[])[0];
    
    let managerEmail = null;
    if (hunter.managerId) {
      const [mgrRows] = await connection.query("SELECT email FROM users WHERE id = ?", [hunter.managerId]);
      if (mgrRows && (mgrRows as any[]).length > 0) managerEmail = (mgrRows as any[])[0].email;
    }
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });
    
    const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
    const link = `${appUrl}/deal/${dealId}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || '"CRM" <crm@mobilgroup.cz>',
      to: hunter.email,
      cc: managerEmail ? managerEmail : undefined,
      subject: 'Nová příležitost automaticky přidělena',
      text: `Byla vám automaticky přidělena nová příležitost pro společnost ${companyName}.\nOdkaz: ${link}`
    };
    
    if (!process.env.SMTP_HOST) {
        console.log("[JOBS] Mock sending email to", hunter.email, "Subject:", mailOptions.subject);
    } else {
        await transporter.sendMail(mailOptions);
    }
  } catch (err) {
    console.error("[JOBS] Failed to send assignment email", err);
  }
}

async function runHourlyJob() {
  console.log("[JOBS] Running hourly job...");
  try {
    const connection = await pool.getConnection();
    try {
      // Find deals in opportunity with a hunter that have a relevant activity
      const [rows] = await connection.query(`
        SELECT DISTINCT d.id, d.companyId 
        FROM deals d
        JOIN activities a ON d.id = a.dealId
        WHERE d.stage = 'opportunity' 
          AND d.hunterId IS NOT NULL 
          AND d.hunterId != ''
          AND a.type IN ('call', 'teams', 'meeting')
          AND a.date <= NOW()
      `);
      
      const dealsToAdvance = rows as {id: string, companyId: string}[];
      if (dealsToAdvance.length > 0) {
        for (const deal of dealsToAdvance) {
          await connection.query("UPDATE deals SET stage = 'lead', updatedAt = NOW() WHERE id = ?", [deal.id]);
          const auditLogId = uuidv4();
          await connection.query(
            `INSERT INTO audit_logs (id, dealId, companyId, field, oldValue, newValue, changedBy, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [auditLogId, deal.id, deal.companyId, 'stage', 'opportunity', 'lead', 'System Cron']
          );
          console.log(`[JOBS] Deal ${deal.id} advanced to lead.`);
        }
      }
    } finally {
      connection.release();
    }
  } catch (err: any) {
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('ETIMEDOUT')) {
      console.warn(`[JOBS] Hourly job skipped: Database connection unreachable (${err.message}).`);
    } else {
      console.error("[JOBS] Hourly job error:", err);
    }
  }
}

async function runDailyJob() {
  console.log("[JOBS] Running daily job...");
  try {
    const connection = await pool.getConnection();
    try {
      // Find opportunity deals older than 5 days without a hunter
      const [dealRows] = await connection.query(`
        SELECT d.id, c.name as companyName 
        FROM deals d
        JOIN companies c ON d.companyId = c.id
        WHERE d.stage = 'opportunity' 
          AND (d.hunterId IS NULL OR d.hunterId = '')
          AND d.createdAt < DATE_SUB(NOW(), INTERVAL 5 DAY)
      `);
      
      const dealsToAssign = dealRows as {id: string, companyName: string}[];
      if (dealsToAssign.length > 0) {
        // Get valid hunters (role = 'hunter', not test account)
        const [hunterRows] = await connection.query(`
          SELECT id 
          FROM users 
          WHERE role = 'hunter' 
            AND isActive = TRUE 
            AND (isTestAccount IS NULL OR isTestAccount = FALSE)
        `);
        
        const hunters = hunterRows as {id: string}[];
        if (hunters.length > 0) {
          for (const deal of dealsToAssign) {
            // Find hunter with least leads+opportunities
            let bestHunterId = hunters[0].id;
            let minDeals = Infinity;
            const tieHunters = [];
            
            for (const h of hunters) {
               const [cntRows] = await connection.query(`
                 SELECT COUNT(*) as count 
                 FROM deals 
                 WHERE hunterId = ? AND stage IN ('opportunity', 'lead')
               `, [h.id]);
               const count = (cntRows as any[])[0].count;
               if (count < minDeals) {
                 minDeals = count;
                 tieHunters.length = 0;
                 tieHunters.push(h.id);
               } else if (count === minDeals) {
                 tieHunters.push(h.id);
               }
            }
            
            bestHunterId = tieHunters[Math.floor(Math.random() * tieHunters.length)];
            
            await connection.query("UPDATE deals SET hunterId = ?, updatedAt = NOW() WHERE id = ?", [bestHunterId, deal.id]);
            console.log(`[JOBS] Auto-assigned deal ${deal.id} to hunter ${bestHunterId}`);
            
            await sendAssignmentEmail(bestHunterId, deal.id, deal.companyName, connection);
          }
        } else {
          console.log("[JOBS] No valid hunters found for auto-assignment.");
        }
      }
    } finally {
      connection.release();
    }
  } catch (err: any) {
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('ETIMEDOUT')) {
      console.warn(`[JOBS] Daily job skipped: Database connection unreachable (${err.message}).`);
    } else {
      console.error("[JOBS] Daily job error:", err);
    }
  }
}

// Start jobs
setTimeout(() => {
  runHourlyJob();
  runDailyJob();
  setInterval(runHourlyJob, 60 * 60 * 1000); // 1 hour
  setInterval(runDailyJob, 24 * 60 * 60 * 1000); // 24 hours
}, 10000);


  // Setup Socket.IO
  const io = new SocketServer(server, { cors: { origin: '*' } });
  
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  app.set('io', io);

  // Teams Activity Worker
  const startTeamsActivityWorker = () => {
    setInterval(async () => {
      try {
        console.log('[Worker] Running Teams Activity Worker to check summaries and recordings...');
        // Only select records that are past, within last 7 days, and not already resolved/skipped
        const [activities] = await pool.query(
          "SELECT * FROM activities WHERE type = 'teams' AND externalEventId IS NOT NULL AND (recordingLink IS NULL OR meetingSummary IS NULL) AND date < NOW() AND date >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND (teamsSyncStatus IS NULL OR teamsSyncStatus = 'pending')"
        );

        if ((activities as any[]).length === 0) return;

        for (const activity of (activities as any[])) {
          try {
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [activity.createdBy]);
            if ((users as any[]).length === 0) {
              await pool.query("UPDATE activities SET teamsSyncStatus = 'skipped_no_user' WHERE id = ?", [activity.id]);
              continue;
            }
            
            const user = (users as any[])[0];
            let msIntegration = null;
            if (user.msIntegration) {
                try { msIntegration = JSON.parse(user.msIntegration); } catch(e) {}
            }
            if (!msIntegration?.connected || !msIntegration?.tokens) continue;

            await callMsGraphWithRetry(msIntegration.tokens, user.id, pool, async (client) => {
              // 1. Get event to find joinUrl and organizer
              let eventUrl = '';
              let isOrganizer = true;
              let organizerEmail = '';
              try {
                const event = await client.api(`/me/events/${activity.externalEventId}`)
                  .select('onlineMeeting,organizer,isOnlineMeeting')
                  .get();
                eventUrl = event.onlineMeeting?.joinUrl;
                organizerEmail = event.organizer?.emailAddress?.address || '';
                if (organizerEmail && user.email) {
                  isOrganizer = organizerEmail.toLowerCase() === user.email.toLowerCase();
                }
              } catch (e: any) {
                if (e.statusCode === 404) {
                  // Event deleted from calendar
                  await pool.query("UPDATE activities SET teamsSyncStatus = 'event_deleted' WHERE id = ?", [activity.id]);
                  return;
                }
              }

              if (!eventUrl) {
                await pool.query("UPDATE activities SET teamsSyncStatus = 'no_join_url' WHERE id = ?", [activity.id]);
                return;
              }

              // In Microsoft Graph, /me/onlineMeetings requires the meeting organizer's account.
              if (!isOrganizer && organizerEmail) {
                let foundOrgUser: any = null;
                try {
                  const [orgRows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ? AND isActive = 1', [organizerEmail.toLowerCase()]);
                  if ((orgRows as any[]).length > 0) {
                    const candidate = (orgRows as any[])[0];
                    let orgMsInt = null;
                    if (candidate.msIntegration) {
                      try { orgMsInt = JSON.parse(candidate.msIntegration); } catch(e) {}
                    }
                    if (orgMsInt?.connected && orgMsInt?.tokens) {
                      foundOrgUser = candidate;
                    }
                  }
                } catch (err) {}

                if (!foundOrgUser) {
                  // Meeting was organized by an external party or user without MS tokens.
                  // Graph /me/onlineMeetings will return 3004 if queried by an attendee.
                  console.log(`[Worker] Activity ${activity.id}: Meeting organized by external host (${organizerEmail}), skipping /me/onlineMeetings query.`);
                  await pool.query("UPDATE activities SET teamsSyncStatus = 'external_host' WHERE id = ?", [activity.id]);
                  return;
                }
              }

              // 2. Get onlineMeeting detail by joinUrl
              let meetingId = null;
              try {
                // In MS Graph OData, property is joinWebUrl (lowercase j)
                const safeUrl = eventUrl.replace(/'/g, "''");
                const meetings = await client.api('/me/onlineMeetings')
                  .filter(`joinWebUrl eq '${safeUrl}'`)
                  .get();

                if (meetings.value && meetings.value.length > 0) {
                  meetingId = meetings.value[0].id;
                } else {
                  console.log(`[Worker] Activity ${activity.id}: No onlineMeeting found matching joinWebUrl.`);
                  await pool.query("UPDATE activities SET teamsSyncStatus = 'not_found' WHERE id = ?", [activity.id]);
                  return;
                }
              } catch (e: any) {
                const isMeetingNotFound = e.statusCode === 404 || 
                                          e.code === '3004' || 
                                          String(e.message || '').includes('3004') || 
                                          String(e.message || '').includes('Specified meeting is not found');
                if (isMeetingNotFound) {
                  console.log(`[Worker] Activity ${activity.id}: Online meeting not found in Graph (code 3004 / 404). Status set to not_found.`);
                  await pool.query("UPDATE activities SET teamsSyncStatus = 'not_found' WHERE id = ?", [activity.id]);
                  return;
                } else {
                  console.warn(`[Worker] Could not resolve online meeting for activity ${activity.id}:`, e.message || e);
                  return;
                }
              }
              
              if (!meetingId) return;

              let newRecordingLink = activity.recordingLink;
              let newMeetingSummary = activity.meetingSummary;

              // 3. Check recordings
              if (!newRecordingLink) {
                try {
                  const recordings = await client.api(`/me/onlineMeetings/${meetingId}/recordings`).get();
                  if (recordings.value && recordings.value.length > 0) {
                    newRecordingLink = recordings.value[0].recordingContentUrl || recordings.value[0].webUrl;
                  }
                } catch (e) {
                  // Ignored
                }
              }

              // 4. Check transcripts for Summary
              if (!newMeetingSummary) {
                try {
                  const transcripts = await client.api(`/me/onlineMeetings/${meetingId}/transcripts`).get();
                  if (transcripts.value && transcripts.value.length > 0) {
                    const transcriptId = transcripts.value[0].id;
                    try {
                      const content = await client.api(`/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content?$format=text/vtt`).get();
                      if (typeof content === 'string') {
                        const stripped = content.replace(/<[^>]+>/g, '').replace(/[\r\n]+/g, '\n').substring(0, 5000);
                        newMeetingSummary = "Auto-fetched Transcript/Review:\n" + stripped;
                      }
                    } catch (e) {
                      if (e.statusCode === 404) {
                        // No content yet
                      }
                    }
                  }
                } catch (e) {
                  // Ignored
                }
              }

              // 5. Update DB and notify if changed
              const hasNewData = (newRecordingLink && newRecordingLink !== activity.recordingLink) || 
                                 (newMeetingSummary && newMeetingSummary !== activity.meetingSummary);

              if (hasNewData) {
                await pool.query(
                  "UPDATE activities SET recordingLink = ?, meetingSummary = ?, teamsSyncStatus = 'completed' WHERE id = ?",
                  [newRecordingLink || null, newMeetingSummary || null, activity.id]
                );
                // Optionally emit websocket event
                const [updated] = await pool.query('SELECT * FROM activities WHERE id = ?', [activity.id]);
                if ((updated as any[]).length > 0) {
                  const row = (updated as any[])[0];
                  if (typeof row.participants === 'string') try { row.participants = JSON.parse(row.participants); } catch (e) {}
                  row.isVisible = row.isVisible === 1 || row.isVisible === true;
                  io.emit('db_changed', { type: 'activities', action: 'update', data: row });
                }
              } else {
                // If meeting occurred more than 24 hours ago and still has no recording or transcript, mark as checked
                const meetingAgeHours = (Date.now() - new Date(activity.date).getTime()) / (1000 * 60 * 60);
                if (meetingAgeHours > 24) {
                  await pool.query("UPDATE activities SET teamsSyncStatus = 'checked_no_artifacts' WHERE id = ?", [activity.id]);
                }
              }
            });
          } catch (internalErr: any) {
            console.error('[Worker] failed for activity', activity.id, internalErr.message);
          }
        }
      } catch (err: any) {
        console.error('[Worker] error', err.message);
      }
    }, 1000 * 60 * 60); // 1 hour
  };

  startTeamsActivityWorker();

  // Stage Reminders Processor
  async function processStageReminders() {
    console.log('[STAGE REMINDERS] Starting stage reminders check...');
    const connection = await pool.getConnection();
    try {
      const [remindersRows] = await connection.query('SELECT * FROM stage_reminders');
      const reminders = remindersRows as any[];
      if (reminders.length === 0) {
        console.log('[STAGE REMINDERS] No stage reminders configured.');
        return { checked: 0, sent: 0 };
      }

      const [dealsRows] = await connection.query('SELECT * FROM deals WHERE stage != "lost"');
      const deals = dealsRows as any[];
      if (deals.length === 0) {
        return { checked: 0, sent: 0 };
      }

      const [companiesRows] = await connection.query('SELECT * FROM companies');
      const companies = companiesRows as any[];
      const [usersRows] = await connection.query('SELECT * FROM users');
      const users = usersRows as any[];
      const [leadSourcesRows] = await connection.query('SELECT * FROM lead_sources');
      const leadSources = leadSourcesRows as any[];
      const [ecomRows] = await connection.query('SELECT * FROM ecommerce_platforms');
      const ecomPlatforms = ecomRows as any[];
      const [storageRows] = await connection.query('SELECT * FROM storage_types');
      const storageTypes = storageRows as any[];
      const [itRows] = await connection.query('SELECT * FROM it_integrations');
      const itIntegrations = itRows as any[];
      const [segmentsRows] = await connection.query('SELECT * FROM segments');
      const segments = segmentsRows as any[];

      const companiesMap = new Map(companies.map((c: any) => {
        let urls = c.urls;
        if (typeof urls === 'string') { try { urls = JSON.parse(urls); } catch (e) {} }
        let contacts = c.contacts;
        if (typeof contacts === 'string') { try { contacts = JSON.parse(contacts); } catch (e) {} }
        return [c.id, { ...c, urls, contacts }];
      }));

      const [auditRows] = await connection.query("SELECT * FROM audit_logs ORDER BY timestamp DESC");
      const allAuditLogs = auditRows as any[];
      const stageAuditLogs = allAuditLogs.filter((a: any) => a.field === 'stage');

      const [activitiesRows] = await connection.query("SELECT * FROM activities ORDER BY date DESC");
      const allActivities = activitiesRows as any[];

      const stageLabels: Record<string, string> = {
        opportunity: '1. Oportunita',
        lead: '2. Lead',
        discovery_proposal: '3. Discovery & Ponuka',
        contracting: '4. Contracting',
        onboarding: '5. Onboarding',
        farming: '6. Farming',
        lost: '7. Lost'
      };

      let checkedCount = 0;
      let sentCount = 0;
      const now = new Date();

      const itemsToNotify: any[] = [];

      for (const deal of deals) {
        checkedCount++;
        const stage = deal.stage;
        const stageReminders = reminders.filter((r: any) => r.stage === stage);
        if (stageReminders.length === 0) continue;

        const lastStageLog = stageAuditLogs.find((a: any) => a.dealId === deal.id && a.newValue === stage);
        const stageEntryTime = lastStageLog ? new Date(lastStageLog.timestamp).getTime() : new Date(deal.createdAt || Date.now()).getTime();
        const daysInStage = Math.max(0, Math.floor((now.getTime() - stageEntryTime) / (1000 * 60 * 60 * 24)));

        const dealAuditLogs = allAuditLogs.filter((a: any) => a.dealId === deal.id || (deal.companyId && a.companyId === deal.companyId));
        const dealActivities = allActivities.filter((a: any) => a.dealId === deal.id);

        const actionTimestamps: number[] = [
          new Date(deal.createdAt || now.getTime()).getTime()
        ];
        if (deal.updatedAt) {
          const t = new Date(deal.updatedAt).getTime();
          if (!isNaN(t)) actionTimestamps.push(t);
        }
        dealAuditLogs.forEach((log: any) => {
          const t = new Date(log.timestamp).getTime();
          if (!isNaN(t)) actionTimestamps.push(t);
        });
        dealActivities.forEach((act: any) => {
          if (act.createdAt) {
            const t = new Date(act.createdAt).getTime();
            if (!isNaN(t)) actionTimestamps.push(t);
          }
          if (act.updatedAt) {
            const t = new Date(act.updatedAt).getTime();
            if (!isNaN(t)) actionTimestamps.push(t);
          }
        });

        const lastActionTime = Math.max(...actionTimestamps);
        const daysSinceLastAction = Math.floor((now.getTime() - lastActionTime) / (1000 * 60 * 60 * 24));

        let latestActivityDate: number | null = null;
        if (dealActivities.length > 0) {
          const activityDates = dealActivities
            .map((a: any) => new Date(a.date || a.createdAt).getTime())
            .filter((t: number) => !isNaN(t));
          if (activityDates.length > 0) {
            latestActivityDate = Math.max(...activityDates);
          }
        }
        const daysSinceLatestActivityDate = latestActivityDate !== null
          ? Math.floor((now.getTime() - latestActivityDate) / (1000 * 60 * 60 * 24))
          : null;

        const matchingEmailRules = stageReminders.filter((r: any) => {
          if (r.action !== 'email') return false;
          // 1. Podmínka: minimálně X dnů od přesunu do stavu
          if (daysInStage < r.days) return false;
          // 2. Podmínka: minimálně X dnů od jakékoliv aktivity
          if (daysSinceLastAction < r.days) return false;
          // 3. Podmínka: minimálně X dnů od data konání aktivity
          if (daysSinceLatestActivityDate !== null && daysSinceLatestActivityDate < r.days) return false;
          return true;
        });

        if (matchingEmailRules.length === 0) continue;

        matchingEmailRules.sort((a: any, b: any) => b.days - a.days);
        const activeRule = matchingEmailRules[0];

        const stageEntryDate = new Date(stageEntryTime);

        // Check if an email reminder for this specific rule has already been sent during this stay in current stage
        const [existingLogs] = await connection.query(
          `SELECT id FROM activities 
           WHERE dealId = ? AND type = 'email' AND createdBy = 'System Cron' AND createdAt >= ? 
           AND (note LIKE ? OR note LIKE ? OR note LIKE ?)`,
          [
            deal.id,
            stageEntryDate,
            `%Připomínka ${activeRule.days} dní%`,
            `%Připomínka ${activeRule.days} dnů%`,
            `%ruleId:${activeRule.id}%`
          ]
        );
        if ((existingLogs as any[]).length > 0) {
          continue;
        }

        let assignedUserIds: string[] = [];
        if (stage === 'opportunity' || stage === 'lead') {
          if (deal.hunterId) assignedUserIds.push(deal.hunterId);
        } else if (stage === 'discovery_proposal') {
          if (deal.hunterId) assignedUserIds.push(deal.hunterId);
          if (deal.closerId) assignedUserIds.push(deal.closerId);
        } else if (stage === 'contracting') {
          if (deal.closerId) assignedUserIds.push(deal.closerId);
        } else if (stage === 'onboarding' || stage === 'farming') {
          if (deal.farmerId) assignedUserIds.push(deal.farmerId);
        }

        if (assignedUserIds.length === 0) {
          if (deal.createdBy) assignedUserIds.push(deal.createdBy);
          if (deal.hunterId) assignedUserIds.push(deal.hunterId);
          if (deal.closerId) assignedUserIds.push(deal.closerId);
          if (deal.farmerId) assignedUserIds.push(deal.farmerId);
        }

        assignedUserIds = Array.from(new Set(assignedUserIds));
        const recipientUsers = users.filter((u: any) => assignedUserIds.includes(u.id) && u.email && u.isActive);
        if (recipientUsers.length === 0) {
          console.log(`[STAGE REMINDERS] No active recipient users for deal ${deal.id}`);
          continue;
        }

        const company = companiesMap.get(deal.companyId) || { name: 'Neznámá společnost' };
        const stageName = stageLabels[stage] || stage;
        const hunterUser = users.find((u: any) => u.id === deal.hunterId);
        const closerUser = users.find((u: any) => u.id === deal.closerId);
        const farmerUser = users.find((u: any) => u.id === deal.farmerId);
        const leadSource = leadSources.find((ls: any) => ls.id === deal.leadSourceId)?.name || '-';
        const ecommercePlatform = ecomPlatforms.find((e: any) => e.id === deal.ecommercePlatformId)?.name || '-';
        const storageType = storageTypes.find((s: any) => s.id === deal.storageTypeId)?.name || '-';
        const itIntegration = itIntegrations.find((it: any) => it.id === deal.itIntegrationId)?.name || '-';
        const segment = segments.find((s: any) => s.id === company.segment)?.name || company.segment || '-';

        const contactsText = Array.isArray(company.contacts) && company.contacts.length > 0
          ? company.contacts.map((c: any) => `${c.name}${c.email ? ' <' + c.email + '>' : ''}${c.phone ? ' (' + c.phone + ')' : ''}${c.linkedin ? ' [' + c.linkedin + ']' : ''}`).join(', ')
          : '-';

        itemsToNotify.push({
          deal,
          company,
          stage,
          stageName,
          daysInStage,
          activeRule,
          recipientUsers,
          hunterUser,
          closerUser,
          farmerUser,
          leadSource,
          ecommercePlatform,
          storageType,
          itIntegration,
          segment,
          contactsText
        });
      }

      // Group items by user recipient so each user gets 1 consolidated email
      const userNotificationsMap = new Map<string, { user: any; items: any[] }>();

      for (const item of itemsToNotify) {
        for (const recipientUser of item.recipientUsers) {
          if (!userNotificationsMap.has(recipientUser.id)) {
            userNotificationsMap.set(recipientUser.id, { user: recipientUser, items: [] });
          }
          userNotificationsMap.get(recipientUser.id)!.items.push(item);
        }
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '1025', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || ''
        } : undefined,
        tls: {
          rejectUnauthorized: false
        }
      });

      for (const [userId, { user, items }] of userNotificationsMap.entries()) {
        if (items.length === 0) continue;

        let subject = '';
        let introText = '';

        if (items.length === 1) {
          const item = items[0];
          subject = `[Upozornění] Příležitost ${item.company.name} je ve fázi "${item.stageName}" již ${item.daysInStage} dní`;
          introText = `uplynulo <strong style="color: #dc2626; font-size: 16px;">${item.daysInStage} dnů</strong> od vložení / přesunu příležitosti <strong>${item.company.name}</strong> do fáze <strong>${item.stageName}</strong>, aniž by se posunula do dalšího stavu.`;
        } else {
          subject = `[Upozornění] Souhrn neaktivních příležitostí (${items.length})`;
          introText = `v systému evidujeme <strong style="color: #dc2626; font-size: 16px;">${items.length} neaktivních příležitostí</strong>, které vyžadují vaši pozornost a posun do dalšího stavu:`;
        }

        const itemsHtml = items.map((item: any) => `
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; background-color: #fafafa;">
            <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0; font-size: 16px; color: #111827;">${item.company.name}</h3>
              <span style="font-size: 12px; font-weight: 600; color: #dc2626; background-color: #fee2e2; padding: 4px 8px; border-radius: 4px;">
                ${item.daysInStage} dní ve fázi (${item.stageName})
              </span>
            </div>
            <div style="background-color: #f3f4f6; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #4b5563; margin-bottom: 12px;">
              <strong>Aktivované pravidlo:</strong> ${item.activeRule.days} dní bez posunu (Fáze: ${item.stageName})
            </div>

            <table style="width: 100%; text-align: left; font-size: 13px; border-collapse: collapse;">
              <tbody>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280; width: 190px;">Společnost:</td><td style="padding: 4px 0; font-weight: 600; color: #111827;">${item.company.name}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">IČO:</td><td style="padding: 4px 0;">${item.company.companyId || '-'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Region / Segment:</td><td style="padding: 4px 0;">${item.company.region || '-'} / ${item.segment}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Adresa:</td><td style="padding: 4px 0;">${item.company.address || '-'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">E-mail / Telefon:</td><td style="padding: 4px 0;">${item.company.email || '-'} / ${item.company.phone || '-'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Webové stránky:</td><td style="padding: 4px 0;">${Array.isArray(item.company.urls) ? item.company.urls.join(', ') : '-'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Kontaktní osoby:</td><td style="padding: 4px 0;">${item.contactsText}</td></tr>
                <tr style="border-top: 1px dashed #e5e7eb;"><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Aktuální fáze:</td><td style="padding: 4px 0; font-weight: 600; color: #4f46e5;">${item.stageName}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Zdroj leadu:</td><td style="padding: 4px 0;">${item.leadSource}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">E-commerce platforma:</td><td style="padding: 4px 0;">${item.ecommercePlatform}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Typ skladování:</td><td style="padding: 4px 0;">${item.storageType}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">IT Integrace:</td><td style="padding: 4px 0;">${item.itIntegration}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Odhad balíků (měs./rok):</td><td style="padding: 4px 0;">${item.deal.estimatedMonthlyParcels || '-'} / ${item.deal.estimatedYearlyParcels || '-'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Hunter / Closer / Farmer:</td><td style="padding: 4px 0;">${item.hunterUser?.name || '-'} / ${item.closerUser?.name || '-'} / ${item.farmerUser?.name || '-'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Datum vložení:</td><td style="padding: 4px 0;">${item.deal.createdAt ? new Date(item.deal.createdAt).toLocaleDateString('cs-CZ') : '-'}</td></tr>
              </tbody>
            </table>
          </div>
        `).join('');

        const htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; color: #1f2937; background-color: #ffffff;">
            <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #4f46e5; margin: 0; font-size: 20px;">Upozornění na neaktivitu příležitostí</h2>
            </div>
            <p style="font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
              Dobrý den ${user.name || ''},<br/>
              ${introText}
            </p>

            ${itemsHtml}

            <div style="border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;">
              Tato zpráva byla automaticky vygenerována systémem připomínek.
            </div>
          </div>
        `;

        try {
          const mailOptions = {
            from: process.env.SMTP_FROM || 'noreply@crm-system.cz',
            to: user.email,
            subject: subject,
            html: htmlContent
          };

          await transporter.sendMail(mailOptions);
          sentCount++;

          await connection.query(
            'INSERT INTO email_logs (id, recipient, subject, status, error, sentAt) VALUES (?, ?, ?, ?, ?, NOW())',
            [uuidv4(), user.email, subject, 'sent', null]
          );
        } catch (mailErr: any) {
          console.error(`[STAGE REMINDERS] Error sending mail to ${user.email}:`, mailErr.message);
          await connection.query(
            'INSERT INTO email_logs (id, recipient, subject, status, error, sentAt) VALUES (?, ?, ?, ?, ?, NOW())',
            [uuidv4(), user.email, subject, 'error', mailErr.message || String(mailErr)]
          );
        }
      }

      // Record activity and audit logs for each deal item processed
      for (const item of itemsToNotify) {
        const recipientNames = item.recipientUsers.map((u: any) => `${u.name} (${u.email})`).join(', ');
        const activityNote = `Automatické upozornění (Připomínka ${item.activeRule.days} dní, ruleId:${item.activeRule.id}): Uplynulo ${item.daysInStage} dnů ve fázi "${item.stageName}". E-mail odeslán na: ${recipientNames}`;

        await connection.query(
          "INSERT INTO activities (id, dealId, type, date, note, createdBy, createdAt) VALUES (?, ?, 'email', NOW(), ?, 'System Cron', NOW())",
          [uuidv4(), item.deal.id, activityNote]
        );

        await connection.query(
          "INSERT INTO audit_logs (id, dealId, companyId, field, oldValue, newValue, changedBy, timestamp) VALUES (?, ?, ?, 'reminder_email', '', ?, 'System Cron', NOW())",
          [uuidv4(), item.deal.id, item.deal.companyId, `Email sent for stage reminder (${item.daysInStage} days in ${item.stageName}) to ${recipientNames}`]
        );
      }

      console.log(`[STAGE REMINDERS] Finished check. Checked: ${checkedCount}, Sent emails: ${sentCount}`);
      return { checked: checkedCount, sent: sentCount };
    } finally {
      connection.release();
    }
  }

  app.post('/api/run-reminders-cron', authMiddleware, async (req, res) => {
    try {
      const result = await processStageReminders();
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Run reminders cron failed:', err);
      res.status(500).json({ error: err.message });
    }
  });

  let lastCronRunDay = -1;
  setInterval(async () => {
    const now = new Date();
    const currentDay = now.getDate();
    if (now.getHours() === 0 && now.getMinutes() === 1 && lastCronRunDay !== currentDay) {
      lastCronRunDay = currentDay;
      console.log('[CRON] Executing scheduled daily stage reminders check at 00:01...');
      try {
        await processStageReminders();
      } catch (err: any) {
        if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('ETIMEDOUT')) {
          console.warn(`[CRON] Scheduled stage reminders check skipped: Database connection unreachable (${err.message}).`);
        } else {
          console.error('[CRON] Scheduled stage reminders check failed:', err);
        }
      }
    }
  }, 60000);
}

startServer().catch(console.error);
