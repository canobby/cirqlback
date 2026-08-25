import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Crosshair, SprayCan } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { HarvestMoonlightEngine } from "@/game/harvest-moonlight-engine";
import type { Btn } from "@/game/retro-engine";
import { recordRun, recordPoints } from "@/game/rewards";

const GAME_ID = "harvest";
const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };

export default function HarvestMoonlight() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HarvestMoonlightEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const [daily, setDaily] = useState<{ rank: number; total: number; reward?: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new HarvestMoonlightEngine(canvasRef.current, {
      onHud: (h: any) => { if (h.state !== "over") { setOver(false); setDaily(null); } else setOver(true); },
      onRunEnd: (r: { score: number; shift: number }) => {
        const best = +(lsGet("harvest_best") || 0);
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

  const hold = (b: Btn) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } engineRef.current?.press(b); },
    onPointerUp: () => engineRef.current?.release(b),
    onPointerCancel: () => engineRef.current?.release(b),
    style: { touchAction: "none" as const },
  });
  const pad = "flex h-12 w-12 items-center justify-center rounded-xl border-[1.5px] active:scale-90";
  const pc = { borderColor: "#ffd24a", background: "rgba(255,255,255,.03)", touchAction: "none" as const };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#0a1428", color: "#dff2ff", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: "#ffd24a", textShadow: "0 0 10px rgba(255,210,74,.5)" }}>Harvest Moonlight</div>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="harvest-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(255,210,74,.16)", borderRadius: 6 }} />
        {over && daily && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[12px] font-bold" style={{ borderColor: "#3bb6ff66", background: "rgba(10,7,20,.9)", color: "#7be0ff" }} data-testid="daily-banner">
            Daily #{daily.rank} of {daily.total}{daily.reward ? <span className="text-amber-300"> · 🎁 +{daily.reward}</span> : null}
          </div>
        )}
      </div>

      <div className="flex w-full max-w-[560px] items-center justify-between gap-3 px-5 pb-[calc(18px+env(safe-area-inset-bottom))] pt-2">
        <div className="grid grid-cols-3 gap-1" style={{ gridTemplateAreas: "'. up .' 'left down right'" }}>
          <button {...hold("up")} data-testid="btn-up" className={pad} style={{ ...pc, gridArea: "up" }}><ChevronUp className="h-6 w-6 text-amber-200" /></button>
          <button {...hold("left")} data-testid="btn-left" className={pad} style={{ ...pc, gridArea: "left" }}><ChevronLeft className="h-6 w-6 text-amber-200" /></button>
          <button {...hold("down")} data-testid="btn-down" className={pad} style={{ ...pc, gridArea: "down" }}><ChevronDown className="h-6 w-6 text-amber-200" /></button>
          <button {...hold("right")} data-testid="btn-right" className={pad} style={{ ...pc, gridArea: "right" }}><ChevronRight className="h-6 w-6 text-amber-200" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button {...hold("b")} data-testid="btn-spray" className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-[1.5px] text-[9px] font-extrabold active:scale-90" style={{ borderColor: "#33e650", color: "#c8f7d4", background: "rgba(255,255,255,.03)", touchAction: "none" }}><SprayCan className="h-5 w-5" /> SPRAY</button>
          <button {...hold("a")} data-testid="btn-fire" className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border-[2px] text-[12px] font-extrabold active:scale-90" style={{ borderColor: "#ffd24a", color: "#fff", background: "radial-gradient(circle at 50% 38%, rgba(255,210,74,.28), rgba(20,14,4,.9))", boxShadow: "0 0 26px rgba(255,210,74,.4)", touchAction: "none" }}><Crosshair className="h-6 w-6" /> FIRE</button>
        </div>
      </div>
    </div>
  );
}
