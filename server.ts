import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import { Client as GraphClient } from "@microsoft/microsoft-graph-client";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  
  // NOTE: The port MUST be 3000 in AI Studio environments. 
  // We use APP_PORT to override it in production environments if needed.
  const PORT = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 3000;

  app.use(express.json());

  // Set up MySQL connection pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db.mobilgroup.cz',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'fhb_maintain',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
  });

  // Memory store for tokens just to demo before SQL structure is established
  const userTokens: Record<string, any> = {};

  app.get('/api/auth/integrations-status', (req, res) => {
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
      res.json({ user });
    } catch (err: any) {
      console.error('Login Error:', err);
      res.status(500).json({ error: 'Server error during login', details: err.message });
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

  app.post('/api/auth/google/exchange', async (req, res) => {
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

  app.post('/api/auth/microsoft/exchange', async (req, res) => {
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
  app.post('/api/sync/calendar', async (req, res) => {
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

  app.post('/api/sync/emails', async (req, res) => {
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

  app.get('/api/state', async (req, res) => {
    try {
      const [users] = await pool.query('SELECT * FROM users');
      const [companies] = await pool.query('SELECT * FROM companies');
      const [deals] = await pool.query('SELECT * FROM deals');
      const [auditLogs] = await pool.query('SELECT * FROM audit_logs');
      const [activities] = await pool.query('SELECT * FROM activities');

      const parseJsonFields = (arr: any[], fields: string[]) => arr.map(item => {
        fields.forEach(f => {
          if (typeof item[f] === 'string') {
            try { item[f] = JSON.parse(item[f]); } catch (e) { /* ignore */ }
          }
        });
        // boolean mapper
        if ('isActive' in item) item.isActive = item.isActive === 1 || item.isActive === true;
        return item;
      });

      res.json({
        users: parseJsonFields(users as any[], ['googleIntegration', 'msIntegration']),
        companies: parseJsonFields(companies as any[], ['urls', 'contacts']),
        deals: deals,
        auditLogs: auditLogs,
        activities: activities
      });
    } catch (err: any) {
      console.error('DB State Error:', err);
      res.status(500).json({ error: `DB state failed: ${err.message}`, details: err.message });
    }
  });

  app.post('/api/sync-action', async (req, res) => {
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
             const values = Object.values(row).map(v => 
               typeof v === 'object' && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v
             );
             
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
