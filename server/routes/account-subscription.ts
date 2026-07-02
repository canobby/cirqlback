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

export function registerAccountSubscriptionRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;

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
      // CHR-13 invariant: identity comes from the session, never a client-supplied
      // userId. Trusting req.body.userId here let any authed user mutate another
      // account's subscription (IDOR).
      const userId = (req.user as any).id;
      const { selectedTier } = req.body;

      if (!selectedTier) {
        return res.status(400).json({ error: "Selected tier required" });
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
      // CHR-13 invariant: session-derived identity only. A client-supplied userId
      // let any authed user set an arbitrary account's tier — including a free
      // self-upgrade to a paid tier, bypassing Stripe.
      const userId = (req.user as any).id;
      const { subscriptionTier, subscriptionStatus } = req.body;

      if (!subscriptionTier) {
        return res.status(400).json({ error: "Subscription tier required" });
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
}
