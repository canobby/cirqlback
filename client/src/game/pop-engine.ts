// Cirql Pop — engine (CirqlArcade). Built on `arcade-core`'s ArcadeEngine.
//
// Puzzle Bobble, turned inside-out onto a circle: you sit at the CENTRE and shoot
// coloured bubbles OUTWARD into concentric rings that slowly rotate. Land three or
// more of a colour together and they pop (and any cluster cut off from the rim
// drops for a bonus). Every so often a fresh row appears at the rim and the whole
// field creeps inward — pop fast enough to keep it away from the centre, or you're
// buried. Radial instead of vertical, so it reads fresh.
//
// Owns ONLY the canvas (base class provides loop, fx, audio, haptics, geometry,
// input). The React host renders menu / HUD / end screen and drives it via
// `start()` + `aimTo` / `shoot` / `swap`; the engine reports HUD via `onHud`
// (on change) and the run's end via `onRunEnd`.

import { ArcadeEngine, type ArcadeOpts, TAU, norm, LS } from "./arcade-core";

export interface PopHud {
  score: number;
  combo: number;
  best: number;
  current: string; // current bubble color
  next: string;    // queued bubble color
  danger: number;  // 0..1 — how close the innermost bubble is to the centre
}
export interface PopResult { score: number; best: number; comboMax: number; }
export interface PopOpts extends ArcadeOpts {
  accent?: string;
  onHud?: (s: PopHud) => void;
  onRunEnd?: (r: PopResult) => void;
}

type Flow = "menu" | "playing" | "over";

// Neon bubble palette (4 colours keeps matches attainable; tweakable).
const COLORS = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24"];
const SEG = 16;                 // angular slots per ring
const SEG_A = TAU / SEG;
const ADD_INTERVAL = 9;         // seconds between new rim rows
const START_ROWS = 3;
const ROT_SPEED = 0.12;         // field rotation (rad/s) — the "slowly rotate"
const SCALE_NOTES = [329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

interface Shot { x: number; y: number; vx: number; vy: number; color: string; seg: number; targetRing: number; targetR: number; }

export class PopEngine extends ArcadeEngine {
  private opts: PopOpts;
  private accent = "#a78bfa";

  private flow: Flow = "menu";
  private score = 0;
  private combo = 0; private comboMax = 0;
  private best = +(LS.get("cpop_best") || 0);

  // polar grid: key `${ring}:${seg}` → color. ring 0 = rim (outer), ring↑ = inward.
  private grid = new Map<string, string>();
  private rot = 0;
  private addTimer = ADD_INTERVAL;

  private aim = -Math.PI / 2;
  private current = COLORS[0];
  private next = COLORS[1];
  private shot: Shot | null = null;
  private dragging = false;

  // geometry-derived (set in onResize)
  private br = 18;         // bubble radius
  private outerR = 240;    // radius of ring 0 (rim)
  private spacing = 34;    // radial gap between rings
  private loseRing = 7;    // reaching this ring = overrun

  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: PopOpts = {}) {
    super(canvas, opts);
    this.opts = opts;
    if (opts.accent) this.accent = opts.accent;
    this.computeGeom();
    this.emitHud();
  }

  private computeGeom() {
    this.br = this.rimR * 0.052;
    this.outerR = this.rimR * 0.92;
    this.spacing = this.br * 1.92;
    // innermost ring still comfortably outside the shooter → lose ring
    this.loseRing = Math.max(4, Math.floor((this.outerR - this.br * 3.2) / this.spacing));
  }
  protected onResize() { this.computeGeom(); }

  private key(ring: number, seg: number) { return ring + ":" + ((seg % SEG) + SEG) % SEG; }
  private ringR(ring: number) { return this.outerR - ring * this.spacing; }
  private cellAngle(seg: number) { return this.rot + seg * SEG_A; }
  private randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

  // ---------- public API ----------
  start() {
    this.flow = "playing";
    this.score = 0; this.combo = 0; this.comboMax = 0;
    this.grid.clear(); this.clearFx(); this.shot = null; this.rot = 0; this.addTimer = ADD_INTERVAL;
    for (let r = 0; r < START_ROWS; r++) for (let s = 0; s < SEG; s++) if (Math.random() < 0.82) this.grid.set(this.key(r, s), this.randColor());
    this.current = this.randColor(); this.next = this.randColor();
    this.aim = -Math.PI / 2;
    this.emitHud();
  }
  aimTo(angle: number) { this.aim = angle; }
  shoot() {
    if (this.flow !== "playing" || this.shot) return;
    const seg = this.aimSeg(this.aim);
    const targetRing = this.landingRing(seg);
    const targetR = this.ringR(targetRing);
    const sp = this.rimR * 2.4;
    this.shot = { x: this.cx, y: this.cy, vx: Math.cos(this.aim) * sp, vy: Math.sin(this.aim) * sp, color: this.current, seg, targetRing, targetR };
    this.current = this.next; this.next = this.randColor();
    this.tone(430, 0.05, "sawtooth", 0.03);
    this.emitHud();
  }
  swap() {
    if (this.flow !== "playing") return;
    const t = this.current; this.current = this.next; this.next = t;
    this.tone(300, 0.05, "sine", 0.04); this.emitHud();
  }
  setCosmetic(accent: string) { this.accent = accent || "#a78bfa"; }
  toMenu() { this.flow = "menu"; this.grid.clear(); this.clearFx(); this.shot = null; }
  peekBest() { return this.best; }

  // ---------- input ----------
  protected onPointerDown(e: PointerEvent) { this.dragging = true; this.aim = this.pointerAngle(e); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.dragging) this.aim = this.pointerAngle(e); }
  protected onPointerUp() { this.dragging = false; }
  protected onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") this.aim -= 0.1;
    else if (e.key === "ArrowRight") this.aim += 0.1;
    else if (e.key === " ") { e.preventDefault(); this.shoot(); }
    else if (e.key.toLowerCase() === "s") this.swap();
  }

  // ---------- grid helpers ----------
  private aimSeg(angle: number) { return (Math.round(norm(angle - this.rot) / SEG_A) % SEG + SEG) % SEG; }
  // Innermost empty cell a shot lands in for a column: just centre-ward of the
  // innermost bubble (or the rim if the column is empty).
  private landingRing(seg: number) {
    let maxRing = -1;
    for (let r = 0; r <= this.loseRing + 1; r++) if (this.grid.has(this.key(r, seg))) maxRing = r;
    return maxRing < 0 ? 0 : maxRing + 1;
  }
  private neighbors(ring: number, seg: number): [number, number][] {
    return [[ring, seg + 1], [ring, seg - 1], [ring - 1, seg], [ring + 1, seg]];
  }
  private sameColorCluster(ring: number, seg: number, color: string): string[] {
    const seen = new Set<string>(), stack: [number, number][] = [[ring, seg]];
    seen.add(this.key(ring, seg));
    const out: string[] = [];
    while (stack.length) {
      const [r, s] = stack.pop()!; const k = this.key(r, s);
      if (this.grid.get(k) !== color) continue;
      out.push(k);
      for (const [nr, ns] of this.neighbors(r, s)) { const nk = this.key(nr, ns); if (!seen.has(nk) && this.grid.get(nk) === color) { seen.add(nk); stack.push([nr, ns]); } }
    }
    return out;
  }
  // Cells not connected (any colour) back to a rim (ring 0) bubble are floating.
  private removeFloating(): string[] {
    const anchored = new Set<string>(), stack: [number, number][] = [];
    for (let s = 0; s < SEG; s++) { const k = this.key(0, s); if (this.grid.has(k)) { anchored.add(k); stack.push([0, s]); } }
    while (stack.length) { const [r, s] = stack.pop()!; for (const [nr, ns] of this.neighbors(r, s)) { const nk = this.key(nr, ns); if (this.grid.has(nk) && !anchored.has(nk)) { anchored.add(nk); stack.push([nr, ns]); } } }
    const floating: string[] = [];
    for (const k of Array.from(this.grid.keys())) if (!anchored.has(k)) floating.push(k);
    return floating;
  }
  private cellXY(ring: number, seg: number) { const a = this.cellAngle(seg), r = this.ringR(ring); return { x: this.cx + Math.cos(a) * r, y: this.cy + Math.sin(a) * r }; }
  private popCells(keys: string[], color: string, chain: number) {
    for (const k of keys) {
      const [r, s] = k.split(":").map(Number); const { x, y } = this.cellXY(r, s);
      const cellColor = this.grid.get(k) || color;
      this.grid.delete(k); this.burst(x, y, cellColor, 9, this.rimR * 1.1); this.shock(x, y, cellColor, this.br * 2.4);
    }
    const f = SCALE_NOTES[Math.min(chain, SCALE_NOTES.length - 1)];
    this.tone(f, 0.14, "triangle", 0.05); this.tone(f * 2.01, 0.09, "sine", 0.02); this.buzz(10);
  }

  private innermostRing() { let m = -1; for (const k of Array.from(this.grid.keys())) { const r = +k.split(":")[0]; if (r > m) m = r; } return m; }

  private addRow() {
    // shift everything one ring inward, then drop a fresh row at the rim
    const shifted = new Map<string, string>();
    for (const [k, c] of Array.from(this.grid.entries())) { const [r, s] = k.split(":").map(Number); shifted.set(this.key(r + 1, s), c); }
    this.grid = shifted;
    for (let s = 0; s < SEG; s++) if (Math.random() < 0.82) this.grid.set(this.key(0, s), this.randColor());
    this.shock(this.cx, this.cy, "#a78bfa", this.rimR * 0.9); this.tone(180, 0.16, "sine", 0.035);
    if (this.innermostRing() >= this.loseRing) this.gameOver();
  }

  private land() {
    const shot = this.shot!; this.shot = null;
    let ring = shot.targetRing, seg = shot.seg;
    if (ring > this.loseRing) ring = this.loseRing; // clamp to the death ring
    // avoid stacking onto an occupied cell (rotation drift) — step inward to a gap
    let guard = 0;
    while (this.grid.has(this.key(ring, seg)) && ring < this.loseRing + 1 && guard++ < SEG) ring++;
    this.grid.set(this.key(ring, seg), shot.color);

    const cluster = this.sameColorCluster(ring, seg, shot.color);
    if (cluster.length >= 3) {
      this.combo++; if (this.combo > this.comboMax) this.comboMax = this.combo;
      this.popCells(cluster, shot.color, this.combo);
      this.score += Math.round(cluster.length * 10 * this.combo);
      const floating = this.removeFloating();
      if (floating.length) { this.popCells(floating, "#fff", this.combo + 1); this.score += floating.length * 20; this.pop(this.cx, this.cy - this.rimR * 0.4, "DROP +" + floating.length * 20, "#67e8f9"); }
      if (this.combo >= 2) { const { x, y } = this.cellXY(ring, seg); this.pop(x, y, "×" + this.combo, "#fbbf24"); }
    } else {
      this.combo = 0;
      const { x, y } = this.cellXY(ring, seg); this.burst(x, y, shot.color, 4, this.rimR * 0.5); this.tone(240, 0.05, "sine", 0.03);
    }
    if (this.innermostRing() >= this.loseRing) this.gameOver();
    this.emitHud();
  }

  private gameOver() {
    this.flow = "over";
    [523, 440, 349, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sine", 0.05), i * 130)); this.buzz([40, 60, 40]);
    this.best = Math.max(this.best, this.score); LS.set("cpop_best", String(this.best));
    this.opts.onRunEnd?.({ score: this.score, best: this.best, comboMax: this.comboMax });
    this.emitHud();
  }

  // ---------- step ----------
  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.rot += ROT_SPEED * dt;
    if (!this.shot) {
      this.addTimer -= dt;
      if (this.addTimer <= 0) { this.addTimer = ADD_INTERVAL; this.addRow(); }
    } else {
      const s = this.shot; s.x += s.vx * dt; s.y += s.vy * dt;
      if (Math.hypot(s.x - this.cx, s.y - this.cy) >= s.targetR) this.land();
    }
    this.emitHud();
  }

  private dangerFrac() { const inner = this.innermostRing(); return inner < 0 ? 0 : Math.min(1, inner / this.loseRing); }

  private emitHud() {
    if (!this.opts.onHud) return;
    const sig = [this.score, this.combo, this.current, this.next, Math.round(this.dangerFrac() * 20)].join("|");
    if (sig === this.lastHud) return; this.lastHud = sig;
    this.opts.onHud({ score: this.score, combo: this.combo, best: this.best, current: this.current, next: this.next, danger: this.dangerFrac() });
  }

  // ---------- draw ----------
  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    // ambient
    const danger = this.dangerFrac();
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.2);
    bg.addColorStop(0, `rgba(124,58,237,${0.08 + 0.14 * danger})`);
    bg.addColorStop(0.6, "rgba(236,72,153,.04)");
    bg.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.2, 0, TAU); ctx.fill();
    // rim
    ctx.beginPath(); ctx.arc(cx, cy, this.outerR + this.br, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.14)"; ctx.lineWidth = 2; ctx.stroke();
    // danger ring (the death radius)
    ctx.beginPath(); ctx.arc(cx, cy, this.ringR(this.loseRing), 0, TAU); ctx.strokeStyle = `rgba(251,113,133,${0.12 + 0.25 * danger})`; ctx.lineWidth = 1.5; ctx.setLineDash([3, 7]); ctx.stroke(); ctx.setLineDash([]);

    if (this.flow !== "menu") {
      // bubbles
      for (const [k, color] of Array.from(this.grid.entries())) {
        const [r, s] = k.split(":").map(Number); const a = this.cellAngle(s), rr = this.ringR(r);
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        this.drawBubble(x, y, color, this.br);
      }
      // flying shot
      if (this.shot) this.drawBubble(this.shot.x, this.shot.y, this.shot.color, this.br * 0.92);

      // shooter (centre) + aim
      const ax = cx + Math.cos(this.aim) * (this.ringR(this.loseRing) - this.br), ay = cy + Math.sin(this.aim) * (this.ringR(this.loseRing) - this.br);
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = this.current; ctx.lineWidth = 2; ctx.setLineDash([2, 6]);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      // next bubble (small, offset)
      this.drawBubble(cx + Math.cos(this.aim + Math.PI) * this.br * 1.8, cy + Math.sin(this.aim + Math.PI) * this.br * 1.8, this.next, this.br * 0.6);
      // current bubble in the chamber
      this.drawBubble(cx, cy, this.current, this.br * 0.95);
    } else {
      this.drawBubble(cx, cy, this.accent, this.br);
    }

    this.drawFx(now);
  }

  private drawBubble(x: number, y: number, color: string, r: number) {
    const { ctx } = this;
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = color;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, color); g.addColorStop(1, color);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
    // rim highlight
    ctx.globalAlpha = 0.5; ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r * 0.98, -2.2, -0.6); ctx.stroke(); ctx.globalAlpha = 1;
  }
}
