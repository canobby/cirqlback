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
