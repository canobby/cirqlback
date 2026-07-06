// sprout-engine — Main Street cabinet (Whack-a-mole homage). A farm stand: veggie-
// thieving gophers pop from the planter holes — TAP them to bonk them back down before
// they nab a carrot. But don't clobber the fluffy BUNNY (the customers love it) — that
// costs you. Signature twist: a golden GOPHER is worth double, and a clean bonk-streak
// stacks a HARVEST multiplier. Beat the clock for the high score. It all speeds up as
// you go. RetroEngine + juice + MusicKit; TAP the holes.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "sprout_best";
const COLS = 3, ROWS = 3;
const HOLE_R = 20;

interface Hole { x: number; y: number; mole: null | { type: "gopher" | "gold" | "bunny"; t: number; up: number; bonked: number } }

const SPROUT_THEME: Track = {
  bpm: 138,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "C5", d: 1 }, { n: "E5", d: 1 }, { n: "G5", d: 1 }, { n: "E5", d: 1 }, { n: "F5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "G4", d: 2 },
      { n: "A4", d: 1 }, { n: "C5", d: 1 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "E5", d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "C3", d: 1 }, { n: "C3", d: 1 }, { n: "G2", d: 1 }, { n: "G2", d: 1 }, { n: "F2", d: 1 }, { n: "F2", d: 1 }, { n: "G2", d: 1 }, { n: "G2", d: 1 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class SproutEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private holes: Hole[] = [];
  private timer = 45; private score = 0; private combo = 0; private carrots = 0; private wasDown = false; private spawnT = 0.8; private speed = 1;
  private best = +(LS.get(BEST_KEY) || 0); private flash = 0; private shakeHole = -1;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.buildHoles();
    this.start();
  }
  protected onGesture() { this.music?.play(SPROUT_THEME); }

  private buildHoles() { this.holes = []; const gw = LW / (COLS + 1), gh = (LH - 30) / (ROWS + 1); for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.holes.push({ x: gw * (c + 1) + gw * 0.5 * 0, y: 30 + gh * (r + 1), mole: null }); this.holes.forEach((h, i) => { h.x = (LW / (COLS + 1)) * ((i % COLS) + 1); }); }
  private beginGame() { this.timer = 45; this.score = 0; this.combo = 0; this.carrots = 0; this.speed = 1; this.spawnT = 0.6; this.holes.forEach((h) => (h.mole = null)); this.clearFx(); this.state = "play"; this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: Math.floor(this.speed) }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: 0, shift: Math.ceil(this.timer), combo: this.combo }); }

  private bonk(h: Hole, i: number) {
    const m = h.mole!; m.bonked = 0.2; this.shakeHole = i;
    if (m.type === "bunny") { this.combo = 0; this.score = Math.max(0, this.score - 30); this.flash = 1; this.addShake(3); this.buzz(70); this.noise(0.12, 0.05); this.tone(160, 0.14, "square", 0.05); this.fxPop(h.x, h.y - 14, "OOPS -30", "#ff5d7d"); }
    else { this.combo++; const base = m.type === "gold" ? 60 : 25; const g = base * Math.max(1, Math.floor(this.combo / 3) + 1); this.score += g; this.carrots++; this.fxBurst(h.x, h.y, m.type === "gold" ? "#ffd24a" : "#33e650", m.type === "gold" ? 12 : 6, 70); this.fxPop(h.x, h.y - 14, (m.type === "gold" ? "GOLD +" : "+") + g, m.type === "gold" ? "#ffd24a" : "#33e650"); this.addShake(0.8); this.hitstop(0.02); this.tone(660 + this.combo * 20, 0.05, "square", 0.05); this.buzz(8); if (m.type === "gold") this.fxRing(h.x, h.y, "#ffd24a", 22); }
    setTimeout(() => {}, 0); h.mole = null;
  }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.state !== "play") { const tap = this.pointer.down && !this.wasDown; this.wasDown = this.pointer.down; if (tap || this.pressed.a) this.beginGame(); return; }

    // tap detection (pointer edge)
    const tap = this.pointer.down && !this.wasDown; this.wasDown = this.pointer.down;
    if (tap) { for (let i = 0; i < this.holes.length; i++) { const h = this.holes[i]; if (h.mole && h.mole.up > 0.15 && Math.hypot(this.pointer.x - h.x, this.pointer.y - h.y) < HOLE_R) { this.bonk(h, i); break; } } }

    // timer + speed
    this.timer -= dt; if (this.timer <= 0) { this.timer = 0; this.gameOver(); return; }
    this.speed = 1 + (45 - this.timer) / 15;

    // moles up/down
    for (const h of this.holes) { if (!h.mole) continue; const m = h.mole; if (m.up < 1) m.up = Math.min(1, m.up + dt * 5); m.t -= dt; m.bonked = Math.max(0, m.bonked - dt); if (m.t <= 0) { if (m.type !== "bunny") this.combo = Math.max(0, this.combo - 0); h.mole = null; } }
    // spawn
    this.spawnT -= dt; if (this.spawnT <= 0) { const empty = this.holes.filter((h) => !h.mole); if (empty.length) { const h = empty[Math.floor(this.rnd() * empty.length)]; const r = this.rnd(); const type = r < 0.16 ? "bunny" : r < 0.24 ? "gold" : "gopher"; h.mole = { type, t: Math.max(0.6, 1.4 - this.speed * 0.12), up: 0, bonked: 0 }; } this.spawnT = Math.max(0.3, 0.9 - this.speed * 0.08) * (0.6 + this.rnd() * 0.6); }
    this.report();
  }

  // ---- draw ----
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2020" : "#3a2a12", "#1a1206");
    // stand banner
    this.rect(0, 12, LW, 14, "#5a3a1c"); this.textCenter(16, "FARM STAND", "#ffd24a", 1);
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i]; const sh = this.shakeHole === i && h.mole?.bonked ? 1 : 0;
      // hole (planter)
      this.disc(h.x | 0, h.y + 6 | 0, HOLE_R, "#2a1a0a"); this.disc(h.x | 0, h.y + 6 | 0, HOLE_R - 3, "#1a1006");
      this.rect((h.x | 0) - HOLE_R, (h.y | 0) + 6, HOLE_R * 2, 8, "#3a2410");
      // mole
      const m = h.mole; if (m) { const rise = m.up * 14; const y = h.y + 6 - rise + sh; const col = m.type === "bunny" ? "#e6ddf5" : m.type === "gold" ? "#ffd24a" : "#8a5a3a"; if (m.up > 0.1) { this.ball(h.x | 0, y | 0, 10, col); this.rect((h.x | 0) - 5, (y | 0) - 4, 3, 3, "#0a0714"); this.rect((h.x | 0) + 2, (y | 0) - 4, 3, 3, "#0a0714"); if (m.type === "bunny") { this.rect((h.x | 0) - 4, (y | 0) - 14, 2, 6, col); this.rect((h.x | 0) + 2, (y | 0) - 14, 2, 6, col); } else { this.rect((h.x | 0) - 2, (y | 0) + 2, 4, 2, "#ff8ab5"); } if (m.type === "gold") this.ring(h.x | 0, y | 0, 12, "#fff1c0", 1.2); } }
      // planter front lip
      this.rect((h.x | 0) - HOLE_R, (h.y | 0) + 12, HOLE_R * 2, 4, "#4a3018");
    }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6c2", 1, false);
    this.text(120, 3, "TIME " + Math.ceil(this.timer), this.timer < 8 ? "#ff5d7d" : "#33e650", 1, false);
    if (this.combo > 2) this.text(186, 3, "x" + (Math.floor(this.combo / 3) + 1), "#ffd24a", 1, false);

    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "SPROUT", "#33e650", 2);
      this.textCenter(64, "TAP THE GOPHERS", "#c3b4de", 1);
      this.textCenter(84, "DON'T BONK THE BUNNY!", "#83769c", 1);
      this.textCenter(96, "GOLD GOPHERS ARE WORTH DOUBLE", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "TAP TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "TIME UP!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "CARROTS SAVED " + this.carrots, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "TAP TO RETRY", "#ffec27", 1);
    }
  }
}
