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

/** The active seasonal/weekend event, if any (UTC). Weekends = the Lantern Festival. */
export function activeEvent(d = new Date()): CirqlEvent | null {
  const dow = d.getUTCDay();           // 0 = Sun … 6 = Sat
  if (dow === 0 || dow === 6) {
    return { id: "lantern-festival", name: "Lantern Festival", blurb: "The weekend sky glows — daily sparqs are doubled.", sparkMult: 2, accent: "#ffc46b" };
  }
  return null;
}
