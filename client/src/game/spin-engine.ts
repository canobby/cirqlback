// Cirql Spin — engine (CirqlArcade). Built on `arcade-core`'s ArcadeEngine.
//
// Tetris, bent into a circle. Domino pieces fall inward from the rim; you spin
// them around the ring to choose a column and flip between radial (2 tall) and
// tangential (2 wide) before they lock onto the stack that grows out from the
// centre. Complete a full RING — every column filled at one radius — and it
// clears, the outer blocks collapsing inward. Instead of horizontal lines you
// complete circles. Lose when a column stacks out to the rim.
//
// Owns ONLY the canvas. Host renders menu/HUD/end and drives it via `start()` +
// `aimTo` / `rotatePiece` / `drop`; engine reports `onHud` (on change) + `onRunEnd`.

import { ArcadeEngine, type ArcadeOpts, TAU, norm, LS } from "./arcade-core";

export interface SpinHud { score: number; rings: number; combo: number; best: number; nextColor: string; }
export interface SpinResult { score: number; rings: number; best: number; comboMax: number; }
export interface SpinOpts extends ArcadeOpts {
  accent?: string;
  onHud?: (s: SpinHud) => void;
  onRunEnd?: (r: SpinResult) => void;
}

type Flow = "menu" | "playing" | "over";
type Orient = "radial" | "tangential";

const COLORS = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa"];
const SEG = 12;
const SEG_A = TAU / SEG;
const SCALE_NOTES = [329.63, 392.0, 440.0, 523.25, 659.25, 783.99, 1046.5];

interface Piece { seg: number; orient: Orient; color: string; }

export class SpinEngine extends ArcadeEngine {
  private opts: SpinOpts;
  private accent = "#38bdf8";

  private flow: Flow = "menu";
  private score = 0; private rings = 0; private combo = 0; private comboMax = 0;
  private best = +(LS.get("cspin_best") || 0);

  private grid = new Map<string, string>();   // "ring:seg" → color; ring 0 = innermost
  private piece: Piece = { seg: 0, orient: "radial", color: COLORS[0] };
  private nextColor = COLORS[1];
  private dropTimer = 0;
  private dragging = false;
  private fallY = 0; // 0..1 visual descent of the current piece

  // geometry-derived
  private innerR = 60; private spacing = 26; private cell = 12; private maxRing = 8;
  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: SpinOpts = {}) {
    super(canvas, opts);
    this.opts = opts;
    if (opts.accent) this.accent = opts.accent;
    this.computeGeom();
    this.emitHud();
  }
  private computeGeom() {
    this.innerR = this.rimR * 0.16;
    this.spacing = this.rimR * 0.088;
    this.cell = this.spacing * 0.46;
    this.maxRing = Math.max(5, Math.floor((this.rimR * 0.92 - this.innerR) / this.spacing));
  }
  protected onResize() { this.computeGeom(); }

  private key(ring: number, seg: number) { return ring + ":" + ((seg % SEG) + SEG) % SEG; }
  private ringR(ring: number) { return this.innerR + ring * this.spacing; }
  private randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
  private dropInterval() { return Math.max(1.1, 3.4 - this.rings * 0.06); }

  // ---------- public API ----------
  start() {
    this.flow = "playing";
    this.score = 0; this.rings = 0; this.combo = 0; this.comboMax = 0;
    this.grid.clear(); this.clearFx();
    this.piece = { seg: 0, orient: "radial", color: this.randColor() };
    this.nextColor = this.randColor();
    this.dropTimer = this.dropInterval(); this.fallY = 0;
    this.emitHud();
  }
  aimTo(angle: number) { this.piece.seg = (Math.round(norm(angle) / SEG_A) % SEG + SEG) % SEG; }
  rotatePiece() { if (this.flow === "playing") { this.piece.orient = this.piece.orient === "radial" ? "tangential" : "radial"; this.tone(300, 0.05, "square", 0.03); } }
  drop() { if (this.flow === "playing") this.lockPiece(); }
  setCosmetic(accent: string) { this.accent = accent || "#38bdf8"; }
  toMenu() { this.flow = "menu"; this.grid.clear(); this.clearFx(); }
  peekBest() { return this.best; }

  // ---------- input ----------
  protected onPointerDown(e: PointerEvent) { this.dragging = true; this.aimTo(this.pointerAngle(e)); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.dragging) this.aimTo(this.pointerAngle(e)); }
  protected onPointerUp() { this.dragging = false; }
  protected onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") this.piece.seg = (this.piece.seg - 1 + SEG) % SEG;
    else if (e.key === "ArrowRight") this.piece.seg = (this.piece.seg + 1) % SEG;
    else if (e.key === "ArrowUp") this.rotatePiece();
    else if (e.key === " ") { e.preventDefault(); this.drop(); }
  }

  // ---------- placement ----------
  private topRing(seg: number) { let t = -1; for (let r = 0; r <= this.maxRing + 2; r++) if (this.grid.has(this.key(r, seg))) t = r; return t; }
  // Cells the current piece would occupy if locked now.
  private pieceCells(p: Piece): [number, number][] {
    if (p.orient === "radial") { const base = this.topRing(p.seg) + 1; return [[base, p.seg], [base + 1, p.seg]]; }
    const s2 = (p.seg + 1) % SEG; const base = Math.max(this.topRing(p.seg), this.topRing(s2)) + 1; return [[base, p.seg], [base, s2]];
  }
  private lockPiece() {
    const cells = this.pieceCells(this.piece);
    for (const [r, s] of cells) this.grid.set(this.key(r, s), this.piece.color);
    // fx at each cell
    for (const [r, s] of cells) { const a = s * SEG_A, rr = this.ringR(r); this.burst(this.cx + Math.cos(a) * rr, this.cy + Math.sin(a) * rr, this.piece.color, 5, this.rimR * 0.5); }
    this.tone(220, 0.05, "sine", 0.04); this.buzz(6);
    const overflow = cells.some(([r]) => r >= this.maxRing);
    this.clearRings();
    if (overflow || cells.some(([r]) => r >= this.maxRing)) { this.gameOver(); return; }
    // next piece
    this.piece = { seg: this.piece.seg, orient: "radial", color: this.nextColor };
    this.nextColor = this.randColor();
    this.dropTimer = this.dropInterval(); this.fallY = 0;
    this.emitHud();
  }

  private ringComplete(ring: number) { for (let s = 0; s < SEG; s++) if (!this.grid.has(this.key(ring, s))) return false; return true; }
  private clearRings() {
    const full: number[] = [];
    for (let r = 0; r <= this.maxRing + 2; r++) if (this.ringComplete(r)) full.push(r);
    if (!full.length) { this.combo = 0; return; }
    this.combo++; if (this.combo > this.comboMax) this.comboMax = this.combo;
    // pop fx for each cleared ring
    for (const r of full) for (let s = 0; s < SEG; s++) { const a = s * SEG_A, rr = this.ringR(r); this.burst(this.cx + Math.cos(a) * rr, this.cy + Math.sin(a) * rr, "#fff", 6, this.rimR * 0.7); }
    this.shock(this.cx, this.cy, this.accent, this.ringR(full[full.length - 1]) + this.spacing);
    const f = SCALE_NOTES[Math.min(full.length - 1, SCALE_NOTES.length - 1)];
    [f, f * 1.26, f * 1.5].forEach((fr, i) => setTimeout(() => this.tone(fr, 0.4, "sine", 0.04), i * 45)); this.buzz([12, 24, 12]);
    // collapse: remove full rings, shift outer cells inward
    const removed = new Set(full);
    const rebuilt = new Map<string, string>();
    for (let r = 0; r <= this.maxRing + 2; r++) {
      if (removed.has(r)) continue;
      const shift = full.filter((fr) => fr < r).length; // how many cleared rings are below this one
      for (let s = 0; s < SEG; s++) { const k = this.key(r, s); const c = this.grid.get(k); if (c) rebuilt.set(this.key(r - shift, s), c); }
    }
    this.grid = rebuilt;
    this.rings += full.length;
    this.score += Math.round(full.length * full.length * 100 * this.combo);
    if (full.length >= 2) this.pop(this.cx, this.cy - this.rimR * 0.5, full.length + "× RING", "#fbbf24");
  }

  private gameOver() {
    this.flow = "over";
    [523, 415, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sine", 0.05), i * 130)); this.buzz([40, 60, 40]);
    this.best = Math.max(this.best, this.score); LS.set("cspin_best", String(this.best));
    this.opts.onRunEnd?.({ score: this.score, rings: this.rings, best: this.best, comboMax: this.comboMax });
    this.emitHud();
  }

  // ---------- step ----------
  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.dropTimer -= dt; this.fallY = 1 - Math.max(0, this.dropTimer) / this.dropInterval();
    if (this.dropTimer <= 0) this.lockPiece();
    this.emitHud();
  }

  private emitHud() {
    if (!this.opts.onHud) return;
    const sig = [this.score, this.rings, this.combo, this.nextColor].join("|");
    if (sig === this.lastHud) return; this.lastHud = sig;
    this.opts.onHud({ score: this.score, rings: this.rings, combo: this.combo, best: this.best, nextColor: this.nextColor });
  }

  // ---------- draw ----------
  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.2);
    bg.addColorStop(0, "rgba(56,189,248,.08)"); bg.addColorStop(0.6, "rgba(124,58,237,.05)"); bg.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.2, 0, TAU); ctx.fill();

    // grid guide rings + spokes
    ctx.strokeStyle = "rgba(150,130,255,.08)"; ctx.lineWidth = 1;
    for (let r = 0; r <= this.maxRing; r++) { ctx.beginPath(); ctx.arc(cx, cy, this.ringR(r), 0, TAU); ctx.stroke(); }
    // rim (death radius)
    ctx.beginPath(); ctx.arc(cx, cy, this.ringR(this.maxRing), 0, TAU); ctx.strokeStyle = "rgba(251,113,133,.18)"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 7]); ctx.stroke(); ctx.setLineDash([]);

    if (this.flow !== "menu") {
      for (const [k, color] of Array.from(this.grid.entries())) { const [r, s] = k.split(":").map(Number); this.drawCell(r, s, color, 1); }
      // ghost + falling piece
      const cells = this.pieceCells(this.piece);
      for (const [r, s] of cells) this.drawCell(r, s, this.piece.color, 0.28); // ghost at landing
      // the piece descending from the rim toward its landing ring
      for (const [r, s] of cells) {
        const a = s * SEG_A;
        const startR = this.ringR(this.maxRing) + this.spacing;
        const rr = startR + (this.ringR(r) - startR) * this.fallY;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        this.drawBlock(x, y, this.piece.color, 1);
      }
    }
    this.drawFx(now);
  }
  private drawCell(ring: number, seg: number, color: string, alpha: number) {
    const a = seg * SEG_A, rr = this.ringR(ring);
    this.drawBlock(this.cx + Math.cos(a) * rr, this.cy + Math.sin(a) * rr, color, alpha);
  }
  private drawBlock(x: number, y: number, color: string, alpha: number) {
    const { ctx, cell } = this;
    ctx.save(); ctx.globalAlpha = alpha; ctx.shadowBlur = 8 * alpha; ctx.shadowColor = color;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, cell, 0, TAU); ctx.fill();
    ctx.globalAlpha = alpha * 0.6; ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(x - cell * 0.28, y - cell * 0.28, cell * 0.3, 0, TAU); ctx.fill();
    ctx.restore(); ctx.globalAlpha = 1;
  }
}
