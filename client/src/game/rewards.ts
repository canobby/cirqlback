// rewards — the "earn more" loop for CIRQLBACK · MAIN STREET ARCADE. Playing cabinets
// records stats, unlocks achievements, and those achievements unlock avatar cosmetics.
// State persists to localStorage and syncs to the profile (game_progress gameId
// "rewards"). Each cabinet host calls recordRun() on game over; the lobby pops a
// celebration toast for anything newly earned. The Achievements screen reads it all.

export interface RunResult { score: number; shift: number }

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  scope: "global" | string;   // "global" or a cabinet gameId
  icon: string;               // one letter/emoji shown on the badge
  unlocks?: string[];         // cosmetic ids (hat/body hex, or sidekick key)
  check: (s: RewardStats, points: number) => boolean;
}

export interface RewardStats {
  played: string[];                                   // distinct cabinet gameIds
  runs: number;
  bestShiftOverall: number;
  bestByGame: Record<string, { score: number; shift: number }>;
}
export interface RewardState { earned: string[]; unlocked: string[]; stats: RewardStats; pending: string[] }

const LS_KEY = "cirql_rewards";
const REWARDS_GAME_ID = "rewards";

const empty = (): RewardState => ({ earned: [], unlocked: [], stats: { played: [], runs: 0, bestShiftOverall: 0, bestByGame: {} }, pending: [] });

export function getRewards(): RewardState {
  try { const raw = window.localStorage.getItem(LS_KEY); if (raw) { const s = JSON.parse(raw); return { ...empty(), ...s, stats: { ...empty().stats, ...(s.stats || {}) } }; } } catch { /* ignore */ }
  return empty();
}
function save(state: RewardState) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  // best-effort profile sync
  try { fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: REWARDS_GAME_ID, state }) }).catch(() => {}); } catch { /* ignore */ }
}

/** Merge the profile's saved rewards into local state (union earned/unlocked, max stats). */
export async function syncRewardsFromServer(): Promise<RewardState> {
  try {
    const r = await fetch(`/api/game/progress?gameId=${REWARDS_GAME_ID}`, { credentials: "include" });
    if (r.ok) { const d = await r.json(); const srv = d?.state as RewardState | undefined; if (srv?.earned) {
      const cur = getRewards();
      const merged: RewardState = {
        earned: Array.from(new Set([...cur.earned, ...(srv.earned || [])])),
        unlocked: Array.from(new Set([...cur.unlocked, ...(srv.unlocked || [])])),
        pending: cur.pending,
        stats: {
          played: Array.from(new Set([...cur.stats.played, ...((srv.stats?.played) || [])])),
          runs: Math.max(cur.stats.runs, srv.stats?.runs || 0),
          bestShiftOverall: Math.max(cur.stats.bestShiftOverall, srv.stats?.bestShiftOverall || 0),
          bestByGame: { ...(srv.stats?.bestByGame || {}), ...cur.stats.bestByGame },
        },
      };
      try { window.localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      return merged;
    } }
  } catch { /* ignore */ }
  return getRewards();
}

/** Record a finished run: update stats, award achievements, unlock cosmetics. Returns what's new. */
export function recordRun(gameId: string, result: RunResult, ctx: { points?: number } = {}): { newAchievements: Achievement[]; newUnlocks: string[] } {
  const st = getRewards();
  const s = st.stats;
  if (!s.played.includes(gameId)) s.played.push(gameId);
  s.runs++;
  s.bestShiftOverall = Math.max(s.bestShiftOverall, result.shift || 0);
  const prev = s.bestByGame[gameId] || { score: 0, shift: 0 };
  s.bestByGame[gameId] = { score: Math.max(prev.score, result.score || 0), shift: Math.max(prev.shift, result.shift || 0) };
  const points = ctx.points || 0;

  const newAchievements: Achievement[] = [];
  const newUnlocks: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (st.earned.includes(a.id)) continue;
    if (a.check(s, points)) {
      st.earned.push(a.id); newAchievements.push(a);
      for (const u of a.unlocks || []) if (!st.unlocked.includes(u)) { st.unlocked.push(u); newUnlocks.push(u); }
    }
  }
  if (newAchievements.length) st.pending.push(...newAchievements.map((a) => a.id));
  save(st);
  return { newAchievements, newUnlocks };
}

/** Pop (and clear) the queued freshly-earned achievements — the lobby shows these. */
export function takePending(): Achievement[] {
  const st = getRewards(); if (!st.pending.length) return [];
  const list = st.pending.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean) as Achievement[];
  st.pending = []; save(st); return list;
}

export function isUnlocked(id: string): boolean { return getRewards().unlocked.includes(id); }
export function levelFromPoints(points: number) { return Math.floor(points / 500) + 1; }

const best = (s: RewardStats, g: string) => s.bestByGame[g] || { score: 0, shift: 0 };

// ---------- the achievement catalog ----------
export const ACHIEVEMENTS: Achievement[] = [
  // global — these unlock the avatar's locked cosmetics
  { id: "first_play", name: "Insert Coin", desc: "Play your first cabinet", scope: "global", icon: "◉", check: (s) => s.played.length >= 1 },
  { id: "five_cabinets", name: "Arcade Regular", desc: "Play 5 different cabinets", scope: "global", icon: "★", unlocks: ["#7a4fd0"], check: (s) => s.played.length >= 5 },
  { id: "all_cabinets", name: "Main Street Local", desc: "Play all 10 cabinets", scope: "global", icon: "✦", unlocks: ["#ffcf4a"], check: (s) => s.played.length >= 10 },
  { id: "highroller", name: "High Roller", desc: "Reach 1,000 ★ points", scope: "global", icon: "$", unlocks: ["#ffb020"], check: (_s, p) => p >= 1000 },
  { id: "level5", name: "Rising Star", desc: "Reach Level 5", scope: "global", icon: "↑", unlocks: ["#b79bff"], check: (_s, p) => p >= 2000 },
  { id: "boss_beater", name: "Boss Beater", desc: "Reach shift 3 in any cabinet", scope: "global", icon: "!", unlocks: ["bot"], check: (s) => s.bestShiftOverall >= 3 },
  { id: "veteran", name: "Frequent Flyer", desc: "Play 40 total runs", scope: "global", icon: "∞", unlocks: ["#33e650"], check: (s) => s.runs >= 40 },
  // per-cabinet flavour + themed sidekick unlocks
  { id: "cuppa_combo", name: "Barista of the Year", desc: "Score 250 in Cuppa Rush", scope: "cuppa", icon: "C", check: (s) => best(s, "cuppa").score >= 250 },
  { id: "slice_risky", name: "Risky Router", desc: "Reach street 4 in Slice Route", scope: "slice", icon: "S", check: (s) => best(s, "slice").shift >= 4 },
  { id: "spincycle_pop", name: "Spin Doctor", desc: "Score 300 in Spin Cycle", scope: "spincycle", icon: "O", check: (s) => best(s, "spincycle").score >= 300 },
  { id: "rummage_sale", name: "Bargain Hunter", desc: "Reach floor 3 in Rummage", scope: "rummage", icon: "R", check: (s) => best(s, "rummage").shift >= 3 },
  { id: "dozen_flip", name: "Hole in One", desc: "Score 300 in Dozen", scope: "dozen", icon: "D", unlocks: ["donut"], check: (s) => best(s, "dozen").score >= 300 },
  { id: "batch_top", name: "Top Shelf", desc: "Reach loaf 3 in Fresh Batch", scope: "batch", icon: "B", check: (s) => best(s, "batch").shift >= 3 },
  { id: "sundae_flavour", name: "Flavour Town", desc: "Score 400 in Sundae Stack", scope: "sundae", icon: "U", check: (s) => best(s, "sundae").score >= 400 },
  { id: "spincity_side", name: "Groove Rider", desc: "Reach side 3 in Spin City", scope: "spincity", icon: "V", unlocks: ["vinyl"], check: (s) => best(s, "spincity").shift >= 3 },
  { id: "taco_fiesta", name: "Fiesta!", desc: "Score 300 in Taco Stack", scope: "taco", icon: "T", unlocks: ["taco"], check: (s) => best(s, "taco").score >= 300 },
  { id: "fixit_floor", name: "Master Handyman", desc: "Reach floor 5 in Fix-It", scope: "fixit", icon: "F", check: (s) => best(s, "fixit").shift >= 5 },
];
