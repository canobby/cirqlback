// Server-side add-on catalog — the SINGLE source of truth for what each paid
// add-on costs and what it unlocks (CHR-35 / CHR-65). Like server/pricing.ts,
// the purchase amount is resolved here, never from the client.
//
// Prices (owner decision 2026-07-01): kept in a $5–$15 band so an add-on doesn't
// double a $19.99 Core bill. Amounts are in cents; add-ons bill monthly.

export type AddonKey =
  | "map_priority"
  | "advanced_analytics"
  | "custom_branding"
  | "scavenger_builder"
  | "hosted_website";

export interface AddonDef {
  key: AddonKey;
  name: string;
  priceCents: number;
  blurb: string;
  // Subscription tiers that get this add-on included for free. A business on one
  // of these tiers is treated as entitled without a purchase, and is never
  // charged for it. Others pay `priceCents`. (Owner decision 2026-07-02:
  // hosted_website is free on Pro, paid on Core.)
  includedInTiers?: string[];
}

export const ADDON_CATALOG: Record<AddonKey, AddonDef> = {
  map_priority: {
    key: "map_priority",
    name: "Map Priority Placement",
    priceCents: 1499,
    blurb: "Feature your business with a boosted, highlighted pin on the discovery map.",
  },
  advanced_analytics: {
    key: "advanced_analytics",
    name: "Advanced Analytics Pack",
    priceCents: 1299,
    blurb: "Best-performing tag zones, return-delay insights, and busiest-hour heatmaps.",
  },
  custom_branding: {
    key: "custom_branding",
    name: "Custom Tap-Screen Branding",
    priceCents: 799,
    blurb: "Your colors, slogan, and links on the customer tap page.",
  },
  scavenger_builder: {
    key: "scavenger_builder",
    name: "Contest & Scavenger Hunt Builder",
    priceCents: 1499,
    blurb: "Build multi-stop scavenger hunts and prize contests.",
  },
  // Pro-tier add-on: a hosted one-page business site the owner customizes
  // (brand color, fonts, hero, section order) with live Cirql rewards baked in.
  // Content lives on the businesses.website_* columns; served at /biz/:slug.
  hosted_website: {
    key: "hosted_website",
    name: "Hosted Business Page",
    priceCents: 1499,
    blurb: "A customizable one-page website at cirqlback.com/biz/you — your brand, hours, specials, and live Cirql rewards.",
    includedInTiers: ["pro"], // free for Pro, $14.99/mo for Core
  },
};

export function isAddonKey(key: unknown): key is AddonKey {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(ADDON_CATALOG, key);
}

/** Resolve the charge amount (cents) for an add-on, or null if unknown. */
export function resolveAddonAmountCents(key: string): number | null {
  return isAddonKey(key) ? ADDON_CATALOG[key].priceCents : null;
}

/** Whether a given subscription tier gets this add-on included for free. */
export function isAddonIncludedInTier(key: string, tier: string | null | undefined): boolean {
  if (!isAddonKey(key) || !tier) return false;
  return (ADDON_CATALOG[key].includedInTiers ?? []).includes(tier);
}
