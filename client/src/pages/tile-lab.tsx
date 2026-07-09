import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { RetroEngine, type RetroHooks } from "@/game/retro-engine";
import OracleChat, { type Speaker } from "@/components/cirql/oracle-chat";
import {
  cuteFantasyAtlas, TileMap, TileRenderer, Actor, PLAYER_ANIM,
  DEFAULT_TERRAIN, registerPack, harmonizePack, validatePlacements,
  blobTile, BLOB_3x5,
  type Atlas, type Camera, type Drawable, type TerrainConfig, type Prop,
} from "@/game/tile";

// A living critter: a placed prop that frame-animates in place and gently wanders near home.
interface Critter {
  p: Prop; gx: number; gy: number; hx: number; hy: number;    // current ground pos + home
  baseCol: number; frames: number; fps: number; ph: number;   // frame animation
  bob: number; wr: number; sp: number;      // idle-bob height · wander radius (tiles) · speed (px/s)
  tx: number; ty: number; nt: number;       // current wander target + time-to-retarget
  water: boolean;                           // stays in the pond (duck) vs. on land
  dir?: { down: number; up: number };        // NPC directional walk rows (d_npc: down=R, up=R+2) → row picked by motion/player
}

// TILE LAB — P1 vertical slice: Cloverfield, one hand-authored meadow island.
// Proves the hybrid LOOK, not just the plumbing: a grassy plateau in the sea with
// a wellspring→river→waterfall watershed, a spread-out village (houses/inn/
// windmill/fisherman), a bridged cobble road, thick flower density, grazing
// animals + villager NPCs, and a procedural LIGHT layer (wellspring glow, river
// shimmer, waterfall mist) painted over the Cute Fantasy tiles.
// window.__tilelab (DEV): eng.inspect(sheet,cell) to decode cells, eng.setZoom(z).

const T = 16;
const MW = 68, MH = 52;          // map size in tiles
const CX = 34, CY = 26;          // island centre (tiles)
const RX = 28, RY = 21;          // island radii (tiles)
const WELL = { x: CX, y: CY };   // the fountain — dead centre of the ring
const ROAD_Y = 34;               // the east-west lane's latitude
const RIVER_X = 33;              // the river's starting column (under the fountain)
const POND = { x: 35, y: 40 };   // the river's terminus — an INLAND pond (never the coast)
const POND_R = 3;
const EDGE = 3.4;                // the "edgepoint": nothing is placed within this many tiles of the shore

// A natural, medium, non-circular pond, kept well inside the ring. (Painted procedurally.)
const SPOND = { cx: 30, cy: 33, rx: 5, ry: 3.9 };
// Shroomwood layout ANCHORS (see docs/cirql/CIRQL-Placement-Rules.md): a clustered
// village heart (NW), a fungal-forest core massed on the E side, and a footpath that
// leads plaza → pond. Placement follows structure/function, not a random scatter.
const PLAZA = { x: 22, y: 17 };                                   // the village heart (well + benches)
const GROVE = { x: 48, y: 31 };                                  // the grove core (dense here, thinning out)
const LANE: [number, number][] = [[22, 19], [24, 22], [26, 25], [24, 27], [26, 29]];   // plaza → pond footpath (gently winding)
const SFIELD = { x0: 30, y0: 11, x1: 37, y1: 16 };               // the mushroom farm — tilled rows + fence
const COMMONS = { x: 18, y: 37 };                                // the fungal bonfire commons (gathering spot)
const POND_DOCK = { x0: SPOND.cx - 5, x1: SPOND.cx - 1, y: SPOND.cy };   // a little fishing pier off the west bank
// fine ground-detail cells from the outdoor_decor sheet (grass tufts / small flowers / pebbles / a bush)
const TUFTS: [number, number][] = [[0, 2], [1, 2], [2, 2], [6, 2], [6, 3]];   // LAND grass tufts only (no blue-water base)
const DFLOWERS: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 2], [4, 2]];
const DBUSH: [number, number] = [5, 5];

// ---- The Dunes (desert oasis ring) layout ANCHORS ----
// TMW Tulimshar reference: sand ground meeting the sea, a bright OASIS pool with a lush
// palm/acacia halo, an adobe caravan hamlet + paved plaza on one side, a nomad campfire,
// a rocky MESA (Stage 2) with a building on top + a cave, and sparse dry dune scatter.
const OASIS = { cx: 28, cy: 31, rx: 6, ry: 4.3 };                 // the oasis pool (procedural blue water, inside the ring)
const HAMLET = { x: 20, y: 16 };                                  // the adobe caravan cluster (NW)
const DPLAZA = { x: 22, y: 19 };                                  // paved well plaza in the hamlet
const DLANE: [number, number][] = [[22, 21], [24, 24], [26, 27], [27, 29]];   // plaza → oasis footpath (worn sand)
const DCAMP = { x: 36, y: 41 };                                   // nomad campfire commons (open sand, S)
const MESA = { x0: 44, y0: 15, x1: 54, y1: 21, faceH: 3, ramps: [47, 51] };   // the raised sandstone plateau (NE, pulled inside the ring) + its 2 south ramp columns
// NPCs stand BESIDE their focal object (well/oasis/campfire), never on top of it, so the
// purposeful object stays readable (the "don't obscure the firepit" rule — see the rulebook).
const DNPC: Record<string, [number, number]> = {
  sahra: [DPLAZA.x + 3, DPLAZA.y],                 // well-keeper — east of the plaza well, not on it
  kesh: [OASIS.cx - 9, OASIS.cy],                  // camel-herder — WEST side of the lagoon, on dry sand
  tamm: [DCAMP.x + 3, DCAMP.y],                    // wayfarer — beside the campfire seat-ring, fire left clear
};
// camels graze in the OPEN by the lagoon (visible, not hidden behind trees); the west one sits
// well SOUTH of Kesh so it never blocks the view of him.
const DCAMEL: [number, number][] = [[OASIS.cx - 6, OASIS.cy + 6], [OASIS.cx + 4, OASIS.cy - 5]];
// tiles kept CLEAR of scatter/flora so the NPCs, camels + the flamingo read (functional clearance).
const DRESERVED: [number, number][] = [DNPC.sahra, DNPC.kesh, DNPC.tamm, ...DCAMEL, [OASIS.cx - 6, OASIS.cy + 3]];
// A worn PATH network — the ring's walking guides, connecting the anchors the way people move
// (dock → the trade road east of the oasis → mesa base, a spur to the camp, and plaza → the oasis
// west bank). Routed to skip the water. Painted as packed sand; scatter/flora keep off it.
const DPATHS: [number, number][][] = [
  [[34, 45], [35, 39], [37, 34], [40, 30], [44, 26], [49, 24]],   // dock → trade road (east of the oasis) → mesa base
  [[37, 34], [35, 38], [36, 39]],                                  // spur → APPROACHES the campfire commons, stops N of the fire (never through it)
  [[22, 20], [21, 25], [20, 30], [20, 33]],                       // plaza → the oasis west bank (to Kesh + the herd)
];
// PATH HIERARCHY (see [[cirqlback-paths-roads-expertise]]): the main caravan trade ROAD is wider;
// the spurs are narrow FOOTPATHS. Half-width in tiles → the sprite path autotiles to this thickness.
const DPATH_HALFW = [1.2, 0.72, 0.72];
// sanctumpixel desert props are single-image PNGs of varied size — dims hardcoded (props are
// placed before the atlas finishes loading, so we can't read w/h off the atlas at build time).
const SP_ROCK: Record<number, [number, number]> = { 1: [32, 64], 2: [32, 64], 3: [32, 64], 4: [48, 48], 5: [48, 48], 6: [32, 32], 7: [32, 32], 8: [32, 32], 9: [32, 32], 10: [48, 32], 11: [48, 32] };
const SP_CACTUS: Record<number, [number, number]> = { 1: [32, 64], 2: [32, 64], 3: [32, 64], 4: [32, 64], 5: [32, 64], 6: [32, 64], 7: [48, 80] };
const SP_JOSHUA: Record<number, [number, number]> = { 1: [64, 80], 2: [64, 80], 3: [64, 80], 4: [48, 80] };
// dry-desert ground detail from the desert sheets (fern tuft / small rocks / pebbles)

// A ring's biome = a palette recolor + a different prop kit + optional inland water.
// Proves the locked rules generalise: same procedural beach + edgepoint margins +
// water-inside-the-ring, just a new coat of Cute-Fantasy (here the ShroomLands DLC).
type Biome = "meadow" | "shroom" | "desert";

// A talk-to spot in the world (the Fountain Oracle or a villager NPC), with the reach
// at which you can talk. `Speaker` is shared with the chat panel + the server route.
interface Interactable { x: number; y: number; r: number; speaker: Speaker }

interface BiomePalette {
  glite: number[]; gdark: number[];   // meadow grass shading (raised / shadowed)
  grassOpaque: boolean;               // paint the ground fully (recolour the biome) vs. a subtle overlay
  // per-ring WATER palette — ALL water on the ring (sea + inland) shares this, so it reads as one
  // biome-appropriate water (deep centre → shallow → foam waterline → damp/wet edge).
  water?: { deep: number[]; shal: number[]; foam: number[]; wet: number[] };
}
const PALETTES: Record<Biome, BiomePalette> = {
  // the loved meadow — unchanged (subtle green shading over the grass tile, no inland water)
  meadow: { glite: [150, 202, 98], gdark: [44, 94, 46], grassOpaque: false },
  // The Shroomwood — an enchanted fungal forest. Cohesive palette: sunlit lush green →
  // deep cool forest-green (teal undertone), flowed as soft tonal patches over the grass
  // tiles so colour reads natural + enhanced. No fountain (town-only). Neon in the LIGHT layer.
  shroom: { glite: [142, 190, 116], gdark: [44, 96, 82], grassOpaque: false },
  // The Dunes — a desert oasis ring (TMW Tulimshar reference). Warm pale sand → ochre dune
  // shade, flowed as soft tonal contours over a SAND ground tile (buildSandTexture). No
  // fountain (wild ring). The oasis is bright procedural blue water inside the ring.
  // Water matches the SEA that rings the island, so the oasis reads as a piece of the same water
  // (cohesion), and gets the beach's foam→shallow→deep edge (thinner) so it reads as living water.
  desert: {
    // BRACKET the LIGHTER sand tone (~[215,167,106] harmonised) — now the dominant floor — so the dune
    // wash shades ± around it (not toward pale or dark). The path's surface is this same light tone, so
    // the path blends into the dominant ground; the DARKER sand is the accent patches (sandRegion).
    glite: [224, 178, 116], gdark: [198, 150, 96], grassOpaque: false,
    water: { deep: [26, 86, 132], shal: [118, 200, 228], foam: [212, 234, 240], wet: [150, 178, 120] },
  },
};

// deterministic RNG so the island is stable across reloads
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const smoothstep = (e0: number, e1: number, x: number) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const mix3 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp255 = (x: number) => (x < 0 ? 0 : x > 255 ? 255 : x) | 0;
const hash2 = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return (h >>> 0) / 4294967296; };

class TileLabEngine extends RetroEngine {
  private atlas: Atlas = cuteFantasyAtlas();
  private ren!: TileRenderer;
  private map!: TileMap;
  private player = new Actor(PLAYER_ANIM);
  private cam: Camera = { x: 0, y: 0, scale: 2, vw: 1, vh: 1 };
  private zoom = 1.5;   // a wide, showable default (see most of the ring on load)
  private loaded = false;
  private tsec = 0;
  private falls: { x: number; y: number }[] = [];   // river-mouth glow points (world px)
  private riverCol: number[] = [];                  // river centre x (tiles) per row — for a meandering channel
  private coast!: HTMLCanvasElement;                // pre-rendered textured beach/ocean layer
  private coastSS = 2;                              // super-sample factor of the coast canvas
  private shore: { x: number; y: number }[] = [];   // shoreline contour points (world px) for animated foam
  private logo: HTMLCanvasElement | null = null;    // CIRQLBACK mark, cream keyed to transparent
  private blank = false;                            // CIRQLSPACE (home ring): blank buildable canvas
  private biome: Biome = "meadow";
  private hasFountain = true;                        // the CIRQL fountain lives in the TOWN only
  private bpal: BiomePalette = PALETTES.meadow;
  private glowSpots: { x: number; y: number; color: string; r: number }[] = [];   // per-object neon glow (mushrooms)
  private rx = RX; private ry = RY;                 // ring radii — CIRQLSPACE starts ~2/3, expands later
  private labels: { x: number; y: number; text: string; cave?: boolean; follow?: Critter }[] = [];   // place/NPC name tags (world px; cave-only tags flagged; follow tracks a wandering NPC)
  private critters: Critter[] = [];                                // animals that frame-animate + wander

  // ---- in-world talk (the Fountain Oracle + ring NPCs) ----
  private interactables: Interactable[] = [];        // fountain + villagers you can talk to
  private nearInter: Interactable | null = null;     // the one currently in reach (drives the prompt)
  private chatPaused = false;                         // frozen while a conversation is open
  private caveMouth: { x: number; y: number } | null = null;   // the mesa cave entrance (tiles) → the underground level
  // ---- the underground level (a sub-map reached through the cave mouth) ----
  private surfaceMap: TileMap | null = null;         // stashed while underground (this.map becomes the cave)
  private caveMap: TileMap | null = null;            // the underground room (built once, on first entry)
  private inCave = false;
  private caveReturn = { x: 0, y: 0 };               // where to drop back on the surface (world px)
  private caveExit: { x: number; y: number } | null = null;   // the up-ladder tile in the cave
  private caveGem: { x: number; y: number } | null = null;    // the glowing focal gem (world px)
  private fadeT = 0;                                 // quick black fade on a level transition
  private portalArmed = true;                        // must step clear of a portal before it fires again (no ping-pong)
  // directional sun shadows (depth engine, slice 1). OFF for now — re-enable per ring once the
  // ground/floor sprites are laid (owner: long shadows hide things + look weird on unfinished ground).
  private sunShadows = false;
  private sunDir = { x: 0.4, y: 0.92 };
  private sunLen = 0.5;
  setSun(dx: number, dy: number, len: number) { const m = Math.hypot(dx, dy) || 1; this.sunDir = { x: dx / m, y: dy / m }; this.sunLen = len; this.sunShadows = true; }
  /** Fired when the nearest talkable target changes (null = none in reach). Page shows a Talk prompt. */
  public onProximity: ((s: Speaker | null) => void) | null = null;
  /** Fired when the player chooses to talk (E / Space, or the Talk button). Page opens the chat. */
  public onTalk: ((s: Speaker) => void) | null = null;
  /** Which ring this instance is, for scoping NPC knowledge. */
  private ringId(): string { return this.blank ? "cirqlspace" : this.biome; }

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}, blank = false, biome: Biome = "meadow") {
    super(canvas, hooks, 320, 200);
    this.blank = blank;
    this.biome = biome;
    this.hasFountain = biome !== "shroom" && biome !== "desert";   // wild rings have no fountain — that's the town's
    this.bpal = PALETTES[biome];
    if (blank) { this.rx = RX * 0.66; this.ry = RY * 0.66; }   // start small; land-growth expands it later
    this.fit = true; this.fitPx = 3;
    this.crt = false;
    this.resize();
    this.buildIsland();
    // the ground is real tiles (grass shows through a light shade); the farm is tilled-soil tiles.
    // Pond stays procedural (Path A). Beach stays procedural at the rim.
    const terr: TerrainConfig | undefined = biome === "shroom"
      ? { ...DEFAULT_TERRAIN, farm: { fill: "farmland", cell: [5, 2] } }
      : biome === "desert"
        // the desert LAND is a real SPRITE sand floor (base + 3 varied tiles), laid across everything
        // but the water — only the lagoon/sea stay procedural. (Owner rule: sprite floor laid first.)
        // The plaza "path" terrain uses the warm SANDSTONE recolour (not blue-grey cobble) to match.
        ? { ...DEFAULT_TERRAIN, grass: { fill: "grass", variants: ["grass", "sand_v1", "sand_v3"], variantAt: (tx: number, ty: number) => this.sandRegion(tx, ty) }, path: { fill: "sandpath", cell: [1, 1] } }
        : undefined;
    this.ren = new TileRenderer(this.atlas, terr);
    // pull in the matching sanctumpixel biome pack (terrain/cliffs/nature) for the Dunes,
    // blended with the Cute Fantasy cast; harmonised toward the warm CF palette after load.
    if (biome === "desert") registerPack(this.atlas, "desert");
    this.atlas.loadAll().then(() => {
      this.buildLogo();
      if (biome === "desert") { harmonizePack(this.atlas, "desert"); this.buildSandTexture(); this.buildFlamingo(); this.buildSandPath(); }
      else this.buildGrassTexture();
      this.loaded = true;
      // build-time safety check: warn if any placed land prop reads as a water sprite
      // (blue bottom) or a near-empty fragment/edge piece — catches mis-scattered tiles.
      if (import.meta.env.DEV) validatePlacements(this.atlas, this.map.props as any);
    }).catch((e) => console.error(e));
    this.start();
  }

  // ---------- island geometry ----------
  private land(tx: number, ty: number): boolean {
    const dx = (tx - CX) / this.rx, dy = (ty - CY) / this.ry;
    const ang = Math.atan2(ty - CY, tx - CX);
    const d = dx * dx + dy * dy;
    const R = 1 + 0.035 * Math.sin(ang * 2 + 0.6);   // one gentle low-freq wave → smooth shore
    return d < R;
  }

  /** Placement rule: a point is "safe" (not too near the shore) if it's inside the edgepoint. */
  private insideEdge(tx: number, ty: number, margin = EDGE): boolean { return this.landField(tx, ty) > margin; }

  // ---------- author the ring ----------
  private buildIsland() {
    const map = new TileMap(MW, MH, T, "sea");   // ocean = void; the smooth beach/coast is drawn procedurally
    map.solidTerrain.add("sea");
    // 1) the grass ring
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (this.land(tx, ty)) map.set(tx, ty, "grass");

    // 2) the CIRQL fountain — TOWN-only; wild/biome rings have their own water instead
    this.labels = [];
    if (this.hasFountain) {
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1]] as [number, number][]) map.setSolid(WELL.x + dx, WELL.y + dy, true);
      this.labels.push({ x: WELL.x * T + T / 2, y: (WELL.y + 2) * T, text: "The CIRQL Fountain" });
    }

    // CIRQLSPACE (the personal home ring) is BLANK — just the ring, the beach, and your
    // own centre fountain, a canvas to build on. Everything else is the populated meadow ring.
    if (this.biome === "shroom") this.buildShroomwood(map);
    else if (this.biome === "desert") this.buildDunes(map);
    else if (!this.blank) {
      map.paintLine(9, ROAD_Y, 58, ROAD_Y - 1, "path", 3);   // a cobble lane

      const H = (sheet: string, w: number, h: number, tx: number, ty: number, sc = 1, sr?: number) =>
        map.addProp({ sheet, fw: w, fh: h, col: 0, row: 0, x: tx * T + T / 2, y: ty * T + T, scale: sc, solidR: sr ?? w * sc * 0.33, overhead: false });
      H("windmill", 128, 112, 29, 11, 1);
      H("inn", 240, 192, 41, 12, 0.8);
      H("house1", 96, 128, 25, 18, 1);
      H("house2", 144, 128, 45, 20, 1);
      H("house3", 144, 128, 24, 27, 1);
      H("house4", 112, 96, 47, 28, 1);
      H("fisherman", 96, 112, 14, 27, 1);

      const oak = (tx: number, ty: number, col = 1) => {
        if (!this.insideEdge(tx, ty, 5)) return;   // no canopies hanging over the ring
        map.addProp({ sheet: "tree_oak", fw: 64, fh: 80, col, row: 0, x: tx * T + 8, y: ty * T + 12, overhead: true, solidR: 7 });
      };
      for (const [tx, ty] of [[52, 15], [55, 18], [50, 20], [15, 15], [18, 12], [50, 34]] as [number, number][]) oak(tx, ty, 1 + ((tx + ty) % 2));
      this.placeShoreTrees(map);
      this.placeFlowerClumps(map);
      // (mushrooms: placeMushrooms() is ready for later rings — kept OFF this one)

      const sheep = (tx: number, ty: number) => this.addCritter(map, "sheep", 32, 32, 0, 0, tx, ty, { solidR: 6, wr: 0.9, sp: 4, bob: 0.8 });
      for (const [tx, ty] of [[18, 40], [21, 42], [16, 38], [23, 39]] as [number, number][]) sheep(tx, ty);
      const chick = (tx: number, ty: number) => this.addCritter(map, "chicken", 32, 32, 0, 0, tx, ty, { wr: 1.4, sp: 7, bob: 1.2 });
      for (const [tx, ty] of [[27, 20], [29, 21], [43, 24]] as [number, number][]) chick(tx, ty);
      map.addProp({ sheet: "farmer", fw: 64, fh: 64, col: 0, row: 0, ay: 0.66, x: 30 * T, y: 29 * T, solidR: 6 }); // open meadow
      map.addProp({ sheet: "fisher", fw: 64, fh: 64, col: 0, row: 0, ay: 0.66, x: 39 * T, y: 30 * T, solidR: 6 }); // open meadow
      this.labels.push(
        { x: 30 * T, y: 29 * T - 30, text: "Bram" },
        { x: 39 * T, y: 30 * T - 30, text: "Finn" },
        { x: 41 * T + T / 2, y: 5 * T, text: "The Inn" },
        { x: 25 * T + T / 2, y: 12 * T, text: "Cottage" },
      );
    }

    this.map = map;
    // spawn on clear land near the fountain (shroom: west of the rivulet; desert: by the oasis)
    const [ssx, ssy] = this.biome === "shroom" ? [(CX - 7) * T, (CY + 1) * T]
      : this.biome === "desert" ? [(OASIS.cx + 1) * T, (OASIS.cy + OASIS.ry + 3) * T]
      : [CX * T, (CY + 5) * T];
    [this.player.x, this.player.y] = this.snapToLand(map, ssx, ssy);
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    this.buildCoast();
    this.registerInteractables();
  }

  /** The folk (and the Fountain Oracle) a traveller can walk up to and talk with. Positions
   *  mirror the NPC/fountain placements above; NPCs are scoped to this ring's knowledge. */
  private registerInteractables() {
    const ring = this.ringId();
    const push = (tx: number, ty: number, speaker: Speaker, r = 30) =>
      this.interactables.push({ x: tx * T, y: ty * T, r, speaker });
    // The CIRQL Fountain = the all-knowing Oracle (town / your home ring only).
    if (this.hasFountain) {
      this.interactables.push({ x: WELL.x * T + T / 2, y: WELL.y * T + T / 2, r: 42, speaker: { kind: "oracle", name: "The CIRQL Fountain" } });
    }
    if (this.biome === "shroom") {
      push(20, 19, { kind: "npc", ring, name: "Mycel", role: "the village keeper" });
      push(27, 33, { kind: "npc", ring, name: "Spora", role: "the fisher" });
      push(41, 29, { kind: "npc", ring, name: "Bramble", role: "the forager" });
    } else if (this.biome === "desert") {
      push(DNPC.sahra[0], DNPC.sahra[1], { kind: "npc", ring, name: "Sahra", role: "the well-keeper" });
      push(DNPC.kesh[0], DNPC.kesh[1], { kind: "npc", ring, name: "Kesh", role: "the camel-herder" });
      push(DNPC.tamm[0], DNPC.tamm[1], { kind: "npc", ring, name: "Tamm", role: "the wayfarer" });
    } else if (!this.blank) {
      push(30, 29, { kind: "npc", ring, name: "Bram", role: "the farmer" });
      push(39, 30, { kind: "npc", ring, name: "Finn", role: "the fisher" });
    }
  }

  /** Called by the page when the chat panel opens/closes — freezes the world + hides the prompt. */
  setChatOpen(open: boolean) {
    this.chatPaused = open;
    if (open && this.nearInter) { this.nearInter = null; this.onProximity?.(null); }
  }

  // ---------- The Shroomwood (biome ring) ----------
  /** A twilight fungal grove: glowing pool, giant mushrooms, shroom-cap village, round critters. */
  private buildShroomwood(map: TileMap) {
    // Built STRUCTURE → PATHS → FILL per docs/cirql/CIRQL-Placement-Rules.md, so the ring
    // reads as a designed RPG area (village + grove + meadow) instead of a random scatter.

    // ANCHOR 1 — the pond (Mistmere): a rest/beauty focal, painted procedurally (matches the
    // floor). Water tiles carry collision only. Paint FIRST so nothing spawns in it.
    map.solidTerrain.add("water");
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++)
      if (map.get(tx, ty) === "grass" && this.pondField(tx + 0.5, ty + 0.5) > 0) { map.set(tx, ty, "water"); map.setSolid(tx, ty, true); }
    this.placePondDecor(map);
    this.labels.push({ x: SPOND.cx * T, y: (SPOND.cy + SPOND.ry + 1.6) * T, text: "Mistmere" });

    // ANCHOR 2 — the village + its fenced mushroom farm; ANCHOR 3 — the grove (massed, with an
    // edge); then FILL: meadow pockets + a fine ground-detail carpet so nothing reads as bare.
    this.placeVillage(map);
    this.placeFarm(map);
    this.placeGrove(map);
    this.placeMeadow(map);
    this.placeCommons(map);    // the fungal bonfire gathering spot (a clearing)
    this.scatterDetail(map);   // dense clustered ground cover everywhere the player walks (kept well inside the ring)

    // LIFE — villagers placed where their work is (keeper at the plaza, fisher at the pond,
    // forager at the grove edge), never floating at random.
    const npc = (sheet: string, tx: number, ty: number, name: string) => {
      map.addProp({ sheet, fw: 64, fh: 64, col: 0, row: 0, ay: 0.66, x: tx * T, y: ty * T, solidR: 6 });
      this.labels.push({ x: tx * T, y: ty * T - 30, text: name });
    };
    npc("farmer", 20, 19, "Mycel");    // keeper, in the plaza
    npc("fisher", 27, 33, "Spora");    // fisher, out on the fishing pier
    npc("farmer", 41, 29, "Bramble");  // forager, at the grove edge
  }

  // ---------- The Dunes (desert oasis biome ring) ----------
  /** A warm sand ring around a bright OASIS: adobe caravan hamlet, palm/acacia halo, a nomad
   *  campfire, sparse dry scatter, camels — a rocky MESA + cave come in Stages 2-3.
   *  TMW Tulimshar reference (sand meets sea, oasis with a green halo, sandstone town). */
  private buildDunes(map: TileMap) {
    // STRUCTURE → PATHS → FILL per docs/cirql/CIRQL-Placement-Rules.md.
    // ANCHOR 1 — the OASIS (procedural blue water inside the ring; paint FIRST so nothing spawns in it)
    map.solidTerrain.add("water");
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++)
      if (map.get(tx, ty) === "grass" && this.oasisField(tx + 0.5, ty + 0.5) > 0) { map.set(tx, ty, "water"); map.setSolid(tx, ty, true); }
    this.placeOasisFlora(map);
    this.labels.push({ x: OASIS.cx * T, y: (OASIS.cy + OASIS.ry + 1.9) * T, text: "Sunmere Oasis" });

    // ANCHOR 2 — the adobe caravan hamlet + paved well plaza; ANCHOR 3 — the nomad campfire;
    // ANCHOR 4 — the raised sandstone MESA (NE) with a lookout on top + a cave at its foot.
    this.placeHamlet(map);
    this.placeDuneCamp(map);
    this.placeMesa(map);
    // FILL — sparse dry scatter (clustered by threes) + a fine dry ground carpet, kept sparse
    // (desert = sparse-but-still-detailed) and well clear of the oasis.
    this.placeDuneScatter(map);
    this.scatterDuneDetail(map);

    // LIFE — camels grazing in the open by the lagoon; scarabs on the sand; the oasis full of life.
    // camel.png frames are 48×32 (NOT 48×48 — drawing 48 tall grabbed the top of the camel below).
    // r0 c0 = a standing side camel; r8 c1 = the white colour variant → two distinct camels, grazing still.
    this.addCritter(map, "camel", 48, 32, 0, 0, DCAMEL[0][0], DCAMEL[0][1], { solidR: 9, wr: 0, bob: 0 });   // brown, standing
    this.addCritter(map, "camel", 48, 32, 1, 8, DCAMEL[1][0], DCAMEL[1][1], { solidR: 9, wr: 0, bob: 0 });   // white camel
    for (const [tx, ty] of [[26, 38], [40, 30], [18, 24]] as [number, number][])
      if (this.dCanPlace(map, tx, ty)) this.addCritter(map, "scarab", 16, 16, 0, 0, tx, ty, { wr: 1.2, sp: 3, bob: 0.3 });
    this.placeOasisLife(map);
    // d_npc is a 32×32 character sheet: rows are DIRECTIONAL WALK SETS (down-row R = walk-toward-you,
    // R+2 = walk-away), 6 frames each. addNpc draws ONE 32×32 frame (NOT a 64×64 block — that grabbed
    // a 2×2 of four walk-frames, the "4 women" bug) and makes the NPC WANDER + face you. Down-rows
    // 0/3/6 give each a distinct character.
    this.addNpc(map, DNPC.sahra[0], DNPC.sahra[1], "Sahra", 0);              // well-keeper, near the plaza well
    this.addNpc(map, DNPC.kesh[0], DNPC.kesh[1], "Kesh", 3);                 // camel-herder, WEST of the lagoon
    this.addNpc(map, DNPC.tamm[0], DNPC.tamm[1], "Tamm", 6);                 // wayfarer, by the campfire
  }

  /** Fill the oasis with LIFE: a duck paddling, a pink flamingo wading, butterflies + a bee over the
   *  palms, and a couple of extra palm clumps around the lagoon for an asymmetric, lived-in look. */
  private placeOasisLife(map: TileMap) {
    const rnd = rng(555);
    const O = OASIS;
    // TWO pink flamingos drifting on the pool (owner swapped the duck for a second flamingo)
    this.addCritter(map, "flamingo", 32, 32, 0, 6, O.cx + 1, O.cy - 1, { water: true, wr: 1.0, sp: 4, bob: 0.9 });   // nearer the centre (off the edge)
    this.addCritter(map, "flamingo", 32, 32, 0, 6, O.cx, O.cy, { water: true, wr: 0.9, sp: 3, bob: 0.8 });   // a water bird — floats in the MIDDLE of the pool (swan sheet, recoloured pink)
    // a couple of LONE butterflies (individuals, well apart — never a clump) + a single bee
    // butterfly.png is an 8×8 sheet: 2 cols = flap frames, 8 rows = colours. Draw ONE 8×8 butterfly
    // (fw:16 grabbed a 2×2 of four different-coloured ones), flapping via the 2-frame cycle.
    this.addCritter(map, "butterfly", 8, 8, 0, 0, O.cx + 9, O.cy + 2, { frames: 2, fps: 6, wr: 2, sp: 8, bob: 2 });   // one at the east palms
    this.addCritter(map, "butterfly", 8, 8, 0, 3, O.cx - 4, O.cy + 8, { frames: 2, fps: 6, wr: 2, sp: 8, bob: 2 });   // a different-coloured one, off south
    // bee.png frames are 16×16 (NOT 32×32 — drawing 32 grabbed a 2×2 of FOUR bees). One bee, wings
    // buzzing via the 4-frame row-0 cycle.
    this.addCritter(map, "bee", 16, 16, 0, 0, O.cx + 6, O.cy - 4, { frames: 4, fps: 12, wr: 1.4, sp: 7, bob: 1.2 });
    // a couple of extra palm clumps set around the lagoon (varied spots — asymmetric, not the even halo)
    const palm = (tx: number, ty: number, sc: number) => { if (this.dCanPlace(map, tx, ty, 3.5, 3) && this.oasisClear(tx, ty, 2.8)) map.addProp({ sheet: "palm1", fw: 48, fh: 64, col: 1 + Math.floor(rnd() * 2), row: 0, x: tx * T + T / 2, y: ty * T + T, scale: 0.85 + rnd() * 0.3, overhead: true, solidR: 5 }); };
    for (const [cx, cy] of [[O.cx - 8, O.cy - 4], [O.cx + 8, O.cy + 2], [O.cx + 2, O.cy - 7]] as [number, number][])
      for (let i = 0; i < 2; i++) palm(cx + Math.round((rnd() - 0.5) * 3), cy + Math.round((rnd() - 0.5) * 3), 1);
  }

  /** The oasis outline: >0 inside. Non-circular, gentle lobes (a natural pool). */
  private oasisField(tx: number, ty: number): number {
    const dx = (tx - OASIS.cx) / OASIS.rx, dy = (ty - OASIS.cy) / OASIS.ry;
    const ang = Math.atan2(ty - OASIS.cy, tx - OASIS.cx);
    const R = 1 + 0.1 * Math.sin(ang * 3 + 1.2) + 0.06 * Math.sin(ang * 2 - 0.4);
    return R - (dx * dx + dy * dy);
  }
  /** True if a tile is clear of the oasis by `margin` tiles. */
  private oasisClear(tx: number, ty: number, margin = 2.4): boolean {
    return this.oasisField(tx + 0.5, ty + 0.5) * ((OASIS.rx + OASIS.ry) / 2) < -margin;
  }
  /** Distance (tiles) to the plaza→oasis footpath polyline. */
  private dLaneDist(px: number, py: number): number {
    let best = 99;
    for (let i = 0; i < DLANE.length - 1; i++) {
      const [ax, ay] = DLANE[i], [bx, by] = DLANE[i + 1];
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(px - (ax + dx * t), py - (ay + dy * t)));
    }
    return best;
  }
  /** Distance (tiles) to the nearest PATH segment across the whole DPATHS network (the walking guides). */
  private dPathDist(px: number, py: number): number {
    let best = 99;
    for (const path of DPATHS) for (let i = 0; i < path.length - 1; i++) {
      const [ax, ay] = path[i], [bx, by] = path[i + 1];
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(px - (ax + dx * t), py - (ay + dy * t)));
    }
    return best;
  }
  private inHamlet(tx: number, ty: number): boolean { return tx >= HAMLET.x - 5 && tx <= HAMLET.x + 8 && ty >= HAMLET.y - 4 && ty <= HAMLET.y + 8; }
  private inMesa(tx: number, ty: number): boolean { return tx >= MESA.x0 - 1 && tx <= MESA.x1 + 1 && ty >= MESA.y0 - 1 && ty <= MESA.y1 + MESA.faceH + 1; }
  /** Near a reserved spot (an NPC / camel / flamingo) — kept clear of scatter so they read. */
  private nearReserved(tx: number, ty: number, r = 2.4): boolean {
    for (const [rx, ry] of DRESERVED) if (Math.hypot(tx - rx, ty - ry) < r) return true;
    return false;
  }
  /** Desert placement gate: sand, WELL inside the edgepoint, clear of oasis/hamlet/mesa/camp/reserved, off the track. */
  private dCanPlace(map: TileMap, tx: number, ty: number, edge = 4, oM = 2.8): boolean {
    return map.get(tx, ty) === "grass" && this.insideEdge(tx, ty, edge) && this.oasisClear(tx, ty, oM)
      && !this.inHamlet(tx, ty) && !this.inMesa(tx, ty) && !this.nearReserved(tx, ty)
      && this.dPathDist(tx + 0.5, ty + 0.5) > 1.7
      && Math.hypot(tx - DCAMP.x, ty - DCAMP.y) > 3;
  }
  private dCluster(map: TileMap, rnd: () => number, cx: number, cy: number, spread: number, n: number, place: (tx: number, ty: number) => void) {
    for (let i = 0; i < n; i++) {
      const tx = cx + Math.round((rnd() - 0.5) * spread * 2), ty = cy + Math.round((rnd() - 0.5) * spread * 2);
      if (this.dCanPlace(map, tx, ty)) place(tx, ty);
    }
  }

  /** ANCHOR 1 dressing — a lush green HALO ringing the oasis, pulled BACK from the water so no
   *  canopy overhangs it: only reeds/ferns hug the waterline; bushes sit ≥2.2 tiles back, and the
   *  big acacia trees ≥3.4 tiles back (their wide canopies can't reach the water). Rules §5f/§6c. */
  private placeOasisFlora(map: TileMap) {
    const rnd = rng(707);
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      if (map.get(tx, ty) !== "grass" || !this.insideEdge(tx, ty, 3.5) || this.nearReserved(tx, ty)) continue;
      if (this.dPathDist(tx + 0.5, ty + 0.5) < 1.6) continue;                          // keep flora OFF the sprite path (no palm growing in the road)
      const d = -this.oasisField(tx + 0.5, ty + 0.5) * ((OASIS.rx + OASIS.ry) / 2);   // ~tiles OUTSIDE the water
      if (d < 0.4 || d > 6.5) continue;
      const r = rnd();
      if (d < 2.2) {                                                                  // WATER'S EDGE — reeds/ferns only (intended at the water)
        if (r < 0.3) map.addProp({ sheet: "d_fern", fw: 16, fh: 16, col: 0, row: 0, x: tx * T + rnd() * T, y: ty * T + T });
        continue;
      }
      const dens = 1 - smoothstep(2.2, 6.5, d);                                       // the green halo, thinning outward
      if (d >= 2.9 && r < dens * 0.24) {                                              // PALMS (signature oasis tree) — varied size
        const sc = 0.85 + rnd() * 0.35;
        // palm1 = 48×64 (col0 stump, col1-2 full palms); palm2 = 32×48 (col0 stump, col1-2 full palms).
        // Use cols 1-2 only (a whole palm WITH trunk) — never col0 (a trunkless stump), and the right fw
        // (palm2 was drawn 48 wide → grabbed 1.5 frames = HALF trees).
        if (rnd() < 0.7) map.addProp({ sheet: "palm1", fw: 48, fh: 64, col: 1 + Math.floor(rnd() * 2), row: 0, x: tx * T + T / 2, y: ty * T + T, scale: sc, overhead: true, solidR: 5 * sc });
        else map.addProp({ sheet: "palm2", fw: 32, fh: 48, col: 1 + Math.floor(rnd() * 2), row: 0, x: tx * T + T / 2, y: ty * T + T, scale: sc, overhead: true, solidR: 5 * sc });
      } else if (r < dens * 0.5) {                                                    // green bushes (secondary)
        map.addProp({ sheet: "outdoor_decor", fw: 16, fh: 16, col: DBUSH[0], row: DBUSH[1], x: tx * T + rnd() * T, y: ty * T + T, solidR: 3 });
      } else if (r < dens * 0.64) {                                                   // some ferns in the halo too
        map.addProp({ sheet: "d_fern", fw: 16, fh: 16, col: 0, row: 0, x: tx * T + rnd() * T, y: ty * T + T });
      }
    }
  }

  /** ANCHOR 2 — Sandreach: an adobe caravan hamlet clustered around a paved well plaza. */
  private placeHamlet(map: TileMap) {
    const rnd = rng(808);
    // paved plaza (worn sandstone) — a small square; the well at its heart
    for (let ty = DPLAZA.y - 1; ty <= DPLAZA.y + 1; ty++) for (let tx = DPLAZA.x - 1; tx <= DPLAZA.x + 2; tx++)
      if (this.insideEdge(tx, ty, 3)) map.set(tx, ty, "path");
    map.addProp({ sheet: "well", fw: 32, fh: 48, col: 0, row: 0, x: DPLAZA.x * T + T / 2, y: DPLAZA.y * T + T, solidR: 9 });
    const house = (sheet: string, w: number, h: number, tx: number, ty: number, sc = 1) =>
      map.addProp({ sheet, fw: w, fh: h, col: 0, row: 0, x: tx * T + T / 2, y: ty * T + T, scale: sc, solidR: w * sc * 0.3 });
    // clustered around the plaza, staggered, varied sizes (a big caravanserai + smaller huts)
    house("d_house2", 96, 128, HAMLET.x - 2, HAMLET.y - 3, 0.8);
    house("d_house1", 80, 80, HAMLET.x + 5, HAMLET.y - 2, 1);
    house("d_house3", 128, 112, HAMLET.x - 3, HAMLET.y + 5, 0.72);
    house("d_house1", 80, 80, HAMLET.x + 6, HAMLET.y + 4, 0.9);
    map.addProp({ sheet: "benches", fw: 32, fh: 32, col: 0, row: 0, x: (DPLAZA.x - 2) * T, y: (DPLAZA.y + 2) * T });
    map.addProp({ sheet: "d_bones", fw: 32, fh: 32, col: 0, row: 0, x: (HAMLET.x + 8) * T, y: (HAMLET.y + 2) * T });   // a sun-bleached skull, storytelling clutter
    this.labels.push({ x: HAMLET.x * T, y: (HAMLET.y - 6) * T, text: "Sandreach" });
  }

  /** ANCHOR 3 — the nomad campfire commons (an animated fire + a ring of rock seats). */
  private placeDuneCamp(map: TileMap) {
    const cx = DCAMP.x, cy = DCAMP.y;
    this.addCritter(map, "d_fire", 16, 16, 0, 0, cx, cy, { frames: 6, fps: 8, bob: 0, wr: 0 });   // flickering campfire (6-frame anim)
    map.setSolid(cx, cy, true);
    // stone seats on a WIDE south/side arc (open toward the viewer) — none behind or on the fire, so
    // the flames stay readable and the rocks don't read as "people in the firepit". Tamm sits at the
    // east seat (an intended occupant). See rulebook §6b/§6c.
    for (const [dx, dy] of [[-3, 0], [-2, 2], [2, 2]] as [number, number][]) {
      const i = 6 + Math.floor(hash2(cx + dx, cy + dy) * 4);   // 6-9 = the small 32×32 whole rocks
      this.dSpProp(map, `sp_desert_rock_${i}`, SP_ROCK[i], cx + dx, cy + dy, 0.7, false, 4);
    }
    this.labels.push({ x: cx * T + T / 2, y: (cy - 3) * T, text: "The Ember Camp" });
  }

  /** Place a sanctumpixel desert STANDALONE prop (each is a whole-object PNG → always safe to
   *  scatter; no risk of grabbing a wall/edge/partial/water cell). See [[catalog]]. */
  private dSpProp(map: TileMap, name: string, dim: [number, number], tx: number, ty: number, sc: number, overhead = false, solidR = 0) {
    map.addProp({ sheet: name, fw: dim[0], fh: dim[1], col: 0, row: 0, x: tx * T + T / 2 + (this.rndDetail() - 0.5) * 6, y: ty * T + T, scale: sc, solidR, overhead });
  }
  private _rd = rng(3131);
  private rndDetail() { return this._rd(); }

  /** True if (wx,wy) would be hidden BEHIND a tall sprite — north of its feet, within its body
   *  silhouette (width × HEIGHT), where the feet-Y depth-sort draws the tall sprite in front. A
   *  thing has real height even in 2D, so this covers OVERHEAD props (trees/palms/cacti) AND tall
   *  buildings (their drawn height ≥ ~2.5 tiles). Keeps NPCs/objects out of the occlusion zone —
   *  the "consider height/depth/width; don't place behind a 3D object" rule (rulebook §6c). */
  private occludedByTall(map: TileMap, wx: number, wy: number): boolean {
    for (const p of map.props) {
      const sc = (p as any).scale ?? 1, h = p.fh * sc;
      if (!p.overhead && h < 40) continue;                           // only genuinely tall things occlude
      const halfW = p.fw * sc * 0.42;
      if (wy < p.y && wy > p.y - h && Math.abs(wx - p.x) < halfW) return true;
    }
    return false;
  }

  /** FILL — sparse desert flora/props in clusters of threes, thinning, clear of the oasis.
   *  Only whole standalone sanctumpixel props (cacti / joshua trees / rocks) — never a merged
   *  sheet's edge cell, so no stray partials or "buttons". */
  private placeDuneScatter(map: TileMap) {
    const rnd = rng(909);
    const pick = (max: number) => 1 + Math.floor(rnd() * max);
    const clumps: [number, number, "cactus" | "joshua" | "rock"][] = [
      [40, 36, "cactus"], [16, 30, "cactus"], [45, 40, "joshua"], [14, 40, "rock"],
      [38, 14, "cactus"], [51, 33, "rock"], [22, 44, "joshua"], [34, 46, "cactus"], [30, 12, "rock"],
    ];
    for (const [cx, cy, kind] of clumps) {
      if (kind === "cactus") this.dCluster(map, rnd, cx, cy, 3, 3, (tx, ty) => { const i = pick(7); this.dSpProp(map, `sp_desert_cactus_${i}`, SP_CACTUS[i], tx, ty, 0.85 + rnd() * 0.3, true, 5); });
      else if (kind === "joshua") this.dCluster(map, rnd, cx, cy, 3, 2, (tx, ty) => { const i = pick(4); this.dSpProp(map, `sp_desert_joshua_${i}`, SP_JOSHUA[i], tx, ty, 0.8 + rnd() * 0.25, true, 6); });
      else this.dCluster(map, rnd, cx, cy, 2, 3, (tx, ty) => { const i = pick(11); this.dSpProp(map, `sp_desert_rock_${i}`, SP_ROCK[i], tx, ty, 0.6 + rnd() * 0.4, false, 3); });
    }
    // a couple of sun-bleached skulls (a whole CF prop) as storytelling clutter
    for (const [tx, ty] of [[43, 44], [18, 43]] as [number, number][]) if (this.dCanPlace(map, tx, ty)) map.addProp({ sheet: "d_bones", fw: 32, fh: 32, col: 0, row: 0, x: tx * T + T / 2, y: ty * T + T });
  }

  /** FILL — a real dry ground CARPET of visible detail sprites (grass tufts, pebbles, dry scrub,
   *  bones), clustered in waves and THICKER along the trail (breadcrumb) so the floor never reads
   *  as bare. Whole standalone sprites only. */
  private scatterDuneDetail(map: TileMap) {
    const rnd = rng(1010);
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      if (!this.dCanPlace(map, tx, ty, 3.2, 2.6)) continue;
      const clump = Math.sin(tx * 0.4 + 0.5) * Math.sin(ty * 0.38 - 0.6) * Math.sin((tx + ty) * 0.22);
      const nearPath = this.dPathDist(tx + 0.5, ty + 0.5) < 3.4;                       // detail thickens along the walked trail
      const p = 0.16 + Math.max(0, clump) * 0.5 + (nearPath ? 0.22 : 0);               // a genuine carpet, not a sprinkle
      if (rnd() > p) continue;
      if (this.nearBigProp(map, tx * T + T / 2, ty * T + T, 11)) continue;
      if (this.occludedByTall(map, tx * T + T / 2, ty * T + T)) continue;              // don't hide detail behind tall props
      const r = rnd();
      if (r < 0.46) this.dSpProp(map, `sp_desert_grass_${1 + Math.floor(rnd() * 8)}`, [32, 32], tx, ty, 0.65 + rnd() * 0.3);   // dry grass tuft
      else if (r < 0.78) { const i = 6 + Math.floor(rnd() * 4); this.dSpProp(map, `sp_desert_rock_${i}`, SP_ROCK[i], tx, ty, 0.4 + rnd() * 0.25); }   // pebble-rock (6-9 = 32×32)
      else if (r < 0.92) map.addProp({ sheet: "dead_bush", fw: 16, fh: 16, col: Math.floor(rnd() * 2), row: 0, x: tx * T + rnd() * T, y: ty * T + T });   // dry scrub (whole, 2 frames)
      else map.addProp({ sheet: "d_fern", fw: 16, fh: 16, col: 0, row: 0, x: tx * T + rnd() * T, y: ty * T + T });   // a dry fern sprig
    }
  }

  /** Recolour the white swan sheet PINK → an oasis flamingo, registered under "flamingo". */
  private buildFlamingo() {
    const swan = this.atlas.get("swan"); if (!swan.img) return;
    const w = swan.w, h = swan.h, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cx = cv.getContext("2d", { willReadFrequently: true })!; cx.imageSmoothingEnabled = false;
    cx.drawImage(swan.img as any, 0, 0);
    const id = cx.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      const dark = lum < 90;                                          // keep the dark beak/eye/legs dark
      d[i] = dark ? d[i] : Math.min(255, lum * 0.55 + 155);          // strong pink
      d[i + 1] = dark ? d[i + 1] : Math.max(0, lum * 0.5 + 30);
      d[i + 2] = dark ? d[i + 2] : Math.max(0, lum * 0.55 + 75);
    }
    cx.putImageData(id, 0, 0);
    if (!this.atlas.has("flamingo")) this.atlas.add("flamingo", "");
    (this.atlas.get("flamingo") as unknown as { img: HTMLCanvasElement }).img = cv;
  }

  /** TRUE sprite path (owner: no procedural/hybrid paint). The pack's cobble_blob is a 3×5 autotile
   *  blob (rounded corners / straight edges / inner corners) with a baked earthy shoulder — perfect
   *  edges, but blue-grey stone. Recolour it through a warm ramp → a packed SANDSTONE path that reads
   *  as a worn desert road, and register as "sandpath". drawSandPaths autotiles DPATHS with it. */
  private buildSandPath() {
    const src = this.atlas.get("cobble_blob"); if (!src.img) return;
    const w = src.w, h = src.h, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cx = cv.getContext("2d", { willReadFrequently: true })!; cx.imageSmoothingEnabled = false;
    cx.drawImage(src.img as any, 0, 0);
    const id = cx.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;                  // FLATTEN the cobble to a smooth packed-sand path (kill the grout
      // lines that read as "defined cobble") in a tight range just BELOW the light floor tone (~[215,167,106])
      // so it's a subtle worn trail of the same sand, blending into the dominant ground — no paved look.
      d[i] = clamp255(lum * 0.16 + 170); d[i + 1] = clamp255(lum * 0.15 + 128); d[i + 2] = clamp255(lum * 0.12 + 76);
    }
    cx.putImageData(id, 0, 0);
    if (!this.atlas.has("sandpath")) this.atlas.add("sandpath", "");
    (this.atlas.get("sandpath") as unknown as { img: HTMLCanvasElement }).img = cv;
  }

  /** True if tile (tx,ty) lies within a DPATHS lane, at that path's half-width (hierarchy: wide
   *  trade road, narrow footpath spurs). Excludes water so the path stops at the oasis edge. */
  private isSandPath(tx: number, ty: number): boolean {
    if (this.map.get(tx, ty) === "water") return false;
    const px = tx + 0.5, py = ty + 0.5;
    for (let p = 0; p < DPATHS.length; p++) {
      const path = DPATHS[p], hw = DPATH_HALFW[p] ?? 0.72;
      for (let i = 0; i < path.length - 1; i++) {
        const [ax, ay] = path[i], [bx, by] = path[i + 1];
        const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
        let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
        if (Math.hypot(px - (ax + dx * t), py - (ay + dy * t)) <= hw) return true;
      }
    }
    return false;
  }

  /** LAYER 3 of the ring pipeline — the PATHS. Autotile the DPATHS network with the sandstone sprite
   *  (blobTile + BLOB_3x5) on top of the finished ground, clipped to the shore. A true sprite path:
   *  rounded ends, clean edges, inner corners where lanes meet — never a painted colour blend. */
  private drawSandPaths(b: CanvasRenderingContext2D, cam: Camera) {
    if (!this.atlas.has("sandpath")) return;
    const sh = this.atlas.get("sandpath"); if (!sh.img) return;
    b.imageSmoothingEnabled = false;
    const t = T, s = cam.scale, dsz = Math.ceil(t * s) + 1;
    const [wx0, wy0] = this.ren.s2w(cam, 0, 0), [wx1, wy1] = this.ren.s2w(cam, cam.vw, cam.vh);
    const tx0 = Math.floor(wx0 / t) - 1, ty0 = Math.floor(wy0 / t) - 1;
    const tx1 = Math.ceil(wx1 / t) + 1, ty1 = Math.ceil(wy1 / t) + 1;
    const P = (x: number, y: number) => this.isSandPath(x, y);
    b.save(); this.clipToShore(b);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (!P(tx, ty)) continue;
      const same = {
        n: P(tx, ty - 1), s: P(tx, ty + 1), w: P(tx - 1, ty), e: P(tx + 1, ty),
        ne: P(tx + 1, ty - 1), nw: P(tx - 1, ty - 1), se: P(tx + 1, ty + 1), sw: P(tx - 1, ty + 1),
      };
      const [c, r] = blobTile(BLOB_3x5, same);
      const [sx, sy] = this.ren.w2s(cam, tx * t, ty * t);
      sh.cell(b, 16, c, r, Math.round(sx), Math.round(sy), dsz, dsz);
    }
    b.restore();
  }

  /** The SPRITE FLOOR (owner rule: ALWAYS use the asset sprites, laid first, covering the whole land —
   *  only water is procedural). Slice the REAL sanctumpixel desert ground tileset (sp_desert_ground,
   *  already harmonised to our warm palette): its solid sand fill + real wind-ripple/patch decals
   *  composited onto copies → a base + 3 varied floor tiles. The desert "grass" terrain uses these as
   *  a varied autotiled sand floor, so the ground is genuine pack tiles, not a generated/painted one. */
  private buildSandTexture() {
    const src = this.atlas.get("sp_desert_ground"); if (!src.img) return;
    const S = 16, im = src.img as CanvasImageSource;
    const cell = (fcol: number, frow: number, dcol?: number, drow?: number): HTMLCanvasElement => {
      const cv = document.createElement("canvas"); cv.width = S; cv.height = S;
      const g = cv.getContext("2d")!; g.imageSmoothingEnabled = false;
      g.drawImage(im, fcol * S, frow * S, S, S, 0, 0, S, S);                              // solid sand fill (real tile)
      if (dcol !== undefined) g.drawImage(im, dcol * S, drow! * S, S, S, 0, 0, S, S);     // + a real ripple/patch decal
      return cv;
    };
    const reg = (name: string, cv: HTMLCanvasElement) => { if (!this.atlas.has(name)) this.atlas.add(name, ""); (this.atlas.get(name) as unknown as { img: HTMLCanvasElement }).img = cv; };
    reg("grass", cell(11, 13));           // DOMINANT floor = the LIGHTER sand tone (matches the path's surface — owner)
    reg("sand_v1", cell(11, 13, 3, 5));   // light sand + a real wind-ripple decal
    reg("sand_v3", cell(11, 13, 6, 7));   // light sand + a different real ripple
    reg("sanddk", cell(11, 1));           // the DARKER sand tone — now the REGION patches (damp/shaded ground)
    reg("sanddk_rip", cell(11, 1, 3, 5)); // dark sand + a ripple
  }

  /** REGION material patches (owner rule + SLYNYRD "regions with intent, never one tile"): large soft
   *  areas of the LIGHTER sand tone (sun-bleached/dry ground) chosen by a low-frequency noise, so the
   *  floor varies in patches — never a per-tile checkerboard. Returns a light tile inside a patch, else
   *  undefined (→ the dark-sand base + ripple variants). Uses the asset's own two sand tones. */
  private sandRegion(tx: number, ty: number): string | undefined {
    if (this.meadow(tx * 0.42 + 30, ty * 0.39 - 10) > 0.42) return hash2(tx, ty) < 0.82 ? "sanddk" : "sanddk_rip";
    return undefined;
  }

  /** Juice the oasis surface (bright water): sun sparkles + concentric ripple rings. */
  private drawOasisJuice(c: CanvasRenderingContext2D, cam: Camera) {
    if (this.reduce) return;
    const inO = (wx: number, wy: number) => this.oasisField(wx / T, wy / T) > 0.25;
    const cx = OASIS.cx * T, cy = OASIS.cy * T, RX = OASIS.rx * T, RY = OASIS.ry * T;
    c.save(); c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 14; i++) {
      const wx = cx + Math.sin(i * 2.1) * RX * 0.72, wy = cy + Math.cos(i * 1.3) * RY * 0.72;
      if (!inO(wx, wy)) continue;
      const tw = 0.5 + 0.5 * Math.sin(this.tsec * 2 + i * 1.7);
      const [sx, sy] = this.ren.w2s(cam, wx, wy), s = Math.max(1, cam.scale * 0.6);
      c.globalAlpha = tw * 0.9; c.fillStyle = "#ecffff"; c.fillRect(sx, sy, s, s);
    }
    const rings: [number, number][] = [[8, -6], [-10, 4], [2, 10]];
    for (let i = 0; i < rings.length; i++) {
      const ph = (this.tsec * 0.32 + i * 0.4) % 1, wx = cx + rings[i][0], wy = cy + rings[i][1];
      if (!inO(wx, wy)) continue;
      const [sx, sy] = this.ren.w2s(cam, wx, wy);
      c.globalAlpha = (1 - ph) * 0.24; c.strokeStyle = "#cfefff"; c.lineWidth = Math.max(1, cam.scale * 0.5);
      c.beginPath(); c.arc(sx, sy, ph * 11 * cam.scale, 0, Math.PI * 2); c.stroke();
    }
    c.restore(); c.globalAlpha = 1;
  }

  // ---- the MESA (a raised sandstone plateau; TMW "building on a hill" landform) ----
  // Built from the sanctumpixel desert CLIFF tileset (real sandstone rock) — a rectangular top
  // ringed by rock edge tiles, a 3-row strata FACE dropping south, boulders breaking the lines.
  /** True if a tile is on the walkable plateau TOP. */
  private onMesaTop(tx: number, ty: number): boolean { return tx >= MESA.x0 && tx <= MESA.x1 && ty >= MESA.y0 && ty <= MESA.y1; }
  /** A south-facing rock FACE tile (the visible cliff wall) below the plateau's south edge. */
  private onMesaFace(tx: number, ty: number): boolean { return tx >= MESA.x0 && tx <= MESA.x1 && ty > MESA.y1 && ty <= MESA.y1 + MESA.faceH; }
  /** A walkable RAMP corridor down the south face. */
  private onMesaRamp(tx: number, ty: number): boolean { return this.onMesaFace(tx, ty) && MESA.ramps.includes(tx); }

  /** Build the mesa: collision (solid rock; only the top + south ramps walk), the sanctumpixel
   *  sandstone cliff sprites (rim + strata face + boulders), the lookout on top, and the cave mouth. */
  private placeMesa(map: TileMap) {
    const { x0, y0, x1, y1, faceH, ramps } = MESA;
    // --- collision ---
    for (let ty = y1 + 1; ty <= y1 + faceH; ty++) for (let tx = x0; tx <= x1; tx++) if (!ramps.includes(tx)) map.setSolid(tx, ty, true);   // south face
    for (let tx = x0 - 1; tx <= x1 + 1; tx++) map.setSolid(tx, y0 - 1, true);                                                              // north lip
    for (let ty = y0; ty <= y1; ty++) { map.setSolid(x0 - 1, ty, true); map.setSolid(x1 + 1, ty, true); }                                  // W/E lips (can't step off)

    // --- the sandstone cliff (sanctumpixel wall_tile overlay sprites) ---
    const W = "sp_desert_wall";
    // south FACE: a 3-row strata wall (ramp columns stay open = a sandy slope up)
    for (let tx = x0; tx <= x1; tx++) {
      if (ramps.includes(tx)) continue;
      const fc = tx === x0 ? 5 : tx === x1 ? 9 : 6 + ((tx - x0 - 1) % 3);   // left edge / fill(6-8) / right edge
      map.setOverlay(tx, y1 + 1, W, fc, 0);   // lip / top of wall
      map.setOverlay(tx, y1 + 2, W, fc, 1);   // mid strata
      map.setOverlay(tx, y1 + 3, W, fc, 2);   // base
    }
    // the cave mouth (needed before the rim so we can keep it clear) — centre of the south face
    this.caveMouth = { x: Math.round((x0 + x1) / 2), y: y1 + 2 };
    map.setSolid(this.caveMouth.x, this.caveMouth.y, false);
    map.setSolid(this.caveMouth.x, this.caveMouth.y + 1, false);

    // --- a chunky BOULDER rim (sanctumpixel rocks) framing the raised top on N/E/W + base rubble.
    // Boulders (not fiddly autotile edges) give an organic rocky drop-off that clearly reads. ---
    const rnd = rng(4747);
    const rock = (tx: number, ty: number, sc = 1) => { const i = 1 + Math.floor(rnd() * 11); const [w, h] = SP_ROCK[i]; map.addProp({ sheet: `sp_desert_rock_${i}`, fw: w, fh: h, col: 0, row: 0, x: tx * T + T / 2 + (rnd() - 0.5) * 6, y: ty * T + T, scale: sc, solidR: 0, overhead: true }); };
    for (let tx = x0; tx <= x1; tx++) rock(tx, y0 - 1, 0.7 + rnd() * 0.4);                                  // N rim (boulders along the top back edge)
    for (let ty = y0; ty <= y1; ty++) { rock(x0 - 1, ty, 0.65 + rnd() * 0.35); rock(x1 + 1, ty, 0.65 + rnd() * 0.35); }   // W/E rims
    for (let tx = x0 - 1; tx <= x1 + 1; tx += 2) if (!ramps.includes(tx) && tx !== this.caveMouth.x) rock(tx, y1 + faceH + 1, 0.6 + rnd() * 0.3);   // base rubble

    // --- the lookout building crowning the plateau + the cave door ---
    const bx = Math.round((x0 + x1) / 2), by = y0 + 3;
    map.addProp({ sheet: "d_house3", fw: 128, fh: 112, col: 0, row: 0, x: bx * T + T / 2, y: by * T + T, scale: 0.8, solidR: 15 });
    this.labels.push({ x: bx * T + T / 2, y: (y0 - 1.8) * T, text: "The Sun Lookout" });
    map.addProp({ sheet: "cave_door", fw: 32, fh: 48, col: 0, row: 0, x: this.caveMouth.x * T + T / 2, y: this.caveMouth.y * T + T, solidR: 0 });
    this.labels.push({ x: this.caveMouth.x * T + T / 2, y: (this.caveMouth.y - 2.6) * T, text: "Cave" });
  }

  /** Universal grounding: a soft drop-shadow under the player + every solid prop — the single
   *  biggest "fake-3D" win (grounds objects, adds depth). Drawn on the ground, under the sprites. */
  // NOTE: drawShadows is DISABLED at every call site (owner): the sprites already carry their own
  // baked shadows, so this separate oval drop-shadow only made everything look like it was levitating.
  private drawShadows(c: CanvasRenderingContext2D, cam: Camera, directional = true) {
    if (!this.sunShadows) directional = false;   // contact-only until sun-shadows are re-enabled per ring
    c.save();
    const sun = this.sunDir, ang = Math.atan2(sun.y, sun.x);
    // draw a ground shadow for one object: a round contact blob for short/round things (and in
    // the cave), or a DIRECTIONAL shadow raking away from the sun with length ∝ the object's
    // height — the first slice of the "Living Light & Height" depth engine. See the depth memory.
    const drop = (wx: number, wy: number, baseW: number, height: number) => {
      const [sx, sy] = this.ren.w2s(cam, wx, wy), s = cam.scale;
      if (sx < -80 || sy < -80 || sx > cam.vw + 80 || sy > cam.vh + 80) return;
      if (!directional || height < 7) {
        c.fillStyle = "rgba(20,18,28,0.22)";
        c.beginPath(); c.ellipse(sx, sy - s, baseW * s, baseW * 0.42 * s, 0, 0, Math.PI * 2); c.fill();
        return;
      }
      const len = (baseW * 1.1 + height * this.sunLen);                  // taller → longer
      c.save();
      c.translate(sx + sun.x * len * 0.5 * s, sy + sun.y * len * 0.5 * s - s);
      c.rotate(ang);
      const g = c.createLinearGradient(-len * 0.5 * s, 0, len * 0.5 * s, 0);
      g.addColorStop(0, "rgba(18,16,26,0.3)"); g.addColorStop(1, "rgba(18,16,26,0)");   // fades to the tip
      c.fillStyle = g;
      c.beginPath(); c.ellipse(0, 0, len * 0.5 * s, baseW * 0.85 * s, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    };
    for (const p of this.map.props) {
      if (!p.solidR || p.solidR < 4) continue;
      const sc = (p as any).scale ?? 1;
      const baseW = Math.min(p.fw * sc * 0.28, 22), height = (p.overhead ? p.fh * sc : p.fh * sc * 0.5);
      drop(p.x, p.y, baseW, height);
    }
    drop(this.player.x, this.player.y, 6, 15);
    c.restore();
  }

  // ---- the underground CAVE level (a sub-map through the mesa's cave mouth) ----
  /** Build the cave room once: a rounded rock chamber (floor walkable, rock solid), an up-ladder
   *  exit, support pillars, and a glowing focal gem. Returns the entrance spawn (world px). */
  private buildCave(): { x: number; y: number } {
    const CW = 23, CH = 16;
    const map = new TileMap(CW, CH, T, "rock");
    map.solidTerrain.add("rock");
    const cx = CW / 2, cy = CH / 2;
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) {
      const dx = (tx + 0.5 - cx) / (cx - 2.2), dy = (ty + 0.5 - cy) / (cy - 2);
      if (dx * dx + dy * dy < 1) { map.set(tx, ty, "floor"); map.setSolid(tx, ty, false); }   // rounded chamber
    }
    const exitX = Math.round(cx), exitY = CH - 3;
    map.set(exitX, exitY, "floor"); map.setSolid(exitX, exitY, false);
    map.addProp({ sheet: "cave_ladder", fw: 16, fh: 16, col: 0, row: 0, x: exitX * T + T / 2, y: exitY * T + T });
    this.caveExit = { x: exitX, y: exitY };
    // support pillars flanking the chamber
    map.addProp({ sheet: "cave_support", fw: 80, fh: 96, col: 0, row: 0, x: 4 * T, y: (cy + 1) * T, scale: 0.5, solidR: 7 });
    map.addProp({ sheet: "cave_support", fw: 80, fh: 96, col: 0, row: 0, x: (CW - 4) * T, y: (cy + 1) * T, scale: 0.5, solidR: 7 });
    // the glowing gem — the cave's focal (a shard of light, drawn procedurally)
    this.caveGem = { x: exitX * T + T / 2, y: 3.5 * T };
    this.labels.push({ x: this.caveGem.x, y: this.caveGem.y - 22, text: "A Glimmer", cave: true });
    this.labels.push({ x: this.caveExit.x * T + T / 2, y: (this.caveExit.y - 1.4) * T, text: "↑ Climb out", cave: true });
    this.caveMap = map;
    return { x: exitX * T + T / 2, y: (exitY - 1) * T };   // spawn just above the ladder
  }

  /** Step from the surface down into the cave (through the mesa's mouth). */
  private enterCave() {
    const spawn = this.caveMap ? { x: this.caveExit!.x * T + T / 2, y: (this.caveExit!.y - 1) * T } : this.buildCave();
    this.caveReturn = { x: this.caveMouth!.x * T + T / 2, y: (this.caveMouth!.y + 3) * T };   // drop back below the mouth (clear of it)
    this.surfaceMap = this.map; this.map = this.caveMap!;
    this.player.x = spawn.x; this.player.y = spawn.y;
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    this.inCave = true; this.fadeT = 1; this.portalArmed = false;
    if (this.nearInter) { this.nearInter = null; this.onProximity?.(null); }
  }
  /** Climb the ladder back up to the surface. */
  private exitCave() {
    this.map = this.surfaceMap!; this.inCave = false; this.fadeT = 1; this.portalArmed = false;
    this.player.x = this.caveReturn.x; this.player.y = this.caveReturn.y;
    this.cam.x = this.player.x; this.cam.y = this.player.y;
  }

  /** Render the underground chamber: dark cave floor + rock walls, props, and a lantern-lit
   *  darkness so you explore by the light you carry (on-theme: you're a light-bearer). */
  private renderCave() {
    const b = this.b, bw = b.canvas.width, bh = b.canvas.height, cam = this.cam;
    b.imageSmoothingEnabled = false;
    b.fillStyle = "#080610"; b.fillRect(0, 0, bw, bh);
    cam.vw = bw; cam.vh = bh; cam.scale = this.zoom;
    const floor = this.atlas.get("cave_floor_mid"), d = Math.ceil(T * cam.scale);
    const near = (tx: number, ty: number) => this.map.get(tx, ty) === "floor"
      || this.map.get(tx - 1, ty) === "floor" || this.map.get(tx + 1, ty) === "floor"
      || this.map.get(tx, ty - 1) === "floor" || this.map.get(tx, ty + 1) === "floor";
    for (let ty = 0; ty < this.map.h; ty++) for (let tx = 0; tx < this.map.w; tx++) {
      const [sx, sy] = this.ren.w2s(cam, tx * T, ty * T);
      if (sx < -d || sy < -d || sx > bw || sy > bh) continue;
      if (this.map.get(tx, ty) === "floor") { floor.draw(b, 0, 0, T, T, Math.round(sx), Math.round(sy), d, d); }
      else if (near(tx, ty)) {                                   // a dark rock wall bordering the floor
        b.fillStyle = "#2a1d18"; b.fillRect(Math.round(sx), Math.round(sy), d, d);
        if (this.map.get(tx, ty + 1) === "floor") { b.fillStyle = "#3c2a20"; b.fillRect(Math.round(sx), Math.round(sy + d - Math.max(2, cam.scale * 2)), d, Math.max(2, cam.scale * 2)); }
      }
    }
    // the glowing gem (procedural crystal)
    if (this.caveGem) this.drawGem(b, cam, this.caveGem.x, this.caveGem.y);
    // props + player, depth-sorted
    const [psx, psy] = this.ren.w2s(cam, this.player.x, this.player.y);
    const playerItem: Drawable = { y: this.player.y, render: (c) => this.player.draw(c, this.atlas.get("player"), psx, psy, cam.scale) };
    // this.drawShadows(b, cam, false);   // DISABLED (owner) — sprites carry their own shadows
    this.ren.drawEntities(b, this.map, cam, [playerItem]);
    this.drawCaveLight(b, cam);
  }

  /** A small faceted crystal that pulses with light. */
  private drawGem(c: CanvasRenderingContext2D, cam: Camera, wx: number, wy: number) {
    const [sx, sy] = this.ren.w2s(cam, wx, wy), s = cam.scale, pulse = 0.7 + 0.3 * Math.sin(this.tsec * 2.4);
    c.save();
    c.fillStyle = "#bff4ff"; c.beginPath();
    c.moveTo(sx, sy - 8 * s); c.lineTo(sx + 5 * s, sy - 1 * s); c.lineTo(sx + 2 * s, sy + 6 * s); c.lineTo(sx - 2 * s, sy + 6 * s); c.lineTo(sx - 5 * s, sy - 1 * s); c.closePath(); c.fill();
    c.fillStyle = "#6cd6f0"; c.globalAlpha = 0.8;
    c.beginPath(); c.moveTo(sx, sy - 8 * s); c.lineTo(sx + 5 * s, sy - 1 * s); c.lineTo(sx, sy + 1 * s); c.closePath(); c.fill();
    c.globalAlpha = 1; c.globalCompositeOperation = "lighter";
    const r = 26 * s * pulse, g = c.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, "rgba(150,235,255,0.5)"); g.addColorStop(1, "rgba(150,235,255,0)");
    c.fillStyle = g; c.fillRect(sx - r, sy - r, r * 2, r * 2);
    c.restore();
  }

  /** Lantern darkness: a dark overlay with soft light "holes" around the player, the gem, and the
   *  exit — so the cave is explored by the light you carry. */
  private drawCaveLight(c: CanvasRenderingContext2D, cam: Camera) {
    c.save();
    c.fillStyle = "rgba(8,5,14,0.6)"; c.fillRect(0, 0, cam.vw, cam.vh);   // moody but readable
    c.globalCompositeOperation = "destination-out";
    const hole = (wx: number, wy: number, r: number, soft = 0.5) => {
      const [sx, sy] = this.ren.w2s(cam, wx, wy), g = c.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(soft, "rgba(0,0,0,0.8)"); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(sx - r, sy - r, r * 2, r * 2);
    };
    const pulse = 1 + 0.05 * Math.sin(this.tsec * 5);
    hole(this.player.x, this.player.y - 8, 104 * cam.scale * pulse);       // the lantern you carry
    if (this.caveGem) hole(this.caveGem.x, this.caveGem.y, 68 * cam.scale);
    if (this.caveExit) hole(this.caveExit.x * T + T / 2, this.caveExit.y * T + T / 2, 44 * cam.scale);
    c.globalCompositeOperation = "lighter";
    const glow = (wx: number, wy: number, r: number, col: string) => {
      const [sx, sy] = this.ren.w2s(cam, wx, wy), g = c.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(sx - r, sy - r, r * 2, r * 2);
    };
    glow(this.player.x, this.player.y - 8, 72 * cam.scale, "rgba(255,196,120,0.16)");      // warm lantern
    if (this.caveGem) glow(this.caveGem.x, this.caveGem.y, 58 * cam.scale, `rgba(150,235,255,${0.16 + 0.06 * Math.sin(this.tsec * 2.4)})`);   // the gem's cyan beacon
    c.restore();
  }

  /** ANCHOR 2 — Shroom Hollow: a clustered hamlet around a plaza well (staggered, varied sizes). */
  private placeVillage(map: TileMap) {
    const rnd = rng(500);
    const house = (sheet: string, w: number, h: number, tx: number, ty: number, sc = 1) =>
      map.addProp({ sheet, fw: w, fh: h, col: 0, row: 0, x: tx * T + T / 2, y: ty * T + T, scale: sc, solidR: w * sc * 0.32, overhead: false });
    // caps grouped around the plaza — the big inn-cap + smaller huts, staggered (never a row)
    house("shroom_house1", 80, 80, 18, 12, 0.95);
    house("shroom_house3", 48, 64, 26, 12, 1);
    house("shroom_house2", 48, 64, 15, 17, 1);
    house("shroom_house2", 48, 64, 27, 18, 1);
    house("shroom_house3", 48, 64, 21, 10, 1);
    // the plaza heart: a rustic well + benches (a village water/gathering point — NOT the town fountain)
    map.addProp({ sheet: "well", fw: 32, fh: 48, col: 0, row: 0, x: PLAZA.x * T + T / 2, y: PLAZA.y * T + T, solidR: 9 });
    map.addProp({ sheet: "benches", fw: 32, fh: 32, col: 0, row: 0, x: (PLAZA.x - 2) * T, y: (PLAZA.y + 2) * T });
    map.addProp({ sheet: "benches", fw: 32, fh: 32, col: 1, row: 0, x: (PLAZA.x + 3) * T, y: (PLAZA.y + 2) * T });
    // dressing: flower beds + a small green tree by the homes (tertiary colour), a landmark oak at the fringe
    for (const [cx, cy] of [[16, 15], [29, 15], [19, 20]] as [number, number][]) {
      const fc = Math.floor(rnd() * 5), fr = Math.floor(rnd() * 10);   // cols 0-4 = grass flowers (5-9 are potted → look like buttons)
      this.cluster(map, rnd, cx, cy, 2, 4, (tx, ty) => map.addProp({ sheet: "flowers", fw: 16, fh: 16, col: fc, row: fr, x: tx * T + rnd() * T, y: ty * T + rnd() * T }));
    }
    this.cluster(map, rnd, 13, 20, 2, 2, (tx, ty) => map.addProp({ sheet: "tree_oak_med", fw: 32, fh: 48, col: Math.floor(rnd() * 3), row: 0, x: tx * T + 4, y: ty * T + 6, overhead: true, solidR: 5 }));
    map.addProp({ sheet: "tree_oak", fw: 64, fh: 80, col: 0, row: 0, x: 12 * T + 8, y: 15 * T + 12, overhead: true, solidR: 7 });
    // a fenced kitchen garden by an east hut — flower beds inside (fences around the homes)
    this.fenceRect(map, 25, 20, 29, 23, 27);
    const gc = Math.floor(rnd() * 5), gr = Math.floor(rnd() * 10);   // grass flowers only (not the potted 5-9)
    for (let ty = 21; ty <= 22; ty++) for (let tx = 26; tx <= 28; tx++) map.addProp({ sheet: "flowers", fw: 16, fh: 16, col: gc, row: gr, x: tx * T + rnd() * T, y: ty * T + rnd() * T });
    this.labels.push({ x: PLAZA.x * T, y: (PLAZA.y - 5) * T, text: "Shroom Hollow" });
  }

  /** ANCHOR 3 — the grove: giant mushrooms MASSED near the core, thinning outward (a forest with
   *  an edge), with green trees mixed in + a small-mushroom/rock understory. Three flora tiers. */
  private placeGrove(map: TileMap) {
    const rnd = rng(909);
    // limited palette (60-30-10): RED caps are the secondary colour (matching the red-cap houses),
    // differing sizes; only a rare purple accent — no blue (keeps the ring from being a colour soup).
    const cap = (): [string, string] => rnd() < 0.86 ? ["shroom_red", "#ff9a86"] : ["shroom_purple", "#c88bff"];
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      if (!this.canPlace(map, tx, ty, 5, 2.8)) continue;
      const dens = 1 - smoothstep(2, 15, Math.hypot(tx - GROVE.x, ty - GROVE.y));   // dense core → thins to nothing
      if (dens <= 0) continue;
      const r = rnd();
      if (r < dens * 0.44) { const [s, c] = cap(); this.giantShroom(map, s, c, tx, ty, 0.8 + rnd() * 0.7); }          // signature (dense, overlapping, varied sizes)
      else if (r < dens * 0.58) map.addProp({ sheet: "tree_oak", fw: 64, fh: 80, col: Math.floor(rnd() * 3), row: 0, x: tx * T + 8, y: ty * T + 12, overhead: true, solidR: 7 });  // secondary (green trees)
      else if (r < dens * 0.50) {                                                                                                             // bushes (varied sizes)
        if (rnd() < 0.5) map.addProp({ sheet: "tree_oak_med", fw: 32, fh: 48, col: Math.floor(rnd() * 3), row: 0, x: tx * T + 4, y: ty * T + 6, overhead: true, solidR: 5 });
        else map.addProp({ sheet: "outdoor_decor", fw: 16, fh: 16, col: DBUSH[0], row: DBUSH[1], x: tx * T + rnd() * T, y: ty * T + T, solidR: 3 });
      }
      else if (r < dens * 0.72)                                                                                                               // dense understory: mossy rocks only (no lava-like shroom bits)
        map.addProp({ sheet: "shroom_rocks", fw: 16, fh: 16, col: Math.floor(rnd() * 4), row: Math.floor(rnd() * 4), x: tx * T + rnd() * T, y: ty * T + T });
    }
    this.labels.push({ x: GROVE.x * T, y: (GROVE.y - 9) * T, text: "Deepshade Grove" });
  }

  /** FILL — the open meadow (S/SW): mostly negative space + a few clustered flower/bush/rock
   *  clumps and grazing critters. Kept sparse so the busy pockets breathe. */
  private placeMeadow(map: TileMap) {
    const rnd = rng(1337);
    const clumps: [number, number, "flower" | "bush" | "rock"][] = [
      [17, 38, "flower"], [24, 43, "flower"], [14, 32, "bush"], [21, 45, "bush"], [31, 43, "rock"], [15, 41, "flower"],
    ];
    for (const [cx, cy, kind] of clumps) {
      if (kind === "flower") { const fc = Math.floor(rnd() * 5), fr = Math.floor(rnd() * 10); this.cluster(map, rnd, cx, cy, 2, 4 + Math.floor(rnd() * 3), (tx, ty) => map.addProp({ sheet: "flowers", fw: 16, fh: 16, col: fc, row: fr, x: tx * T + rnd() * T, y: ty * T + rnd() * T })); }
      else if (kind === "bush") this.cluster(map, rnd, cx, cy, 2, 2, (tx, ty) => map.addProp({ sheet: "tree_oak_med", fw: 32, fh: 48, col: Math.floor(rnd() * 3), row: 0, x: tx * T + 4, y: ty * T + 6, overhead: true, solidR: 5 }));
      else this.cluster(map, rnd, cx, cy, 2, 2, (tx, ty) => map.addProp({ sheet: "shroom_rocks", fw: 16, fh: 16, col: Math.floor(rnd() * 4), row: Math.floor(rnd() * 4), x: tx * T + rnd() * T, y: ty * T + T }));
    }
    const life = (sheet: string, fh: number, sr: number, frames: number, pts: [number, number][]) => {
      for (const [tx, ty] of pts) if (this.canPlace(map, tx, ty, 3, 2.2)) this.addCritter(map, sheet, 32, fh, 0, 0, tx, ty, { solidR: sr, frames, fps: 3, wr: 1.1, sp: 6, bob: 1.2 });
    };
    life("shroomling", 48, 5, 4, [[22, 43], [40, 38], [44, 24], [24, 45]]);
    life("shroomling2", 32, 4, 1, [[26, 41], [45, 37], [13, 30]]);   // frame 0 only (row 0 has a blank 2nd frame → flicker); moves via bob/wander
    for (const [tx, ty] of [[23, 39], [35, 42], [17, 44], [50, 30]] as [number, number][])
      if (this.canPlace(map, tx, ty, 2, 1.0)) this.addCritter(map, "snail", 16, 16, 0, 0, tx, ty, { wr: 1.4, sp: 2, bob: 0.4 });   // a slow crawl
  }

  /** Distance (in tiles) from a point to the plaza→pond footpath polyline. */
  private laneDist(px: number, py: number): number {
    let best = 99;
    for (let i = 0; i < LANE.length - 1; i++) {
      const [ax, ay] = LANE[i], [bx, by] = LANE[i + 1];
      const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
      let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(px - (ax + dx * t), py - (ay + dy * t)));
    }
    return best;
  }

  /** Inside (or hugging) the fenced mushroom farm. */
  private inField(tx: number, ty: number): boolean {
    return tx >= SFIELD.x0 - 1 && tx <= SFIELD.x1 + 1 && ty >= SFIELD.y0 - 1 && ty <= SFIELD.y1 + 1;
  }

  /** Place an animal as a living critter (a prop that frame-animates in place + gently wanders). */
  private addCritter(map: TileMap, sheet: string, fw: number, fh: number, col: number, row: number, tx: number, ty: number,
    o: { frames?: number; fps?: number; bob?: number; wr?: number; sp?: number; water?: boolean; solidR?: number; scale?: number } = {}): Critter {
    map.addProp({ sheet, fw, fh, col, row, x: tx * T, y: ty * T, scale: o.scale, solidR: o.solidR ?? 0 });
    const p = map.props[map.props.length - 1];
    const c: Critter = {
      p, gx: p.x, gy: p.y, hx: p.x, hy: p.y, baseCol: col, frames: o.frames ?? 1, fps: o.fps ?? 4,
      ph: ((tx * 7 + ty * 13) % 100) / 100 * 6.28, bob: o.bob ?? 1.4, wr: o.wr ?? 0, sp: o.sp ?? 8,
      tx: p.x, ty: p.y, nt: 0, water: o.water ?? false,
    };
    this.critters.push(c);
    return c;
  }

  /** Add a living NPC: a d_npc character that WANDERS a small radius on clear ground (never into
   *  solids/water — the per-step blocked check enforces movement clearance) and TURNS to face you
   *  when you're near. Its name tag follows it. row = the character's down-facing walk row (up = row+2). */
  private addNpc(map: TileMap, tx: number, ty: number, name: string, row: number) {
    [tx, ty] = this.clearNpcPost(map, tx, ty);   // never post an NPC hidden behind a building (depth/occlusion rule)
    const c = this.addCritter(map, "d_npc", 32, 32, 0, row, tx, ty, { frames: 6, fps: 6, bob: 0, wr: 1.2, sp: 9, solidR: 6, scale: 1.05 });
    c.dir = { down: row, up: row + 2 };
    this.labels.push({ x: tx * T + T / 2, y: ty * T - 8, text: name, follow: c });
  }

  /** A tall building has depth: anything north of its feet within its silhouette draws BEHIND it.
   *  Nudge an NPC's post SOUTH (toward the camera) until it's on clear ground and not hidden behind
   *  a tall object — so the NPC always reads, never swallowed by a wall. (Owner depth-placement rule.) */
  private clearNpcPost(map: TileMap, tx: number, ty: number): [number, number] {
    for (let s = 0; s <= 6; s++) {
      const ny = ty + s, wx = tx * T, wy = ny * T;   // critters anchor feet at (tx*T, ty*T) — match that
      if (map.inBounds(tx, ny) && !map.isSolidTile(tx, ny) && this.landField(tx, ny) > 3
        && !this.occludedByTall(map, wx, wy) && !this.nearBigProp(map, wx, wy, 16)) return [tx, ny];
    }
    return [tx, ty];
  }

  /** Animate + wander every critter (called each frame). */
  private updateCritters(dt: number) {
    for (const c of this.critters) {
      if (!c.dir && c.frames > 1) c.p.col = c.baseCol + (Math.floor(this.tsec * c.fps + c.ph) % c.frames);   // generic frame cycle (NPCs handled below)
      let moved = false, mvx = 0;
      // an NPC pauses its wander when you're near, so it stops to regard you (face-to-face).
      const npcNear = !!c.dir && (this.player.x - c.gx) ** 2 + (this.player.y - c.gy) ** 2 < 48 * 48;
      if (c.wr > 0 && !npcNear) {
        c.nt -= dt;
        if (c.nt <= 0) {                                   // pick a fresh wander target near home
          const a = this.tsec * 0.6 + c.ph;
          c.tx = c.hx + Math.cos(a) * c.wr * T; c.ty = c.hy + Math.sin(a * 1.7) * c.wr * T;
          c.nt = 2.5 + (c.ph % 2);
        }
        const dx = c.tx - c.gx, dy = c.ty - c.gy, d = Math.hypot(dx, dy);
        if (d > 1.5) {
          const step = Math.min(d, c.sp * dt), nx = c.gx + dx / d * step, ny = c.gy + dy / d * step;
          // MOVEMENT CLEARANCE (owner rule): a ground-mover only steps onto genuinely walkable ground —
          // never into water, off the ring, or through a solid (building/cliff/prop). Blocked → retarget.
          // NPCs additionally won't drift BEHIND a tall building (depth/occlusion) — they'd vanish.
          const ok = c.water
            ? (this.biome === "desert" ? this.oasisField(nx / T, ny / T) > 0.3 : this.pondField(nx / T, ny / T) > 0.5)   // stay on the ring's actual pool
            : (this.landField(nx / T, ny / T) > 2.5 && !this.blocked(nx, ny, 4) && (!c.dir || !this.occludedByTall(this.map, nx, ny)));
          if (ok) { mvx = nx - c.gx; c.gx = nx; c.gy = ny; moved = true; if (!c.dir && Math.abs(dx) > 4) c.p.flip = dx < 0; } else c.nt = 0;
        }
      }
      if (c.dir) this.faceNpc(c, moved, mvx);
      const bob = this.reduce ? 0 : Math.abs(Math.sin(this.tsec * 3 + c.ph)) * c.bob;   // a gentle hop
      c.p.x = c.gx; c.p.y = c.gy - bob;
    }
  }

  /** Pick an NPC's sprite frame from what it's doing: if you're close (and it's not mid-step) it
   *  TURNS to face you (down if you're below/level, up/away if above); while wandering it plays its
   *  walk cycle on the matching row (flipped for left); otherwise it stands on its front idle. */
  private faceNpc(c: Critter, moved: boolean, mvx: number): void {
    const dir = c.dir!;
    const pdx = this.player.x - c.gx, pdy = this.player.y - c.gy;
    const near = pdx * pdx + pdy * pdy < 48 * 48;   // ~3 tiles → notices you
    if (near && !moved) {                            // turn to face the player, standing idle
      c.p.row = pdy >= -6 ? dir.down : dir.up;
      if (Math.abs(pdx) > 6) c.p.flip = pdx < 0;
      c.p.col = c.baseCol;
      return;
    }
    if (moved) {                                     // walking — matching direction row + walk cycle
      c.p.row = c.ty < c.gy ? dir.up : dir.down;     // heading toward a higher target = walking away (up)
      if (Math.abs(mvx) > 0.2) c.p.flip = mvx < 0;
      c.p.col = c.baseCol + (Math.floor(this.tsec * c.fps + c.ph) % c.frames);
    } else {
      c.p.col = c.baseCol;                           // idle frame, keep last-faced row
    }
  }

  /** True if (wx,wy) is within `d` px of an existing BIG prop (mushroom/tree/house) — so small
   *  ground detail never lands on top of a cap/trunk (fixes rock-on-mushroom overlaps). */
  private nearBigProp(map: TileMap, wx: number, wy: number, d: number): boolean {
    const d2 = d * d;
    for (const p of map.props) if (p.solidR && p.solidR >= 5 && (wx - p.x) ** 2 + (wy - p.y) ** 2 < d2) return true;
    return false;
  }

  /** Placement gate: grassy, WELL inside the edgepoint (never near the shore), clear of pond & farm, off the path. */
  private canPlace(map: TileMap, tx: number, ty: number, edge = 4.5, pondM = 2.8): boolean {
    return map.get(tx, ty) === "grass" && this.insideEdge(tx, ty, edge) && !this.inField(tx, ty)
      && this.pondClear(tx, ty, pondM) && this.laneDist(tx + 0.5, ty + 0.5) > 1.7
      && Math.hypot(tx - COMMONS.x, ty - COMMONS.y) > 3;   // keep the fire clearing clear
  }

  /** Scatter `n` props in a tight odd-ish cluster around (cx,cy), honouring the placement gate. */
  private cluster(map: TileMap, rnd: () => number, cx: number, cy: number, spread: number, n: number, place: (tx: number, ty: number) => void) {
    for (let i = 0; i < n; i++) {
      const tx = cx + Math.round((rnd() - 0.5) * spread * 2), ty = cy + Math.round((rnd() - 0.5) * spread * 2);
      if (this.canPlace(map, tx, ty)) place(tx, ty);
    }
  }

  /** The village mushroom farm — real tilled-soil TILES + regular rows of cultivated caps, fenced. */
  private placeFarm(map: TileMap) {
    for (let ty = SFIELD.y0; ty <= SFIELD.y1; ty++) for (let tx = SFIELD.x0; tx <= SFIELD.x1; tx++) map.set(tx, ty, "farm");   // tilled-soil ground tiles (walkable)
    for (let ty = SFIELD.y0 + 1; ty <= SFIELD.y1 - 1; ty++) {
      if ((ty - SFIELD.y0) % 2 === 1) continue;               // plant every other row (furrows between)
      for (let tx = SFIELD.x0 + 1; tx <= SFIELD.x1 - 1; tx++)  // a straight row of identical caps (rows = the one place regularity is right)
        map.addProp({ sheet: "outdoor_decor", fw: 16, fh: 16, col: 6, row: 1, x: tx * T + T / 2, y: ty * T + T });   // red cultivated caps (cohesive palette)
    }
    this.fenceRect(map, SFIELD.x0, SFIELD.y0, SFIELD.x1, SFIELD.y1, Math.round((SFIELD.x0 + SFIELD.x1) / 2));
    this.labels.push({ x: (SFIELD.x0 + SFIELD.x1) / 2 * T, y: (SFIELD.y0 - 1) * T, text: "Mushroom Field" });
  }

  /** A rectangular wooden fence (decorative, non-solid) with a gap for a gate at column gateX on the bottom. */
  private fenceRect(map: TileMap, x0: number, y0: number, x1: number, y1: number, gateX: number) {
    const put = (tx: number, ty: number, col: number, row: number) => map.addProp({ sheet: "fences", fw: 16, fh: 16, col, row, x: tx * T + T / 2, y: ty * T + T });
    for (let tx = x0; tx <= x1; tx++) {
      const c = tx === x0 ? 1 : tx === x1 ? 3 : 2;            // corners vs top/bottom edge
      put(tx, y0, c, 0);
      if (tx !== gateX) put(tx, y1, c, 3);                   // gate gap in the bottom run
    }
    for (let ty = y0 + 1; ty <= y1 - 1; ty++) { put(x0, ty, 1, 1); put(x1, ty, 3, 1); }   // side rails
  }

  /** A fine, CLUSTERED ground-detail carpet (tufts / flowers / pebbles / tiny caps) so no ground
   *  reads as bare — denser along the footpath (a breadcrumb trail). All non-solid. */
  private scatterDetail(map: TileMap) {
    const rnd = rng(2718);
    const cell = (sheet: string, cr: [number, number]) => (tx: number, ty: number) => map.addProp({ sheet, fw: 16, fh: 16, col: cr[0], row: cr[1], x: tx * T + rnd() * T, y: ty * T + T });
    const tuft = (tx: number, ty: number) => cell("outdoor_decor", TUFTS[Math.floor(rnd() * TUFTS.length)])(tx, ty);
    const flow = (tx: number, ty: number) => cell("outdoor_decor", DFLOWERS[Math.floor(rnd() * DFLOWERS.length)])(tx, ty);
    const peb = (tx: number, ty: number) => map.addProp({ sheet: "shroom_rocks", fw: 16, fh: 16, col: Math.floor(rnd() * 5), row: Math.floor(rnd() * 4), x: tx * T + rnd() * T, y: ty * T + T });   // dry mossy rocks (no blue-water base)
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      if (map.get(tx, ty) !== "grass" || !this.insideEdge(tx, ty, 3.5) || !this.pondClear(tx, ty, 2.6) || this.inField(tx, ty) || Math.hypot(tx - COMMONS.x, ty - COMMONS.y) < 2.6) continue;
      const clump = Math.sin(tx * 0.45 + 0.3) * Math.sin(ty * 0.4 - 0.7) * Math.sin((tx + ty) * 0.2);   // big-med-small waves
      const onPath = this.laneDist(tx + 0.5, ty + 0.5) < 2.6;
      const p = 0.05 + Math.max(0, clump) * 0.32 + (onPath ? 0.3 : 0);
      if (rnd() > p) continue;
      if (this.nearBigProp(map, tx * T + T / 2, ty * T + T, 13)) continue;   // don't scatter detail onto a cap/trunk/house
      const r = rnd();   // green tufts + pebbles + sparse flowers (no scattered mushrooms — they read as odd orange blobs)
      if (r < 0.6) tuft(tx, ty); else if (r < 0.72) flow(tx, ty); else peb(tx, ty);
    }
  }

  /** A natural (non-circular) pond outline: >0 inside. Gentle lobes, medium size. */
  private pondField(tx: number, ty: number): number {
    const dx = (tx - SPOND.cx) / SPOND.rx, dy = (ty - SPOND.cy) / SPOND.ry;
    const ang = Math.atan2(ty - SPOND.cy, tx - SPOND.cx);
    const R = 1 + 0.1 * Math.sin(ang * 3 + 0.6) + 0.07 * Math.sin(ang * 2 - 1.1);   // soft bays, not a disc (gentle → clean banks)
    return R - (dx * dx + dy * dy);
  }

  /** True if a tile is clear of the pond by `margin` tiles — keeps props/NPCs off the water's edge. */
  private pondClear(tx: number, ty: number, margin = 2.4): boolean {
    return this.pondField(tx + 0.5, ty + 0.5) * ((SPOND.rx + SPOND.ry) / 2) < -margin;
  }

  /** Foliage a pond so it reads ESTABLISHED, not a bare pool: a lush reed/cattail belt, encircling
   *  stones, overhanging bushes, lily pads + floating reeds in the shallows, a duck & frog.
   *  Reusable for any pond via `pondField`/`SPOND`. */
  private placePondDecor(map: TileMap) {
    const rnd = rng(313);
    const plant = (sheet: string, tx: number, ty: number) => map.addProp({ sheet, fw: 16, fh: 16, col: 0, row: 0, x: tx * T + T / 2, y: ty * T + T });
    const onDock = (tx: number, ty: number) => tx >= POND_DOCK.x0 && tx <= POND_DOCK.x1 && Math.abs(ty - POND_DOCK.y) <= 1;
    // lily pads scattered on the water (the pond's only widespread foliage) — never under the pier
    for (let ty = Math.floor(SPOND.cy - SPOND.ry) - 1; ty <= Math.ceil(SPOND.cy + SPOND.ry) + 1; ty++)
      for (let tx = Math.floor(SPOND.cx - SPOND.rx) - 1; tx <= Math.ceil(SPOND.cx + SPOND.rx) + 1; tx++)
        if (this.pondField(tx + 0.5, ty + 0.5) > 0.3 && map.get(tx, ty) === "water" && !onDock(tx, ty) && rnd() < 0.32)
          plant(rnd() < 0.5 ? "lilypad1" : "lilypad2", tx, ty);
    // stepping stones across the north shallows + 2 cattails & 2 reeds behind them (in the water)
    const rockY = Math.round(SPOND.cy - SPOND.ry) + 1;
    for (let i = 0; i < 4; i++) map.addProp({ sheet: i % 2 ? "waterrock1" : "waterrock2", fw: 16, fh: 16, col: 0, row: 0, x: (SPOND.cx - 2 + i) * T + 4, y: rockY * T + T });
    plant("cattail", SPOND.cx - 2, rockY - 1); plant("cattail", SPOND.cx + 1, rockY - 1);
    plant("watergrass", SPOND.cx - 1, rockY - 1); plant("watergrass", SPOND.cx, rockY - 1);
    // a bench overlooking the water + a reed & cattail in the water behind it
    const bx = SPOND.cx + 3, by = Math.round(SPOND.cy + SPOND.ry);
    map.addProp({ sheet: "benches", fw: 32, fh: 32, col: 0, row: 0, x: bx * T, y: by * T });
    plant("cattail", SPOND.cx + 2, SPOND.cy + 2); plant("watergrass", SPOND.cx + 3, SPOND.cy + 2);
    // 1 reed + 1 cattail in the water on the far (south) side of the fishing pier
    plant("cattail", SPOND.cx - 3, SPOND.cy + 2); plant("watergrass", SPOND.cx - 2, SPOND.cy + 2);
    // pond life — a duck paddling on the water + a frog hopping on the bank
    this.addCritter(map, "duck", 32, 32, 0, 12, SPOND.cx + 1, SPOND.cy - 1, { water: true, wr: 1.6, sp: 6, bob: 1 });
    this.addCritter(map, "frog", 32, 32, 0, 0, SPOND.cx - 4, SPOND.cy + 2, { wr: 0.7, sp: 5, bob: 2.4 });
  }

  /** One giant mushroom (top-row cap @32×48), depth-sorted, casting a crisp neon glow. */
  private giantShroom(map: TileMap, sheet: string, color: string, tx: number, ty: number, sc = 1) {
    if (!this.insideEdge(tx, ty, 5) || !this.pondClear(tx, ty, 2.8)) return;
    const cap = Math.floor(hash2(tx, ty) * 4);   // one of the 4 caps in the top row
    map.addProp({ sheet, fw: 32, fh: 48, col: cap, row: 0, x: tx * T + T / 2, y: ty * T + T, scale: sc, overhead: true, solidR: 6 * sc });
    this.glowSpots.push({ x: tx * T + T / 2, y: ty * T + 12 * sc, color, r: 18 * sc });   // a tight glow at the cap (no smear)
  }

  /** Horizontal wood bridge where the lane crosses the river (and make it walkable). */
  private placeBridge(map: TileMap, roadY: number, centerX: number, halfSpan: number) {
    const x0 = centerX - halfSpan, x1 = centerX + halfSpan;   // spans the whole river + a margin
    for (let tx = x0; tx <= x1; tx++) {
      const col = tx === x0 ? 3 : tx === x1 ? 5 : 4;   // left cap / deck / right cap
      map.setOverlay(tx, roadY - 1, "bridge_wood", col, 1);
      map.setOverlay(tx, roadY, "bridge_wood", col, 2);
      map.setOverlay(tx, roadY + 1, "bridge_wood", col, 3);
      for (let dy = -1; dy <= 1; dy++) map.setSolid(tx, roadY + dy, false);   // walkable deck
    }
  }

  /** Continuous "landness": >0 inside the island, <0 outside, ~tiles from the shore. */
  private landField(tx: number, ty: number): number {
    const dx = (tx - CX) / this.rx, dy = (ty - CY) / this.ry, ang = Math.atan2(ty - CY, tx - CX);
    const R = 1 + 0.035 * Math.sin(ang * 2 + 0.6);
    return (R - (dx * dx + dy * dy)) * ((this.rx + this.ry) / 4);   // ~tiles inside the oval shore
  }

  /** River centre-x at row ty — starts under the fountain, gently drifts toward the pond. */
  private riverCenterAt(ty: number): number {
    const t = Math.max(0, Math.min(1, (ty - (WELL.y + 1)) / (POND.y - (WELL.y + 1))));
    return RIVER_X + (POND.x - RIVER_X) * t + Math.sin((ty - WELL.y - 1) * 0.26) * 1.6;
  }
  /** River half-width at row ty — gently varied. */
  private riverHalfAt(ty: number): number { return 1.4 + 0.3 * Math.sin(ty * 0.55); }

  /** Continuous water "insideness": >0 inside the river channel OR the inland pond. */
  private riverField(tx: number, ty: number): number {
    let f = -99;
    if (ty >= WELL.y + 0.5 && ty <= POND.y + 0.5) f = this.riverHalfAt(ty) - Math.abs(tx - this.riverCenterAt(ty));
    const pond = POND_R - Math.hypot(tx - POND.x, ty - POND.y);
    return Math.max(f, pond);
  }

  /** Smooth low-frequency meadow noise in [-1,1] — soft grass patches, no tile grid. */
  private meadow(tx: number, ty: number): number {
    return (Math.sin(tx * 0.34 + 0.7) * Math.sin(ty * 0.29) +
      Math.sin(tx * 0.13 - 1.1) * Math.sin(ty * 0.19 + 2.0) * 0.7) / 1.7;
  }

  /**
   * Pre-render the static ground layer ONCE (super-sampled so it stays crisp):
   * a GRAINY sandy beach → foam waterline → shallows → deep ocean around the
   * island, plus soft green meadow shading inland. Also traces the shoreline
   * contour so animated foam can lap the edge each frame.
   */
  private buildCoast() {
    const SS = this.coastSS, cw = MW * T * SS, ch = MH * T * SS;
    const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
    const cx = cv.getContext("2d")!; const img = cx.createImageData(cw, ch); const d = img.data;
    const SAND = [235, 221, 165], SANDD = [204, 185, 124];
    const FOAM = [212, 234, 240], SHAL = [118, 200, 228], DEEP = [26, 86, 132];
    // natural inland-pond bands (Path A) — muted, harmonised with the moss floor (no glow)
    const PDEEP = [36, 84, 108], PSHAL = [96, 160, 168], PWL = [176, 214, 210], GRAVEL = [150, 146, 134];
    const PATHC = [150, 128, 92];   // a trodden footpath — defined worn earth (painted, not tiled)
    const pal = this.bpal, GDARK = pal.gdark, GLITE = pal.glite;
    for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
      const tx = (px + 0.5) / (T * SS), ty = (py + 0.5) / (T * SS), g = this.landField(tx, ty);
      const n = hash2(px, py);
      let col: number[], a = 255;
      // clean grass → sand → foam → shallow → deep bands (no grass/sand blending)
      if (g > 1.55) {                                       // inland ground
        if (this.biome === "desert") {                      // the LAND is a real SPRITE sand floor (drawGround) — here we only
          // flow a LIGHT dune tone OVER the tiles (like the meadow's grass shade), NEVER opaque paint,
          // so the sprite ground shows through. Big soft dune sweeps + a topographic ridge shade.
          const dune = Math.sin(tx * 0.05 + 1.3) * Math.sin(ty * 0.045 - 0.6) * 0.5 + 0.5;
          const ridge = Math.sin(ty * 0.5 + Math.sin(tx * 0.12) * 3 + tx * 0.045);
          const shade = mix3(GDARK, GLITE, Math.max(0, Math.min(1, 0.32 + 0.46 * this.meadow(tx, ty) + 0.22 * dune)));
          const dk = Math.max(0, ridge) * 0.14;
          col = [shade[0] * (1 - dk), shade[1] * (1 - dk), shade[2] * (1 - dk)];
          a = 62;                                           // a translucent wash — the sand TILES beneath show
        } else {                                            // grass — soft, cohesive biome tone flows over the textured tiles
          const t = 0.5 + 0.5 * (this.meadow(tx, ty) * 0.78 + Math.sin(tx * 0.9 + 1) * Math.sin(ty * 0.8) * 0.22);
          col = mix3(GDARK, GLITE, Math.max(0, Math.min(1, t))); a = 58;
        }
      } else if (g > 0.1) {                                 // sand — grainy, easing into the grass at the top (edge colour-match)
        const grain = (n - 0.5) * 40, base = mix3(SANDD, SAND, smoothstep(0.1, 1.2, g));
        col = [base[0] + grain, base[1] + grain, base[2] + grain * 0.8]; a = 255;
        if (g > 0.9) { const k = smoothstep(0.9, 1.55, g); col = mix3(col, GLITE, k * 0.85); a = Math.round(255 - k * 170); }
      } else if (g > -0.12) { col = FOAM; }                 // foam waterline
      else if (g > -0.9) { col = mix3(FOAM, SHAL, smoothstep(-0.18, -0.9, g)); const r = (n - 0.5) * 16; col = [col[0] + r, col[1] + r, col[2] + r * 0.7]; }
      else if (g > -3.2) { col = mix3(SHAL, DEEP, smoothstep(-0.9, -3.2, g)); const wave = Math.sin(g * 2.6 + tx * 0.5 + ty * 0.35) * 7 + (n - 0.5) * 8; col = [col[0] + wave, col[1] + wave, col[2] + wave]; }
      else { col = DEEP; }
      // a natural inland POND painted right into the ground canvas (Path A): grass → damp
      // bank → waterline → shallow → deep, all SDF-smooth so it always matches the floor.
      if (this.biome === "shroom" && g > 0.3) {
        const pd = this.pondField(tx, ty) * ((SPOND.rx + SPOND.ry) / 2);   // ~tiles inside the pond
        if (pd > -0.22) {
          if (pd > 1.2) { const wv = Math.sin(pd * 2.2 + tx * 0.5 + ty * 0.35) * 6 + (n - 0.5) * 8; col = [PDEEP[0] + wv, PDEEP[1] + wv, PDEEP[2] + wv]; }
          else if (pd > 0.28) { const b = mix3(PWL, PSHAL, smoothstep(-0.1, 1.2, pd)); const r = (n - 0.5) * 12; col = [b[0] + r, b[1] + r, b[2] + r * 0.7]; }
          else col = PWL;                                    // bright waterline rim
          a = 255;
        } else {
          if (pd > -2.8) { const gr = (n - 0.5) * 34; col = mix3(col, [GRAVEL[0] + gr, GRAVEL[1] + gr, GRAVEL[2] + gr], smoothstep(-2.8, -0.15, pd) * 0.82); }   // gravel apron around the pond
          const ld = this.laneDist(tx, ty);                  // the footpath (leading line: plaza → pond)
          if (ld < 1.7) { const grain = (n - 0.5) * 16, worn = 1 - smoothstep(0.5, 1.7, ld); col = mix3(col, [PATHC[0] + grain, PATHC[1] + grain, PATHC[2] + grain], worn * 0.82); }
        }
      }
      // the OASIS — same water as the SEA (biome palette) with the BEACH's edge (deep → shallow →
      // foam waterline → wet green fringe), thinner; plus a green oasis GROUND and the path network.
      if (this.biome === "desert" && g > 0.3) {
        const W = pal.water!;
        const od = this.oasisField(tx, ty) * ((OASIS.rx + OASIS.ry) / 2);   // ~tiles inside the oasis
        if (od > -0.12) {                                    // WATER
          if (od > 1.4) { const wv = Math.sin(od * 2.4 + tx * 0.5 + ty * 0.35) * 7 + (n - 0.5) * 8; col = [W.deep[0] + wv, W.deep[1] + wv, W.deep[2] + wv]; }   // deep
          else if (od > 0.35) { const b = mix3(W.foam, W.shal, smoothstep(-0.12, 1.4, od)); const r = (n - 0.5) * 14; col = [b[0] + r, b[1] + r, b[2] + r * 0.7]; }   // grainy shallows
          else col = W.foam;                                 // bright foam waterline
          a = 255;
        } else {                                             // SHORE + green oasis ground
          if (od > -1.5) { const k = smoothstep(-1.5, -0.05, od) * 0.6; col = mix3(col, W.wet, k); }          // wet green fringe (the beach's damp band, thin)
          else if (od > -5) { const k = smoothstep(-5, -1.5, od) * 0.24; col = mix3(col, [150, 178, 120], k); }  // lush green oasis GROUND (where the palms grow)
          // (paths are NOT painted procedurally — owner wants true SPRITE-based paths via the
          // autotiler; DPATHS is kept only as clear walking LANES that scatter/flora avoid, until
          // the sprite path tiles are calibrated.)
        }
      }
      // the MESA uses real sanctumpixel sandstone cliff SPRITES (placeMesa). Here we only paint the
      // ground read: a LIT raised top surface (so it reads as a shelf above the sand) + a short soft
      // contact shadow at the foot of the south face.
      if (this.biome === "desert") {
        if (tx >= MESA.x0 && tx <= MESA.x1 + 1 && ty >= MESA.y0 && ty <= MESA.y1 + 1) {
          const lit = mix3(GDARK, GLITE, 0.9);                              // brighter, sun-caught plateau top
          col = [lit[0] + (n - 0.5) * 14, lit[1] + (n - 0.5) * 14, lit[2] + (n - 0.5) * 12]; a = 255;
        } else if (ty > MESA.y1 + MESA.faceH && ty < MESA.y1 + MESA.faceH + 1.8 && tx >= MESA.x0 - 1 && tx <= MESA.x1 + 1) {
          const below = ty - (MESA.y1 + MESA.faceH), sh = (1 - below / 1.8) * 0.3;
          col = [col[0] * (1 - sh), col[1] * (1 - sh), col[2] * (1 - sh)];
        }
      }
      const i = (py * cw + px) * 4;
      d[i] = clamp255(col[0]); d[i + 1] = clamp255(col[1]); d[i + 2] = clamp255(col[2]); d[i + 3] = a;
    }
    cx.putImageData(img, 0, 0);
    this.coast = cv;
    // trace the shoreline (ray-march g→0 from the centre) for animated foam
    this.shore = [];
    for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 120) {
      let prev = this.landField(CX + Math.cos(ang) * 2, CY + Math.sin(ang) * 2);
      for (let rr = 2.5; rr < Math.max(this.rx, this.ry) * 1.7; rr += 0.4) {
        const gx = CX + Math.cos(ang) * rr, gy = CY + Math.sin(ang) * rr, gg = this.landField(gx, gy);
        if (prev > 0 && gg <= 0) { this.shore.push({ x: gx * T, y: gy * T }); break; }
        prev = gg;
      }
    }
  }

  /** The ring's DOCK — a little wooden jetty out over the south shore (a departure point; the
   *  actual ring-to-ring sailing is wired when the lab merges into /cirql). */
  private drawDock(b: CanvasRenderingContext2D, cam: Camera) {
    const xC = CX, wTiles = 2, yTop = CY + this.ry - 1, yBot = CY + this.ry + 3;   // grass → out over the water
    const s = cam.scale;
    const [sx, sy] = this.ren.w2s(cam, (xC - wTiles / 2) * T, yTop * T);
    const pw = wTiles * T * s, ph = (yBot - yTop) * T * s;
    if (sx + pw < 0 || sx > cam.vw || sy + ph < 0 || sy > cam.vh) return;
    b.save();
    b.fillStyle = "#3a2415"; b.fillRect(sx + 1 * s, sy + ph - 5 * s, 3 * s, 7 * s); b.fillRect(sx + pw - 4 * s, sy + ph - 5 * s, 3 * s, 7 * s);   // end posts
    b.fillStyle = "#8a5a34"; b.fillRect(sx, sy, pw, ph);                              // deck
    b.fillStyle = "#6e4526";
    for (let i = 0; i <= yBot - yTop; i++) b.fillRect(sx, Math.round(sy + i * T * s), pw, Math.max(1, s));   // plank seams
    b.fillStyle = "#5a3820"; b.fillRect(sx, sy, Math.max(1, s), ph); b.fillRect(sx + pw - Math.max(1, s), sy, Math.max(1, s), ph);   // rails
    b.restore();
  }

  /** Clip drawing to the island's true (curved) shoreline, so square tiles round off to the ring. */
  private clipToShore(b: CanvasRenderingContext2D) {
    if (this.shore.length < 3) return;
    b.beginPath();
    for (let i = 0; i < this.shore.length; i++) {
      const [sx, sy] = this.ren.w2s(this.cam, this.shore[i].x, this.shore[i].y);
      if (i === 0) b.moveTo(sx, sy); else b.lineTo(sx, sy);
    }
    b.closePath();
    b.clip();
  }

  /** Blit the static ground layer for the current view (crisp; super-sampled). */
  private blitCoast(b: CanvasRenderingContext2D) {
    if (!this.coast) return;
    const cam = this.cam, SS = this.coastSS, viewW = cam.vw / cam.scale, viewH = cam.vh / cam.scale;
    b.imageSmoothingEnabled = true;
    b.drawImage(this.coast, (cam.x - viewW / 2) * SS, (cam.y - viewH / 2) * SS, viewW * SS, viewH * SS, 0, 0, cam.vw, cam.vh);
    b.imageSmoothingEnabled = false;
  }

  /** Foam waves lapping the shoreline — animated + a whole-island pulse (drawn under props). */
  private drawShoreFoam(c: CanvasRenderingContext2D, cam: Camera) {
    const breath = 0.7 + 0.5 * Math.sin(this.tsec * 1.6);   // island-wide pulse
    for (let i = 0; i < this.shore.length; i++) {
      const p = this.shore[i];
      const [sx, sy] = this.ren.w2s(cam, p.x, p.y);
      if (sx < -8 || sy < -8 || sx > cam.vw + 8 || sy > cam.vh + 8) continue;
      const ph = 0.5 + 0.5 * Math.sin(this.tsec * 2.2 + i * 0.6);
      c.globalAlpha = (0.2 + 0.5 * ph) * breath;
      c.fillStyle = "#dff4fa";
      const s = Math.max(1, cam.scale * 1.3);
      c.fillRect(sx - s, sy - s, s * 2.2, s * 2.2);
    }
    c.globalAlpha = 1;
  }

  /** A light grove ring, set a safe margin inside the shore (canopies never over the ring). */
  private placeShoreTrees(map: TileMap) {
    const rnd = rng(77);
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      if (map.get(tx, ty) !== "grass") continue;
      const g = this.landField(tx + 0.5, ty + 0.5);
      if (g < 4.5 || g > 9) continue;                 // a grove band well inside the edgepoint
      if (rnd() < 0.24) {
        if (rnd() < 0.6) map.addProp({ sheet: "tree_oak", fw: 64, fh: 80, col: 1 + Math.floor(rnd() * 2), row: 0, x: tx * T + 6 + rnd() * 6, y: ty * T + 12, overhead: true, solidR: 7 });
        else map.addProp({ sheet: "tree_oak_med", fw: 32, fh: 48, col: 1 + Math.floor(rnd() * 2), row: 0, x: tx * T + 2 + rnd() * 6, y: ty * T + 6, overhead: true, solidR: 5 });
      }
    }
  }

  /** A few natural flower clumps (in meadows + around the houses), not a grid. */
  private placeFlowerClumps(map: TileMap) {
    const rnd = rng(1337);
    const centers: [number, number][] = [[20, 18], [43, 30], [50, 22], [26, 38], [15, 24], [38, 20]];
    for (const p of map.props) if (p.solidR && p.solidR >= 12) centers.push([Math.round(p.x / T) + (rnd() < 0.5 ? -3 : 3), Math.round(p.y / T) + 2]);
    for (const [cx, cy] of centers) {
      const fc = Math.floor(rnd() * 5), fr = Math.floor(rnd() * 10);   // cols 0-4 = grass flowers (5-9 are potted → look like buttons)   // one flower type per clump
      const n = 4 + Math.floor(rnd() * 5);
      for (let i = 0; i < n; i++) {
        const tx = cx + Math.round((rnd() - 0.5) * 3.5), ty = cy + Math.round((rnd() - 0.5) * 3.5);
        if (map.get(tx, ty) !== "grass") continue;
        map.addProp({ sheet: "flowers", fw: 16, fh: 16, col: fc, row: fr, x: tx * T + rnd() * T, y: ty * T + rnd() * T });
      }
    }
  }

  /** Just a few small mushroom patches tucked under trees — where mushrooms hide. */
  private placeMushrooms(map: TileMap) {
    const rnd = rng(4242);
    let patches = 0;
    for (const p of map.props) {
      if (patches >= 4) break;                               // only a few on this ring
      if (p.sheet !== "tree_oak" || rnd() > 0.2) continue;
      const cx = Math.round(p.x / T), cy = Math.round(p.y / T) + 1;   // at the trunk base
      const n = 1 + Math.floor(rnd() * 3);                    // a small tight cluster
      for (let i = 0; i < n; i++) {
        const tx = cx + Math.round((rnd() - 0.5) * 2.2), ty = cy + Math.round((rnd() - 0.5) * 1.6);
        if (map.get(tx, ty) !== "grass" || !this.insideEdge(tx, ty, 2)) continue;
        map.addProp({ sheet: "mushrooms", fw: 16, fh: 16, col: Math.floor(rnd() * 8), row: Math.floor(rnd() * 5), x: tx * T + rnd() * T, y: ty * T + T });
      }
      patches++;
    }
  }

  /** Cattails / lily pads / water rocks clumped along the meandering riverbanks. */
  private placeRiverDecor(map: TileMap) {
    const rnd = rng(555);
    const put = (sheet: string, x: number, y: number) => map.addProp({ sheet, fw: 16, fh: 16, col: 0, row: 0, x, y });
    for (let ty = WELL.y + 3; ty <= 46; ty++) {
      const c = this.riverCol[ty]; if (c < 0) continue;
      if (rnd() < 0.45) {                              // a clump on one bank
        const side = rnd() < 0.5 ? -1 : 1;
        for (let k = 0; k < 2 + Math.floor(rnd() * 2); k++) {
          const tx = Math.round(c) + side * (2 + k), tyy = ty + Math.round((rnd() - 0.5) * 2);
          if (map.get(tx, tyy) !== "grass") continue;
          if (rnd() < 0.6) put(rnd() < 0.5 ? "cattail" : "watergrass", tx * T + rnd() * T, tyy * T + T);
          else put(rnd() < 0.5 ? "waterrock1" : "waterrock2", tx * T + rnd() * T, tyy * T + T);
        }
      }
      if (rnd() < 0.22) {                              // a lily pad / rock in the water (never on the bridge)
        const tx = Math.round(c) + Math.round((rnd() - 0.5) * 2);
        if (map.get(tx, ty) === "water" && !map.getOverlay(tx, ty)) put(rnd() < 0.6 ? (rnd() < 0.5 ? "lilypad1" : "lilypad2") : "waterrock1", tx * T + rnd() * T, ty * T + T);
      }
    }
  }

  /** Nudge a spawn point out of solid water to the nearest walkable land. */
  private snapToLand(map: TileMap, wx: number, wy: number): [number, number] {
    if (!map.circleBlocked(wx, wy, 5)) return [wx, wy];
    for (let r = 1; r < 24; r++) for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]] as [number, number][]) {
      const nx = wx + dx * r * T, ny = wy + dy * r * T;
      if (map.inBounds(Math.floor(nx / T), Math.floor(ny / T)) && !map.circleBlocked(nx, ny, 5)) return [nx, ny];
    }
    return [wx, wy];
  }

  private blocked(x: number, y: number, r: number): boolean {
    if (this.map.circleBlocked(x, y, r)) return true;
    for (const p of this.map.props) {
      if (!p.solidR) continue;
      if ((x - p.x) ** 2 + (y - p.y) ** 2 <= (p.solidR + r) ** 2) return true;
    }
    return false;
  }

  // ---------- loop ----------
  protected update(dt: number): void {
    this.tsec += dt;
    if (!this.loaded) return;
    // Frozen while a conversation is open — keep gentle idle life, ignore input.
    if (this.chatPaused) { this.player.moving = false; this.player.update(dt); this.updateCritters(dt); return; }
    let vx = 0, vy = 0;
    if (this.btn.left) vx -= 1; if (this.btn.right) vx += 1;
    if (this.btn.up) vy -= 1; if (this.btn.down) vy += 1;
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const m = Math.hypot(vx, vy), sp = 70;
      vx = (vx / m) * sp; vy = (vy / m) * sp;
      const r = 5;
      const nx = this.player.x + vx * dt; if (!this.blocked(nx, this.player.y, r)) this.player.x = nx;
      const ny = this.player.y + vy * dt; if (!this.blocked(this.player.x, ny, r)) this.player.y = ny;
      this.player.faceFromVelocity(vx, vy);
    }
    this.player.moving = moving;
    this.player.update(dt);
    if (this.fadeT > 0) this.fadeT = Math.max(0, this.fadeT - dt * 3);
    const k = Math.min(1, dt * 6);
    this.cam.x += (this.player.x - this.cam.x) * k;
    this.cam.y += (this.player.y - this.cam.y) * k;
    if (this.inCave) {
      // climb the ladder → back to the surface (must step clear first, so you don't ping-pong)
      if (this.caveExit) {
        const d = Math.hypot(this.player.x - (this.caveExit.x * T + T / 2), this.player.y - (this.caveExit.y * T + T));
        if (!this.portalArmed && d > 22) this.portalArmed = true;
        if (this.portalArmed && d < 13) this.exitCave();
      }
      return;
    }
    this.updateCritters(dt);
    this.updateProximity();
    if (this.pressed.a && this.nearInter) this.onTalk?.(this.nearInter.speaker);
    // step into the cave mouth → the underground level (armed only once you've stepped clear)
    if (this.caveMouth) {
      const d = Math.hypot(this.player.x - (this.caveMouth.x * T + T / 2), this.player.y - (this.caveMouth.y * T + T));
      if (!this.portalArmed && d > 26) this.portalArmed = true;
      if (this.portalArmed && d < 14) this.enterCave();
    }
  }

  /** Track the nearest talkable target in reach; tell the page when it changes. */
  private updateProximity() {
    let best: Interactable | null = null, bestD = Infinity;
    for (const it of this.interactables) {
      const d = Math.hypot(this.player.x - it.x, this.player.y - it.y);
      if (d <= it.r && d < bestD) { best = it; bestD = d; }
    }
    if (best !== this.nearInter) {
      this.nearInter = best;
      this.onProximity?.(best ? best.speaker : null);
    }
  }

  protected render(): void {
    if (this.inspectName && this.loaded) { this.drawInspector(); return; }
    const b = this.b, bw = b.canvas.width, bh = b.canvas.height;
    b.imageSmoothingEnabled = false;
    b.fillStyle = "#1e5c86"; b.fillRect(0, 0, bw, bh);   // deep-ocean backdrop (beyond the coast layer)
    if (!this.loaded) {
      b.fillStyle = "#7fd8ff"; b.font = `${Math.round(bh * 0.05)}px monospace`; b.textAlign = "center";
      b.fillText("loading Cloverfield…", bw / 2, bh / 2); b.textAlign = "left"; return;
    }
    if (this.inCave) { this.renderCave(); this.drawFade(b); return; }
    this.cam.vw = bw; this.cam.vh = bh; this.cam.scale = this.zoom;
    // crafted land tiles (grass + farm) — CLIPPED to the true shoreline curve so the square
    // tile grid rounds cleanly to the ring (no tiles poking past the edge; owner's mask idea).
    b.save();
    this.clipToShore(b);
    this.ren.drawGround(b, this.map, this.cam);
    b.restore();
    // textured sandy coast + procedural inland water + meadow shading, then shore foam
    this.blitCoast(b);
    this.drawShoreFoam(b, this.cam);
    if (this.biome === "desert") this.drawSandPaths(b, this.cam);   // LAYER 3 — true sprite paths on the finished ground
    this.drawDock(b, this.cam);   // the ring's dock (visual for now; ring-to-ring travel is the /cirql merge)
    if (this.biome === "shroom") this.drawPondDock(b, this.cam);   // the pond's little fishing pier (under the player/props)
    // the bridge, then depth-sorted actors
    this.ren.drawOverlay(b, this.map, this.cam);
    const [psx, psy] = this.ren.w2s(this.cam, this.player.x, this.player.y);
    const playerItem: Drawable = { y: this.player.y, render: (c) => this.player.draw(c, this.atlas.get("player"), psx, psy, this.cam.scale) };
    const extra: Drawable[] = [playerItem];
    if (this.hasFountain) {
      // the LOWER tiered fountain only (src rows 2-4 of the 32×80 sheet = y32,h48), feet-anchored
      const ffeet = (WELL.y + 1) * T;
      extra.push({
        y: ffeet,
        render: (c) => {
          const sh = this.atlas.get("fountain"), sc = this.cam.scale, dw = 32 * sc, dh = 48 * sc;
          const [fsx, fsy] = this.ren.w2s(this.cam, WELL.x * T + T / 2, ffeet);
          sh.draw(c, 0, 32, 32, 48, Math.round(fsx - dw / 2), Math.round(fsy - dh), Math.ceil(dw), Math.ceil(dh));
        },
      });
    }
    // this.drawShadows(b, this.cam);   // DISABLED (owner) — the extra oval made sprites look levitating; they already have baked shadows
    this.ren.drawEntities(b, this.map, this.cam, extra);
    if (this.hasFountain) this.drawLogo(b);   // the spinning CIRQLBACK emblem over the wellspring
    this.drawLight(b, this.cam);
    if (this.biome === "shroom") { this.drawPondJuice(b, this.cam); this.drawCommons(b, this.cam); }   // ripples/fish + the bonfire
    else if (this.biome === "desert") this.drawOasisJuice(b, this.cam);                                // oasis sparkles/ripples (campfire = an animated sprite)
    this.drawFade(b);
  }

  /** A quick black fade on a level transition (surface ↔ cave). */
  private drawFade(b: CanvasRenderingContext2D) {
    if (this.fadeT <= 0) return;
    b.fillStyle = `rgba(0,0,0,${this.fadeT})`; b.fillRect(0, 0, b.canvas.width, b.canvas.height);
  }

  /** The pack's grass "middle" tile is a FLAT colour, so revealed ground reads as a flat fill.
   *  Generate a subtly TEXTURED grass tile (blades + flecks) and swap it into the atlas so the
   *  ground shows real tile texture (like TMW), while the biome tone still flows over the top. */
  private buildGrassTexture() {
    const S = 16, cv = document.createElement("canvas"); cv.width = S; cv.height = S;
    const g = cv.getContext("2d")!; const rnd = rng(4242);
    g.fillStyle = "#6ea24e"; g.fillRect(0, 0, S, S);                                  // base grass green
    for (let i = 0; i < 40; i++) {                                                    // mottle of darker/lighter greens + short blades
      const x = Math.floor(rnd() * S), y = Math.floor(rnd() * S), r = rnd();
      if (r < 0.5) g.fillStyle = "rgba(74,128,58,0.55)";                              // dark fleck
      else if (r < 0.8) g.fillStyle = "rgba(150,190,110,0.5)";                        // light fleck
      else g.fillStyle = "rgba(60,110,48,0.6)";                                       // a short blade
      g.fillRect(x, y, 1, r < 0.8 ? 1 : 2);
    }
    (this.atlas.get("grass") as unknown as { img: HTMLCanvasElement }).img = cv;
  }

  /** Key the logo's cream background to transparent so it can spin over the well. */
  private buildLogo() {
    const sh = this.atlas.get("logo"); if (!sh.img) return;
    const w = sh.w, h = sh.h, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cx = cv.getContext("2d")!; cx.drawImage(sh.img, 0, 0);
    const img = cx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), sat = mx - Math.min(r, g, b);
      if (mx > 198 && sat < 42) d[i + 3] = 0;   // cream/white bg → transparent
    }
    cx.putImageData(img, 0, 0); this.logo = cv;
  }

  /** The CIRQLBACK circular-arrow mark, slowly spinning over the wellspring. */
  private drawLogo(b: CanvasRenderingContext2D) {
    if (!this.logo) return;
    const bob = this.reduce ? 0 : Math.sin(this.tsec * 1.4) * 2;
    const topY = (WELL.y + 1) * T - 52 + bob;   // hovering just above the lower fountain
    const [lx, ly] = this.ren.w2s(this.cam, WELL.x * T + T / 2, topY);
    const sz = 22 * this.cam.scale;
    b.save();
    b.translate(lx, ly);
    b.rotate(this.reduce ? 0 : this.tsec * 0.6);
    b.imageSmoothingEnabled = true;
    b.drawImage(this.logo, -sz / 2, -sz / 2, sz, sz);
    b.imageSmoothingEnabled = false;
    b.restore();
  }

  /** The procedural light & magic layer — drawn OVER the crafted tiles. */
  private drawLight(c: CanvasRenderingContext2D, cam: Camera) {
    if (this.reduce) return;
    c.save();
    c.globalCompositeOperation = "lighter";
    // wellspring glow + rising motes — only where the fountain actually is (town / home)
    if (this.hasFountain) {
      const [gx, gy] = this.ren.w2s(cam, WELL.x * T + T / 2, WELL.y * T + T / 2);
      const rad = 40 * cam.scale, a = 0.26 + 0.12 * Math.sin(this.tsec * 2);
      const g = c.createRadialGradient(gx, gy, 0, gx, gy, rad);
      g.addColorStop(0, `rgba(160,235,255,${a})`); g.addColorStop(0.5, `rgba(120,200,255,${a * 0.4})`); g.addColorStop(1, "rgba(120,200,255,0)");
      c.fillStyle = g; c.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
      for (let i = 0; i < 12; i++) {
        const ph = (this.tsec * 0.4 + i * 0.31) % 1;
        const mx = gx + Math.sin(this.tsec + i) * 9 * cam.scale, my = gy - ph * 44 * cam.scale;
        c.globalAlpha = (1 - ph) * 0.8; c.fillStyle = "#dffaff";
        const s = Math.max(1, cam.scale); c.fillRect(mx, my, s, s);
      }
      c.globalAlpha = 1;
    }
    // biome light: each giant mushroom breathes its own crisp neon halo (the pond is a plain
    // pack-tiled pool — no glow, per owner's "use the Cute pack water" direction)
    if (this.biome === "shroom") {
      for (const gs of this.glowSpots) {
        const [mx, my] = this.ren.w2s(cam, gs.x, gs.y);
        if (mx < -60 || my < -60 || mx > cam.vw + 60 || my > cam.vh + 60) continue;
        const rad = gs.r * cam.scale, pa = 0.16 + 0.08 * Math.sin(this.tsec * 1.8 + gs.x * 0.03);
        const mg = c.createRadialGradient(mx, my, 0, mx, my, rad);
        mg.addColorStop(0, this.rgba(gs.color, pa)); mg.addColorStop(1, this.rgba(gs.color, 0));
        c.fillStyle = mg; c.fillRect(mx - rad, my - rad, rad * 2, rad * 2);
      }
    }
    c.globalAlpha = 1;
    // fireflies / spores — crisp drifting light motes (no full-frame blur), biome-tinted
    const fce = this.biome === "shroom" ? "#b681ff" : "#cdff88", fcc = this.biome === "shroom" ? "#ecd9ff" : "#f2ffb0";
    for (let i = 0; i < 20; i++) {
      const t = this.tsec * 0.25 + i * 1.7;
      const wx = (12 + ((i * 79) % 46)) * T + Math.sin(t) * 22;
      const wy = (8 + ((i * 47) % 36)) * T + Math.cos(t * 0.8) * 16;
      if (this.map.get(Math.floor(wx / T), Math.floor(wy / T)) !== "grass") continue;
      const [sx, sy] = this.ren.w2s(cam, wx, wy);
      const pulse = 0.5 + 0.5 * Math.sin(this.tsec * 3 + i * 1.3), s = Math.max(1, cam.scale * 0.9);
      c.globalAlpha = pulse * 0.22; c.fillStyle = fce; c.fillRect(sx - s, sy - s, s * 3, s * 3);
      c.globalAlpha = pulse * 0.9; c.fillStyle = fcc; c.fillRect(sx, sy, s, s);
    }
    c.restore(); c.globalAlpha = 1;
  }

  protected onOverlay(g: CanvasRenderingContext2D): void {
    g.save();
    g.fillStyle = "rgba(6,12,22,.55)"; g.fillRect(10, 10, 300, 58);
    g.fillStyle = "#bfefff"; g.font = "12px monospace"; g.textBaseline = "middle";
    const title = this.biome === "shroom" ? "TILE LAB · Shroomwood (fungal ring)"
      : this.biome === "desert" ? "TILE LAB · The Dunes (desert oasis)"
      : this.blank ? "TILE LAB · CIRQLSPACE (your home ring)" : "TILE LAB · Cloverfield (meadow ring)";
    g.fillText(title, 20, 24);
    g.fillStyle = "#9fd6ff";
    g.fillText("WASD / Arrows to walk", 20, 40);
    g.fillText(this.loaded ? "hybrid: Cute Fantasy tiles + procedural light" : "loading…", 20, 55);
    g.restore();

    // floating name tags for places / NPCs / the player (crisp, display-res)
    if (!this.loaded) return;
    const sc = this.dispW / this.b.canvas.width;
    g.save();
    g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = "bold 15px 'Segoe UI', Arial, sans-serif"; g.lineWidth = 3.5;
    const tag = (wx: number, wy: number, text: string, color: string) => {
      const [bx, by] = this.ren.w2s(this.cam, wx, wy);
      const dx = bx * sc, dy = by * sc;
      if (dx < -60 || dx > this.dispW + 60 || dy < -10 || dy > this.dispH + 10) return;
      g.strokeStyle = "rgba(0,0,0,.8)"; g.strokeText(text, dx, dy);
      g.fillStyle = color; g.fillText(text, dx, dy);
    };
    for (const l of this.labels) if (!!l.cave === this.inCave) {
      const wx = l.follow ? l.follow.p.x : l.x, wy = l.follow ? l.follow.p.y - 40 : l.y;   // NPC tags ride above the wandering sprite
      tag(wx, wy, l.text, l.cave ? "#bff4ff" : "#ffffff");
    }
    tag(this.player.x, this.player.y - 30, "You", "#ffe28a");

    // "press E to talk" prompt floating over the target in reach (a soft bob)
    if (this.nearInter && !this.chatPaused) {
      const it = this.nearInter, bob = Math.sin(this.tsec * 4) * 3;
      const [bx, by] = this.ren.w2s(this.cam, it.x, it.y - 42);
      const dx = bx * sc, dy = by * sc + bob;
      const label = "▲ Press E to talk";
      g.font = "bold 13px 'Segoe UI', Arial, sans-serif";
      const w = g.measureText(label).width + 18;
      g.fillStyle = "rgba(10,16,28,.82)"; g.fillRect(dx - w / 2, dy - 13, w, 22);
      g.strokeStyle = "rgba(255,233,168,.5)"; g.lineWidth = 1; g.strokeRect(dx - w / 2, dy - 13, w, 22);
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "#ffe9a8"; g.fillText(label, dx, dy - 1);
      g.textBaseline = "alphabetic";
    }
    g.restore();
  }

  /** The fungal bonfire COMMONS — a clearing with a ring of stump seats + a mushroom-cap seat
   *  around a central fire (drawn procedurally). The ring's gathering spot. */
  private placeCommons(map: TileMap) {
    const cx = COMMONS.x, cy = COMMONS.y;
    const seats: [number, number][] = [[cx - 2, cy - 1], [cx + 2, cy - 1], [cx - 2, cy + 1], [cx + 2, cy + 1], [cx, cy - 2], [cx, cy + 2]];
    for (const [tx, ty] of seats) map.addProp({ sheet: "outdoor_decor", fw: 16, fh: 16, col: 1, row: 6, x: tx * T + T / 2, y: ty * T + T, solidR: 5 });   // a clean ring of stump seats
    map.setSolid(cx, cy, true);   // the fire — not walkable
    this.labels.push({ x: cx * T + T / 2, y: (cy - 3) * T, text: "The Ember Ring" });
  }

  /** A little wooden fishing pier off the pond's west bank (drawn over the water). */
  private drawPondDock(b: CanvasRenderingContext2D, cam: Camera) {
    const s = cam.scale, half = 0.7;
    const [sx, sy] = this.ren.w2s(cam, POND_DOCK.x0 * T, (POND_DOCK.y - half) * T);
    const pw = (POND_DOCK.x1 - POND_DOCK.x0) * T * s, ph = half * 2 * T * s;
    if (sx + pw < 0 || sx > cam.vw || sy + ph < 0 || sy > cam.vh) return;
    b.save();
    b.fillStyle = "#3a2415"; b.fillRect(sx + pw - 4 * s, sy - 1 * s, 3 * s, ph + 3 * s);   // end post
    b.fillStyle = "#8a5a34"; b.fillRect(sx, sy, pw, ph);                                     // deck
    b.fillStyle = "#6e4526";
    for (let i = 0; i <= POND_DOCK.x1 - POND_DOCK.x0; i++) b.fillRect(Math.round(sx + i * T * s), sy, Math.max(1, s), ph);   // plank seams
    b.fillStyle = "#5a3820"; b.fillRect(sx, sy, pw, Math.max(1, s)); b.fillRect(sx, sy + ph - Math.max(1, s), pw, Math.max(1, s));   // rails
    b.restore();
  }

  /** Draw the bonfire at the commons — warm glow, log base, flickering flames, rising embers. */
  private drawCommons(c: CanvasRenderingContext2D, cam: Camera) {
    const [sx, sy] = this.ren.w2s(cam, COMMONS.x * T + T / 2, COMMONS.y * T + T);
    const s = cam.scale;
    c.save();
    c.globalCompositeOperation = "lighter";
    const rad = 40 * s, a = this.reduce ? 0.28 : 0.3 + 0.12 * Math.sin(this.tsec * 6);
    const g = c.createRadialGradient(sx, sy - 4 * s, 0, sx, sy - 4 * s, rad);
    g.addColorStop(0, `rgba(255,178,86,${a})`); g.addColorStop(1, "rgba(255,140,60,0)");
    c.fillStyle = g; c.fillRect(sx - rad, sy - 4 * s - rad, rad * 2, rad * 2);
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "#4a2f1c"; c.fillRect(sx - 6 * s, sy - 3 * s, 12 * s, 4 * s);   // log base
    for (let i = 0; i < 5; i++) {                                                  // flickering flames
      const t = this.reduce ? i : this.tsec * 10 + i * 1.7;
      const fx = sx + (i - 2) * 2.6 * s + Math.sin(t) * 1.4 * s, fh = (6 + Math.sin(t * 1.3 + i) * 3) * s, fy = sy - 3 * s;
      c.fillStyle = i % 2 ? "#ff8a2a" : "#ffd23a";
      c.beginPath(); c.moveTo(fx - 2 * s, fy); c.lineTo(fx, fy - fh); c.lineTo(fx + 2 * s, fy); c.closePath(); c.fill();
    }
    if (!this.reduce) for (let i = 0; i < 6; i++) {                                // rising embers
      const ph = (this.tsec * 0.8 + i * 0.4) % 1, ex = sx + Math.sin(this.tsec * 2 + i) * 6 * s, ey = sy - 4 * s - ph * 20 * s;
      c.globalAlpha = (1 - ph) * 0.9; c.fillStyle = "#ffb84a"; const es = Math.max(1, s * 0.6); c.fillRect(ex, ey, es, es);
    }
    c.globalAlpha = 1; c.restore();
  }

  /** Juice the pond surface: drifting fish shadows, concentric ripples, sun sparkles, dragonflies. */
  private drawPondJuice(c: CanvasRenderingContext2D, cam: Camera) {
    if (this.reduce) return;
    const inPond = (wx: number, wy: number) => this.pondField(wx / T, wy / T) > 0.25;
    const cx = SPOND.cx * T, cy = SPOND.cy * T, RX = SPOND.rx * T, RY = SPOND.ry * T;
    c.save();
    // fish shadows gliding under the surface
    for (let i = 0; i < 3; i++) {
      const t = this.tsec * 0.22 + i * 2.1;
      const wx = cx + Math.cos(t) * RX * 0.5, wy = cy + Math.sin(t * 0.8) * RY * 0.5;
      if (!inPond(wx, wy)) continue;
      const [sx, sy] = this.ren.w2s(cam, wx, wy);
      c.globalAlpha = 0.2; c.fillStyle = "#0b2a3a";
      c.beginPath(); c.ellipse(sx, sy, 5 * cam.scale, 2.3 * cam.scale, t, 0, Math.PI * 2); c.fill();
    }
    c.globalCompositeOperation = "lighter";
    // concentric ripple rings
    const rings: [number, number][] = [[8, -6], [-10, 4], [2, 10]];
    for (let i = 0; i < rings.length; i++) {
      const ph = (this.tsec * 0.32 + i * 0.4) % 1, wx = cx + rings[i][0], wy = cy + rings[i][1];
      if (!inPond(wx, wy)) continue;
      const [sx, sy] = this.ren.w2s(cam, wx, wy);
      c.globalAlpha = (1 - ph) * 0.26; c.strokeStyle = "#c7f0ff"; c.lineWidth = Math.max(1, cam.scale * 0.5);
      c.beginPath(); c.arc(sx, sy, ph * 11 * cam.scale, 0, Math.PI * 2); c.stroke();
    }
    // sun sparkles on the water
    for (let i = 0; i < 12; i++) {
      const wx = cx + Math.sin(i * 2.1) * RX * 0.72, wy = cy + Math.cos(i * 1.3) * RY * 0.72;
      if (!inPond(wx, wy)) continue;
      const tw = 0.5 + 0.5 * Math.sin(this.tsec * 2 + i * 1.7);
      const [sx, sy] = this.ren.w2s(cam, wx, wy), s = Math.max(1, cam.scale * 0.6);
      c.globalAlpha = tw * 0.85; c.fillStyle = "#eaffff"; c.fillRect(sx, sy, s, s);
    }
    c.globalCompositeOperation = "source-over";
    // a couple of dragonflies darting above the water
    for (let i = 0; i < 2; i++) {
      const t = this.tsec * 0.7 + i * 3;
      const wx = cx + Math.cos(t * 1.3) * RX * 0.6, wy = cy + Math.sin(t) * RY * 0.6 - 5;
      const [sx, sy] = this.ren.w2s(cam, wx, wy), s = Math.max(1, cam.scale * 0.5);
      c.globalAlpha = 0.9; c.fillStyle = i ? "#8ad6ff" : "#d0a6ff"; c.fillRect(sx - s, sy, s * 2, s);
      c.globalAlpha = 0.4; c.fillRect(sx - s * 2, sy - s, s, s); c.fillRect(sx + s, sy - s, s, s);
    }
    c.globalAlpha = 1; c.restore();
  }

  /** "#rrggbb" + alpha → an rgba() string (for the per-mushroom glow gradients). */
  private rgba(hex: string, a: number): string {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  setZoom(z: number) { this.zoom = Math.max(1, Math.min(6, z)); }

  // ---- sheet inspector (decode exact cell coords for authoring) ----
  private inspectName: string | null = null;
  private inspectCell = 16;
  private inspectRegion: [number, number, number, number] | null = null;   // [c0,r0,cols,rows] to zoom
  inspect(name: string | null, cell = 16, region?: [number, number, number, number]) { this.inspectName = name; this.inspectCell = cell; this.inspectRegion = region ?? null; }
  private drawInspector(): void {
    const b = this.b, bw = b.canvas.width, bh = b.canvas.height;
    b.imageSmoothingEnabled = false;
    b.fillStyle = "#101820"; b.fillRect(0, 0, bw, bh);
    const sh = this.atlas.get(this.inspectName!);
    const cs = this.inspectCell;
    const rg = this.inspectRegion ?? [0, 0, Math.floor(sh.w / cs), Math.floor(sh.h / cs)];
    const [c0, r0, cols, rows] = rg;
    const sx = c0 * cs, sy = r0 * cs, sw = cols * cs, shh = rows * cs;
    const z = Math.max(1, Math.floor(Math.min((bw - 40) / sw, (bh - 40) / shh)));
    const ox = 20, oy = 20;
    sh.draw(b, sx, sy, sw, shh, ox, oy, sw * z, shh * z);
    b.strokeStyle = "rgba(120,220,255,.6)"; b.lineWidth = 1;
    b.font = `${Math.max(9, cs * z / 3)}px monospace`; b.fillStyle = "#7fe";
    for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
      b.strokeRect(ox + cc * cs * z, oy + r * cs * z, cs * z, cs * z);
      if (z >= 2) b.fillText(`${c0 + cc},${r0 + r}`, ox + cc * cs * z + 2, oy + r * cs * z + cs * z / 3);
    }
    b.fillStyle = "#bfefff"; b.font = "14px monospace";
    b.fillText(`${this.inspectName}  ${sh.w}x${sh.h} @${cs}  region ${c0},${r0} ${cols}x${rows}`, ox, bh - 12);
  }
}

export default function TileLabPage() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<TileLabEngine | null>(null);
  const [near, setNear] = useState<Speaker | null>(null);   // a talkable target in reach
  const [talking, setTalking] = useState<Speaker | null>(null);   // the open conversation

  useEffect(() => {
    if (!canvas.current) return;
    // /tile-lab?cirqlspace (or ?blank) → the blank personal home ring
    // /tile-lab?biome=shroom (or ?shroom) → the ShroomLands biome ring "The Shroomwood"
    const q = new URLSearchParams(window.location.search);
    const blank = q.has("cirqlspace") || q.has("blank");
    const bq = q.get("biome");
    const biome: Biome = bq === "shroom" || q.has("shroom") ? "shroom"
      : bq === "desert" || q.has("desert") || q.has("dunes") ? "desert"
      : "meadow";
    const eng = new TileLabEngine(canvas.current, {}, blank, biome);
    engRef.current = eng;
    eng.onProximity = (s) => setNear(s);
    eng.onTalk = (s) => { eng.setChatOpen(true); setNear(null); setTalking(s); };
    if (import.meta.env.DEV) (window as any).__tilelab = { eng, anim: PLAYER_ANIM };
    return () => eng.destroy();
  }, []);

  const closeChat = () => { engRef.current?.setChatOpen(false); setTalking(null); };
  const openChat = () => { if (near) { engRef.current?.setChatOpen(true); setTalking(near); setNear(null); } };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#05040f", touchAction: "none" }}>
      <div className="absolute left-4 top-4 z-10">
        <Link href="/" className="flex items-center gap-1 text-xs text-cyan-300/70 hover:text-cyan-200" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>
      <canvas ref={canvas} className="block h-full w-full" style={{ imageRendering: "pixelated" }} />

      {/* Talk button — appears when a villager or the Fountain is in reach (tap or press E) */}
      {near && !talking && (
        <button
          onClick={openChat}
          data-testid="button-talk"
          className="fixed bottom-6 left-1/2 z-[55] -translate-x-1/2 rounded-full border border-amber-300/50 bg-[#0b1120]/90 px-5 py-2.5 text-sm font-semibold text-amber-100 shadow-lg backdrop-blur transition hover:scale-105 hover:border-amber-300"
        >
          💬 Talk to {near.name}
        </button>
      )}

      {talking && <OracleChat speaker={talking} onClose={closeChat} />}
    </div>
  );
}
