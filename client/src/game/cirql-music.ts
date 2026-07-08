// CIRQL — Milestone G: the world soundtrack (a hybrid chiptune + ambient MusicKit).
//
// The flagship gets its own adaptive score, built on the shared MusicKit sequencer
// (square/triangle/sine voices + a lookahead scheduler). "Hybrid" = a soft triangle/
// sine pad bed (the ambient half) under a gentle square lead (the chiptune half), at
// cozy tempos in warm major/pentatonic keys — magical, never frantic (no combat here).
//
// Adaptive: `trackForContext(ring, ambient)` picks the theme for where you are —
// CIRQLSPACE (home), the Town, a shop interior, a sub-map (cave/canopy/cloud), or the
// wilds (a biome mood, gently transposed per ring so neighbours differ but cohere).
// The engine swaps tracks on every ring change and eases intensity by context.

import type { Track, Step } from "./musickit";

// ---- transpose (biome variety) — same tune, new key; any shift stays in-mode -------
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const IDX: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
function shift(n: string | 0, semis: number): string | 0 {
  if (n === 0 || semis === 0) return n;
  const m = String(n).match(/^([A-G]#?)(-?\d)$/); if (!m) return n;
  const abs = IDX[m[1]] + (parseInt(m[2], 10) + 1) * 12 + semis;
  return `${NAMES[((abs % 12) + 12) % 12]}${Math.floor(abs / 12) - 1}`;
}
/** A drum step passes through unshifted; melodic notes transpose by `semis`. */
export function transpose(t: Track, semis: number, bpmScale = 1): Track {
  return {
    bpm: Math.round(t.bpm * bpmScale),
    layers: t.layers.map((l) => ({
      ...l,
      pattern: l.pattern.map((s): Step => (l.role === "drums" ? s : { n: shift(s.n, semis), d: s.d })),
    })),
  };
}

// ---- CIRQLSPACE — your home island: gentle, warm, unhurried ------------------------
export const CIRQLSPACE_THEME: Track = {
  bpm: 100,
  layers: [
    { role: "lead", wave: "square", gain: 0.3, pattern: [
      { n: "E5", d: 4 }, { n: "D5", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 4 }, { n: "E5", d: 2 }, { n: "G5", d: 2 },
      { n: "A5", d: 4 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 6 }, { n: 0, d: 2 },
    ] },
    { role: "harmony", wave: "sine", gain: 0.24, minIntensity: 0, pattern: [
      { n: "C4", d: 8 }, { n: "G4", d: 8 }, { n: "A3", d: 8 }, { n: "F4", d: 8 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.42, pattern: [
      { n: "C3", d: 8 }, { n: "G2", d: 8 }, { n: "A2", d: 8 }, { n: "F2", d: 8 },
    ] },
    { role: "drums", minIntensity: 0.7, pattern: [
      { n: "K", d: 4 }, { n: "H", d: 4 }, { n: "H", d: 4 }, { n: "H", d: 4 },
    ] },
  ],
};

// ---- The Town — the community hub: livelier, friendly, a little bounce -------------
export const TOWN_THEME: Track = {
  bpm: 118,
  layers: [
    { role: "lead", wave: "square", gain: 0.36, pattern: [
      { n: "G4", d: 2 }, { n: "A4", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 4 }, { n: "D5", d: 2 }, { n: "C5", d: 2 },
      { n: "A4", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 2 }, { n: "G5", d: 4 }, { n: "E5", d: 2 }, { n: "D5", d: 2 },
    ] },
    { role: "harmony", wave: "triangle", gain: 0.2, minIntensity: 0.35, pattern: [
      { n: "E4", d: 2 }, { n: 0, d: 2 }, { n: "E4", d: 2 }, { n: 0, d: 2 }, { n: "F4", d: 2 }, { n: 0, d: 2 }, { n: "D4", d: 2 }, { n: 0, d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.46, pattern: [
      { n: "C3", d: 2 }, { n: "C2", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 }, { n: "A2", d: 2 }, { n: "A2", d: 2 }, { n: "F2", d: 2 }, { n: "F2", d: 2 },
    ] },
    { role: "drums", minIntensity: 0.3, pattern: [
      { n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 }, { n: "K", d: 2 }, { n: "K", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 },
    ] },
  ],
};

// ---- The wilds — exploratory, open, a touch of wonder ------------------------------
export const WILDS_THEME: Track = {
  bpm: 112,
  layers: [
    { role: "lead", wave: "square", gain: 0.32, pattern: [
      { n: "A4", d: 3 }, { n: "B4", d: 1 }, { n: "D5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 4 }, { n: "B4", d: 4 },
      { n: "A4", d: 3 }, { n: "B4", d: 1 }, { n: "D5", d: 2 }, { n: "F#5", d: 2 }, { n: "E5", d: 6 }, { n: 0, d: 2 },
    ] },
    { role: "harmony", wave: "sine", gain: 0.22, minIntensity: 0, pattern: [
      { n: "D4", d: 8 }, { n: "A3", d: 8 }, { n: "B3", d: 8 }, { n: "F#3", d: 8 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.44, pattern: [
      { n: "D3", d: 4 }, { n: "D2", d: 4 }, { n: "A2", d: 4 }, { n: "A2", d: 4 }, { n: "B2", d: 4 }, { n: "B2", d: 4 }, { n: "F#2", d: 4 }, { n: "F#2", d: 4 },
    ] },
    { role: "drums", minIntensity: 0.45, pattern: [
      { n: "K", d: 4 }, { n: "H", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 4 }, { n: "H", d: 2 }, { n: "H", d: 2 },
    ] },
  ],
};

// ---- Frost (winter biome) — airy, still, cool ------------------------------------
export const FROST_THEME: Track = {
  bpm: 92,
  layers: [
    { role: "lead", wave: "sine", gain: 0.3, pattern: [
      { n: "B4", d: 4 }, { n: "F#5", d: 4 }, { n: "E5", d: 2 }, { n: "D5", d: 2 }, { n: "B4", d: 4 },
      { n: "A4", d: 4 }, { n: "E5", d: 4 }, { n: "F#5", d: 6 }, { n: 0, d: 2 },
    ] },
    { role: "harmony", wave: "triangle", gain: 0.18, minIntensity: 0, pattern: [
      { n: "B3", d: 8 }, { n: "F#3", d: 8 }, { n: "G3", d: 8 }, { n: "D3", d: 8 },
    ] },
    { role: "bass", wave: "sine", gain: 0.4, pattern: [
      { n: "B2", d: 8 }, { n: "F#2", d: 8 }, { n: "G2", d: 8 }, { n: "D2", d: 8 },
    ] },
    { role: "drums", minIntensity: 0.75, pattern: [
      { n: "H", d: 4 }, { n: 0, d: 4 }, { n: "H", d: 4 }, { n: 0, d: 4 },
    ] },
  ],
};

// ---- Ember (volcanic biome) — driving, glowing, a hint of danger-that-never-comes -
export const EMBER_THEME: Track = {
  bpm: 120,
  layers: [
    { role: "lead", wave: "square", gain: 0.34, pattern: [
      { n: "E5", d: 2 }, { n: "F5", d: 2 }, { n: "E5", d: 2 }, { n: "C5", d: 2 }, { n: "D5", d: 4 }, { n: "B4", d: 4 },
      { n: "E5", d: 2 }, { n: "G5", d: 2 }, { n: "F5", d: 2 }, { n: "E5", d: 2 }, { n: "D5", d: 6 }, { n: 0, d: 2 },
    ] },
    { role: "harmony", wave: "sawtooth", gain: 0.16, minIntensity: 0.4, pattern: [
      { n: "E4", d: 4 }, { n: "C4", d: 4 }, { n: "D4", d: 4 }, { n: "B3", d: 4 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.48, pattern: [
      { n: "E2", d: 2 }, { n: "E2", d: 2 }, { n: "C2", d: 2 }, { n: "C2", d: 2 }, { n: "D2", d: 2 }, { n: "D2", d: 2 }, { n: "B1", d: 2 }, { n: "B1", d: 2 },
    ] },
    { role: "drums", minIntensity: 0.3, pattern: [
      { n: "K", d: 2 }, { n: "H", d: 2 }, { n: "K", d: 2 }, { n: "S", d: 2 }, { n: "K", d: 2 }, { n: "H", d: 2 }, { n: "S", d: 2 }, { n: "H", d: 2 },
    ] },
  ],
};

// ---- Sub-maps (cave / canopy / cloud) — hushed, mysterious, glimmering ------------
export const SUBMAP_THEME: Track = {
  bpm: 86,
  layers: [
    { role: "lead", wave: "sine", gain: 0.28, pattern: [
      { n: "A4", d: 4 }, { n: "C5", d: 2 }, { n: "B4", d: 2 }, { n: "E5", d: 4 }, { n: "D5", d: 4 },
      { n: "C5", d: 4 }, { n: "A4", d: 4 }, { n: "B4", d: 6 }, { n: 0, d: 2 },
    ] },
    { role: "harmony", wave: "triangle", gain: 0.18, minIntensity: 0, pattern: [
      { n: "A3", d: 8 }, { n: "E3", d: 8 }, { n: "F3", d: 8 }, { n: "C3", d: 8 },
    ] },
    { role: "bass", wave: "sine", gain: 0.4, pattern: [
      { n: "A2", d: 8 }, { n: "E2", d: 8 }, { n: "F2", d: 8 }, { n: "C2", d: 8 },
    ] },
  ],
};

// ---- Shop interiors — tiny, cozy, playful ----------------------------------------
export const SHOP_THEME: Track = {
  bpm: 124,
  layers: [
    { role: "lead", wave: "square", gain: 0.3, pattern: [
      { n: "C5", d: 2 }, { n: "E5", d: 2 }, { n: "G5", d: 2 }, { n: "E5", d: 2 }, { n: "F5", d: 2 }, { n: "D5", d: 2 }, { n: "C5", d: 4 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.4, pattern: [
      { n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "F2", d: 2 }, { n: "C3", d: 2 }, { n: "G2", d: 2 }, { n: "G2", d: 2 },
    ] },
    { role: "harmony", wave: "sine", gain: 0.16, minIntensity: 0.5, pattern: [
      { n: "E4", d: 4 }, { n: "E4", d: 4 }, { n: "F4", d: 4 }, { n: "E4", d: 4 },
    ] },
  ],
};

// ---- Voyage — the sailing crossing: swaying, adventurous -------------------------
export const VOYAGE_THEME: Track = {
  bpm: 108,
  layers: [
    { role: "lead", wave: "square", gain: 0.34, pattern: [
      { n: "D5", d: 4 }, { n: "E5", d: 2 }, { n: "F#5", d: 2 }, { n: "A5", d: 4 }, { n: "G5", d: 2 }, { n: "E5", d: 2 },
      { n: "D5", d: 4 }, { n: "A4", d: 2 }, { n: "D5", d: 2 }, { n: "E5", d: 6 }, { n: 0, d: 2 },
    ] },
    { role: "bass", wave: "triangle", gain: 0.46, pattern: [
      { n: "D3", d: 4 }, { n: "D2", d: 4 }, { n: "G2", d: 4 }, { n: "G2", d: 4 }, { n: "A2", d: 4 }, { n: "A2", d: 4 }, { n: "D3", d: 4 }, { n: "A2", d: 4 },
    ] },
    { role: "drums", minIntensity: 0.2, pattern: [
      { n: "K", d: 4 }, { n: "S", d: 4 }, { n: "K", d: 2 }, { n: "K", d: 2 }, { n: "S", d: 4 },
    ] },
  ],
};

/** Pick the theme for where the player is. `ambient` is the ring's biome proxy. */
export function trackForContext(ring: number, ambient: string | undefined, isShop: boolean, isSubMap: boolean): Track {
  if (isShop) return SHOP_THEME;
  if (isSubMap) return SUBMAP_THEME;
  if (ring <= 0) return CIRQLSPACE_THEME;
  if (ring === 1) return TOWN_THEME;
  // the wilds — a biome mood, gently transposed by ring so neighbours differ but cohere
  const tune = ambient === "snow" ? FROST_THEME : ambient === "ember" ? EMBER_THEME : WILDS_THEME;
  const semis = [0, 2, -3, 5, -2, 3][((ring % 6) + 6) % 6];
  return semis ? transpose(tune, semis) : tune;
}
