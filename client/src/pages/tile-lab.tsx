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
const WELL = { x: 33, y: 24 };   // wellspring (tiles) — sits at the head of the river
const ROAD_Y = 34;               // the east-west lane's latitude
const RIVER_X = 33;              // the river runs straight down this column

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
  private zoom = 2.2;
  private loaded = false;
  private tsec = 0;
  private falls: { x: number; y: number }[] = [];   // river-mouth glow points (world px)
  private riverCol: number[] = [];                  // river centre x (tiles) per row — for a meandering channel
  private coast!: HTMLCanvasElement;                // pre-rendered textured beach/ocean layer
  private coastSS = 2;                              // super-sample factor of the coast canvas
  private shore: { x: number; y: number }[] = [];   // shoreline contour points (world px) for animated foam
  private logo: HTMLCanvasElement | null = null;    // CIRQLBACK mark, cream keyed to transparent

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 320, 200);
    this.fit = true; this.fitPx = 3;
    this.crt = false;
    this.resize();
    this.buildIsland();
    this.ren = new TileRenderer(this.atlas);
    this.atlas.loadAll().then(() => { this.buildLogo(); this.loaded = true; }).catch((e) => console.error(e));
    this.start();
  }

  // ---------- island geometry ----------
  private land(tx: number, ty: number): boolean {
    const dx = (tx - CX) / RX, dy = (ty - CY) / RY;
    const ang = Math.atan2(ty - CY, tx - CX);
    const d = dx * dx + dy * dy;
    const R = 1 + 0.035 * Math.sin(ang * 2 + 0.6);   // one gentle low-freq wave → smooth shore, no 1-tile jaggies
    if (d >= R) return false;
    // carve a round bay on the west for the dock + fisherman
    if ((tx - 10) ** 2 + (ty - 33) ** 2 < 20) return false;
    return true;
  }

  // ---------- author the whole island ----------
  private buildIsland() {
    const map = new TileMap(MW, MH, T, "sea");   // ocean = void; the smooth beach/coast is drawn procedurally
    map.solidTerrain.add("sea");
    // 1) the grass island
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (this.land(tx, ty)) map.set(tx, ty, "grass");

    // 2) the road first (west cove → east) so the river then cuts a continuous
    //    channel straight through it (the bridge carries the road over the water).
    map.paintLine(9, ROAD_Y, 58, ROAD_Y - 1, "path", 3);

    // 3) the wellspring: a round source pool (its stone plaza is drawn procedurally, round)
    map.paintCircle(WELL.x, WELL.y + 1, 1.6, "water");      // the round source pool

    // 4) the river of light — a gently MEANDERING channel of varied width, pool → south rim
    this.riverCol = new Array(MH).fill(-1);
    for (let ty = WELL.y + 2; ty <= 47; ty++) {
      const cx = RIVER_X + Math.sin((ty - WELL.y) * 0.26) * 2.4;      // soft S-curve
      const w = 3 + (Math.sin(ty * 0.55) > 0.45 ? 1 : 0);            // occasional widening
      const half = Math.ceil((w - 1) / 2);
      for (let dx = -half; dx <= half; dx++) map.set(Math.round(cx) + dx, ty, "water");
      this.riverCol[ty] = cx;
    }

    // 5) the bridge, where the straight lane crosses the meandering river
    this.placeBridge(map, ROAD_Y, Math.round(this.riverCol[ROAD_Y]));

    // 6) buildings — spread out, each near where it "wants to be"
    const H = (sheet: string, w: number, h: number, tx: number, ty: number, sc = 1, sr?: number) =>
      map.addProp({ sheet, fw: w, fh: h, col: 0, row: 0, x: tx * T + T / 2, y: ty * T + T, scale: sc, solidR: sr ?? w * sc * 0.33, overhead: false });
    H("windmill", 128, 112, 29, 11, 1);                 // high ground, north
    H("inn", 240, 192, 41, 12, 0.8);                    // the village inn
    H("house1", 96, 128, 25, 18, 1);
    H("house2", 144, 128, 45, 20, 1);
    H("house3", 144, 128, 24, 27, 1);
    H("house4", 112, 96, 47, 28, 1);
    H("fisherman", 96, 112, 14, 27, 1);                 // above the west cove (on land)

    // 7) wellspring centrepiece — a fountain rising from its pool (logo spins above)
    map.addProp({ sheet: "fountain", fw: 32, fh: 80, col: 0, row: 0, x: WELL.x * T + T / 2, y: (WELL.y + 1) * T, solidR: 9 });

    // 8) trees — inland singles + a light grove framing the shore
    const oak = (tx: number, ty: number, col = 1) =>
      map.addProp({ sheet: "tree_oak", fw: 64, fh: 80, col, row: 0, x: tx * T + 8, y: ty * T + 12, overhead: true, solidR: 7 });
    for (const [tx, ty] of [[52, 15], [55, 18], [50, 20], [15, 15], [18, 12], [50, 34]] as [number, number][]) oak(tx, ty, 1 + ((tx + ty) % 2));
    this.placeShoreTrees(map);

    // 9) natural flower clumps (meadows + around the houses), not a grid
    this.placeFlowerClumps(map);

    // 10) riverbank life — cattails / lily pads / water rocks in clumps
    this.placeRiverDecor(map);

    // 11) life — grazing sheep, chickens, and two villager NPCs (all kept off water)
    const sheep = (tx: number, ty: number) => map.addProp({ sheet: "sheep", fw: 32, fh: 32, col: 0, row: 0, x: tx * T, y: ty * T, solidR: 6 });
    for (const [tx, ty] of [[18, 40], [21, 42], [16, 38], [23, 39]] as [number, number][]) sheep(tx, ty);
    const chick = (tx: number, ty: number) => map.addProp({ sheet: "chicken", fw: 32, fh: 32, col: 0, row: 0, x: tx * T, y: ty * T });
    for (const [tx, ty] of [[27, 20], [29, 21], [43, 24]] as [number, number][]) chick(tx, ty);
    map.addProp({ sheet: "farmer", fw: 64, fh: 64, col: 0, row: 0, ay: 0.66, x: 30 * T, y: 26 * T, solidR: 6 }); // by the plaza
    map.addProp({ sheet: "fisher", fw: 64, fh: 64, col: 0, row: 0, ay: 0.66, x: 16 * T, y: 29 * T, solidR: 6 }); // by the cove (on land)

    this.map = map;
    this.falls = [{ x: this.riverCol[46] * T + T / 2, y: 46 * T }];  // river mouth glow
    [this.player.x, this.player.y] = this.snapToLand(map, 28 * T, ROAD_Y * T);   // never spawn in water
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    this.buildCoast();
  }

  /** Horizontal wood bridge where the lane crosses the river (and make it walkable). */
  private placeBridge(map: TileMap, roadY: number, centerX: number) {
    const x0 = centerX - 2, x1 = centerX + 2;   // spans the river + a tile each side
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
    const dx = (tx - CX) / RX, dy = (ty - CY) / RY, ang = Math.atan2(ty - CY, tx - CX);
    const R = 1 + 0.035 * Math.sin(ang * 2 + 0.6);
    const oval = (R - (dx * dx + dy * dy)) * ((RX + RY) / 4);   // ~tiles inside the oval shore
    const cove = Math.hypot(tx - 10, ty - 33) - Math.sqrt(20);  // outside the west cove
    return Math.min(oval, cove);
  }

  /** Continuous river "insideness": >0 inside the meandering channel + well pool. */
  private riverField(tx: number, ty: number): number {
    let f = -99;
    if (ty >= WELL.y + 1.5 && ty <= 47.6) {
      const rc = RIVER_X + Math.sin((ty - WELL.y) * 0.26) * 2.4;   // same meander as the tiles
      const hw = 1.5 + 0.35 * Math.sin(ty * 0.55);                 // varied half-width
      f = hw - Math.abs(tx - rc);
    }
    const pool = 1.7 - Math.hypot(tx - WELL.x, ty - (WELL.y + 1)); // the round wellspring pool
    return Math.max(f, pool);
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
    const GDARK = [44, 94, 46], GLITE = [150, 202, 98];
    const RWATER = [58, 150, 198], RFOAM = [196, 230, 238];   // the river of light + its foam banks
    const COBBLE = [150, 154, 160], COBBLED = [112, 116, 124]; // the round stone wellspring plaza
    for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
      const tx = (px + 0.5) / (T * SS), ty = (py + 0.5) / (T * SS), g = this.landField(tx, ty);
      const n = hash2(px, py);
      let col: number[], a = 255;
      const rf = g > 0.2 ? this.riverField(tx, ty) : -99;   // river only crosses the land
      if (rf > 0.35) {                                       // river water — smooth, faint shimmer
        const wob = Math.sin(ty * 1.8 + tx * 0.5) * 6 + (n - 0.5) * 10;
        col = [RWATER[0] + wob, RWATER[1] + wob, RWATER[2] + wob];
      } else if (rf > -0.4) {                                // smooth river bank fading into the land
        col = mix3(RWATER, RFOAM, smoothstep(0.35, -0.05, rf));
        a = Math.round(255 * smoothstep(-0.4, 0.1, rf));
      } else if (g > 1.8) {
        const plazaF = 2.9 - Math.hypot(tx - WELL.x, ty - WELL.y);   // round stone plaza around the fountain
        if (plazaF > -0.5) {
          const grain = (n - 0.5) * 24, cob = mix3(COBBLED, COBBLE, 0.5 + 0.4 * Math.sin(tx * 2.7 + ty * 2.3));
          col = [cob[0] + grain, cob[1] + grain, cob[2] + grain]; a = Math.round(255 * smoothstep(-0.5, 0.4, plazaF));
        } else { const v = this.meadow(tx, ty); col = v < 0 ? GDARK : GLITE; a = Math.round(Math.abs(v) * 46); }
      }
      else if (g > 0.12) {                                  // dry→wet sand, grainy
        const grain = (n - 0.5) * 46 + (hash2(px >> 1, py >> 1) - 0.5) * 22, base = mix3(SANDD, SAND, smoothstep(0.12, 1.1, g));
        col = [base[0] + grain, base[1] + grain, base[2] + grain * 0.8];
      } else if (g > -0.12) { col = FOAM; }                 // foam at the waterline
      else if (g > -0.9) {                                   // shallows w/ ripple sparkle
        col = mix3(FOAM, SHAL, smoothstep(-0.18, -0.9, g)); const r = (n - 0.5) * 16;
        col = [col[0] + r, col[1] + r, col[2] + r * 0.7];
      } else if (g > -3.2) {                                 // shallow → deep w/ wave banding
        col = mix3(SHAL, DEEP, smoothstep(-0.9, -3.2, g));
        const wave = Math.sin(g * 2.6 + tx * 0.5 + ty * 0.35) * 7 + (n - 0.5) * 8;
        col = [col[0] + wave, col[1] + wave, col[2] + wave];
      } else { col = DEEP; }
      const i = (py * cw + px) * 4;
      d[i] = clamp255(col[0]); d[i + 1] = clamp255(col[1]); d[i + 2] = clamp255(col[2]); d[i + 3] = a;
    }
    cx.putImageData(img, 0, 0);
    this.coast = cv;
    // trace the shoreline (ray-march g→0 from the centre) for animated foam
    this.shore = [];
    for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 120) {
      let prev = this.landField(CX + Math.cos(ang) * 2, CY + Math.sin(ang) * 2);
      for (let rr = 2.5; rr < Math.max(RX, RY) * 1.7; rr += 0.4) {
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

  /** Foam waves lapping the shoreline — animated each frame (drawn under props). */
  private drawShoreFoam(c: CanvasRenderingContext2D, cam: Camera) {
    for (let i = 0; i < this.shore.length; i++) {
      const p = this.shore[i];
      const [sx, sy] = this.ren.w2s(cam, p.x, p.y);
      if (sx < -8 || sy < -8 || sx > cam.vw + 8 || sy > cam.vh + 8) continue;
      const ph = 0.5 + 0.5 * Math.sin(this.tsec * 2.2 + i * 0.6);
      c.globalAlpha = 0.12 + 0.3 * ph;
      c.fillStyle = "#dff4fa";
      const s = Math.max(1, cam.scale * 1.0);
      c.fillRect(sx - s, sy - s, s * 2, s * 2);
    }
    c.globalAlpha = 1;
  }

  /** A light grove framing the shore (sparse, so the beaches still show). */
  private placeShoreTrees(map: TileMap) {
    const rnd = rng(77);
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      if (map.get(tx, ty) !== "grass") continue;
      const g = this.landField(tx + 0.5, ty + 0.5);
      if (g < 0.8 || g > 3.0) continue;               // a band just inside the shore
      if (rnd() < 0.26) {
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
      if (rnd() < 0.22) {                              // a lily pad / rock in the water
        const tx = Math.round(c) + Math.round((rnd() - 0.5) * 2);
        if (map.get(tx, ty) === "water") put(rnd() < 0.6 ? (rnd() < 0.5 ? "lilypad1" : "lilypad2") : "waterrock1", tx * T + rnd() * T, ty * T + T);
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
    // textured sandy coast + smooth procedural river + meadow shading, then shore foam
    this.blitCoast(b);
    this.drawShoreFoam(b, this.cam);
    // the bridge, then depth-sorted actors
    this.ren.drawOverlay(b, this.map, this.cam);
    const [psx, psy] = this.ren.w2s(this.cam, this.player.x, this.player.y);
    const playerItem: Drawable = { y: this.player.y, render: (c) => this.player.draw(c, this.atlas.get("player"), psx, psy, this.cam.scale) };
    this.ren.drawEntities(b, this.map, this.cam, [playerItem]);
    this.drawLogo(b);               // the spinning CIRQLBACK emblem over the wellspring
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
    const topY = (WELL.y + 1) * T - 84 + bob;   // hovering just above the fountain
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
    // wellspring glow + rising motes
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
    // river shimmer — follows the meandering channel, only over water
    for (let i = 0; i < 30; i++) {
      const ph = (this.tsec * 0.45 + i * 0.11) % 1;
      const yy = Math.floor(WELL.y + 2 + ph * (46 - WELL.y - 2));
      const c0 = this.riverCol[yy]; if (c0 == null || c0 < 0) continue;
      const tx = c0 + 0.5 + Math.sin(yy * 0.5 + this.tsec) * 0.4;
      if (this.map.get(Math.round(tx - 0.5), yy) !== "water") continue;
      const [sx, sy] = this.ren.w2s(cam, tx * T, yy * T);
      c.globalAlpha = 0.5 * (0.5 + 0.5 * Math.sin(this.tsec * 4 + i));
      c.fillStyle = "#cfeeff"; const s = Math.max(1, cam.scale * 0.8); c.fillRect(sx, sy, s, s);
    }
    c.globalAlpha = 1;
    // river-mouth glow where it flows into the sea
    for (const f of this.falls) {
      const [fx, fy] = this.ren.w2s(cam, f.x, f.y);
      c.globalAlpha = 0.35 + 0.12 * Math.sin(this.tsec * 3);
      const mr = 22 * cam.scale, mg = c.createRadialGradient(fx, fy, 0, fx, fy, mr);
      mg.addColorStop(0, "rgba(210,250,255,.55)"); mg.addColorStop(1, "rgba(210,250,255,0)");
      c.fillStyle = mg; c.fillRect(fx - mr, fy - mr, mr * 2, mr * 2);
    }
    c.globalAlpha = 1;
    // fireflies — crisp drifting light motes over the meadow (no full-frame blur)
    for (let i = 0; i < 20; i++) {
      const t = this.tsec * 0.25 + i * 1.7;
      const wx = (12 + ((i * 79) % 46)) * T + Math.sin(t) * 22;
      const wy = (8 + ((i * 47) % 36)) * T + Math.cos(t * 0.8) * 16;
      if (this.map.get(Math.floor(wx / T), Math.floor(wy / T)) !== "grass") continue;
      const [sx, sy] = this.ren.w2s(cam, wx, wy);
      const pulse = 0.5 + 0.5 * Math.sin(this.tsec * 3 + i * 1.3), s = Math.max(1, cam.scale * 0.9);
      c.globalAlpha = pulse * 0.22; c.fillStyle = "#cdff88"; c.fillRect(sx - s, sy - s, s * 3, s * 3);
      c.globalAlpha = pulse * 0.9; c.fillStyle = "#f2ffb0"; c.fillRect(sx, sy, s, s);
    }
    c.restore(); c.globalAlpha = 1;
  }

  protected onOverlay(g: CanvasRenderingContext2D): void {
    g.save();
    g.fillStyle = "rgba(6,12,22,.55)"; g.fillRect(10, 10, 288, 58);
    g.fillStyle = "#bfefff"; g.font = "12px monospace"; g.textBaseline = "middle";
    g.fillText("TILE LAB · P1 — Cloverfield (meadow slice)", 20, 24);
    g.fillStyle = "#9fd6ff";
    g.fillText("WASD / Arrows to walk   ·   facing: " + this.player.dir, 20, 40);
    g.fillText(this.loaded ? "hybrid: Cute Fantasy tiles + procedural light" : "loading…", 20, 55);
    g.restore();
  }

  setZoom(z: number) { this.zoom = Math.max(1, Math.min(6, z)); }

  // ---- sheet inspector (decode exact cell coords for authoring) ----
  private inspectName: string | null = null;
  private inspectCell = 16;
  inspect(name: string | null, cell = 16) { this.inspectName = name; this.inspectCell = cell; }
  private drawInspector(): void {
    const b = this.b, bw = b.canvas.width, bh = b.canvas.height;
    b.imageSmoothingEnabled = false;
    b.fillStyle = "#101820"; b.fillRect(0, 0, bw, bh);
    const sh = this.atlas.get(this.inspectName!);
    const cs = this.inspectCell;
    const cols = Math.floor(sh.w / cs), rows = Math.floor(sh.h / cs);
    const z = Math.max(1, Math.floor(Math.min((bw - 40) / sh.w, (bh - 40) / sh.h)));
    const ox = 20, oy = 20;
    sh.draw(b, 0, 0, sh.w, sh.h, ox, oy, sh.w * z, sh.h * z);
    b.strokeStyle = "rgba(120,220,255,.5)"; b.lineWidth = 1;
    b.font = `${Math.max(8, cs * z / 3)}px monospace`; b.fillStyle = "#7fe";
    for (let r = 0; r < rows; r++) for (let cc = 0; cc < cols; cc++) {
      b.strokeRect(ox + cc * cs * z, oy + r * cs * z, cs * z, cs * z);
      if (z >= 2) b.fillText(`${cc},${r}`, ox + cc * cs * z + 2, oy + r * cs * z + cs * z / 3);
    }
    b.fillStyle = "#bfefff"; b.font = "14px monospace";
    b.fillText(`${this.inspectName}  ${sh.w}x${sh.h}  ${cols}x${rows} @${cs}`, ox, bh - 12);
  }
}

export default function TileLabPage() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    const eng = new TileLabEngine(canvas.current);
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
