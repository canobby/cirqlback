// Cirql Survivor — engine (CirqlCade). Vampire-Survivors, in the ring. Drag to drift;
// your spark auto-fires at whatever's nearest. Swarms pour in and grow; hoover up the
// light they drop to level up — faster fire, more shots, more damage — and see how
// long you outlast the tide.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface SurvivorHud { time: number; level: number; hp: number; }
export interface SurvivorResult { time: number; level: number; best: number; }
export interface SurvivorOpts extends ArcadeOpts { accent?: string; onHud?: (s: SurvivorHud) => void; onRunEnd?: (r: SurvivorResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Foe { x: number; y: number; hp: number; hue: string; r: number; }
interface Bullet { x: number; y: number; vx: number; vy: number; dmg: number; life: number; }
interface Gem { x: number; y: number; }

export class SurvivorEngine extends ArcadeEngine {
  private opts: SurvivorOpts;
  private accent = "#67e8f9";
  private flow: Flow = "menu";
  private t = 0; private level = 1; private xp = 0; private xpNext = 5; private hp = 5; private best = +(LS.get("csurvivor_best") || 0);
  private px = 0; private py = 0; private target: { x: number; y: number } | null = null;
  private foes: Foe[] = []; private bullets: Bullet[] = []; private gems: Gem[] = [];
  private fireRate = 1.6; private projectiles = 1; private damage = 1;
  private fireAt = 0; private spawnAt = 0; private hurtUntil = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: SurvivorOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private pr() { return this.rimR * 0.028; }

  start() { this.flow = "playing"; this.t = 0; this.level = 1; this.xp = 0; this.xpNext = 5; this.hp = 5; this.px = this.cx; this.py = this.cy; this.target = null; this.foes = []; this.bullets = []; this.gems = []; this.fireRate = 1.6; this.projectiles = 1; this.damage = 1; this.spawnAt = 0; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.foes = []; this.bullets = []; this.gems = []; this.clearFx(); }
  setCosmetic(c: string) { this.accent = c || "#67e8f9"; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.target = this.pointerPos(e); }
  protected onPointerMove(e: PointerEvent) { if (this.target) this.target = this.pointerPos(e); }
  protected onPointerUp() { this.target = null; }

  private nearest(): Foe | null { let b: Foe | null = null, bd = 1e9; for (const f of this.foes) { const d = Math.hypot(f.x - this.px, f.y - this.py); if (d < bd) { bd = d; b = f; } } return b; }
  private levelUp() { this.level++; this.xp = 0; this.xpNext = Math.round(this.xpNext * 1.35 + 2); this.fireRate = Math.min(7, this.fireRate + 0.4); this.damage += 0.5; if (this.level % 3 === 0) this.projectiles++; this.hp = Math.min(8, this.hp + 1); this.tone(880, 0.2, "sine", 0.05); this.buzz([10, 20, 10]); this.shock(this.px, this.py, this.accent, this.rimR * 0.3); this.pop(this.px, this.py - 20, "LEVEL " + this.level, this.accent); }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    this.t += dt;
    if (this.target) { const dx = this.target.x - this.px, dy = this.target.y - this.py; this.px += dx * Math.min(1, dt * 8); this.py += dy * Math.min(1, dt * 8); }
    const md = Math.hypot(this.px - this.cx, this.py - this.cy); if (md > this.rimR - this.pr()) { const ux = (this.px - this.cx) / md, uy = (this.py - this.cy) / md; this.px = this.cx + ux * (this.rimR - this.pr()); this.py = this.cy + uy * (this.rimR - this.pr()); }
    // auto-fire at nearest
    if (now >= this.fireAt) { const tgt = this.nearest(); if (tgt) { this.fireAt = now + 1000 / this.fireRate; const base = Math.atan2(tgt.y - this.py, tgt.x - this.px); const spread = 0.2; for (let i = 0; i < this.projectiles; i++) { const a = base + (i - (this.projectiles - 1) / 2) * spread; this.bullets.push({ x: this.px, y: this.py, vx: Math.cos(a) * this.rimR * 2.2, vy: Math.sin(a) * this.rimR * 2.2, dmg: this.damage, life: 1.2 }); } this.tone(560, 0.03, "square", 0.02); } }
    // spawn
    this.spawnAt -= dt; if (this.spawnAt <= 0) { const a = Math.random() * TAU; this.foes.push({ x: this.cx + Math.cos(a) * this.rimR * 1.02, y: this.cy + Math.sin(a) * this.rimR * 1.02, hp: 1 + Math.floor(this.t / 20), hue: ["#fb7185", "#f472b6", "#a78bfa", "#fbbf24"][Math.floor(Math.random() * 4)], r: this.rimR * 0.026 }); this.spawnAt = Math.max(0.22, 0.9 - this.t * 0.01); }
    const fsp = this.rimR * (0.1 + Math.min(0.1, this.t * 0.002));
    for (const f of this.foes) { const dx = this.px - f.x, dy = this.py - f.y, d = Math.hypot(dx, dy) || 1; f.x += dx / d * fsp * dt; f.y += dy / d * fsp * dt; if (d < this.pr() + f.r && now > this.hurtUntil) { this.hurtUntil = now + 700; this.hp--; this.shake = 10; this.tone(120, 0.2, "sawtooth", 0.05); this.buzz([20, 40]); if (this.hp <= 0) { this.gameOver(); return; } } }
    for (const b of this.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; for (const f of this.foes) { if ((f as any).dead) continue; if (Math.hypot(f.x - b.x, f.y - b.y) < f.r + 4) { (b as any).dead = true; f.hp -= b.dmg; this.burst(b.x, b.y, f.hue, 3, this.rimR * 0.3); if (f.hp <= 0) { (f as any).dead = true; this.gems.push({ x: f.x, y: f.y }); this.burst(f.x, f.y, f.hue, 6, this.rimR * 0.5); } break; } } }
    this.bullets = this.bullets.filter((b) => !(b as any).dead && b.life > 0);
    this.foes = this.foes.filter((f) => !(f as any).dead);
    // collect gems (magnet)
    for (const g of this.gems) { const dx = this.px - g.x, dy = this.py - g.y, d = Math.hypot(dx, dy) || 1; if (d < this.rimR * 0.16) { g.x += dx / d * this.rimR * 1.5 * dt; g.y += dy / d * this.rimR * 1.5 * dt; } if (d < this.pr() + 6) { (g as any).got = true; this.xp++; this.tone(700, 0.04, "sine", 0.03); if (this.xp >= this.xpNext) this.levelUp(); } }
    this.gems = this.gems.filter((g) => !(g as any).got);
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 14; this.burst(this.px, this.py, "#fb7185", 24, this.rimR); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sawtooth", 0.05), i * 120)); this.buzz([30, 50, 30]); const time = Math.round(this.t); this.best = Math.max(this.best, time); LS.set("csurvivor_best", String(this.best)); this.opts.onRunEnd?.({ time, level: this.level, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [Math.round(this.t), this.level, this.hp].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ time: Math.round(this.t), level: this.level, hp: this.hp }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(103,232,249,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.1)"; ctx.lineWidth = 1; ctx.stroke();
    for (const gm of this.gems) { ctx.fillStyle = "#67e8f9"; ctx.beginPath(); ctx.arc(gm.x, gm.y, rimR * 0.012, 0, TAU); ctx.fill(); }
    for (const f of this.foes) { ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = f.hue; ctx.fillStyle = f.hue; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill(); ctx.restore(); }
    for (const b of this.bullets) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, TAU); ctx.fill(); }
    const hurt = now < this.hurtUntil; ctx.save(); ctx.globalAlpha = hurt && Math.floor(now / 80) % 2 ? 0.4 : 1; ctx.shadowBlur = 16; ctx.shadowColor = this.accent; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(this.px, this.py, this.pr(), 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
    if (this.flow === "playing" && this.t < 3) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("drag to move · you auto-fire", cx, cy + rimR * 1.05); }
    this.drawFx(now); void now;
  }
}
