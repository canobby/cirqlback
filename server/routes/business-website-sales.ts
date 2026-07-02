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
import {
  normalizeWebsiteContent,
  defaultWebsiteContent,
  slugifyName,
  FONT_PRESETS,
  DAYS,
  type BusinessWebsiteContent,
  type SectionKey,
} from "@shared/business-website";

const HOSTED_WEBSITE_ADDON = "hosted_website";

// Read the stored website content off a business row, seeding sensible defaults
// from the business profile when nothing has been saved yet.
function readWebsiteContent(business: any): BusinessWebsiteContent {
  const seed = {
    businessName: business?.name || "",
    description: business?.description || "",
    phone: business?.phone || "",
    email: business?.email || "",
    address: business?.address || "",
  };
  return normalizeWebsiteContent(business?.websiteContent, defaultWebsiteContent(seed));
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

// Render the public one-page site from validated content + live campaigns.
// Layout is fixed (always responsive); the customization knobs only feed CSS
// custom properties and which section blocks render, so it can never break.
function renderWebsiteHtml(
  c: BusinessWebsiteContent,
  campaigns: Array<{ name: string; description?: string | null }>,
): string {
  const font = FONT_PRESETS[c.fontPreset] || FONT_PRESETS.modern;
  const accent = c.accentColor;
  const name = escapeHtml(c.businessName || "Local Business");
  const tagline = escapeHtml(c.tagline);

  const heroInner = `<h1>${name}</h1>${tagline ? `<p class="tagline">${tagline}</p>` : ""}`;
  let hero: string;
  if ((c.heroStyle === "photo" || c.heroStyle === "overlay") && c.heroImage) {
    const overlay = c.heroStyle === "overlay";
    hero = `<header class="hero hero-photo${overlay ? " hero-overlay" : ""}" style="background-image:url('${escapeHtml(c.heroImage)}')"><div class="hero-inner">${heroInner}</div></header>`;
  } else if (c.heroStyle === "split" && c.heroImage) {
    hero = `<header class="hero hero-split"><div class="hero-text">${heroInner}</div><div class="hero-img" style="background-image:url('${escapeHtml(c.heroImage)}')"></div></header>`;
  } else {
    hero = `<header class="hero hero-gradient"><div class="hero-inner">${heroInner}</div></header>`;
  }

  const sectionHtml = (key: SectionKey): string => {
    switch (key) {
      case "about":
        return c.about ? section("About", `<p>${escapeHtml(c.about)}</p>`) : "";
      case "specials":
        return c.specials ? section("Specials & Offers", `<p>${escapeHtml(c.specials)}</p>`) : "";
      case "rewards":
        return campaigns.length
          ? section(
              "🎯 Tap to Earn Rewards",
              `<p class="rewards-lead">Look for our Cirql tags in-store to unlock these:</p><div class="rewards">${campaigns
                .map((r) => `<div class="reward"><strong>${escapeHtml(r.name)}</strong>${r.description ? `<span>${escapeHtml(r.description)}</span>` : ""}</div>`)
                .join("")}</div>`,
              true,
            )
          : "";
      case "hours": {
        const rows = DAYS.map((d) => {
          const h = c.hours[d];
          const val = h?.closed ? "Closed" : `${escapeHtml(h?.open || "")} – ${escapeHtml(h?.close || "")}`;
          return `<div class="hours-row"><span>${DAY_LABELS[d]}</span><span>${val}</span></div>`;
        }).join("");
        return section("Hours", `<div class="hours">${rows}</div>`);
      }
      case "gallery":
        return c.gallery.length
          ? section("Gallery", `<div class="gallery">${c.gallery.map((g) => `<img src="${escapeHtml(g)}" alt="" loading="lazy">`).join("")}</div>`)
          : "";
      case "contact": {
        const parts = [
          c.contact.address ? `<div>📍 ${escapeHtml(c.contact.address)}</div>` : "",
          c.contact.phone ? `<div>📞 ${escapeHtml(c.contact.phone)}</div>` : "",
          c.contact.email ? `<div>✉️ ${escapeHtml(c.contact.email)}</div>` : "",
        ].filter(Boolean).join("");
        return parts ? section("Contact", `<div class="contact">${parts}</div>`) : "";
      }
      case "social": {
        const links = Object.entries(c.social)
          .filter(([, v]) => v)
          .map(([k, v]) => `<a href="${escapeHtml(v)}" rel="noopener noreferrer nofollow" target="_blank">${escapeHtml(k)}</a>`)
          .join("");
        return links ? section("Follow Us", `<div class="social">${links}</div>`) : "";
      }
      default:
        return "";
    }
  };

  function section(title: string, body: string, highlight = false): string {
    return `<section class="block${highlight ? " highlight" : ""}"><h2>${escapeHtml(title)}</h2>${body}</section>`;
  }

  const body = c.sections.map(sectionHtml).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name}${tagline ? ` — ${tagline}` : ""}</title>
<meta name="description" content="${escapeHtml(c.about || c.tagline || c.businessName)}">
<style>
:root{--accent:${accent};--font-h:${font.heading};--font-b:${font.body};}
*{box-sizing:border-box;}
body{margin:0;font-family:var(--font-b);color:#1f2937;background:#f8fafc;line-height:1.6;}
h1,h2{font-family:var(--font-h);}
.hero{color:#fff;padding:72px 24px;text-align:center;}
.hero h1{font-size:2.4rem;margin:0;}
.hero .tagline{font-size:1.15rem;opacity:.92;margin:.5rem 0 0;}
.hero-gradient{background:linear-gradient(135deg,var(--accent),#111827);}
.hero-photo{background-size:cover;background-position:center;}
.hero-overlay .hero-inner,.hero-photo .hero-inner{background:rgba(0,0,0,.45);display:inline-block;padding:24px 32px;border-radius:12px;}
.hero-split{display:flex;flex-wrap:wrap;text-align:left;padding:0;color:#111827;background:#fff;}
.hero-split .hero-text{flex:1 1 320px;padding:56px 32px;border-top:6px solid var(--accent);}
.hero-split .hero-img{flex:1 1 320px;min-height:260px;background-size:cover;background-position:center;}
main{max-width:820px;margin:0 auto;padding:32px 20px 64px;}
.block{background:#fff;border-radius:14px;padding:24px 28px;margin:18px 0;box-shadow:0 1px 3px rgba(0,0,0,.06);}
.block h2{margin:0 0 12px;color:#111827;font-size:1.3rem;}
.block.highlight{border:2px solid var(--accent);}
.block.highlight h2{color:var(--accent);}
.rewards-lead{margin:0 0 12px;color:#4b5563;}
.rewards{display:grid;gap:10px;}
.reward{background:#f9fafb;border-left:4px solid var(--accent);padding:10px 14px;border-radius:8px;}
.reward span{display:block;font-size:.9rem;color:#6b7280;margin-top:2px;}
.hours-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;}
.gallery img{width:100%;height:140px;object-fit:cover;border-radius:8px;}
.contact div{padding:3px 0;}
.social{display:flex;gap:14px;flex-wrap:wrap;text-transform:capitalize;}
.social a{color:var(--accent);text-decoration:none;font-weight:600;}
footer{text-align:center;padding:24px;color:#9ca3af;font-size:.85rem;}
footer a{color:#6b7280;}
</style>
</head>
<body>
${hero}
<main>${body}</main>
<footer>Powered by <a href="https://cirqlback.com" rel="noopener">Cirqlback</a></footer>
</body>
</html>`;
}

export function registerBusinessWebsiteSalesRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

  // ── Hosted Business Page add-on (server/addons.ts: hosted_website) ──
  // Owner-facing editor API + a public one-page site at /biz/:slug. Content is
  // persisted on the businesses.website_* columns (websiteContent jsonb holds
  // the customization). Reads require ownership; writes/publish also require the
  // active add-on entitlement.

  // Owner: fetch editable website content + entitlement/publish state.
  app.get("/api/business/website/:businessId", isAuthenticated, async (req, res) => {
    try {
      const { businessId } = req.params;
      if (!(await userOwnsBusiness((req.user as any).id, businessId))) {
        return res.status(403).json({ error: "You don't own that business" });
      }
      const business = await storage.getBusiness(businessId);
      if (!business) return res.status(404).json({ error: "Business not found" });

      const entitled = await storage.businessHasAddonEffective(businessId, HOSTED_WEBSITE_ADDON);
      res.json({
        entitled,
        content: readWebsiteContent(business),
        slug: business.websiteSlug ?? null,
        published: Boolean(business.websitePublished),
        views: business.websiteViews ?? 0,
        publicUrl: business.websiteSlug ? `/biz/${business.websiteSlug}` : null,
      });
    } catch (error) {
      console.error("Get website error:", error);
      res.status(500).json({ error: "Failed to fetch website data" });
    }
  });

  // Owner: save website content (add-on required). Body is the full content
  // object; it is normalized/sanitized before persistence.
  app.put("/api/business/website/:businessId", isAuthenticated, async (req, res) => {
    try {
      const { businessId } = req.params;
      if (!(await userOwnsBusiness((req.user as any).id, businessId))) {
        return res.status(403).json({ error: "You don't own that business" });
      }
      if (!(await storage.businessHasAddonEffective(businessId, HOSTED_WEBSITE_ADDON))) {
        return res.status(402).json({ error: "Hosted Business Page add-on required", addonKey: HOSTED_WEBSITE_ADDON });
      }
      const business = await storage.getBusiness(businessId);
      if (!business) return res.status(404).json({ error: "Business not found" });

      const content = normalizeWebsiteContent(req.body?.content ?? req.body, readWebsiteContent(business));
      const updated = await storage.updateBusiness(businessId, {
        websiteEnabled: true,
        websiteContent: content as any,
        websiteTheme: content.fontPreset,
        websiteLastUpdated: new Date(),
      });
      res.json({ success: true, content: readWebsiteContent(updated) });
    } catch (error) {
      console.error("Update website error:", error);
      res.status(500).json({ error: "Failed to update website" });
    }
  });

  // Owner: publish / unpublish (add-on required). Publishing mints a unique slug
  // on first use.
  app.post("/api/business/website/:businessId/publish", isAuthenticated, async (req, res) => {
    try {
      const { businessId } = req.params;
      if (!(await userOwnsBusiness((req.user as any).id, businessId))) {
        return res.status(403).json({ error: "You don't own that business" });
      }
      if (!(await storage.businessHasAddonEffective(businessId, HOSTED_WEBSITE_ADDON))) {
        return res.status(402).json({ error: "Hosted Business Page add-on required", addonKey: HOSTED_WEBSITE_ADDON });
      }
      const business = await storage.getBusiness(businessId);
      if (!business) return res.status(404).json({ error: "Business not found" });

      const publish = req.body?.published !== false; // default true
      let slug = business.websiteSlug ?? null;

      if (publish && !slug) {
        // Mint a unique slug from the business name (append a short suffix on
        // collision — deterministic, no RNG).
        const base = slugifyName(business.name || readWebsiteContent(business).businessName);
        slug = base;
        const existing = await storage.getBusinessBySlug(slug);
        if (existing && existing.id !== businessId) {
          slug = `${base}-${businessId.slice(0, 4)}`;
        }
      }

      const updated = await storage.updateBusiness(businessId, {
        websitePublished: publish,
        ...(slug ? { websiteSlug: slug } : {}),
        websiteLastUpdated: new Date(),
      });
      res.json({
        success: true,
        published: Boolean(updated.websitePublished),
        slug: updated.websiteSlug ?? null,
        publicUrl: updated.websiteSlug ? `/biz/${updated.websiteSlug}` : null,
      });
    } catch (error) {
      console.error("Publish website error:", error);
      res.status(500).json({ error: "Failed to publish website" });
    }
  });

  // Public: serve the live one-page site. Only visible when published AND the
  // business currently holds the add-on. Renders from real content + live
  // campaigns; increments the view counter.
  app.get("/biz/:businessSlug", async (req, res) => {
    try {
      const business = await storage.getBusinessBySlug(req.params.businessSlug);
      if (!business || !business.websitePublished) {
        return res.status(404).type("html").send("<!DOCTYPE html><meta charset='utf-8'><title>Not found</title><p style='font-family:sans-serif;text-align:center;margin-top:80px'>This page isn't available.</p>");
      }
      if (!(await storage.businessHasAddonEffective(business.id, HOSTED_WEBSITE_ADDON))) {
        // Entitlement lapsed — treat as unpublished so a stale link 404s.
        return res.status(404).type("html").send("<!DOCTYPE html><meta charset='utf-8'><title>Not found</title><p style='font-family:sans-serif;text-align:center;margin-top:80px'>This page isn't available.</p>");
      }

      const content = readWebsiteContent(business);
      const campaigns = content.sections.includes("rewards")
        ? (await storage.getCampaigns(business.id))
            .filter((c) => c.isActive)
            .slice(0, 6)
            .map((c) => ({ name: c.name, description: c.description }))
        : [];

      // Fire-and-forget view increment (don't block the response on it).
      storage
        .updateBusiness(business.id, { websiteViews: (business.websiteViews ?? 0) + 1 })
        .catch((e) => console.error("website view increment failed:", e));

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderWebsiteHtml(content, campaigns));
    } catch (error) {
      console.error("Serve website error:", error);
      res.status(500).type("html").send("<!DOCTYPE html><meta charset='utf-8'><title>Error</title><p style='font-family:sans-serif;text-align:center;margin-top:80px'>Something went wrong.</p>");
    }
  });

  // REAL SALES DATA INPUT SYSTEM API ROUTES
  
  // Get sales data for a business
  app.get("/api/sales-data/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      
      const salesRecords = await db.select()
        .from(salesData)
        .where(eq(salesData.businessId, businessId))
        .orderBy(desc(salesData.date));
      
      // Calculate ROI and insights
      const analytics = salesRecords.map(record => ({
        ...record,
        cirqlROI: parseFloat(record.totalSales) > 0 ? 
          (parseFloat(record.cirqlDrivenSales || "0") / parseFloat(record.totalSales)) * 100 : 0,
        isProfitable: parseFloat(record.cirqlDrivenSales || "0") > 0
      }));
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching sales data:", error);
      // Return empty array for demo
      res.json([]);
    }
  });
  
  // Add new sales data entry
  app.post("/api/sales-data", async (req, res) => {
    try {
      // Parse and prepare the data manually to avoid schema issues
      const {
        businessId,
        date,
        totalSales,
        cirqlDrivenSales = "0",
        customerCount = 0,
        newCustomers = 0,
        returningCustomers = 0,
        notes = ""
      } = req.body;

      // Calculate average ticket if we have customer count and sales
      const averageTicket = customerCount > 0 ? 
        (parseFloat(totalSales) / customerCount).toFixed(2) : "0.00";

      // Prepare data for insertion
      const insertData = {
        businessId,
        date: date, // Keep as string since schema expects varchar
        totalSales: totalSales.toString(),
        cirqlDrivenSales: cirqlDrivenSales.toString(),
        customerCount,
        newCustomers,
        returningCustomers,
        averageTicket,
        notes,
        inputMethod: "manual",
        verificationStatus: "unverified"
      };
      
      const result = await db.insert(salesData).values(insertData).returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error adding sales data:", error);
      res.status(500).json({ error: "Failed to add sales data", details: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Get real vs platform analytics comparison
  app.get("/api/analytics/real-comparison/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      
      // Try to get real sales data
      let realSales: any[] = [];
      try {
        realSales = await db.select()
          .from(salesData)
          .where(eq(salesData.businessId, businessId))
          .orderBy(desc(salesData.date))
          .limit(30);
      } catch (dbError) {
        console.log("Database not available, using demo data");
      }
      
      // Get platform analytics (existing mock data for comparison)
      const platformData = {
        totalTaps: Math.floor(Math.random() * 1000) + 500,
        estimatedRevenue: Math.floor(Math.random() * 5000) + 2000,
        estimatedCustomers: Math.floor(Math.random() * 300) + 100
      };
      
      // Calculate comparison metrics
      const totalRealSales = realSales.reduce((sum: number, record: any) => sum + parseFloat(record.totalSales), 0);
      const totalCirqlSales = realSales.reduce((sum: number, record: any) => sum + parseFloat(record.cirqlDrivenSales || "0"), 0);
      
      const comparison = {
        realData: {
          totalSales: totalRealSales,
          cirqlDrivenSales: totalCirqlSales,
          cirqlROI: totalRealSales > 0 ? (totalCirqlSales / totalRealSales) * 100 : 0,
          dataPoints: realSales.length
        },
        platformEstimates: platformData,
        accuracy: {
          revenueAccuracy: totalRealSales > 0 ? Math.min(100, (platformData.estimatedRevenue / totalRealSales) * 100) : 0,
          hasRealData: realSales.length > 0
        },
        insights: {
          isOutperforming: totalCirqlSales > (platformData.estimatedRevenue * 0.1),
          growthTrend: realSales.length >= 7 ? "positive" : "insufficient_data",
          recommendedActions: realSales.length === 0 ? 
            ["Start inputting daily sales data", "Enable sales tracking", "Set performance goals"] :
            totalCirqlSales > totalRealSales * 0.15 ? 
            ["Increase Cirql campaigns", "Expand NFC tag placement"] :
            ["Optimize current campaigns", "Review customer engagement strategies"]
        }
      };
      
      res.json(comparison);
    } catch (error) {
      console.error("Error generating real analytics comparison:", error);
      res.status(500).json({ error: "Failed to generate comparison" });
    }
  });



  // AI-POWERED FEATURES ROUTES

  // Customer Health Scoring
  app.get("/api/ai/customer-health", (req, res) => {
    const mockHealthScores = [
      {
        id: "1",
        userId: "user-1",
        businessId: "business-1",
        healthScore: 85,
        churnRisk: "low",
        visitPrediction: 7,
        spendingPrediction: 45.50,
        riskFactors: ["No recent visits", "Decreased spending"],
        retentionStrategies: ["Send personalized offer", "Invite to loyalty program"],
        lastCalculated: new Date().toISOString()
      },
      {
        id: "2",
        userId: "user-2",
        businessId: "business-1",
        healthScore: 35,
        churnRisk: "critical",
        visitPrediction: 30,
        spendingPrediction: 15.00,
        riskFactors: ["Long absence", "Competitor activity", "Seasonal drop"],
        retentionStrategies: ["Urgent win-back campaign", "Special discount offer", "Personal outreach"],
        lastCalculated: new Date().toISOString()
      }
    ];
    res.json(mockHealthScores);
  });

  // Predictive Pricing
  app.get("/api/ai/predictive-pricing", (req, res) => {
    const mockPricing = [
      {
        id: "1",
        businessId: "business-1",
        itemCategory: "Coffee Drinks",
        currentPrice: 4.50,
        suggestedPrice: 5.25,
        priceChangeReason: "High demand expected due to cold weather and nearby office events",
        expectedDemandChange: 15.5,
        expectedRevenueImpact: 125.80,
        marketFactors: {
          weather: "Cold front arriving, 45°F",
          events: ["Office conference nearby", "Morning rush hour"],
          competition: "Competitor prices 10% higher",
          seasonality: "Peak coffee season"
        },
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    res.json(mockPricing);
  });

  // Market Intelligence
  app.get("/api/ai/market-intelligence", (req, res) => {
    const mockMarketData = [
      {
        id: "1",
        businessId: "business-1",
        dataType: "weather_impact",
        date: new Date().toISOString(),
        insights: "Cold weather increases coffee sales by 23% and decreases outdoor seating usage by 67%. Consider promoting hot beverages and indoor comfort amenities.",
        recommendations: [
          "Increase coffee inventory by 25%",
          "Promote hot food items on social media",
          "Add seasonal comfort items like hot chocolate",
          "Create cozy indoor atmosphere"
        ],
        confidenceScore: 0.89,
        isActionable: true
      }
    ];
    res.json(mockMarketData);
  });

  // Weather Triggers
  app.get("/api/ai/weather-triggers", (req, res) => {
    const mockWeatherTriggers = [
      {
        id: "1",
        businessId: "business-1",
        weatherCondition: "rainy",
        customMessage: "Rainy day? Warm up with our hot coffee and pastries! 15% off when it's pouring outside.",
        discountPercentage: 15,
        isActive: true,
        triggerCount: 8
      }
    ];
    res.json(mockWeatherTriggers);
  });

  // Apply AI pricing recommendation
  app.post("/api/ai/apply-pricing/:id", (req, res) => {
    res.json({ success: true, message: "Pricing applied successfully" });
  });

  // Create win-back campaign
  app.post("/api/ai/create-winback/:customerId", (req, res) => {
    res.json({ success: true, message: "Win-back campaign created and sent" });
  });

  // (CHR-58) The mock /api/partnerships/* endpoints were removed. Multi-store
  // collaboration is now the real group-campaign model — see
  // server/routes/group-campaigns.ts.

  // TEAM CHALLENGE ROUTES

  // Get user's teams
  app.get("/api/teams/my-teams", (req, res) => {
    const mockTeams = [
      {
        id: "team-1",
        name: "Local Explorers",
        description: "Discovering the best local spots together!",
        leaderId: "user-1",
        maxMembers: 10,
        currentMembers: 7,
        teamType: "casual",
        totalPoints: 1250,
        totalChallengesCompleted: 12,
        teamLevel: 3,
        teamBadges: ["Early Adopter", "Social Butterfly", "Explorer"],
        isPublic: true,
        isActive: true,
        members: [
          {
            id: "user-1",
            firstName: "John",
            lastName: "Smith",
            role: "leader",
            pointsContributed: 450,
            joinedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    ];
    res.json(mockTeams);
  });

  // Get team leaderboard
  app.get("/api/teams/leaderboard", (req, res) => {
    const mockLeaderboard = [
      {
        id: "team-5",
        name: "Challenge Champions",
        currentMembers: 8,
        teamLevel: 7,
        totalPoints: 3450,
        totalChallengesCompleted: 25
      }
    ];
    res.json(mockLeaderboard);
  });

  // Create team
  app.post("/api/teams", (req, res) => {
    res.json({ success: true, id: "new-team-id" });
  });

  // Join challenge
  app.post("/api/challenges/:id/join", (req, res) => {
    res.json({ success: true });
  });

  // DISCOVERY CHALLENGE ROUTES

  // VIRAL CAMPAIGN ROUTES

  // Get viral campaigns
  app.get("/api/viral-campaigns", (req, res) => {
    const mockViralCampaigns = [
      {
        id: "viral-1",
        businessId: "business-1",
        businessName: "Brew & Bytes Cafe",
        title: "Coffee Lover's Referral Explosion",
        description: "Share with friends and watch your rewards multiply exponentially! Each friend you refer increases your reward potential.",
        campaignType: "friend_referral",
        viralMechanic: "exponential_rewards",
        baseReward: 5.00,
        viralMultiplier: 1.5,
        maxReward: 100.00,
        participantCount: 234,
        shareCount: 567,
        conversionRate: 0.28,
        totalRevenue: 1250.75,
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        userProgress: {
          participated: true,
          friendsReferred: 3,
          rewardEarned: 16.88,
          sharesMade: 8
        }
      }
    ];
    res.json(mockViralCampaigns);
  });

  // Get social proof events
  app.get("/api/social-proof", (req, res) => {
    const mockSocialProof = [
      {
        id: "social-1",
        userId: "user-1",
        userName: "Sarah Chen",
        userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
        businessId: "business-1",
        businessName: "Brew & Bytes Cafe",
        eventType: "visit",
        visibility: "public",
        message: "Amazing new seasonal latte! The AR menu made choosing so much fun 🚀",
        viewCount: 47,
        interactionCount: 12,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];
    res.json(mockSocialProof);
  });

  // Get friend network
  app.get("/api/friends", (req, res) => {
    const mockFriends = [
      {
        id: "friend-1",
        friendId: "user-2",
        friendName: "Mike Johnson",
        friendAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
        status: "accepted",
        sharedVisits: 12,
        mutualRewards: 8,
        connectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    res.json(mockFriends);
  });

  // Get viral stats
  app.get("/api/viral-stats", (req, res) => {
    const mockStats = {
      totalShares: 1247,
      sharesGrowth: 23,
      viralCoefficient: 2.3,
      campaignROI: 340,
      activeParticipants: 456
    };
    res.json(mockStats);
  });

  // Create viral campaign
  app.post("/api/viral-campaigns", (req, res) => {
    res.json({ success: true, id: "new-viral-campaign-id" });
  });

  // Participate in viral campaign
  app.post("/api/viral-campaigns/:id/participate", (req, res) => {
    res.json({ success: true });
  });

  // Share viral campaign
  app.post("/api/viral-campaigns/:id/share", (req, res) => {
    res.json({ success: true, shareUrl: `${req.protocol}://${req.hostname}/viral/${req.params.id}` });
  });

  // Add friend
  app.post("/api/friends/add", (req, res) => {
    res.json({ success: true });
  });

}
