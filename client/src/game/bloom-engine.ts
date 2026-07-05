// Cirql Bloom — engine (CirqlArcade). Built on `arcade-core`'s ArcadeEngine.
//
// The calm one. A seed waits at the centre; motes of light drift through the dark.
// Sweep your finger to gather them and the seed answers — petals unfurl, ring by
// ring, until the whole circle is a living, breathing bloom. No enemies, no clock,
// no way to lose. Just growth. You leave when you're ready ("Finish"), and your
// garden's size is what you carry to the board.
//
// Owns ONLY the canvas. Host renders menu/HUD/end and drives it via `start()` +
// `finish`; engine reports `onHud` (on change) + `onRunEnd`.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface BloomHud { blooms: number; energy: number; toNext: number; best: number; }
export interface BloomResult { blooms: number; score: number; best: number; }
export interface BloomOpts extends ArcadeOpts {
  accent?: string;
  onHud?: (s: BloomHud) => void;
  onRunEnd?: (r: BloomResult) => void;
}

type Flow = "menu" | "playing" | "over";
interface Mote { x: number; y: number; vx: number; vy: number; hue: string; life: number; tw?: number; dead?: boolean; }
interface PetalRing { radius: number; count: number; hue: string; phase: number; born: number; }

const HUES = ["#f9a8d4", "#a5f3fc", "#c4b5fd", "#fde68a", "#6ee7b7", "#fca5a5"];

export class BloomEngine extends ArcadeEngine {
  private opts: BloomOpts;
  private accent = "#f9a8d4";

  private flow: Flow = "menu";
  private energy = 0; private blooms = 0; private toNext = 4;
  private best = +(LS.get("cbloom_best") || 0);

  private motes: Mote[] = [];
  private rings: PetalRing[] = [];
  private moteTimer = 0;
  private t = 0;
  private pointer: { x: number; y: number } | null = null;

  private innerR = 40; private spacing = 26;
  private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: BloomOpts = {}) {
    super(canvas, opts);
    this.opts = opts;
    if (opts.accent) this.accent = opts.accent;
    this.computeGeom();
    this.emitHud();
  }
  private computeGeom() { this.innerR = this.rimR * 0.14; this.spacing = this.rimR * 0.1; }
  protected onResize() { this.computeGeom(); }

  // ---------- public API ----------
  start() {
    this.flow = "playing";
    this.energy = 0; this.blooms = 0; this.toNext = 4;
    this.motes = []; this.rings = []; this.clearFx(); this.moteTimer = 0; this.t = 0;
    for (let i = 0; i < 6; i++) this.spawnMote();
    this.emitHud();
  }
  finish() {
    if (this.flow !== "playing") return;
    this.flow = "over";
    const score = this.blooms * 100 + this.energy * 5;
    this.best = Math.max(this.best, score); LS.set("cbloom_best", String(this.best));
    this.opts.onRunEnd?.({ blooms: this.blooms, score, best: this.best });
    this.emitHud();
  }
  setCosmetic(accent: string) { this.accent = accent || "#f9a8d4"; }
  toMenu() { this.flow = "menu"; this.motes = []; this.rings = []; this.clearFx(); }
  peekBest() { return this.best; }

  // ---------- input: sweep to gather ----------
  protected onPointerDown(e: PointerEvent) { this.pointer = this.pointerPos(e); this.gather(); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.pointer) { this.pointer = this.pointerPos(e); this.gather(); } }
  protected onPointerUp() { this.pointer = null; }

  private gather() {
    if (this.flow !== "playing" || !this.pointer) return;
    const R = this.rimR * 0.11;
    for (const m of this.motes) {
      if (m.dead) continue;
      if (Math.hypot(m.x - this.pointer.x, m.y - this.pointer.y) < R) this.collect(m);
    }
  }
  private collect(m: Mote) {
    m.dead = true; this.energy++;
    this.burst(m.x, m.y, m.hue, 7, this.rimR * 0.5);
    // a light mote streams toward the seed
    this.tone(523.25 + (this.energy % 8) * 40, 0.14, "sine", 0.03); this.buzz(5);
    if (this.energy >= this.toNext) this.grow();
    this.emitHud();
  }
  private grow() {
    this.energy = 0; this.blooms++;
    this.toNext = 4 + this.blooms; // each bloom asks a little more
    const radius = this.innerR + this.blooms * this.spacing;
    this.rings.push({ radius, count: 5 + this.blooms, hue: HUES[this.blooms % HUES.length], phase: Math.random() * TAU, born: this.t });
    this.shock(this.cx, this.cy, this.accent, radius + this.spacing);
    const root = 392 + Math.min(this.blooms, 10) * 24;
    [root, root * 1.26, root * 1.5].forEach((f, i) => setTimeout(() => this.tone(f, 0.6, "sine", 0.035), i * 70)); this.buzz([8, 20, 8]);
    this.pop(this.cx, this.cy - radius - this.spacing * 0.6, "BLOOM", this.accent);
  }

  private spawnMote() {
    const a = Math.random() * TAU, r = this.rimR * (0.5 + Math.random() * 0.5);
    const hue = HUES[Math.floor(Math.random() * HUES.length)];
    this.motes.push({ x: this.cx + Math.cos(a) * r, y: this.cy + Math.sin(a) * r, vx: (Math.random() - 0.5) * this.rimR * 0.06, vy: (Math.random() - 0.5) * this.rimR * 0.06, hue, life: 1, tw: Math.random() * TAU });
  }

  // ---------- step ----------
  protected step(dt: number, _now: number) {
    this.t += dt;
    if (this.flow !== "playing") return;
    for (const m of this.motes) {
      if (m.dead) continue;
      m.x += m.vx * dt; m.y += m.vy * dt;
      // gentle drift back toward mid-field, soft wander
      const dx = m.x - this.cx, dy = m.y - this.cy, d = Math.hypot(dx, dy) || 1;
      if (d > this.rimR * 0.98) { m.vx -= (dx / d) * this.rimR * 0.12 * dt; m.vy -= (dy / d) * this.rimR * 0.12 * dt; }
      if (d < this.innerR * 1.4) { m.vx += (dx / d) * this.rimR * 0.1 * dt; m.vy += (dy / d) * this.rimR * 0.1 * dt; }
      m.life -= dt * 0.05;
      if (m.life <= 0) m.dead = true;
    }
    this.motes = this.motes.filter((m) => !m.dead);
    this.moteTimer -= dt;
    if (this.moteTimer <= 0 && this.motes.length < 14) { this.spawnMote(); this.moteTimer = 1.1; }
    this.emitHud();
  }

  private emitHud() {
    if (!this.opts.onHud) return;
    const sig = [this.blooms, this.energy, this.toNext].join("|");
    if (sig === this.lastHud) return; this.lastHud = sig;
    this.opts.onHud({ blooms: this.blooms, energy: this.energy, toNext: this.toNext, best: this.best });
  }

  // ---------- draw ----------
  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const sway = this.reduce ? 0 : 1;
    // soft aura, brighter as the garden grows
    const life = Math.min(1, this.blooms / 12);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.2);
    g.addColorStop(0, `rgba(249,168,212,${0.08 + 0.14 * life})`);
    g.addColorStop(0.5, `rgba(167,139,250,${0.04 + 0.08 * life})`);
    g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.2, 0, TAU); ctx.fill();

    // petal rings (outer first so inner sits on top)
    for (const ring of this.rings) {
      const age = Math.min(1, (this.t - ring.born) * 1.6); // unfurl
      for (let i = 0; i < ring.count; i++) {
        const a = (i / ring.count) * TAU + ring.phase + Math.sin(this.t * 0.6 + ring.phase + i) * 0.04 * sway;
        const r = ring.radius * age;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.shadowBlur = 12; ctx.shadowColor = ring.hue;
        const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, this.spacing * 0.62);
        pg.addColorStop(0, "#ffffff"); pg.addColorStop(0.4, ring.hue); pg.addColorStop(1, ring.hue + "00");
        ctx.fillStyle = pg; ctx.globalAlpha = 0.9 * age;
        ctx.beginPath(); ctx.ellipse(0, 0, this.spacing * 0.62, this.spacing * 0.34, 0, 0, TAU); ctx.fill();
        ctx.restore(); ctx.globalAlpha = 1;
      }
    }

    // motes
    if (this.flow !== "over") for (const m of this.motes) {
      const tw = 0.6 + 0.4 * Math.sin(now / 220 + (m.tw || 0));
      ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = m.hue; ctx.globalAlpha = Math.min(1, m.life * 2) * tw;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(m.x, m.y, rimR * 0.012, 0, TAU); ctx.fill();
      ctx.fillStyle = m.hue; ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.arc(m.x, m.y, rimR * 0.022, 0, TAU); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // breathing seed at the centre
    const cr = this.innerR * (0.62 + 0.06 * Math.sin(now / 500));
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2);
    sg.addColorStop(0, "rgba(255,255,255,.95)"); sg.addColorStop(0.45, `rgba(249,168,212,${0.5 + 0.3 * life})`); sg.addColorStop(1, "rgba(249,168,212,0)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(cx, cy, cr * 2, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, cr * 0.5, 0, TAU); ctx.fill();

    // gather cursor
    if (this.pointer && this.flow === "playing") { ctx.strokeStyle = "rgba(249,168,212,.5)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(this.pointer.x, this.pointer.y, rimR * 0.11, 0, TAU); ctx.stroke(); }

    this.drawFx(now);
  }
}
