import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

import { storage } from "./storage";
import { db } from "./db";
import { adminUsers, adminCommunications, adminTrainingProgress, adminTrainingModules, adminKnowledgeItems } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { insertBusinessSchema, insertCampaignSchema, insertNfcTagSchema, insertTapSchema, insertRewardSchema, insertTapTrailSchema, insertReferralSchema, insertSubscriptionPlanSchema, insertUserSubscriptionSchema, insertApiUsageSchema, insertSalesDataSchema, insertMonthlySalesSummarySchema, insertBusinessGoalsSchema, salesData, monthlySalesSummary, businessGoals } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import { openaiService } from "./openai-service";
import multer from 'multer';
import { 
  handleTextTranslation, 
  handleVoiceTranslation, 
  handleTextToSpeech 
} from './translation-service';
import { getMapsConfig } from './maps-proxy';
import { setupAuth, isAuthenticated, isAdminAuthenticated } from './auth';
import { PLAN_PRICING, resolvePlanAmountCents, type BillingInterval } from './pricing';

export async function registerRoutes(app: Express): Promise<Server> {

  // Session + passport auth (register/login/logout, /api/auth/user).
  // Must run before the route handlers below so req.user/isAuthenticated exist.
  setupAuth(app);

  // Configure multer for file uploads. (CHR-18) Cap size and restrict to audio
  // MIME types so an unbounded/oversized upload can't OOM the server.
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("audio/")) return cb(null, true);
      cb(new Error("Only audio uploads are allowed"));
    },
  });
  
  // Translation API Routes
  app.post('/api/translate/text', handleTextTranslation);
  app.post('/api/translate/voice', isAuthenticated, upload.single('audio'), handleVoiceTranslation);
  app.post('/api/translate/text-to-speech', handleTextToSpeech);
  
  // Maps API configuration
  app.get('/api/maps/config', getMapsConfig);
  
  // Serve test page
  app.get('/test-quest', (req, res) => {
    res.sendFile('/home/runner/workspace/test-quest.html');
  });
  
  // Derive subscription context from the authenticated session user.
  // (Previously hardcoded 'professional' for everyone.) No-op when logged out.
  const checkSubscriptionLimits = async (req: any, res: any, next: any) => {
    if (req.user) {
      req.cirqlUser = {
        subscriptionTier: req.user.subscriptionTier || 'starter',
        subscriptionStatus: req.user.subscriptionStatus || 'active',
      };
    }
    next();
  };

  // CHR-13: require a valid session for user-private route groups. Identity
  // inside these handlers comes from req.user — never from a client-supplied
  // userId/customerId. Public discovery endpoints (businesses, campaigns, map,
  // search, taps, subscription plans, translate) intentionally stay open.
  const privatePrefixes = [
    '/api/account',
    '/api/customer/profile',
    '/api/settings',
    '/api/subscription/trial-discount',
    '/api/subscription/update',
    '/api/avatar',
    '/api/gamification',
    '/api/teams',
    '/api/battles',
    '/api/family',
    '/api/corporate',
    '/api/events',
    '/api/quest',
    '/api/friends',
    '/api/profile',
  ];
  for (const prefix of privatePrefixes) {
    app.use(prefix, isAuthenticated);
  }

  // CHR-14: every /api/admin/* route requires an active admin (session user
  // with an admin_users record). Previously these were fully unauthenticated.
  app.use('/api/admin', isAdminAuthenticated);

  // CHR-16: does the authenticated user own the business behind a resource?
  const userOwnsBusiness = async (userId: string, businessId?: string | null): Promise<boolean> => {
    if (!businessId) return false;
    const business = await storage.getBusiness(businessId);
    return !!business && business.ownerId === userId;
  };

  // Starter tier expiration check route
  app.get('/api/account/check-expiration', async (req, res) => {
    try {
      const userId = (req.user as any).id;

      try {
        let user = await storage.getUser(userId);
        if (!user) {
          // Return demo user response for testing
          const demoResponse = {
            isExpired: false,
            subscriptionStatus: 'active',
            subscriptionTier: 'starter',
            upgradeRequired: false,
            daysRemaining: 120,
            expirationDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
          };
          return res.json(demoResponse);
        }
        
        // Check if starter tier has expired
        if (user.subscriptionTier === 'starter' && user.starterExpiresAt) {
          const now = new Date();
          const expirationDate = new Date(user.starterExpiresAt);
          const isExpired = now > expirationDate;
          
          if (isExpired && user.subscriptionStatus === 'active') {
            // Update user to expired status
            user = await storage.updateUserSubscription(userId, {
              subscriptionStatus: 'expired'
            });
          }
          
          return res.json({
            isExpired,
            expirationDate: expirationDate.toISOString(),
            daysRemaining: Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
            subscriptionStatus: user.subscriptionStatus,
            subscriptionTier: user.subscriptionTier,
            upgradeRequired: isExpired
          });
        }
        
        res.json({
          isExpired: false,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionTier: user.subscriptionTier,
          upgradeRequired: false
        });
      } catch (dbError) {
        console.error("Database error in check-expiration:", dbError);
        // Return demo response for testing
        const demoResponse = {
          isExpired: false,
          subscriptionStatus: 'active',
          subscriptionTier: 'starter',
          upgradeRequired: false,
          daysRemaining: 120,
          expirationDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
        };
        res.json(demoResponse);
      }
    } catch (error) {
      console.error("Error checking expiration:", error);
      res.status(500).json({ error: "Failed to check expiration" });
    }
  });

  // Trial discount selection route
  app.post('/api/subscription/trial-discount', async (req, res) => {
    try {
      const { userId, selectedTier } = req.body;
      
      if (!userId || !selectedTier) {
        return res.status(400).json({ error: "User ID and selected tier required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if still in trial period
      if (user.subscriptionTier !== 'starter' || !user.starterExpiresAt) {
        return res.status(400).json({ error: "Not eligible for trial discount" });
      }

      const now = new Date();
      const expirationDate = new Date(user.starterExpiresAt);
      
      if (now > expirationDate) {
        return res.status(400).json({ error: "Trial period has expired" });
      }

      // Activate trial discount
      const updatedUser = await storage.updateUserSubscription(userId, {
        trialDiscountTier: selectedTier,
        trialDiscountEndsAt: expirationDate,
        trialDiscountActive: true,
        subscriptionTier: selectedTier,
        subscriptionStatus: 'trial_discount'
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error activating trial discount:", error);
      res.status(500).json({ error: "Failed to activate trial discount" });
    }
  });

  // Update user subscription route
  app.post('/api/subscription/update', async (req, res) => {
    try {
      const { userId, subscriptionTier, subscriptionStatus } = req.body;
      
      if (!userId || !subscriptionTier) {
        return res.status(400).json({ error: "User ID and subscription tier required" });
      }

      const user = await storage.updateUserSubscription(userId, {
        subscriptionTier,
        subscriptionStatus: subscriptionStatus || 'active',
        ...(subscriptionTier !== 'starter' ? { starterExpiresAt: undefined } : {})
      });

      res.json(user);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });
  // Business routes
  app.get("/api/businesses", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      
      // Demo businesses for testing
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
          monthlyRevenue: 2450,
          userId: userId || "demo_user_1"
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
          monthlyRevenue: 3780,
          userId: userId || "demo_user_1"
        }
      ];
      
      if (userId) {
        try {
          const businesses = await storage.getUserBusinesses(userId);
          if (businesses && businesses.length > 0) {
            return res.json(businesses);
          }
        } catch (dbError) {
          console.error("Database error in getUserBusinesses:", dbError);
        }
      }
      
      // Always return demo businesses for testing
      res.json(demoBusiness);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      // Return demo businesses even on error
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
          monthlyRevenue: 2450,
          userId: req.query.userId as string || "demo_user_1"
        }
      ];
      res.json(demoBusiness);
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
      console.error("Campaign creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.patch("/api/campaigns/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getCampaign(id);
      if (!existing) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      if (!(await userOwnsBusiness((req.user as any).id, existing.businessId))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      // Validate + strip unknown fields (prevents mass-assignment of arbitrary columns).
      const updates = insertCampaignSchema.partial().parse(req.body);
      const campaign = await storage.updateCampaign(id, updates);
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  // NFC Tag routes
  app.get("/api/nfc-tags", async (req, res) => {
    const businessId = req.query.businessId as string;
    try {
      if (!businessId) {
        // Return demo NFC tags for testing
        const demoTags = [
          {
            id: "demo_tag_1",
            businessId: "demo_biz_1",
            campaignId: "demo_campaign_1",
            tagId: "CIRQL001",
            isActive: true,
            location: "Front Counter",
            createdAt: new Date(),
            totalTaps: 45
          },
          {
            id: "demo_tag_2", 
            businessId: "demo_biz_2",
            campaignId: "demo_campaign_2",
            tagId: "CIRQL002",
            isActive: true,
            location: "Main Entrance",
            createdAt: new Date(),
            totalTaps: 78
          }
        ];
        return res.json(demoTags);
      }
      const tags = await storage.getNFCTags(businessId);
      res.json(tags);
    } catch (error) {
      // Return demo tags on error
      const demoTags = [
        {
          id: "demo_tag_1",
          businessId: businessId || "demo_biz_1",
          campaignId: "demo_campaign_1",
          tagId: "CIRQL001",
          isActive: true,
          location: "Front Counter",
          createdAt: new Date(),
          totalTaps: 45
        }
      ];
      res.json(demoTags);
    }
  });

  app.post("/api/nfc-tags", async (req, res) => {
    try {
      const validatedData = insertNfcTagSchema.parse(req.body);
      
      // Generate unique tag identifier if not provided
      if (!validatedData.tagIdentifier) {
        validatedData.tagIdentifier = `CIRQL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
      
      try {
        const tag = await storage.createNFCTag(validatedData);
        
        // Return enhanced response with deployment information
        const response = {
          ...tag,
          tagUrl: `${req.protocol}://${req.get('host')}/tap/${tag.id}`,
          qrCodeUrl: `${req.protocol}://${req.get('host')}/qr/${tag.id}`,
          deploymentInstructions: [
            "Clean the surface where you'll place the tag",
            "Remove the protective backing from the NFC tag",
            `Place the tag at ${validatedData.location}`,
            "Test the tag by tapping it with your phone",
            "Add signage to encourage customer interaction"
          ]
        };
        
        res.json(response);
      } catch (dbError) {
        console.error("Database error creating NFC tag:", dbError);
        
        // Return demo tag response for testing
        const demoResponse = {
          id: crypto.randomUUID(),
          tagIdentifier: validatedData.tagIdentifier || `CIRQL-${Date.now()}`,
          businessId: validatedData.businessId,
          campaignId: validatedData.campaignId,
          location: validatedData.location,
          customLabel: validatedData.customLabel,
          description: validatedData.description,
          placementNotes: validatedData.placementNotes,
          isActive: true,
          totalTaps: 0,
          tagUrl: `${req.protocol}://${req.get('host')}/tap/demo_${Date.now()}`,
          qrCodeUrl: `${req.protocol}://${req.get('host')}/qr/demo_${Date.now()}`,
          deploymentInstructions: [
            "Clean the surface where you'll place the tag",
            "Remove the protective backing from the NFC tag",
            `Place the tag at ${validatedData.location}`,
            "Test the tag by tapping it with your phone",
            "Add signage to encourage customer interaction"
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        res.json(demoResponse);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create NFC tag" });
    }
  });

  // Update NFC tag
  app.patch("/api/nfc-tags/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getNFCTag(id);
      if (!existing) {
        return res.status(404).json({ error: "NFC tag not found" });
      }
      if (!(await userOwnsBusiness((req.user as any).id, existing.businessId))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const updates = insertNfcTagSchema.partial().parse(req.body);
      const tag = await storage.updateNFCTag(id, updates);
      res.json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update NFC tag" });
    }
  });

  // Delete NFC tag
  app.delete("/api/nfc-tags/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getNFCTag(id);
      if (!existing) {
        return res.status(404).json({ error: "NFC tag not found" });
      }
      if (!(await userOwnsBusiness((req.user as any).id, existing.businessId))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const success = await storage.deleteNFCTag(id);
      if (!success) {
        return res.status(404).json({ error: "NFC tag not found" });
      }
      res.json({ success: true, message: "NFC tag deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete NFC tag" });
    }
  });

  // QR Code generation endpoint
  app.get("/qr/:tagId", async (req, res) => {
    try {
      const { tagId } = req.params;
      const tagUrl = `${req.protocol}://${req.get('host')}/tap/${tagId}`;
      
      // Generate QR code SVG (simplified implementation)
      const qrSvg = `
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="white"/>
          <rect x="10" y="10" width="30" height="30" fill="black"/>
          <rect x="160" y="10" width="30" height="30" fill="black"/>
          <rect x="10" y="160" width="30" height="30" fill="black"/>
          <text x="100" y="105" text-anchor="middle" font-size="8" fill="black">Cirql Tag</text>
          <text x="100" y="120" text-anchor="middle" font-size="6" fill="gray">${tagId}</text>
        </svg>
      `;
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrSvg);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // NFC Analytics endpoint
  app.get("/api/nfc-analytics", async (req, res) => {
    try {
      const businessId = req.query.businessId as string;
      const timeRange = req.query.range as string || "7d";
      
      if (!businessId) {
        // Return demo analytics data for testing
        const demoAnalytics = [
          {
            id: "demo_tag_1",
            location: "Front Counter",
            totalTaps: 145,
            uniqueCustomers: 89,
            conversionRate: 23.4,
            avgSessionTime: 45,
            recentActivity: [
              { timestamp: new Date().toISOString(), customerEmail: "customer@example.com", action: "Reward Claimed" },
              { timestamp: new Date(Date.now() - 3600000).toISOString(), customerEmail: "user@test.com", action: "Tag Tapped" },
              { timestamp: new Date(Date.now() - 7200000).toISOString(), customerEmail: "demo@email.com", action: "Discount Used" }
            ],
            performanceMetrics: {
              dailyTaps: [
                { date: "2024-08-12", taps: 23 },
                { date: "2024-08-11", taps: 18 },
                { date: "2024-08-10", taps: 31 }
              ],
              hourlyDistribution: [
                { hour: 9, taps: 12 }, { hour: 12, taps: 25 }, { hour: 15, taps: 18 }, { hour: 18, taps: 8 }
              ],
              customerRetention: 67.5,
              rewardsClaimed: 78
            }
          },
          {
            id: "demo_tag_2",
            location: "Main Entrance",
            totalTaps: 203,
            uniqueCustomers: 134,
            conversionRate: 18.7,
            avgSessionTime: 38,
            recentActivity: [
              { timestamp: new Date().toISOString(), customerEmail: "new@customer.com", action: "First Visit" },
              { timestamp: new Date(Date.now() - 1800000).toISOString(), customerEmail: "loyal@user.com", action: "Loyalty Points" },
              { timestamp: new Date(Date.now() - 5400000).toISOString(), customerEmail: "repeat@visitor.com", action: "Return Visit" }
            ],
            performanceMetrics: {
              dailyTaps: [
                { date: "2024-08-12", taps: 35 },
                { date: "2024-08-11", taps: 28 },
                { date: "2024-08-10", taps: 42 }
              ],
              hourlyDistribution: [
                { hour: 8, taps: 15 }, { hour: 11, taps: 28 }, { hour: 14, taps: 22 }, { hour: 17, taps: 12 }
              ],
              customerRetention: 72.1,
              rewardsClaimed: 112
            }
          },
          {
            id: "demo_tag_3",
            location: "Table Display",
            totalTaps: 67,
            uniqueCustomers: 45,
            conversionRate: 31.2,
            avgSessionTime: 52,
            recentActivity: [
              { timestamp: new Date().toISOString(), customerEmail: "engaged@customer.com", action: "Premium Unlock" },
              { timestamp: new Date(Date.now() - 2700000).toISOString(), customerEmail: "active@user.com", action: "Social Share" },
              { timestamp: new Date(Date.now() - 6300000).toISOString(), customerEmail: "valued@customer.com", action: "Feedback Given" }
            ],
            performanceMetrics: {
              dailyTaps: [
                { date: "2024-08-12", taps: 12 },
                { date: "2024-08-11", taps: 9 },
                { date: "2024-08-10", taps: 15 }
              ],
              hourlyDistribution: [
                { hour: 10, taps: 8 }, { hour: 13, taps: 15 }, { hour: 16, taps: 11 }, { hour: 19, taps: 6 }
              ],
              customerRetention: 82.3,
              rewardsClaimed: 34
            }
          }
        ];
        
        return res.json(demoAnalytics);
      }
      
      try {
        // Real analytics would be fetched from database here
        const analytics = await storage.getNFCTagAnalytics(businessId, timeRange);
        res.json(analytics);
      } catch (dbError) {
        console.error("Database error fetching NFC analytics:", dbError);
        
        // Return empty analytics for real business ID but no data
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching NFC analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Tap routes - simulate NFC tap
  app.post("/api/taps", async (req, res) => {
    try {
      // Validate basic required fields
      const { tagId, customerEmail, businessId } = req.body;
      if (!tagId || !customerEmail || !businessId) {
        return res.status(400).json({ error: "Missing required fields: tagId, customerEmail, businessId" });
      }
      
      try {
        const validatedData = insertTapSchema.parse(req.body);
        // Process the tap (this handles reward creation automatically)
        const result = await storage.processTap(validatedData);
        
        if (result && result.success) {
          // Broadcast real-time update via WebSocket
          const broadcastToClients = (global as any).broadcastToClients;
          if (broadcastToClients) {
            broadcastToClients({
              type: 'new_tap',
              data: result
            });
          }
          
          res.json(result);
          return;
        } else if (result && !result.success) {
          res.status(400).json({ error: result.message });
          return;
        }
      } catch (dbError) {
        console.error("Database error in tap processing:", dbError);
      }
      
      // Fallback: return successful tap simulation
      const simulatedResult = {
        success: true,
        tap: {
          id: crypto.randomUUID(),
          tagId,
          customerEmail,
          businessId,
          tappedAt: new Date(),
          pointsEarned: 50,
          location: req.body.location
        },
        reward: {
          id: crypto.randomUUID(),
          customerEmail,
          businessId,
          campaignId: "demo_campaign_1",
          type: "discount",
          value: "10.00",
          description: "10% off your next purchase",
          isRedeemed: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date()
        },
        message: "Tap successful! You earned a discount reward."
      };
      
      res.json(simulatedResult);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to process tap. Please try again." });
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

  app.patch("/api/rewards/:id/redeem", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getReward(id);
      if (!existing) {
        return res.status(404).json({ error: "Reward not found" });
      }
      // A reward can only be redeemed by the user it belongs to.
      if (existing.userId !== (req.user as any).id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const reward = await storage.redeemReward(id);
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
      const customerId = (req.user as any).id;
      
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
          description: "Perfect for new businesses testing the waters - 6 months free trial",
          price: 0,
          yearlyPrice: 0,
          billingInterval: "monthly",
          trialDuration: "6 months",
          features: ["1 business location", "3 active campaigns", "100 customer taps/month", "Basic tap analytics", "5 Cirql tags included", "QR code generation", "Community map listing", "Email support", "6-month trial period"],
          maxBusinesses: 1,
          maxCampaigns: 3,
          maxTaps: 100,
          apiRequestsPerMonth: 1000,
          hasAdvancedAnalytics: false,
          hasAiInsights: false,
          hasPrioritySupport: false,
          hasWebsiteBuilder: false,
          hasArExperiences: false,
          hasTeamChallenges: false
        },
        {
          id: "professional",
          name: "Professional",
          description: "Best value for growing local businesses",
          price: 49.99,
          yearlyPrice: 499.90,
          billingInterval: "monthly",
          features: ["1 business location", "Unlimited campaigns", "500 customer taps/month", "Advanced analytics dashboard", "20 Cirql tags included", "Custom campaign templates", "Cross-business partnerships", "AR experience integration", "Email + chat support", "Website builder (basic)"],
          maxBusinesses: 1,
          maxCampaigns: null,
          maxTaps: 500,
          apiRequestsPerMonth: 10000,
          hasAdvancedAnalytics: true,
          hasAiInsights: false,
          hasPrioritySupport: false,
          hasWebsiteBuilder: true,
          hasArExperiences: true,
          hasTeamChallenges: false
        },
        {
          id: "business",
          name: "Business",
          description: "Comprehensive solution for established businesses",
          price: 79.99,
          yearlyPrice: 799.90,
          billingInterval: "monthly",
          features: ["Up to 3 business locations", "Unlimited campaigns & taps", "Advanced AI insights", "50 Cirql tags included", "Priority campaign template access", "Team challenge creation", "Custom website with full CMS", "SMS + email marketing automation", "Loyalty program management", "Priority support"],
          maxBusinesses: 3,
          maxCampaigns: null,
          maxTaps: null,
          apiRequestsPerMonth: 25000,
          hasAdvancedAnalytics: true,
          hasAiInsights: true,
          hasPrioritySupport: true,
          hasWebsiteBuilder: true,
          hasArExperiences: true,
          hasTeamChallenges: true
        },
        {
          id: "enterprise",
          name: "Enterprise",
          description: "Full platform power for multi-location businesses",
          price: 149,
          yearlyPrice: 1490,
          billingInterval: "monthly",
          features: ["Unlimited locations", "White-label branding options", "100 Cirql tags included", "Custom integrations (POS, CRM)", "Advanced team management", "Dedicated campaign manager", "Custom AR experiences", "API access", "Phone + priority support", "Revenue share opportunities"],
          maxBusinesses: null,
          maxCampaigns: null,
          maxTaps: null,
          apiRequestsPerMonth: 100000,
          hasAdvancedAnalytics: true,
          hasAiInsights: true,
          hasPrioritySupport: true,
          hasWebsiteBuilder: true,
          hasArExperiences: true,
          hasTeamChallenges: true
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
      const userId = (req.user as any).id;
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
      const userOwnedAssets = await storage.getUserAvatarAssets((req.user as any).id);
      
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
      const achievements = await storage.getUserAvatarAchievements((req.user as any).id);
      
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
      const userId = (req.user as any).id;
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
      console.error("Error fetching discovery challenges:", error);
      res.status(500).json({ error: "Failed to fetch discovery challenges" });
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
      const userId = (req.user as any).id;
      
      // Record hunt participation
      res.json({ 
        success: true, 
        message: "Treasure hunt started! Check your AR view at participating businesses.",
        huntId,
        nextLocation: "Art Gallery"
      });
    } catch (error) {
      console.error("Error starting hunt:", error);
      res.status(500).json({ error: "Failed to start discovery challenge" });
    }
  });

  app.post("/api/gamification/join-competition/:compId", async (req, res) => {
    try {
      const { compId } = req.params;
      const userId = (req.user as any).id;
      
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
      const userId = (req.user as any).id;
      
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
      const userId = (req.user as any).id;
      
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
      const userId = (req.user as any).id;
      
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
      const userId = (req.user as any).id;
      
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
      const userId = (req.user as any).id;
      
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
      const userId = (req.user as any).id;
      
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
      const userId = (req.user as any).id;
      
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
      const userId = (req.user as any).id;
      
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
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      // Price is resolved SERVER-SIDE from the plan id. Any client-supplied
      // `amount` is ignored so a user cannot set their own price.
      const planId = String(req.body?.planId || "");
      const billingInterval: BillingInterval =
        req.body?.billingInterval === "yearly" ? "yearly" : "monthly";
      const amountCents = resolvePlanAmountCents(planId, billingInterval);
      if (amountCents === null) {
        return res.status(400).json({ error: "Unknown or non-purchasable plan" });
      }

      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        return res.status(400).json({
          error: "Payment processing not configured. Please set STRIPE_SECRET_KEY.",
        });
      }

      const stripe = new (await import('stripe')).default(stripeSecretKey, {
        apiVersion: '2025-07-30.basil' as any,
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        metadata: {
          platform: 'Cirqlback',
          planId,
          billingInterval,
          userId: (req.user as any).id,
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amountCents / 100,
        planName: PLAN_PRICING[planId].name,
        billingInterval,
      });
    } catch (error: any) {
      console.error("Stripe payment intent creation error:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Stripe webhook — verifies payment success SERVER-SIDE (never trust the
  // client's "payment succeeded"). Uses the raw request body captured in
  // server/index.ts for signature verification. Stripe calls this unauthenticated,
  // so the signature IS the auth.
  app.post("/api/stripe/webhook", async (req, res) => {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeSecretKey || !webhookSecret) {
      return res.status(400).json({ error: "Stripe webhook not configured" });
    }
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    const stripe = new (await import('stripe')).default(stripeSecretKey, {
      apiVersion: '2025-07-30.basil' as any,
    });

    let event;
    try {
      const rawBody = (req as any).rawBody ?? req.body;
      event = stripe.webhooks.constructEvent(rawBody, signature as string, webhookSecret);
    } catch (err: any) {
      console.error("Stripe webhook signature verification failed:", err.message);
      return res.status(400).json({ error: "Webhook signature verification failed" });
    }

    try {
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as any;
        const { userId, planId } = pi.metadata || {};
        if (userId && planId && PLAN_PRICING[planId]) {
          await storage.updateUserSubscription(userId, {
            subscriptionTier: planId,
            subscriptionStatus: "active",
          });
        }
      }
      return res.json({ received: true });
    } catch (err) {
      console.error("Stripe webhook handler error:", err);
      return res.status(500).json({ error: "Webhook handler failed" });
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

  // Get discovery challenges
  app.get("/api/ar/treasure-hunts", (req, res) => {
    const mockTreasureHunts = [
      {
        id: "hunt-1",
        title: "Downtown Discovery Adventure",
        description: "Explore downtown businesses and discover hidden AR treasures at each location!",
        huntType: "city_wide",
        clues: [
          {
            id: "clue-1",
            text: "Where the morning brew meets the written word, seek the golden bean that speaks without sound.",
            location: "Coffee shop near bookstore",
            businessId: "business-1",
            businessName: "Brew & Bytes Cafe",
            hint: "Look for a place where caffeine and literature coexist"
          }
        ],
        requiredBusinesses: ["business-1", "business-2", "business-3"],
        treasureLocations: [
          {
            lat: 40.7128,
            lng: -74.0060,
            businessId: "business-1",
            reward: "50 bonus points"
          }
        ],
        finalReward: {
          type: "prize",
          value: 100,
          description: "$100 gift card to local businesses"
        },
        participantCount: 156,
        completionCount: 23,
        difficulty: "medium",
        estimatedDuration: 90,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        userProgress: {
          currentClue: 0,
          cluesCompleted: [],
          treasuresFound: 0,
          isCompleted: false,
          totalTime: 0
        }
      }
    ];
    res.json(mockTreasureHunts);
  });

  // Get AR experiences
  app.get("/api/ar/experiences", (req, res) => {
    const mockArExperiences = [
      {
        id: "ar-1",
        businessId: "business-1",
        businessName: "Brew & Bytes Cafe",
        title: "Virtual Coffee Menu",
        description: "Point your camera at our menu to see 3D models of our signature drinks!",
        experienceType: "virtual_menu",
        triggerType: "nfc_tap",
        rewardPoints: 25,
        playCount: 89,
        averageRating: 4.6,
        isActive: true
      }
    ];
    res.json(mockArExperiences);
  });

  // Get user's AR progress
  app.get("/api/ar/my-progress", (req, res) => {
    const mockProgress = [
      {
        huntId: "hunt-1",
        huntTitle: "Downtown Discovery Adventure",
        currentClue: {
          text: "Where the morning brew meets the written word, seek the golden bean that speaks without sound.",
          hint: "Look for a place where caffeine and literature coexist"
        },
        cluesCompleted: [],
        totalClues: 5,
        isCompleted: false,
        totalTime: 0
      }
    ];
    res.json(mockProgress);
  });

  // Join discovery challenge
  app.post("/api/ar/treasure-hunts/:id/join", (req, res) => {
    res.json({ success: true });
  });

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

  // Admin Invitation and Management Routes - ADMIN ONLY ACCESS
  // These routes are only accessible by admin users and hidden from regular users/customers
  
  app.post("/api/admin/invite", async (req, res) => {
    try {
      // Only master admins may invite other admins.
      if ((req as any).adminUser?.adminLevel !== 'master') {
        return res.status(403).json({ error: "Master admin access required" });
      }

      const { email, adminLevel, specializations, personalMessage, emergencyContact } = req.body;
      
      // Generate secure invitation token
      const inviteToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to accept

      // Store invitation (mock implementation for now)
      const invitation = {
        id: crypto.randomUUID(),
        invitationEmail: email,
        adminLevel,
        specializations,
        inviteToken,
        inviteExpiresAt: expiresAt,
        personalMessage,
        emergencyContact,
        createdAt: new Date(),
        status: 'pending'
      };

      // TODO: Send invitation email with training requirements
      
      res.json({ 
        success: true, 
        invitationId: invitation.id,
        message: "Admin invitation sent with training requirements" 
      });
    } catch (error) {
      console.error("Admin invitation error:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      // Query actual admin users from database
      const adminInvites = await db.select().from(adminUsers);
      
      const adminUsersList = adminInvites.map(invite => ({
        id: invite.id,
        user: {
          email: invite.invitationEmail,
          name: invite.invitationEmail || "Unnamed Admin"
        },
        adminLevel: invite.adminLevel,
        permissions: invite.permissions || [],
        trainingStatus: invite.trainingStatus || "not_started",
        certificationLevel: invite.certificationLevel || "none",
        specializations: invite.specializations || [],
        isActive: invite.isActive ?? false,
        lastActiveAt: invite.lastActiveAt || invite.createdAt,
        invitedAt: invite.createdAt,
        status: invite.isActive ? "accepted" : "inactive"
      }));
      
      res.json(adminUsersList);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: "Failed to fetch admin users" });
    }
  });

  app.get("/api/admin/invitations/pending", async (req, res) => {
    try {
      // Query actual pending invitations from database
      const pendingInvitations = await db.select()
        .from(adminUsers)
        .where(eq(adminUsers.isActive, false));
      
      res.json(pendingInvitations);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ error: "Failed to fetch pending invitations" });
    }
  });

  app.get("/api/admin/communications", async (req, res) => {
    try {
      // Query actual communications from database
      const communications = await db.select()
        .from(adminCommunications)
        .orderBy(desc(adminCommunications.createdAt));
      
      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json({ error: "Failed to fetch communications" });
    }
  });

  app.post("/api/admin/communications/send", async (req, res) => {
    try {
      const { recipientType, recipientId, subject, content, priority, requiresAcknowledgment } = req.body;
      
      // Insert communication into database
      const [communication] = await db.insert(adminCommunications).values({
        id: crypto.randomUUID(),
        senderId: "current_admin", // TODO: Get from authenticated session
        recipientRole: recipientType === "role" ? recipientId : null,
        recipientLevel: recipientType === "level" ? recipientId : null,
        type: "announcement",
        subject,
        content,
        priority: priority || "normal",
        requiresAcknowledgment: requiresAcknowledgment || false,
        isRead: false
      }).returning();

      res.json({ success: true, communicationId: communication.id });
    } catch (error) {
      console.error("Error sending communication:", error);
      res.status(500).json({ error: "Failed to send communication" });
    }
  });

  app.delete("/api/admin/invitations/:inviteId", async (req, res) => {
    try {
      const { inviteId } = req.params;
      
      // Delete invitation from database
      await db.delete(adminUsers)
        .where(eq(adminUsers.id, inviteId));
      
      res.json({ success: true, message: "Invitation revoked" });
    } catch (error) {
      console.error("Error revoking invitation:", error);
      res.status(500).json({ error: "Failed to revoke invitation" });
    }
  });

  app.patch("/api/admin/users/:adminId/status", async (req, res) => {
    try {
      const { adminId } = req.params;
      const { isActive } = req.body;
      
      // Update admin status in database
      await db.update(adminUsers)
        .set({ 
          isActive: isActive,
          updatedAt: new Date()
        })
        .where(eq(adminUsers.id, adminId));
      
      res.json({ success: true, message: "Admin status updated" });
    } catch (error) {
      console.error("Error updating admin status:", error);
      res.status(500).json({ error: "Failed to update admin status" });
    }
  });

  // Admin Training Center Routes - ADMIN ONLY ACCESS
  
  app.get("/api/admin/training/progress", async (req, res) => {
    try {
      // Query actual training progress from database
      const trainingProgress = await db.select()
        .from(adminTrainingProgress)
        .orderBy(desc(adminTrainingProgress.updatedAt));
      
      res.json(trainingProgress);
    } catch (error) {
      console.error("Error fetching training progress:", error);
      res.status(500).json({ error: "Failed to fetch training progress" });
    }
  });

  app.get("/api/admin/training/modules", async (req, res) => {
    try {
      // Query actual training modules from database
      const modules = await db.select()
        .from(adminTrainingModules)
        .where(eq(adminTrainingModules.isActive, true))
        .orderBy(adminTrainingModules.category, adminTrainingModules.requiredLevel);
      
      res.json(modules);
    } catch (error) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ error: "Failed to fetch training modules" });
    }
  });

  app.get("/api/admin/training/knowledge-checklist", async (req, res) => {
    try {
      // Query knowledge checklist items from database
      const knowledgeItems = await db.select()
        .from(adminKnowledgeItems)
        .where(eq(adminKnowledgeItems.isActive, true))
        .orderBy(adminKnowledgeItems.category, adminKnowledgeItems.importance);
      
      res.json(knowledgeItems);
    } catch (error) {
      console.error("Error fetching knowledge checklist:", error);
      res.status(500).json({ error: "Failed to fetch knowledge checklist" });
    }
  });

  app.post("/api/admin/training/progress", async (req, res) => {
    try {
      const { adminUserId, moduleId, status, score, answers } = req.body;
      
      // Insert or update training progress
      const progressRecord = {
        id: crypto.randomUUID(),
        adminUserId,
        moduleId,
        status,
        score,
        answers,
        timeSpent: req.body.timeSpent || 0,
        attempts: 1,
        lastAttemptAt: new Date(),
        createdAt: new Date()
      };
      
      await db.insert(adminTrainingProgress).values(progressRecord);
      
      res.json({ success: true, progressId: progressRecord.id });
    } catch (error) {
      console.error("Error updating training progress:", error);
      res.status(500).json({ error: "Failed to update training progress" });
    }
  });

  app.get("/api/admin/profile", async (req, res) => {
    try {
      // Mock admin profile data
      const profile = {
        id: "admin_1",
        certificationLevel: "basic",
        specializations: ["user_management"],
        trainingStatus: "in_progress"
      };
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin profile" });
    }
  });

  app.post("/api/admin/training/modules/:moduleId/start", async (req, res) => {
    try {
      const { moduleId } = req.params;
      // Mock start module logic
      res.json({ success: true, message: "Module started" });
    } catch (error) {
      res.status(500).json({ error: "Failed to start module" });
    }
  });

  app.post("/api/admin/training/modules/:moduleId/complete", async (req, res) => {
    try {
      const { moduleId } = req.params;
      const { answers } = req.body;
      
      // Mock completion logic with scoring
      const score = Math.floor(Math.random() * 30) + 70; // Random score 70-100
      const passed = score >= 80;
      
      res.json({ success: true, score, passed });
    } catch (error) {
      res.status(500).json({ error: "Failed to complete module" });
    }
  });

  app.patch("/api/admin/training/knowledge-checklist", async (req, res) => {
    try {
      const { itemId, completed } = req.body;
      // Mock checklist update
      res.json({ success: true, message: "Checklist updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update checklist" });
    }
  });

  // AI-powered endpoints using OpenAI
  app.post("/api/ai/business-insights", async (req, res) => {
    try {
      const businessData = req.body;
      const insights = await openaiService.generateBusinessInsights(businessData);
      res.json({ insights });
    } catch (error) {
      console.error("Error generating business insights:", error);
      res.status(500).json({ error: "Failed to generate business insights" });
    }
  });

  app.post("/api/ai/campaign-suggestions", async (req, res) => {
    try {
      const businessContext = req.body;
      const suggestion = await openaiService.generateCampaignSuggestion(businessContext);
      res.json({ suggestion });
    } catch (error) {
      console.error("Error generating campaign suggestion:", error);
      res.status(500).json({ error: "Failed to generate campaign suggestion" });
    }
  });

  app.post("/api/ai/pricing-optimization", async (req, res) => {
    try {
      const pricingData = req.body;
      const optimizations = await openaiService.analyzePricing(pricingData);
      res.json({ optimizations });
    } catch (error) {
      console.error("Error analyzing pricing:", error);
      res.status(500).json({ error: "Failed to analyze pricing" });
    }
  });

  app.post("/api/ai/predictive-analytics", async (req, res) => {
    try {
      const historicalData = req.body;
      const analytics = await openaiService.generatePredictiveAnalytics(historicalData);
      res.json({ analytics });
    } catch (error) {
      console.error("Error generating predictive analytics:", error);
      res.status(500).json({ error: "Failed to generate predictive analytics" });
    }
  });

  app.post("/api/ai/customer-behavior", async (req, res) => {
    try {
      const customerData = req.body;
      const analysis = await openaiService.analyzeCustomerBehavior(customerData);
      res.json({ analysis });
    } catch (error) {
      console.error("Error analyzing customer behavior:", error);
      res.status(500).json({ error: "Failed to analyze customer behavior" });
    }
  });

  // Communication API routes
  app.get("/api/communication/channels", async (req, res) => {
    try {
      const channels = [
        {
          id: "testing-main",
          name: "Testing Partnership",
          type: "testing",
          participants: ["admin", "partner"],
          unreadCount: 0
        },
        {
          id: "merchants-general",
          name: "Merchant Collaboration",
          type: "group",
          participants: ["merchant1", "merchant2", "merchant3"],
          unreadCount: 2
        },
        {
          id: "campaign-winter",
          name: "Winter Campaign Planning",
          type: "campaign",
          participants: ["merchant1", "merchant2"],
          unreadCount: 1
        }
      ];
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.get("/api/communication/messages/:channelId", async (req, res) => {
    try {
      const { channelId } = req.params;
      const messages = [
        {
          id: "1",
          senderId: "partner",
          senderName: "Testing Partner",
          content: "Ready to start testing the platform!",
          timestamp: new Date(),
          type: "text",
          status: "read"
        }
      ];
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Setup WebSocket server for communication
  const communicationWss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws/communication' 
  });

  const connectedUsers = new Map<string, WebSocket>();

  communicationWss.on('connection', (ws: WebSocket) => {
    const userId = `user_${Date.now()}`;
    connectedUsers.set(userId, ws);

    console.log(`Communication client connected: ${userId}`);

    // Send current online users
    const onlineUsers = Array.from(connectedUsers.keys());
    ws.send(JSON.stringify({
      type: 'user-status',
      onlineUsers
    }));

    // Broadcast new user to all clients
    connectedUsers.forEach((client, clientId) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'user-status',
          onlineUsers
        }));
      }
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'message':
            // Broadcast message to all clients in the channel
            connectedUsers.forEach((client, clientId) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'message',
                  channelId: message.channelId,
                  message: message.message
                }));
              }
            });
            break;

          case 'call-offer':
          case 'call-answer':
          case 'ice-candidate':
            // Forward WebRTC signaling to specific user or all users in channel
            connectedUsers.forEach((client, clientId) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data.toString());
              }
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      connectedUsers.delete(userId);
      console.log(`Communication client disconnected: ${userId}`);
      
      // Broadcast updated user list
      const onlineUsers = Array.from(connectedUsers.keys());
      connectedUsers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'user-status',
            onlineUsers
          }));
        }
      });
    });

    ws.on('error', (error) => {
      console.error('Communication WebSocket error:', error);
    });
  });

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

  app.get("/api/profile", (req, res) => {
    // Return mock profile for now
    res.json({
      id: "user-123",
      firstName: "John",
      lastName: "Doe", 
      contactName: "John",
      email: "john@example.com",
      businessName: "Demo Business",
      businessTitle: "Owner",
      setupComplete: false,
      subscriptionTier: "business" // Enable premium features for testing
    });
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

  return httpServer;
}
