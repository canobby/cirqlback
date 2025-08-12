import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBusinessSchema, insertCampaignSchema, insertNfcTagSchema, insertTapSchema, insertRewardSchema, insertTapTrailSchema, insertReferralSchema } from "@shared/schema";
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
      if (!businessId) {
        return res.status(400).json({ error: "Business ID required" });
      }
      const campaigns = await storage.getCampaigns(businessId);
      res.json(campaigns);
    } catch (error) {
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
      const businessId = req.query.businessId as string;
      if (!businessId) {
        return res.status(400).json({ error: "Business ID required" });
      }
      
      // Get basic analytics data
      const taps = await storage.getTaps(businessId);
      const campaigns = await storage.getCampaigns(businessId);
      
      // Calculate analytics
      const totalTaps = taps.length;
      const uniqueCustomers = new Set(taps.map(tap => tap.customerEmail)).size;
      const recentTaps = taps.slice(0, 10);
      
      const campaignPerformance = campaigns.map(campaign => ({
        name: campaign.name,
        taps: taps.filter(tap => tap.campaignId === campaign.id).length,
        redemptions: campaign.currentRedemptions || 0,
      }));

      res.json({
        totalTaps,
        uniqueCustomers,
        recentTaps,
        campaignPerformance,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
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
