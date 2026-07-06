// gumball-engine — Main Street cabinet (Kaboom! homage). A candy shop: the gumball
// machine up top rattles back and forth spitting out sweets — slide your jar to catch
// every falling gumball before it shatters on the floor, but DODGE the sour bombs (a
// mouthful of those and you're done). Signature twist: a rainbow JAWBREAKER is worth
// big and a clean catch-streak builds a SUGAR RUSH multiplier. It all speeds up as the
// jar fills. Three drops (or one sour) ends it. RetroEngine + juice + MusicKit; slide.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "gumball_best";
const JARY = 150;
const CANDY = ["#ff5d7d", "#3bb6ff", "#ffd24a", "#33e650", "#b79bff", "#ff8a3d"];

interface Drop { x: number; y: number; vy: number; type: "candy" | "sour" | "jack"; color: string }

const GUM_THEME: Track = {
  bpm: 140,
  layers: [
    { role: "lead", wave: "square", gain: 0.34, pattern: [
      { n: "E5", d: 1 }, { n: "G5", d: 1 }, { n: "A5", d: 1 }, { n: "G5", d: 1 }, { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 2 },
      { n: "C5", d: 1 }, { n: "E5", d: 1 }, { n: "G5", d: 2 }, { n: "F5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 },
    ] },
    { role: "harmony", wave: "square", gain: 0.14, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "C4", d: 2 }, { n: 0, d: 2 }, { n: "G3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.48, pattern: [{ n: "C3", d: 1 }, { n: "C3", d: 1 }, { n: "G2", d: 1 }, { n: "G2", d: 1 }, { n: "A2", d: 1 }, { n: "A2", d: 1 }, { n: "F2", d: 1 }, { n: "F2", d: 1 }] },
    { role: "drums", minIntensity: 0.3, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }] },
  ],
};

export class GumballEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private jarX = LW / 2; private jarW = 32;
  private drops: Drop[] = []; private dispX = LW / 2; private dispDir = 1; private dispSpd = 60; private spawnT = 0.8;
  private level = 1; private score = 0; private lives = 3; private combo = 0; private caught = 0;
  private best = +(LS.get(BEST_KEY) || 0); private flash = 0; private jarFlash = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.start();
  }
  protected onGesture() { this.music?.play(GUM_THEME); }

  private beginGame() { this.jarX = LW / 2; this.drops = []; this.dispX = LW / 2; this.dispSpd = 60; this.spawnT = 0.6; this.level = 1; this.score = 0; this.lives = 3; this.combo = 0; this.caught = 0; this.state = "play"; this.clearFx(); this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: this.level }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.level, combo: this.combo }); }
  private loseLife(reason: string) { this.lives--; this.combo = 0; this.flash = 1; this.addShake(4); this.hitstop(0.05); this.buzz(80); this.noise(0.12, 0.05); this.tone(150, 0.16, "square", 0.05); this.fxPop(this.jarX, JARY - 14, reason, "#ff5d7d"); if (this.lives <= 0) this.gameOver(); else this.report(); }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.jarFlash = Math.max(0, this.jarFlash - dt * 5);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }

    // jar move
    if (this.btn.left) this.jarX -= 200 * dt; if (this.btn.right) this.jarX += 200 * dt;
    this.jarX = Math.max(this.jarW / 2, Math.min(LW - this.jarW / 2, this.jarX));

    // dispenser
    this.dispX += this.dispDir * this.dispSpd * dt; if (this.dispX > LW - 24) { this.dispX = LW - 24; this.dispDir = -1; } if (this.dispX < 24) { this.dispX = 24; this.dispDir = 1; }
    this.spawnT -= dt;
    if (this.spawnT <= 0) { const r = this.rnd(); const type = r < 0.18 ? "sour" : r < 0.24 ? "jack" : "candy"; this.drops.push({ x: this.dispX, y: 28, vy: 60 + this.level * 8, type, color: type === "sour" ? "#8a5a9a" : type === "jack" ? "#ffffff" : CANDY[Math.floor(this.rnd() * CANDY.length)] }); this.spawnT = Math.max(0.35, 0.9 - this.level * 0.04) * (0.7 + this.rnd() * 0.6); this.tone(700, 0.03, "square", 0.03); }

    // drops fall
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]; d.y += d.vy * dt;
      if (d.y >= JARY - 6 && d.y <= JARY + 4 && Math.abs(d.x - this.jarX) < this.jarW / 2) {
        // caught
        this.drops.splice(i, 1); this.jarFlash = 1;
        if (d.type === "sour") { this.loseLife("SOUR!"); if ((this.state as string) !== "play") return; }
        else { const base = d.type === "jack" ? 150 : 20; this.combo++; this.caught++; const gain = base * Math.max(1, Math.floor(this.combo / 3) + 1); this.score += gain; this.fxBurst(d.x, JARY - 4, d.color, d.type === "jack" ? 14 : 6, 80); this.fxPop(d.x, JARY - 14, (d.type === "jack" ? "JAWBREAKER +" : "+") + gain, d.type === "jack" ? "#ffd24a" : d.color); this.tone(880 + this.combo * 20, 0.05, "square", 0.04); if (d.type === "jack") { this.fxRing(d.x, JARY - 4, "#ffd24a", 24); this.addShake(1.2); } if (this.caught % 12 === 0) { this.level++; this.fxPop(LW / 2, 60, "SUGAR RUSH!", "#ff8ab5", 1); } this.report(); }
      } else if (d.y > LH + 6) {
        this.drops.splice(i, 1);
        if (d.type === "candy" || d.type === "jack") { this.fxBurst(d.x, LH - 2, d.color, 4, 50); this.loseLife("DROPPED!"); if ((this.state as string) !== "play") return; }
      }
    }
    this.report();
  }

  // ---- draw ----
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1520" : "#3a1a3a", "#160a18");
    // candy-stripe walls
    for (let y = 12; y < LH; y += 10) this.rect(0, y, LW, 4, "#ff8ab520");
    // dispenser (gumball machine)
    this.disc(this.dispX | 0, 20, 12, "#ff5d7d"); this.ring(this.dispX | 0, 20, 12, "#c94f6c", 1.4);
    for (let i = 0; i < 6; i++) { const a = i * 1.05, r = 6; this.px((this.dispX + Math.cos(a) * r) | 0, (20 + Math.sin(a) * r) | 0, CANDY[i]); }
    this.rect((this.dispX | 0) - 5, 30, 10, 4, "#8a5a9a");
    // drops
    for (const d of this.drops) { if (d.type === "sour") { this.disc(d.x | 0, d.y | 0, 5, "#8a5a9a"); this.rect((d.x | 0) - 1, (d.y | 0) - 8, 2, 4, "#ffd24a"); this.px((d.x | 0), (d.y | 0) - 9, "#ff8a3d"); } else if (d.type === "jack") { this.ball(d.x | 0, d.y | 0, 5, "#ffffff"); for (let i = 0; i < 4; i++) this.px((d.x | 0) + [-2, 2, -2, 2][i], (d.y | 0) + [-2, -2, 2, 2][i], CANDY[i]); } else { this.ball(d.x | 0, d.y | 0, 4, d.color); this.px((d.x | 0) - 1, (d.y | 0) - 1, "#ffffffb0"); } }
    // jar
    const jx = this.jarX, c = this.jarFlash > 0 ? "#7be0ff" : "#bfe4f0";
    this.rect(jx - this.jarW / 2, JARY, this.jarW, 22, "#2a3550aa"); this.rect(jx - this.jarW / 2, JARY, this.jarW, 3, c); this.rect(jx - this.jarW / 2 - 2, JARY - 2, this.jarW + 4, 3, c);
    // caught candy piling (visual)
    for (let i = 0; i < Math.min(8, this.caught % 9); i++) this.disc((jx - this.jarW / 2 + 5 + (i % 4) * 7) | 0, JARY + 16 - Math.floor(i / 4) * 5, 2, CANDY[i % CANDY.length]);

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#ffe6f5", 1, false);
    this.text(150, 3, "RUSH " + this.level, "#ff8ab5", 1, false);
    if (this.combo > 2) this.text(112, 3, "x" + (Math.floor(this.combo / 3) + 1), "#ffd24a", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2a3a");

    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "GUMBALL", "#ff8ab5", 2);
      this.textCenter(64, "CATCH THE CANDY IN YOUR JAR", "#c3b4de", 1);
      this.textCenter(84, "DODGE THE SOUR BOMBS", "#83769c", 1);
      this.textCenter(96, "GRAB THE RAINBOW JAWBREAKER", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A DIRECTION TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "GAME OVER", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "CAUGHT " + this.caught, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A DIRECTION TO RETRY", "#ffec27", 1);
    }
    void shade;
  }
}
