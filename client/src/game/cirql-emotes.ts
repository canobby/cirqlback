// CIRQL — emotes (CHR-260, M11 "Depth & Delight").
//
// Chat-free expression: a small roster of emotes you play from a wheel. Each one shows
// a timed glyph over your avatar and (when connected) broadcasts to everyone on your
// ring over the presence socket, so travellers can wave / dance / share a heart at the
// gathering spots + the Drive-In without typing — safe for minors, no freeform text.
//
// A few carry a light avatar MOTION (dance bounce, a sit/rest settle, a celebratory hop)
// the engine applies while the glyph is up; the rest are glyph-only. Keep this the single
// source of truth — the engine imports EMOTE_BY_ID to resolve motion + hold by id, the
// page builds the wheel from EMOTES, and the server only length-clips the id.

export type EmoteMotion = "bob" | "sit" | "hop";

export interface EmoteDef {
  id: string;
  label: string;
  glyph: string;          // rendered big + crisp over the avatar (color emoji)
  motion?: EmoteMotion;   // optional avatar movement while the emote is up
  hold?: number;          // seconds the emote lasts (default EMOTE_SECONDS)
}

export const EMOTE_SECONDS = 3.4;

// The wheel, in display order. Owner's picks (wave/heart/laugh/celebrate/dance/sit/wow/
// question/mad/sing/flip) + a world-flavoured lantern. A tidy dozen for a 3×4 wheel.
export const EMOTES: EmoteDef[] = [
  { id: "wave",      label: "Wave",     glyph: "👋", motion: "hop" },
  { id: "heart",     label: "Love",     glyph: "❤️" },
  { id: "laugh",     label: "Laugh",    glyph: "😂" },
  { id: "celebrate", label: "Celebrate", glyph: "🎉", motion: "hop" },
  { id: "dance",     label: "Dance",    glyph: "💃", motion: "bob", hold: 5 },
  { id: "sing",      label: "Sing",     glyph: "🎵", motion: "bob", hold: 5 },
  { id: "sit",       label: "Rest",     glyph: "🪑", motion: "sit", hold: 7 },
  { id: "wow",       label: "Wow",      glyph: "😮" },
  { id: "question",  label: "Hmm?",     glyph: "❓" },
  { id: "mad",       label: "Mad",      glyph: "😠" },
  { id: "flip",      label: "Flip",     glyph: "🤸", motion: "hop" },
  { id: "lantern",   label: "Lantern",  glyph: "🏮" },
];

export const EMOTE_BY_ID: Record<string, EmoteDef> = Object.fromEntries(EMOTES.map((e) => [e.id, e]));
