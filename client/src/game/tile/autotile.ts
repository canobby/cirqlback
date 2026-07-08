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
