// Cirql Tunnel — engine (CirqlArcade). Tempest, down the well. Radial lanes run
// from the centre out to the rim where your ship sits; enemies climb up the lanes
// toward you. Slide around the rim and fire inward to shoot them down before they
// surface. Retro vector look — right at home in this arcade.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface TunnelHud { score: number; best: number; lives: number; }
export interface TunnelResult { score: number; best: number; }
export interface TunnelOpts extends ArcadeOpts { accent?: string; onHud?: (s: TunnelHud) => void; onRunEnd?: (r: TunnelResult) => void; }

type Flow = "menu" | "playing" | "over";
const LANES = 10, LANE_A = TAU / 10;
interface Foe { lane: number; t: number; hue: string; spd: number; } // t: 0 (centre) → 1 (rim)
interface Shot { lane: number; t: number; } // travels 1 → 0 (inward)

export class TunnelEngine extends ArcadeEngine {
  private opts: TunnelOpts;
  private accent = "#38bdf8";
  private flow: Flow = "menu";
  private score = 0; private lives = 3; private best = +(LS.get("ctunnel_best") || 0);
  private lane = 0; private foes: Foe[] = []; private shots: Shot[] = [];
  private spawnAt = 0; private t = 0; private fireAt = 0; private lastHud = ""; private dragging = false;

  constructor(canvas: HTMLCanvasElement, opts: TunnelOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private innerR() { return this.rimR * 0.12; }
  private laneR(t: number) { return this.innerR() + (this.rimR * 0.9 - this.innerR()) * t; }
  private laneAngle(l: number) { return l * LANE_A; }

  start() { this.flow = "playing"; this.score = 0; this.lives = 3; this.lane = 0; this.foes = []; this.shots = []; this.spawnAt = 0; this.t = 0; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.foes = []; this.shots = []; this.clearFx(); }
  move(delta: number) { this.lane = (this.lane + delta + LANES) % LANES; this.tone(360, 0.04, "sine", 0.03); }
  laneFromAngle(a: number) { this.lane = (Math.round(a / LANE_A) % LANES + LANES) % LANES; }
  fire() { if (this.flow !== "playing" || performance.now() < this.fireAt) return; this.fireAt = performance.now() + 160; this.shots.push({ lane: this.lane, t: 1 }); this.tone(620, 0.05, "square", 0.03); }
  setCosmetic(a: string) { this.accent = a || "#38bdf8"; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.dragging = true; this.laneFromAngle(this.pointerAngle(e)); this.fire(); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.dragging) this.laneFromAngle(this.pointerAngle(e)); }
  protected onPointerUp() { this.dragging = false; }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === "ArrowLeft") this.move(-1); else if (e.key === "ArrowRight") this.move(1); else if (e.key === " ") { e.preventDefault(); this.fire(); } }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    this.t += dt;
    this.spawnAt -= dt;
    if (this.spawnAt <= 0) { const lane = Math.floor(Math.random() * LANES); this.foes.push({ lane, t: 0, hue: ["#fb7185", "#f472b6", "#a78bfa", "#fbbf24"][Math.floor(Math.random() * 4)], spd: 0.16 + Math.min(0.25, this.score * 0.004) + Math.random() * 0.05 }); this.spawnAt = Math.max(0.5, 1.4 - this.score * 0.01); }
    // shots move inward
    for (const s of this.shots) s.t -= dt * 1.8;
    // foes climb outward
    for (const f of this.foes) f.t += f.spd * dt;
    // collisions: shot vs foe in same lane, close t
    for (const s of this.shots) { for (const f of this.foes) { if ((f as any).dead || (s as any).dead) continue; if (f.lane === s.lane && Math.abs(f.t - s.t) < 0.06) { (f as any).dead = true; (s as any).dead = true; this.score += 10; const a = this.laneAngle(f.lane), r = this.laneR(f.t); this.burst(this.cx + Math.cos(a) * r, this.cy + Math.sin(a) * r, f.hue, 9, this.rimR * 0.8); this.tone(280, 0.06, "square", 0.03); this.buzz(5); } } }
    // foe reaches the rim → costs a life
    for (const f of this.foes) { if (!(f as any).dead && f.t >= 1) { (f as any).dead = true; this.lives--; this.shake = 12; this.tone(120, 0.3, "sawtooth", 0.05); this.buzz([30, 50]); const a = this.laneAngle(f.lane); this.shock(this.cx + Math.cos(a) * this.rimR * 0.9, this.cy + Math.sin(a) * this.rimR * 0.9, "#fb7185", this.rimR * 0.3); if (this.lives <= 0) { this.gameOver(); return; } } }
    this.foes = this.foes.filter((f) => !(f as any).dead);
    this.shots = this.shots.filter((s) => !(s as any).dead && s.t > 0);
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 14; this.best = Math.max(this.best, this.score); LS.set("ctunnel_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sawtooth", 0.05), i * 120)); this.buzz([40, 60, 40]); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.lives].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, best: this.best, lives: this.lives }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(56,189,248,.05)"); g.addColorStop(0.7, "rgba(124,58,237,.06)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // well: radial spokes + inner/outer rings
    ctx.strokeStyle = "rgba(150,130,255,.12)"; ctx.lineWidth = 1;
    for (let l = 0; l < LANES; l++) { const a = this.laneAngle(l); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * this.innerR(), cy + Math.sin(a) * this.innerR()); ctx.lineTo(cx + Math.cos(a) * this.rimR * 0.9, cy + Math.sin(a) * this.rimR * 0.9); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(cx, cy, this.innerR(), 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, this.rimR * 0.9, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.2)"; ctx.stroke();
    // foes
    for (const f of this.foes) { const a = this.laneAngle(f.lane), r = this.laneR(f.t); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = f.hue; ctx.fillStyle = f.hue; ctx.beginPath(); ctx.arc(x, y, rimR * 0.026, 0, TAU); ctx.fill(); ctx.restore(); }
    // shots
    for (const s of this.shots) { const a = this.laneAngle(s.lane), r = this.laneR(s.t); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3, 0, TAU); ctx.fill(); }
    // ship at the rim on the current lane
    const a = this.laneAngle(this.lane), R = this.rimR * 0.9; const sx = cx + Math.cos(a) * R, sy = cy + Math.sin(a) * R;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a + Math.PI / 2); ctx.shadowBlur = 16; ctx.shadowColor = this.accent; ctx.fillStyle = this.accent; ctx.beginPath(); ctx.moveTo(0, rimR * 0.05); ctx.lineTo(-rimR * 0.04, -rimR * 0.03); ctx.lineTo(rimR * 0.04, -rimR * 0.03); ctx.closePath(); ctx.fill(); ctx.restore();
    this.drawFx(now); void now;
  }
}
