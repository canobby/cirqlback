// favorites — star games to pin them in the lobby's ★ Favorites category. Persists
// to localStorage for instant reads and syncs to the profile (game_progress gameId
// "favorites", no migration — same pattern as rewards.ts / avatar). Every toggle
// writes through to the server, so the server list is authoritative on sync.

const LS_KEY = "cirql_favorites";
const FAV_GAME_ID = "favorites";

function read(): string[] {
  try { const raw = window.localStorage.getItem(LS_KEY); if (raw) { const a = JSON.parse(raw); if (Array.isArray(a)) return a.filter((x) => typeof x === "string"); } } catch { /* ignore */ }
  return [];
}
function write(ids: string[]) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  // best-effort profile sync
  try { fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: FAV_GAME_ID, state: { ids } }) }).catch(() => {}); } catch { /* ignore */ }
}

export function getFavorites(): string[] { return read(); }
export function isFavorite(id: string): boolean { return read().includes(id); }

/** Toggle a game's favorite status; returns the new list. */
export function toggleFavorite(id: string): string[] {
  const cur = read();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  write(next);
  return next;
}

/** Adopt the profile's saved favorites (server is authoritative — every toggle wrote
 * through, so this correctly reflects removals too). Falls back to local on error. */
export async function syncFavoritesFromServer(): Promise<string[]> {
  try {
    const r = await fetch(`/api/game/progress?gameId=${FAV_GAME_ID}`, { credentials: "include" });
    if (r.ok) {
      const d = await r.json();
      const srv = d?.state?.ids;
      if (Array.isArray(srv)) {
        const ids = srv.filter((x: any) => typeof x === "string");
        try { window.localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
        return ids;
      }
    }
  } catch { /* ignore */ }
  return read();
}
