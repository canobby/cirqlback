// CIRQL — procedural infinite worlds (CHR-101).
//
// Endless worlds generated deterministically from a seed, emitting the SAME
// WorldConfig shape as the crafted worlds (worlds.ts) so they mix seamlessly.
// Seeded by (index, playerSeed) → reproducible AND unique per player; the host
// stores only the index, and regenerates on demand. Fully offline, no LLM.
import type { WorldConfig } from "./worlds";

// Small, fast seeded PRNG (mulberry32).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

const ADJ = ["Silent", "Verdant", "Frozen", "Astral", "Hidden", "Gilded", "Twilight", "Crimson", "Azure", "Lunar", "Solar", "Dormant", "Echoing", "Radiant", "Ashen", "Emerald"];
const NOUN = ["Halo", "Spiral", "Reach", "Garden", "Hollow", "Expanse", "Drift", "Bloom", "Veil", "Loop", "Basin", "Crown", "Cascade", "Verge", "Meridian", "Nexus"];

// Generate an endless world for a given index (0-based within the generated
// stream is fine; callers pass the absolute world index). `playerSeed` makes the
// stream unique per player.
export function generateWorld(index: number, playerSeed = 0): WorldConfig {
  const rng = mulberry32((Math.imul(index + 1, 2654435761) ^ Math.imul(playerSeed + 1, 40503)) >>> 0);
  const baseHue = Math.floor(rng() * 360);

  // A harmonious palette around the base hue.
  const ringColors: string[] = [];
  for (let k = 0; k < 6; k++) {
    const hue = baseHue + (k - 2.5) * (10 + rng() * 22);
    const sat = 62 + rng() * 24;
    const light = 56 + rng() * 14;
    ringColors.push(hslToHex(hue, sat, light));
  }
  const accent = hslToHex(baseHue, 78, 58);

  const ringCount = Math.min(6, 3 + Math.floor(index / 2));           // grows, then holds at 6
  const span = Math.max(0.94, 1.16 - Math.min(index, 12) * 0.012);    // arcs tighten slowly
  const difficulty = Math.min(1, 0.2 + index * 0.045);
  const name = `${ADJ[Math.floor(rng() * ADJ.length)]} ${NOUN[Math.floor(rng() * NOUN.length)]}`;
  const shiny = rng() < 0.05; // CHR-108: ~1 in 20 worlds is a rare shiny (deterministic per seed)

  return { id: `gen-${index}`, name, ringColors, accent, ringCount, span, difficulty, shiny };
}

// ── Daily Circle (CHR-104) ──────────────────────────────────────────────────
// One shared world per UTC day — the SAME for every player, so results are
// comparable and shareable. Seeded only by the day number (no player seed), and
// the difficulty index is kept in a fair, moderate band (not the endless ramp).
export const DAILY_MS = 86400000;
const DAILY_EPOCH = Math.floor(Date.parse("2026-01-01T00:00:00Z") / DAILY_MS); // puzzle #1
const DAILY_SALT = 0x5eed;

export function todayDay(now = Date.now()): number { return Math.floor(now / DAILY_MS); }
export function dailyPuzzleNumber(day: number): number { return day - DAILY_EPOCH + 1; }

export function dailyWorld(day: number): WorldConfig {
  const rng = mulberry32(((day + 1) * 2654435761 ^ DAILY_SALT) >>> 0);
  const idx = 3 + Math.floor(rng() * 5); // 3..7 → 4–6 rings, moderate difficulty (fair daily)
  const w = generateWorld(idx, (day ^ DAILY_SALT) >>> 0);
  return { ...w, id: `daily-${day}` };
}
