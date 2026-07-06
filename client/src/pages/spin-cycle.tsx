import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SpinCycleEngine } from "@/game/spin-cycle-engine";
import type { Btn } from "@/game/retro-engine";

const GAME_ID = "spincycle";
const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };

export default function SpinCycle() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SpinCycleEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const [daily, setDaily] = useState<{ rank: number; total: number; reward?: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new SpinCycleEngine(canvasRef.current, {
      onHud: (h: any) => { if (h.state !== "over") { setOver(false); setDaily(null); } else setOver(true); },
      onRunEnd: (r: { score: number }) => {
        const best = +(lsGet("spincycle_best") || 0);
        const u = userRef.current; if (!u) return;
        fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: GAME_ID, state: { best: Math.max(best, r.score) } }) }).catch(() => {});
        fetch("/api/game/daily/score", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: GAME_ID, score: r.score, bestCombo: 0, restored: false }) })
          .then((res) => (res.ok ? res.json() : null)).then((j) => { if (j) setDaily({ rank: j.rank, total: j.total, reward: j.reward?.points }); }).catch(() => {});
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
  const aimBtn = "flex h-16 w-16 items-center justify-center rounded-2xl border-[1.5px] active:scale-90";
  const aimStyle = { borderColor: "#3bb6ff", background: "rgba(255,255,255,.03)", boxShadow: "0 0 18px rgba(59,182,255,.25) inset", touchAction: "none" as const };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#0b0712", color: "#fff4ea", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/lobby" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: "#3bb6ff", textShadow: "0 0 10px rgba(59,182,255,.5)" }}>Spin Cycle</div>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="spin-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(59,182,255,.18)", borderRadius: 6 }} />
        {over && daily && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[12px] font-bold" style={{ borderColor: "#3bb6ff66", background: "rgba(10,7,20,.9)", color: "#7be0ff" }} data-testid="daily-banner">
            Daily #{daily.rank} of {daily.total}{daily.reward ? <span className="text-amber-300"> · 🎁 +{daily.reward}</span> : null}
          </div>
        )}
      </div>

      <div className="flex w-full max-w-[560px] items-center justify-between gap-4 px-6 pb-[calc(18px+env(safe-area-inset-bottom))] pt-2">
        <div className="flex gap-2">
          <button {...hold("left")} data-testid="btn-left" className={aimBtn} style={aimStyle}><ChevronLeft className="h-7 w-7 text-sky-300" /></button>
          <button {...hold("right")} data-testid="btn-right" className={aimBtn} style={aimStyle}><ChevronRight className="h-7 w-7 text-sky-300" /></button>
        </div>
        <button {...hold("a")} data-testid="btn-fire" className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full border-[2px] text-[12px] font-extrabold active:scale-90" style={{ borderColor: "#3bb6ff", color: "#fff", background: "radial-gradient(circle at 50% 38%, rgba(59,182,255,.28), rgba(6,14,20,.9))", boxShadow: "0 0 26px rgba(59,182,255,.4)", touchAction: "none" }}>
          <Target className="h-7 w-7" style={{ color: "#bfe6ff" }} /> FIRE
        </button>
      </div>
    </div>
  );
}
