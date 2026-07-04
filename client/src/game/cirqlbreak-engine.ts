// Cirqlbreak — core game engine (framework-agnostic).
//
// A circular Breakout roguelike: rally the spark around a rim paddle, shatter the
// concentric rings, then out-time the boss core and restore a dead world. Ported
// faithfully from the validated prototype (Artifact v10) — same physics, boss,
// relics, Pulse, Supernova, restoration music, english + catch, and 4 modes
// (Journey / Daily / Freestyle / Party co-op).
//
// This module owns ONLY a <canvas>: the game loop, canvas/keyboard input, audio
// and haptics. All chrome (menu, HUD, relic pick, end screen, buttons) is the
// host's job — the engine reports HUD state via `onHud` (emitted only when values
// change, so React doesn't re-render every frame) and surfaces flow moments via
// discrete callbacks (`onRelicOffer`, `onWorldRestored`, `onRunEnd`). The host
// drives it with `start()` and the action methods (`firePulse` / `fireSuper` /
// `releaseStuck`). No DOM is touched outside the canvas.
//
// Reward bridge (CHR-115/116) plugs in through `grantEnergy` / `grantPowerup`:
// real partner taps charge the Supernova and drop power-ups.

export type CirqlbreakMode = "journey" | "daily" | "freestyle" | "party";
export type Difficulty = "easy" | "medium" | "hard";
export type PowerupType = "multi" | "wide" | "life" | "slow" | "catch";
export type RelicId = "twin" | "broad" | "lucky" | "phoenix" | "bulwark" | "seeker" | "rich" | "spin";
type FlowState = "menu" | "intro" | "playing" | "clear" | "relics" | "over";

export interface HudState {
  mode: CirqlbreakMode;
  score: number;
  world: number;
  worldName: string;
  dailyNum: number;
  lives: number;
  combo: number;
  pulseReady: boolean;
  superCharge: number; // 0..1
  sticky: number;
  streak: number;
}

export interface RunResult {
  mode: CirqlbreakMode;
  restored: boolean; // true = cleared (a win end), false = ran out of lives
  score: number;
  comboMax: number;
  world: number;
  dailyNum: number;
  streak: number;
}

export interface WorldRestoredInfo {
  mode: CirqlbreakMode;
  world: number;
  worldName: string;
  score: number;
  comboMax: number;
  noBallLost: boolean; // for "perfect" achievements
}

export interface CirqlbreakSettings {
  sound: boolean;
  haptics: boolean;
}

export interface StartOptions {
  diff?: Difficulty;   // freestyle
  spd?: number;        // freestyle ball-speed multiplier
  chaos?: boolean;     // freestyle modifiers on/off
}

export interface EngineOpts extends Partial<CirqlbreakSettings> {
  /** HUD values — fired only when they change. */
  onHud?: (s: HudState) => void;
  /** Journey world cleared → host shows a relic card and calls `pick`. */
  onRelicOffer?: (options: RelicId[], pick: (id: RelicId) => void) => void;
  /** A world was fully restored (maps to POST /api/game/restored). */
  onWorldRestored?: (info: WorldRestoredInfo) => void;
  /** The run ended (out of lives, or Daily cleared). */
  onRunEnd?: (result: RunResult) => void;
}

// ---------- catalogs (parity with the prototype) ----------
const TAU = Math.PI * 2;

const DIFF: Record<Difficulty, { speed: number; span: number; lives: number; drop: number; ramp: number }> = {
  easy: { speed: 0.72, span: 1.18, lives: 5, drop: 0.26, ramp: 0.01 },
  medium: { speed: 1.0, span: 0.86, lives: 3, drop: 0.2, ramp: 0.016 },
  hard: { speed: 1.34, span: 0.6, lives: 2, drop: 0.16, ramp: 0.024 },
};
const RING_COLORS = ["#34d399", "#38bdf8", "#a78bfa", "#fb7185", "#fbbf24", "#22d3ee"];
const PU: Record<PowerupType, { c: string; g: string }> = {
  multi: { c: "#22d3ee", g: "✦" }, wide: { c: "#a78bfa", g: "▬" }, life: { c: "#ec4899", g: "♥" },
  slow: { c: "#38bdf8", g: "◷" }, catch: { c: "#fbbf24", g: "◎" },
};
const MODS: Record<string, { n: string; c: string }> = {
  gravity: { n: "Gravity Well", c: "#a78bfa" }, orbit: { n: "Orbiting Rings", c: "#38bdf8" },
  volatile: { n: "Volatile Bricks", c: "#fb7185" }, reinforced: { n: "Reinforced", c: "#67e8f9" },
};
export const RELICS: Record<RelicId, { n: string; d: string; i: string }> = {
  twin: { n: "Twin Spark", d: "Begin every world with an extra ball.", i: "✦" },
  broad: { n: "Broad Guard", d: "+26% paddle width.", i: "▬" },
  lucky: { n: "Fortune’s Drop", d: "+60% power-up drops.", i: "◈" },
  phoenix: { n: "Phoenix", d: "Once per world, a lost ball returns free.", i: "♁" },
  bulwark: { n: "Bulwark", d: "+2 lives, right now.", i: "♥" },
  seeker: { n: "Core Seeker", d: "Cores need one less hit.", i: "◎" },
  rich: { n: "Golden Touch", d: "+50% score.", i: "★" },
  spin: { n: "Spin Master", d: "Much stronger paddle english.", i: "↻" },
};
const RELIC_IDS = Object.keys(RELICS) as RelicId[];
const ADJ = ["Ashen", "Verdant", "Frozen", "Astral", "Gilded", "Twilight", "Crimson", "Azure", "Lunar", "Solar", "Dormant", "Echoing", "Radiant", "Silent"];
const NOUN = ["Halo", "Spiral", "Reach", "Hollow", "Expanse", "Drift", "Bloom", "Veil", "Basin", "Crown", "Cascade", "Verge", "Meridian", "Nexus"];
const DAILY_EPOCH = Math.floor(Date.parse("2026-01-01T00:00:00Z") / 86400000);
// Restoration music — a C-major pentatonic ladder (combo climbs it; ring-clears chord).
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const norm = (a: number) => { a %= TAU; if (a < -Math.PI) a += TAU; if (a > Math.PI) a -= TAU; return a; };
const angDiff = (a: number, b: number) => Math.abs(norm(a - b));
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

// safe localStorage (best score / streak persist standalone; server persistence is CHR-113)
const LS = {
  get: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } },
};

// ---------- entities ----------
interface Paddle { ang: number; target: number; span: number; baseSpan: number; angVel: number; _prev: number | null; }
interface Ball { x: number; y: number; vx: number; vy: number; pr: number; dead: boolean; trail: { x: number; y: number }[]; stuck?: boolean; pad?: Paddle; stuckOff?: number; stuckAt?: number; }
interface Brick { radius: number; a0: number; a1: number; mid: number; drift: number; hp: number; maxHp: number; vol: boolean; ring: number; color: string; flash: number; alive: boolean; }
interface Pup { x: number; y: number; type: PowerupType; dead?: boolean; }
interface Part { x: number; y: number; vx: number; vy: number; life: number; color: string; }
interface Frag { x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; color: string; len: number; }
interface Pop { x: number; y: number; txt: string; color: string; life: number; }
interface Shock { x: number; y: number; r: number; maxR: number; life: number; color: string; }
interface CoreT { hp: number; maxHp: number; r: number; shield: number; awake: number; shieldAng: number; shieldSpan: number; shieldRot: number; flash: number; pulse: number; inv: number; }
interface WorldCfg { index: number; rings: number; coreHp: number; mods: string[]; palette: string[]; baseHue: number; name: string; }

export class CirqlbreakEngine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private opts: EngineOpts;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // geometry
  private W = 600; private H = 600; private cx = 300; private cy = 300; private DPR = 1; private rimR = 270;

  // flow / config
  private state: FlowState = "menu";
  private mode: CirqlbreakMode = "journey";
  private diff: Difficulty = "medium";
  private spd = 1; private chaos = true;
  private rng: () => number = Math.random;

  // run state
  private score = 0; private combo = 0; private comboMax = 0; private lives = 3;
  private world = 1; private worldName = ""; private mods: string[] = [];
  private dailyNum = 0; private streak = 0;
  private relics: RelicId[] = []; private scoreMult = 1; private engMult = 1; private reviveLeft = 0;
  private pulseReady = 0; private superCharge = 0; private sticky = 0; private noBallLost = true;

  // entities
  private balls: Ball[] = []; private bricks: Brick[] = []; private pups: Pup[] = [];
  private parts: Part[] = []; private frags: Frag[] = []; private pops: Pop[] = []; private shocks: Shock[] = [];
  private core: CoreT | null = null;
  private paddle: Paddle = { ang: -Math.PI / 2, target: -Math.PI / 2, span: 0.86, baseSpan: 0.86, angVel: 0, _prev: null };
  private p2: Paddle = { ang: Math.PI / 2, target: Math.PI / 2, span: 0.7, baseSpan: 0.7, angVel: 0, _prev: null };

  // physics / timing
  private baseSpeed = 400; private timeScale = 1; private slowUntil = 0; private wideUntil = 0;
  private shake = 0; private bloom = 0; private comboGlow = 0;
  private launchAt = 0; private stateUntil = 0;
  private tune = { speed: 1, span: 0.86, ramp: 0.016, drop: 0.2 };

  // reward-bridge inputs (applied at next world if not mid-run)
  private pendingPups: PowerupType[] = [];

  // audio / haptics
  private ac: AudioContext | null = null; private muted = false; private haptics = true;

  // loop / listeners
  private raf = 0; private last = performance.now(); private lastHud = ""; private ro: ResizeObserver | null = null; private destroyed = false;

  constructor(canvas: HTMLCanvasElement, opts: EngineOpts = {}) {
    this.cv = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cirqlbreak: 2D canvas context unavailable");
    this.ctx = ctx;
    this.opts = opts;
    this.muted = opts.sound === false;
    this.haptics = opts.haptics !== false;

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this.ro.observe(canvas.parentElement);

    this.cv.addEventListener("pointermove", this.onPointer);
    this.cv.addEventListener("pointerdown", this.onPointer);
    this.cv.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("keydown", this.onKey);

    this.raf = requestAnimationFrame(this.frame);
  }

  // ---------- public API ----------
  start(mode: CirqlbreakMode, o: StartOptions = {}) {
    this.mode = mode;
    if (o.diff) this.diff = o.diff;
    if (o.spd != null) this.spd = o.spd;
    if (o.chaos != null) this.chaos = o.chaos;
    this.score = 0; this.combo = 0; this.comboMax = 0; this.world = 1;
    this.timeScale = 1; this.slowUntil = 0; this.wideUntil = 0; this.bloom = 0; this.sticky = 0;
    this.paddle.angVel = 0; this.paddle._prev = null;
    this.relics = []; this.scoreMult = 1; this.engMult = 1; this.reviveLeft = 0; this.pulseReady = 0; this.superCharge = 0;
    this.pendingPups = [];

    if (mode === "daily") {
      const day = Math.floor(Date.now() / 86400000);
      this.dailyNum = day - DAILY_EPOCH + 1;
      this.rng = mulberry32((day * 2654435761) >>> 0);
      this.lives = DIFF.medium.lives;
      this.streak = this.bumpStreak();
    } else if (mode === "journey") {
      this.rng = Math.random; this.lives = 3;
    } else if (mode === "party") {
      this.rng = Math.random; this.lives = 4; this.p2.angVel = 0; this.p2._prev = null;
    } else {
      this.rng = Math.random; this.lives = DIFF[this.diff].lives;
    }
    this.buildWorld(this.makeWorld(1));
    this.state = "intro";
    this.stateUntil = performance.now() + 1700;
    this.emitHud();
  }

  firePulse() {
    if (this.state !== "playing") return;
    const now = performance.now();
    if (now < this.pulseReady) return;
    this.pulseReady = now + 4500;
    const { cx, cy, rimR } = this;
    const px = cx + Math.cos(this.paddle.ang) * rimR, py = cy + Math.sin(this.paddle.ang) * rimR;
    for (const b of this.balls) {
      if (b.dead || b.stuck) continue;
      const dx = b.x - px, dy = b.y - py, dl = Math.hypot(dx, dy) || 1, sp = Math.hypot(b.vx, b.vy) || this.baseSpeed;
      const nx = b.vx * 0.2 + (dx / dl) * sp * 0.95, ny = b.vy * 0.2 + (dy / dl) * sp * 0.95, nl = Math.hypot(nx, ny) || 1;
      b.vx = (nx / nl) * sp; b.vy = (ny / nl) * sp;
    }
    this.shock(px, py, "#22d3ee", rimR * 0.95); this.shake = Math.max(this.shake, 9);
    this.tone(170, 0.22, "sawtooth", 0.05); this.buzz(24);
  }

  // Partner Power — a supernova that shatters every ring at once and wakes the core.
  fireSuper() {
    if (this.state !== "playing" || this.superCharge < 1 || !this.core) return;
    this.superCharge = 0;
    let n = 0;
    for (const b of this.bricks) {
      if (!b.alive) continue;
      b.alive = false; n++;
      const bx = this.cx + Math.cos(b.mid) * b.radius, by = this.cy + Math.sin(b.mid) * b.radius;
      this.burst(bx, by, b.color, 6, this.baseSpeed * 0.6); this.frag(bx, by, b.color);
    }
    this.score += Math.round(n * 15 * this.scoreMult);
    if (this.core.shield) { this.core.shield = 0; this.core.awake = 1; this.core.inv = 500; this.core.flash = 1; }
    else if (this.core.hp > 0) { this.core.hp = Math.max(1, this.core.hp - 2); this.core.flash = 1; }
    this.shock(this.cx, this.cy, "#fbbf24", this.rimR * 1.7); this.shake = Math.max(this.shake, 16); this.bloom = Math.max(this.bloom, 0.6);
    [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.6, "sine", 0.05), i * 55));
    this.buzz([30, 50, 30, 50]); this.pop(this.cx, this.cy, "SUPERNOVA", "#fbbf24");
  }

  releaseStuck() { for (const b of this.balls) if (b.stuck) this.releaseBall(b); }

  /** Reward bridge: real taps charge the Supernova (0..1 units). */
  grantEnergy(amount: number) { this.superCharge = clamp(this.superCharge + amount, 0, 1); this.emitHud(); }
  /** Reward bridge: real taps drop a power-up (applied now if playing, else next world). */
  grantPowerup(type: PowerupType) {
    if (this.state === "playing" && this.core) this.applyPU(type);
    else this.pendingPups.push(type);
  }

  setMuted(m: boolean) { this.muted = m; }
  setHaptics(h: boolean) { this.haptics = h; }
  isMuted() { return this.muted; }
  /** Return to the menu (host shows its own menu overlay). */
  toMenu() { this.state = "menu"; this.core = null; }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.cv.removeEventListener("pointermove", this.onPointer);
    this.cv.removeEventListener("pointerdown", this.onPointer);
    this.cv.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("keydown", this.onKey);
    try { this.ac?.close(); } catch { /* ignore */ }
    this.ac = null;
  }

  // ---------- persistence read-through (for the menu; server-backed in CHR-113) ----------
  journeyBest() { return { score: +(LS.get("cirql_jbest") || 0), world: +(LS.get("cirql_jworld") || 0) }; }
  peekStreak() {
    const today = Math.floor(Date.now() / 86400000);
    let s: { last: number; n: number } | null = null;
    try { s = JSON.parse(LS.get("cirql_streak") || "null"); } catch { /* ignore */ }
    if (!s) return 0;
    return s.last === today || s.last === today - 1 ? s.n : 0;
  }
  dailyNumber() { return Math.floor(Date.now() / 86400000) - DAILY_EPOCH + 1; }

  // ---------- audio ----------
  private tone(f: number, d: number, type: OscillatorType = "triangle", g = 0.045) {
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
  private buzz(p: number | number[]) { if (this.haptics && !this.muted) { try { navigator.vibrate?.(p); } catch { /* ignore */ } } }
  private sBrick(nn: number) { const f = SCALE[Math.min(nn - 1, SCALE.length - 1)] || SCALE[0]; this.tone(f, 0.12, "triangle", 0.042); this.tone(f * 2.01, 0.09, "sine", 0.016); this.buzz(8); }
  private ringChord(ri: number) { const root = SCALE[Math.min(ri * 2, SCALE.length - 5)]; [root, root * 1.26, root * 1.5].forEach((f, i) => setTimeout(() => this.tone(f, 0.55, "sine", 0.032), i * 45)); }
  private sPad() { this.tone(196, 0.09, "sine", 0.05); }
  private sCore() { this.tone(150, 0.22, "sawtooth", 0.055); this.buzz([14, 30, 14]); }
  private sClank() { this.tone(240, 0.06, "square", 0.03); }
  private sPow() { [523, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, "sine", 0.05), i * 70)); this.buzz([10, 40, 10]); }
  private sLife() { this.tone(110, 0.4, "sawtooth", 0.06); this.buzz([30, 60, 30, 60, 60]); }
  private sWin() { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.7, "sine", 0.05), i * 110)); this.buzz([20, 40, 20, 40, 60]); }

  // ---------- geometry ----------
  private resize() {
    const host = this.cv.parentElement;
    const avail = host ? Math.min(host.clientWidth, host.clientHeight) : Math.min(innerWidth, innerHeight);
    const size = Math.max(280, Math.min((avail || 600) * 0.98, 680));
    this.DPR = Math.min(devicePixelRatio || 1, 2.5);
    this.W = size; this.H = size; this.cx = size / 2; this.cy = size / 2; this.rimR = size * 0.46;
    this.cv.width = size * this.DPR; this.cv.height = size * this.DPR;
    this.cv.style.width = size + "px"; this.cv.style.height = size + "px";
    this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
  }

  // ---------- fx spawners ----------
  private burst(x: number, y: number, color: string, n: number, spd: number) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = spd * (0.4 + Math.random()); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color }); } }
  private frag(x: number, y: number, color: string) { if (this.reduce) return; for (let i = 0; i < 4; i++) { const a = Math.random() * TAU, s = this.baseSpeed * (0.3 + Math.random() * 0.5); this.frags.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, life: 1, color, len: 5 + Math.random() * 7 }); } }
  private pop(x: number, y: number, txt: string, color: string) { this.pops.push({ x, y, txt, color, life: 1 }); }
  private shock(x: number, y: number, color: string, maxR: number) { if (!this.reduce) this.shocks.push({ x, y, r: 4, maxR, life: 1, color }); }

  // ---------- tuning / streak ----------
  private journeyTune(world: number) {
    const t = world - 1;
    return { speed: 0.68 + Math.min(0.72, t * 0.035), span: 1.18 - Math.min(0.58, t * 0.03), ramp: 0.012 + Math.min(0.013, t * 0.001), drop: 0.24 - Math.min(0.1, t * 0.006) };
  }
  private bumpStreak() {
    const today = Math.floor(Date.now() / 86400000);
    let s: { last: number; n: number } | null = null;
    try { s = JSON.parse(LS.get("cirql_streak") || "null"); } catch { /* ignore */ }
    s = s || { last: -999, n: 0 };
    if (s.last !== today) { s.n = s.last === today - 1 ? s.n + 1 : 1; s.last = today; LS.set("cirql_streak", JSON.stringify(s)); }
    return s.n;
  }
  private rc(id: RelicId) { return this.relics.filter((x) => x === id).length; }

  // ---------- world generation ----------
  private makeWorld(index: number): WorldCfg {
    const rng = this.rng;
    const rings = clamp(3 + Math.floor(index / 2), 3, 6);
    const coreHp = 3 + Math.floor(index / 2);
    const pool = ["gravity", "orbit", "volatile", "reinforced"];
    const modCount = Math.min(2, Math.max(0, Math.floor((index - 1) / 2)));
    const mods: string[] = []; const bag = pool.slice();
    for (let i = 0; i < modCount; i++) { const j = Math.floor(rng() * bag.length); mods.push(bag.splice(j, 1)[0]); }
    const baseHue = index % RING_COLORS.length;
    return { index, rings, coreHp, mods, palette: RING_COLORS, baseHue, name: ADJ[Math.floor(rng() * ADJ.length)] + " " + NOUN[Math.floor(rng() * NOUN.length)] };
  }
  private buildWorld(cfg: WorldCfg) {
    const rng = this.rng;
    let tune: typeof this.tune;
    if (this.mode === "journey") tune = this.journeyTune(cfg.index);
    else if (this.mode === "daily") tune = { speed: 0.95, span: 0.88, ramp: 0.015, drop: 0.2 };
    else if (this.mode === "party") tune = { speed: 0.86, span: 0.68, ramp: 0.012, drop: 0.26 };
    else { const d = DIFF[this.diff]; tune = { speed: d.speed * this.spd, span: d.span, ramp: d.ramp, drop: d.drop }; }
    // relic effects (Journey build)
    tune.span *= 1 + 0.26 * this.rc("broad"); tune.drop = Math.min(0.7, tune.drop * (1 + 0.6 * this.rc("lucky")));
    this.scoreMult = 1 + 0.5 * this.rc("rich"); this.engMult = 1 + 0.35 * this.rc("spin"); this.reviveLeft = this.rc("phoenix");
    this.tune = tune;
    this.bricks = []; this.pups = []; this.parts = []; this.frags = []; this.pops = []; this.shocks = [];
    this.noBallLost = true;
    this.paddle.baseSpan = tune.span; this.paddle.span = tune.span;
    if (this.mode === "party") { this.p2.baseSpan = tune.span; this.p2.span = tune.span; this.paddle.ang = this.paddle.target = -Math.PI / 2; this.p2.ang = this.p2.target = Math.PI / 2; this.paddle._prev = null; this.p2._prev = null; }
    const useMods = this.mode === "freestyle" && !this.chaos ? [] : cfg.mods.slice();
    this.mods = useMods; this.worldName = cfg.name;
    const orbit = useMods.includes("orbit"), volatile = useMods.includes("volatile"), reinforced = useMods.includes("reinforced");
    const inner = this.rimR * 0.3, outer = this.rimR * 0.82, rings = cfg.rings, step = (outer - inner) / (rings - 1 || 1);
    for (let ri = 0; ri < rings; ri++) {
      const radius = inner + ri * step, seg = 8 + ri * 2 + (this.diff === "hard" ? 2 : 0), gutter = 0.12;
      const drift = orbit ? (ri % 2 ? 1 : -1) * (0.2 + ri * 0.05) : 0;
      let hp = ri >= rings - 1 ? 2 : 1; if (reinforced && rng() < 0.35) hp = 2;
      for (let k = 0; k < seg; k++) {
        if (rng() < 0.12) continue;
        const a0 = (k / seg) * TAU + gutter / 2, a1 = ((k + 1) / seg) * TAU - gutter / 2;
        const vol = volatile && rng() < 0.22;
        this.bricks.push({ radius, a0, a1, mid: (a0 + a1) / 2, drift, hp, maxHp: hp, vol, ring: ri, color: vol ? "#fb7185" : cfg.palette[(cfg.baseHue + ri) % RING_COLORS.length], flash: 0, alive: true });
      }
    }
    const chp = Math.max(2, cfg.coreHp - this.rc("seeker"));
    this.core = { hp: chp, maxHp: chp, r: this.rimR * 0.15, shield: 1, awake: 0, shieldAng: rng() * TAU, shieldSpan: 1.7, shieldRot: 1.4, flash: 0, pulse: 0, inv: 0 };
    this.baseSpeed = this.rimR * 3.0 * tune.speed;
    this.balls = []; this.spawnBall();
    for (let i = 0; i < this.rc("twin"); i++) this.spawnBall(this.paddle.ang + (i + 1) * 0.6);
    // drop any tap-granted power-ups banked while off the board
    if (this.pendingPups.length) { const q = this.pendingPups; this.pendingPups = []; for (const t of q) this.applyPU(t); }
  }
  private spawnBall(fromAng?: number) {
    const a = fromAng != null ? fromAng : this.paddle.ang, r = this.rimR * 0.62, dir = a + Math.PI + (Math.random() - 0.5);
    this.balls.push({ x: this.cx + Math.cos(a) * r, y: this.cy + Math.sin(a) * r, vx: Math.cos(dir) * this.baseSpeed, vy: Math.sin(dir) * this.baseSpeed, pr: r, dead: false, trail: [] });
    this.launchAt = performance.now() + 500;
  }

  // ---------- input ----------
  private aim(e: PointerEvent) { const r = this.cv.getBoundingClientRect(); const px = e.clientX - r.left - this.W / 2, py = e.clientY - r.top - this.H / 2; this.paddle.target = Math.atan2(py, px); }
  // Party: top half of the screen aims P1, bottom half aims P2 (two thumbs). Clamped in update().
  private aimParty(e: PointerEvent) { const r = this.cv.getBoundingClientRect(); const mx = e.clientX - r.left - this.W / 2, my = e.clientY - r.top - this.H / 2; const a = Math.atan2(my, mx); if (my < 0) this.paddle.target = a; else this.p2.target = a; }
  private onPointer = (e: PointerEvent) => { if (this.state === "playing") (this.mode === "party" ? this.aimParty(e) : this.aim(e)); };
  private onPointerUp = () => { if (this.state === "playing") this.releaseStuck(); };
  private onKey = (e: KeyboardEvent) => {
    if (this.state !== "playing") return;
    if (this.mode === "party") {
      if (e.key === "a" || e.key === "A") this.paddle.target -= 0.22;
      if (e.key === "d" || e.key === "D") this.paddle.target += 0.22;
      if (e.key === "ArrowLeft") this.p2.target -= 0.22;
      if (e.key === "ArrowRight") this.p2.target += 0.22;
    } else {
      if (e.key === "ArrowLeft") this.paddle.target -= 0.2;
      if (e.key === "ArrowRight") this.paddle.target += 0.2;
    }
    if (e.key === " ") { this.releaseStuck(); e.preventDefault(); }
    if (e.key === "e" || e.key === "E") this.firePulse();
    if (e.key === "q" || e.key === "Q") this.fireSuper();
  };

  private applyPU(t: PowerupType) {
    this.sPow();
    if (t === "multi") { const cur = this.balls.slice(0, 3); cur.forEach((b) => { for (let i = 0; i < 2 && this.balls.length < 8; i++) { const sp = Math.hypot(b.vx, b.vy) || this.baseSpeed, a = Math.atan2(b.vy, b.vx) + (i ? 0.5 : -0.5); this.balls.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, pr: Math.hypot(b.x - this.cx, b.y - this.cy), dead: false, trail: [] }); } }); }
    if (t === "wide") { this.wideUntil = performance.now() + 11000; this.paddle.span = this.paddle.baseSpan * 1.55; }
    if (t === "life") { this.lives++; this.sLife(); }
    if (t === "slow") { this.slowUntil = performance.now() + 6000; }
    if (t === "catch") { this.sticky += 3; }
    this.pop(this.cx, this.cy - this.rimR * 0.32, t === "catch" ? "CATCH ×3" : t.toUpperCase(), PU[t].c);
  }
  // Launch a stuck ball inward, with english from where it sits + the paddle's sweep.
  private releaseBall(ball: Ball) {
    const pad = ball.pad || this.paddle;
    const ra = pad.ang + (ball.stuckOff || 0), ux = Math.cos(ra), uy = Math.sin(ra), tx = -uy, ty = ux;
    const off = clamp((ball.stuckOff || 0) / (pad.span / 2), -1, 1);
    const motion = clamp((pad.angVel * this.rimR) / (this.baseSpeed || 1), -1.2, 1.2);
    const eng = clamp((off * 1.1 + motion * 0.9) * this.engMult, -1.95, 1.95);
    const nx = -ux + tx * eng, ny = -uy + ty * eng, nl = Math.hypot(nx, ny) || 1;
    ball.vx = (nx / nl) * this.baseSpeed; ball.vy = (ny / nl) * this.baseSpeed; ball.stuck = false; ball.trail = []; this.sPad();
  }
  private allCleared() { return this.bricks.every((b) => !b.alive); }

  // ---------- loop ----------
  private frame = (now: number) => {
    if (this.destroyed) return;
    const rawDt = Math.min(40, now - this.last); this.last = now; const dt = rawDt / 1000;
    this.timeScale += ((now < this.slowUntil ? 0.5 : 1) - this.timeScale) * Math.min(1, rawDt / 120);
    if (this.wideUntil && now > this.wideUntil) { this.paddle.span += (this.paddle.baseSpan - this.paddle.span) * Math.min(1, rawDt / 200); if (Math.abs(this.paddle.span - this.paddle.baseSpan) < 0.01) { this.paddle.span = this.paddle.baseSpan; this.wideUntil = 0; } }
    if (this.state === "playing") this.update(dt * this.timeScale, now, rawDt);
    else if ((this.state === "intro" || this.state === "clear") && now > this.stateUntil) this.advance();
    this.render(now);
    this.raf = requestAnimationFrame(this.frame);
  };

  private stepPad(p: Paddle, rawDt: number, range: [number, number] | null) {
    if (range) p.target = clamp(p.target, range[0], range[1]);
    p.ang += norm(p.target - p.ang) * Math.min(1, rawDt / 90);
    if (range) p.ang = clamp(p.ang, range[0], range[1]);
    const inst = norm(p.ang - (p._prev != null ? p._prev : p.ang)) / Math.max(0.001, rawDt / 1000);
    p.angVel = 0.6 * p.angVel + 0.4 * inst; p._prev = p.ang;
  }

  private update(dt: number, now: number, rawDt: number) {
    const core = this.core!; const { cx, cy, rimR } = this;
    if (this.mode === "party") { const h1 = this.paddle.span / 2 + 0.06, h2 = this.p2.span / 2 + 0.06; this.stepPad(this.paddle, rawDt, [-Math.PI + h1, -h1]); this.stepPad(this.p2, rawDt, [h2, Math.PI - h2]); }
    else this.stepPad(this.paddle, rawDt, null);
    this.shake *= 0.86; this.bloom *= 0.94; this.comboGlow *= 0.9;
    core.pulse = (core.pulse + dt * 3) % TAU; core.flash += (0 - core.flash) * Math.min(1, rawDt / 160);
    if (core.awake) { core.shieldAng = (core.shieldAng + core.shieldRot * dt) % TAU; core.inv = Math.max(0, core.inv - rawDt); }
    const orbit = this.mods.includes("orbit"), grav = this.mods.includes("gravity");
    for (const b of this.bricks) { if (b.alive) { b.flash += (0 - b.flash) * Math.min(1, rawDt / 150); if (orbit && b.drift) { const dr = b.drift * dt; b.a0 += dr; b.a1 += dr; b.mid += dr; } } }

    const grace = now < this.launchAt;
    for (const ball of this.balls) {
      if (ball.dead) continue;
      if (ball.stuck) { const p = ball.pad || this.paddle; const ra = p.ang + (ball.stuckOff || 0); ball.x = cx + Math.cos(ra) * (rimR - 9); ball.y = cy + Math.sin(ra) * (rimR - 9); ball.trail = []; if (now > (ball.stuckAt || 0)) this.releaseBall(ball); continue; }
      let sp = grace ? this.baseSpeed * 0.45 : Math.hypot(ball.vx, ball.vy);
      if (grav) { const gx = cx - ball.x, gy = cy - ball.y, gl = Math.hypot(gx, gy) || 1; ball.vx += (gx / gl) * this.baseSpeed * 0.9 * dt; ball.vy += (gy / gl) * this.baseSpeed * 0.9 * dt; }
      const cs = Math.hypot(ball.vx, ball.vy) || 1; ball.vx = (ball.vx / cs) * sp; ball.vy = (ball.vy / cs) * sp;
      ball.pr = Math.hypot(ball.x - cx, ball.y - cy);
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      const dx = ball.x - cx, dy = ball.y - cy; let r = Math.hypot(dx, dy) || 1; const ux = dx / r, uy = dy / r;
      const reflect = () => { const vr = ball.vx * ux + ball.vy * uy; ball.vx -= 2 * vr * ux; ball.vy -= 2 * vr * uy; };
      ball.trail.push({ x: ball.x, y: ball.y }); if (ball.trail.length > 10) ball.trail.shift();

      // core
      if (r < core.r + 7) {
        ball.x = cx + ux * (core.r + 7.5); ball.y = cy + uy * (core.r + 7.5); reflect();
        const a = Math.atan2(dy, dx);
        const blocked = core.shield || core.inv > 0 || angDiff(a, core.shieldAng) < core.shieldSpan / 2;
        if (core.awake && !blocked && core.hp > 0) {
          core.hp--; core.flash = 1; core.inv = 550; core.shieldRot = 1.4 + (1 - core.hp / core.maxHp) * 2.6; core.shieldAng += Math.PI;
          this.shake = Math.max(this.shake, 12); this.sCore(); this.burst(ball.x, ball.y, "#fff", 20, this.baseSpeed * 0.6); this.shock(cx, cy, "#fca5a5", core.r * 3.4); this.score += 40;
          if (core.hp <= 0) { this.win(); return; }
        } else this.sClank();
        r = core.r + 7.5;
      }
      // bricks
      const a = Math.atan2(dy, dx);
      for (const b of this.bricks) {
        if (!b.alive) continue;
        if ((ball.pr - b.radius) * (r - b.radius) < 0 && angDiff(a, b.mid) < (b.a1 - b.a0) / 2 + 0.02) {
          const side = ball.pr < b.radius ? -1 : 1;
          ball.x = cx + ux * (b.radius + side * 8); ball.y = cy + uy * (b.radius + side * 8); reflect();
          this.hitBrick(b, ball.x, ball.y, now);
          const ns = Math.min(this.baseSpeed * 1.9, sp * (1 + this.tune.ramp)); const cs2 = Math.hypot(ball.vx, ball.vy) || 1; ball.vx = (ball.vx / cs2) * ns; ball.vy = (ball.vy / cs2) * ns;
          break;
        }
      }
      // rim / paddle
      if (r > rimR - 7) {
        const pad = this.mode === "party" ? (Math.sin(a) < 0 ? this.paddle : this.p2) : this.paddle;
        const diff = norm(a - pad.ang);
        if (Math.abs(diff) <= pad.span / 2 + 0.06) {
          if (this.sticky > 0 && !ball.stuck) {
            ball.stuck = true; ball.pad = pad; ball.stuckOff = clamp(diff, -pad.span / 2, pad.span / 2); ball.stuckAt = now + 4500;
            ball.vx = 0; ball.vy = 0; ball.x = cx + ux * (rimR - 9); ball.y = cy + uy * (rimR - 9); this.sticky--;
            this.tone(320, 0.08, "sine", 0.05); this.buzz(12); this.pop(cx, cy - rimR * 0.32, "AIM & LAUNCH", "#fbbf24");
          } else {
            const tx = -uy, ty = ux, off = clamp(diff / (pad.span / 2), -1, 1);
            const motion = clamp((pad.angVel * rimR) / (sp || 1), -1.2, 1.2);
            const eng = clamp((off * 1.15 + motion * 0.95) * this.engMult, -1.95, 1.95);
            const nx = -ux + tx * eng, ny = -uy + ty * eng, nl = Math.hypot(nx, ny) || 1;
            ball.vx = (nx / nl) * sp; ball.vy = (ny / nl) * sp; ball.x = cx + ux * (rimR - 8); ball.y = cy + uy * (rimR - 8);
            this.combo = 0; this.sPad();
          }
        } else { ball.dead = true; this.burst(ball.x, ball.y, "#7c3aed", 14, this.baseSpeed * 0.5); }
      }
    }
    this.balls = this.balls.filter((b) => !b.dead);
    if (this.balls.length === 0 && this.state === "playing") {
      if (this.reviveLeft > 0) { this.reviveLeft--; this.spawnBall(); this.pop(cx, cy, "PHOENIX", "#fbbf24"); this.shock(cx, cy, "#fbbf24", rimR * 0.8); this.sPow(); }
      else { this.lives--; this.noBallLost = false; this.shake = 14; this.sLife(); this.shock(cx, cy, "#ec4899", rimR * 1.1); if (this.lives <= 0) { this.lose(); return; } this.spawnBall(); }
    }

    for (const p of this.pups) {
      const dx = p.x - cx, dy = p.y - cy, pr = Math.hypot(dx, dy) || 1, ux = dx / pr, uy = dy / pr;
      p.x += ux * rimR * 0.28 * dt; p.y += uy * rimR * 0.28 * dt;
      let got = false;
      if (pr > rimR - 14) { if (angDiff(Math.atan2(dy, dx), this.paddle.ang) <= this.paddle.span / 2 + 0.06) got = true; else p.dead = true; }
      for (const b of this.balls) { if (Math.hypot(b.x - p.x, b.y - p.y) < 16) { got = true; break; } }
      if (got && !p.dead) { p.dead = true; this.applyPU(p.type); }
    }
    this.pups = this.pups.filter((p) => !p.dead);
    this.parts = this.parts.filter((p) => p.life > 0); this.parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; p.life -= dt * 1.7; });
    this.frags = this.frags.filter((p) => p.life > 0); this.frags.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; p.rot += p.vr * dt; p.life -= dt * 1.4; });
    this.pops = this.pops.filter((p) => p.life > 0); this.pops.forEach((p) => { p.y -= dt * 30; p.life -= dt * 1.1; });
    this.shocks = this.shocks.filter((s) => s.life > 0); this.shocks.forEach((s) => { s.life -= dt * 1.8; s.r += (s.maxR - s.r) * Math.min(1, dt * 4); });
    this.emitHud();
  }

  private hitBrick(b: Brick, x: number, y: number, now: number, chain?: boolean) {
    b.hp--; b.flash = 1;
    if (!chain) { this.combo++; this.comboMax = Math.max(this.comboMax, this.combo); const gain = Math.round(10 * this.combo * this.scoreMult); this.score += gain; this.comboGlow = Math.min(1, this.combo / 12); this.sBrick(this.combo); if (this.combo >= 3) this.pop(x, y, "×" + this.combo, "#22d3ee"); }
    this.burst(x, y, b.color, 7, this.baseSpeed * 0.45);
    if (b.hp <= 0) {
      b.alive = false; this.frag(x, y, b.color); this.burst(x, y, b.color, 8, this.baseSpeed * 0.5);
      this.superCharge = Math.min(1, this.superCharge + 0.012);
      if (!this.bricks.some((o) => o.alive && o.ring === b.ring)) this.ringChord(b.ring);
      if (b.vol) this.explode(b, now);
      if (!chain && Math.random() < this.tune.drop) { const t = (["multi", "wide", "life", "slow", "catch"] as PowerupType[])[Math.floor(Math.random() * 5)]; this.pups.push({ x, y, type: t }); }
      if (this.allCleared() && this.core!.shield) { this.core!.shield = 0; this.core!.awake = 1; this.core!.inv = 400; this.core!.flash = 1; this.shake = 10; this.shock(this.cx, this.cy, "#fbbf24", this.rimR); this.pop(this.cx, this.cy - this.core!.r - 26, "CORE EXPOSED", "#fbbf24"); this.sCore(); }
    }
  }
  private explode(src: Brick, now: number) {
    const sx = this.cx + Math.cos(src.mid) * src.radius, sy = this.cy + Math.sin(src.mid) * src.radius, blast = this.rimR * 0.22;
    this.shake = Math.max(this.shake, 8); this.shock(sx, sy, "#fb7185", blast * 1.8); this.burst(sx, sy, "#fb7185", 16, this.baseSpeed * 0.7); this.buzz(20);
    for (const b of this.bricks) { if (!b.alive) continue; const bx = this.cx + Math.cos(b.mid) * b.radius, by = this.cy + Math.sin(b.mid) * b.radius; if (Math.hypot(bx - sx, by - sy) < blast) { b.hp = 1; this.hitBrick(b, bx, by, now, true); } }
  }

  // ---------- flow ----------
  private advance() {
    if (this.state === "intro") { this.state = "playing"; this.launchAt = performance.now() + 400; return; }
    if (this.state === "clear") {
      if (this.mode === "daily") { this.finish(true); return; }
      if (this.mode === "journey") { this.offerRelics(); return; }
      this.nextWorld();
    }
  }
  private nextWorld() { this.world++; this.rng = Math.random; this.buildWorld(this.makeWorld(this.world)); this.state = "intro"; this.stateUntil = performance.now() + 1700; }
  private offerRelics() {
    this.state = "relics";
    const options: RelicId[] = []; for (let i = 0; i < 3; i++) options.push(RELIC_IDS[Math.floor(Math.random() * RELIC_IDS.length)]);
    if (this.opts.onRelicOffer) this.opts.onRelicOffer(options, (id) => this.pickRelic(id));
    else this.nextWorld(); // no host handler → skip the boon rather than soft-lock
  }
  private pickRelic(id: RelicId) { if (this.state !== "relics") return; this.relics.push(id); if (id === "bulwark") this.lives += 2; this.nextWorld(); }

  private win() {
    this.state = "clear"; this.bloom = 1; this.sWin();
    this.burst(this.cx, this.cy, "#fff", 64, this.baseSpeed * 0.7); this.shock(this.cx, this.cy, "#c4b5fd", this.rimR * 1.5);
    this.stateUntil = performance.now() + 1500;
    this.opts.onWorldRestored?.({ mode: this.mode, world: this.world, worldName: this.worldName, score: this.score, comboMax: this.comboMax, noBallLost: this.noBallLost });
  }
  private lose() { this.finish(false); }
  private finish(good: boolean) {
    this.state = "over";
    if (this.mode === "journey") {
      if (this.score > +(LS.get("cirql_jbest") || 0)) LS.set("cirql_jbest", String(this.score));
      if (this.world > +(LS.get("cirql_jworld") || 0)) LS.set("cirql_jworld", String(this.world));
    }
    if (this.mode === "daily") { const key = "cirql_daily_" + this.dailyNum; const best = Math.max(+(LS.get(key) || 0), this.score); LS.set(key, String(best)); }
    this.opts.onRunEnd?.({ mode: this.mode, restored: good, score: this.score, comboMax: this.comboMax, world: this.world, dailyNum: this.dailyNum, streak: this.streak });
  }

  // ---------- HUD emit (only on change) ----------
  private emitHud() {
    if (!this.opts.onHud) return;
    const pulseReady = performance.now() >= this.pulseReady;
    const sig = [this.mode, this.score, this.world, this.worldName, this.dailyNum, this.lives, this.combo, pulseReady, Math.round(this.superCharge * 20), this.sticky, this.streak].join("|");
    if (sig === this.lastHud) return;
    this.lastHud = sig;
    this.opts.onHud({ mode: this.mode, score: this.score, world: this.world, worldName: this.worldName, dailyNum: this.dailyNum, lives: this.lives, combo: this.combo, pulseReady, superCharge: this.superCharge, sticky: this.sticky, streak: this.streak });
  }

  private liveBrickFrac() { if (!this.bricks.length) return 0; let a = 0; for (const b of this.bricks) if (b.alive) a++; return a / this.bricks.length; }

  // ---------- render ----------
  private ambient(life: number) {
    const { ctx, cx, cy, rimR } = this;
    const bl = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.15);
    bl.addColorStop(0, `rgba(124,58,237,${0.1 + 0.22 * life})`); bl.addColorStop(0.55, `rgba(236,72,153,${0.03 + 0.08 * life})`); bl.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = bl; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.15, 0, TAU); ctx.fill();
    if (!this.core) { ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.16)"; ctx.lineWidth = 2; ctx.stroke(); }
  }
  private render(now: number) {
    const { ctx, cx, cy, rimR, W, H } = this;
    ctx.save();
    if (this.shake > 0.4) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    ctx.clearRect(-40, -40, W + 80, H + 80);
    if (!this.core) { this.ambient(0.14); ctx.restore(); return; }
    const life = this.state === "clear" ? 1 : 0.14 + 0.5 * (1 - this.liveBrickFrac()) + this.bloom;
    this.ambient(life);

    ctx.beginPath(); ctx.arc(cx, cy, rimR, 0, TAU); ctx.strokeStyle = "rgba(150,130,255,.16)"; ctx.lineWidth = 2; ctx.stroke();

    for (const b of this.bricks) {
      if (!b.alive) continue;
      ctx.save(); ctx.shadowBlur = 6 + 22 * b.flash; ctx.shadowColor = b.color; ctx.strokeStyle = b.color;
      ctx.globalAlpha = (b.hp < b.maxHp ? 0.48 : 0.8) + 0.2 * b.flash; ctx.lineWidth = Math.max(7, rimR * 0.032) * (b.hp < b.maxHp ? 0.72 : 1); ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, cy, b.radius, b.a0, b.a1); ctx.stroke();
      if (b.vol) { ctx.globalAlpha = 0.9; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + Math.cos(b.mid) * b.radius, cy + Math.sin(b.mid) * b.radius, 2, 0, TAU); ctx.fill(); }
      ctx.restore();
    }

    const core = this.core, cr = core.r * (1 + 0.06 * Math.sin(core.pulse) + 0.32 * core.flash);
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 2);
    if (!core.awake) { cg.addColorStop(0, "rgba(180,190,255,.5)"); cg.addColorStop(0.5, "rgba(124,58,237,.4)"); cg.addColorStop(1, "rgba(124,58,237,0)"); }
    else { const t = 0.5 + 0.5 * Math.sin(core.pulse * 2); cg.addColorStop(0, "rgba(255,255,255,.95)"); cg.addColorStop(0.45, `rgba(251,191,36,${0.55 + 0.3 * t})`); cg.addColorStop(1, "rgba(251,146,60,0)"); }
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, cr * 2, 0, TAU); ctx.fill();
    ctx.fillStyle = core.awake ? "#fff" : "rgba(230,235,255,.9)"; ctx.beginPath(); ctx.arc(cx, cy, core.r * 0.55, 0, TAU); ctx.fill();
    if (!core.awake) { ctx.beginPath(); ctx.arc(cx, cy, core.r * 1.35, 0, TAU); ctx.strokeStyle = "rgba(180,190,255,.4)"; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([]); }
    else {
      ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = "#c4b5fd"; ctx.strokeStyle = core.inv > 0 ? "rgba(196,181,253,.9)" : "rgba(147,130,220,.8)";
      ctx.lineWidth = Math.max(6, core.r * 0.5); ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, cy, core.r * 1.5, core.shieldAng - core.shieldSpan / 2, core.shieldAng + core.shieldSpan / 2); ctx.stroke(); ctx.restore();
      for (let i = 0; i < core.maxHp; i++) { const a = -Math.PI / 2 + (i / core.maxHp) * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (core.r * 1.5 + 10), cy + Math.sin(a) * (core.r * 1.5 + 10), 2.4, 0, TAU); ctx.fillStyle = i < core.hp ? "#fbbf24" : "rgba(255,255,255,.18)"; ctx.fill(); }
    }

    for (const p of this.pups) { const info = PU[p.type]; ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = info.c; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, TAU); ctx.fillStyle = info.c; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = "#05040f"; ctx.font = "bold 11px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(info.g, p.x, p.y + 0.5); ctx.restore(); }

    const pw = Math.max(9, rimR * 0.045);
    const drawPad = (p: Paddle, col: string, glow: string) => { ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = glow; ctx.strokeStyle = col; ctx.lineWidth = pw; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(cx, cy, rimR - 2, p.ang - p.span / 2, p.ang + p.span / 2); ctx.stroke(); ctx.restore(); };
    drawPad(this.paddle, "#f9a8d4", "#ec4899");
    if (this.mode === "party") { drawPad(this.p2, "#a5f3fc", "#22d3ee"); ctx.save(); ctx.strokeStyle = "rgba(150,130,255,.13)"; ctx.lineWidth = 1; ctx.setLineDash([5, 8]); ctx.beginPath(); ctx.moveTo(cx - rimR, cy); ctx.lineTo(cx + rimR, cy); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); }

    for (const p of this.frags) { ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.strokeStyle = p.color; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-p.len / 2, 0); ctx.lineTo(p.len / 2, 0); ctx.stroke(); ctx.restore(); }
    for (const p of this.parts) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 * p.life + 0.5, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const s of this.shocks) { ctx.globalAlpha = Math.max(0, s.life) * 0.5; ctx.strokeStyle = s.color; ctx.lineWidth = s.life * 3 + 0.5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;

    for (const b of this.balls) {
      for (let i = 0; i < b.trail.length; i++) { const k = i / b.trail.length; ctx.globalAlpha = k * 0.35; ctx.fillStyle = "#a5f3fc"; ctx.beginPath(); ctx.arc(b.trail[i].x, b.trail[i].y, 6 * k, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = b.stuck ? "#fbbf24" : "#67e8f9"; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, 6.5, 0, TAU); ctx.fill(); ctx.restore();
      if (b.stuck) { ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(b.x, b.y, 10 + 2 * Math.sin(now / 110), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    for (const p of this.pops) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.font = "800 15px system-ui"; ctx.textAlign = "center"; ctx.shadowBlur = 8; ctx.shadowColor = p.color; ctx.fillText(p.txt, p.x, p.y); ctx.shadowBlur = 0; }
    ctx.globalAlpha = 1;

    if (this.comboGlow > 0.05) { const g = ctx.createRadialGradient(cx, cy, rimR * 0.5, cx, cy, rimR * 1.2); g.addColorStop(0, "rgba(34,211,238,0)"); g.addColorStop(1, `rgba(34,211,238,${0.12 * this.comboGlow})`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.2, 0, TAU); ctx.fill(); }
    if (this.bloom > 0.02) { const wf = Math.min(1, this.bloom); const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rimR * 1.4); fg.addColorStop(0, `rgba(255,255,255,${0.4 * wf})`); fg.addColorStop(0.4, `rgba(196,181,253,${0.22 * wf})`); fg.addColorStop(1, "rgba(5,4,15,0)"); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, rimR * 1.4, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = "source-over"; }

    if (this.state === "intro" || this.state === "clear") {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(196,181,253,.9)"; ctx.font = "800 12px system-ui";
      ctx.fillText(this.state === "clear" ? "RESTORED" : this.mode === "daily" ? "DAILY CIRCLE #" + this.dailyNum : "WORLD " + this.world, cx, cy - 18);
      ctx.fillStyle = "#fff"; ctx.font = "800 24px system-ui"; ctx.fillText(this.worldName, cx, cy + 10);
      if (this.mods.length && this.state === "intro") { ctx.fillStyle = "#38bdf8"; ctx.font = "600 12px system-ui"; ctx.fillText(this.mods.map((m) => MODS[m].n).join("  ·  "), cx, cy + 34); }
    }
    ctx.restore();
  }
}
