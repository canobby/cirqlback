import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LoopLineEngine } from "@/game/loop-line-engine";
import type { Btn } from "@/game/retro-engine";
import { recordRun, recordPoints } from "@/game/rewards";

const GAME_ID = "loopline";
const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };

export default function LoopLine() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LoopLineEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const [daily, setDaily] = useState<{ rank: number; total: number; reward?: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new LoopLineEngine(canvasRef.current, {
      onHud: (h: any) => { if (h.state !== "over") { setOver(false); setDaily(null); } else setOver(true); },
      onRunEnd: (r: { score: number; shift: number }) => {
        const best = +(lsGet("loopline_best") || 0);
        recordRun(GAME_ID, r as any, { points: (userRef.current as any)?.totalPoints ?? (userRef.current as any)?.points ?? 0 });
        const u = userRef.current; if (!u) return;
        fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: GAME_ID, state: { best: Math.max(best, r.score) } }) }).catch(() => {});
        fetch("/api/game/daily/score", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: GAME_ID, score: r.score, bestCombo: 0, restored: false }) })
          .then((res) => (res.ok ? res.json() : null)).then((j) => { if (j) { setDaily({ rank: j.rank, total: j.total, reward: j.reward?.points }); if (j.reward?.total != null) recordPoints(j.reward.total); } }).catch(() => {});
      },
    });
    engineRef.current = eng;
    if (import.meta.env.DEV) (window as any).__game = eng;
    return () => { eng.destroy(); engineRef.current = null; };
  }, []);

  const tap = (b: Btn) => ({ onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); engineRef.current?.press(b); engineRef.current?.release(b); }, style: { touchAction: "none" as const } });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#0a0e16", color: "#eaf2ff", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: "#3bb6ff", textShadow: "0 0 10px rgba(59,182,255,.5)" }}>Loop Line</div>
        <span className="rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider" style={{ borderColor: "#3bb6ff66", color: "#3bb6ff" }}>Modern</span>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="loopline-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(59,182,255,.18)", borderRadius: 6, touchAction: "none" }} />
        {over && daily && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[12px] font-bold" style={{ borderColor: "#3bb6ff66", background: "rgba(10,7,20,.9)", color: "#7be0ff" }} data-testid="daily-banner">
            Daily #{daily.rank} of {daily.total}{daily.reward ? <span className="text-amber-300"> · 🎁 +{daily.reward}</span> : null}
          </div>
        )}
      </div>

      {/* drag stop-to-stop on the map · SWAP the active line · CLEAR it */}
      <div className="flex w-full max-w-[560px] items-center justify-center gap-4 px-6 pb-[calc(20px+env(safe-area-inset-bottom))] pt-2">
        <button {...tap("b")} data-testid="btn-swap" className="flex h-16 flex-1 max-w-[180px] items-center justify-center gap-2 rounded-2xl border-[2px] text-[15px] font-extrabold uppercase active:scale-95" style={{ borderColor: "#ffd24a", color: "#ffd24a", background: "rgba(255,255,255,.03)", boxShadow: "0 0 18px rgba(255,210,74,.2) inset", touchAction: "none" }}><RefreshCw className="h-5 w-5" /> Swap Line</button>
        <button {...tap("a")} data-testid="btn-clear" className="flex h-16 flex-1 max-w-[180px] items-center justify-center gap-2 rounded-2xl border-[2px] text-[15px] font-extrabold uppercase active:scale-95" style={{ borderColor: "#ff5d7d", color: "#ff5d7d", background: "rgba(255,255,255,.03)", boxShadow: "0 0 18px rgba(255,93,125,.2) inset", touchAction: "none" }}><Trash2 className="h-5 w-5" /> Clear</button>
      </div>
    </div>
  );
}
