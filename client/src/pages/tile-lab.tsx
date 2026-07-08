import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { RetroEngine, type RetroHooks } from "@/game/retro-engine";
import {
  cuteFantasyAtlas, TileMap, TileRenderer, Actor, PLAYER_ANIM,
  type Atlas, type Camera, type Drawable,
} from "@/game/tile";

// TILE LAB — the P0 verification bench for CIRQL's hybrid tile pipeline.
// It hand-authors a tiny meadow (grass + an autotiled pond + a river + a cobble
// path + oak props + a cliff strip), drops in the Cute Fantasy player sprite you
// can walk with tile collision, and paints a procedural wellspring glow over the
// top through the renderer's light hook — exercising loader→atlas→tilemap→
// autotile→sprite→collision→renderer→light-hook end to end. Dial-in via
// window.__tilelab (DEV): mutate PLAYER_ANIM rows, setZoom(z).

class TileLabEngine extends RetroEngine {
  private atlas: Atlas = cuteFantasyAtlas();
  private ren!: TileRenderer;
  private map!: TileMap;
  private player = new Actor(PLAYER_ANIM);
  private cam: Camera = { x: 0, y: 0, scale: 2, vw: 1, vh: 1 };
  private zoom = 2;
  private loaded = false;
  private tsec = 0;
  private pondX = 0; private pondY = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, 320, 200);
    this.fit = true; this.fitPx = 3;
    this.crt = false;                 // clean look for tile art (no scanlines)
    this.resize();
    this.buildMap();
    this.ren = new TileRenderer(this.atlas);
    this.atlas.loadAll().then(() => { this.loaded = true; }).catch((e) => console.error(e));
    this.start();
  }

  // ---- author a tiny meadow slice ----
  private buildMap() {
    const W = 48, H = 34, T = 16;
    const map = new TileMap(W, H, T, "grass");
    // a plateau-rim cliff strip along the north edge (solid rock)
    map.fillRect(0, 0, W, 2, "cliff");
    // wellspring pond at the heart
    const px = 24, py = 15;
    map.paintCircle(px, py, 4, "water");
    // a river of light spilling from the pond toward the south rim
    map.paintLine(px, py, 30, H - 1, "water", 3);
    // a cobble road: dock (west) → village heart
    map.paintLine(4, 26, px - 5, py + 3, "path", 2);
    map.paintLine(px - 5, py + 3, px + 6, py + 2, "path", 2);
    // oak trees + a stump, scattered (overhead canopy, trunk collision)
    const trees: [number, number, number][] = [
      [8, 10, 1], [12, 22, 2], [38, 8, 1], [40, 24, 2], [30, 26, 1],
      [16, 6, 2], [34, 18, 1], [10, 30, 2], [44, 14, 1],
    ];
    for (const [tx, ty, col] of trees) {
      map.addProp({ sheet: "tree_oak", fw: 64, fh: 80, col, row: 0, x: tx * T + 8, y: ty * T + 12, overhead: true, solidR: 7 });
    }
    map.addProp({ sheet: "tree_oak", fw: 64, fh: 80, col: 0, row: 0, x: 20 * T, y: 24 * T, solidR: 5 }); // stump
    map.addProp({ sheet: "tree_oak_med", fw: 32, fh: 48, col: 1, row: 0, x: 27 * T, y: 9 * T, overhead: true, solidR: 5 });

    this.map = map;
    this.pondX = px * T; this.pondY = py * T;
    this.player.x = 20 * T; this.player.y = 20 * T;
    this.cam.x = this.player.x; this.cam.y = this.player.y;
  }

  private blocked(x: number, y: number, r: number): boolean {
    if (this.map.circleBlocked(x, y, r)) return true;
    for (const p of this.map.props) {
      if (!p.solidR) continue;
      if ((x - p.x) ** 2 + (y - p.y) ** 2 <= (p.solidR + r) ** 2) return true;
    }
    return false;
  }

  protected update(dt: number): void {
    this.tsec += dt;
    if (!this.loaded) return;
    // input → velocity
    let vx = 0, vy = 0;
    if (this.btn.left) vx -= 1; if (this.btn.right) vx += 1;
    if (this.btn.up) vy -= 1; if (this.btn.down) vy += 1;
    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const m = Math.hypot(vx, vy);
      const sp = 64;
      vx = (vx / m) * sp; vy = (vy / m) * sp;
      const r = 5;
      const nx = this.player.x + vx * dt;
      if (!this.blocked(nx, this.player.y, r)) this.player.x = nx;
      const ny = this.player.y + vy * dt;
      if (!this.blocked(this.player.x, ny, r)) this.player.y = ny;
      this.player.faceFromVelocity(vx, vy);
    }
    this.player.moving = moving;
    this.player.update(dt);
    // camera easing follow
    const k = Math.min(1, dt * 6);
    this.cam.x += (this.player.x - this.cam.x) * k;
    this.cam.y += (this.player.y - this.cam.y) * k;
  }

  protected render(): void {
    const b = this.b, bw = b.canvas.width, bh = b.canvas.height;
    b.imageSmoothingEnabled = false;
    b.fillStyle = "#123049"; b.fillRect(0, 0, bw, bh);   // the surrounding sea
    if (!this.loaded) {
      b.fillStyle = "#7fd8ff"; b.font = `${Math.round(bh * 0.06)}px monospace`; b.textAlign = "center";
      b.fillText("loading tiles…", bw / 2, bh / 2); b.textAlign = "left";
      return;
    }
    this.cam.vw = bw; this.cam.vh = bh; this.cam.scale = this.zoom;

    const [psx, psy] = this.ren.w2s(this.cam, this.player.x, this.player.y);
    const playerItem: Drawable = {
      y: this.player.y,
      render: (c) => this.player.draw(c, this.atlas.get("player"), psx, psy, this.cam.scale),
    };

    this.ren.render(b, this.map, this.cam, [playerItem], (c, cam) => this.drawLight(c, cam));
  }

  /** P3 preview: the procedural light layer, drawn OVER the crafted tiles. */
  private drawLight(c: CanvasRenderingContext2D, cam: Camera) {
    if (this.reduce) return;
    const [gx, gy] = this.ren.w2s(cam, this.pondX, this.pondY);
    c.save();
    c.globalCompositeOperation = "lighter";
    const rad = 46 * cam.scale;
    const a = 0.28 + 0.12 * Math.sin(this.tsec * 2);
    const g = c.createRadialGradient(gx, gy, 0, gx, gy, rad);
    g.addColorStop(0, `rgba(150,232,255,${a})`);
    g.addColorStop(0.5, `rgba(120,200,255,${a * 0.4})`);
    g.addColorStop(1, "rgba(120,200,255,0)");
    c.fillStyle = g;
    c.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
    // rising light-motes from the wellspring
    for (let i = 0; i < 10; i++) {
      const ph = (this.tsec * 0.4 + i * 0.37) % 1;
      const mx = gx + Math.sin(this.tsec + i) * 10 * cam.scale;
      const my = gy - ph * 40 * cam.scale;
      c.globalAlpha = (1 - ph) * 0.8;
      c.fillStyle = "#dffaff";
      const s = Math.max(1, cam.scale);
      c.fillRect(mx, my, s, s);
    }
    c.restore();
    c.globalAlpha = 1;
  }

  protected onOverlay(g: CanvasRenderingContext2D): void {
    g.save();
    g.fillStyle = "rgba(6,12,22,.55)";
    g.fillRect(10, 10, 250, 58);
    g.fillStyle = "#bfefff"; g.font = "12px monospace"; g.textBaseline = "middle";
    g.fillText("TILE LAB · P0 hybrid pipeline", 20, 24);
    g.fillStyle = "#9fd6ff";
    g.fillText(`WASD / Arrows to walk   ·   facing: ${this.player.dir}`, 20, 40);
    g.fillText(this.loaded ? "atlas: ready ✓" : "loading atlas…", 20, 55);
    g.restore();
  }

  setZoom(z: number) { this.zoom = Math.max(1, Math.min(6, z)); }
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
