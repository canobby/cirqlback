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
}
