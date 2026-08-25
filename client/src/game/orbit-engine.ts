// Cirql Orbit — engine (CirqlArcade). Asteroids-by-way-of-gravity. Your satellite
// circles the planet; tap to thrust outward, gravity always pulls you back in.
// Ride the orbits to scoop energy and thread past drifting black holes. Crash into
// the planet or touch a hole and it's over.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface OrbitHud { score: number; best: number; }
export interface OrbitResult { score: number; best: number; }
export interface OrbitOpts extends ArcadeOpts { accent?: string; onHud?: (s: OrbitHud) => void; onRunEnd?: (r: OrbitResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Pickup { a: number; r: number; drift: number; alive: boolean; }
interface Hole { a: number; r: number; drift: number; }

export class OrbitEngine extends ArcadeEngine {
  private opts: OrbitOpts;
  private accent = "#a78bfa";
  private flow: Flow = "menu";
  private score = 0; private best = +(LS.get("corbit_best") || 0);
  private r = 0; private vr = 0; private a = -Math.PI / 2;
  private pickups: Pickup[] = []; private holes: Hole[] = []; private spawnT = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: OrbitOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private planetR() { return this.rimR * 0.16; }
  private maxR() { return this.rimR * 0.96; }

  start() { this.flow = "playing"; this.score = 0; this.a = -Math.PI / 2; this.r = this.rimR * 0.55; this.vr = 0; this.pickups = []; this.holes = []; this.spawnT = 0; this.clearFx(); for (let i = 0; i < 3; i++) this.spawnPickup(); this.spawnHole(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.pickups = []; this.holes = []; this.clearFx(); }
  thrust() { if (this.flow !== "playing") return; this.vr += this.rimR * 0.9; this.tone(360, 0.08, "sawtooth", 0.035); this.buzz(6); const p = this.shipXY(); this.burst(p.x, p.y, this.accent, 5, this.rimR * 0.5); }
  peekBest() { return this.best; }
  private shipXY() { return { x: this.cx + Math.cos(this.a) * this.r, y: this.cy + Math.sin(this.a) * this.r }; }

  protected onPointerDown() { this.thrust(); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); this.thrust(); } }

  private spawnPickup() { this.pickups.push({ a: Math.random() * TAU, r: this.rimR * (0.3 + Math.random() * 0.6), drift: (Math.random() - 0.5) * 0.4, alive: true }); }
  private spawnHole() { this.holes.push({ a: Math.random() * TAU, r: this.rimR * (0.35 + Math.random() * 0.5), drift: (Math.random() - 0.5) * 0.6 }); }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    // gravity + thrust integration
    this.vr -= this.rimR * 1.5 * dt; // gravity inward
    this.vr *= 0.985; this.r += this.vr * dt;
    if (this.r > this.maxR()) { this.r = this.maxR(); this.vr = -Math.abs(this.vr) * 0.4; }
    // orbital angular speed (faster when nearer)
    this.a += (this.rimR * 0.9 / Math.max(this.planetR(), this.r)) * dt;
    if (this.r <= this.planetR()) { this.gameOver(); return; }
    const sp = this.shipXY();
    for (const p of this.pickups) { if (!p.alive) continue; p.a += p.drift * dt; const px = this.cx + Math.cos(p.a) * p.r, py = this.cy + Math.sin(p.a) * p.r; if (Math.hypot(px - sp.x, py - sp.y) < this.rimR * 0.055) { p.alive = false; this.score++; this.burst(px, py, "#fbbf24", 9, this.rimR * 0.8); this.tone(500 + this.score * 8, 0.09, "triangle", 0.045); this.buzz(6); } }
    this.pickups = this.pickups.filter((p) => p.alive); while (this.pickups.length < 3) this.spawnPickup();
    for (const h of this.holes) { h.a += h.drift * dt; const hx = this.cx + Math.cos(h.a) * h.r, hy = this.cy + Math.sin(h.a) * h.r; if (Math.hypot(hx - sp.x, hy - sp.y) < this.rimR * 0.06) { this.gameOver(); return; } }
    this.spawnT -= dt; if (this.spawnT <= 0 && this.holes.length < 2 + Math.floor(this.score / 6)) { this.spawnHole(); this.spawnT = 4; }
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 14; const p = this.shipXY(); this.burst(p.x, p.y, "#fb7185", 24, this.rimR); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sawtooth", 0.05), i * 120)); this.buzz([40, 60, 40]); this.best = Math.max(this.best, this.score); LS.set("corbit_best", String(this.best)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = String(this.score); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(124,58,237,.1)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // planet
    const pr = this.planetR(); const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr * 1.6); pg.addColorStop(0, "#fff"); pg.addColorStop(0.5, "rgba(167,139,250,.7)"); pg.addColorStop(1, "rgba(124,58,237,0)"); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, pr * 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c4b5fd"; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, TAU); ctx.fill();
    // pickups
    for (const p of this.pickups) { if (!p.alive) continue; const x = cx + Math.cos(p.a) * p.r, y = cy + Math.sin(p.a) * p.r; ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = "#fbbf24"; ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(x, y, rimR * 0.022, 0, TAU); ctx.fill(); ctx.restore(); }
    // black holes
    for (const h of this.holes) { const x = cx + Math.cos(h.a) * h.r, y = cy + Math.sin(h.a) * h.r; const hg = ctx.createRadialGradient(x, y, 0, x, y, rimR * 0.07); hg.addColorStop(0, "#000"); hg.addColorStop(0.6, "rgba(251,113,133,.5)"); hg.addColorStop(1, "rgba(251,113,133,0)"); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(x, y, rimR * 0.07, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(251,113,133,.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, rimR * 0.045, 0, TAU); ctx.stroke(); }
    // ship + trail of its orbit
    const sp = this.shipXY(); ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = this.accent; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sp.x, sp.y, rimR * 0.03, 0, TAU); ctx.fill(); ctx.restore();
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap to thrust outward", cx, cy + rimR * 1.0); }
    this.drawFx(now); void now;
  }
}
