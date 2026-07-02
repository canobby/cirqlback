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

export function registerProfileSettingsRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = {
        notifications: {
          email: true,
          push: true,
          sms: false,
          marketing: true
        },
        privacy: {
          profileVisible: true,
          locationTracking: true,
          dataSharing: false,
          analyticsOptOut: false
        },
        preferences: {
          theme: "light",
          language: "en",
          currency: "USD",
          timezone: "America/New_York"
        },
        integrations: {
          google: { connected: false },
          facebook: { connected: false },
          instagram: { connected: true, username: "@coffeelover" },
          mailchimp: { connected: true, listId: "abc123" }
        },
        security: {
          twoFactorEnabled: false,
          lastPasswordChange: "2024-01-01T00:00:00Z",
          loginSessions: 3
        }
      };
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const updatedSettings = req.body;
      // In a real app, this would update the user's settings in the database
      res.json({ success: true, message: "Settings updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Campaign interaction route for NFC/QR taps
  app.get("/c/:campaignId", async (req, res) => {
    try {
      const { campaignId } = req.params;
      const campaign = await storage.getCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // For demonstration, redirect to customer page with campaign info
      const customerUrl = `/customer?campaign=${campaignId}`;
      res.redirect(customerUrl);
    } catch (error) {
      res.status(500).json({ error: "Failed to process campaign interaction" });
    }
  });

  // User account and subscription routes — the real signed-in user (no mock).
  app.get("/api/account/profile", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser((req.user as any).id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        apiKey: user.apiKey ?? null,
        apiKeyCreatedAt: user.apiKeyCreatedAt ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      console.error("Account profile error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Customer profile (demographics) — real values from the user row.
  app.get("/api/customer/profile", isAuthenticated, async (req, res) => {
    try {
      const user: any = await storage.getUser((req.user as any).id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        age: user.age ?? null,
        location: user.location ?? null,
        interests: user.interests ?? [],
        shoppingPreferences: user.shoppingPreferences ?? [],
        dietaryRestrictions: user.dietaryRestrictions ?? [],
        spendingHabits: user.spendingHabits ?? null,
        socialMediaActivity: user.socialMediaActivity ?? [],
        referralSource: user.referralSource ?? null,
        preferredContactMethod: user.preferredContactMethod ?? null,
        favoriteBusinessTypes: user.favoriteBusinessTypes ?? [],
        visitFrequency: user.visitFrequency ?? null,
        averageSpendRange: user.averageSpendRange ?? null,
      });
    } catch (error) {
      console.error("Customer profile error:", error);
      res.status(500).json({ error: "Failed to fetch customer profile" });
    }
  });

  app.put("/api/customer/profile", async (req, res) => {
    try {
      const {
        age,
        location,
        interests,
        shoppingPreferences,
        dietaryRestrictions,
        spendingHabits,
        socialMediaActivity,
        referralSource,
        preferredContactMethod,
        favoriteBusinessTypes,
        visitFrequency,
        averageSpendRange
      } = req.body;
      const customerId = (req.user as any).id;
      
      // In a real implementation, this would update the database
      res.json({
        success: true,
        message: "Customer profile updated successfully",
        profile: {
          age,
          location,
          interests,
          shoppingPreferences,
          dietaryRestrictions,
          spendingHabits,
          socialMediaActivity,
          referralSource,
          preferredContactMethod,
          favoriteBusinessTypes,
          visitFrequency,
          averageSpendRange
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update customer profile" });
    }
  });

  app.post("/api/account/generate-api-key", async (req, res) => {
    try {
      // Generate new API key
      const newApiKey = "cirql_live_sk_" + Math.random().toString(36).substring(2, 18);
      res.json({ apiKey: newApiKey, createdAt: new Date() });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate API key" });
    }
  });

  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const plans = [
        {
          id: "starter",
          name: "Starter",
          description: "Try Cirqlback free — a 6-month trial for new businesses",
          price: 0,
          yearlyPrice: 0,
          billingInterval: "monthly",
          trialDuration: "6 months",
          features: ["1 business location", "3 active campaigns", "100 customer taps/month", "Basic tap analytics", "5 Cirql tags included", "QR code generation", "Discovery map listing", "Email support", "6-month free trial"],
          maxBusinesses: 1,
          maxCampaigns: 3,
          maxTaps: 100,
          apiRequestsPerMonth: 1000,
          hasAdvancedAnalytics: false,
          hasAiInsights: false,
          hasPrioritySupport: false,
          hasWebsiteBuilder: false,
          hasTeamChallenges: false
        },
        {
          id: "core",
          name: "Core",
          description: "Everything a local business needs to run loyalty",
          price: 19.99,
          yearlyPrice: 199.90,
          billingInterval: "monthly",
          features: ["1 business location", "Unlimited campaigns", "500 customer taps/month", "Tap & redemption analytics", "20 Cirql tags included", "Solo & multi-store group campaigns", "Discovery map listing", "Email support", "Add-ons available"],
          maxBusinesses: 1,
          maxCampaigns: null,
          maxTaps: 500,
          apiRequestsPerMonth: 10000,
          hasAdvancedAnalytics: false,
          hasAiInsights: false,
          hasPrioritySupport: false,
          hasWebsiteBuilder: false,
          hasTeamChallenges: false
        },
        {
          id: "pro",
          name: "Pro",
          description: "For busy, multi-location businesses that want more",
          price: 49.99,
          yearlyPrice: 499.90,
          billingInterval: "monthly",
          features: ["Everything in Core", "Up to 3 business locations", "Unlimited customer taps", "50 Cirql tags included", "Priority support", "Early access to new features", "Add-ons: analytics, branding, map priority, contests"],
          maxBusinesses: 3,
          maxCampaigns: null,
          maxTaps: null,
          apiRequestsPerMonth: 50000,
          hasAdvancedAnalytics: false,
          hasAiInsights: false,
          hasPrioritySupport: true,
          hasWebsiteBuilder: false,
          hasTeamChallenges: false
        }
      ];
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
  });

  app.get("/api/account/usage", async (req, res) => {
    try {
      const usage = {
        currentPeriod: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
          apiRequests: 12457,
          apiRequestsLimit: 50000
        },
        referralStats: {
          totalReferrals: 8,
          currentRewards: ["Featured Referrer Map Layer", "Priority map placement"],
          nextMilestone: { count: 10, reward: "Priority map placement" }
        },
        recentActivity: [
          {
            endpoint: "/api/cirql/tap",
            method: "POST",
            timestamp: new Date(Date.now() - 2 * 60 * 1000),
            statusCode: 200,
            responseTime: 145
          },
          {
            endpoint: "/api/inspekt/insights",
            method: "GET", 
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            statusCode: 200,
            responseTime: 234
          }
        ],
        monthlyStats: {
          successRate: 98.2,
          avgResponseTime: 145,
          totalRequests: 12457
        }
      };
      res.json(usage);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage statistics" });
    }
  });

  // Avatar API routes
}
