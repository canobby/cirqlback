// harvest-moonlight-engine — Main Street cabinet (1942 homage). A farm-supply crop
// duster: fly the moonlit fields blasting the swarms of crop-pests that dive at you in
// weaving formations. Hold FIRE, weave the incoming bombs, and pop a SPRAY to clear
// the screen in a pinch (limited tanks). Signature twist: down a whole formation
// without a miss for a HARVEST combo, and a big BOSS thresher rolls in each wave.
// Fields: Wheat -> Orchard -> Moonlit Acres. RetroEngine + juice + MusicKit; move +
// fire + spray.

import { RetroEngine, shade, type RetroHooks, LS, TAU } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "harvest_best";

interface Bullet { x: number; y: number; vy: number; enemy: boolean }
interface Pest { x: number; y: number; t: number; ph: number; hp: number; boss: boolean; fireCd: number; spd: number }

const HARVEST_THEME: Track = {
  bpm: 146,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "D5", d: 2 }, { n: "A4", d: 2 }, { n: "D5", d: 1 }, { n: "F5", d: 1 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "A4", d: 4 },
      { n: "C5", d: 2 }, { n: "G4", d: 2 }, { n: "C5", d: 1 }, { n: "E5", d: 1 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "G4", d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "D2", d: 1 }, { n: "D2", d: 1 }, { n: "D3", d: 1 }, { n: "D2", d: 1 }, { n: "A2", d: 1 }, { n: "A2", d: 1 }, { n: "A3", d: 1 }, { n: "A2", d: 1 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 1 }, { n: "H", d: 1 }] },
  ],
};

export class HarvestMoonlightEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private hx = LW / 2; private py = LH - 26; private fireCd = 0;
  private bullets: Bullet[] = []; private pests: Pest[] = []; private stars: [number, number][] = [];
  private wave = 1; private field = 0; private score = 0; private lives = 3; private sprays = 3; private combo = 0; private missed = false;
  private best = +(LS.get(BEST_KEY) || 0); private intro = 0; private card = ""; private flash = 0; private inv = 0; private sprayFx = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    for (let i = 0; i < 40; i++) this.stars.push([this.rnd() * LW, this.rnd() * LH]);
    this.spawnWave();
    this.start();
  }
  protected onGesture() { this.music?.play(HARVEST_THEME); }
  private fieldName() { return ["WHEAT", "ORCHARD", "MOONLIT ACRES"][this.field]; }

  private spawnWave() {
    this.field = Math.min(2, Math.floor((this.wave - 1) / 3));
    this.pests = []; this.missed = false;
    const boss = this.wave % 3 === 0;
    if (boss) { this.pests.push({ x: LW / 2, y: 30, t: 0, ph: 0, hp: 8 + this.wave, boss: true, fireCd: 1, spd: 24 }); }
    const n = 4 + Math.min(6, this.wave);
    for (let i = 0; i < n; i++) this.pests.push({ x: 30 + (i * 30) % (LW - 60), y: -20 - (i % 3) * 24, t: this.rnd() * TAU, ph: i, hp: 1, boss: false, fireCd: 1 + this.rnd() * 2, spd: 30 + this.wave * 3 });
  }
  private beginGame() { this.hx = LW / 2; this.py = LH - 26; this.bullets = []; this.wave = 1; this.field = 0; this.score = 0; this.lives = 3; this.sprays = 3; this.combo = 0; this.spawnWave(); this.clearFx(); this.intro = 1.2; this.card = "WHEAT"; this.state = "play"; this.music?.setIntensity(0.6); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.wave }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.wave, combo: this.combo }); }
  private hitPlayer() { if (this.inv > 0) return; this.lives--; this.combo = 0; this.inv = 1.4; this.flash = 1; this.addShake(5); this.hitstop(0.06); this.buzz(90); this.fxShards(this.hx, this.py, "#ffd24a", 10); this.noise(0.2, 0.06); this.tone(150, 0.2, "square", 0.05); if (this.lives <= 0) this.gameOver(); else this.report(); }
  private spray() { if (this.sprays <= 0 || this.state !== "play") return; this.sprays--; this.sprayFx = 1; this.inv = Math.max(this.inv, 0.6); this.addShake(3); this.fxRing(this.hx, this.py, "#33e650", 140); this.tone(300, 0.2, "square", 0.05); let n = 0; for (const p of this.pests) if (!p.boss) { this.killPest(p); n++; } this.pests = this.pests.filter((p) => p.boss || p.hp > 0); this.bullets = this.bullets.filter((b) => !b.enemy); this.fxPop(this.hx, this.py - 16, "SPRAY! x" + n, "#33e650"); this.report(); }
  private killPest(p: Pest) { p.hp = 0; this.score += p.boss ? 500 : 30; this.fxBurst(p.x, p.y, p.boss ? "#ffd24a" : "#33e650", p.boss ? 20 : 8, 90); this.tone(p.boss ? 300 : 660, 0.06, "square", 0.05); if (p.boss) { this.fxRing(p.x, p.y, "#ffd24a", 60); this.addShake(3); } }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.fireCd = Math.max(0, this.fireCd - dt); this.inv = Math.max(0, this.inv - dt); this.sprayFx = Math.max(0, this.sprayFx - dt * 2);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.b || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }

    // move
    if (this.btn.left) this.hx -= 130 * dt; if (this.btn.right) this.hx += 130 * dt;
    if (this.btn.up) this.py -= 100 * dt; if (this.btn.down) this.py += 100 * dt;
    this.hx = Math.max(10, Math.min(LW - 10, this.hx)); this.py = Math.max(LH - 70, Math.min(LH - 12, this.py));
    // fire
    if (this.btn.a && this.fireCd <= 0) { this.bullets.push({ x: this.hx, y: this.py - 8, vy: -320, enemy: false }); this.fireCd = 0.14; this.tone(880, 0.03, "square", 0.03); }
    if (this.pressed.b) this.spray();

    // bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) { const b = this.bullets[i]; b.y += b.vy * dt; if (b.y < -6 || b.y > LH + 6) { this.bullets.splice(i, 1); continue; }
      if (b.enemy) { if (Math.abs(b.x - this.hx) < 7 && Math.abs(b.y - this.py) < 7) { this.bullets.splice(i, 1); this.hitPlayer(); if ((this.state as string) !== "play") return; } }
      else { for (const p of this.pests) { if (p.hp > 0 && Math.abs(b.x - p.x) < (p.boss ? 16 : 8) && Math.abs(b.y - p.y) < (p.boss ? 12 : 8)) { this.bullets.splice(i, 1); p.hp--; this.fxBurst(b.x, b.y, "#ffd24a", 3, 40); if (p.hp <= 0) { this.combo++; this.killPest(p); this.score += this.combo; } break; } } }
    }

    // pests
    for (const p of this.pests) {
      if (p.hp <= 0) continue; p.t += dt;
      if (p.boss) { p.x = LW / 2 + Math.sin(p.t) * 70; p.y = 30 + Math.sin(p.t * 0.7) * 8; p.fireCd -= dt; if (p.fireCd <= 0) { p.fireCd = 0.6; for (const dx of [-30, 0, 30]) this.bullets.push({ x: p.x + dx * 0.2, y: p.y + 10, vy: 130, enemy: true }); this.tone(200, 0.05, "square", 0.04); } }
      else { p.y += p.spd * dt; p.x += Math.sin(p.t * 2 + p.ph) * 40 * dt; p.fireCd -= dt; if (p.fireCd <= 0 && p.y > 10 && p.y < LH - 40 && this.rnd() < 0.5) { p.fireCd = 1.4; this.bullets.push({ x: p.x, y: p.y + 6, vy: 150, enemy: true }); } if (p.y > LH + 10) { p.y = -14; p.x = 20 + this.rnd() * (LW - 40); this.missed = true; this.combo = 0; } }
      if (Math.abs(p.x - this.hx) < (p.boss ? 16 : 8) && Math.abs(p.y - this.py) < (p.boss ? 12 : 8)) { this.hitPlayer(); if ((this.state as string) !== "play") return; }
    }
    this.pests = this.pests.filter((p) => p.hp > 0);
    if (this.pests.length === 0) { const bonus = 100 * this.wave + (this.missed ? 0 : 200); this.score += bonus; this.fxPop(LW / 2, 70, (this.missed ? "WAVE +" : "HARVEST! +") + bonus, this.missed ? "#c3b4de" : "#ffd24a", 1); this.music?.playJingle(CLEAR_JINGLE, 165); this.wave++; if (this.sprays < 3 && this.wave % 3 === 1) this.sprays++; this.spawnWave(); this.intro = 1; this.card = ((this.wave - 1) % 3 === 0 ? this.fieldName() : "WAVE " + this.wave); }
    this.report();
  }

  // ---- draw ----
  protected render() {
    const skies: [string, string][] = [["#1a2a4a", "#0a1428"], ["#2a1a3a", "#0e0a1e"], ["#0a1a2a", "#050a14"]];
    const sk = skies[this.field];
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2020" : sk[0], sk[1]);
    // moon + stars
    this.disc(200, 30, 14, "#e8e0c0"); this.disc(196, 26, 3, shade("#e8e0c0", -0.15));
    for (const [x, y] of this.stars) { const yy = (y + this.score * 0.2) % LH; this.px(x | 0, yy | 0, "#ffffff60"); }
    // field rows at bottom
    for (let x = 0; x < LW; x += 10) this.rect(x, LH - 8, 5, 8, "#2a3a1a");
    // bullets
    for (const b of this.bullets) { if (b.enemy) { this.rect(b.x | 0, b.y | 0, 2, 4, "#ff5d7d"); } else { this.rect(b.x | 0, b.y | 0, 2, 5, "#ffec9a"); } }
    // pests
    for (const p of this.pests) { if (p.hp <= 0) continue; if (p.boss) { this.ball(p.x | 0, p.y | 0, 14, "#8a5a2c"); this.rect((p.x | 0) - 14, (p.y | 0) - 2, 28, 4, "#c98a44"); this.rect((p.x | 0) - 4, (p.y | 0) - 3, 8, 3, "#ff5d7d"); for (let i = 0; i < p.hp; i++) this.px((p.x | 0) - 8 + i * 2, (p.y | 0) - 12, "#33e650"); } else { this.ball(p.x | 0, p.y | 0, 5, "#ff8a3d"); this.rect((p.x | 0) - 6, (p.y | 0), 3, 2, shade("#ff8a3d", -0.2)); this.rect((p.x | 0) + 3, (p.y | 0), 3, 2, shade("#ff8a3d", -0.2)); this.px((p.x | 0) - 2, (p.y | 0) - 1, "#0a0714"); this.px((p.x | 0) + 2, (p.y | 0) - 1, "#0a0714"); } }
    // player crop-duster
    if (this.inv <= 0 || Math.floor(this.tSec() * 12) % 2 === 0) { const x = this.hx | 0, y = this.py | 0; this.rect(x - 2, y - 8, 4, 12, "#3bb6ff"); this.rect(x - 8, y - 2, 16, 3, "#e2544f"); this.rect(x - 1, y - 10, 2, 3, "#ffd24a"); this.disc(x, y + 4, 2, "#7be0ff"); }
    if (this.sprayFx > 0) { this.b.globalAlpha = this.sprayFx * 0.3; this.rect(0, 0, LW, LH, "#33e650"); this.b.globalAlpha = 1; }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#dff2ff", 1, false);
    this.text(120, 3, "W" + this.wave, "#ffd24a", 1, false);
    for (let i = 0; i < this.sprays; i++) this.disc(148 + i * 8, 6, 3, "#33e650");
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2a2a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 76, LW, 30, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(86, this.card, "#ffd24a", 2); }
    if (this.state !== "play") this.overlay();
  }
  private tSec() { return performance.now() / 1000; }
  private overlay() {
    this.b.globalAlpha = 0.7; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "HARVEST MOONLIGHT", "#ffd24a", 1);
      this.textCenter(64, "DUST THE CROP-PESTS", "#c3b4de", 1);
      this.textCenter(84, "HOLD FIRE - WEAVE THEIR BOMBS", "#83769c", 1);
      this.textCenter(96, "POP A SPRAY TO CLEAR THE SCREEN", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS FIRE TO START", "#ffec27", 1);
    } else {
      this.textCenter(50, "CROP LOST!", "#ff5d7d", 2);
      this.textCenter(76, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(90, "BEST " + this.best, "#ffd24a", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS FIRE TO RETRY", "#ffec27", 1);
    }
  }
}
