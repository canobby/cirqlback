import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";

// ── Badges (recognition) — Phase 1: manual awarding ─────────────────────────
// Four award directions, each authz-gated server-side:
//   business    → a customer (user)     — catalog + custom
//   customer    → a business            — prepopulated (curated) ONLY, must have
//                                          visited the business, one of each
//   coordinator → a business in territory — catalog + custom
//   admin       → any user or business  — catalog + custom
// Uploaded art is a base64 data-URI (no blob store) with strict caps.

const IMG_MAX = 300_000; // ~220KB base64
const NAME_MAX = 60;
const NOTE_MAX = 280;
const IMG_RE = /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i;

function validImage(uri: unknown): boolean {
  return typeof uri === "string" && uri.length <= IMG_MAX && IMG_RE.test(uri);
}

// Capability check: may the caller act as the given awarder role?
async function canActAs(userId: string, as: string): Promise<{ ok: boolean; businessIds: string[]; coordinatorId: string | null; isAdmin: boolean }> {
  const [owned, coordinator, isAdmin] = await Promise.all([
    storage.getBusinessesByOwner(userId),
    storage.getCoordinatorByUserId(userId),
    storage.isPlatformAdmin(userId),
  ]);
  const businessIds = owned.map((b) => b.id);
  const coordinatorId = coordinator && coordinator.isActive !== false ? coordinator.id : null;
  const ok =
    as === "customer" ? true :
    as === "business" ? businessIds.length > 0 :
    as === "coordinator" ? !!coordinatorId :
    as === "admin" ? isAdmin : false;
  return { ok, businessIds, coordinatorId, isAdmin };
}

export function registerBadgeRoutes(app: Express, _deps: RouteDeps) {
  // Resolve awarder display names for a set of awards.
  async function enrichAwards(awards: any[]) {
    const bizIds = awards.map((a) => a.awarderBusinessId).filter(Boolean);
    const userIds = awards.map((a) => a.awarderUserId).filter(Boolean);
    const bizNames = new Map<string, string>();
    const userNames = new Map<string, string>();
    await Promise.all([
      ...Array.from(new Set(bizIds)).map(async (id) => { const b = await storage.getBusiness(id as string); if (b) bizNames.set(id as string, b.name); }),
      ...Array.from(new Set(userIds)).map(async (id) => { const u = await storage.getUser(id as string); if (u) userNames.set(id as string, (u as any).firstName || (u as any).email || "Someone"); }),
    ]);
    return awards.map((a) => ({
      ...a,
      awardedBy:
        a.awarderRole === "admin" || a.awarderRole === "system" ? "Cirqlback"
        : a.awarderBusinessId ? (bizNames.get(a.awarderBusinessId) || "A business")
        : a.awarderUserId ? (userNames.get(a.awarderUserId) || "Someone")
        : "Someone",
    }));
  }

  // Catalog the caller may grant as the given role (+ their own custom badges).
  app.get("/api/badges/catalog", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const as = String(req.query.as ?? "");
      const cap = await canActAs(userId, as);
      if (!cap.ok) return res.status(403).json({ error: `You can't award badges as ${as}` });
      const catalog = await storage.getBadgeCatalog(as);
      res.json(catalog);
    } catch (error) {
      console.error("Badge catalog error:", error);
      res.status(500).json({ error: "Failed to load badge catalog" });
    }
  });

  // Award a badge (existing definition OR an inline custom one).
  app.post("/api/badges/award", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const as = String(req.body?.as ?? "");
      let recipientUserId = req.body?.recipientUserId ? String(req.body.recipientUserId) : null;
      const recipientBusinessId = req.body?.recipientBusinessId ? String(req.body.recipientBusinessId) : null;
      const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, NOTE_MAX) : null;

      const cap = await canActAs(userId, as);
      if (!cap.ok) return res.status(403).json({ error: `You can't award badges as ${as}` });

      // A business/admin may address a customer by email.
      if (!recipientUserId && !recipientBusinessId && typeof req.body?.recipientEmail === "string") {
        const u = await storage.getUserByEmail(req.body.recipientEmail.trim().toLowerCase());
        if (!u) return res.status(404).json({ error: "No customer account with that email" });
        recipientUserId = u.id;
      }
      if (!recipientUserId && !recipientBusinessId) return res.status(400).json({ error: "A recipient is required" });
      if (recipientUserId && recipientBusinessId) return res.status(400).json({ error: "Pick one recipient" });

      // Direction rules per awarder role.
      let awarderBusinessId: string | null = null;
      if (as === "business") {
        if (!recipientUserId) return res.status(400).json({ error: "Businesses award badges to customers" });
        awarderBusinessId = String(req.body?.awarderBusinessId ?? "");
        if (!cap.businessIds.includes(awarderBusinessId)) return res.status(403).json({ error: "Not your business" });
      } else if (as === "customer") {
        if (!recipientBusinessId) return res.status(400).json({ error: "Customers award badges to businesses" });
        if (req.body?.custom) return res.status(403).json({ error: "Customers can only give preset badges" });
        // Anti-abuse: you can only badge a business you've actually visited.
        const email = (req.user as any).email ?? null;
        const active = await storage.customerActiveInBusinesses(userId, email, [recipientBusinessId]);
        if (!active) return res.status(403).json({ error: "You can only badge a business you've visited" });
      } else if (as === "coordinator") {
        if (!recipientBusinessId) return res.status(400).json({ error: "Coordinators award badges to businesses" });
        if (!(await storage.coordinatorOwnsBusiness(cap.coordinatorId!, recipientBusinessId))) {
          return res.status(403).json({ error: "That business isn't in your territory" });
        }
      } // admin: any recipient, no extra gate

      // Resolve the badge definition (custom → create it).
      let definitionId = req.body?.badgeDefinitionId ? String(req.body.badgeDefinitionId) : "";
      if (req.body?.custom) {
        const c = req.body.custom;
        const name = String(c?.name ?? "").trim().slice(0, NAME_MAX);
        if (!name) return res.status(400).json({ error: "A badge name is required" });
        if (c?.imageDataUri && !validImage(c.imageDataUri)) {
          return res.status(400).json({ error: "Image must be a PNG/JPG/WebP under ~220KB" });
        }
        const audience = recipientBusinessId ? "business" : "customer";
        const def = await storage.createCustomBadge({
          name,
          description: typeof c?.description === "string" ? c.description.slice(0, 200) : null,
          emoji: typeof c?.emoji === "string" ? c.emoji.slice(0, 8) : null,
          imageDataUri: c?.imageDataUri || null,
          color: typeof c?.color === "string" ? c.color.slice(0, 9) : null,
          audience,
          awardableBy: as,
          createdByUserId: userId,
        });
        definitionId = def.id;
      }
      if (!definitionId) return res.status(400).json({ error: "A badge is required" });

      const def = await storage.getBadgeDefinition(definitionId);
      if (!def) return res.status(404).json({ error: "Badge not found" });
      // The definition must be grantable by this role (catalog badges are gated
      // by awardableBy; custom ones we just created match by construction).
      if (!def.isCustom && def.awardableBy !== as) {
        return res.status(403).json({ error: "That badge isn't available for you to give" });
      }
      // Recipient type must match the badge audience (business badges → business).
      if (def.audience === "business" && !recipientBusinessId) return res.status(400).json({ error: "That badge is for businesses" });
      if (def.audience === "customer" && !recipientUserId) return res.status(400).json({ error: "That badge is for customers" });

      // Dedup: one of each badge per awarder → recipient.
      const dup = await storage.hasBadgeAward({
        badgeDefinitionId: definitionId, recipientUserId, recipientBusinessId,
        awarderUserId: as === "business" ? null : userId,
      });
      if (dup) return res.status(409).json({ error: "You've already given this badge" });

      const award = await storage.awardBadge({
        badgeDefinitionId: definitionId,
        recipientUserId, recipientBusinessId, note,
        awarderRole: as,
        awarderUserId: userId,
        awarderBusinessId,
      });
      res.status(201).json(award);
    } catch (error) {
      console.error("Award badge error:", error);
      res.status(500).json({ error: "Failed to award badge" });
    }
  });

  // Businesses the signed-in customer has visited (tapped) — the set they may
  // give a badge to.
  app.get("/api/badges/my-visited-businesses", isAuthenticated, async (req, res) => {
    try {
      const email = (req.user as any).email ?? null;
      if (!email) return res.json([]);
      const taps = await storage.getTaps(undefined, email);
      const ids = Array.from(new Set(taps.map((t: any) => t.businessId).filter(Boolean)));
      const out: { id: string; name: string }[] = [];
      for (const id of ids) { const b = await storage.getBusiness(id as string); if (b) out.push({ id: b.id, name: b.name }); }
      res.json(out);
    } catch (error) {
      console.error("Visited businesses error:", error);
      res.status(500).json({ error: "Failed to load businesses" });
    }
  });

  // Progress toward the next achievement badge (customer, or ?businessId= for a
  // business the caller owns).
  app.get("/api/badges/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const businessId = typeof req.query.businessId === "string" ? req.query.businessId : "";
      if (businessId) {
        const { userOwnsBusiness } = _deps;
        if (!(await userOwnsBusiness(userId, businessId))) return res.status(403).json({ error: "Not your business" });
        return res.json(await storage.getBusinessAchievementProgress(businessId));
      }
      res.json(await storage.getCustomerAchievementProgress(userId, (req.user as any).email ?? null));
    } catch (error) {
      console.error("Badge progress error:", error);
      res.status(500).json({ error: "Failed to load progress" });
    }
  });

  // The signed-in user's own badges.
  app.get("/api/badges/mine", isAuthenticated, async (req, res) => {
    try {
      const awards = await storage.getBadgeAwardsForUser((req.user as any).id);
      res.json(await enrichAwards(awards));
    } catch (error) {
      console.error("My badges error:", error);
      res.status(500).json({ error: "Failed to load badges" });
    }
  });

  // A business's badges — PUBLIC (used by the owner hub, coordinator, and the
  // hosted page / discovery as social proof).
  app.get("/api/badges/business/:businessId", async (req, res) => {
    try {
      const awards = await storage.getBadgeAwardsForBusiness(req.params.businessId);
      res.json(await enrichAwards(awards));
    } catch (error) {
      console.error("Business badges error:", error);
      res.status(500).json({ error: "Failed to load badges" });
    }
  });

  // Revoke an award — the original awarder or an admin.
  app.post("/api/badges/awards/:id/revoke", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const award = await storage.getBadgeAward(req.params.id);
      if (!award) return res.status(404).json({ error: "Award not found" });
      const isAdmin = await storage.isPlatformAdmin(userId);
      const isAwarder = award.awarderUserId === userId;
      if (!isAdmin && !isAwarder) return res.status(403).json({ error: "You can't revoke this badge" });
      await storage.revokeBadgeAward(award.id);
      res.json({ revoked: true });
    } catch (error) {
      console.error("Revoke badge error:", error);
      res.status(500).json({ error: "Failed to revoke badge" });
    }
  });
}
