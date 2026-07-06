// plink-engine — Main Street cabinet (Pachinko / Plinko homage). A boardwalk drop
// game: line up the chute as the aim sweeps, TAP to release a token, and watch it
// pinball down through the pegs into a scoring slot. The centre slots pay big and a
// lit JACKPOT slot pays huge — but the pegs have their own ideas. Signature twist:
// landing the jackpot lights the NEXT drop's multiplier. Ten tokens a round; go for
// the high score. RetroEngine + juice + MusicKit; one-button drop.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "plink_best";
const TOPY = 26, SLOTY = 156;
const SLOTS = [10, 30, 60, 120, 250, 120, 60, 30, 10];

interface Peg { x: number; y: number }

const PLINK_THEME: Track = {
  bpm: 116,
  layers: [
    { role: "lead", wave: "square", gain: 0.3, pattern: [
      { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "G4", d: 2 }, { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 4 },
      { n: "D5", d: 2 }, { n: "B4", d: 2 }, { n: "G4", d: 2 }, { n: "B4", d: 2 }, { n: "D5", d: 4 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.48, pattern: [{ n: "C3", d: 2 }, { n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }, { n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "E2", d: 2 }, { n: "E2", d: 2 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 4 }, { n: "H", d: 2 }, { n: "S", d: 2 }] },
  ],
};

export class PlinkEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private phase: "aim" | "fall" | "result" = "aim";
  private aimX = LW / 2; private aimDir = 1; private tok = { x: LW / 2, y: TOPY, vx: 0, vy: 0 };
  private pegs: Peg[] = []; private balls = 10; private score = 0; private mult = 1; private jackLit = -1; private resultT = 0; private lastSlot = -1; private lastPts = 0;
  private best = +(LS.get(BEST_KEY) || 0); private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.buildPegs();
    this.start();
  }
  protected onGesture() { this.music?.play(PLINK_THEME); }

  private buildPegs() { this.pegs = []; const rows = 7; for (let r = 0; r < rows; r++) { const y = 48 + r * 15; const n = r % 2 ? 8 : 9; const off = r % 2 ? 15 : 0; for (let i = 0; i < n; i++) { const x = 24 + off + i * 26; if (x > 18 && x < LW - 18) this.pegs.push({ x, y }); } } }
  private beginGame() { this.balls = 10; this.score = 0; this.mult = 1; this.jackLit = 4; this.phase = "aim"; this.aimX = LW / 2; this.clearFx(); this.state = "play"; this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: 10 - this.balls }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.balls, shift: 10 - this.balls, combo: this.mult }); }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.state !== "play") { if (this.pressed.a || this.pointer.down) this.beginGame(); return; }

    if (this.phase === "aim") {
      this.aimX += this.aimDir * 110 * dt; if (this.aimX > LW - 24) { this.aimX = LW - 24; this.aimDir = -1; } if (this.aimX < 24) { this.aimX = 24; this.aimDir = 1; }
      if (this.pressed.a) { this.tok = { x: this.aimX, y: TOPY, vx: (this.rnd() - 0.5) * 10, vy: 20 }; this.phase = "fall"; this.balls--; this.tone(500, 0.04, "square", 0.04); this.buzz(5); }
    } else if (this.phase === "fall") {
      // physics substeps for stability
      for (let s = 0; s < 3; s++) {
        const h = dt / 3; const t = this.tok;
        t.vy += 300 * h; t.x += t.vx * h; t.y += t.vy * h; t.vx *= 0.995;
        if (t.x < 16) { t.x = 16; t.vx = Math.abs(t.vx) * 0.6; } if (t.x > LW - 16) { t.x = LW - 16; t.vx = -Math.abs(t.vx) * 0.6; }
        for (const p of this.pegs) { const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy); if (d < 7 && d > 0.01) { const nx = dx / d, ny = dy / d; t.x = p.x + nx * 7; t.y = p.y + ny * 7; const dot = t.vx * nx + t.vy * ny; t.vx = (t.vx - 2 * dot * nx) * 0.5 + (this.rnd() - 0.5) * 40; t.vy = Math.abs((t.vy - 2 * dot * ny) * 0.5) + 20; this.tone(600 + this.rnd() * 300, 0.015, "square", 0.02); this.fxBurst(p.x, p.y, "#7be0ff", 1, 20); } }
      }
      if (this.tok.y >= SLOTY) { this.settle(); }
    } else if (this.phase === "result") { this.resultT -= dt; if (this.resultT <= 0) { if (this.balls <= 0) this.gameOver(); else this.phase = "aim"; } }
  }
  private settle() {
    const slotW = LW / SLOTS.length; const idx = Math.max(0, Math.min(SLOTS.length - 1, Math.floor(this.tok.x / slotW)));
    let pts = SLOTS[idx]; const jack = idx === this.jackLit; if (jack) pts = 500;
    pts = Math.round(pts * this.mult); this.lastSlot = idx; this.lastPts = pts; this.score += pts;
    this.fxRing((idx + 0.5) * slotW, SLOTY, jack ? "#ffd24a" : "#33e650", 24); this.fxPop((idx + 0.5) * slotW, SLOTY - 12, (jack ? "JACKPOT +" : (this.mult > 1 ? "x" + this.mult + " +" : "+")) + pts, jack ? "#ffd24a" : "#7be0ff");
    this.tone(jack ? 1046 : 700, 0.08, "square", 0.05); this.addShake(jack ? 3 : 1);
    if (jack) { this.mult = Math.min(4, this.mult + 1); this.music?.playJingle(CLEAR_JINGLE, 165); } else { this.mult = 1; }
    this.jackLit = Math.floor(this.rnd() * SLOTS.length); if (SLOTS[this.jackLit] >= 120) this.jackLit = (this.jackLit + 2) % SLOTS.length; // keep jackpot off the big centre slot
    this.phase = "result"; this.resultT = 0.8; this.report();
  }

  // ---- draw ----
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2030" : "#1a2440", "#0a1020");
    // frame
    this.rect(14, TOPY, 2, SLOTY - TOPY, "#3a4f7a"); this.rect(LW - 16, TOPY, 2, SLOTY - TOPY, "#3a4f7a");
    // pegs
    for (const p of this.pegs) { this.disc(p.x | 0, p.y | 0, 2, "#7a8fba"); this.px(p.x | 0, (p.y | 0) - 1, "#bfd0ee"); }
    // slots
    const slotW = LW / SLOTS.length;
    for (let i = 0; i < SLOTS.length; i++) { const x = i * slotW; const jack = i === this.jackLit; const big = SLOTS[i] >= 120; const c = jack ? "#ffd24a" : big ? "#ff8ab5" : "#3a5a8a"; this.rect(x + 1, SLOTY, slotW - 2, LH - SLOTY, shade(c, -0.3)); this.rect(x + 1, SLOTY, slotW - 2, 2, c); this.text((x + slotW / 2 - 4) | 0, SLOTY + 4, "" + (jack ? "JACK" : SLOTS[i]), jack ? "#0a0714" : "#dfe8ff"); this.rect(x, SLOTY, 1, LH - SLOTY, "#0a1020"); }
    // aim indicator / token
    if (this.phase === "aim") { this.rect((this.aimX | 0) - 1, TOPY, 2, 8, "#ffd24a"); this.disc(this.aimX | 0, TOPY + 2, 4, "#ffd24a"); }
    if (this.phase === "fall" || this.phase === "aim") { const tx = this.phase === "fall" ? this.tok.x : this.aimX, ty = this.phase === "fall" ? this.tok.y : TOPY + 2; this.ball(tx | 0, ty | 0, 4, "#ffec9a"); }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#dfe8ff", 1, false);
    this.text(130, 3, "BALLS " + this.balls, "#7be0ff", 1, false);
    if (this.mult > 1) this.text(190, 3, "x" + this.mult, "#ffd24a", 1, false);

    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "PLINK", "#7be0ff", 2);
      this.textCenter(64, "DROP THE TOKEN THROUGH THE PEGS", "#c3b4de", 1);
      this.textCenter(84, "AIM THE CHUTE - CENTRE PAYS BIG", "#83769c", 1);
      this.textCenter(96, "HIT THE LIT JACKPOT SLOT", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS DROP TO START", "#ffec27", 1);
    } else {
      this.textCenter(50, "ROUND OVER", "#ff5d7d", 2);
      this.textCenter(76, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(90, "BEST " + this.best, "#ffd24a", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS DROP TO RETRY", "#ffec27", 1);
    }
  }
}
