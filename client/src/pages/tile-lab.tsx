import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { RetroEngine, type RetroHooks } from "@/game/retro-engine";
import {
  cuteFantasyAtlas, TileMap, TileRenderer, Actor, PLAYER_ANIM,
  DEFAULT_TERRAIN,
  type Atlas, type Camera, type Drawable, type TerrainConfig, type Prop,
} from "@/game/tile";

// A living critter: a placed prop that frame-animates in place and gently wanders near home.
interface Critter {
  p: Prop; gx: number; gy: number; hx: number; hy: number;    // current ground pos + home
  baseCol: number; frames: number; fps: number; ph: number;   // frame animation
  bob: number; wr: number; sp: number;      // idle-bob height · wander radius (tiles) · speed (px/s)
  tx: number; ty: number; nt: number;       // current wander target + time-to-retarget
  water: boolean;                           // stays in the pond (duck) vs. on land
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
const TUFTS: [number, number][] = [[6, 2], [6, 3], [7, 3], [8, 3], [6, 8], [7, 8]];
const DFLOWERS: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 2], [4, 2]];
const PEBBLES: [number, number][] = [[0, 5], [1, 5], [6, 5], [7, 5]];   // dry grass rocks (no blue-water base)
const DBUSH: [number, number] = [5, 5];

// A ring's biome = a palette recolor + a different prop kit + optional inland water.
// Proves the locked rules generalise: same procedural beach + edgepoint margins +
// water-inside-the-ring, just a new coat of Cute-Fantasy (here the ShroomLands DLC).
type Biome = "meadow" | "shroom";
interface BiomePalette {
  glite: number[]; gdark: number[];   // meadow grass shading (raised / shadowed)
  grassOpaque: boolean;               // paint the ground fully (recolour the biome) vs. a subtle overlay
}
const PALETTES: Record<Biome, BiomePalette> = {
  // the loved meadow — unchanged (subtle green shading over the grass tile, no inland water)
  meadow: { glite: [150, 202, 98], gdark: [44, 94, 46], grassOpaque: false },
  // The Shroomwood — an enchanted fungal forest. Cohesive palette: sunlit lush green →
  // deep cool forest-green (teal undertone), flowed as soft tonal patches over the grass
  // tiles so colour reads natural + enhanced. No fountain (town-only). Neon in the LIGHT layer.
  shroom: { glite: [142, 190, 116], gdark: [44, 96, 82], grassOpaque: false },
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
  private labels: { x: number; y: number; text: string }[] = [];   // place/NPC name tags (world px)
  private critters: Critter[] = [];                                // animals that frame-animate + wander

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}, blank = false, biome: Biome = "meadow") {
    super(canvas, hooks, 320, 200);
    this.blank = blank;
    this.biome = biome;
    this.hasFountain = biome !== "shroom";   // wild rings have no fountain — that's the town's
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
      : undefined;
    this.ren = new TileRenderer(this.atlas, terr);
    this.atlas.loadAll().then(() => { this.buildLogo(); this.buildGrassTexture(); this.loaded = true; }).catch((e) => console.error(e));
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
    // spawn on clear land near the fountain (shroom: west of the rivulet)
    const [ssx, ssy] = this.biome === "shroom" ? [(CX - 7) * T, (CY + 1) * T] : [CX * T, (CY + 5) * T];
    [this.player.x, this.player.y] = this.snapToLand(map, ssx, ssy);
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    this.buildCoast();
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
      const fc = Math.floor(rnd() * 10), fr = Math.floor(rnd() * 10);
      this.cluster(map, rnd, cx, cy, 2, 4, (tx, ty) => map.addProp({ sheet: "flowers", fw: 16, fh: 16, col: fc, row: fr, x: tx * T + rnd() * T, y: ty * T + rnd() * T }));
    }
    this.cluster(map, rnd, 13, 20, 2, 2, (tx, ty) => map.addProp({ sheet: "tree_oak_med", fw: 32, fh: 48, col: Math.floor(rnd() * 3), row: 0, x: tx * T + 4, y: ty * T + 6, overhead: true, solidR: 5 }));
    map.addProp({ sheet: "tree_oak", fw: 64, fh: 80, col: 0, row: 0, x: 12 * T + 8, y: 15 * T + 12, overhead: true, solidR: 7 });
    // a fenced kitchen garden by an east hut — flower beds inside (fences around the homes)
    this.fenceRect(map, 25, 20, 29, 23, 27);
    const gc = Math.floor(rnd() * 10), gr = Math.floor(rnd() * 10);
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
      else if (r < dens * 0.72) {                                                                                                             // dense understory (forest floor)
        if (rnd() < 0.5) map.addProp({ sheet: "shroom_other", fw: 16, fh: 16, col: Math.floor(rnd() * 3), row: 1 + Math.floor(rnd() * 5), x: tx * T + rnd() * T, y: ty * T + T });
        else map.addProp({ sheet: "shroom_rocks", fw: 16, fh: 16, col: Math.floor(rnd() * 4), row: Math.floor(rnd() * 4), x: tx * T + rnd() * T, y: ty * T + T });
      }
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
      if (kind === "flower") { const fc = Math.floor(rnd() * 10), fr = Math.floor(rnd() * 10); this.cluster(map, rnd, cx, cy, 2, 4 + Math.floor(rnd() * 3), (tx, ty) => map.addProp({ sheet: "flowers", fw: 16, fh: 16, col: fc, row: fr, x: tx * T + rnd() * T, y: ty * T + rnd() * T })); }
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
    o: { frames?: number; fps?: number; bob?: number; wr?: number; sp?: number; water?: boolean; solidR?: number } = {}) {
    map.addProp({ sheet, fw, fh, col, row, x: tx * T, y: ty * T, solidR: o.solidR ?? 0 });
    const p = map.props[map.props.length - 1];
    this.critters.push({
      p, gx: p.x, gy: p.y, hx: p.x, hy: p.y, baseCol: col, frames: o.frames ?? 1, fps: o.fps ?? 4,
      ph: ((tx * 7 + ty * 13) % 100) / 100 * 6.28, bob: o.bob ?? 1.4, wr: o.wr ?? 0, sp: o.sp ?? 8,
      tx: p.x, ty: p.y, nt: 0, water: o.water ?? false,
    });
  }

  /** Animate + wander every critter (called each frame). */
  private updateCritters(dt: number) {
    for (const c of this.critters) {
      if (c.frames > 1) c.p.col = c.baseCol + (Math.floor(this.tsec * c.fps + c.ph) % c.frames);   // frame cycle
      if (c.wr > 0) {
        c.nt -= dt;
        if (c.nt <= 0) {                                   // pick a fresh wander target near home
          const a = this.tsec * 0.6 + c.ph;
          c.tx = c.hx + Math.cos(a) * c.wr * T; c.ty = c.hy + Math.sin(a * 1.7) * c.wr * T;
          c.nt = 2.5 + (c.ph % 2);
        }
        const dx = c.tx - c.gx, dy = c.ty - c.gy, d = Math.hypot(dx, dy);
        if (d > 1.5) {
          const step = Math.min(d, c.sp * dt), nx = c.gx + dx / d * step, ny = c.gy + dy / d * step;
          const ok = c.water ? this.pondField(nx / T, ny / T) > 0.5 : (this.landField(nx / T, ny / T) > 2.5 && !this.blocked(nx, ny, 4));
          if (ok) { c.gx = nx; c.gy = ny; if (Math.abs(dx) > 4) c.p.flip = dx < 0; } else c.nt = 0;   // face travel direction
        }
      }
      const bob = this.reduce ? 0 : Math.abs(Math.sin(this.tsec * 3 + c.ph)) * c.bob;   // a gentle hop
      c.p.x = c.gx; c.p.y = c.gy - bob;
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
    const peb = (tx: number, ty: number) => cell("outdoor_decor", PEBBLES[Math.floor(rnd() * PEBBLES.length)])(tx, ty);
    const cap = (tx: number, ty: number) => map.addProp({ sheet: "shroom_other", fw: 16, fh: 16, col: Math.floor(rnd() * 3), row: 1 + Math.floor(rnd() * 5), x: tx * T + rnd() * T, y: ty * T + T });
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      if (map.get(tx, ty) !== "grass" || !this.insideEdge(tx, ty, 3.5) || !this.pondClear(tx, ty, 2.6) || this.inField(tx, ty) || Math.hypot(tx - COMMONS.x, ty - COMMONS.y) < 2.6) continue;
      const clump = Math.sin(tx * 0.45 + 0.3) * Math.sin(ty * 0.4 - 0.7) * Math.sin((tx + ty) * 0.2);   // big-med-small waves
      const onPath = this.laneDist(tx + 0.5, ty + 0.5) < 2.6;
      const p = 0.05 + Math.max(0, clump) * 0.32 + (onPath ? 0.3 : 0);
      if (rnd() > p) continue;
      if (this.nearBigProp(map, tx * T + T / 2, ty * T + T, 13)) continue;   // don't scatter detail onto a cap/trunk/house
      const r = rnd();   // mostly green tufts + pebbles; flowers kept sparse so colour stays calm
      if (r < 0.56) tuft(tx, ty); else if (r < 0.68) flow(tx, ty); else if (r < 0.9) peb(tx, ty); else cap(tx, ty);
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
    const put = (sheet: string, tx: number, ty: number, extra: object = {}) => map.addProp({ sheet, fw: 16, fh: 16, col: 0, row: 0, x: tx * T + rnd() * T, y: ty * T + T, ...extra });
    for (let ty = Math.floor(SPOND.cy - SPOND.ry) - 3; ty <= Math.ceil(SPOND.cy + SPOND.ry) + 3; ty++)
      for (let tx = Math.floor(SPOND.cx - SPOND.rx) - 3; tx <= Math.ceil(SPOND.cx + SPOND.rx) + 3; tx++) {
        const f = this.pondField(tx + 0.5, ty + 0.5);
        if (f > -2.1 && f < -0.05 && map.get(tx, ty) === "grass") {                  // the grassy bank — a lush belt of reeds/stones/overhang
          const r = rnd();
          if (r < 0.78) put(rnd() < 0.5 ? "cattail" : "watergrass", tx, ty);         // reeds/cattails (a dense belt)
          else if (r < 0.9) put(rnd() < 0.5 ? "waterrock1" : "waterrock2", tx, ty);  // encircling stones
          else if (r < 0.9 && f < -0.7) {                                            // an overhanging bush
            if (rnd() < 0.5) map.addProp({ sheet: "tree_oak_med", fw: 32, fh: 48, col: Math.floor(rnd() * 3), row: 0, x: tx * T + 4, y: ty * T + 6, overhead: true, solidR: 4 });
            else map.addProp({ sheet: "outdoor_decor", fw: 16, fh: 16, col: DBUSH[0], row: DBUSH[1], x: tx * T + rnd() * T, y: ty * T + T, solidR: 3 });
          }
        } else if (f > 0.25 && map.get(tx, ty) === "water") {                        // the water — lily pads + floating reeds + rocks
          const r = rnd();
          if (r < 0.42) put(rnd() < 0.5 ? "lilypad1" : "lilypad2", tx, ty);          // lily pads afloat
          else if (r < 0.56 && f < 1.2) put("watergrass", tx, ty);                   // floating reeds in the shallows
          else if (r < 0.5) put("waterrock1", tx, ty);                               // a rock breaking the surface
        }
      }
    // a bench overlooking the water (SE bank) + stepping stones across the north shallows
    map.addProp({ sheet: "benches", fw: 32, fh: 32, col: 0, row: 0, x: (SPOND.cx + 3) * T, y: (SPOND.cy + SPOND.ry) * T });
    for (let i = 0; i < 4; i++) map.addProp({ sheet: i % 2 ? "waterrock1" : "waterrock2", fw: 16, fh: 16, col: 0, row: 0, x: (SPOND.cx - 2 + i) * T + 4, y: (SPOND.cy - SPOND.ry + 1) * T + T });
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
    const PDEEP = [36, 84, 108], PSHAL = [96, 160, 168], PWL = [176, 214, 210], PDAMP = [30, 54, 58];
    const PATHC = [150, 128, 92];   // a trodden footpath — defined worn earth (painted, not tiled)
    const pal = this.bpal, GDARK = pal.gdark, GLITE = pal.glite;
    for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
      const tx = (px + 0.5) / (T * SS), ty = (py + 0.5) / (T * SS), g = this.landField(tx, ty);
      const n = hash2(px, py);
      let col: number[], a = 255;
      // clean grass → sand → foam → shallow → deep bands (no grass/sand blending)
      if (g > 1.55) {                                       // grass — soft, cohesive biome tone flows over the textured tiles (ALL rings)
        const t = 0.5 + 0.5 * (this.meadow(tx, ty) * 0.78 + Math.sin(tx * 0.9 + 1) * Math.sin(ty * 0.8) * 0.22);
        col = mix3(GDARK, GLITE, Math.max(0, Math.min(1, t))); a = 58;
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
          if (pd > -1.0) col = mix3(col, PDAMP, smoothstep(-1.0, -0.22, pd) * 0.5);   // damp bank
          const ld = this.laneDist(tx, ty);                  // the footpath (leading line: plaza → pond)
          if (ld < 1.7) { const grain = (n - 0.5) * 16, worn = 1 - smoothstep(0.5, 1.7, ld); col = mix3(col, [PATHC[0] + grain, PATHC[1] + grain, PATHC[2] + grain], worn * 0.82); }
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
      const fc = Math.floor(rnd() * 10), fr = Math.floor(rnd() * 10);   // one flower type per clump
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
    this.updateCritters(dt);
    const k = Math.min(1, dt * 6);
    this.cam.x += (this.player.x - this.cam.x) * k;
    this.cam.y += (this.player.y - this.cam.y) * k;
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
    this.ren.drawEntities(b, this.map, this.cam, extra);
    if (this.hasFountain) this.drawLogo(b);   // the spinning CIRQLBACK emblem over the wellspring
    this.drawLight(b, this.cam);
    if (this.biome === "shroom") { this.drawPondJuice(b, this.cam); this.drawCommons(b, this.cam); }   // ripples/fish + the bonfire
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
    g.textAlign = "center"; g.textBaseline = "alphabetic"; g.font = "bold 12px 'Segoe UI', Arial, sans-serif"; g.lineWidth = 3;
    const tag = (wx: number, wy: number, text: string, color: string) => {
      const [bx, by] = this.ren.w2s(this.cam, wx, wy);
      const dx = bx * sc, dy = by * sc;
      if (dx < -60 || dx > this.dispW + 60 || dy < -10 || dy > this.dispH + 10) return;
      g.strokeStyle = "rgba(0,0,0,.8)"; g.strokeText(text, dx, dy);
      g.fillStyle = color; g.fillText(text, dx, dy);
    };
    for (const l of this.labels) tag(l.x, l.y, l.text, "#ffffff");
    tag(this.player.x, this.player.y - 30, "You", "#ffe28a");
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
  useEffect(() => {
    if (!canvas.current) return;
    // /tile-lab?cirqlspace (or ?blank) → the blank personal home ring
    // /tile-lab?biome=shroom (or ?shroom) → the ShroomLands biome ring "The Shroomwood"
    const q = new URLSearchParams(window.location.search);
    const blank = q.has("cirqlspace") || q.has("blank");
    const biome: Biome = q.get("biome") === "shroom" || q.has("shroom") ? "shroom" : "meadow";
    const eng = new TileLabEngine(canvas.current, {}, blank, biome);
    if (import.meta.env.DEV) (window as any).__tilelab = { eng, anim: PLAYER_ANIM };
    return () => eng.destroy();
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#05040f", touchAction: "none" }}>
      <div className="absolute left-4 top-4 z-10">
        <Link href="/" className="flex items-center gap-1 text-xs text-cyan-300/70 hover:text-cyan-200" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>
      <canvas ref={canvas} className="block h-full w-full" style={{ imageRendering: "pixelated" }} />
    </div>
  );
}
