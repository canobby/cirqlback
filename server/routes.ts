import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import { handleTextTranslation, handleVoiceTranslation, handleTextToSpeech } from "./translation-service";
import { getMapsConfig } from "./maps-proxy";
import { setupAuth, isAuthenticated, isAdminAuthenticated, isCoordinator } from "./auth";
import { storage } from "./storage";
import type { RouteDeps } from "./routes/_shared";
import { registerCoordinatorRoutes } from "./routes/coordinator";
import { registerGroupCampaignRoutes } from "./routes/group-campaigns";
import { registerAccountSubscriptionRoutes } from "./routes/account-subscription";
import { registerBusinessesCampaignsNfcRoutes } from "./routes/businesses-campaigns-nfc";
import { registerTapsRewardsRoutes } from "./routes/taps-rewards";
import { registerEngagementRoutes } from "./routes/engagement";
import { registerProfileSettingsRoutes } from "./routes/profile-settings";
import { registerGamificationTeamsRoutes } from "./routes/gamification-teams";
import { registerDiscoveryMarketingRoutes } from "./routes/discovery-marketing";
import { registerSearchPaymentsRoutes } from "./routes/search-payments";
import { registerBusinessWebsiteSalesRoutes } from "./routes/business-website-sales";
import { registerAdminRoutes } from "./routes/admin";
import { registerProfileQuestSalesRoutes } from "./routes/profile-quest-sales";
import { registerMessageRoutes } from "./routes/messages";
import { registerRewardsOpsRoutes } from "./routes/rewards-ops";
import { registerRewardSettlementRoutes } from "./routes/reward-settlements";
import { registerConnectRoutes } from "./routes/connect";
import { registerBadgeRoutes } from "./routes/badges";
import { registerPointsEconomyRoutes } from "./routes/points-economy";
import { registerReferralRoutes } from "./routes/referrals";
import { registerCollectionRoutes } from "./routes/collections";
import { registerLeaderboardRoutes } from "./routes/leaderboards";
import { registerSpinEventRoutes } from "./routes/spin-events";
import { registerSocialRoutes } from "./routes/social";
import { registerAssistantRoutes } from "./routes/assistant";

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

  // CHR-13: require a valid session for user-private route groups. Identity
  // inside these handlers comes from req.user — never from a client-supplied
  // userId/customerId. Public discovery endpoints (businesses, campaigns, map,
  // search, taps, subscription plans, translate) intentionally stay open.
  const privatePrefixes = [
    '/api/account',
    '/api/customer/profile',
    '/api/settings',
    '/api/subscription/trial-discount',
    '/api/gamification',
    '/api/teams',
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

  // CHR-51: every /api/coordinator/* route requires an active coordinator.
  app.use('/api/coordinator', isCoordinator);

  // CHR-16: does the authenticated user own the business behind a resource?
  const userOwnsBusiness = async (userId: string, businessId?: string | null): Promise<boolean> => {
    if (!businessId) return false;
    const business = await storage.getBusiness(businessId);
    return !!business && business.ownerId === userId;
  };
  const deps: RouteDeps = { userOwnsBusiness };

  // Domain routers (CHR-24). Registration order is preserved from the original
  // monolithic file — a few paths are intentionally duplicated and Express uses
  // the first-registered handler, so the order below is load-bearing.
  registerAccountSubscriptionRoutes(app, deps);
  registerBusinessesCampaignsNfcRoutes(app, deps);
  registerTapsRewardsRoutes(app, deps);
  registerEngagementRoutes(app, deps);
  registerProfileSettingsRoutes(app, deps);
  registerGamificationTeamsRoutes(app, deps);
  registerDiscoveryMarketingRoutes(app, deps);
  registerSearchPaymentsRoutes(app, deps);
  registerBusinessWebsiteSalesRoutes(app, deps);
  registerAdminRoutes(app, deps);
  registerProfileQuestSalesRoutes(app, deps);
  registerCoordinatorRoutes(app, deps);
  registerGroupCampaignRoutes(app, deps);
  // Cross-role messaging (Slice 1: coordinator ↔ business). Auth is per-route
  // (isAuthenticated); the actor's role in each thread is resolved server-side.
  registerMessageRoutes(app, deps);
  // Manual reward/points adjustments (admin: any customer; coordinator:
  // territory-scoped). Gated by the /api/admin and /api/coordinator prefixes.
  registerRewardsOpsRoutes(app, deps);
  // Shared-campaign reward cost-split settlements (merchant view + admin/
  // coordinator generate & mark-settled).
  registerRewardSettlementRoutes(app, deps);
  // Stripe Connect (Express) onboarding so businesses can receive payouts.
  registerConnectRoutes(app, deps);
  // Badges (recognition) — manual awarding across roles + public display.
  registerBadgeRoutes(app, deps);
  // Points economy — spend points on business perks, platform perks, prize draws.
  registerPointsEconomyRoutes(app, deps);
  // Rewarded referral loop (both parties earn on the referee's first tap).
  registerReferralRoutes(app, deps);
  // Collections / passports (visit a curated set of businesses → bonus points).
  registerCollectionRoutes(app, deps);
  // Seasonal (monthly) + local (territory) leaderboards.
  registerLeaderboardRoutes(app, deps);
  // Daily spin + seasonal events (tap point multipliers).
  registerSpinEventRoutes(app, deps);
  // Social layer: friends + teams (fresh /api/social/* paths).
  registerSocialRoutes(app, deps);
  // In-dashboard Help Assistant (AI how-to guide, grounded in the manuals).
  registerAssistantRoutes(app, deps);

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

  return httpServer;
}
