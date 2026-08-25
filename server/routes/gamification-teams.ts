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

export function registerGamificationTeamsRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

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
}
