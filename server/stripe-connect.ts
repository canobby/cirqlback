// Stripe Connect (Express) helpers — lets a business RECEIVE automated payouts
// (Phase 1: the host's share of a shared-campaign reward). Driver-side auto-
// collection is a later phase. All functions degrade to a clear error when
// STRIPE_SECRET_KEY is not configured, so the rest of the app keeps working.
import type Stripe from "stripe";

const API_VERSION = "2025-07-30.basil" as any;

let cached: Stripe | null | undefined;

export async function getStripe(): Promise<Stripe | null> {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  const StripeCtor = (await import("stripe")).default;
  cached = new StripeCtor(key, { apiVersion: API_VERSION });
  return cached;
}

// Create an Express connected account for a business (payouts only for now).
export async function createExpressAccount(email?: string | null): Promise<string> {
  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const account = await stripe.accounts.create({
    type: "express",
    email: email || undefined,
    capabilities: { transfers: { requested: true } },
    business_type: "company",
    metadata: { platform: "Cirqlback" },
  });
  return account.id;
}

// A Stripe-hosted onboarding link the business completes to enable payouts.
export async function createOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<string> {
  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

export type ConnectStatus = { payoutsEnabled: boolean; detailsSubmitted: boolean; chargesEnabled: boolean };

export async function getAccountStatus(accountId: string): Promise<ConnectStatus> {
  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const acct = await stripe.accounts.retrieve(accountId);
  return {
    payoutsEnabled: !!acct.payouts_enabled,
    detailsSubmitted: !!acct.details_submitted,
    chargesEnabled: !!acct.charges_enabled,
  };
}

// Transfer funds from the platform balance to a connected account. Idempotency
// key prevents a double payout if the settlement action is retried.
export async function createTransfer(input: {
  amountCents: number;
  currency?: string;
  destinationAccountId: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const stripe = await getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const transfer = await stripe.transfers.create(
    {
      amount: input.amountCents,
      currency: input.currency || "usd",
      destination: input.destinationAccountId,
      metadata: input.metadata,
    },
    { idempotencyKey: input.idempotencyKey },
  );
  return transfer.id;
}
