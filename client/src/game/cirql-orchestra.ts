// CIRQL — the cinematic score engine (replaces the chiptune MusicKit for the flagship).
//
// The arcade cabinets stay gloriously 16-bit; the WORLD deserves something lush. This is a
// small orchestral synthesiser built on Web Audio: soft filtered string/pad ensembles with
// slow swells, a warm sub bass, an expressive lead (horn/flute), a gentle harp, tuned bells,
// and low cinematic booms — all bathed in a generated convolution reverb so it breathes like
// a real hall. No samples/files: every voice is synthesised, so it ships in the bundle.
//
// It consumes the same lookahead-scheduler idea as MusicKit but voices are ADSR-shaped
// (slow attack, long release = legato and soothing, not blippy) and steps can be CHORDS.
// Tracks are authored in cirql-music.ts as slow chord progressions + melodies.

export type Inst = "strings" | "pad" | "lead" | "bass" | "harp" | "bell" | "boom" | "arp";

/** A step: a note ("C4"), a CHORD (["E4","G4","B4"]), a drum-ish boom ("*"), or 0 (rest). `d` = 16th-note steps. */
export interface OStep { n: string | string[] | 0; d: number }
export interface OLayer { inst: Inst; gain?: number; minIntensity?: number; pattern: OStep[] }
export interface OTrack { bpm: number; layers: OLayer[]; gain?: number }   // gain = per-track loudness trim (balance quiet vs loud tracks)

const NOTE_IDX: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
function noteFreq(name: string): number {
  const m = name.match(/^([A-G]#?)(-?\d)$/); if (!m) return 0;
  const midi = NOTE_IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ---- instrument voicing (subtractive synthesis + ADSR + gentle vibrato + reverb send) ----
interface OscSpec { type: OscillatorType; detune: number; octave?: number; gain: number }
interface Patch {
  oscs: OscSpec[];
  cutoff: number; cutoffOpen?: number;   // lowpass; optional brighter target it swells toward
  q: number;
  atk: number; dec: number; sus: number; rel: number;   // ADSR (seconds / 0..1 sustain)
  vibRate: number; vibDepth: number;      // vibrato (Hz / cents), ramped in for expression
  send: number;                            // reverb send 0..1
  level: number;                           // base amplitude
  pluck?: boolean;                         // harp/bell/arp: no sustain, exponential decay
  tail?: number;                           // pluck decay tail (s) — short for a tight arp
}
const PATCHES: Record<Inst, Patch> = {
  // sustained string ensemble — three detuned saws, softened by a lowpass, slow swell
  strings: { oscs: [{ type: "sawtooth", detune: -7, gain: 0.5 }, { type: "sawtooth", detune: 0, gain: 0.6 }, { type: "sawtooth", detune: 7, gain: 0.5 }],
    cutoff: 1500, cutoffOpen: 2400, q: 0.6, atk: 0.6, dec: 0.4, sus: 0.78, rel: 1.9, vibRate: 4.6, vibDepth: 5, send: 0.55, level: 0.15 },
  // warm airy pad — triangle + saw, very slow
  pad: { oscs: [{ type: "triangle", detune: -5, gain: 0.6 }, { type: "sawtooth", detune: 6, gain: 0.35 }],
    cutoff: 1150, cutoffOpen: 1700, q: 0.5, atk: 0.95, dec: 0.5, sus: 0.82, rel: 2.6, vibRate: 3.4, vibDepth: 4, send: 0.62, level: 0.13 },
  // expressive lead — a soft horn/flute (triangle + sine), delayed vibrato
  lead: { oscs: [{ type: "triangle", detune: 0, gain: 0.6 }, { type: "sine", detune: -3, gain: 0.4 }],
    cutoff: 2300, cutoffOpen: 3000, q: 0.7, atk: 0.16, dec: 0.25, sus: 0.72, rel: 0.9, vibRate: 5.5, vibDepth: 7, send: 0.4, level: 0.2 },
  // cello/contrabass sub — rounded, dark
  bass: { oscs: [{ type: "sine", detune: 0, gain: 0.7 }, { type: "triangle", detune: 0, gain: 0.4 }],
    cutoff: 520, q: 0.4, atk: 0.14, dec: 0.3, sus: 0.85, rel: 1.2, vibRate: 0, vibDepth: 0, send: 0.22, level: 0.32 },
  // harp/pluck — bright triangle, quick attack, long shimmering tail
  harp: { oscs: [{ type: "triangle", detune: 0, gain: 0.7 }, { type: "sine", detune: 4, gain: 0.3 }],
    cutoff: 3400, q: 0.6, atk: 0.005, dec: 0, sus: 0, rel: 0, vibRate: 0, vibDepth: 0, send: 0.55, level: 0.22, pluck: true },
  // tuned bell/celesta — sine + soft octave shimmer
  bell: { oscs: [{ type: "sine", detune: 0, gain: 0.7 }, { type: "sine", detune: 0, octave: 1, gain: 0.22 }],
    cutoff: 4200, q: 0.6, atk: 0.004, dec: 0, sus: 0, rel: 0, vibRate: 0, vibDepth: 0, send: 0.6, level: 0.16, pluck: true },
  // low cinematic boom/timpani — a pitch-dropping sine + soft noise, big reverb
  boom: { oscs: [{ type: "sine", detune: 0, gain: 1 }],
    cutoff: 260, q: 0.5, atk: 0.005, dec: 0, sus: 0, rel: 0, vibRate: 0, vibDepth: 0, send: 0.7, level: 0.5, pluck: true, tail: 0.4 },
  // the '80s synth ARPEGGIATOR — a bright detuned saw/square pluck with a short, tight tail
  // so fast eighth-note runs stay crisp (the pulsing bed of the whole genre)
  arp: { oscs: [{ type: "sawtooth", detune: -5, gain: 0.5 }, { type: "square", detune: 5, gain: 0.32 }],
    cutoff: 2700, q: 1.2, atk: 0.006, dec: 0, sus: 0, rel: 0, vibRate: 0, vibDepth: 0, send: 0.42, level: 0.15, pluck: true, tail: 0.32 },
};

interface CompiledLayer extends OLayer { steps: (OStep | null)[]; len: number }
function expand(pattern: OStep[]): (OStep | null)[] {
  const out: (OStep | null)[] = [];
  for (const s of pattern) { out.push(s); for (let i = 1; i < s.d; i++) out.push(null); }
  return out;
}

export class CirqlOrchestra {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private wet: GainNode | null = null;
  private volume: number;
  private muted = false;

  private track: OTrack | null = null;
  private layers: CompiledLayer[] = [];
  private stepDur = 0.2;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private readonly lookahead = 0.2;
  private intensity = 1;
  notesScheduled = 0;

  constructor(opts: { volume?: number } = {}) { this.volume = opts.volume ?? 0.7; }

  private ctx(): AudioContext | null {
    if (this.ac) return this.ac;
    try {
      this.ac = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = this.ac.createGain(); master.gain.value = this.muted ? 0 : this.volume;
      const comp = this.ac.createDynamicsCompressor();   // gentle glue so swells never clip
      comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.3;
      master.connect(comp); comp.connect(this.ac.destination);
      // generated hall reverb — a decaying-noise impulse gives lush space without any files
      const rev = this.ac.createConvolver(); rev.buffer = this.makeIR(3.1, 3.2);
      const wet = this.ac.createGain(); wet.gain.value = 0.9;
      rev.connect(wet); wet.connect(master);
      this.master = master; this.reverb = rev; this.wet = wet;
    } catch { this.ac = null; }
    return this.ac;
  }

  private makeIR(seconds: number, decay: number): AudioBuffer {
    const ac = this.ac!, n = Math.floor(ac.sampleRate * seconds), buf = ac.createBuffer(2, n, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay); }
    }
    return buf;
  }

  play(track: OTrack) {
    const ac = this.ctx(); if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    this.track = track;
    this.layers = track.layers.map((l) => { const steps = expand(l.pattern); return { ...l, steps, len: steps.length || 1 }; });
    this.stepDur = 60 / track.bpm / 4;
    this.step = 0;
    this.nextTime = ac.currentTime + 0.08;
    if (this.timer == null) this.timer = window.setInterval(() => this.tick(), 25);
  }

  /** Smoothly transition to a new track: dip the master, swap at the trough, lift back up.
   *  The old track's long note releases keep ringing through the dip and overlap the new
   *  track's attacks — so nothing starts or ends abruptly (a gentle crossfade). */
  crossfadeTo(track: OTrack, fade = 1.5) {
    const ac = this.ctx(); if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    if (!this.track || this.timer == null || this.muted) { this.play(track); return; }   // from silence → just start
    const m = this.master; if (!m) { this.play(track); return; }
    const now = ac.currentTime, half = fade / 2, low = this.volume * 0.16;
    m.gain.cancelScheduledValues(now);
    m.gain.setValueAtTime(Math.max(0.0001, m.gain.value), now);
    m.gain.linearRampToValueAtTime(Math.max(0.0001, low), now + half);          // dip (old notes tail out here)
    window.setTimeout(() => {
      const ac2 = this.ac, m2 = this.master; if (!ac2 || !m2 || this.muted) return;
      this.track = track;
      this.layers = track.layers.map((l) => { const steps = expand(l.pattern); return { ...l, steps, len: steps.length || 1 }; });
      this.stepDur = 60 / track.bpm / 4;
      this.step = 0; this.nextTime = ac2.currentTime + 0.05;
      const t = ac2.currentTime;
      m2.gain.cancelScheduledValues(t);
      m2.gain.setValueAtTime(Math.max(0.0001, m2.gain.value), t);
      m2.gain.linearRampToValueAtTime(this.volume, t + half);                   // lift the new track in
    }, half * 1000);
  }
  stop() { if (this.timer != null) { window.clearInterval(this.timer); this.timer = null; } this.track = null; this.layers = []; }
  setIntensity(x: number) { this.intensity = Math.max(0, Math.min(1, x)); }
  setVolume(v: number) { this.volume = Math.max(0, Math.min(1, v)); if (this.master && this.ac && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ac.currentTime, 0.05); }
  setMuted(m: boolean) { this.muted = m; if (this.master && this.ac) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ac.currentTime, 0.05); }
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
      if ((l.minIntensity ?? 0) > this.intensity) continue;
      const ev = l.steps[step % l.len];
      if (!ev || ev.n === 0) continue;
      const dur = ev.d * this.stepDur;
      const notes = Array.isArray(ev.n) ? ev.n : [ev.n];
      const layerGain = (l.gain ?? 1) * (this.track?.gain ?? 1);   // per-track loudness trim
      for (const nm of notes) { const f = noteFreq(nm); if (f > 0) { this.voice(l.inst, f, when, dur, layerGain); this.notesScheduled++; } }
    }
  }

  private voice(inst: Inst, freq: number, when: number, dur: number, layerGain: number) {
    const ac = this.ac, master = this.master, reverb = this.reverb; if (!ac || !master) return;
    try {
      const p = PATCHES[inst];
      const amp = ac.createGain();                     // ADSR envelope
      const filt = ac.createBiquadFilter(); filt.type = "lowpass"; filt.Q.value = p.q;
      filt.connect(amp);
      // vibrato LFO (shared across the note's oscillators), ramped in for expression
      let lfoGain: GainNode | null = null, lfo: OscillatorNode | null = null;
      if (p.vibDepth > 0) {
        lfo = ac.createOscillator(); lfo.type = "sine"; lfo.frequency.value = p.vibRate;
        lfoGain = ac.createGain(); lfoGain.gain.setValueAtTime(0, when); lfoGain.gain.linearRampToValueAtTime(p.vibDepth, when + Math.min(0.5, p.atk + 0.25));
        lfo.connect(lfoGain);
      }
      const oscs: OscillatorNode[] = [];
      for (const os of p.oscs) {
        const o = ac.createOscillator(); o.type = os.type;
        o.frequency.value = freq * (os.octave ? Math.pow(2, os.octave) : 1);
        o.detune.value = os.detune;
        if (lfoGain) lfoGain.connect(o.detune);
        const og = ac.createGain(); og.gain.value = os.gain;
        o.connect(og); og.connect(filt); oscs.push(o);
      }
      amp.connect(master);
      if (reverb && p.send > 0) { const sg = ac.createGain(); sg.gain.value = p.send; amp.connect(sg); sg.connect(reverb); }

      const peak = p.level * layerGain;
      // filter swell (subtle brightening on the attack)
      filt.frequency.setValueAtTime(p.cutoff * (p.cutoffOpen ? 0.65 : 1), when);
      if (p.cutoffOpen) filt.frequency.linearRampToValueAtTime(p.cutoffOpen, when + p.atk + p.dec);
      let endT: number;
      if (p.pluck) {
        // percussive: fast attack then a long exponential decay (harp/bell/boom)
        amp.gain.setValueAtTime(0, when);
        amp.gain.linearRampToValueAtTime(peak, when + p.atk);
        endT = when + Math.max(0.2, dur * 0.9) + (p.tail ?? 1.1);
        amp.gain.exponentialRampToValueAtTime(0.0001, endT);
        if (inst === "boom") { for (const o of oscs) { o.frequency.setValueAtTime(freq, when); o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.4), when + 0.35); } this.noiseHit(when, p.send, peak * 0.5); }
      } else {
        // sustained ADSR (strings/pad/lead/bass) — slow attack + long release = legato/soothing
        const sus = peak * p.sus;
        amp.gain.setValueAtTime(0.0001, when);
        amp.gain.linearRampToValueAtTime(peak, when + p.atk);
        amp.gain.linearRampToValueAtTime(sus, when + p.atk + p.dec);
        const rel = Math.max(when + p.atk + p.dec + 0.02, when + dur);
        amp.gain.setValueAtTime(sus, rel);
        amp.gain.exponentialRampToValueAtTime(0.0001, rel + p.rel);
        endT = rel + p.rel;
      }
      const stopAt = endT + 0.05;
      for (const o of oscs) { o.start(when); o.stop(stopAt); }
      if (lfo) { lfo.start(when); lfo.stop(stopAt); }
    } catch { /* best-effort */ }
  }

  private noiseHit(when: number, send: number, gain: number) {
    const ac = this.ac, master = this.master, reverb = this.reverb; if (!ac || !master) return;
    try {
      const n = Math.floor(ac.sampleRate * 0.3), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource(); src.buffer = buf;
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 240;
      const g = ac.createGain(); g.gain.value = gain;
      src.connect(lp); lp.connect(g); g.connect(master);
      if (reverb && send > 0) { const sg = ac.createGain(); sg.gain.value = send * 0.6; g.connect(sg); sg.connect(reverb); }
      src.start(when);
    } catch { /* best-effort */ }
  }

  dispose() { this.stop(); try { this.ac?.close(); } catch { /* ignore */ } this.ac = null; this.master = null; this.reverb = null; this.wet = null; }
}
