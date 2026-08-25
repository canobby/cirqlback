// Cirql Keep — engine (CirqlCade). Tower defense on a spiral. Waves of light march
// the winding path from the rim to your core; tap open ground to raise turrets that
// auto-fire on anything in range. Kills pay for more turrets. Hold the core through
// as many waves as you can.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface KeepHud { wave: number; gold: number; core: number; }
export interface KeepResult { wave: number; best: number; }
export interface KeepOpts extends ArcadeOpts { accent?: string; onHud?: (s: KeepHud) => void; onRunEnd?: (r: KeepResult) => void; }

type Flow = "menu" | "playing" | "over";
const CORE_HP = 12, TURRET_COST = 20;
interface Foe { d: number; hp: number; maxHp: number; hue: string; }
interface Turret { x: number; y: number; fireAt: number; flash: number; }

export class KeepEngine extends ArcadeEngine {
  private opts: KeepOpts;
  private accent = "#a78bfa";
  private flow: Flow = "menu";
  private wave = 0; private gold = 40; private core = CORE_HP; private best = +(LS.get("ckeep_best") || 0);
  private path: { x: number; y: number }[] = []; private foes: Foe[] = []; private turrets: Turret[] = [];
  private spawnLeft = 0; private spawnAt = 0; private breather = 0; private lastHud = "";
  private beam: { x1: number; y1: number; x2: number; y2: number; life: number }[] = [];

  constructor(canvas: HTMLCanvasElement, opts: KeepOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.buildPath(); this.emitHud(); }
  private buildPath() { this.path = []; const turns = 3.2; const maxTh = turns * TAU; for (let th = 0; th <= maxTh; th += 0.06) { const r = this.rimR * 0.9 - (th / maxTh) * this.rimR * 0.76; this.path.push({ x: this.cx + Math.cos(th) * r, y: this.cy + Math.sin(th) * r }); } }
  protected onResize() { this.buildPath(); }

  start() { this.flow = "playing"; this.wave = 0; this.gold = 40; this.core = CORE_HP; this.foes = []; this.turrets = []; this.beam = []; this.breather = 0.5; this.spawnLeft = 0; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.foes = []; this.turrets = []; this.clearFx(); }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing") return; const p = this.pointerPos(e);
    if (this.gold < TURRET_COST) { this.tone(150, 0.1, "sine", 0.03); return; }
    // must be inside the disc, not on the path, not on a turret
    if (Math.hypot(p.x - this.cx, p.y - this.cy) > this.rimR * 0.95) return;
    for (const t of this.turrets) if (Math.hypot(t.x - p.x, t.y - p.y) < this.rimR * 0.08) return;
    let nearPath = 1e9; for (let i = 0; i < this.path.length; i += 2) { const d = Math.hypot(this.path[i].x - p.x, this.path[i].y - p.y); if (d < nearPath) nearPath = d; }
    if (nearPath < this.rimR * 0.05) return; // too close to the lane
    this.turrets.push({ x: p.x, y: p.y, fireAt: 0, flash: 0 }); this.gold -= TURRET_COST; this.tone(440, 0.07, "triangle", 0.04); this.buzz(5); this.shock(p.x, p.y, this.accent, this.rimR * 0.1); this.emitHud();
  }

  private nextWave() { this.wave++; this.spawnLeft = 4 + this.wave * 2; this.spawnAt = 0; }
  private range() { return this.rimR * 0.26; }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    if (this.spawnLeft === 0 && this.foes.length === 0) { if (this.breather <= 0) this.breather = 1.5; else { this.breather -= dt; if (this.breather <= 0) this.nextWave(); } }
    if (this.spawnLeft > 0) { this.spawnAt -= dt; if (this.spawnAt <= 0) { const hp = 2 + Math.floor(this.wave * 1.3); this.foes.push({ d: 0, hp, maxHp: hp, hue: ["#fb7185", "#f472b6", "#fbbf24", "#a78bfa"][this.wave % 4] }); this.spawnLeft--; this.spawnAt = Math.max(0.4, 1.1 - this.wave * 0.03); } }
    const spd = (this.path.length / 9) * (1 + this.wave * 0.05);
    for (const f of this.foes) { f.d += spd * dt; if (f.d >= this.path.length - 1) { (f as any).done = true; this.core--; this.shake = 10; this.tone(120, 0.25, "sawtooth", 0.05); this.buzz([20, 40]); this.burst(this.cx, this.cy, "#fb7185", 10, this.rimR * 0.5); if (this.core <= 0) { this.gameOver(); return; } } }
    this.foes = this.foes.filter((f) => !(f as any).done);
    // turrets fire
    for (const t of this.turrets) { t.flash = Math.max(0, t.flash - dt * 4); if (now < t.fireAt) continue; let tgt: Foe | null = null, td = this.range(); for (const f of this.foes) { const p = this.path[Math.floor(f.d)]; const d = Math.hypot(p.x - t.x, p.y - t.y); if (d < td) { td = d; tgt = f; } } if (tgt) { t.fireAt = now + 500; t.flash = 1; const p = this.path[Math.floor(tgt.d)]; this.beam.push({ x1: t.x, y1: t.y, x2: p.x, y2: p.y, life: 1 }); tgt.hp--; this.tone(600, 0.03, "square", 0.02); if (tgt.hp <= 0) { (tgt as any).done = true; this.gold += 8; this.burst(p.x, p.y, tgt.hue, 8, this.rimR * 0.6); } } }
    this.foes = this.foes.filter((f) => !(f as any).done);
    this.beam = this.beam.filter((b) => (b.life -= dt * 5) > 0);
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.wave); LS.set("ckeep_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ wave: this.wave, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.wave, this.gold, this.core].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ wave: this.wave, gold: this.gold, core: this.core }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(167,139,250,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // path
    ctx.strokeStyle = "rgba(150,130,255,.14)"; ctx.lineWidth = rimR * 0.05; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); this.path.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    // core
    ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = "#34d399"; ctx.fillStyle = `rgba(52,211,153,${0.4 + 0.5 * this.core / CORE_HP})`; ctx.beginPath(); ctx.arc(cx, cy, rimR * 0.09, 0, TAU); ctx.fill(); ctx.restore();
    // beams
    for (const b of this.beam) { ctx.globalAlpha = b.life; ctx.strokeStyle = this.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); } ctx.globalAlpha = 1;
    // turrets
    for (const t of this.turrets) { ctx.save(); ctx.shadowBlur = 8 + 10 * t.flash; ctx.shadowColor = this.accent; ctx.fillStyle = this.accent; ctx.beginPath(); ctx.arc(t.x, t.y, rimR * 0.028, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.12; ctx.beginPath(); ctx.arc(t.x, t.y, this.range(), 0, TAU); ctx.fillStyle = this.accent; ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }
    // foes
    for (const f of this.foes) { const p = this.path[Math.floor(f.d)]; if (!p) continue; ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = f.hue; ctx.fillStyle = f.hue; ctx.beginPath(); ctx.arc(p.x, p.y, rimR * 0.026, 0, TAU); ctx.fill(); ctx.restore(); ctx.fillStyle = "#0a0714"; ctx.fillRect(p.x - 8, p.y - rimR * 0.045, 16 * (f.hp / f.maxHp), 2); }
    if (this.flow === "playing" && this.wave <= 1 && !this.turrets.length) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap open ground to build a turret (20)", cx, cy + rimR * 1.05); }
    this.drawFx(now); void now;
  }
}
