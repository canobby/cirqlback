// sudsy-engine — Main Street cabinet (Track & Field homage). A car wash: a grimy car
// rolls into the bay and you SCRUB it clean before it rolls out the far end. Alternate
// the two scrub buttons — left, right, left, right — as fast as you can; the cleaner
// the alternating rhythm, the harder you scrub. Signature twist: a steady RHYTHM
// streak multiplies your scrub power; erratic mashing drops it. Finish with time to
// spare for a bigger tip. Three that roll out dirty and your shift's over. Bays: Quick
// Wash -> Full Detail -> Showroom. RetroEngine + juice + MusicKit; two-button scrub.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "sudsy_best";

interface Bay { name: string; sky: [string, string]; dirt: number; time: number }
const BAYS: Bay[] = [
  { name: "QUICK WASH", sky: ["#1a2a3a", "#0c1420"], dirt: 1, time: 6 },
  { name: "FULL DETAIL", sky: ["#2a1a3a", "#120a1e"], dirt: 1.3, time: 6.5 },
  { name: "SHOWROOM", sky: ["#1a2a2a", "#0a1614"], dirt: 1.6, time: 7 },
];
const CAR_COLORS = ["#e2544f", "#3bb6ff", "#ffd24a", "#33e650", "#b79bff", "#ff8a3d"];

const SUDSY_THEME: Track = {
  bpm: 150,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "C5", d: 1 }, { n: "E5", d: 1 }, { n: "G5", d: 1 }, { n: "E5", d: 1 }, { n: "F5", d: 1 }, { n: "A5", d: 1 }, { n: "G5", d: 2 },
      { n: "C5", d: 1 }, { n: "D5", d: 1 }, { n: "E5", d: 1 }, { n: "D5", d: 1 }, { n: "C5", d: 2 }, { n: "G4", d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "C3", d: 1 }, { n: "C3", d: 1 }, { n: "G2", d: 1 }, { n: "G2", d: 1 }, { n: "F2", d: 1 }, { n: "F2", d: 1 }, { n: "G2", d: 1 }, { n: "G2", d: 1 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 1 }, { n: "H", d: 1 }] },
  ],
};

export class SudsyEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private dirt = 1; private timer = 6; private carX = -30; private carColor = CAR_COLORS[0]; private carState: "in" | "wash" | "out" = "in";
  private lastBtn = 0; private streak = 0; private rhythm = 0; private lastTapT = 0; private scrubAnim = 0;
  private bayN = 0; private washed = 0; private score = 0; private strikes = 0; private combo = 0;
  private best = +(LS.get(BEST_KEY) || 0); private intro = 0; private card = ""; private flash = 0; private tNow = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.nextCar(true);
    this.start();
  }
  protected onGesture() { this.music?.play(SUDSY_THEME); }
  private bay() { return BAYS[this.bayN]; }

  private nextCar(first = false) {
    this.bayN = Math.min(BAYS.length - 1, Math.floor(this.washed / 4));
    const b = this.bay();
    this.dirt = b.dirt + this.washed * 0.05; this.timer = b.time; this.carColor = CAR_COLORS[Math.floor(this.rnd() * CAR_COLORS.length)];
    this.carX = -30; this.carState = "in"; this.rhythm = 0; this.streak = 0; this.lastBtn = 0;
    if (!first && this.washed % 4 === 0) { this.card = b.name; this.intro = 1.1; }
  }
  private beginGame() { this.washed = 0; this.score = 0; this.strikes = 0; this.combo = 0; this.bayN = 0; this.nextCar(true); this.clearFx(); this.intro = 1.2; this.card = "QUICK WASH"; this.state = "play"; this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: this.bayN + 1 }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: 3 - this.strikes, shift: this.bayN + 1, combo: this.combo }); }

  private finishCar() { const tip = Math.round(this.timer * 20); const gain = (100 + tip) * Math.max(1, this.combo); this.combo++; this.score += gain; this.washed++; this.carState = "out"; this.fxRing(120, 96, "#7be0ff", 30); this.fxPop(120, 80, (this.combo > 2 ? "STREAK +" : "SPARKLING! +") + gain, "#33e650"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(1.4); this.hitstop(0.04); this.tone(880, 0.08, "square", 0.05); this.tone(1318, 0.1, "square", 0.05); this.report(); }
  private strikeOut() { this.strikes++; this.combo = 0; this.flash = 1; this.addShake(3); this.buzz(70); this.noise(0.12, 0.05); this.tone(160, 0.16, "square", 0.05); this.fxPop(120, 80, "ROLLED OUT DIRTY!", "#ff5d7d"); this.carState = "out"; if (this.strikes >= 3) this.gameOver(); else this.report(); }

  private scrub(btn: number) {
    if (this.carState !== "wash") return;
    const good = this.lastBtn !== 0 && btn !== this.lastBtn;
    const dtTap = this.tNow - this.lastTapT; this.lastTapT = this.tNow;
    // rhythm: reward alternation at a steady, quick cadence
    if (good && dtTap < 0.35) { this.rhythm = Math.min(1, this.rhythm + 0.12); this.streak++; } else { this.rhythm = Math.max(0, this.rhythm - 0.2); if (!good) this.streak = 0; }
    this.lastBtn = btn;
    const power = 0.05 * (1 + this.rhythm * 1.5) * (good ? 1 : 0.4);
    this.dirt = Math.max(0, this.dirt - power); this.scrubAnim = 1;
    this.fxBurst(60 + this.rnd() * 100, 80 + this.rnd() * 24, "#dff2ff", 2, 40); this.noise(0.02, 0.02); this.tone(500 + this.streak * 20, 0.02, "square", 0.03); this.buzz(3);
    if (this.dirt <= 0) this.finishCar();
  }

  protected update(dt: number) {
    this.tNow += dt; this.flash = Math.max(0, this.flash - dt * 3); this.scrubAnim = Math.max(0, this.scrubAnim - dt * 6); this.rhythm = Math.max(0, this.rhythm - dt * 0.25);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.b || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }

    if (this.pressed.a) this.scrub(1);
    if (this.pressed.b) this.scrub(2);

    if (this.carState === "in") { this.carX += 140 * dt; if (this.carX >= 90) { this.carX = 90; this.carState = "wash"; } }
    else if (this.carState === "wash") { this.timer -= dt; if (this.timer <= 0) this.strikeOut(); }
    else if (this.carState === "out") { this.carX += 160 * dt; if (this.carX > LW + 40) this.nextCar(); }
    this.report();
  }

  // ---- draw ----
  protected render() {
    const b = this.bay();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2020" : b.sky[0], b.sky[1]);
    // wash bay structure
    this.rect(0, 40, LW, 6, "#3a4552"); this.rect(30, 40, 6, LH - 40, "#3a4552"); this.rect(LW - 36, 40, 6, LH - 40, "#3a4552");
    this.rect(0, LH - 24, LW, 24, "#2a2f3a"); for (let x = 0; x < LW; x += 12) this.rect(x, LH - 24, 6, 2, "#1a1f28");
    // brushes (spin when scrubbing)
    const bs = this.scrubAnim > 0 ? Math.floor(this.tNow * 30) % 2 : 0;
    for (const bx of [44, LW - 50]) { this.rect(bx, 50, 8, LH - 74, "#5a4f6a"); for (let y = 54; y < LH - 26; y += 6) this.rect(bx - 2 + bs * 2, y, 12, 3, "#7a6f8a"); }

    // the car
    const cx = this.carX, cy = 112;
    if (this.carX > -30) {
      this.rect(cx - 22, cy - 8, 44, 14, this.carColor); this.rect(cx - 14, cy - 16, 28, 8, shade(this.carColor, -0.1)); this.rect(cx - 10, cy - 14, 20, 5, "#bfe6ff"); this.disc(cx - 12, cy + 6, 5, "#1a1a22"); this.disc(cx + 12, cy + 6, 5, "#1a1a22");
      // dirt overlay (fades as cleaned)
      if (this.carState !== "out") { this.b.globalAlpha = Math.min(0.7, this.dirt * 0.5); for (let i = 0; i < 30; i++) this.px(cx - 20 + (i * 37) % 40, cy - 14 + (i * 53) % 20, "#5a4a2a"); this.b.globalAlpha = 1; }
      // suds
      if (this.carState === "wash" && this.scrubAnim > 0) for (let i = 0; i < 6; i++) this.disc(cx - 18 + this.rnd() * 36, cy - 12 + this.rnd() * 18, 2, "#ffffffcc");
    }

    this.drawFx();

    // HUD
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#dff2ff", 1, false);
    this.text(150, 3, b.name, "#7be0ff", 1, false);
    if (this.combo > 1) this.text(112, 3, "x" + this.combo, "#ffd24a", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < 3 - this.strikes ? "#ff5d7d" : "#3a2a2a");
    // dirt + timer bars
    if (this.carState === "wash") {
      this.text(6, 20, "DIRT", "#c98a54", 1, false); this.rect(34, 21, 60, 5, "#2a2438"); this.rect(34, 21, Math.round(60 * Math.min(1, this.dirt)), 5, "#8a5a2c");
      this.text(6, 30, "TIME", "#ffd24a", 1, false); this.rect(34, 31, 60, 5, "#2a2438"); this.rect(34, 31, Math.round(60 * this.timer / this.bay().time), 5, this.timer < 2 ? "#ff5d7d" : "#33e650");
      this.text(150, 20, "RHYTHM", "#33e650", 1, false); this.rect(150, 30, 60, 5, "#2a2438"); this.rect(150, 30, Math.round(60 * this.rhythm), 5, "#33e650");
    }

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 76, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(86, this.card, "#7be0ff", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "SUDSY", "#7be0ff", 2);
      this.textCenter(64, "SCRUB THE CAR BEFORE IT ROLLS OUT", "#c3b4de", 1);
      this.textCenter(84, "ALTERNATE THE SCRUB BUTTONS FAST", "#83769c", 1);
      this.textCenter(96, "A STEADY RHYTHM SCRUBS HARDER", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A SCRUB TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "SHIFT OVER!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "WASHED " + this.washed, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A SCRUB TO RETRY", "#ffec27", 1);
    }
  }
}
