// Server-side subscription pricing — the SINGLE source of truth for what a plan
// costs. The charge amount must never come from the client (a client that sends
// its own `amount` could pay $0.50 for a paid plan). Amounts are in cents.
//
// NOTE: these mirror the catalog returned by GET /api/subscription/plans
// (professional $39 / business $79 / enterprise $149; starter is free). The
// product vision document quotes different names/prices (Core $19.99 /
// Pro $49.99) — reconciling that is a product decision (see CHR-15). Whatever is
// decided, keep THIS map and /api/subscription/plans in sync.

export type BillingInterval = "monthly" | "yearly";

export interface PlanPrice {
  id: string;
  name: string;
  monthlyCents: number;
  yearlyCents: number;
}

export const PLAN_PRICING: Record<string, PlanPrice> = {
  professional: { id: "professional", name: "Professional", monthlyCents: 3900, yearlyCents: 39000 },
  business: { id: "business", name: "Business", monthlyCents: 7900, yearlyCents: 79000 },
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
