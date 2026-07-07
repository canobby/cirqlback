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
  ambient: "butterfly" | "firefly" | "ember" | "snow" | "gull" | "dust";   // drifting critters
}

// Biome palettes — same dusk-neon family as the Hearth, shifted per land so each ring
// reads distinct at a glance. Each biome carries its own landscape mix + ambient life.
const BIOMES: Biome[] = [
  { key: "woodland", tree: true, crystals: 1, lanterns: 4, rocks: 3, pond: true, ambient: "butterfly",
    palette: { sky: ["#1c2b1f", "#101d2e"], sea: "#0c2036", land: "#20402c", grass: "#2f6340", sand: "#b9a06a", accent: "#8ef0a0", mote: "#c8ffd6" } },
  { key: "coast", tree: true, crystals: 0, lanterns: 5, rocks: 5, pond: false, ambient: "gull",
    palette: { sky: ["#183048", "#0e1c34"], sea: "#0a3350", land: "#1f3f4a", grass: "#2f6a6a", sand: "#e0cf9a", accent: "#6fd8ff", mote: "#bff0ff" } },
  { key: "ember", tree: true, crystals: 2, lanterns: 3, rocks: 4, pond: false, ambient: "ember",
    palette: { sky: ["#2e1622", "#1a0f22"], sea: "#241026", land: "#3a2030", grass: "#5a3040", sand: "#caa070", accent: "#ff8a5c", mote: "#ffd0a8" } },
  { key: "frost", tree: true, crystals: 3, lanterns: 4, rocks: 4, pond: false, ambient: "snow",
    palette: { sky: ["#1b2740", "#101a30"], sea: "#12314e", land: "#2a3a52", grass: "#3f5a72", sand: "#cfe0f0", accent: "#9fe6ff", mote: "#e6f6ff" } },
  { key: "bloom", tree: true, crystals: 1, lanterns: 5, rocks: 2, pond: true, ambient: "butterfly",
    palette: { sky: ["#2a1a3c", "#161033"], sea: "#151033", land: "#33265a", grass: "#5a4080", sand: "#d9b8e0", accent: "#e08aff", mote: "#f0d0ff" } },
  { key: "dunes", tree: false, crystals: 2, lanterns: 3, rocks: 6, pond: false, ambient: "dust",
    palette: { sky: ["#2c2418", "#1a1410"], sea: "#1e2a2a", land: "#4a3a22", grass: "#6a552f", sand: "#e6c98a", accent: "#ffce6b", mote: "#ffe9b8" } },
  { key: "gleam", tree: true, crystals: 3, lanterns: 6, rocks: 3, pond: true, ambient: "firefly",
    palette: { sky: ["#101d2e", "#0a1424"], sea: "#0c2036", land: "#1a3348", grass: "#2a5570", sand: "#bcd0e0", accent: "#7fffe6", mote: "#d6fff6" } },
];

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
  const biome = BIOMES[Math.floor(rng() * BIOMES.length)];
  const name = ringNameFor(rng);
  const radius = 380 + Math.floor(rng() * 140);
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
  if (biome.tree) { const n = 5 + Math.floor(rng() * 5); for (let i = 0; i < n; i++) place("tree", { big: rng() > 0.6 }); }
  for (let i = 0; i < biome.crystals; i++) place("crystal", { big: rng() > 0.5, accent: biome.palette.accent });
  for (let i = 0; i < biome.lanterns; i++) place("lantern");
  for (let i = 0; i < biome.rocks; i++) place("rock", { big: rng() > 0.6 });
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
    ambient: biome.ambient,
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
