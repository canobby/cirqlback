// CIRQL CITY — districts, levels and the level generator (Phase B).
//
// The flagship grew from a single feel-slice into a deep game: an overworld of five
// DISTRICTS, each a short run of levels ending in a BLANDCO boss. Rather than
// hand-authoring twenty tilemaps, each level is a compact LevelDef (width, seed,
// difficulty, shop/perk counts) that `buildLevel` expands deterministically into a
// guaranteed-playable stage (jumpable pits, reachable signs, patrolling drones).
// Districts differ by palette, name and difficulty ramp; the engine paints them.

import { mulberry32 } from "./arcade-core";

export const TILE = 16;
export const LEVEL_H = 14;
export const GROUND_ROW = 11;          // first solid ground row (of 14)

export interface DistrictDef {
  key: string;
  name: string;
  blurb: string;
  sky: [string, string];               // dusk gradient top/bottom (pre-revival)
  accent: string;
  levels: LevelDef[];                  // regular levels then the boss (last)
}

export interface LevelDef {
  key: string;
  name: string;
  boss?: boolean;
  width: number;                       // tiles wide
  seed: number;
  diff: number;                        // 0..1 — scales pits / bots / platforms
  shops: number;
  perks: number;
}

export interface BuiltLevel {
  W: number;
  H: number;
  solids: Uint8Array[];
  shops: { tx: number; ty: number }[];
  coins: { x: number; y: number }[];
  perks: { x: number; y: number }[];
  bots: { tx: number; ty: number; speed: number }[];
  finishTx: number;
  spawnTx: number;
  boss?: { tx: number };
}

/** Expand a LevelDef into a concrete, guaranteed-playable stage. Deterministic per seed. */
export function buildLevel(lv: LevelDef): BuiltLevel {
  const rnd = mulberry32(lv.seed >>> 0);
  const W = lv.width, H = LEVEL_H, G = GROUND_ROW;
  const solids = Array.from({ length: H }, () => new Uint8Array(W));
  const isPit = new Uint8Array(W);

  // pits — gaps of 1-2 tiles (always jumpable), never near start/finish
  if (!lv.boss) {
    let x = 11;
    while (x < W - 12) {
      const gap = 1 + (rnd() < 0.3 + lv.diff * 0.35 ? 1 : 0);
      for (let i = 0; i < gap; i++) isPit[x + i] = 1;
      x += gap + 7 + Math.floor(rnd() * 7);
    }
  }
  for (let y = G; y < H; y++) for (let x = 0; x < W; x++) if (!isPit[x]) solids[y][x] = 1;

  // floating platforms (rows 5-7 — reachable, clear of the signs)
  const plats: [number, number, number][] = [];
  const nPlat = lv.boss ? 0 : 2 + Math.floor(lv.diff * 3 + rnd() * 2);
  for (let i = 0; i < nPlat; i++) {
    const w = 3 + Math.floor(rnd() * 3);
    const tx = 8 + Math.floor(rnd() * Math.max(1, W - 20));
    const ty = 5 + Math.floor(rnd() * 3);
    for (let j = 0; j < w; j++) if (tx + j < W) solids[ty][tx + j] = 1;
    plats.push([tx, ty, w]);
  }

  const groundOK = (tx: number) => tx > 1 && tx < W - 2 && !isPit[tx] && !isPit[tx - 1] && !isPit[tx + 1];

  // shops — floating bonk signs at ty=8 over solid ground (always jump-reachable)
  const shops: { tx: number; ty: number }[] = [];
  if (!lv.boss && lv.shops > 0) {
    const seg = Math.floor((W - 12) / lv.shops);
    for (let i = 0; i < lv.shops; i++) {
      let tx = 6 + i * seg + Math.floor(rnd() * Math.max(1, seg - 3));
      let t = 0; while (!groundOK(tx) && t++ < 24) tx++;
      if (groundOK(tx)) shops.push({ tx, ty: 8 });
    }
  }

  // coins — over platforms, arcing over pits, and sprinkled along the run
  const coins: { x: number; y: number }[] = [];
  for (const [tx, ty, w] of plats) for (let j = 0; j < w; j++) if (rnd() < 0.55) coins.push({ x: (tx + j) * TILE + TILE / 2, y: (ty - 1) * TILE + TILE / 2 });
  for (let x = 0; x < W; x++) if (isPit[x]) coins.push({ x: x * TILE + TILE / 2, y: (G - 3) * TILE });
  const nSpr = 4 + Math.floor(lv.diff * 4);
  for (let i = 0; i < nSpr; i++) { const tx = 5 + Math.floor(rnd() * Math.max(1, W - 10)); coins.push({ x: tx * TILE + TILE / 2, y: (5 + Math.floor(rnd() * 4)) * TILE }); }

  // glide perks
  const perks: { x: number; y: number }[] = [];
  for (let i = 0; i < (lv.perks || 0); i++) { let tx = 10 + Math.floor(rnd() * Math.max(1, W - 20)); let t = 0; while (!groundOK(tx) && t++ < 24) tx++; perks.push({ x: tx * TILE + TILE / 2, y: 8 * TILE + TILE / 2 }); }

  // BLANDCO drones
  const bots: { tx: number; ty: number; speed: number }[] = [];
  if (!lv.boss) {
    const n = 2 + Math.floor(lv.diff * 4 + rnd() * 2);
    for (let i = 0; i < n; i++) { let tx = 8 + Math.floor(rnd() * Math.max(1, W - 14)); let t = 0; while (!groundOK(tx) && t++ < 24) tx++; if (groundOK(tx)) bots.push({ tx, ty: G - 1, speed: 22 + Math.round(lv.diff * 24 + rnd() * 10) }); }
  }

  const out: BuiltLevel = { W, H, solids, shops, coins, perks, bots, finishTx: W - 5, spawnTx: 3 };
  if (lv.boss) out.boss = { tx: Math.floor(W * 0.62) };
  return out;
}

// ---------- the five districts ----------
export const DISTRICTS: DistrictDef[] = [
  {
    key: "oldtown", name: "OLD TOWN", blurb: "WHERE IT ALL BEGAN", sky: ["#241a4e", "#6a4a7a"], accent: "#ff8a3d",
    levels: [
      { key: "oldtown-1", name: "MAIN & FIRST", width: 78, seed: 1101, diff: 0.10, shops: 4, perks: 1 },
      { key: "oldtown-2", name: "THE OLD BLOCK", width: 92, seed: 1102, diff: 0.24, shops: 5, perks: 0 },
      { key: "oldtown-3", name: "LAMPLIGHT LANE", width: 104, seed: 1103, diff: 0.36, shops: 5, perks: 1 },
      { key: "oldtown-b", name: "THE FOREMAN", width: 42, seed: 1104, diff: 0.30, shops: 0, perks: 0, boss: true },
    ],
  },
  {
    key: "market", name: "MARKET ROW", blurb: "STALLS GONE SILENT", sky: ["#3a2540", "#a2604a"], accent: "#ff5d7d",
    levels: [
      { key: "market-1", name: "PRODUCE END", width: 92, seed: 2101, diff: 0.30, shops: 5, perks: 1 },
      { key: "market-2", name: "THE ARCADE", width: 104, seed: 2102, diff: 0.44, shops: 6, perks: 0 },
      { key: "market-3", name: "SPICE ALLEY", width: 112, seed: 2103, diff: 0.52, shops: 6, perks: 1 },
      { key: "market-b", name: "THE INSPECTOR", width: 44, seed: 2104, diff: 0.45, shops: 0, perks: 0, boss: true },
    ],
  },
  {
    key: "harbor", name: "HARBOR", blurb: "TIDE'S GONE OUT", sky: ["#152a44", "#2f7c8a"], accent: "#3bb6ff",
    levels: [
      { key: "harbor-1", name: "THE WHARF", width: 104, seed: 3101, diff: 0.46, shops: 5, perks: 1 },
      { key: "harbor-2", name: "CANNERY ROW", width: 116, seed: 3102, diff: 0.58, shops: 6, perks: 1 },
      { key: "harbor-3", name: "PIER SEVEN", width: 124, seed: 3103, diff: 0.66, shops: 6, perks: 1 },
      { key: "harbor-b", name: "THE HARBORMASTER", width: 46, seed: 3104, diff: 0.60, shops: 0, perks: 0, boss: true },
    ],
  },
  {
    key: "uptown", name: "UPTOWN", blurb: "LIGHTS BURNED OUT", sky: ["#2a1c46", "#7a3a86"], accent: "#b79bff",
    levels: [
      { key: "uptown-1", name: "MARQUEE MILE", width: 116, seed: 4101, diff: 0.60, shops: 6, perks: 1 },
      { key: "uptown-2", name: "THEATRE DISTRICT", width: 128, seed: 4102, diff: 0.72, shops: 7, perks: 1 },
      { key: "uptown-3", name: "SKYLINE WALK", width: 136, seed: 4103, diff: 0.80, shops: 7, perks: 1 },
      { key: "uptown-b", name: "THE DEVELOPER", width: 48, seed: 4104, diff: 0.75, shops: 0, perks: 0, boss: true },
    ],
  },
  {
    key: "core", name: "CITY CORE", blurb: "BLANDCO HQ", sky: ["#20202e", "#3a3f4c"], accent: "#ffd24a",
    levels: [
      { key: "core-1", name: "THE APPROACH", width: 128, seed: 5101, diff: 0.78, shops: 6, perks: 1 },
      { key: "core-2", name: "GREY PLAZA", width: 140, seed: 5102, diff: 0.88, shops: 7, perks: 1 },
      { key: "core-3", name: "THE LOBBY", width: 148, seed: 5103, diff: 0.94, shops: 8, perks: 1 },
      { key: "core-b", name: "THE CEO", width: 52, seed: 5104, diff: 1.0, shops: 0, perks: 0, boss: true },
    ],
  },
];
