// assets — the Cute Fantasy sheet manifest (paths served from client/public).
// One place to register every imported sheet; `cuteFantasyAtlas()` returns an
// Atlas ready to `loadAll()`. Mirrors MANIFEST.md.

import { Atlas } from "./tileset";

const CF = "/cute-fantasy";

/** name → served URL. Add a line here when a phase imports a new sheet. */
export const CF_SHEETS: Record<string, string> = {
  // ground
  grass: `${CF}/tiles/grass_middle.png`,
  grass_v1: `${CF}/tiles/grass_v1.png`,
  grass_v2: `${CF}/tiles/grass_v2.png`,
  grass_v3: `${CF}/tiles/grass_v3.png`,
  water_middle: `${CF}/tiles/water_middle.png`,
  water_blob: `${CF}/tiles/water_blob.png`,
  water_anim1: `${CF}/tiles/water_anim1.png`,
  water_anim2: `${CF}/tiles/water_anim2.png`,
  path_middle: `${CF}/tiles/path_middle.png`,
  cobble_blob: `${CF}/tiles/cobble_blob.png`,
  beach_blob: `${CF}/tiles/beach_blob.png`,
  cliff: `${CF}/tiles/cliff.png`,
  // actors
  player: `${CF}/actors/player.png`,
  // props
  tree_oak: `${CF}/props/tree_oak.png`,
  tree_oak_med: `${CF}/props/tree_oak_med.png`,
  // light layer (P3)
  waterfall1: `${CF}/waterfall/Waterfall_1.png`,
  waterfall2: `${CF}/waterfall/Waterfall_2.png`,
  waterfall3: `${CF}/waterfall/Waterfall_3.png`,
  waterfall4: `${CF}/waterfall/Waterfall_4.png`,
  waterfall5: `${CF}/waterfall/Waterfall_5.png`,
  waterfall6: `${CF}/waterfall/Waterfall_6.png`,
  waterfall7: `${CF}/waterfall/Waterfall_7.png`,
  waterfall8: `${CF}/waterfall/Waterfall_8.png`,
};

/** An Atlas pre-registered with every Cute Fantasy sheet (call `.loadAll()`). */
export function cuteFantasyAtlas(): Atlas {
  return new Atlas().addAll(CF_SHEETS);
}
