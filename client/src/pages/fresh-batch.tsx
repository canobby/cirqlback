import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUpCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { FreshBatchEngine } from "@/game/fresh-batch-engine";
import type { Btn } from "@/game/retro-engine";
import { recordRun, recordPoints } from "@/game/rewards";

const GAME_ID = "batch";
const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };

export default function FreshBatch() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FreshBatchEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const [daily, setDaily] = useState<{ rank: number; total: number; reward?: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new FreshBatchEngine(canvasRef.current, {
      onHud: (h: any) => { if (h.state !== "over") { setOver(false); setDaily(null); } else setOver(true); },
      onRunEnd: (r: { score: number }) => {
        const best = +(lsGet("batch_best") || 0);
        recordRun(GAME_ID, r as any, { points: (userRef.current as any)?.totalPoints ?? (userRef.current as any)?.points ?? 0 }); const u = userRef.current; if (!u) return;
        fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: GAME_ID, state: { best: Math.max(best, r.score) } }) }).catch(() => {});
        fetch("/api/game/daily/score", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: GAME_ID, score: r.score, bestCombo: 0, restored: false }) })
          .then((res) => (res.ok ? res.json() : null)).then((j) => { if (j) { setDaily({ rank: j.rank, total: j.total, reward: j.reward?.points }); if (j.reward?.total != null) recordPoints(j.reward.total); } }).catch(() => {});
      },
    });
    engineRef.current = eng;
    if (import.meta.env.DEV) (window as any).__game = eng;
    return () => { eng.destroy(); engineRef.current = null; };
  }, []);

  const hold = (b: Btn) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } engineRef.current?.press(b); },
    onPointerUp: () => engineRef.current?.release(b),
    onPointerCancel: () => engineRef.current?.release(b),
    style: { touchAction: "none" as const },
  });
  const dcls = "flex h-13 w-13 items-center justify-center rounded-xl border-[1.5px] active:scale-90";
  const dstyle = { borderColor: "#ff5d7d", background: "rgba(255,255,255,.03)", boxShadow: "0 0 14px rgba(255,93,125,.22) inset", touchAction: "none" as const, height: 52, width: 52 };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#0b0712", color: "#fff4ea", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/lobby" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: "#ff5d7d", textShadow: "0 0 10px rgba(255,93,125,.5)" }}>Fresh Batch</div>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="batch-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(255,93,125,.16)", borderRadius: 6 }} />
        {over && daily && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[12px] font-bold" style={{ borderColor: "#3bb6ff66", background: "rgba(10,7,20,.9)", color: "#7be0ff" }} data-testid="daily-banner">
            Daily #{daily.rank} of {daily.total}{daily.reward ? <span className="text-amber-300"> · 🎁 +{daily.reward}</span> : null}
          </div>
        )}
      </div>

      <div className="flex w-full max-w-[560px] items-center justify-between gap-4 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2">
        <div className="grid grid-cols-3 grid-rows-3 gap-1" style={{ width: 164 }}>
          <div />
          <button {...hold("up")} data-testid="btn-up" className={dcls} style={dstyle}><ChevronUp className="h-5 w-5" style={{ color: "#ff9ec2" }} /></button>
          <div />
          <button {...hold("left")} data-testid="btn-left" className={dcls} style={dstyle}><ChevronLeft className="h-5 w-5" style={{ color: "#ff9ec2" }} /></button>
          <div />
          <button {...hold("right")} data-testid="btn-right" className={dcls} style={dstyle}><ChevronRight className="h-5 w-5" style={{ color: "#ff9ec2" }} /></button>
          <div />
          <button {...hold("down")} data-testid="btn-down" className={dcls} style={dstyle}><ChevronDown className="h-5 w-5" style={{ color: "#ff9ec2" }} /></button>
          <div />
        </div>
        <button {...hold("a")} data-testid="btn-jump" className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full border-[2px] text-[12px] font-extrabold active:scale-90" style={{ borderColor: "#ffd24a", color: "#fff", background: "radial-gradient(circle at 50% 38%, rgba(255,210,74,.28), rgba(20,14,6,.9))", boxShadow: "0 0 26px rgba(255,210,74,.4)", touchAction: "none" }}>
          <ArrowUpCircle className="h-7 w-7" style={{ color: "#ffe6a8" }} /> JUMP
        </button>
      </div>
    </div>
  );
}
