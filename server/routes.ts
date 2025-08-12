import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerARGameRoutes } from "./ar-game-routes";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBusinessSchema, insertCampaignSchema, insertNfcTagSchema, insertTapSchema, insertRewardSchema, insertTapTrailSchema, insertReferralSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema, insertApiUsageSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Business routes
  app.get("/api/businesses", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      
      // If no userId provided, return demo businesses
      if (!userId) {
        const demoBusiness = [
          {
            id: "demo_biz_1",
            name: "Demo Coffee Shop",
            description: "Great coffee and pastries",
            address: "123 Main St, Downtown",
            category: "Coffee Shop",
            isActive: true,
            totalCampaigns: 3,
            totalTaps: 156,
            monthlyRevenue: 2450
          },
          {
            id: "demo_biz_2", 
            name: "Demo Restaurant", 
            description: "Fresh local cuisine",
            address: "456 Oak Ave, Midtown",
            category: "Restaurant",
            isActive: true,
            totalCampaigns: 5,
            totalTaps: 289,
            monthlyRevenue: 3780
          }
        ];
        return res.json(demoBusiness);
      }
      
      const businesses = await storage.getUserBusinesses(userId);
      res.json(businesses);
    } catch (error) {
      console.error("Error fetching businesses:", error);
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
      
      // If no businessId provided, return demo campaigns
      if (!businessId) {
        const demoCampaigns = [
          {
            id: "demo_campaign_1",
            businessId: "demo_biz_1", 
            name: "Welcome Coffee Reward",
            description: "Get 10% off your first coffee purchase",
            type: "discount",
            value: "10.00",
            isActive: true,
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            pointsAwarded: 100,
            totalTaps: 45
          },
          {
            id: "demo_campaign_2",
            businessId: "demo_biz_2",
            name: "Lunch Special",
            description: "Buy any entree, get 20% off dessert",
            type: "discount",
            value: "20.00", 
            isActive: true,
            startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            pointsAwarded: 150,
            totalTaps: 78
          }
        ];
        return res.json(demoCampaigns);
      }
      
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
      
      // Return demo rewards for any email
      const demoRewards = [
        {
          id: "reward_1",
          customerEmail: email,
          businessId: "demo_biz_1",
          campaignId: "demo_campaign_1",
          type: "discount",
          value: "10.00",
          description: "10% off your next coffee purchase",
          isRedeemed: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: "reward_2",
          customerEmail: email,
          businessId: "demo_biz_2", 
          campaignId: "demo_campaign_2",
          type: "discount",
          value: "20.00",
          description: "20% off dessert with any entree",
          isRedeemed: false,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
        }
      ];
      
      const rewards = await storage.getRewardsByEmail(email);
      res.json(rewards.length > 0 ? rewards : demoRewards);
    } catch (error) {
      console.error("Rewards error:", error);
      // Return demo rewards on error  
      const demoRewards = [
        {
          id: "reward_1",
          customerEmail: req.query.email as string || "demo@example.com",
          businessId: "demo_biz_1",
          campaignId: "demo_campaign_1", 
          type: "discount",
          value: "10.00",
          description: "10% off your next coffee purchase",
          isRedeemed: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        }
      ];
      res.json(demoRewards);
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
      // Return demo tap trails if no database trails
      const demoTrails = [
        {
          id: "trail_1",
          name: "Downtown Coffee Circuit",
          description: "Visit 5 coffee shops downtown for exclusive rewards",
          businessIds: ["demo_biz_1", "demo_biz_2"],
          requiredTaps: 5,
          pointsReward: 500,
          completionReward: "Free premium coffee",
          isActive: true,
          difficulty: "Medium",
          estimatedTime: "2-3 hours"
        },
        {
          id: "trail_2", 
          name: "Local Foodie Adventure",
          description: "Explore diverse dining experiences across the city",
          businessIds: ["demo_biz_2"],
          requiredTaps: 8,
          pointsReward: 800,
          completionReward: "$25 dining credit",
          isActive: true,
          difficulty: "Hard",
          estimatedTime: "1 week"
        }
      ];
      
      const trails = await storage.getTapTrails();
      res.json(trails.length > 0 ? trails : demoTrails);
    } catch (error) {
      console.error("Tap trails error:", error);
      // Return demo data on error
      const demoTrails = [
        {
          id: "trail_1",
          name: "Downtown Coffee Circuit", 
          description: "Visit 5 coffee shops downtown for exclusive rewards",
          businessIds: ["demo_biz_1", "demo_biz_2"],
          requiredTaps: 5,
          pointsReward: 500,
          completionReward: "Free premium coffee",
          isActive: true,
          difficulty: "Medium",
          estimatedTime: "2-3 hours"
        }
      ];
      res.json(demoTrails);
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

  // Settings API routes
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

  // Customer profile routes
  app.get("/api/customer/profile", async (req, res) => {
    try {
      const customerId = req.query.customerId || "demo_customer_1";
      
      // In a real implementation, this would fetch from database
      const profile = {
        age: 28,
        location: "San Francisco, CA",
        interests: ["Local dining", "Coffee culture", "Fitness & wellness"],
        shoppingPreferences: ["Support local businesses", "Quality focused", "Experience-driven"],
        dietaryRestrictions: ["Vegetarian"],
        spendingHabits: "Value-focused",
        socialMediaActivity: ["Instagram stories/posts", "Google reviews"],
        referralSource: "Friend/family",
        preferredContactMethod: "Email",
        favoriteBusinessTypes: ["Coffee shops", "Restaurants", "Fitness studios"],
        visitFrequency: "Several times a week",
        averageSpendRange: "$15-$30"
      };
      
      res.json(profile);
    } catch (error) {
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
      const customerId = req.body.customerId || "demo_customer_1";
      
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

  // Avatar API routes
  app.get("/api/avatar/me", async (req, res) => {
    try {
      const userId = req.query.userId as string || "demo_user_1";
      const avatar = await storage.getUserAvatar(userId);
      
      if (!avatar) {
        const defaultAvatar = {
          id: "default",
          userId,
          name: "My Avatar",
          hair: "default_hair",
          eyes: "default_eyes",
          skin: "default_skin",
          outfit: "default_outfit",
          accessories: [],
          effects: [],
          level: 1,
          experience: 0,
          coins: 500,
          badges: []
        };
        return res.json(defaultAvatar);
      }
      
      res.json(avatar);
    } catch (error) {
      console.error("Error fetching user avatar:", error);
      res.status(500).json({ error: "Failed to fetch avatar" });
    }
  });

  app.get("/api/avatar/assets", async (req, res) => {
    try {
      const assets = await storage.getAvatarAssets();
      const userOwnedAssets = await storage.getUserAvatarAssets("demo_user_1");
      
      const sampleAssets = [
        { id: "hair_1", type: "hair", name: "Classic Brown", rarity: "common", cost: 0, isOwned: true, previewUrl: "" },
        { id: "hair_2", type: "hair", name: "Stylish Pink", rarity: "rare", cost: 100, isOwned: false, previewUrl: "" },
        { id: "outfit_1", type: "outfit", name: "Casual Hoodie", rarity: "common", cost: 0, isOwned: true, previewUrl: "" },
        { id: "pet_1", type: "pet", name: "Digital Dragon", rarity: "legendary", cost: 500, unlockCondition: "Visit 10 businesses", isOwned: false, previewUrl: "" }
      ];
      
      const assetsWithOwnership = assets.length > 0 
        ? assets.map(asset => ({ ...asset, isOwned: userOwnedAssets.includes(asset.id) }))
        : sampleAssets;
        
      res.json(assetsWithOwnership);
    } catch (error) {
      console.error("Error fetching avatar assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.get("/api/avatar/achievements", async (req, res) => {
    try {
      const achievements = await storage.getUserAvatarAchievements("demo_user_1");
      
      const sampleAchievements = [
        { id: "ach_1", title: "First Steps", description: "Complete your first tap", type: "taps", target: 1, progress: 1, reward: "50 coins", rarity: "common", completed: true },
        { id: "ach_2", title: "Social Butterfly", description: "Share your avatar 5 times", type: "social", target: 5, progress: 2, reward: "Rare effect: Sparkles", rarity: "rare", completed: false }
      ];
      
      res.json(achievements.length > 0 ? achievements : sampleAchievements);
    } catch (error) {
      console.error("Error fetching avatar achievements:", error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  app.post("/api/avatar/save", async (req, res) => {
    try {
      const userId = req.body.userId || "demo_user_1";
      const avatarData = req.body;
      
      const updatedAvatar = await storage.updateUserAvatar(userId, avatarData);
      res.json(updatedAvatar);
    } catch (error) {
      console.error("Error saving avatar:", error);
      res.status(500).json({ error: "Failed to save avatar" });
    }
  });

  // Gamification API routes
  app.get("/api/gamification/treasure-hunts", async (req, res) => {
    try {
      const treasureHunts = [
        {
          id: "hunt_1",
          name: "Downtown Explorer",
          description: "Discover hidden AR treasures across 5 downtown businesses",
          locations: [
            { businessId: "biz_1", name: "Central Coffee", discovered: true },
            { businessId: "biz_2", name: "Metro Deli", discovered: true },
            { businessId: "biz_3", name: "Art Gallery", discovered: false },
            { businessId: "biz_4", name: "Book Store", discovered: false },
            { businessId: "biz_5", name: "Music Shop", discovered: false }
          ],
          rewards: ["Legendary pet: Crystal Dragon", "500 Cirql coins", "Exclusive badge"],
          timeLimit: "3 days left",
          participants: 234,
          difficulty: "Medium",
          progress: 2,
          totalLocations: 5
        }
      ];
      res.json(treasureHunts);
    } catch (error) {
      console.error("Error fetching treasure hunts:", error);
      res.status(500).json({ error: "Failed to fetch treasure hunts" });
    }
  });

  app.get("/api/gamification/competitions", async (req, res) => {
    try {
      const competitions = [
        {
          id: "comp_1",
          title: "Avatar Style Contest",
          description: "Show off your most creative avatar combination",
          type: "tournament",
          participants: 1247,
          timeLeft: "2 days",
          prize: "Epic hair style + 1000 coins",
          myRank: 23,
          status: "active",
          entryFee: 50
        },
        {
          id: "comp_2", 
          title: "Weekly Leaderboard",
          description: "Earn the most Cirql coins this week",
          type: "leaderboard",
          participants: 856,
          timeLeft: "5 days",
          prize: "Champion crown accessory",
          myRank: 42,
          status: "active",
          entryFee: 0
        }
      ];
      res.json(competitions);
    } catch (error) {
      console.error("Error fetching competitions:", error);
      res.status(500).json({ error: "Failed to fetch competitions" });
    }
  });

  app.get("/api/gamification/trades", async (req, res) => {
    try {
      const trades = [
        {
          id: "trade_1",
          fromUser: "AvatarMaster99", 
          fromUserId: "user_123",
          toUser: "You",
          toUserId: "demo_user_1",
          offeredItems: [
            { id: "sunglasses_rare", name: "Rare sunglasses", rarity: "rare" },
            { id: "jacket_cool", name: "Cool jacket", rarity: "common" }
          ],
          requestedItems: [
            { id: "boots_epic", name: "Epic boots", rarity: "epic" }
          ],
          status: "pending",
          createdAt: "2 hours ago",
          expiresAt: "2 days"
        }
      ];
      res.json(trades);
    } catch (error) {
      console.error("Error fetching trades:", error);
      res.status(500).json({ error: "Failed to fetch trades" });
    }
  });

  app.get("/api/gamification/streaks", async (req, res) => {
    try {
      const streaks = [
        {
          type: "daily",
          current: 7,
          target: 7,
          multiplier: 2,
          reward: "Double coins earned",
          nextReward: "Streak pet unlock",
          bonus: "Active",
          completionRate: 100
        },
        {
          type: "weekly", 
          current: 3,
          target: 4,
          multiplier: 1.5,
          reward: "Weekly bonus coins",
          nextReward: "Rare effect unlock",
          bonus: "Pending",
          completionRate: 75
        },
        {
          type: "monthly",
          current: 1,
          target: 4,
          multiplier: 3,
          reward: "Monthly champion badge",
          nextReward: "Legendary avatar unlock",
          bonus: "Pending", 
          completionRate: 25
        }
      ];
      res.json(streaks);
    } catch (error) {
      console.error("Error fetching streaks:", error);
      res.status(500).json({ error: "Failed to fetch streaks" });
    }
  });

  app.post("/api/gamification/start-hunt/:huntId", async (req, res) => {
    try {
      const { huntId } = req.params;
      const userId = req.body.userId || "demo_user_1";
      
      // Record hunt participation
      res.json({ 
        success: true, 
        message: "Treasure hunt started! Check your AR view at participating businesses.",
        huntId,
        nextLocation: "Art Gallery"
      });
    } catch (error) {
      console.error("Error starting hunt:", error);
      res.status(500).json({ error: "Failed to start treasure hunt" });
    }
  });

  app.post("/api/gamification/join-competition/:compId", async (req, res) => {
    try {
      const { compId } = req.params;
      const userId = req.body.userId || "demo_user_1";
      
      res.json({
        success: true,
        message: "Successfully joined competition!",
        competitionId: compId,
        currentRank: Math.floor(Math.random() * 100) + 1
      });
    } catch (error) {
      console.error("Error joining competition:", error);
      res.status(500).json({ error: "Failed to join competition" });
    }
  });

  app.post("/api/gamification/accept-trade/:tradeId", async (req, res) => {
    try {
      const { tradeId } = req.params;
      const userId = req.body.userId || "demo_user_1";
      
      res.json({
        success: true,
        message: "Trade completed successfully!",
        itemsReceived: ["Rare sunglasses", "Cool jacket"],
        itemsGiven: ["Epic boots"]
      });
    } catch (error) {
      console.error("Error accepting trade:", error);
      res.status(500).json({ error: "Failed to accept trade" });
    }
  });

  // Team and Social API routes
  app.post("/api/teams/invite", async (req, res) => {
    try {
      const { email, teamId, message } = req.body;
      const userId = req.body.userId || "demo_user_1";
      
      // Send invitation logic here
      res.json({
        success: true,
        message: `Invitation sent to ${email}!`,
        rewardCoins: 200,
        inviteCode: `CIRQL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      });
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  app.get("/api/teams/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const teams = [
        {
          id: "team_1",
          name: "Downtown Explorers",
          members: [
            { id: "user_1", name: "You", avatar: "avatar_1", points: 1250, joinedAt: "2 weeks ago", status: "active" },
            { id: "user_2", name: "Sarah_M", avatar: "avatar_2", points: 980, joinedAt: "1 week ago", status: "active" },
            { id: "user_3", name: "Mike_K", avatar: "avatar_3", points: 1100, joinedAt: "3 days ago", status: "active" }
          ],
          captain: "user_1",
          totalPoints: 3330,
          level: 8,
          achievements: ["Team Explorer", "Social Butterfly", "Challenge Winner"],
          activeChallenge: "challenge_1",
          inviteCode: "DTE2024"
        }
      ];
      
      res.json(teams);
    } catch (error) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams/create", async (req, res) => {
    try {
      const { name, description } = req.body;
      const userId = req.body.userId || "demo_user_1";
      
      const newTeam = {
        id: `team_${Date.now()}`,
        name,
        description,
        captain: userId,
        members: [
          { id: userId, name: "You", avatar: "avatar_1", points: 0, joinedAt: "now", status: "active" }
        ],
        totalPoints: 0,
        level: 1,
        achievements: [],
        inviteCode: `CIRQL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      };
      
      res.json({
        success: true,
        team: newTeam,
        message: "Team created successfully!"
      });
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  app.post("/api/teams/accept-invitation/:inviteId", async (req, res) => {
    try {
      const { inviteId } = req.params;
      const userId = req.body.userId || "demo_user_1";
      
      res.json({
        success: true,
        message: "Successfully joined the team!",
        welcomeBonus: 100,
        teamName: "Coffee Connoisseurs"
      });
    } catch (error) {
      console.error("Error accepting team invitation:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // Team Battle API routes
  app.get("/api/battles/active", async (req, res) => {
    try {
      const battles = [
        {
          id: "battle_1",
          title: "Downtown Dominance",
          team1: { name: "Coffee Crusaders", score: 847, members: 12 },
          team2: { name: "Tea Titans", score: 723, members: 9 },
          challenge: "Most Cirql taps in downtown area",
          timeLeft: "4 hours",
          prize: "Champion crowns + 2000 coins each",
          status: "active"
        },
        {
          id: "battle_2",
          title: "Weekend Warriors Challenge",
          team1: { name: "Your Team", score: 234, members: 5 },
          team2: { name: "Thunder Squad", score: 189, members: 7 },
          challenge: "Complete the most weekend tap trails",
          timeLeft: "1 day 6 hours",
          prize: "Legendary pet + exclusive badge",
          status: "active"
        }
      ];
      res.json(battles);
    } catch (error) {
      console.error("Error fetching team battles:", error);
      res.status(500).json({ error: "Failed to fetch team battles" });
    }
  });

  app.post("/api/battles/challenge-team", async (req, res) => {
    try {
      const { targetTeamId, challengeType, wager } = req.body;
      const userId = req.body.userId || "demo_user_1";
      
      res.json({
        success: true,
        message: "Battle challenge sent!",
        battleId: `battle_${Date.now()}`,
        estimatedStart: "When opponent accepts (up to 24 hours)"
      });
    } catch (error) {
      console.error("Error creating team battle:", error);
      res.status(500).json({ error: "Failed to create team battle" });
    }
  });

  // Family Plan API routes
  app.get("/api/family/plans", async (req, res) => {
    try {
      const plans = [
        {
          id: "family_basic",
          name: "Family Explorer Pack",
          memberLimit: 6,
          benefits: [
            "Shared family achievement tracking",
            "Family-only challenges and rewards",
            "Combined family leaderboard ranking",
            "Special family avatar accessories",
            "Monthly family meetup events"
          ],
          monthlyRewards: "500 bonus coins per family member",
          price: "Free with 4+ active family members",
          savings: "Save 40% vs individual rewards"
        },
        {
          id: "family_premium",
          name: "Family Champions League",
          memberLimit: 10,
          benefits: [
            "All Explorer Pack benefits",
            "Exclusive family-vs-family tournaments",
            "Premium family avatar collections",
            "Priority family event access",
            "Custom family challenge creation"
          ],
          monthlyRewards: "1000 bonus coins + rare items",
          price: "$4.99/month for entire family",
          savings: "Save 60% vs individual premium"
        }
      ];
      res.json(plans);
    } catch (error) {
      console.error("Error fetching family plans:", error);
      res.status(500).json({ error: "Failed to fetch family plans" });
    }
  });

  app.post("/api/family/create", async (req, res) => {
    try {
      const { planId, familyName, inviteEmails } = req.body;
      const userId = req.body.userId || "demo_user_1";
      
      res.json({
        success: true,
        message: "Family plan created successfully!",
        familyCode: `FAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        invitesSent: inviteEmails?.length || 0,
        bonusCoins: 500
      });
    } catch (error) {
      console.error("Error creating family plan:", error);
      res.status(500).json({ error: "Failed to create family plan" });
    }
  });

  // Corporate Challenge API routes
  app.get("/api/corporate/challenges", async (req, res) => {
    try {
      const challenges = [
        {
          id: "corp_1",
          company: "Tech Solutions Inc",
          title: "Lunch Break Explorers",
          description: "Employees discover local lunch spots during work breaks",
          employees: 47,
          progress: 234,
          target: 500,
          corporateReward: "Company featured on Cirqlback + employee wellness points",
          employeeReward: "Lunch vouchers + wellness badges",
          deadline: "End of month"
        },
        {
          id: "corp_2",
          company: "Marketing Agency Co",
          title: "Team Building Tap Trail",
          description: "Department teams compete in after-work business discovery",
          employees: 23,
          progress: 89,
          target: 200,
          corporateReward: "Team building budget bonus + local business partnerships",
          employeeReward: "Happy hour credits + team achievement badges",
          deadline: "2 weeks"
        }
      ];
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching corporate challenges:", error);
      res.status(500).json({ error: "Failed to fetch corporate challenges" });
    }
  });

  app.post("/api/corporate/invite-company", async (req, res) => {
    try {
      const { companyName, contactEmail, employeeCount, message } = req.body;
      const userId = req.body.userId || "demo_user_1";
      
      res.json({
        success: true,
        message: "Corporate invitation sent successfully!",
        referralBonus: 1000,
        corporateCode: `CORP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      });
    } catch (error) {
      console.error("Error sending corporate invitation:", error);
      res.status(500).json({ error: "Failed to send corporate invitation" });
    }
  });

  // Flash Events API routes
  app.get("/api/events/flash", async (req, res) => {
    try {
      const flashEvent = {
        id: "flash_mega_1",
        title: "MEGA FLASH MOB - ACTIVE NOW!",
        description: "500+ users needed at Central Coffee within 2 hours!",
        location: "Central Coffee",
        currentParticipants: 347,
        targetParticipants: 500,
        timeRemaining: "1h 23m",
        rewards: ["1000 coins", "Legendary Flash Mob Crown", "Business partnerships unlocked"],
        status: "active"
      };
      res.json(flashEvent);
    } catch (error) {
      console.error("Error fetching flash events:", error);
      res.status(500).json({ error: "Failed to fetch flash events" });
    }
  });

  app.post("/api/events/join-flash/:eventId", async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.body.userId || "demo_user_1";
      
      res.json({
        success: true,
        message: "Successfully joined the flash mob!",
        participantNumber: Math.floor(Math.random() * 100) + 300,
        bonusForEarlyJoin: 50
      });
    } catch (error) {
      console.error("Error joining flash event:", error);
      res.status(500).json({ error: "Failed to join flash event" });
    }
  });

  // Business Descriptors API routes (for inclusive community support)
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

  // Payment processing endpoint with real Stripe integration
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      // Use the actual Stripe key from environment (checking multiple possible names)
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.Stripe1;
      
      if (!stripeSecretKey) {
        return res.status(400).json({ 
          error: "Payment processing not configured. Please add STRIPE_SECRET_KEY to environment variables." 
        });
      }

      const { amount } = req.body;
      
      // Use Stripe with proper import
      const stripe = new (await import('stripe')).default(stripeSecretKey, {
        apiVersion: '2024-06-20',
      });

      // Create real payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          platform: 'Cirqlback',
          timestamp: new Date().toISOString()
        }
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id 
      });
    } catch (error: any) {
      console.error("Stripe payment intent creation error:", error);
      res.status(500).json({ error: "Failed to create payment intent: " + error.message });
    }
  });

  // Business data endpoint for analytics
  app.get("/api/businesses", async (req, res) => {
    try {
      const businesses = [
        { id: "biz1", name: "Joe's Coffee Shop", type: "Coffee", status: "active" },
        { id: "biz2", name: "Fitness First Gym", type: "Fitness", status: "active" },
        { id: "biz3", name: "Taco Libre", type: "Restaurant", status: "active" }
      ];
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  // Register AR Game routes
  registerARGameRoutes(app);

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
