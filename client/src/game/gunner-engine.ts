// Cirql Gunner — engine (CirqlCade). Twin-stick, from the middle. You hold the
// centre and rotate a rapid-fire cannon; swarms pour in from every side. Sweep the
// aim to mow them down before they reach you. It never stops coming.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface GunnerHud { score: number; hp: number; }
export interface GunnerResult { score: number; best: number; }
export interface GunnerOpts extends ArcadeOpts { accent?: string; onHud?: (s: GunnerHud) => void; onRunEnd?: (r: GunnerResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Foe { x: number; y: number; hue: string; hp: number; }
interface Bullet { x: number; y: number; vx: number; vy: number; }

export class GunnerEngine extends ArcadeEngine {
  private opts: GunnerOpts;
  private accent = "#67e8f9";
  private flow: Flow = "menu";
  private score = 0; private hp = 5; private best = +(LS.get("cgunner_best") || 0);
  private aim = -Math.PI / 2; private foes: Foe[] = []; private bullets: Bullet[] = [];
  private fireAt = 0; private spawnAt = 0; private t = 0; private lastHud = ""; private dragging = false;
  spawnMul = 1; // freestyle: <1 = denser swarm, >1 = calmer
  private perkFireMs = 110; private perkShots = 1; private perkHp = 5; // arcade perks
  setPerks(ids: string[]) { this.perkFireMs = ids.includes("rapid") ? 60 : 110; this.perkShots = ids.includes("twin") ? 2 : 1; this.perkHp = ids.includes("fortify") ? 7 : 5; }

  constructor(canvas: HTMLCanvasElement, opts: GunnerOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }

  start() { this.flow = "playing"; this.score = 0; this.hp = this.perkHp; this.aim = -Math.PI / 2; this.foes = []; this.bullets = []; this.t = 0; this.spawnAt = 0; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.foes = []; this.bullets = []; this.clearFx(); }
  aimTo(a: number) { this.aim = a; }
  setCosmetic(c: string) { this.accent = c || "#67e8f9"; }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { this.dragging = true; this.aim = this.pointerAngle(e); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.dragging) this.aim = this.pointerAngle(e); }
  protected onPointerUp() { this.dragging = false; }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === "ArrowLeft") this.aim -= 0.12; else if (e.key === "ArrowRight") this.aim += 0.12; }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    this.t += dt;
    // auto-fire stream
    if (now >= this.fireAt) {
      this.fireAt = now + this.perkFireMs; const sp = this.rimR * 2.4;
      const spread = this.perkShots > 1 ? 0.12 : 0;
      for (let i = 0; i < this.perkShots; i++) { const a = this.aim + (i - (this.perkShots - 1) / 2) * spread; this.bullets.push({ x: this.cx + Math.cos(a) * this.rimR * 0.1, y: this.cy + Math.sin(a) * this.rimR * 0.1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); }
      this.tone(560, 0.03, "square", 0.02);
    }
    // spawn foes from the rim
    this.spawnAt -= dt; if (this.spawnAt <= 0) { const a = Math.random() * TAU; this.foes.push({ x: this.cx + Math.cos(a) * this.rimR * 1.02, y: this.cy + Math.sin(a) * this.rimR * 1.02, hue: ["#fb7185", "#f472b6", "#a78bfa", "#fbbf24"][Math.floor(Math.random() * 4)], hp: 1 + Math.floor(this.t / 25) }); this.spawnAt = Math.max(0.3, 1.1 - this.t * 0.012) * this.spawnMul; }
    const foeSpd = this.rimR * (0.14 + Math.min(0.12, this.t * 0.003));
    for (const f of this.foes) { const dx = this.cx - f.x, dy = this.cy - f.y, d = Math.hypot(dx, dy) || 1; f.x += dx / d * foeSpd * dt; f.y += dy / d * foeSpd * dt; if (d < this.rimR * 0.09) { (f as any).dead = true; this.hp--; this.shake = 10; this.tone(120, 0.2, "sawtooth", 0.05); this.buzz([20, 40]); this.burst(this.cx, this.cy, "#fb7185", 10, this.rimR * 0.6); if (this.hp <= 0) { this.gameOver(); return; } } }
    for (const b of this.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; for (const f of this.foes) { if ((f as any).dead) continue; if (Math.hypot(f.x - b.x, f.y - b.y) < this.rimR * 0.03) { (b as any).dead = true; f.hp--; this.burst(b.x, b.y, f.hue, 4, this.rimR * 0.4); if (f.hp <= 0) { (f as any).dead = true; this.score += 10; this.burst(f.x, f.y, f.hue, 8, this.rimR * 0.7); this.tone(300, 0.05, "square", 0.03); } break; } } }
    this.bullets = this.bullets.filter((b) => !(b as any).dead && Math.hypot(b.x - this.cx, b.y - this.cy) < this.rimR * 1.05);
    this.foes = this.foes.filter((f) => !(f as any).dead);
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 14; this.best = Math.max(this.best, this.score); LS.set("cgunner_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sawtooth", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.hp].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, hp: this.hp }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(103,232,249,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.1)"; ctx.lineWidth = 1; ctx.stroke();
    for (const f of this.foes) { ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = f.hue; ctx.fillStyle = f.hue; ctx.beginPath(); ctx.arc(f.x, f.y, rimR * 0.028, 0, TAU); ctx.fill(); ctx.restore(); }
    for (const b of this.bullets) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, TAU); ctx.fill(); }
    const cr = rimR * 0.08; ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = this.accent; ctx.fillStyle = this.accent; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(this.aim) * cr * 1.9, cy + Math.sin(this.aim) * cr * 1.9); ctx.stroke(); ctx.restore();
    this.drawFx(now); void now;
  }
}
