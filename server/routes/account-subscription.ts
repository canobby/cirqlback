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
          return res.status(404).json({ error: "User not found" });
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
        res.status(500).json({ error: "Failed to check expiration" });
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

  // CHR-77: the former POST /api/subscription/update was removed. It had no
  // caller and let any authenticated user set their own tier to a paid plan
  // without payment. Real subscription changes happen via the Stripe
  // payment_intent.succeeded webhook (CHR-15) → storage.updateUserSubscription.
  // Business routes
}
