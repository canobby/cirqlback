// CIRQL — Milestone G: the world soundtrack, shaped toward '80s ANTHEMIC SYNTH-POP.
//
// Owner loves the wistful, hopeful, nostalgic lift of that era (think the big Alphaville /
// When In Rome / Simple Minds feeling). These are ORIGINAL compositions in that idiom — our
// own melodies over the ubiquitous "four-chord" pop progressions (I–V–vi–IV & friends, used
// by countless songs and not anyone's property). No copied tunes: same emotional DNA, our
// music. The genre's signatures are all here — a pulsing synth ARPEGGIO bed, a driving synth
// bass, wide pad/string swells, and a soaring lead — rendered through cirql-orchestra.ts.
//
// Adaptive: trackForContext(ring, ambient, isShop, isSubMap) picks the theme; the wild theme
// is gently transposed per ring so neighbours differ yet cohere.

import type { OTrack, OStep } from "./cirql-orchestra";

// ---- authoring helpers ----------------------------------------------------------
const CHORD = (chords: string[][], d = 16): OStep[] => chords.map((c) => ({ n: c, d }));
const ROOT = (roots: string[], d = 16): OStep[] => roots.map((r) => ({ n: r, d }));
const LINE = (pairs: [string | string[] | 0, number][]): OStep[] => pairs.map(([n, d]) => ({ n, d }));
// an up-and-back arpeggio auto-built from each chord's tones — the pulsing synth-pop bed
function ARP(chords: string[][], perChord = 8, d = 2): OStep[] {
  const out: OStep[] = [];
  for (const c of chords) { const seq = [...c, ...c.slice(1, -1).reverse()]; for (let i = 0; i < perChord; i++) out.push({ n: seq[i % seq.length], d }); }
  return out;
}
// a driving eighth-note pulse on each chord's root (the genre's synth bass)
function PULSE(roots: string[], perChord = 8, d = 2): OStep[] {
  const out: OStep[] = [];
  for (const r of roots) for (let i = 0; i < perChord; i++) out.push({ n: r, d });
  return out;
}
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

// ---- CIRQLSPACE — home: a gentle synth-pop ballad, warm & hopeful (C: I–V–vi–IV) -
const HOME_CHORDS = [["E4", "G4", "C5"], ["D4", "G4", "B4"], ["E4", "A4", "C5"], ["F4", "A4", "C5"]];
export const CIRQLSPACE_THEME: OTrack = {
  bpm: 96,
  layers: [
    { inst: "pad", gain: 1.0, pattern: CHORD(HOME_CHORDS) },
    { inst: "strings", gain: 0.6, minIntensity: 0.5, pattern: CHORD(HOME_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: ROOT(["C2", "G2", "A2", "F2"]) },
    { inst: "arp", gain: 0.6, minIntensity: 0.5, pattern: ARP(HOME_CHORDS) },
    { inst: "lead", gain: 0.85, pattern: LINE([["E4", 8], ["G4", 4], ["A4", 4], ["G4", 8], ["E4", 8], ["F4", 8], ["A4", 4], ["G4", 4], ["E4", 8], ["C4", 8]]) },
  ],
};

// ---- Town — upbeat, hopeful, driving (G: I–V–vi–IV) -----------------------------
const TOWN_CHORDS = [["B3", "D4", "G4"], ["A3", "D4", "F#4"], ["B3", "E4", "G4"], ["C4", "E4", "G4"]];
export const TOWN_THEME: OTrack = {
  bpm: 112,
  layers: [
    { inst: "pad", gain: 0.85, pattern: CHORD(TOWN_CHORDS) },
    { inst: "strings", gain: 0.6, minIntensity: 0.6, pattern: CHORD(TOWN_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: PULSE(["G2", "D2", "E2", "C2"]) },
    { inst: "arp", gain: 0.7, minIntensity: 0.3, pattern: ARP(TOWN_CHORDS) },
    { inst: "lead", gain: 0.85, pattern: LINE([["D5", 4], ["B4", 4], ["G4", 8], ["A4", 8], ["B4", 8], ["G4", 4], ["A4", 4], ["B4", 8], ["D5", 8], ["B4", 8]]) },
  ],
};

// ---- Wilds — the big anthem, sweeping & wide (D: vi–IV–I–V) ----------------------
const WILD_CHORDS = [["D4", "F#4", "B4"], ["D4", "G4", "B4"], ["D4", "F#4", "A4"], ["C#4", "E4", "A4"]];
export const WILDS_THEME: OTrack = {
  bpm: 116,
  layers: [
    { inst: "strings", gain: 1.0, pattern: CHORD(WILD_CHORDS) },
    { inst: "pad", gain: 0.7, minIntensity: 0.3, pattern: CHORD(WILD_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: PULSE(["B2", "G2", "D2", "A2"]) },
    { inst: "arp", gain: 0.7, minIntensity: 0.3, pattern: ARP(WILD_CHORDS) },
    { inst: "lead", gain: 0.95, pattern: LINE([["A4", 8], ["D5", 4], ["E5", 4], ["F#5", 8], ["A5", 8], ["G5", 8], ["F#5", 4], ["E5", 4], ["D5", 8], ["A4", 8]]) },
    { inst: "boom", gain: 0.9, minIntensity: 0.85, pattern: BOOM("D2", 4, 16) },
  ],
};

// ---- Frost (winter) — a bittersweet synth ballad, airy & wistful (Am: vi–IV–I–V) -
const FROST_CHORDS = [["A3", "C4", "E4"], ["A3", "C4", "F4"], ["C4", "E4", "G4"], ["B3", "D4", "G4"]];
export const FROST_THEME: OTrack = {
  bpm: 90,
  layers: [
    { inst: "pad", gain: 1.0, pattern: CHORD(FROST_CHORDS) },
    { inst: "strings", gain: 0.6, minIntensity: 0.5, pattern: CHORD(FROST_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: ROOT(["A2", "F2", "C2", "G2"]) },
    { inst: "bell", gain: 0.7, minIntensity: 0.4, pattern: ARP(FROST_CHORDS, 4, 4) },
    { inst: "lead", gain: 0.8, minIntensity: 0.55, pattern: LINE([[0, 8], ["E5", 8], ["C5", 4], ["D5", 4], ["E5", 8], [0, 8], ["A4", 8], ["C5", 4], ["B4", 4], ["A4", 8]]) },
  ],
};

// ---- Ember (volcanic) — driving, tense but hopeful (Em: i–VI–III–VII) ------------
const EMBER_CHORDS = [["E4", "G4", "B4"], ["C4", "E4", "G4"], ["D4", "G4", "B4"], ["D4", "F#4", "A4"]];
export const EMBER_THEME: OTrack = {
  bpm: 124,
  layers: [
    { inst: "strings", gain: 1.0, pattern: CHORD(EMBER_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: PULSE(["E2", "C2", "G2", "D2"]) },
    { inst: "arp", gain: 0.75, minIntensity: 0.3, pattern: ARP(EMBER_CHORDS) },
    { inst: "lead", gain: 0.9, pattern: LINE([["E5", 8], ["G5", 4], ["F#5", 4], ["E5", 8], ["B4", 8], ["E5", 8], ["D5", 4], ["G5", 4], ["F#5", 8], ["E5", 8]]) },
    { inst: "boom", gain: 1.0, minIntensity: 0.5, pattern: BOOM("E1", 8, 8) },
  ],
};

// ---- Sub-maps (cave/canopy/cloud) — atmospheric synth, hushed & glimmering (Am) --
const SUB_CHORDS = [["A3", "C4", "E4"], ["B3", "D4", "G4"], ["A3", "C4", "F4"], ["B3", "D4", "G4"]];
export const SUBMAP_THEME: OTrack = {
  bpm: 82,
  layers: [
    { inst: "pad", gain: 1.0, pattern: CHORD(SUB_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: ROOT(["A1", "G2", "F2", "G2"]) },
    { inst: "arp", gain: 0.55, minIntensity: 0.5, pattern: ARP(SUB_CHORDS, 4, 4) },
    { inst: "bell", gain: 0.6, minIntensity: 0.6, pattern: LINE([[0, 8], ["A4", 4], ["C5", 4], ["E5", 8], [0, 8], [0, 8], ["G4", 4], ["B4", 4], ["E5", 8], [0, 8]]) },
  ],
};

// ---- Shop interiors — bright, bouncy synth-pop, cheerful (C: I–vi–IV–V) ----------
const SHOP_CHORDS = [["E4", "G4", "C5"], ["E4", "A4", "C5"], ["F4", "A4", "C5"], ["D4", "G4", "B4"]];
export const SHOP_THEME: OTrack = {
  bpm: 118,
  layers: [
    { inst: "pad", gain: 0.9, pattern: CHORD(SHOP_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: PULSE(["C3", "A2", "F2", "G2"]) },
    { inst: "arp", gain: 0.7, minIntensity: 0.4, pattern: ARP(SHOP_CHORDS) },
    { inst: "lead", gain: 0.85, minIntensity: 0.4, pattern: LINE([["G4", 4], ["C5", 4], ["E5", 8], ["D5", 8], ["C5", 8], ["A4", 4], ["C5", 4], ["G4", 8], ["E4", 8], ["G4", 8]]) },
  ],
};

// ---- Voyage — the biggest, most sweeping anthem of all (D: I–V–vi–IV) ------------
const VOY_CHORDS = [["D4", "F#4", "A4"], ["C#4", "E4", "A4"], ["D4", "F#4", "B4"], ["D4", "G4", "B4"]];
export const VOYAGE_THEME: OTrack = {
  bpm: 114,
  layers: [
    { inst: "strings", gain: 1.0, pattern: CHORD(VOY_CHORDS) },
    { inst: "pad", gain: 0.7, minIntensity: 0.3, pattern: CHORD(VOY_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: PULSE(["D2", "A2", "B2", "G2"]) },
    { inst: "arp", gain: 0.72, minIntensity: 0.3, pattern: ARP(VOY_CHORDS) },
    { inst: "lead", gain: 0.95, pattern: LINE([["F#4", 8], ["A4", 8], ["D5", 8], ["E5", 8], ["F#5", 8], ["E5", 4], ["D5", 4], ["A4", 8], ["D5", 8]]) },
    { inst: "boom", gain: 1.0, minIntensity: 0.85, pattern: BOOM("D2", 4, 16) },
  ],
};

// ======= extra tracks for VARIETY (new, so the score doesn't loop one feel). Each is an
// ORIGINAL composition in the *energy/era/idiom* of a track the owner loves — never a copy of
// any melody or recording; only the emotional DNA of the genre. =======

// ---- AURORA — warm, soaring, open worldbeat-synth (A: I–V–vi–IV). Big-hearted exploration.
const AURORA_CHORDS = [["C#4", "E4", "A4"], ["E4", "G#4", "B4"], ["F#4", "A4", "C#4"], ["D4", "F#4", "A4"]];
export const AURORA_THEME: OTrack = {
  bpm: 100,
  layers: [
    { inst: "pad", gain: 0.9, pattern: CHORD(AURORA_CHORDS) },
    { inst: "strings", gain: 0.8, minIntensity: 0.4, pattern: CHORD(AURORA_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: PULSE(["A2", "E2", "F#2", "D2"], 4, 4) },
    { inst: "arp", gain: 0.55, minIntensity: 0.45, pattern: ARP(AURORA_CHORDS) },
    { inst: "lead", gain: 0.9, pattern: LINE([["E4", 8], ["A4", 4], ["B4", 4], ["C#5", 8], ["E5", 8], ["D5", 8], ["C#5", 4], ["B4", 4], ["A4", 8], ["E4", 8]]) },
    { inst: "boom", gain: 0.7, minIntensity: 0.6, pattern: BOOM("A2", 4, 16) },
  ],
};

// ---- NOCTURNE — dreamy, wistful, late-night new-wave ballad (Am: vi–IV–I–V). Cozy/hushed.
const NOCT_CHORDS = [["A3", "C4", "E4"], ["F3", "A3", "C4"], ["C4", "E4", "G4"], ["G3", "B3", "D4"]];
export const NOCTURNE_THEME: OTrack = {
  bpm: 90,
  layers: [
    { inst: "pad", gain: 1.0, pattern: CHORD(NOCT_CHORDS) },
    { inst: "strings", gain: 0.5, minIntensity: 0.55, pattern: CHORD(NOCT_CHORDS) },
    { inst: "bass", gain: 0.95, pattern: ROOT(["A2", "F2", "C2", "G2"]) },
    { inst: "bell", gain: 0.6, minIntensity: 0.4, pattern: ARP(NOCT_CHORDS, 4, 4) },
    { inst: "lead", gain: 0.78, minIntensity: 0.5, pattern: LINE([[0, 8], ["E4", 8], ["G4", 4], ["A4", 4], ["G4", 8], [0, 8], ["C5", 8], ["B4", 4], ["G4", 4], ["E4", 8]]) },
  ],
};

// ---- GROOVE — punchy, brassy, funky stabs & driving bass (E mixolydian vamp). Lively spots.
const GROOVE_CHORDS = [["E4", "G#4", "B4"], ["D4", "F#4", "A4"], ["A3", "C#4", "E4"], ["D4", "F#4", "A4"]];
export const GROOVE_THEME: OTrack = {
  bpm: 112,
  layers: [
    { inst: "bass", gain: 1.0, pattern: PULSE(["E2", "D2", "A2", "D2"]) },
    { inst: "arp", gain: 0.7, minIntensity: 0.35, pattern: ARP(GROOVE_CHORDS) },
    { inst: "strings", gain: 0.55, minIntensity: 0.6, pattern: CHORD(GROOVE_CHORDS) },
    { inst: "lead", gain: 0.9, pattern: LINE([["E5", 4], [0, 4], ["G5", 4], [0, 4], ["B4", 4], ["A4", 4], ["E5", 8], [0, 8], ["E5", 4], ["D5", 4], ["G5", 4], ["A5", 4], [0, 8]]) },
    { inst: "boom", gain: 0.95, minIntensity: 0.4, pattern: BOOM("E2", 8, 8) },
  ],
};

// ---- TRIUMPH — driving, anthemic "montage" energy, relentless pulse + big hits (Am: i–VII–VI–VII).
const TRIUMPH_CHORDS = [["A3", "C4", "E4"], ["G3", "B3", "D4"], ["F3", "A3", "C4"], ["G3", "B3", "D4"]];
export const TRIUMPH_THEME: OTrack = {
  bpm: 116,
  layers: [
    { inst: "strings", gain: 1.0, pattern: CHORD(TRIUMPH_CHORDS) },
    { inst: "bass", gain: 1.0, pattern: PULSE(["A2", "G2", "F2", "G2"]) },
    { inst: "arp", gain: 0.75, minIntensity: 0.3, pattern: ARP(TRIUMPH_CHORDS) },
    { inst: "lead", gain: 0.95, pattern: LINE([["A4", 8], ["A4", 4], ["C5", 4], ["D5", 8], ["E5", 8], ["E5", 4], ["D5", 4], ["C5", 8], ["A4", 8], [0, 8]]) },
    { inst: "boom", gain: 1.0, minIntensity: 0.4, pattern: BOOM("A1", 8, 8) },
  ],
};

/** Pick the theme for where the player is. `ambient` is the ring's biome proxy. Now rotates
 *  through the wider pool so the score varies as you move + lifts to high-energy on deep rings. */
export function trackForContext(ring: number, ambient: string | undefined, isShop: boolean, isSubMap: boolean): OTrack {
  if (isShop) return ring % 2 ? GROOVE_THEME : SHOP_THEME;         // lively — funk stabs alternate
  if (isSubMap) return ring % 2 ? NOCTURNE_THEME : SUBMAP_THEME;   // hushed/dreamy alternate
  if (ring <= 0) return CIRQLSPACE_THEME;
  if (ring === 1) return TOWN_THEME;
  const semis = [0, 2, -3, 5, -2, 3][((ring % 6) + 6) % 6];
  if (ambient === "snow") return transpose(FROST_THEME, semis);   // biome-locked moods
  if (ambient === "ember") return transpose(EMBER_THEME, semis);
  // deeper rings = higher stakes → the montage energy joins the rotation; else sweeping/soaring
  const pool = ring >= 8 ? [WILDS_THEME, AURORA_THEME, TRIUMPH_THEME] : [WILDS_THEME, AURORA_THEME];
  return transpose(pool[((ring / 2) | 0) % pool.length], semis);
}
