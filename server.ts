import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // API Routes
  // Note: AI analysis moved to frontend (src/services/geminiService.ts) 
  // for direct API key handling in the AI Studio environment.

  // Keep a local alerts store for any fallback, though Firebase is now primary
  const alerts: any[] = [];

  app.post("/api/alerts/report", (req, res) => {
    const { condition, location, severity, timestamp } = req.body;
    const newAlert = {
      id: Math.random().toString(36).substr(2, 9),
      condition,
      location,
      severity,
      timestamp: timestamp || new Date().toISOString(),
    };
    alerts.push(newAlert);
    
    // Simple cluster detection logic
    const sameConditionInLastWeek = alerts.filter(a => 
      a.condition === condition && 
      (new Date().getTime() - new Date(a.timestamp).getTime()) < 7 * 24 * 60 * 60 * 1000
    );

    res.json({ 
      success: true, 
      alertId: newAlert.id,
      clusterMatch: sameConditionInLastWeek.length >= 3 // Alert if 3+ cases in a week
    });
  });

  app.get("/api/alerts/summary", (req, res) => {
    res.json(alerts.slice(-50)); // Last 50 reports
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DermAl Server running at http://localhost:${PORT}`);
  });
}

startServer();
