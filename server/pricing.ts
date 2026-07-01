// Server-side subscription pricing — the SINGLE source of truth for what a plan
// costs. The charge amount must never come from the client (a client that sends
// its own `amount` could pay $0.50 for a paid plan). Amounts are in cents.
//
// Prices (owner decision 2026-06-30): professional $49.99 / business $79.99 /
// enterprise $149; starter is free. Keep THIS map and GET /api/subscription/plans
// in sync. Yearly = ~10x monthly (2 months free).

export type BillingInterval = "monthly" | "yearly";

export interface PlanPrice {
  id: string;
  name: string;
  monthlyCents: number;
  yearlyCents: number;
}

export const PLAN_PRICING: Record<string, PlanPrice> = {
  professional: { id: "professional", name: "Professional", monthlyCents: 4999, yearlyCents: 49990 },
  business: { id: "business", name: "Business", monthlyCents: 7999, yearlyCents: 79990 },
  enterprise: { id: "enterprise", name: "Enterprise", monthlyCents: 14900, yearlyCents: 149000 },
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
