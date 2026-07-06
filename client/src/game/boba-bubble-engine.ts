// boba-bubble-engine — Main Street cabinet (Bubble Bobble homage). A bubble-tea
// shop: hop the platforms, FIRE a boba bubble to trap an approaching sour-drop,
// then jump into the bubble to pop it — the foe bursts into a boba pearl you catch
// for points. Clear every foe to advance. Signature twist: pop several bubbles in a
// row for a flavour COMBO, and a rare bleach... no — a rare TAPIOCA STAR that pops
// every trapped bubble at once. Worlds: Classic → Taro → Mango. RetroEngine + juice
// + MusicKit; two-thumb d-pad + jump + fire.

import { RetroEngine, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "boba_best";
const FLOOR = 168;

interface Plat { x1: number; x2: number; y: number }
const PLATS: Plat[] = [
  { x1: 8, x2: 232, y: FLOOR },
  { x1: 24, x2: 96, y: 132 }, { x1: 144, x2: 216, y: 132 },
  { x1: 84, x2: 156, y: 98 },
  { x1: 24, x2: 96, y: 62 }, { x1: 144, x2: 216, y: 62 },
];

interface Foe { x: number; y: number; vx: number; vy: number; onG: boolean; color: string; hopCd: number }
interface Bubble { x: number; y: number; vx: number; t: number; phase: "shoot" | "float"; foe: string | null; life: number }
interface Pearl { x: number; y: number; vy: number; color: string }

interface World { name: string; sky: [string, string]; plat: string; foe: string; foes: number; spd: number }
const WORLDS: World[] = [
  { name: "CLASSIC", sky: ["#2a1830", "#140a1a"], plat: "#7a4fd0", foe: "#ff5d7d", foes: 3, spd: 30 },
  { name: "TARO", sky: ["#241a3a", "#0e0a1e"], plat: "#9a7ad0", foe: "#b79bff", foes: 4, spd: 38 },
  { name: "MANGO", sky: ["#3a2a12", "#160f06"], plat: "#e0a51f", foe: "#ffb020", foes: 5, spd: 46 },
];

const BOBA_THEME: Track = {
  bpm: 138,
  layers: [
    { role: "lead", wave: "square", gain: 0.4, pattern: [
      { n: "C5", d: 2 }, { n: "E5", d: 1 }, { n: "G5", d: 1 }, { n: "E5", d: 2 }, { n: "A5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 2 },
      { n: "D5", d: 2 }, { n: "F5", d: 1 }, { n: "A5", d: 1 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 },
    ] },
    { role: "harmony", wave: "square", gain: 0.16, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "C4", d: 2 }, { n: 0, d: 2 }, { n: "A3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "C3", d: 2 }, { n: "C3", d: 2 }, { n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }] },
    { role: "drums", minIntensity: 0.25, pattern: [{ n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 1 }, { n: "H", d: 1 }] },
  ],
};

export class BobaBubbleEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private world = 0; private room = 1;
  private plx = 120; private ply = FLOOR; private vx = 0; private vy = 0; private onG = true; private faceR = true;
  private fireCd = 0;
  private foes: Foe[] = [];
  private bubbles: Bubble[] = [];
  private pearls: Pearl[] = [];
  private star: { x: number; y: number; vy: number } | null = null;
  private score = 0; private lives = 3; private combo = 0; private comboT = 0;
  private best = +(LS.get(BEST_KEY) || 0);
  private intro = 0; private card = ""; private flash = 0; private pause = 0; private starT = 0;

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.spawnRoom();      // populate so the ready screen renders a live arena
    this.start();
  }
  protected onGesture() { this.music?.play(BOBA_THEME); }
  private w() { return WORLDS[this.world]; }

  private spawnRoom() {
    this.world = Math.floor((this.room - 1) / 3) % WORLDS.length;
    const n = this.w().foes + Math.floor((this.room - 1) / 3);
    this.foes = []; this.bubbles = []; this.pearls = []; this.star = null;
    const tops = [PLATS[4], PLATS[5], PLATS[3], PLATS[1], PLATS[2]];
    for (let i = 0; i < n; i++) { const p = tops[i % tops.length]; this.foes.push({ x: p.x1 + 12 + (i * 20) % (p.x2 - p.x1 - 20), y: p.y - 6, vx: (i % 2 ? 1 : -1) * this.w().spd, vy: 0, onG: false, color: this.w().foe, hopCd: 1 + this.rnd() * 2 }); }
    this.plx = 120; this.ply = FLOOR; this.vx = 0; this.vy = 0; this.onG = true;
    this.starT = 6 + this.rnd() * 6;
  }
  private beginGame() { this.score = 0; this.lives = 3; this.room = 1; this.combo = 0; this.clearFx(); this.spawnRoom(); this.intro = 1.4; this.card = "ROOM 1  " + this.w().name; this.state = "play"; this.music?.setIntensity(0.5); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(5); this.hooks.onRunEnd?.({ score: this.score, shift: this.room }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: this.lives, shift: this.room, combo: this.combo }); }

  private roomClear() {
    const bonus = 150 * this.room; this.score += bonus;
    this.fxRing(120, 90, "#33e650", 80); this.fxPop(120, 80, "ROOM CLEAR +" + bonus, "#33e650"); this.music?.playJingle(CLEAR_JINGLE, 165); this.addShake(2);
    this.room++; this.spawnRoom(); this.intro = 1.3; this.card = ((this.room - 1) % 3 === 0 ? "WORLD " + (this.world + 1) + "  " + this.w().name : "ROOM " + this.room); this.report();
  }
  private loseLife() { this.lives--; this.flash = 1; this.addShake(4); this.hitstop(0.06); this.buzz(80); this.fxShards(this.plx, this.ply - 6, "#7be0c2", 8); this.noise(0.14, 0.06); this.tone(150, 0.16, "square", 0.05); this.pause = 0.7; this.combo = 0; if (this.lives <= 0) this.gameOver(); else { this.bubbles = this.bubbles.filter((b) => !b.foe); this.plx = 120; this.ply = FLOOR; this.vy = 0; this.onG = true; this.report(); } }

  // one-way platform landing: falling across a platform top within its x-range
  private landY(prevY: number, y: number, x: number): number | null {
    if (this.vy <= 0) return null;
    for (const p of PLATS) if (x >= p.x1 - 2 && x <= p.x2 + 2 && prevY <= p.y + 1 && y >= p.y) return p.y;
    return null;
  }
  private wrap(x: number) { return x < 4 ? 236 : x > 236 ? 4 : x; }

  protected update(dt: number) {
    this.flash = Math.max(0, this.flash - dt * 3); this.fireCd = Math.max(0, this.fireCd - dt); this.comboT = Math.max(0, this.comboT - dt); if (this.comboT <= 0) this.combo = 0;
    if (this.state !== "play") { if (this.pressed.a || this.pressed.b || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }
    if (this.intro > 0) { this.intro -= dt; return; }
    if (this.pause > 0) { this.pause -= dt; return; }

    // player move
    let mv = 0; if (this.btn.left) { mv = -1; this.faceR = false; } else if (this.btn.right) { mv = 1; this.faceR = true; }
    this.vx = mv * 78; this.plx = this.wrap(this.plx + this.vx * dt);
    if (this.onG && this.pressed.a) { this.vy = -168; this.onG = false; this.tone(600, 0.05, "square", 0.04); }
    const prevY = this.ply; this.vy += 520 * dt; this.ply += this.vy * dt;
    this.onG = false;
    if (this.ply >= FLOOR && prevY <= FLOOR + 2) { this.ply = FLOOR; this.vy = 0; this.onG = true; }
    else { const ly = this.landY(prevY, this.ply, this.plx); if (ly !== null) { this.ply = ly; this.vy = 0; this.onG = true; } }
    if (this.ply > LH + 8) { this.ply = 20; } // fell through the floor gap → wrap to top (BB style)

    // fire a bubble
    if (this.pressed.b && this.fireCd <= 0 && this.bubbles.length < 5) {
      this.bubbles.push({ x: this.plx + (this.faceR ? 8 : -8), y: this.ply - 8, vx: this.faceR ? 150 : -150, t: 0, phase: "shoot", foe: null, life: 7 });
      this.fireCd = 0.28; this.tone(720, 0.05, "square", 0.04); this.buzz(6);
    }

    // bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]; b.t += dt; b.life -= dt;
      if (b.phase === "shoot") { b.x = this.wrap(b.x + b.vx * dt); if (b.t > 0.34) b.phase = "float"; }
      else { b.y -= 26 * dt; b.x += Math.sin(b.t * 4 + b.x) * 8 * dt; }
      // trap a foe
      if (!b.foe) { for (let f = this.foes.length - 1; f >= 0; f--) { const fo = this.foes[f]; if (Math.abs(fo.x - b.x) < 9 && Math.abs(fo.y - b.y) < 9) { b.foe = fo.color; b.phase = "float"; b.life = 6; this.foes.splice(f, 1); this.fxRing(b.x, b.y, "#7be0c2", 14); this.tone(880, 0.06, "square", 0.04); break; } } }
      // player pops it (jump into)
      if (Math.abs(this.plx - b.x) < 10 && Math.abs(this.ply - 6 - b.y) < 10) { this.popBubble(b); this.bubbles.splice(i, 1); continue; }
      // timeout: empty pops; trapped releases the foe back
      if (b.life <= 0 || b.y < 16) { if (b.foe) this.foes.push({ x: b.x, y: b.y, vx: (this.rnd() < 0.5 ? -1 : 1) * this.w().spd * 1.3, vy: 0, onG: false, color: b.foe, hopCd: 0.5 }); this.bubbles.splice(i, 1); }
    }

    // tapioca star
    this.starT -= dt; if (this.starT <= 0 && !this.star && this.rnd() < 0.5 * dt + 0.01) { this.star = { x: 20 + this.rnd() * 200, y: -6, vy: 40 }; this.starT = 12; }
    if (this.star) { this.star.y += this.star.vy * dt; if (Math.abs(this.plx - this.star.x) < 10 && Math.abs(this.ply - 8 - this.star.y) < 12) { this.popAllBubbles(); this.star = null; } else if (this.star.y > FLOOR) this.star = null; }

    // foes
    for (const fo of this.foes) {
      fo.hopCd -= dt; fo.x = this.wrap(fo.x + fo.vx * dt);
      const pv = fo.y; fo.vy += 520 * dt; fo.y += fo.vy * dt;
      if (fo.y >= FLOOR && pv <= FLOOR + 2) { fo.y = FLOOR; fo.vy = 0; fo.onG = true; }
      else { let landed = false; for (const p of PLATS) if (fo.vy > 0 && fo.x >= p.x1 && fo.x <= p.x2 && pv <= p.y + 1 && fo.y >= p.y) { fo.y = p.y; fo.vy = 0; fo.onG = true; landed = true; break; } if (!landed) fo.onG = false; }
      if (fo.y > LH + 8) { fo.y = 16; fo.vy = 0; }
      if (fo.onG && fo.hopCd <= 0) { fo.vy = -150 - this.rnd() * 40; fo.onG = false; fo.hopCd = 1.5 + this.rnd() * 2; if (this.rnd() < 0.4) fo.vx = -fo.vx; }
      if (Math.abs(fo.x - this.plx) < 9 && Math.abs(fo.y - this.ply) < 10) { this.loseLife(); return; }
    }

    // pearls fall + collect
    for (let i = this.pearls.length - 1; i >= 0; i--) { const p = this.pearls[i]; p.vy += 300 * dt; p.y += p.vy * dt; if (p.y > FLOOR) { p.y = FLOOR; p.vy = 0; } if (Math.abs(p.x - this.plx) < 10 && Math.abs(p.y - this.ply) < 10) { this.score += 50 * Math.max(1, this.combo); this.fxPop(p.x, p.y - 6, "+" + 50 * Math.max(1, this.combo), "#ffd24a"); this.tone(1046, 0.05, "square", 0.04); this.pearls.splice(i, 1); this.report(); } }

    if (this.foes.length === 0 && !this.bubbles.some((b) => b.foe)) this.roomClear();
  }

  private popBubble(b: Bubble) {
    this.fxBurst(b.x, b.y, "#7be0c2", 8, 90); this.fxRing(b.x, b.y, "#bfeee0", 14); this.tone(660 + this.combo * 40, 0.06, "square", 0.05); this.addShake(0.6);
    if (b.foe) { this.combo++; this.comboT = 2.2; this.score += 100 * this.combo; this.pearls.push({ x: b.x, y: b.y, vy: -20, color: b.foe }); this.fxPop(b.x, b.y - 8, this.combo > 1 ? "COMBO x" + this.combo : "POP!", this.combo > 1 ? "#ffd24a" : "#7be0c2"); this.hitstop(0.03); if (this.combo > 1) this.tone(880 + this.combo * 60, 0.08, "square", 0.05); }
  }
  private popAllBubbles() { const trapped = this.bubbles.filter((b) => b.foe); this.fxRing(120, 90, "#ffd24a", 90); this.addShake(3); this.hitstop(0.05); this.tone(523, 0.1, "square", 0.05); this.tone(784, 0.14, "square", 0.05); for (const b of trapped) this.popBubble(b); this.bubbles = this.bubbles.filter((b) => !b.foe); this.fxPop(120, 78, "TAPIOCA STAR!", "#ffd24a", 2); }

  // ---- draw ----
  protected render() {
    const w = this.w();
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a1520" : w.sky[0], w.sky[1]);
    for (let i = 0; i < 24; i++) { const x = (i * 71 + 15) % LW, y = (i * 37) % 60 + 6; this.px(x, y, "#ffffff30"); }
    for (const p of PLATS) { this.shelf(p.x1, p.y, p.x2 - p.x1, 5, w.plat); this.rect(p.x1, p.y, p.x2 - p.x1, 1, "#ffffff40"); }

    // pearls
    for (const p of this.pearls) { this.ball(p.x | 0, p.y - 4 | 0, 3, "#2a1a12"); this.px((p.x | 0) - 1, (p.y | 0) - 6, "#8a6a4a"); }
    // star
    if (this.star) { const s = this.star; this.disc(s.x | 0, s.y | 0, 5, "#ffd24a"); this.ring(s.x | 0, s.y | 0, 6 + (Math.floor(this.starT * 6) % 2), "#fff1e8", 1.2); this.text((s.x | 0) - 2, (s.y | 0) - 2, "*", "#0a0714", 1, false); }
    // foes (sour drops)
    for (const fo of this.foes) { this.ball(fo.x | 0, fo.y - 5 | 0, 5, fo.color); this.rect((fo.x | 0) - 2, (fo.y | 0) - 7, 2, 2, "#0a0714"); this.rect((fo.x | 0) + 1, (fo.y | 0) - 7, 2, 2, "#0a0714"); this.rect((fo.x | 0) - 2, (fo.y | 0) - 3, 4, 1, "#0a071480"); }
    // bubbles
    for (const b of this.bubbles) { const r = 7; if (b.foe) { this.disc(b.x | 0, b.y | 0, r, b.foe + "" ); this.ring(b.x | 0, b.y | 0, r, "#bfeee0", 1.4); } else { this.ring(b.x | 0, b.y | 0, r, "#bfeee0", 1.6); this.ring(b.x | 0, b.y | 0, r - 2, "#7be0c2aa", 1); } this.px((b.x | 0) - 2, (b.y | 0) - 3, "#ffffff"); }

    // hero — a little boba cup character
    const cx = this.plx | 0, cy = this.ply | 0;
    this.shelf(cx - 4, cy - 9, 8, 9, "#f4efe6"); this.rect(cx - 4, cy - 6, 8, 3, "#e2c8a8"); // cup + tea line
    this.disc(cx - 2, cy - 3, 1, "#2a1a12"); this.disc(cx + 2, cy - 2, 1, "#2a1a12"); // pearls in cup
    this.rect(cx - 2, cy - 13, 1, 4, this.faceR ? "#ff5d7d" : "#3bb6ff"); // straw
    this.rect(cx - 3, cy - 8, 2, 2, "#1a1226"); this.rect(cx + 1, cy - 8, 2, 2, "#1a1226"); // eyes
    if (this.faceR) this.px(cx + 3, cy - 7, "#1a1226"); else this.px(cx - 4, cy - 7, "#1a1226");

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#e6f7ee", 1, false);
    this.text(120, 3, "W" + (this.world + 1) + " R" + this.room, "#7be0c2", 1, false);
    if (this.combo > 1) this.text(168, 3, "x" + this.combo, "#ffd24a", 1, false);
    for (let i = 0; i < 3; i++) this.disc(LW - 9 - i * 9, 6, 3, i < this.lives ? "#ff5d7d" : "#3a2a3a");

    if (this.state === "play" && this.intro > 0) { this.b.globalAlpha = 0.55; this.rect(0, 80, LW, 32, "#0a0714"); this.b.globalAlpha = 1; this.textCenter(90, this.card, "#33e650", 2); }
    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "BOBA BUBBLE", "#7be0c2", 2);
      this.textCenter(64, "TRAP THE SOUR DROPS", "#c3b4de", 1);
      this.textCenter(84, "FIRE A BUBBLE - JUMP IN TO POP", "#83769c", 1);
      this.textCenter(96, "CHAIN POPS FOR A FLAVOUR COMBO", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS FIRE TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "LAST CALL!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "REACHED W" + (this.world + 1) + " R" + this.room, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS FIRE TO RETRY", "#ffec27", 1);
    }
  }
}
