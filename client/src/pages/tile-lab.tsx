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

class TileLabEngine extends RetroEngine {
  private atlas: Atlas = cuteFantasyAtlas();
  private ren!: TileRenderer;
  private map!: TileMap;
  private player = new Actor(PLAYER_ANIM);
  private cam: Camera = { x: 0, y: 0, scale: 2, vw: 1, vh: 1 };
  private zoom = 2.2;
  private loaded = false;
  private tsec = 0;
  private falls: { x: number; y: number }[] = [];   // waterfall points (world px)

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 320, 200);
    this.fit = true; this.fitPx = 3;
    this.crt = false;
    this.resize();
    this.buildIsland();
    this.ren = new TileRenderer(this.atlas);
    this.atlas.loadAll().then(() => { this.loaded = true; }).catch((e) => console.error(e));
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
    const map = new TileMap(MW, MH, T, "sea");   // everything is open (dark) sea until we raise land
    map.solidTerrain.add("sea");
    // 1) the grass plateau
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (this.land(tx, ty)) map.set(tx, ty, "grass");

    // 2) wellspring plaza (cobble) + a straight river of light from its head to the
    //    south rim (width 3 → clean grassy banks; no bends → cohesive channel)
    map.paintCircle(WELL.x, WELL.y, 2, "path");
    map.paintLine(RIVER_X, WELL.y + 2, RIVER_X, 47, "water", 3);

    // 3) one straight cobble lane, west cove → east, crossing the river on a bridge
    map.paintLine(9, ROAD_Y, 58, ROAD_Y - 1, "path", 3);

    // 4) authored structures (overlay) — the bridge over the river, the raised plateau rim
    this.placeBridge(map, ROAD_Y);
    this.placeCliffRim(map);

    // 5) buildings — spread out, each near where it "wants to be"
    const H = (sheet: string, w: number, h: number, tx: number, ty: number, sc = 1, sr?: number) =>
      map.addProp({ sheet, fw: w, fh: h, col: 0, row: 0, x: tx * T + T / 2, y: ty * T + T, scale: sc, solidR: sr ?? w * sc * 0.33, overhead: false });
    H("windmill", 128, 112, 29, 11, 1);                 // high ground, north
    H("inn", 240, 192, 41, 12, 0.8);                    // the village inn
    H("house1", 96, 128, 25, 18, 1);
    H("house2", 144, 128, 45, 20, 1);
    H("house3", 144, 128, 24, 27, 1);
    H("house4", 112, 96, 47, 28, 1);
    H("fisherman", 96, 112, 14, 27, 1);                 // above the west cove (on land)

    // 6) wellspring centrepiece (the Well) at the plaza heart
    map.addProp({ sheet: "well", fw: 32, fh: 48, col: 0, row: 0, x: WELL.x * T + T / 2, y: WELL.y * T + T, solidR: 9 });

    // 7) trees — a grove NE + scattered singles (canopy overhead)
    const oak = (tx: number, ty: number, col = 1) =>
      map.addProp({ sheet: "tree_oak", fw: 64, fh: 80, col, row: 0, x: tx * T + 8, y: ty * T + 12, overhead: true, solidR: 7 });
    for (const [tx, ty] of [[52, 15], [55, 18], [50, 20], [56, 23], [15, 15], [12, 20], [18, 12], [58, 30], [50, 34]] as [number, number][]) oak(tx, ty, 1 + ((tx + ty) % 2));

    // 8) density: flowers + tufts scattered on the grass (denser near the plaza)
    const rnd = rng(1337);
    let placed = 0;
    for (let i = 0; i < 900 && placed < 240; i++) {
      const tx = Math.floor(rnd() * MW), ty = Math.floor(rnd() * MH);
      if (map.get(tx, ty) !== "grass") continue;
      const near = Math.hypot(tx - WELL.x, ty - WELL.y) < 12;
      if (!near && rnd() > 0.5) continue;
      const fc = Math.floor(rnd() * 10), fr = Math.floor(rnd() * 10);
      map.addProp({ sheet: "flowers", fw: 16, fh: 16, col: fc, row: fr, x: tx * T + T / 2, y: ty * T + T });
      placed++;
    }

    // 9) life — grazing sheep, chickens, and two villager NPCs
    const sheep = (tx: number, ty: number) => map.addProp({ sheet: "sheep", fw: 32, fh: 32, col: 0, row: 0, x: tx * T, y: ty * T, solidR: 6 });
    for (const [tx, ty] of [[18, 40], [21, 42], [16, 38], [23, 39]] as [number, number][]) sheep(tx, ty);
    const chick = (tx: number, ty: number) => map.addProp({ sheet: "chicken", fw: 32, fh: 32, col: 0, row: 0, x: tx * T, y: ty * T });
    for (const [tx, ty] of [[27, 20], [29, 21], [43, 24]] as [number, number][]) chick(tx, ty);
    // villager NPCs — premade sheets are 64×64 frames; (0,0) is a front idle, feet ~0.66 down
    map.addProp({ sheet: "farmer", fw: 64, fh: 64, col: 0, row: 0, ay: 0.66, x: 30 * T, y: 26 * T, solidR: 6 }); // by the plaza
    map.addProp({ sheet: "fisher", fw: 64, fh: 64, col: 0, row: 0, ay: 0.66, x: 16 * T, y: 29 * T, solidR: 6 }); // by the cove (on land)

    this.map = map;
    // waterfall point where the river meets the front cliff
    this.falls = [{ x: RIVER_X * T + T / 2, y: 46 * T }];
    this.player.x = 28 * T; this.player.y = ROAD_Y * T;   // on the lane, near the plaza
    this.cam.x = this.player.x; this.cam.y = this.player.y;
  }

  /** Horizontal wood bridge where the lane crosses the river (and make it walkable). */
  private placeBridge(map: TileMap, roadY: number) {
    const x0 = RIVER_X - 2, x1 = RIVER_X + 2;   // spans the ~3-wide river + a tile each side
    for (let tx = x0; tx <= x1; tx++) {
      const col = tx === x0 ? 3 : tx === x1 ? 5 : 4;   // left cap / deck / right cap
      map.setOverlay(tx, roadY - 1, "bridge_wood", col, 1);
      map.setOverlay(tx, roadY, "bridge_wood", col, 2);
      map.setOverlay(tx, roadY + 1, "bridge_wood", col, 3);
      for (let dy = -1; dy <= 1; dy++) map.setSolid(tx, roadY + dy, false);   // walkable deck
    }
  }

  /**
   * Rim the grass plateau with the Cute Fantasy cliff kit (sheet cols 0-3 = a
   * grass-topped plateau edge): a rock lip on every sea-facing edge, and a tall
   * 2-tile rock FACE dropping into the dark sea on the southern front. This is
   * what makes the island read as a "raised luminous plateau above the sea".
   */
  private isSea(map: TileMap, tx: number, ty: number): boolean {
    return !map.inBounds(tx, ty) || map.get(tx, ty) === "sea";
  }
  private placeCliffRim(map: TileMap) {
    const C = "cliff";
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      if (map.get(tx, ty) !== "grass") continue;
      const n = this.isSea(map, tx, ty - 1), s = this.isSea(map, tx, ty + 1);
      const w = this.isSea(map, tx - 1, ty), e = this.isSea(map, tx + 1, ty);
      if (!n && !s && !e && !w) continue;             // interior land
      // Southern front → a 2-tile rock face drops into the sea below this tile.
      if (s) {
        const v = tx % 2;                             // alternate for texture
        const lc = this.isSea(map, tx - 1, ty) ? 0 : this.isSea(map, tx + 1, ty) ? 3 : 1 + v;
        map.setOverlay(tx, ty + 1, C, lc, 3);         // upper face
        map.setOverlay(tx, ty + 2, C, lc, 4);         // lower face + base
      }
      // Rock lip on the plateau edge itself (grass-topped), by which side faces sea.
      let cell: [number, number] | null = null;
      if (n && w) cell = [0, 0];
      else if (n && e) cell = [3, 0];
      else if (n) cell = [1, 0];
      else if (w) cell = [0, 1];
      else if (e) cell = [3, 1];
      if (cell) map.setOverlay(tx, ty, C, cell[0], cell[1]);
    }
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
    b.fillStyle = "#0e2740"; b.fillRect(0, 0, bw, bh);   // deep sea backdrop
    if (!this.loaded) {
      b.fillStyle = "#7fd8ff"; b.font = `${Math.round(bh * 0.05)}px monospace`; b.textAlign = "center";
      b.fillText("loading Cloverfield…", bw / 2, bh / 2); b.textAlign = "left"; return;
    }
    this.cam.vw = bw; this.cam.vh = bh; this.cam.scale = this.zoom;

    const [psx, psy] = this.ren.w2s(this.cam, this.player.x, this.player.y);
    const playerItem: Drawable = {
      y: this.player.y,
      render: (c) => this.player.draw(c, this.atlas.get("player"), psx, psy, this.cam.scale),
    };
    this.ren.render(b, this.map, this.cam, [playerItem], (c, cam) => this.drawLight(c, cam));
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
    // river shimmer — sparkles drifting straight down the channel
    for (let i = 0; i < 30; i++) {
      const ph = (this.tsec * 0.45 + i * 0.11) % 1;
      const yy = WELL.y + 2 + ph * (47 - (WELL.y + 2));
      const tx = RIVER_X + 0.5 + Math.sin(yy * 0.5 + this.tsec) * 0.5;
      const [sx, sy] = this.ren.w2s(cam, tx * T, yy * T);
      c.globalAlpha = 0.5 * (0.5 + 0.5 * Math.sin(this.tsec * 4 + i));
      c.fillStyle = "#cfeeff"; const s = Math.max(1, cam.scale * 0.8); c.fillRect(sx, sy, s, s);
    }
    c.globalAlpha = 1;
    // waterfall glow + mist where the river spills over the front cliff
    for (const f of this.falls) {
      const [fx, fy] = this.ren.w2s(cam, f.x, f.y);
      for (let j = 0; j < 16; j++) {
        const ph = (this.tsec * 1.2 + j * 0.12) % 1;
        c.globalAlpha = (1 - ph) * 0.6; c.fillStyle = "#eaffff";
        const w = (2 + Math.sin(j) * 1.5) * cam.scale;
        c.fillRect(fx - w / 2 + Math.sin(j * 2) * 3 * cam.scale, fy + ph * 30 * cam.scale, w, cam.scale * 1.5);
      }
      // mist pool at the base
      c.globalAlpha = 0.4 + 0.1 * Math.sin(this.tsec * 3);
      const mr = 18 * cam.scale, mg = c.createRadialGradient(fx, fy + 30 * cam.scale, 0, fx, fy + 30 * cam.scale, mr);
      mg.addColorStop(0, "rgba(230,255,255,.5)"); mg.addColorStop(1, "rgba(230,255,255,0)");
      c.fillStyle = mg; c.fillRect(fx - mr, fy + 30 * cam.scale - mr, mr * 2, mr * 2);
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
