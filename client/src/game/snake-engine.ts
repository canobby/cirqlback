// Cirql Snake — engine (CirqlArcade). Built on `arcade-core`'s ArcadeEngine.
//
// Snake, freed from the grid. A glowing snake circles the arena on concentric
// lanes; you hop it inward or outward to weave between orbs and your own trail.
// Eat to grow, boost to escape, and don't cross yourself. Endless survival with a
// neon trail that looks the part.
//
// Owns ONLY the canvas. Host renders menu/HUD/end and drives it via `start()` +
// `setLane` / `nudge` / `boost`; engine reports `onHud` (on change) + `onRunEnd`.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface SnakeHud { score: number; orbs: number; length: number; best: number; boostReady: boolean; }
export interface SnakeResult { score: number; orbs: number; best: number; }
export interface SnakeOpts extends ArcadeOpts {
  accent?: string;
  onHud?: (s: SnakeHud) => void;
  onRunEnd?: (r: SnakeResult) => void;
}

type Flow = "menu" | "playing" | "over";
interface Orb { lane: number; angle: number; hue: string; pulse: number; dead?: boolean; }

const LANES = 5;
const BOOST_CD = 2400;

export class SnakeEngine extends ArcadeEngine {
  private opts: SnakeOpts;
  private accent = "#34d399";

  private flow: Flow = "menu";
  private score = 0; private orbsEaten = 0;
  private best = +(LS.get("csnake_best") || 0);

  // snake head
  private angle = -Math.PI / 2;
  private dir = 1;                 // travels clockwise
  private rHead = 0;              // current radius (eases toward target lane)
  private lane = 2;              // target lane index
  private speed = 1.7;          // rad/s
  private trail: { x: number; y: number }[] = [];
  private bodyLen = 26;         // visible/collidable trail points
  private boostUntil = 0; private boostReadyAt = 0;

  private orbs: Orb[] = [];
  private orbTimer = 0;
  private dragging = false;

  // geometry-derived
  private laneR: number[] = [];
  private headR = 8;
  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: SnakeOpts = {}) {
    super(canvas, opts);
    this.opts = opts;
    if (opts.accent) this.accent = opts.accent;
    this.computeGeom();
    this.rHead = this.laneR[this.lane];
    this.emitHud();
  }
  private computeGeom() {
    const inner = this.rimR * 0.34, outer = this.rimR * 0.88;
    this.laneR = Array.from({ length: LANES }, (_, i) => inner + (outer - inner) * (i / (LANES - 1)));
    this.headR = this.rimR * 0.032;
  }
  protected onResize() { this.computeGeom(); }

  // ---------- public API ----------
  start() {
    this.flow = "playing";
    this.score = 0; this.orbsEaten = 0;
    this.angle = -Math.PI / 2; this.dir = 1; this.lane = 2; this.rHead = this.laneR[2];
    this.speed = 1.7; this.trail = []; this.bodyLen = 26;
    this.orbs = []; this.orbTimer = 0; this.boostUntil = 0; this.boostReadyAt = 0;
    this.clearFx();
    for (let i = 0; i < 4; i++) this.spawnOrb();
    this.emitHud();
  }
  setLane(l: number) { this.lane = Math.max(0, Math.min(LANES - 1, Math.round(l))); }
  /** Nudge one lane inward (-1) or outward (+1). */
  nudge(delta: number) { this.setLane(this.lane + delta); this.tone(360, 0.04, "sine", 0.03); }
  /** Aim the target lane at a radius (host drag on the field). */
  laneFromRadius(r: number) { let best = 0, bd = 1e9; for (let i = 0; i < LANES; i++) { const d = Math.abs(this.laneR[i] - r); if (d < bd) { bd = d; best = i; } } this.setLane(best); }
  boost() {
    if (this.flow !== "playing" || performance.now() < this.boostReadyAt) return;
    this.boostUntil = performance.now() + 700; this.boostReadyAt = performance.now() + BOOST_CD;
    this.tone(520, 0.12, "sawtooth", 0.04); this.buzz(12); this.emitHud();
  }
  setCosmetic(accent: string) { this.accent = accent || "#34d399"; }
  toMenu() { this.flow = "menu"; this.trail = []; this.orbs = []; this.clearFx(); }
  peekBest() { return this.best; }

  // ---------- input ----------
  protected onPointerDown(e: PointerEvent) { this.dragging = true; this.applyPointer(e); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.dragging) this.applyPointer(e); }
  protected onPointerUp() { this.dragging = false; }
  private applyPointer(e: PointerEvent) { const p = this.pointerPos(e); this.laneFromRadius(Math.hypot(p.x - this.cx, p.y - this.cy)); }
  protected onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") this.nudge(1);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") this.nudge(-1);
    else if (e.key === " ") { e.preventDefault(); this.boost(); }
  }

  private spawnOrb() {
    const lane = Math.floor(Math.random() * LANES);
    const angle = Math.random() * TAU;
    const hue = ["#fbbf24", "#f472b6", "#38bdf8", "#a78bfa"][Math.floor(Math.random() * 4)];
    this.orbs.push({ lane, angle, hue, pulse: Math.random() * TAU });
  }

  private die() {
    this.flow = "over";
    this.shake = 16; this.burst(this.trail[0]?.x ?? this.cx, this.trail[0]?.y ?? this.cy, this.accent, 30, this.rimR * 1.2);
    [440, 349, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sine", 0.05), i * 130)); this.buzz([40, 60, 40]);
    this.best = Math.max(this.best, this.score); LS.set("csnake_best", String(this.best));
    this.opts.onRunEnd?.({ score: this.score, orbs: this.orbsEaten, best: this.best });
    this.emitHud();
  }

  // ---------- step ----------
  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    const boosting = now < this.boostUntil;
    const sp = this.speed * (boosting ? 1.9 : 1);
    this.angle += this.dir * sp * dt;
    // ease radius toward the target lane
    const target = this.laneR[this.lane];
    this.rHead += (target - this.rHead) * Math.min(1, dt * 10);
    const hx = this.cx + Math.cos(this.angle) * this.rHead, hy = this.cy + Math.sin(this.angle) * this.rHead;
    // record trail
    this.trail.unshift({ x: hx, y: hy });
    const keep = Math.ceil(this.bodyLen) + 4;
    if (this.trail.length > keep) this.trail.length = keep;

    // eat orbs
    for (const o of this.orbs) {
      const ox = this.cx + Math.cos(o.angle) * this.laneR[o.lane], oy = this.cy + Math.sin(o.angle) * this.laneR[o.lane];
      if (Math.hypot(ox - hx, oy - hy) < this.headR + this.rimR * 0.028) {
        o.dead = true; this.orbsEaten++; this.score += Math.round(10 * (boosting ? 2 : 1));
        this.bodyLen += 5; this.speed = Math.min(3.4, this.speed + 0.045);
        this.burst(ox, oy, o.hue, 10, this.rimR * 0.9); this.shock(ox, oy, o.hue, this.headR * 3);
        const f = 400 + Math.min(this.orbsEaten, 20) * 30; this.tone(f, 0.1, "triangle", 0.045); this.tone(f * 2, 0.06, "sine", 0.02); this.buzz(8);
      }
    }
    this.orbs = this.orbs.filter((o) => !o.dead);
    this.orbTimer -= dt; if (this.orbTimer <= 0 && this.orbs.length < 6) { this.spawnOrb(); this.orbTimer = 1.6; }

    // self-collision: head vs body points beyond a safety gap
    const gap = 10;
    for (let i = gap; i < this.trail.length; i++) {
      if (Math.hypot(this.trail[i].x - hx, this.trail[i].y - hy) < this.headR * 1.15) { this.die(); return; }
    }
    this.emitHud();
  }

  private emitHud() {
    if (!this.opts.onHud) return;
    const ready = performance.now() >= this.boostReadyAt;
    const sig = [this.score, this.orbsEaten, Math.round(this.bodyLen), ready].join("|");
    if (sig === this.lastHud) return; this.lastHud = sig;
    this.opts.onHud({ score: this.score, orbs: this.orbsEaten, length: Math.round(this.bodyLen), best: this.best, boostReady: ready });
  }

  // ---------- draw ----------
  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.2);
    bg.addColorStop(0, "rgba(52,211,153,.06)"); bg.addColorStop(0.6, "rgba(124,58,237,.05)"); bg.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.2, 0, TAU); ctx.fill();

    // lanes
    for (let i = 0; i < LANES; i++) { ctx.beginPath(); ctx.arc(cx, cy, this.laneR[i], 0, TAU); ctx.strokeStyle = i === this.lane ? "rgba(52,211,153,.22)" : "rgba(150,130,255,.08)"; ctx.lineWidth = i === this.lane ? 2 : 1; ctx.stroke(); }

    if (this.flow !== "menu") {
      // orbs
      for (const o of this.orbs) { const x = cx + Math.cos(o.angle) * this.laneR[o.lane], y = cy + Math.sin(o.angle) * this.laneR[o.lane]; const p = 1 + 0.18 * Math.sin(now / 200 + o.pulse);
        ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = o.hue; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, this.rimR * 0.02 * p, 0, TAU); ctx.fill(); ctx.fillStyle = o.hue; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(x, y, this.rimR * 0.032 * p, 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }

      // body trail
      const n = Math.min(this.trail.length, Math.ceil(this.bodyLen));
      for (let i = n - 1; i >= 0; i--) { const k = 1 - i / n; const p = this.trail[i]; ctx.globalAlpha = 0.15 + 0.7 * k; ctx.fillStyle = this.accent; ctx.beginPath(); ctx.arc(p.x, p.y, this.headR * (0.5 + 0.5 * k), 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      // head
      if (this.trail[0]) { const boosting = now < this.boostUntil; ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = boosting ? "#a5f3fc" : this.accent; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(this.trail[0].x, this.trail[0].y, this.headR, 0, TAU); ctx.fill(); ctx.restore(); }
    }
    this.drawFx(now);
  }
}
