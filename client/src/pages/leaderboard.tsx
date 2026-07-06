import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { ArrowLeft, Trophy, Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { MAIN_STREET_CABINETS } from "@/game/cabinet-covers";
import { ARCADE_GAMES } from "@/game/registry";

// The unified Daily Leaderboards page — one board per game (Main Street cabinet or
// circular Game Circle game), read from /api/game/daily/leaderboard?gameId=<id>.
// A game's registry/cabinet `id` IS its backend gameId, so the picker maps 1:1.

interface LbGame { id: string; name: string; accent: string; line: "main" | "circle" }
interface Row { rank: number; name: string; score: number; restored: boolean; you: boolean }
interface Board { day: string; dailyNum: number; top: Row[]; you: { rank: number; score: number } | null; total: number }

const MAIN: LbGame[] = MAIN_STREET_CABINETS.filter((c) => c.built).map((c) => ({ id: c.id, name: c.name, accent: c.accent, line: "main" }));
const CIRCLE: LbGame[] = ARCADE_GAMES.filter((g) => g.status === "live").map((g) => ({ id: g.id, name: g.name, accent: g.accent, line: "circle" }));
const ALL: LbGame[] = [...MAIN, ...CIRCLE];

const medal = ["#ffd24a", "#c8d0dc", "#e08a4a"]; // gold / silver / bronze

export default function Leaderboard() {
  const { user } = useAuth();
  const search = useSearch();
  const initial = useMemo(() => {
    const q = new URLSearchParams(search).get("game");
    return (q && ALL.some((g) => g.id === q)) ? q : (MAIN[0]?.id || ALL[0]?.id);
  }, [search]);

  const [sel, setSel] = useState<string>(initial);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let ok = true;
    setLoading(true); setNeedsLogin(false); setBoard(null);
    fetch(`/api/game/daily/leaderboard?gameId=${sel}`, { credentials: "include" })
      .then((r) => { if (r.status === 401) { setNeedsLogin(true); return null; } return r.ok ? r.json() : null; })
      .then((d: Board | null) => { if (ok) { setBoard(d); setLoading(false); } })
      .catch(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [sel]);

  const selGame = ALL.find((g) => g.id === sel);
  const youInTop = !!board?.top.some((r) => r.you);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "radial-gradient(120% 90% at 50% -10%, #1c1348 0%, #0d0a20 45%, #0a0714 100%)", color: "#fff4ea", touchAction: "pan-y" }}>
      {/* scanline wash */}
      <div className="pointer-events-none fixed inset-0 z-[70]" style={{ background: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.14) 2px 3px)", mixBlendMode: "multiply", opacity: 0.5 }} />

      <div className="relative mx-auto flex max-w-[720px] flex-col px-4 pb-16 pt-4">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
          <div className="ml-1 flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-[0.14em]" style={{ color: "#fff", textShadow: "0 0 12px rgba(255,210,74,.5)" }}><Trophy className="h-4 w-4 text-amber-300" /> Leaderboards</div>
          {board && <div className="ml-auto text-[11px] font-bold tabular-nums text-cyan-300/80">Daily #{board.dailyNum}</div>}
        </div>

        {/* game picker — two rails */}
        <Rail label="Main Street" games={MAIN} sel={sel} onPick={setSel} />
        <Rail label="Game Circles" games={CIRCLE} sel={sel} onPick={setSel} />

        {/* board header */}
        <div className="mb-2 mt-4 flex items-center gap-3 text-[15px] font-extrabold uppercase tracking-[0.05em]" style={{ color: selGame?.accent || "#ffb020", textShadow: `0 0 10px ${(selGame?.accent || "#ffb020")}66` }}>
          ▸ {selGame?.name || "—"}
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${(selGame?.accent || "#ffb020")}88, transparent)` }} />
          {board ? <span className="text-[11px] font-bold tabular-nums text-violet-300/60">{board.total} player{board.total === 1 ? "" : "s"}</span> : null}
        </div>

        {/* board body */}
        <div className="min-h-[200px]">
          {loading ? (
            <div className="py-12 text-center text-[12px] text-violet-300/50">Loading today's board…</div>
          ) : needsLogin ? (
            <div className="rounded-xl border py-10 text-center text-[12px] text-violet-200/60" style={{ borderColor: "#2e2158", background: "rgba(255,255,255,.02)" }}>
              Log in to see the Daily leaderboards and post your score.
            </div>
          ) : !board || board.top.length === 0 ? (
            <div className="rounded-xl border py-10 text-center" style={{ borderColor: "#2e2158", background: "rgba(255,255,255,.02)" }}>
              <div className="text-[13px] font-extrabold text-white">No scores yet today</div>
              <div className="mt-1 text-[11px] text-violet-300/50">Be the first — play a run and you'll top the board.</div>
              {selGame && <Link href={mainRoute(selGame.id) || circleRoute(selGame.id) || "/arcade"} data-testid="link-play" className="mt-3 inline-block rounded-full border px-4 py-1.5 text-[12px] font-extrabold" style={{ borderColor: selGame.accent, color: selGame.accent }}>Play {selGame.name} →</Link>}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5" data-testid="board">
              {board.top.map((r) => (
                <Line key={r.rank} r={r} accent={selGame?.accent || "#ffb020"} />
              ))}
              {board.you && !youInTop && (
                <>
                  <div className="my-1 text-center text-[16px] leading-none text-violet-400/40">⋯</div>
                  <Line r={{ rank: board.you.rank, name: "You", score: board.you.score, restored: false, you: true }} accent={selGame?.accent || "#ffb020"} />
                </>
              )}
            </div>
          )}
        </div>

        {!user && !needsLogin && <div className="mt-5 text-center text-[11px] text-violet-300/50">Log in to post your scores across the arcade.</div>}
      </div>
    </div>
  );
}

const mainRoute = (id: string) => MAIN_STREET_CABINETS.find((c) => c.id === id)?.route;
const circleRoute = (id: string) => ARCADE_GAMES.find((g) => g.id === id)?.route;

function Rail({ label, games, sel, onPick }: { label: string; games: LbGame[]; sel: string; onPick: (id: string) => void }) {
  if (!games.length) return null;
  return (
    <div className="mb-1.5">
      <div className="mb-1 text-[9.5px] uppercase tracking-[0.16em] text-violet-300/40">{label}</div>
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {games.map((g) => {
          const on = sel === g.id;
          return (
            <button key={g.id} onClick={() => onPick(g.id)} data-testid={`pick-${g.id}`}
              className="flex flex-none items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[12px] font-extrabold active:scale-95"
              style={{ borderColor: on ? g.accent : "#2e2158", color: on ? "#fff" : "#c3b4de", background: on ? `linear-gradient(180deg, ${g.accent}22, rgba(20,13,40,.3))` : "rgba(255,255,255,.015)", boxShadow: on ? `0 0 16px -4px ${g.accent}` : "none" }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: g.accent, display: "inline-block", boxShadow: `0 0 6px ${g.accent}` }} />
              {g.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Line({ r, accent }: { r: Row; accent: string }) {
  const top3 = r.rank <= 3;
  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2" data-testid={r.you ? "row-you" : `row-${r.rank}`}
      style={{ borderColor: r.you ? accent : "#241a44", background: r.you ? `linear-gradient(90deg, ${accent}1f, rgba(20,13,40,.4))` : "rgba(255,255,255,.02)", boxShadow: r.you ? `0 0 16px -6px ${accent}` : "none" }}>
      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[12px] font-extrabold tabular-nums"
        style={{ background: top3 ? `linear-gradient(180deg, ${medal[r.rank - 1]}, ${medal[r.rank - 1]}bb)` : "#241a44", color: top3 ? "#0a0714" : "#9a8fc0", boxShadow: top3 ? `0 0 10px ${medal[r.rank - 1]}88` : "none" }}>
        {r.rank === 1 ? <Crown className="h-3.5 w-3.5" /> : r.rank}
      </div>
      <div className="min-w-0 flex-1 truncate text-[13px] font-bold" style={{ color: r.you ? "#fff" : "#e7ddff" }}>
        {r.name}{r.you && <span className="ml-1.5 rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/80">you</span>}
      </div>
      <div className="flex-none text-[14px] font-extrabold tabular-nums" style={{ color: accent }}>{r.score.toLocaleString()}</div>
    </div>
  );
}
