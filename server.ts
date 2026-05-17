import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
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
        "UPDATE deals SET hunterId = ownerId WHERE stage = 'lead_opportunity' AND ownerId IS NOT NULL;",
        "UPDATE deals SET closerId = ownerId WHERE stage = 'discovery_proposal' AND ownerId IS NOT NULL;",
        "UPDATE deals SET farmerId = ownerId WHERE (stage = 'contracting' OR stage = 'farming') AND ownerId IS NOT NULL;",
        "ALTER TABLE activities ADD COLUMN transcript TEXT;"
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
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '1h' } // 1 hour token
      );

      res.json({ token, user });
    } catch (err: any) {
      console.error('Login Error:', err);
      if (err.code === 'ETIMEDOUT') {
        console.error('HINT: Your database host could not be reached. Check firewall rules, VPNs, and ensure the DB_HOST is accessible from this server.');
      }
      res.status(500).json({ error: 'Server error during login', details: err.message });
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
  app.post('/api/sync/calendar', authMiddleware, async (req, res) => {
    const { provider, credentials, activityDetails } = req.body;
    let meetingLink = '';
    
    try {
      if (provider === 'google' && credentials?.tokens) {
        const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        oAuth2Client.setCredentials(credentials.tokens);
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        const startDateTime = new Date(activityDetails.date);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hr default

        const eventRes = await calendar.events.insert({
          calendarId: 'primary',
          conferenceDataVersion: 1,
          requestBody: {
            summary: activityDetails.note || 'Meeting',
            start: { dateTime: startDateTime.toISOString() },
            end: { dateTime: endDateTime.toISOString() },
            conferenceData: {
              createRequest: {
                requestId: Math.random().toString(36).substring(7),
                conferenceSolutionKey: { type: 'hangoutsMeet' }
              }
            }
          }
        });
        meetingLink = eventRes.data.hangoutLink || '';
      } else if (provider === 'microsoft' && credentials?.tokens) {
        const client = GraphClient.init({
          authProvider: (done) => done(null, credentials.tokens.access_token)
        });
        const startDateTime = new Date(activityDetails.date);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
        
        const event = {
          subject: activityDetails.note || 'Meeting',
          start: { dateTime: startDateTime.toISOString(), timeZone: 'UTC' },
          end: { dateTime: endDateTime.toISOString(), timeZone: 'UTC' },
          isOnlineMeeting: true,
          onlineMeetingProvider: 'teamsForBusiness'
        };
        const newEvent = await client.api('/me/events').post(event);
        meetingLink = newEvent.onlineMeeting?.joinUrl || '';
      }
      res.json({ success: true, meetingLink });
    } catch (err: any) {
      console.error('Calendar error:', err);
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
          
          const query = relevantEmails.map((e: string) => `from:${e}`).join(' OR ');
          const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 10 });
          
          if (listRes.data.messages) {
            for (const msg of listRes.data.messages) {
              if (!msg.id) continue;
              const msgRes = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] });
              emailResults.push({
                id: msg.id,
                subject: msgRes.data.payload?.headers?.find(h => h.name === 'Subject')?.value || '',
                from: msgRes.data.payload?.headers?.find(h => h.name === 'From')?.value || '',
                date: msgRes.data.payload?.headers?.find(h => h.name === 'Date')?.value || new Date().toISOString(),
                body: msgRes.data.snippet || ''
              });
            }
          }
        } else if (provider === 'microsoft' && credentials?.tokens) {
          const client = GraphClient.init({
            authProvider: (done) => done(null, credentials.tokens.access_token)
          });
          const queryFilters = relevantEmails.map((e: string) => `from/emailAddress/address eq '${e}'`).join(' or ');
          const messages = await client.api('/me/messages')
            .filter(queryFilters)
            .select('id,subject,from,receivedDateTime,bodyPreview')
            .top(10)
            .get();
          
          if (messages && messages.value) {
            emailResults = messages.value.map((msg: any) => ({
              id: msg.id,
              subject: msg.subject,
              from: msg.from?.emailAddress?.address,
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

      res.json({
        auditLogs: auditLogs,
        activities: activities
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

      const parseJsonFields = (arr: any[], fields: string[]) => arr.map(item => {
        fields.forEach(f => {
          if (typeof item[f] === 'string') {
            try { item[f] = JSON.parse(item[f]); } catch (e) { /* ignore */ }
          }
        });
        // boolean mapper
        if ('isActive' in item) item.isActive = item.isActive === 1 || item.isActive === true;
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
        deals: deals,
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
             const sql = `REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
             
             await connection.query(sql, values);
          }
        }
        await connection.commit();
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCertPath = process.env.SSL_CERT_PATH;

  if (sslKeyPath && sslCertPath) {
    try {
      console.log(`Starting HTTPS server with cert: ${sslCertPath} and key: ${sslKeyPath}`);
      const privateKey = fs.readFileSync(sslKeyPath, 'utf8');
      const certificate = fs.readFileSync(sslCertPath, 'utf8');
      const credentials = { key: privateKey, cert: certificate };

      const https = await import('https');
      const httpsServer = https.createServer(credentials, app);

      httpsServer.listen(PORT, "0.0.0.0", () => {
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
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`HTTP Server running on http://localhost:${PORT}`);
    });
  }
}

startServer().catch(console.error);
