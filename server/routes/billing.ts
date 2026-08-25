import type { Express, RequestHandler } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { resolveBilling, billingBlocksAccess } from "../billing-state";
import type { User } from "@shared/schema";
import type { RouteDeps } from "./_shared";

// Middleware: block a merchant action when the account is locked or suspended for
// non-payment. Re-reads the user so enforcement never relies on a stale session.
// Returns 402 with a machine-readable code the client can react to.
export const requireActiveBilling: RequestHandler = async (req, res, next) => {
  const sessionUser = req.user as User | undefined;
  if (!sessionUser) return res.status(401).json({ message: "Unauthorized" });
  const user = (await storage.getUser(sessionUser.id)) || sessionUser;
  const info = resolveBilling(user);
  if (billingBlocksAccess(info.state)) {
    return res.status(402).json({
      code: "billing_locked",
      state: info.state,
      error:
        info.state === "suspended"
          ? "Your account is suspended for non-payment. Update your billing to restore service."
          : "Your account is locked for non-payment. Update your billing to restore service.",
    });
  }
  next();
};

export function registerBillingRoutes(app: Express, _deps: RouteDeps) {
  // The current user's billing status — the merchant dashboard uses this to show
  // the lock screen / past-due banner.
  app.get("/api/billing/status", isAuthenticated, async (req, res) => {
    const user = await storage.getUser((req.user as User).id);
    if (!user) return res.status(404).json({ error: "Not found" });
    const info = resolveBilling(user);
    res.json({
      state: info.state,
      tier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      pastDueSince: info.pastDueSince,
      paidThroughDate: info.paidThroughDate,
      lockAt: info.lockAt,
      suspendAt: info.suspendAt,
    });
  });
}
