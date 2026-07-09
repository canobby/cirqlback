import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { RetroEngine, type RetroHooks } from "@/game/retro-engine";
import {
  cuteFantasyAtlas, TileMap, TileRenderer, Actor, PLAYER_ANIM,
  type Atlas, type Camera, type Drawable,
} from "@/game/tile";

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

// A natural, medium, non-circular pond — drawn with the Cute Fantasy pack's own
// grass-bordered water tiles (water_blob + water_middle), kept well inside the ring.
const SPOND = { cx: 30, cy: 33, rx: 5, ry: 3.9 };

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
  // The Shroomwood — a twilight fungal grove: dusky teal moss floor. No fountain
  // (town-only); a natural pack-tiled pond is its water. Neon lives in the LIGHT layer.
  shroom: { glite: [104, 150, 118], gdark: [42, 74, 78], grassOpaque: true },
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
    // water renders nothing here — the pond is painted procedurally into the ground
    // canvas (Path A) so its colours always match the floor (no sprite/background clash)
    this.ren = new TileRenderer(this.atlas);
    this.atlas.loadAll().then(() => { this.buildLogo(); this.loaded = true; }).catch((e) => console.error(e));
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

      const sheep = (tx: number, ty: number) => map.addProp({ sheet: "sheep", fw: 32, fh: 32, col: 0, row: 0, x: tx * T, y: ty * T, solidR: 6 });
      for (const [tx, ty] of [[18, 40], [21, 42], [16, 38], [23, 39]] as [number, number][]) sheep(tx, ty);
      const chick = (tx: number, ty: number) => map.addProp({ sheet: "chicken", fw: 32, fh: 32, col: 0, row: 0, x: tx * T, y: ty * T });
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
    // 1) a natural, medium POND — kept well inside the ring (never the coast). The water
    //    tiles carry collision only (renders nothing); the pool itself is painted into the
    //    procedural ground canvas so its colours match the floor. Paint FIRST so nothing spawns in it.
    map.solidTerrain.add("water");
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++)
      if (map.get(tx, ty) === "grass" && this.pondField(tx + 0.5, ty + 0.5) > 0) { map.set(tx, ty, "water"); map.setSolid(tx, ty, true); }
    this.placePondDecor(map);
    this.labels.push({ x: SPOND.cx * T, y: (SPOND.cy + SPOND.ry + 1.6) * T, text: "Mistmere" });

    // 2) Shroom Hollow — a spread-out hamlet of mushroom houses (NW of the fountain, in the open)
    const house = (sheet: string, w: number, h: number, tx: number, ty: number, sc = 1) =>
      map.addProp({ sheet, fw: w, fh: h, col: 0, row: 0, x: tx * T + T / 2, y: ty * T + T, scale: sc, solidR: w * sc * 0.34, overhead: false });
    house("shroom_house1", 80, 80, 25, 16, 0.9);
    house("shroom_house2", 48, 64, 40, 13, 1);
    house("shroom_house3", 48, 64, 45, 19, 1);
    house("shroom_house2", 48, 64, 20, 21, 1);
    house("shroom_house3", 48, 64, 47, 27, 1);
    this.labels.push({ x: 30 * T, y: 11 * T, text: "Shroom Hollow" });

    // 3) the glowing giant-mushroom grove (replaces the oak grove) + a few landmark caps by the village
    this.placeShroomGrove(map);
    const GIANTS: [string, string, number, number, number][] = [
      ["shroom_purple", "#c07bff", 33, 19, 1.3], ["shroom_blue", "#79d0ff", 25, 22, 1.1],
      ["shroom_red", "#ff8a7b", 44, 24, 1.15], ["shroom_purple", "#c07bff", 43, 21, 1.2],
    ];
    for (const [sheet, color, tx, ty, sc] of GIANTS) this.giantShroom(map, sheet, color, tx, ty, sc);

    // 4) density — mushroom clusters + mossy rocks (replaces the meadow's flower clumps)
    this.placeShroomDecor(map);

    // 5) life — round shroomling critters + snails, grazing in the open (creatures stay round)
    const shroomling = (tx: number, ty: number) => map.addProp({ sheet: "shroomling", fw: 32, fh: 48, col: 0, row: 0, x: tx * T, y: ty * T, solidR: 5 });
    for (const [tx, ty] of [[18, 34], [21, 36], [16, 31], [46, 33], [43, 36]] as [number, number][]) shroomling(tx, ty);
    const shroomling2 = (tx: number, ty: number) => map.addProp({ sheet: "shroomling2", fw: 32, fh: 32, col: 0, row: 0, x: tx * T, y: ty * T, solidR: 4 });
    for (const [tx, ty] of [[23, 28], [50, 22], [24, 40]] as [number, number][]) shroomling2(tx, ty);
    const snail = (tx: number, ty: number) => map.addProp({ sheet: "snail", fw: 16, fh: 16, col: 0, row: 0, x: tx * T, y: ty * T });
    for (const [tx, ty] of [[36, 30], [30, 38], [45, 30]] as [number, number][]) snail(tx, ty);

    // 6) two villagers, out in open clearings (well clear of the pond)
    map.addProp({ sheet: "farmer", fw: 64, fh: 64, col: 0, row: 0, ay: 0.66, x: 39 * T, y: 27 * T, solidR: 6 });
    map.addProp({ sheet: "fisher", fw: 64, fh: 64, col: 0, row: 0, ay: 0.66, x: 38 * T, y: 39 * T, solidR: 6 });
    this.labels.push(
      { x: 39 * T, y: 27 * T - 30, text: "Mycel" },
      { x: 38 * T, y: 39 * T - 30, text: "Spora" },
    );
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

  /** Cattails / lily pads / water rocks clumped naturally around the pond (pack water-edge decor). */
  private placePondDecor(map: TileMap) {
    const rnd = rng(313);
    for (let ty = SPOND.cy - SPOND.ry - 2; ty <= SPOND.cy + SPOND.ry + 2; ty++)
      for (let tx = SPOND.cx - SPOND.rx - 2; tx <= SPOND.cx + SPOND.rx + 2; tx++) {
        const f = this.pondField(tx + 0.5, ty + 0.5);
        if (f > -1.1 && f < -0.15 && map.get(tx, ty) === "grass" && rnd() < 0.4)   // a grassy bank tile
          map.addProp({ sheet: rnd() < 0.55 ? "cattail" : "watergrass", fw: 16, fh: 16, col: 0, row: 0, x: tx * T + rnd() * T, y: ty * T + T });
        else if (f > 0.25 && map.get(tx, ty) === "water" && rnd() < 0.14)          // a lily pad on the water
          map.addProp({ sheet: rnd() < 0.5 ? "lilypad1" : "lilypad2", fw: 16, fh: 16, col: 0, row: 0, x: tx * T + rnd() * T, y: ty * T + T });
      }
  }

  /** One giant mushroom (top-row cap @32×48), depth-sorted, casting a crisp neon glow. */
  private giantShroom(map: TileMap, sheet: string, color: string, tx: number, ty: number, sc = 1) {
    if (!this.insideEdge(tx, ty, 5) || !this.pondClear(tx, ty)) return;
    const cap = Math.floor(hash2(tx, ty) * 4);   // one of the 4 caps in the top row
    map.addProp({ sheet, fw: 32, fh: 48, col: cap, row: 0, x: tx * T + T / 2, y: ty * T + T, scale: sc, overhead: true, solidR: 6 * sc });
    this.glowSpots.push({ x: tx * T + T / 2, y: ty * T + 12 * sc, color, r: 18 * sc });   // a tight glow at the cap (no smear)
  }

  /** A grove ring of giant mushrooms, set a safe margin inside the shore (like the meadow's trees). */
  private placeShroomGrove(map: TileMap) {
    const rnd = rng(909);
    const kinds: [string, string][] = [["shroom_purple", "#c07bff"], ["shroom_blue", "#79d0ff"], ["shroom_red", "#ff8a7b"]];
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      if (map.get(tx, ty) !== "grass") continue;
      const g = this.landField(tx + 0.5, ty + 0.5);
      if (g < 5 || g > 8.4) continue;                 // a grove band well inside the edgepoint
      if (rnd() < 0.1) { const [sheet, color] = kinds[Math.floor(rnd() * 3)]; this.giantShroom(map, sheet, color, tx, ty, 0.8 + rnd() * 0.4); }
    }
  }

  /** Small mushroom clusters + mossy rocks for density (in the meadow + around the houses). */
  private placeShroomDecor(map: TileMap) {
    const rnd = rng(2024);
    const centers: [number, number][] = [[22, 30], [45, 32], [28, 36], [18, 27], [42, 27], [34, 42]];
    for (const p of map.props) if (p.solidR && p.solidR >= 12) centers.push([Math.round(p.x / T) + (rnd() < 0.5 ? -3 : 3), Math.round(p.y / T) + 2]);
    for (const [cx, cy] of centers) {
      const n = 3 + Math.floor(rnd() * 5);
      for (let i = 0; i < n; i++) {
        const tx = cx + Math.round((rnd() - 0.5) * 4), ty = cy + Math.round((rnd() - 0.5) * 4);
        if (map.get(tx, ty) !== "grass" || !this.insideEdge(tx, ty, 3) || !this.pondClear(tx, ty, 1.4)) continue;
        if (rnd() < 0.6) map.addProp({ sheet: "shroom_other", fw: 16, fh: 16, col: Math.floor(rnd() * 3), row: 1 + Math.floor(rnd() * 5), x: tx * T + rnd() * T, y: ty * T + T });
        else map.addProp({ sheet: "shroom_rocks", fw: 16, fh: 16, col: Math.floor(rnd() * 4), row: Math.floor(rnd() * 4), x: tx * T + rnd() * T, y: ty * T + T });
      }
    }
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
    const pal = this.bpal, GDARK = pal.gdark, GLITE = pal.glite;
    for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
      const tx = (px + 0.5) / (T * SS), ty = (py + 0.5) / (T * SS), g = this.landField(tx, ty);
      const n = hash2(px, py);
      let col: number[], a = 255;
      // clean grass → sand → foam → shallow → deep bands (no grass/sand blending)
      if (g > 1.4) {                                        // grass meadow shading
        const v = this.meadow(tx, ty);
        if (pal.grassOpaque) {                              // biome recolour — paint the ground fully
          const grain = (n - 0.5) * 16; col = mix3(GDARK, GLITE, (v + 1) / 2).map((c) => c + grain); a = 232;
        } else { col = v < 0 ? GDARK : GLITE; a = Math.round(Math.abs(v) * 46); }   // meadow: subtle overlay
      } else if (g > 0.1) {                                 // sand — grainy
        const grain = (n - 0.5) * 40, base = mix3(SANDD, SAND, smoothstep(0.1, 1.2, g));
        col = [base[0] + grain, base[1] + grain, base[2] + grain * 0.8];
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
        } else if (pd > -1.0) {                              // damp bank: darken the moss toward the water
          col = mix3(col, PDAMP, smoothstep(-1.0, -0.22, pd) * 0.5);
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
    // crafted land tiles (grass + river + road); the ocean is void
    this.ren.drawGround(b, this.map, this.cam);
    // textured sandy coast + procedural inland water + meadow shading, then shore foam
    this.blitCoast(b);
    this.drawShoreFoam(b, this.cam);
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
