import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  
  // NOTE: The port MUST be 3000 in AI Studio environments. 
  // We ignore a custom PORT variable for the bind to ensure the app works in preview.
  const PORT = 3000;

  app.use(express.json());

  // Set up MySQL connection pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db.mobilgroup.cz',
    user: process.env.DB_USER || 'fhb_maintain',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Memory store for tokens just to demo before SQL structure is established
  const userTokens: Record<string, any> = {};

  // OAUTH: Google
  app.get('/api/auth/google/url', (req, res) => {
    const { clientId } = req.query;
    const origin = req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : `http://${req.headers.host}`;
    const redirectUri = `${origin}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: (clientId as string) || 'missing_client_id',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly',
      access_type: 'offline',
      prompt: 'consent'
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    // In a real app we'd exchange code for token using clientSecret
    // For this demo, we'll just return success to the popup.
    const { code } = req.query;
    res.send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'google', token: 'mock-google-token' }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      </script>Authentication successful. You can close this window.</body></html>
    `);
  });

  // OAUTH: Microsoft
  app.get('/api/auth/microsoft/url', (req, res) => {
    const { clientId } = req.query;
    const origin = req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : `http://${req.headers.host}`;
    const redirectUri = `${origin}/api/auth/microsoft/callback`;
    const params = new URLSearchParams({
      client_id: (clientId as string) || 'missing_client_id',
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
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'microsoft', token: 'mock-ms-token' }, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      </script>Authentication successful. You can close this window.</body></html>
    `);
  });

  // API endpoints for interacting with MS / Google APIs
  app.post('/api/sync/calendar', async (req, res) => {
    // Expected body: { provider, token, activityDetails }
    const { provider, activityDetails } = req.body;
    // Mock creating meeting & getting link for Teams/Google Meet
    let meetingLink = '';
    if (provider === 'microsoft' && activityDetails.type === 'teams') {
      meetingLink = 'https://teams.microsoft.com/l/meetup-join/mock-id';
    } else if (provider === 'google' && activityDetails.type === 'meeting') {
      meetingLink = 'https://meet.google.com/mock-id';
    }
    
    res.json({ success: true, meetingLink });
  });

  app.post('/api/sync/emails', async (req, res) => {
    const { provider, relevantEmails } = req.body;
    // We would use MS Graph or Google API to fetch recent emails with relevantEmails
    // Mock returning some recent emails matching deals for UI demo
    if (relevantEmails && relevantEmails.length > 0) {
      res.json({
        emails: relevantEmails.map((email: string) => ({
          subject: 'Copilot summary: recent negotiation',
          from: email,
          body: `Hi,\n\nWe would like to proceed with the proposal discussed last week. Let us schedule a kickoff soon.\n\nBest regards,\n${email}`,
          date: new Date().toISOString()
        }))
      });
    } else {
      res.json({ emails: [] });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
