// CIRQL — emotes (CHR-260, M11 "Depth & Delight").
//
// Chat-free expression: a small roster of emotes you play from a wheel. Each one shows
// a timed glyph over your avatar and (when connected) broadcasts to everyone on your
// ring over the presence socket, so travellers can wave / dance / share a heart at the
// gathering spots + the Drive-In without typing — safe for minors, no freeform text.
//
// Many carry a light avatar MOTION the engine applies while the glyph is up — a vertical
// bounce (bob/hop), a settle-to-sit, and (Phase I3) full BODY GESTURES: a wave of the hand,
// a forward bow, clapping, both arms raised in a cheer, a spin (twirl), a blown kiss, a
// side-to-side dance sway. The rest are glyph-only. Keep this the single source of truth —
// the engine imports EMOTE_BY_ID to resolve motion + hold by id, the page builds the wheel
// from EMOTES, and the server only length-clips the id.

export type EmoteMotion =
  | "bob" | "sit" | "hop"                                   // vertical-only (I1/CHR-260)
  | "wave" | "bow" | "clap" | "cheer" | "twirl" | "kiss" | "sway";   // body gestures (I3)

export interface EmoteDef {
  id: string;
  label: string;
  glyph: string;          // rendered big + crisp over the avatar (color emoji)
  motion?: EmoteMotion;   // optional avatar movement while the emote is up
  hold?: number;          // seconds the emote lasts (default EMOTE_SECONDS)
}

export const EMOTE_SECONDS = 3.4;

// The wheel, in display order — a 4×4 of chat-free expressions. Phase I3 grew it from
// head-glyph icons into real body gestures (wave/bow/clap/cheer/twirl/kiss/dance).
export const EMOTES: EmoteDef[] = [
  { id: "wave",      label: "Wave",     glyph: "👋", motion: "wave" },
  { id: "bow",       label: "Bow",      glyph: "🙇", motion: "bow" },
  { id: "heart",     label: "Love",     glyph: "❤️" },
  { id: "kiss",      label: "Kiss",     glyph: "😘", motion: "kiss" },
  { id: "laugh",     label: "Laugh",    glyph: "😂" },
  { id: "clap",      label: "Clap",     glyph: "👏", motion: "clap", hold: 4 },
  { id: "cheer",     label: "Cheer",    glyph: "🙌", motion: "cheer", hold: 4 },
  { id: "celebrate", label: "Celebrate", glyph: "🎉", motion: "hop" },
  { id: "dance",     label: "Dance",    glyph: "💃", motion: "sway", hold: 5 },
  { id: "twirl",     label: "Twirl",    glyph: "💫", motion: "twirl", hold: 4 },
  { id: "flip",      label: "Flip",     glyph: "🤸", motion: "hop" },
  { id: "wow",       label: "Wow",      glyph: "😮" },
  { id: "question",  label: "Hmm?",     glyph: "❓" },
  { id: "mad",       label: "Mad",      glyph: "😠" },
  { id: "sit",       label: "Rest",     glyph: "🪑", motion: "sit", hold: 7 },
  { id: "lantern",   label: "Lantern",  glyph: "🏮" },
];

export const EMOTE_BY_ID: Record<string, EmoteDef> = Object.fromEntries(EMOTES.map((e) => [e.id, e]));

// ---------- paired social gestures (Phase I4) ----------
// Two-person moments you can only offer when standing next to another traveller. The
// server relays one request to BOTH players (same handshake as "share a light"), so each
// side turns to face the other and plays the gesture in sync, with a shared flourish
// (spark / hearts / notes) blooming between them. The body animation reuses an I3 emote
// motion by id; `fx` picks the between-them flourish the engine draws at their midpoint.
export type PairFx = "spark" | "hearts" | "notes";
export interface PairDef {
  id: string;
  label: string;
  glyph: string;    // shown on the "Together" panel button
  emote: string;    // I3 emote id whose body motion each partner plays
  fx: PairFx;       // the flourish drawn between the pair
  hold: number;     // seconds
}
export const PAIR_GESTURES: PairDef[] = [
  { id: "highfive", label: "High-Five", glyph: "✋", emote: "wave",  fx: "spark",  hold: 2.4 },
  { id: "hug",      label: "Hug",       glyph: "🤗", emote: "bow",   fx: "hearts", hold: 2.8 },
  { id: "dance",    label: "Dance",     glyph: "💃", emote: "dance", fx: "notes",  hold: 4.4 },
  { id: "sit",      label: "Sit",       glyph: "🪑", emote: "sit",   fx: "hearts", hold: 6 },
];
export const PAIR_BY_ID: Record<string, PairDef> = Object.fromEntries(PAIR_GESTURES.map((g) => [g.id, g]));
