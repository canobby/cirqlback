// CIRQL CITY — save / resume (Phase B).
//
// The flagship persists its overworld progress so a player never restarts from level
// one: which levels are cleared, which districts are unlocked, best scores, and the
// running Cirql-coin count. Mirrors the rewards.ts pattern — authoritative-enough
// localStorage for instant boot, best-effort sync to the profile via game_progress
// gameId "cirqlcity" (no migration; same JSON `state` column the other games use).

export interface CityProgress {
  cleared: string[];                    // level keys completed
  unlocked: string[];                   // district keys reachable ("oldtown" always)
  coins: number;                        // running Cirql-coin total (currency)
  best: number;                         // best single-level score
  bestByLevel: Record<string, number>;
}

const LS_KEY = "cirqlcity_progress";
const GAME_ID = "cirqlcity";

export function emptyProgress(): CityProgress {
  return { cleared: [], unlocked: ["oldtown"], coins: 0, best: 0, bestByLevel: {} };
}

export function loadProgress(): CityProgress {
  try { const raw = window.localStorage.getItem(LS_KEY); if (raw) return { ...emptyProgress(), ...JSON.parse(raw) }; } catch { /* ignore */ }
  return emptyProgress();
}

export function saveProgress(p: CityProgress) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  try { fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: GAME_ID, state: p }) }).catch(() => {}); } catch { /* ignore */ }
}

/** Merge the profile's saved progress into local state (union cleared/unlocked, max the rest). */
export async function syncProgressFromServer(): Promise<CityProgress> {
  try {
    const r = await fetch(`/api/game/progress?gameId=${GAME_ID}`, { credentials: "include" });
    if (r.ok) {
      const d = await r.json();
      const srv = d?.state as Partial<CityProgress> | undefined;
      if (srv && (srv.cleared || srv.unlocked)) {
        const cur = loadProgress();
        const merged: CityProgress = {
          cleared: Array.from(new Set([...cur.cleared, ...(srv.cleared || [])])),
          unlocked: Array.from(new Set([...cur.unlocked, ...(srv.unlocked || []), "oldtown"])),
          coins: Math.max(cur.coins, srv.coins || 0),
          best: Math.max(cur.best, srv.best || 0),
          bestByLevel: { ...(srv.bestByLevel || {}), ...cur.bestByLevel },
        };
        try { window.localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
        return merged;
      }
    }
  } catch { /* ignore */ }
  return loadProgress();
}
