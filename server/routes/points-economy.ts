import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";

// ── Points economy (redemption) ─────────────────────────────────────────────
// Customers spend availablePoints on: business_perk (funded by & redeemed at a
// business → issues an in-store reward), platform_perk (a code), or prize_draw
// (an entry; admin draws a winner). Businesses create their own perks; admins
// create platform perks + draws.

const TITLE_MAX = 80;

export function registerPointsEconomyRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

  // ── Customer ───────────────────────────────────────────────────────────
  app.get("/api/points/rewards", isAuthenticated, async (req, res) => {
    try {
      const rewards = await storage.getActivePointRewards();
      const availablePoints = (req.user as any).availablePoints ?? 0;
      res.json({ rewards, availablePoints });
    } catch (error) {
      console.error("Points catalog error:", error);
      res.status(500).json({ error: "Failed to load rewards" });
    }
  });

  app.post("/api/points/redeem", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const pointRewardId = String(req.body?.pointRewardId ?? "");
      const pr = await storage.getPointReward(pointRewardId);
      if (!pr || !pr.isActive) return res.status(404).json({ error: "Reward not available" });
      if (pr.winnerRedemptionId) return res.status(409).json({ error: "This draw has closed" });
      if (pr.quantity != null && (pr.redeemedCount ?? 0) >= pr.quantity) return res.status(409).json({ error: "Sold out" });
      if (pr.endsAt && new Date(pr.endsAt).getTime() < Date.now()) return res.status(409).json({ error: "This reward has ended" });

      // Atomic deduct — fails if the balance can't cover it.
      const newBalance = await storage.spendCustomerPoints(userId, pr.pointsCost);
      if (newBalance == null) return res.status(402).json({ error: "Not enough points" });

      try {
        await storage.incrementPointRewardRedeemed(pr.id);
        let rewardId: string | null = null;
        let code: string | null = null;
        let status = "active";
        if (pr.type === "business_perk" && pr.businessId) {
          const reward = await storage.createManualReward({
            userId, businessId: pr.businessId, type: "free_item", title: pr.title,
          });
          rewardId = reward.id;
        } else if (pr.type === "prize_draw") {
          status = "entered";
        } else {
          code = `POINTS${Date.now().toString(36).toUpperCase()}`;
        }
        const redemption = await storage.createPointRedemption({ pointRewardId: pr.id, userId, pointsSpent: pr.pointsCost, rewardId, code, status });
        res.status(201).json({ redemption, availablePoints: newBalance });
      } catch (issueErr) {
        // Roll the points back if issuing failed after deduction.
        await storage.refundCustomerPoints(userId, pr.pointsCost);
        throw issueErr;
      }
    } catch (error) {
      console.error("Redeem error:", error);
      res.status(500).json({ error: "Failed to redeem" });
    }
  });

  app.get("/api/points/my-redemptions", isAuthenticated, async (req, res) => {
    try {
      res.json(await storage.getPointRedemptionsForUser((req.user as any).id));
    } catch (error) {
      console.error("Redemptions error:", error);
      res.status(500).json({ error: "Failed to load redemptions" });
    }
  });

  // ── Business creates/manages its own perks ────────────────────────────────
  app.post("/api/points/rewards", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const businessId = String(req.body?.businessId ?? "");
      if (!(await userOwnsBusiness(userId, businessId))) return res.status(403).json({ error: "Not your business" });
      const title = String(req.body?.title ?? "").trim().slice(0, TITLE_MAX);
      const pointsCost = Number(req.body?.pointsCost);
      if (!title) return res.status(400).json({ error: "A title is required" });
      if (!Number.isInteger(pointsCost) || pointsCost <= 0) return res.status(400).json({ error: "Points cost must be a positive whole number" });
      const quantityRaw = req.body?.quantity;
      const reward = await storage.createPointReward({
        title,
        description: typeof req.body?.description === "string" ? req.body.description.slice(0, 200) : null,
        emoji: typeof req.body?.emoji === "string" ? req.body.emoji.slice(0, 8) : null,
        pointsCost, type: "business_perk", businessId,
        createdByUserId: userId, createdByRole: "business",
        quantity: quantityRaw != null && quantityRaw !== "" ? Math.max(1, Number(quantityRaw)) : null,
      });
      res.status(201).json(reward);
    } catch (error) {
      console.error("Create perk error:", error);
      res.status(500).json({ error: "Failed to create perk" });
    }
  });

  app.get("/api/points/rewards/manage", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const businessId = typeof req.query.businessId === "string" ? req.query.businessId : "";
      if (!(await userOwnsBusiness(userId, businessId))) return res.status(403).json({ error: "Not your business" });
      res.json(await storage.getPointRewardsByBusiness(businessId));
    } catch (error) {
      console.error("Manage perks error:", error);
      res.status(500).json({ error: "Failed to load perks" });
    }
  });

  app.post("/api/points/rewards/:id/deactivate", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const pr = await storage.getPointReward(req.params.id);
      if (!pr) return res.status(404).json({ error: "Not found" });
      const isAdmin = await storage.isPlatformAdmin(userId);
      const owns = pr.businessId ? await userOwnsBusiness(userId, pr.businessId) : false;
      if (!isAdmin && !owns) return res.status(403).json({ error: "Not allowed" });
      await storage.deactivatePointReward(pr.id);
      res.json({ ok: true });
    } catch (error) {
      console.error("Deactivate perk error:", error);
      res.status(500).json({ error: "Failed to deactivate" });
    }
  });

  // ── Admin: platform perks + prize draws ───────────────────────────────────
  app.post("/api/admin/points/rewards", async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const title = String(req.body?.title ?? "").trim().slice(0, TITLE_MAX);
      const pointsCost = Number(req.body?.pointsCost);
      const type = req.body?.type === "prize_draw" ? "prize_draw" : "platform_perk";
      if (!title) return res.status(400).json({ error: "A title is required" });
      if (!Number.isInteger(pointsCost) || pointsCost <= 0) return res.status(400).json({ error: "Points cost must be a positive whole number" });
      const reward = await storage.createPointReward({
        title,
        description: typeof req.body?.description === "string" ? req.body.description.slice(0, 200) : null,
        emoji: typeof req.body?.emoji === "string" ? req.body.emoji.slice(0, 8) : null,
        pointsCost, type, businessId: null,
        createdByUserId: userId, createdByRole: "admin",
        quantity: req.body?.quantity != null && req.body.quantity !== "" ? Math.max(1, Number(req.body.quantity)) : null,
      });
      res.status(201).json(reward);
    } catch (error) {
      console.error("Admin create reward error:", error);
      res.status(500).json({ error: "Failed to create reward" });
    }
  });

  app.get("/api/admin/points/rewards", async (_req, res) => {
    try {
      res.json(await storage.getAllPointRewards());
    } catch (error) {
      console.error("Admin list rewards error:", error);
      res.status(500).json({ error: "Failed to load rewards" });
    }
  });

  app.post("/api/admin/points/draws/:id/draw", async (req, res) => {
    try {
      const pr = await storage.getPointReward(req.params.id);
      if (!pr || pr.type !== "prize_draw") return res.status(404).json({ error: "Prize draw not found" });
      if (pr.winnerRedemptionId) return res.status(409).json({ error: "Winner already drawn" });
      const result = await storage.drawPrizeWinner(pr.id);
      if (!result) return res.status(409).json({ error: "No entries to draw from" });
      const winner = await storage.getUser(result.winnerUserId);
      res.json({ winner: { email: (winner as any)?.email ?? null, name: (winner as any)?.firstName ?? null } });
    } catch (error) {
      console.error("Draw winner error:", error);
      res.status(500).json({ error: "Failed to draw winner" });
    }
  });
}
