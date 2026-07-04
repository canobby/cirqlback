import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";

// CIRQL game progress (CHR-94). Guests play without saving; logged-in players
// persist their resume point + a stable per-player seed for the infinite stream.
export function registerGameRoutes(app: Express, _deps: RouteDeps) {
  app.get("/api/game/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const p = await storage.getOrCreateGameProgress(userId);
      res.json({ worldIndex: p.worldIndex, worldsRestored: p.worldsRestored, playerSeed: p.playerSeed, state: p.state ?? null });
    } catch (err) {
      console.error("game progress load error:", err);
      res.status(500).json({ error: "Failed to load progress" });
    }
  });

  const saveSchema = z.object({
    worldIndex: z.number().int().min(0).max(1_000_000).optional(),
    worldsRestored: z.number().int().min(0).max(10_000_000).optional(),
    state: z.any().optional(),
  });

  app.put("/api/game/progress", isAuthenticated, async (req, res) => {
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid progress" });
    try {
      const userId = (req.user as any).id;
      const p = await storage.saveGameProgress(userId, parsed.data);
      res.json({ worldIndex: p.worldIndex, worldsRestored: p.worldsRestored, playerSeed: p.playerSeed });
    } catch (err) {
      console.error("game progress save error:", err);
      res.status(500).json({ error: "Failed to save progress" });
    }
  });
}
