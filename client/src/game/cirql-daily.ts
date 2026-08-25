// CIRQLVERSE — M10 daily + seasonal loops (CHR-257).
//
// Fresh reasons to log in without endless authoring: a single rotating DAILY task
// (deterministic from the UTC date, so everyone gets the same one each day) plus a
// lightweight SEASONAL/weekend EVENT framework that can buff rewards or theme the world.
//
// Deliberately tracked at the PAGE level off events the world already emits — playing a
// Wonder, sailing to a new shore, finishing a keeper's quest — so no engine/quest coupling
// and no new tables (progress + streak ride in the cirql game_progress blob).

export type DailyTask = "attune" | "voyage" | "explore";

export interface Daily {
  date: string;            // UTC YYYY-MM-DD this daily is for
  task: DailyTask;
  title: string;
  blurb: string;
  reward: number;          // base spark reward (before any event multiplier)
}

export interface CirqlEvent {
  id: string;
  name: string;
  blurb: string;
  sparkMult: number;       // multiplier applied to daily rewards while active
  accent: string;
  emoji?: string;          // shown on the daily card / event banner (holidays)
}

// tiny deterministic string hash → uint
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const TASKS: Record<DailyTask, { title: string; blurb: string }> = {
  attune: { title: "Attune to a Wonder", blurb: "Play any game in CirqlCade today." },
  voyage: { title: "Answer the Sea", blurb: "Sail to a shore you've never reached before." },
  explore: { title: "A Keeper's Task", blurb: "Complete any shore keeper's quest." },
};
const ORDER: DailyTask[] = ["attune", "voyage", "explore"];

/** Today's UTC date string (YYYY-MM-DD). */
export const todayStr = (d = new Date()): string => d.toISOString().slice(0, 10);

/** The daily task for a given UTC date — same for everyone, rotates each day. */
export function dailyForDate(date: string): Daily {
  const task = ORDER[hashStr("cirql-daily:" + date) % ORDER.length];
  const meta = TASKS[task];
  return { date, task, title: meta.title, blurb: meta.blurb, reward: 8 };
}

// ---- real-world holidays (K6) — themed, boosted dailies on the day itself ----
// Local-calendar based (uses the player's date) so it matches their real holiday.
function nthWeekday(year: number, month0: number, weekday: number, n: number): number {
  const firstDow = new Date(year, month0, 1).getDay();
  return 1 + ((weekday - firstDow + 7) % 7) + (n - 1) * 7;
}
function lastWeekday(year: number, month0: number, weekday: number): number {
  const last = new Date(year, month0 + 1, 0);
  return last.getDate() - ((last.getDay() - weekday + 7) % 7);
}
// Easter Sunday (Anonymous Gregorian algorithm) → {month0, day}.
function easter(year: number): { month0: number; day: number } {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month0: month - 1, day };
}

/** The real-world holiday on this date (local calendar), themed for the daily, or null. */
export function holidayFor(d = new Date()): CirqlEvent | null {
  const y = d.getFullYear(), mo = d.getMonth(), day = d.getDate();
  const H = (id: string, name: string, emoji: string, accent: string, sparkMult: number, blurb: string): CirqlEvent => ({ id, name, emoji, accent, sparkMult, blurb });
  if (mo === 0 && day === 1) return H("newyear", "New Year's Day", "🎆", "#ffd24a", 3, "A new year, a wider sea — daily sparqs are TRIPLED!");
  if (mo === 1 && day === 14) return H("valentines", "Valentine's Day", "💖", "#ff7ea8", 2, "Share a light with a traveller — sparqs are doubled.");
  if (mo === 6 && day === 4) return H("julyfourth", "Fourth of July", "🎆", "#6fb4ff", 2, "Fireworks over the sea — sparqs are doubled!");
  if (mo === 9 && day === 31) return H("halloween", "Halloween", "🎃", "#ff9d3c", 2, "A spooky glow on the water — sparqs are doubled!");
  if (mo === 10 && day === nthWeekday(y, 10, 4, 4)) return H("thanksgiving", "Thanksgiving", "🦃", "#ff9a3c", 2, "Gratitude across the rings — sparqs are doubled!");
  if (mo === 11 && day === 24) return H("xmaseve", "Christmas Eve", "🕯️", "#8fd0ff", 2, "A hush over the rings — sparqs are doubled.");
  if (mo === 11 && day === 25) return H("christmas", "Christmas Day", "🎄", "#5be89a", 3, "Warm lights across the whole world — sparqs are TRIPLED!");
  const es = easter(y); if (mo === es.month0 && day === es.day) return H("easter", "Easter", "🐣", "#a6f06a", 2, "Blooms across the shores — sparqs are doubled!");
  if (mo === 4 && day === lastWeekday(y, 4, 1)) return H("memorial", "Memorial Day", "🎖️", "#7fa0d0", 2, "A day of remembrance — sparqs are doubled.");
  if (mo === 8 && day === nthWeekday(y, 8, 1, 1)) return H("labor", "Labor Day", "🛠️", "#ffb060", 2, "Rest well, wanderer — sparqs are doubled.");
  return null;
}

/** The active event: a real-world HOLIDAY takes precedence, else the weekend Lantern Festival. */
export function activeEvent(d = new Date()): CirqlEvent | null {
  const holiday = holidayFor(d);
  if (holiday) return holiday;
  const dow = d.getUTCDay();           // 0 = Sun … 6 = Sat
  if (dow === 0 || dow === 6) {
    return { id: "lantern-festival", name: "Lantern Festival", blurb: "The weekend sky glows — daily sparqs are doubled.", sparkMult: 2, accent: "#ffc46b", emoji: "🏮" };
  }
  return null;
}
