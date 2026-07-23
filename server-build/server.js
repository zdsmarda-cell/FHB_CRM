// server.ts
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
var JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";
var authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized", message: "Missing or invalid token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "unauthorized", message: "Token is invalid or expired" });
  }
};
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var possibleEnvPaths = [
  process.env.ENV_FILE_PATH,
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend/.env"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "backend/.env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env"),
  "/home/fhb_crm/backend/.env"
].filter(Boolean);
var dotenvLoaded = false;
console.log("[ENV] Checking for .env files in the following locations:");
for (const envPath of possibleEnvPaths) {
  console.log(`[ENV] -> checking ${envPath}`);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`[ENV] \u2705 Loaded .env from ${envPath}`);
    dotenvLoaded = true;
    break;
  }
}
if (!dotenvLoaded) {
  console.log(`[ENV] \u274C No .env file found in above paths. Calling dotenv.config() directly as fallback.`);
  dotenv.config();
}
console.log(`[ENV DEBUG] SSL_KEY_PATH: ${process.env.SSL_KEY_PATH || "Not set"}`);
console.log(`[ENV DEBUG] SSL_CERT_PATH: ${process.env.SSL_CERT_PATH || "Not set"}`);
async function startServer() {
  const app = express();
  const PORT = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 3e3;
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "db.mobilgroup.cz",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || "fhb_maintain",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 2e4,
    enableKeepAlive: true,
    keepAliveInitialDelay: 1e4
  });
  try {
    const connection = await pool.getConnection();
    try {
      if (fs.existsSync(path.join(__dirname, "schema.sql"))) {
        const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
        const statements = schema.split(/;[ \t]*\n/).filter((s) => s.trim().length > 0);
        for (const sql of statements) {
          try {
            await connection.query(sql);
          } catch (err) {
            console.log(`[DB INIT] Notice: Query failed (might exist): ${err.message}`);
          }
        }
      }
      const migrations = [
        "UPDATE deals SET stage='lead_opportunity' WHERE stage='lead';",
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
        "CREATE TABLE IF NOT EXISTS login_logs (id VARCHAR(50) PRIMARY KEY, userId VARCHAR(50) NOT NULL, timestamp DATETIME NOT NULL, ip VARCHAR(100), resolvedHost VARCHAR(255));",
        "UPDATE deals SET stage='opportunity' WHERE stage='lead_opportunity';",
        "ALTER TABLE activities ADD COLUMN duration INT;",
        "ALTER TABLE users ADD COLUMN isTestAccount BOOLEAN DEFAULT FALSE;"
      ];
      for (const m of migrations) {
        try {
          await connection.query(m);
          console.log(`[MIGRATE] Applied: ${m}`);
        } catch (e) {
        }
      }
      console.log("[DB INIT] Database migrations passed successfully.");
      try {
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM segments");
        const count = rows[0].count;
        if (count === 0) {
          const defaultSegments = [
            "Textil / fashion",
            "Obuv",
            "Dom\xE1ce potreby",
            "Kozmetika a drog\xE9ria",
            "\u0160portov\xFD tovar",
            "Elektronika",
            "Doplnky stravy",
            "Knihy a \u010Dasopisy",
            "Potreby pre dom\xE1ce zvierat\xE1",
            "Hra\u010Dky",
            "Ostatn\xED"
          ];
          for (const s of defaultSegments) {
            await connection.query("INSERT INTO segments (id, name, isActive) VALUES (UUID(), ?, TRUE)", [s]);
          }
          console.log(`[DB INIT] Seeded ${defaultSegments.length} default segments.`);
        }
        const [ostatniRows] = await connection.query("SELECT id FROM segments WHERE name = 'Ostatn\xED' LIMIT 1");
        let ostatniId = ostatniRows[0]?.id;
        if (!ostatniId) {
          const uuidRes = await connection.query("SELECT UUID() as uuid");
          ostatniId = uuidRes[0][0].uuid;
          await connection.query("INSERT INTO segments (id, name, isActive) VALUES (?, 'Ostatn\xED', TRUE)", [ostatniId]);
        }
        if (ostatniId) {
          await connection.query("UPDATE companies SET segment = ? WHERE LENGTH(segment) != 36 AND segment IS NOT NULL AND segment != ''", [ostatniId]);
        }
      } catch (e) {
        console.error("[DB INIT] Error seeding segments:", e.message);
      }
      try {
        const [rows] = await connection.query("SELECT id, ip, resolvedHost FROM login_logs WHERE resolvedHost IS NULL OR resolvedHost = '' OR resolvedHost = '-'");
        const logs = rows;
        for (const row of logs) {
          if (row.ip && row.ip !== "127.0.0.1" && row.ip !== "::1") {
            let lookupIp = row.ip;
            if (lookupIp.startsWith("::ffff:")) lookupIp = lookupIp.substring(7);
            try {
              const hostnames = await dns.promises.reverse(lookupIp);
              if (hostnames && hostnames.length > 0) {
                await connection.query("UPDATE login_logs SET resolvedHost = ? WHERE id = ?", [hostnames[0], row.id]);
                console.log(`[DNS] Resolved missing host for login ${row.id}: ${hostnames[0]}`);
              } else {
                if (row.resolvedHost !== "-") await connection.query("UPDATE login_logs SET resolvedHost = ? WHERE id = ?", ["-", row.id]);
              }
            } catch (e) {
              if (row.resolvedHost !== "-") await connection.query("UPDATE login_logs SET resolvedHost = ? WHERE id = ?", ["-", row.id]);
              if (e.code !== "ENOTFOUND") {
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
  } catch (err) {
    console.error("[DB INIT] WARNING: Could not run migrations. DB might be offline.", err.message);
  }
  const userTokens = {};
  app.get("/api/env-debug", authMiddleware, (req, res) => {
    try {
      let envFileContent = "Not found";
      for (const envPath of possibleEnvPaths) {
        if (fs.existsSync(envPath)) {
          envFileContent = fs.readFileSync(envPath, "utf8");
          break;
        }
      }
      const dbg = {
        cwd: process.cwd(),
        dirname: __dirname,
        envFileLocationsChecked: possibleEnvPaths,
        loadedFile: dotenvLoaded ? "Yes, from one of those paths" : "Fallback dotenv.config() called",
        sslKeyPathSetting: process.env.SSL_KEY_PATH || "Not set",
        sslCertPathSetting: process.env.SSL_CERT_PATH || "Not set",
        dbHost: process.env.DB_HOST || "Not set",
        envFileContent
      };
      res.json(dbg);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/auth/integrations-status", authMiddleware, (req, res) => {
    res.json({
      google: {
        configured: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
        clientId: process.env.GOOGLE_CLIENT_ID || ""
      },
      microsoft: {
        configured: !!process.env.MS_CLIENT_ID && !!process.env.MS_CLIENT_SECRET,
        clientId: process.env.MS_CLIENT_ID || ""
      }
    });
  });
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, passwordHash } = req.body;
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ? AND passwordHash = ?", [email, passwordHash]);
      const users = rows;
      if (users.length === 0) {
        return res.status(401).json({ error: "invalidCredentials" });
      }
      const user = users[0];
      if (user.isActive !== 1 && user.isActive !== true) {
        return res.status(403).json({ error: "inactiveAccount" });
      }
      ["googleIntegration", "msIntegration"].forEach((f) => {
        if (typeof user[f] === "string") {
          try {
            user[f] = JSON.parse(user[f]);
          } catch (e) {
          }
        }
      });
      user.isActive = true;
      delete user.passwordHash;
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "15m" }
        // 15 minutes token
      );
      const refreshToken = jwt.sign(
        { id: user.id, type: "refresh" },
        JWT_SECRET,
        { expiresIn: "12h" }
        // 12 hours refresh token
      );
      try {
        const xForwarded = req.headers["x-forwarded-for"] || "";
        const remoteAddr = req.socket.remoteAddress || "";
        const ip = (xForwarded || remoteAddr).toString().split(",")[0].trim();
        let resolvedHost = "";
        if (ip && ip !== "127.0.0.1" && ip !== "::1") {
          try {
            let lookupIp = ip;
            if (lookupIp.startsWith("::ffff:")) lookupIp = lookupIp.substring(7);
            const hostnames = await dns.promises.reverse(lookupIp);
            if (hostnames && hostnames.length > 0) {
              resolvedHost = hostnames[0];
            } else {
              resolvedHost = "-";
            }
          } catch (dnsErr) {
            resolvedHost = "-";
            if (dnsErr.code !== "ENOTFOUND") {
              console.error(`[DNS] Login error for ${ip}:`, dnsErr.message);
            }
          }
        }
        console.log(`[LOGIN] User IP: ${ip}, RemoteAddr: ${remoteAddr}, X-Forwarded: ${xForwarded}, Resolved: ${resolvedHost}`);
        await pool.query(
          "INSERT INTO login_logs (id, userId, timestamp, ip, resolvedHost) VALUES (?, ?, ?, ?, ?)",
          [uuidv4(), user.id, /* @__PURE__ */ new Date(), ip, resolvedHost]
        );
      } catch (logErr) {
        console.error("Failed to write login log:", logErr);
      }
      res.json({ token, refreshToken, user });
    } catch (err) {
      console.error("Login Error:", err);
      if (err.code === "ETIMEDOUT") {
        console.error("HINT: Your database host could not be reached. Check firewall rules, VPNs, and ensure the DB_HOST is accessible from this server.");
      }
      res.status(500).json({ error: "Server error during login", details: err.message });
    }
  });
  app.post("/api/auth/refresh-session", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "unauthorized", message: "No refresh token" });
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      if (decoded.type !== "refresh") throw new Error("Invalid token type");
      const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [decoded.id]);
      const users = rows;
      if (users.length === 0) return res.status(401).json({ error: "unauthorized", message: "User not found" });
      const user = users[0];
      if (user.isActive !== 1 && user.isActive !== true) return res.status(403).json({ error: "inactiveAccount" });
      ["googleIntegration", "msIntegration"].forEach((f) => {
        if (typeof user[f] === "string") {
          try {
            user[f] = JSON.parse(user[f]);
          } catch (e) {
          }
        }
      });
      user.isActive = true;
      delete user.passwordHash;
      const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "15m" }
      );
      const newRefreshToken = jwt.sign(
        { id: user.id, type: "refresh" },
        JWT_SECRET,
        { expiresIn: "12h" }
      );
      res.json({ token: newToken, refreshToken: newRefreshToken, user });
    } catch (e) {
      res.status(401).json({ error: "unauthorized", message: e.message });
    }
  });
  app.post("/api/auth/change-password", authMiddleware, async (req, res) => {
    try {
      const { currentPasswordHash, newPasswordHash } = req.body;
      const userId = req.user.id;
      const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [userId]);
      const users = rows;
      if (users.length === 0) return res.status(404).json({ error: "User not found" });
      const user = users[0];
      if (user.passwordHash !== currentPasswordHash) {
        return res.status(401).json({ error: "invalid_current_password", message: "Current password is incorrect" });
      }
      await pool.query("UPDATE users SET passwordHash = ? WHERE id = ?", [newPasswordHash, userId]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      const users = rows;
      if (users.length === 0) {
        return res.json({ success: true });
      }
      const user = users[0];
      const resetToken = uuidv4();
      await pool.query("UPDATE users SET resetToken = ?, resetTokenExpiry = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE id = ?", [resetToken, user.id]);
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        const origin = req.headers["x-forwarded-host"] ? `https://${req.headers["x-forwarded-host"]}` : `http://${req.headers.host}`;
        const resetUrl = `${origin}/#/reset-password/${resetToken}`;
        const subject = "Obnova hesla / Password Reset";
        const emailLogId = uuidv4();
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"CRM System" <no-reply@crm.com>',
            to: email,
            subject,
            text: `Pro obnovu hesla klikn\u011Bte na n\xE1sleduj\xEDc\xED odkaz: 

${resetUrl}

Tento odkaz plat\xED 10 minut.`,
            html: `<p>Pro obnovu hesla klikn\u011Bte na n\xE1sleduj\xEDc\xED odkaz:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Tento odkaz plat\xED 10 minut.</p>`
          });
          await pool.query(
            "INSERT INTO email_logs (id, recipient, subject, status, error, sentAt) VALUES (?, ?, ?, ?, ?, ?)",
            [emailLogId, email, subject, "sent", null, /* @__PURE__ */ new Date()]
          );
        } catch (mailErr) {
          console.error("Password reset email failed:", mailErr);
          await pool.query(
            "INSERT INTO email_logs (id, recipient, subject, status, error, sentAt) VALUES (?, ?, ?, ?, ?, ?)",
            [emailLogId, email, subject, "error", mailErr.message || String(mailErr), /* @__PURE__ */ new Date()]
          );
          throw mailErr;
        }
      }
      res.json({ success: true, token: process.env.SMTP_HOST ? void 0 : resetToken });
    } catch (err) {
      console.error("Password reset error:", err);
      res.status(500).json({ error: "Failed to send reset email" });
    }
  });
  app.post("/api/auth/update-password", async (req, res) => {
    try {
      const { token, newPasswordHash } = req.body;
      const [rows] = await pool.query("SELECT * FROM users WHERE resetToken = ? AND resetTokenExpiry > NOW()", [token]);
      const users = rows;
      if (users.length === 0) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }
      const user = users[0];
      await pool.query("UPDATE users SET passwordHash = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?", [newPasswordHash, user.id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Password update error:", err);
      res.status(500).json({ error: "Failed to update password" });
    }
  });
  app.get("/api/login_logs", authMiddleware, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== "administrator" && user.role !== "cso") {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const { page = "1", limit = "10", userName } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;
      let query = "SELECT l.*, u.name as userName FROM login_logs l LEFT JOIN users u ON l.userId = u.id WHERE 1=1";
      let countQuery = "SELECT COUNT(*) as total FROM login_logs l LEFT JOIN users u ON l.userId = u.id WHERE 1=1";
      const params = [];
      if (userName) {
        query += " AND u.name LIKE ?";
        countQuery += " AND u.name LIKE ?";
        params.push(`%${userName}%`);
      }
      query += " ORDER BY l.timestamp DESC LIMIT ? OFFSET ?";
      const resultParams = [...params, limitNum, offset];
      const [logsRows] = await pool.query(query, resultParams);
      const [countRows] = await pool.query(countQuery, params);
      const logs = logsRows;
      const total = countRows[0].total;
      res.json({ logs, total, page: pageNum, limit: limitNum });
    } catch (err) {
      console.error("Failed to fetch login logs:", err);
      res.status(500).json({ error: "Failed to fetch login logs" });
    }
  });
  app.get("/api/email_logs", async (req, res) => {
    try {
      const { page = "1", limit = "10", dateFrom, dateTo, recipient, subject, status } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;
      let query = "SELECT * FROM email_logs WHERE 1=1";
      let countQuery = "SELECT COUNT(*) as total FROM email_logs WHERE 1=1";
      const params = [];
      if (dateFrom) {
        query += " AND sentAt >= ?";
        countQuery += " AND sentAt >= ?";
        params.push(new Date(dateFrom));
      }
      if (dateTo) {
        query += " AND sentAt <= ?";
        countQuery += " AND sentAt <= ?";
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        params.push(toDate);
      }
      if (recipient) {
        query += " AND recipient LIKE ?";
        countQuery += " AND recipient LIKE ?";
        params.push(`%${recipient}%`);
      }
      if (subject) {
        query += " AND subject LIKE ?";
        countQuery += " AND subject LIKE ?";
        params.push(`%${subject}%`);
      }
      if (status && status !== "all") {
        query += " AND status = ?";
        countQuery += " AND status = ?";
        params.push(status);
      }
      query += " ORDER BY sentAt DESC LIMIT ? OFFSET ?";
      const resultParams = [...params, limitNum, offset];
      const [logsRows] = await pool.query(query, resultParams);
      const [countRows] = await pool.query(countQuery, params);
      const logs = logsRows;
      const total = countRows[0].total;
      res.json({ logs, total, page: pageNum, limit: limitNum });
    } catch (err) {
      console.error("Failed to fetch email logs:", err);
      res.status(500).json({ error: "Failed to fetch email logs" });
    }
  });
  app.get("/api/auth/google/url", (req, res) => {
    const origin = req.headers["x-forwarded-host"] ? `https://${req.headers["x-forwarded-host"]}` : `http://${req.headers.host}`;
    const redirectUri = `${origin}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "missing_client_id",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly",
      access_type: "offline",
      prompt: "consent"
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });
  app.get("/api/auth/google/callback", async (req, res) => {
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
  app.get("/api/auth/microsoft/url", (req, res) => {
    const origin = req.headers["x-forwarded-host"] ? `https://${req.headers["x-forwarded-host"]}` : `http://${req.headers.host}`;
    const redirectUri = `${origin}/api/auth/microsoft/callback`;
    const params = new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID || "missing_client_id",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "offline_access Calendars.ReadWrite Mail.Read OnlineMeetings.ReadWrite User.Read"
    });
    res.json({ url: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}` });
  });
  app.get("/api/auth/microsoft/callback", async (req, res) => {
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
  app.post("/api/auth/google/exchange", authMiddleware, async (req, res) => {
    const { code } = req.body;
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Google OAuth is not configured on the server." });
      }
      const origin = req.headers["x-forwarded-host"] ? `https://${req.headers["x-forwarded-host"]}` : `http://${req.headers.host}`;
      const redirectUri = `${origin}/api/auth/google/callback`;
      const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const { tokens } = await oAuth2Client.getToken(code);
      res.json({ tokens });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/auth/microsoft/exchange", authMiddleware, async (req, res) => {
    const { code } = req.body;
    try {
      const clientId = process.env.MS_CLIENT_ID;
      const clientSecret = process.env.MS_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Microsoft OAuth is not configured on the server." });
      }
      const origin = req.headers["x-forwarded-host"] ? `https://${req.headers["x-forwarded-host"]}` : `http://${req.headers.host}`;
      const redirectUri = `${origin}/api/auth/microsoft/callback`;
      const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      });
      const tokens = await response.json();
      if (tokens.error) throw new Error(tokens.error_description || tokens.error);
      res.json({ tokens });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
  const callMsGraphWithRetry = async (initialTokens, userId, pool2, apiCall) => {
    let currentTokens = initialTokens;
    try {
      const client = GraphClient.init({ authProvider: (done) => done(null, currentTokens.access_token) });
      return await apiCall(client);
    } catch (e) {
      if (e.statusCode === 401 || e.message && (e.message.includes("expired") || e.message.includes("InvalidAuthenticationToken"))) {
        if (!currentTokens.refresh_token) throw new Error("Missing Microsoft refresh token");
        const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.MS_CLIENT_ID || "",
            client_secret: process.env.MS_CLIENT_SECRET || "",
            refresh_token: currentTokens.refresh_token,
            grant_type: "refresh_token"
          })
        });
        const newTokens = await response.json();
        if (newTokens.error) throw new Error(newTokens.error_description || newTokens.error);
        const mergedTokens = { ...currentTokens, ...newTokens };
        const [rows] = await pool2.query("SELECT msIntegration FROM users WHERE id = ?", [userId]);
        if (rows[0]) {
          let msInt = null;
          try {
            msInt = JSON.parse(rows[0].msIntegration);
          } catch (err) {
          }
          if (msInt) {
            msInt.tokens = mergedTokens;
            await pool2.query("UPDATE users SET msIntegration = ? WHERE id = ?", [JSON.stringify(msInt), userId]);
          }
        }
        const retryClient = GraphClient.init({ authProvider: (done) => done(null, mergedTokens.access_token) });
        return await apiCall(retryClient);
      }
      throw e;
    }
  };
  app.post("/api/sync/calendar", authMiddleware, async (req, res) => {
    const { provider, credentials, activityDetails, action = "create" } = req.body;
    let meetingLink = "";
    let externalEventId = activityDetails?.externalEventId || "";
    try {
      if (provider === "google" && credentials?.tokens) {
        const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        oAuth2Client.setCredentials(credentials.tokens);
        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
        if (action === "delete" && externalEventId) {
          await calendar.events.delete({
            calendarId: "primary",
            eventId: externalEventId,
            sendUpdates: "all"
          });
        } else {
          const startDateTime = new Date(activityDetails.date);
          const durationMinutes = activityDetails.duration || 60;
          const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1e3);
          const reqBody = {
            summary: activityDetails.note || "Meeting",
            start: { dateTime: startDateTime.toISOString() },
            end: { dateTime: endDateTime.toISOString() },
            attendees: activityDetails.attendees ? activityDetails.attendees.map((email) => ({ email })) : []
          };
          let eventRes;
          if (action === "update" && externalEventId) {
            eventRes = await calendar.events.patch({
              calendarId: "primary",
              eventId: externalEventId,
              sendUpdates: "all",
              requestBody: reqBody
            });
          } else {
            reqBody.conferenceData = {
              createRequest: {
                requestId: Math.random().toString(36).substring(7),
                conferenceSolutionKey: { type: "hangoutsMeet" }
              }
            };
            eventRes = await calendar.events.insert({
              calendarId: "primary",
              sendUpdates: "all",
              conferenceDataVersion: 1,
              requestBody: reqBody
            });
          }
          meetingLink = eventRes.data.hangoutLink || "";
          externalEventId = eventRes.data.id || externalEventId;
        }
      } else if (provider === "microsoft" && credentials?.tokens) {
        await callMsGraphWithRetry(credentials.tokens, req.user.id, pool, async (client) => {
          if (action === "delete" && externalEventId) {
            await client.api(`/me/events/${externalEventId}`).delete();
          } else {
            const startDateTime = new Date(activityDetails.date);
            const durationMinutes = activityDetails.duration || 60;
            const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1e3);
            const event = {
              subject: activityDetails.note || "Meeting",
              start: { dateTime: startDateTime.toISOString().replace("Z", ""), timeZone: "UTC" },
              end: { dateTime: endDateTime.toISOString().replace("Z", ""), timeZone: "UTC" },
              attendees: activityDetails.attendees ? activityDetails.attendees.map((email) => ({
                emailAddress: { address: email },
                type: "required"
              })) : []
            };
            let newEvent;
            if (action === "update" && externalEventId) {
              newEvent = await client.api(`/me/events/${externalEventId}`).patch(event);
            } else {
              event.isOnlineMeeting = true;
              event.onlineMeetingProvider = "teamsForBusiness";
              newEvent = await client.api("/me/events").post(event);
            }
            meetingLink = newEvent.onlineMeeting?.joinUrl || "";
            externalEventId = newEvent.id || externalEventId;
          }
        });
      }
      res.json({ success: true, meetingLink, externalEventId });
    } catch (err) {
      console.error("Calendar error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/sync/fetch-calendar", authMiddleware, async (req, res) => {
    const { provider, credentials, relevantEmails } = req.body;
    let events = [];
    try {
      if (provider === "google" && credentials?.tokens) {
        const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        oAuth2Client.setCredentials(credentials.tokens);
        const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
        const resList = await calendar.events.list({
          calendarId: "primary",
          timeMin: (/* @__PURE__ */ new Date()).toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: "startTime"
        });
        events = (resList.data.items || []).map((item) => ({
          id: item.id,
          subject: item.summary,
          date: item.start?.dateTime,
          link: item.hangoutLink,
          attendees: item.attendees?.map((a) => a.email) || []
        }));
      } else if (provider === "microsoft" && credentials?.tokens) {
        const resList = await callMsGraphWithRetry(credentials.tokens, req.user.id, pool, async (client) => {
          return await client.api("/me/events").filter(`start/dateTime ge '${(/* @__PURE__ */ new Date()).toISOString()}'`).select("id,subject,start,onlineMeeting,attendees").top(100).get();
        });
        events = resList.value.map((item) => {
          let dateStr = item.start?.dateTime;
          if (dateStr && item.start?.timeZone === "UTC" && !dateStr.endsWith("Z")) {
            dateStr += "Z";
          }
          return {
            id: item.id,
            subject: item.subject,
            date: dateStr,
            link: item.onlineMeeting?.joinUrl,
            attendees: item.attendees?.map((a) => a.emailAddress?.address) || []
          };
        });
      }
      if (relevantEmails && relevantEmails.length > 0) {
        const emailsLower = relevantEmails.map((e) => e.toLowerCase());
        events = events.filter((ev) => {
          return ev.attendees.some((attObj) => emailsLower.includes((attObj || "").toLowerCase()));
        });
      }
      res.json({ events });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/sync/emails", authMiddleware, async (req, res) => {
    const { provider, credentials, relevantEmails } = req.body;
    let emailResults = [];
    try {
      if (relevantEmails && relevantEmails.length > 0) {
        if (provider === "google" && credentials?.tokens) {
          const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
          oAuth2Client.setCredentials(credentials.tokens);
          const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
          const query = relevantEmails.map((e) => `from:${e} OR to:${e} OR cc:${e}`).join(" OR ");
          const listRes = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 10 });
          if (listRes.data.messages) {
            for (const msg of listRes.data.messages) {
              if (!msg.id) continue;
              const msgRes = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "full" });
              const headers = msgRes.data.payload?.headers || [];
              const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
              const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
              const to = headers.find((h) => h.name?.toLowerCase() === "to")?.value || "";
              const cc = headers.find((h) => h.name?.toLowerCase() === "cc")?.value || "";
              const date = headers.find((h) => h.name?.toLowerCase() === "date")?.value || (/* @__PURE__ */ new Date()).toISOString();
              const attachments = [];
              const extractAttachments = (parts) => {
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
                body: msgRes.data.snippet || ""
              });
            }
          }
        } else if (provider === "microsoft" && credentials?.tokens) {
          const uniqueEmails = Array.from(new Set(relevantEmails));
          const searchQuery = '"' + uniqueEmails.map((e) => `participants:${e}`).join(" OR ") + '"';
          const messages = await callMsGraphWithRetry(credentials.tokens, req.user.id, pool, async (client) => {
            return await client.api("/me/messages").header("ConsistencyLevel", "eventual").search(searchQuery).select("id,subject,from,toRecipients,ccRecipients,hasAttachments,receivedDateTime,bodyPreview").expand("attachments($select=name,contentType)").top(10).get();
          });
          if (messages && messages.value) {
            emailResults = messages.value.map((msg) => ({
              id: msg.id,
              subject: msg.subject,
              from: msg.from?.emailAddress?.address || msg.from?.emailAddress?.name || "",
              to: (msg.toRecipients || []).map((r) => r.emailAddress?.address).join(", "),
              cc: (msg.ccRecipients || []).map((r) => r.emailAddress?.address).join(", "),
              attachments: msg.hasAttachments && msg.attachments ? msg.attachments.map((a) => a.name) : [],
              date: msg.receivedDateTime,
              body: msg.bodyPreview
            }));
          }
        }
      }
      res.json({ emails: emailResults });
    } catch (err) {
      console.error("Email syntax error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  const multer = (await import("multer")).default;
  const baseDir = __dirname.endsWith("dist") || __dirname.endsWith("server-build") ? path.resolve(__dirname, "..") : __dirname;
  const uploadDir = process.env.UPLOAD_DIR ? path.resolve(baseDir, process.env.UPLOAD_DIR) : path.join(baseDir, "uploads");
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const ico = req.body.ico || "unknown_ico";
      const dir = path.join(uploadDir, ico);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const prefix = req.body.documentPrefix || "document";
      const ext = path.extname(file.originalname);
      cb(null, `${prefix}${ext}`);
    }
  });
  const upload = multer({ storage });
  app.use("/api/uploads", express.static(uploadDir));
  app.post("/api/upload", authMiddleware, upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      console.log("File uploaded to:", req.file.path, "Size:", req.file.size);
      if (!fs.existsSync(req.file.path)) {
        return res.status(500).json({ error: "File was processed but could not be saved to disk. Check directory permissions." });
      }
      const user = req.user;
      const eventData = {
        userId: user?.id,
        userName: user?.name,
        clientId: req.headers["x-client-id"],
        type: "upload",
        timestamp: Date.now()
      };
      latestClientEvent = eventData;
      const io2 = req.app.get("io");
      if (io2) {
        io2.emit("data-changed", eventData);
      }
      res.json({ success: true, fileUrl: `/api/uploads/${req.body.ico || "unknown_ico"}/${req.file.filename}` });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/upload", authMiddleware, (req, res) => {
    try {
      const fileUrl = req.query.url;
      if (!fileUrl) {
        return res.status(400).json({ error: "Invalid url" });
      }
      const decodedUrl = decodeURIComponent(fileUrl);
      let relativePath = "";
      if (decodedUrl.startsWith("/api/uploads/")) {
        relativePath = decodedUrl.replace("/api/uploads/", "");
      } else if (decodedUrl.startsWith("/uploads/")) {
        relativePath = decodedUrl.replace("/uploads/", "");
      } else {
        return res.status(400).json({ error: "Invalid url" });
      }
      const filePath = path.join(uploadDir, relativePath);
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(uploadDir)) {
        return res.status(403).json({ error: "Forbiden path" });
      }
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Delete file error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/manual", async (req, res) => {
    try {
      const lang = req.query.lang === "cs" ? "cs" : "en";
      const isCS = lang === "cs";
      const stages = isCS ? [
        { name: "Lead & Opportunita", requirements: "Vy\u017Eaduje pouh\xE9 zalo\u017Een\xED p\u0159es Kanban desku. Tuto f\xE1z\xED b\u011B\u017En\u011B operuje Hunter." },
        { name: "Discovery & Proposal", requirements: "Pro p\u0159echod do t\xE9to f\xE1ze mus\xED Hunter prov\xE9zt \xFAvodn\xED sch\u016Fzku. Zde prob\xEDh\xE1 komunikace, odes\xEDlaj\xED se nab\xEDdky." },
        { name: "Contracting (Smlouv\xE1n\xED)", requirements: "Kl\xED\u010Dov\xFD p\u0159echod. Nutno vyplnit: Doru\u010Dovac\xED zem\u011B (Delivery countries), Pr\u016Fm\u011Brn\xFD po\u010Det kus\u016F v objedn\xE1vce (Items), V\xE1ha (Weight), Objem (Volume). Nutno nahr\xE1t cenovou nab\xEDdku." },
        { name: "Onboarding", requirements: "Smlouva je podeps\xE1na. Vy\u017Eadovan\xE1 pole pro p\u0159echod: Datum podpisu smlouvy (Contract Signed Date), Datum nahr\xE1n\xED cen\xEDku, Preferovan\xFD za\u010D\xE1tek IT integrace a O\u010Dek\xE1van\xE9 prvn\xED naskladn\u011Bn\xED." },
        { name: "Farming (\u017Div\xFD provoz)", requirements: "Kone\u010Dn\xE1 f\xE1ze. Vy\u017Eaduje: Potvrzen\xED o dokon\u010Den\xED IT integrace, Ostr\xE9 datum prvn\xEDho naskladn\u011Bn\xED (Actual First Stocking) a dokon\u010Den\xE9 UAT testov\xE1n\xED." },
        { name: "Lost & Postponed", requirements: "Z jak\xE9koliv f\xE1ze lze p\u0159ej\xEDt do rozezn\xE1n\xED ztr\xE1ty (Lost - vy\u017Eaduje vybr\xE1n\xED d\u016Fvodu \xFAbytku ze sd\xEDlen\xE9ho \u010D\xEDseln\xEDku) nebo Odlo\u017Een\xED (Postponed - vy\u017Eaduje zad\xE1n\xED data p\u0159ipomenut\xED a d\u016Fvodu odlo\u017Een\xED)." }
      ] : [
        { name: "Lead & Opportunity", requirements: "Only requires creation via Kanban board. Fully operated by Hunter." },
        { name: "Discovery & Proposal", requirements: "Transitioned by Hunter after initial meeting. Used for communication and proposals." },
        { name: "Contracting", requirements: "Critical transition. Mandatory attributes: Delivery countries, Average Items, Weight, Volume. Must upload a pricing offer." },
        { name: "Onboarding", requirements: "Contract signed. Required fields: Contract Signed Date, Pricing Upload Date, IT Integration ID/Start, and Expected First Stocking Date." },
        { name: "Farming (Live operations)", requirements: "Final stage. Requires: IT Integration Completed Date, Actual First Stocking Date, and Testing Completed Date." },
        { name: "Lost & Postponed", requirements: "Can be transitioned to from any stage. Lost requires a reason from enumerations. Postponed requires resume date and reason." }
      ];
      const rolesCS = [
        {
          name: "Hunter",
          privileges: "Operuje prim\xE1rn\u011B v za\u010D\xE1tc\xEDch (Lead & Opportunita -> Proposal).",
          actions: [
            "Vytv\xE1\u0159en\xED nov\xFDch Deal\u016F (Company Name, I\u010CO, Zdroj).",
            "Vypl\u0148ov\xE1n\xED z\xE1kladn\xEDch e-commerce platforem a Lead Sources.",
            "Zad\xE1v\xE1n\xED a spr\xE1va kontaktn\xEDch osob dan\xE9 firmy (titul, jm\xE9no, email, telefon).",
            "Vytv\xE1\u0159en\xED meeting\u016F a logov\xE1n\xED historie (i kdy\u017E pozd\u011Bji p\u0159eb\xEDr\xE1 n\u011Bkdo jin\xFD, Hunter m\xE1 read-only)."
          ]
        },
        {
          name: "Closer",
          privileges: "P\u0159ij\xEDm\xE1 Deal po f\xE1zi Proposal, zam\u011B\u0159uje se na vykouzlen\xED Contractu.",
          actions: [
            "Spr\xE1va atribut\u016F bal\xEDk\u016F (V\xE1ha [Weight], Objem [Volume], Po\u010Det).",
            "Ur\u010Dov\xE1n\xED doru\u010Dovac\xEDch zem\xED (Delivery countries - z multi-select v\xFDb\u011Bru).",
            "M\u016F\u017Ee prov\xE1d\u011Bt DNC (Do Not Contact) ozna\u010Den\xED klienta v p\u0159\xEDpad\u011B nespokojenosti.",
            'Kliknut\xEDm na "Add Offer" nahr\xE1v\xE1 k dealu historicky nezni\u010Diteln\xE9 cenov\xE9 nab\xEDdky (v PDF).'
          ]
        },
        {
          name: "Farmer (Account Manager)",
          privileges: "Star\xE1 se o \u017Eiv\xE9ho (Farming) a onboarduj\xEDc\xEDho klienta.",
          actions: [
            'Komunikuje s IT pro dopln\u011Bn\xED datumu "IT Integration Completed".',
            "Identifikuje re\xE1ln\xFD start obchodu a p\u0159episuje odhady.",
            'P\u0159i\u0159azuje klientsk\xFDm kontakt\u016Fm tag "Inactive", pokud dan\xE1 osoba opustila firmu.'
          ]
        },
        {
          name: "Vedouc\xED",
          privileges: "Nad\u0159\xEDzen\xFD k rol\xEDm (Hunter/Closer/Farmer).",
          actions: [
            "Vid\xED Dealy vlastn\u011Bn\xE9 t\u011Bmi pod\u0159\xEDzen\xFDmi skrz cel\xFD syst\xE9m Kanbanu.",
            "Z pohledu \xFAprav z\xEDsk\xE1v\xE1 stejn\xE1 pr\xE1va (M\u016F\u017Ee editovat, ps\xE1t pozn\xE1mky).",
            "Monitoruje Email logy a kalend\xE1\u0159."
          ]
        },
        {
          name: "CSO (Chief Sales Officer)",
          privileges: "Absolutn\xED p\u0159\xEDstup k Sales potrub\xED (Pipeline).",
          actions: [
            'U libovoln\xE9ho Dealu m\u016F\u017Ee v z\xE1lo\u017Ece "Company Details" m\u011Bnit aktu\xE1ln\xED p\u0159i\u0159azen\xED v re\xE1ln\xE9m \u010Dase.',
            'Ozna\u010Den\xEDm z\xE1znamu "Visible: false" je m\u016F\u017Ee utajit p\u0159ed ni\u017E\u0161\xEDmi rolemi.'
          ]
        },
        {
          name: "Admin",
          privileges: "Zaji\u0161\u0165uje technick\xFD chod aplikace.",
          actions: [
            'Sekce "Admin Panel": Zakl\xE1d\xE1 ostatn\xED u\u017Eivatele, resetuje hesla.',
            'M\u011Bn\xED konstantn\xED \u010D\xEDseln\xEDky: "Lead Sources", "Lost Reasons", atd.',
            "Spravuje tabulky s podrobn\xFDmi Login logy (historie p\u0159ihl\xE1\u0161en\xED)."
          ]
        }
      ];
      const rolesEN = [
        {
          name: "Hunter",
          privileges: "Operates primarily in the early stages (Lead & Opportunity -> Proposal).",
          actions: [
            "Creates new Deals (Company Name, ID, Source).",
            "Fills basic e-commerce platforms and Lead Sources.",
            "Enters and manages contact persons for the company.",
            "Creates meetings and logs history (read-only for others later)."
          ]
        },
        {
          name: "Closer",
          privileges: "Receives the Deal after Proposal, focuses on Contracting.",
          actions: [
            "Manages parcel attributes (Weight, Volume, Items).",
            "Defines delivery countries (Delivery countries multi-select).",
            "Can mark client contacts as DNC (Do Not Contact).",
            'Uploads pricing offers (PDFs) clicking "Add Offer".'
          ]
        },
        {
          name: "Farmer (Account Manager)",
          privileges: "Handles live (Farming) and onboarding clients.",
          actions: [
            'Communicates with IT to log "IT Integration Completed" dates.',
            "Identifies actual launch metadata and overrides estimates.",
            'Can tag client contacts as "Inactive" if they leave their company.'
          ]
        },
        {
          name: "Manager",
          privileges: "Supervisor of Hunter/Closer/Farmer roles.",
          actions: [
            "Sees Deals owned by their subordinates across the Kanban board.",
            "Inherits edit permissions for subordinate deals.",
            "Monitors Email logs and synced calendars."
          ]
        },
        {
          name: "CSO (Chief Sales Officer)",
          privileges: "Absolute access to the Sales Pipeline.",
          actions: [
            'Can change role assignments (Hunter, Closer, Farmer) in real-time via the "Company Details" tab.',
            "Can hide sensitive activities (Visible: false) from lower roles."
          ]
        },
        {
          name: "Admin",
          privileges: "Ensures technical operation.",
          actions: [
            '"Admin Panel": Creates users, resets passwords.',
            'Manages enumerations: "Lead Sources", "Lost Reasons", etc.',
            "Manages Login logs and the full audit trail (tracking all field changes)."
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
            ${isCS ? "Tisk do PDF" : "Print to PDF"}
          </button>
          
          <div class="content-wrapper">
            <h1>${isCS ? "Podrobn\xFD u\u017Eivatelsk\xFD manu\xE1l aplikace" : "Detailed Application User Manual"}</h1>
            <p class="subtitle">${isCS ? "Tento dokument slou\u017E\xED jako detailn\xED pr\u016Fvodce pro ve\u0161ker\xE9 role syst\xE9mu CRM, specifikuje stavy, datov\xE9 atributy a p\u0159echody." : "This document serves as a detailed guide for all CRM roles, specifying stages, data attributes, and transitions."}</p>
            
            <h2>${isCS ? "1. \xDAvod a p\u0159\xEDstup do syst\xE9mu" : "1. Introduction and System Access"}</h2>
            <p>${isCS ? "P\u0159\xEDstup do syst\xE9mu je zaji\u0161t\u011Bn v\xFDhradn\u011B na z\xE1klad\u011B p\u0159id\u011Blen\xFDch p\u0159\xEDstupov\xFDch \xFAdaj\u016F (email a heslo). Prvotn\xED heslo by m\u011Blo b\xFDt co nejd\u0159\xEDve zm\u011Bn\u011Bno v sekci Profil. B\u011Bhem pou\u017E\xEDv\xE1n\xED komunikuje syst\xE9m bezpe\u010Dn\u011B pomoc\xED \u0161ifrovan\xE9ho spojen\xED. Data se organizuj\xED dle jednotliv\xFDch obchodn\xEDch p\u0159\xEDpad\u016F (Deals)." : "System access is provided strictly through assigned credentials (email and password). The initial password should be changed as soon as possible in the Profile section. The system organizes data into commercial opportunities called Deals."}</p>
            
            <h2>${isCS ? "2. U\u017Eivatelsk\xE9 rozhran\xED (N\xE1st\u011Bnka vs Seznam)" : "2. User Interface (Board vs List)"}</h2>
            <p>${isCS ? "Ka\u017Ed\xFD u\u017Eivatel m\xE1 mo\u017Enost p\u0159ep\xEDnat mezi vizu\xE1ln\xEDm zobrazen\xEDm Kanban (sloupce dle f\xE1z\xED) a tabulkov\xFDm Seznamem p\u0159es p\u0159ep\xEDna\u010D v prav\xE9m horn\xEDm rohu. Ob\u011B zobrazen\xED reflektuj\xED ta sam\xE1 pr\xE1va a omezen\xED. Ze Seznamu i N\xE1st\u011Bnky se lze prokliknout do detailu p\u0159\xEDle\u017Eitosti. Sloupce listu obsahuj\xED mo\u017Enost filtrovat dle stavu (Stage) \u010Di zem\u011B." : "Every user can toggle between the visual Kanban Board and a Tabular List view using the toggle in the top right corner. Both views respect the same permissions and constraints. Users can click into the Deal detail from both views. The list allows filtering by Stage or Country."}</p>
            
            <h2>${isCS ? "3. P\u0159echody mezi stavy (Pipeline Transitions)" : "3. Pipeline Stages and Transitions"}</h2>
            <p>${isCS ? "\u017Divotn\xED cyklus obchodn\xEDho p\u0159\xEDpadu (Deal) proch\xE1z\xED pevn\u011B stanoven\xFDmi f\xE1zemi. Pro p\u0159echod mezi nimi jsou vy\u017Eadov\xE1na konkr\xE9tn\xED data a pr\xE1va." : "The lifecycle of a Deal progresses through fixed stages. Specific data and permissions are required to move between them."}</p>
            
            <div>
              ${stages.map((s) => `
                <div class="stage-block">
                  <div class="stage-name">${s.name}</div>
                  <div class="stage-req">${s.requirements}</div>
                </div>
              `).join("")}
            </div>
            
            <div class="page-break"></div>
            
            <h2>${isCS ? "4. Seznam rol\xED a jejich operace" : "4. User Roles and Operations"}</h2>
            <div>
              ${rolesList.map((r) => `
                <div class="role">
                  <h3 class="role-name">Role: ${r.name}</h3>
                  <div class="role-privilege">${r.privileges}</div>
                  <ul>
                    ${r.actions.map((a) => `<li>${a}</li>`).join("")}
                  </ul>
                </div>
              `).join("")}
            </div>

            <div class="page-break"></div>

            <h2>${isCS ? "4. Grafick\xE9 uk\xE1zky a interakce (Simulace)" : "4. UI Screenshots and Interfaces"}</h2>
            
            <h3>${isCS ? "D1: Horn\xED panel (Header)" : "D1: Header Panel"}</h3>
            <p>${isCS ? "Na prav\xE9 stran\u011B vedle avatara u\u017Eivatele naleznete p\u0159ep\xEDna\u010D jazyk\u016F, ikonu ozuben\xE9ho kola (Nastaven\xED integrace kalend\xE1\u0159e - Google & Microsoft) a rozklinut\xEDm avatara se otev\u0159e tento profil. Zde je mo\u017En\xE9 zm\u011Bnit heslo i st\xE1hnout si tento manu\xE1l." : "On the right side next to the user avatar, you can find language switchers, a gear icon (Calendar Integrations - Google & MS), and clicking your avatar opens this profile. Here you can change your password and download this manual."}</p>
            
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: white; border: 1px solid #e5e7eb; padding: 15px 20px; border-radius: 8px; font-family: sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 20px 0; page-break-inside: avoid;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 24px; height: 24px; background: #3b82f6; border-radius: 4px;"></div>
                <div style="font-weight: bold; font-size: 18px; color: #111827;">FHB CRM</div>
              </div>
              <div style="display: flex; align-items: center; gap: 15px; color: #4b5563;">
                <span style="font-size: 14px; padding: 6px 12px; background: #f3f4f6; border-radius: 20px;">\u{1F50D} ${isCS ? "Hledat dle I\u010CO \u010Di n\xE1zvu" : "Search by ID or name"}...</span>
                <span style="font-size: 18px;" title="${isCS ? "Integrace kalend\xE1\u0159e" : "Calendar Integration"}">\u{1F4C5}</span>
                <span style="display: inline-block; padding: 4px 8px; font-size: 14px; border: 1px solid #d1d5db; border-radius: 4px;">CS \u25BE</span>
                <span style="display: inline-flex; justify-content: center; align-items: center; width: 36px; height: 36px; background: #3b82f6; color: white; border-radius: 50%; font-weight: bold; font-size: 14px;">JD</span>
              </div>
            </div>

            <h3>${isCS ? "D2: Kanban n\xE1st\u011Bnka (Pipeline)" : "D2: Kanban Board (Pipeline)"}</h3>
            <p>${isCS ? 'Z\xE1kladn\xED obrazovka po p\u0159ihl\xE1\u0161en\xED. Dealy (p\u0159\xEDle\u017Eitosti) jsou zobrazeny jako karty ve sloupc\xEDch podle sv\xE9 f\xE1ze. Lze mezi nimi p\u0159esouvat, ale pouze pokud jsou spln\u011Bny datov\xE9 po\u017Eadavky konkr\xE9tn\xED role. Nov\xFD deal vytvo\u0159\xEDte kliknut\xEDm na tla\u010D\xEDtko "Add Deal".' : 'The main screen after logging in. Deals (opportunities) are displayed as cards in columns according to their stage. You can move them, but only if the data requirements for your role are met. Create a new deal by clicking "Add Deal".'}</p>            
            <div style="display: flex; gap: 10px; font-family: sans-serif; background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; page-break-inside: avoid;">
              <div style="flex: 1; background: #e5e7eb; border-radius: 6px; padding: 10px;">
                 <div style="font-weight: bold; font-size: 12px; margin-bottom: 10px; color: #374151;">LEAD & OPP... <span style="background: white; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">1</span></div>
                 <div style="background: white; padding: 10px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-size: 13px;">
                    <div style="font-weight: bold; color: #111;">ABC s.r.o.</div>
                    <div style="color: #6b7280; font-size: 11px; margin-top: 4px;">Web Form</div>
                 </div>
              </div>
              <div style="flex: 1; background: #e5e7eb; border-radius: 6px; padding: 10px;">
                 <div style="font-weight: bold; font-size: 12px; margin-bottom: 10px; color: #374151;">DISCOVERY &... <span style="background: white; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">0</span></div>
              </div>
              <div style="flex: 1; background: #e5e7eb; border-radius: 6px; padding: 10px;">
                 <div style="font-weight: bold; font-size: 12px; margin-bottom: 10px; color: #374151;">CONTRACTING <span style="background: white; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">0</span></div>
              </div>
              <div style="flex: 1; background: #e5e7eb; border-radius: 6px; padding: 10px;">
                 <div style="font-weight: bold; font-size: 12px; margin-bottom: 10px; color: #374151;">ONBOARDING <span style="background: white; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">0</span></div>
              </div>
            </div>

            <div class="page-break"></div>

            <h3>${isCS ? "D3: Detail firmy (Deal View) a pl\xE1nov\xE1n\xED sch\u016Fzek" : "D3: Deal View and Event Planning"}</h3>
            <p>${isCS ? "Rozd\u011Blen\xE9 obrazovky:<br/><b>LEV\xDD PANEL:</b> \xDAdaje firmy, Tagy, Produktov\xE1 \u010D\xE1st, Dodatkov\xE9 kontaktn\xED osoby, P\u0159enosy f\xE1z\xED (Dal\u0161\xED f\xE1ze = Zelen\xE9 tla\u010D\xEDtko vpravo naho\u0159e). Pokud podtrhnut\xE9 pole sv\xEDt\xED \u010Derven\u011B, znamen\xE1 to chyb\u011Bj\xEDc\xED data pro p\u0159echod.<br/><b>PRAV\xDD PANEL:</b> Kalend\xE1\u0159 sch\u016Fzek, Log aktivit (hovory, zpr\xE1vy), Uploadovan\xE9 dokumenty a p\u0159id\xE1v\xE1n\xED nab\xEDdek (PDF)." : "Split view:<br/><b>LEFT PANEL:</b> Company details, Tags, Products, Additional contact persons, Stage transitions (Next stage = Green button top right). If an underlined field shines red, data is missing for the transition.<br/><b>RIGHT PANEL:</b> Calendar events, Activity Logs, Uploaded documents and adding Offers (PDF)."}</p>
            
            <div style="display: flex; gap: 20px; font-family: sans-serif; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; page-break-inside: avoid;">
              <div style="flex: 2; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <h3 style="margin-top: 0; margin-bottom: 10px; color: #111;">Detail Firmy: ABC s.r.o.</h3>
                  <div style="background: #10b981; color: white; padding: 8px 16px; border-radius: 6px; font-weight: bold; font-size: 14px;">Advance to Discovery & Proposal \u2192</div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                   <span style="padding: 4px 8px; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-size: 12px; font-weight: 600;">Stav / Stage: Lead & Opportunity</span>
                   <span style="padding: 4px 8px; background: #f3f4f6; color: #374151; border-radius: 4px; font-size: 12px;">Zdroj: Web Form</span>
                </div>
                
                <div style="display: flex; gap: 20px; margin-bottom: 20px; background: #fafafa; padding: 15px; border-radius: 6px; border: 1px dashed #d1d5db;">
                   <div style="flex: 1;">
                     <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Z\xE1kladn\xED \xFAdaje</div>
                     <div style="margin-top: 8px; font-size: 14px;"><strong>I\u010CO:</strong> <span style="color: #ef4444; border-bottom: 1px dashed #ef4444;" title="Chyb\u011Bj\xEDc\xED \xFAdaj pro p\u0159echod">Nevypln\u011Bno</span></div>
                     <div style="margin-top: 5px; font-size: 14px;"><strong>Zem\u011B:</strong> CZ, SK</div>
                   </div>
                   <div style="flex: 1;">
                     <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Kontaktn\xED osoby (+ P\u0159idat)</div>
                     <div style="margin-top: 8px; font-size: 14px; background: #fff; padding: 5px; border: 1px solid #eee;">
                        <b>Jan Nov\xE1k</b> (CEO) <br> <span style="color: #6b7280; font-size: 12px;">jan.novak@abc.cz | +420 123 456 789</span>
                     </div>
                   </div>
                </div>
              </div>
              
              <div style="flex: 1; background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;">
                   <span style="font-weight: bold; font-size: 14px; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: -11px;">Timeline</span>
                   <span style="font-weight: bold; font-size: 14px; color: #6b7280;">Documents</span>
                   <span style="font-weight: bold; font-size: 14px; color: #6b7280;">Emails</span>
                </div>
                
                <div style="flex: 1;">
                  <div style="background: #fdf2f8; border: 1px solid #fbcfe8; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                    <div style="font-size: 12px; color: #db2777; font-weight: bold;">\u{1F4C5} Pl\xE1novan\xE1 sch\u016Fzka</div>
                    <div style="font-size: 13px; margin-top: 4px;">Dnes 15:00 - Google Meet (Sync)</div>
                  </div>

                  <div style="border-left: 2px solid #e5e7eb; padding-left: 15px; margin-bottom: 15px; position: relative;">
                    <div style="position: absolute; left: -5px; top: 0; width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></div>
                    <div style="font-size: 12px; color: #6b7280;">Dnes 14:00 \u2022 <b>Hunter</b></div>
                    <div style="font-size: 14px; margin-top: 4px; color: #374151;">Telefon\xE1t s klientem - dohodnuta sch\u016Fzka.</div>
                  </div>
                  
                  <div style="border-left: 2px solid #e5e7eb; padding-left: 15px; position: relative;">
                    <div style="position: absolute; left: -5px; top: 0; width: 8px; height: 8px; border-radius: 50%; background: #9ca3af;"></div>
                    <div style="font-size: 12px; color: #6b7280;">V\u010Dera 10:00 \u2022 <b>Hunter</b></div>
                    <div style="font-size: 14px; margin-top: 4px; color: #374151;">Zalo\u017Een\xED dealu z formul\xE1\u0159e.</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="page-break"></div>

            <h3>${isCS ? "D4: Sekce Administrace (Admin Panel)" : "D4: Administration Section (Admin Panel)"}</h3>
            <p>${isCS ? "Vyhrazen\xE1 sekce pro roli Admin. Slou\u017E\xED ke spr\xE1v\u011B u\u017Eivatel\u016F (zm\u011Bny hesel a opr\xE1vn\u011Bn\xED - rol\xED). Umo\u017E\u0148uje editaci glob\xE1ln\xEDch \u010D\xEDseln\xEDk\u016F (D\u016Fvody ztr\xE1ty, Zdroje lead\u016F). Poskytuje pohled na Loginy a mo\u017Enost auditovat syst\xE9m d\xEDky integrovan\xE9mu vyhled\xE1v\xE1n\xED email\u016F nad Workspace \xFA\u010Dty (M365, Google)." : "A dedicated section for the Admin role. Used for user management (password resets, role assignment). Allows editing global enumerations (Lost Reasons, Lead Sources). Provides access to Login logs and system audits with integrated email search across Workspace accounts (M365, Google)."}</p>
            
            <div style="font-family: sans-serif; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; page-break-inside: avoid;">
               <div style="display: flex; gap: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 15px;">
                 <span style="font-weight: bold; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 13px; margin-bottom: -15px;">Spr\xE1va U\u017Eivatel\u016F</span>
                 <span style="font-weight: bold; color: #6b7280;">\u010C\xEDseln\xEDky (Enums)</span>
                 <span style="font-weight: bold; color: #6b7280;">Audit (Emaily)</span>
                 <span style="font-weight: bold; color: #6b7280;">Login Logy</span>
               </div>
               
               <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                 <b>V\u0161ichni u\u017Eivatel\xE9 syst\xE9mu:</b>
                 <button style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold;">+ P\u0159idat U\u017Eivatele</button>
               </div>
               
               <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 14px;">
                 <tr style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                   <th style="padding: 10px;">Email</th>
                   <th style="padding: 10px;">Role</th>
                   <th style="padding: 10px;">Vytvo\u0159eno</th>
                   <th style="padding: 10px;">Akce</th>
                 </tr>
                 <tr style="border-bottom: 1px solid #e5e7eb;">
                   <td style="padding: 10px;">admin@fhb.com</td>
                   <td style="padding: 10px;"><span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Admin</span></td>
                   <td style="padding: 10px;">1. 1. 2026</td>
                   <td style="padding: 10px; color: #3b82f6;">Zm\u011Bnit heslo</td>
                 </tr>
                 <tr>
                   <td style="padding: 10px;">hunter@fhb.com</td>
                   <td style="padding: 10px;"><span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Hunter</span></td>
                   <td style="padding: 10px;">2. 1. 2026</td>
                   <td style="padding: 10px; color: #3b82f6;">Zm\u011Bnit heslo</td>
                 </tr>
               </table>
               
               <div style="margin-top: 30px; background: #fff8f1; padding: 15px; border-left: 4px solid #f97316; border-radius: 4px;">
                  <b>Tip: Audit (Vyhled\xE1v\xE1n\xED Email\u016F)</b> 
                  <p style="font-size: 13px; margin-top: 5px; color: #431407;">V z\xE1lo\u017Ece Audit m\xE1 administr\xE1tor mo\u017Enost vyhled\xE1vat p\u0159\xEDchoz\xED i odchoz\xED zpr\xE1vy p\u0159es propojen\xE9 Microsoft 365 a Google Workspace \xFA\u010Dty u\u017Eivatel\u016F (nap\u0159. fulltextov\xE9 vyhled\xE1v\xE1n\xED dle I\u010CO nebo dom\xE9ny klienta), co\u017E slou\u017E\xED k dohledu a z\xE1lohov\xE1n\xED d\u016Fle\u017Eit\xE9 komunikace ke konkr\xE9tn\xEDm deal\u016Fm.</p>
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
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (err) {
      console.error("Failed to generate manual:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Manual generation failed" });
      }
    }
  });
  app.get("/api/deals/:id/details", authMiddleware, async (req, res) => {
    try {
      const dealId = req.params.id;
      const [auditLogs] = await pool.query("SELECT * FROM audit_logs WHERE dealId = ?", [dealId]);
      const [activities] = await pool.query("SELECT * FROM activities WHERE dealId = ?", [dealId]);
      const parseJsonFields = (arr, fields) => arr.map((item) => {
        fields.forEach((f) => {
          if (typeof item[f] === "string") {
            try {
              item[f] = JSON.parse(item[f]);
            } catch (e) {
            }
          }
        });
        return item;
      });
      const parsedActivities = parseJsonFields(activities, ["participants"]);
      parsedActivities.forEach((act) => {
        if ("isVisible" in act) act.isVisible = act.isVisible === 1 || act.isVisible === true;
      });
      res.json({
        auditLogs,
        activities: parsedActivities
      });
    } catch (err) {
      console.error("Deal details fetch error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/state", authMiddleware, async (req, res) => {
    try {
      const [users] = await pool.query("SELECT * FROM users");
      const [companies] = await pool.query("SELECT * FROM companies");
      const [deals] = await pool.query("SELECT * FROM deals");
      const [leadSources] = await pool.query("SELECT * FROM lead_sources");
      const [segments] = await pool.query("SELECT * FROM segments");
      const [ecommercePlatforms] = await pool.query("SELECT * FROM ecommerce_platforms");
      const [itIntegrations] = await pool.query("SELECT * FROM it_integrations");
      const [lostReasons] = await pool.query("SELECT * FROM lost_reasons");
      const parseJsonFields = (arr, fields) => arr.map((item) => {
        fields.forEach((f) => {
          if (typeof item[f] === "string") {
            try {
              item[f] = JSON.parse(item[f]);
            } catch (e) {
            }
          }
        });
        if ("isActive" in item) item.isActive = item.isActive === 1 || item.isActive === true;
        if ("isVisible" in item) item.isVisible = item.isVisible === 1 || item.isVisible === true;
        if ("passwordHash" in item) delete item.passwordHash;
        return item;
      });
      const parsedUsers = parseJsonFields(users, ["googleIntegration", "msIntegration"]);
      const currentUserId = req.user?.id;
      const me = parsedUsers.find((u) => u.id === currentUserId) || null;
      res.json({
        users: parsedUsers,
        me,
        companies: parseJsonFields(companies, ["urls", "contacts"]),
        deals: parseJsonFields(deals, ["deliveryCountries", "pricingOffers", "documents", "notes"]),
        leadSources: parseJsonFields(leadSources, []),
        segments: parseJsonFields(segments, []),
        ecommercePlatforms: parseJsonFields(ecommercePlatforms, []),
        itIntegrations: parseJsonFields(itIntegrations, []),
        lostReasons: parseJsonFields(lostReasons, []),
        auditLogs: [],
        activities: []
      });
    } catch (err) {
      console.error("DB State Error:", err);
      if (err.code === "ETIMEDOUT") {
        console.error("HINT: Your database host could not be reached. Check firewall rules, VPNs, and ensure the DB_HOST is accessible from this server.");
      }
      res.status(500).json({ error: `DB state failed: ${err.message}`, details: err.message });
    }
  });
  app.post("/api/deals/:id/assign", authMiddleware, async (req, res) => {
    try {
      const dealId = req.params.id;
      const { field, newUserId } = req.body;
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.query("SELECT * FROM deals WHERE id = ?", [dealId]);
        const deals = rows;
        if (deals.length === 0) {
          return res.status(404).json({ error: "Deal not found" });
        }
        const deal = deals[0];
        const currentAssignee = deal[field];
        if (newUserId && currentAssignee && currentAssignee !== newUserId) {
          const [userRows] = await connection.query("SELECT name FROM users WHERE id = ?", [currentAssignee]);
          const users = userRows;
          const currentUserName = users.length > 0 ? users[0].name : currentAssignee;
          return res.status(400).json({ error: `Tuto p\u0159\xEDle\u017Eitost ji\u017E p\u0159evzal u\u017Eivatel ${currentUserName}.` });
        }
        res.json({ success: true });
      } finally {
        connection.release();
      }
    } catch (err) {
      console.error("Assign check error:", err);
      res.status(500).json({ error: "Failed to check assignment" });
    }
  });
  let latestClientEvent = null;
  app.get("/api/latest-activity", authMiddleware, (req, res) => {
    res.json(latestClientEvent || {});
  });
  app.post("/api/sync-action", authMiddleware, async (req, res) => {
    try {
      const { entities } = req.body;
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      try {
        for (const [table, rows] of Object.entries(entities)) {
          if (!rows || rows.length === 0) continue;
          for (const row of rows) {
            const keys = Object.keys(row);
            const values = Object.values(row).map((v) => {
              if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
                return new Date(v);
              }
              return typeof v === "object" && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v;
            });
            const placeholders = keys.map(() => "?").join(", ");
            const updateStmts = keys.map((k) => `${k} = VALUES(${k})`).join(", ");
            const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateStmts}`;
            await connection.query(sql, values);
          }
        }
        await connection.commit();
        const user = req.user;
        const eventData = {
          userId: user?.id,
          userName: user?.name,
          clientId: req.headers["x-client-id"],
          type: "sync",
          timestamp: Date.now(),
          tables: Object.keys(entities)
        };
        latestClientEvent = eventData;
        const io2 = req.app.get("io");
        if (io2) {
          io2.emit("data-changed", eventData);
        }
        res.json({ success: true });
      } catch (e) {
        await connection.rollback();
        throw e;
      } finally {
        connection.release();
      }
    } catch (err) {
      console.error("Sync Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/delete-entity", authMiddleware, async (req, res) => {
    try {
      const { table, id } = req.body;
      if (!table || !id) {
        return res.status(400).json({ error: "Missing table or id" });
      }
      const allowedTables = ["lead_sources", "segments", "ecommerce_platforms", "it_integrations", "lost_reasons", "activities"];
      if (!allowedTables.includes(table)) {
        return res.status(403).json({ error: "Deletion not allowed for this table" });
      }
      let fkColumn = "";
      let refTable = "deals";
      if (table === "lead_sources") {
        fkColumn = "leadSourceId";
      } else if (table === "ecommerce_platforms") {
        fkColumn = "ecommercePlatformId";
      } else if (table === "it_integrations") {
        fkColumn = "itIntegrationId";
      } else if (table === "lost_reasons") {
        fkColumn = "lostReasonId";
      } else if (table === "segments") {
        fkColumn = "segment";
        refTable = "companies";
      }
      if (fkColumn) {
        const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${refTable} WHERE ${fkColumn} = ?`, [id]);
        const count = rows[0].count;
        if (count > 0) {
          return res.status(400).json({ error: `Cannot delete because there are ${count} records in ${refTable} referencing this entity.` });
        }
      }
      await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      const user = req.user;
      const eventData = {
        userId: user?.id,
        userName: user?.name,
        clientId: req.headers["x-client-id"],
        type: "delete",
        table,
        timestamp: Date.now()
      };
      latestClientEvent = eventData;
      const io2 = req.app.get("io");
      if (io2) {
        io2.emit("data-changed", eventData);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Delete Error:", err);
      res.status(500).json({ error: `Delete failed: ${err.message}` });
    }
  });
  app.get("/api/health", async (req, res) => {
    try {
      if (process.env.DB_PASSWORD && process.env.DB_NAME) {
        const [rows] = await pool.query("SELECT 1 + 1 AS result");
      }
      res.json({ status: "ok", mysql: "configured" });
    } catch (error) {
      console.error("Database connection error:", error);
      res.status(500).json({ status: "error", message: "Database connection failed" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(baseDir, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCertPath = process.env.SSL_CERT_PATH;
  let server;
  if (sslKeyPath && sslCertPath) {
    try {
      console.log(`Starting HTTPS server with cert: ${sslCertPath} and key: ${sslKeyPath}`);
      const privateKey = fs.readFileSync(sslKeyPath, "utf8");
      const certificate = fs.readFileSync(sslCertPath, "utf8");
      const credentials = { key: privateKey, cert: certificate };
      const https = await import("https");
      server = https.createServer(credentials, app);
      server.listen(PORT, "0.0.0.0", () => {
        console.log(`HTTPS Server running on port ${PORT}`);
      });
      const httpApp = express();
      httpApp.use("*", (req, res) => {
        const httpsPortStr = PORT === 443 ? "" : `:${PORT}`;
        res.redirect(`https://${req.hostname}${httpsPortStr}${req.url}`);
      });
      const httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : PORT === 443 ? 80 : PORT + 1;
      httpApp.listen(httpPort, "0.0.0.0", () => {
        console.log(`HTTP redirect server running on port ${httpPort}`);
      });
    } catch (err) {
      console.error("CRITICAL: Failed to start HTTPS server:", err.message);
      console.error("Check your SSL_KEY_PATH and SSL_CERT_PATH variables and ensure the files exist and are readable.");
      process.exit(1);
    }
  } else {
    console.warn("WARNING: SSL_KEY_PATH and/or SSL_CERT_PATH not found in environment. Starting plain HTTP server.");
    server = http.createServer(app);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`HTTP Server running on http://localhost:${PORT}`);
    });
  }
  async function sendAssignmentEmail(hunterId, dealId, companyName, connection) {
    try {
      const [hunterRows] = await connection.query("SELECT email, managerId FROM users WHERE id = ?", [hunterId]);
      if (!hunterRows || hunterRows.length === 0) return;
      const hunter = hunterRows[0];
      let managerEmail = null;
      if (hunter.managerId) {
        const [mgrRows] = await connection.query("SELECT email FROM users WHERE id = ?", [hunter.managerId]);
        if (mgrRows && mgrRows.length > 0) managerEmail = mgrRows[0].email;
      }
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.ethereal.email",
        port: parseInt(process.env.SMTP_PORT || "587"),
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        } : void 0
      });
      const appUrl = process.env.VITE_APP_URL || "http://localhost:3000";
      const link = `${appUrl}/deal/${dealId}`;
      const mailOptions = {
        from: process.env.SMTP_FROM || '"CRM" <crm@mobilgroup.cz>',
        to: hunter.email,
        cc: managerEmail ? managerEmail : void 0,
        subject: "Nov\xE1 p\u0159\xEDle\u017Eitost automaticky p\u0159id\u011Blena",
        text: `Byla v\xE1m automaticky p\u0159id\u011Blena nov\xE1 p\u0159\xEDle\u017Eitost pro spole\u010Dnost ${companyName}.
Odkaz: ${link}`
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
        const [rows] = await connection.query(`
        SELECT DISTINCT d.id 
        FROM deals d
        JOIN activities a ON d.id = a.dealId
        WHERE d.stage = 'opportunity' 
          AND d.hunterId IS NOT NULL 
          AND d.hunterId != ''
          AND a.type IN ('call', 'teams', 'meeting')
          AND a.date <= NOW()
      `);
        const dealsToAdvance = rows;
        if (dealsToAdvance.length > 0) {
          for (const deal of dealsToAdvance) {
            await connection.query("UPDATE deals SET stage = 'lead', updatedAt = NOW() WHERE id = ?", [deal.id]);
            console.log(`[JOBS] Deal ${deal.id} advanced to lead.`);
          }
        }
      } finally {
        connection.release();
      }
    } catch (err) {
      console.error("[JOBS] Hourly job error:", err);
    }
  }
  async function runDailyJob() {
    console.log("[JOBS] Running daily job...");
    try {
      const connection = await pool.getConnection();
      try {
        const [dealRows] = await connection.query(`
        SELECT d.id, c.name as companyName 
        FROM deals d
        JOIN companies c ON d.companyId = c.id
        WHERE d.stage = 'opportunity' 
          AND (d.hunterId IS NULL OR d.hunterId = '')
          AND d.createdAt < DATE_SUB(NOW(), INTERVAL 5 DAY)
      `);
        const dealsToAssign = dealRows;
        if (dealsToAssign.length > 0) {
          const [hunterRows] = await connection.query(`
          SELECT id 
          FROM users 
          WHERE role = 'hunter' 
            AND isActive = TRUE 
            AND (isTestAccount IS NULL OR isTestAccount = FALSE)
        `);
          const hunters = hunterRows;
          if (hunters.length > 0) {
            for (const deal of dealsToAssign) {
              let bestHunterId = hunters[0].id;
              let minDeals = Infinity;
              const tieHunters = [];
              for (const h of hunters) {
                const [cntRows] = await connection.query(`
                 SELECT COUNT(*) as count 
                 FROM deals 
                 WHERE hunterId = ? AND stage IN ('opportunity', 'lead')
               `, [h.id]);
                const count = cntRows[0].count;
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
    } catch (err) {
      console.error("[JOBS] Daily job error:", err);
    }
  }
  setTimeout(() => {
    runHourlyJob();
    runDailyJob();
    setInterval(runHourlyJob, 60 * 60 * 1e3);
    setInterval(runDailyJob, 24 * 60 * 60 * 1e3);
  }, 1e4);
  const io = new SocketServer(server, { cors: { origin: "*" } });
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
  app.set("io", io);
  const startTeamsActivityWorker = () => {
    setInterval(async () => {
      try {
        console.log("[Worker] Running Teams Activity Worker to check summaries and recordings...");
        const [activities] = await pool.query(
          "SELECT * FROM activities WHERE type = 'teams' AND externalEventId IS NOT NULL AND (recordingLink IS NULL OR meetingSummary IS NULL) AND date < NOW()"
        );
        if (activities.length === 0) return;
        for (const activity of activities) {
          try {
            const [users] = await pool.query("SELECT * FROM users WHERE id = ?", [activity.createdBy]);
            if (users.length === 0) continue;
            const user = users[0];
            let msIntegration = null;
            if (user.msIntegration) {
              try {
                msIntegration = JSON.parse(user.msIntegration);
              } catch (e) {
              }
            }
            if (!msIntegration?.connected || !msIntegration?.tokens) continue;
            await callMsGraphWithRetry(msIntegration.tokens, user.id, pool, async (client) => {
              let eventUrl = "";
              try {
                const event = await client.api(`/me/events/${activity.externalEventId}`).select("onlineMeeting").get();
                eventUrl = event.onlineMeeting?.joinUrl;
              } catch (e) {
                if (e.statusCode === 404) {
                  return;
                }
              }
              if (!eventUrl) return;
              let meetingId = null;
              try {
                const meetings = await client.api("/me/onlineMeetings").filter(`JoinWebUrl eq '${eventUrl}'`).get();
                if (meetings.value && meetings.value.length > 0) {
                  meetingId = meetings.value[0].id;
                }
              } catch (e) {
                console.error("[Worker] Failed to resolve online meeting. Make sure the OAuth user has OnlineMeetings.Read or equivalent application permissions.", e.message);
              }
              if (!meetingId) return;
              let newRecordingLink = activity.recordingLink;
              let newMeetingSummary = activity.meetingSummary;
              if (!newRecordingLink) {
                try {
                  const recordings = await client.api(`/me/onlineMeetings/${meetingId}/recordings`).get();
                  if (recordings.value && recordings.value.length > 0) {
                    newRecordingLink = recordings.value[0].recordingContentUrl || recordings.value[0].webUrl;
                  }
                } catch (e) {
                }
              }
              if (!newMeetingSummary) {
                try {
                  const transcripts = await client.api(`/me/onlineMeetings/${meetingId}/transcripts`).get();
                  if (transcripts.value && transcripts.value.length > 0) {
                    const transcriptId = transcripts.value[0].id;
                    try {
                      const content = await client.api(`/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content?$format=text/vtt`).get();
                      if (typeof content === "string") {
                        const stripped = content.replace(/<[^>]+>/g, "").replace(/[\r\n]+/g, "\n").substring(0, 5e3);
                        newMeetingSummary = "Auto-fetched Transcript/Review:\n" + stripped;
                      }
                    } catch (e) {
                      if (e.statusCode === 404) {
                      }
                    }
                  }
                } catch (e) {
                }
              }
              if (newRecordingLink !== activity.recordingLink || newMeetingSummary !== activity.meetingSummary) {
                await pool.query(
                  "UPDATE activities SET recordingLink = ?, meetingSummary = ? WHERE id = ?",
                  [newRecordingLink || null, newMeetingSummary || null, activity.id]
                );
                const [updated] = await pool.query("SELECT * FROM activities WHERE id = ?", [activity.id]);
                if (updated.length > 0) {
                  const row = updated[0];
                  if (typeof row.participants === "string") try {
                    row.participants = JSON.parse(row.participants);
                  } catch (e) {
                  }
                  row.isVisible = row.isVisible === 1 || row.isVisible === true;
                  io.emit("db_changed", { type: "activities", action: "update", data: row });
                }
              }
            });
          } catch (internalErr) {
            console.error("[Worker] failed for activity", activity.id, internalErr.message);
          }
        }
      } catch (err) {
        console.error("[Worker] error", err.message);
      }
    }, 1e3 * 60 * 60);
  };
  startTeamsActivityWorker();
}
startServer().catch(console.error);
