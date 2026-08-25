// punch-list-engine — Main Street cabinet (Punch-Out homage). A boxing gym sparring
// bout: read the opponent's tell, DODGE left or right the instant they wind up, then
// bury a counter in the opening. Whiff the dodge and you eat the punch. String clean
// dodges to charge a STAR, then unload a haymaker. Signature twist: a perfect dodge +
// counter is a stamina-restoring flurry. Drop three sparring partners of rising skill.
// Corners: Rookie -> Contender -> Champ. RetroEngine + juice + MusicKit; dodge + jab.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "punch_best";

interface Foe { name: string; hp: number; maxHp: number; windup: number; color: string }
const FOES: Foe[] = [
  { name: "ROOKIE", hp: 60, maxHp: 60, windup: 0.85, color: "#5a8a4a" },
  { name: "CONTENDER", hp: 90, maxHp: 90, windup: 0.62, color: "#8a5a4a" },
  { name: "CHAMP", hp: 130, maxHp: 130, windup: 0.46, color: "#8a4a6a" },
];

const PUNCH_THEME: Track = {
  bpm: 148,
  layers: [
    { role: "lead", wave: "square", gain: 0.3, pattern: [
      { n: "E5", d: 1 }, { n: "E5", d: 1 }, { n: "B4", d: 1 }, { n: "E5", d: 1 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "B4", d: 2 },
      { n: "C5", d: 1 }, { n: "E5", d: 1 }, { n: "A5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 4 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "E2", d: 1 }, { n: "E2", d: 1 }, { n: "E3", d: 1 }, { n: "E2", d: 1 }, { n: "A2", d: 1 }, { n: "A2", d: 1 }, { n: "A3", d: 1 }, { n: "A2", d: 1 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 1 }, { n: "H", d: 1 }] },
  ],
};

export class PunchListEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private phase: "idle" | "windup" | "open" | "hurt" | "ko" = "idle";
  private foeN = 0; private foe: Foe = { ...FOES[0] }; private hp = 100; private stamina = 100; private star = 0;
  private tell: "left" | "right" = "left"; private dodgeSide: "left" | "right" | null = null; private avoided = false;
  private timer = 0; private score = 0; private combo = 0; private phase_t = 0; private shakeP = 0; private dodgeVis = 0;
  private best = +(LS.get(BEST_KEY) || 0); private flash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.start();
  }
  protected onGesture() { this.music?.play(PUNCH_THEME); }

  private nextFoe() { this.foeN = Math.min(FOES.length - 1, this.foeN); this.foe = { ...FOES[this.foeN] }; this.phase = "idle"; this.timer = 0.8; this.dodgeSide = null; this.avoided = false; }
  private beginGame() { this.foeN = 0; this.hp = 100; this.stamina = 100; this.star = 0; this.score = 0; this.combo = 0; this.nextFoe(); this.clearFx(); this.state = "play"; this.music?.setIntensity(0.7); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.foeN + 1 }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: Math.ceil(this.hp / 34), shift: this.foeN + 1, combo: this.star }); }

  private takeHit() { this.hp -= 18; this.combo = 0; this.star = Math.max(0, this.star - 1); this.flash = 1; this.addShake(5); this.hitstop(0.06); this.buzz(100); this.shakeP = 1; this.noise(0.18, 0.06); this.tone(150, 0.18, "square", 0.05); this.fxPop(60, 90, "HIT!", "#ff5d7d"); if (this.hp <= 0) { this.hp = 0; this.gameOver(); } else { this.phase = "idle"; this.timer = 0.7; } this.report(); }
  private land(power: number, label: string) { const star = this.star >= 3; const dmg = star ? 45 : power; this.foe.hp -= dmg; this.combo++; this.score += dmg * 2 * (this.avoided ? 2 : 1); this.stamina = Math.min(100, this.stamina + (this.avoided ? 10 : 3)); if (star) this.star = 0; this.fxBurst(160, 80, star ? "#ffd24a" : "#33e650", star ? 16 : 8, 90); this.fxPop(160, 66, star ? "STAR PUNCH! -" + dmg : label + " -" + dmg, star ? "#ffd24a" : "#33e650"); this.addShake(star ? 4 : 1.5); this.hitstop(0.04); this.tone(star ? 300 : 660, 0.06, "square", 0.05); this.tone(star ? 900 : 1046, 0.08, "square", 0.05);
    if (this.foe.hp <= 0) { this.foe.hp = 0; this.knockout(); } }
  private knockout() { this.phase = "ko"; this.phase_t = 1.6; this.score += 500; this.fxRing(160, 80, "#ffd24a", 80); this.fxPop(LW / 2, 60, "K.O.!  +500", "#ffd24a", 2); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(4); this.report(); }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.shakeP = Math.max(0, this.shakeP - dt * 4); this.dodgeVis = Math.max(0, this.dodgeVis - dt * 4);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }

    // dodge input any time; remembered for the strike resolve
    if (this.pressed.left) { this.dodgeSide = "left"; this.dodgeVis = 1; this.tone(500, 0.03, "square", 0.03); }
    if (this.pressed.right) { this.dodgeSide = "right"; this.dodgeVis = 1; this.tone(500, 0.03, "square", 0.03); }

    this.timer -= dt; this.phase_t = Math.max(0, this.phase_t - dt);
    if (this.phase === "idle") { if (this.timer <= 0) { this.tell = this.rnd() < 0.5 ? "left" : "right"; this.dodgeSide = null; this.phase = "windup"; this.timer = this.foe.windup; this.tone(300, 0.05, "square", 0.04); } }
    else if (this.phase === "windup") { if (this.timer <= 0) { // strike resolves
        // correct dodge = dodge to the side the punch is telegraphed toward (lean away)
        const correct = this.dodgeSide === this.tell;
        if (correct) { this.avoided = true; this.star = Math.min(4, this.star + 1); this.phase = "open"; this.timer = 0.95; this.fxPop(60, 80, "DODGE!", "#7be0ff"); this.tone(880, 0.05, "square", 0.05); }
        else { this.takeHit(); }
      } }
    else if (this.phase === "open") { if (this.pressed.a) { this.land(20, "COUNTER"); this.avoided = false; this.phase = "idle"; this.timer = 0.6; } else if (this.timer <= 0) { this.avoided = false; this.phase = "idle"; this.timer = 0.7; } }
    else if (this.phase === "ko") { if (this.phase_t <= 0) { this.foeN++; if (this.foeN >= FOES.length) { this.score += 1000; this.gameOver(); return; } this.nextFoe(); } }

    // free jab when opponent idle (chip damage, no counter risk here — small)
    if (this.phase === "idle" && this.pressed.a && this.timer > 0.15) { this.foe.hp -= 4; this.score += 4; this.fxPop(160, 76, "jab", "#c3b4de"); this.tone(700, 0.03, "square", 0.03); if (this.foe.hp <= 0) { this.foe.hp = 0; this.knockout(); } }
    this.report();
  }

  // ---- draw ----
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#5a2020" : "#2a1a2a", "#120a12");
    // ring
    this.rect(10, 120, LW - 20, 4, "#8a8276"); this.rect(10, 40, LW - 20, 2, "#5a5f6a");
    for (let x = 20; x < LW; x += 40) this.rect(x, 40, 2, 84, "#3a3f4a");
    // opponent (facing player, back to us)
    const ox = 120 + (this.phase === "windup" ? (this.tell === "left" ? -6 : 6) * (1 - this.timer / this.foe.windup) : 0);
    const oy = 78 + (this.shakeP > 0 ? Math.sin(this.tSec() * 40) * 2 : 0);
    if (this.phase !== "ko") { this.ball(ox | 0, oy | 0, 16, this.foe.color); this.rect((ox | 0) - 16, (oy | 0) + 10, 32, 20, shade(this.foe.color, -0.15)); // body
      // gloves (telegraph)
      const gl = this.phase === "windup" ? (this.tell === "left" ? -1 : 1) : 0;
      this.disc((ox | 0) - 14 + (gl < 0 ? -6 : 0), (oy | 0) + 16, 5, "#c0343a"); this.disc((ox | 0) + 14 + (gl > 0 ? 6 : 0), (oy | 0) + 16, 5, "#c0343a");
      this.rect((ox | 0) - 6, (oy | 0) - 4, 3, 3, "#0a0714"); this.rect((ox | 0) + 3, (oy | 0) - 4, 3, 3, "#0a0714");
      if (this.phase === "windup") { const c = "#ffd24a"; if (this.tell === "left") { this.text((ox | 0) - 30, oy | 0, "<", c, 2, false); } else { this.text((ox | 0) + 24, oy | 0, ">", c, 2, false); } }
    } else { this.rect((ox | 0) - 16, (oy | 0) + 20, 32, 8, this.foe.color); this.textCenter(70, "DOWN!", "#ffd24a", 1); }
    // player (foreground, back of head/gloves)
    const px = 120 + (this.dodgeSide === "left" && this.dodgeVis > 0 ? -22 : this.dodgeSide === "right" && this.dodgeVis > 0 ? 22 : 0);
    this.ball(px | 0, 150, 14, "#3bb6ff"); this.disc((px | 0) - 12, 138, 5, "#c0343a"); this.disc((px | 0) + 12, 138, 5, "#c0343a");

    this.drawFx();

    // HUD: bars
    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#e6ddf5", 1, false);
    this.text(150, 3, this.foe.name, "#ff8ab5", 1, false);
    // opponent hp
    this.rect(60, 16, 120, 5, "#2a2438"); this.rect(60, 16, Math.round(120 * Math.max(0, this.foe.hp) / this.foe.maxHp), 5, "#ff5d7d"); this.text(40, 15, "FOE", "#ff5d7d", 1, false);
    // your hp
    this.rect(60, LH - 14, 80, 5, "#2a2438"); this.rect(60, LH - 14, Math.round(80 * this.hp / 100), 5, "#33e650"); this.text(40, LH - 15, "YOU", "#33e650", 1, false);
    // stars
    for (let i = 0; i < 4; i++) this.disc(150 + i * 10, LH - 12, 3, i < this.star ? "#ffd24a" : "#3a3040");

    if (this.state !== "play") this.overlay();
  }
  private tSec() { return performance.now() / 1000; }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "PUNCH LIST", "#ff8ab5", 2);
      this.textCenter(64, "READ THE TELL - DODGE THE PUNCH", "#c3b4de", 1);
      this.textCenter(84, "DODGE THE WAY THE ARROW POINTS", "#83769c", 1);
      this.textCenter(96, "THEN JAB THE OPENING - CHARGE A STAR", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 24, "PRESS JAB TO START", "#ffec27", 1);
    } else {
      this.textCenter(50, "T.K.O.", "#ff5d7d", 2);
      this.textCenter(76, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(90, "BEST " + this.best, "#ffd24a", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 24, "PRESS JAB TO RETRY", "#ffec27", 1);
    }
  }
}
