import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";
import type { RewardContribution } from "@shared/schema";
import { createTransfer, getStripe } from "../stripe-connect";

// ── Shared-campaign reward settlements ───────────────────────────────────────
// Reporting + settlement for the tap-weighted cost split of funded multi-store
// rewards. Each funded reward accrues per-store contributions (see
// storage.accrueRewardContributions); here businesses see who owes whom, and
// admins / territory-scoped coordinators roll a host's owed contributions into a
// monthly statement and mark it settled (mirrors coordinator payouts; automated
// Stripe Connect transfer is the same deferred follow-up).

const money = (cents: number) => (cents / 100).toFixed(2);

// Aggregate unsettled contributions into a per-host "owed" summary.
function pendingByHost(contribs: RewardContribution[]) {
  const map = new Map<string, { hostBusinessId: string; periodMonth: string; totalCents: number; count: number }>();
  for (const c of contribs) {
    const key = `${c.hostBusinessId}|${c.periodMonth}`;
    const cur = map.get(key) ?? { hostBusinessId: c.hostBusinessId, periodMonth: c.periodMonth, totalCents: 0, count: 0 };
    cur.totalCents += c.shareCents ?? 0;
    cur.count += 1;
    map.set(key, cur);
  }
  return Array.from(map.values());
}

export function registerRewardSettlementRoutes(app: Express, _deps: RouteDeps) {
  // Resolve business names for a set of ids (small N per request).
  async function nameMap(ids: string[]): Promise<Map<string, string>> {
    const m = new Map<string, string>();
    await Promise.all(
      Array.from(new Set(ids.filter(Boolean))).map(async (id) => {
        const b = await storage.getBusiness(id);
        if (b) m.set(id, b.name);
      }),
    );
    return m;
  }

  async function enrichContribs(contribs: RewardContribution[]) {
    const names = await nameMap([
      ...contribs.map((c) => c.businessId),
      ...contribs.map((c) => c.hostBusinessId),
    ]);
    return contribs.map((c) => ({
      id: c.id,
      businessId: c.businessId,
      businessName: names.get(c.businessId) || "Business",
      hostBusinessId: c.hostBusinessId,
      hostName: names.get(c.hostBusinessId) || "Host",
      shareCents: c.shareCents,
      share: money(c.shareCents ?? 0),
      totalRewardCents: c.totalRewardCents,
      weightTaps: c.weightTaps,
      periodMonth: c.periodMonth,
      settled: !!c.settlementId,
      createdAt: c.createdAt,
    }));
  }

  // Host name + Connect payout-readiness, so the UI can offer a Stripe payout.
  async function hostInfo(ids: string[]): Promise<Map<string, { name: string; payoutsEnabled: boolean }>> {
    const m = new Map<string, { name: string; payoutsEnabled: boolean }>();
    await Promise.all(
      Array.from(new Set(ids.filter(Boolean))).map(async (id) => {
        const b = await storage.getBusiness(id);
        if (b) m.set(id, { name: b.name, payoutsEnabled: !!(b as any).connectPayoutsEnabled });
      }),
    );
    return m;
  }

  async function enrichPending(rows: ReturnType<typeof pendingByHost>) {
    const info = await hostInfo(rows.map((r) => r.hostBusinessId));
    return rows.map((r) => ({
      ...r,
      hostName: info.get(r.hostBusinessId)?.name || "Host",
      hostPayoutsEnabled: info.get(r.hostBusinessId)?.payoutsEnabled ?? false,
      total: money(r.totalCents),
    }));
  }

  // ── Merchant: what my businesses owe / are owed ───────────────────────────
  app.get("/api/my/reward-settlements", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const owned = await storage.getBusinessesByOwner(userId);
      const bizIds = owned.map((b) => b.id);
      if (bizIds.length === 0) return res.json({ owedByMe: [], owedToMe: [], settlements: [], summary: { owingCents: 0, owedCents: 0 } });

      const [owedByMe, owedToMeRaw, settlements] = await Promise.all([
        Promise.all(bizIds.map((id) => storage.getContributionsOwedByBusiness(id))).then((a) => a.flat()),
        Promise.all(bizIds.map((id) => storage.getContributionsOwedToHost(id))).then((a) => a.flat()),
        storage.getRewardSettlementsForHosts(bizIds),
      ]);
      const owingCents = owedByMe.filter((c) => !c.settlementId).reduce((s, c) => s + (c.shareCents ?? 0), 0);
      const owedCents = owedToMeRaw.filter((c) => !c.settlementId).reduce((s, c) => s + (c.shareCents ?? 0), 0);
      res.json({
        owedByMe: await enrichContribs(owedByMe),
        owedToMe: await enrichContribs(owedToMeRaw),
        settlements: settlements.map((s) => ({ ...s, total: money(s.totalCents) })),
        summary: { owingCents, owedCents, owing: money(owingCents), owed: money(owedCents) },
      });
    } catch (error) {
      console.error("My reward settlements error:", error);
      res.status(500).json({ error: "Failed to load settlements" });
    }
  });

  // ── Admin: platform-wide ──────────────────────────────────────────────────
  app.get("/api/admin/reward-settlements", async (_req, res) => {
    try {
      const [unsettled, settlements] = await Promise.all([
        storage.getUnsettledContributions(null),
        storage.getAllRewardSettlements(),
      ]);
      res.json({
        pending: await enrichPending(pendingByHost(unsettled)),
        settlements: await withHostNames(settlements),
      });
    } catch (error) {
      console.error("Admin reward settlements error:", error);
      res.status(500).json({ error: "Failed to load settlements" });
    }
  });

  app.post("/api/admin/reward-settlements/generate", async (req, res) => {
    try {
      const actorId = (req.user as any).id as string;
      const r = await generateSettlement({ hostBusinessId: req.body?.hostBusinessId, periodMonth: req.body?.periodMonth, actorId, allowed: async () => true });
      res.status(r.status).json(r.body);
    } catch (error) {
      console.error("Admin generate settlement error:", error);
      res.status(500).json({ error: "Failed to generate settlement" });
    }
  });

  app.post("/api/admin/reward-settlements/:id/status", async (req, res) => {
    try {
      const r = await setSettlementStatus({ id: req.params.id, body: req.body, allowed: async () => true });
      res.status(r.status).json(r.body);
    } catch (error) {
      console.error("Admin set settlement status error:", error);
      res.status(500).json({ error: "Failed to update settlement" });
    }
  });

  // ── Coordinator: territory-scoped (hosts in their territory) ──────────────
  const territoryBusinessIds = async (req: any): Promise<string[]> => {
    const businesses = await storage.getBusinessesForCoordinator(req.coordinator.id);
    return businesses.map((b: any) => b.id);
  };

  app.get("/api/coordinator/reward-settlements", async (req, res) => {
    try {
      const bizIds = await territoryBusinessIds(req);
      const [unsettled, settlements] = await Promise.all([
        storage.getUnsettledContributions(bizIds),
        storage.getRewardSettlementsForHosts(bizIds),
      ]);
      res.json({
        pending: await enrichPending(pendingByHost(unsettled)),
        settlements: await withHostNames(settlements),
      });
    } catch (error) {
      console.error("Coordinator reward settlements error:", error);
      res.status(500).json({ error: "Failed to load settlements" });
    }
  });

  app.post("/api/coordinator/reward-settlements/generate", async (req, res) => {
    try {
      const actorId = (req.user as any).id as string;
      const bizIds = await territoryBusinessIds(req);
      const r = await generateSettlement({
        hostBusinessId: req.body?.hostBusinessId,
        periodMonth: req.body?.periodMonth,
        actorId,
        allowed: async (hostId) => bizIds.includes(hostId),
      });
      res.status(r.status).json(r.body);
    } catch (error) {
      console.error("Coordinator generate settlement error:", error);
      res.status(500).json({ error: "Failed to generate settlement" });
    }
  });

  app.post("/api/coordinator/reward-settlements/:id/status", async (req, res) => {
    try {
      const bizIds = await territoryBusinessIds(req);
      const r = await setSettlementStatus({
        id: req.params.id,
        body: req.body,
        allowed: async (hostId) => bizIds.includes(hostId),
      });
      res.status(r.status).json(r.body);
    } catch (error) {
      console.error("Coordinator set settlement status error:", error);
      res.status(500).json({ error: "Failed to update settlement" });
    }
  });

  async function withHostNames(settlements: any[]) {
    const info = await hostInfo(settlements.map((s) => s.hostBusinessId));
    return settlements.map((s) => ({
      ...s,
      hostName: info.get(s.hostBusinessId)?.name || "Host",
      hostPayoutsEnabled: info.get(s.hostBusinessId)?.payoutsEnabled ?? false,
      total: money(s.totalCents),
    }));
  }

  // Automated payout of a settlement to the host's Connect account.
  app.post("/api/admin/reward-settlements/:id/payout", async (req, res) => {
    try {
      const r = await payoutSettlement({ id: req.params.id, allowed: async () => true });
      res.status(r.status).json(r.body);
    } catch (error) {
      console.error("Admin payout error:", error);
      res.status(500).json({ error: "Failed to pay out settlement" });
    }
  });

  app.post("/api/coordinator/reward-settlements/:id/payout", async (req, res) => {
    try {
      const bizIds = await territoryBusinessIds(req);
      const r = await payoutSettlement({ id: req.params.id, allowed: async (hostId) => bizIds.includes(hostId) });
      res.status(r.status).json(r.body);
    } catch (error) {
      console.error("Coordinator payout error:", error);
      res.status(500).json({ error: "Failed to pay out settlement" });
    }
  });
}

// ── Shared operation handlers ───────────────────────────────────────────────

async function generateSettlement(input: {
  hostBusinessId: string;
  periodMonth: string;
  actorId: string;
  allowed: (hostBusinessId: string) => Promise<boolean>;
}) {
  const hostBusinessId = String(input.hostBusinessId ?? "");
  const periodMonth = String(input.periodMonth ?? "");
  if (!hostBusinessId || !/^\d{4}-\d{2}$/.test(periodMonth)) {
    return { status: 400, body: { error: "hostBusinessId and a YYYY-MM periodMonth are required" } };
  }
  if (!(await input.allowed(hostBusinessId))) {
    return { status: 403, body: { error: "That host isn't in your territory." } };
  }
  const settlement = await storage.generateRewardSettlement(hostBusinessId, periodMonth, input.actorId);
  if (!settlement) return { status: 409, body: { error: "No unsettled contributions for that host and period." } };
  return { status: 201, body: settlement };
}

async function setSettlementStatus(input: {
  id: string;
  body: any;
  allowed: (hostBusinessId: string) => Promise<boolean>;
}) {
  const settlement = await storage.getRewardSettlement(input.id);
  if (!settlement) return { status: 404, body: { error: "Settlement not found" } };
  if (!(await input.allowed(settlement.hostBusinessId))) {
    return { status: 403, body: { error: "That settlement isn't in your territory." } };
  }
  const status = input.body?.status === "void" ? "void" : input.body?.status === "paid" ? "paid" : null;
  if (!status) return { status: 400, body: { error: "status must be 'paid' or 'void'" } };
  const updated = await storage.updateRewardSettlement(input.id, {
    status,
    reference: typeof input.body?.reference === "string" ? input.body.reference : undefined,
    notes: typeof input.body?.notes === "string" ? input.body.notes : undefined,
  });
  return { status: 200, body: updated };
}

// Automated payout: transfer the settlement total to the host's Connect account
// (platform funds it now; driver-side collection is a later phase). Idempotent
// on the settlement id so a retry can't double-pay.
async function payoutSettlement(input: { id: string; allowed: (hostBusinessId: string) => Promise<boolean> }) {
  const settlement = await storage.getRewardSettlement(input.id);
  if (!settlement) return { status: 404, body: { error: "Settlement not found" } };
  if (!(await input.allowed(settlement.hostBusinessId))) {
    return { status: 403, body: { error: "That settlement isn't in your territory." } };
  }
  if (settlement.status !== "pending") {
    return { status: 409, body: { error: `Settlement is already ${settlement.status}.` } };
  }
  if (!(await getStripe())) {
    return { status: 400, body: { error: "Payouts aren't configured (no Stripe key)." } };
  }
  const host = await storage.getBusiness(settlement.hostBusinessId);
  const acct = (host as any)?.stripeConnectAccountId as string | null;
  if (!acct || !(host as any)?.connectPayoutsEnabled) {
    return { status: 409, body: { error: "The host hasn't finished connecting a payout account." } };
  }
  try {
    const transferId = await createTransfer({
      amountCents: settlement.totalCents,
      destinationAccountId: acct,
      idempotencyKey: `reward_settlement_${settlement.id}`,
      metadata: { settlementId: settlement.id, hostBusinessId: settlement.hostBusinessId, periodMonth: settlement.periodMonth },
    });
    const updated = await storage.updateRewardSettlement(settlement.id, {
      status: "paid",
      method: "stripe_connect",
      stripeTransferId: transferId,
      reference: transferId,
    });
    return { status: 200, body: updated };
  } catch (e: any) {
    return { status: 402, body: { error: e?.message?.slice(0, 160) || "Stripe transfer failed" } };
  }
}
