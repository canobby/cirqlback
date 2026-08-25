import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import type { RouteDeps } from "./_shared";
import { createExpressAccount, createOnboardingLink, getAccountStatus, getStripe } from "../stripe-connect";

// Stripe Connect (Express) onboarding for businesses so they can RECEIVE
// automated payouts (Phase 1: a host's owed share of shared-campaign rewards).
// Owner-gated; Stripe-hosted onboarding. Degrades to a clear 400 when Stripe
// isn't configured.
export function registerConnectRoutes(app: Express, deps: RouteDeps) {
  const { userOwnsBusiness } = deps;
  const origin = (req: any) => `${req.protocol}://${req.get("host")}`;

  // Start (or resume) onboarding: ensure a connected account exists, then return
  // a fresh Stripe-hosted onboarding link.
  app.post("/api/connect/onboard", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const businessId = String(req.body?.businessId ?? "");
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      if (!(await userOwnsBusiness(userId, businessId))) {
        return res.status(403).json({ error: "Not your business" });
      }
      if (!(await getStripe())) {
        return res.status(400).json({ error: "Payouts aren't configured yet (no Stripe key)." });
      }
      const business = await storage.getBusiness(businessId);
      if (!business) return res.status(404).json({ error: "Business not found" });

      let accountId = (business as any).stripeConnectAccountId as string | null;
      if (!accountId) {
        accountId = await createExpressAccount((business as any).email);
        await storage.updateBusiness(businessId, { stripeConnectAccountId: accountId } as any);
      }
      const url = await createOnboardingLink(
        accountId,
        `${origin(req)}/merchant?connect=refresh`,
        `${origin(req)}/merchant?connect=done`,
      );
      res.json({ url });
    } catch (error: any) {
      console.error("Connect onboard error:", error);
      res.status(500).json({ error: error?.message?.slice(0, 160) || "Failed to start onboarding" });
    }
  });

  // Current payout-readiness for a business the caller owns. Refreshes from
  // Stripe and persists the flags so the settlement UI can gate the payout action.
  app.get("/api/connect/status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id as string;
      const businessId = typeof req.query.businessId === "string" ? req.query.businessId : "";
      if (!businessId) return res.status(400).json({ error: "businessId is required" });
      if (!(await userOwnsBusiness(userId, businessId))) {
        return res.status(403).json({ error: "Not your business" });
      }
      const business = await storage.getBusiness(businessId);
      const accountId = (business as any)?.stripeConnectAccountId as string | null;
      if (!accountId || !(await getStripe())) {
        return res.json({ connected: false, payoutsEnabled: false, detailsSubmitted: false });
      }
      const status = await getAccountStatus(accountId);
      await storage.updateBusiness(businessId, {
        connectPayoutsEnabled: status.payoutsEnabled,
        connectDetailsSubmitted: status.detailsSubmitted,
        connectOnboardedAt: status.payoutsEnabled && !(business as any).connectOnboardedAt ? new Date() : (business as any).connectOnboardedAt,
      } as any);
      res.json({ connected: true, ...status });
    } catch (error: any) {
      console.error("Connect status error:", error);
      res.status(500).json({ error: "Failed to load payout status" });
    }
  });
}
