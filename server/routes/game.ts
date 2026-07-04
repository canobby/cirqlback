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

  // CHR-93: in-game daily reward. Mirrors the daily spin / tap-streak systems so
  // login habit and game habit reinforce each other — one calm, escalating bonus
  // per UTC day for opening & playing, banked into the same points economy and
  // saved (for logged-in players) in the shared game_progress.state blob.
  const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10); // yyyy-mm-dd
  const DAILY_BASE = 10; // day-1 reward
  const DAILY_STEP = 5; // +per consecutive day
  const DAILY_CAP = 50; // base reward ceiling
  const DAILY_MILESTONES: Record<number, number> = { 3: 25, 7: 75, 14: 150, 30: 300 };
  // What claiming today yields at a given (post-claim) streak length.
  const dailyReward = (streak: number) =>
    Math.min(DAILY_BASE + Math.max(0, streak - 1) * DAILY_STEP, DAILY_CAP) + (DAILY_MILESTONES[streak] ?? 0);
  // The streak a claim right now would produce, given the last claim day.
  const nextStreak = (lastDay: string | undefined, streak: number, today: string, yesterday: string) =>
    lastDay === yesterday ? streak + 1 : lastDay === today ? streak : 1;

  // Status — has today's reward been claimed, current streak, and a preview of
  // what a claim right now would grant (so the button can read "Claim +N").
  app.get("/api/game/daily", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const p = await storage.getOrCreateGameProgress(userId);
      const s = (p.state as any) || {};
      const now = Date.now();
      const today = utcDay(now);
      const yesterday = utcDay(now - 86_400_000);
      const lastDay: string | undefined = s.dailyLastDate;
      const streak: number = Number(s.dailyStreak) || 0;
      const canClaim = lastDay !== today;
      const claimStreak = nextStreak(lastDay, streak, today, yesterday);
      res.json({ canClaim, streak, reward: dailyReward(claimStreak), nextStreak: claimStreak });
    } catch (err) {
      console.error("game daily status error:", err);
      res.status(500).json({ error: "Failed to load daily reward" });
    }
  });

  // Claim today's reward — server-authoritative & idempotent per UTC day.
  app.post("/api/game/daily", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const p = await storage.getOrCreateGameProgress(userId);
      const s = (p.state as any) || {};
      const now = Date.now();
      const today = utcDay(now);
      const yesterday = utcDay(now - 86_400_000);
      if (s.dailyLastDate === today) {
        return res.status(409).json({ error: "Daily reward already claimed. Come back tomorrow!" });
      }
      const streak = nextStreak(s.dailyLastDate, Number(s.dailyStreak) || 0, today, yesterday);
      const pointsAwarded = dailyReward(streak);
      await storage.updateUserPoints(userId, pointsAwarded);
      await storage.saveGameProgress(userId, {
        state: { ...s, dailyLastDate: today, dailyStreak: streak },
      });
      res.json({ pointsAwarded, streak });
    } catch (err) {
      console.error("game daily claim error:", err);
      res.status(500).json({ error: "Failed to claim daily reward" });
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
