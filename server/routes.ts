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

  // AR Experience endpoints
  app.get("/api/ar/:tagId", async (req, res) => {
    try {
      const { tagId } = req.params;
      const arScene = {
        id: tagId,
        businessId: "1",
        businessName: "Brew & Beans Coffee",
        sceneType: "reward_unlock",
        animation: "coffee_cup_rising",
        rewards: [
          {
            id: "reward1",
            type: "discount",
            title: "Free Coffee Upgrade",
            description: "Upgrade any drink to large size",
            value: "20% off",
            animation: "steaming_cup",
            rarity: "common"
          },
          {
            id: "reward2", 
            type: "badge",
            title: "Coffee Connoisseur",
            description: "Earned for 5th visit this month",
            value: "Achievement Unlocked",
            animation: "golden_badge",
            rarity: "rare"
          }
        ],
        isMultiplayer: false,
        shareEnabled: true
      };
      res.json(arScene);
    } catch (error) {
      res.status(500).json({ error: "Failed to load AR scene" });
    }
  });

  app.post("/api/ar/share", async (req, res) => {
    try {
      const { platform, sceneId, businessId } = req.body;
      // In real implementation, this would generate share links and track viral marketing
      res.json({
        success: true,
        shareUrl: `https://cirqlback.com/shared-ar/${sceneId}`,
        message: `AR experience shared to ${platform} with Cirqlback branding`
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to share AR experience" });
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

      // AR Experience searches
      const arExperiences = [
        { id: "ar1", name: "Golden Coffee Bean Discovery", description: "Rare collectible AR experience", business: "Joe's Coffee Shop" },
        { id: "ar2", name: "Strength Badge Unlock", description: "Achievement progress visualization", business: "Fitness First Gym" },
        { id: "ar3", name: "Taco Trail Completion", description: "Multi-restaurant challenge completion", business: "Taco Libre" }
      ];

      arExperiences.forEach(ar => {
        if (ar.name.toLowerCase().includes(query) || 
            ar.description.toLowerCase().includes(query) ||
            ar.business.toLowerCase().includes(query)) {
          searchResults.push({
            id: ar.id,
            type: 'ar-experience',
            title: ar.name,
            description: `${ar.description} - ${ar.business}`,
            url: `/community?ar=${ar.id}`,
            badge: 'AR Experience'
          });
        }
      });

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
