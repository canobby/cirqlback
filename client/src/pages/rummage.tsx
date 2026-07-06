import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { RummageEngine } from "@/game/rummage-engine";
import type { Btn } from "@/game/retro-engine";

const GAME_ID = "rummage";
const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };

export default function Rummage() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RummageEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const [daily, setDaily] = useState<{ rank: number; total: number; reward?: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new RummageEngine(canvasRef.current, {
      onHud: (h: any) => { if (h.state !== "over") { setOver(false); setDaily(null); } else setOver(true); },
      onRunEnd: (r: { score: number }) => {
        const best = +(lsGet("rummage_best") || 0);
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
  const dcls = "flex h-14 w-14 items-center justify-center rounded-xl border-[1.5px] active:scale-90";
  const dstyle = { borderColor: "#ffd24a", background: "rgba(255,255,255,.03)", boxShadow: "0 0 16px rgba(255,210,74,.22) inset", touchAction: "none" as const };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#0b0712", color: "#fff4ea", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/lobby" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: "#ffd24a", textShadow: "0 0 10px rgba(255,210,74,.5)" }}>Rummage</div>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="rummage-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(255,210,74,.16)", borderRadius: 6 }} />
        {over && daily && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[12px] font-bold" style={{ borderColor: "#3bb6ff66", background: "rgba(10,7,20,.9)", color: "#7be0ff" }} data-testid="daily-banner">
            Daily #{daily.rank} of {daily.total}{daily.reward ? <span className="text-amber-300"> · 🎁 +{daily.reward}</span> : null}
          </div>
        )}
      </div>

      {/* 4-way d-pad */}
      <div className="pb-[calc(18px+env(safe-area-inset-bottom))] pt-2">
        <div className="grid grid-cols-3 grid-rows-3 gap-1.5" style={{ width: 176 }}>
          <div />
          <button {...hold("up")} data-testid="btn-up" className={dcls} style={dstyle}><ChevronUp className="h-6 w-6 text-amber-300" /></button>
          <div />
          <button {...hold("left")} data-testid="btn-left" className={dcls} style={dstyle}><ChevronLeft className="h-6 w-6 text-amber-300" /></button>
          <div className="flex items-center justify-center"><div className="h-3 w-3 rounded-full" style={{ background: "#ffd24a55" }} /></div>
          <button {...hold("right")} data-testid="btn-right" className={dcls} style={dstyle}><ChevronRight className="h-6 w-6 text-amber-300" /></button>
          <div />
          <button {...hold("down")} data-testid="btn-down" className={dcls} style={dstyle}><ChevronDown className="h-6 w-6 text-amber-300" /></button>
          <div />
        </div>
      </div>
    </div>
  );
}
