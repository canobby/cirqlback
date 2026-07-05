import { useState } from "react";
import { Trophy, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// DailyButton — the shared "Daily" leaderboard button + modal for any arcade game.
// Reads today's cross-player board from /api/game/daily/leaderboard?gameId=. Every
// run posts to the board; the first play of the day earns a points reward (awarded
// server-side, shown on the game-over screen). Used on the shell + bespoke menus.

interface Row { rank: number; name: string; score: number; you: boolean; }
interface Board { day: string; dailyNum: number; top: Row[]; you: { rank: number; score: number } | null; total: number; }

export function DailyButton({ gameId, name, accent = "#fbbf24" }: { gameId: string; name: string; accent?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const load = () => {
    setLoading(true); setErr(false);
    fetch(`/api/game/daily/leaderboard?gameId=${encodeURIComponent(gameId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Board) => { setData(d); setLoading(false); })
      .catch(() => { setErr(true); setLoading(false); });
  };
  const openIt = () => { setOpen(true); if (user) load(); };

  return (
    <>
      <button onClick={openIt} data-testid="button-daily" className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12px] font-bold active:scale-95" style={{ borderColor: accent + "55", color: accent }}>
        <Trophy className="h-3.5 w-3.5" /> Daily
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(4,3,12,.72)", backdropFilter: "blur(2px)" }} onClick={() => setOpen(false)} data-testid="daily-overlay">
          <div className="w-full max-w-[380px] rounded-2xl border p-5" style={{ borderColor: accent + "55", background: "linear-gradient(180deg, rgba(22,16,8,.98), rgba(8,6,20,.99))", boxShadow: `0 24px 70px rgba(0,0,0,.6), 0 0 40px ${accent}22` }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-extrabold text-white"><Trophy className="h-4 w-4" style={{ color: accent }} /> Daily · {name}</div>
              <button onClick={() => setOpen(false)} data-testid="button-daily-close" className="text-violet-300/60 hover:text-violet-200"><X className="h-5 w-5" /></button>
            </div>
            {data && <div className="mb-3 text-[10px] uppercase tracking-[0.2em]" style={{ color: accent + "aa" }}>Day {data.dailyNum} · {data.total} {data.total === 1 ? "player" : "players"}</div>}

            {!user ? (
              <p className="py-8 text-center text-sm text-violet-100/70">Log in to compete on today's board and earn a daily reward.</p>
            ) : loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" style={{ color: accent }} /></div>
            ) : err ? (
              <p className="py-8 text-center text-sm text-rose-300/70">Couldn't load the board.</p>
            ) : data ? (
              <>
                {data.top.length === 0 ? (
                  <p className="py-8 text-center text-sm text-violet-100/60">No scores yet today — be the first!</p>
                ) : (
                  <ol className="space-y-1">
                    {data.top.slice(0, 10).map((r) => (
                      <li key={r.rank} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-[13px]" style={r.you ? { background: accent + "1a", border: `1px solid ${accent}44` } : undefined}>
                        <span className="flex items-center gap-2.5 truncate">
                          <span className="w-5 shrink-0 tabular-nums text-violet-300/50">{r.rank}</span>
                          <span className={`truncate ${r.you ? "font-bold text-white" : "text-violet-100/85"}`}>{r.name}{r.you ? " (you)" : ""}</span>
                        </span>
                        <span className="shrink-0 tabular-nums font-bold" style={{ color: r.you ? accent : "#e6e9ff" }}>{r.score.toLocaleString()}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {data.you && data.you.rank > 10 && (
                  <div className="mt-2 flex items-center justify-between border-t border-white/10 px-3 pt-2 text-[13px]">
                    <span className="text-violet-100/85">You · #{data.you.rank}</span>
                    <span className="tabular-nums font-bold" style={{ color: accent }}>{data.you.score.toLocaleString()}</span>
                  </div>
                )}
                {!data.you && data.top.length > 0 && <p className="mt-2 text-center text-[12px] text-violet-300/60">Play a round to post your score.</p>}
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
