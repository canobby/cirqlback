import type { Express } from "express";
import { storage } from "../storage";
import type { RouteDeps } from "./_shared";

// ── Manual reward / balance operations (admin + coordinator) ─────────────────
// A "fix it when something goes wrong" tool: adjust a customer's loyalty points,
// grant a reward, or flip a reward's redeemed state. Every change is written to
// reward_adjustments for a full audit trail.
//
// Scope:
//   • Admin  (/api/admin/*)       — any registered customer, any business.
//   • Coordinator (/api/coordinator/*) — territory-scoped: may only touch
//     rewards at businesses in their territory, and may only adjust the points
//     of customers who have activity (a tap) at one of those businesses.
//
// Both point and reward balances live on a registered user row, so an email with
// no account can't be targeted (surfaced to the operator).

const POINTS_MAX = 100000;
const REASON_MAX = 500;

type CustomerViewOpts = {
  // Businesses the actor is allowed to see/act on (null = all, for admin).
  allowedBusinessIds: string[] | null;
  canAdjustPoints: boolean;
};

async function assembleCustomerView(userId: string, email: string | null, opts: CustomerViewOpts) {
  const user = await storage.getUser(userId);
  if (!user) return null;

  const allRewards = await storage.getRewardsByUser(userId);
  const rewards =
    opts.allowedBusinessIds === null
      ? allRewards
      : allRewards.filter((r) => r.businessId && opts.allowedBusinessIds!.includes(r.businessId));

  // Businesses the customer is related to (taps + rewards), scoped — the grant
  // picker only offers places the customer actually visits.
  const taps = email ? await storage.getTaps(undefined, email) : [];
  const relatedIds = Array.from(
    new Set([
      ...taps.map((t: any) => t.businessId),
      ...allRewards.map((r) => r.businessId),
    ].filter(Boolean) as string[]),
  ).filter((id) => opts.allowedBusinessIds === null || opts.allowedBusinessIds.includes(id));

  const bizNames = new Map<string, string>();
  await Promise.all(
    Array.from(new Set([...relatedIds, ...rewards.map((r) => r.businessId).filter(Boolean) as string[]])).map(
      async (id) => {
        const b = await storage.getBusiness(id);
        if (b) bizNames.set(id, b.name);
      },
    ),
  );

  const adjustments = await storage.getRewardAdjustmentsForUser(userId);

  return {
    user: {
      id: user.id,
      email: (user as any).email ?? null,
      name: `${(user as any).firstName ?? ""} ${(user as any).lastName ?? ""}`.trim() || (user as any).email || "—",
      availablePoints: (user as any).availablePoints ?? 0,
      totalPoints: (user as any).totalPoints ?? 0,
      totalPointsEarned: (user as any).totalPointsEarned ?? 0,
    },
    canAdjustPoints: opts.canAdjustPoints,
    rewards: rewards
      .map((r) => ({
        id: r.id,
        businessId: r.businessId,
        businessName: (r.businessId && bizNames.get(r.businessId)) || "Business",
        title: r.title,
        type: r.type,
        value: r.value,
        isRedeemed: r.isRedeemed ?? false,
        redeemedAt: r.redeemedAt,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    relatedBusinesses: relatedIds.map((id) => ({ id, name: bizNames.get(id) || "Business" })),
    adjustments,
  };
}

// Resolve a lookup target (?userId= or ?email=) to a user id + email.
async function resolveTarget(query: any): Promise<{ userId: string; email: string | null } | null> {
  const userId = typeof query.userId === "string" ? query.userId : undefined;
  const email = typeof query.email === "string" ? query.email.trim().toLowerCase() : undefined;
  if (userId) {
    const u = await storage.getUser(userId);
    return u ? { userId: u.id, email: (u as any).email ?? null } : null;
  }
  if (email) {
    const u = await storage.getUserByEmail(email);
    return u ? { userId: u.id, email: (u as any).email ?? null } : null;
  }
  return null;
}

export function registerRewardsOpsRoutes(app: Express, _deps: RouteDeps) {
  // ── Admin (any customer, any business) ────────────────────────────────────

  app.get("/api/admin/customers/rewards", async (req, res) => {
    try {
      const target = await resolveTarget(req.query);
      if (!target) {
        return res.status(404).json({ error: "No registered customer for that lookup." });
      }
      const view = await assembleCustomerView(target.userId, target.email, {
        allowedBusinessIds: null,
        canAdjustPoints: true,
      });
      res.json(view);
    } catch (error) {
      console.error("Admin customer rewards lookup error:", error);
      res.status(500).json({ error: "Failed to load customer" });
    }
  });

  app.post("/api/admin/customers/points", async (req, res) => {
    try {
      const actorId = (req.user as any).id as string;
      const result = await applyPointsAdjustment({
        actorId, actorRole: "admin",
        userId: String(req.body?.userId ?? ""),
        delta: Number(req.body?.delta),
        reason: String(req.body?.reason ?? ""),
        checkAllowed: async () => true,
      } as any);
      res.status(result.status).json(result.body);
    } catch (error) {
      console.error("Admin points adjust error:", error);
      res.status(500).json({ error: "Failed to adjust points" });
    }
  });

  app.post("/api/admin/rewards/grant", async (req, res) => {
    try {
      const actorId = (req.user as any).id as string;
      const result = await applyGrant({
        actorId, actorRole: "admin", body: req.body,
        checkBusiness: async () => true,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      console.error("Admin grant reward error:", error);
      res.status(500).json({ error: "Failed to grant reward" });
    }
  });

  app.post("/api/admin/rewards/redeem", async (req, res) => {
    try {
      const actorId = (req.user as any).id as string;
      const result = await applyRedeemToggle({
        actorId, actorRole: "admin", body: req.body,
        checkBusiness: async () => true,
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      console.error("Admin redeem toggle error:", error);
      res.status(500).json({ error: "Failed to update reward" });
    }
  });

  // ── Coordinator (territory-scoped) ────────────────────────────────────────

  const territoryBusinessIds = async (req: any): Promise<string[]> => {
    const businesses = await storage.getBusinessesForCoordinator(req.coordinator.id);
    return businesses.map((b: any) => b.id);
  };

  app.get("/api/coordinator/customers/rewards", async (req, res) => {
    try {
      const target = await resolveTarget(req.query);
      if (!target) {
        return res.status(404).json({ error: "No registered customer for that lookup." });
      }
      const bizIds = await territoryBusinessIds(req);
      const canAdjustPoints = await storage.customerActiveInBusinesses(target.userId, target.email, bizIds);
      const view = await assembleCustomerView(target.userId, target.email, {
        allowedBusinessIds: bizIds,
        canAdjustPoints,
      });
      res.json(view);
    } catch (error) {
      console.error("Coordinator customer rewards lookup error:", error);
      res.status(500).json({ error: "Failed to load customer" });
    }
  });

  app.post("/api/coordinator/customers/points", async (req, res) => {
    try {
      const actorId = (req.user as any).id as string;
      const bizIds = await territoryBusinessIds(req);
      const result = await applyPointsAdjustment({
        actorId, actorRole: "coordinator",
        userId: String(req.body?.userId ?? ""),
        delta: Number(req.body?.delta),
        reason: String(req.body?.reason ?? ""),
        // Only customers with activity at a territory business.
        checkAllowed: async (uid, email) =>
          await storage.customerActiveInBusinesses(uid, email, bizIds),
        forbiddenMsg: "This customer has no activity in your territory.",
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      console.error("Coordinator points adjust error:", error);
      res.status(500).json({ error: "Failed to adjust points" });
    }
  });

  app.post("/api/coordinator/rewards/grant", async (req, res) => {
    try {
      const actorId = (req.user as any).id as string;
      const coordinatorId = (req as any).coordinator.id as string;
      const result = await applyGrant({
        actorId, actorRole: "coordinator", body: req.body,
        checkBusiness: async (businessId) =>
          await storage.coordinatorOwnsBusiness(coordinatorId, businessId),
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      console.error("Coordinator grant reward error:", error);
      res.status(500).json({ error: "Failed to grant reward" });
    }
  });

  app.post("/api/coordinator/rewards/redeem", async (req, res) => {
    try {
      const actorId = (req.user as any).id as string;
      const coordinatorId = (req as any).coordinator.id as string;
      const result = await applyRedeemToggle({
        actorId, actorRole: "coordinator", body: req.body,
        checkBusiness: async (businessId) =>
          await storage.coordinatorOwnsBusiness(coordinatorId, businessId),
      });
      res.status(result.status).json(result.body);
    } catch (error) {
      console.error("Coordinator redeem toggle error:", error);
      res.status(500).json({ error: "Failed to update reward" });
    }
  });
}

// ── Shared operation handlers (return {status, body}) ───────────────────────

async function applyPointsAdjustment(input: {
  actorId: string;
  actorRole: string;
  userId: string;
  delta: number;
  reason: string;
  checkAllowed: (userId: string, email: string | null) => Promise<boolean>;
  forbiddenMsg?: string;
}) {
  const { actorId, actorRole, userId, delta, reason } = input;
  if (!userId) return { status: 400, body: { error: "userId is required" } };
  if (!Number.isInteger(delta) || delta === 0) {
    return { status: 400, body: { error: "delta must be a non-zero whole number" } };
  }
  if (Math.abs(delta) > POINTS_MAX) {
    return { status: 400, body: { error: `delta must be between -${POINTS_MAX} and ${POINTS_MAX}` } };
  }
  if (!reason.trim()) return { status: 400, body: { error: "A reason is required" } };

  const user = await storage.getUser(userId);
  if (!user) return { status: 404, body: { error: "Customer not found" } };
  const email = (user as any).email ?? null;
  if (!(await input.checkAllowed(userId, email))) {
    return { status: 403, body: { error: input.forbiddenMsg || "Not permitted for this customer." } };
  }

  const balance = await storage.adjustCustomerPoints(userId, delta);
  await storage.createRewardAdjustment({
    actorUserId: actorId,
    actorRole,
    targetUserId: userId,
    targetEmail: email,
    kind: "points",
    pointsDelta: delta,
    reason: reason.trim().slice(0, REASON_MAX),
  });
  return { status: 200, body: { ...balance } };
}

async function applyGrant(input: {
  actorId: string;
  actorRole: string;
  body: any;
  checkBusiness: (businessId: string) => Promise<boolean>;
}) {
  const { actorId, actorRole, body } = input;
  const userId = String(body?.userId ?? "");
  const businessId = String(body?.businessId ?? "");
  const title = String(body?.title ?? "").trim().slice(0, 150);
  const type = String(body?.type ?? "free_item");
  const value = body?.value != null && String(body.value).trim() !== "" ? String(body.value) : null;
  const reason = String(body?.reason ?? "").trim();
  const ALLOWED_TYPES = ["discount", "free_item", "points", "cashback"];

  if (!userId || !businessId) return { status: 400, body: { error: "userId and businessId are required" } };
  if (!title) return { status: 400, body: { error: "A reward title is required" } };
  if (!ALLOWED_TYPES.includes(type)) return { status: 400, body: { error: "Invalid reward type" } };
  if (!reason) return { status: 400, body: { error: "A reason is required" } };

  const user = await storage.getUser(userId);
  if (!user) return { status: 404, body: { error: "Customer not found" } };
  if (!(await input.checkBusiness(businessId))) {
    return { status: 403, body: { error: "That business isn't in your territory." } };
  }

  const reward = await storage.createManualReward({ userId, businessId, type, title, value });
  await storage.createRewardAdjustment({
    actorUserId: actorId,
    actorRole,
    targetUserId: userId,
    targetEmail: (user as any).email ?? null,
    businessId,
    kind: "grant",
    rewardId: reward.id,
    reason: reason.slice(0, REASON_MAX),
  });
  return { status: 201, body: reward };
}

async function applyRedeemToggle(input: {
  actorId: string;
  actorRole: string;
  body: any;
  checkBusiness: (businessId: string) => Promise<boolean>;
}) {
  const { actorId, actorRole, body } = input;
  const rewardId = String(body?.rewardId ?? "");
  const redeemed = body?.redeemed === true;
  const reason = String(body?.reason ?? "").trim();
  if (!rewardId) return { status: 400, body: { error: "rewardId is required" } };
  if (!reason) return { status: 400, body: { error: "A reason is required" } };

  const reward = await storage.getReward(rewardId);
  if (!reward) return { status: 404, body: { error: "Reward not found" } };
  if (!reward.businessId || !(await input.checkBusiness(reward.businessId))) {
    return { status: 403, body: { error: "That reward isn't in your territory." } };
  }

  const updated = await storage.setRewardRedeemed(rewardId, redeemed);
  await storage.createRewardAdjustment({
    actorUserId: actorId,
    actorRole,
    targetUserId: reward.userId ?? null,
    businessId: reward.businessId,
    kind: redeemed ? "redeem" : "unredeem",
    rewardId,
    reason: reason.slice(0, REASON_MAX),
  });
  return { status: 200, body: updated };
}
