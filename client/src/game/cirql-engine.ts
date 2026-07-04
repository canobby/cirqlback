// CIRQL — core game engine (framework-agnostic).
//
// Ported from the CHR-86 prototype + CHR-100 ambient life. Owns a <canvas>: the
// ring-align puzzle, input, ambient motion, and the win state. It reports HUD
// state to the host via `onState` (only when values change, so React doesn't
// re-render every frame) and calls `onWin` on a solve. No DOM outside the canvas.
//
// Phase 1 (CHR-89): a single procedural puzzle that grows in difficulty each
// win. Worlds-as-config (CHR-90) and the procedural engine (CHR-101) plug in
// here later.

import { type WorldConfig, hexToRgb } from "./worlds";

export interface GameState {
  worldName: string;
  aligned: number;
  total: number;
  moves: number;
  won: boolean;
}

interface EngineOpts {
  onState?: (s: GameState) => void;
  onWin?: () => void;
}

interface Ring {
  radius: number; thick: number; span: number; color: string;
  rot: number; tween: { from: number; to: number; t: number } | null;
  aligned: boolean; wasAligned: boolean; glow: number;
  drift: number; driftResumeAt: number; vel: number; // vel = flick-to-spin momentum (rad/s)
}
interface Star { x: number; y: number; r: number; vx: number; vy: number; a: number; tw: number; hue: string; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }
interface Wisp { x: number; y: number; vy: number; life: number; drift: number; }
interface Spark { a: { x: number; y: number }; b: { x: number; y: number }; color: string; life: number; }
// CHR-87 juice: expanding ring pulse on lock/solve/attract-invite.
interface Shock { x: number; y: number; r: number; maxR: number; life: number; color: string; width: number; }
// CHR-87 juice: a mote of light travelling from an aligned ring's node into the core.
interface Energy { x: number; y: number; sx: number; sy: number; t: number; color: string; }
// CHR-87 juice: transient "x2/x3…" combo flourish text.
interface ComboPop { x: number; y: number; life: number; text: string; }

const ALIGN_TOL = 0.10;
const SNAP_TOL = 0.34;
const TWO = Math.PI * 2;
// CHR-87 juice tuning — kept gentle ("satisfying, not arcade").
const COMBO_WINDOW = 2200; // ms between locks to keep a combo alive
const MAX_VEL = 12;        // clamp on flick momentum (rad/s)
const ATTRACT_DELAY = 6000; // ms of idle before the puzzle starts inviting play

export class CirqlEngine {
  private ctx: CanvasRenderingContext2D;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private W = 540; private H = 540; private cx = 270; private cy = 270; private DPR = 1;
  private rings: Ring[] = [];
  private world!: WorldConfig; private accentRgb = "124,58,237";
  private auraRgb: string | null = null; // CHR-92: equipped cosmetic tints the core/bloom over the world accent
  private guiding = false; // CHR-96 "Guiding Light" perk: wider snap for this world
  private zen = false; // CHR-106 Zen mode: quiet the scoreboard-y juice
  private moves = 0; private won = false;
  private drag: { i: number; startA: number; startRot: number; moved: boolean; lastA: number; lastT: number; vel: number } | null = null;
  private selected = 0;
  private particles: Particle[] = []; private wisps: Wisp[] = []; private sparks: Spark[] = []; private stars: Star[] = [];
  private shocks: Shock[] = []; private energy: Energy[] = []; private combos: ComboPop[] = [];
  private combo = 0; private lastLockAt = 0; private coreEnergy = 0; private winFlash = 0;
  private lastInputAt = performance.now(); private attractTimer = 0;
  private t0 = performance.now(); private sparkTimer = 1400; private wispTimer = 0;
  private muted = false; private actx: AudioContext | null = null;
  private raf = 0; private lastEmit = ""; private ro: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, world: WorldConfig, private opts: EngineOpts = {}) {
    this.ctx = canvas.getContext("2d")!;
    this.world = world; this.accentRgb = hexToRgb(world.accent);
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    window.addEventListener("keydown", this.onKey);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement || canvas);
    this.resize();
    this.initLevel();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    window.removeEventListener("keydown", this.onKey);
    this.ro.disconnect();
    try { this.actx?.close(); } catch { /* ignore */ }
  }

  newPuzzle() { this.initLevel(); }
  setWorld(world: WorldConfig) { this.world = world; this.accentRgb = hexToRgb(world.accent); this.guiding = false; this.initLevel(); }
  setMuted(m: boolean) { this.muted = m; }
  // CHR-92: an equipped cosmetic tints the core/bloom; null falls back to the world accent.
  setAura(hex: string | null) { this.auraRgb = hex ? hexToRgb(hex) : null; }
  private accent() { return this.auraRgb ?? this.accentRgb; }

  // CHR-96 perks. Echo Assist: instantly aligns one still-off ring (returns
  // false if there's nothing to align, so the caller doesn't spend it for free).
  autoAlignOne(): boolean {
    if (this.won) return false;
    const r = this.rings.find((r) => !r.aligned && !r.tween);
    if (!r) return false;
    r.vel = 0;
    r.tween = { from: r.rot, to: Math.round(r.rot / TWO) * TWO, t: 0 };
    return true;
  }
  // Guiding Light: widen the snap/align tolerance for the current world.
  setGuidingLight(on: boolean) { this.guiding = on; }
  setZen(on: boolean) { this.zen = on; } // CHR-106: quiet combo flourishes
  private alignTol() { return this.guiding ? ALIGN_TOL * 2.2 : ALIGN_TOL; }
  private snapTol() { return this.guiding ? SNAP_TOL * 1.5 : SNAP_TOL; }

  // ---- helpers ----
  private norm(a: number) { a %= TWO; if (a < -Math.PI) a += TWO; if (a > Math.PI) a -= TWO; return a; }
  private dist(a: number, b: number) { return Math.abs(this.norm(a - b)); }
  private nodePt(r: Ring) { const c = -Math.PI / 2 + r.rot; return { x: this.cx + Math.cos(c) * r.radius, y: this.cy + Math.sin(c) * r.radius }; }

  private resize() {
    const el = this.canvas.parentElement || this.canvas;
    const rect = el.getBoundingClientRect();
    const size = Math.max(60, Math.min(rect.width, rect.height));
    this.DPR = Math.min(devicePixelRatio || 1, 2.5);
    this.W = size; this.H = size; this.cx = size / 2; this.cy = size / 2;
    this.canvas.width = size * this.DPR; this.canvas.height = size * this.DPR;
    this.canvas.style.width = size + "px"; this.canvas.style.height = size + "px";
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this.initStars();
  }

  private initStars() {
    this.stars = [];
    if (this.reduce) return;
    const n = Math.round((this.W * this.H) / 7000);
    for (let i = 0; i < n; i++) {
      this.stars.push({
        x: Math.random() * this.W, y: Math.random() * this.H, r: Math.random() * 1.3 + 0.3,
        vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
        a: Math.random() * 0.5 + 0.15, tw: Math.random() * TWO,
        hue: Math.random() < 0.5 ? "196,181,253" : "59,201,255",
      });
    }
  }

  private initLevel() {
    const n = Math.max(3, Math.min(this.world.ringCount, 6));
    const maxR = Math.min(this.W, this.H) * 0.44;
    const step = (maxR - Math.min(this.W, this.H) * 0.14) / n;
    this.rings = [];
    for (let i = 0; i < n; i++) {
      const radius = maxR - i * step;
      let rot = 0; while (this.dist(rot, 0) < 0.7) rot = Math.random() * TWO;
      this.rings.push({
        radius, thick: Math.max(14, step * 0.52), span: this.world.span - i * 0.03,
        color: this.world.ringColors[i % this.world.ringColors.length], rot, tween: null,
        aligned: false, wasAligned: false, glow: 0,
        drift: (Math.random() * 0.05 + 0.03) * (i % 2 ? 1 : -1) * (0.8 + 0.6 * this.world.difficulty), driftResumeAt: 0, vel: 0,
      });
    }
    this.won = false; this.moves = 0; this.particles = []; this.wisps = []; this.sparks = []; this.selected = 0;
    this.shocks = []; this.energy = []; this.combos = []; this.combo = 0; this.lastLockAt = 0; this.coreEnergy = 0; this.winFlash = 0;
    this.lastInputAt = performance.now();
    this.emit(0);
  }

  private emit(aligned: number) {
    const s: GameState = { worldName: this.world.name, aligned, total: this.rings.length, moves: this.moves, won: this.won };
    const key = `${s.worldName}|${s.aligned}|${s.total}|${s.moves}|${s.won}`;
    if (key !== this.lastEmit) { this.lastEmit = key; this.opts.onState?.(s); }
  }

  // ---- audio ----
  private tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.06) {
    if (this.muted) return;
    try {
      if (!this.actx) this.actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.actx.state === "suspended") this.actx.resume();
      const o = this.actx.createOscillator(), g = this.actx.createGain();
      o.type = type; o.frequency.value = freq; o.connect(g); g.connect(this.actx.destination);
      const now = this.actx.currentTime;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.start(now); o.stop(now + dur);
    } catch { /* ignore */ }
  }
  private clickSnap() { this.tone(520 + Math.random() * 40, 0.18, "triangle", 0.05); }
  // A lock tone that steps up a pentatonic ladder with the combo, so chaining
  // reads as a rising, rewarding figure (kept soft — satisfying, not arcade).
  private lockTone(combo: number) {
    const ladder = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
    const f = ladder[Math.min(combo - 1, ladder.length - 1)] || ladder[0];
    this.tone(f, 0.22, "triangle", 0.05);
    if (combo >= 2) this.tone(f * 1.5, 0.16, "sine", 0.025); // a shimmer harmonic on a chain
  }
  private chime() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => this.tone(f, 0.9, "sine", 0.05), i * 90)); }
  // Haptics (where supported) — gated by the same mute toggle so there's a kill switch.
  private haptic(pattern: number | number[]) {
    if (this.muted) return;
    try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
  }

  // ---- input ----
  private pAngle(e: PointerEvent) { const r = this.canvas.getBoundingClientRect(); return Math.atan2((e.clientY - r.top) - this.cy, (e.clientX - r.left) - this.cx); }
  private pRadius(e: PointerEvent) { const r = this.canvas.getBoundingClientRect(); return Math.hypot((e.clientX - r.left) - this.cx, (e.clientY - r.top) - this.cy); }
  private hitRing(e: PointerEvent) {
    const rad = this.pRadius(e); let best = -1, bestD = 1e9;
    this.rings.forEach((r, i) => { const d = Math.abs(rad - r.radius); if (d < r.thick * 0.9 + 6 && d < bestD) { bestD = d; best = i; } });
    return best;
  }
  private onDown = (e: PointerEvent) => {
    this.lastInputAt = performance.now();
    if (this.won) return;
    const i = this.hitRing(e); if (i < 0) return;
    this.canvas.setPointerCapture(e.pointerId);
    this.selected = i; this.rings[i].tween = null; this.rings[i].vel = 0;
    const a = this.pAngle(e);
    this.drag = { i, startA: a, startRot: this.rings[i].rot, moved: false, lastA: a, lastT: performance.now(), vel: 0 };
  };
  private onMove = (e: PointerEvent) => {
    if (!this.drag) return;
    const a = this.pAngle(e);
    const d = this.norm(a - this.drag.startA);
    this.rings[this.drag.i].rot = this.drag.startRot + d;
    this.drag.moved = this.drag.moved || Math.abs(d) > 0.02;
    // Track angular velocity for flick-to-spin (smoothed, rad/s).
    const now = performance.now(); const gap = now - this.drag.lastT;
    if (gap > 0) {
      const inst = this.norm(a - this.drag.lastA) / (gap / 1000);
      this.drag.vel = this.drag.vel * 0.6 + inst * 0.4;
      this.drag.lastA = a; this.drag.lastT = now;
    }
  };
  private onUp = () => {
    if (!this.drag) return;
    const r = this.rings[this.drag.i];
    if (this.drag.moved) this.moves++;
    this.lastInputAt = performance.now();
    const v = this.drag.vel;
    // A slow release near the top settles with a spring; a real flick keeps its
    // momentum and spins on, snapping once it winds down (see the frame loop).
    if (this.dist(r.rot, 0) < this.snapTol() && Math.abs(v) < 2.2) {
      r.tween = { from: r.rot, to: Math.round(r.rot / TWO) * TWO, t: 0 }; r.vel = 0;
    } else if (Math.abs(v) > 0.6) {
      r.vel = Math.max(-MAX_VEL, Math.min(MAX_VEL, v)); r.driftResumeAt = performance.now() + 900;
    } else {
      r.vel = 0; r.driftResumeAt = performance.now() + 900;
    }
    this.drag = null;
  };
  private onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") this.lastInputAt = performance.now();
    if (this.won) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const r = this.rings[this.selected]; if (!r) return;
      r.tween = null; r.vel = 0; r.rot = this.norm(r.rot + (e.key === "ArrowLeft" ? -0.09 : 0.09));
      r.driftResumeAt = performance.now() + 900; this.moves++;
      e.preventDefault();
    }
  };

  private burst(x: number, y: number, color: string, n: number, spd: number) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TWO, s = spd * (0.5 + Math.random());
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color }); }
  }

  // A ring settled onto the top — the "lock" moment. Builds the combo, feeds the
  // core, rings a shockwave, and (on a chain) pops a little "x2/x3" flourish.
  private onLock(r: Ring, p: { x: number; y: number }, now: number) {
    this.combo = now - this.lastLockAt < COMBO_WINDOW ? this.combo + 1 : 1;
    this.lastLockAt = now;
    this.lockTone(this.combo);
    this.haptic(this.combo >= 3 ? [12, 22, 12] : 14);
    if (!this.reduce) {
      this.shocks.push({ x: p.x, y: p.y, r: 4, maxR: r.thick * 1.8 + 26, life: 1, color: r.color, width: 3 });
      for (let i = 0; i < 4 + this.combo; i++) this.energy.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, t: Math.random() * 0.12, color: r.color });
      if (this.combo >= 2 && !this.zen) this.combos.push({ x: p.x, y: p.y, life: 1, text: "×" + this.combo });
    }
  }

  // ---- render loop ----
  private frame = (now: number) => {
    const dt = Math.min(40, now - this.t0); this.t0 = now; const sec = dt / 1000;
    const ctx = this.ctx; const { cx, cy, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    this.coreEnergy = Math.max(0, this.coreEnergy - sec * 0.8);
    this.winFlash = Math.max(0, this.winFlash - sec * 0.9);
    // Attract mode (CHR-87): after a spell of no input, the puzzle stirs a little
    // livelier and periodically blooms an inviting ring at the rim.
    const attract = !this.won && !this.drag && !this.reduce && (now - this.lastInputAt > ATTRACT_DELAY);

    let alignedCount = 0;
    this.rings.forEach((r, i) => {
      const dragging = this.drag && this.drag.i === i;
      if (r.tween) {
        r.tween.t += dt / 165;
        const tt = r.tween.t >= 1 ? 1 : r.tween.t;
        // Spring-settle: a small overshoot (easeOutBack); plain ease when reduced-motion.
        const k = tt >= 1 ? 1
          : this.reduce ? 1 - Math.pow(1 - tt, 3)
          : (() => { const c1 = 1.15, c3 = c1 + 1, u = tt - 1; return 1 + c3 * u * u * u + c1 * u * u; })();
        r.rot = r.tween.from + (r.tween.to - r.tween.from) * k;
        if (r.tween.t >= 1) { r.rot = this.norm(r.tween.to); r.tween = null; }
      } else if (!dragging && !this.won && Math.abs(r.vel) > 0.15) {
        // Flick-to-spin inertia — momentum decays, then snaps if it lands near the top.
        r.rot = this.norm(r.rot + r.vel * sec);
        r.vel *= Math.pow(0.86, dt / 16);
        if (Math.abs(r.vel) <= 0.15) { r.vel = 0; if (this.dist(r.rot, 0) < SNAP_TOL) r.tween = { from: r.rot, to: Math.round(r.rot / TWO) * TWO, t: 0 }; }
      } else if (!this.reduce && !this.won && !dragging && !r.aligned && now >= r.driftResumeAt) {
        r.rot = this.norm(r.rot + r.drift * sec * (attract ? 1.5 : 1));
      }
      const settled = !r.tween && Math.abs(r.vel) < 0.25; // a real lock, not a fly-through
      r.aligned = !r.tween && this.dist(r.rot, 0) < this.alignTol() && (!this.drag || this.drag.i !== i);
      if (r.aligned) alignedCount++;
      r.glow += ((r.aligned ? 1 : 0) - r.glow) * Math.min(1, dt / 120);
      if (r.aligned && !r.wasAligned) {
        const p = this.nodePt(r); this.burst(p.x, p.y, r.color, 14, 2.4);
        if (settled) this.onLock(r, p, now); else this.clickSnap(); // whipping past → just a tick
      }
      r.wasAligned = r.aligned;
    });

    const outerR0 = this.rings[0]?.radius || 200;
    const solved = this.rings.length > 0 && alignedCount === this.rings.length;
    if (solved && !this.won) {
      this.won = true; this.rings.forEach(r => (r.vel = 0));
      this.burst(cx, cy, "#c4b5fd", 46, 3.4); this.chime();
      this.winFlash = 1; this.coreEnergy = 1.2; // big bloom
      if (!this.reduce) {
        this.shocks.push({ x: cx, y: cy, r: 8, maxR: outerR0 * 1.7, life: 1, color: "#c4b5fd", width: 5 });
        this.shocks.push({ x: cx, y: cy, r: 4, maxR: outerR0 * 1.15, life: 1, color: "#ec4899", width: 3 });
      }
      this.haptic([18, 40, 24, 40, 40]);
      this.opts.onWin?.();
    }

    const progress = alignedCount / Math.max(1, this.rings.length);
    const pulse = this.reduce ? 0.5 : 0.5 + 0.5 * Math.sin(now / 900);
    const outerR = this.rings[0]?.radius || 200;

    if (attract) {
      this.attractTimer -= dt;
      if (this.attractTimer <= 0) { this.attractTimer = 2600;
        this.shocks.push({ x: cx, y: cy, r: outerR * 0.9, maxR: outerR + 22, life: 0.8, color: "#c4b5fd", width: 2 }); }
    } else this.attractTimer = 900;

    // life-bloom (CHR-108: shiny worlds glow a touch brighter)
    const accent = this.accent();
    const shiny = this.world.shiny ? 1.45 : 1;
    const life = 0.12 + 0.88 * progress;
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.62);
    bloom.addColorStop(0, `rgba(${accent},${(0.12 + 0.24 * life) * shiny})`);
    bloom.addColorStop(0.5, `rgba(${accent},${(0.03 + 0.09 * life) * shiny})`);
    bloom.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = bloom; ctx.fillRect(0, 0, W, H);

    // stardust
    this.stars.forEach(s => {
      if (!this.reduce) { s.x += s.vx * sec; s.y += s.vy * sec; s.tw += sec * 1.5;
        if (s.x < 0) s.x += W; if (s.x > W) s.x -= W; if (s.y < 0) s.y += H; if (s.y > H) s.y -= H; }
      const tw = this.reduce ? 1 : 0.6 + 0.4 * Math.sin(s.tw);
      ctx.globalAlpha = Math.min(1, s.a * tw * (0.5 + 0.5 * life) * shiny); ctx.fillStyle = `rgb(${s.hue})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TWO); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // beam + notch
    const flick = this.reduce ? 1 : 0.85 + 0.15 * Math.sin(now / 320);
    const beam = this.won ? 1 : (0.12 + 0.6 * progress) * flick;
    const g = ctx.createLinearGradient(cx, cy - outerR - 14, cx, cy);
    g.addColorStop(0, `rgba(196,181,253,${0.02 + 0.28 * beam})`);
    g.addColorStop(1, `rgba(236,72,153,${0.02 + 0.4 * beam})`);
    ctx.strokeStyle = g; ctx.lineWidth = this.won ? 8 : 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy - outerR - 14); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.fillStyle = "rgba(196,181,253,.55)"; const ty = cy - outerR - 20;
    ctx.beginPath(); ctx.moveTo(cx, ty + 9); ctx.lineTo(cx - 6, ty); ctx.lineTo(cx + 6, ty); ctx.closePath(); ctx.fill();

    // rings
    this.rings.forEach((r, i) => {
      ctx.beginPath(); ctx.arc(cx, cy, r.radius, 0, TWO);
      ctx.strokeStyle = "rgba(150,130,255,.09)"; ctx.lineWidth = r.thick; ctx.stroke();
      const center = -Math.PI / 2 + r.rot, a0 = center - r.span / 2, a1 = center + r.span / 2;
      ctx.save();
      ctx.shadowBlur = 8 + 22 * r.glow; ctx.shadowColor = r.color; ctx.strokeStyle = r.color;
      ctx.globalAlpha = 0.5 + 0.5 * r.glow + (i === this.selected && !this.won ? 0.08 : 0);
      ctx.lineWidth = r.thick; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, cy, r.radius, a0, a1); ctx.stroke();
      ctx.restore();
      const p = this.nodePt(r);
      ctx.beginPath(); ctx.arc(p.x, p.y, 3 + 3 * r.glow, 0, TWO);
      ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * r.glow})`;
      ctx.shadowBlur = 12 * r.glow; ctx.shadowColor = r.color; ctx.fill(); ctx.shadowBlur = 0;
    });

    // shockwaves — expanding rings from locks / the win / attract invites
    this.shocks = this.shocks.filter(s => s.life > 0);
    this.shocks.forEach(s => {
      s.life -= sec * 1.8; s.r += (s.maxR - s.r) * Math.min(1, sec * 3.2);
      ctx.globalAlpha = Math.max(0, s.life) * 0.5; ctx.strokeStyle = s.color; ctx.lineWidth = s.width * s.life + 0.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TWO); ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // energy-to-core — motes stream from locked nodes into the core and brighten it
    this.energy.forEach(e => {
      e.t += sec * 1.6;
      if (e.t >= 1) { this.coreEnergy = Math.min(1.2, this.coreEnergy + 0.1); return; }
      const ke = 1 - Math.pow(1 - e.t, 2); // ease in toward the centre
      e.x = e.sx + (cx - e.sx) * ke; e.y = e.sy + (cy - e.sy) * ke;
      ctx.globalAlpha = 0.85 * (1 - e.t * 0.4); ctx.fillStyle = e.color;
      ctx.shadowBlur = 6; ctx.shadowColor = e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, 2.2 * (1 - e.t * 0.5) + 0.6, 0, TWO); ctx.fill();
    });
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    this.energy = this.energy.filter(e => e.t < 1);

    // core + wisps
    const coreR = (Math.min(W, H) * 0.07) * (1 + 0.06 * pulse + 0.12 * this.coreEnergy) * (this.won ? 1.35 : 1);
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4); const b = Math.min(1.15, 0.25 + 0.75 * progress + 0.4 * this.coreEnergy);
    cg.addColorStop(0, `rgba(255,255,255,${0.7 * b + (this.won ? 0.3 : 0)})`);
    cg.addColorStop(0.4, `rgba(${accent},${0.5 * b})`); cg.addColorStop(1, `rgba(${accent},0)`);
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, coreR * 2.4, 0, TWO); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * progress})`;
    ctx.beginPath(); ctx.arc(cx, cy, coreR * 0.5, 0, TWO); ctx.fill();

    if (!this.reduce) {
      this.wispTimer += dt;
      if (this.wispTimer > 520) { this.wispTimer = 0;
        this.wisps.push({ x: cx + (Math.random() - 0.5) * coreR, y: cy, vy: -(18 + Math.random() * 16), life: 1, drift: (Math.random() - 0.5) * 8 }); }
    }
    this.wisps = this.wisps.filter(w => w.life > 0);
    this.wisps.forEach(w => { w.y += w.vy * sec; w.x += w.drift * sec; w.life -= sec * 0.7;
      ctx.globalAlpha = Math.max(0, w.life) * 0.5; ctx.fillStyle = "#c4b5fd";
      ctx.beginPath(); ctx.arc(w.x, w.y, 1.6 * w.life + 0.4, 0, TWO); ctx.fill(); });
    ctx.globalAlpha = 1;

    // sparks
    if (!this.reduce && !this.won) {
      this.sparkTimer -= dt;
      if (this.sparkTimer <= 0) {
        this.sparkTimer = 2400 + Math.random() * 1800;
        const un = this.rings.filter(r => !r.aligned);
        if (un.length >= 2) {
          const a = un[(Math.random() * un.length) | 0]; let bb = a; while (bb === a) bb = un[(Math.random() * un.length) | 0];
          this.sparks.push({ a: this.nodePt(a), b: this.nodePt(bb), color: a.color, life: 1 });
        }
      }
    }
    this.sparks = this.sparks.filter(s => s.life > 0);
    this.sparks.forEach(s => {
      s.life -= sec * 3.2; const segs = 5;
      ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y);
      for (let k = 1; k < segs; k++) { const t = k / segs;
        ctx.lineTo(s.a.x + (s.b.x - s.a.x) * t + (Math.random() - 0.5) * 14, s.a.y + (s.b.y - s.a.y) * t + (Math.random() - 0.5) * 14); }
      ctx.lineTo(s.b.x, s.b.y);
      ctx.globalAlpha = Math.max(0, s.life) * 0.6; ctx.strokeStyle = s.color; ctx.lineWidth = 1.4;
      ctx.shadowBlur = 8; ctx.shadowColor = s.color; ctx.stroke(); ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    // burst particles
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt / 700;
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.4 * p.life + 0.5, 0, TWO); ctx.fill(); });
    ctx.globalAlpha = 1;

    // combo flourishes — rising "×2/×3…" as quick locks chain
    this.combos = this.combos.filter(c => c.life > 0);
    this.combos.forEach(c => {
      c.life -= sec * 1.1; c.y -= sec * 22;
      ctx.globalAlpha = Math.max(0, c.life); ctx.fillStyle = "#fbcfe8"; ctx.textAlign = "center";
      ctx.font = `700 ${13 + (1 - c.life) * 5}px system-ui, -apple-system, sans-serif`;
      ctx.shadowBlur = 8; ctx.shadowColor = "#ec4899"; ctx.fillText(c.text, c.x, c.y); ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1; ctx.textAlign = "start";

    // vignette
    const vig = ctx.createRadialGradient(cx, cy, outerR * 0.7, cx, cy, Math.max(W, H) * 0.66);
    vig.addColorStop(0, "rgba(5,4,15,0)"); vig.addColorStop(1, `rgba(3,2,10,${0.55 - 0.4 * life})`);
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    // big-bloom flash on solve (additive, brief) — drawn last so the vignette can't dim it
    if (this.winFlash > 0) {
      const wf = this.winFlash;
      const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.6);
      fg.addColorStop(0, `rgba(255,255,255,${0.5 * wf})`);
      fg.addColorStop(0.4, `rgba(196,181,253,${0.28 * wf})`);
      fg.addColorStop(1, "rgba(5,4,15,0)");
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    }

    this.emit(alignedCount);
    this.raf = requestAnimationFrame(this.frame);
  };
}
