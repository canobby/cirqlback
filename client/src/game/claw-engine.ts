// claw-engine — Main Street cabinet (claw-machine homage). A toy store's crane game:
// the claw tracks back and forth over the prize bin — TAP to drop it, and if it comes
// down over a plush you snag it and drop it down the chute. Line it up dead-centre for
// a clean grab (a wobbly one can slip!). Signature twist: a golden JACKPOT plush is
// worth a fortune, and back-to-back grabs stack a WIN STREAK. Grab as many as you can
// before the tokens run out. RetroEngine + juice + MusicKit; one-button drop.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "claw_best";
const BINY = 132, TOPY = 30, GRABR = 15;

interface Prize { x: number; value: number; color: string; jackpot: boolean }

const CLAW_THEME: Track = {
  bpm: 120,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "C5", d: 2 }, { n: "G4", d: 2 }, { n: "A4", d: 2 }, { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 4 },
      { n: "E5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "G4", d: 4 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.48, pattern: [{ n: "C3", d: 2 }, { n: "C3", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }, { n: "C3", d: 2 }, { n: "C3", d: 2 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 4 }, { n: "S", d: 4 }] },
  ],
};

export class ClawEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private phase: "aim" | "drop" | "lift" = "aim";
  private clawX = LW / 2; private clawY = TOPY; private clawDir = 1; private clawSpd = 70; private grabbed: Prize | null = null; private open = 1;
  private prizes: Prize[] = []; private tokens = 8; private score = 0; private streak = 0;
  private best = +(LS.get(BEST_KEY) || 0); private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.fillBin();
    this.start();
  }
  protected onGesture() { this.music?.play(CLAW_THEME); }

  private newPrize(x: number): Prize { const jackpot = this.rnd() < 0.1; const cols = ["#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650", "#b79bff", "#ff8a3d"]; return { x, value: jackpot ? 300 : 40 + Math.floor(this.rnd() * 4) * 20, color: jackpot ? "#ffd24a" : cols[Math.floor(this.rnd() * cols.length)], jackpot }; }
  private fillBin() { this.prizes = []; for (let i = 0; i < 6; i++) this.prizes.push(this.newPrize(30 + i * 34 + this.rnd() * 8)); }
  private beginGame() { this.fillBin(); this.tokens = 8; this.score = 0; this.streak = 0; this.phase = "aim"; this.clawX = LW / 2; this.clawY = TOPY; this.grabbed = null; this.open = 1; this.clawSpd = 70; this.clearFx(); this.state = "play"; this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: 8 - this.tokens }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.tokens, shift: 8 - this.tokens, combo: this.streak }); }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.state !== "play") { if (this.pressed.a || this.pointer.down) this.beginGame(); return; }

    if (this.phase === "aim") {
      this.clawX += this.clawDir * this.clawSpd * dt; if (this.clawX > LW - 24) { this.clawX = LW - 24; this.clawDir = -1; } if (this.clawX < 24) { this.clawX = 24; this.clawDir = 1; }
      this.open = 1;
      if (this.pressed.a) { this.phase = "drop"; this.tokens--; this.tone(400, 0.05, "square", 0.04); this.buzz(6); }
    } else if (this.phase === "drop") {
      this.clawY += 150 * dt;
      if (this.clawY >= BINY - 8) { this.clawY = BINY - 8; this.open = 0;
        // grab nearest prize within range
        let best: Prize | null = null, bd = 99; for (const p of this.prizes) { const d = Math.abs(p.x - this.clawX); if (d < bd) { bd = d; best = p; } }
        if (best && bd < GRABR) { this.grabbed = best; this.prizes = this.prizes.filter((p) => p !== best); this.fxRing(this.clawX, BINY, "#ffd24a", 16); this.tone(700, 0.06, "square", 0.05); }
        else { this.tone(200, 0.08, "square", 0.03); this.streak = 0; }
        this.phase = "lift";
      }
    } else if (this.phase === "lift") {
      this.clawY -= 150 * dt; if (this.grabbed) this.grabbed.x = this.clawX;
      if (this.clawY <= TOPY) { this.clawY = TOPY;
        if (this.grabbed) { this.streak++; const g = Math.round(this.grabbed.value * (1 + (this.streak - 1) * 0.25)); this.score += g; this.fxBurst(this.clawX, TOPY + 10, this.grabbed.color, this.grabbed.jackpot ? 16 : 8, 80); this.fxPop(this.clawX, TOPY, (this.grabbed.jackpot ? "JACKPOT +" : (this.streak > 1 ? "STREAK +" : "+")) + g, this.grabbed.jackpot ? "#ffd24a" : "#33e650"); this.addShake(this.grabbed.jackpot ? 3 : 1); this.tone(900, 0.08, "square", 0.05); if (this.grabbed.jackpot) { this.fxRing(this.clawX, TOPY + 10, "#ffd24a", 40); this.music?.setIntensity(0.9); }
          this.grabbed = null; if (this.prizes.length < 4) this.prizes.push(this.newPrize(20 + this.rnd() * 200)); }
        this.report();
        if (this.tokens <= 0) { this.gameOver(); return; }
        this.phase = "aim";
      }
    }
  }

  // ---- draw ----
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2030" : "#2a1a3a", "#120a1e");
    // cabinet glass + rail
    this.rectLine(8, 20, LW - 16, LH - 28, "#5a4f7a"); this.rect(8, 20, LW - 16, 4, "#7a6f9a");
    this.rect(12, TOPY - 6, LW - 24, 3, "#3a2f52"); // top rail
    // chute (top-left)
    this.rect(12, 24, 20, 12, "#1a1428"); this.text(14, 26, "WIN", "#ffd24a", 1, false);
    // prize bin
    this.rect(12, BINY, LW - 24, LH - BINY - 8, "#1a1230");
    for (const p of this.prizes) { this.ball(p.x | 0, BINY - 2, 9, p.color); this.rect((p.x | 0) - 4, BINY - 8, 2, 2, "#0a0714"); this.rect((p.x | 0) + 2, BINY - 8, 2, 2, "#0a0714"); this.rect((p.x | 0) - 3, BINY, 6, 2, shade(p.color, -0.2)); if (p.jackpot) this.ring(p.x | 0, BINY - 2, 11, "#fff1c0", 1.2); }
    // claw cable + claw
    this.rect((this.clawX | 0) - 1, 24, 2, this.clawY - 24, "#8a8276");
    const o = this.open; const spread = 4 + o * 4;
    this.rect((this.clawX | 0) - 5, (this.clawY | 0), 10, 4, "#c0c0cc");
    this.line(this.clawX | 0, (this.clawY | 0) + 3, (this.clawX | 0) - spread, (this.clawY | 0) + 10, "#a0a0ac"); this.line(this.clawX | 0, (this.clawY | 0) + 3, (this.clawX | 0) + spread, (this.clawY | 0) + 10, "#a0a0ac");
    if (this.grabbed) this.ball(this.clawX | 0, (this.clawY | 0) + 12, 9, this.grabbed.color);

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#e6ddf5", 1, false);
    this.text(140, 3, "TOKENS", "#ffd24a", 1, false); for (let i = 0; i < this.tokens; i++) this.disc(184 + i * 7, 6, 2, "#ffd24a");
    if (this.streak > 1) this.text(110, 3, "x" + this.streak, "#33e650", 1, false);

    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "CLAW", "#ffd24a", 2);
      this.textCenter(64, "DROP THE CLAW OVER A PLUSH", "#c3b4de", 1);
      this.textCenter(84, "LINE IT UP DEAD-CENTRE", "#83769c", 1);
      this.textCenter(96, "GOLD JACKPOT PLUSH PAYS BIG", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS DROP TO START", "#ffec27", 1);
    } else {
      this.textCenter(50, "OUT OF TOKENS", "#ff5d7d", 2);
      this.textCenter(76, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(90, "BEST " + this.best, "#ffd24a", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS DROP TO RETRY", "#ffec27", 1);
    }
  }
}
