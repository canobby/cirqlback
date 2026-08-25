// tilemap — the per-island data model: a grid of ground terrain + collision,
// plus a list of placed props (decor/objects/overhead). The renderer autotiles
// the ground and depth-sorts the props; ring-gen (P4) will PAINT into this.
//
// Ground is stored as terrain *names* (not raw tile ids) so the renderer can
// autotile transitions from neighbours. Props are sprites with a world position.

import type { Same } from "./autotile";

/** Built-in terrain names. Extensible — the renderer maps name → sheet/blob. */
export type Terrain = "grass" | "water" | "path" | "sand" | "cliff" | (string & {});

/** Collision override per cell: 0 = derive from terrain, 1 = force solid, 2 = force open. */
const enum Solid { Derive = 0, On = 1, Off = 2 }

/** A placed sprite in the world (tree, house, decoration, actor spawn). */
export interface Prop {
  sheet: string;          // atlas sheet name
  fw: number; fh: number; // frame size in source px
  col: number; row: number;
  x: number; y: number;   // world px of the prop's FEET (bottom-centre anchor)
  scale?: number;         // draw scale (defaults to the map's tile scale)
  overhead?: boolean;     // drawn over the player (tree canopy) when player is below
  solidR?: number;        // collision radius in world px (0/undefined = walk-through)
  ax?: number; ay?: number; // anchor override (0..1 within frame; default 0.5,1.0 = feet)
  flip?: boolean;           // mirror horizontally (e.g. a critter facing its travel direction)
}

/** A hand-placed tile drawn above the autotiled ground (authored structures:
 *  cliff faces, bridge decks, road corners — things the autotiler shouldn't touch). */
export interface OverlayCell { sheet: string; col: number; row: number; cell: number; }

export class TileMap {
  readonly ground: Terrain[];
  private readonly solid: Uint8Array;
  readonly overlay: (OverlayCell | undefined)[];
  props: Prop[] = [];
  /** Terrains that block walking unless a cell overrides. */
  solidTerrain = new Set<Terrain>(["water", "cliff"]);
  /** Out-of-bounds neighbour policy for autotiling — true = treat edges as same terrain. */
  edgeSame = true;

  constructor(
    readonly w: number,
    readonly h: number,
    readonly tile = 16,
    fill: Terrain = "grass",
  ) {
    this.ground = new Array(w * h).fill(fill);
    this.solid = new Uint8Array(w * h);
    this.overlay = new Array(w * h);
  }

  // ---- overlay layer (authored structures above ground) ----
  setOverlay(tx: number, ty: number, sheet: string, col: number, row: number, cell = 16): void {
    if (this.inBounds(tx, ty)) this.overlay[this.idx(tx, ty)] = { sheet, col, row, cell };
  }
  getOverlay(tx: number, ty: number): OverlayCell | undefined {
    return this.inBounds(tx, ty) ? this.overlay[this.idx(tx, ty)] : undefined;
  }
  /** Place a rectangular block of a sheet's cells (col0..,row0.. → tx..,ty..). */
  overlayBlock(tx: number, ty: number, sheet: string, col0: number, row0: number, cols: number, rows: number, cell = 16): void {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      this.setOverlay(tx + c, ty + r, sheet, col0 + c, row0 + r, cell);
  }

  // ---- indexing ----
  idx(tx: number, ty: number): number { return ty * this.w + tx; }
  inBounds(tx: number, ty: number): boolean { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; }

  get(tx: number, ty: number): Terrain {
    return this.inBounds(tx, ty) ? this.ground[this.idx(tx, ty)] : "grass";
  }
  set(tx: number, ty: number, t: Terrain): void {
    if (this.inBounds(tx, ty)) this.ground[this.idx(tx, ty)] = t;
  }

  // ---- authoring helpers (P1 hand-paints; P4 generates) ----
  fillRect(tx: number, ty: number, tw: number, th: number, t: Terrain): void {
    for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) this.set(x, y, t);
  }
  /** Paint a filled disc of terrain (ponds). Radius in tiles. */
  paintCircle(cx: number, cy: number, r: number, t: Terrain): void {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.set(x, y, t);
      }
  }
  /** Paint a thick line of terrain from (x0,y0)→(x1,y1) in tiles (rivers, roads). */
  paintLine(x0: number, y0: number, x1: number, y1: number, t: Terrain, width = 1): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    const rad = (width - 1) / 2;
    for (let i = 0; i <= steps; i++) {
      const cx = x0 + ((x1 - x0) * i) / steps, cy = y0 + ((y1 - y0) * i) / steps;
      for (let dy = -Math.ceil(rad); dy <= rad; dy++)
        for (let dx = -Math.ceil(rad); dx <= rad; dx++)
          if (dx * dx + dy * dy <= (rad + 0.5) * (rad + 0.5))
            this.set(Math.round(cx + dx), Math.round(cy + dy), t);
    }
  }

  addProp(p: Prop): Prop { this.props.push(p); return p; }

  // ---- autotiling support ----
  /** Is the terrain at (tx,ty) the same as `t`? Honours the edge policy. */
  sameAt(tx: number, ty: number, t: Terrain): boolean {
    if (!this.inBounds(tx, ty)) return this.edgeSame;
    return this.get(tx, ty) === t;
  }
  /** The 8-neighbour "same terrain?" mask for autotiling cell (tx,ty). */
  neighbourhood(tx: number, ty: number, t: Terrain): Same {
    return {
      n: this.sameAt(tx, ty - 1, t), s: this.sameAt(tx, ty + 1, t),
      w: this.sameAt(tx - 1, ty, t), e: this.sameAt(tx + 1, ty, t),
      ne: this.sameAt(tx + 1, ty - 1, t), nw: this.sameAt(tx - 1, ty - 1, t),
      se: this.sameAt(tx + 1, ty + 1, t), sw: this.sameAt(tx - 1, ty + 1, t),
    };
  }

  // ---- collision ----
  setSolid(tx: number, ty: number, on: boolean | null): void {
    if (this.inBounds(tx, ty)) this.solid[this.idx(tx, ty)] = on === null ? Solid.Derive : on ? Solid.On : Solid.Off;
  }
  isSolidTile(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return true;
    const o = this.solid[this.idx(tx, ty)];
    if (o === Solid.On) return true;
    if (o === Solid.Off) return false;
    return this.solidTerrain.has(this.get(tx, ty));
  }
  /** World-px point blocked by a solid tile? */
  blockedAtWorld(wx: number, wy: number): boolean {
    return this.isSolidTile(Math.floor(wx / this.tile), Math.floor(wy / this.tile));
  }
  /** Circle-vs-solid-tile: is a body of radius `r` at (wx,wy) overlapping any solid tile? */
  circleBlocked(wx: number, wy: number, r: number): boolean {
    const t = this.tile;
    const x0 = Math.floor((wx - r) / t), x1 = Math.floor((wx + r) / t);
    const y0 = Math.floor((wy - r) / t), y1 = Math.floor((wy + r) / t);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!this.isSolidTile(tx, ty)) continue;
      // nearest point on the tile box to the circle centre
      const nx = Math.max(tx * t, Math.min(wx, tx * t + t));
      const ny = Math.max(ty * t, Math.min(wy, ty * t + t));
      if ((wx - nx) ** 2 + (wy - ny) ** 2 <= r * r) return true;
    }
    return false;
  }

  get pxW(): number { return this.w * this.tile; }
  get pxH(): number { return this.h * this.tile; }
}
