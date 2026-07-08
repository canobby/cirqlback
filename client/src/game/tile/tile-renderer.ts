// tile-renderer — blit a TileMap + its props + actors into a canvas, through a
// simple world camera. This is the seam the hybrid stands on: crafted TILES draw
// here (ground autotiled, props/actors depth-sorted by feet-Y), then a procedural
// LIGHT hook draws over the top (P3: wellspring glow, river shimmer, corruption).
//
// Coords: world px (16 per tile). The camera converts to "screen" px — which, in
// CIRQL, is the RetroEngine SS-buffer, so tiles land at full buffer resolution and
// stay crisp on the nearest-neighbour upscale.

import type { Atlas } from "./tileset";
import type { TileMap, Prop, Terrain } from "./tilemap";
import { blobTile, type BlobLayout } from "./autotile";

export interface Camera {
  x: number; y: number;   // world px at the CENTRE of the viewport
  scale: number;          // screen px per world px
  vw: number; vh: number; // viewport size in screen px
}

/** How one terrain renders: a base fill + optional autotile overlay + optional cell pick. */
export interface TerrainRender {
  fill?: string;                                   // sheet drawn as the solid fill (16×16 middle)
  variants?: string[];                             // extra fills chosen by position hash (grass texture)
  blob?: { sheet: string; layout: BlobLayout };    // autotiled edge overlay for a painted region
  cell?: [number, number];                         // for multi-tile sheets: which 16px cell to sample as fill
  void?: boolean;                                  // render nothing — the backdrop shows through (the open sea)
}

export type TerrainConfig = Record<string, TerrainRender>;

/** Default mapping for the P0/P1 meadow: grass base, water + cobble-path overlays, a rock fill for cliffs. */
export const DEFAULT_TERRAIN: TerrainConfig = {
  // single grass tile (no blocky tone-variant patches); soft meadow shading is a
  // procedural overlay the host draws on top, so the grass reads natural not gridded.
  grass: { fill: "grass" },
  // the river is drawn procedurally (smooth banks) by the host's coast layer, so
  // the water tile itself renders nothing here (grass shows under it) — no blocky edges.
  water: {},
  // cobble_blob bakes a tan dirt shoulder into its edges (ugly against grass), so the
  // road uses the sheet's border-free solid cobble tile (0,3) for a clean paved lane.
  path:  { fill: "cobble_blob", cell: [1, 1] },
  cliff: { fill: "cliff", cell: [4, 2] },
  sea:   { void: true },   // the open sea = the dark backdrop; the plateau's cliff rim frames it
};

/** A thing to draw in the depth-sorted pass (an actor, an effect). Sorted by `y`. */
export interface Drawable { y: number; render: (ctx: CanvasRenderingContext2D) => void; }

export class TileRenderer {
  constructor(
    public atlas: Atlas,
    public terrain: TerrainConfig = DEFAULT_TERRAIN,
    public tile = 16,
  ) {}

  /** World px → screen px. */
  w2s(cam: Camera, wx: number, wy: number): [number, number] {
    return [(wx - cam.x) * cam.scale + cam.vw / 2, (wy - cam.y) * cam.scale + cam.vh / 2];
  }
  /** Screen px → world px (for tap-to-move). */
  s2w(cam: Camera, sx: number, sy: number): [number, number] {
    return [(sx - cam.vw / 2) / cam.scale + cam.x, (sy - cam.vh / 2) / cam.scale + cam.y];
  }

  private hash(x: number, y: number): number {
    let h = (x * 374761393 + y * 668265263) >>> 0;
    h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
    return (h >>> 0) / 4294967296;
  }

  /** Draw the ground: base fill for every visible tile, then autotiled overlays. */
  drawGround(ctx: CanvasRenderingContext2D, map: TileMap, cam: Camera): void {
    ctx.imageSmoothingEnabled = false;
    const t = this.tile, s = cam.scale;
    const dsz = Math.ceil(t * s) + 1;   // +1px overlap kills seams at fractional scale
    // visible tile bounds
    const [wx0, wy0] = this.s2w(cam, 0, 0);
    const [wx1, wy1] = this.s2w(cam, cam.vw, cam.vh);
    const tx0 = Math.floor(wx0 / t) - 1, ty0 = Math.floor(wy0 / t) - 1;
    const tx1 = Math.ceil(wx1 / t) + 1, ty1 = Math.ceil(wy1 / t) + 1;

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (!map.inBounds(tx, ty)) continue;   // beyond the map → the sea backdrop shows through
        const terr = map.get(tx, ty);
        if (this.terrain[terr]?.void) continue;   // open sea → leave the dark backdrop
        const [sx, sy] = this.w2s(cam, tx * t, ty * t);
        const dx = Math.round(sx), dy = Math.round(sy);
        // 1) base grass fill (also sits under water/path features)
        this.drawFill(ctx, "grass", tx, ty, dx, dy, dsz);
        // 2) painted terrain on top
        if (terr !== "grass") this.drawTerrain(ctx, map, terr, tx, ty, dx, dy, dsz);
      }
    }
  }

  private drawFill(ctx: CanvasRenderingContext2D, terr: Terrain, tx: number, ty: number, dx: number, dy: number, dsz: number): void {
    const cfg = this.terrain[terr];
    if (!cfg) return;
    let name = cfg.fill;
    if (cfg.variants && cfg.variants.length > 1) {
      const r = this.hash(tx, ty);
      // mostly plain fill; ~18% of tiles get a variant so grass reads textured, not checkered
      if (r < 0.82) name = cfg.variants[0];
      else {
        const vi = Math.floor(((r - 0.82) / 0.18) * (cfg.variants.length - 1));
        name = cfg.variants[1 + Math.min(cfg.variants.length - 2, Math.max(0, vi))];
      }
    }
    if (!name || !this.atlas.has(name)) return;
    const sh = this.atlas.get(name);
    if (cfg.cell) sh.cell(ctx, this.tile, cfg.cell[0], cfg.cell[1], dx, dy, dsz, dsz);
    else sh.draw(ctx, 0, 0, this.tile, this.tile, dx, dy, dsz, dsz);
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, map: TileMap, terr: Terrain, tx: number, ty: number, dx: number, dy: number, dsz: number): void {
    const cfg = this.terrain[terr];
    if (!cfg) return;
    if (cfg.blob && this.atlas.has(cfg.blob.sheet)) {
      const same = map.neighbourhood(tx, ty, terr);
      const [c, r] = blobTile(cfg.blob.layout, same);
      this.atlas.get(cfg.blob.sheet).cell(ctx, this.tile, c, r, dx, dy, dsz, dsz);
    } else {
      this.drawFill(ctx, terr, tx, ty, dx, dy, dsz);
    }
  }

  /**
   * Soft shore: where water meets land it shallows to a light rim that fades into
   * the blue — a gentle "water fades into shore" edge instead of a hard rocky one.
   * Drawn after the ground, before overlays (so a bridge still covers it).
   */
  drawWaterEdges(ctx: CanvasRenderingContext2D, map: TileMap, cam: Camera): void {
    const t = this.tile, s = cam.scale, dsz = Math.ceil(t * s) + 1;
    const band = Math.max(2, Math.round(6 * s));
    const [wx0, wy0] = this.s2w(cam, 0, 0), [wx1, wy1] = this.s2w(cam, cam.vw, cam.vh);
    const tx0 = Math.floor(wx0 / t) - 1, ty0 = Math.floor(wy0 / t) - 1;
    const tx1 = Math.ceil(wx1 / t) + 1, ty1 = Math.ceil(wy1 / t) + 1;
    const land = (x: number, y: number) => { const g = map.get(x, y); return map.inBounds(x, y) && g !== "water" && g !== "sea"; };
    const C0 = "rgba(205,242,255,0.55)", C1 = "rgba(205,242,255,0)";
    ctx.save();
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (map.get(tx, ty) !== "water") continue;
      const [sx, sy] = this.w2s(cam, tx * t, ty * t);
      const dx = Math.round(sx), dy = Math.round(sy);
      if (land(tx, ty - 1)) { const g = ctx.createLinearGradient(0, dy, 0, dy + band); g.addColorStop(0, C0); g.addColorStop(1, C1); ctx.fillStyle = g; ctx.fillRect(dx, dy, dsz, band); }
      if (land(tx, ty + 1)) { const g = ctx.createLinearGradient(0, dy + dsz, 0, dy + dsz - band); g.addColorStop(0, C0); g.addColorStop(1, C1); ctx.fillStyle = g; ctx.fillRect(dx, dy + dsz - band, dsz, band); }
      if (land(tx - 1, ty)) { const g = ctx.createLinearGradient(dx, 0, dx + band, 0); g.addColorStop(0, C0); g.addColorStop(1, C1); ctx.fillStyle = g; ctx.fillRect(dx, dy, band, dsz); }
      if (land(tx + 1, ty)) { const g = ctx.createLinearGradient(dx + dsz, 0, dx + dsz - band, 0); g.addColorStop(0, C0); g.addColorStop(1, C1); ctx.fillStyle = g; ctx.fillRect(dx + dsz - band, dy, band, dsz); }
    }
    ctx.restore();
  }

  /** Draw the hand-authored overlay tiles (cliff faces, bridges) above the ground. */
  drawOverlay(ctx: CanvasRenderingContext2D, map: TileMap, cam: Camera): void {
    ctx.imageSmoothingEnabled = false;
    const t = this.tile, s = cam.scale;
    const dsz = Math.ceil(t * s) + 1;
    const [wx0, wy0] = this.s2w(cam, 0, 0);
    const [wx1, wy1] = this.s2w(cam, cam.vw, cam.vh);
    const tx0 = Math.floor(wx0 / t) - 1, ty0 = Math.floor(wy0 / t) - 1;
    const tx1 = Math.ceil(wx1 / t) + 1, ty1 = Math.ceil(wy1 / t) + 1;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const o = map.getOverlay(tx, ty);
      if (!o || !this.atlas.has(o.sheet)) continue;
      const [sx, sy] = this.w2s(cam, tx * t, ty * t);
      this.atlas.get(o.sheet).cell(ctx, o.cell, o.col, o.row, Math.round(sx), Math.round(sy), dsz, dsz);
    }
  }

  /** Draw one prop feet-anchored. */
  drawProp(ctx: CanvasRenderingContext2D, cam: Camera, p: Prop): void {
    if (!this.atlas.has(p.sheet)) return;
    const sh = this.atlas.get(p.sheet);
    const sc = (p.scale ?? 1) * cam.scale;
    const dw = p.fw * sc, dh = p.fh * sc;
    const [sx, sy] = this.w2s(cam, p.x, p.y);
    const ax = p.ax ?? 0.5, ay = p.ay ?? 1;
    const dx = Math.round(sx - dw * ax), dy = Math.round(sy - dh * ay);
    sh.frame(ctx, p.fw, p.fh, p.col, p.row, dx, dy, Math.ceil(dw), Math.ceil(dh));
  }

  /** Props + supplied actor/effect drawables, painted back-to-front by feet-Y. */
  drawEntities(ctx: CanvasRenderingContext2D, map: TileMap, cam: Camera, extra: Drawable[] = []): void {
    ctx.imageSmoothingEnabled = false;
    const items: Drawable[] = extra.slice();
    for (const p of map.props) items.push({ y: p.y, render: (c) => this.drawProp(c, cam, p) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.render(ctx);
  }

  /**
   * Full world pass: ground → depth-sorted props+actors → procedural light hook.
   * `light` is where P3's glow/particles/corruption draw over the finished tiles.
   */
  render(ctx: CanvasRenderingContext2D, map: TileMap, cam: Camera, actors: Drawable[] = [],
         light?: (ctx: CanvasRenderingContext2D, cam: Camera) => void): void {
    this.drawGround(ctx, map, cam);
    this.drawWaterEdges(ctx, map, cam);
    this.drawOverlay(ctx, map, cam);
    this.drawEntities(ctx, map, cam, actors);
    if (light) light(ctx, cam);
  }
}
