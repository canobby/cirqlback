// Server-side subscription pricing — the SINGLE source of truth for what a plan
// costs. The charge amount must never come from the client (a client that sends
// its own `amount` could pay $0.50 for a paid plan). Amounts are in cents.
//
// Prices (owner decision 2026-07-01, aligned to the product vision): Core $19.99
// / Pro $49.99; starter is free (6-month trial). Keep THIS map and
// GET /api/subscription/plans in sync. Yearly = 10x monthly (2 months free).

export type BillingInterval = "monthly" | "yearly";

export interface PlanPrice {
  id: string;
  name: string;
  monthlyCents: number;
  yearlyCents: number;
}

export const PLAN_PRICING: Record<string, PlanPrice> = {
  core: { id: "core", name: "Core", monthlyCents: 1999, yearlyCents: 19990 },
  pro: { id: "pro", name: "Pro", monthlyCents: 4999, yearlyCents: 49990 },
};

/**
 * Resolve the charge amount (in cents) for a plan + interval, or null if the
 * plan is unknown or free (nothing to charge). Callers should reject null.
 */
export function resolvePlanAmountCents(
  planId: string,
  interval: BillingInterval,
): number | null {
  const plan = PLAN_PRICING[planId];
  if (!plan) return null;
  const cents = interval === "yearly" ? plan.yearlyCents : plan.monthlyCents;
  return cents > 0 ? cents : null;
}

// Stable Stripe Price lookup_key for a plan+interval (Phase 3 subscriptions).
// The setup script (scripts/stripe-setup-products.ts) creates Prices with these
// keys, and the subscription endpoint resolves the Price by key at runtime — so
// no Price IDs are hardcoded in the app.
export function planLookupKey(planId: string, interval: BillingInterval): string {
  return `cirqlback_${planId}_${interval}`;
}
