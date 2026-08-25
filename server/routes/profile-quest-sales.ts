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

export function registerProfileQuestSalesRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

  // Profile Setup Endpoints
  app.post("/api/profile/setup", async (req, res) => {
    try {
      const profileData = req.body;
      
      // Store profile data (using memory storage for now)
      const profile = {
        id: Math.random().toString(36).substr(2, 9),
        ...profileData,
        createdAt: new Date().toISOString(),
        setupComplete: true
      };
      
      // In a real app, you'd save this to database
      console.log("Profile setup completed:", profile);
      
      res.json({ success: true, profile });
    } catch (error) {
      console.error("Profile setup error:", error);
      res.status(500).json({ error: "Failed to save profile" });
    }
  });

  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const user: any = await storage.getUser((req.user as any).id);
      if (!user) return res.status(404).json({ error: "User not found" });
      // Best-effort business name from the user's first owned business.
      const businesses = await storage.getBusinessesByOwner(user.id).catch(() => []);
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        contactName: user.firstName,
        email: user.email,
        businessName: businesses[0]?.name ?? null,
        businessTitle: businesses.length ? "Owner" : null,
        setupComplete: Boolean(user.firstName && businesses.length),
        subscriptionTier: user.subscriptionTier,
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Export & Integration Hub API endpoints
  app.post("/api/exports/generate", async (req, res) => {
    try {
      const { type, config } = req.body;
      
      // Simulate export generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const timestamp = new Date().toISOString().split('T')[0];
      const formats: Record<string, string> = {
        csv: 'csv',
        xlsx: 'xlsx',
        pdf: 'pdf',
        json: 'json'
      };

      const exportFiles: Record<string, string> = {
        customers: `customer-database-${timestamp}.${formats[config.format]}`,
        financial: `financial-summary-${timestamp}.${formats[config.format]}`,
        campaigns: `campaign-analytics-${timestamp}.${formats[config.format]}`,
        'business-intelligence': `business-intelligence-report-${timestamp}.${formats[config.format]}`
      };
      
      res.json({
        success: true,
        filename: exportFiles[type] || `export-${timestamp}.${formats[config.format]}`,
        downloadUrl: `/api/downloads/${exportFiles[type]}`,
        size: "2.4 MB",
        recordCount: type === 'customers' ? 1247 : type === 'financial' ? 523 : 89
      });
    } catch (error) {
      console.error("Export generation error:", error);
      res.status(500).json({ error: "Failed to generate export" });
    }
  });

  app.post("/api/integrations/:platform/connect", async (req, res) => {
    try {
      const { platform } = req.params;
      
      // Simulate OAuth URL generation for different platforms
      const authUrls: Record<string, string> = {
        quickbooks: "https://appcenter.intuit.com/connect/oauth2?client_id=Q123&scope=com.intuit.quickbooks.accounting&redirect_uri=https://cirqlback.com/integrations/quickbooks/callback",
        mailchimp: "https://login.mailchimp.com/oauth2/authorize?response_type=code&client_id=MC123&redirect_uri=https://cirqlback.com/integrations/mailchimp/callback",
        hubspot: "https://app.hubspot.com/oauth/authorize?client_id=HS123&scope=contacts&redirect_uri=https://cirqlback.com/integrations/hubspot/callback",
        shopify: "https://myshop.myshopify.com/admin/oauth/authorize?client_id=SH123&scope=read_products,read_orders&redirect_uri=https://cirqlback.com/integrations/shopify/callback",
        salesforce: "https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=SF123&redirect_uri=https://cirqlback.com/integrations/salesforce/callback"
      };
      
      res.json({
        success: true,
        authUrl: authUrls[platform] || `https://example.com/oauth/${platform}`,
        platform: platform,
        status: "pending_auth"
      });
    } catch (error) {
      console.error("Integration connection error:", error);
      res.status(500).json({ error: "Failed to initiate integration" });
    }
  });

  app.get("/api/integrations/status", async (req, res) => {
    try {
      // Return current integration status
      res.json({
        quickbooks: { connected: false, lastSync: null },
        mailchimp: { connected: true, lastSync: "2024-01-15T10:30:00Z", contactCount: 1247 },
        hubspot: { connected: false, lastSync: null },
        'google-analytics': { connected: true, lastSync: "2024-01-15T09:15:00Z" },
        shopify: { connected: false, lastSync: null },
        salesforce: { connected: false, lastSync: null }
      });
    } catch (error) {
      console.error("Integration status error:", error);
      res.status(500).json({ error: "Failed to get integration status" });
    }
  });

  // Business Intelligence Suite API endpoints
  app.get("/api/business-intelligence/metrics", async (req, res) => {
    try {
      res.json({
        aiPerformanceScore: 94,
        revenueImpact: 47200,
        customerSatisfaction: 4.8,
        activeAutomations: 156,
        optimizationRate: 89,
        aiRecommendations: 23,
        weeklyAiRevenue: 12400,
        predictiveAccuracy: 94,
        automationSavings: 15600,
        customerRetention: 87,
        marketShareGrowth: 23
      });
    } catch (error) {
      console.error("Business Intelligence metrics error:", error);
      res.status(500).json({ error: "Failed to fetch business intelligence metrics" });
    }
  });

  app.get("/api/automation/stats", async (req, res) => {
    try {
      res.json({
        totalAutomations: 156,
        activeAutomations: 143,
        automationCategories: {
          marketing: 45,
          customer_service: 32,
          operations: 28,
          analytics: 21,
          inventory: 18,
          staff_management: 12
        },
        performanceMetrics: {
          timeSaved: "147 hours/week",
          errorReduction: "89%",
          customerResponseTime: "2.3 minutes",
          revenueIncrease: "23%"
        }
      });
    } catch (error) {
      console.error("Automation stats error:", error);
      res.status(500).json({ error: "Failed to fetch automation statistics" });
    }
  });

  app.post("/api/ai/generate-insights", async (req, res) => {
    try {
      // Simulate AI insight generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const insights = [
        {
          type: "revenue_opportunity",
          title: "Increase Tuesday Revenue",
          description: "Data shows 34% lower foot traffic on Tuesdays. Consider launching a 'Tuesday Special' promotion.",
          impact: "Potential +$2,400 monthly revenue",
          confidence: 89,
          actionable: true
        },
        {
          type: "customer_retention",
          title: "At-Risk Customer Alert",
          description: "23 high-value customers haven't visited in 21+ days. Automated win-back campaign recommended.",
          impact: "Prevent $8,900 in lost revenue",
          confidence: 94,
          actionable: true
        },
        {
          type: "operational_efficiency",
          title: "Staff Optimization",
          description: "Peak hours analysis suggests adjusting staff schedule to reduce wait times by 40%.",
          impact: "Improve customer satisfaction 15%",
          confidence: 87,
          actionable: true
        }
      ];
      
      res.json({
        success: true,
        insights,
        generatedAt: new Date().toISOString(),
        totalImpact: "$11,300 potential monthly improvement"
      });
    } catch (error) {
      console.error("AI insights generation error:", error);
      res.status(500).json({ error: "Failed to generate AI insights" });
    }
  });

  // Quest System API Endpoints
  app.get("/api/quest/player-stats", (req, res) => {
    res.json({
      username: "QuestMaster",
      level: 12,
      totalPoints: 15670,
      questStreak: 7,
      levelProgress: 68,
      businessesVisited: 23,
      leaderboardRank: 42
    });
  });

  app.get("/api/quest/collection", (req, res) => {
    res.json({
      totalItems: 18,
      items: [
        {
          id: "charm_001",
          name: "Lucky Penny",
          type: "common",
          rarity: 45,
          power: 15,
          description: "A shiny penny that brings good fortune to your quest adventures.",
          unlockMethod: "Visit Joe's Coffee Shop 5 times",
          category: "luck"
        },
        {
          id: "power_001", 
          name: "Business Blade",
          type: "rare",
          rarity: 15,
          power: 85,
          description: "A powerful sword that increases rewards from business visits.",
          unlockMethod: "Complete 25 business check-ins",
          category: "power"
        },
        {
          id: "charm_002",
          name: "Golden Cirql",
          type: "epic",
          rarity: 8,
          power: 120,
          description: "A mystical golden circle that amplifies all quest bonuses.",
          unlockMethod: "Achieve 50-day quest streak",
          category: "charm"
        },
        {
          id: "speed_001",
          name: "Lightning Tap",
          type: "legendary",
          rarity: 2,
          power: 200,
          description: "Legendary item that doubles tap speed and quest completion rates.",
          unlockMethod: "Win monthly leaderboard championship",
          category: "speed"
        },
        {
          id: "luck_001",
          name: "Fortune Star",
          type: "rare",
          rarity: 12,
          power: 75,
          description: "A brilliant star that increases rare item drop chances.",
          unlockMethod: "Find hidden treasure at 10 different businesses",
          category: "luck"
        },
        {
          id: "power_002",
          name: "Merchant's Crown",
          type: "epic",
          rarity: 5,
          power: 150,
          description: "Royal crown that grants VIP status at all partner businesses.",
          unlockMethod: "Spend $500+ through Cirqlback rewards",
          category: "power"
        }
      ]
    });
  });

  app.get("/api/quest/achievements", (req, res) => {
    res.json({
      completed: 8,
      list: [
        {
          id: "ach_001",
          name: "First Steps",
          description: "Complete your first business visit",
          progress: 1,
          target: 1,
          reward: "Lucky Charm + 100 Quest Points",
          completed: true,
          category: "beginner"
        },
        {
          id: "ach_002", 
          name: "Local Explorer",
          description: "Visit 10 different businesses",
          progress: 7,
          target: 10,
          reward: "Explorer Badge + 500 Quest Points",
          completed: false,
          category: "exploration"
        },
        {
          id: "ach_003",
          name: "Streak Master",
          description: "Maintain a 30-day quest streak",
          progress: 7,
          target: 30,
          reward: "Legendary Time Crystal",
          completed: false,
          category: "dedication"
        },
        {
          id: "ach_004",
          name: "Community Champion",
          description: "Refer 5 friends to Cirqlback",
          progress: 2,
          target: 5,
          reward: "Champion Crown + 1000 Quest Points",
          completed: false,
          category: "social"
        },
        {
          id: "ach_005",
          name: "Discovery Explorer",
          description: "Find 25 hidden quest items",
          progress: 11,
          target: 25,
          reward: "Legendary Treasure Map",
          completed: false,
          category: "collection"
        }
      ]
    });
  });

  app.get("/api/quest/leaderboard", (req, res) => {
    res.json([
      { id: "1", username: "QuestKing92", level: 28, questPoints: 45230 },
      { id: "2", username: "LocalHero", level: 25, questPoints: 41850 },
      { id: "3", username: "TapMaster", level: 22, questPoints: 38920 },
      { id: "4", username: "CirqlChamp", level: 21, questPoints: 35670 },
      { id: "5", username: "BusinessBee", level: 19, questPoints: 32410 },
      { id: "6", username: "QuestMaster", level: 12, questPoints: 15670 },
      { id: "7", username: "LocalLegend", level: 18, questPoints: 28350 },
      { id: "8", username: "TapTitan", level: 17, questPoints: 26890 }
    ]);
  });

  app.get("/api/quest/daily-quests", (req, res) => {
    res.json([
      {
        id: "daily_001",
        title: "Coffee Connoisseur",
        description: "Visit 3 coffee shops today",
        progress: 67,
        currentCount: 2,
        targetCount: 3,
        reward: 250,
        completed: false
      },
      {
        id: "daily_002", 
        title: "Social Butterfly",
        description: "Share 1 business on social media",
        progress: 100,
        currentCount: 1,
        targetCount: 1,
        reward: 150,
        completed: true
      },
      {
        id: "daily_003",
        title: "Team Player",
        description: "Complete 2 team challenges",
        progress: 50,
        currentCount: 1, 
        targetCount: 2,
        reward: 300,
        completed: false
      },
      {
        id: "daily_004",
        title: "Treasure Seeker",
        description: "Find 1 hidden AR treasure",
        progress: 0,
        currentCount: 0,
        targetCount: 1,
        reward: 400,
        completed: false
      }
    ]);
  });

  app.post("/api/quest/claim-reward", (req, res) => {
    const { achievementId } = req.body;
    res.json({ 
      success: true, 
      message: "Reward claimed successfully!",
      newItems: ["Lucky Charm", "100 Quest Points"]
    });
  });

  // AR Games API Endpoints
  app.post('/api/ar-games/join', async (req, res) => {
    try {
      const { gameId } = req.body;
      
      const joinResult = {
        success: true,
        gameId,
        sessionId: `ar_session_${Date.now()}`,
        arInstructions: {
          message: "Point your camera at participating businesses to start!",
          requiredPermissions: ["camera", "location"],
          gameType: gameId.includes('treasure') ? 'treasure-hunt' : 'team-challenge'
        },
        rewards: {
          basePoints: 250,
          merchantBonus: 500
        }
      };
      
      res.json(joinResult);
    } catch (error) {
      res.status(500).json({ error: "Failed to join AR game" });
    }
  });

  app.post('/api/ar-games/join-mission', async (req, res) => {
    try {
      const { missionId } = req.body;
      
      const missionResult = {
        success: true,
        missionId,
        businessLocation: {
          lat: 40.7128,
          lng: -74.0060,
          address: "123 Main St, New York, NY"
        },
        arContent: {
          modelUrl: "/ar-models/treasure-chest.glb", 
          instructions: "Look for the golden treasure chest near the entrance!",
          hints: ["Check behind the counter", "Look up high", "Near the window display"]
        },
        rewards: {
          points: 800,
          businessDiscount: "20% off your next visit",
          exclusiveItem: "Golden Business Badge"
        }
      };
      
      res.json(missionResult);
    } catch (error) {
      res.status(500).json({ error: "Failed to join mission" });
    }
  });

  // SALES DATA INPUT SYSTEM API ENDPOINTS

  // Add sales data
  app.post('/api/sales-data', async (req, res) => {
    try {
      const salesDataInput = insertSalesDataSchema.parse(req.body);
      const salesRecord = await storage.addSalesData(salesDataInput);
      res.json(salesRecord);
    } catch (error) {
      console.error('Error adding sales data:', error);
      res.status(400).json({ error: 'Failed to add sales data' });
    }
  });

  // Get sales data for a business
  app.get('/api/sales-data/:businessId', async (req, res) => {
    try {
      const { businessId } = req.params;
      const salesRecords = await storage.getSalesData(businessId);
      res.json(salesRecords);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      res.status(500).json({ error: 'Failed to fetch sales data' });
    }
  });

  // Get real vs platform comparison data
  app.get('/api/analytics/real-comparison/:businessId', async (req, res) => {
    try {
      const { businessId } = req.params;
      const comparison = await storage.getRealVsPlatformComparison(businessId);
      res.json(comparison);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
      res.status(500).json({ error: 'Failed to fetch comparison data' });
    }
  });

  // Add business goal
  app.post('/api/business-goals', async (req, res) => {
    try {
      const goalInput = insertBusinessGoalsSchema.parse(req.body);
      const goal = await storage.addBusinessGoal(goalInput);
      res.json(goal);
    } catch (error) {
      console.error('Error adding business goal:', error);
      res.status(400).json({ error: 'Failed to add business goal' });
    }
  });

  // Get business goals
  app.get('/api/business-goals/:businessId', async (req, res) => {
    try {
      const { businessId } = req.params;
      const goals = await storage.getBusinessGoals(businessId);
      res.json(goals);
    } catch (error) {
      console.error('Error fetching business goals:', error);
      res.status(500).json({ error: 'Failed to fetch business goals' });
    }
  });
}
