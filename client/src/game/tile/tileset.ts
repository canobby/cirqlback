// tileset — the image-loading foundation for CIRQL's hybrid tile pipeline (P0).
//
// A `Sheet` wraps one loaded PNG and exposes crisp sub-rect / grid-cell blits.
// An `Atlas` is a named registry of sheets that preloads them together and
// reports readiness — a ring won't render until its atlas is loaded.
//
// Everything here is resolution-agnostic: tiles are 16×16, actor frames 32×32,
// props arbitrary — the caller passes the frame size to `cell()` / `draw()`.

/** Base tile edge, in source pixels. Cute Fantasy is a 16×16 grid. */
export const TILE = 16;

const _cache = new Map<string, Promise<HTMLImageElement>>();

/** Load (and cache) an image by URL. Nearest-neighbour scaling is applied by
 *  the destination context, not here. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = _cache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`tileset: failed to load ${src}`));
      img.src = src;
    });
    _cache.set(src, p);
  }
  return p;
}

/** One loaded spritesheet. `img` is null until `load()` resolves. */
export class Sheet {
  img: HTMLImageElement | null = null;
  constructor(public readonly src: string) {}

  async load(): Promise<this> {
    this.img = await loadImage(this.src);
    return this;
  }
  get ready(): boolean { return !!this.img; }
  get w(): number { return this.img?.width ?? 0; }
  get h(): number { return this.img?.height ?? 0; }

  /** Blit an arbitrary source rect to a destination rect (no-op until loaded). */
  draw(ctx: CanvasRenderingContext2D, sx: number, sy: number, sw: number, sh: number,
       dx: number, dy: number, dw: number, dh: number): void {
    if (!this.img) return;
    ctx.drawImage(this.img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  /** Blit a grid cell of a given square `size` (col,row → source rect). */
  cell(ctx: CanvasRenderingContext2D, size: number, col: number, row: number,
       dx: number, dy: number, dw: number, dh: number): void {
    this.draw(ctx, col * size, row * size, size, size, dx, dy, dw, dh);
  }

  /** Blit a frame of a non-square `fw×fh` grid (actor/prop sheets). */
  frame(ctx: CanvasRenderingContext2D, fw: number, fh: number, col: number, row: number,
        dx: number, dy: number, dw: number, dh: number): void {
    this.draw(ctx, col * fw, row * fh, fw, fh, dx, dy, dw, dh);
  }

  /** Cols/rows of 16×16 tiles in this sheet. */
  get cols16(): number { return Math.floor(this.w / TILE); }
  get rows16(): number { return Math.floor(this.h / TILE); }
}

/** A named collection of sheets, preloaded together. */
export class Atlas {
  private sheets: Record<string, Sheet> = {};

  /** Register a sheet under `name` at `src` (chainable). */
  add(name: string, src: string): this {
    this.sheets[name] = new Sheet(src);
    return this;
  }
  /** Register many at once from a `{name: src}` map. */
  addAll(map: Record<string, string>): this {
    for (const [name, src] of Object.entries(map)) this.add(name, src);
    return this;
  }
  get(name: string): Sheet {
    const s = this.sheets[name];
    if (!s) throw new Error(`atlas: unknown sheet "${name}"`);
    return s;
  }
  has(name: string): boolean { return name in this.sheets; }

  /** Load every registered sheet; resolves when all are ready. */
  async loadAll(): Promise<this> {
    await Promise.all(Object.values(this.sheets).map((s) => s.load()));
    return this;
  }
  get ready(): boolean {
    return Object.values(this.sheets).every((s) => s.ready);
  }
}
