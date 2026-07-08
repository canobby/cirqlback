// CIRQL — Milestone G: the world soundtrack, re-scored CINEMATIC (owner: "orchestrated
// like new video-game music — smooth, soothing, brooding excitement, dramatic & sweeping").
//
// The arcade stays 16-bit; the WORLD gets a lush orchestral score. These are slow chord
// progressions (sustained string/pad swells + warm sub bass + an expressive lead + a gentle
// harp + tuned bells + cinematic booms), rendered by the synth in cirql-orchestra.ts (soft
// filtered voices, long ADSR, hall reverb). Authored as CHORDS so the harmony is full and
// beautiful, not a lone bleeping square.
//
// Adaptive: `trackForContext(ring, ambient, isShop, isSubMap)` picks the theme for where you
// are; the wild theme is gently transposed per ring so neighbours differ yet cohere.

import type { OTrack, OStep } from "./cirql-orchestra";

// ---- authoring helpers ----------------------------------------------------------
const CHORD = (chords: string[][], d = 16): OStep[] => chords.map((c) => ({ n: c, d }));
const ROOT = (roots: string[], d = 16): OStep[] => roots.map((r) => ({ n: r, d }));
const LINE = (pairs: [string | string[] | 0, number][]): OStep[] => pairs.map(([n, d]) => ({ n, d }));
// an up-and-back arpeggio auto-built from each chord's tones (perChord × d = one chord's span)
function ARP(chords: string[][], perChord = 8, d = 2): OStep[] {
  const out: OStep[] = [];
  for (const c of chords) { const seq = [...c, ...c.slice(1, -1).reverse()]; for (let i = 0; i < perChord; i++) out.push({ n: seq[i % seq.length], d }); }
  return out;
}
// a steady pulse on each chord's root (driving bass) — perChord hits of length d per chord
function PULSE(roots: string[], perChord = 8, d = 2): OStep[] {
  const out: OStep[] = [];
  for (const r of roots) for (let i = 0; i < perChord; i++) out.push({ n: r, d });
  return out;
}
// booms spaced every `every` steps, `count` times
const BOOM = (note: string, count: number, every: number): OStep[] => Array.from({ length: count }, () => ({ n: note, d: every }));

// ---- transpose (biome variety; chord-aware — same music, new key) ---------------
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const IDX: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
function shift1(n: string, semis: number): string {
  const m = n.match(/^([A-G]#?)(-?\d)$/); if (!m) return n;
  const abs = IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12 + semis;
  return `${NAMES[((abs % 12) + 12) % 12]}${Math.floor(abs / 12) - 1}`;
}
const shiftAny = (n: OStep["n"], semis: number): OStep["n"] => (n === 0 ? 0 : Array.isArray(n) ? n.map((x) => shift1(x, semis)) : shift1(n, semis));
export function transpose(t: OTrack, semis: number, bpmScale = 1): OTrack {
  if (semis === 0 && bpmScale === 1) return t;
  return { bpm: Math.round(t.bpm * bpmScale), layers: t.layers.map((l) => ({ ...l, pattern: l.pattern.map((s): OStep => ({ n: shiftAny(s.n, semis), d: s.d })) })) };
}

// ---- CIRQLSPACE — home: warm, soothing, unhurried (C major) ---------------------
const HOME_CHORDS = [["E4", "G4", "B4", "D5"], ["D4", "G4", "B4"], ["E4", "G4", "A4", "C5"], ["F4", "A4", "C5", "E5"]];
export const CIRQLSPACE_THEME: OTrack = {
  bpm: 66,
  layers: [
    { inst: "strings", gain: 1.0, pattern: CHORD(HOME_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: ROOT(["C2", "G2", "A2", "F2"]) },
    { inst: "lead", gain: 0.85, pattern: LINE([["G4", 8], ["E4", 4], ["F4", 4], ["G4", 8], ["A4", 8], ["G4", 8], ["E4", 4], ["D4", 4], ["C4", 8], ["E4", 8]]) },
    { inst: "harp", gain: 0.7, minIntensity: 0.5, pattern: ARP(HOME_CHORDS) },
  ],
};

// ---- Town — community hub: hopeful, gently moving (G major) ---------------------
const TOWN_CHORDS = [["B3", "D4", "G4"], ["A3", "D4", "F#4"], ["B3", "E4", "G4"], ["C4", "E4", "G4"]];
export const TOWN_THEME: OTrack = {
  bpm: 74,
  layers: [
    { inst: "strings", gain: 1.0, pattern: CHORD(TOWN_CHORDS) },
    { inst: "pad", gain: 0.7, minIntensity: 0.4, pattern: CHORD(TOWN_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: ROOT(["G2", "D2", "E2", "C2"]) },
    { inst: "lead", gain: 0.85, pattern: LINE([["D5", 8], ["B4", 4], ["D5", 4], ["G4", 8], ["A4", 8], ["B4", 8], ["A4", 4], ["G4", 4], ["E4", 8], ["D4", 8]]) },
    { inst: "harp", gain: 0.65, minIntensity: 0.35, pattern: ARP(TOWN_CHORDS) },
  ],
};

// ---- Wilds — adventurous, sweeping, wonder (D major) ----------------------------
const WILD_CHORDS = [["D4", "F#4", "A4"], ["A3", "C#4", "E4"], ["B3", "D4", "F#4"], ["G3", "B3", "D4"]];
export const WILDS_THEME: OTrack = {
  bpm: 72,
  layers: [
    { inst: "strings", gain: 1.0, pattern: CHORD(WILD_CHORDS) },
    { inst: "pad", gain: 0.6, minIntensity: 0.3, pattern: CHORD(WILD_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: ROOT(["D2", "A2", "B2", "G2"]) },
    { inst: "lead", gain: 0.9, pattern: LINE([["A4", 8], ["D5", 4], ["E5", 4], ["F#5", 8], ["E5", 8], ["D5", 8], ["A4", 4], ["B4", 4], ["D5", 8], ["A4", 8]]) },
    { inst: "harp", gain: 0.6, minIntensity: 0.4, pattern: ARP(WILD_CHORDS) },
    { inst: "boom", gain: 0.9, minIntensity: 0.85, pattern: BOOM("D2", 4, 16) },
  ],
};

// ---- Frost (winter) — brooding, cold, airy, still (B minor) ----------------------
const FROST_CHORDS = [["D4", "F#4", "B4"], ["C#4", "F#4", "A4"], ["D4", "G4", "B4"], ["D4", "F#4", "A4"]];
export const FROST_THEME: OTrack = {
  bpm: 60,
  layers: [
    { inst: "pad", gain: 1.0, pattern: CHORD(FROST_CHORDS) },
    { inst: "strings", gain: 0.7, minIntensity: 0.5, pattern: CHORD(FROST_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: ROOT(["B1", "F#2", "G2", "D2"]) },
    { inst: "bell", gain: 0.7, minIntensity: 0.4, pattern: ARP(FROST_CHORDS, 4, 4) },
    { inst: "lead", gain: 0.8, minIntensity: 0.55, pattern: LINE([[0, 8], ["F#5", 8], [0, 4], ["E5", 4], ["D5", 8], [0, 8], ["B4", 8], [0, 4], ["C#5", 4], ["F#5", 8]]) },
  ],
};

// ---- Ember (volcanic) — dramatic, driving, brooding excitement (E minor) --------
const EMBER_CHORDS = [["E4", "G4", "B4"], ["C4", "E4", "G4"], ["D4", "F#4", "A4"], ["B3", "D4", "F#4"]];
export const EMBER_THEME: OTrack = {
  bpm: 80,
  layers: [
    { inst: "strings", gain: 1.0, pattern: CHORD(EMBER_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: PULSE(["E2", "C2", "D2", "B1"]) },   // a driving pulse
    { inst: "lead", gain: 0.9, pattern: LINE([["E5", 8], ["D5", 4], ["B4", 4], ["E5", 8], ["G5", 8], ["F#5", 8], ["E5", 4], ["D5", 4], ["B4", 8], ["E5", 8]]) },
    { inst: "harp", gain: 0.55, minIntensity: 0.6, pattern: ARP(EMBER_CHORDS) },
    { inst: "boom", gain: 1.0, minIntensity: 0.5, pattern: BOOM("E1", 8, 8) },
  ],
};

// ---- Sub-maps (cave/canopy/cloud) — hushed, mysterious, glimmering (A minor) -----
const SUB_CHORDS = [["A3", "C4", "E4"], ["F3", "A3", "C4"], ["C4", "E4", "G4"], ["E3", "G3", "B3"]];
export const SUBMAP_THEME: OTrack = {
  bpm: 58,
  layers: [
    { inst: "pad", gain: 1.0, pattern: CHORD(SUB_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: ROOT(["A1", "F2", "C2", "E2"]) },
    { inst: "harp", gain: 0.6, minIntensity: 0.5, pattern: ARP(SUB_CHORDS, 4, 4) },
    { inst: "bell", gain: 0.6, minIntensity: 0.6, pattern: LINE([[0, 8], ["A4", 4], ["C5", 4], ["E5", 8], [0, 8], [0, 8], ["G4", 4], ["B4", 4], ["E5", 8], [0, 8]]) },
  ],
};

// ---- Shop interiors — cozy, small, warm (C major) -------------------------------
const SHOP_CHORDS = [["E4", "G4", "C5"], ["C4", "E4", "A4"], ["F4", "A4", "C5"], ["D4", "G4", "B4"]];
export const SHOP_THEME: OTrack = {
  bpm: 84,
  layers: [
    { inst: "pad", gain: 1.0, pattern: CHORD(SHOP_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: ROOT(["C3", "A2", "F2", "G2"]) },
    { inst: "lead", gain: 0.85, minIntensity: 0.4, pattern: LINE([["E5", 8], ["G5", 4], ["E5", 4], ["C5", 8], ["D5", 8], ["E5", 8], ["C5", 4], ["A4", 4], ["G4", 8], ["C5", 8]]) },
    { inst: "harp", gain: 0.6, minIntensity: 0.55, pattern: ARP(SHOP_CHORDS) },
  ],
};

// ---- Voyage — the sailing crossing: the biggest, most sweeping cinematic (D major)
const VOY_CHORDS = [["D4", "F#4", "A4"], ["B3", "D4", "F#4"], ["G3", "B3", "D4"], ["A3", "C#4", "E4"]];
export const VOYAGE_THEME: OTrack = {
  bpm: 70,
  layers: [
    { inst: "strings", gain: 1.0, pattern: CHORD(VOY_CHORDS) },
    { inst: "pad", gain: 0.7, minIntensity: 0.3, pattern: CHORD(VOY_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: ROOT(["D2", "B2", "G2", "A2"]) },
    { inst: "lead", gain: 0.95, pattern: LINE([["A4", 8], ["D5", 8], ["F#5", 8], ["A5", 8], ["G5", 8], ["E5", 4], ["F#5", 4], ["D5", 8], ["A4", 8]]) },
    { inst: "harp", gain: 0.6, minIntensity: 0.4, pattern: ARP(VOY_CHORDS) },
    { inst: "boom", gain: 1.0, minIntensity: 0.85, pattern: BOOM("D2", 4, 16) },
  ],
};

/** Pick the theme for where the player is. `ambient` is the ring's biome proxy. */
export function trackForContext(ring: number, ambient: string | undefined, isShop: boolean, isSubMap: boolean): OTrack {
  if (isShop) return SHOP_THEME;
  if (isSubMap) return SUBMAP_THEME;
  if (ring <= 0) return CIRQLSPACE_THEME;
  if (ring === 1) return TOWN_THEME;
  const tune = ambient === "snow" ? FROST_THEME : ambient === "ember" ? EMBER_THEME : WILDS_THEME;
  const semis = [0, 2, -3, 5, -2, 3][((ring % 6) + 6) % 6];
  return semis ? transpose(tune, semis) : tune;
}
