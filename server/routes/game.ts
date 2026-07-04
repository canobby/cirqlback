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

  // CHR-95: a world was restored — server-authoritative. Increments the count
  // and awards points through the existing economy (rate-limited to curb
  // farming; deeper anti-abuse, like taps, can follow).
  const RESTORE_POINTS = 5;
  const RESTORE_MIN_INTERVAL_MS = 4000;
  app.post("/api/game/restored", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const idx = Number(req.body?.worldIndex);
      const worldIndex = Number.isFinite(idx) ? Math.max(0, Math.min(1_000_000, Math.floor(idx))) : undefined;
      const p = await storage.getOrCreateGameProgress(userId);
      const now = Date.now();
      const last = Number((p.state as any)?.lastRestoreAt) || 0;
      const pointsAwarded = now - last >= RESTORE_MIN_INTERVAL_MS ? RESTORE_POINTS : 0;
      if (pointsAwarded > 0) await storage.updateUserPoints(userId, pointsAwarded);
      const saved = await storage.saveGameProgress(userId, {
        worldsRestored: p.worldsRestored + 1,
        ...(worldIndex !== undefined ? { worldIndex } : {}),
        state: { ...((p.state as any) || {}), lastRestoreAt: now },
      });
      res.json({ worldsRestored: saved.worldsRestored, pointsAwarded });
    } catch (err) {
      console.error("game restored error:", err);
      res.status(500).json({ error: "Failed to record restoration" });
    }
  });
}
