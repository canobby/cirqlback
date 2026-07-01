import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";

// CHR-33 / CHR-56: first-class multi-store group campaigns. This ticket covers
// the model + create/read; join (CHR-58), tap progress (CHR-57) and map
// surfacing (CHR-59) build on top.
export function registerGroupCampaignRoutes(app: Express, _deps: RouteDeps) {
  // Create a group campaign. The creator (business owner or coordinator) may
  // seed member stores they are entitled to add; others are silently skipped.
  app.post("/api/group-campaigns", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const {
        name,
        description,
        ruleType,
        requiredStores,
        rewardType,
        rewardTitle,
        rewardValue,
        rewardPoints,
        isOpen,
        territoryId,
        businessIds,
      } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });

      const coordinator = await storage.getCoordinatorByUserId(userId);
      const creatorType = coordinator ? "coordinator" : "business";

      let scopedTerritoryId: string | null = null;
      if (creatorType === "coordinator" && territoryId) {
        if (!(await storage.coordinatorOwnsTerritory(coordinator!.id, territoryId))) {
          return res.status(403).json({ error: "That territory is not yours" });
        }
        scopedTerritoryId = territoryId;
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
        createdByUserId: userId,
        creatorType,
        territoryId: scopedTerritoryId,
        isOpen: !!isOpen,
      } as any);

      const ids: string[] = Array.isArray(businessIds) ? businessIds : [];
      let added = 0;
      for (const bid of ids) {
        let allowed = false;
        if (creatorType === "coordinator") {
          allowed = await storage.coordinatorOwnsBusiness(coordinator!.id, bid);
        } else {
          const biz = await storage.getBusiness(bid);
          allowed = !!biz && biz.ownerId === userId;
        }
        if (allowed) {
          await storage.addGroupCampaignMember(campaign.id, bid, "joined");
          added++;
        }
      }

      const full = await storage.getGroupCampaignWithMembers(campaign.id);
      res.status(201).json({ ...full, addedMembers: added, skippedMembers: ids.length - added });
    } catch (error) {
      console.error("Create group campaign error:", error);
      res.status(500).json({ error: "Failed to create group campaign" });
    }
  });

  // CHR-58: the current merchant's own businesses (for the group-campaign UI).
  app.get("/api/my/businesses", isAuthenticated, async (req, res) => {
    try {
      res.json(await storage.getBusinessesByOwner((req.user as any).id));
    } catch (error) {
      console.error("My businesses error:", error);
      res.status(500).json({ error: "Failed to load businesses" });
    }
  });

  // CHR-58: open/joinable group campaigns (public discovery list).
  app.get("/api/group-campaigns/open", async (_req, res) => {
    try {
      res.json(await storage.getOpenGroupCampaigns());
    } catch (error) {
      console.error("Open group campaigns error:", error);
      res.status(500).json({ error: "Failed to load open campaigns" });
    }
  });

  // CHR-58: the group campaigns a business belongs to (owner-authorized).
  app.get("/api/group-campaigns/joined/:businessId", isAuthenticated, async (req, res) => {
    try {
      const biz = await storage.getBusiness(req.params.businessId);
      if (!biz || biz.ownerId !== (req.user as any).id) {
        return res.status(403).json({ error: "Not your business" });
      }
      res.json(await storage.getGroupCampaignsForBusiness(req.params.businessId));
    } catch (error) {
      console.error("Joined group campaigns error:", error);
      res.status(500).json({ error: "Failed to load joined campaigns" });
    }
  });

  // CHR-58: a business joins an OPEN group campaign (owner-authorized).
  app.post("/api/group-campaigns/:id/join", isAuthenticated, async (req, res) => {
    try {
      const { businessId } = req.body || {};
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      const biz = await storage.getBusiness(businessId);
      if (!biz || biz.ownerId !== (req.user as any).id) {
        return res.status(403).json({ error: "Not your business" });
      }
      const campaign = await storage.getGroupCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "Group campaign not found" });
      if (!campaign.isOpen) return res.status(403).json({ error: "This campaign is not open to join" });
      const member = await storage.addGroupCampaignMember(req.params.id, businessId, "joined");
      res.status(201).json(member);
    } catch (error) {
      console.error("Join group campaign error:", error);
      res.status(500).json({ error: "Failed to join campaign" });
    }
  });

  // CHR-58: a business leaves a group campaign (owner-authorized).
  app.post("/api/group-campaigns/:id/leave", isAuthenticated, async (req, res) => {
    try {
      const { businessId } = req.body || {};
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      const biz = await storage.getBusiness(businessId);
      if (!biz || biz.ownerId !== (req.user as any).id) {
        return res.status(403).json({ error: "Not your business" });
      }
      const removed = await storage.removeGroupCampaignMember(req.params.id, businessId);
      res.json({ removed });
    } catch (error) {
      console.error("Leave group campaign error:", error);
      res.status(500).json({ error: "Failed to leave campaign" });
    }
  });

  // CHR-59: active group campaigns + member stores (for the discovery map).
  app.get("/api/group-campaigns/active", async (_req, res) => {
    try {
      res.json(await storage.getActiveGroupCampaignsWithMembers());
    } catch (error) {
      console.error("Active group campaigns error:", error);
      res.status(500).json({ error: "Failed to load active campaigns" });
    }
  });

  // CHR-59: a customer's cross-store progress toward a campaign (no account
  // needed — identified by ?email and/or ?deviceFingerprint).
  app.get("/api/group-campaigns/:id/progress", async (req, res) => {
    try {
      const email = ((req.query.email as string) || "").toLowerCase().trim() || undefined;
      const deviceFingerprint = (req.query.deviceFingerprint as string) || undefined;
      const progress = await storage.getCustomerGroupProgress(req.params.id, email, deviceFingerprint);
      if (!progress) return res.status(404).json({ error: "Group campaign not found" });
      res.json(progress);
    } catch (error) {
      console.error("Group campaign progress error:", error);
      res.status(500).json({ error: "Failed to load progress" });
    }
  });

  // Public read: the campaign + its member stores (name + coordinates).
  app.get("/api/group-campaigns/:id", async (req, res) => {
    try {
      const full = await storage.getGroupCampaignWithMembers(req.params.id);
      if (!full) return res.status(404).json({ error: "Group campaign not found" });
      res.json(full);
    } catch (error) {
      console.error("Get group campaign error:", error);
      res.status(500).json({ error: "Failed to load group campaign" });
    }
  });
}
