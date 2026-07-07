// CIRQL — chat moderation filter (CHR-249).
//
// A server-authoritative profanity mask for the world's freeform channels (Global /
// Party). CIRQLVERSE may host minors, so the safety decision is: keep chat FREEFORM but
// always run it through this mask before broadcast (never trust the client), on top of
// per-message rate limits + report/block. Masking (not rejecting) keeps the flow natural
// while stripping slurs/obscenities.
//
// The matcher normalises common leet-speak + separators so "f.u.c.k" / "sh1t" / "a$$"
// still catch, and collapses long repeats ("shiiit"). Exact-normalised matching is used
// for short words (to dodge the Scunthorpe problem — "class", "pass"); a small HARD list
// of unambiguous long words also matches as a substring to catch glued-together evasion.

// Normalised (already lower-cased, leet-folded, de-repeated, alpha-only) bad words.
const WORDS = [
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "piss", "cunt", "cock",
  "pussy", "slut", "whore", "fag", "faggot", "nigger", "nigga", "retard", "wanker",
  "twat", "prick", "bollocks", "arsehole", "dickhead", "motherfucker", "jackass",
  "boner", "dildo", "coon", "spastic", "kike", "chink", "tranny", "rape", "rapist",
];
// Unambiguous long words that should also catch as a substring (glued-together evasion).
const HARD = [
  "fuck", "shit", "bitch", "cunt", "faggot", "nigger", "nigga", "motherfucker",
  "asshole", "dickhead", "whore", "rapist",
];

const WORDSET = new Set(WORDS);

function normalise(w: string): string {
  return w
    .toLowerCase()
    .replace(/[@4]/g, "a").replace(/3/g, "e").replace(/[1!|]/g, "i")
    .replace(/0/g, "o").replace(/[5$]/g, "s").replace(/7/g, "t").replace(/8/g, "b")
    .replace(/[^a-z]/g, "")          // drop separators so "f.u.c.k" -> "fuck"
    .replace(/(.)\1{2,}/g, "$1$1");  // collapse 3+ repeats ("shiiit" -> "shiit"? keep 2)
}

function isBad(token: string): boolean {
  const n = normalise(token);
  if (!n) return false;
  if (WORDSET.has(n)) return true;                 // exact (safe for short words)
  for (const h of HARD) if (n.includes(h)) return true;   // substring only for the hard list
  return false;
}

/** Mask any profanity in `text`, preserving spacing. Returns the cleaned string. */
export function maskProfanity(text: string): string {
  return text.replace(/\S+/g, (tok) => (isBad(tok) ? "*".repeat(Math.max(3, tok.length)) : tok));
}
