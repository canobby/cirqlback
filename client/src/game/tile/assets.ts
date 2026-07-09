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
  farmland: `${CF}/tiles/farmland.png`,   // tilled-soil autotile (112×128 @16) — real farm ground
  dirt: `${CF}/tiles/dirt.png`,           // solid dirt path tile
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
  mushrooms: `${CF}/decor/mushrooms.png`,   // 8×5 fanciful mushroom decor
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
  duck: `${CF}/animals/duck.png`,     // 256×640 @32 — pond life
  frog: `${CF}/animals/frog.png`,     // 320×128 @32
  swan: `${CF}/animals/swan.png`,     // 256×640 @32 — recoloured pink → oasis flamingo
  butterfly: `${CF}/animals/butterfly.png`,   // 16×64 @16 — 4-frame flutter
  bee: `${CF}/animals/bee.png`,       // 64×32 @32 — 2-frame
  farmer: `${CF}/npc/farmer_bob.png`,
  fisher: `${CF}/npc/fisherman_fin.png`,
  // ShroomLands DLC — biome ring "The Shroomwood" (same Cute Fantasy artist)
  shroom_purple: `${CF}/shroom/shroom_purple.png`,   // 128×96 — top row = 4 giant caps @32×48
  shroom_blue: `${CF}/shroom/shroom_blue.png`,
  shroom_red: `${CF}/shroom/shroom_red.png`,
  shroom_other: `${CF}/shroom/shroom_other.png`,     // 48×112 — small tan/blue caps @16
  shroom_house1: `${CF}/shroom/shroom_house1.png`,   // 80×80 red-cap mushroom house
  shroom_house2: `${CF}/shroom/shroom_house2.png`,   // 48×64
  shroom_house3: `${CF}/shroom/shroom_house3.png`,   // 48×64
  shroomling: `${CF}/shroom/shroomling.png`,          // 128×48 — 4 frames @32×48 (round critter)
  shroomling2: `${CF}/shroom/shroomling2.png`,        // 96×416 — purple shroomling @32
  shroom_rocks: `${CF}/shroom/shroom_rocks.png`,      // 208×192 — mossy rocks @16
  snail: `${CF}/shroom/snail.png`,                    // 16×16 tiny snail
  // Desert DLC — biome ring "The Dunes" (an oasis in warm sand)
  d_house1: `${CF}/desert/house1.png`,   // 80×80 adobe house
  d_house2: `${CF}/desert/house2.png`,   // 96×128
  d_house3: `${CF}/desert/house3.png`,   // 128×112
  cactus: `${CF}/desert/cactus.png`,     // 224×256 — cactus variety (32×48 cells)
  acacia: `${CF}/desert/acacia.png`,     // 240×64 — flat-top acacia (80×64 cells, col 1-2)
  palm1: `${CF}/desert/palm1.png`,       // 144×64 — palms (48×64 cells; col0=stump, col1-2=full palms)
  palm2: `${CF}/desert/palm2.png`,       // 96×48  — smaller palms (48×48 cells, col 0-1)
  dead_tree: `${CF}/desert/dead_tree.png`,   // 48×64
  dead_bush: `${CF}/desert/dead_bush.png`,   // 32×16 (2 frames)
  d_rocks: `${CF}/desert/rocks.png`,     // 192×32 @16
  d_fern: `${CF}/desert/fern.png`,       // 16×16 dry tuft
  d_fire: `${CF}/desert/campfire.png`,   // 96×16 — 6-frame animated campfire
  d_bones: `${CF}/desert/bones.png`,     // 160×128
  d_npc: `${CF}/desert/npc.png`,         // 192×320 @64
  d_trader: `${CF}/desert/trader.png`,   // 192×32
  camel: `${CF}/desert/camel.png`,       // 480×288 camel anim
  scarab: `${CF}/desert/scarab.png`,     // 64×48 @16
  // Cave — the underground level reached through the mesa (Stage 3)
  cave_door: `${CF}/cave/doorway.png`,   // 32×96 — cave entrance arch (top 32×48 = the mouth)
  cave_floor: `${CF}/cave/floor1.png`,   // 48×80 @16 floor variants
  cave_floor_mid: `${CF}/cave/floor_mid.png`,   // 16×16 floor fill
  cave_ladder: `${CF}/cave/ladder.png`,  // 16×16 — the exit ladder up
  cave_walls: `${CF}/cave/walls.png`,    // 112×128 @16 wall autotile set
  cave_support: `${CF}/cave/support1.png`,      // 80×96 wall support pillar
  cave_water: `${CF}/cave/water.png`,    // 112×80 cave water
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
