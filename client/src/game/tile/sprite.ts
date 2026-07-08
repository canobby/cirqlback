// sprite — 4-direction animated actors (player, NPCs, animals) on top of the
// tile pipeline. An `Actor` holds a position + facing + walk state and advances
// its frame; `draw()` blits the current frame from a `Sheet` at feet-anchored
// screen coords, mirroring "right" from "left" when a sheet lacks a right row.

import type { Sheet } from "./tileset";

export type Dir4 = "down" | "up" | "left" | "right";

/** The sheet ROW to use for each facing (within an idle- or walk-block). */
export interface DirRows { down: number; up: number; left: number; right: number; }

/** How to read an actor spritesheet: frame size, direction rows, timing. */
export interface ActorAnim {
  fw: number; fh: number;   // frame size in source px
  frames: number;           // frames per direction row
  idle: DirRows;            // rows for standing (subtle breathe)
  walk: DirRows;            // rows for walking
  idleFps: number;
  walkFps: number;
  /** When true, "right" mirrors the "left" row (sheet has no dedicated right). */
  flipRight?: boolean;
}

/**
 * Cute Fantasy `Player.png` — 6 frames × 10 rows of 32×32.
 * Row map is our best decode (idle 4-dir, walk 4-dir, 2 action rows); the tile-lab
 * lets us confirm/tweak these live, so keep this a plain mutable object.
 */
export const PLAYER_ANIM: ActorAnim = {
  fw: 32, fh: 32, frames: 6,
  idle: { down: 0, up: 1, left: 2, right: 3 },
  walk: { down: 4, up: 5, left: 6, right: 7 },
  idleFps: 4, walkFps: 10,
  flipRight: false,
};

export class Actor {
  x = 0; y = 0;               // world px (feet)
  dir: Dir4 = "down";
  moving = false;
  private t = 0;
  private frame = 0;

  constructor(public anim: ActorAnim) {}

  /** Face from a velocity vector (dominant axis wins); leaves facing if still. */
  faceFromVelocity(vx: number, vy: number): void {
    if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) return;
    if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? "right" : "left";
    else this.dir = vy > 0 ? "down" : "up";
  }

  update(dt: number): void {
    const fps = this.moving ? this.anim.walkFps : this.anim.idleFps;
    this.t += dt;
    const step = 1 / fps;
    while (this.t >= step) {
      this.t -= step;
      this.frame = (this.frame + 1) % this.anim.frames;
    }
  }

  /** Draw at screen coords `sx,sy` = the feet position; `scale` = px per source px. */
  draw(ctx: CanvasRenderingContext2D, sheet: Sheet, sx: number, sy: number, scale: number): void {
    const a = this.anim;
    const rows = this.moving ? a.walk : a.idle;
    let dir = this.dir;
    let flip = false;
    let row = rows[dir];
    if (a.flipRight && dir === "right") { row = rows.left; flip = true; }
    const dw = a.fw * scale, dh = a.fh * scale;
    const dx = Math.round(sx - dw / 2), dy = Math.round(sy - dh);
    if (flip) {
      ctx.save();
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      sheet.frame(ctx, a.fw, a.fh, this.frame, row, 0, 0, dw, dh);
      ctx.restore();
    } else {
      sheet.frame(ctx, a.fw, a.fh, this.frame, row, dx, dy, dw, dh);
    }
  }
}
