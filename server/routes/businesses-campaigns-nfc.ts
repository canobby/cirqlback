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
import { requireActiveBilling } from "./billing";
import { PLAN_PRICING, resolvePlanAmountCents, type BillingInterval } from "../pricing";
import type { RouteDeps } from "./_shared";

export function registerBusinessesCampaignsNfcRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

  app.get("/api/businesses", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const businesses = userId ? await storage.getUserBusinesses(userId) : [];
      res.json(businesses);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  // Per-tier cap on how many businesses an owner may create (owner decision,
  // matches GET /api/subscription/plans): starter/core = 1, pro = 3.
  const TIER_BUSINESS_LIMIT: Record<string, number> = { starter: 1, core: 1, pro: 3 };

  app.post("/api/businesses", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertBusinessSchema.parse(req.body);
      const userId = (req.user as any).id;
      const tier = (req.user as any).subscriptionTier || "starter";
      const limit = TIER_BUSINESS_LIMIT[tier] ?? 1;
      const existing = await storage.getBusinessesByOwner(userId);
      if (existing.length >= limit) {
        return res.status(409).json({
          error: `Your ${tier} plan allows ${limit} business${limit === 1 ? "" : "es"}. Upgrade to add more.`,
          reason: "business_limit",
          limit,
        });
      }
      const business = await storage.createBusiness({ ...validatedData, ownerId: userId } as any);
      res.status(201).json(business);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create business error:", error);
      res.status(500).json({ error: "Failed to create business" });
    }
  });

  // ── CHR-34 / CHR-70: nonprofit (501c3) participation ──

  // Public list of nonprofits (for the map / discovery).
  app.get("/api/nonprofits", async (_req, res) => {
    try {
      const nonprofits = await storage.getNonprofits();
      res.json(
        nonprofits.map((n) => ({
          id: n.id,
          name: n.name,
          description: n.description,
          ein: n.ein,
          mission: n.nonprofitMission,
          latitude: n.latitude,
          longitude: n.longitude,
          logo: n.logo,
        }))
      );
    } catch (error) {
      console.error("Nonprofits list error:", error);
      res.status(500).json({ error: "Failed to load nonprofits" });
    }
  });

  // Onboard a nonprofit (self-serve, free — no subscription charge). The
  // signed-in user becomes its owner.
  app.post("/api/nonprofits", isAuthenticated, async (req, res) => {
    try {
      const { name, ein, mission, description, address, latitude, longitude } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });
      const business = await storage.createBusiness({
        name,
        description,
        address,
        latitude,
        longitude,
        ownerId: (req.user as any).id,
        isNonprofit: true,
        ein,
        nonprofitMission: mission,
        verificationStatus: "unverified",
      } as any);
      res.status(201).json(business);
    } catch (error) {
      console.error("Nonprofit onboard error:", error);
      res.status(500).json({ error: "Failed to onboard nonprofit" });
    }
  });

  // ── CHR-34 / CHR-71: donation-per-tap campaigns ──

  // Create a donation-per-tap campaign for a nonprofit the user owns, seeding
  // the participating stores.
  app.post("/api/donation-campaigns", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const { nonprofitId, name, description, donationPerTapCents, businessIds } = req.body || {};
      if (!nonprofitId || !name) return res.status(400).json({ error: "nonprofitId and name are required" });
      const np = await storage.getBusiness(nonprofitId);
      if (!np || !np.isNonprofit) return res.status(404).json({ error: "Nonprofit not found" });
      if (np.ownerId !== userId) return res.status(403).json({ error: "Not your nonprofit" });

      const campaign = await storage.createDonationCampaign({
        nonprofitId,
        name,
        description,
        donationPerTapCents: Number(donationPerTapCents) > 0 ? Number(donationPerTapCents) : 0,
        createdByUserId: userId,
        isActive: true,
      } as any);

      const ids: string[] = Array.isArray(businessIds) ? businessIds : [];
      for (const bid of ids) await storage.addDonationCampaignMember(campaign.id, bid);

      res.status(201).json(await storage.getDonationCampaignWithMembers(campaign.id));
    } catch (error) {
      console.error("Create donation campaign error:", error);
      res.status(500).json({ error: "Failed to create donation campaign" });
    }
  });

  // Public: active donation campaigns (for the discovery map / tap flow).
  app.get("/api/donation-campaigns/active", async (_req, res) => {
    try {
      res.json(await storage.getActiveDonationCampaignsWithMembers());
    } catch (error) {
      console.error("Active donation campaigns error:", error);
      res.status(500).json({ error: "Failed to load donation campaigns" });
    }
  });

  // Public: a donation campaign + members + total raised.
  app.get("/api/donation-campaigns/:id", async (req, res) => {
    try {
      const full = await storage.getDonationCampaignWithMembers(req.params.id);
      if (!full) return res.status(404).json({ error: "Donation campaign not found" });
      res.json(full);
    } catch (error) {
      console.error("Get donation campaign error:", error);
      res.status(500).json({ error: "Failed to load donation campaign" });
    }
  });

  // Public: a nonprofit's attributed donation totals (transparency).
  app.get("/api/nonprofits/:id/donations", async (req, res) => {
    try {
      res.json(await storage.getNonprofitDonationTotals(req.params.id));
    } catch (error) {
      console.error("Nonprofit donation totals error:", error);
      res.status(500).json({ error: "Failed to load donation totals" });
    }
  });

  // ── CHR-36 / CHR-75: favorites + reminders ──

  // Favorite / unfavorite a business — no account needed (email/fingerprint).
  app.post("/api/favorites", async (req, res) => {
    try {
      const { businessId, email, deviceFingerprint } = req.body || {};
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      if (!email && !deviceFingerprint) return res.status(400).json({ error: "email or deviceFingerprint required" });
      await storage.favoriteBusiness({ businessId, email, deviceFingerprint });
      res.status(201).json({ ok: true });
    } catch (error) {
      console.error("Favorite error:", error);
      res.status(500).json({ error: "Failed to favorite" });
    }
  });

  app.post("/api/favorites/remove", async (req, res) => {
    try {
      const { businessId, email, deviceFingerprint } = req.body || {};
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      const removed = await storage.unfavoriteBusiness({ businessId, email, deviceFingerprint });
      res.json({ removed });
    } catch (error) {
      console.error("Unfavorite error:", error);
      res.status(500).json({ error: "Failed to unfavorite" });
    }
  });

  // A customer's favorites + reminder feed (by identity).
  app.get("/api/favorites", async (req, res) => {
    try {
      const email = typeof req.query.email === "string" ? req.query.email : undefined;
      const deviceFingerprint = typeof req.query.deviceFingerprint === "string" ? req.query.deviceFingerprint : undefined;
      const [favorites, reminders] = await Promise.all([
        storage.getFavorites(email, deviceFingerprint),
        storage.getRemindersForCustomer(email, deviceFingerprint),
      ]);
      res.json({ favorites, reminders });
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ error: "Failed to load favorites" });
    }
  });

  // Public favoriter count for a business.
  app.get("/api/businesses/:id/favoriter-count", async (req, res) => {
    try {
      res.json({ count: await storage.getFavoriterCount(req.params.id) });
    } catch (error) {
      console.error("Favoriter count error:", error);
      res.status(500).json({ error: "Failed to load count" });
    }
  });

  // Owner posts a reminder to their favoriters.
  app.post("/api/businesses/:id/reminders", isAuthenticated, async (req, res) => {
    try {
      if (!(await userOwnsBusiness((req.user as any).id, req.params.id))) {
        return res.status(403).json({ error: "You don't own that business" });
      }
      const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
      if (!message) return res.status(400).json({ error: "message is required" });
      const reminder = await storage.createReminder({ businessId: req.params.id, message, createdByUserId: (req.user as any).id });
      res.status(201).json(reminder);
    } catch (error) {
      console.error("Create reminder error:", error);
      res.status(500).json({ error: "Failed to post reminder" });
    }
  });

  // Campaign routes
  app.get("/api/campaigns", async (req, res) => {
    try {
      const businessId = req.query.businessId as string;
      if (!businessId) return res.json([]);
      const campaigns = await storage.getCampaigns(businessId);
      res.json(campaigns);
    } catch (error) {
      console.error("Campaign fetch error:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", isAuthenticated, requireActiveBilling, async (req, res) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      // CHR-16: only the owning business may create a campaign. Without this an
      // anonymous caller could inject reward-granting campaigns onto any business.
      if (!(await userOwnsBusiness((req.user as any).id, validatedData.businessId))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const campaign = await storage.createCampaign(validatedData);
      res.json(campaign);
    } catch (error) {
      console.error("Campaign creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.patch("/api/campaigns/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getCampaign(id);
      if (!existing) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      if (!(await userOwnsBusiness((req.user as any).id, existing.businessId))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      // Validate + strip unknown fields (prevents mass-assignment of arbitrary columns).
      const updates = insertCampaignSchema.partial().parse(req.body);
      const campaign = await storage.updateCampaign(id, updates);
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  // NFC Tag routes
  app.get("/api/nfc-tags", async (req, res) => {
    const businessId = req.query.businessId as string;
    try {
      if (!businessId) return res.json([]);
      const tags = await storage.getNFCTags(businessId);
      res.json(tags);
    } catch (error) {
      console.error("NFC tags fetch error:", error);
      res.status(500).json({ error: "Failed to fetch NFC tags" });
    }
  });

  app.post("/api/nfc-tags", isAuthenticated, requireActiveBilling, async (req, res) => {
    try {
      const validatedData = insertNfcTagSchema.parse(req.body);
      // CHR-16: only the owning business may mint NFC tags. Its PATCH/DELETE
      // siblings were already gated; the create path was left open.
      if (!(await userOwnsBusiness((req.user as any).id, validatedData.businessId))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Generate unique tag identifier if not provided
      if (!validatedData.tagIdentifier) {
        validatedData.tagIdentifier = `CIRQL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
      
      const tag = await storage.createNFCTag(validatedData);
      // Return the real tag + its deployment URL (/tap/<id>) and QR endpoint.
      res.json({
        ...tag,
        tagUrl: `${req.protocol}://${req.get('host')}/tap/${tag.id}`,
        qrCodeUrl: `${req.protocol}://${req.get('host')}/qr/${tag.id}`,
        deploymentInstructions: [
          "Clean the surface where you'll place the tag",
          "Remove the protective backing from the NFC tag",
          `Place the tag at ${validatedData.location}`,
          "Test the tag by tapping it with your phone",
          "Add signage to encourage customer interaction",
        ],
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create NFC tag" });
    }
  });

  // Update NFC tag
  app.patch("/api/nfc-tags/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getNFCTag(id);
      if (!existing) {
        return res.status(404).json({ error: "NFC tag not found" });
      }
      if (!(await userOwnsBusiness((req.user as any).id, existing.businessId))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updates = insertNfcTagSchema.partial().parse(req.body);
      const tag = await storage.updateNFCTag(id, updates);
      res.json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update NFC tag" });
    }
  });

  // Delete NFC tag
  app.delete("/api/nfc-tags/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getNFCTag(id);
      if (!existing) {
        return res.status(404).json({ error: "NFC tag not found" });
      }
      if (!(await userOwnsBusiness((req.user as any).id, existing.businessId))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const success = await storage.deleteNFCTag(id);
      if (!success) {
        return res.status(404).json({ error: "NFC tag not found" });
      }
      res.json({ success: true, message: "NFC tag deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete NFC tag" });
    }
  });

  // QR Code generation endpoint
  app.get("/qr/:tagId", async (req, res) => {
    try {
      const { tagId } = req.params;
      const tagUrl = `${req.protocol}://${req.get('host')}/tap/${tagId}`;
      
      // Generate QR code SVG (simplified implementation)
      const qrSvg = `
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="white"/>
          <rect x="10" y="10" width="30" height="30" fill="black"/>
          <rect x="160" y="10" width="30" height="30" fill="black"/>
          <rect x="10" y="160" width="30" height="30" fill="black"/>
          <text x="100" y="105" text-anchor="middle" font-size="8" fill="black">Cirql Tag</text>
          <text x="100" y="120" text-anchor="middle" font-size="6" fill="gray">${tagId}</text>
        </svg>
      `;
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrSvg);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // NFC Analytics endpoint
  app.get("/api/nfc-analytics", async (req, res) => {
    try {
      const businessId = req.query.businessId as string;
      const timeRange = req.query.range as string || "7d";
      
      if (!businessId) return res.json([]);
      
      try {
        // Real analytics would be fetched from database here
        const analytics = await storage.getNFCTagAnalytics(businessId, timeRange);
        res.json(analytics);
      } catch (dbError) {
        console.error("Database error fetching NFC analytics:", dbError);
        
        // Return empty analytics for real business ID but no data
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching NFC analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Tap routes - simulate NFC tap
}
