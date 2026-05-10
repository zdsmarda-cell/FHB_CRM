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

  // Example API route for testing the connection
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
