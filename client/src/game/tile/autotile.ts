// autotile — pick the right edge/corner sub-tile for a painted terrain region.
//
// The Cute Fantasy transition sheets (water, cobble) bake the *outer* terrain's
// border into the tile: a water tile already has its grass fringe. So our model
// is layered — a base ground fill everywhere, then non-base terrains painted as
// regions and rendered with these blob sets on top. This module answers: for a
// cell of terrain T, given which of its 8 neighbours are ALSO T, which sub-tile?
//
// The pack's common transition grid is the 3×5 "blob" (see MANIFEST):
//   rows 0-2 = the 3×3 convex ring + centre, rows 3-4 = the inner (concave) corners.

/** Which neighbours share this cell's terrain (true = same terrain). */
export interface Same {
  n: boolean; e: boolean; s: boolean; w: boolean;
  ne: boolean; nw: boolean; se: boolean; sw: boolean;
}

/** A blob layout maps each edge/corner case to a [col,row] in the sheet. */
export interface BlobLayout {
  c: [number, number];                       // interior / centre fill
  n: [number, number]; e: [number, number]; s: [number, number]; w: [number, number];
  nw: [number, number]; ne: [number, number]; sw: [number, number]; se: [number, number];  // convex (outer) corners
  inNW: [number, number]; inNE: [number, number]; inSW: [number, number]; inSE: [number, number]; // concave (inner) corners
}

/** The pack's 3×5 blob sheet (water_blob, cobble_blob). */
export const BLOB_3x5: BlobLayout = {
  nw: [0, 0], n: [1, 0], ne: [2, 0],
  w:  [0, 1], c: [1, 1], e:  [2, 1],
  sw: [0, 2], s: [1, 2], se: [2, 2],
  inNW: [0, 3], inNE: [1, 3],
  inSW: [0, 4], inSE: [1, 4],
};

/**
 * Choose the sub-tile [col,row] for a terrain cell from its neighbourhood.
 *
 * Convex corners win first (a region turning a corner needs the rounded outside
 * on two sides). Then single-side edges. A fully-interior cell (all 4 orthogonal
 * neighbours same) still shows an inner corner where a diagonal is missing, so
 * ponds/rivers get clean concave notches.
 */
export function blobTile(L: BlobLayout, s: Same): [number, number] {
  const { n, e, s: so, w } = s;
  // Convex (outer) corners — two adjacent orthogonal sides are outside the region.
  if (!n && !w) return L.nw;
  if (!n && !e) return L.ne;
  if (!so && !w) return L.sw;
  if (!so && !e) return L.se;
  // Straight edges — exactly one orthogonal side is outside.
  if (!n) return L.n;
  if (!so) return L.s;
  if (!w) return L.w;
  if (!e) return L.e;
  // Interior: all four orthogonals are same. A missing diagonal → inner corner.
  if (!s.ne) return L.inNE;
  if (!s.nw) return L.inNW;
  if (!s.se) return L.inSE;
  if (!s.sw) return L.inSW;
  return L.c;
}

// ---------------------------------------------------------------------------
// DUAL-GRID marching-squares autotiler (the gold standard — Red Blob Games /
// boristhebrave). See [[cirqlback-autotiling-expertise]]. The DISPLAY grid is
// offset half a tile from the WORLD grid, so each display cell sits over the 4
// CORNER world-cells; the 4 corners give a 0–15 mask → 16 tiles that handle
// edges AND inner corners cleanly. Works for ANY terrain region (sand, water,
// path, cliff-top) — not just cliffs. The mask→cell table is per-sheet
// (calibration), because packs lay their 16 tiles out in different orders.
// ---------------------------------------------------------------------------

/** True if world-cell (wx,wy) belongs to the region being autotiled. */
export type InRegion = (wx: number, wy: number) => boolean;

/**
 * The 4-corner mask (0–15) for the DISPLAY cell at world-space corner (cx,cy).
 * A display cell drawn at world (cx-0.5, cy-0.5) covers the four world cells
 * meeting at that corner: TL=(cx-1,cy-1), TR=(cx,cy-1), BR=(cx,cy), BL=(cx-1,cy).
 * Bits: TL=1, TR=2, BR=4, BL=8.
 */
export function dualMask(inR: InRegion, cx: number, cy: number): number {
  return (inR(cx - 1, cy - 1) ? 1 : 0) | (inR(cx, cy - 1) ? 2 : 0) | (inR(cx, cy) ? 4 : 0) | (inR(cx - 1, cy) ? 8 : 0);
}

/** A per-sheet lookup: the 4-corner mask (0–15) → the sheet cell [col,row]. */
export type DualMap = Record<number, [number, number]>;

/**
 * The CANONICAL dual-grid layout — the tile whose filled corners match the mask,
 * arranged in the widely-used 4×4 order (jess::codes / Godot TileMapDual). Use
 * this when a sheet is authored to the standard; otherwise supply a calibrated
 * DualMap. Index 0 (no corners filled) is "nothing here" — caller skips it.
 * Layout (col,row), corners TL=1 TR=2 BR=4 BL=8:
 *   row0: 0000  1000  1100  0100      (empty, BL, BL+TL? …) — see values below
 */
export const DUAL_GRID_STANDARD: DualMap = {
  0b0000: [0, 3],  // none            (usually transparent / skipped)
  0b0100: [0, 2],  // BR only         → outer corner
  0b0010: [0, 0],  // TR only
  0b0110: [0, 1],  // TR+BR           → right edge
  0b1000: [2, 2],  // BL only
  0b1100: [1, 2],  // BL+BR           → bottom edge
  0b1010: [3, 3],  // TR+BL (diag)    → two opposite corners
  0b1110: [1, 1],  // TR+BR+BL        → inner corner (missing TL)
  0b0001: [2, 0],  // TL only
  0b0101: [3, 0],  // TL+BR (diag)
  0b0011: [1, 0],  // TL+TR           → top edge
  0b0111: [2, 1],  // TL+TR+BR        → inner corner (missing BL)
  0b1001: [0, 1],  // TL+BL           → left edge
  0b1101: [3, 1],  // TL+BR+BL        → inner corner (missing TR)
  0b1011: [3, 2],  // TL+TR+BL        → inner corner (missing BR)
  0b1111: [1, 3],  // all four        → solid interior
};

/**
 * Render a region with a dual-grid sheet. For every display corner across the
 * region's bounds it computes the mask and, if any corner is filled, draws the
 * mapped cell at the half-offset display position via `put`. `put(sx,sy,col,row)`
 * receives WORLD tile coords of the display cell's top-left (i.e. corner−0.5).
 */
export function paintDualGrid(
  inR: InRegion, x0: number, y0: number, x1: number, y1: number,
  map: DualMap, put: (wx: number, wy: number, col: number, row: number) => void,
): void {
  for (let cy = y0; cy <= y1 + 1; cy++) {
    for (let cx = x0; cx <= x1 + 1; cx++) {
      const m = dualMask(inR, cx, cy);
      if (m === 0) continue;
      const cell = map[m];
      if (!cell) continue;
      put(cx - 1, cy - 1, cell[0], cell[1]);   // display cell is offset −0.5 tile (drawn at the corner)
    }
  }
}

/** Cardinal 4-bit mask (N=1,E=2,S=4,W=8 → 0–15) for a region cell — the simple method. */
export function cardinalMask(inR: InRegion, x: number, y: number): number {
  return (inR(x, y - 1) ? 1 : 0) | (inR(x + 1, y) ? 2 : 0) | (inR(x, y + 1) ? 4 : 0) | (inR(x - 1, y) ? 8 : 0);
}
