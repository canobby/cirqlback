// Cirql Fortress — engine (CirqlCade, Strategy). A horde marches from the rim to
// your core. Tap cells to raise walls and snake the invaders through the longest
// possible maze while your core-gun mows them down. Hold the core through every
// wave. You can't wall them out completely — a path must always remain.

import { ArcadeEngine, type ArcadeOpts, TAU, LS } from "./arcade-core";

export interface FortressHud { hp: number; maxHp: number; wave: number; waves: number; kills: number; }
export interface FortressResult { won: boolean; waves: number; kills: number; best: number; }
export interface FortressOpts extends ArcadeOpts { accent?: string; onHud?: (s: FortressHud) => void; onRunEnd?: (r: FortressResult) => void; }

type Flow = "menu" | "playing" | "over";
const RINGS = 7, SEGS = 18, WAVES = 8, MAXHP = 12, INF = 1e9;
interface Foe { x: number; y: number; r: number; s: number; hp: number; spd: number; hue: string; }
interface Beam { x1: number; y1: number; x2: number; y2: number; life: number; }

export class FortressEngine extends ArcadeEngine {
  private opts: FortressOpts;
  private accent = "#a78bfa";
  private flow: Flow = "menu";
  private wall: boolean[][] = []; private dist: number[][] = [];
  private foes: Foe[] = []; private beams: Beam[] = [];
  private hp = MAXHP; private wave = 0; private kills = 0;
  private spawnLeft = 0; private spawnT = 0; private breather = 0; private fireT = 0;
  private best = +(LS.get("cfortress_best") || 0); private lastHud = "";

  constructor(canvas: HTMLCanvasElement, opts: FortressOpts = {}) { super(canvas, opts); if (opts.accent) this.accent = opts.accent; this.opts = opts; this.reset(); this.emitHud(); }
  private reset() {
    this.wall = Array.from({ length: RINGS }, () => Array(SEGS).fill(false));
    this.foes = []; this.beams = []; this.hp = MAXHP; this.wave = 0; this.kills = 0; this.spawnLeft = 0; this.spawnT = 0; this.breather = 1; this.fireT = 0;
    this.recompute();
  }
  start() { this.flow = "playing"; this.reset(); this.clearFx(); this.emitHud(); }
  toMenu() { this.flow = "menu"; }
  peekBest() { return this.best; }

  private cellPos(r: number, s: number) { const rad = this.rimR * (0.16 + (r / (RINGS - 1)) * 0.8), a = s * (TAU / SEGS); return { x: this.cx + Math.cos(a) * rad, y: this.cy + Math.sin(a) * rad }; }
  private recompute() {
    this.dist = Array.from({ length: RINGS }, () => Array(SEGS).fill(INF));
    const q: [number, number][] = [];
    for (let s = 0; s < SEGS; s++) if (!this.wall[0][s]) { this.dist[0][s] = 0; q.push([0, s]); }
    while (q.length) { const [r, s] = q.shift()!; for (const [nr, ns] of this.neighbors(r, s)) if (!this.wall[nr][ns] && this.dist[nr][ns] === INF) { this.dist[nr][ns] = this.dist[r][s] + 1; q.push([nr, ns]); } }
  }
  private neighbors(r: number, s: number): [number, number][] { const out: [number, number][] = [[r, (s + 1) % SEGS], [r, (s - 1 + SEGS) % SEGS]]; if (r > 0) out.push([r - 1, s]); if (r < RINGS - 1) out.push([r + 1, s]); return out; }
  private rimOpen() { for (let s = 0; s < SEGS; s++) if (this.dist[RINGS - 1][s] < INF) return true; return false; }

  protected onPointerDown(e: PointerEvent) {
    if (this.flow !== "playing") return; const p = this.pointerPos(e);
    let br = -1, bs = -1, bd = this.rimR * 0.14;
    for (let r = 1; r < RINGS; r++) for (let s = 0; s < SEGS; s++) { const c = this.cellPos(r, s); const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; br = r; bs = s; } }
    if (br < 0) return;
    if (this.wall[br][bs]) { this.wall[br][bs] = false; this.recompute(); this.tone(200, 0.05, "sine", 0.02); }
    else { if (this.foes.some((f) => f.r === br && f.s === bs)) return; this.wall[br][bs] = true; this.recompute(); if (!this.rimOpen()) { this.wall[br][bs] = false; this.recompute(); this.buzz(30); return; } this.tone(440, 0.05, "square", 0.03); }
    this.emitHud();
  }

  private bestNeighbor(r: number, s: number) { let best = { r, s }, bd = this.dist[r][s]; for (const [nr, ns] of this.neighbors(r, s)) if (!this.wall[nr][ns] && this.dist[nr][ns] < bd) { bd = this.dist[nr][ns]; best = { r: nr, s: ns }; } return best; }

  protected step(dt: number, _now: number) {
    if (this.flow !== "playing") return;
    // waves
    if (this.breather > 0) { this.breather -= dt; if (this.breather <= 0 && this.foes.length === 0) this.nextWave(); }
    if (this.spawnLeft > 0) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = 0.7; this.spawnFoe(); this.spawnLeft--; } }
    if (this.spawnLeft === 0 && this.foes.length === 0 && this.breather <= 0) { if (this.wave >= WAVES) { this.win(); return; } this.breather = 2.2; }
    // foes
    for (const f of this.foes) {
      if (f.r === 0) { const dx = this.cx - f.x, dy = this.cy - f.y, d = Math.hypot(dx, dy) || 1; if (d < this.rimR * 0.12) { (f as any).dead = true; this.hp--; this.shake = 10; this.buzz([20, 40]); this.burst(this.cx, this.cy, "#fb7185", 8, this.rimR * 0.5); if (this.hp <= 0) { this.lose(); return; } } else { f.x += dx / d * f.spd * dt; f.y += dy / d * f.spd * dt; } }
      else { const nb = this.bestNeighbor(f.r, f.s); const tp = this.cellPos(nb.r, nb.s); const dx = tp.x - f.x, dy = tp.y - f.y, d = Math.hypot(dx, dy) || 1; if (d < this.rimR * 0.03) { f.r = nb.r; f.s = nb.s; } else { f.x += dx / d * f.spd * dt; f.y += dy / d * f.spd * dt; } }
    }
    this.foes = this.foes.filter((f) => !(f as any).dead);
    // core gun
    this.fireT -= dt; if (this.fireT <= 0) { this.fireT = 0.5; this.fire(); }
    for (const b of this.beams) b.life -= dt * 4; this.beams = this.beams.filter((b) => b.life > 0);
    this.emitHud();
  }
  private nextWave() { this.wave++; this.spawnLeft = 4 + this.wave * 2; this.spawnT = 0; }
  private spawnFoe() { const open: number[] = []; for (let s = 0; s < SEGS; s++) if (this.dist[RINGS - 1][s] < INF) open.push(s); if (!open.length) return; const s = open[Math.floor(Math.random() * open.length)]; const c = this.cellPos(RINGS - 1, s); this.foes.push({ x: c.x, y: c.y, r: RINGS - 1, s, hp: 2 + Math.floor(this.wave / 2), spd: this.rimR * (0.16 + this.wave * 0.006), hue: ["#fb7185", "#f472b6", "#fbbf24"][this.wave % 3] }); }
  private fire() {
    let tgt: Foe | null = null, bd = this.rimR * 0.7; for (const f of this.foes) { const d = Math.hypot(f.x - this.cx, f.y - this.cy); if (d < bd) { bd = d; tgt = f; } }
    if (!tgt) return; tgt.hp--; this.beams.push({ x1: this.cx, y1: this.cy, x2: tgt.x, y2: tgt.y, life: 1 }); this.tone(560, 0.04, "square", 0.02);
    if (tgt.hp <= 0) { (tgt as any).dead = true; this.kills++; this.burst(tgt.x, tgt.y, tgt.hue, 7, this.rimR * 0.5); }
  }
  private win() { this.flow = "over"; this.best = Math.max(this.best, this.kills); LS.set("cfortress_best", String(this.best)); [392, 523, 659].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, "triangle", 0.05), i * 130)); this.opts.onRunEnd?.({ won: true, waves: this.wave, kills: this.kills, best: this.best }); this.emitHud(); }
  private lose() { this.flow = "over"; this.shake = 16; this.best = Math.max(this.best, this.kills); LS.set("cfortress_best", String(this.best)); this.opts.onRunEnd?.({ won: false, waves: this.wave, kills: this.kills, best: this.best }); this.emitHud(); }

  private emitHud() { if (!this.opts.onHud) return; const sig = [this.hp, this.wave, this.kills].join("|"); if (sig === this.lastHud) return; this.lastHud = sig; this.opts.onHud({ hp: this.hp, maxHp: MAXHP, wave: this.wave, waves: WAVES, kills: this.kills }); }

  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    // grid + walls
    for (let r = 1; r < RINGS; r++) for (let s = 0; s < SEGS; s++) { const c = this.cellPos(r, s); if (this.wall[r][s]) { ctx.fillStyle = "rgba(167,139,250,.5)"; ctx.strokeStyle = this.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x, c.y, rimR * 0.05, 0, TAU); ctx.fill(); ctx.stroke(); } else { ctx.fillStyle = "rgba(150,130,255,.05)"; ctx.beginPath(); ctx.arc(c.x, c.y, rimR * 0.012, 0, TAU); ctx.fill(); } }
    // beams
    for (const b of this.beams) { ctx.strokeStyle = `rgba(103,232,249,${Math.max(0, b.life)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); }
    // foes
    for (const f of this.foes) { ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = f.hue; ctx.fillStyle = f.hue; ctx.beginPath(); ctx.arc(f.x, f.y, rimR * 0.028, 0, TAU); ctx.fill(); ctx.restore(); }
    // core
    const cr = rimR * 0.11 * (0.95 + Math.sin(now * 0.006) * 0.05); const hpFrac = this.hp / MAXHP;
    ctx.save(); ctx.shadowBlur = 18; ctx.shadowColor = this.accent; ctx.fillStyle = `hsl(${140 * hpFrac}, 80%, 55%)`; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill(); ctx.restore();
    this.drawFx(now);
    if (this.flow === "playing" && this.wave === 0) { ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = "600 12px system-ui"; ctx.textAlign = "center"; ctx.fillText("tap cells to build walls — the horde is coming", cx, cy + rimR * 0.6); }
  }
}
