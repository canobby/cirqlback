// arcade-core — shared foundation for every CirqlArcade game.
//
// CirqlBreak proved the pattern (a framework-agnostic canvas engine, juice via
// particles + synth audio + haptics, HUD reported to a React host via callbacks).
// The flagship engine (`cirqlbreak-engine.ts`) stays as-is — it's live and tuned.
// This module lifts the GAME-AGNOSTIC half of that engine into a reusable base so
// new games (Defender, Pop, …) share one canvas loop, one particle system, one
// audio kit and one visual language instead of re-implementing them.
//
// A game engine `extends ArcadeEngine` and implements `step(dt, now)` (advance the
// world) and `draw(now)` (paint entities — fx are drawn for it). The base owns the
// <canvas>, the RAF loop (paused while the tab is hidden), DPR/resize, the
// parts/frags/pops/shocks fx pools, Web-Audio tones, haptics and reduced-motion.
// It touches no DOM outside the canvas; all chrome is the host's job.

export const TAU = Math.PI * 2;

// The Cirqlback neon palette — the through-line that makes the arcade feel like one thing.
export const PALETTE = {
  violet: "#7c3aed",
  pink: "#ec4899",
  cyan: "#22d3ee",
  sky: "#38bdf8",
  amber: "#fbbf24",
  rose: "#fb7185",
  mint: "#34d399",
  lilac: "#a78bfa",
  spark: "#67e8f9", // default cosmetic accent (spark + trail)
} as const;

// ---------- pure helpers (shared by every game + its procedural generation) ----------
export const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const norm = (a: number) => { a %= TAU; if (a < -Math.PI) a += TAU; if (a > Math.PI) a -= TAU; return a; };
export const angDiff = (a: number, b: number) => Math.abs(norm(a - b));
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Best-effort localStorage (standalone best-score / streak fallback when logged out).
export const LS = {
  get: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } },
};

// ---------- fx entities (the shared juice) ----------
export interface Part { x: number; y: number; vx: number; vy: number; life: number; color: string; }
export interface Frag { x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; color: string; len: number; }
export interface Pop { x: number; y: number; txt: string; color: string; life: number; }
export interface Shock { x: number; y: number; r: number; maxR: number; life: number; color: string; }

export interface ArcadeOpts {
  sound?: boolean;
  haptics?: boolean;
}

/**
 * Base class for a CirqlArcade game. Owns the canvas, the loop, fx and audio.
 * Subclasses implement `step` (advance logic by `dt` seconds) and `draw` (paint
 * their own entities); they use the inherited fx spawners / audio / geometry.
 */
export abstract class ArcadeEngine {
  protected cv: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // geometry — a square canvas centred on (cx, cy); the ring games play inside `rimR`.
  protected W = 600; protected H = 600; protected cx = 300; protected cy = 300;
  protected DPR = 1; protected rimR = 270;

  // fx pools
  protected parts: Part[] = [];
  protected frags: Frag[] = [];
  protected pops: Pop[] = [];
  protected shocks: Shock[] = [];
  protected shake = 0;

  // audio / haptics
  private ac: AudioContext | null = null;
  protected muted = false;
  protected haptics = true;

  // loop
  protected raf = 0;
  protected last = performance.now();
  protected destroyed = false;
  private ro: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, opts: ArcadeOpts = {}) {
    this.cv = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ArcadeEngine: 2D canvas context unavailable");
    this.ctx = ctx;
    this.muted = opts.sound === false;
    this.haptics = opts.haptics !== false;

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this.ro.observe(canvas.parentElement);

    this.cv.addEventListener("pointermove", this.handlePointer);
    this.cv.addEventListener("pointerdown", this.handlePointer);
    this.cv.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("keydown", this.handleKey);
    document.addEventListener("visibilitychange", this.onVisibility);

    this.raf = requestAnimationFrame(this.frame);
  }

  // ---------- lifecycle a subclass must implement ----------
  /** Advance the world by `dt` seconds (called only while the tab is visible). */
  protected abstract step(dt: number, now: number): void;
  /** Paint the world. The base clears + applies shake before, and paints fx after,
   *  so a subclass draws only its own entities here (call `drawFx()` where it wants
   *  the particle layer, or let the base paint it on top). */
  protected abstract draw(now: number): void;

  // ---------- input hooks (override the ones a game needs) ----------
  protected onPointerDown(_e: PointerEvent): void { /* override */ }
  protected onPointerMove(_e: PointerEvent): void { /* override */ }
  protected onPointerUp(_e: PointerEvent): void { /* override */ }
  protected onKeyDown(_e: KeyboardEvent): void { /* override */ }

  private handlePointer = (e: PointerEvent) => {
    if (e.type === "pointerdown") { this.resumeAudio(); this.onPointerDown(e); }
    else this.onPointerMove(e);
  };
  private handlePointerUp = (e: PointerEvent) => this.onPointerUp(e);
  private handleKey = (e: KeyboardEvent) => { this.resumeAudio(); this.onKeyDown(e); };
  private onVisibility = () => { if (!document.hidden) this.last = performance.now(); };

  /** Pointer position in canvas (CSS-pixel) space. */
  protected pointerPos(e: PointerEvent): { x: number; y: number } {
    const r = this.cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * this.W, y: ((e.clientY - r.top) / r.height) * this.H };
  }
  /** Angle from the canvas centre to the pointer (rim games aim by this). */
  protected pointerAngle(e: PointerEvent): number {
    const p = this.pointerPos(e);
    return Math.atan2(p.y - this.cy, p.x - this.cx);
  }

  // ---------- the loop ----------
  private frame = (now: number) => {
    if (this.destroyed) return;
    const dt = clamp((now - this.last) / 1000, 0, 0.05);
    this.last = now;
    if (!document.hidden) {
      this.step(dt, now);
      this.updateFx(dt);
      if (this.shake > 0.4) this.shake *= Math.pow(0.001, dt); // decay toward 0
    }
    this.paint(now);
    this.raf = requestAnimationFrame(this.frame);
  };

  private paint(now: number) {
    const { ctx, W, H } = this;
    ctx.save();
    if (this.shake > 0.4) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    ctx.clearRect(-40, -40, W + 80, H + 80);
    this.draw(now);
    ctx.restore();
  }

  // ---------- geometry ----------
  protected resize() {
    const host = this.cv.parentElement;
    const avail = host ? Math.min(host.clientWidth, host.clientHeight) : Math.min(innerWidth, innerHeight);
    const size = Math.max(280, Math.min((avail || 600) * 0.98, 680));
    this.DPR = Math.min(devicePixelRatio || 1, 2.5);
    this.W = size; this.H = size; this.cx = size / 2; this.cy = size / 2; this.rimR = size * 0.46;
    this.cv.width = size * this.DPR; this.cv.height = size * this.DPR;
    this.cv.style.width = size + "px"; this.cv.style.height = size + "px";
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this.onResize();
  }
  /** Hook for subclasses that cache geometry-derived values. */
  protected onResize(): void { /* override */ }

  // ---------- fx spawners (shared juice) ----------
  protected burst(x: number, y: number, color: string, n: number, spd: number) {
    n = Math.min(n, 420 - this.parts.length);
    if (n <= 0) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.4 + Math.random()); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color }); }
  }
  protected frag(x: number, y: number, color: string, baseSpeed = 400) {
    if (this.reduce || this.frags.length > 160) return;
    for (let i = 0; i < 4; i++) { const a = Math.random() * TAU, s = baseSpeed * (0.3 + Math.random() * 0.5); this.frags.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, life: 1, color, len: 5 + Math.random() * 7 }); }
  }
  protected pop(x: number, y: number, txt: string, color: string) { this.pops.push({ x, y, txt, color, life: 1 }); }
  protected shock(x: number, y: number, color: string, maxR: number) { if (!this.reduce) this.shocks.push({ x, y, r: 4, maxR, life: 1, color }); }

  protected updateFx(dt: number) {
    this.parts = this.parts.filter((p) => p.life > 0); this.parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; p.life -= dt * 1.7; });
    this.frags = this.frags.filter((p) => p.life > 0); this.frags.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.rot += p.vr * dt; p.life -= dt * 1.4; });
    this.pops = this.pops.filter((p) => p.life > 0); this.pops.forEach((p) => { p.y -= dt * 30; p.life -= dt * 1.1; });
    this.shocks = this.shocks.filter((s) => s.life > 0); this.shocks.forEach((s) => { s.life -= dt * 1.8; s.r += (s.maxR - s.r) * Math.min(1, dt * 4); });
  }

  /** Paint the shared particle layer. Subclasses call this within `draw()`. */
  protected drawFx(now: number) {
    const { ctx } = this;
    for (const p of this.frags) { ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.strokeStyle = p.color; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-p.len / 2, 0); ctx.lineTo(p.len / 2, 0); ctx.stroke(); ctx.restore(); }
    for (const p of this.parts) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 * p.life + 0.5, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const s of this.shocks) { ctx.globalAlpha = Math.max(0, s.life) * 0.5; ctx.strokeStyle = s.color; ctx.lineWidth = s.life * 3 + 0.5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const p of this.pops) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.font = "800 15px system-ui"; ctx.textAlign = "center"; ctx.shadowBlur = 8; ctx.shadowColor = p.color; ctx.fillText(p.txt, p.x, p.y); ctx.shadowBlur = 0; }
    ctx.globalAlpha = 1;
    void now;
  }
  protected clearFx() { this.parts = []; this.frags = []; this.pops = []; this.shocks = []; }

  // ---------- audio / haptics ----------
  private resumeAudio() { try { if (this.ac?.state === "suspended") this.ac.resume(); } catch { /* ignore */ } }
  /** A short synth tone. Every arcade game's SFX are built from these for one voice. */
  protected tone(f: number, d: number, type: OscillatorType = "triangle", g = 0.045) {
    if (this.muted) return;
    try {
      if (!this.ac) this.ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.ac.state === "suspended") this.ac.resume();
      const o = this.ac.createOscillator(), ga = this.ac.createGain();
      o.type = type; o.frequency.value = f; o.connect(ga); ga.connect(this.ac.destination);
      const t = this.ac.currentTime;
      ga.gain.setValueAtTime(0, t); ga.gain.linearRampToValueAtTime(g, t + 0.006); ga.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.start(t); o.stop(t + d);
    } catch { /* audio best-effort */ }
  }
  protected buzz(p: number | number[]) { if (this.haptics && !this.muted) { try { navigator.vibrate?.(p); } catch { /* ignore */ } } }

  setMuted(m: boolean) { this.muted = m; }
  setHaptics(h: boolean) { this.haptics = h; }
  isMuted() { return this.muted; }

  // ---------- teardown ----------
  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.cv.removeEventListener("pointermove", this.handlePointer);
    this.cv.removeEventListener("pointerdown", this.handlePointer);
    this.cv.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("keydown", this.handleKey);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.onDestroy();
    try { this.ac?.close(); } catch { /* ignore */ }
    this.ac = null;
  }
  /** Hook for subclass-specific teardown. */
  protected onDestroy(): void { /* override */ }
}
