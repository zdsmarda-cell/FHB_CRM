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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];
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
  
  // NOTE: The port MUST be 3000 in AI Studio environments. 
  // We use APP_PORT to override it in production environments if needed.
  const PORT = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Setup DB + automatic migrations
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db.mobilgroup.cz',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'fhb_maintain',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  });

  // Run auto-migrations
  try {
    const connection = await pool.getConnection();
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
        "UPDATE deals SET stage='lead_opportunity' WHERE stage='lead';",
        "ALTER TABLE deals ADD COLUMN postponedReason TEXT;",
        "ALTER TABLE deals ADD COLUMN postponedBy VARCHAR(50);",
        "ALTER TABLE deals ADD COLUMN postponedAt DATETIME;",
        "ALTER TABLE deals ADD COLUMN lostPermanently BOOLEAN;",
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
        "UPDATE deals SET hunterId = ownerId WHERE stage = 'lead_opportunity' AND ownerId IS NOT NULL;",
        "UPDATE deals SET closerId = ownerId WHERE (stage = 'discovery_proposal' OR stage = 'contracting' OR stage = 'onboarding') AND ownerId IS NOT NULL;",
        "UPDATE deals SET farmerId = ownerId WHERE stage = 'farming' AND ownerId IS NOT NULL;",
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
        "CREATE TABLE IF NOT EXISTS login_logs (id VARCHAR(50) PRIMARY KEY, userId VARCHAR(50) NOT NULL, timestamp DATETIME NOT NULL, ip VARCHAR(100), resolvedHost VARCHAR(255));"
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
    } finally {
      connection.release();
    }
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
        { expiresIn: '24h' } // 24 hours refresh token
      );

      try {
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
        let resolvedHost = '';
        if (ip && ip !== '127.0.0.1' && ip !== '::1') {
          try {
            const hostnames = await dns.promises.reverse(ip);
            if (hostnames && hostnames.length > 0) {
              resolvedHost = hostnames[0];
            }
          } catch (dnsErr) {
            // Ignore DNS resolution
          }
        }
        await pool.query(
          'INSERT INTO login_logs (id, userId, timestamp, ip, resolvedHost) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), user.id, new Date(), ip, resolvedHost]
        );
      } catch (logErr) {
        console.error('Failed to write login log:', logErr);
      }

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
        { expiresIn: '24h' }
      );
      
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

  // GET Email Logs for Admin
  app.get('/api/email_logs', async (req, res) => {
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
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

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
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
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
      console.error(err);
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
      if (e.statusCode === 401 || (e.message && (e.message.includes('expired') || e.message.includes('InvalidAuthenticationToken')))) {
        if (!currentTokens.refresh_token) throw new Error('Missing Microsoft refresh token');
        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.MS_CLIENT_ID || '',
            client_secret: process.env.MS_CLIENT_SECRET || '',
            refresh_token: currentTokens.refresh_token,
            grant_type: 'refresh_token'
          })
        });
        const newTokens = await response.json();
        if (newTokens.error) throw new Error(newTokens.error_description || newTokens.error);
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
          const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hr default

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
            const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
            
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
      if (relevantEmails && relevantEmails.length > 0) {
          const emailsLower = relevantEmails.map((e: string) => e.toLowerCase());
          events = events.filter(ev => {
             return ev.attendees.some((attObj: string) => emailsLower.includes((attObj || '').toLowerCase()));
          });
      }
      
      res.json({ events });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sync/emails', authMiddleware, async (req, res) => {
    // ... existujici email logika zustava ...
    const { provider, credentials, relevantEmails } = req.body;
    let emailResults: any[] = [];

    try {
      if (relevantEmails && relevantEmails.length > 0) {
        if (provider === 'google' && credentials?.tokens) {
          const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
          oAuth2Client.setCredentials(credentials.tokens);
          const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
          
          const query = relevantEmails.map((e: string) => `from:${e} OR to:${e} OR cc:${e}`).join(' OR ');
          const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 10 });
          
          if (listRes.data.messages) {
            for (const msg of listRes.data.messages) {
              if (!msg.id) continue;
              const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
              
              const headers = msgRes.data.payload?.headers || [];
              const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
              const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
              const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
              const cc = headers.find(h => h.name?.toLowerCase() === 'cc')?.value || '';
              const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || new Date().toISOString();
              
              // Extract attachments from parts
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
          const uniqueEmails = Array.from(new Set(relevantEmails));
          const searchQuery = '"' + uniqueEmails.map((e: string) => `participants:${e}`).join(' OR ') + '"';
          const messages = await callMsGraphWithRetry(credentials.tokens, (req as any).user.id, pool, async (client) => {
            return await client.api('/me/messages')
              .header('ConsistencyLevel', 'eventual')
              .search(searchQuery)
              .select('id,subject,from,toRecipients,ccRecipients,hasAttachments,receivedDateTime,bodyPreview')
              .expand('attachments($select=name,contentType)')
              .top(10)
              .get();
          });
          
          if (messages && messages.value) {
            emailResults = messages.value.map((msg: any) => ({
              id: msg.id,
              subject: msg.subject,
              from: msg.from?.emailAddress?.address || msg.from?.emailAddress?.name || '',
              to: (msg.toRecipients || []).map((r: any) => r.emailAddress?.address).join(', '),
              cc: (msg.ccRecipients || []).map((r: any) => r.emailAddress?.address).join(', '),
              attachments: msg.hasAttachments && msg.attachments ? msg.attachments.map((a: any) => a.name) : [],
              date: msg.receivedDateTime,
              body: msg.bodyPreview
            }));
          }
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

  app.get('/api/manual', async (req, res) => {
    try {
      const lang = req.query.lang === 'cs' ? 'cs' : 'en';
      const isCS = lang === 'cs';
      
      const stages = isCS ? [
        { name: 'New (Otevřený lead)', requirements: 'Vyžaduje pouhé založení přes Kanban desku. Tuto fází běžně operuje Hunter.' },
        { name: 'Discovery & Proposal', requirements: 'Pro přechod do této fáze musí Hunter provézt úvodní schůzku. Zde probíhá komunikace, odesílají se nabídky.' },
        { name: 'Contracting (Smlouvání)', requirements: 'Klíčový přechod. Nutno vyplnit: Doručovací země (Delivery countries), Průměrný počet kusů v objednávce (Items), Váha (Weight), Objem (Volume). Nutno nahrát cenovou nabídku.' },
        { name: 'Onboarding', requirements: 'Smlouva je podepsána. Vyžadovaná pole pro přechod: Datum podpisu smlouvy (Contract Signed Date), Datum nahrání ceníku, Preferovaný začátek IT integrace a Očekávané první naskladnění.' },
        { name: 'Farming (Živý provoz)', requirements: 'Konečná fáze. Vyžaduje: Potvrzení o dokončení IT integrace, Ostré datum prvního naskladnění (Actual First Stocking) a dokončené UAT testování.' },
        { name: 'Lost & Postponed', requirements: 'Z jakékoliv fáze lze přejít do rozeznání ztráty (Lost - vyžaduje vybrání důvodu úbytku ze sdíleného číselníku) nebo Odložení (Postponed - vyžaduje zadání data připomenutí a důvodu odložení).' }
      ] : [
        { name: 'New (Open lead)', requirements: 'Only requires creation via Kanban board. Fully operated by Hunter.' },
        { name: 'Discovery & Proposal', requirements: 'Transitioned by Hunter after initial meeting. Used for communication and proposals.' },
        { name: 'Contracting', requirements: 'Critical transition. Mandatory attributes: Delivery countries, Average Items, Weight, Volume. Must upload a pricing offer.' },
        { name: 'Onboarding', requirements: 'Contract signed. Required fields: Contract Signed Date, Pricing Upload Date, IT Integration ID/Start, and Expected First Stocking Date.' },
        { name: 'Farming (Live operations)', requirements: 'Final stage. Requires: IT Integration Completed Date, Actual First Stocking Date, and Testing Completed Date.' },
        { name: 'Lost & Postponed', requirements: 'Can be transitioned to from any stage. Lost requires a reason from enumerations. Postponed requires resume date and reason.' }
      ];

      const rolesCS = [
        {
          name: 'Hunter',
          privileges: 'Operuje primárně v začátcích (New -> Proposal).',
          actions: [
            'Vytváření nových Dealů (Company Name, IČO, Zdroj).',
            'Vyplňování základních e-commerce platforem a Lead Sources.',
            'Zadávání a správa kontaktních osob dané firmy (titul, jméno, email, telefon).',
            'Vytváření meetingů a logování historie (i když později přebírá někdo jiný, Hunter má read-only).'
          ]
        },
        {
          name: 'Closer',
          privileges: 'Přijímá Deal po fázi Proposal, zaměřuje se na vykouzlení Contractu.',
          actions: [
            'Správa atributů balíků (Váha [Weight], Objem [Volume], Počet).',
            'Určování doručovacích zemí (Delivery countries - z multi-select výběru).',
            'Může provádět DNC (Do Not Contact) označení klienta v případě nespokojenosti.',
            'Kliknutím na "Add Offer" nahrává k dealu historicky nezničitelné cenové nabídky (v PDF).'
          ]
        },
        {
          name: 'Farmer (Account Manager)',
          privileges: 'Stará se o živého (Farming) a onboardujícího klienta.',
          actions: [
            'Komunikuje s IT pro doplnění datumu "IT Integration Completed".',
            'Identifikuje reálný start obchodu a přepisuje odhady.',
            'Přiřazuje klientským kontaktům tag "Inactive", pokud daná osoba opustila firmu.'
          ]
        },
        {
          name: 'Vedoucí',
          privileges: 'Nadřízený k rolím (Hunter/Closer/Farmer).',
          actions: [
            'Vidí Dealy vlastněné těmi podřízenými skrz celý systém Kanbanu.',
            'Z pohledu úprav získává stejná práva (Může editovat, psát poznámky).',
            'Monitoruje Email logy a kalendář.'
          ]
        },
        {
          name: 'CSO (Chief Sales Officer)',
          privileges: 'Absolutní přístup k Sales potrubí (Pipeline).',
          actions: [
            'U libovolného Dealu může v záložce "Company Details" měnit aktuální přiřazení v reálném čase.',
            'Označením záznamu "Visible: false" je může utajit před nižšími rolemi.'
          ]
        },
        {
          name: 'Admin',
          privileges: 'Zajišťuje technický chod aplikace.',
          actions: [
            'Sekce "Admin Panel": Zakládá ostatní uživatele, resetuje hesla.',
            'Mění konstantní číselníky: "Lead Sources", "Lost Reasons", atd.',
            'Spravuje tabulky s podrobnými Login logy (historie přihlášení).'
          ]
        }
      ];

      const rolesEN = [
        {
          name: 'Hunter',
          privileges: 'Operates primarily in the early stages (New -> Proposal).',
          actions: [
            'Creates new Deals (Company Name, ID, Source).',
            'Fills basic e-commerce platforms and Lead Sources.',
            'Enters and manages contact persons for the company.',
            'Creates meetings and logs history (read-only for others later).'
          ]
        },
        {
          name: 'Closer',
          privileges: 'Receives the Deal after Proposal, focuses on Contracting.',
          actions: [
            'Manages parcel attributes (Weight, Volume, Items).',
            'Defines delivery countries (Delivery countries multi-select).',
            'Can mark client contacts as DNC (Do Not Contact).',
            'Uploads pricing offers (PDFs) clicking "Add Offer".'
          ]
        },
        {
          name: 'Farmer (Account Manager)',
          privileges: 'Handles live (Farming) and onboarding clients.',
          actions: [
            'Communicates with IT to log "IT Integration Completed" dates.',
            'Identifies actual launch metadata and overrides estimates.',
            'Can tag client contacts as "Inactive" if they leave their company.'
          ]
        },
        {
          name: 'Manager',
          privileges: 'Supervisor of Hunter/Closer/Farmer roles.',
          actions: [
            'Sees Deals owned by their subordinates across the Kanban board.',
            'Inherits edit permissions for subordinate deals.',
            'Monitors Email logs and synced calendars.'
          ]
        },
        {
          name: 'CSO (Chief Sales Officer)',
          privileges: 'Absolute access to the Sales Pipeline.',
          actions: [
            'Can change role assignments (Hunter, Closer, Farmer) in real-time via the "Company Details" tab.',
            'Can hide sensitive activities (Visible: false) from lower roles.'
          ]
        },
        {
          name: 'Admin',
          privileges: 'Ensures technical operation.',
          actions: [
            '"Admin Panel": Creates users, resets passwords.',
            'Manages enumerations: "Lead Sources", "Lost Reasons", etc.',
            'Manages Login logs and the full audit trail (tracking all field changes).'
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
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { 
              font-family: 'Roboto', 'Helvetica', sans-serif; 
              line-height: 1.6; 
              padding: 40px; 
              max-width: 800px; 
              margin: 0 auto; 
              color: #333; 
              background-color: #fcfcfc;
            }
            .content-wrapper {
              background-color: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              border: 1px solid #eee;
            }
            h1, h2, h3 { color: #111; }
            h1 { text-align: center; margin-bottom: 20px; font-size: 28px; }
            .subtitle { text-align: justify; margin-bottom: 40px; color: #555; }
            h2 { 
              margin-top: 40px; 
              border-bottom: 2px solid #eee; 
              padding-bottom: 8px; 
              font-size: 20px;
            }
            .role { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e5e7eb; page-break-inside: avoid; }
            .role-name { margin-top: 0; color: #2563eb; font-size: 18px; }
            .role-privilege { font-style: italic; color: #4b5563; margin-bottom: 12px; }
            ul { padding-left: 24px; margin-top: 8px; }
            li { margin-bottom: 8px; }
            .screenshot { width: 100%; max-width: 600px; display: block; margin: 20px auto; border: 1px solid #eaeaea; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); page-break-inside: avoid; }
            .stage-block { margin-bottom: 16px; page-break-inside: avoid; }
            .stage-name { font-weight: bold; color: #1f2937; }
            .page-break { page-break-before: always; }
            .print-btn {
               display: block;
               width: 200px;
               margin: 0 auto 30px auto;
               padding: 12px 24px;
               background-color: #2563eb;
               color: white;
               text-align: center;
               border-radius: 6px;
               text-decoration: none;
               font-weight: bold;
               cursor: pointer;
               border: none;
               font-size: 16px;
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
            ${isCS ? 'Tisk do PDF' : 'Print to PDF'}
          </button>
          
          <div class="content-wrapper">
            <h1>${isCS ? 'Podrobný uživatelský manuál aplikace' : 'Detailed Application User Manual'}</h1>
            <p class="subtitle">${isCS ? 'Tento dokument slouží jako detailní průvodce pro veškeré role systému CRM, specifikuje stavy, datové atributy a přechody.' : 'This document serves as a detailed guide for all CRM roles, specifying stages, data attributes, and transitions.'}</p>
            
            <h2>${isCS ? '1. Úvod a přístup do systému' : '1. Introduction and System Access'}</h2>
            <p>${isCS ? 'Přístup do systému je zajištěn výhradně na základě přidělených přístupových údajů (email a heslo). Prvotní heslo by mělo být co nejdříve změněno v sekci Profil. Během používání komunikuje systém bezpečně pomocí šifrovaného spojení. Data se organizují dle jednotlivých obchodních případů (Deals).' : 'System access is provided strictly through assigned credentials (email and password). The initial password should be changed as soon as possible in the Profile section. The system organizes data into commercial opportunities called Deals.'}</p>
            
            <h2>${isCS ? '2. Přechody mezi stavy (Pipeline Transitions)' : '2. Pipeline Stages and Transitions'}</h2>
            <p>${isCS ? 'Životní cyklus obchodního případu (Deal) prochází pevně stanovenými fázemi. Pro přechod mezi nimi jsou vyžadována konkrétní data a práva.' : 'The lifecycle of a Deal progresses through fixed stages. Specific data and permissions are required to move between them.'}</p>
            
            <div>
              ${stages.map(s => `
                <div class="stage-block">
                  <div class="stage-name">${s.name}</div>
                  <div class="stage-req">${s.requirements}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="page-break"></div>
            
            <h2>${isCS ? '3. Seznam rolí a jejich operace' : '3. User Roles and Operations'}</h2>
            <div>
              ${rolesList.map(r => `
                <div class="role">
                  <h3 class="role-name">Role: ${r.name}</h3>
                  <div class="role-privilege">${r.privileges}</div>
                  <ul>
                    ${r.actions.map(a => `<li>${a}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>

            <div class="page-break"></div>

            <h2>${isCS ? '4. Grafické ukázky a interakce (Simulace)' : '4. UI Screenshots and Interfaces'}</h2>
            
            <h3>${isCS ? 'D1: Horní panel (Header)' : 'D1: Header Panel'}</h3>
            <p>${isCS ? 'Na pravé straně vedle avatara uživatele naleznete přepínač jazyků, ikonu ozubeného kola (Nastavení integrace kalendáře - Google & Microsoft) a rozklinutím avatara se otevře tento profil.' : 'On the right side next to the user avatar, you can find language switchers, a gear icon (Calendar Integrations - Google & MS), and clicking your avatar opens this profile.'}</p>
            
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: white; border: 1px solid #e5e7eb; padding: 15px 20px; border-radius: 8px; font-family: sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 20px 0; page-break-inside: avoid;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 24px; height: 24px; background: #3b82f6; border-radius: 4px;"></div>
                <div style="font-weight: bold; font-size: 18px; color: #111827;">FHB CRM</div>
              </div>
              <div style="display: flex; align-items: center; gap: 15px; color: #4b5563;">
                <span style="font-size: 14px; padding: 6px 12px; background: #f3f4f6; border-radius: 20px;">🔍 Hledat / Search...</span>
                <span style="font-size: 18px;">⚙️</span>
                <span style="display: inline-block; padding: 4px 8px; font-size: 14px; border: 1px solid #d1d5db; border-radius: 4px;">CS ▾</span>
                <span style="display: inline-flex; justify-content: center; align-items: center; width: 36px; height: 36px; background: #3b82f6; color: white; border-radius: 50%; font-weight: bold; font-size: 14px;">JD</span>
              </div>
            </div>
            
            <h3>${isCS ? 'D2: Detail firmy (Deal View)' : 'D2: Deal View'}</h3>
            <p>${isCS ? 'Rozdělené obrazovky:<br/><b>LEVÝ PANEL:</b> Údaje firmy, Tagy, Produktová část, Přenosy fází (Přesun fáze = Zelené tlačítko "Advance to..."). Pokud podtrhnuté pole svítí červeně, znamená to chybějící data pro přechod.<br/><b>PRAVÝ PANEL:</b> Log aktivit (hovory, zprávy), Dokumenty a historický vklad.' : 'Split view:<br/><b>LEFT PANEL:</b> Company details, Tags, Products, Stage transitions (Move stage = Green "Advance to..." button). If a field shines red, data is missing for the transition.<br/><b>RIGHT PANEL:</b> Activity Logs, Documents, and historical entries.'}</p>
            
            <div style="display: flex; gap: 20px; font-family: sans-serif; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; page-break-inside: avoid;">
              <div style="flex: 2; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <h3 style="margin-top: 0; margin-bottom: 10px; color: #111;">Detail Firmy: ABC s.r.o.</h3>
                  <div style="background: #10b981; color: white; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 14px;">Advance to Discovery & Proposal →</div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 25px;">
                   <span style="padding: 4px 8px; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-size: 12px; font-weight: 600;">Stav / Stage: New</span>
                   <span style="padding: 4px 8px; background: #f3f4f6; color: #374151; border-radius: 4px; font-size: 12px;">Zdroj: Web Form</span>
                </div>
                
                <div style="display: flex; gap: 40px; margin-bottom: 20px; background: #fafafa; padding: 15px; border-radius: 6px; border: 1px dashed #d1d5db;">
                   <div>
                     <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Základní údaje</div>
                     <div style="margin-top: 8px; font-size: 14px;"><strong>IČO:</strong> <span style="color: #ef4444; border-bottom: 1px dashed #ef4444;" title="Chybějící údaj pro přechod">Nevyplněno</span></div>
                     <div style="margin-top: 5px; font-size: 14px;"><strong>Země:</strong> CZ, SK</div>
                   </div>
                   <div>
                     <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Obrat a váha</div>
                     <div style="margin-top: 8px; font-size: 14px;"><strong>Položky/měs:</strong> 500</div>
                     <div style="margin-top: 5px; font-size: 14px;"><strong>Prům. váha:</strong> 1.5 kg</div>
                   </div>
                </div>
              </div>
              
              <div style="flex: 1; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                <h4 style="margin-top: 0; margin-bottom: 15px; color: #111; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Log Aktivit / Timeline</h4>
                
                <div style="flex: 1;">
                  <div style="border-left: 2px solid #e5e7eb; padding-left: 15px; margin-bottom: 15px; position: relative;">
                    <div style="position: absolute; left: -5px; top: 0; width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></div>
                    <div style="font-size: 12px; color: #6b7280;">Dnes 14:00 • <b>Hunter</b></div>
                    <div style="font-size: 14px; margin-top: 4px; color: #374151;">Telefonát s klientem - dohodnuta schůzka.</div>
                  </div>
                  
                  <div style="border-left: 2px solid #e5e7eb; padding-left: 15px; position: relative;">
                    <div style="position: absolute; left: -5px; top: 0; width: 8px; height: 8px; border-radius: 50%; background: #9ca3af;"></div>
                    <div style="font-size: 12px; color: #6b7280;">Včera 10:00 • <b>Hunter</b></div>
                    <div style="font-size: 14px; margin-top: 4px; color: #374151;">Založení dealu z formuláře.</div>
                  </div>
                </div>
              </div>
            </div>
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
      // Ensure we don't crash the server, just end response if not already ended
      if (!res.headersSent) {
         res.status(500).json({ error: 'Manual generation failed' });
      }
    }
  });

  app.get('/api/deals/:id/details', authMiddleware, async (req, res) => {
    try {
      const dealId = req.params.id;
      const [auditLogs] = await pool.query('SELECT * FROM audit_logs WHERE dealId = ?', [dealId]);
      const [activities] = await pool.query('SELECT * FROM activities WHERE dealId = ?', [dealId]);
      
      const parseJsonFields = (arr: any[], fields: string[]) => arr.map(item => {
        fields.forEach(f => {
          if (typeof item[f] === 'string') {
            try { item[f] = JSON.parse(item[f]); } catch (e) { /* ignore */ }
          }
        });
        return item;
      });

      const parsedActivities = parseJsonFields(activities as any[], ['participants']);
      // convert boolean
      parsedActivities.forEach((act: any) => {
        if ('isVisible' in act) act.isVisible = act.isVisible === 1 || act.isVisible === true;
      });

      res.json({
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
      const [users] = await pool.query('SELECT * FROM users');
      const [companies] = await pool.query('SELECT * FROM companies');
      const [deals] = await pool.query('SELECT * FROM deals');
      const [leadSources] = await pool.query('SELECT * FROM lead_sources');
      const [ecommercePlatforms] = await pool.query('SELECT * FROM ecommerce_platforms');
      const [itIntegrations] = await pool.query('SELECT * FROM it_integrations');
      const [lostReasons] = await pool.query('SELECT * FROM lost_reasons');

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

      const parsedUsers = parseJsonFields(users as any[], ['googleIntegration', 'msIntegration']);
      const currentUserId = (req as any).user?.id;
      const me = parsedUsers.find((u: any) => u.id === currentUserId) || null;

      res.json({
        users: parsedUsers,
        me: me,
        companies: parseJsonFields(companies as any[], ['urls', 'contacts']),
        deals: parseJsonFields(deals as any[], ['deliveryCountries', 'pricingOffers', 'documents']),
        leadSources: parseJsonFields(leadSources as any[], []),
        ecommercePlatforms: parseJsonFields(ecommercePlatforms as any[], []),
        itIntegrations: parseJsonFields(itIntegrations as any[], []),
        lostReasons: parseJsonFields(lostReasons as any[], []),
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

  app.post('/api/sync-action', authMiddleware, async (req, res) => {
    try {
      const { entities } = req.body;
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        for (const [table, rows] of Object.entries(entities as Record<string, any[]>)) {
          if (!rows || rows.length === 0) continue;
          
          // Construct REPLACE INTO
          for (const row of rows) {
             const keys = Object.keys(row);
             const values = Object.values(row).map(v => {
               if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
                 return new Date(v);
               }
               return typeof v === 'object' && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v;
             });
             
             const placeholders = keys.map(() => '?').join(', ');
             const updateStmts = keys.map(k => `${k} = VALUES(${k})`).join(', ');
             const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateStmts}`;
             
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
      
      const allowedTables = ['lead_sources', 'ecommerce_platforms', 'it_integrations', 'lost_reasons', 'activities'];
      if (!allowedTables.includes(table)) {
        return res.status(403).json({ error: 'Deletion not allowed for this table' });
      }

      // Check if there are any deals referencing the entity
      let fkColumn = '';
      if (table === 'lead_sources') {
        fkColumn = 'leadSourceId';
      } else if (table === 'ecommerce_platforms') {
        fkColumn = 'ecommercePlatformId';
      } else if (table === 'it_integrations') {
        fkColumn = 'itIntegrationId';
      } else if (table === 'lost_reasons') {
        fkColumn = 'lostReasonId';
      }

      if (fkColumn) {
        const [rows] = await pool.query(`SELECT COUNT(*) as count FROM deals WHERE ${fkColumn} = ?`, [id]);
        const count = (rows as any[])[0].count;

        if (count > 0) {
          return res.status(400).json({ error: `Cannot delete because there are ${count} deals referencing this entity.` });
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
      if (process.env.DB_PASSWORD && process.env.DB_NAME) {
         // Only test ping if configured, otherwise just return ok to not crash if unconfigured
         const [rows] = await pool.query('SELECT 1 + 1 AS result');
      }
      res.json({ status: "ok", mysql: "configured" });
    } catch (error) {
      console.error("Database connection error:", error);
      res.status(500).json({ status: "error", message: "Database connection failed" });
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
        // Only select records that are past
        const [activities] = await pool.query(
          "SELECT * FROM activities WHERE type = 'teams' AND externalEventId IS NOT NULL AND (recordingLink IS NULL OR meetingSummary IS NULL) AND date < NOW()"
        );

        if ((activities as any[]).length === 0) return;

        for (const activity of (activities as any[])) {
          try {
            const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [activity.createdBy]);
            if ((users as any[]).length === 0) continue;
            
            const user = (users as any[])[0];
            let msIntegration = null;
            if (user.msIntegration) {
                try { msIntegration = JSON.parse(user.msIntegration); } catch(e) {}
            }
            if (!msIntegration?.connected || !msIntegration?.tokens) continue;

            await callMsGraphWithRetry(msIntegration.tokens, user.id, pool, async (client) => {
              // 1. Get event to find joinUrl
              let eventUrl = '';
              try {
                const event = await client.api(`/me/events/${activity.externalEventId}`).select('onlineMeeting').get();
                eventUrl = event.onlineMeeting?.joinUrl;
              } catch (e: any) {
                if (e.statusCode === 404) {
                  // Event deleted
                  return;
                }
              }

              if (!eventUrl) return;

              // 2. Get onlineMeeting detail by joinUrl
              let meetingId = null;
              try {
                  const meetings = await client.api('/me/onlineMeetings').filter(`JoinWebUrl eq '${eventUrl}'`).get();
                  if (meetings.value && meetings.value.length > 0) {
                      meetingId = meetings.value[0].id;
                  }
              } catch (e) {
                  console.error('[Worker] Failed to resolve online meeting. Make sure the OAuth user has OnlineMeetings.Read or equivalent application permissions.', e.message);
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
              if (newRecordingLink !== activity.recordingLink || newMeetingSummary !== activity.meetingSummary) {
                  await pool.query(
                      "UPDATE activities SET recordingLink = ?, meetingSummary = ? WHERE id = ?",
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
}

startServer().catch(console.error);
