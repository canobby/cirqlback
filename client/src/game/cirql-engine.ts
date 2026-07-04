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

export interface GameState {
  world: number;
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
  drift: number; driftResumeAt: number;
}
interface Star { x: number; y: number; r: number; vx: number; vy: number; a: number; tw: number; hue: string; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }
interface Wisp { x: number; y: number; vy: number; life: number; drift: number; }
interface Spark { a: { x: number; y: number }; b: { x: number; y: number }; color: string; life: number; }

const COLORS = ["#ec4899", "#8b5cf6", "#3bc9ff", "#38e0a6", "#f7a63b", "#c4b5fd"];
const ALIGN_TOL = 0.10;
const SNAP_TOL = 0.34;
const TWO = Math.PI * 2;

export class CirqlEngine {
  private ctx: CanvasRenderingContext2D;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private W = 540; private H = 540; private cx = 270; private cy = 270; private DPR = 1;
  private rings: Ring[] = [];
  private level = 1; private wins = 0; private moves = 0; private won = false;
  private drag: { i: number; startA: number; startRot: number; moved: boolean } | null = null;
  private selected = 0;
  private particles: Particle[] = []; private wisps: Wisp[] = []; private sparks: Spark[] = []; private stars: Star[] = [];
  private t0 = performance.now(); private sparkTimer = 1400; private wispTimer = 0;
  private muted = false; private actx: AudioContext | null = null;
  private raf = 0; private lastEmit = ""; private ro: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, private opts: EngineOpts = {}) {
    this.ctx = canvas.getContext("2d")!;
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
  nextWorld() { this.wins++; this.level++; this.initLevel(); }
  setMuted(m: boolean) { this.muted = m; }

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
    const n = Math.min(3 + this.wins, 6);
    const maxR = Math.min(this.W, this.H) * 0.44;
    const step = (maxR - Math.min(this.W, this.H) * 0.14) / n;
    this.rings = [];
    for (let i = 0; i < n; i++) {
      const radius = maxR - i * step;
      let rot = 0; while (this.dist(rot, 0) < 0.7) rot = Math.random() * TWO;
      this.rings.push({
        radius, thick: Math.max(14, step * 0.52), span: 1.15 - i * 0.03,
        color: COLORS[i % COLORS.length], rot, tween: null,
        aligned: false, wasAligned: false, glow: 0,
        drift: (Math.random() * 0.05 + 0.03) * (i % 2 ? 1 : -1), driftResumeAt: 0,
      });
    }
    this.won = false; this.moves = 0; this.particles = []; this.wisps = []; this.sparks = []; this.selected = 0;
    this.emit(0);
  }

  private emit(aligned: number) {
    const s: GameState = { world: this.level, aligned, total: this.rings.length, moves: this.moves, won: this.won };
    const key = `${s.world}|${s.aligned}|${s.total}|${s.moves}|${s.won}`;
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
  private chime() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => this.tone(f, 0.9, "sine", 0.05), i * 90)); }

  // ---- input ----
  private pAngle(e: PointerEvent) { const r = this.canvas.getBoundingClientRect(); return Math.atan2((e.clientY - r.top) - this.cy, (e.clientX - r.left) - this.cx); }
  private pRadius(e: PointerEvent) { const r = this.canvas.getBoundingClientRect(); return Math.hypot((e.clientX - r.left) - this.cx, (e.clientY - r.top) - this.cy); }
  private hitRing(e: PointerEvent) {
    const rad = this.pRadius(e); let best = -1, bestD = 1e9;
    this.rings.forEach((r, i) => { const d = Math.abs(rad - r.radius); if (d < r.thick * 0.9 + 6 && d < bestD) { bestD = d; best = i; } });
    return best;
  }
  private onDown = (e: PointerEvent) => {
    if (this.won) return;
    const i = this.hitRing(e); if (i < 0) return;
    this.canvas.setPointerCapture(e.pointerId);
    this.selected = i; this.rings[i].tween = null;
    this.drag = { i, startA: this.pAngle(e), startRot: this.rings[i].rot, moved: false };
  };
  private onMove = (e: PointerEvent) => {
    if (!this.drag) return;
    const d = this.norm(this.pAngle(e) - this.drag.startA);
    this.rings[this.drag.i].rot = this.drag.startRot + d;
    this.drag.moved = this.drag.moved || Math.abs(d) > 0.02;
  };
  private onUp = () => {
    if (!this.drag) return;
    const r = this.rings[this.drag.i];
    if (this.drag.moved) this.moves++;
    if (this.dist(r.rot, 0) < SNAP_TOL) r.tween = { from: r.rot, to: Math.round(r.rot / TWO) * TWO, t: 0 };
    else r.driftResumeAt = performance.now() + 900;
    this.drag = null;
  };
  private onKey = (e: KeyboardEvent) => {
    if (this.won) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const r = this.rings[this.selected]; if (!r) return;
      r.tween = null; r.rot = this.norm(r.rot + (e.key === "ArrowLeft" ? -0.09 : 0.09));
      r.driftResumeAt = performance.now() + 900; this.moves++;
      e.preventDefault();
    }
  };

  private burst(x: number, y: number, color: string, n: number, spd: number) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TWO, s = spd * (0.5 + Math.random());
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color }); }
  }

  // ---- render loop ----
  private frame = (now: number) => {
    const dt = Math.min(40, now - this.t0); this.t0 = now; const sec = dt / 1000;
    const ctx = this.ctx; const { cx, cy, W, H } = this;
    ctx.clearRect(0, 0, W, H);

    let alignedCount = 0;
    this.rings.forEach((r, i) => {
      const dragging = this.drag && this.drag.i === i;
      if (r.tween) {
        r.tween.t += dt / 150;
        const k = r.tween.t >= 1 ? 1 : 1 - Math.pow(1 - r.tween.t, 3);
        r.rot = r.tween.from + (r.tween.to - r.tween.from) * k;
        if (r.tween.t >= 1) { r.rot = this.norm(r.tween.to); r.tween = null; }
      } else if (!this.reduce && !this.won && !dragging && !r.aligned && now >= r.driftResumeAt) {
        r.rot = this.norm(r.rot + r.drift * sec);
      }
      r.aligned = !r.tween && this.dist(r.rot, 0) < ALIGN_TOL && (!this.drag || this.drag.i !== i);
      if (r.aligned) alignedCount++;
      r.glow += ((r.aligned ? 1 : 0) - r.glow) * Math.min(1, dt / 120);
      if (r.aligned && !r.wasAligned) { const p = this.nodePt(r); this.burst(p.x, p.y, r.color, 14, 2.4); this.clickSnap(); }
      r.wasAligned = r.aligned;
    });

    const solved = this.rings.length > 0 && alignedCount === this.rings.length;
    if (solved && !this.won) { this.won = true; this.burst(cx, cy, "#c4b5fd", 46, 3.4); this.chime(); this.opts.onWin?.(); }

    const progress = alignedCount / Math.max(1, this.rings.length);
    const pulse = this.reduce ? 0.5 : 0.5 + 0.5 * Math.sin(now / 900);
    const outerR = this.rings[0]?.radius || 200;

    // life-bloom
    const life = 0.12 + 0.88 * progress;
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.62);
    bloom.addColorStop(0, `rgba(124,58,237,${0.10 + 0.22 * life})`);
    bloom.addColorStop(0.5, `rgba(180,60,150,${0.04 + 0.10 * life})`);
    bloom.addColorStop(1, "rgba(5,4,15,0)");
    ctx.fillStyle = bloom; ctx.fillRect(0, 0, W, H);

    // stardust
    this.stars.forEach(s => {
      if (!this.reduce) { s.x += s.vx * sec; s.y += s.vy * sec; s.tw += sec * 1.5;
        if (s.x < 0) s.x += W; if (s.x > W) s.x -= W; if (s.y < 0) s.y += H; if (s.y > H) s.y -= H; }
      const tw = this.reduce ? 1 : 0.6 + 0.4 * Math.sin(s.tw);
      ctx.globalAlpha = s.a * tw * (0.5 + 0.5 * life); ctx.fillStyle = `rgb(${s.hue})`;
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

    // core + wisps
    const coreR = (Math.min(W, H) * 0.07) * (1 + 0.06 * pulse) * (this.won ? 1.35 : 1);
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4); const b = 0.25 + 0.75 * progress;
    cg.addColorStop(0, `rgba(255,255,255,${0.7 * b + (this.won ? 0.3 : 0)})`);
    cg.addColorStop(0.4, `rgba(180,150,255,${0.5 * b})`); cg.addColorStop(1, "rgba(124,58,237,0)");
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

    // vignette
    const vig = ctx.createRadialGradient(cx, cy, outerR * 0.7, cx, cy, Math.max(W, H) * 0.66);
    vig.addColorStop(0, "rgba(5,4,15,0)"); vig.addColorStop(1, `rgba(3,2,10,${0.55 - 0.4 * life})`);
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

    this.emit(alignedCount);
    this.raf = requestAnimationFrame(this.frame);
  };
}
