import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BobaBubbleEngine } from "@/game/boba-bubble-engine";
import type { Btn } from "@/game/retro-engine";
import { recordRun, recordPoints } from "@/game/rewards";

const GAME_ID = "boba";
const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };

export default function BobaBubble() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BobaBubbleEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const [daily, setDaily] = useState<{ rank: number; total: number; reward?: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new BobaBubbleEngine(canvasRef.current, {
      onHud: (h: any) => { if (h.state !== "over") { setOver(false); setDaily(null); } else setOver(true); },
      onRunEnd: (r: { score: number; shift: number }) => {
        const best = +(lsGet("boba_best") || 0);
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#0b0712", color: "#e6f7ee", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: "#7be0c2", textShadow: "0 0 10px rgba(123,224,194,.5)" }}>Boba Bubble</div>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="boba-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(123,224,194,.18)", borderRadius: 6 }} />
        {over && daily && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[12px] font-bold" style={{ borderColor: "#3bb6ff66", background: "rgba(10,7,20,.9)", color: "#7be0ff" }} data-testid="daily-banner">
            Daily #{daily.rank} of {daily.total}{daily.reward ? <span className="text-amber-300"> · 🎁 +{daily.reward}</span> : null}
          </div>
        )}
      </div>

      {/* two-thumb controls: move (left) · fire + jump (right) */}
      <div className="flex w-full max-w-[560px] items-center justify-between gap-4 px-6 pb-[calc(18px+env(safe-area-inset-bottom))] pt-2">
        <div className="flex gap-2.5">
          <button {...hold("left")} data-testid="btn-left" className="flex h-16 w-16 items-center justify-center rounded-2xl border-[1.5px] active:scale-90" style={{ borderColor: "#7be0c2", background: "rgba(255,255,255,.03)", boxShadow: "0 0 18px rgba(123,224,194,.22) inset", touchAction: "none" }}><ChevronLeft className="h-8 w-8 text-teal-200" /></button>
          <button {...hold("right")} data-testid="btn-right" className="flex h-16 w-16 items-center justify-center rounded-2xl border-[1.5px] active:scale-90" style={{ borderColor: "#7be0c2", background: "rgba(255,255,255,.03)", boxShadow: "0 0 18px rgba(123,224,194,.22) inset", touchAction: "none" }}><ChevronRight className="h-8 w-8 text-teal-200" /></button>
        </div>
        <div className="flex items-center gap-3">
          <button {...hold("b")} data-testid="btn-fire" className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-[1.5px] text-[10px] font-extrabold active:scale-90" style={{ borderColor: "#ff8ab5", color: "#ff8ab5", background: "rgba(255,255,255,.03)", boxShadow: "0 0 18px rgba(255,138,181,.25) inset", touchAction: "none" }}><Circle className="h-5 w-5" /> FIRE</button>
          <button {...hold("a")} data-testid="btn-jump" className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-full border-[2px] text-[13px] font-extrabold active:scale-90" style={{ borderColor: "#33e650", color: "#fff", background: "radial-gradient(circle at 50% 38%, rgba(51,230,80,.28), rgba(6,20,10,.9))", boxShadow: "0 0 26px rgba(51,230,80,.4)", touchAction: "none" }}>JUMP</button>
        </div>
      </div>
    </div>
  );
}
