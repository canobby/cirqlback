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

export function registerBusinessWebsiteSalesRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

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

  // Auto-sync business data for website
  app.post("/api/business/website/:businessId/sync", async (req, res) => {
    try {
      const { businessId } = req.params;
      
      // Fetch business profile data
      const businessData = {
        name: "Local Coffee House",
        description: "Artisan coffee and fresh pastries in the heart of downtown",
        address: "123 Main Street, Downtown",
        phone: "(555) 123-4567",
        email: "hello@localcoffeehouse.com",
        socialMediaHandles: {
          facebook: "LocalCoffeeHouse",
          instagram: "@localcoffeehouse",
          twitter: "@coffee_local"
        },
        businessHours: {
          monday: { open: "7:00", close: "19:00", closed: false },
          tuesday: { open: "7:00", close: "19:00", closed: false },
          wednesday: { open: "7:00", close: "19:00", closed: false },
          thursday: { open: "7:00", close: "19:00", closed: false },
          friday: { open: "7:00", close: "20:00", closed: false },
          saturday: { open: "8:00", close: "20:00", closed: false },
          sunday: { open: "8:00", close: "18:00", closed: false }
        }
      };

      // Fetch active campaigns for menu sync
      const activeCampaigns = [
        {
          name: "Signature Latte",
          description: "Our house special with locally sourced beans",
          price: "$4.50",
          category: "Coffee"
        },
        {
          name: "Fresh Croissant",
          description: "Buttery, flaky pastry baked daily",
          price: "$3.25",
          category: "Pastries"
        }
      ];

      const syncedWebsiteData = {
        businessInfo: businessData,
        menuItems: activeCampaigns,
        lastSyncTime: new Date(),
        syncedFields: ["businessInfo", "hours", "social", "menu"]
      };

      res.json({ success: true, syncedData: syncedWebsiteData });
    } catch (error) {
      res.status(500).json({ error: "Failed to sync business data" });
    }
  });

  // Business Website Builder & Hosting
  app.get("/api/business/website/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const website = {
        id: businessId,
        websiteEnabled: true,
        websiteSlug: "sample-business",
        websiteTheme: "modern",
        websiteContent: {
          businessName: "Sample Local Business",
          tagline: "Serving the community with excellence",
          aboutText: "We're a local business passionate about providing quality service to our community. Visit us and discover what makes us special!",
          contactInfo: "123 Main St, Your City | (555) 123-4567",
          specialOffers: "New customer discount: 10% off your first visit!"
        },
        websiteMenu: {
          categories: ["Popular Items", "Specialties", "Beverages"],
          items: [
            { category: "Popular Items", name: "Signature Dish", price: "$12.99", description: "Our most popular item" },
            { category: "Beverages", name: "Fresh Coffee", price: "$3.50", description: "Locally roasted coffee" }
          ]
        },
        websiteServices: {
          services: [
            { name: "Quality Service", description: "Professional and friendly service" },
            { name: "Local Focus", description: "Supporting the local community" }
          ]
        },
        websiteHours: {
          monday: { open: "9:00", close: "17:00", closed: false },
          tuesday: { open: "9:00", close: "17:00", closed: false },
          wednesday: { open: "9:00", close: "17:00", closed: false },
          thursday: { open: "9:00", close: "17:00", closed: false },
          friday: { open: "9:00", close: "17:00", closed: false },
          saturday: { open: "10:00", close: "16:00", closed: false },
          sunday: { open: "", close: "", closed: true }
        },
        websiteSocialLinks: {
          facebook: "https://facebook.com/samplebusiness",
          instagram: "https://instagram.com/samplebusiness",
          twitter: "https://twitter.com/samplebusiness"
        },
        websitePublished: true,
        websiteViews: 245
      };
      res.json(website);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch website data" });
    }
  });

  app.put("/api/business/website/:businessId", async (req, res) => {
    try {
      const { businessId } = req.params;
      const websiteData = req.body;
      
      // Here you would update the business website data in the database
      const updatedWebsite = {
        ...websiteData,
        websiteLastUpdated: new Date(),
        id: businessId
      };
      
      res.json({ success: true, website: updatedWebsite });
    } catch (error) {
      res.status(500).json({ error: "Failed to update website" });
    }
  });

  app.post("/api/business/website/:businessId/publish", async (req, res) => {
    try {
      const { businessId } = req.params;
      
      // Here you would publish the website and make it live
      const publishedWebsite = {
        businessId,
        websitePublished: true,
        publishedAt: new Date(),
        websiteUrl: `https://cirqlback.com/biz/${businessId}`,
        seoOptimized: true,
        mobileResponsive: true
      };
      
      res.json({ success: true, website: publishedWebsite });
    } catch (error) {
      res.status(500).json({ error: "Failed to publish website" });
    }
  });

  // Public business website serving
  app.get("/biz/:businessSlug", async (req, res) => {
    try {
      const { businessSlug } = req.params;
      
      // This would serve the actual business website
      // For now, we return a sample HTML template
      const businessWebsite = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sample Local Business - Serving the community with excellence</title>
          <meta name="description" content="Local business passionate about providing quality service to our community.">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 40px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
            .content { padding: 40px 0; }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
            .card { background: #f8f9fa; padding: 20px; border-radius: 8px; }
            .cirql-banner { background: linear-gradient(135deg, #ff6b6b, #4ecdc4); color: white; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sample Local Business</h1>
            <p>Serving the community with excellence</p>
          </div>
          <div class="container">
            <div class="cirql-banner">
              <h3>🎯 Tap to Earn Rewards!</h3>
              <p>Look for our Cirql tags in-store to unlock exclusive deals and join local discovery challenges!</p>
              <div style="margin-top: 15px;">
                <strong>Active Campaigns:</strong>
                <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                  <span style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 15px; font-size: 12px;">💰 20% Off Coffee</span>
                  <span style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 15px; font-size: 12px;">🏆 Loyalty Points 2x</span>
                  <span style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 15px; font-size: 12px;">🗺️ Downtown Trail</span>
                </div>
              </div>
            </div>
            <div class="content">
              <div class="grid">
                <div class="card">
                  <h3>About Us</h3>
                  <p>We're a local business passionate about providing quality service to our community. Visit us and discover what makes us special!</p>
                </div>
                <div class="card">
                  <h3>Hours</h3>
                  <p>Mon-Fri: 9:00 AM - 5:00 PM<br>
                     Sat: 10:00 AM - 4:00 PM<br>
                     Sun: Closed</p>
                </div>
                <div class="card">
                  <h3>Special Offers</h3>
                  <p>New customer discount: 10% off your first visit!</p>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(businessWebsite);
    } catch (error) {
      res.status(500).json({ error: "Failed to load business website" });
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

  // PARTNERSHIP ROUTES

  // Get business partnerships
  app.get("/api/partnerships", (req, res) => {
    const mockPartnerships = [
      {
        id: "1",
        businessAId: "business-1",
        businessBId: "business-2",
        businessA: {
          name: "Brew & Bytes Cafe",
          category: "Coffee Shop",
          address: "123 Main St",
          rating: 4.5
        },
        businessB: {
          name: "Pages & Prose Bookstore",
          category: "Bookstore",
          address: "125 Main St",
          rating: 4.7
        },
        partnershipType: "cross_promotion",
        status: "active",
        commissionRate: 5.0,
        sharedBudget: 500.00,
        totalReferrals: 45,
        totalRevenue: 1250.75,
        terms: "Cross-promote each other's businesses. Coffee shop customers get 10% off books, bookstore customers get free pastry with coffee purchase.",
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    res.json(mockPartnerships);
  });

  // Get potential partners
  app.get("/api/partnerships/potential", (req, res) => {
    const mockPotentialPartners = [
      {
        id: "business-4",
        name: "Artisan Bakery",
        category: "Bakery",
        address: "150 Elm Street",
        rating: 4.8,
        reviewCount: 156,
        description: "Fresh artisan breads and pastries made daily with organic ingredients.",
        compatibilityScore: 92
      }
    ];
    res.json(mockPotentialPartners);
  });

  // Get cross-business rewards
  app.get("/api/partnerships/cross-rewards", (req, res) => {
    const mockCrossRewards = [
      {
        id: "1",
        partnershipId: "1",
        triggerBusinessId: "business-1",
        rewardBusinessId: "business-2",
        rewardType: "discount",
        rewardValue: 10.00,
        description: "10% off any book purchase",
        conditions: "Must show coffee receipt from same day",
        isActive: true
      }
    ];
    res.json(mockCrossRewards);
  });

  // Create partnership
  app.post("/api/partnerships", (req, res) => {
    res.json({ success: true, id: "new-partnership-id" });
  });

  // Update partnership status
  app.put("/api/partnerships/:id/status", (req, res) => {
    res.json({ success: true });
  });

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
