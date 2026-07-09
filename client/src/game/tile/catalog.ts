// catalog — asset classification + build-time SAFETY CHECKS so we never place a
// wall/edge/partial/water sprite as a standalone land prop (the "button flowers"
// and "water-tuft on dry sand" class of bug).
//
// Two rules, per the owner:
//  1) Every sprite belongs to a KIND. Scatter may ONLY draw `prop` (whole,
//     standalone objects). Sets (walls/cliffs/fences/ground/water) go through the
//     autotiler; `water` items go only in/at water; `partial`/`actor`/`animated`
//     are never scattered.
//  2) A sprite with a BLUE BOTTOM is a water sprite — auto-detected and kept off
//     land, even if a sheet is otherwise mislabelled. A near-empty cell is a
//     fragment (an edge/partial piece) and is excluded from scatter too.
import type { Atlas, Sheet } from "./tileset";

export type AssetKind = "prop" | "set" | "water" | "actor" | "animated" | "partial";

// The sheets we reference, tagged by kind. Scatter reads ONLY names whose kind is
// "prop". (Sanctumpixel `props/*` are single whole-object PNGs → always safe props;
// their `tileset/*` are sets. Cute Fantasy merged sheets like outdoor_decor/flowers
// are intentionally NOT props here — their clean cells are pulled deliberately, not
// scattered blind.)
export const KIND: Record<string, AssetKind> = {
  // sanctumpixel desert — clean standalone props
  ...propRange("sp_desert_rock_", 11), ...propRange("sp_desert_cactus_", 7),
  ...propRange("sp_desert_grass_", 8), ...propRange("sp_desert_joshua_", 4),
  // sanctumpixel terrain sets (autotiler only — never scatter)
  sp_desert_wall: "set", sp_desert_ground: "set",
  // Cute Fantasy autotile SETS / edge kits (never scatter a piece)
  fences: "set", cliff: "set", cliff2: "set", cliff3: "set", cliff4: "set",
  bridge_wood: "set", farmland: "set", grass: "set", water_blob: "set", cave_walls: "set",
  // Cute Fantasy water-only decor
  cattail: "water", lilypad1: "water", lilypad2: "water", watergrass: "water", waterrock1: "water", waterrock2: "water",
};

function propRange(prefix: string, n: number): Record<string, AssetKind> {
  const o: Record<string, AssetKind> = {};
  for (let i = 1; i <= n; i++) o[`${prefix}${i}`] = "prop";
  return o;
}

// ---- pixel auto-checks (run on a LOADED sheet cell) ----
let _scratch: HTMLCanvasElement | null = null;
function cellData(sheet: Sheet, col: number, row: number, fw: number, fh: number): Uint8ClampedArray | null {
  if (!sheet.img) return null;
  const cv = _scratch || (_scratch = document.createElement("canvas"));
  cv.width = fw; cv.height = fh;
  const cx = cv.getContext("2d", { willReadFrequently: true })!; cx.imageSmoothingEnabled = false;
  cx.clearRect(0, 0, fw, fh);
  cx.drawImage(sheet.img as any, col * fw, row * fh, fw, fh, 0, 0, fw, fh);
  return cx.getImageData(0, 0, fw, fh).data;
}

export interface CellClass { water: boolean; fragment: boolean }

/** Classify one sprite cell: does it have a water (blue) bottom, and is it a near-empty fragment? */
export function classifyCell(sheet: Sheet, col: number, row: number, fw: number, fh: number): CellClass {
  const d = cellData(sheet, col, row, fw, fh);
  if (!d) return { water: false, fragment: false };
  const bottomStart = Math.floor(fh * 0.68);
  let opaque = 0, bottomOpaque = 0, blueBottom = 0;
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const i = (y * fw + x) * 4;
    if (d[i + 3] < 40) continue;
    opaque++;
    if (y >= bottomStart) {
      bottomOpaque++;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      // a clearly water-blue/cyan pixel — strong blue, well above red & green (not a grey shadow)
      if (b > 120 && b > r + 34 && b > g + 24) blueBottom++;
    }
  }
  const fragment = opaque / (fw * fh) < 0.05;
  const water = bottomOpaque > 4 && blueBottom / bottomOpaque > 0.5;
  return { water, fragment };
}

/** A placed prop (subset of Prop) the validator inspects. */
export interface Placed { sheet: string; col: number; row: number; fw: number; fh: number; water?: boolean }

/**
 * DEV-time build check: warn about any placed prop that reads as a WATER sprite or
 * a near-empty FRAGMENT but isn't flagged as an intentional water item. Catches the
 * "water tuft / edge piece scattered on dry land" bug automatically. Call after the
 * atlas loads. Returns the warnings (also console.warned in dev).
 */
export function validatePlacements(atlas: Atlas, props: Placed[]): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const p of props) {
    if (p.water) continue;                                    // intentional water item — fine
    if (!atlas.has(p.sheet)) continue;
    const key = `${p.sheet}:${p.col},${p.row}`;
    if (seen.has(key)) continue; seen.add(key);
    const kind = KIND[p.sheet];
    if (kind === "water" || kind === "set" || kind === "partial") { warnings.push(`${key} is a ${kind} sheet but was placed as a land prop`); continue; }
    const c = classifyCell(atlas.get(p.sheet), p.col, p.row, p.fw, p.fh);
    if (c.water) warnings.push(`${key} has a BLUE (water) bottom — should be water-only, not scattered on land`);
    else if (c.fragment) warnings.push(`${key} is nearly empty (a fragment/edge piece) — not a whole prop`);
  }
  if (warnings.length) console.warn(`[catalog] ${warnings.length} suspect land placements:\n  ` + warnings.join("\n  "));
  return warnings;
}
