// CIRQL — Milestone G: sound effects.
//
// A tiny self-contained Web-Audio one-shot player for the flagship's actions (talk,
// buy, sail, hop, emote, gather, quest-clear, rank-up, expand…). Kept apart from the
// MusicKit so the Settings "Sound FX" slider mixes it independently of "Music". Sounds
// are soft sine/triangle chimes + gentle noise sweeps — cozy and magical, never harsh.
// Everything is best-effort: if audio can't start (no gesture yet / blocked) it no-ops.

type Wave = "sine" | "triangle" | "square" | "sawtooth";
interface Note { f: number; t: number; d: number; w?: Wave; g?: number }   // t = offset (s) from now

export type SfxKind =
  | "talk" | "buy" | "quest" | "graduate" | "rankup" | "sail" | "hop"
  | "emote" | "wisp" | "enter" | "leave" | "expand" | "deny" | "postcard";

// Each cue as a short note list (freqs in Hz). Noise-based cues add a `sweep` flag.
const CUES: Record<SfxKind, { notes?: Note[]; sweep?: { from: number; to: number; d: number; g: number } }> = {
  talk:     { notes: [{ f: 620, t: 0, d: 0.05, w: "square", g: 0.18 }, { f: 830, t: 0.05, d: 0.06, w: "square", g: 0.16 }] },
  buy:      { notes: [{ f: 988, t: 0, d: 0.07, w: "triangle", g: 0.28 }, { f: 1319, t: 0.07, d: 0.12, w: "triangle", g: 0.26 }] },
  quest:    { notes: [{ f: 523, t: 0, d: 0.09, w: "square", g: 0.24 }, { f: 659, t: 0.09, d: 0.09, w: "square", g: 0.24 }, { f: 784, t: 0.18, d: 0.09, w: "square", g: 0.24 }, { f: 1047, t: 0.27, d: 0.22, w: "triangle", g: 0.26 }] },
  graduate: { notes: [{ f: 523, t: 0, d: 0.1, w: "square", g: 0.26 }, { f: 659, t: 0.1, d: 0.1, w: "square", g: 0.26 }, { f: 784, t: 0.2, d: 0.1, w: "square", g: 0.26 }, { f: 1047, t: 0.3, d: 0.14, w: "square", g: 0.28 }, { f: 1319, t: 0.44, d: 0.28, w: "triangle", g: 0.3 }] },
  rankup:   { notes: [{ f: 659, t: 0, d: 0.1, w: "triangle", g: 0.28 }, { f: 988, t: 0.1, d: 0.1, w: "triangle", g: 0.28 }, { f: 1319, t: 0.2, d: 0.3, w: "sine", g: 0.3 }] },
  hop:      { notes: [{ f: 500, t: 0, d: 0.05, w: "square", g: 0.16 }, { f: 900, t: 0.05, d: 0.06, w: "square", g: 0.14 }] },
  emote:    { notes: [{ f: 880, t: 0, d: 0.06, w: "sine", g: 0.18 }, { f: 1245, t: 0.06, d: 0.1, w: "sine", g: 0.16 }] },
  wisp:     { notes: [{ f: 1175, t: 0, d: 0.05, w: "sine", g: 0.2 }, { f: 1568, t: 0.05, d: 0.09, w: "sine", g: 0.18 }] },
  enter:    { notes: [{ f: 392, t: 0, d: 0.09, w: "triangle", g: 0.22 }, { f: 587, t: 0.06, d: 0.16, w: "sine", g: 0.2 }] },
  leave:    { notes: [{ f: 587, t: 0, d: 0.08, w: "triangle", g: 0.2 }, { f: 392, t: 0.06, d: 0.16, w: "sine", g: 0.18 }] },
  expand:   { notes: [{ f: 523, t: 0, d: 0.08, w: "triangle", g: 0.24 }, { f: 659, t: 0.08, d: 0.08, w: "triangle", g: 0.24 }, { f: 880, t: 0.16, d: 0.08, w: "triangle", g: 0.24 }, { f: 1047, t: 0.24, d: 0.24, w: "sine", g: 0.26 }] },
  deny:     { notes: [{ f: 330, t: 0, d: 0.08, w: "square", g: 0.2 }, { f: 247, t: 0.08, d: 0.14, w: "square", g: 0.18 }] },
  postcard: { sweep: { from: 400, to: 2000, d: 0.28, g: 0.14 } },
  sail:     { sweep: { from: 900, to: 200, d: 0.5, g: 0.16 } },
};

class CirqlSfx {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.8;
  private muted = false;

  private ctx(): AudioContext | null {
    if (this.muted) return null;
    try {
      if (!this.ac) {
        this.ac = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.master = this.ac.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ac.destination);
      }
      if (this.ac.state === "suspended") this.ac.resume();
      return this.ac;
    } catch { return null; }
  }

  setVolume(v: number) { this.volume = Math.max(0, Math.min(1, v)); if (this.master) this.master.gain.value = this.volume; }
  setMuted(m: boolean) { this.muted = m; }
  /** Nudge the context awake on a user gesture (autoplay policy). */
  resume() { try { this.ctx(); } catch { /* ignore */ } }

  private tone(freq: number, when: number, dur: number, wave: Wave, gain: number) {
    const ac = this.ac, master = this.master; if (!ac || !master || freq <= 0) return;
    try {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = wave; o.frequency.value = freq; o.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(gain, when + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when); o.stop(when + dur + 0.02);
    } catch { /* best-effort */ }
  }

  private sweep(from: number, to: number, when: number, dur: number, gain: number) {
    const ac = this.ac, master = this.master; if (!ac || !master) return;
    try {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sawtooth"; o.frequency.setValueAtTime(from, when); o.frequency.exponentialRampToValueAtTime(Math.max(40, to), when + dur);
      const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400;
      o.connect(lp); lp.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(gain, when + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when); o.stop(when + dur + 0.02);
    } catch { /* best-effort */ }
  }

  play(kind: SfxKind) {
    const ac = this.ctx(); if (!ac) return;
    const cue = CUES[kind]; if (!cue) return;
    const now = ac.currentTime + 0.01;
    if (cue.notes) for (const n of cue.notes) this.tone(n.f, now + n.t, n.d, n.w ?? "sine", (n.g ?? 0.2));
    if (cue.sweep) this.sweep(cue.sweep.from, cue.sweep.to, now, cue.sweep.d, cue.sweep.g);
  }
}

export const cirqlSfx = new CirqlSfx();
