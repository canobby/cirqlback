import type { Express } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import type { RouteDeps } from "./_shared";

// CHR-53: basic store templates a coordinator can prefill a new business from.
const STORE_TEMPLATES: Record<string, { label: string; defaults: Record<string, unknown> }> = {
  cafe: {
    label: "Café / Coffee Shop",
    defaults: { priceRange: "moderate", establishmentType: ["cafe"], loyaltyProgramInterest: "high" },
  },
  restaurant: {
    label: "Restaurant",
    defaults: { priceRange: "moderate", establishmentType: ["restaurant"] },
  },
  retail: {
    label: "Retail / Boutique",
    defaults: { priceRange: "moderate", establishmentType: ["retail"] },
  },
};

// CHR-55: preloaded campaign templates a coordinator can 1-click assign to stores.
const CAMPAIGN_TEMPLATES: Record<
  string,
  { label: string; campaign: { name: string; type: string; description: string; pointsAwarded: number; value: string } }
> = {
  summer_loyalty: {
    label: "Summer Loyalty Boost",
    campaign: { name: "Summer Loyalty Boost", type: "loyalty", description: "Earn bonus points all summer.", pointsAwarded: 50, value: "0.00" },
  },
  scavenger_hunt: {
    label: "Neighborhood Scavenger Hunt",
    campaign: { name: "Neighborhood Scavenger Hunt", type: "trail", description: "Tap across local shops to win a prize.", pointsAwarded: 100, value: "0.00" },
  },
  holiday_bonus: {
    label: "Holiday Bonus Reward",
    campaign: { name: "Holiday Bonus Reward", type: "discount", description: "Seasonal discount for tapping in.", pointsAwarded: 25, value: "15.00" },
  },
};

// CHR-51/52/53: Community Coordinator API. Every route here is gated by
// `isCoordinator` in the composition root, so req.coordinator is always set.
export function registerCoordinatorRoutes(app: Express, _deps: RouteDeps) {
  const coordinatorOf = (req: any) => req.coordinator;

  // The signed-in coordinator's profile + the territories they manage.
  app.get("/api/coordinator/me", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const territories = await storage.getTerritoriesByCoordinator(coordinator.id);
      res.json({ coordinator, territories });
    } catch (error) {
      console.error("Coordinator profile error:", error);
      res.status(500).json({ error: "Failed to load coordinator profile" });
    }
  });

  // CHR-52: real territory overview — totals + per-store engagement.
  app.get("/api/coordinator/territory/overview", async (req, res) => {
    try {
      const overview = await storage.getTerritoryOverview(coordinatorOf(req).id);
      res.json(overview);
    } catch (error) {
      console.error("Territory overview error:", error);
      res.status(500).json({ error: "Failed to load territory overview" });
    }
  });

  // CHR-53: the store templates available for onboarding.
  app.get("/api/coordinator/store-templates", (_req, res) => {
    res.json(
      Object.entries(STORE_TEMPLATES).map(([key, t]) => ({ key, label: t.label }))
    );
  });

  // CHR-53: businesses across the coordinator's territories (for management).
  app.get("/api/coordinator/businesses", async (req, res) => {
    try {
      const businesses = await storage.getBusinessesForCoordinator(coordinatorOf(req).id);
      res.json(businesses);
    } catch (error) {
      console.error("Coordinator businesses error:", error);
      res.status(500).json({ error: "Failed to load businesses" });
    }
  });

  // CHR-53: onboard a business into one of the coordinator's OWN territories,
  // optionally prefilled from a template and linked to an existing owner.
  app.post("/api/coordinator/businesses", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const { name, territoryId, address, phone, email, ownerEmail, templateKey, latitude, longitude } =
        req.body || {};
      if (!name || !territoryId) {
        return res.status(400).json({ error: "name and territoryId are required" });
      }
      if (!(await storage.coordinatorOwnsTerritory(coordinator.id, territoryId))) {
        return res.status(403).json({ error: "That territory is not yours" });
      }
      const templateDefaults =
        templateKey && STORE_TEMPLATES[templateKey] ? STORE_TEMPLATES[templateKey].defaults : {};

      let ownerId: string | undefined;
      if (ownerEmail) {
        const owner = await storage.getUserByEmail(String(ownerEmail).toLowerCase().trim());
        if (owner) ownerId = owner.id;
      }

      const business = await storage.createBusiness({
        name,
        territoryId,
        address,
        phone,
        email,
        ownerId,
        latitude,
        longitude,
        verificationStatus: "unverified",
        ...templateDefaults,
      } as any);
      res.status(201).json(business);
    } catch (error) {
      console.error("Coordinator onboard business error:", error);
      res.status(500).json({ error: "Failed to onboard business" });
    }
  });

  // CHR-53: approve/verify (or reject) a business in the coordinator's territory.
  app.patch("/api/coordinator/businesses/:id/verify", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const { id } = req.params;
      const status = req.body?.status;
      if (!["verified", "rejected", "unverified"].includes(status)) {
        return res.status(400).json({ error: "status must be verified | rejected | unverified" });
      }
      if (!(await storage.coordinatorOwnsBusiness(coordinator.id, id))) {
        return res.status(403).json({ error: "That business is not in your territory" });
      }
      const business = await storage.updateBusiness(id, { verificationStatus: status });
      res.json(business);
    } catch (error) {
      console.error("Coordinator verify business error:", error);
      res.status(500).json({ error: "Failed to update verification" });
    }
  });

  // CHR-53: the NFC tags for a business in the coordinator's territory.
  app.get("/api/coordinator/businesses/:id/tags", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const { id } = req.params;
      if (!(await storage.coordinatorOwnsBusiness(coordinator.id, id))) {
        return res.status(403).json({ error: "That business is not in your territory" });
      }
      res.json(await storage.getNFCTags(id));
    } catch (error) {
      console.error("Coordinator list tags error:", error);
      res.status(500).json({ error: "Failed to load tags" });
    }
  });

  // CHR-53: reset/reassign an NFC tag (staff rotation / event reset). Rotates the
  // printed identifier and clears counters; can also reassign the campaign.
  app.post("/api/coordinator/businesses/:id/tags/:tagId/reset", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const { id, tagId } = req.params;
      if (!(await storage.coordinatorOwnsBusiness(coordinator.id, id))) {
        return res.status(403).json({ error: "That business is not in your territory" });
      }
      const tag = await storage.getNFCTag(tagId);
      if (!tag || tag.businessId !== id) {
        return res.status(404).json({ error: "Tag not found for this business" });
      }
      const updates: Record<string, unknown> = { totalTaps: 0, lastTapAt: null };
      if (req.body?.regenerateIdentifier !== false) {
        updates.tagIdentifier = `cq_${crypto.randomBytes(6).toString("hex")}`;
      }
      if (typeof req.body?.campaignId === "string") updates.campaignId = req.body.campaignId;
      if (req.body?.campaignId === null) updates.campaignId = null;

      const updated = await storage.updateNFCTag(tagId, updates as any);
      res.json(updated);
    } catch (error) {
      console.error("Coordinator reset tag error:", error);
      res.status(500).json({ error: "Failed to reset tag" });
    }
  });

  // ── CHR-55: templates library + regional admin tools ──────────────────────

  app.get("/api/coordinator/campaign-templates", (_req, res) => {
    res.json(
      Object.entries(CAMPAIGN_TEMPLATES).map(([key, t]) => ({
        key,
        label: t.label,
        type: t.campaign.type,
        pointsAwarded: t.campaign.pointsAwarded,
      }))
    );
  });

  // 1-click assign a template as a live campaign to one or more of the
  // coordinator's own stores.
  app.post("/api/coordinator/campaign-templates/:key/apply", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const tmpl = CAMPAIGN_TEMPLATES[req.params.key];
      if (!tmpl) return res.status(404).json({ error: "Unknown template" });

      const businessIds: string[] = Array.isArray(req.body?.businessIds) ? req.body.businessIds : [];
      if (businessIds.length === 0) {
        return res.status(400).json({ error: "businessIds is required" });
      }
      for (const bid of businessIds) {
        if (!(await storage.coordinatorOwnsBusiness(coordinator.id, bid))) {
          return res.status(403).json({ error: `Business ${bid} is not in your territory` });
        }
      }

      const campaignIds: string[] = [];
      for (const bid of businessIds) {
        const c = await storage.createCampaign({
          businessId: bid,
          name: tmpl.campaign.name,
          type: tmpl.campaign.type,
          description: tmpl.campaign.description,
          pointsAwarded: tmpl.campaign.pointsAwarded,
          value: tmpl.campaign.value,
          isActive: true,
        } as any);
        campaignIds.push(c.id);
      }
      res.status(201).json({ applied: campaignIds.length, campaignIds });
    } catch (error) {
      console.error("Coordinator apply template error:", error);
      res.status(500).json({ error: "Failed to apply template" });
    }
  });

  // Regional settings (welcome default) on one of the coordinator's territories.
  app.patch("/api/coordinator/territories/:id", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const { id } = req.params;
      if (!(await storage.coordinatorOwnsTerritory(coordinator.id, id))) {
        return res.status(403).json({ error: "That territory is not yours" });
      }
      const updates: Record<string, unknown> = {};
      if (typeof req.body?.welcomeMessage === "string") updates.welcomeMessage = req.body.welcomeMessage;
      if (typeof req.body?.name === "string") updates.name = req.body.name;
      const territory = await storage.updateTerritory(id, updates as any);
      res.json(territory);
    } catch (error) {
      console.error("Coordinator update territory error:", error);
      res.status(500).json({ error: "Failed to update territory" });
    }
  });

  app.get("/api/coordinator/offers", async (req, res) => {
    try {
      res.json(await storage.getRegionalOffersByCoordinator(coordinatorOf(req).id));
    } catch (error) {
      console.error("Coordinator offers error:", error);
      res.status(500).json({ error: "Failed to load offers" });
    }
  });

  // Create a regional discount/trial code, optionally scoped to one of the
  // coordinator's territories.
  app.post("/api/coordinator/offers", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const { code, description, offerType, value, territoryId, expiresAt } = req.body || {};
      if (!code) return res.status(400).json({ error: "code is required" });
      if (!["percent", "fixed", "trial"].includes(offerType)) {
        return res.status(400).json({ error: "offerType must be percent | fixed | trial" });
      }
      if (territoryId && !(await storage.coordinatorOwnsTerritory(coordinator.id, territoryId))) {
        return res.status(403).json({ error: "That territory is not yours" });
      }
      const offer = await storage.createRegionalOffer({
        coordinatorId: coordinator.id,
        territoryId: territoryId || null,
        code: String(code).toUpperCase().trim(),
        description,
        offerType,
        value: value != null ? String(value) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      } as any);
      res.status(201).json(offer);
    } catch (error) {
      if ((error as any)?.code === "23505") {
        return res.status(409).json({ error: "That code already exists" });
      }
      console.error("Coordinator create offer error:", error);
      res.status(500).json({ error: "Failed to create offer" });
    }
  });

  // ── CHR-54: region-scoped multi-store campaign builder + map placement ─────
  // Reuses the CHR-33/56 group-campaign model (creatorType='coordinator').

  // The coordinator's own multi-store campaigns + per-location performance.
  app.get("/api/coordinator/group-campaigns", async (req, res) => {
    try {
      res.json(await storage.getCoordinatorGroupCampaigns(coordinatorOf(req).userId));
    } catch (error) {
      console.error("Coordinator group campaigns error:", error);
      res.status(500).json({ error: "Failed to load campaigns" });
    }
  });

  // Create a multi-store campaign spanning the coordinator's OWN stores. Member
  // stores outside the coordinator's territories are silently skipped.
  app.post("/api/coordinator/group-campaigns", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const {
        name, description, ruleType, requiredStores, rewardType,
        rewardTitle, rewardValue, rewardPoints, territoryId, businessIds, isOpen,
      } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });

      let scopedTerritoryId: string | null = null;
      if (territoryId) {
        if (!(await storage.coordinatorOwnsTerritory(coordinator.id, territoryId))) {
          return res.status(403).json({ error: "That territory is not yours" });
        }
        scopedTerritoryId = territoryId;
      }

      const ids: string[] = Array.isArray(businessIds) ? businessIds : [];
      const ownedIds: string[] = [];
      for (const bid of ids) {
        if (await storage.coordinatorOwnsBusiness(coordinator.id, bid)) ownedIds.push(bid);
      }

      const campaign = await storage.createGroupCampaign({
        name,
        description,
        ruleType: ruleType === "all" ? "all" : "any_n",
        requiredStores: Number(requiredStores) > 0 ? Number(requiredStores) : 1,
        rewardType,
        rewardTitle,
        rewardValue: rewardValue != null ? String(rewardValue) : null,
        rewardPoints: Number(rewardPoints) || 0,
        createdByUserId: coordinator.userId,
        creatorType: "coordinator",
        territoryId: scopedTerritoryId,
        isOpen: !!isOpen,
      } as any);

      for (const bid of ownedIds) {
        await storage.addGroupCampaignMember(campaign.id, bid, "joined");
      }

      const full = await storage.getGroupCampaignWithMembers(campaign.id);
      res.status(201).json({ ...full, addedMembers: ownedIds.length, skippedMembers: ids.length - ownedIds.length });
    } catch (error) {
      console.error("Coordinator create group campaign error:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  // Promote/demote one of the coordinator's OWN campaigns on the discovery map.
  app.patch("/api/coordinator/group-campaigns/:id/feature", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const campaign = await storage.getGroupCampaign(req.params.id);
      if (
        !campaign ||
        campaign.creatorType !== "coordinator" ||
        campaign.createdByUserId !== coordinator.userId
      ) {
        return res.status(403).json({ error: "That campaign is not yours" });
      }
      const featured = req.body?.featured !== false;
      const updated = await storage.updateGroupCampaign(req.params.id, { isFeatured: featured });
      res.json(updated);
    } catch (error) {
      console.error("Coordinator feature campaign error:", error);
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  // Feature/unfeature a business on the discovery map (territory-scoped).
  app.patch("/api/coordinator/businesses/:id/feature", async (req, res) => {
    try {
      const coordinator = coordinatorOf(req);
      const { id } = req.params;
      if (!(await storage.coordinatorOwnsBusiness(coordinator.id, id))) {
        return res.status(403).json({ error: "That business is not in your territory" });
      }
      const featured = req.body?.featured !== false;
      const business = await storage.updateBusiness(id, { isFeatured: featured } as any);
      res.json(business);
    } catch (error) {
      console.error("Coordinator feature business error:", error);
      res.status(500).json({ error: "Failed to update business" });
    }
  });

  // ── CHR-32 / CHR-62: coordinator earnings (revenue share) ─────────────────

  // Income + share summary (lifetime / current-month / trailing-12, by source,
  // 12-month series, recent charges).
  app.get("/api/coordinator/earnings/summary", async (req, res) => {
    try {
      res.json(await storage.getCoordinatorEarningsSummary(coordinatorOf(req).id));
    } catch (error) {
      console.error("Coordinator earnings summary error:", error);
      res.status(500).json({ error: "Failed to load earnings summary" });
    }
  });

  // Itemized earnings, optionally scoped to one ?month=YYYY-MM.
  app.get("/api/coordinator/earnings", async (req, res) => {
    try {
      const month = typeof req.query.month === "string" ? req.query.month : undefined;
      res.json(await storage.getCoordinatorEarnings(coordinatorOf(req).id, { month }));
    } catch (error) {
      console.error("Coordinator earnings error:", error);
      res.status(500).json({ error: "Failed to load earnings" });
    }
  });
}
