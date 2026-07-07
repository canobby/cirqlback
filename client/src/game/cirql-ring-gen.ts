// CIRQLVERSE — M10 procedural rings (CHR-255).
//
// "Sail outward forever." Beyond the authored Hearth (ring 0), every ring is generated
// deterministically from its index — a seeded biome, palette, name, scattered props and
// two docks (one inward toward home, one onward into the fog). Same declarative `Ring`
// shape the renderer already consumes (cirql-world.ts), so the world engine draws a
// generated ring exactly like an authored one. Reuses the CirqlBreak infinite-worlds
// seeding idea: pure function of the index → the same land for everyone, every time.

import { RINGS, type Ring, type Prop, type RingPalette, type LandmarkKind } from "./cirql-world";

// deterministic RNG seeded from an integer (mulberry32)
function rngFrom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Biome {
  key: string;
  palette: RingPalette;
  tree: boolean;       // scatter trees
  crystals: number;    // crystal clusters
  lanterns: number;    // path lanterns
  rocks: number;       // boulders (solid)
  pond: boolean;       // a little water feature (solid)
  flowers: number;     // decorative flower clusters
  fence: boolean;      // a fence segment
  path: boolean;       // a dirt/stone trail from the shore inland
  ambient: "butterfly" | "firefly" | "ember" | "snow" | "gull" | "dust" | "bee" | "dragonfly" | "grasshopper";   // signature critter
  landmark: LandmarkKind;   // the biome's signature focal set-piece (Phase J4)
}

// Each biome is its own SCENE / season — distinct palette + landscape mix + the critter
// that belongs there. As you sail outward the rings cycle through them, so every shore
// feels different (spring meadow, tropical lagoon, winter, dry desert, autumn wood…).
const BIOMES: Biome[] = [
  // spring meadow — flowers galore, a fence, butterflies
  { key: "meadow", tree: true, crystals: 0, lanterns: 3, rocks: 1, pond: true, flowers: 12, fence: false, path: true, ambient: "butterfly", landmark: "greattree",
    palette: { sky: ["#20331f", "#12241a"], sea: "#0e2c33", land: "#2a5a30", grass: "#43884a", sand: "#cdb87a", accent: "#a6f06a", mote: "#e0ffb0" } },
  // tropical lagoon — turquoise water, palms, dragonflies
  { key: "tropical", tree: true, crystals: 0, lanterns: 4, rocks: 2, pond: true, flowers: 7, fence: false, path: true, ambient: "dragonfly", landmark: "waterfall",
    palette: { sky: ["#0e3040", "#0a2233"], sea: "#0a5f70", land: "#1f5a52", grass: "#2f8a6a", sand: "#f0e0a0", accent: "#4fe0d0", mote: "#bafff0" } },
  // winter — snow, frosted trees, pale + still
  { key: "winter", tree: true, crystals: 2, lanterns: 4, rocks: 3, pond: false, flowers: 0, fence: false, path: true, ambient: "snow", landmark: "crystal",
    palette: { sky: ["#1b2740", "#101a30"], sea: "#173a56", land: "#3a4a60", grass: "#5a6f88", sand: "#dfeaf6", accent: "#bfe6ff", mote: "#eef7ff" } },
  // dry desert — sand + red rock, many boulders, no trees, grasshoppers
  { key: "desert", tree: false, crystals: 1, lanterns: 3, rocks: 9, pond: false, flowers: 1, fence: false, path: true, ambient: "grasshopper", landmark: "ruin",
    palette: { sky: ["#3a2414", "#20140c"], sea: "#243026", land: "#6a4526", grass: "#8a6a34", sand: "#e8c485", accent: "#ffb058", mote: "#ffe0a8" } },
  // autumn wood — amber trees, a fence, bees
  { key: "autumn", tree: true, crystals: 0, lanterns: 4, rocks: 2, pond: false, flowers: 3, fence: false, path: true, ambient: "bee", landmark: "stonecircle",
    palette: { sky: ["#2e1c12", "#1a1008"], sea: "#243026", land: "#5a3a1e", grass: "#8a5a26", sand: "#d8b070", accent: "#ff9a3c", mote: "#ffd090" } },
  // deep woodland — dense trees, a pond, fireflies
  { key: "woodland", tree: true, crystals: 1, lanterns: 4, rocks: 3, pond: true, flowers: 4, fence: false, path: true, ambient: "firefly", landmark: "greattree",
    palette: { sky: ["#12241a", "#0a160f"], sea: "#0c2036", land: "#1c3a26", grass: "#2a5a38", sand: "#a89060", accent: "#8ef0a0", mote: "#c8ffd6" } },
  // sunlit coast — beach, gulls, rocks
  { key: "coast", tree: true, crystals: 0, lanterns: 5, rocks: 5, pond: false, flowers: 2, fence: false, path: false, ambient: "gull", landmark: "lighthouse",
    palette: { sky: ["#183048", "#0e1c34"], sea: "#0a5578", land: "#20464a", grass: "#2f7a6a", sand: "#f0dca0", accent: "#6fd8ff", mote: "#bff0ff" } },
  // ember reach — volcanic, rising embers
  { key: "ember", tree: false, crystals: 2, lanterns: 3, rocks: 5, pond: false, flowers: 0, fence: false, path: true, ambient: "ember", landmark: "ruin",
    palette: { sky: ["#2e1622", "#1a0f16"], sea: "#241016", land: "#4a2020", grass: "#6a3028", sand: "#caa070", accent: "#ff7a4c", mote: "#ffb890" } },
];

const FLOWER_COLS = ["#ff8fbf", "#ffd24a", "#ffffff", "#e0a0ff", "#ff6b6b", "#8fd0ff"];

const NAME_A = ["Whisper", "Ember", "Frost", "Gleam", "Coral", "Dusk", "Mist", "Thorn", "Amber", "Silver", "Hollow", "Sable", "Lumen", "Verdant", "Aurora", "Cinder"];
// suffixes — no "hollow"/"hearth" so we never double a stem or collide with the home ring
const NAME_B = ["wood", "fall", "reach", "cove", "spire", "marsh", "strand", "vale", "expanse", "shoal", "haven", "wilds", "bazaar", "tide", "crest", "moor"];

function ringNameFor(rng: () => number): string {
  const a = pick(rng, NAME_A);
  let b = pick(rng, NAME_B);
  // avoid a suffix that repeats the stem's ending (e.g. "Coral" + "reach" is fine, but guard doublings)
  if (a.toLowerCase().endsWith(b)) b = pick(rng, NAME_B);
  return a + b;
}
const KEEPERS = ["Sable", "Wren", "Cass", "Orin", "Vale", "Pip", "Rook", "Ilse", "Bram", "Nyx", "Fen", "Lune"];
const SUBS = ["a quiet shore", "beyond the fog", "a windswept land", "where lanterns drift", "an uncharted ring", "far from home", "a shore of echoes"];

function pick<T>(rng: () => number, arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

const TAU = Math.PI * 2;

// ---- purposeful landscape formations (things look built/placed, not random scatter) ----
function placeGrove(props: Prop[], cx: number, cy: number, n: number, rng: () => number) {
  for (let i = 0; i < n; i++) { const a = rng() * TAU, r = 6 + rng() * 22; props.push({ t: "tree", x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.7, big: rng() > 0.6 }); }
}
function placeFlowerBed(props: Prop[], cx: number, cy: number, n: number, rng: () => number) {
  for (let i = 0; i < n; i++) { const a = rng() * TAU, r = rng() * 15; props.push({ t: "flower", x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.7, accent: pick(rng, FLOWER_COLS) }); }
}
function placeRockCairn(props: Prop[], cx: number, cy: number, n: number, rng: () => number) {
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rng() * 0.6, r = 5 + i * 3.5; props.push({ t: "rock", x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.7, big: i === 0 }); }
}
// a fenced enclosure (corral) with one open side — reads as built for a purpose
function placeCorral(props: Prop[], cx: number, cy: number, hw: number, hh: number, rng: () => number) {
  const gap = Math.floor(rng() * 4), step = 22;   // which side is the opening
  for (let x = -hw; x <= hw + 0.1; x += step) {
    if (gap !== 0 || Math.abs(x) > step) props.push({ t: "fence", x: cx + x, y: cy - hh });
    if (gap !== 1 || Math.abs(x) > step) props.push({ t: "fence", x: cx + x, y: cy + hh });
  }
  for (let y = -hh + step; y < hh - 0.1; y += step) {
    if (gap !== 2 || Math.abs(y) > step) props.push({ t: "fence", x: cx - hw, y: cy + y, vert: true });
    if (gap !== 3 || Math.abs(y) > step) props.push({ t: "fence", x: cx + hw, y: cy + y, vert: true });
  }
}
// a straight run of fence (a field boundary)
function placeFenceRow(props: Prop[], cx: number, cy: number, len: number, vert: boolean) {
  const n = Math.max(2, Math.round(len / 22));
  for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * 22; props.push(vert ? { t: "fence", x: cx, y: cy + off, vert: true } : { t: "fence", x: cx + off, y: cy }); }
}

/** Generate the ring at `index` (>= 2 — the wilds beyond CIRQLSPACE + Town). Deterministic. */
export function generateRing(index: number): Ring {
  const rng = rngFrom(Math.imul(index, 2654435761) ^ 0x9e3779b9);
  // stride through the biomes so consecutive rings are always a different scene and all
  // biomes get used (3 is coprime with 8 → cycles through every biome, no adjacent repeats)
  const biome = BIOMES[(index * 3 + 1) % BIOMES.length];
  const name = ringNameFor(rng);
  // rings grow the farther out you sail — more room to roam + populate (Hearth is 430)
  const radius = 440 + index * 55 + Math.floor(rng() * 70);
  const props: Prop[] = [];

  // two docks: inward (north → index-1) and onward (south → index+1)
  props.push({ t: "dock", x: 0, y: -radius * 0.86, to: index - 1, label: "↩ inward", id: "dock-in" });
  props.push({ t: "dock", x: 0, y: radius * 0.9, to: index + 1, label: "sail onward →", id: "dock-out" });

  // a keeper NPC to greet arrivals (templated quests hang off this later — CHR-256)
  const keeper = pick(rng, KEEPERS);
  props.push({ t: "npc", x: (rng() - 0.5) * radius * 0.5, y: (rng() - 0.4) * radius * 0.4, id: `keeper-${index}`, label: keeper, accent: biome.palette.accent });

  // scattered scenery, deterministic + kept off the north/south dock lanes
  const place = (t: Prop["t"], extra?: Partial<Prop>) => {
    for (let tries = 0; tries < 8; tries++) {
      const a = rng() * Math.PI * 2, rr = radius * (0.28 + rng() * 0.5);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (Math.abs(x) < radius * 0.16 && Math.abs(y) > radius * 0.55) continue;  // keep dock lanes clear
      props.push({ t, x, y, ...extra });
      return;
    }
  };
  // scale scenery with the island's size so bigger rings don't feel empty
  const sizeScale = radius / 460;
  const scaled = (n: number) => n <= 0 ? 0 : Math.max(1, Math.round(n * sizeScale));
  // a clear anchor away from the north/south dock lanes (formation centre)
  const clearSpot = (): { x: number; y: number } => {
    for (let tries = 0; tries < 12; tries++) {
      const a = rng() * TAU, rr = radius * (0.22 + rng() * 0.48), x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (Math.abs(x) < radius * 0.16 && Math.abs(y) > radius * 0.55) continue;
      return { x, y };
    }
    return { x: radius * 0.3, y: radius * 0.1 };
  };
  // trees: a couple of GROVES (clumps) + a little loose scatter
  if (biome.tree) {
    for (let g = 0; g < scaled(2); g++) { const c = clearSpot(); placeGrove(props, c.x, c.y, 3 + Math.floor(rng() * 3), rng); }
    for (let i = 0; i < scaled(2); i++) place("tree", { big: rng() > 0.6 });
  }
  // rocks: a CAIRN formation (+ scatter for rocky biomes like desert)
  if (biome.rocks > 0) { const c = clearSpot(); placeRockCairn(props, c.x, c.y, Math.min(6, scaled(biome.rocks)), rng); for (let i = 0; i < scaled(Math.max(0, biome.rocks - 4)); i++) place("rock", { big: rng() > 0.6 }); }
  // flowers: BEDS (clusters), not lone scatter
  if (biome.flowers > 0) { const beds = Math.max(1, Math.round(scaled(biome.flowers) / 5)); for (let b = 0; b < beds; b++) { const c = clearSpot(); placeFlowerBed(props, c.x, c.y, 5, rng); } }
  for (let i = 0; i < scaled(biome.crystals); i++) place("crystal", { big: rng() > 0.5, accent: biome.palette.accent });
  for (let i = 0; i < scaled(biome.lanterns); i++) place("lantern");
  // bushes: a little clump — scenery + reusable as maze/labyrinth walls for quests (CHR-259)
  { const c = clearSpot(); const bn = scaled(biome.tree ? 4 : 2); for (let i = 0; i < bn; i++) props.push({ t: "bush", x: c.x + (rng() - 0.5) * 44, y: c.y + (rng() - 0.5) * 44 }); }
  // larger rings get extra pockets of a DIFFERENT feel (a little grove + flowerbed — an
  // oasis even on a desert ring) so a big island isn't one uniform scene throughout
  if (radius > 620) { const g = clearSpot(); placeGrove(props, g.x, g.y, 3 + Math.floor(rng() * 2), rng); const f = clearSpot(); placeFlowerBed(props, f.x, f.y, 6, rng); if (rng() > 0.5) { const p = clearSpot(); props.push({ t: "pond", x: p.x, y: p.y, r: 20 + Math.floor(rng() * 10) }); } }
  // a PORTAL to a sub-map on many rings (an interactive voyage down/up — CHR-265)
  const portalKind: SubKind | null = (biome.key === "desert" || biome.key === "ember") ? "cave" : (biome.key === "woodland" || biome.key === "meadow" || biome.key === "autumn") ? "tree" : (biome.key === "winter" || biome.key === "coast") ? "cloud" : null;
  if (portalKind) { const c = clearSpot(); props.push({ t: "portal", x: c.x, y: c.y, to: subIndex(portalKind, index), sub: portalKind, label: portalKind === "cave" ? "cave" : portalKind === "tree" ? "hollow tree" : "cloud stair" }); }
  // a dirt trail leading inland from the shore (along the arrival lane)
  if (biome.path) { const n = 5; for (let k = 0; k < n; k++) props.push({ t: "path", x: Math.sin(k * 1.3 + index) * 16, y: -radius * 0.6 + k * (radius * 0.42 / n) }); }
  if (biome.pond) {
    for (let tries = 0; tries < 8; tries++) {
      const a = rng() * Math.PI * 2, rr = radius * (0.3 + rng() * 0.32);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (Math.abs(x) < radius * 0.16 && Math.abs(y) > radius * 0.55) continue;   // keep the dock lanes clear
      props.push({ t: "pond", x, y, r: 20 + Math.floor(rng() * 12) });
      break;
    }
  }

  // the biome's FOCAL LANDMARK (Phase J4) — a memorable set-piece that doubles as a quest
  // home + postcard subject + meeting spot. Placed prominently to one side, off the dock lanes.
  {
    const lm = biome.landmark, lmSide = rng() > 0.5 ? 1 : -1;
    const lmLabel: Record<LandmarkKind, string> = { greattree: "The Great Tree", stonecircle: "The Stone Circle", lighthouse: "The Lighthouse", crystal: "The Great Crystal", waterfall: "The Falls", ruin: "The Old Ruin" };
    props.push({ t: "landmark", x: lmSide * radius * (0.34 + rng() * 0.12), y: (rng() - 0.5) * radius * 0.3, lm, id: `landmark-${index}`, label: lmLabel[lm], accent: biome.palette.accent, r: 46 });
  }
  // a social gathering spot on every ring — ring 2's is the Cirql Drive-In (an outdoor
  // movie screen); the rest get a bonfire commons. Placed east/west, off the dock lanes.
  if (index === 2) {
    props.push({ t: "theater", x: radius * 0.34, y: -radius * 0.02, id: "theater", label: "Cirql Drive-In", r: 52 });
  } else {
    const side = rng() > 0.5 ? 1 : -1;
    props.push({ t: "gathering", x: side * radius * 0.42, y: (rng() - 0.5) * radius * 0.22, id: "commons", label: "The Commons" });
  }

  // stable ids so the quest-template generator (CHR-256) can target this ring's own
  // lanterns + crystals; unique per ring so the lit-set never collides across rings
  let li = 0, ci = 0;
  for (const p of props) {
    if (p.t === "lantern" && !p.id) p.id = `r${index}l${li++}`;
    else if (p.t === "crystal" && !p.id) p.id = `r${index}c${ci++}`;
  }

  return {
    index,
    name,
    sub: pick(rng, SUBS),
    radius,
    explorable: true,
    palette: biome.palette,
    spawn: { x: 0, y: -radius * 0.68 },   // arrive near the inward dock
    props,
    ambient: biome.ambient,               // the critter that belongs to this scene
  };
}

// ---- sub-maps (CHR-265): tunnels/caves, treetops, clouds ----
// A sub-map is a ring reached by a PORTAL rather than a dock. Its index encodes its
// kind + the surface ring it hangs off, so getRing() can generate it on demand and a
// return portal can point back at the parent. Sub-maps don't extend the fog / maxRing.
const SUB_BASE = 100000;
export const SUB_OFFSET = { cave: 100000, tree: 200000, cloud: 300000 } as const;
export type SubKind = keyof typeof SUB_OFFSET;
export const isSubMap = (index: number) => index >= SUB_BASE;
export const parentOf = (index: number) => index % SUB_BASE;
export const subKindOf = (index: number): SubKind | null => index >= 300000 ? "cloud" : index >= 200000 ? "tree" : index >= SUB_BASE ? "cave" : null;
export const subIndex = (kind: SubKind, parent: number) => SUB_OFFSET[kind] + parent;

const SUB_META: Record<SubKind, { name: string; sub: string; radius: number; ambient: Ring["ambient"]; palette: RingPalette }> = {
  cave: { name: "The Undervault", sub: "deep beneath the shore", radius: 360, ambient: "firefly",
    palette: { sky: ["#0e0a12", "#060409"], sea: "#0a0710", land: "#1c1622", grass: "#2a2030", sand: "#3a2e28", accent: "#7fd8ff", mote: "#bfeaff" } },
  tree: { name: "The High Canopy", sub: "up among the leaves", radius: 420, ambient: "gull",
    palette: { sky: ["#2a3a1c", "#16240f"], sea: "#3a5a2a", land: "#3a5a28", grass: "#4f8a3a", sand: "#7a5a34", accent: "#b6ff6a", mote: "#e0ffb0" } },
  cloud: { name: "The Cloud Reach", sub: "high in the sky", radius: 440, ambient: "butterfly",
    palette: { sky: ["#a8c8e8", "#7aa8d8"], sea: "#cfe2f4", land: "#e6f0fa", grass: "#f4f8ff", sand: "#dfeaf6", accent: "#ffffff", mote: "#ffffff" } },
};

/** Generate a sub-map (cave/treetop/cloud) that returns to its parent surface ring. */
function generateSubMap(kind: SubKind, parent: number, index: number): Ring {
  const m = SUB_META[kind];
  const rng = rngFrom(Math.imul(index, 0x85ebca6b) ^ 0x27d4eb2f);
  const radius = m.radius, props: Prop[] = [];
  // the way back up to the surface (north)
  props.push({ t: "portal", x: 0, y: -radius * 0.72, to: parent, sub: "up", label: kind === "cave" ? "↑ surface" : "↓ surface" });
  // a keeper to greet you
  props.push({ t: "npc", x: (rng() - 0.5) * radius * 0.4, y: (rng() - 0.2) * radius * 0.35, id: `keeper-${index}`, label: pick(rng, KEEPERS), accent: m.palette.accent });
  const place = (t: Prop["t"], extra?: Partial<Prop>) => { const a = rng() * TAU, rr = radius * (0.2 + rng() * 0.5); props.push({ t, x: Math.cos(a) * rr, y: Math.sin(a) * rr, ...extra }); };
  if (kind === "cave") { for (let i = 0; i < 6; i++) place("crystal", { big: rng() > 0.5, accent: m.palette.accent }); for (let i = 0; i < 8; i++) place("flower", { accent: rng() > 0.5 ? "#7fffb0" : "#7fd8ff" }); for (let i = 0; i < 5; i++) place("rock", { big: rng() > 0.6 }); }
  else if (kind === "tree") { for (let i = 0; i < 7; i++) place("tree", { big: rng() > 0.4 }); for (let i = 0; i < 6; i++) place("flower", { accent: pick(rng, FLOWER_COLS) }); for (let i = 0; i < 4; i++) place("lantern"); }
  else { for (let i = 0; i < 6; i++) place("crystal", { big: true, accent: "#eaf4ff" }); for (let i = 0; i < 5; i++) place("flower", { accent: "#ffffff" }); }
  let li = 0, ci = 0;
  for (const p of props) { if (p.t === "lantern" && !p.id) p.id = `s${index}l${li++}`; else if (p.t === "crystal" && !p.id) p.id = `s${index}c${ci++}`; }
  return { index, name: m.name, sub: m.sub, radius, explorable: true, palette: m.palette, spawn: { x: 0, y: -radius * 0.55 }, props, ambient: m.ambient };
}

/** The ring at `index` — authored CIRQLSPACE (0) + Town (1), generated wilds (>=2), sub-map for big indices. */
export function getRing(index: number): Ring {
  if (index <= 0) return RINGS[0];
  if (index === 1) return RINGS[1];   // the authored Town hub
  if (isSubMap(index)) { const k = subKindOf(index)!; return generateSubMap(k, parentOf(index), index); }
  return generateRing(index);
}

/** Display name for a ring index (authored / generated / sub-map). */
export function ringName(index: number): string {
  if (index <= 0) return RINGS[0].name;
  return getRing(index).name;
}
