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
  water_blob2: `${CF}/tiles/water_blob2.png`,
  water_blob3: `${CF}/tiles/water_blob3.png`,
  water_blob4: `${CF}/tiles/water_blob4.png`,
  pavement: `${CF}/tiles/pavement.png`,
  cobble_blob2: `${CF}/tiles/cobble_blob2.png`,
  grass_auto: `${CF}/tiles/grass_auto.png`,
  water_anim1: `${CF}/tiles/water_anim1.png`,
  water_anim2: `${CF}/tiles/water_anim2.png`,
  path_middle: `${CF}/tiles/path_middle.png`,
  cobble_blob: `${CF}/tiles/cobble_blob.png`,
  beach_blob: `${CF}/tiles/beach_blob.png`,
  beach_tiles: `${CF}/tiles/beach_tiles.png`,
  tf_beach: `${CF}/tiles/tf_beach.png`,   // Time Fantasy animated water autotile + sand/beach
  cliff: `${CF}/tiles/cliff.png`,
  cliff2: `${CF}/tiles/cliff2.png`,
  cliff3: `${CF}/tiles/cliff3.png`,
  cliff4: `${CF}/tiles/cliff4.png`,
  water_foam: `${CF}/tiles/water_foam.png`,
  bridge_wood: `${CF}/tiles/bridge_wood.png`,
  // brand — the CIRQLBACK circular-arrow mark (spun as the wellspring emblem)
  logo: `${CF}/logo.png`,
  // actors
  player: `${CF}/actors/player.png`,
  // props
  tree_oak: `${CF}/props/tree_oak.png`,
  tree_oak_med: `${CF}/props/tree_oak_med.png`,
  // buildings (single sprites, feet-anchored)
  house1: `${CF}/buildings/house1_blue.png`,
  house2: `${CF}/buildings/house2_red.png`,
  house3: `${CF}/buildings/house3_green.png`,
  house4: `${CF}/buildings/house4_black.png`,
  inn: `${CF}/buildings/inn_blue.png`,
  windmill: `${CF}/buildings/windmill.png`,
  fisherman: `${CF}/buildings/fisherman.png`,
  // decoration
  well: `${CF}/decor/well.png`,
  fountain: `${CF}/decor/fountain.png`,
  flowers: `${CF}/decor/flowers.png`,
  signs: `${CF}/decor/signs.png`,
  fences: `${CF}/decor/fences.png`,
  lanterns: `${CF}/decor/lanterns.png`,
  benches: `${CF}/decor/benches.png`,
  outdoor_decor: `${CF}/decor/outdoor_decor.png`,
  // water-edge decor (8-frame 16×16 strips; we use frame 0)
  cattail: `${CF}/decor/cattail.png`,
  lilypad1: `${CF}/decor/lilypad1.png`,
  lilypad2: `${CF}/decor/lilypad2.png`,
  watergrass: `${CF}/decor/watergrass.png`,
  waterrock1: `${CF}/decor/waterrock1.png`,
  waterrock2: `${CF}/decor/waterrock2.png`,
  // life
  sheep: `${CF}/animals/sheep.png`,
  chicken: `${CF}/animals/chicken.png`,
  farmer: `${CF}/npc/farmer_bob.png`,
  fisher: `${CF}/npc/fisherman_fin.png`,
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
