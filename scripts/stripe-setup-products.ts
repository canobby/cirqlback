// Create the Stripe Products + recurring Prices for Cirqlback subscriptions
// (Phase 3). Idempotent: prices are keyed by a stable `lookup_key`, so re-running
// reuses existing ones. Run against your TEST Stripe.
//
//   npx tsx scripts/stripe-setup-products.ts
//
// Prints the lookup_key -> price id map. The app resolves prices by lookup_key
// at runtime, so you don't need to copy IDs anywhere.
import "dotenv/config";
import Stripe from "stripe";
import { PLAN_PRICING, planLookupKey, type BillingInterval } from "../server/pricing";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("STRIPE_SECRET_KEY must be set.");
const stripe = new Stripe(key, { apiVersion: "2025-07-30.basil" as any });

async function findOrCreateProduct(planId: string, name: string): Promise<string> {
  const existing = await stripe.products.search({
    query: `metadata['cirqlback_plan']:'${planId}' AND active:'true'`,
    limit: 1,
  });
  if (existing.data[0]) return existing.data[0].id;
  const product = await stripe.products.create({
    name: `Cirqlback ${name}`,
    metadata: { cirqlback_plan: planId },
  });
  return product.id;
}

async function ensurePrice(
  productId: string,
  planId: string,
  interval: BillingInterval,
  cents: number,
): Promise<{ lookupKey: string; priceId: string; created: boolean }> {
  const lookupKey = planLookupKey(planId, interval);
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) return { lookupKey, priceId: existing.data[0].id, created: false };
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: cents,
    currency: "usd",
    recurring: { interval: interval === "yearly" ? "year" : "month" },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: { cirqlback_plan: planId, cirqlback_interval: interval },
  });
  return { lookupKey, priceId: price.id, created: true };
}

async function main() {
  const mode = key!.startsWith("sk_live") ? "LIVE" : "TEST";
  console.log(`Setting up Cirqlback subscription products in ${mode} mode…\n`);
  for (const plan of Object.values(PLAN_PRICING)) {
    const productId = await findOrCreateProduct(plan.id, plan.name);
    for (const interval of ["monthly", "yearly"] as BillingInterval[]) {
      const cents = interval === "yearly" ? plan.yearlyCents : plan.monthlyCents;
      const r = await ensurePrice(productId, plan.id, interval, cents);
      console.log(`  ${r.lookupKey.padEnd(26)} -> ${r.priceId} ($${(cents / 100).toFixed(2)}) ${r.created ? "[created]" : "[exists]"}`);
    }
  }
  console.log("\nDone. The app resolves these by lookup_key at runtime.");
}

main().catch((err) => {
  console.error("Stripe product setup failed:", err);
  process.exit(1);
});
