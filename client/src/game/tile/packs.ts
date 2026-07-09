// packs — the sanctumpixel top-down bundle (desert / forest / snow / village / crops /
// fruit-trees), set up ONCE here so rings can pull a biome's terrain, cliffs and nature
// props without re-plumbing every time. Served from client/public/packs/.
//
// These are a cohesive art FAMILY of their own, distinct from the Cute Fantasy "cute"
// base — so we (a) use them for the TERRAIN / CLIFFS / nature-density of a ring (their
// autotile sandstone cliff is a real RPG cliff kit) while the Cute Fantasy cast (player,
// animals, key buildings) stays consistent across rings, and (b) HARMONIZE their palette
// toward the warm Cute Fantasy tone at load (`harmonizePack`) so the two families read as
// one world instead of "two games".
import type { Atlas } from "./tileset";

const PK = "/packs";
const range = (n: number, a = 1) => Array.from({ length: n }, (_, i) => i + a);

export type PackKey = "desert" | "forest" | "snow" | "village";

interface PackDef {
  sheets: Record<string, string>;                 // named tilesets (registered as-is)
  props: Record<string, string[]>;                 // numbered prop groups → sp_<key>_<group>_<i>
}

// One place to register every sanctumpixel sheet we might use. Add a group here once and
// any ring can pull it. (crops/fruit-tree packs are single PNGs — pulled ad hoc when needed.)
export const PACKS: Record<PackKey, PackDef> = {
  desert: {
    sheets: {
      sp_desert_ground: `${PK}/desert/tileset/ground_tile.png`,   // 368×448 sand autotile
      sp_desert_wall: `${PK}/desert/tileset/wall_tile.png`,       // 160×96 sandstone CLIFF autotile (16-blob top + face)
    },
    props: {
      rock: range(11).map((i) => `${PK}/desert/props/desert_rock_${i}.png`),
      cactus: range(7).map((i) => `${PK}/desert/props/cactus_${i}.png`),
      grass: range(8).map((i) => `${PK}/desert/props/desert_grass_${i}.png`),
      joshua: range(4).map((i) => `${PK}/desert/props/joshua_tree_${i}.png`),
    },
  },
  forest: {
    sheets: { sp_forest_ground: `${PK}/forest/tileset/tileset.png` },
    props: {
      pine: range(10).map((i) => `${PK}/forest/props/pine_${i}.png`),
      bush: range(1).map((i) => `${PK}/forest/props/bush_${i}.png`),
      flower: range(6).map((i) => `${PK}/forest/props/flower_${i}.png`),
      grass: range(2).map((i) => `${PK}/forest/props/grass_${i}.png`),
    },
  },
  snow: {
    sheets: { sp_snow_ground: `${PK}/snow/tileset/tileset_snow.png` },
    props: {
      rock: range(14).map((i) => `${PK}/snow/props/snow_rock_${i}.png`),
      tree: range(4).map((i) => `${PK}/snow/props/snow_tree_${i}.png`),
    },
  },
  village: {
    sheets: {
      sp_village_ground: `${PK}/village/tile/village_ground_tile.png`,
      sp_village_wall: `${PK}/village/tile/village_wall_tile.png`,
      sp_village_soil: `${PK}/village/tile/soil_dark_tile.png`,
    },
    props: {
      bush: range(8).map((i) => `${PK}/village/props/bush/${i}.png`),
    },
  },
};

/** The atlas name a pack prop group's i-th sprite is registered under (1-based i). */
export function spProp(key: PackKey, group: string, i: number): string {
  return `sp_${key}_${group}_${i}`;
}

/** Register a pack's tilesets + numbered props into an atlas (call BEFORE loadAll). */
export function registerPack(atlas: Atlas, key: PackKey): void {
  const p = PACKS[key];
  atlas.addAll(p.sheets);
  for (const [group, urls] of Object.entries(p.props)) {
    urls.forEach((url, idx) => atlas.add(spProp(key, group, idx + 1), url));
  }
}

// ---- palette harmonization (blend the sanctumpixel family toward Cute Fantasy warmth) ----
// A gentle per-pixel lift: brighten a touch + warm-shift (more red, a little green) + a
// small saturation nudge, so the earthier sanctumpixel art sits with the brighter cute art.
// Same shift for every pack → they stay matched to each other AND move toward the CF base.
export interface HarmonizeOpts { brighten?: number; warm?: number; sat?: number }
const DEFAULT_HARMONIZE: Required<HarmonizeOpts> = { brighten: 10, warm: 12, sat: 1.06 };

function harmonizeImage(img: HTMLImageElement | HTMLCanvasElement, o: Required<HarmonizeOpts>): HTMLCanvasElement {
  const w = (img as any).width, h = (img as any).height;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const cx = cv.getContext("2d")!; cx.imageSmoothingEnabled = false;
  cx.drawImage(img as any, 0, 0);
  if (w === 0 || h === 0) return cv;
  const id = cx.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;                                  // keep transparent pixels
    let r = d[i], g = d[i + 1], b = d[i + 2];
    const avg = (r + g + b) / 3;                                   // saturation around the pixel's own luma
    r = avg + (r - avg) * o.sat + o.brighten + o.warm;
    g = avg + (g - avg) * o.sat + o.brighten + o.warm * 0.4;
    b = avg + (b - avg) * o.sat + o.brighten - o.warm * 0.3;
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  cx.putImageData(id, 0, 0);
  return cv;
}

/** After loadAll: recolor a pack's loaded sheets toward the warm CF palette (in place). */
export function harmonizePack(atlas: Atlas, key: PackKey, opts: HarmonizeOpts = {}): void {
  const o = { ...DEFAULT_HARMONIZE, ...opts };
  const p = PACKS[key];
  const names = [
    ...Object.keys(p.sheets),
    ...Object.entries(p.props).flatMap(([g, urls]) => urls.map((_, i) => spProp(key, g, i + 1))),
  ];
  for (const name of names) {
    if (!atlas.has(name)) continue;
    const sheet = atlas.get(name) as unknown as { img: HTMLImageElement | HTMLCanvasElement | null };
    if (sheet.img) sheet.img = harmonizeImage(sheet.img, o);
  }
}
