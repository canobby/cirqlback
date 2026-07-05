// Cirql Miner — engine (CirqlArcade). Dig-Dug/Pac-Man on circular tunnels. Ride the
// rings gobbling gems; hop in and out to shake the cave monsters chasing you. Clear
// a ring of gems and the next level opens, faster. Three lives.

import { ArcadeEngine, type ArcadeOpts, TAU, norm, angDiff, LS } from "./arcade-core";

export interface MinerHud { score: number; level: number; lives: number; gems: number; }
export interface MinerResult { score: number; level: number; best: number; }
export interface MinerOpts extends ArcadeOpts { accent?: string; onHud?: (s: MinerHud) => void; onRunEnd?: (r: MinerResult) => void; }

type Flow = "menu" | "playing" | "over";
const RINGS = 4, GEMS_PER = 12;
interface Gem { ring: number; angle: number; alive: boolean; }
interface Mob { ring: number; angle: number; }

export class MinerEngine extends ArcadeEngine {
  private opts: MinerOpts;
  private accent = "#fbbf24";
  private flow: Flow = "menu";
  private score = 0; private level = 1; private lives = 3; private best = +(LS.get("cminer_best") || 0);
  private ring = 0; private angle = -Math.PI / 2; private dir = 1; private speed = 1.6;
  private gems: Gem[] = []; private mobs: Mob[] = []; private hurtUntil = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: MinerOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private ringR(i: number) { return this.rimR * (0.34 + 0.58 * (i / (RINGS - 1))); }

  start() { this.flow = "playing"; this.score = 0; this.level = 1; this.lives = 3; this.ring = 0; this.angle = -Math.PI / 2; this.dir = 1; this.speed = 1.6; this.buildLevel(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.gems = []; this.mobs = []; this.clearFx(); }
  private buildLevel() {
    this.gems = []; for (let r = 0; r < RINGS; r++) for (let g = 0; g < GEMS_PER; g++) this.gems.push({ ring: r, angle: (g / GEMS_PER) * TAU, alive: true });
    this.mobs = []; const nm = 1 + Math.floor(this.level / 2); for (let i = 0; i < nm; i++) this.mobs.push({ ring: RINGS - 1, angle: (i / nm) * TAU });
    this.ring = 0; this.angle = -Math.PI / 2;
  }
  reverse() { if (this.flow === "playing") { this.dir *= -1; this.tone(300, 0.04, "sine", 0.03); } }
  nudge(delta: number) { if (this.flow === "playing") { this.ring = Math.max(0, Math.min(RINGS - 1, this.ring + delta)); this.tone(380, 0.04, "sine", 0.03); } }
  peekBest() { return this.best; }

  protected onPointerDown(e: PointerEvent) { const p = this.pointerPos(e); const d = Math.hypot(p.x - this.cx, p.y - this.cy); let b = 0, bd = 1e9; for (let i = 0; i < RINGS; i++) { const dd = Math.abs(this.ringR(i) - d); if (dd < bd) { bd = dd; b = i; } } this.ring = b; }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === "ArrowUp") this.nudge(1); else if (e.key === "ArrowDown") this.nudge(-1); else if (e.key === " ") { e.preventDefault(); this.reverse(); } }

  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    this.angle += this.dir * this.speed * dt;
    const px = this.cx + Math.cos(this.angle) * this.ringR(this.ring), py = this.cy + Math.sin(this.angle) * this.ringR(this.ring);
    // eat gems on the current ring
    for (const g of this.gems) { if (!g.alive || g.ring !== this.ring) continue; if (angDiff(g.angle, this.angle) < 0.14) { g.alive = false; this.score += 5; const gx = this.cx + Math.cos(g.angle) * this.ringR(g.ring), gy = this.cy + Math.sin(g.angle) * this.ringR(g.ring); this.burst(gx, gy, "#fbbf24", 5, this.rimR * 0.4); this.tone(500 + this.score % 200, 0.05, "triangle", 0.04); this.buzz(3); } }
    if (!this.gems.some((g) => g.alive)) { this.level++; this.speed = Math.min(2.8, this.speed + 0.15); this.tone(880, 0.25, "sine", 0.05); this.buildLevel(); this.emitHud(); return; }
    // mobs chase
    for (const m of this.mobs) {
      const chaseSpd = (1.1 + this.level * 0.08);
      if (m.ring !== this.ring && Math.random() < 0.02) m.ring += Math.sign(this.ring - m.ring);
      const da = norm(this.angle - m.angle); m.angle += Math.sign(da) * chaseSpd * dt;
      const mx = this.cx + Math.cos(m.angle) * this.ringR(m.ring), my = this.cy + Math.sin(m.angle) * this.ringR(m.ring);
      if (now > this.hurtUntil && m.ring === this.ring && Math.hypot(mx - px, my - py) < this.rimR * 0.05) { this.hit(); return; }
    }
    this.emitHud();
  }
  private hit() {
    this.lives--; this.hurtUntil = performance.now() + 1200; this.shake = 12; this.tone(120, 0.3, "sawtooth", 0.05); this.buzz([30, 50]);
    this.burst(this.cx + Math.cos(this.angle) * this.ringR(this.ring), this.cy + Math.sin(this.angle) * this.ringR(this.ring), "#fb7185", 18, this.rimR * 0.9);
    if (this.lives <= 0) this.gameOver(); else { this.ring = 0; this.angle = -Math.PI / 2; this.mobs.forEach((m, i) => { m.ring = RINGS - 1; m.angle = (i / this.mobs.length) * TAU; }); }
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.best = Math.max(this.best, this.score); LS.set("cminer_best", String(this.best)); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.opts.onRunEnd?.({ score: this.score, level: this.level, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const gems = this.gems.filter((g) => g.alive).length; const sig = [this.score, this.level, this.lives, gems].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, level: this.level, lives: this.lives, gems }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(251,191,36,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    for (let i = 0; i < RINGS; i++) { ctx.beginPath(); ctx.arc(cx, cy, this.ringR(i), 0, TAU); ctx.strokeStyle = i === this.ring ? "rgba(251,191,36,.2)" : "rgba(150,130,255,.08)"; ctx.lineWidth = i === this.ring ? 2 : 1; ctx.stroke(); }
    for (const gm of this.gems) { if (!gm.alive) continue; const x = cx + Math.cos(gm.angle) * this.ringR(gm.ring), y = cy + Math.sin(gm.angle) * this.ringR(gm.ring); ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = "#fbbf24"; ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(x, y, rimR * 0.014, 0, TAU); ctx.fill(); ctx.restore(); }
    for (const m of this.mobs) { const x = cx + Math.cos(m.angle) * this.ringR(m.ring), y = cy + Math.sin(m.angle) * this.ringR(m.ring); ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = "#fb7185"; ctx.fillStyle = "#fb7185"; ctx.beginPath(); ctx.arc(x, y, rimR * 0.03, 0, TAU); ctx.fill(); ctx.restore(); }
    const hurt = now < this.hurtUntil; const px = cx + Math.cos(this.angle) * this.ringR(this.ring), py = cy + Math.sin(this.angle) * this.ringR(this.ring);
    ctx.save(); ctx.globalAlpha = hurt && Math.floor(now / 100) % 2 ? 0.4 : 1; ctx.shadowBlur = 16; ctx.shadowColor = this.accent; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px, py, rimR * 0.032, 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
    this.drawFx(now); void now;
  }
}
