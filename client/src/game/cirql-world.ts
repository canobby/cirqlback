// CIRQL — the world data model (CHR-217, CHR-218).
//
// CIRQL is the flagship: a persistent, magical, social world of concentric
// island-rings. This file is the *data* — ring/biome definitions + the props on
// each ring — kept declarative so new rings are added forever as config. The
// renderer (cirql-world-engine.ts) is generic and draws whatever these describe.
//
// Ring 0 = "The Hearth" (home). Outer rings are stubbed here and shown only on
// the minimap under fog until the community's sparks open them (Phase 2).

export type PropType =
  | "hearth"    // the home cottage (your Cirql lanterns ring it)
  | "wonders"   // the in-world arcade building (doorway → the 50 Wonders)
  | "npc"       // a quest-giver / townsperson
  | "tree"
  | "bush"      // a leafy bush (solid) — scatter + maze/labyrinth walls (CHR-259)
  | "lantern"   // a plain path lantern
  | "crystal"
  | "dock"      // sail outward to another ring
  | "marker"    // a quest waypoint target
  | "tablet"    // a Myst-style clue stone (inspect → grants the puzzle + shows the clue)
  | "rune"      // a puzzle rune you toggle on/off
  | "shrine"    // sealed until the runes match the clue → opens for the reward
  | "gathering" // a social gathering spot (bonfire commons) — every ring has one
  | "theater"   // the Cirql Drive-In: an outdoor screen cycling fake movie posters (ring 2)
  | "rock"      // a solid boulder — walk around it
  | "pond"      // a little water feature — walk around it
  | "flower"    // a decorative flower cluster (soft — walk through)
  | "wisp"      // a collectible drifting light — walk over to gather (Phase K3 "gather" quests)
  | "fence"     // a short fence segment (solid — walk around)
  | "path"      // a dirt/stone trail patch (ground decoration — walk over)
  | "landmark"  // a focal set-piece (Great Tree, stone circle, lighthouse…) — quest home + meeting spot (Phase J4)
  | "shop"      // a Town storefront — walk in to enter the shop interior (Milestone F)
  | "portal";   // a cave/hollow-tree/cloud-stair — travel to a sub-map (CHR-265)

export type LandmarkKind = "greattree" | "stonecircle" | "lighthouse" | "crystal" | "waterfall" | "ruin";

export interface Prop {
  t: PropType;
  x: number;
  y: number;
  id?: string;          // stable id (interaction targets, quest refs)
  label?: string;
  accent?: string;      // glow/label colour override
  to?: number;          // dock: destination ring index
  big?: boolean;        // larger tree/crystal
  r?: number;           // interaction/collision radius override (world units)
  vert?: boolean;       // fence: draw the segment vertically (for corral sides)
  sub?: "cave" | "tree" | "cloud" | "up";   // portal kind (CHR-265)
  lm?: LandmarkKind;    // landmark set-piece kind (Phase J4)
  shopId?: string;      // shop storefront/keeper this prop belongs to (Milestone F)
}

export interface RingPalette {
  sky: [string, string];
  sea: string;
  land: string;
  grass: string;
  sand: string;
  accent: string;       // biome signature (lanterns, UI)
  mote: string;         // floating-light colour
}

export interface Ring {
  index: number;
  name: string;
  sub: string;
  radius: number;       // island radius in world units
  explorable: boolean;
  palette: RingPalette;
  spawn: { x: number; y: number };
  props: Prop[];
  puzzleTarget?: string[];   // rune ids that must be lit (and no others) to open the shrine (CHR-258)
  ambient?: "butterfly" | "firefly" | "ember" | "snow" | "gull" | "dust" | "bee" | "dragonfly" | "grasshopper";   // drifting critters/particles for the biome
}

// ---- Ring 0: CIRQLSPACE — the player's blank, buildable home island ----------
// Owner pivot (2026-07): CIRQLSPACE is YOUR space. It ships nearly empty — a guide NPC
// + a dock to the Town — and everything on it is placed by the player (décor + terrain,
// milestones B/C). The engine draws the player's saved build on top.
const CIRQLSPACE: Ring = {
  index: 0,
  name: "CIRQLSPACE",
  sub: "your space",
  radius: 430,
  explorable: true,
  palette: {
    sky: ["#241640", "#12163a"],
    sea: "#0c2036",
    land: "#243a2f",
    grass: "#2f5340",
    sand: "#c9ad74",
    accent: "#ffc46b",
    mote: "#ffd98a",
  },
  spawn: { x: 0, y: 150 },
  props: [
    // your guide — teaches building; then the how-to lives in your Inventory (CHR-269)
    { t: "npc", x: -50, y: 96, id: "guide", label: "Cirqla", accent: "#7fffe6", r: 34 },
    // the dock out to the Town (ring 1) — where all the game lives
    { t: "dock", x: 0, y: 400, to: 1, label: "the Town", id: "dock-out" },
  ],
  ambient: "butterfly",
};

// ---- Ring 1: the Town — the authored community hub (all the game lives here) --
// Everything that used to clutter the home island now lives here, so there's ONE shared
// entrance/experience: CirqlCade (the arcade door), Ferra the quest-giver, the Commons,
// the Sunken Runes puzzle, the onboarding targets. Shops (milestone F) land here too.
const TOWN: Ring = {
  index: 1,
  name: "Town",
  sub: "the community",
  radius: 470,
  explorable: true,
  palette: { sky: ["#241640", "#12163a"], sea: "#0c2036", land: "#243a2f", grass: "#2f5340", sand: "#c9ad74", accent: "#ffc46b", mote: "#ffd98a" },
  spawn: { x: 0, y: -300 },
  props: [
    // the Town Hall (the old home cottage, re-cast as a civic landmark)
    { t: "hearth", x: 0, y: -70, id: "townhall", label: "Town Hall" },
    // CirqlCade — the in-world arcade; ONE shared entrance for everyone
    { t: "wonders", x: 250, y: 40, id: "wonders", label: "CirqlCade", accent: "#b26cff", r: 46 },
    // Ferra — the quest-giver (the world tutorials give here now)
    { t: "npc", x: -60, y: 120, id: "keeper", label: "Ferra", accent: "#7fffe6", r: 34 },
    // the named Town cast (Phase K2) — each teaches one system with their own voice
    { t: "npc", x: 150, y: -110, id: "cartographer", label: "Marin", accent: "#6fd8ff", r: 30 },
    { t: "npc", x: 60, y: 210, id: "bard", label: "Lio", accent: "#ff9d5c", r: 30 },
    // scenery — a leafy town green
    { t: "tree", x: 190, y: -220, big: true }, { t: "tree", x: -230, y: -180 }, { t: "tree", x: 330, y: -120, big: true },
    { t: "tree", x: -340, y: 120 }, { t: "tree", x: 120, y: 250 }, { t: "tree", x: -150, y: 280, big: true },
    { t: "tree", x: 300, y: 220 }, { t: "tree", x: 255, y: -55 }, { t: "tree", x: -300, y: -55, big: true }, { t: "tree", x: 350, y: 60 },
    { t: "bush", x: -110, y: 200 }, { t: "bush", x: 240, y: -140 }, { t: "bush", x: 315, y: 175 },
    { t: "rock", x: 285, y: 130 }, { t: "rock", x: -285, y: 200, big: true }, { t: "rock", x: 175, y: -150 },
    { t: "pond", x: -320, y: 55, r: 26 },
    { t: "flower", x: 100, y: 110, accent: "#ff8fbf" }, { t: "flower", x: 114, y: 120, accent: "#ffd24a" }, { t: "flower", x: 90, y: 124, accent: "#e0a0ff" },
    { t: "flower", x: -150, y: -60, accent: "#8fd0ff" }, { t: "flower", x: -138, y: -50, accent: "#ffd24a" }, { t: "flower", x: 185, y: -55, accent: "#ffd24a" },
    // a dirt path up to the hall
    { t: "path", x: 0, y: 112 }, { t: "path", x: 8, y: 74 }, { t: "path", x: -6, y: 34 }, { t: "path", x: 4, y: -6 },
    // path lanterns to CirqlCade — quest targets for "The Lantern Path"
    { t: "lantern", x: 95, y: 75, id: "ql1" }, { t: "lantern", x: 165, y: 55, id: "ql2" }, { t: "lantern", x: 215, y: 35, id: "ql3" },
    // docks: inward → CIRQLSPACE (ring 0), onward → the wilds (ring 2)
    { t: "dock", x: 0, y: -420, to: 0, label: "↩ CIRQLSPACE", id: "dock-in" },
    { t: "dock", x: 0, y: 420, to: 2, label: "sail onward →", id: "dock-out" },
    // Find Your Feet waypoint target
    { t: "marker", x: -230, y: -20, id: "marker-shore", label: "" },
    // The Sunken Runes — a hidden puzzle (moved here from the old home island)
    { t: "tablet", x: -150, y: -186, id: "rune-tablet", label: "Runestone" },
    { t: "rune", x: -138, y: -240, id: "rn0" }, { t: "rune", x: -108, y: -216, id: "rn1" },
    { t: "rune", x: -72, y: -216, id: "rn2" }, { t: "rune", x: -42, y: -240, id: "rn3" },
    { t: "shrine", x: -90, y: -278, id: "rune-shrine", label: "Sealed Shrine" },
    // the Commons — the town's social gathering spot
    { t: "gathering", x: 130, y: 185, id: "commons", label: "The Commons" },
    // a cave mouth → The Undervault (sub-map of ring 1 = index 100001)
    { t: "portal", x: -340, y: -40, to: 100001, sub: "cave", label: "cave" },
    // ── Milestone F: the Town shops. Walk into a storefront → its interior (quick fade).
    // `to` = SHOP_BASE(400000) + slot; ids/order live in cirql-shops.ts (SHOP_ORDER).
    { t: "shop", x: -250, y: 10,  to: 400001, shopId: "general",  id: "shop-general",  label: "General Store",   accent: "#ffd98a" },
    { t: "shop", x: -340, y: 250, to: 400002, shopId: "boutique", id: "shop-boutique", label: "The Looking Glass", accent: "#ff9dd6" },
    { t: "shop", x: 330,  y: -40, to: 400003, shopId: "garden",   id: "shop-garden",   label: "Garden & Grove",  accent: "#8fe6a0" },
    { t: "shop", x: 360,  y: 250, to: 400004, shopId: "curios",   id: "shop-curios",   label: "Curios & Wonders", accent: "#c79dff" },
    { t: "shop", x: -160, y: 330, to: 400005, shopId: "building", id: "shop-building", label: "Timber & Stone",  accent: "#ffb877" },
  ],
  puzzleTarget: ["rn0", "rn2", "rn3"],
  ambient: "butterfly",
};

export const RINGS: Ring[] = [CIRQLSPACE, TOWN];

// How many concentric rings the minimap draws (sells "the world never ends").
export const MINIMAP_RINGS = 8;
// How many are currently "known" (bright); the rest are fog. Grows as you explore.
export const KNOWN_RINGS = 2;
