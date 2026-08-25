// CIRQL — Milestone F: Shop Interiors.
//
// Town (ring 1) has five enterable shop buildings. Walking into a storefront swaps you
// (quick fade) into that shop's small, cozy INTERIOR — a walkable room with a keeper NPC
// behind a counter. Talking to the keeper opens that store's inventory (the page's store
// panel), which REPLACES the old menu-buying: you now buy stock from shopkeepers, and
// place it on your CIRQLSPACE from the build palette (owned items only).
//
// Interiors reuse the proven sub-map machinery: each shop is a sub-map ring at a dedicated
// index (SHOP_BASE + slot). sailTo() already swaps to sub-maps instantly = the quick fade
// we want; they don't lift the fog. getRing() returns shopInterior() for those indices.
//
// This file owns: the five shop definitions, the index<->id mapping, the authored interior
// rings, and which catalog items each shop sells (the split + a few per-store exclusives).

import type { Ring, RingPalette, Prop } from "./cirql-world";
import { DECOR } from "./cirql-decor";
import { renownStanding, rankTitle } from "./cirql-renown";

export type ShopId = "general" | "boutique" | "garden" | "curios" | "building";

// Fixed order → interior ring index. SHOP_BASE sits above the cloud sub-map band (300000+)
// so shop indices never collide with a cloud sub-map. index = SHOP_BASE + (slot+1).
export const SHOP_BASE = 400000;
export const SHOP_ORDER: ShopId[] = ["general", "boutique", "garden", "curios", "building"];
export const shopIndex = (id: ShopId): number => SHOP_BASE + SHOP_ORDER.indexOf(id) + 1;
export const isShop = (index: number): boolean => index > SHOP_BASE && index <= SHOP_BASE + SHOP_ORDER.length;
export const shopIdAt = (index: number): ShopId | null => (isShop(index) ? SHOP_ORDER[index - SHOP_BASE - 1] : null);

export interface ShopDef {
  id: ShopId;
  name: string;                 // storefront + interior display name
  sub: string;                  // interior subtitle
  glyph: string;                // storefront sign icon
  accent: string;               // sign + keeper glow
  keeper: { id: string; label: string; accent: string };
  greeting: string[];           // K1-style lines the keeper opens the store with
  palette: RingPalette;         // interior room palette (warm/cozy)
  // Boutique opens the character creator instead of a stock grid (avatar cosmetics live there).
  opensCreator?: boolean;
}

// Warm interior palettes — a floating "room" island in each shop's tone.
const woodFloor = (grass: string, accent: string, mote: string): RingPalette => ({
  sky: ["#20140c", "#140d08"], sea: "#160f0a", land: "#3a2a1c", grass, sand: "#6b4e30", accent, mote,
});

export const SHOPS: Record<ShopId, ShopDef> = {
  general: {
    id: "general", name: "The General Store", sub: "everyday wares", glyph: "🛒", accent: "#ffd98a",
    keeper: { id: "shopkeeper-general", label: "Pip", accent: "#ffd98a" },
    greeting: ["Welcome in! Pip's the name.", "Benches, lamps, banners — the everyday bits to make a place feel lived-in.", "Have a browse."],
    palette: woodFloor("#5a4326", "#ffd98a", "#ffe9b0"),
  },
  boutique: {
    id: "boutique", name: "The Looking Glass", sub: "styles & finery", glyph: "👗", accent: "#ff9dd6",
    keeper: { id: "shopkeeper-boutique", label: "Vella", accent: "#ff9dd6" },
    greeting: ["Ooh, a new face — and such potential!", "Step to the mirror, darling. Auras, crowns, a whole new you.", "Let's find your look."],
    palette: woodFloor("#5a2e46", "#ff9dd6", "#ffd0ec"),
    opensCreator: true,
  },
  garden: {
    id: "garden", name: "Garden & Grove", sub: "green & growing", glyph: "🌿", accent: "#8fe6a0",
    keeper: { id: "shopkeeper-garden", label: "Fenn", accent: "#8fe6a0" },
    greeting: ["Mind the ferns! Fenn, at your service.", "Trees, ponds, blooms — everything to green up your CIRQLSPACE.", "Take your time."],
    palette: woodFloor("#2f5330", "#8fe6a0", "#d6ffcf"),
  },
  curios: {
    id: "curios", name: "Curios & Wonders", sub: "the rare & strange", glyph: "🔮", accent: "#c79dff",
    keeper: { id: "shopkeeper-curios", label: "Mira", accent: "#c79dff" },
    greeting: ["...ah. You have the eye for it, I think.", "Comets. Fallen stars. Things that only turn up once in a long while.", "Some pieces ask for a little Renown before they'll come home with you."],
    palette: woodFloor("#3a2e5a", "#c79dff", "#ecd6ff"),
  },
  building: {
    id: "building", name: "Timber & Stone", sub: "build supplies", glyph: "🧱", accent: "#ffb877",
    keeper: { id: "shopkeeper-building", label: "Dorn", accent: "#ffb877" },
    greeting: ["Building something? Good. Dorn's your man.", "Paths, fences, bridges, towers — the bones of any place.", "What do you need?"],
    palette: woodFloor("#4a3a24", "#ffb877", "#ffe0bf"),
  },
};

// ---- Catalog split: which shop sells each décor item ------------------------
// Source of truth stays cirql-decor.ts (one catalog); this maps every item + the new
// exclusives to a shop, plus optional Renown gating for the aspirational Curios pieces.
export const SHOP_OF: Record<string, ShopId> = {
  // Garden & Grove — nature + a couple of exclusives
  tree: "garden", bigtree: "garden", bush: "garden", boulder: "garden", stone: "garden",
  pond: "garden", flower: "garden", "flower-gold": "garden", "flower-blue": "garden",
  toadstool: "garden", topiary: "garden", planter: "garden", birdhouse: "garden",
  sunflower: "garden", beehive: "garden",
  // Timber & Stone — paths + structures
  pathbrick: "building", fence: "building", arch: "building", bridge: "building",
  gate: "building", tower: "building", windmill: "building",
  signpost: "building", watchtower: "building",
  // The General Store — furniture + lights staples
  bench: "general", picnic: "general", banner: "general", mailbox: "general",
  lantern: "general", campfire: "general", fairylights: "general", torch: "general",
  statue: "general", fountain: "general",
  clock: "general", streetlamp: "general",
  // Curios & Wonders — special + rare exclusives (some gated)
  crystal: "curios", rainbow: "curios", star: "curios", "portal-deco": "curios",
  moon: "curios", comet: "curios", hourglass: "curios", snowglobe: "curios",
  wishlantern: "curios", royalcrown: "curios",
};

// Minimum Renown RANK INDEX required to buy an item (0 = none). Curios' showpieces.
export const SHOP_GATE: Record<string, number> = {
  royalcrown: 4,   // Trailblazer
  comet: 3,        // Voyager
};

/** Items a shop sells, in catalog order (décor defs; the store panel renders them). */
export const shopStock = (id: ShopId) => DECOR.filter((d) => SHOP_OF[d.id] === id);

/** Can the player (with `renown`) buy this item? Returns [ok, requiredRankTitle]. */
export function gateCheck(itemId: string, renown: number): { ok: boolean; needRank: string | null } {
  const need = SHOP_GATE[itemId] ?? 0;
  if (need <= 0) return { ok: true, needRank: null };
  const have = renownStanding(renown).index;
  return { ok: have >= need, needRank: have >= need ? null : rankTitle(need) };
}

/** The authored interior room for a shop — a cozy walkable island with a keeper + exit door. */
export function shopInterior(id: ShopId): Ring {
  const s = SHOPS[id];
  const radius = 210;
  // The interior is now drawn as a real four-walled ROOM (the engine's interior render mode uses
  // the room renderer for shop/home indices) — so we only need the two interactive props: the
  // keeper behind the counter (north) + the exit doorway (south). Furniture lives in the renderer.
  const props: Prop[] = [
    { t: "portal", x: 0, y: 200, to: 1, sub: "up", label: `↩ leave ${s.name}` },
    { t: "npc", x: 0, y: -98, id: s.keeper.id, label: s.keeper.label, accent: s.keeper.accent, r: 48, shopId: id },
  ];
  return {
    index: shopIndex(id), name: s.name, sub: s.sub, radius, explorable: true,
    palette: s.palette, spawn: { x: 0, y: 150 }, props, ambient: "firefly",
  };
}
