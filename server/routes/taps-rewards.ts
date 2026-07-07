import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { adminUsers, adminCommunications, adminTrainingProgress, adminTrainingModules, adminKnowledgeItems } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { insertBusinessSchema, insertCampaignSchema, insertNfcTagSchema, insertTapSchema, insertRewardSchema, insertTapTrailSchema, insertReferralSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema, insertApiUsageSchema, insertSalesDataSchema, insertMonthlySalesSummarySchema, insertBusinessGoalsSchema, salesData, monthlySalesSummary, businessGoals } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import { openaiService } from "../openai-service";
import { isAuthenticated, isAdminAuthenticated } from "../auth";
import { PLAN_PRICING, resolvePlanAmountCents, type BillingInterval } from "../pricing";
import type { RouteDeps } from "./_shared";

export function registerTapsRewardsRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

  // CHR-74: public reward lookup by code — the customer-facing view. Returns a
  // safe status (valid | redeemed | expired) with the business + expiry. The
  // actual redeem stays business-gated (CHR-16); the customer just shows this.
  app.get("/api/rewards/lookup", async (req, res) => {
    try {
      const code = typeof req.query.code === "string" ? req.query.code.trim() : "";
      if (!code) return res.status(400).json({ error: "code is required" });
      const reward = await storage.getRewardByCode(code);
      if (!reward) return res.status(404).json({ error: "Reward not found" });
      const business = await storage.getBusiness(reward.businessId);
      const expired = reward.expiresAt ? new Date(reward.expiresAt).getTime() < Date.now() : false;
      const status = reward.isRedeemed ? "redeemed" : expired ? "expired" : "valid";
      res.json({
        code: reward.code,
        title: reward.title,
        description: reward.description,
        value: reward.value,
        businessName: business?.name ?? null,
        status,
        expiresAt: reward.expiresAt,
        redeemedAt: reward.redeemedAt ?? null,
      });
    } catch (error) {
      console.error("Reward lookup error:", error);
      res.status(500).json({ error: "Failed to look up reward" });
    }
  });

  // Public tag-info lookup that powers the tap landing page. A physical Cirql
  // tag stores the URL /tap/<id>; when any modern phone (iPhone or Android)
  // taps it the OS opens that URL, so this endpoint must resolve the id — by
  // internal tag id (the form the writer mints) or by the printed identifier —
  // and return the business + campaign the page renders BEFORE the customer
  // taps. Without this the page fell back to hardcoded demo data on every scan.
  app.get("/api/tap/:id", async (req, res) => {
    try {
      const raw = String(req.params.id || "").trim();
      if (!raw) return res.status(400).json({ error: "Tag id is required" });

      const tag =
        (await storage.getNFCTag(raw)) || (await storage.getNFCTagByIdentifier(raw));
      if (!tag) return res.status(404).json({ error: "Unknown or unregistered Cirql tag" });
      if (tag.isActive === false) {
        return res.status(410).json({ error: "This Cirql tag is not active" });
      }

      const business = await storage.getBusiness(tag.businessId);
      const campaign = tag.campaignId ? await storage.getCampaign(tag.campaignId) : undefined;

      res.json({
        tag: {
          id: tag.id,
          tagIdentifier: tag.tagIdentifier,
          location: tag.location,
          businessId: tag.businessId,
          campaignId: tag.campaignId,
        },
        business: business
          ? { id: business.id, name: business.name, description: business.description, logo: business.logo }
          : null,
        campaign: campaign
          ? {
              id: campaign.id,
              name: campaign.name,
              description: campaign.description,
              type: campaign.type,
              value: campaign.value,
              pointsAwarded: campaign.pointsAwarded,
              tapGoal: campaign.tapGoal,
              isActive: campaign.isActive,
            }
          : null,
      });
    } catch (error) {
      console.error("Tag info lookup error:", error);
      res.status(500).json({ error: "Failed to load tag information" });
    }
  });

  app.post("/api/taps", async (req, res) => {
    try {
      // Validate basic required fields
      const { tagId, customerEmail, businessId } = req.body;
      if (!tagId || !customerEmail || !businessId) {
        return res.status(400).json({ error: "Missing required fields: tagId, customerEmail, businessId" });
      }
      
      // Real tap processing (records the tap, awards points/reward, enforces
      // the anti-abuse cooldown, per-device throttle, and optional GPS gate).
      const validatedData = insertTapSchema.parse(req.body);
      const { latitude, longitude } = req.body;
      const result = await storage.processTap(validatedData, {
        latitude: typeof latitude === "number" ? latitude : undefined,
        longitude: typeof longitude === "number" ? longitude : undefined,
      });

      if (!result.success) {
        const status =
          result.reason === "too_far" || result.reason === "location_required"
            ? 403
            : result.reason === "device_throttled" || result.reason === "cooldown"
            ? 429
            : 409;
        return res.status(status).json({ error: result.message, reason: result.reason });
      }

      const broadcastToClients = (global as any).broadcastToClients;
      if (broadcastToClients) {
        broadcastToClients({ type: 'new_tap', data: result });
      }
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to process tap. Please try again." });
    }
  });

  app.get("/api/taps", async (req, res) => {
    try {
      const businessId = req.query.businessId as string;
      const customerEmail = req.query.customerEmail as string;
      const taps = await storage.getTaps(businessId, customerEmail);
      res.json(taps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch taps" });
    }
  });

  // CIRQL landmarks (CHR-261): the businesses you've tapped in the real world, surfaced
  // so they can be planted as signpost landmarks on your Hearth (loyalty ↔ world).
  app.get("/api/cirql/landmarks", isAuthenticated, async (req, res) => {
    try {
      const u = req.user as any;
      let email = u?.email;
      if (!email && u?.id) email = (await storage.getUser(u.id))?.email;
      if (!email) return res.json({ landmarks: [] });
      const biz = await storage.getCustomerVisitedBusinesses(email, 24);
      res.json({ landmarks: biz.map((b) => ({ name: b.name, type: (b.establishmentType?.[0] || "").toLowerCase() })) });
    } catch (err) { console.error("cirql landmarks error:", err); res.status(500).json({ error: "Failed to load landmarks" }); }
  });

  // Customer reward routes
  app.get("/api/rewards", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }
      const rewards = await storage.getRewardsByEmail(email);
      res.json(rewards);
    } catch (error) {
      console.error("Rewards error:", error);
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  app.patch("/api/rewards/:id/redeem", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getReward(id);
      if (!existing) {
        return res.status(404).json({ error: "Reward not found" });
      }
      // A reward can only be redeemed by the user it belongs to.
      if (existing.userId !== (req.user as any).id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const reward = await storage.redeemReward(id);
      res.json(reward);
    } catch (error) {
      res.status(500).json({ error: "Failed to redeem reward" });
    }
  });

  // Tap Trail routes
  app.get("/api/tap-trails", async (_req, res) => {
    try {
      const trails = await storage.getTapTrails();
      res.json(trails);
    } catch (error) {
      console.error("Tap trails error:", error);
      res.status(500).json({ error: "Failed to fetch tap trails" });
    }
  });

  app.post("/api/tap-trails", async (req, res) => {
    try {
      const validatedData = insertTapTrailSchema.parse(req.body);
      // Note: createTapTrail method needs to be implemented in storage
      res.json({ message: "Tap trail creation not yet implemented" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create tap trail" });
    }
  });

  // Referral routes
  app.post("/api/referrals", async (req, res) => {
    try {
      const validatedData = insertReferralSchema.parse(req.body);
      const referral = await storage.createReferral(validatedData);
      res.json(referral);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create referral" });
    }
  });

  // Analytics routes
}
