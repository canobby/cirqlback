// retro-engine — the 16-bit foundation for CIRQLBACK · MAIN STREET ARCADE cabinets.
//
// Where `arcade-core`'s ArcadeEngine is a square, neon, vector-ish canvas for the
// circular snack games, RetroEngine is its pixel-art sibling: everything is drawn
// into a small internal buffer (e.g. 240×180) and scaled up nearest-neighbor so it
// reads as crisp chunky pixels, with a toggleable CRT (scanlines + vignette) on top.
// It owns the buffer, the fixed-timestep loop, a full-colour 16-bit draw kit
// (gradients, 3-tone surfaces, spherically-lit round heroes), the bundled pixel
// font, chiptune audio, and d-pad / tap / two-thumb input. A cabinet subclass
// implements `update(dt)` and `render()` and draws with the inherited kit.
//
// The public surface (start/toMenu/setMuted/setHaptics/destroy/press/release) is
// compatible with a game shell, so cabinets host the same way the arcade games do.

import { clamp, mulberry32, hexToRgb, LS, TAU } from "./arcade-core";
import { FONT, FONT_W, FONT_H, GLYPH_ADVANCE } from "./retro-font";
import { paintAvatar, type AvatarConfig } from "./avatar";
import type { MusicKit } from "./musickit";

export { LS, TAU };

// A 16-colour retro palette (indexable, but the kit also takes any hex string).
// Coffee browns, creams and neons for the shop-themed cabinets.
export const RETRO_PALETTE = [
  "#0b0712", "#1d2b53", "#7e2553", "#128a5b", "#ab5236", "#5f574f", "#c2c3c7", "#fff1e8",
  "#ff4d6d", "#ffa300", "#ffec27", "#00e436", "#29adff", "#83769c", "#ff77a8", "#ffccaa",
] as const;

// ---------- colour helpers (shared with the mockups' kit) ----------
const toHex = (r: number, g: number, b: number) =>
  "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
/** Lighten (amt>0, toward white) or darken (amt<0, toward black) a hex colour. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255, k = Math.abs(amt);
  return toHex(Math.round(r + (t - r) * k), Math.round(g + (t - g) * k), Math.round(b + (t - b) * k));
}
/** Linear blend between two hex colours, t in [0,1]. */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return toHex(Math.round(A[0] + (B[0] - A[0]) * t), Math.round(A[1] + (B[1] - A[1]) * t), Math.round(A[2] + (B[2] - A[2]) * t));
}

export type Btn = "up" | "down" | "left" | "right" | "a" | "b";

export interface RetroHooks {
  sound?: boolean;
  haptics?: boolean;
  crt?: boolean;
  onHud?: (h: any) => void;
  onRunEnd?: (r: any) => void;
  /** CIRQL CITY town hub: fired when the player enters a shop front — host navigates to that cabinet. */
  onEnterShop?: (route: string) => void;
}

/**
 * Base class for a Main Street cabinet. Owns the pixel buffer, the loop, the 16-bit
 * draw kit, audio and input. Subclasses set the logical resolution and implement
 * `update(dt)` (advance the world) + `render()` (paint the buffer with the kit).
 */
export abstract class RetroEngine {
  // logical pixel buffer (the "console" resolution)
  protected LW: number;
  protected LH: number;
  private buf: HTMLCanvasElement;
  /** Buffer draw context — the kit draws here in logical pixels. */
  protected b: CanvasRenderingContext2D;

  // on-screen canvas
  protected cv: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  protected DPR = 1;
  private dispW = 0;
  private dispH = 0;

  // palette
  protected pal = RETRO_PALETTE;

  // fixed-timestep loop
  protected readonly STEP = 1 / 60;
  private acc = 0;
  private last = performance.now();
  protected running = false;
  protected destroyed = false;
  protected timeScale = 1;
  private raf = 0;
  private ro: ResizeObserver | null = null;

  // input
  protected keys = new Set<string>();
  /** Current button state (keyboard + on-screen), read by `update`. */
  protected btn: Record<Btn, boolean> = { up: false, down: false, left: false, right: false, a: false, b: false };
  /** Buttons pressed since the last `update` (edge-triggered taps). */
  protected pressed: Record<Btn, boolean> = { up: false, down: false, left: false, right: false, a: false, b: false };
  /** Pointer in logical buffer coordinates. */
  protected pointer = { x: 0, y: 0, down: false };

  // audio / haptics
  private ac: AudioContext | null = null;
  protected muted = false;
  protected haptics = true;

  // crt + motion
  protected crt = true;
  protected reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private vignette: CanvasGradient | null = null;

  // optional background music (a cabinet attaches a MusicKit); mute + teardown forward to it
  protected music: MusicKit | null = null;
  private gestured = false;

  protected hooks: RetroHooks;
  protected rnd = mulberry32(0x1a2b3c);

  // ---- juice (shared by every cabinet): particles, shards, shockwaves, floating text, shake, hit-stop ----
  protected shake = 0;
  private hitstopT = 0;
  private fxDots: { x: number; y: number; vx: number; vy: number; life: number; decay: number; color: string; size: number; grav: number; shard: boolean; rot: number; vr: number }[] = [];
  private fxTexts: { x: number; y: number; vy: number; life: number; txt: string; color: string; sc: number }[] = [];
  private fxRings: { x: number; y: number; r: number; maxR: number; life: number; color: string }[] = [];

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}, lw = 240, lh = 180) {
    this.cv = canvas;
    const sctx = canvas.getContext("2d");
    if (!sctx) throw new Error("RetroEngine: 2D canvas context unavailable");
    this.sctx = sctx;
    this.LW = lw; this.LH = lh;

    this.buf = document.createElement("canvas");
    this.buf.width = lw; this.buf.height = lh;
    const b = this.buf.getContext("2d");
    if (!b) throw new Error("RetroEngine: 2D buffer context unavailable");
    this.b = b;

    this.hooks = hooks;
    this.muted = hooks.sound === false;
    this.haptics = hooks.haptics !== false;
    if (hooks.crt === false) this.crt = false;

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this.ro.observe(canvas.parentElement);

    this.cv.addEventListener("pointerdown", this.onPointer);
    this.cv.addEventListener("pointermove", this.onPointer);
    this.cv.addEventListener("pointerup", this.onPointerUp);
    this.cv.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("visibilitychange", this.onVisibility);

    this.raf = requestAnimationFrame(this.frame);
  }

  // ---------- lifecycle a subclass implements ----------
  /** Advance the world by a fixed `dt` (called only while running + visible). */
  protected abstract update(dt: number): void;
  /** Paint the buffer with the draw kit. Called every animation frame. */
  protected abstract render(): void;
  /** Optional hook after resize (subclasses caching geometry). */
  protected onResize(): void { /* override */ }
  /** Optional teardown. */
  protected onDestroy(): void { /* override */ }
  /** Optional: react to a fresh run starting / returning to menu. */
  protected onStart(): void { /* override */ }
  protected onMenu(): void { /* override */ }
  /** Fired once, on the first user gesture (audio is unlocked here — a good place to start music). */
  protected onGesture(): void { /* override */ }
  private fireGesture() { if (this.gestured) return; this.gestured = true; this.onGesture(); }

  // ---------- the loop ----------
  private frame = (now: number) => {
    if (this.destroyed) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (!document.hidden) {
      this.acc += clamp(dt, 0, 0.1) * this.timeScale;
      let guard = 0;
      while (this.acc >= this.STEP && guard++ < 5) {
        if (this.hitstopT > 0) { this.hitstopT -= this.STEP; } // freeze frame for punch
        else { if (this.running) this.update(this.STEP); this.updateFx(this.STEP); }
        // clear edge-triggered taps after each simulated step
        this.pressed.up = this.pressed.down = this.pressed.left = this.pressed.right = this.pressed.a = this.pressed.b = false;
        this.acc -= this.STEP;
      }
      this.render();
      this.blit();
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Scale the pixel buffer up to the screen and apply the CRT pass. */
  private blit() {
    const { sctx } = this;
    sctx.imageSmoothingEnabled = false;
    sctx.clearRect(0, 0, this.dispW, this.dispH);
    let ox = 0, oy = 0;
    if (this.shake > 0.2 && !this.reduce) { const s = this.shake * (this.dispW / this.LW); ox = (Math.random() - 0.5) * s; oy = (Math.random() - 0.5) * s; }
    sctx.drawImage(this.buf, 0, 0, this.LW, this.LH, ox, oy, this.dispW, this.dispH);
    if (this.crt && !this.reduce) this.drawCRT();
  }

  private drawCRT() {
    const { sctx, dispW, dispH } = this;
    // scanlines — a dark line every other device-ish row (scaled to the buffer rows)
    sctx.globalAlpha = 0.16;
    sctx.fillStyle = "#000";
    const rows = this.LH;
    const rh = dispH / rows;
    for (let y = 0; y < rows; y += 2) sctx.fillRect(0, y * rh, dispW, Math.max(1, rh * 0.5));
    sctx.globalAlpha = 1;
    // vignette
    if (this.vignette) { sctx.fillStyle = this.vignette; sctx.fillRect(0, 0, dispW, dispH); }
  }

  // ---------- sizing ----------
  protected resize() {
    const host = this.cv.parentElement;
    const availW = host ? host.clientWidth : window.innerWidth;
    const availH = host ? host.clientHeight : window.innerHeight;
    const scale = Math.max(1, Math.min(availW / this.LW, availH / this.LH));
    this.dispW = Math.floor(this.LW * scale);
    this.dispH = Math.floor(this.LH * scale);
    this.DPR = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.floor(this.dispW * this.DPR);
    this.cv.height = Math.floor(this.dispH * this.DPR);
    this.cv.style.width = this.dispW + "px";
    this.cv.style.height = this.dispH + "px";
    this.sctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    this.sctx.imageSmoothingEnabled = false;
    const g = this.sctx.createRadialGradient(this.dispW / 2, this.dispH * 0.45, this.dispH * 0.35, this.dispW / 2, this.dispH / 2, this.dispH * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.45)");
    this.vignette = g;
    this.onResize();
  }

  // ---------- input ----------
  private keyToBtn(code: string): Btn | null {
    switch (code) {
      case "ArrowUp": case "KeyW": return "up";
      case "ArrowDown": case "KeyS": return "down";
      case "ArrowLeft": case "KeyA": return "left";
      case "ArrowRight": case "KeyD": return "right";
      case "Space": case "KeyZ": case "KeyJ": return "a";
      case "KeyX": case "KeyK": return "b";
      default: return null;
    }
  }
  private onKeyDown = (e: KeyboardEvent) => {
    const bt = this.keyToBtn(e.code);
    if (!bt) return;
    e.preventDefault();
    this.resumeAudio(); this.fireGesture();
    if (!this.btn[bt]) this.pressed[bt] = true;
    this.btn[bt] = true;
  };
  private onKeyUp = (e: KeyboardEvent) => {
    const bt = this.keyToBtn(e.code);
    if (bt) this.btn[bt] = false;
  };
  /** On-screen control press (two-thumb d-pad + action buttons drive these). */
  press(bt: Btn) { this.resumeAudio(); this.fireGesture(); if (!this.btn[bt]) this.pressed[bt] = true; this.btn[bt] = true; }
  release(bt: Btn) { this.btn[bt] = false; }

  private onPointer = (e: PointerEvent) => {
    const r = this.cv.getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * this.LW;
    this.pointer.y = ((e.clientY - r.top) / r.height) * this.LH;
    if (e.type === "pointerdown") { this.pointer.down = true; this.resumeAudio(); this.fireGesture(); }
  };
  private onPointerUp = () => { this.pointer.down = false; };
  private onVisibility = () => { if (!document.hidden) this.last = performance.now(); };

  // ---------- the 16-bit draw kit (operates on the buffer, in logical pixels) ----------
  private col(c: string | number): string { return typeof c === "number" ? this.pal[((c % 16) + 16) % 16] : c; }
  protected cls(c: string | number = 0) { this.b.fillStyle = this.col(c); this.b.fillRect(0, 0, this.LW, this.LH); }
  protected px(x: number, y: number, c: string | number) { if (x < 0 || y < 0 || x >= this.LW || y >= this.LH) return; this.b.fillStyle = this.col(c); this.b.fillRect(x | 0, y | 0, 1, 1); }
  protected rect(x: number, y: number, w: number, h: number, c: string | number) { this.b.fillStyle = this.col(c); this.b.fillRect(x | 0, y | 0, w, h); }
  protected rectLine(x: number, y: number, w: number, h: number, c: string | number) { this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c); this.rect(x, y, 1, h, c); this.rect(x + w - 1, y, 1, h, c); }
  /** Vertical gradient block — the sky/backdrop workhorse. */
  protected vgrad(x: number, y: number, w: number, h: number, c1: string, c2: string) { for (let j = 0; j < h; j++) this.rect(x, y + j, w, 1, mix(c1, c2, h <= 1 ? 0 : j / (h - 1))); }
  /** A shaded surface: light top edge, body, dark bottom edge. */
  protected shelf(x: number, y: number, w: number, h: number, base: string) { this.rect(x, y, w, 1, shade(base, 0.4)); this.rect(x, y + 1, w, Math.max(0, h - 2), base); this.rect(x, y + h - 1, w, 1, shade(base, -0.4)); }
  protected disc(cx: number, cy: number, r: number, c: string | number) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) this.px(cx + x, cy + y, c); }
  protected ring(cx: number, cy: number, r: number, c: string | number, th = 1.6) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y; if (d <= r * r && d > (r - th) * (r - th)) this.px(cx + x, cy + y, c); } }
  /** A spherically-lit ball — the signature round hero of every cabinet. */
  protected ball(cx: number, cy: number, r: number, base: string) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y; if (d2 > r * r) continue;
      const lx = x + r * 0.42, ly = y + r * 0.42, dl = Math.sqrt(lx * lx + ly * ly) / (r * 1.7);
      let c = dl < 0.32 ? shade(base, 0.55) : dl < 0.62 ? shade(base, 0.2) : dl < 0.85 ? base : shade(base, -0.3);
      if (d2 > (r - 1) * (r - 1)) c = shade(base, -0.55);
      this.px(cx + x, cy + y, c);
    }
    this.px(cx - Math.round(r * 0.38), cy - Math.round(r * 0.38), "#ffffff");
  }
  protected line(x0: number, y0: number, x1: number, y1: number, c: string | number) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (; ;) { this.px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  /** Pixel-font text at scale `sc` (font pixel = sc buffer pixels), optional drop shadow. */
  protected text(x: number, y: number, str: string, c: string | number, sc = 1, shadow = true) {
    let cx = x;
    for (const chRaw of str.toUpperCase()) {
      const g = FONT[chRaw] || FONT[" "];
      for (let r = 0; r < FONT_H; r++) for (let col = 0; col < FONT_W; col++) if (g[r][col] === "#") {
        if (shadow) this.rect(cx + col * sc + 1, y + r * sc + 1, sc, sc, "#00000090");
        this.rect(cx + col * sc, y + r * sc, sc, sc, c);
      }
      cx += GLYPH_ADVANCE * sc;
    }
  }
  /** Width in buffer pixels a string will occupy at scale `sc`. */
  protected textWidth(str: string, sc = 1) { return str.length * GLYPH_ADVANCE * sc - sc; }
  protected textCenter(y: number, str: string, c: string | number, sc = 1, shadow = true) { this.text(Math.round((this.LW - this.textWidth(str, sc)) / 2), y, str, c, sc, shadow); }

  /** Draw the player's toy avatar (the cabinet hero) with feet centred at (x, y). */
  protected avatar(x: number, y: number, cfg: AvatarConfig) {
    paintAvatar({
      px: (a, b, c) => this.px(a, b, c),
      rect: (a, b, w, h, c) => this.rect(a, b, w, h, c),
      disc: (cx, cy, r, c) => this.disc(cx, cy, r, c),
      ball: (cx, cy, r, base) => this.ball(cx, cy, r, base),
      shade: (c, amt) => shade(c, amt),
    }, x, y, cfg);
  }

  // ---- juice API (call from a cabinet's update/render) ----
  /** Kick the screen (additive, auto-decays). */
  protected addShake(a: number) { this.shake = Math.min(7, this.shake + a); }
  /** Freeze the sim for `t` seconds — a punchy hit-stop on impacts. */
  protected hitstop(t: number) { this.hitstopT = Math.max(this.hitstopT, t); }
  /** A radial spray of dots. */
  protected fxBurst(x: number, y: number, color: string, n: number, spd: number, grav = 60) {
    if (this.reduce) n = Math.min(n, 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.4 + Math.random()); this.fxDots.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, decay: 1.6 + Math.random(), color, size: 1, grav, shard: false, rot: 0, vr: 0 }); }
  }
  /** Tumbling shards (glass/ceramic break). */
  protected fxShards(x: number, y: number, color: string, n = 6) {
    if (this.reduce) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 60 + Math.random() * 90; this.fxDots.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: 1, decay: 1.1, color, size: 2, grav: 200, shard: true, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 14 }); }
  }
  /** A rising, fading label (score pops, callouts). */
  protected fxPop(x: number, y: number, txt: string, color: string, sc = 1) { this.fxTexts.push({ x, y, vy: -14, life: 1, txt, color, sc }); }
  /** An expanding shockwave ring. */
  protected fxRing(x: number, y: number, color: string, maxR: number) { if (!this.reduce) this.fxRings.push({ x, y, r: 2, maxR, life: 1, color }); }
  protected clearFx() { this.fxDots = []; this.fxTexts = []; this.fxRings = []; this.shake = 0; }

  protected updateFx(dt: number) {
    this.shake = this.shake > 0.2 ? this.shake * Math.pow(0.0025, dt) : 0;
    for (const p of this.fxDots) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; p.vx *= 0.92; p.life -= p.decay * dt; p.rot += p.vr * dt; }
    this.fxDots = this.fxDots.filter((p) => p.life > 0);
    for (const t of this.fxTexts) { t.y += t.vy * dt; t.life -= dt * 1.2; }
    this.fxTexts = this.fxTexts.filter((t) => t.life > 0);
    for (const r of this.fxRings) { r.life -= dt * 2.2; r.r += (r.maxR - r.r) * Math.min(1, dt * 6); }
    this.fxRings = this.fxRings.filter((r) => r.life > 0);
  }
  /** Paint the juice layer onto the buffer — call in `render()` (usually before menu/over overlays). */
  protected drawFx() {
    for (const r of this.fxRings) { this.b.globalAlpha = Math.max(0, r.life) * 0.7; this.ring(r.x | 0, r.y | 0, r.r | 0, r.color, 1.6); }
    this.b.globalAlpha = 1;
    for (const p of this.fxDots) {
      this.b.globalAlpha = Math.max(0, Math.min(1, p.life));
      if (p.shard) { const c = Math.cos(p.rot) * 2, s = Math.sin(p.rot) * 2; this.line((p.x - c) | 0, (p.y - s) | 0, (p.x + c) | 0, (p.y + s) | 0, p.color); }
      else this.rect(p.x | 0, p.y | 0, p.size, p.size, p.color);
    }
    this.b.globalAlpha = 1;
    for (const t of this.fxTexts) { const c = t.life < 0.35 ? "#8a8276" : t.color; this.b.globalAlpha = Math.max(0, Math.min(1, t.life * 1.4)); this.text(Math.round(t.x - this.textWidth(t.txt, t.sc) / 2), Math.round(t.y), t.txt, c, t.sc, false); }
    this.b.globalAlpha = 1;
  }

  // ---------- audio (chiptune primitives; MusicKit will build on these) ----------
  private resumeAudio() { try { if (this.ac?.state === "suspended") this.ac.resume(); } catch { /* ignore */ } }
  private actx(): AudioContext | null {
    if (this.muted) return null;
    try { if (!this.ac) this.ac = new (window.AudioContext || (window as any).webkitAudioContext)(); if (this.ac.state === "suspended") this.ac.resume(); return this.ac; } catch { return null; }
  }
  /** A short tone. `square` reads most 8/16-bit; `triangle` for bass/leads. */
  protected tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.05) {
    const ac = this.actx(); if (!ac) return;
    try {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
      const t = ac.currentTime;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch { /* best-effort */ }
  }
  /** A noise burst — the drum/impact channel. */
  protected noise(dur = 0.08, gain = 0.05) {
    const ac = this.actx(); if (!ac) return;
    try {
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource(), g = ac.createGain();
      src.buffer = buf; src.connect(g); g.connect(ac.destination);
      g.gain.value = gain; src.start();
    } catch { /* best-effort */ }
  }
  protected buzz(p: number | number[]) { if (this.haptics && !this.muted) { try { navigator.vibrate?.(p); } catch { /* ignore */ } } }

  // ---------- host-facing controls (shell-compatible) ----------
  start() { this.running = true; this.acc = 0; this.last = performance.now(); this.onStart(); }
  toMenu() { this.running = false; this.onMenu(); }
  setMuted(m: boolean) { this.muted = m; this.music?.setMuted(m); }
  setHaptics(h: boolean) { this.haptics = h; }
  setTimeScale(s: number) { this.timeScale = clamp(s, 0.25, 3); }
  setCRT(on: boolean) { this.crt = on; }
  isMuted() { return this.muted; }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.cv.removeEventListener("pointerdown", this.onPointer);
    this.cv.removeEventListener("pointermove", this.onPointer);
    this.cv.removeEventListener("pointerup", this.onPointerUp);
    this.cv.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.onDestroy();
    this.music?.dispose();
    try { this.ac?.close(); } catch { /* ignore */ }
    this.ac = null;
  }
}
