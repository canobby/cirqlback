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

export function registerDiscoveryMarketingRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

  app.get("/api/business/descriptors", async (req, res) => {
    try {
      const businessId = req.query.businessId || "demo_business_1";
      
      // In a real implementation, this would fetch from database
      const descriptors = {
        businessDescriptors: ["Women-owned business", "Local entrepreneur"],
        culturalBackground: "Hispanic/Latino heritage",
        communityFocus: ["Youth programs", "Local artist support"],
        accessibilityFeatures: ["Wheelchair accessible", "Service animal friendly"],
        sustainabilityPractices: ["Locally sourced ingredients", "Eco-friendly packaging"],
        businessMaturity: "Established business (2-10 years)",
        establishmentType: ["Independent local business"],
        specialtyFeatures: ["Outdoor seating", "Pet-friendly", "WiFi available"],
        priceRange: "Moderate ($$)",
        // Enhanced marketing fields
        targetDemographics: ["Young professionals (25-35)", "Families with children"],
        peakHours: ["Lunch hours (11 AM-2 PM)", "Dinner time (7-9 PM)"],
        seasonalPatterns: ["Consistent year-round"],
        customerCapacity: 85,
        averageVisitDuration: "30-60 minutes",
        primaryProducts: ["Food & beverages"],
        uniqueSellingPoints: ["Locally sourced ingredients", "Expert consultation"],
        marketingGoals: ["Increase foot traffic", "Improve customer retention"],
        customerRetentionRate: "50-75%",
        averageSpendPerCustomer: "$15-$30",
        socialMediaPresence: ["Instagram active", "Facebook business page"],
        eventHostingCapability: true,
        loyaltyProgramInterest: "Very interested",
        marketingBudget: "$500-$1000"
      };
      
      res.json(descriptors);
    } catch (error) {
      console.error("Error fetching business descriptors:", error);
      res.status(500).json({ error: "Failed to fetch business descriptors" });
    }
  });

  app.put("/api/business/descriptors", async (req, res) => {
    try {
      const { 
        businessDescriptors, 
        culturalBackground, 
        communityFocus, 
        accessibilityFeatures, 
        sustainabilityPractices,
        businessMaturity,
        establishmentType,
        specialtyFeatures,
        priceRange,
        targetDemographics,
        peakHours,
        seasonalPatterns,
        customerCapacity,
        averageVisitDuration,
        primaryProducts,
        uniqueSellingPoints,
        competitorAdvantages,
        marketingGoals,
        customerRetentionRate,
        averageSpendPerCustomer,
        socialMediaPresence,
        eventHostingCapability,
        loyaltyProgramInterest,
        marketingBudget
      } = req.body;
      const businessId = req.body.businessId || "demo_business_1";
      
      // In a real implementation, this would update the database
      res.json({
        success: true,
        message: "Business descriptors updated successfully",
        descriptors: {
          businessDescriptors,
          culturalBackground,
          communityFocus,
          accessibilityFeatures,
          sustainabilityPractices,
          businessMaturity,
          establishmentType,
          specialtyFeatures,
          priceRange,
          targetDemographics,
          peakHours,
          seasonalPatterns,
          customerCapacity,
          averageVisitDuration,
          primaryProducts,
          uniqueSellingPoints,
          competitorAdvantages,
          marketingGoals,
          customerRetentionRate,
          averageSpendPerCustomer,
          socialMediaPresence,
          eventHostingCapability,
          loyaltyProgramInterest,
          marketingBudget
        }
      });
    } catch (error) {
      console.error("Error updating business descriptors:", error);
      res.status(500).json({ error: "Failed to update business descriptors" });
    }
  });

  // AI-powered inclusive challenge generation
  app.get("/api/challenges/community-focused", async (req, res) => {
    try {
      const challenges = [
        {
          id: "community_1",
          title: "Local Heritage Trail",
          description: "Discover businesses celebrating diverse cultural traditions",
          type: "cultural_exploration",
          participants: 234,
          businesses: [
            { name: "Casa Maria's Authentic Tacos", cultural: "Hispanic/Latino heritage" },
            { name: "Seoul Garden Korean BBQ", cultural: "Asian heritage" },
            { name: "Nonna's Italian Deli", cultural: "European heritage" }
          ],
          rewards: "Cultural appreciation badges + community celebration invite",
          focusArea: "Cultural diversity celebration",
          inclusiveAspect: "Highlighting businesses from different cultural backgrounds"
        },
        {
          id: "community_2", 
          title: "Accessibility Champions Challenge",
          description: "Support businesses leading in accessibility and inclusion",
          type: "accessibility_focus",
          participants: 156,
          businesses: [
            { name: "Sunshine Cafe", features: "Full wheelchair access + braille menus" },
            { name: "Quiet Corner Bookstore", features: "Sensory-friendly environment" },
            { name: "Helping Hands Market", features: "ASL interpretation + large print" }
          ],
          rewards: "Accessibility advocate badge + priority business partnerships",
          focusArea: "Accessibility and inclusion",
          inclusiveAspect: "Promoting businesses that prioritize accessibility"
        },
        {
          id: "community_3",
          title: "Local Entrepreneur Spotlight",
          description: "Support homegrown businesses building our community",
          type: "entrepreneur_support",
          participants: 289,
          businesses: [
            { name: "Sarah's Sustainable Bakery", owner: "Women-owned, zero waste focus" },
            { name: "Veterans Coffee Co.", owner: "Veteran-owned, community gathering space" },
            { name: "Rainbow Community Market", owner: "LGBTQ+ owned, local employment focus" }
          ],
          rewards: "Community builder badge + featured business networking",
          focusArea: "Local entrepreneurship",
          inclusiveAspect: "Supporting diverse business ownership"
        },
        {
          id: "community_4",
          title: "New Business Discovery Trail",
          description: "Be among the first to discover and support new local businesses",
          type: "new_business_support",
          participants: 178,
          businesses: [
            { name: "Fresh Start Smoothie Bar", maturity: "New business (6 months)", features: "Organic ingredients, outdoor seating" },
            { name: "Corner Craft Studio", maturity: "New business (1 year)", features: "Local artist classes, community events" },
            { name: "Digital Nomad Cafe", maturity: "New business (8 months)", features: "24/7 WiFi, co-working space" }
          ],
          rewards: "Early adopter badge + new business loyalty perks",
          focusArea: "Supporting new entrepreneurs",
          inclusiveAspect: "Helping new businesses establish customer base"
        },
        {
          id: "community_5",
          title: "Legacy Business Heritage Walk",
          description: "Honor businesses that have shaped our community for generations",
          type: "legacy_business_celebration",
          participants: 312,
          businesses: [
            { name: "Murphy's Five & Dime", maturity: "Legacy business (60 years)", heritage: "Family-owned since 1964" },
            { name: "Giuseppe's Traditional Deli", maturity: "Multi-generational family business", heritage: "Italian recipes passed down 3 generations" },
            { name: "Riverside Hardware", maturity: "Veteran business (35 years)", heritage: "Community fixture, local expertise" }
          ],
          rewards: "Heritage keeper badge + legacy business history collection",
          focusArea: "Celebrating community history",
          inclusiveAspect: "Honoring businesses that built our community"
        },
        {
          id: "community_6",
          title: "Budget-Friendly Finds Challenge",
          description: "Discover amazing value at local budget-friendly businesses",
          type: "budget_conscious",
          participants: 445,
          businesses: [
            { name: "Student Corner Cafe", priceRange: "Budget-friendly ($)", features: "Student discounts, study-friendly" },
            { name: "Family Pack Market", priceRange: "Budget-friendly ($)", features: "Bulk buying, family deals" },
            { name: "Happy Hour Hub", priceRange: "Budget-friendly ($)", features: "Daily specials, group discounts" }
          ],
          rewards: "Smart shopper badge + exclusive budget deals",
          focusArea: "Affordable local options",
          inclusiveAspect: "Supporting accessible community businesses"
        }
      ];
      
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching community challenges:", error);
      res.status(500).json({ error: "Failed to fetch community challenges" });
    }
  });

  // Cirql Platform API routes
  app.post("/api/cirql/tap", async (req, res) => {
    try {
      const { tagIdentifier, tagId, customerEmail, customerName, deviceFingerprint, latitude, longitude } = req.body;
      if (!customerEmail) {
        return res.status(400).json({ error: "customerEmail is required" });
      }

      // Resolve the scanned tag by its printed identifier (preferred) or internal id.
      const tag = tagIdentifier
        ? await storage.getNFCTagByIdentifier(tagIdentifier)
        : tagId
        ? await storage.getNFCTag(tagId)
        : undefined;
      if (!tag) {
        return res.status(404).json({ error: "Unknown or unregistered Cirql tag" });
      }
      if (tag.isActive === false) {
        return res.status(400).json({ error: "This Cirql tag is not active" });
      }

      const result = await storage.processTap(
        {
          tagId: tag.id,
          businessId: tag.businessId,
          campaignId: tag.campaignId ?? undefined,
          customerEmail: String(customerEmail).toLowerCase().trim(),
          customerName,
          deviceFingerprint: typeof deviceFingerprint === "string" ? deviceFingerprint : undefined,
        },
        {
          latitude: typeof latitude === "number" ? latitude : undefined,
          longitude: typeof longitude === "number" ? longitude : undefined,
        }
      );

      if (!result.success) {
        // Map the anti-abuse reason to an HTTP status.
        const status =
          result.reason === "too_far" || result.reason === "location_required"
            ? 403
            : result.reason === "device_throttled" || result.reason === "cooldown"
            ? 429
            : 400;
        return res.status(status).json({ platform: "cirql", success: false, reason: result.reason, message: result.message });
      }

      const broadcast = (global as any).broadcastToClients;
      if (broadcast) broadcast({ type: "new_tap", data: result });

      res.json({
        platform: "cirql",
        success: true,
        reward: result.reward ?? null,
        pointsEarned: result.pointsEarned ?? 0,
        groupProgress: result.groupProgress ?? [],
        message: result.message,
      });
    } catch (error) {
      console.error("Cirql tap error:", error);
      res.status(500).json({ error: "Failed to process Cirql tap" });
    }
  });

  app.get("/api/cirql/analytics", async (req, res) => {
    try {
      const analytics = {
        platform: "cirql",
        totalTaps: 15234,
        activeCampaigns: 127,
        rewardsGiven: 8945,
        conversionRate: 18.7
      };
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Cirql analytics" });
    }
  });

  // InSpektAI Platform API routes
  app.get("/api/inspekt/insights", async (req, res) => {
    try {
      // Same API key, different platform functionality
      const insights = {
        platform: "inspektai",
        customerSegments: [
          { name: "Frequent Visitors", size: 234, growthRate: 12.5 },
          { name: "Deal Seekers", size: 189, growthRate: 8.3 },
          { name: "Premium Customers", size: 67, growthRate: 15.7 }
        ],
        recommendations: [
          "Launch a loyalty program for Frequent Visitors to increase retention",
          "Create limited-time offers targeting Deal Seekers during off-peak hours"
        ],
        trendAnalysis: {
          peakHours: ["11:00-13:00", "17:00-19:00"],
          seasonalTrends: "Holiday season showing 40% increase in engagement",
          conversionRate: 23.4
        }
      };
      res.json(insights);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch InSpektAI insights" });
    }
  });

  app.post("/api/inspekt/analyze", async (req, res) => {
    try {
      const { data, analysisType } = req.body;
      const analysis = {
        platform: "inspektai",
        analysisId: "analysis_" + Math.random().toString(36).substring(2, 18),
        status: "completed",
        results: {
          confidence: 94.2,
          insights: ["High customer satisfaction detected", "Peak traffic on weekends"],
          recommendations: ["Increase weekend staffing", "Launch customer retention program"]
        }
      };
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to process InSpektAI analysis" });
    }
  });

  // Map API routes
  app.get("/api/map/businesses", async (req, res) => {
    try {
      const all = await storage.getBusinesses();
      // CHR-66: a business is featured if a coordinator promoted it (CHR-54
      // isFeatured) OR it holds the map_priority add-on entitlement.
      const boosted = await storage.getBusinessIdsWithAddon("map_priority");
      // Only businesses that have been geocoded can appear as map markers.
      const mapBusinesses = all
        .filter((b) => b.latitude != null && b.longitude != null)
        .map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          lat: b.latitude,
          lng: b.longitude,
          description: b.description,
          category: (b.establishmentType && b.establishmentType[0]) || "business",
          isActive: b.isActive ?? true,
          featured: (b.isFeatured ?? false) || boosted.has(b.id), // CHR-54 coordinator + CHR-66 add-on
        }));
      res.json(mapBusinesses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.get("/api/map/tap-trails", async (req, res) => {
    try {
      const tapTrails = [
        {
          id: "trail1",
          name: "Downtown Coffee & Eats",
          businesses: ["1", "2"],
          totalReward: 250,
          difficulty: "easy",
          estimatedTime: "45 minutes",
          theme: "Food & Drink"
        },
        {
          id: "trail2", 
          name: "Wellness & Fitness Journey",
          businesses: ["4", "5"],
          totalReward: 350,
          difficulty: "medium",
          estimatedTime: "2 hours",
          theme: "Health & Wellness"
        },
        {
          id: "trail3",
          name: "Complete Downtown Experience",
          businesses: ["1", "2", "3", "4"],
          totalReward: 500,
          difficulty: "hard",
          estimatedTime: "3 hours",
          theme: "Full Experience"
        }
      ];
      res.json(tapTrails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tap trails" });
    }
  });

  // Marketing Suite endpoints
  app.get("/api/marketing/campaigns", async (req, res) => {
    try {
      const campaigns = [
        {
          id: "camp1",
          name: "Weekend Coffee Special",
          type: "email",
          status: "active",
          sent: 2847,
          opened: 1943,
          clicked: 421,
          revenue: 3420,
          scheduledDate: "2024-01-15T10:00:00",
          audience: "Frequent Visitors"
        },
        {
          id: "camp2", 
          name: "New Customer Welcome",
          type: "sms",
          status: "scheduled",
          sent: 0,
          opened: 0,
          clicked: 0,
          revenue: 0,
          scheduledDate: "2024-01-18T14:00:00",
          audience: "New Customers"
        }
      ];
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/marketing/campaigns", async (req, res) => {
    try {
      const { name, type, content, targetAudience, scheduledDate, budget } = req.body;
      
      // In real implementation, this would create the campaign and integrate with external services
      const campaign = {
        id: `camp_${Date.now()}`,
        name,
        type,
        content,
        targetAudience,
        scheduledDate,
        budget,
        status: "scheduled",
        createdAt: new Date().toISOString()
      };

      // Simulate integration with external marketing platforms
      const integrations = {
        email: "Mailchimp API integration",
        sms: "Twilio API integration", 
        social: "Facebook/Instagram API integration",
        push: "Firebase Cloud Messaging integration",
        retargeting: "Google Ads API integration"
      };

      res.json({
        success: true,
        campaign,
        integration: integrations[type as keyof typeof integrations],
        message: `Campaign created and scheduled with ${integrations[type as keyof typeof integrations]}`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.get("/api/marketing/audiences", async (req, res) => {
    try {
      const audiences = [
        {
          id: "freq_visitors",
          name: "Frequent Visitors",
          count: 847,
          description: "Customers with 5+ visits this month",
          criteria: { visits: { min: 5, period: "month" } }
        },
        {
          id: "high_value",
          name: "High-Value Customers", 
          count: 234,
          description: "Customers spending $100+ monthly",
          criteria: { spending: { min: 100, period: "month" } }
        },
        {
          id: "new_customers",
          name: "New Customers",
          count: 456,
          description: "First visit within last 30 days",
          criteria: { firstVisit: { within: "30 days" } }
        }
      ];
      res.json(audiences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audiences" });
    }
  });

  app.get("/api/marketing/analytics", async (req, res) => {
    try {
      const analytics = {
        totalCustomers: 2847,
        emailOpenRate: 68.3,
        campaignROI: "4.2x",
        activeCampaigns: 7,
        totalRevenue: 12847,
        conversionRate: 14.8,
        averageOrderValue: 42.50,
        customerLifetimeValue: 185.30
      };
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/marketing/integrations", async (req, res) => {
    try {
      const integrations = [
        {
          id: "mailchimp",
          name: "Mailchimp",
          type: "email",
          connected: true,
          apiKey: "****",
          lastSync: "2024-01-15T10:30:00Z"
        },
        {
          id: "instagram",
          name: "Instagram Business",
          type: "social",
          connected: true,
          apiKey: "****",
          lastSync: "2024-01-15T09:45:00Z"
        },
        {
          id: "google_ads",
          name: "Google Ads",
          type: "advertising",
          connected: true,
          apiKey: "****",
          lastSync: "2024-01-15T08:20:00Z"
        }
      ];
      res.json(integrations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch integrations" });
    }
  });

  // Customer data export for marketing
  app.get("/api/marketing/export", async (req, res) => {
    try {
      const { format, segment, dateRange } = req.query;
      
      // In real implementation, this would export customer data in various formats
      // with proper privacy compliance and data protection
      const exportData = {
        exportId: `export_${Date.now()}`,
        format: format || "csv",
        segment: segment || "all",
        dateRange: dateRange || "last_30_days",
        status: "processing",
        downloadUrl: null,
        estimatedSize: "2.3 MB",
        estimatedRecords: 2847
      };

      res.json(exportData);
    } catch (error) {
      res.status(500).json({ error: "Failed to initiate data export" });
    }
  });

  // Global search endpoint
}
