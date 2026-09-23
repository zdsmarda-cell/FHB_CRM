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
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token && req.query && typeof req.query.token === "string") {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).json({ error: "unauthorized", message: "Missing or invalid token" });
  }
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
        "ALTER TABLE activities ADD COLUMN updatedAt DATETIME;"
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
        const [rows] = await connection.query("SELECT COUNT(*) as count FROM contact_positions");
        const count = rows[0].count;
        if (count === 0) {
          const defaultPositions = [
            "CEO / Majitel",
            "C-Level / \u0158editel",
            "Logistick\xFD mana\u017Eer",
            "E-commerce Manager",
            "N\xE1kup\u010D\xED / Sourcing Manager",
            "IT / Provozn\xED mana\u017Eer",
            "Finan\u010Dn\xED \u0159editel / CFO",
            "Ostatn\xED"
          ];
          for (const p of defaultPositions) {
            await connection.query("INSERT INTO contact_positions (id, name, isActive) VALUES (UUID(), ?, TRUE)", [p]);
          }
          console.log(`[DB INIT] Seeded ${defaultPositions.length} default contact positions.`);
        }
        const [comps] = await connection.query("SELECT id, contacts FROM companies");
        for (const comp of comps) {
          if (comp.contacts) {
            let contactsArr = typeof comp.contacts === "string" ? JSON.parse(comp.contacts) : comp.contacts;
            if (Array.isArray(contactsArr) && contactsArr.length > 0) {
              let modified = false;
              contactsArr = contactsArr.map((c) => {
                if (c.position !== void 0 && c.position !== "") {
                  modified = true;
                  return { ...c, position: "" };
                }
                return c;
              });
              if (modified) {
                await connection.query("UPDATE companies SET contacts = ? WHERE id = ?", [JSON.stringify(contactsArr), comp.id]);
              }
            }
          }
        }
      } catch (e) {
        console.error("[DB INIT] Error seeding/migrating contact_positions:", e.message);
      }
      try {
        const [remRows] = await connection.query("SELECT COUNT(*) as count FROM stage_reminders");
        if (remRows[0].count === 0) {
          const defaultReminders = [
            { id: uuidv4(), stage: "opportunity", days: 7, action: "", color: "yellow" },
            { id: uuidv4(), stage: "opportunity", days: 14, action: "email", color: "orange" },
            { id: uuidv4(), stage: "lead", days: 7, action: "", color: "yellow" },
            { id: uuidv4(), stage: "lead", days: 14, action: "email", color: "orange" }
          ];
          for (const r of defaultReminders) {
            await connection.query("INSERT INTO stage_reminders (id, stage, days, action, color) VALUES (?, ?, ?, ?, ?)", [r.id, r.stage, r.days, r.action, r.color]);
          }
          console.log(`[DB INIT] Seeded default stage reminders.`);
        }
      } catch (e) {
        console.error("[DB INIT] Error seeding stage_reminders:", e.message);
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
  app.get("/api/user_login_counts", authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT userId, COUNT(*) as count FROM login_logs GROUP BY userId");
      const counts = {};
      for (const row of rows) {
        if (row.userId) {
          counts[row.userId] = Number(row.count) || 0;
        }
      }
      res.json(counts);
    } catch (err) {
      console.error("Failed to fetch user login counts:", err);
      res.status(500).json({ error: "Failed to fetch user login counts" });
    }
  });
  app.get("/api/email_logs", authMiddleware, async (req, res) => {
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
      console.error("Calendar error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  const fetchWithRetry = async (url, options = {}, retries = 2, delayMs = 1e3, timeoutMs = 15e3) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        return response;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        }
      }
    }
    const msg = lastError?.name === "AbortError" ? `Connection timeout after ${timeoutMs}ms (${url})` : lastError?.message || String(lastError);
    throw new Error(msg);
  };
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
      const response = await fetchWithRetry("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
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
      console.error("Microsoft exchange error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  const callMsGraphWithRetry = async (initialTokens, userId, pool2, apiCall) => {
    let currentTokens = initialTokens;
    try {
      const client = GraphClient.init({ authProvider: (done) => done(null, currentTokens.access_token) });
      return await apiCall(client);
    } catch (e) {
      const isAuthError = e.statusCode === 401 || e.message && (e.message.includes("expired") || e.message.includes("InvalidAuthenticationToken") || e.message.includes("Access token has expired") || e.message.includes("token is expired"));
      if (isAuthError) {
        if (!currentTokens.refresh_token) throw new Error("Missing Microsoft refresh token");
        let response;
        try {
          response = await fetchWithRetry("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.MS_CLIENT_ID || "",
              client_secret: process.env.MS_CLIENT_SECRET || "",
              refresh_token: currentTokens.refresh_token,
              grant_type: "refresh_token"
            })
          }, 2, 1e3, 15e3);
        } catch (fetchErr) {
          throw new Error(`Microsoft token endpoint unreachable (${fetchErr.message || fetchErr})`);
        }
        const newTokens = await response.json();
        if (newTokens.error) {
          await pool2.query("UPDATE users SET msIntegration = NULL WHERE id = ?", [userId]);
          throw new Error("Microsoft authentication expired or revoked. Please sign in again. (" + (newTokens.error_description || newTokens.error) + ")");
        }
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
      if (e.message && (e.message.includes("fetch failed") || e.message.includes("UND_ERR") || e.message.includes("timeout"))) {
        try {
          await new Promise((r) => setTimeout(r, 1e3));
          const retryClient = GraphClient.init({ authProvider: (done) => done(null, currentTokens.access_token) });
          return await apiCall(retryClient);
        } catch (retryErr) {
          throw new Error(`Microsoft Graph request failed (network error): ${retryErr.message || retryErr}`);
        }
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
  function extractCleanEmails(inputs) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = /* @__PURE__ */ new Set();
    for (const input of inputs) {
      if (!input || typeof input !== "string") continue;
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
      if (relevantEmails !== void 0) {
        const cleanEmails = extractCleanEmails(Array.isArray(relevantEmails) ? relevantEmails : [relevantEmails]);
        if (cleanEmails.length === 0) {
          events = [];
        } else {
          events = events.filter((ev) => {
            return ev.attendees.some((attObj) => {
              if (!attObj) return false;
              const attLower = attObj.toLowerCase();
              return cleanEmails.some((ce) => attLower.includes(ce));
            });
          });
        }
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
      const uniqueEmails = extractCleanEmails(Array.isArray(relevantEmails) ? relevantEmails : []);
      if (uniqueEmails.length === 0) {
        return res.json({ emails: [] });
      }
      if (provider === "google" && credentials?.tokens) {
        const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        oAuth2Client.setCredentials(credentials.tokens);
        const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
        const query = uniqueEmails.map((e) => `(from:${e} OR to:${e} OR cc:${e})`).join(" OR ");
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
        const searchQuery = uniqueEmails.map((e) => `"participants:${e}"`).join(" OR ");
        try {
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
        } catch (graphErr) {
          console.warn("MS Graph search warning:", graphErr?.message || graphErr);
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
  app.get("/api/manual", authMiddleware, async (req, res) => {
    try {
      const lang = req.query.lang === "cs" ? "cs" : "en";
      const isCS = lang === "cs";
      const stagesDetailed = isCS ? [
        {
          id: "opportunity",
          name: "1. Opportunity (Oportunita / Z\xE1jemce)",
          role: "Hunter",
          color: "#3b82f6",
          desc: "\xDAvodn\xED zachycen\xED potenci\xE1ln\xEDho klienta do obchodn\xEDho potrub\xED.",
          reqs: [
            "P\u0159i\u0159azen\xED garanta z rol\xED Hunter (Hunter ID).",
            "Vypln\u011Bn\xE9 I\u010CO v profilu spole\u010Dnosti (Identifika\u010Dn\xED \u010D\xEDslo firmy).",
            "Alespo\u0148 1 realizovan\xE1 aktivita (Telefonn\xED hovor, MS Teams nebo Osobn\xED sch\u016Fzka) s datem v minulosti nebo p\u0159\xEDtomnosti."
          ]
        },
        {
          id: "lead",
          name: "2. Lead (Kvalifikovan\xFD lead)",
          role: "Hunter",
          color: "#6366f1",
          desc: "Prov\u011B\u0159en\xFD z\xE1jemce s potvrzen\xFDm obchodn\xEDm potenci\xE1lem a kvalifikovan\xFDm profilem.",
          reqs: [
            "P\u0159i\u0159azen\xED garanta z rol\xED Hunter (Hunter ID).",
            "Vypln\u011Bn\xFD Zdroj leadu (Lead Source) - v\xFDb\u011Br ze syst\xE9mov\xE9ho \u010D\xEDseln\xEDku.",
            "Vypln\u011Bn\xE1 E-commerce platforma (Shoptet, WooCommerce, Shopify, Custom API apod.).",
            "Kladn\xFD odhadovan\xFD m\u011Bs\xED\u010Dn\xED po\u010Det z\xE1silek (Estimated Monthly Parcels > 0)."
          ]
        },
        {
          id: "discovery_proposal",
          name: "3. Discovery & Proposal (Objevov\xE1n\xED & Nab\xEDdka)",
          role: "Closer",
          color: "#8b5cf6",
          desc: "Sb\u011Br technick\xFDch parametr\u016F z\xE1silek, logistick\xE9 specifikace a tvorba schv\xE1len\xE9 cenov\xE9 nab\xEDdky.",
          reqs: [
            "P\u0159i\u0159azen\xED garanta z rol\xED Closer (Closer ID).",
            "V\xFDb\u011Br doru\u010Dovac\xEDch zem\xED (Delivery Countries - alespo\u0148 1 zem\u011B v multi-select poli).",
            "Pr\u016Fm\u011Brn\xFD po\u010Det kus\u016F na objedn\xE1vku (Average Items Per Order > 0).",
            "Pr\u016Fm\u011Brn\xE1 v\xE1ha bal\xEDku v kg (Average Parcel Weight > 0 kg).",
            "Pr\u016Fm\u011Brn\xFD objem bal\xEDku v m\xB3 (Average Parcel Volume > 0 m\xB3).",
            "Nahran\xE1 alespo\u0148 1 cenov\xE1 nab\xEDdka ve form\xE1tu PDF v sekci Cenov\xE9 nab\xEDdky (Pricing Offers)."
          ]
        },
        {
          id: "contracting",
          name: "4. Contracting (Smluvn\xED jedn\xE1n\xED)",
          role: "Closer",
          color: "#ec4899",
          desc: "P\u0159\xEDprava a podpis smluvn\xED dokumentace, dojedn\xE1n\xED garanc\xED a v\xFDb\u011Br IT napojen\xED.",
          reqs: [
            "P\u0159i\u0159azen\xED garanta z rol\xED Closer (Closer ID).",
            "Vypln\u011Bn\xE9 datum podpisu smlouvy (Contract Signed Date).",
            "Vypln\u011Bn\xE9 datum nahr\xE1n\xED schv\xE1len\xE9ho cen\xEDku (Pricing Uploaded Date).",
            "Vybran\xFD syst\xE9m IT integrace (IT Integration ID z \u010D\xEDseln\xEDku).",
            "Vypln\u011Bn\xE9 o\u010Dek\xE1van\xE9 datum 1. naskladn\u011Bn\xED (Expected First Stocking Date)."
          ]
        },
        {
          id: "onboarding",
          name: "5. Onboarding (Integrace & Nasklad\u0148ov\xE1n\xED)",
          role: "Farmer",
          color: "#f59e0b",
          desc: "Technick\xE9 napojen\xED syst\xE9m\u016F, fyzick\xFD p\u0159ej\xEDmkov\xFD proces zbo\u017E\xED na sklad a testov\xE1n\xED.",
          reqs: [
            "Skute\u010Dn\xE9 datum dokon\u010Den\xED IT integrace (IT Integration Completed Date).",
            "Skute\u010Dn\xE9 datum prvn\xEDho naskladn\u011Bn\xED zbo\u017E\xED (Actual First Stocking Date).",
            "Skute\u010Dn\xE9 datum dokon\u010Den\xED akcepta\u010Dn\xEDho testov\xE1n\xED UAT (Integration Testing Completed Date)."
          ]
        },
        {
          id: "farming",
          name: "6. Farming (\u017Div\xFD provoz)",
          role: "Farmer",
          color: "#10b981",
          desc: "Pln\xFD ostr\xFD fulfillment provoz z\xE1kazn\xEDka, dlouhodob\xE1 p\xE9\u010De, rozvoj \xFA\u010Dtu a sledov\xE1n\xED spokojenosti.",
          reqs: [
            "Kone\u010Dn\xE1 produk\u010Dn\xED f\xE1ze. Klient generuje \u017Eiv\xE9 objedn\xE1vky v syst\xE9mu."
          ]
        },
        {
          id: "lost_postponed",
          name: "7. Lost (Ztraceno) & Postponed (Odlo\u017Eeno)",
          role: "V\u0161ichni",
          color: "#ef4444",
          desc: "Mimo\u0159\xE1dn\xE9 stavy dostupn\xE9 z jak\xE9koliv f\xE1ze pipeline.",
          reqs: [
            "Ztraceno (Lost): Vy\u017Eaduje vybr\xE1n\xED D\u016Fvodu ztr\xE1ty ze syst\xE9mov\xE9ho \u010D\xEDseln\xEDku (Lost Reason) a nepovinn\xFD koment\xE1\u0159. Ukl\xE1d\xE1 p\u016Fvodn\xED stav (Lost From Stage) pro mo\u017Enost pozd\u011Bj\u0161\xEDho obnoven\xED.",
            "Odlo\u017Eeno (Postponed): Vy\u017Eaduje datum obnoven\xED jedn\xE1n\xED (Postponed Until) a zd\u016Fvodn\u011Bn\xED odlo\u017Een\xED."
          ]
        }
      ] : [
        {
          id: "opportunity",
          name: "1. Opportunity",
          role: "Hunter",
          color: "#3b82f6",
          desc: "Initial entry of a potential client into the sales pipeline.",
          reqs: [
            "Assigned Hunter (Hunter ID).",
            "Company ID / Registration Number filled in Company profile.",
            "At least 1 completed activity (Call, MS Teams, or Meeting) dated present or past."
          ]
        },
        {
          id: "lead",
          name: "2. Qualified Lead",
          role: "Hunter",
          color: "#6366f1",
          desc: isCS ? "Prov\u011B\u0159en\xFD lead s potvrzen\xFDm obchodn\xEDm potenci\xE1lem (SQL). Po spln\u011Bn\xED podm\xEDnek se na kart\u011B v Kanbanu aktivuje tla\u010D\xEDtko [SQL \u2192]." : "Vetted lead with confirmed commercial potential (SQL). When conditions are met, the [SQL \u2192] button activates on the Kanban card.",
          reqs: [
            isCS ? "P\u0159i\u0159azen\xFD garant z role Hunter (Hunter ID)." : "Assigned Hunter (Hunter ID).",
            isCS ? "Vybran\xFD Zdroj leadu ze syst\xE9mov\xE9ho \u010D\xEDseln\xEDku." : "Selected Lead Source from system enumeration.",
            isCS ? "Vybran\xE1 E-commerce platforma (Shoptet, WooCommerce, Custom API apod.)." : "Selected E-commerce Platform (Shoptet, WooCommerce, Custom API, etc.).",
            isCS ? "Kladn\xFD odhadovan\xFD m\u011Bs\xED\u010Dn\xED po\u010Det z\xE1silek (> 0)." : "Positive Estimated Monthly Parcels count (> 0).",
            isCS ? "Po spln\u011Bn\xED t\u011Bchto 4 podm\xEDnek lze deal okam\u017Eit\u011B odeslat do f\xE1ze Discovery & Ponuka tla\u010D\xEDtkem [SQL \u2192] v Kanbanu." : "Upon fulfilling these 4 conditions, the deal can be directly dispatched to Discovery & Proposal via the [SQL \u2192] Kanban card button."
          ]
        },
        {
          id: "discovery_proposal",
          name: "3. Discovery & Proposal",
          role: "Closer",
          color: "#8b5cf6",
          desc: "Gathering logistics metrics, defining delivery matrix, and issuing pricing offers.",
          reqs: [
            "Assigned Closer (Closer ID).",
            "Selected Delivery Countries (at least 1 country in multi-select).",
            "Average Items Per Order (> 0).",
            "Average Parcel Weight (> 0 kg).",
            "Average Parcel Volume (> 0 m\xB3).",
            "Uploaded at least 1 Pricing Offer PDF in the Offers section."
          ]
        },
        {
          id: "contracting",
          name: "4. Contracting",
          role: "Closer",
          color: "#ec4899",
          desc: "Preparing and signing contracts, agreeing SLAs, selecting IT integration.",
          reqs: [
            "Assigned Closer (Closer ID).",
            "Contract Signed Date.",
            "Pricing Upload Date.",
            "Selected IT Integration system from enumeration.",
            "Expected First Stocking Date."
          ]
        },
        {
          id: "onboarding",
          name: "5. Onboarding",
          role: "Farmer",
          color: "#f59e0b",
          desc: "Technical IT integration, inventory intake, and order testing.",
          reqs: [
            "IT Integration Completed Date.",
            "Actual First Stocking Date.",
            "UAT Testing Completed Date."
          ]
        },
        {
          id: "farming",
          name: "6. Farming (Live operations)",
          role: "Farmer",
          color: "#10b981",
          desc: "Full live fulfillment operation, account management, and growth.",
          reqs: [
            "Final production stage. Live orders processing."
          ]
        },
        {
          id: "lost_postponed",
          name: "7. Lost & Postponed",
          role: "All Roles",
          color: "#ef4444",
          desc: "Special states accessible from any stage.",
          reqs: [
            "Lost: Requires selecting a Lost Reason from enumeration and optional note. Preserves Lost From Stage.",
            "Postponed: Requires Postponed Until date and reason."
          ]
        }
      ];
      const rolesCS = [
        {
          name: "Hunter",
          privileges: "Fokus na za\u010D\xE1tek obchodn\xEDho cyklu (Opportunity & Lead).",
          actions: [
            "Zad\xE1v\xE1 nov\xE9 z\xE1jemce a spole\u010Dnosti (N\xE1zev, I\u010CO, Adresa, Kontakty).",
            "Dopl\u0148uje Zdroje lead\u016F a E-commerce platformy.",
            "Pl\xE1nuje a realizuje \xFAvodn\xED sch\u016Fzky a telefon\xE1ty pro kvalifikaci.",
            "Garantuje p\u0159echod z Opportunity do Lead a n\xE1sledn\u011B do Discovery & Proposal."
          ]
        },
        {
          name: "Closer",
          privileges: "P\u0159eb\xEDr\xE1 obchod ve f\xE1zi Discovery & Proposal a Contracting.",
          actions: [
            "Definuje doru\u010Dovac\xED zem\u011B, pr\u016Fm\u011Brnou v\xE1hu, objem a kusovost bal\xEDk\u016F.",
            "Nahr\xE1v\xE1 a spravuje z\xE1vazn\xE9 Cenov\xE9 nab\xEDdky v PDF.",
            "Dojedn\xE1v\xE1 smluvn\xED podm\xEDnky, term\xEDny podpis\u016F a cen\xEDk\u016F.",
            "Ozna\u010Duje kontakty p\u0159\xEDznakem DNC (Do Not Contact) v p\u0159\xEDpad\u011B odm\xEDtnut\xED."
          ]
        },
        {
          name: "Farmer (Account Manager)",
          privileges: "Odpov\xEDd\xE1 za Onboarding a dlouhodob\xFD \u017Div\xFD provoz (Farming).",
          actions: [
            "Dohl\xED\u017E\xED na IT integraci a zaznamen\xE1v\xE1 data dokon\u010Den\xED a testov\xE1n\xED UAT.",
            "Eviduje ostr\xFD start 1. naskladn\u011Bn\xED zbo\u017E\xED.",
            "Spravuje \u017Eiv\xFD \xFA\u010Det klienta, \u0159e\u0161\xED rozvoj a ozna\u010Duje neaktivn\xED kontakty."
          ]
        },
        {
          name: "Vedouc\xED (Manager)",
          privileges: "Nad\u0159\xEDzen\xFD t\xFDmu (Hunter / Closer / Farmer).",
          actions: [
            "P\u0159\xEDstup ke v\u0161em obchod\u016Fm sv\xFDch pod\u0159\xEDzen\xFDch nap\u0159\xED\u010D v\u0161emi f\xE1zemi.",
            "Pln\xE1 pr\xE1va \xFAprav, psan\xED pozn\xE1mek a posunu f\xE1z\xED u pod\u0159\xEDzen\xFDch deal\u016F.",
            "Sledov\xE1n\xED auditn\xEDch log\u016F, kalend\xE1\u0159\u016F a e-mailov\xE9 komunikace."
          ]
        },
        {
          name: "CSO (Chief Sales Officer)",
          privileges: "Glob\xE1ln\xED dohled nad cel\xFDm obchodn\xEDm potrub\xEDm (Sales Pipeline).",
          actions: [
            "Vid\xED a upravuje jak\xFDkoliv deal v syst\xE9mu bez ohledu na garanta.",
            "P\u0159i\u0159azuje a m\u011Bn\xED garanty (Hunter, Closer, Farmer) v re\xE1ln\xE9m \u010Dase.",
            "Mo\u017Enost skr\xFDvat citliv\xE9 aktivity (Visible: false)."
          ]
        },
        {
          name: "Administr\xE1tor (Admin)",
          privileges: "Spr\xE1va u\u017Eivatel\u016F, syst\xE9mov\xFDch \u010D\xEDseln\xEDk\u016F a technick\xE9ho chodu.",
          actions: [
            "Spr\xE1va u\u017Eivatelsk\xFDch \xFA\u010Dt\u016F, reset hesla, nastavov\xE1n\xED rol\xED a mana\u017Eer\u016F.",
            "Editace glob\xE1ln\xEDch \u010D\xEDseln\xEDk\u016F (D\u016Fvody ztr\xE1ty, Zdroje lead\u016F, IT Integrace, Segmenty, Skladov\xE1n\xED).",
            "Prohl\xED\u017Een\xED p\u0159ihla\u0161ovac\xEDch log\u016F (Login logs) a prov\xE1d\u011Bn\xED e-mailov\xE9ho auditu nad Workspace/M365."
          ]
        }
      ];
      const rolesEN = [
        {
          name: "Hunter",
          privileges: "Focus on early pipeline (Opportunity & Lead).",
          actions: [
            "Enters new deals and companies (Name, Company ID, Address, Contacts).",
            "Fills Lead Sources and E-commerce Platforms.",
            "Schedules and conducts initial qualification meetings/calls.",
            "Guarantees transition from Opportunity to Lead and Discovery."
          ]
        },
        {
          name: "Closer",
          privileges: "Takes over during Discovery & Proposal and Contracting.",
          actions: [
            "Defines delivery countries, average weight, volume, and items per order.",
            "Uploads and manages binding Pricing Offer PDFs.",
            "Negotiates terms, contract signed dates, and pricing upload dates.",
            "Can mark contacts as DNC (Do Not Contact) if needed."
          ]
        },
        {
          name: "Farmer (Account Manager)",
          privileges: "Responsible for Onboarding and live Farming.",
          actions: [
            "Oversees IT integration, logs completion and UAT testing dates.",
            "Records actual first stocking date.",
            "Manages live customer accounts and marks inactive contacts."
          ]
        },
        {
          name: "Manager",
          privileges: "Supervisor of team members (Hunter / Closer / Farmer).",
          actions: [
            "Full visibility over all deals owned by subordinates across all stages.",
            "Inherits full editing, note-taking, and stage advancement rights.",
            "Monitors audit logs, calendars, and email communications."
          ]
        },
        {
          name: "CSO (Chief Sales Officer)",
          privileges: "Global oversight over the entire Sales Pipeline.",
          actions: [
            "Views and edits any deal in the system regardless of ownership.",
            "Reassigns stage owners (Hunter, Closer, Farmer) in real-time.",
            "Can toggle visibility of sensitive activities."
          ]
        },
        {
          name: "Administrator (Admin)",
          privileges: "User management, enumerations, and technical audit.",
          actions: [
            "Manages user accounts, password resets, role assignments.",
            "Edits global enumerations (Lost Reasons, Lead Sources, IT Integrations, Storage Types).",
            "Inspects Login Logs and performs M365/Google Workspace Email Audits."
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
              content: '\u2713';
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
            ${isCS ? "\u{1F5A8}\uFE0F Tisk / Ulo\u017Eit PDF" : "\u{1F5A8}\uFE0F Print / Save PDF"}
          </button>
          
          <div class="content-wrapper">
            <h1>${isCS ? "Podrobn\xFD u\u017Eivatelsk\xFD manu\xE1l FHB CRM" : "Detailed FHB CRM User Manual"}</h1>
            <p class="subtitle">${isCS ? "Kompletn\xED p\u0159\xEDru\u010Dka: F\xE1ze potrub\xED, podm\xEDnky p\u0159echod\u016F, datov\xE9 atributy, role a integrace." : "Complete guide: Pipeline stages, transition rules, data attributes, roles, and integrations."}</p>
            
            <h2>${isCS ? "1. \xDAvod a P\u0159\xEDstup do Syst\xE9mu" : "1. Introduction & System Access"}</h2>
            <p>${isCS ? "FHB CRM slou\u017E\xED k \u0159\xEDzen\xED akvizice, smlouv\xE1n\xED a onboarding procesu nov\xFDch kl\xED\u010Dov\xFDch klient\u016F pro fulfillment. P\u0159\xEDstup je zabezpe\u010Den e-mailem a heslem. Z bezpe\u010Dnostn\xEDch d\u016Fvod\u016F si po prvn\xEDm p\u0159ihl\xE1\u0161en\xED zm\u011B\u0148te heslo v sekci Profil." : "FHB CRM manages the acquisition, contracting, and onboarding process for new fulfillment clients. Access is secured by email and password. Please change your password upon initial login in the Profile section."}</p>

            <h2>${isCS ? "2. P\u0159echody mezi stavy (Pipeline Transitions & Requirements)" : "2. Pipeline Stages & Transition Requirements"}</h2>
            <p>${isCS ? "Pro p\u0159esun obchodn\xEDho p\u0159\xEDpadu (Deal) do dal\u0161\xED f\xE1ze je nutn\xE9 splnit striktn\xED podm\xEDnky validace dat. Pokud jak\xFDkoliv povinn\xFD \xFAdaj chyb\xED, syst\xE9m p\u0159esun neumo\u017En\xED a chyb\u011Bj\xEDc\xED pole v detailu firmy zv\xFDrazn\xED \u010Derven\u011B." : "To move a deal to the next stage, strict data validation rules must be met. If any required attribute is missing, the transition is blocked and missing fields are highlighted in red."}</p>
            
            <div>
              ${stagesDetailed.map((s) => `
                <div class="stage-card" style="border-left-color: ${s.color};">
                  <div class="stage-header">
                    <span class="stage-title">${s.name}</span>
                    <span class="stage-badge">${isCS ? "Garant" : "Owner"}: ${s.role}</span>
                  </div>
                  <div class="stage-desc">${s.desc}</div>
                  <div class="req-title">${isCS ? "Podm\xEDnky pro posun do t\xE9to / dal\u0161\xED f\xE1ze:" : "Requirements for advancement:"}</div>
                  <ul class="req-list">
                    ${s.reqs.map((r) => `<li>${r}</li>`).join("")}
                  </ul>
                </div>
              `).join("")}
            </div>
            
            <div class="page-break"></div>

            <h2>${isCS ? "3. P\u0159ehled V\u0161ech Datov\xFDch Atribut\u016F" : "3. Complete Data Attributes Reference"}</h2>
            <p>${isCS ? "Detailn\xED struktura pol\xED a atribut\u016F evidovan\xFDch u firmy a obchodn\xEDho p\u0159\xEDpadu:" : "Detailed field structure recorded for companies and deal opportunities:"}</p>
            
            <table class="attr-table">
              <thead>
                <tr>
                  <th>${isCS ? "Kategorie / N\xE1zev atributu" : "Category / Attribute Name"}</th>
                  <th>${isCS ? "Technick\xE9 pole" : "Technical Field"}</th>
                  <th>${isCS ? "Popis & V\xFDznam" : "Description & Meaning"}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>${isCS ? "Identifikace firmy (I\u010CO)" : "Company ID (I\u010CO)"}</b></td>
                  <td><code>companyId</code></td>
                  <td>${isCS ? "Identifika\u010Dn\xED \u010D\xEDslo firmy. Povinn\xE9 pro posun z Opportunity." : "Company registration ID. Required to advance from Opportunity."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "Zdroj leadu" : "Lead Source"}</b></td>
                  <td><code>leadSourceId</code></td>
                  <td>${isCS ? "Zdroj akvizice (Web, Cold Call, Inbound apod.). Povinn\xE9 pro Lead." : "Acquisition source. Required for Lead stage."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "E-commerce platforma" : "E-commerce Platform"}</b></td>
                  <td><code>ecommercePlatformId</code></td>
                  <td>${isCS ? "E-shopov\xE9 \u0159e\u0161en\xED (Shoptet, WooCommerce, Custom API). Povinn\xE9 pro Lead." : "E-commerce platform. Required for Lead stage."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "M\u011Bs\xED\u010Dn\xED po\u010Det bal\xEDk\u016F" : "Estimated Monthly Parcels"}</b></td>
                  <td><code>estimatedMonthlyParcels</code></td>
                  <td>${isCS ? "Odhadovan\xFD m\u011Bs\xED\u010Dn\xED objem z\xE1silek (>0). Povinn\xE9 pro Lead." : "Estimated monthly parcel volume (>0). Required for Lead stage."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "Doru\u010Dovac\xED zem\u011B" : "Delivery Countries"}</b></td>
                  <td><code>deliveryCountries</code></td>
                  <td>${isCS ? "C\xEDlov\xE9 zem\u011B doru\u010Dov\xE1n\xED (multi-select). Povinn\xE9 pro Discovery." : "Target delivery countries (multi-select). Required for Discovery."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "Kusovost na objedn\xE1vku" : "Average Items Per Order"}</b></td>
                  <td><code>averageItemsPerOrder</code></td>
                  <td>${isCS ? "Pr\u016Fm\u011Brn\xFD po\u010Det kus\u016F v bal\xEDku. Povinn\xE9 pro Discovery." : "Average items per order. Required for Discovery."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "V\xE1ha & Objem bal\xEDku" : "Parcel Weight & Volume"}</b></td>
                  <td><code>averageParcelWeight / Volume</code></td>
                  <td>${isCS ? "Pr\u016Fm\u011Brn\xE1 v\xE1ha (kg) a objem (m\xB3). Povinn\xE9 pro Discovery." : "Average weight (kg) and volume (m\xB3). Required for Discovery."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "Cenov\xE1 nab\xEDdka (Offers)" : "Pricing Offers"}</b></td>
                  <td><code>pricingOffers</code></td>
                  <td>${isCS ? "Nahran\xFD PDF dokument nab\xEDdky. Povinn\xE9 pro Discovery." : "Uploaded offer PDF document. Required for Discovery."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "Smluvn\xED data" : "Contract Dates"}</b></td>
                  <td><code>contractSignedDate / pricingUploadedDate</code></td>
                  <td>${isCS ? "Datum podpisu smlouvy a nahran\xED cen\xEDku. Povinn\xE9 pro Contracting." : "Contract signed & pricing upload dates. Required for Contracting."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "IT Integrace ID" : "IT Integration ID"}</b></td>
                  <td><code>itIntegrationId</code></td>
                  <td>${isCS ? "Typ IT propojen\xED ze syst\xE9mov\xE9ho \u010D\xEDseln\xEDku. Povinn\xE9 pro Contracting." : "Selected IT integration type. Required for Contracting."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "Dokon\u010Den\xED IT & Naskladn\u011Bn\xED" : "IT Completion & First Stocking"}</b></td>
                  <td><code>itIntegrationCompletedDate / firstStockingDateActual</code></td>
                  <td>${isCS ? "Skute\u010Dn\xE1 data dokon\u010Den\xED integrace a 1. naskladn\u011Bn\xED. Povinn\xE9 pro Farming." : "Actual IT completion and first stocking dates. Required for Farming."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "UAT Testov\xE1n\xED" : "UAT Testing"}</b></td>
                  <td><code>integrationTestingCompletedDate</code></td>
                  <td>${isCS ? "Potvrzen\xED o dokon\u010Den\xED testov\xE1n\xED zku\u0161ebn\xEDch zak\xE1zek. Povinn\xE9 pro Farming." : "Confirmed completion of UAT order testing. Required for Farming."}</td>
                </tr>
                <tr>
                  <td><b>${isCS ? "Kontaktn\xED osoby & DNC" : "Contacts & DNC Status"}</b></td>
                  <td><code>contacts / doNotContact</code></td>
                  <td>${isCS ? 'E-maily, telefony a prvek "Nechce kontaktovat (DNC)" s \u010Dasov\xFDm raz\xEDtkem.' : 'Emails, phone numbers, and "Do Not Contact (DNC)" status with timestamp.'}</td>
                </tr>
              </tbody>
            </table>

            <h2>${isCS ? "4. Seznam Rol\xED a Opr\xE1vn\u011Bn\xED" : "4. User Roles & Permissions"}</h2>
            <div>
              ${rolesList.map((r) => `
                <div class="role">
                  <div class="role-name">${r.name}</div>
                  <div class="role-privilege">${r.privileges}</div>
                  <ul>
                    ${r.actions.map((a) => `<li>${a}</li>`).join("")}
                  </ul>
                </div>
              `).join("")}
            </div>

            <div class="page-break"></div>

            <h2>${isCS ? "5. Kalend\xE1\u0159, Sch\u016Fzky, E-mail Audit a Logy" : "5. Calendar Integrations, Meetings, Email Audit & Logs"}</h2>
            <p>${isCS ? "Aplikace disponuje pokro\u010Dil\xFDm propojen\xEDm na extern\xED syst\xE9my a bezpe\u010Dnostn\xEDm auditem:" : "The application features advanced external integrations and security auditing:"}</p>
            <ul>
              <li><b>${isCS ? "Synchronizace Kalend\xE1\u0159e (Google & Microsoft 365)" : "Calendar Sync (Google & Microsoft 365)"}:</b> ${isCS ? "U\u017Eivatel si m\u016F\u017Ee v Nastaven\xED profilu p\u0159ipojit sv\u016Fj Google nebo Microsoft \xFA\u010Det. Sch\u016Fzky napl\xE1novan\xE9 v CRM se automaticky vytv\xE1\u0159ej\xED v extern\xEDm kalend\xE1\u0159i v\u010Detn\u011B odkaz\u016F na Google Meet nebo MS Teams." : "Users can connect Google or Microsoft accounts in Settings. Meetings created in CRM automatically populate external calendars with Meet/Teams links."}</li>
              <li><b>${isCS ? "E-mailov\xFD Audit (Workspace & M365)" : "Email Audit Search"}:</b> ${isCS ? "Administr\xE1tor m\xE1 k dispozici modul pro dohled nad e-mailovou komunikac\xED. Umo\u017E\u0148uje vyhled\xE1vat v doru\u010Den\xE9 i odchoz\xED po\u0161t\u011B propojen\xFDch \xFA\u010Dt\u016F dle I\u010CO nebo n\xE1zvu firmy pro zp\u011Btn\xE9 ov\u011B\u0159en\xED dohod." : "Admins can search incoming and outgoing email communications across connected workspace accounts by Company ID or name."}</li>
              <li><b>${isCS ? "Auditn\xED stopa zm\u011Bn (Audit Trail)" : "Audit Trail"}:</b> ${isCS ? "U ka\u017Ed\xE9ho dealu je uchov\xE1v\xE1na kompletn\xED historie \xFAprav pol\xED, v\u010Detn\u011B autora zm\u011Bn, p\u016Fvodn\xED a nov\xE9 hodnoty a \u010Dasov\xE9ho raz\xEDtka." : "Every deal maintains a complete field change history, recording the author, old/new values, and timestamp."}</li>
              <li><b>${isCS ? "P\u0159ihla\u0161ovac\xED logy (Login Logs)" : "Login Logs"}:</b> ${isCS ? "Spr\xE1va IP adres, pou\u017Eit\xFDch prohl\xED\u017Ee\u010D\u016F a \u010Das\u016F p\u0159ihl\xE1\u0161en\xED u\u017Eivatel\u016F pro zaji\u0161t\u011Bn\xED bezpe\u010Dnosti." : "Tracking IP addresses, user agents, and login timestamps for security enforcement."}</li>
            </ul>

            <div class="page-break"></div>

            <h2>${isCS ? "6. Pravidla hl\xEDd\xE1n\xED neaktivity, barevn\xE9 p\u0159ipom\xEDnky a automatick\xE9 e-mailov\xE9 notifikace" : "6. Stage Inactivity Rules, Color Reminders & Automated Email Notifications"}</h2>
            <p>${isCS ? "Pro udr\u017Een\xED vysok\xE9 dynamiky obchodn\xEDho potrub\xED a prevenci stagnace p\u0159\xEDle\u017Eitost\xED disponuje syst\xE9m pokro\u010Dil\xFDm modulem hl\xEDd\xE1n\xED neaktivity. V administraci aplikace (sekce <b>P\u0159ipom\xEDnky stav\u016F</b>) lze pro ka\u017Edou f\xE1zi pipeline nadefinovat libovoln\xFD po\u010Det pravidel s ur\u010Den\xEDm po\u010Dtu dn\u016F neaktivity, barvy vizu\xE1ln\xEDho or\xE1mov\xE1n\xED (\u017Elut\xE1, oran\u017Eov\xE1, \u010Derven\xE1) a p\u0159\xEDpadn\xE9 akce automatick\xE9ho odesl\xE1n\xED e-mailov\xE9ho upozorn\u011Bn\xED." : "To maintain high sales pipeline velocity and eliminate stalled opportunities, the CRM features an advanced stage inactivity monitoring module. In the Administration panel (<b>Stage Reminders</b> section), administrators can configure multiple rules per pipeline stage specifying inactivity day thresholds, visual card border colors (yellow, orange, red), and automated email alert actions."}</p>

            <h3>${isCS ? "T\u0159i striktn\xED podm\xEDnky pro aktivaci barevn\xE9ho or\xE1mov\xE1n\xED a notifikac\xED:" : "Three Strict Conditions for Triggering Visual Reminders & Notifications:"}</h3>
            <p>${isCS ? "Zv\xFDrazn\u011Bn\xED karty p\u0159\xEDle\u017Eitosti v Kanban desce / Seznamu a odesl\xE1n\xED notifika\u010Dn\xEDho e-mailu se aktivuje <b>v\xFDhradn\u011B tehdy, jsou-li sou\u010Dasn\u011B spln\u011Bny v\u0161echny 3 n\xE1sleduj\xEDc\xED podm\xEDnky</b>:" : "A deal card is highlighted with a colored border in Kanban / List view and alert emails are dispatched <b>only when all 3 of the following conditions are simultaneously met</b>:"}</p>

            <ol style="padding-left: 20px; font-size: 13px; line-height: 1.7;">
              <li style="margin-bottom: 10px;">
                <b>${isCS ? "1. Podm\xEDnka \u2013 Minim\xE1ln\xED doba v dan\xE9m stavu:" : "1. Condition \u2013 Minimum Time in Current Stage:"}</b><br/>
                ${isCS ? "Od okam\u017Eiku p\u0159esunu p\u0159\xEDle\u017Eitosti do dan\xE9 f\xE1ze (stavu) muselo uplynout minim\xE1ln\u011B <b>X</b> kalend\xE1\u0159n\xEDch dn\u016F. Tato doba se po\u010D\xEDt\xE1 podle p\u0159esn\xE9ho \u010Dasov\xE9ho raz\xEDtka posledn\xEDho p\u0159esunu do tohoto stavu zaznamenan\xE9ho v auditn\xEDm logu." : "At least <b>X</b> calendar days must have elapsed since the deal was moved into its current stage, verified via the precise timestamp in the stage change audit log."}
              </li>
              <li style="margin-bottom: 10px;">
                <b>${isCS ? "2. Podm\xEDnka \u2013 Minim\xE1ln\xED doba od jak\xE9koliv aktivity u p\u0159\xEDle\u017Eitosti:" : "2. Condition \u2013 Minimum Time Since Any Activity or Update:"}</b><br/>
                ${isCS ? "Od jak\xE9hokoliv z\xE1sahu, dopln\u011Bn\xED atributu \u010Di zaznamenan\xE9 ud\xE1losti u p\u0159\xEDle\u017Eitosti nebo jej\xED nav\xE1zan\xE9 firmy muselo uplynout minim\xE1ln\u011B <b>X</b> kalend\xE1\u0159n\xEDch dn\u016F. Zahrnuje:<br/>\u2022 \xDApravu a dopln\u011Bn\xED jak\xE9hokoliv pole spole\u010Dnosti \u010Di dealu (v\u010Detn\u011B zm\u011Bn zaznamenan\xFDch v auditn\xED stop\u011B).<br/>\u2022 Zad\xE1n\xED nov\xE9 aktivity (telefon\xE1t, sch\u016Fzka, MS Teams, e-mail, \xFAkol, pozn\xE1mka, nahr\xE1n\xED nab\xEDdky v PDF \u010Di dokumentu).<br/>\u2022 <b>Smaz\xE1n\xED aktivity:</b> Pokud obchodn\xEDk aktivitu sma\u017Ee (nap\u0159. zru\u0161enou sch\u016Fzku), syst\xE9m tuto akci automaticky zap\xED\u0161e do auditn\xEDho logu a zaktualizuje \u010Dasov\xE9 raz\xEDtko p\u0159\xEDle\u017Eitosti (<code>updatedAt</code>). T\xEDm se lh\u016Fta neaktivity za\u010D\xEDn\xE1 po\u010D\xEDtat nanovo od okam\u017Eiku tohoto smaz\xE1n\xED." : "At least <b>X</b> calendar days must have elapsed since any update, attribute modification, or activity on the deal or linked company. Includes:<br/>\u2022 Creating or editing any company or deal attribute (tracked in the audit log).<br/>\u2022 Logging a new activity (call, meeting, MS Teams, email, task, note, pricing offer PDF, or document).<br/>\u2022 <b>Activity Deletion:</b> If an activity is removed (e.g. canceled meeting), the system automatically logs this in the audit trail and updates the deal timestamp (<code>updatedAt</code>), restarting the inactivity counter from the moment of deletion."}
              </li>
              <li style="margin-bottom: 10px;">
                <b>${isCS ? "3. Podm\xEDnka \u2013 Minim\xE1ln\xED doba od data kon\xE1n\xED dan\xE9 aktivity:" : "3. Condition \u2013 Minimum Time Since Scheduled Activity Event Date:"}</b><br/>
                ${isCS ? "Pokud je u p\u0159\xEDle\u017Eitosti napl\xE1nov\xE1na budouc\xED aktivita (nap\u0159. sch\u016Fzka domluven\xE1 a\u017E za 10 dn\xED), lh\u016Fta neaktivity se po\u010D\xEDt\xE1 <b>a\u017E od data samotn\xE9ho kon\xE1n\xED t\xE9to aktivity</b>. Dokud aktivita neprob\u011Bhne, p\u0159\xEDle\u017Eitost se pova\u017Euje za aktivn\u011B rozpracovanou a v\xFDstra\u017En\xE9 or\xE1mov\xE1n\xED ani e-mailov\xE9 notifikace se nespust\xED. A\u017E po uplynut\xED X dn\u016F od uskute\u010Dn\u011Bn\xED sch\u016Fzky (bez dal\u0161\xED navazuj\xEDc\xED akce) dojde k aktivaci upozorn\u011Bn\xED." : "If a future activity is scheduled on the deal (e.g. a client meeting arranged 10 days ahead), the inactivity countdown begins <b>only after the scheduled date of that activity has passed</b>. While future events remain pending, the opportunity is treated as actively progressing and neither color borders nor emails trigger until X days after the event date without subsequent action."}
              </li>
            </ol>

            <h3>${isCS ? "Vizu\xE1ln\xED \xFArovn\u011B upozorn\u011Bn\xED a akce:" : "Visual Alert Levels & Triggered Actions:"}</h3>
            <ul>
              <li><b>${isCS ? "\u017Dlut\xE9 ohrani\u010Den\xED (Yellow Alert)" : "Yellow Border (Yellow Alert)"}:</b> ${isCS ? "Informativn\xED upozorn\u011Bn\xED na bl\xED\u017E\xEDc\xED se hranici ne\u010Dinnosti." : "Informational warning indicating an approaching inactivity threshold."}</li>
              <li><b>${isCS ? "Oran\u017Eov\xE9 ohrani\u010Den\xED (Orange Alert)" : "Orange Border (Orange Alert)"}:</b> ${isCS ? "Zv\xFD\u0161en\xE9 varov\xE1n\xED p\u0159ed stagnac\xED obchodu." : "Elevated warning indicating opportunity stagnation."}</li>
              <li><b>${isCS ? "\u010Cerven\xE9 ohrani\u010Den\xED s v\xFDstra\u017Enou ikonou (Red Alert)" : "Red Border with Alert Icon (Red Alert)"}:</b> ${isCS ? "Kritick\xE9 p\u0159ekro\u010Den\xED povolen\xE9 doby neaktivity vy\u017Eaduj\xEDc\xED okam\u017Eit\xFD z\xE1sah odpov\u011Bdn\xE9ho garanta a dohled mana\u017Eera." : "Critical inactivity breach requiring immediate action from the deal owner and management oversight."}</li>
              <li><b>${isCS ? "Automatick\xE9 e-mailov\xE9 notifikace" : "Automated Email Notifications"}:</b> ${isCS ? "U pravidel s akc\xED \u201EOdeslat e-mail\u201C syst\xE9m v r\xE1mci rann\xED cron \xFAlohy (8:00) odes\xEDl\xE1 p\u0159ehledn\xFD notifika\u010Dn\xED e-mail garantovi i nad\u0159\xEDzen\xE9mu mana\u017Eerovi s odkazem na konkr\xE9tn\xED p\u0159\xEDle\u017Eitost a shrnut\xEDm chyb\u011Bj\xEDc\xED aktivity. V\u0161echny odeslan\xE9 e-maily jsou evidov\xE1ny v E-mailov\xE9m logu v Administraci." : 'Rules configured with the "Send Email" action automatically send a notification email at 8:00 AM to the deal owner and supervisor with direct deal links and an inactivity summary. All dispatched emails are recorded in the Email Log in Administration.'}</li>
              <li><b>${isCS ? "Filtrov\xE1n\xED podle barvy p\u0159ipom\xEDnky" : "Filtering by Reminder Color"}:</b> ${isCS ? "V Kanban desce i Seznamu deal\u016F je k dispozici rychl\xFD filtr dle barvy p\u0159ipom\xEDnky (V\u0161e / \u017Dlut\xE1 / Oran\u017Eov\xE1 / \u010Cerven\xE1), umo\u017E\u0148uj\xEDc\xED okam\u017Eit\u011B vyfiltrovat v\u0161echny p\u0159\xEDpady vy\u017Eaduj\xEDc\xED pozornost." : "Both Kanban and List views feature a reminder color filter (All / Yellow / Orange / Red) enabling instant filtering of opportunities requiring immediate attention."}</li>
            </ul>

            <h2>${isCS ? "7. U\u017Eivatelsk\xE9 Rozhran\xED a Ovl\xE1dac\xED Prvky" : "7. User Interface & Controls"}</h2>
            <ul>
              <li><b>${isCS ? "Tla\u010D\xEDtko posunu kvalifikovan\xE9ho leadu (SQL \u2192)" : "Qualified Lead Advance Button (SQL \u2192)"}:</b> ${isCS ? "Pokud p\u0159\xEDle\u017Eitost ve f\xE1zi Lead spl\u0148uje v\u0161echny podm\xEDnky pro p\u0159esun do f\xE1ze Discovery & Ponuka (p\u0159i\u0159azen\xFD hunter, zdroj leadu, e-commerce platforma a odhadovan\xFD po\u010Det z\xE1silek > 0), zobraz\xED se p\u0159\xEDmo na kart\u011B v Kanban desce nad ikonou garanta (vpravo uprost\u0159ed) zelen\xE9 tla\u010D\xEDtko \u201ESQL \u2192\u201C. Kliknut\xEDm m\u016F\u017Ee kdokoliv (v\u010Detn\u011B huntera) okam\u017Eit\u011B odeslat p\u0159\xEDle\u017Eitost do n\xE1sleduj\xEDc\xED f\xE1ze Discovery & Ponuka, p\u0159i\u010Dem\u017E syst\xE9m zobraz\xED lokalizovanou potvrzuj\xEDc\xED zpr\xE1vu s n\xE1zvem p\u0159esunut\xE9 firmy." : 'When a deal in the Lead stage fulfills all conditions for moving to Discovery & Proposal (assigned hunter, lead source, ecommerce platform, and estimated parcels > 0), a green "SQL \u2192" button appears directly above the owner avatar on the Kanban card (middle-right). Clicking it allows anyone (including hunters) to immediately dispatch the opportunity to Discovery & Proposal, with a localized confirmation dialog featuring the company name.'}</li>
              <li><b>${isCS ? "Dvojit\xE1 li\u0161ta posuvn\xEDku (Kanban Scrollbar)" : "Dual Kanban Scrollbar"}:</b> ${isCS ? "Kanban deska obsahuje posuvn\xEDk naho\u0159e i dole pod sloupci, co\u017E zaji\u0161\u0165uje pohodln\xFD horizont\xE1ln\xED posun nap\u0159\xED\u010D v\u0161emi 7 f\xE1zemi i na men\u0161\xEDch obrazovk\xE1ch." : "The Kanban board contains top and bottom scrollbars, enabling easy navigation across all 7 stages on any display."}</li>
              <li><b>${isCS ? "Filtr nep\u0159i\u0159azen\xFDch deal\u016F" : "Unassigned Deals Filter"}:</b> ${isCS ? 'Tla\u010D\xEDtko "Pouze nep\u0159i\u0159azen\xE9" zobraz\xED p\u0159\xEDle\u017Eitosti, kter\xE9 zat\xEDm nemaj\xED v dan\xE9 f\xE1zi stanoven\xE9ho garanta.' : 'The "Only Unassigned" toggle filters opportunities that lack a stage owner.'}</li>
              <li><b>${isCS ? "Filtr dle barvy upozorn\u011Bn\xED (P\u0159ipom\xEDnky)" : "Filter by Reminder Color"}:</b> ${isCS ? "Rychl\xE1 filtrace obchodn\xEDch p\u0159\xEDpad\u016F podle barvy stavov\xE9 p\u0159ipom\xEDnky pro okam\u017Eit\xE9 \u0159e\u0161en\xED stagnuj\xEDc\xEDch obchod\u016F." : "Quickly filter deals by stage reminder alert color to focus immediately on stalled opportunities."}</li>
              <li><b>${isCS ? "Zv\xFDrazn\u011Bn\xED chyb\u011Bj\xEDc\xEDch dat (Red Underline Alert)" : "Red Missing Data Highlighting"}:</b> ${isCS ? "Pokud na kart\u011B dealu chyb\xED povinn\xFD \xFAdaj pro posun, pole je p\u0159i pokusu o ulo\u017Een\xED \u010Di posun \u010Derven\u011B podtr\u017Eeno." : "If a required field is missing, it is underlined in red upon saving or advancing."}</li>
              <li><b>${isCS ? "V\xFDstra\u017En\xFD odznak u neaktivn\xEDch deal\u016F" : "Alert Badge on Stalled Deals"}:</b> ${isCS ? "Karta dealu v Kanbanu zobrazuje v\xFDstra\u017Enou ikonu s po\u010Dtem dn\u016F v aktu\xE1ln\xED f\xE1zi a n\xE1pov\u011Bdou s vysv\u011Btlen\xEDm podm\xEDnek." : "Kanban deal cards display an alert badge with days in current stage and tooltip explaining the condition criteria."}</li>
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
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (err) {
      console.error("Failed to generate manual:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Manual generation failed" });
      }
    }
  });
  app.get("/api/audit-logs", authMiddleware, async (req, res) => {
    try {
      const [auditRows] = await pool.query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 25000");
      res.json(auditRows);
    } catch (err) {
      console.error("Audit logs fetch error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/deals/:id/details", authMiddleware, async (req, res) => {
    try {
      const dealId = req.params.id;
      const [
        [deals],
        [auditLogs],
        [activities]
      ] = await Promise.all([
        pool.query("SELECT * FROM deals WHERE id = ?", [dealId]),
        pool.query("SELECT * FROM audit_logs WHERE dealId = ? OR companyId = (SELECT companyId FROM deals WHERE id = ?) ORDER BY timestamp DESC LIMIT 500", [dealId, dealId]),
        pool.query("SELECT * FROM activities WHERE dealId = ? OR (dealId IS NULL AND companyId = (SELECT companyId FROM deals WHERE id = ?)) ORDER BY date DESC LIMIT 500", [dealId, dealId])
      ]);
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
        return item;
      });
      const parsedDeals = parseJsonFields(deals, ["deliveryCountries", "pricingOffers", "documents", "notes", "seasonMonths", "codUsage"]);
      const parsedDeal = parsedDeals[0] || null;
      let company = null;
      if (parsedDeal && parsedDeal.companyId) {
        const [compRows] = await pool.query("SELECT * FROM companies WHERE id = ?", [parsedDeal.companyId]);
        const parsedCompanies = parseJsonFields(compRows, ["urls", "contacts"]);
        company = parsedCompanies[0] || null;
      }
      const parsedActivities = parseJsonFields(activities, ["participants"]);
      parsedActivities.forEach((act) => {
        if ("isVisible" in act) act.isVisible = act.isVisible === 1 || act.isVisible === true;
      });
      res.json({
        deal: parsedDeal,
        company,
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
        pool.query("SELECT id, name, email, role, managerId, isActive, googleIntegration, msIntegration FROM users"),
        pool.query("SELECT id, name, companyId, address, country, region, segment, email, phone, phonePrefix, urls, contacts, isVisible FROM companies"),
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
        pool.query("SELECT * FROM lead_sources"),
        pool.query("SELECT * FROM segments"),
        pool.query("SELECT * FROM ecommerce_platforms"),
        pool.query("SELECT * FROM storage_types"),
        pool.query("SELECT * FROM it_integrations"),
        pool.query("SELECT * FROM lost_reasons"),
        pool.query("SELECT * FROM contact_positions"),
        pool.query("SELECT * FROM stage_reminders"),
        pool.query("SELECT dealId, newValue AS stage, MAX(timestamp) AS lastEnteredAt FROM audit_logs WHERE field = 'stage' GROUP BY dealId, newValue"),
        pool.query("SELECT dealId, MAX(timestamp) AS lastAuditAt FROM audit_logs GROUP BY dealId"),
        pool.query("SELECT dealId, MAX(GREATEST(COALESCE(date, createdAt), createdAt)) AS lastActivityAt FROM activities GROUP BY dealId")
      ]);
      const parsedUsers = parseJsonFields(users, ["googleIntegration", "msIntegration"]);
      const currentUserId = req.user?.id;
      const me = parsedUsers.find((u) => u.id === currentUserId) || null;
      const stageEnteredMap = /* @__PURE__ */ new Map();
      stageTimestampsRows.forEach((r) => {
        if (r.dealId && r.stage && r.lastEnteredAt) {
          stageEnteredMap.set(`${r.dealId}_${r.stage}`, new Date(r.lastEnteredAt).getTime());
        }
      });
      const lastAuditMap = /* @__PURE__ */ new Map();
      lastAuditActionRows.forEach((r) => {
        if (r.dealId && r.lastAuditAt) {
          lastAuditMap.set(r.dealId, new Date(r.lastAuditAt).getTime());
        }
      });
      const lastActivityMap = /* @__PURE__ */ new Map();
      lastActivityActionRows.forEach((r) => {
        if (r.dealId && r.lastActivityAt) {
          lastActivityMap.set(r.dealId, new Date(r.lastActivityAt).getTime());
        }
      });
      const nowMs = Date.now();
      const parsedDeals = parseJsonFields(deals, ["deliveryCountries", "pricingOffers", "documents", "notes", "seasonMonths", "codUsage"]).map((deal) => {
        if (!deal.pricingOffers) deal.pricingOffers = [];
        if (!deal.documents) deal.documents = [];
        if (!deal.notes) deal.notes = [];
        const stageTime = stageEnteredMap.get(`${deal.id}_${deal.stage}`) || (deal.createdAt ? new Date(deal.createdAt).getTime() : nowMs);
        const daysInStage = Math.max(0, Math.floor((nowMs - stageTime) / 864e5));
        deal.daysInStage = daysInStage;
        const rules = stageReminders.filter((r) => r.stage === deal.stage);
        let reminderColor = "none";
        if (rules.length > 0 && deal.stage !== "lost") {
          const matchingRules = rules.filter((r) => {
            if (daysInStage < r.days) return false;
            const actionTimes = [deal.createdAt ? new Date(deal.createdAt).getTime() : nowMs];
            if (deal.updatedAt) {
              const t = new Date(deal.updatedAt).getTime();
              if (!isNaN(t)) actionTimes.push(t);
            }
            const lastAudit = lastAuditMap.get(deal.id);
            if (lastAudit) actionTimes.push(lastAudit);
            const lastAction = Math.max(...actionTimes);
            if (Math.floor((nowMs - lastAction) / 864e5) < r.days) return false;
            const lastAct = lastActivityMap.get(deal.id);
            if (lastAct && Math.floor((nowMs - lastAct) / 864e5) < r.days) return false;
            return true;
          });
          if (matchingRules.length > 0) {
            matchingRules.sort((a, b) => b.days - a.days);
            reminderColor = matchingRules[0].color || "none";
          }
        }
        deal.reminderColor = reminderColor;
        return deal;
      });
      res.json({
        users: parsedUsers,
        me,
        companies: parseJsonFields(companies, ["urls", "contacts"]).map((c) => {
          if ("isVisible" in c) c.isVisible = c.isVisible === 1 || c.isVisible === true;
          if (!Array.isArray(c.contacts)) c.contacts = [];
          return c;
        }),
        deals: parsedDeals,
        leadSources: parseJsonFields(leadSources, []),
        segments: parseJsonFields(segments, []),
        ecommercePlatforms: parseJsonFields(ecommercePlatforms, []),
        storageTypes: parseJsonFields(storageTypes, []),
        itIntegrations: parseJsonFields(itIntegrations, []),
        lostReasons: parseJsonFields(lostReasons, []),
        contactPositions: parseJsonFields(contactPositions, []),
        stageReminders: parseJsonFields(stageReminders, []),
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
      const allowedTables = ["lead_sources", "segments", "ecommerce_platforms", "it_integrations", "lost_reasons", "activities", "storage_types", "contact_positions", "stage_reminders"];
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
      if (table === "activities") {
        const [actRows] = await pool.query("SELECT * FROM activities WHERE id = ?", [id]);
        if (actRows.length > 0) {
          const act = actRows[0];
          if (act.dealId) {
            const user2 = req.user;
            const now = /* @__PURE__ */ new Date();
            const auditId = uuidv4();
            const actDateStr = act.date ? ` (${new Date(act.date).toISOString().substring(0, 10)})` : "";
            await pool.query(
              "INSERT INTO audit_logs (id, dealId, field, oldValue, newValue, changedBy, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [auditId, act.dealId, "activity_deleted", `${act.type || "activity"}: ${act.note || ""}${actDateStr}`, "deleted", user2?.id || "system", now]
            );
            await pool.query("UPDATE deals SET updatedAt = ? WHERE id = ?", [now, act.dealId]);
          }
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
        } : void 0,
        tls: {
          rejectUnauthorized: false
        }
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
        SELECT DISTINCT d.id, d.companyId 
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
            const auditLogId = uuidv4();
            await connection.query(
              `INSERT INTO audit_logs (id, dealId, companyId, field, oldValue, newValue, changedBy, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
              [auditLogId, deal.id, deal.companyId, "stage", "opportunity", "lead", "System Cron"]
            );
            console.log(`[JOBS] Deal ${deal.id} advanced to lead.`);
          }
        }
      } finally {
        connection.release();
      }
    } catch (err) {
      if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.message?.includes("ETIMEDOUT")) {
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
      if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.message?.includes("ETIMEDOUT")) {
        console.warn(`[JOBS] Daily job skipped: Database connection unreachable (${err.message}).`);
      } else {
        console.error("[JOBS] Daily job error:", err);
      }
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
                console.warn(`[Worker] Could not resolve online meeting for activity ${activity.id} (requires OnlineMeetings.Read or OnlineMeetings.ReadWrite scope):`, e.message || e);
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
  async function processStageReminders() {
    console.log("[STAGE REMINDERS] Starting stage reminders check...");
    const connection = await pool.getConnection();
    try {
      const [remindersRows] = await connection.query("SELECT * FROM stage_reminders");
      const reminders = remindersRows;
      if (reminders.length === 0) {
        console.log("[STAGE REMINDERS] No stage reminders configured.");
        return { checked: 0, sent: 0 };
      }
      const [dealsRows] = await connection.query('SELECT * FROM deals WHERE stage != "lost"');
      const deals = dealsRows;
      if (deals.length === 0) {
        return { checked: 0, sent: 0 };
      }
      const [companiesRows] = await connection.query("SELECT * FROM companies");
      const companies = companiesRows;
      const [usersRows] = await connection.query("SELECT * FROM users");
      const users = usersRows;
      const [leadSourcesRows] = await connection.query("SELECT * FROM lead_sources");
      const leadSources = leadSourcesRows;
      const [ecomRows] = await connection.query("SELECT * FROM ecommerce_platforms");
      const ecomPlatforms = ecomRows;
      const [storageRows] = await connection.query("SELECT * FROM storage_types");
      const storageTypes = storageRows;
      const [itRows] = await connection.query("SELECT * FROM it_integrations");
      const itIntegrations = itRows;
      const [segmentsRows] = await connection.query("SELECT * FROM segments");
      const segments = segmentsRows;
      const companiesMap = new Map(companies.map((c) => {
        let urls = c.urls;
        if (typeof urls === "string") {
          try {
            urls = JSON.parse(urls);
          } catch (e) {
          }
        }
        let contacts = c.contacts;
        if (typeof contacts === "string") {
          try {
            contacts = JSON.parse(contacts);
          } catch (e) {
          }
        }
        return [c.id, { ...c, urls, contacts }];
      }));
      const [auditRows] = await connection.query("SELECT * FROM audit_logs ORDER BY timestamp DESC");
      const allAuditLogs = auditRows;
      const stageAuditLogs = allAuditLogs.filter((a) => a.field === "stage");
      const [activitiesRows] = await connection.query("SELECT * FROM activities ORDER BY date DESC");
      const allActivities = activitiesRows;
      const stageLabels = {
        opportunity: "1. Oportunita",
        lead: "2. Lead",
        discovery_proposal: "3. Discovery & Ponuka",
        contracting: "4. Contracting",
        onboarding: "5. Onboarding",
        farming: "6. Farming",
        lost: "7. Lost"
      };
      let checkedCount = 0;
      let sentCount = 0;
      const now = /* @__PURE__ */ new Date();
      const itemsToNotify = [];
      for (const deal of deals) {
        checkedCount++;
        const stage = deal.stage;
        const stageReminders = reminders.filter((r) => r.stage === stage);
        if (stageReminders.length === 0) continue;
        const lastStageLog = stageAuditLogs.find((a) => a.dealId === deal.id && a.newValue === stage);
        const stageEntryTime = lastStageLog ? new Date(lastStageLog.timestamp).getTime() : new Date(deal.createdAt || Date.now()).getTime();
        const daysInStage = Math.max(0, Math.floor((now.getTime() - stageEntryTime) / (1e3 * 60 * 60 * 24)));
        const dealAuditLogs = allAuditLogs.filter((a) => a.dealId === deal.id || deal.companyId && a.companyId === deal.companyId);
        const dealActivities = allActivities.filter((a) => a.dealId === deal.id);
        const actionTimestamps = [
          new Date(deal.createdAt || now.getTime()).getTime()
        ];
        if (deal.updatedAt) {
          const t = new Date(deal.updatedAt).getTime();
          if (!isNaN(t)) actionTimestamps.push(t);
        }
        dealAuditLogs.forEach((log) => {
          const t = new Date(log.timestamp).getTime();
          if (!isNaN(t)) actionTimestamps.push(t);
        });
        dealActivities.forEach((act) => {
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
        const daysSinceLastAction = Math.floor((now.getTime() - lastActionTime) / (1e3 * 60 * 60 * 24));
        let latestActivityDate = null;
        if (dealActivities.length > 0) {
          const activityDates = dealActivities.map((a) => new Date(a.date || a.createdAt).getTime()).filter((t) => !isNaN(t));
          if (activityDates.length > 0) {
            latestActivityDate = Math.max(...activityDates);
          }
        }
        const daysSinceLatestActivityDate = latestActivityDate !== null ? Math.floor((now.getTime() - latestActivityDate) / (1e3 * 60 * 60 * 24)) : null;
        const matchingEmailRules = stageReminders.filter((r) => {
          if (r.action !== "email") return false;
          if (daysInStage < r.days) return false;
          if (daysSinceLastAction < r.days) return false;
          if (daysSinceLatestActivityDate !== null && daysSinceLatestActivityDate < r.days) return false;
          return true;
        });
        if (matchingEmailRules.length === 0) continue;
        matchingEmailRules.sort((a, b) => b.days - a.days);
        const activeRule = matchingEmailRules[0];
        const stageEntryDate = new Date(stageEntryTime);
        const [existingLogs] = await connection.query(
          `SELECT id FROM activities 
           WHERE dealId = ? AND type = 'email' AND createdBy = 'System Cron' AND createdAt >= ? 
           AND (note LIKE ? OR note LIKE ? OR note LIKE ?)`,
          [
            deal.id,
            stageEntryDate,
            `%P\u0159ipom\xEDnka ${activeRule.days} dn\xED%`,
            `%P\u0159ipom\xEDnka ${activeRule.days} dn\u016F%`,
            `%ruleId:${activeRule.id}%`
          ]
        );
        if (existingLogs.length > 0) {
          continue;
        }
        let assignedUserIds = [];
        if (stage === "opportunity" || stage === "lead") {
          if (deal.hunterId) assignedUserIds.push(deal.hunterId);
        } else if (stage === "discovery_proposal") {
          if (deal.hunterId) assignedUserIds.push(deal.hunterId);
          if (deal.closerId) assignedUserIds.push(deal.closerId);
        } else if (stage === "contracting") {
          if (deal.closerId) assignedUserIds.push(deal.closerId);
        } else if (stage === "onboarding" || stage === "farming") {
          if (deal.farmerId) assignedUserIds.push(deal.farmerId);
        }
        if (assignedUserIds.length === 0) {
          if (deal.createdBy) assignedUserIds.push(deal.createdBy);
          if (deal.hunterId) assignedUserIds.push(deal.hunterId);
          if (deal.closerId) assignedUserIds.push(deal.closerId);
          if (deal.farmerId) assignedUserIds.push(deal.farmerId);
        }
        assignedUserIds = Array.from(new Set(assignedUserIds));
        const recipientUsers = users.filter((u) => assignedUserIds.includes(u.id) && u.email && u.isActive);
        if (recipientUsers.length === 0) {
          console.log(`[STAGE REMINDERS] No active recipient users for deal ${deal.id}`);
          continue;
        }
        const company = companiesMap.get(deal.companyId) || { name: "Nezn\xE1m\xE1 spole\u010Dnost" };
        const stageName = stageLabels[stage] || stage;
        const hunterUser = users.find((u) => u.id === deal.hunterId);
        const closerUser = users.find((u) => u.id === deal.closerId);
        const farmerUser = users.find((u) => u.id === deal.farmerId);
        const leadSource = leadSources.find((ls) => ls.id === deal.leadSourceId)?.name || "-";
        const ecommercePlatform = ecomPlatforms.find((e) => e.id === deal.ecommercePlatformId)?.name || "-";
        const storageType = storageTypes.find((s) => s.id === deal.storageTypeId)?.name || "-";
        const itIntegration = itIntegrations.find((it) => it.id === deal.itIntegrationId)?.name || "-";
        const segment = segments.find((s) => s.id === company.segment)?.name || company.segment || "-";
        const contactsText = Array.isArray(company.contacts) && company.contacts.length > 0 ? company.contacts.map((c) => `${c.name}${c.email ? " <" + c.email + ">" : ""}${c.phone ? " (" + c.phone + ")" : ""}${c.linkedin ? " [" + c.linkedin + "]" : ""}`).join(", ") : "-";
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
      const userNotificationsMap = /* @__PURE__ */ new Map();
      for (const item of itemsToNotify) {
        for (const recipientUser of item.recipientUsers) {
          if (!userNotificationsMap.has(recipientUser.id)) {
            userNotificationsMap.set(recipientUser.id, { user: recipientUser, items: [] });
          }
          userNotificationsMap.get(recipientUser.id).items.push(item);
        }
      }
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "localhost",
        port: parseInt(process.env.SMTP_PORT || "1025", 10),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || ""
        } : void 0,
        tls: {
          rejectUnauthorized: false
        }
      });
      for (const [userId, { user, items }] of userNotificationsMap.entries()) {
        if (items.length === 0) continue;
        let subject = "";
        let introText = "";
        if (items.length === 1) {
          const item = items[0];
          subject = `[Upozorn\u011Bn\xED] P\u0159\xEDle\u017Eitost ${item.company.name} je ve f\xE1zi "${item.stageName}" ji\u017E ${item.daysInStage} dn\xED`;
          introText = `uplynulo <strong style="color: #dc2626; font-size: 16px;">${item.daysInStage} dn\u016F</strong> od vlo\u017Een\xED / p\u0159esunu p\u0159\xEDle\u017Eitosti <strong>${item.company.name}</strong> do f\xE1ze <strong>${item.stageName}</strong>, ani\u017E by se posunula do dal\u0161\xEDho stavu.`;
        } else {
          subject = `[Upozorn\u011Bn\xED] Souhrn neaktivn\xEDch p\u0159\xEDle\u017Eitost\xED (${items.length})`;
          introText = `v syst\xE9mu evidujeme <strong style="color: #dc2626; font-size: 16px;">${items.length} neaktivn\xEDch p\u0159\xEDle\u017Eitost\xED</strong>, kter\xE9 vy\u017Eaduj\xED va\u0161i pozornost a posun do dal\u0161\xEDho stavu:`;
        }
        const itemsHtml = items.map((item) => `
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; background-color: #fafafa;">
            <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0; font-size: 16px; color: #111827;">${item.company.name}</h3>
              <span style="font-size: 12px; font-weight: 600; color: #dc2626; background-color: #fee2e2; padding: 4px 8px; border-radius: 4px;">
                ${item.daysInStage} dn\xED ve f\xE1zi (${item.stageName})
              </span>
            </div>
            <div style="background-color: #f3f4f6; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #4b5563; margin-bottom: 12px;">
              <strong>Aktivovan\xE9 pravidlo:</strong> ${item.activeRule.days} dn\xED bez posunu (F\xE1ze: ${item.stageName})
            </div>

            <table style="width: 100%; text-align: left; font-size: 13px; border-collapse: collapse;">
              <tbody>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280; width: 190px;">Spole\u010Dnost:</td><td style="padding: 4px 0; font-weight: 600; color: #111827;">${item.company.name}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">I\u010CO:</td><td style="padding: 4px 0;">${item.company.companyId || "-"}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Region / Segment:</td><td style="padding: 4px 0;">${item.company.region || "-"} / ${item.segment}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Adresa:</td><td style="padding: 4px 0;">${item.company.address || "-"}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">E-mail / Telefon:</td><td style="padding: 4px 0;">${item.company.email || "-"} / ${item.company.phone || "-"}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Webov\xE9 str\xE1nky:</td><td style="padding: 4px 0;">${Array.isArray(item.company.urls) ? item.company.urls.join(", ") : "-"}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Kontaktn\xED osoby:</td><td style="padding: 4px 0;">${item.contactsText}</td></tr>
                <tr style="border-top: 1px dashed #e5e7eb;"><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Aktu\xE1ln\xED f\xE1ze:</td><td style="padding: 4px 0; font-weight: 600; color: #4f46e5;">${item.stageName}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Zdroj leadu:</td><td style="padding: 4px 0;">${item.leadSource}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">E-commerce platforma:</td><td style="padding: 4px 0;">${item.ecommercePlatform}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Typ skladov\xE1n\xED:</td><td style="padding: 4px 0;">${item.storageType}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">IT Integrace:</td><td style="padding: 4px 0;">${item.itIntegration}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Odhad bal\xEDk\u016F (m\u011Bs./rok):</td><td style="padding: 4px 0;">${item.deal.estimatedMonthlyParcels || "-"} / ${item.deal.estimatedYearlyParcels || "-"}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Hunter / Closer / Farmer:</td><td style="padding: 4px 0;">${item.hunterUser?.name || "-"} / ${item.closerUser?.name || "-"} / ${item.farmerUser?.name || "-"}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: 600; color: #6b7280;">Datum vlo\u017Een\xED:</td><td style="padding: 4px 0;">${item.deal.createdAt ? new Date(item.deal.createdAt).toLocaleDateString("cs-CZ") : "-"}</td></tr>
              </tbody>
            </table>
          </div>
        `).join("");
        const htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; color: #1f2937; background-color: #ffffff;">
            <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #4f46e5; margin: 0; font-size: 20px;">Upozorn\u011Bn\xED na neaktivitu p\u0159\xEDle\u017Eitost\xED</h2>
            </div>
            <p style="font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
              Dobr\xFD den ${user.name || ""},<br/>
              ${introText}
            </p>

            ${itemsHtml}

            <div style="border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;">
              Tato zpr\xE1va byla automaticky vygenerov\xE1na syst\xE9mem p\u0159ipom\xEDnek.
            </div>
          </div>
        `;
        try {
          const mailOptions = {
            from: process.env.SMTP_FROM || "noreply@crm-system.cz",
            to: user.email,
            subject,
            html: htmlContent
          };
          await transporter.sendMail(mailOptions);
          sentCount++;
          await connection.query(
            "INSERT INTO email_logs (id, recipient, subject, status, error, sentAt) VALUES (?, ?, ?, ?, ?, NOW())",
            [uuidv4(), user.email, subject, "sent", null]
          );
        } catch (mailErr) {
          console.error(`[STAGE REMINDERS] Error sending mail to ${user.email}:`, mailErr.message);
          await connection.query(
            "INSERT INTO email_logs (id, recipient, subject, status, error, sentAt) VALUES (?, ?, ?, ?, ?, NOW())",
            [uuidv4(), user.email, subject, "error", mailErr.message || String(mailErr)]
          );
        }
      }
      for (const item of itemsToNotify) {
        const recipientNames = item.recipientUsers.map((u) => `${u.name} (${u.email})`).join(", ");
        const activityNote = `Automatick\xE9 upozorn\u011Bn\xED (P\u0159ipom\xEDnka ${item.activeRule.days} dn\xED, ruleId:${item.activeRule.id}): Uplynulo ${item.daysInStage} dn\u016F ve f\xE1zi "${item.stageName}". E-mail odesl\xE1n na: ${recipientNames}`;
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
  app.post("/api/run-reminders-cron", authMiddleware, async (req, res) => {
    try {
      const result = await processStageReminders();
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("Run reminders cron failed:", err);
      res.status(500).json({ error: err.message });
    }
  });
  let lastCronRunDay = -1;
  setInterval(async () => {
    const now = /* @__PURE__ */ new Date();
    const currentDay = now.getDate();
    if (now.getHours() === 0 && now.getMinutes() === 1 && lastCronRunDay !== currentDay) {
      lastCronRunDay = currentDay;
      console.log("[CRON] Executing scheduled daily stage reminders check at 00:01...");
      try {
        await processStageReminders();
      } catch (err) {
        if (err.code === "ETIMEDOUT" || err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.message?.includes("ETIMEDOUT")) {
          console.warn(`[CRON] Scheduled stage reminders check skipped: Database connection unreachable (${err.message}).`);
        } else {
          console.error("[CRON] Scheduled stage reminders check failed:", err);
        }
      }
    }
  }, 6e4);
}
startServer().catch(console.error);
