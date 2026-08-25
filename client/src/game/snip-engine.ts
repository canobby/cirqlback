// snip-engine — Main Street cabinet (Cut the Rope homage). A tailor's shop: a button
// swings on a thread. SNIP the thread at the right moment and the button flies off on
// a tangent, arcing under gravity — thread the needle and drop it into the notions
// jar. Sweep up the loose beads on the way for bonus. Signature twist: catch all
// three beads in one drop for a PERFECT + a RUSH multiplier, and later jars slide
// side-to-side. Miss the jar three times and it's a wrap. RetroEngine + juice +
// MusicKit; one-button snip.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "snip_best";
const PX = LW / 2, PY = 28;      // thread pivot
const FLOOR = 168;

interface Bead { x: number; y: number; got: boolean }

const SNIP_THEME: Track = {
  bpm: 122,
  layers: [
    { role: "lead", wave: "square", gain: 0.34, pattern: [
      { n: "A4", d: 2 }, { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "A4", d: 2 }, { n: "E4", d: 4 },
      { n: "G4", d: 2 }, { n: "B4", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "B4", d: 2 }, { n: "G4", d: 2 }, { n: "D4", d: 2 },
    ] },
    { role: "harmony", wave: "square", gain: 0.14, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "A3", d: 2 }, { n: 0, d: 2 }, { n: "E3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.48, pattern: [{ n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "E2", d: 2 }, { n: "E2", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class SnipEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private mode: "swing" | "fly" | "result" = "swing";
  private ang = 0.9; private angVel = 0; private L = 62;
  private fx = PX; private fy = PY + 62; private fvx = 0; private fvy = 0;
  private beads: Bead[] = []; private jarX = PX; private jarW = 30; private jarDir = 0; private jarSpd = 0;
  private level = 1; private score = 0; private lives = 3; private combo = 1; private caught = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private resultT = 0; private lastWin = false; private flash = 0; private buttonColor = "#ff5d7d";

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.setupLevel();
    this.start();
  }
  protected onGesture() { this.music?.play(SNIP_THEME); }

  private setupLevel() {
    this.mode = "swing"; this.ang = 0.9 + this.rnd() * 0.2; this.angVel = 0; this.L = 56 + this.rnd() * 14;
    this.jarW = Math.max(20, 34 - this.level); this.jarX = 40 + this.rnd() * (LW - 80);
    this.jarDir = this.level >= 4 ? (this.rnd() < 0.5 ? -1 : 1) : 0; this.jarSpd = 20 + this.level * 6;
    this.buttonColor = ["#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650", "#b79bff"][Math.floor(this.rnd() * 5)];
    // beads along a plausible arc between pivot and jar
    this.beads = []; this.caught = 0;
    for (let i = 0; i < 3; i++) { const t = 0.3 + i * 0.28; const bx = PX + (this.jarX - PX) * t + (this.rnd() - 0.5) * 30; const by = 55 + i * 30 + (this.rnd() - 0.5) * 14; this.beads.push({ x: bx, y: Math.min(FLOOR - 20, by), got: false }); }
  }
  private beginGame() { this.level = 1; this.score = 0; this.lives = 3; this.combo = 1; this.setupLevel(); this.clearFx(); this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.level, combo: this.combo }); }

  private snip() {
    // tangential launch velocity from the pendulum
    this.fx = PX + Math.sin(this.ang) * this.L; this.fy = PY + Math.cos(this.ang) * this.L;
    this.fvx = Math.cos(this.ang) * this.angVel * this.L; this.fvy = -Math.sin(this.ang) * this.angVel * this.L;
    this.mode = "fly"; this.tone(660, 0.05, "square", 0.05); this.buzz(6);
    this.fxBurst(PX, PY, "#c3b4de", 4, 40);
  }
  private win() { const bonus = 100 + this.caught * 50; const perfect = this.caught === 3; const gain = (bonus + (perfect ? 150 : 0)) * this.combo; this.score += gain; this.lastWin = true; if (perfect) this.combo = Math.min(4, this.combo + 1); this.fxRing(this.jarX, FLOOR - 8, "#33e650", 30); this.fxPop(this.jarX, FLOOR - 20, (perfect ? "PERFECT +" : "+") + gain, perfect ? "#ffd24a" : "#33e650"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(1.4); this.hitstop(0.04); this.tone(880, 0.08, "square", 0.05); this.level++; this.mode = "result"; this.resultT = 0.9; this.report(); }
  private miss() { this.lives--; this.combo = 1; this.lastWin = false; this.flash = 1; this.addShake(3); this.buzz(60); this.noise(0.12, 0.05); this.tone(160, 0.16, "square", 0.05); this.fxShards(this.fx, this.fy, this.buttonColor, 6); if (this.lives <= 0) this.gameOver(); else { this.mode = "result"; this.resultT = 0.7; } this.report(); }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.state !== "play") { if (this.pressed.a || this.pointer.down) this.beginGame(); return; }
    // jar slide
    if (this.jarDir) { this.jarX += this.jarDir * this.jarSpd * dt; if (this.jarX > LW - 30 - this.jarW / 2) { this.jarX = LW - 30 - this.jarW / 2; this.jarDir = -1; } if (this.jarX < 30 + this.jarW / 2) { this.jarX = 30 + this.jarW / 2; this.jarDir = 1; } }

    if (this.mode === "swing") {
      const angAcc = -(420 / this.L) * Math.sin(this.ang); this.angVel += angAcc * dt; this.angVel *= 0.999; this.ang += this.angVel * dt;
      if (this.pressed.a) this.snip();
    } else if (this.mode === "fly") {
      this.fvy += 320 * dt; this.fx += this.fvx * dt; this.fy += this.fvy * dt;
      for (const b of this.beads) if (!b.got && Math.hypot(b.x - this.fx, b.y - this.fy) < 9) { b.got = true; this.caught++; this.score += 25; this.fxBurst(b.x, b.y, "#ffd24a", 8, 70); this.fxPop(b.x, b.y - 6, "+25", "#ffd24a"); this.tone(1046, 0.05, "square", 0.04); }
      // jar catch
      if (this.fvy > 0 && this.fy > FLOOR - 14 && this.fy < FLOOR && Math.abs(this.fx - this.jarX) < this.jarW / 2) { this.win(); return; }
      if (this.fy > FLOOR || this.fx < -8 || this.fx > LW + 8) { this.miss(); return; }
    } else if (this.mode === "result") { this.resultT -= dt; if (this.resultT <= 0) this.setupLevel(); }
  }

  // ---- draw ----
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1520" : "#241a30", "#120a1a");
    // fabric texture backdrop
    for (let y = 12; y < LH; y += 8) this.rect(0, y, LW, 1, "#ffffff08");
    for (let x = 6; x < LW; x += 8) this.rect(x, 12, 1, LH - 12, "#ffffff06");
    // floor / cutting table
    this.shelf(0, FLOOR, LW, LH - FLOOR, "#3a2f2a");
    // pivot (spool)
    this.disc(PX, PY, 4, "#8a5a2c"); this.ring(PX, PY, 4, "#c98a44", 1.4);

    // beads (loose)
    for (const b of this.beads) if (!b.got) { this.ring(b.x | 0, b.y | 0, 4, "#ffd24a", 1.4); this.disc(b.x | 0, b.y | 0, 2, "#ffec9a"); }

    // button + thread
    let bx = this.fx, by = this.fy;
    if (this.mode === "swing") { bx = PX + Math.sin(this.ang) * this.L; by = PY + Math.cos(this.ang) * this.L; this.line(PX, PY, bx | 0, by | 0, "#c3b4de"); }
    else if (this.mode === "fly") { const wig = Math.sin(this.fy * 0.3) * 2; this.line((bx - this.fvx * 0.04) | 0, (by - this.fvy * 0.04) | 0, (bx + wig) | 0, by | 0, "#c3b4de88"); }
    if (this.mode !== "result" || this.lastWin === false) { this.button(bx | 0, by | 0, this.buttonColor); }

    // jar (notions)
    this.rect(this.jarX - this.jarW / 2, FLOOR - 12, this.jarW, 12, "#2a3550"); this.rect(this.jarX - this.jarW / 2, FLOOR - 12, this.jarW, 2, "#4a6a9a"); this.rect(this.jarX - this.jarW / 2 - 2, FLOOR - 14, this.jarW + 4, 3, "#5a7aaa"); this.text(this.jarX - 6, FLOOR - 9, "JAR", "#7be0ff", 1, false);

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#e6ddf5", 1, false);
    this.text(130, 3, "LVL " + this.level, "#c3b4de", 1, false);
    if (this.combo > 1) this.text(170, 3, "x" + this.combo, "#ffd24a", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2a3a");
    if (this.mode === "result" && this.lastWin) this.textCenter(FLOOR + 4, "NICE STITCH!", "#33e650", 1);

    if (this.state !== "play") this.overlay();
  }
  private button(x: number, y: number, c: string) { this.disc(x, y, 5, c); this.ring(x, y, 5, shade(c, -0.3), 1.2); this.px(x - 1, y - 1, "#0a0714"); this.px(x + 1, y - 1, "#0a0714"); this.px(x - 1, y + 1, "#0a0714"); this.px(x + 1, y + 1, "#0a0714"); }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "SNIP", "#ff8ab5", 2);
      this.textCenter(64, "CUT THE THREAD AT THE RIGHT TIME", "#c3b4de", 1);
      this.textCenter(84, "THE BUTTON FLIES OFF ON A TANGENT", "#83769c", 1);
      this.textCenter(96, "DROP IT IN THE JAR - GRAB THE BEADS", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS SNIP TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "UNRAVELLED!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "REACHED LEVEL " + this.level, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS SNIP TO RETRY", "#ffec27", 1);
    }
  }
}
