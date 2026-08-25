// Cirql Beat — engine (CirqlCade). Rhythm on a ring. Notes ride inward from the rim
// toward the hit-ring; tap the instant one lands. Chain perfect hits for combo, keep
// the groove meter up. Tempo climbs the longer you last. Only-on-a-circle rhythm.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface BeatHud { score: number; combo: number; health: number; }
export interface BeatResult { score: number; best: number; comboMax: number; }
export interface BeatOpts extends ArcadeOpts { accent?: string; onHud?: (s: BeatHud) => void; onRunEnd?: (r: BeatResult) => void; }

type Flow = "menu" | "playing" | "over";
interface Note { angle: number; r: number; judged: boolean; hue: string; }
const HUES = ["#f472b6", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa"];

export class BeatEngine extends ArcadeEngine {
  private opts: BeatOpts;
  private accent = "#ec4899";
  private flow: Flow = "menu";
  private score = 0; private combo = 0; private comboMax = 0; private health = 1;
  private best = +(LS.get("cbeat_best") || 0);
  private notes: Note[] = []; private beatTimer = 0; private beatCount = 0; private pulse = 0; private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: BeatOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.emitHud(); }
  private hitR() { return this.rimR * 0.36; }
  private spawnR() { return this.rimR * 0.94; }
  private approach() { return 1.35; }
  private bpm() { return Math.min(176, 96 + this.score * 0.06); }

  start() { this.flow = "playing"; this.score = 0; this.combo = 0; this.comboMax = 0; this.health = 1; this.notes = []; this.beatTimer = 0; this.beatCount = 0; this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; this.notes = []; this.clearFx(); }
  peekBest() { return this.best; }

  private spawn() {
    const a = Math.random() * TAU; this.notes.push({ angle: a, r: this.spawnR(), judged: false, hue: HUES[this.beatCount % HUES.length] });
    if (Math.random() < 0.22) { const a2 = a + Math.PI + (Math.random() - 0.5); this.notes.push({ angle: a2, r: this.spawnR(), judged: false, hue: HUES[(this.beatCount + 2) % HUES.length] }); }
    this.beatCount++;
  }

  protected onPointerDown() { this.tap(); }
  protected onKeyDown(e: KeyboardEvent) { if (e.key === " ") { e.preventDefault(); this.tap(); } }
  private tap() {
    if (this.flow !== "playing") return;
    const win = this.rimR * 0.08;
    let best: Note | null = null, bd = 1e9;
    for (const n of this.notes) { if (n.judged) continue; const d = Math.abs(n.r - this.hitR()); if (d < bd) { bd = d; best = n; } }
    if (best && bd < win) {
      best.judged = true;
      const perfect = bd < this.rimR * 0.028;
      this.combo++; if (this.combo > this.comboMax) this.comboMax = this.combo;
      this.score += (perfect ? 15 : 8) * Math.min(8, 1 + Math.floor(this.combo / 5));
      this.health = Math.min(1, this.health + 0.03);
      const x = this.cx + Math.cos(best.angle) * this.hitR(), y = this.cy + Math.sin(best.angle) * this.hitR();
      this.burst(x, y, best.hue, perfect ? 12 : 7, this.rimR); this.shock(x, y, best.hue, this.rimR * 0.14);
      if (perfect) this.pop(x, y, "PERFECT", "#fff"); else if (this.combo >= 5) this.pop(x, y, "×" + this.combo, best.hue);
      this.tone(perfect ? 880 : 660, 0.08, "triangle", 0.05); this.buzz(perfect ? 10 : 6); this.pulse = 1;
    }
    // stray taps are ignored (no punish) — keeps it feeling good
  }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    this.pulse = Math.max(0, this.pulse - dt * 3);
    this.beatTimer -= dt; if (this.beatTimer <= 0) { this.spawn(); this.beatTimer = 60 / this.bpm(); }
    const speed = (this.spawnR() - this.hitR()) / this.approach();
    for (const n of this.notes) {
      if (n.judged) continue; n.r -= speed * dt;
      if (n.r < this.hitR() - this.rimR * 0.08) { n.judged = true; this.combo = 0; this.health -= 0.11; if (this.health <= 0) { this.gameOver(); return; } }
    }
    this.notes = this.notes.filter((n) => !(n.judged && n.r < this.hitR() - this.rimR * 0.05) && n.r > 0);
    this.emitHud();
  }
  private gameOver() { this.flow = "over"; this.health = 0; this.best = Math.max(this.best, this.score); LS.set("cbeat_best", String(this.best)); [523, 440, 349, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "sine", 0.05), i * 120)); this.buzz([30, 50, 30]); this.opts.onRunEnd?.({ score: this.score, best: this.best, comboMax: this.comboMax }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.score, this.combo, Math.round(this.health * 20)].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ score: this.score, combo: this.combo, health: this.health }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15); g.addColorStop(0, `rgba(236,72,153,${0.06 + 0.1 * this.pulse})`); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    // hit ring
    ctx.save(); ctx.shadowBlur = 8 + 22 * this.pulse; ctx.shadowColor = this.accent; ctx.strokeStyle = `rgba(236,72,153,${0.5 + 0.4 * this.pulse})`; ctx.lineWidth = 2 + 3 * this.pulse; ctx.beginPath(); ctx.arc(cx, cy, this.hitR(), 0, TAU); ctx.stroke(); ctx.restore();
    // core beat
    const cr = rimR * (0.1 + 0.03 * this.pulse); ctx.fillStyle = "rgba(255,255,255," + (0.5 + 0.4 * this.pulse) + ")"; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill();
    // notes
    for (const n of this.notes) { if (n.judged) continue; const x = cx + Math.cos(n.angle) * n.r, y = cy + Math.sin(n.angle) * n.r; const close = 1 - Math.min(1, Math.abs(n.r - this.hitR()) / (rimR * 0.5)); ctx.save(); ctx.shadowBlur = 10 + 10 * close; ctx.shadowColor = n.hue; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, rimR * 0.022, 0, TAU); ctx.fill(); ctx.fillStyle = n.hue; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(x, y, rimR * (0.032 + 0.02 * close), 0, TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1; }
    if (this.flow === "playing") { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap when a note hits the ring", cx, cy + rimR * 1.0); }
    this.drawFx(now); void now;
  }
}
