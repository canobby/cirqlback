// CIRQLVERSE — M10 procedural rings (CHR-255).
//
// "Sail outward forever." Beyond the authored Hearth (ring 0), every ring is generated
// deterministically from its index — a seeded biome, palette, name, scattered props and
// two docks (one inward toward home, one onward into the fog). Same declarative `Ring`
// shape the renderer already consumes (cirql-world.ts), so the world engine draws a
// generated ring exactly like an authored one. Reuses the CirqlBreak infinite-worlds
// seeding idea: pure function of the index → the same land for everyone, every time.

import { RINGS, type Ring, type Prop, type RingPalette } from "./cirql-world";

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
}

// Each biome is its own SCENE / season — distinct palette + landscape mix + the critter
// that belongs there. As you sail outward the rings cycle through them, so every shore
// feels different (spring meadow, tropical lagoon, winter, dry desert, autumn wood…).
const BIOMES: Biome[] = [
  // spring meadow — flowers galore, a fence, butterflies
  { key: "meadow", tree: true, crystals: 0, lanterns: 3, rocks: 1, pond: true, flowers: 12, fence: true, path: true, ambient: "butterfly",
    palette: { sky: ["#20331f", "#12241a"], sea: "#0e2c33", land: "#2a5a30", grass: "#43884a", sand: "#cdb87a", accent: "#a6f06a", mote: "#e0ffb0" } },
  // tropical lagoon — turquoise water, palms, dragonflies
  { key: "tropical", tree: true, crystals: 0, lanterns: 4, rocks: 2, pond: true, flowers: 7, fence: false, path: true, ambient: "dragonfly",
    palette: { sky: ["#0e3040", "#0a2233"], sea: "#0a5f70", land: "#1f5a52", grass: "#2f8a6a", sand: "#f0e0a0", accent: "#4fe0d0", mote: "#bafff0" } },
  // winter — snow, frosted trees, pale + still
  { key: "winter", tree: true, crystals: 2, lanterns: 4, rocks: 3, pond: false, flowers: 0, fence: true, path: true, ambient: "snow",
    palette: { sky: ["#1b2740", "#101a30"], sea: "#173a56", land: "#3a4a60", grass: "#5a6f88", sand: "#dfeaf6", accent: "#bfe6ff", mote: "#eef7ff" } },
  // dry desert — sand + red rock, many boulders, no trees, grasshoppers
  { key: "desert", tree: false, crystals: 1, lanterns: 3, rocks: 9, pond: false, flowers: 1, fence: false, path: true, ambient: "grasshopper",
    palette: { sky: ["#3a2414", "#20140c"], sea: "#243026", land: "#6a4526", grass: "#8a6a34", sand: "#e8c485", accent: "#ffb058", mote: "#ffe0a8" } },
  // autumn wood — amber trees, a fence, bees
  { key: "autumn", tree: true, crystals: 0, lanterns: 4, rocks: 2, pond: false, flowers: 3, fence: true, path: true, ambient: "bee",
    palette: { sky: ["#2e1c12", "#1a1008"], sea: "#243026", land: "#5a3a1e", grass: "#8a5a26", sand: "#d8b070", accent: "#ff9a3c", mote: "#ffd090" } },
  // deep woodland — dense trees, a pond, fireflies
  { key: "woodland", tree: true, crystals: 1, lanterns: 4, rocks: 3, pond: true, flowers: 4, fence: false, path: true, ambient: "firefly",
    palette: { sky: ["#12241a", "#0a160f"], sea: "#0c2036", land: "#1c3a26", grass: "#2a5a38", sand: "#a89060", accent: "#8ef0a0", mote: "#c8ffd6" } },
  // sunlit coast — beach, gulls, rocks
  { key: "coast", tree: true, crystals: 0, lanterns: 5, rocks: 5, pond: false, flowers: 2, fence: false, path: false, ambient: "gull",
    palette: { sky: ["#183048", "#0e1c34"], sea: "#0a5578", land: "#20464a", grass: "#2f7a6a", sand: "#f0dca0", accent: "#6fd8ff", mote: "#bff0ff" } },
  // ember reach — volcanic, rising embers
  { key: "ember", tree: false, crystals: 2, lanterns: 3, rocks: 5, pond: false, flowers: 0, fence: false, path: true, ambient: "ember",
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
const SUBS = ["a quiet shore", "beyond the fog", "a windswept land", "where lanterns drift", "an uncharted ring", "far from the Hearth", "a shore of echoes"];

function pick<T>(rng: () => number, arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

/** Generate the ring at `index` (>= 1). Deterministic: same index → same land, forever. */
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
  if (biome.tree) { const n = scaled(5 + Math.floor(rng() * 5)); for (let i = 0; i < n; i++) place("tree", { big: rng() > 0.6 }); }
  for (let i = 0; i < scaled(biome.crystals); i++) place("crystal", { big: rng() > 0.5, accent: biome.palette.accent });
  for (let i = 0; i < scaled(biome.lanterns); i++) place("lantern");
  for (let i = 0; i < scaled(biome.rocks); i++) place("rock", { big: rng() > 0.6 });
  for (let i = 0; i < scaled(biome.flowers); i++) place("flower", { accent: FLOWER_COLS[Math.floor(rng() * FLOWER_COLS.length)] });
  // a fence segment tucked in an open spot
  if (biome.fence) { for (let tries = 0; tries < 6; tries++) { const a = rng() * Math.PI * 2, rr = radius * (0.28 + rng() * 0.4); const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (Math.abs(x) < radius * 0.16 && Math.abs(y) > radius * 0.55) continue; props.push({ t: "fence", x, y }); break; } }
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

/** The ring at `index` — authored Hearth for 0, generated beyond. */
export function getRing(index: number): Ring {
  if (index <= 0) return RINGS[0];
  return generateRing(index);
}

/** Display name for a ring index (authored or generated). */
export function ringName(index: number): string {
  if (index <= 0) return RINGS[0].name;
  return generateRing(index).name;
}
