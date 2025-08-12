import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBusinessSchema, insertCampaignSchema, insertNfcTagSchema, insertTapSchema, insertRewardSchema, insertTapTrailSchema, insertReferralSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema, insertApiUsageSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Business routes
  app.get("/api/businesses", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      const businesses = await storage.getBusinessesByOwner(userId);
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.post("/api/businesses", async (req, res) => {
    try {
      const validatedData = insertBusinessSchema.parse(req.body);
      const business = await storage.createBusiness(validatedData);
      res.json(business);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create business" });
    }
  });

  // Campaign routes
  app.get("/api/campaigns", async (req, res) => {
    try {
      const businessId = req.query.businessId as string;
      const campaigns = await storage.getCampaigns(businessId);
      res.json(campaigns);
    } catch (error) {
      console.error("Campaign fetch error:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.patch("/api/campaigns/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const campaign = await storage.updateCampaign(id, updates);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  // NFC Tag routes
  app.get("/api/nfc-tags", async (req, res) => {
    try {
      const businessId = req.query.businessId as string;
      if (!businessId) {
        return res.status(400).json({ error: "Business ID required" });
      }
      const tags = await storage.getNFCTags(businessId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch NFC tags" });
    }
  });

  app.post("/api/nfc-tags", async (req, res) => {
    try {
      const validatedData = insertNfcTagSchema.parse(req.body);
      const tag = await storage.createNFCTag(validatedData);
      res.json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create NFC tag" });
    }
  });

  // Tap routes - simulate NFC tap
  app.post("/api/taps", async (req, res) => {
    try {
      const validatedData = insertTapSchema.parse(req.body);
      
      // Process the tap (this handles reward creation automatically)
      const result = await storage.processTap(validatedData);
      
      if (result.success) {
        // Broadcast real-time update via WebSocket
        const broadcastToClients = (global as any).broadcastToClients;
        if (broadcastToClients) {
          broadcastToClients({
            type: 'new_tap',
            data: result
          });
        }
        
        res.json(result);
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to process tap" });
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
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  app.patch("/api/rewards/:id/redeem", async (req, res) => {
    try {
      const { id } = req.params;
      const reward = await storage.redeemReward(id);
      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }
      res.json(reward);
    } catch (error) {
      res.status(500).json({ error: "Failed to redeem reward" });
    }
  });

  // Tap Trail routes
  app.get("/api/tap-trails", async (req, res) => {
    try {
      const trails = await storage.getTapTrails();
      res.json(trails);
    } catch (error) {
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
  app.get("/api/analytics", async (req, res) => {
    try {
      const timeRange = req.query.range as string || "7d";
      const businessId = req.query.business as string;
      
      // Mock analytics data - replace with real calculations
      const analytics = {
        totalTaps: Math.floor(Math.random() * 10000) + 1000,
        totalRevenue: Math.floor(Math.random() * 50000) + 5000,
        activeCustomers: Math.floor(Math.random() * 5000) + 500,
        conversionRate: Math.floor(Math.random() * 25) + 5,
        topCampaigns: [],
        recentActivity: [
          { action: "New customer tap at Coffee Corner", timestamp: "2 minutes ago", value: "+50 pts" },
          { action: "Campaign 'Free Coffee Friday' completed", timestamp: "5 minutes ago", value: "$25" },
          { action: "Referral bonus earned", timestamp: "8 minutes ago", value: "+$5" }
        ],
        hourlyData: Array.from({ length: 24 }, () => Math.random() * 100),
        locationData: [],
        customerInsights: {}
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

  app.get("/api/challenges", async (req, res) => {
    try {
      // Mock challenges data
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

  // User account and subscription routes
  app.get("/api/account/profile", async (req, res) => {
    try {
      // Mock user profile
      const profile = {
        id: "user_123",
        email: "chris@example.com",
        firstName: "Chris",
        lastName: "Johnson",
        role: "full",
        subscriptionTier: "full",
        subscriptionStatus: "active",
        apiKey: "cirql_live_sk_1234567890abcdef",
        apiKeyCreatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
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
          id: "core",
          name: "Core Cirql Member",
          description: "Essential Cirql features for local businesses",
          price: 14.99,
          yearlyPrice: 149.99,
          billingInterval: "monthly",
          features: ["Basic Cirql tag campaigns", "Customer analytics", "5 active campaigns", "Email support", "1 business location"],
          maxBusinesses: 1,
          maxCampaigns: 5,
          apiRequestsPerMonth: 10000,
          hasAdvancedAnalytics: false,
          hasAiInsights: false,
          hasPrioritySupport: false
        },
        {
          id: "full",
          name: "Full Cirql Member",
          description: "Complete Cirql platform with advanced features",
          price: 29.99,
          yearlyPrice: 299.99,
          billingInterval: "monthly",
          features: ["Unlimited campaigns", "Advanced analytics", "Multi-platform access", "Priority support", "Tap Trails", "Unlimited business locations"],
          maxBusinesses: null,
          maxCampaigns: null,
          apiRequestsPerMonth: 50000,
          hasAdvancedAnalytics: true,
          hasAiInsights: true,
          hasPrioritySupport: true
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

  // Cirql Platform API routes
  app.post("/api/cirql/tap", async (req, res) => {
    try {
      // API key authentication would happen here
      const { tagId, customerEmail } = req.body;
      const response = {
        platform: "cirql",
        success: true,
        reward: {
          type: "discount",
          value: "20% off",
          description: "Great choice! Enjoy 20% off your next purchase.",
          code: "CIRQL20"
        },
        pointsEarned: 50
      };
      res.json(response);
    } catch (error) {
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
      const businesses = [
        {
          id: "1",
          name: "Brew & Bean Coffee",
          address: "123 Main St, Downtown",
          lat: 40.7589,
          lng: -73.9851,
          category: "cafe",
          rating: 4.8,
          activeCampaigns: 3,
          isPartner: true,
          visibilityLevel: "featured",
          referralCount: 12,
          description: "Artisan coffee shop with daily rewards"
        },
        {
          id: "2", 
          name: "Pizza Corner",
          address: "456 Oak Ave, Midtown",
          lat: 40.7614,
          lng: -73.9776,
          category: "restaurant",
          rating: 4.5,
          activeCampaigns: 2,
          isPartner: true,
          visibilityLevel: "priority",
          referralCount: 8,
          description: "Authentic Italian pizza with loyalty rewards"
        },
        {
          id: "3",
          name: "Tech Repair Plus",
          address: "789 Broadway, Tech District", 
          lat: 40.7505,
          lng: -73.9934,
          category: "services",
          rating: 4.9,
          activeCampaigns: 1,
          isPartner: true,
          visibilityLevel: "champion",
          referralCount: 127,
          description: "Phone and laptop repair with instant discounts"
        },
        {
          id: "4",
          name: "Green Leaf Wellness",
          address: "321 Health St, Wellness Zone",
          lat: 40.7282,
          lng: -73.9942,
          category: "wellness",
          rating: 4.7,
          activeCampaigns: 4,
          isPartner: true,
          visibilityLevel: "spotlight",
          referralCount: 34,
          description: "Natural health products and consultations"
        },
        {
          id: "5",
          name: "Urban Fitness Studio",
          address: "555 Gym Street, Fitness District",
          lat: 40.7350,
          lng: -73.9900,
          category: "fitness",
          rating: 4.6,
          activeCampaigns: 2,
          isPartner: true,
          visibilityLevel: "featured",
          referralCount: 7,
          description: "Modern fitness studio with member rewards"
        }
      ];
      res.json(businesses);
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

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Function to broadcast messages to all connected clients
  function broadcastToClients(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Store the broadcast function globally for use in routes
  (global as any).broadcastToClients = broadcastToClients;

  return httpServer;
}
