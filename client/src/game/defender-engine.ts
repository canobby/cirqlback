// Cirql Defender — engine (CirqlArcade). Built on `arcade-core`'s ArcadeEngine.
//
// Missile Command, reimagined on a circle: a sleeping amber core sits at the
// centre; enemies fall inward from an outer spawn ring; you rotate a shield arc on
// the rim to DEFLECT them back out (a bounced enemy shreds the swarm behind it),
// Fire cyan orbs to pick off stragglers at range, and Pulse to shove + clear when
// it gets hairy. Waves scale; every 5th is a boss wave. Ported faithfully from the
// validated prototype (Artifact b8d291e6), which the owner playtested and loved.
//
// Like the flagship engine, this owns ONLY the canvas. The React host renders the
// menu / HUD / end screen and drives it via `start()` + the action methods
// (`aimTo` / `fire` / `pulse`); the engine reports HUD via `onHud` (emitted only
// on change) and the run's end via `onRunEnd`. The base class provides the loop,
// particle fx, audio, haptics, geometry and input plumbing.

import { ArcadeEngine, type ArcadeOpts, TAU, clamp, norm, angDiff, LS } from "./arcade-core";

export interface DefenderHud {
  score: number;
  wave: number;
  coreHp: number;
  maxCoreHp: number;
  combo: number;
  pulseReady: boolean;
  best: number;
}

export interface DefenderResult {
  score: number;
  wave: number;
  best: number;
  comboMax: number;
}

export interface DefenderOpts extends ArcadeOpts {
  /** Equipped cosmetic accent (tints the shield + orbs). Defaults to spark cyan. */
  accent?: string;
  onHud?: (s: DefenderHud) => void;
  onRunEnd?: (r: DefenderResult) => void;
}

type Flow = "menu" | "playing" | "over";
type Kind = "drift" | "fast" | "boss";

interface Enemy {
  x: number; y: number; a: number; dist: number; spd: number;
  hp: number; maxHp: number; r: number; c: string; kind: Kind;
  defl: boolean; vx: number; vy: number; trail: { x: number; y: number }[]; flash: number; spin: number; dead?: boolean;
}
interface Orb { x: number; y: number; vx: number; vy: number; life: number; trail: { x: number; y: number }[]; }

const CORE_HP = 5;
const PULSE_CD = 6000;
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

export class DefenderEngine extends ArcadeEngine {
  private opts: DefenderOpts;
  private accent = "#67e8f9";

  // flow / run
  private flow: Flow = "menu";
  private coreHp = CORE_HP;
  private score = 0;
  private wave = 0;
  private best = +(LS.get("cdef_best") || 0);

  // shield
  private shieldAng = -Math.PI / 2;
  private shieldSpan = 0.9;

  // entities
  private enemies: Enemy[] = [];
  private orbs: Orb[] = [];

  // wave pacing
  private combo = 0; private comboMax = 0; private lastKill = 0;
  private spawnQueue = 0; private spawnTimer = 0; private breather = 0; private boss = false;
  private pulseReadyAt = 0;

  // defender-specific fx
  private coreFlash = 0; private deflectGlow = 0;

  // geometry-derived
  private get coreR() { return Math.max(20, this.rimR * 0.096); }

  private lastHud = "";
  private dragging = false;

  constructor(canvas: HTMLCanvasElement, opts: DefenderOpts = {}) {
    super(canvas, opts);
    this.opts = opts;
    if (opts.accent) this.accent = opts.accent;
    this.emitHud();
  }

  // ---------- public API ----------
  start() {
    this.flow = "playing";
    this.coreHp = CORE_HP; this.score = 0; this.combo = 0; this.comboMax = 0;
    this.enemies = []; this.orbs = []; this.clearFx();
    this.shieldAng = -Math.PI / 2;
    this.pulseReadyAt = performance.now() + 2000;
    this.startWave(1);
    this.emitHud();
  }
  /** Set the shield's rim angle (host spin-dial or canvas drag). */
  aimTo(angle: number) { this.shieldAng = angle; }
  fire() {
    if (this.flow !== "playing" || this.orbs.length >= 4) return;
    const px = this.cx + Math.cos(this.shieldAng) * (this.rimR - 8), py = this.cy + Math.sin(this.shieldAng) * (this.rimR - 8);
    const sp = this.rimR * 1.95;
    this.orbs.push({ x: px, y: py, vx: Math.cos(this.shieldAng) * sp, vy: Math.sin(this.shieldAng) * sp, life: 1.1, trail: [] });
    this.tone(520, 0.06, "sawtooth", 0.03);
  }
  pulse() {
    if (this.flow !== "playing" || performance.now() < this.pulseReadyAt) return;
    this.pulseReadyAt = performance.now() + PULSE_CD;
    this.shock(this.cx, this.cy, "#ec4899", this.rimR * 1.15); this.shake = Math.max(this.shake, 12);
    [220, 330, 440].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, "sine", 0.05), i * 50)); this.buzz([12, 30, 12]);
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.cx, e.y - this.cy);
      if (d < this.rimR * 0.72) this.killEnemy(e, true);
      else {
        const ux = (e.x - this.cx) / (d || 1), uy = (e.y - this.cy) / (d || 1);
        e.dist = Math.min(this.rimR * 1.3, e.dist + this.rimR * 0.28);
        e.x = this.cx + ux * e.dist; e.y = this.cy + uy * e.dist;
      }
    }
    this.emitHud();
  }
  setCosmetic(accent: string) { this.accent = accent || "#67e8f9"; }
  toMenu() { this.flow = "menu"; this.enemies = []; this.orbs = []; this.clearFx(); }
  peekBest() { return this.best; }

  // ---------- input (overrides) ----------
  protected onPointerDown(e: PointerEvent) { this.dragging = true; this.shieldAng = this.pointerAngle(e); try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ } }
  protected onPointerMove(e: PointerEvent) { if (this.dragging) this.shieldAng = this.pointerAngle(e); }
  protected onPointerUp() { this.dragging = false; }
  protected onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") this.shieldAng -= 0.12;
    else if (e.key === "ArrowRight") this.shieldAng += 0.12;
    else if (e.key === " ") { e.preventDefault(); this.fire(); }
    else if (e.key === "Shift") this.pulse();
  }

  // ---------- waves ----------
  private startWave(n: number) {
    this.wave = n; this.boss = n % 5 === 0;
    this.spawnQueue = this.boss ? 1 + Math.floor(n / 5) : Math.min(4 + n, 16);
    this.spawnTimer = 0; this.breather = 0;
    [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, "sine", 0.045), i * 80));
    this.pop(this.cx, this.cy - this.rimR * 0.5, this.boss ? "BOSS WAVE " + n : "WAVE " + n, this.boss ? "#fb7185" : "#a78bfa");
  }
  private spawnEnemy() {
    const a = Math.random() * TAU, dist = this.rimR * 1.34;
    const base = (46 + this.wave * 4.5) * (this.boss ? 0.62 : 1) * (0.85 + Math.random() * 0.4);
    const kind: Kind = this.boss ? "boss" : (Math.random() < Math.min(0.28, this.wave * 0.03) ? "fast" : "drift");
    const conf = kind === "boss" ? { hp: 4 + Math.floor(this.wave / 5), r: this.rimR * 0.063, c: "#fb7185", spd: base * 0.8 }
      : kind === "fast" ? { hp: 1, r: this.rimR * 0.026, c: "#f472b6", spd: base * 1.5 }
        : { hp: 1, r: this.rimR * 0.037, c: "#fca5a5", spd: base };
    this.enemies.push({ x: this.cx + Math.cos(a) * dist, y: this.cy + Math.sin(a) * dist, a, dist, spd: conf.spd, hp: conf.hp, maxHp: conf.hp, r: conf.r, c: conf.c, kind, defl: false, vx: 0, vy: 0, trail: [], flash: 0, spin: (Math.random() - 0.5) * 0.3 });
  }

  private bumpCombo() { const now = performance.now(); if (now - this.lastKill < 1500) this.combo++; else this.combo = 1; this.lastKill = now; if (this.combo > this.comboMax) this.comboMax = this.combo; }
  private killEnemy(e: Enemy, silent?: boolean) {
    if (e.dead) return; e.dead = true; this.bumpCombo();
    this.score += Math.round((e.kind === "boss" ? 60 : 15) * this.combo);
    this.burst(e.x, e.y, e.c, e.kind === "boss" ? 22 : 9, this.rimR * 1.2); this.shock(e.x, e.y, e.c, e.r * 3);
    if (this.combo >= 3) this.pop(e.x, e.y, "×" + this.combo, "#67e8f9");
    if (!silent) { this.tone(300, 0.09, "square", 0.035); this.buzz(6); }
  }
  private deflectEnemy(e: Enemy) {
    e.defl = true; e.flash = 1; this.bumpCombo();
    const ux = (e.x - this.cx) / (e.dist || 1), uy = (e.y - this.cy) / (e.dist || 1);
    const sp = this.rimR * 2.1;
    e.vx = ux * sp; e.vy = uy * sp;
    this.score += Math.round(10 * this.combo);
    this.deflectGlow = 1; this.burst(e.x, e.y, "#34d399", 10, this.rimR * 1.1); this.shock(e.x, e.y, "#34d399", e.r * 3.4); this.shake = Math.max(this.shake, 5);
    if (this.combo >= 3) this.pop(e.x, e.y, "×" + this.combo, "#34d399");
    const f = SCALE[Math.min(this.combo - 1, SCALE.length - 1)] || SCALE[0];
    this.tone(f, 0.12, "triangle", 0.05); this.tone(f * 2.01, 0.08, "sine", 0.02); this.buzz(10);
  }
  private loseCore(e: Enemy) {
    e.dead = true; this.coreHp--; this.coreFlash = 1; this.shake = 14;
    this.tone(90, 0.4, "sawtooth", 0.06); this.buzz([30, 50, 30]);
    this.burst(this.cx, this.cy, "#fbbf24", 26, this.rimR * 1.3); this.shock(this.cx, this.cy, "#fb7185", this.rimR * 0.9);
    if (this.coreHp <= 0) this.gameOver();
  }
  private gameOver() {
    this.flow = "over";
    [440, 392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, "sine", 0.05), i * 140)); this.buzz([40, 60, 40, 60, 80]);
    this.best = Math.max(this.best, this.score); LS.set("cdef_best", String(this.best));
    this.opts.onRunEnd?.({ score: this.score, wave: this.wave, best: this.best, comboMax: this.comboMax });
    this.emitHud();
  }

  // ---------- step ----------
  protected step(dt: number, now: number) {
    if (this.flow !== "playing") return;
    // spawn pacing
    if (this.spawnQueue > 0) { this.spawnTimer -= dt; if (this.spawnTimer <= 0) { this.spawnEnemy(); this.spawnQueue--; this.spawnTimer = this.boss ? 0.9 : Math.max(0.28, 0.9 - this.wave * 0.03); } }
    // wave clear → breather → next wave
    if (this.spawnQueue === 0 && this.enemies.length === 0) {
      if (this.breather <= 0) this.breather = 1.1;
      else { this.breather -= dt; if (this.breather <= 0) this.startWave(this.wave + 1); }
    }

    for (const e of this.enemies) {
      if (e.defl) {
        e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= 0.995; e.vy *= 0.995;
        e.dist = Math.hypot(e.x - this.cx, e.y - this.cy);
        for (const o of this.enemies) { if (o !== e && !o.defl && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < e.r + o.r) { this.killEnemy(o); this.pop(o.x, o.y, "CHAIN", "#67e8f9"); } }
        if (e.dist > this.rimR * 1.35) e.dead = true;
      } else {
        e.dist -= e.spd * dt;
        e.x = this.cx + Math.cos(e.a) * e.dist; e.y = this.cy + Math.sin(e.a) * e.dist;
        e.a += e.spin * dt;
        if (e.dist <= this.rimR && e.dist > this.rimR - 14 && angDiff(e.a, this.shieldAng) <= this.shieldSpan / 2) this.deflectEnemy(e);
        if (e.dist <= this.coreR + e.r) this.loseCore(e);
      }
      e.flash = Math.max(0, e.flash - dt * 3);
      if (!this.reduce) { e.trail.push({ x: e.x, y: e.y }); if (e.trail.length > 6) e.trail.shift(); }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    for (const o of this.orbs) {
      o.x += o.vx * dt; o.y += o.vy * dt; o.life -= dt;
      if (!this.reduce) { o.trail.push({ x: o.x, y: o.y }); if (o.trail.length > 7) o.trail.shift(); }
      for (const e of this.enemies) {
        if (!e.defl && !e.dead && Math.hypot(e.x - o.x, e.y - o.y) < e.r + 6) {
          e.hp--; e.flash = 1; this.burst(o.x, o.y, "#67e8f9", 6, this.rimR * 0.9); o.life = 0;
          if (e.hp <= 0) this.killEnemy(e); else this.tone(360, 0.05, "square", 0.03);
          break;
        }
      }
      if (Math.hypot(o.x - this.cx, o.y - this.cy) > this.rimR * 1.34) o.life = 0;
    }
    this.orbs = this.orbs.filter((o) => o.life > 0);

    this.coreFlash = Math.max(0, this.coreFlash - dt * 2);
    this.deflectGlow = Math.max(0, this.deflectGlow - dt * 3);
    void now;
    this.emitHud();
  }

  // ---------- HUD (emit on change) ----------
  private emitHud() {
    if (!this.opts.onHud) return;
    const pulseReady = performance.now() >= this.pulseReadyAt;
    const sig = [this.score, this.wave, this.coreHp, this.combo, pulseReady].join("|");
    if (sig === this.lastHud) return;
    this.lastHud = sig;
    this.opts.onHud({ score: this.score, wave: this.wave, coreHp: this.coreHp, maxCoreHp: CORE_HP, combo: this.combo, pulseReady, best: this.best });
  }

  // ---------- draw (base has already cleared + applied shake) ----------
  protected draw(now: number) {
    const { ctx, cx, cy, rimR } = this;
    if (this.flow === "menu") { this.drawAmbient(now); return; }

    // ambient tension glow
    const near = this.enemies.reduce((m, e) => Math.min(m, e.defl ? 9e9 : e.dist), rimR * 2);
    const tense = 1 - clamp(near / rimR, 0, 1);
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.3);
    bg.addColorStop(0, `rgba(124,58,237,${0.1 + 0.1 * this.coreFlash})`);
    bg.addColorStop(0.55, `rgba(236,72,153,${0.03 + 0.06 * tense})`);
    bg.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.3, 0, TAU); ctx.fill();

    // rim + spawn ring
    ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.14)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.34, 0, TAU); ctx.strokeStyle = "rgba(251,113,133,.08)"; ctx.lineWidth = 1; ctx.setLineDash([3, 10]); ctx.stroke(); ctx.setLineDash([]);

    this.drawCore(now);

    // enemies
    for (const e of this.enemies) {
      if (!this.reduce) for (let i = 0; i < e.trail.length; i++) { const k = i / e.trail.length; ctx.globalAlpha = k * 0.28; ctx.fillStyle = e.defl ? "#34d399" : e.c; ctx.beginPath(); ctx.arc(e.trail[i].x, e.trail[i].y, e.r * k * 0.8, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.save(); ctx.shadowBlur = 12 + 16 * e.flash; ctx.shadowColor = e.defl ? "#34d399" : e.c;
      ctx.fillStyle = e.defl ? "#6ee7b7" : e.c; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
      if (e.kind === "boss") {
        ctx.strokeStyle = "#fff"; ctx.globalAlpha = 0.5 + 0.5 * e.flash; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 3, 0, TAU); ctx.stroke();
        for (let i = 0; i < e.maxHp; i++) { const a = (i / e.maxHp) * TAU - Math.PI / 2; ctx.globalAlpha = 1; ctx.fillStyle = i < e.hp ? "#fff" : "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * (e.r + 8), e.y + Math.sin(a) * (e.r + 8), 1.8, 0, TAU); ctx.fill(); }
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // orbs
    for (const o of this.orbs) {
      if (!this.reduce) for (let i = 0; i < o.trail.length; i++) { const k = i / o.trail.length; ctx.globalAlpha = k * 0.4; ctx.fillStyle = this.accent; ctx.beginPath(); ctx.arc(o.trail[i].x, o.trail[i].y, 4 * k, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = this.accent; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(o.x, o.y, 5, 0, TAU); ctx.fill(); ctx.restore();
    }

    this.drawShield();
    this.drawFx(now);
  }

  private drawShield() {
    const { ctx, cx, cy, rimR } = this;
    const mint = this.deflectGlow > 0.1;
    ctx.save(); ctx.shadowBlur = 16 + 10 * this.deflectGlow; ctx.shadowColor = mint ? "#34d399" : this.accent;
    ctx.strokeStyle = mint ? "#6ee7b7" : this.accent; ctx.lineWidth = Math.max(7, rimR * 0.05); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy, rimR - 2, this.shieldAng - this.shieldSpan / 2, this.shieldAng + this.shieldSpan / 2); ctx.stroke();
    // aim tick
    ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.strokeStyle = this.accent; ctx.beginPath();
    ctx.moveTo(cx + Math.cos(this.shieldAng) * (rimR - 26), cy + Math.sin(this.shieldAng) * (rimR - 26));
    ctx.lineTo(cx + Math.cos(this.shieldAng) * (rimR - 14), cy + Math.sin(this.shieldAng) * (rimR - 14)); ctx.stroke();
    ctx.restore(); ctx.globalAlpha = 1;
  }

  private drawCore(now: number) {
    const { ctx, cx, cy } = this;
    const cr = this.coreR * (1 + 0.08 * Math.sin(now / 380) + 0.4 * this.coreFlash);
    const lit = this.coreHp / CORE_HP;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2.4);
    cg.addColorStop(0, "rgba(255,255,255,.95)");
    cg.addColorStop(0.4, `rgba(251,191,36,${0.4 + 0.4 * lit})`);
    cg.addColorStop(1, "rgba(251,146,60,0)");
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr * 2.4, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, cr * 0.6, 0, TAU); ctx.fill();
    for (let i = 0; i < CORE_HP; i++) { const a = -Math.PI / 2 + (i / CORE_HP) * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (cr + 12), cy + Math.sin(a) * (cr + 12), 2.4, 0, TAU); ctx.fillStyle = i < this.coreHp ? "#fbbf24" : "rgba(255,255,255,.16)"; ctx.fill(); }
  }

  // A calm attract state for the menu (drifting core + faint rim).
  private drawAmbient(now: number) {
    const { ctx, cx, cy, rimR } = this;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15);
    g.addColorStop(0, "rgba(124,58,237,.16)"); g.addColorStop(0.6, "rgba(236,72,153,.05)"); g.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.12)"; ctx.lineWidth = 2; ctx.stroke();
    this.drawCore(now);
    this.drawFx(now);
  }
}
