// CIRQL — cutscenes & mini-journeys (CHR-264, M11 "Depth & Delight").
//
// A tiny, data-authored, ALWAYS-skippable cutscene format: a cutscene is a list of
// timed "beats", each a bit of smooth-text (title / subtitle / body) over a soft
// visual effect (fog parting, a bloom of light, drifting sparks, an aurora sweep, a
// burst of celebration, a warm dawn). The engine (CirqlWorldEngine.playCutscene) plays
// them letterboxed, freezes the world, fades text in/out per beat, and lets a tap / E
// skip to the end — cheap authored emotional beats woven through the world.
//
// New moments are just data, so they're cheap to add (the issue's ask). The engine owns
// the *anchor* moment (a first-arrival cutscene when you reach a brand-new shore); the
// page triggers the rest (onboarding wake, campaign-complete sting, world-energy
// milestone) by handing an authored Cutscene to playCutscene().

export type CutsceneFx = "none" | "fog" | "bloom" | "sparks" | "aurora" | "celebrate" | "dawn";

export interface CutsceneBeat {
  title?: string;    // big line
  sub?: string;      // accent line under the title
  body?: string;     // soft body line
  accent?: string;   // hex accent for this beat (rules + sub)
  fx?: CutsceneFx;   // ambient effect behind the text
  hold?: number;     // seconds this beat lasts (default BEAT_SECONDS)
}

export interface Cutscene {
  id: string;
  beats: CutsceneBeat[];
}

export const BEAT_SECONDS = 3.0;

const GOLD = "#ffc46b";
const TEAL = "#35e0d0";
const VIOLET = "#b26cff";

// ---- authored cutscenes ---------------------------------------------------

/** First-run onboarding: waking at the Hearth. Played after the character creator. */
export const WAKE_CUTSCENE: Cutscene = {
  id: "wake",
  beats: [
    { fx: "dawn", body: "You drift ashore on a circle of light…", accent: GOLD, hold: 3.0 },
    { fx: "bloom", title: "CIRQLSPACE", sub: "your home in the endless ocean", accent: GOLD, hold: 3.2 },
    { fx: "sparks", body: "A lantern waits nearby. Light it, and the world begins.", accent: TEAL, hold: 3.2 },
  ],
};

/** Reaching a brand-new shore for the first time (engine-owned anchor). */
export function arrivalCutscene(name: string, sub: string, accent: string): Cutscene {
  return {
    id: "arrive:" + name,
    beats: [
      { fx: "fog", body: "The fog parts before you…", accent, hold: 2.2 },
      { fx: "bloom", title: name, sub, accent, hold: 3.0 },
    ],
  };
}

/** A party finishes a co-op campaign — a short celebration sting (M9 tie-in). */
export function campaignCutscene(title: string, reward: number): Cutscene {
  return {
    id: "campaign:" + title,
    beats: [
      { fx: "celebrate", title: "Campaign Complete", sub: title, accent: TEAL, hold: 3.2 },
      { fx: "sparks", body: `The crew's work ripples outward. +${reward} sparqs.`, accent: GOLD, hold: 2.6 },
    ],
  };
}

/** The shared World Energy meter fills — the world stirs + a new shore rises for all. */
export function worldEnergyCutscene(): Cutscene {
  return {
    id: "world-energy",
    beats: [
      { fx: "aurora", title: "The World Stirs", accent: VIOLET, hold: 3.0 },
      { fx: "bloom", body: "You've fed the shared light — a new shore rises for everyone.", accent: TEAL, hold: 3.2 },
    ],
  };
}
