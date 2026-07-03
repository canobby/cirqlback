import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";

// ── Rewarded referral loop ──────────────────────────────────────────────────
// Share your code → a friend redeems it → when the friend takes their first tap
// BOTH of you earn points (see storage.processReferralCompletion, fired from the
// tap loop). This activates the previously-inert referral tracking.
export function registerReferralRoutes(app: Express, _deps: RouteDeps) {
  // My referral code + stats.
  app.get("/api/referrals/mine", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const code = await storage.ensureReferralCode(userId);
      const stats = await storage.getReferralStats(userId);
      res.json({ code, completed: stats.completed, pending: stats.pending, pointsEarned: stats.pointsEarned });
    } catch (error) {
      console.error("Referral mine error:", error);
      res.status(500).json({ error: "Failed to load referrals" });
    }
  });

  // Redeem a friend's code. Completion (and the reward) happens on my first tap.
  app.post("/api/referrals/redeem", isAuthenticated, async (req, res) => {
    try {
      const me = req.user as any;
      const code = String(req.body?.code ?? "").trim().toUpperCase();
      if (!code) return res.status(400).json({ error: "A code is required" });
      if (!me.email) return res.status(400).json({ error: "Your account needs an email to use a referral code" });

      const referrer = await storage.getUserByReferralCode(code);
      if (!referrer) return res.status(404).json({ error: "That referral code doesn't exist" });
      if (referrer.id === me.id) return res.status(400).json({ error: "You can't refer yourself" });

      const existing = await storage.getReferralForReferee(me.id, me.email);
      if (existing) return res.status(409).json({ error: "You've already used a referral code" });

      await storage.createReferral({
        referrerId: referrer.id,
        refereeId: me.id,
        refereeEmail: me.email,
        status: "pending",
      } as any);
      res.status(201).json({ ok: true, referrer: (referrer as any).firstName || "your friend", bonusOnFirstTap: true });
    } catch (error) {
      console.error("Referral redeem error:", error);
      res.status(500).json({ error: "Failed to apply referral code" });
    }
  });

  // Top referrers (friendly competition).
  app.get("/api/referrals/leaderboard", async (_req, res) => {
    try {
      res.json(await storage.getReferralLeaderboard(10));
    } catch (error) {
      console.error("Referral leaderboard error:", error);
      res.status(500).json({ error: "Failed to load leaderboard" });
    }
  });
}
