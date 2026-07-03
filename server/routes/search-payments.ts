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
import { ADDON_CATALOG, resolveAddonAmountCents, isAddonKey, isAddonIncludedInTier } from "../addons";
import type { RouteDeps } from "./_shared";

export function registerSearchPaymentsRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.json({ results: [] });
      }

      const query = q.toLowerCase().trim();
      
      // Comprehensive search across all platform entities
      const searchResults = [];

      // Business searches
      const businesses = [
        { id: "biz1", name: "Joe's Coffee Shop", description: "Premium coffee and pastries downtown", address: "123 Main St" },
        { id: "biz2", name: "Fitness First Gym", description: "Full-service fitness center", address: "456 Oak Ave" },
        { id: "biz3", name: "Taco Libre", description: "Authentic Mexican cuisine", address: "789 Pine St" }
      ];

      businesses.forEach(business => {
        if (business.name.toLowerCase().includes(query) || 
            business.description.toLowerCase().includes(query) ||
            business.address.toLowerCase().includes(query)) {
          searchResults.push({
            id: business.id,
            type: 'business',
            title: business.name,
            description: business.description,
            url: `/merchant?business=${business.id}`,
            badge: 'Active',
            metadata: { address: business.address }
          });
        }
      });

      // Campaign searches
      const campaigns = [
        { id: "camp1", name: "Weekend Coffee Special", description: "10% off all weekend coffee orders", businessName: "Joe's Coffee Shop" },
        { id: "camp2", name: "Loyalty Rewards Program", description: "Earn points with every purchase", businessName: "Fitness First Gym" },
        { id: "camp3", name: "Happy Hour Tacos", description: "Buy one get one free during happy hour", businessName: "Taco Libre" }
      ];

      campaigns.forEach(campaign => {
        if (campaign.name.toLowerCase().includes(query) || 
            campaign.description.toLowerCase().includes(query) ||
            campaign.businessName.toLowerCase().includes(query)) {
          searchResults.push({
            id: campaign.id,
            type: 'campaign',
            title: campaign.name,
            description: `${campaign.description} - ${campaign.businessName}`,
            url: `/merchant?campaign=${campaign.id}`,
            badge: 'Running'
          });
        }
      });

      // Customer segments
      const customerSegments = [
        { id: "seg1", name: "Frequent Visitors", description: "Customers who visit 5+ times per month", count: 847 },
        { id: "seg2", name: "High-Value Customers", description: "Customers spending $100+ monthly", count: 234 },
        { id: "seg3", name: "New Customers", description: "First-time visitors in last 30 days", count: 456 }
      ];

      customerSegments.forEach(segment => {
        if (segment.name.toLowerCase().includes(query) || 
            segment.description.toLowerCase().includes(query)) {
          searchResults.push({
            id: segment.id,
            type: 'customer',
            title: segment.name,
            description: `${segment.description} (${segment.count} customers)`,
            url: `/marketing?segment=${segment.id}`,
            badge: `${segment.count} users`
          });
        }
      });

      // Location searches
      const locations = [
        { id: "loc1", name: "Downtown District", description: "High-traffic business district", businessCount: 12 },
        { id: "loc2", name: "Shopping Mall", description: "Indoor shopping center", businessCount: 8 },
        { id: "loc3", name: "University Area", description: "Near campus with student traffic", businessCount: 15 }
      ];

      locations.forEach(location => {
        if (location.name.toLowerCase().includes(query) || 
            location.description.toLowerCase().includes(query)) {
          searchResults.push({
            id: location.id,
            type: 'location',
            title: location.name,
            description: `${location.description} (${location.businessCount} businesses)`,
            url: `/map?location=${location.id}`,
            badge: `${location.businessCount} businesses`
          });
        }
      });

      // CHR-81: removed the fake "AR Experience" search results — the AR feature
      // was deleted in CHR-29, so these hard-coded entries surfaced bogus hits
      // that linked nowhere.

      // Analytics searches
      if (query.includes('analytic') || query.includes('report') || query.includes('metric') || query.includes('dashboard')) {
        searchResults.push(
          {
            id: 'analytics-overview',
            type: 'analytics',
            title: 'Analytics Overview',
            description: 'Real-time business performance metrics and insights',
            url: '/analytics',
            badge: 'Dashboard'
          },
          {
            id: 'marketing-analytics',
            type: 'analytics',
            title: 'Marketing Analytics',
            description: 'Campaign performance and customer engagement metrics',
            url: '/marketing?tab=analytics',
            badge: 'Marketing'
          }
        );
      }

      // Rewards searches
      if (query.includes('reward') || query.includes('point') || query.includes('loyalty')) {
        searchResults.push({
          id: 'rewards-system',
          type: 'reward',
          title: 'Loyalty Rewards System',
          description: 'Manage customer rewards and loyalty programs',
          url: '/customer',
          badge: 'Rewards'
        });
      }

      // Sort results by relevance (exact matches first, then partial matches)
      searchResults.sort((a, b) => {
        const aExact = a.title.toLowerCase() === query;
        const bExact = b.title.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        const aStartsWith = a.title.toLowerCase().startsWith(query);
        const bStartsWith = b.title.toLowerCase().startsWith(query);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        return 0;
      });

      res.json({ 
        results: searchResults.slice(0, 10), // Limit to 10 results
        query: q,
        total: searchResults.length 
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  // Payment processing endpoint with real Stripe integration
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      // Price is resolved SERVER-SIDE. Any client-supplied `amount` is ignored so
      // a user cannot set their own price. Two purchase kinds: subscription plan
      // and (CHR-65) a per-business add-on.
      const userId = (req.user as any).id;
      const isAddon = req.body?.type === "addon";

      let amountCents: number | null;
      let metadata: Record<string, string>;
      let responseExtra: Record<string, unknown>;

      if (isAddon) {
        const addonKey = String(req.body?.addonKey || "");
        const businessId = String(req.body?.businessId || "");
        if (!isAddonKey(addonKey)) {
          return res.status(400).json({ error: "Unknown add-on" });
        }
        if (!businessId) {
          return res.status(400).json({ error: "businessId is required" });
        }
        if (!(await userOwnsBusiness(userId, businessId))) {
          return res.status(403).json({ error: "You don't own that business" });
        }
        // Tier-included add-ons (e.g. hosted_website on Pro) are free — never
        // charge for one, and don't create a purchase the owner doesn't need.
        const ownerTier = await storage.getBusinessOwnerTier(businessId);
        if (isAddonIncludedInTier(addonKey, ownerTier)) {
          return res.status(400).json({
            error: `${ADDON_CATALOG[addonKey].name} is already included with your plan.`,
            included: true,
            addonKey,
          });
        }
        amountCents = resolveAddonAmountCents(addonKey);
        metadata = { platform: "Cirqlback", type: "addon", addonKey, businessId, userId };
        responseExtra = { addonKey, addonName: ADDON_CATALOG[addonKey].name };
      } else {
        const planId = String(req.body?.planId || "");
        const billingInterval: BillingInterval =
          req.body?.billingInterval === "yearly" ? "yearly" : "monthly";
        amountCents = resolvePlanAmountCents(planId, billingInterval);
        if (amountCents === null) {
          return res.status(400).json({ error: "Unknown or non-purchasable plan" });
        }
        metadata = { platform: "Cirqlback", planId, billingInterval, userId };
        responseExtra = { planName: PLAN_PRICING[planId].name, billingInterval };
      }

      if (amountCents === null) {
        return res.status(400).json({ error: "Nothing to charge" });
      }

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        return res.status(400).json({
          error: "Payment processing not configured. Please set STRIPE_SECRET_KEY.",
        });
      }

      const stripe = new (await import('stripe')).default(stripeSecretKey, {
        apiVersion: '2025-07-30.basil' as any,
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        metadata,
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amountCents / 100,
        ...responseExtra,
      });
    } catch (error: any) {
      console.error("Stripe payment intent creation error:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Stripe webhook — verifies payment success SERVER-SIDE (never trust the
  // client's "payment succeeded"). Uses the raw request body captured in
  // server/index.ts for signature verification. Stripe calls this unauthenticated,
  // so the signature IS the auth.
  app.post("/api/stripe/webhook", async (req, res) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeSecretKey || !webhookSecret) {
      return res.status(400).json({ error: "Stripe webhook not configured" });
    }
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    const stripe = new (await import('stripe')).default(stripeSecretKey, {
      apiVersion: '2025-07-30.basil' as any,
    });

    let event;
    try {
      const rawBody = (req as any).rawBody ?? req.body;
      event = stripe.webhooks.constructEvent(rawBody, signature as string, webhookSecret);
    } catch (err: any) {
      console.error("Stripe webhook signature verification failed:", err.message);
      return res.status(400).json({ error: "Webhook signature verification failed" });
    }

    try {
      // Stripe Connect: a connected account's payout-readiness changed (can flip
      // asynchronously after Stripe review). Keep the business's flags in sync.
      if (event.type === "account.updated") {
        const acct = event.data.object as any;
        await storage.setBusinessConnectStatus(acct.id, {
          payoutsEnabled: !!acct.payouts_enabled,
          detailsSubmitted: !!acct.details_submitted,
        });
        return res.json({ received: true });
      }
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as any;
        const meta = pi.metadata || {};
        const userId = meta.userId;
        const addonKey = meta.addonKey;

        if (meta.type === "addon" && isAddonKey(addonKey) && meta.businessId) {
          // CHR-65: an add-on purchase — activate the entitlement (idempotent).
          await storage.activateBusinessAddon({
            businessId: meta.businessId,
            addonKey,
            source: "stripe",
            stripePaymentIntentId: pi.id,
          });
          // Revenue share on the add-on charge (source='addon').
          if (userId) {
            try {
              await storage.recordCoordinatorEarning({
                paymentIntentId: pi.id,
                userId,
                source: "addon",
                description: ADDON_CATALOG[addonKey].name,
                grossAmountCents: Number(pi.amount) || 0,
                currency: pi.currency || "usd",
              });
            } catch (attrErr) {
              console.error("Add-on earning attribution failed:", attrErr);
            }
          }
        } else {
          // Subscription charge.
          const planId = meta.planId;
          if (userId && planId && PLAN_PRICING[planId]) {
            await storage.updateUserSubscription(userId, {
              subscriptionTier: planId,
              subscriptionStatus: "active",
            });
          }
          // CHR-32/61: attribute the charge to the territory's coordinator.
          // Never let this break subscription activation.
          if (userId) {
            try {
              await storage.recordCoordinatorEarning({
                paymentIntentId: pi.id,
                userId,
                planId,
                source: "subscription",
                description: planId ? PLAN_PRICING[planId]?.name : undefined,
                grossAmountCents: Number(pi.amount) || 0,
                currency: pi.currency || "usd",
              });
            } catch (attrErr) {
              console.error("Coordinator earning attribution failed:", attrErr);
            }
          }
        }
      }
      return res.json({ received: true });
    } catch (err) {
      console.error("Stripe webhook handler error:", err);
      return res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  // ── CHR-35 / CHR-65: add-on catalog + entitlements ────────────────────────

  // Public catalog of purchasable add-ons (server-side prices).
  app.get("/api/addons/catalog", (_req, res) => {
    res.json(
      Object.values(ADDON_CATALOG).map((a) => ({
        key: a.key,
        name: a.name,
        priceCents: a.priceCents,
        blurb: a.blurb,
        includedInTiers: a.includedInTiers ?? [],
      }))
    );
  });

  // A business's active add-on entitlements (owner-only). Includes add-ons the
  // owner's plan grants for free (source: "included") so the UI shows them active.
  app.get("/api/businesses/:id/addons", isAuthenticated, async (req, res) => {
    try {
      if (!(await userOwnsBusiness((req.user as any).id, req.params.id))) {
        return res.status(403).json({ error: "You don't own that business" });
      }
      res.json(await storage.getEffectiveBusinessAddons(req.params.id));
    } catch (error) {
      console.error("Business add-ons error:", error);
      res.status(500).json({ error: "Failed to load add-ons" });
    }
  });

  // ── CHR-68: custom tap-screen branding (add-on) ──

  // Public: branding for the tap page — only when the business is entitled.
  app.get("/api/tap-branding/:businessId", async (req, res) => {
    try {
      if (!(await storage.businessHasAddonEffective(req.params.businessId, "custom_branding"))) {
        return res.json(null); // default styling
      }
      res.json((await storage.getTapBranding(req.params.businessId)) ?? null);
    } catch (error) {
      console.error("Tap branding read error:", error);
      res.status(500).json({ error: "Failed to load branding" });
    }
  });

  // Owner: current branding + whether the add-on is held (for the editor).
  app.get("/api/businesses/:id/tap-branding", isAuthenticated, async (req, res) => {
    try {
      if (!(await userOwnsBusiness((req.user as any).id, req.params.id))) {
        return res.status(403).json({ error: "You don't own that business" });
      }
      const entitled = await storage.businessHasAddonEffective(req.params.id, "custom_branding");
      res.json({ entitled, branding: (await storage.getTapBranding(req.params.id)) ?? null });
    } catch (error) {
      console.error("Owner tap branding error:", error);
      res.status(500).json({ error: "Failed to load branding" });
    }
  });

  // Owner + entitled: save branding. 402 when the add-on isn't held.
  app.put("/api/businesses/:id/tap-branding", isAuthenticated, async (req, res) => {
    try {
      if (!(await userOwnsBusiness((req.user as any).id, req.params.id))) {
        return res.status(403).json({ error: "You don't own that business" });
      }
      if (!(await storage.businessHasAddonEffective(req.params.id, "custom_branding"))) {
        return res.status(402).json({ error: "Custom Branding add-on required", addonKey: "custom_branding" });
      }
      const { brandColor, accentColor, slogan, logoUrl, links } = req.body || {};
      const branding = await storage.upsertTapBranding(req.params.id, {
        brandColor, accentColor, slogan, logoUrl,
        links: Array.isArray(links) ? links : undefined,
      });
      res.json(branding);
    } catch (error) {
      console.error("Save tap branding error:", error);
      res.status(500).json({ error: "Failed to save branding" });
    }
  });

  // Business data endpoint for analytics
}
