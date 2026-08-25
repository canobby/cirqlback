// Cirql Runner — engine (CirqlArcade). Temple-Run/Geometry-Dash on a loop. A
// glowing orb races around the track; tap to hop over spikes and gaps. Each lap it
// speeds up. Miss a jump and you're done.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface RunnerHud { score: number; best: number; }
export interface RunnerResult { score: number; best: number; }
export interface RunnerOpts extends ArcadeOpts { accent?: string; onHud?: (s: RunnerHud) => void; onRunEnd?: (r: RunnerResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Obstacle { a: number; type: "spike" | "gap"; passed: boolean; }

export class RunnerEngine extends ArcadeEngine {
  private opts: RunnerOpts;
  private accent = "#fb7185";
  private flow: Flow = "menu";
  private score = 0; private best = +(LS.get("crunner_best") || 0);
  private a = -Math.PI / 2; private speed = 1.5; private jumpUntil = 0;
  private obstacles: Obstacle[] = []; private lastSpawn = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: RunnerOpts = {}) { super(canvas, opts); this.opts = opts; if (opts.accent) this.accent = opts.accent; this.emitHud(); }
  private trackR() { return this.rimR * 0.74; }
  private elevated(now: number) { return now < this.jumpUntil; }

  start() {
    this.flow = "playing"; this.score = 0; this.speed = 1.5; this.a = -Math.PI / 2; this.jumpUntil = 0;
    this.obstacles = []; this.lastSpawn = this.a; this.clearFx();
    for (let i = 0; i < 4; i++) { this.lastSpawn += 1.0 + Math.random() * 0.9; this.obstacles.push({ a: this.lastSpawn, type: Math.random() < 0.5 ? "spike" : "gap", passed: false }); }
    this.emitHud();
  }
  toMenu() { this.flow = "menu"; this.obstacles = []; this.clearFx(); }
  jump() { if (this.flow !== "playing") return; if (performance.now() < this.jumpUntil) return; this.jumpUntil = performance.now() + 420; this.tone(520, 0.08, "sine", 0.04); this.buzz(6); }
  peekBest() { return this.best; }

  protected onPointerDown() { this.jump(); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); this.jump(); } }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    this.a += this.speed * dt;
    for (const o of this.obstacles) {
      if (o.passed || this.a < o.a) continue;
      // crossing: safe only if elevated
      if (this.elevated(now)) { o.passed = true; this.score++; this.speed = Math.min(4.2, this.speed + 0.03); this.tone(660 + this.score * 4, 0.06, "triangle", 0.04); }
      else { this.gameOver(); return; }
    }
    this.obstacles = this.obstacles.filter((o) => !(o.passed && this.a - o.a > 1.0));
    while (this.obstacles.filter((o) => !o.passed).length < 4) { this.lastSpawn = Math.max(this.lastSpawn, this.a) + 0.9 + Math.random() * 0.9; this.obstacles.push({ a: this.lastSpawn, type: Math.random() < 0.5 ? "spike" : "gap", passed: false }); }
    this.emitHud();
  }
  private gameOver() {
    this.flow = "over"; this.shake = 12; const R = this.trackR();
    this.burst(this.cx + Math.cos(this.a) * R, this.cy + Math.sin(this.a) * R, this.accent, 22, this.rimR);
    [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sawtooth", 0.05), i * 120)); this.buzz([40, 60, 40]);
    this.best = Math.max(this.best, this.score); LS.set("crunner_best", String(this.best));
    this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud();
  }

  private emitHud() { if (!this.opts.onHud) return; const sig = String(this.score); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this; const R = this.trackR();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(251,113,133,.06)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // track (draw as arcs, gaps are breaks)
    ctx.strokeStyle = "rgba(150,130,255,.2)"; ctx.lineWidth = rimR * 0.03; ctx.lineCap = "butt";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    for (const o of this.obstacles) {
      if (o.passed) continue;
      if (o.type === "gap") { ctx.save(); ctx.strokeStyle = "#05040f"; ctx.lineWidth = rimR * 0.05; ctx.beginPath(); ctx.arc(cx, cy, R, o.a - 0.12, o.a + 0.12); ctx.stroke(); ctx.restore(); }
      else { const sx = cx + Math.cos(o.a) * R, sy = cy + Math.sin(o.a) * R; ctx.save(); ctx.translate(sx, sy); ctx.rotate(o.a + Math.PI / 2); ctx.fillStyle = "#fb7185"; ctx.shadowBlur = 10; ctx.shadowColor = "#fb7185"; ctx.beginPath(); ctx.moveTo(-rimR * 0.03, 0); ctx.lineTo(rimR * 0.03, 0); ctx.lineTo(0, -rimR * 0.07); ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    // runner
    const hop = this.elevated(now) ? Math.sin(((this.jumpUntil - now) / 420) * Math.PI) * rimR * 0.13 : 0;
    const rr = R + hop, rx = cx + Math.cos(this.a) * rr, ry = cy + Math.sin(this.a) * rr;
    ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = this.accent; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(rx, ry, rimR * 0.038, 0, TAU); ctx.fill(); ctx.restore();
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap to jump", cx, cy); }
    this.drawFx(now);
  }
}
