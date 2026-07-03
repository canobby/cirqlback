import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";

// CHR-33 / CHR-56: first-class multi-store group campaigns. This ticket covers
// the model + create/read; join (CHR-58), tap progress (CHR-57) and map
// surfacing (CHR-59) build on top.
// A reward that a business actually funds (vs. platform-issued points). These
// require an explicit funding host so the cost never lands on the arbitrary
// store where the customer happens to complete the trail.
function isFundedReward(rewardType?: string | null): boolean {
  return rewardType === "discount" || rewardType === "free_item";
}

export function registerGroupCampaignRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;
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
        fundingBusinessId,
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

      // Resolve which requested stores the creator is entitled to add BEFORE
      // creating anything, so we can validate the funding host against them.
      const ids: string[] = Array.isArray(businessIds) ? businessIds : [];
      const allowedIds: string[] = [];
      for (const bid of ids) {
        const allowed =
          creatorType === "coordinator"
            ? await storage.coordinatorOwnsBusiness(coordinator!.id, bid)
            : await userOwnsBusiness(userId, bid);
        if (allowed) allowedIds.push(bid);
      }

      // A funded (business-paid) reward must name a host, and the host must be a
      // participating store. For an open self-join campaign the host defaults to
      // the creator's own included store.
      let host: string | null = null;
      if (isFundedReward(rewardType)) {
        host = fundingBusinessId || (creatorType === "business" ? allowedIds[0] : null) || null;
        if (!host) {
          return res.status(400).json({ error: "A funded reward needs a host business to fund and redeem it." });
        }
        if (!allowedIds.includes(host)) {
          return res.status(400).json({ error: "The funding host must be one of the participating stores." });
        }
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
        fundingBusinessId: host,
        createdByUserId: userId,
        creatorType,
        territoryId: scopedTerritoryId,
        isOpen: !!isOpen,
      } as any);

      for (const bid of allowedIds) {
        await storage.addGroupCampaignMember(campaign.id, bid, "joined");
      }

      const full = await storage.getGroupCampaignWithMembers(campaign.id);
      res.status(201).json({ ...full, addedMembers: allowedIds.length, skippedMembers: ids.length - allowedIds.length });
    } catch (error) {
      console.error("Create group campaign error:", error);
      res.status(500).json({ error: "Failed to create group campaign" });
    }
  });

  // CHR-69: contest & scavenger-hunt builder (add-on). A paid layer over the
  // group-campaign model — gated by the scavenger_builder entitlement on the
  // host business. Produces a normal group campaign that runs on the existing
  // tap/progress loop (CHR-57).
  app.post("/api/scavenger-hunts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { businessId, name, description, storeIds, requiredStores, rewardTitle, rewardType, rewardValue, rewardPoints } =
        req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });
      if (!businessId) return res.status(400).json({ error: "businessId (host) is required" });

      if (!(await userOwnsBusiness(userId, businessId))) {
        return res.status(403).json({ error: "Not your business" });
      }
      if (!(await storage.businessHasAddonEffective(businessId, "scavenger_builder"))) {
        return res.status(402).json({ error: "Contest & Scavenger Hunt Builder add-on required", addonKey: "scavenger_builder" });
      }

      // Members = the host + any of the merchant's own stores selected.
      const ids: string[] = Array.from(new Set([businessId, ...(Array.isArray(storeIds) ? storeIds : [])]));

      const resolvedType = rewardType || "points";
      const campaign = await storage.createGroupCampaign({
        name,
        description,
        ruleType: "any_n",
        requiredStores: Number(requiredStores) > 0 ? Number(requiredStores) : Math.max(1, ids.length),
        rewardType: resolvedType,
        rewardTitle,
        rewardValue: rewardValue != null ? String(rewardValue) : null,
        rewardPoints: Number(rewardPoints) || 0,
        // A merchant's hunt spans their OWN stores, so the host is always their
        // business — it funds/redeems any tangible prize (self-funded = fair).
        fundingBusinessId: isFundedReward(resolvedType) ? businessId : null,
        createdByUserId: userId,
        creatorType: "business",
        isOpen: false,
      } as any);

      let added = 0;
      for (const bid of ids) {
        if (await userOwnsBusiness(userId, bid)) {
          await storage.addGroupCampaignMember(campaign.id, bid, "joined");
          added++;
        }
      }

      const full = await storage.getGroupCampaignWithMembers(campaign.id);
      res.status(201).json({ ...full, addedMembers: added });
    } catch (error) {
      console.error("Create scavenger hunt error:", error);
      res.status(500).json({ error: "Failed to create scavenger hunt" });
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
      if (!(await userOwnsBusiness((req.user as any).id, req.params.businessId))) {
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
      if (!(await userOwnsBusiness((req.user as any).id, businessId))) {
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
      if (!(await userOwnsBusiness((req.user as any).id, businessId))) {
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

  // ── Initiation / acceptance handshake ────────────────────────────────────
  // The campaign "manager" (who may invite / approve) is its creator. Coordinator
  // campaigns have createdByUserId = the coordinator's user, so this covers them.
  const isManager = (campaign: any, userId: string) => campaign.createdByUserId === userId;

  // Manager invites a specific business to join. It becomes a pending invite the
  // business owner accepts/declines.
  app.post("/api/group-campaigns/:id/invite", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const businessId = String(req.body?.businessId ?? "");
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      const campaign = await storage.getGroupCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "Group campaign not found" });
      if (!isManager(campaign, userId)) return res.status(403).json({ error: "Only the campaign creator can invite" });
      const target = await storage.getBusiness(businessId);
      if (!target) return res.status(404).json({ error: "Business not found" });
      if (!target.ownerId) return res.status(400).json({ error: "That business has no owner to accept an invite" });
      const existing = await storage.getGroupCampaignMember(campaign.id, businessId);
      if (existing?.status === "joined") return res.status(409).json({ error: "That business already joined" });
      const member = await storage.setGroupCampaignMemberStatus(campaign.id, businessId, "invited");
      res.status(201).json(member);
    } catch (error) {
      console.error("Invite to campaign error:", error);
      res.status(500).json({ error: "Failed to send invite" });
    }
  });

  // The invited business owner accepts or declines. Accepting a FUNDED campaign
  // requires explicit cost-share consent (they may owe the host a share).
  app.post("/api/group-campaigns/:id/respond", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const businessId = String(req.body?.businessId ?? "");
      const accept = req.body?.accept === true;
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      if (!(await userOwnsBusiness(userId, businessId))) return res.status(403).json({ error: "Not your business" });
      const campaign = await storage.getGroupCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "Group campaign not found" });
      const member = await storage.getGroupCampaignMember(campaign.id, businessId);
      if (!member || member.status !== "invited") return res.status(404).json({ error: "No pending invite" });

      if (!accept) {
        await storage.removeGroupCampaignMember(campaign.id, businessId);
        return res.json({ declined: true });
      }
      // Funded campaign → joining means agreeing to owe a tap-weighted share.
      if (isFundedReward(campaign.rewardType) && campaign.fundingBusinessId && businessId !== campaign.fundingBusinessId) {
        if (req.body?.consent !== true) {
          return res.status(400).json({ error: "Cost-share consent is required to join a funded campaign", needsConsent: true });
        }
      }
      const updated = await storage.setGroupCampaignMemberStatus(campaign.id, businessId, "joined");
      res.json(updated);
    } catch (error) {
      console.error("Respond to invite error:", error);
      res.status(500).json({ error: "Failed to respond" });
    }
  });

  // A business owner asks to join a campaign (any active campaign). The manager
  // approves/denies.
  app.post("/api/group-campaigns/:id/request", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const businessId = String(req.body?.businessId ?? "");
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      if (!(await userOwnsBusiness(userId, businessId))) return res.status(403).json({ error: "Not your business" });
      const campaign = await storage.getGroupCampaign(req.params.id);
      if (!campaign || !campaign.isActive) return res.status(404).json({ error: "Group campaign not found" });
      const existing = await storage.getGroupCampaignMember(campaign.id, businessId);
      if (existing?.status === "joined") return res.status(409).json({ error: "Already a member" });
      const member = await storage.setGroupCampaignMemberStatus(campaign.id, businessId, "requested");
      res.status(201).json(member);
    } catch (error) {
      console.error("Request to join error:", error);
      res.status(500).json({ error: "Failed to request to join" });
    }
  });

  // Manager approves or denies a join-request.
  app.post("/api/group-campaigns/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const businessId = String(req.body?.businessId ?? "");
      const approve = req.body?.approve === true;
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      const campaign = await storage.getGroupCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: "Group campaign not found" });
      if (!isManager(campaign, userId)) return res.status(403).json({ error: "Only the campaign creator can approve" });
      const member = await storage.getGroupCampaignMember(campaign.id, businessId);
      if (!member || member.status !== "requested") return res.status(404).json({ error: "No pending request" });
      if (!approve) {
        await storage.removeGroupCampaignMember(campaign.id, businessId);
        return res.json({ denied: true });
      }
      const updated = await storage.setGroupCampaignMemberStatus(campaign.id, businessId, "joined");
      res.json(updated);
    } catch (error) {
      console.error("Approve request error:", error);
      res.status(500).json({ error: "Failed to update request" });
    }
  });

  // The signed-in user's handshake inbox: invites addressed to their businesses +
  // join-requests awaiting their approval (for campaigns they created).
  app.get("/api/my/campaign-inbox", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const [owned, created] = await Promise.all([
        storage.getBusinessesByOwner(userId),
        storage.getGroupCampaignsByCreator(userId),
      ]);
      const bizNames = new Map(owned.map((b) => [b.id, b.name] as const));
      const invitesRaw = await storage.getPendingInvitesForBusinesses(owned.map((b) => b.id));
      const requests = await storage.getPendingRequestsForCampaigns(created.map((c) => c.id));

      // Resolve host names for funded invites.
      const invites = await Promise.all(invitesRaw.map(async (inv: any) => {
        const funded = inv.rewardType === "discount" || inv.rewardType === "free_item";
        const host = funded && inv.fundingBusinessId ? await storage.getBusiness(inv.fundingBusinessId) : null;
        return {
          ...inv,
          myBusinessName: bizNames.get(inv.businessId) || "Your business",
          funded,
          hostName: host?.name ?? null,
          isHost: inv.fundingBusinessId === inv.businessId,
        };
      }));
      const myCampaigns = created.map((c) => ({
        id: c.id,
        name: c.name,
        funded: c.rewardType === "discount" || c.rewardType === "free_item",
      }));
      res.json({ invites, requests, myCampaigns });
    } catch (error) {
      console.error("Campaign inbox error:", error);
      res.status(500).json({ error: "Failed to load campaign inbox" });
    }
  });

  // Active campaigns this business could request to join.
  app.get("/api/group-campaigns/joinable", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const businessId = typeof req.query.businessId === "string" ? req.query.businessId : "";
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      if (!(await userOwnsBusiness(userId, businessId))) return res.status(403).json({ error: "Not your business" });
      const rows = await storage.getJoinableCampaignsForBusiness(businessId, userId);
      res.json(rows.map((c) => ({ id: c.id, name: c.name, ruleType: c.ruleType, requiredStores: c.requiredStores, rewardTitle: c.rewardTitle, isOpen: c.isOpen })));
    } catch (error) {
      console.error("Joinable campaigns error:", error);
      res.status(500).json({ error: "Failed to load joinable campaigns" });
    }
  });

  // Search claimed businesses by name (invite targets).
  app.get("/api/group-campaigns/business-search", isAuthenticated, async (req, res) => {
    try {
      const q = (typeof req.query.q === "string" ? req.query.q : "").trim();
      if (q.length < 2) return res.json([]);
      res.json(await storage.searchClaimedBusinesses(q));
    } catch (error) {
      console.error("Business search error:", error);
      res.status(500).json({ error: "Failed to search" });
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
