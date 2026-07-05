// Cirql Invaders — engine (CirqlArcade). Space Invaders, radial. A formation of
// invaders orbits and spirals inward; you sit at the centre, rotate your cannon and
// fire outward. Clear the wave before they reach you. Waves get bigger and faster.

import { ArcadeEngine, type ArcadeOpts, TAU, angDiff, LS } from "./arcade-core";

export interface InvadersHud { score: number; wave: number; best: number; }
export interface InvadersResult { score: number; wave: number; best: number; }
export interface InvadersOpts extends ArcadeOpts { accent?: string; onHud?: (s: InvadersHud) => void; onRunEnd?: (r: InvadersResult) => void; }

type Flow = "menu" | "playing" | "over";
const COLS = 10, SEG_A = TAU / 10;
interface Inv { row: number; col: number; hue: string; alive: boolean; }
interface Bullet { x: number; y: number; vx: number; vy: number; }

export class InvadersEngine extends ArcadeEngine {
  private opts: InvadersOpts;
  private accent = "#34d399";
  private flow: Flow = "menu";
  private score = 0; private wave = 0; private best = +(LS.get("cinvaders_best") || 0);
  private invs: Inv[] = []; private bullets: Bullet[] = [];
  private formRot = 0; private formR = 0; private rows = 3; private aim = -Math.PI / 2; private fireAt = 0;
  private lastHud = ""; private dragging = false;
  private perkFireMs = 200; private perkShots = 1; private perkSlow = 1; // arcade perks
  setPerks(ids: string[]) { this.perkFireMs = ids.includes("rapid") ? 110 : 200; this.perkShots = ids.includes("spread") ? 3 : 1; this.perkSlow = ids.includes("slow") ? 0.6 : 1; }

  constructor(canvas: HTMLCanvasElement, opts: InvadersOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private loseR() { return this.rimR * 0.24; }
  private rowGap() { return this.rimR * 0.11; }

  start() { this.flow = "playing"; this.score = 0; this.wave = 0; this.bullets = []; this.aim = -Math.PI / 2; this.clearFx(); this.nextWave(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.invs = []; this.bullets = []; this.clearFx(); }
  aimTo(a: number) { this.aim = a; }
  fire() {
    if (this.flow !== "playing" || performance.now() < this.fireAt) return;
    this.fireAt = performance.now() + this.perkFireMs; const sp = this.rimR * 2.6;
    const spread = this.perkShots > 1 ? 0.14 : 0;
    for (let i = 0; i < this.perkShots; i++) { const a = this.aim + (i - (this.perkShots - 1) / 2) * spread; this.bullets.push({ x: this.cx, y: this.cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }); }
    this.tone(600, 0.05, "square", 0.03);
  }
  setCosmetic(a: string) { this.accent = a || "#34d399"; }
  peekBest() { return this.best; }

  private nextWave() {
    this.wave++; this.rows = Math.min(5, 2 + Math.floor(this.wave / 2));
    this.invs = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < COLS; c++) this.invs.push({ row: r, col: c, hue: ["#fb7185", "#f472b6", "#a78bfa", "#38bdf8", "#34d399"][r % 5], alive: true });
    this.formR = this.rimR * 0.92; this.formRot = 0;
  }

  protected onPointerDown(e: PointerEvent) { this.dragging = true; this.aim = this.pointerAngle(e); this.fire(); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.dragging) this.aim = this.pointerAngle(e); }
  protected onPointerUp() { this.dragging = false; }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === "ArrowLeft") this.aim -= 0.1; else if (e.key === "ArrowRight") this.aim += 0.1; else if (e.key === " ") { e.preventDefault(); this.fire(); } }

  private invPos(inv: Inv) { const a = this.formRot + inv.col * SEG_A; const r = this.formR - inv.row * this.rowGap(); return { x: this.cx + Math.cos(a) * r, y: this.cy + Math.sin(a) * r, r }; }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.formRot += (0.25 + this.wave * 0.04) * this.perkSlow * dt;
    this.formR -= (this.rimR * 0.02 + this.wave * this.rimR * 0.004) * this.perkSlow * dt; // spiral inward
    for (const b of this.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    this.bullets = this.bullets.filter((b) => Math.hypot(b.x - this.cx, b.y - this.cy) < this.rimR * 1.05);
    const er = this.rimR * 0.032;
    for (const b of this.bullets) {
      const ba = Math.atan2(b.y - this.cy, b.x - this.cx), br = Math.hypot(b.x - this.cx, b.y - this.cy);
      for (const inv of this.invs) {
        if (!inv.alive) continue; const p = this.invPos(inv);
        // hit if the bullet is at the invader's radius and roughly on its angle
        if (Math.abs(p.r - br) < er * 2.4 && angDiff(Math.atan2(p.y - this.cy, p.x - this.cx), ba) < 0.16) {
          inv.alive = false; (b as any).dead = true; this.score += 10; this.burst(p.x, p.y, inv.hue, 9, this.rimR * 0.9); this.shock(p.x, p.y, inv.hue, er * 3); this.tone(300, 0.06, "square", 0.03); this.buzz(5); break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !(b as any).dead);
    if (!this.invs.some((i) => i.alive)) { this.nextWave(); }
    // lose if the innermost living row reaches the centre
    const innermost = this.formR - (this.rows - 1) * this.rowGap();
    if (innermost <= this.loseR() && this.invs.some((i) => i.alive)) this.gameOver();
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.shake = 14; this.burst(this.cx, this.cy, "#fb7185", 26, this.rimR); [330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sawtooth", 0.05), i * 120)); this.buzz([40, 60, 40]); this.best = Math.max(this.best, this.score); LS.set("cinvaders_best", String(this.best)); this.opts.onRunEnd?.({ score: this.score, wave: this.wave, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.wave].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, wave: this.wave, best: this.best }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, "rgba(52,211,153,.06)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, this.loseR(), 0, TAU); ctx.strokeStyle = "rgba(251,113,133,.18)"; ctx.lineWidth = 1; ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([]);
    // invaders
    for (const inv of this.invs) { if (!inv.alive) continue; const p = this.invPos(inv); ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = inv.hue; ctx.fillStyle = inv.hue; ctx.beginPath(); ctx.arc(p.x, p.y, rimR * 0.03, 0, TAU); ctx.fill(); ctx.restore(); }
    // bullets
    for (const b of this.bullets) { ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = this.accent; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, TAU); ctx.fill(); ctx.restore(); }
    // cannon
    const cr = rimR * 0.1; ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = this.accent; ctx.fillStyle = this.accent; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(this.aim) * cr * 1.7, cy + Math.sin(this.aim) * cr * 1.7); ctx.stroke(); ctx.restore();
    this.drawFx(now); void now;
  }
}
