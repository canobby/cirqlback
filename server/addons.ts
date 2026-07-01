// Server-side add-on catalog — the SINGLE source of truth for what each paid
// add-on costs and what it unlocks (CHR-35 / CHR-65). Like server/pricing.ts,
// the purchase amount is resolved here, never from the client.
//
// Prices are PLACEHOLDERS pending an owner pricing decision (same open item as
// the Core/Pro subscription numbers). Amounts are in cents; add-ons bill monthly.

export type AddonKey =
  | "map_priority"
  | "advanced_analytics"
  | "custom_branding"
  | "scavenger_builder";

export interface AddonDef {
  key: AddonKey;
  name: string;
  priceCents: number;
  blurb: string;
}

export const ADDON_CATALOG: Record<AddonKey, AddonDef> = {
  map_priority: {
    key: "map_priority",
    name: "Map Priority Placement",
    priceCents: 1999,
    blurb: "Feature your business with a boosted, highlighted pin on the discovery map.",
  },
  advanced_analytics: {
    key: "advanced_analytics",
    name: "Advanced Analytics Pack",
    priceCents: 1499,
    blurb: "Best-performing tag zones, return-delay insights, and busiest-hour heatmaps.",
  },
  custom_branding: {
    key: "custom_branding",
    name: "Custom Tap-Screen Branding",
    priceCents: 999,
    blurb: "Your colors, slogan, and links on the customer tap page.",
  },
  scavenger_builder: {
    key: "scavenger_builder",
    name: "Contest & Scavenger Hunt Builder",
    priceCents: 1999,
    blurb: "Build multi-stop scavenger hunts and prize contests.",
  },
};

export function isAddonKey(key: unknown): key is AddonKey {
  return typeof key === "string" && key in ADDON_CATALOG;
}

/** Resolve the charge amount (cents) for an add-on, or null if unknown. */
export function resolveAddonAmountCents(key: string): number | null {
  return isAddonKey(key) ? ADDON_CATALOG[key].priceCents : null;
}
