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

export function registerEngagementRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      let businessId = (req.query.businessId as string) || undefined;
      const customerEmail = (req.query.customerEmail as string) || undefined;

      // Scope to the authenticated user's business when no explicit id is
      // supplied; fall back to platform-wide aggregation when logged out.
      if (!businessId && req.user) {
        const owned = await storage.getBusinessesByOwner((req.user as any).id);
        if (owned.length > 0) businessId = owned[0].id;
      }

      const analytics = await storage.getBusinessAnalytics(businessId, customerEmail);
      res.json(analytics);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Community routes
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard(10);
      res.json(leaderboard);
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Community routes - daily challenges with real per-user progress (CHR-28)
  app.get("/api/community/challenges", async (req, res) => {
    try {
      const email = (req.user as any)?.email as string | undefined;
      const challenges = await storage.getDailyChallenges(email);
      res.json(challenges);
    } catch (error) {
      console.error("Challenges fetch error:", error);
      res.status(500).json({ error: "Failed to fetch challenges" });
    }
  });

  app.get("/api/social-feed", async (req, res) => {
    try {
      // Mock social feed data
      const feed = [
        {
          id: 1,
          author: { name: "Sarah Chen", tier: "Platinum", avatar: null },
          content: "Just discovered an amazing new bakery downtown! The Cirql tap reward was perfect timing ✨",
          timeAgo: "2 hours ago",
          likes: 24,
          comments: 5
        },
        {
          id: 2,
          author: { name: "Mike Johnson", tier: "Gold", avatar: null },
          content: "Completed the Coffee Trail challenge! Thanks to everyone who recommended great spots 🚀",
          timeAgo: "5 hours ago",
          likes: 18,
          comments: 3
        }
      ];
      res.json(feed);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch social feed" });
    }
  });

  app.get("/api/challenges", async (req, res) => {
    // Redirect to community challenges
    res.redirect(301, "/api/community/challenges");
  });

  app.get("/api/user-stats", async (req, res) => {
    try {
      const userId = (req.user as any)?.id as string | undefined;
      if (!userId) {
        // Logged-out visitors see an empty/default scoreboard, not fake data.
        return res.json({
          rank: 0,
          totalPoints: 0,
          totalPointsEarned: 0,
          availablePoints: 0,
          tier: "Bronze",
          level: 1,
          currentStreak: 0,
          challengesCompleted: 0,
          referralCode: null,
          earnedThisMonth: 0,
        });
      }
      const stats = await storage.getUserGamificationStats(userId);
      res.json(stats ?? {});
    } catch (error) {
      console.error("User stats fetch error:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  });

  // AI Admin Insights endpoint
  app.post("/api/ai/admin-insights", async (req, res) => {
    try {
      const platformData = req.body;
      
      const insights = await openaiService.generateAdminInsights(platformData);
      res.json({ insights });
    } catch (error) {
      console.error("AI admin insights error:", error);
      res.status(500).json({ error: "Failed to generate admin insights" });
    }
  });

  // Testing System API routes
  app.get("/api/test/users", async (req, res) => {
    try {
      const testUsers = [
        {
          id: "user_1",
          name: "Alex Thompson",
          email: "alex@test.com",
          role: "customer",
          points: 2450,
          tier: "Silver",
          location: "Downtown Seattle",
          challengesCompleted: 12,
          campaignsCreated: 0
        },
        {
          id: "user_2", 
          name: "Jordan Martinez",
          email: "jordan@test.com",
          role: "customer",
          points: 3200,
          tier: "Gold", 
          location: "Capitol Hill Seattle",
          challengesCompleted: 18,
          campaignsCreated: 0
        }
      ];
      res.json(testUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test users" });
    }
  });

  app.get("/api/test/campaigns", async (req, res) => {
    try {
      const testCampaigns = [
        {
          id: "camp_1",
          name: "Coffee Loyalty Rewards",
          businessId: "biz_1",
          businessName: "Grind Coffee Co.",
          type: "loyalty",
          status: "active",
          participants: 89,
          rewards: "Buy 10 get 1 free coffee",
          endDate: "2025-03-15"
        },
        {
          id: "camp_2",
          name: "Winter Adventure Challenge",
          businessId: "biz_2", 
          businessName: "Summit Outdoor Gear",
          type: "seasonal",
          status: "active",
          participants: 156,
          rewards: "25% off winter gear",
          endDate: "2025-02-28"
        },
        {
          id: "camp_3",
          name: "Discovery Challenge",
          businessId: "biz_1",
          businessName: "Grind Coffee Co.",
          type: "ar-experience",
          status: "active", 
          participants: 67,
          rewards: "Free pastry + coffee",
          endDate: "2025-02-20"
        }
      ];
      res.json(testCampaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test campaigns" });
    }
  });

  app.post("/api/test/tap-simulation", async (req, res) => {
    try {
      const { userId, campaignId } = req.body;
      const pointsEarned = Math.floor(Math.random() * 100) + 50;
      
      res.json({
        success: true,
        pointsEarned,
        message: `User ${userId} tapped campaign ${campaignId} and earned ${pointsEarned} points`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to simulate tap" });
    }
  });

  // Settings API routes
}
