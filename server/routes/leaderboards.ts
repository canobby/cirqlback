import type { Express } from "express";
import { storage } from "../storage";
import type { RouteDeps } from "./_shared";

// Seasonal (this-month) + local (territory) leaderboards, computed from tap
// points. Public read (names + points only) — the all-time board already lives
// at /api/leaderboard.
export function registerLeaderboardRoutes(app: Express, _deps: RouteDeps) {
  app.get("/api/leaderboard/monthly", async (_req, res) => {
    try {
      res.json(await storage.getMonthlyLeaderboard(10));
    } catch (error) {
      console.error("Monthly leaderboard error:", error);
      res.status(500).json({ error: "Failed to load leaderboard" });
    }
  });

  app.get("/api/leaderboard/territory/:territoryId", async (req, res) => {
    try {
      const monthly = req.query.period === "month";
      res.json(await storage.getTerritoryLeaderboard(req.params.territoryId, monthly, 10));
    } catch (error) {
      console.error("Territory leaderboard error:", error);
      res.status(500).json({ error: "Failed to load leaderboard" });
    }
  });
}
