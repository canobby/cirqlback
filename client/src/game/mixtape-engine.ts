// mixtape-engine — Main Street cabinet (rhythm-tapper homage). A record shop cutting
// a mixtape: notes stream down three grooves toward the needle line — tap the matching
// lane right as each hits to lay it down clean. Nail a run for a HOT STREAK multiplier;
// miss and the tape hisses (the mix meter drops). Let the meter bottom out and the tape
// snaps. Signature twist: double-notes are a CROSSFADE — hit both lanes together.
// Sides: A-Side -> B-Side -> Bonus Track (faster, denser). RetroEngine + MusicKit; tap
// three lanes.

import { RetroEngine, shade, type RetroHooks, LS } from "./retro-engine";
import { MusicKit, type Track, GAME_OVER_JINGLE, CLEAR_JINGLE } from "./musickit";

const LW = 240, LH = 180;
const BEST_KEY = "mixtape_best";
const LANES = [70, 120, 170];
const HITY = 150, SPAWNY = 24;
const LANE_BTN: ("left" | "a" | "right")[] = ["left", "a", "right"];

interface Note { lane: number; y: number; hit: boolean }

const MIX_THEME: Track = {
  bpm: 128,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "A4", d: 2 }, { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "B4", d: 2 }, { n: "G4", d: 4 },
      { n: "A4", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "A4", d: 4 },
    ] },
    { role: "harmony", wave: "sawtooth", gain: 0.12, minIntensity: 0.4, pattern: [{ n: 0, d: 2 }, { n: "E4", d: 2 }, { n: 0, d: 2 }, { n: "A3", d: 2 }] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [{ n: "A2", d: 1 }, { n: "A2", d: 1 }, { n: "E2", d: 1 }, { n: "E2", d: 1 }, { n: "F2", d: 1 }, { n: "F2", d: 1 }, { n: "G2", d: 1 }, { n: "G2", d: 1 }] },
    { role: "drums", minIntensity: 0.2, pattern: [{ n: "K", d: 1 }, { n: "H", d: 1 }, { n: "S", d: 1 }, { n: "H", d: 1 }] },
  ],
};

export class MixtapeEngine extends RetroEngine {
  private state: "ready" | "play" | "over" = "ready";
  private notes: Note[] = []; private spawnT = 0; private beat = 0.55; private speed = 90; private meter = 0.6;
  private side = 0; private combo = 0; private score = 0; private hits = 0; private tNow = 0;
  private best = +(LS.get(BEST_KEY) || 0); private flash = 0; private laneFx = [0, 0, 0];

  constructor(canvas: HTMLCanvasElement, hooks: RetroHooks = {}) {
    super(canvas, hooks, LW, LH);
    this.music = new MusicKit({ volume: 0.4 });
    this.start();
  }
  protected onGesture() { this.music?.play(MIX_THEME); }
  private sideName() { return ["A-SIDE", "B-SIDE", "BONUS TRACK"][this.side]; }

  private beginGame() { this.notes = []; this.spawnT = 0.4; this.beat = 0.55; this.speed = 90; this.meter = 0.6; this.side = 0; this.combo = 0; this.score = 0; this.hits = 0; this.clearFx(); this.state = "play"; this.music?.setIntensity(0.7); this.report(); }
  private gameOver() { this.state = "over"; if (this.score > this.best) { this.best = this.score; LS.set(BEST_KEY, String(this.best)); } this.music?.setIntensity(0.2); this.music?.playJingle(GAME_OVER_JINGLE, 150); this.addShake(4); this.hooks.onRunEnd?.({ score: this.score, shift: this.side + 1 }); this.report(); }
  private report() { this.hooks.onHud?.({ state: this.state, score: this.score, lives: Math.ceil(this.meter * 3), shift: this.side + 1, combo: this.combo }); }

  private tapLane(lane: number) {
    // nearest unhit note in this lane near the needle
    let best: Note | null = null, bd = 99;
    for (const n of this.notes) if (!n.hit && n.lane === lane) { const d = Math.abs(n.y - HITY); if (d < bd) { bd = d; best = n; } }
    this.laneFx[lane] = 1;
    if (best && bd < 20) {
      best.hit = true; const perfect = bd < 8; this.combo++; this.hits++;
      const g = (perfect ? 30 : 15) * Math.max(1, Math.floor(this.combo / 5) + 1); this.score += g;
      this.meter = Math.min(1, this.meter + (perfect ? 0.05 : 0.03));
      this.fxBurst(LANES[lane], HITY, perfect ? "#ffd24a" : "#33e650", perfect ? 8 : 5, 70); this.fxPop(LANES[lane], HITY - 12, perfect ? "PERFECT" : "GOOD", perfect ? "#ffd24a" : "#33e650");
      this.tone(perfect ? 900 : 700, 0.04, "square", 0.05); this.hitstop(0.01);
      if (this.combo > 0 && this.combo % 10 === 0) this.fxPop(LW / 2, 60, "HOT STREAK x" + (Math.floor(this.combo / 5) + 1), "#ff8ab5", 1);
    } else { this.combo = 0; this.meter = Math.max(0, this.meter - 0.04); this.tone(200, 0.05, "square", 0.03); }
  }

  protected update(dt: number) {
    this.tNow += dt; this.flash = Math.max(0, this.flash - dt * 3); for (let i = 0; i < 3; i++) this.laneFx[i] = Math.max(0, this.laneFx[i] - dt * 5);
    if (this.state !== "play") { if (this.pressed.a || this.pressed.left || this.pressed.right || this.pointer.down) this.beginGame(); return; }

    // input per lane
    if (this.pressed.left) this.tapLane(0);
    if (this.pressed.a) this.tapLane(1);
    if (this.pressed.right) this.tapLane(2);

    // spawn on beat
    this.spawnT -= dt;
    if (this.spawnT <= 0) { const crossfade = this.rnd() < 0.12; const l1 = Math.floor(this.rnd() * 3); this.notes.push({ lane: l1, y: SPAWNY, hit: false }); if (crossfade) { let l2 = Math.floor(this.rnd() * 3); if (l2 === l1) l2 = (l2 + 1) % 3; this.notes.push({ lane: l2, y: SPAWNY, hit: false }); } this.spawnT = this.beat * (0.8 + this.rnd() * 0.4); }

    // move notes
    for (let i = this.notes.length - 1; i >= 0; i--) { const n = this.notes[i]; n.y += this.speed * dt; if (n.hit) { if (n.y > HITY + 6) this.notes.splice(i, 1); } else if (n.y > HITY + 20) { this.notes.splice(i, 1); this.combo = 0; this.meter = Math.max(0, this.meter - 0.06); this.flash = 1; this.fxPop(LANES[n.lane], HITY, "MISS", "#ff5d7d"); this.noise(0.05, 0.03); } }

    if (this.meter <= 0) { this.gameOver(); return; }
    // progress: every 30 hits, next side (faster)
    const ns = Math.min(2, Math.floor(this.hits / 30));
    if (ns !== this.side) { this.side = ns; this.speed += 20; this.beat = Math.max(0.32, this.beat - 0.08); this.music?.playJingle(CLEAR_JINGLE, 165); this.fxPop(LW / 2, 70, this.sideName(), "#ff8ab5", 1); this.music?.setIntensity(Math.min(1, 0.7 + ns * 0.15)); }
    this.report();
  }

  // ---- draw ----
  protected render() {
    this.vgrad(0, 0, LW, LH, this.flash > 0.5 ? "#4a2030" : "#241a3a", "#100a1e");
    // turntable disc backdrop
    this.disc(LW / 2, 90, 60, "#1a1428"); this.ring(LW / 2, 90, 60, "#2a2040", 2); this.ring(LW / 2, 90, 40, "#221a34", 1.5); this.disc(LW / 2, 90, 8, "#3a2f52"); this.disc(LW / 2, 90, 2, "#ff5d7d");
    // lanes
    for (let l = 0; l < 3; l++) { const x = LANES[l]; this.rect(x - 16, SPAWNY, 32, HITY - SPAWNY + 16, "#ffffff08"); this.rect(x - 16, SPAWNY, 1, HITY - SPAWNY + 16, "#ffffff14"); this.rect(x + 15, SPAWNY, 1, HITY - SPAWNY + 16, "#ffffff14"); }
    // needle line
    this.rect(LANES[0] - 18, HITY, LANES[2] - LANES[0] + 36, 2, "#ff8ab5");
    for (let l = 0; l < 3; l++) { const x = LANES[l]; const on = this.laneFx[l]; this.ring(x, HITY, 12, on > 0 ? "#ffd24a" : "#5a4f6a", on > 0 ? 2.4 : 1.4); }
    // notes
    for (const n of this.notes) { const x = LANES[n.lane]; const c = ["#ff5d7d", "#3bb6ff", "#33e650"][n.lane]; if (n.hit) { this.b.globalAlpha = Math.max(0, 1 - (n.y - HITY) / 6); this.disc(x | 0, n.y | 0, 8, c); this.b.globalAlpha = 1; } else { this.disc(x | 0, n.y | 0, 8, c); this.ring(x | 0, n.y | 0, 8, shade(c, 0.3), 1.4); this.px(x - 2, (n.y | 0) - 2, "#ffffffb0"); } }

    this.drawFx();

    this.rect(0, 0, LW, 12, "#00000090");
    this.text(3, 3, "SCORE " + this.score, "#e6ddf5", 1, false);
    this.text(120, 3, this.sideName(), "#ff8ab5", 1, false);
    if (this.combo > 4) this.text(186, 3, "x" + (Math.floor(this.combo / 5) + 1), "#ffd24a", 1, false);
    // mix meter
    this.rect(3, 14, 40, 4, "#2a2438"); this.rect(3, 14, Math.round(40 * this.meter), 4, this.meter < 0.25 ? "#ff5d7d" : "#33e650");

    if (this.state !== "play") this.overlay();
  }
  private overlay() {
    this.b.globalAlpha = 0.72; this.rect(0, 0, LW, LH, "#0a0714"); this.b.globalAlpha = 1;
    if (this.state === "ready") {
      this.textCenter(40, "MIXTAPE", "#ff8ab5", 2);
      this.textCenter(64, "TAP EACH NOTE ON THE NEEDLE", "#c3b4de", 1);
      this.textCenter(84, "LEFT LANE / MID / RIGHT LANE", "#83769c", 1);
      this.textCenter(96, "KEEP THE MIX METER UP", "#83769c", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A LANE TO START", "#ffec27", 1);
    } else {
      this.textCenter(48, "TAPE SNAPPED!", "#ff5d7d", 2);
      this.textCenter(74, "SCORE " + this.score, "#fff4ea", 1);
      this.textCenter(88, "BEST " + this.best, "#ffd24a", 1);
      this.textCenter(104, "NOTES HIT " + this.hits, "#c3b4de", 1);
      if (Math.floor(performance.now() / 400) % 2 === 0) this.textCenter(LH - 14, "PRESS A LANE TO RETRY", "#ffec27", 1);
    }
    void LANE_BTN;
  }
}
