// CIRQLVERSE — M10 procedural rings (CHR-255).
//
// "Sail outward forever." Beyond the authored Hearth (ring 0), every ring is generated
// deterministically from its index — a seeded biome, palette, name, scattered props and
// two docks (one inward toward home, one onward into the fog). Same declarative `Ring`
// shape the renderer already consumes (cirql-world.ts), so the world engine draws a
// generated ring exactly like an authored one. Reuses the CirqlBreak infinite-worlds
// seeding idea: pure function of the index → the same land for everyone, every time.

import { RINGS, type Ring, type Prop, type RingPalette, type LandmarkKind } from "./cirql-world";
import { isShop, shopIdAt, shopInterior } from "./cirql-shops";
import { isHome, homeInterior } from "./cirql-home";
import { shade, hueShift } from "./retro-engine";

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
  // deep woodland — mushroom-trees, tentacle-willows, a glowing pond, fireflies (biome-kit
  // pass): a brighter, more saturated green base so the day is colour-forward, with the neon
  // flora popping harder at night.
  { key: "woodland", tree: true, crystals: 1, lanterns: 4, rocks: 3, pond: true, flowers: 5, fence: false, path: true, ambient: "firefly", landmark: "greattree",
    palette: { sky: ["#18402a", "#0d2114"], sea: "#0c2036", land: "#245e3a", grass: "#38975c", sand: "#a89060", accent: "#8ef0a0", mote: "#c8ffd6" } },
  // sunlit coast — beach, gulls, rocks
  { key: "coast", tree: true, crystals: 0, lanterns: 5, rocks: 5, pond: false, flowers: 2, fence: false, path: false, ambient: "gull", landmark: "lighthouse",
    palette: { sky: ["#183048", "#0e1c34"], sea: "#0a5578", land: "#20464a", grass: "#2f7a6a", sand: "#f0dca0", accent: "#6fd8ff", mote: "#bff0ff" } },
  // ember reach — volcanic: dark basalt veined with glowing lava (biome-kit). Obsidian spires,
  // basalt columns, ember-poppies, a lava pool + a salamander. crystals=obsidian, rocks=basalt.
  { key: "ember", tree: false, crystals: 3, lanterns: 3, rocks: 6, pond: true, flowers: 6, fence: false, path: true, ambient: "ember", landmark: "ruin",
    palette: { sky: ["#2a1410", "#160a08"], sea: "#1a0c08", land: "#3a2620", grass: "#4a342c", sand: "#6a4a3a", accent: "#ff6a1a", mote: "#ffab3a" } },
  // mushroom marsh — a bioluminescent bog: giant glowing toadstools, peat water, drifting
  // wisps + a glow-newt. Teal peat with magenta/violet light. (biome-kit)
  { key: "marsh", tree: true, crystals: 1, lanterns: 4, rocks: 2, pond: true, flowers: 4, fence: false, path: true, ambient: "firefly", landmark: "greattree",
    palette: { sky: ["#12242e", "#0a151c"], sea: "#0c2a2e", land: "#1c3a34", grass: "#2c6656", sand: "#7a7a5a", accent: "#c85cff", mote: "#ff9ae0" } },
  // crystal canyon — a stark badland of amber mesas studded with glowing crystal spires + geodes;
  // no trees, a crystal-moth flutters. Red-rock day, cyan crystal light. (biome-kit)
  { key: "canyon", tree: false, crystals: 5, lanterns: 3, rocks: 8, pond: false, flowers: 1, fence: false, path: true, ambient: "dust", landmark: "ruin",
    palette: { sky: ["#3a1e22", "#201014"], sea: "#241a20", land: "#6a3a34", grass: "#8a5540", sand: "#e0a870", accent: "#57e0ff", mote: "#a8ecff" } },
  // golden savanna — warm sunset grassland: flat-top acacias, tall gold grass, a watering hole
  // + a bounding gazelle. Amber light. (biome-kit)
  { key: "savanna", tree: true, crystals: 0, lanterns: 3, rocks: 3, pond: true, flowers: 3, fence: false, path: true, ambient: "grasshopper", landmark: "greattree",
    palette: { sky: ["#3a2a12", "#221808"], sea: "#2a3320", land: "#6a5228", grass: "#b89434", sand: "#e8c878", accent: "#ffcf4a", mote: "#ffe9a0" } },
  // aurora tundra — a night-lit snowfield under dancing aurora: frost-pines, glowing lichen,
  // ice-crystals + a caribou. Deep sky, green/violet light. (biome-kit)
  { key: "aurora", tree: true, crystals: 3, lanterns: 4, rocks: 3, pond: false, flowers: 0, fence: false, path: true, ambient: "snow", landmark: "crystal",
    palette: { sky: ["#101a34", "#0a1024"], sea: "#122844", land: "#26324e", grass: "#3a5270", sand: "#dfeaf6", accent: "#5cffb0", mote: "#b0ffd8" } },
];

const FLOWER_COLS = ["#ff8fbf", "#ffd24a", "#ffffff", "#e0a0ff", "#ff6b6b", "#8fd0ff"];

const NAME_A = ["Whisper", "Ember", "Frost", "Gleam", "Coral", "Dusk", "Mist", "Thorn", "Amber", "Silver", "Hollow", "Sable", "Lumen", "Verdant", "Aurora", "Cinder"];
// suffixes — no "hollow"/"hearth" so we never double a stem or collide with the home ring
const NAME_B = ["wood", "fall", "reach", "cove", "spire", "marsh", "strand", "vale", "expanse", "shoal", "haven", "wilds", "bazaar", "tide", "crest", "moor"];

// BIOME-AWARE NAMING (retro-fit): each shore's name is drawn from its OWN biome's word pools,
// so "Frostreach" can't land on a meadow. Still deterministic from the ring's rng.
const BIOME_NAMES: Record<string, { pre: string[]; suf: string[] }> = {
  meadow:   { pre: ["Bloom", "Clover", "Petal", "Honey", "Willow", "Daisy", "Verdant", "Meadow"], suf: ["vale", "field", "glen", "dale", "haven", "brook", "meadow", "hollow"] },
  tropical: { pre: ["Coral", "Palm", "Lagoon", "Azure", "Sun", "Reef", "Isla", "Tide"],           suf: ["cove", "reach", "shoal", "lagoon", "strand", "isle", "bay", "tide"] },
  winter:   { pre: ["Frost", "Snow", "Glacier", "Rime", "Hoar", "Icicle", "Winter", "Pale"],       suf: ["reach", "crest", "fell", "drift", "peak", "vale", "expanse", "hollow"] },
  desert:   { pre: ["Dune", "Sand", "Scorch", "Mirage", "Sun", "Amber", "Dust", "Ochre"],          suf: ["waste", "flats", "reach", "expanse", "mesa", "span", "strand", "hollow"] },
  autumn:   { pre: ["Amber", "Auburn", "Maple", "Umber", "Harvest", "Ochre", "Rust", "Bramble"],   suf: ["wood", "fall", "grove", "vale", "glen", "reach", "crest", "hollow"] },
  woodland: { pre: ["Whisper", "Fern", "Thorn", "Moss", "Gleam", "Elder", "Verdant", "Hollow"],    suf: ["wood", "wilds", "grove", "thicket", "vale", "glen", "reach", "hollow"] },
  coast:    { pre: ["Gull", "Salt", "Tide", "Pearl", "Wind", "Silver", "Foam", "Drift"],           suf: ["strand", "cove", "reach", "shoal", "bay", "point", "cliff", "tide"] },
  ember:    { pre: ["Cinder", "Ember", "Ash", "Magma", "Char", "Obsidian", "Scoria", "Pyre"],      suf: ["reach", "forge", "spire", "waste", "crag", "vale", "expanse", "hollow"] },
  marsh:    { pre: ["Bog", "Fen", "Mire", "Wisp", "Murk", "Sedge", "Peat", "Willow"],              suf: ["marsh", "mire", "fen", "moor", "mere", "reach", "wilds", "hollow"] },
  canyon:   { pre: ["Cinder", "Rust", "Crystal", "Mesa", "Vermeil", "Gorge", "Amber", "Flint"],    suf: ["mesa", "gorge", "canyon", "strand", "reach", "span", "crag", "expanse"] },
  savanna:  { pre: ["Gold", "Sun", "Acacia", "Amber", "Wheat", "Bramble", "Dusk", "Ochre"],        suf: ["reach", "expanse", "plain", "veldt", "vale", "span", "crest", "savanna"] },
  aurora:   { pre: ["Aurora", "Lumen", "Star", "Mist", "Glimmer", "Halcyon", "Boreal", "Twilight"], suf: ["crest", "reach", "vale", "spire", "light", "haven", "fell", "expanse"] },
};

function ringNameFor(rng: () => number, biomeKey: string): string {
  const pool = BIOME_NAMES[biomeKey] ?? { pre: NAME_A, suf: NAME_B };
  const a = pick(rng, pool.pre);
  let b = pick(rng, pool.suf);
  // avoid a suffix that repeats the stem's ending (e.g. "Bog" + "marsh" is fine; guard "Fen" + "fen")
  if (a.toLowerCase().endsWith(b) || b.startsWith(a.toLowerCase())) b = pick(rng, pool.suf);
  return a + b;
}
const KEEPERS = ["Sable", "Wren", "Cass", "Orin", "Vale", "Pip", "Rook", "Ilse", "Bram", "Nyx", "Fen", "Lune"];
const WANDERERS = ["Tamsin", "Corin", "Mabel", "Dov", "Perrin", "Isolde", "Hale", "Wynn", "Odile", "Bexley", "Ash", "Rue"];
const SUBS = ["a quiet shore", "beyond the fog", "a windswept land", "where lanterns drift", "an uncharted ring", "far from home", "a shore of echoes"];

function pick<T>(rng: () => number, arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

// Give each ring its OWN signature tint so even a repeated biome reads as a distinct place:
// rotate the glow accents' hue and nudge ground lightness deterministically from the index.
// Render-only (never touches prop generation), so quests/layout stay identical.
function varyPalette(base: RingPalette, index: number): RingPalette {
  const vr = rngFrom(Math.imul(index, 40503) ^ 0x51ed270b);
  const deg = (vr() - 0.5) * 74;      // ±37° hue rotate on the neon accents (the "colour of the glow")
  const litL = (vr() - 0.5) * 0.10;   // ±5% land / sky lightness
  const litG = (vr() - 0.5) * 0.12;   // ±6% grass
  const litS = (vr() - 0.5) * 0.08;   // ±4% water
  return {
    sky: [shade(base.sky[0], litL * 0.4), shade(base.sky[1], litL * 0.4)],
    sea: shade(base.sea, litS),
    land: shade(base.land, litL),
    grass: shade(base.grass, litG),
    sand: base.sand,
    accent: hueShift(base.accent, deg),
    mote: hueShift(base.mote, deg),
  };
}

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
// A winding "spine": a readable route from near the inward dock (north) to near the onward
// dock (south), bending through a central beacon hub. Every ring is COMPOSED around it so the
// terrain gently funnels you toward the keeper / landmark / quests (maze-ish, never trapping).
function buildSpine(index: number, radius: number, rng: () => number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const N = 8, dir = rng() > 0.5 ? 1 : -1, amp = radius * (0.2 + rng() * 0.16);
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const y = -radius * 0.72 + radius * 1.5 * f;
    const x = Math.sin(f * Math.PI) * amp * dir + Math.sin(f * Math.PI * 2 + index) * radius * 0.08;
    pts.push({ x, y });
  }
  return pts;
}
// A clump of the biome's "hedge" flora — trees in wooded biomes, rocks in bare ones (plus the
// odd bush). Species cluster by region (see canopyStyle) so a clump reads as one grove/stand.
function wallClump(props: Prop[], cx: number, cy: number, biome: Biome, n: number, rng: () => number) {
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU, r = 6 + rng() * 18, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.7;
    props.push(biome.tree ? { t: "tree", x, y, big: rng() > 0.6 } : { t: "rock", x, y, big: rng() > 0.6 });
    if (rng() > 0.66) props.push({ t: "bush", x: x + (rng() - 0.5) * 12, y: y + 6 });
  }
}

/** Generate the ring at `index` (>= 2 — the wilds beyond CIRQLSPACE + Town). Deterministic. */
export function generateRing(index: number): Ring {
  const rng = rngFrom(Math.imul(index, 2654435761) ^ 0x9e3779b9);
  // stride through the biomes so consecutive rings are always a different scene and all
  // biomes get used (5 is coprime with 12 → cycles through every biome, no adjacent repeats)
  const biome = BIOMES[(index * 5 + 1) % BIOMES.length];
  const name = ringNameFor(rng, biome.key);
  // rings grow the farther out you sail — more room to roam + populate (Hearth is 430)
  const radius = 440 + index * 55 + Math.floor(rng() * 70);
  const props: Prop[] = [];

  // two docks: inward (north → index-1) and onward (south → index+1)
  props.push({ t: "dock", x: 0, y: -radius * 0.86, to: index - 1, label: "↩ inward", id: "dock-in" });
  props.push({ t: "dock", x: 0, y: radius * 0.9, to: index + 1, label: "sail onward →", id: "dock-out" });

  // the winding spine + its central beacon hub — the ring is composed around these
  const spine = buildSpine(index, radius, rng);
  const hub = spine[Math.round((spine.length - 1) * 0.42)];
  // the keeper greets you AT the beacon hub (so the trail leads you right to them + their
  // quests); the wanderer waits in a nook further down the trail (errand/delivery target — K3)
  props.push({ t: "npc", x: hub.x - 28, y: hub.y + 22, id: `keeper-${index}`, label: pick(rng, KEEPERS), accent: biome.palette.accent });
  { const wp = spine[Math.round((spine.length - 1) * 0.78)], wdir = rng() > 0.5 ? 1 : -1;
    props.push({ t: "npc", x: wp.x + wdir * radius * 0.16, y: wp.y + 16, id: `wanderer-${index}`, label: pick(rng, WANDERERS), accent: biome.palette.mote }); }

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
  // ---- GUIDED, ECOLOGICAL placement: everything clusters in the same pockets and hedges the
  // trail, composed around the spine so terrain funnels you along (never sealing you in). ----
  const corr = radius * 0.14;
  // the trail itself, laid along the spine (the desire-path the eye follows)
  if (biome.path) for (let i = 0; i < spine.length - 1; i++) { const a = spine[i], b = spine[i + 1]; for (let k = 0; k < 3; k++) props.push({ t: "path", x: a.x + (b.x - a.x) * k / 3, y: a.y + (b.y - a.y) * k / 3 }); }
  // thicket HEDGES either side of the trail, with gaps for openings (biome-appropriate flora)
  for (let i = 1; i < spine.length - 1; i++) {
    const p = spine[i], q = spine[i + 1], dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    for (const sd of [1, -1]) { if (rng() < 0.2) continue; const d = corr + rng() * radius * 0.07; wallClump(props, p.x + nx * sd * d, p.y + ny * sd * d, biome, 3 + Math.floor(rng() * 2), rng); }
  }
  // a couple of denser INTERIOR clumps off the trail (a grove, a rock field) for variety
  if (biome.tree) { const p = spine[Math.round((spine.length - 1) * 0.3)], sd = rng() > 0.5 ? 1 : -1; placeGrove(props, p.x + sd * corr * 2, p.y + 20, 4 + Math.floor(rng() * 3), rng); }
  if (biome.rocks > 0) { const p = spine[Math.round((spine.length - 1) * 0.65)], sd = rng() > 0.5 ? 1 : -1; placeRockCairn(props, p.x + sd * corr * 2, p.y, Math.min(5, scaled(biome.rocks)), rng); }
  // flower beds tucked BESIDE the trail (clustered, same pockets)
  for (let b = 0; b < Math.max(1, Math.round(scaled(biome.flowers) / 5) + 1); b++) { const p = spine[1 + Math.floor(rng() * (spine.length - 2))], sd = rng() > 0.5 ? 1 : -1; placeFlowerBed(props, p.x + sd * corr * 0.75, p.y, 5, rng); }
  // crystals in a nook further off the corridor
  for (let i = 0; i < scaled(biome.crystals); i++) { const p = spine[1 + Math.floor(rng() * (spine.length - 2))], sd = rng() > 0.5 ? 1 : -1; props.push({ t: "crystal", x: p.x + sd * corr * 2.4, y: p.y + (rng() - 0.5) * 30, big: rng() > 0.5, accent: biome.palette.accent }); }
  // lanterns strung along the trail as guiding LIGHTS
  for (let i = 0; i < biome.lanterns; i++) { const p = spine[Math.min(spine.length - 1, 1 + i * 2)]; props.push({ t: "lantern", x: p.x + (i % 2 ? 11 : -11), y: p.y }); }
  // a bush understory clumped near the beacon hub
  { const bn = scaled(biome.tree ? 4 : 2); for (let i = 0; i < bn; i++) props.push({ t: "bush", x: hub.x + (rng() - 0.5) * 100, y: hub.y + 36 + (rng() - 0.5) * 46 }); }
  // WISPS strung down the spine (a gather-quest walks you the whole trail, Phase K3). Kept
  // TIGHT on the clear trail + off the crowded hub so they never end up stuck inside a
  // thicket/solid where they'd be un-gatherable.
  const hubIdx = Math.round((spine.length - 1) * 0.42);
  for (let i = 0; i < Math.max(6, scaled(7)); i++) {
    let si = Math.floor(rng() * (spine.length - 1)); if (si === hubIdx) si = (si + 1) % (spine.length - 1);
    const p = spine[si];
    props.push({ t: "wisp", x: p.x + (rng() - 0.5) * 34, y: p.y + (rng() - 0.5) * 34, accent: biome.palette.mote });
  }
  // SIDE-QUEST givers scale with ring size (mini-continents) — spread along the trail so the
  // big outer rings become full destinations; each offers one of the ring's extra quests.
  const sideN = Math.min(8, Math.floor(index / 1.5));
  for (let v = 1; v <= sideN; v++) {
    const p = spine[Math.max(1, Math.min(spine.length - 2, Math.round((spine.length - 1) * (0.16 + 0.68 * (v / (sideN + 1))))))], sd = v % 2 ? 1 : -1;
    props.push({ t: "npc", x: p.x + sd * corr * (1.15 + (v % 3) * 0.3), y: p.y + 12 + (v % 2) * 18, id: `sider-${index}-${v}`, label: pick(rng, WANDERERS), accent: biome.palette.mote });
  }
  // woodland SIGNATURE understory: fern patches (clustered) + a fairy-ring or two
  if (biome.key === "woodland") {
    for (let f = 0; f < 2 + Math.floor(rng() * 2); f++) {
      const p = spine[1 + Math.floor(rng() * (spine.length - 2))], sd = rng() > 0.5 ? 1 : -1, fx = p.x + sd * corr * 0.6, fy = p.y + (rng() - 0.5) * 30;
      for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) props.push({ t: "fern", x: fx + (rng() - 0.5) * 30, y: fy + (rng() - 0.5) * 24 });
    }
    { const p = spine[Math.round((spine.length - 1) * 0.5)], sd = rng() > 0.5 ? 1 : -1; props.push({ t: "fairyring", x: p.x + sd * corr * 1.9, y: p.y + (rng() - 0.5) * 30 }); }
    if (rng() > 0.5) { const p = spine[Math.round((spine.length - 1) * 0.82)], sd = rng() > 0.5 ? 1 : -1; props.push({ t: "fairyring", x: p.x + sd * corr * 1.6, y: p.y }); }
    // an extra grove for a denser, TMW-fuller wood
    { const p = spine[Math.round((spine.length - 1) * 0.58)], sd = rng() > 0.5 ? 1 : -1; placeGrove(props, p.x + sd * corr * 1.7, p.y - 10, 4 + Math.floor(rng() * 3), rng); }
  }
  // TMW-density fill-in (all biomes): geography (fallen logs + stumps = natural maze walls) in
  // pockets, plus cheap tall-grass texture — all clumped, all OFF the clear trail.
  for (let g = 0; g < 2 + Math.floor(rng() * 2); g++) {
    const p = spine[1 + Math.floor(rng() * (spine.length - 2))], sd = rng() > 0.5 ? 1 : -1, gx = p.x + sd * corr * 1.5, gy = p.y + (rng() - 0.5) * 40;
    props.push({ t: "log", x: gx, y: gy });
    if (rng() > 0.4) props.push({ t: "stump", x: gx + (rng() - 0.5) * 30, y: gy + 18 });
  }
  for (let g = 0; g < 5 + scaled(5); g++) {
    const p = spine[Math.floor(rng() * (spine.length - 1))], sd = rng() > 0.5 ? 1 : -1, gx = p.x + sd * (corr * 0.5 + rng() * corr * 1.5), gy = p.y + (rng() - 0.5) * 50;
    for (let k = 0; k < 2 + Math.floor(rng() * 3); k++) props.push({ t: "tallgrass", x: gx + (rng() - 0.5) * 26, y: gy + (rng() - 0.5) * 22 });
  }
  // a PORTAL to a sub-map on many rings (an interactive voyage down/up — CHR-265).
  // Winter is the exception: instead of a calm "cloud stair" it gets a STORM you brave —
  // a tornado sweeps you up into the icy Cloud Reach (the dramatic weather entry, F).
  if (biome.key === "winter") {
    const c = clearSpot();
    props.push({ t: "storm", x: c.x, y: c.y, to: subIndex("cloud", index), sub: "cloud", label: "the storm", accent: "#dfeaff" });
  } else {
    const portalKind: SubKind | null = (biome.key === "desert" || biome.key === "ember" || biome.key === "canyon") ? "cave" : (biome.key === "woodland" || biome.key === "meadow" || biome.key === "autumn" || biome.key === "marsh" || biome.key === "savanna") ? "tree" : (biome.key === "coast" || biome.key === "aurora") ? "cloud" : null;
    if (portalKind) { const c = clearSpot(); props.push({ t: "portal", x: c.x, y: c.y, to: subIndex(portalKind, index), sub: portalKind, label: portalKind === "cave" ? "cave" : portalKind === "tree" ? "hollow tree" : "cloud stair" }); }
  }
  // a two-ended TUNNEL across the island (Milestone F) — enter one burrow, walk the passage,
  // emerge at the other (a shortcut across the big outer rings). Mouths on opposite sides.
  { const side = rng() > 0.5 ? 1 : -1, ti = tunnelIndex(index);
    props.push({ t: "tunnel", x: side * radius * 0.4, y: -radius * 0.3, to: ti, end: "a", label: "burrow" });
    props.push({ t: "tunnel", x: -side * radius * 0.4, y: radius * 0.34, to: ti, end: "b", label: "burrow" }); }
  // a pond as a soft barrier the trail curves past (placed off the corridor, near the hub)
  if (biome.pond) { const p = spine[Math.round((spine.length - 1) * 0.6)], sd = rng() > 0.5 ? 1 : -1; props.push({ t: "pond", x: p.x + sd * corr * 1.7, y: p.y, r: 22 + Math.floor(rng() * 12) }); }

  // the biome's FOCAL LANDMARK (Phase J4) — a memorable set-piece that doubles as a quest
  // home + postcard subject + meeting spot. Placed prominently to one side, off the dock lanes.
  {
    const lm = biome.landmark;
    const lmLabel: Record<LandmarkKind, string> = { greattree: "The Great Tree", stonecircle: "The Stone Circle", lighthouse: "The Lighthouse", crystal: "The Great Crystal", waterfall: "The Falls", ruin: "The Old Ruin" };
    props.push({ t: "landmark", x: hub.x, y: hub.y - 10, lm, id: `landmark-${index}`, label: lmLabel[lm], accent: biome.palette.accent, r: 46 });   // BEACON at the hub
    // secondary landmarks on the bigger rings — more beacons + postcard subjects
    const LM_ALL: LandmarkKind[] = ["greattree", "stonecircle", "lighthouse", "crystal", "waterfall", "ruin"];
    const extraLm = Math.floor(index / 5);
    for (let k = 1; k <= extraLm; k++) {
      const sp = spine[Math.round((spine.length - 1) * (0.3 + 0.4 * (k / (extraLm + 1))))], sd = k % 2 ? 1 : -1, lm2 = LM_ALL[(index + k) % LM_ALL.length];
      props.push({ t: "landmark", x: sp.x + sd * corr * 2.2, y: sp.y + (rng() - 0.5) * 30, lm: lm2, id: `landmark-${index}-${k}`, label: lmLabel[lm2], accent: biome.palette.accent, r: 40 });
    }
  }
  // extra SUB-REALMS on the bigger rings — more places to duck into (distinct kinds)
  { const subN = Math.min(2, Math.floor(index / 6)); const kinds: SubKind[] = ["cave", "tree", "cloud"]; let done = 0;
    for (const kk of kinds) { if (done >= subN) break; const sp = spine[Math.round((spine.length - 1) * (0.32 + 0.28 * done))], sd = done % 2 ? 1 : -1;
      props.push({ t: "portal", x: sp.x + sd * corr * 2.6, y: sp.y, to: subIndex(kk, index), sub: kk, label: kk === "cave" ? "cave" : kk === "tree" ? "hollow tree" : "cloud stair" }); done++; } }
  // a social gathering spot on every ring — ring 2's is the Cirql Drive-In (an outdoor
  // movie screen); the rest get a bonfire commons. Placed east/west, off the dock lanes.
  if (index === 2) {
    props.push({ t: "theater", x: radius * 0.34, y: -radius * 0.02, id: "theater", label: "Cirql Drive-In", r: 52 });
  } else {
    const side = rng() > 0.5 ? 1 : -1;
    props.push({ t: "gathering", x: side * radius * 0.42, y: (rng() - 0.5) * radius * 0.22, id: "commons", label: "The Commons" });
  }

  // ── Phase K7: varied quest DELIVERY ──
  // A bounty board by the beacon hub on every wild ring (the "chosen" delivery — pick a task).
  props.push({ t: "bounty", x: hub.x + 48, y: hub.y + 34, id: "bounty", label: "Bounty Board", accent: biome.palette.accent });
  // Authored DISCOVERABLES (fixed coords so they don't shift other props):
  //  ring 2 → a fallen star (night-only discovery) · ring 4 → a buried cache (discovery) ·
  //  ring 7 → blighted ground (emergent; heals on completion).
  if (index === 2) props.push({ t: "curio", curio: "star", x: hub.x + 72, y: hub.y - 30, id: "curio-2", label: "A fallen star", accent: "#bfe6ff" });
  if (index === 4) props.push({ t: "curio", curio: "cache", x: hub.x - 62, y: hub.y - 40, id: "curio-4", label: "A buried cache", accent: "#ffd24a" });
  if (index === 6) props.push({ t: "curio", curio: "relic", x: hub.x - 58, y: hub.y - 44, id: "curio-6", label: "The ash-stone", accent: "#ff9a3c" });   // riddle
  if (index === 7) props.push({ t: "curio", curio: "blight", x: hub.x + 40, y: hub.y - 58, id: "curio-7", label: "Blighted ground", accent: "#a05cff" });

  // stable ids so the quest-template generator (CHR-256) can target this ring's own
  // lanterns + crystals; unique per ring so the lit-set never collides across rings
  let li = 0, ci = 0, wi = 0;
  for (const p of props) {
    if (p.t === "lantern" && !p.id) p.id = `r${index}l${li++}`;
    else if (p.t === "crystal" && !p.id) p.id = `r${index}c${ci++}`;
    else if (p.t === "wisp" && !p.id) p.id = `r${index}w${wi++}`;
  }

  return {
    index,
    name,
    sub: pick(rng, SUBS),
    radius,
    explorable: true,
    palette: varyPalette(biome.palette, index),   // per-ring signature tint (each ring its own place)
    spawn: { x: 0, y: -radius * 0.68 },   // arrive near the inward dock
    props,
    ambient: biome.ambient,               // the critter that belongs to this scene
    biome: biome.key,                     // drives the per-biome flora/geo/glow kit
  };
}

// ---- sub-maps (CHR-265): tunnels/caves, treetops, clouds ----
// A sub-map is a ring reached by a PORTAL rather than a dock. Its index encodes its
// kind + the surface ring it hangs off, so getRing() can generate it on demand and a
// return portal can point back at the parent. Sub-maps don't extend the fog / maxRing.
const SUB_BASE = 100000;
export const SUB_OFFSET = { cave: 100000, tree: 200000, cloud: 300000 } as const;
// Tunnels (Milestone F) — a two-ended burrow that connects two points on a ring. Its own
// index band (above the shop/home bands) so it's an instant-swap sub-map, no fog lift.
export const TUNNEL_OFFSET = 600000;
export const isTunnel = (index: number): boolean => index >= TUNNEL_OFFSET && index < TUNNEL_OFFSET + 100000;
export const tunnelIndex = (parent: number): number => TUNNEL_OFFSET + parent;
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

/** A two-ended tunnel sub-map — spawn in the middle, walk to either mouth (A north / B south). */
function generateTunnel(parent: number, index: number): Ring {
  const rng = rngFrom(Math.imul(index, 0x27d4eb2f) ^ 0x9e3779b9);
  const radius = 300, props: Prop[] = [];
  // the two exits back to the surface — each tagged with the mouth it returns to
  props.push({ t: "portal", x: 0, y: -radius * 0.72, to: parent, sub: "up", end: "a", label: "↑ north exit" });
  props.push({ t: "portal", x: 0, y: radius * 0.72, to: parent, sub: "up", end: "b", label: "↓ south exit" });
  // a glimmering underground passage — crystals + wisps + a few rocks to weave around
  const place = (t: Prop["t"], extra?: Partial<Prop>) => { const a = rng() * TAU, rr = radius * (0.2 + rng() * 0.42); props.push({ t, x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.7, ...extra }); };
  for (let i = 0; i < 7; i++) place("crystal", { big: rng() > 0.6, accent: "#7fd8ff" });
  for (let i = 0; i < 6; i++) place("rock", { big: rng() > 0.6 });
  for (let i = 0; i < 5; i++) place("wisp", { accent: "#bfeaff" });
  let ci = 0, wi = 0;
  for (const p of props) { if (p.t === "crystal" && !p.id) p.id = `t${index}c${ci++}`; else if (p.t === "wisp" && !p.id) p.id = `t${index}w${wi++}`; }
  return {
    index, name: "The Tunnel", sub: "a passage through the dark", radius, explorable: true,
    palette: { sky: ["#0e0a12", "#060409"], sea: "#0a0710", land: "#1c1622", grass: "#2a2030", sand: "#3a2e28", accent: "#7fd8ff", mote: "#bfeaff" },
    spawn: { x: 0, y: 0 }, props, ambient: "firefly",
  };
}

/** The ring at `index` — authored CIRQLSPACE (0) + Town (1), generated wilds (>=2), sub-map for big indices. */
export function getRing(index: number): Ring {
  if (index <= 0) return RINGS[0];
  if (index === 1) return RINGS[1];   // the authored Town hub
  if (isTunnel(index)) return generateTunnel(parentOf(index), index);   // Milestone F: two-ended tunnel
  if (isHome(index)) return homeInterior();                   // Milestone F: your home interior
  if (isShop(index)) return shopInterior(shopIdAt(index)!);   // Milestone F: authored shop interior
  if (isSubMap(index)) { const k = subKindOf(index)!; return generateSubMap(k, parentOf(index), index); }
  return generateRing(index);
}

/** Display name for a ring index (authored / generated / sub-map). */
export function ringName(index: number): string {
  if (index <= 0) return RINGS[0].name;
  return getRing(index).name;
}
