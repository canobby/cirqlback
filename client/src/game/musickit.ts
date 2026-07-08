// musickit — layered 16-bit chiptune for CIRQLBACK · MAIN STREET ARCADE.
//
// A small Web-Audio sequencer built on the same square/triangle/noise voices the
// RetroEngine uses for SFX, but with a lookahead scheduler so timing is tight. A
// Track is a set of Layers (bass / lead / harmony / drums), each a looping pattern
// of steps (16th notes). Dynamic layering: setIntensity(0..1) drops layers in and
// out, so the music thickens as combo/level rises. One-shot jingles (game-over,
// level-clear) share the same voices. Every cabinet supplies its own Track; a shared
// Main Street leitmotif keeps the arcade sonically of a piece.

export type Wave = "square" | "triangle" | "sawtooth" | "sine";

/** A step in a pattern: a note name ("C4", "F#3"), a drum code ("K"/"S"/"H"), or 0 (rest); `d` = length in 16th-note steps. */
export interface Step { n: string | 0; d: number }
export type Role = "bass" | "lead" | "harmony" | "drums" | "arp";
export interface Layer {
  role: Role;
  wave?: Wave;
  gain?: number;
  /** Layer plays only once intensity reaches this (0..1). Bass/lead default to 0. */
  minIntensity?: number;
  pattern: Step[];
}
export interface Track { bpm: number; layers: Layer[] }

const NOTE_IDX: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
function noteFreq(name: string): number {
  const m = name.match(/^([A-G]#?)(-?\d)$/);
  if (!m) return 0;
  const midi = NOTE_IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface StepEv { n: string | 0; d: number }
/** Expand a pattern into one slot per 16th step (note-on slots + nulls for held/rest). */
function expand(pattern: Step[]): (StepEv | null)[] {
  const out: (StepEv | null)[] = [];
  for (const s of pattern) { out.push({ n: s.n, d: s.d }); for (let i = 1; i < s.d; i++) out.push(null); }
  return out;
}

interface CompiledLayer extends Layer { steps: (StepEv | null)[]; len: number }

export class MusicKit {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume: number;
  private muted = false;

  private track: Track | null = null;
  private layers: CompiledLayer[] = [];
  private stepDur = 0.125;      // seconds per 16th (set from bpm)
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private readonly lookahead = 0.12; // schedule this far ahead
  private intensity = 1;

  /** Diagnostics (used by tests): how many note-ons have been scheduled. */
  notesScheduled = 0;

  constructor(opts: { volume?: number } = {}) { this.volume = opts.volume ?? 0.5; }

  private ctx(): AudioContext | null {
    if (this.ac) return this.ac;
    try {
      this.ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ac.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ac.destination);
    } catch { this.ac = null; }
    return this.ac;
  }

  /** Start (or switch to) a track. Resumes audio; safe to call after a user gesture. */
  play(track: Track) {
    const ac = this.ctx(); if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    this.track = track;
    this.layers = track.layers.map((l) => { const steps = expand(l.pattern); return { ...l, steps, len: steps.length || 1 }; });
    this.stepDur = 60 / track.bpm / 4;
    this.step = 0;
    this.nextTime = ac.currentTime + 0.06;
    if (this.timer == null) this.timer = window.setInterval(() => this.tick(), 25);
  }

  stop() {
    if (this.timer != null) { window.clearInterval(this.timer); this.timer = null; }
    this.track = null; this.layers = [];
  }

  setIntensity(x: number) { this.intensity = Math.max(0, Math.min(1, x)); }
  /** Live master volume (0..1). CIRQL's Settings "Music" slider drives this. */
  setVolume(v: number) { this.volume = Math.max(0, Math.min(1, v)); if (this.master && this.ac && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ac.currentTime, 0.02); }
  setMuted(m: boolean) { this.muted = m; if (this.master && this.ac) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ac.currentTime, 0.02); }
  isMuted() { return this.muted; }
  get playing() { return this.timer != null && !!this.track; }

  private tick() {
    const ac = this.ac; if (!ac || !this.track) return;
    while (this.nextTime < ac.currentTime + this.lookahead) {
      this.playStep(this.step, this.nextTime);
      this.step++;
      this.nextTime += this.stepDur;
    }
  }

  private playStep(step: number, when: number) {
    for (const l of this.layers) {
      if ((l.minIntensity ?? (l.role === "bass" || l.role === "lead" ? 0 : 0.4)) > this.intensity) continue;
      const ev = l.steps[step % l.len];
      if (!ev || ev.n === 0) continue;
      const dur = ev.d * this.stepDur;
      if (l.role === "drums") this.drum(String(ev.n), when);
      else this.voice(noteFreq(String(ev.n)), when, dur * 0.92, l.wave || (l.role === "bass" ? "triangle" : "square"), l.gain ?? (l.role === "bass" ? 0.5 : l.role === "harmony" ? 0.28 : 0.42));
      this.notesScheduled++;
    }
  }

  private voice(freq: number, when: number, dur: number, wave: Wave, gain: number) {
    const ac = this.ac, master = this.master; if (!ac || !master || freq <= 0) return;
    try {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = wave; o.frequency.value = freq; o.connect(g); g.connect(master);
      const peak = gain * this.volume;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(peak, when + 0.008);
      g.gain.setValueAtTime(peak, when + Math.max(0.02, dur - 0.04));
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when); o.stop(when + dur + 0.02);
    } catch { /* best-effort */ }
  }

  private drum(code: string, when: number) {
    const ac = this.ac, master = this.master; if (!ac || !master) return;
    try {
      const kick = code === "K";
      const dur = kick ? 0.14 : code === "S" ? 0.12 : 0.05;
      const n = Math.max(1, Math.floor(ac.sampleRate * dur));
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource(); src.buffer = buf;
      const g = ac.createGain(); g.gain.value = (kick ? 0.6 : code === "S" ? 0.4 : 0.22) * this.volume;
      if (kick) { // low thump: oscillator pitch-drop under the noise
        const o = ac.createOscillator(), og = ac.createGain();
        o.type = "triangle"; o.frequency.setValueAtTime(160, when); o.frequency.exponentialRampToValueAtTime(50, when + dur);
        og.gain.setValueAtTime(0.6 * this.volume, when); og.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        o.connect(og); og.connect(master); o.start(when); o.stop(when + dur + 0.02);
      } else { // filtered-ish hat/snare via a highpass
        const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = code === "H" ? 7000 : 1800;
        src.connect(hp); hp.connect(g); g.connect(master); src.start(when); return;
      }
      src.connect(g); g.connect(master); src.start(when);
    } catch { /* best-effort */ }
  }

  /** Play a one-shot sequence (game-over, level-clear) over the current voices. */
  playJingle(notes: Step[], bpm = 150, wave: Wave = "square") {
    const ac = this.ctx(); if (!ac) return; if (ac.state === "suspended") ac.resume();
    const sd = 60 / bpm / 4;
    let t = ac.currentTime + 0.02;
    for (const s of notes) { if (s.n !== 0) this.voice(noteFreq(String(s.n)), t, s.d * sd * 0.9, wave, 0.5); t += s.d * sd; }
  }

  dispose() { this.stop(); try { this.ac?.close(); } catch { /* ignore */ } this.ac = null; this.master = null; }
}

// ---------- the shared Main Street leitmotif (lobby / attract theme) ----------
export const MAIN_STREET_THEME: Track = {
  bpm: 132,
  layers: [
    { role: "lead", wave: "square", gain: 0.42, pattern: [
      { n: "A4", d: 2 }, { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "B4", d: 2 }, { n: "G4", d: 2 }, { n: "B4", d: 2 },
      { n: "A4", d: 2 }, { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "A5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 4 },
    ] },
    { role: "harmony", wave: "square", gain: 0.22, minIntensity: 0.4, pattern: [
      { n: 0, d: 1 }, { n: "E4", d: 1 }, { n: 0, d: 1 }, { n: "E4", d: 1 }, { n: 0, d: 1 }, { n: "F4", d: 1 }, { n: 0, d: 1 }, { n: "F4", d: 1 },
      { n: 0, d: 1 }, { n: "D4", d: 1 }, { n: 0, d: 1 }, { n: "D4", d: 1 }, { n: 0, d: 1 }, { n: "E4", d: 1 }, { n: 0, d: 1 }, { n: "E4", d: 1 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.5, pattern: [
      { n: "A2", d: 4 }, { n: "A2", d: 4 }, { n: "F2", d: 4 }, { n: "F2", d: 4 },
      { n: "G2", d: 4 }, { n: "G2", d: 4 }, { n: "E2", d: 4 }, { n: "E2", d: 4 },
    ] },
    { role: "drums", minIntensity: 0.25, pattern: [
      { n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 },
      { n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 1 }, { n: "H", d: 1 },
    ] },
  ],
};

/** A short "game over" descending jingle. */
export const GAME_OVER_JINGLE: Step[] = [
  { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "A4", d: 2 }, { n: "G4", d: 2 }, { n: "E4", d: 6 },
];
/** A bright "level clear" jingle. */
export const CLEAR_JINGLE: Step[] = [
  { n: "C5", d: 1 }, { n: "E5", d: 1 }, { n: "G5", d: 1 }, { n: "C6", d: 3 },
];
