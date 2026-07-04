// CIRQL — "Light-Ball" mode (CHR-109): the OPTIONAL, energetic counterpart to
// the meditative restore loop. A glowing ball ricochets off orbiting bumpers
// and the arena wall — hold/drag to steer it. A SECOND mechanic, deliberately
// code-split (lazy-loaded only when opted in) and never the default. Reuses the
// canvas/palette/particle/audio vibe of the restore engine, self-contained.
//
// Collision model = discrete circular bumpers (a bagatelle): circle–circle hits
// always deflect the ball AWAY, so it can never settle into a dead orbit, and
// constant-speed straight chords guarantee it keeps finding bumpers.

import { type WorldConfig, hexToRgb } from "./worlds";

export interface PinballState { score: number; combo: number; best: number }

interface Opts { onState?: (s: PinballState) => void; best?: number }

interface Bumper { rad: number; ang: number; drift: number; size: number; color: string; flash: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }

const TWO = Math.PI * 2;
const COMBO_WINDOW = 1400; // ms between hits to keep a combo alive

export class PinballEngine {
  private ctx: CanvasRenderingContext2D;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private W = 540; private H = 540; private cx = 270; private cy = 270; private DPR = 1;
  private accentRgb = "124,58,237";
  private bumpers: Bumper[] = [];
  private ball = { x: 270, y: 340, vx: 0, vy: 0 };
  private trail: { x: number; y: number }[] = [];
  private particles: Particle[] = [];
  private speed = 320; private ballR = 9; private arenaR = 250; private coreR = 26; private coreFlash = 0;
  private steer: { x: number; y: number } | null = null;
  private score = 0; private combo = 0; private best = 0; private lastHitAt = -1e9;
  private t0 = performance.now(); private raf = 0; private lastEmit = "";
  private muted = false; private actx: AudioContext | null = null;
  private ro: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, world: WorldConfig, private opts: Opts = {}) {
    this.ctx = canvas.getContext("2d")!;
    this.best = opts.best || 0;
    this.accentRgb = hexToRgb(world.accent);
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement || canvas);
    this.resize();
    this.initLevel(world);
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    this.ro.disconnect();
    try { this.actx?.close(); } catch { /* ignore */ }
  }

  setMuted(m: boolean) { this.muted = m; }
  reset(world: WorldConfig) { this.accentRgb = hexToRgb(world.accent); this.score = 0; this.combo = 0; this.initLevel(world); }

  private resize() {
    const el = this.canvas.parentElement || this.canvas;
    const rect = el.getBoundingClientRect();
    const size = Math.max(60, Math.min(rect.width, rect.height));
    this.DPR = Math.min(devicePixelRatio || 1, 2.5);
    this.W = size; this.H = size; this.cx = size / 2; this.cy = size / 2;
    this.canvas.width = size * this.DPR; this.canvas.height = size * this.DPR;
    this.canvas.style.width = size + "px"; this.canvas.style.height = size + "px";
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this.arenaR = size * 0.46; this.coreR = size * 0.055; this.ballR = Math.max(6, size * 0.018);
    this.speed = size * (this.reduce ? 0.4 : 0.6);
  }

  private initLevel(world: WorldConfig) {
    // Rings of orbiting bumpers at two radii — a lively bagatelle.
    const cols = world.ringColors;
    this.bumpers = [];
    const bands = [{ frac: 0.74, n: 5 }, { frac: 0.46, n: 4 }];
    bands.forEach((band, bi) => {
      for (let k = 0; k < band.n; k++) {
        this.bumpers.push({
          rad: this.arenaR * band.frac, ang: (k / band.n) * TWO + bi * 0.6,
          drift: (bi % 2 ? 1 : -1) * (0.18 + 0.12 * bi), size: this.arenaR * (0.062 - bi * 0.008),
          color: cols[(bi * 3 + k) % cols.length], flash: 0,
        });
      }
    });
    // Launch the ball from near the wall, aimed across the arena.
    const a = Math.random() * TWO;
    this.ball.x = this.cx + Math.cos(a) * this.arenaR * 0.75;
    this.ball.y = this.cy + Math.sin(a) * this.arenaR * 0.75;
    const dir = a + Math.PI + (Math.random() - 0.5) * 1.2;
    this.ball.vx = Math.cos(dir) * this.speed; this.ball.vy = Math.sin(dir) * this.speed;
    this.particles = []; this.trail = [];
    this.emit();
  }

  private emit() {
    const key = `${this.score}|${this.combo}|${this.best}`;
    if (key !== this.lastEmit) { this.lastEmit = key; this.opts.onState?.({ score: this.score, combo: this.combo, best: this.best }); }
  }

  private tone(freq: number, dur: number, gain = 0.05) {
    if (this.muted) return;
    try {
      if (!this.actx) this.actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.actx.state === "suspended") this.actx.resume();
      const o = this.actx.createOscillator(), g = this.actx.createGain();
      o.type = "triangle"; o.frequency.value = freq; o.connect(g); g.connect(this.actx.destination);
      const now = this.actx.currentTime;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain, now + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.start(now); o.stop(now + dur);
    } catch { /* ignore */ }
  }

  private p(e: PointerEvent) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  private onDown = (e: PointerEvent) => { this.canvas.setPointerCapture(e.pointerId); this.steer = this.p(e); };
  private onMove = (e: PointerEvent) => { if (this.steer) this.steer = this.p(e); };
  private onUp = () => { this.steer = null; };

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TWO, s = (0.6 + Math.random()) * this.speed * 0.5;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color }); }
  }

  private scoreHit(base: number, x: number, y: number, color: string, big: boolean) {
    const now = performance.now();
    this.combo = now - this.lastHitAt < COMBO_WINDOW ? this.combo + 1 : 1;
    this.lastHitAt = now;
    this.score += base * this.combo;
    if (this.score > this.best) this.best = this.score;
    this.tone((big ? 600 : 430) + Math.min(this.combo, 8) * 45, 0.14);
    if (!this.reduce) this.burst(x, y, color, big ? 20 : 11);
    this.emit();
  }

  private frame = (now: number) => {
    const dt = Math.min(40, now - this.t0); this.t0 = now; const sec = dt / 1000;
    const ctx = this.ctx; const { cx, cy, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    const accent = this.accentRgb;
    const b = this.ball;

    // bumper positions drift
    if (!this.reduce) this.bumpers.forEach((bm) => { bm.ang = (bm.ang + bm.drift * sec) % TWO; bm.flash += (0 - bm.flash) * Math.min(1, dt / 160); });
    this.coreFlash += (0 - this.coreFlash) * Math.min(1, dt / 160);

    // steer (bend toward held point) or a gentle wander; constant speed
    if (this.steer) {
      const dx = this.steer.x - b.x, dy = this.steer.y - b.y, d = Math.hypot(dx, dy) || 1;
      b.vx += (dx / d) * this.speed * 0.11; b.vy += (dy / d) * this.speed * 0.11;
    } else if (!this.reduce) {
      b.vx += (Math.random() - 0.5) * this.speed * 0.04; b.vy += (Math.random() - 0.5) * this.speed * 0.04;
    }
    let sp = Math.hypot(b.vx, b.vy) || 1; b.vx = (b.vx / sp) * this.speed; b.vy = (b.vy / sp) * this.speed;

    // integrate
    b.x += b.vx * sec; b.y += b.vy * sec;

    // arena wall — reflect inward
    let rr = Math.hypot(b.x - cx, b.y - cy);
    if (rr > this.arenaR - this.ballR) {
      const nx = (b.x - cx) / rr, ny = (b.y - cy) / rr;
      b.x = cx + nx * (this.arenaR - this.ballR - 0.5); b.y = cy + ny * (this.arenaR - this.ballR - 0.5);
      const vd = b.vx * nx + b.vy * ny; b.vx -= 2 * vd * nx; b.vy -= 2 * vd * ny;
    }

    // core bumper — the jackpot; kicks the ball back out
    const dcx = b.x - cx, dcy = b.y - cy, dc = Math.hypot(dcx, dcy) || 1;
    if (dc < this.coreR + this.ballR) {
      const nx = dcx / dc, ny = dcy / dc;
      b.x = cx + nx * (this.coreR + this.ballR + 1); b.y = cy + ny * (this.coreR + this.ballR + 1);
      b.vx = nx * this.speed; b.vy = ny * this.speed;
      this.coreFlash = 1; this.scoreHit(5, b.x, b.y, "#ffffff", true);
    }

    // orbiting bumpers — circle/circle; always deflects the ball away (no trap)
    for (const bm of this.bumpers) {
      const bx = cx + Math.cos(bm.ang) * bm.rad, by = cy + Math.sin(bm.ang) * bm.rad;
      const dx = b.x - bx, dy = b.y - by, d = Math.hypot(dx, dy) || 1;
      const min = this.ballR + bm.size;
      if (d < min) {
        const nx = dx / d, ny = dy / d;
        b.x = bx + nx * (min + 0.5); b.y = by + ny * (min + 0.5);
        const vd = b.vx * nx + b.vy * ny; b.vx -= 2 * vd * nx; b.vy -= 2 * vd * ny;
        bm.flash = 1; this.scoreHit(1, b.x, b.y, bm.color, false);
        break;
      }
    }

    // trail
    this.trail.push({ x: b.x, y: b.y }); if (this.trail.length > 14) this.trail.shift();

    // ---- render ----
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.arenaR * 1.1);
    bloom.addColorStop(0, `rgba(${accent},0.16)`); bloom.addColorStop(0.6, `rgba(${accent},0.05)`); bloom.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = bloom; ctx.fillRect(0, 0, W, H);

    ctx.beginPath(); ctx.arc(cx, cy, this.arenaR, 0, TWO); ctx.strokeStyle = "rgba(150,130,255,.18)"; ctx.lineWidth = 2; ctx.stroke();

    // bumpers
    this.bumpers.forEach((bm) => {
      const bx = cx + Math.cos(bm.ang) * bm.rad, by = cy + Math.sin(bm.ang) * bm.rad;
      ctx.save(); ctx.shadowBlur = 8 + 26 * bm.flash; ctx.shadowColor = bm.color;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, bm.size);
      g.addColorStop(0, "#fff"); g.addColorStop(0.5, bm.color); g.addColorStop(1, bm.color + "66");
      ctx.fillStyle = g; ctx.globalAlpha = 0.85 + 0.15 * bm.flash;
      ctx.beginPath(); ctx.arc(bx, by, bm.size * (1 + 0.12 * bm.flash), 0, TWO); ctx.fill();
      ctx.restore();
    });

    // core
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.coreR * (1.8 + 0.5 * this.coreFlash));
    cg.addColorStop(0, "rgba(255,255,255,.9)"); cg.addColorStop(0.5, `rgba(${accent},.6)`); cg.addColorStop(1, `rgba(${accent},0)`);
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, this.coreR * (1.8 + 0.5 * this.coreFlash), 0, TWO); ctx.fill();

    // particles
    this.particles = this.particles.filter((p) => p.life > 0);
    this.particles.forEach((p) => { p.x += p.vx * sec; p.y += p.vy * sec; p.vx *= 0.94; p.vy *= 0.94; p.life -= sec * 1.6;
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2.4 * p.life + 0.6, 0, TWO); ctx.fill(); });
    ctx.globalAlpha = 1;

    // ball trail + ball
    this.trail.forEach((t, i) => { const k = i / this.trail.length; ctx.globalAlpha = k * 0.4; ctx.fillStyle = `rgba(${accent},1)`;
      ctx.beginPath(); ctx.arc(t.x, t.y, this.ballR * k * 0.9, 0, TWO); ctx.fill(); });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 18; ctx.shadowColor = "#fff"; ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(b.x, b.y, this.ballR, 0, TWO); ctx.fill(); ctx.shadowBlur = 0;

    this.raf = requestAnimationFrame(this.frame);
  };
}
