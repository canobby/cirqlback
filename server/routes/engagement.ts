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
      const timeRange = req.query.range as string || "7d";
      const businessId = req.query.businessId as string;
      const customerEmail = req.query.customerEmail as string;
      
      // Return comprehensive analytics data for testing
      const analytics = {
        totalTaps: Math.floor(Math.random() * 10000) + 1000,
        totalRevenue: Math.floor(Math.random() * 50000) + 5000,
        activeCustomers: Math.floor(Math.random() * 5000) + 500,
        conversionRate: Math.floor(Math.random() * 25) + 5,
        topCampaigns: [
          { id: "demo_campaign_1", name: "Welcome Coffee Reward", taps: 156, revenue: 1250 },
          { id: "demo_campaign_2", name: "Lunch Special", taps: 89, revenue: 890 }
        ],
        recentActivity: [
          { action: "New customer tap at Coffee Corner", timestamp: "2 minutes ago", value: "+50 pts", businessId: businessId || "demo_biz_1" },
          { action: "Campaign 'Free Coffee Friday' completed", timestamp: "5 minutes ago", value: "$25", businessId: businessId || "demo_biz_1" },
          { action: "Referral bonus earned", timestamp: "8 minutes ago", value: "+$5", customerEmail: customerEmail || "demo@example.com" }
        ],
        hourlyData: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          taps: Math.floor(Math.random() * 50) + 10,
          revenue: Math.floor(Math.random() * 500) + 50
        })),
        locationData: [
          { location: "Downtown", taps: 245, revenue: 2450 },
          { location: "Uptown", taps: 156, revenue: 1560 },
          { location: "Midtown", taps: 89, revenue: 890 }
        ],
        customerInsights: {
          newCustomers: 45,
          returningCustomers: 123,
          averageSpend: 15.75,
          topLocation: "Downtown"
        }
      };
      
      res.json(analytics);
    } catch (error) {
      console.error("Analytics fetch error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Community routes
  app.get("/api/leaderboard", async (req, res) => {
    try {
      // Mock leaderboard data
      const leaderboard = [
        { id: 1, name: "Sarah Chen", tier: "Platinum", location: "Downtown", points: 15420, avatar: null },
        { id: 2, name: "Mike Johnson", tier: "Gold", location: "Uptown", points: 12350, avatar: null },
        { id: 3, name: "Emily Davis", tier: "Gold", location: "Midtown", points: 11200, avatar: null },
        { id: 4, name: "Alex Kim", tier: "Silver", location: "West Side", points: 9800, avatar: null },
        { id: 5, name: "Jessica Liu", tier: "Silver", location: "East End", points: 8900, avatar: null }
      ];
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Community routes - challenges
  app.get("/api/community/challenges", async (req, res) => {
    try {
      const challenges = [
        {
          id: 1,
          title: "Coffee Trail Explorer",
          description: "Visit 5 different coffee shops this week",
          difficulty: "Easy",
          progress: 60,
          timeLeft: "3 days",
          participants: 234,
          reward: 500,
          joined: false
        },
        {
          id: 2,
          title: "Local Foodie Challenge",
          description: "Try 10 different restaurants this month",
          difficulty: "Medium",
          progress: 30,
          timeLeft: "12 days",
          participants: 156,
          reward: 1000,
          joined: true
        }
      ];
      res.json(challenges);
    } catch (error) {
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
      // Mock user stats
      const stats = {
        rank: 42,
        totalPoints: 7850,
        tier: "Silver",
        challengesCompleted: 8,
        referralCode: "CIRQL2025",
        earnedThisMonth: 1200
      };
      res.json(stats);
    } catch (error) {
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
