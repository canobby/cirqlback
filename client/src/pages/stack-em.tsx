import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronsDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { StackEmEngine } from "@/game/stack-em-engine";
import type { Btn } from "@/game/retro-engine";
import { recordRun, recordPoints } from "@/game/rewards";

const GAME_ID = "stackem";
const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };

export default function StackEm() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StackEmEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const [daily, setDaily] = useState<{ rank: number; total: number; reward?: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new StackEmEngine(canvasRef.current, {
      onHud: (h: any) => { if (h.state !== "over") { setOver(false); setDaily(null); } else setOver(true); },
      onRunEnd: (r: { score: number; shift: number }) => {
        const best = +(lsGet("stack_best") || 0);
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
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#120a1e", color: "#ffe6c2", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: "#ffd24a", textShadow: "0 0 10px rgba(255,210,74,.5)" }}>Stack 'Em</div>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="stackem-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(255,210,74,.16)", borderRadius: 6 }} />
        {over && daily && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[12px] font-bold" style={{ borderColor: "#3bb6ff66", background: "rgba(10,7,20,.9)", color: "#7be0ff" }} data-testid="daily-banner">
            Daily #{daily.rank} of {daily.total}{daily.reward ? <span className="text-amber-300"> · 🎁 +{daily.reward}</span> : null}
          </div>
        )}
      </div>

      <div className="flex w-full max-w-[560px] items-center justify-center px-6 pb-[calc(18px+env(safe-area-inset-bottom))] pt-2">
        <button {...hold("a")} data-testid="btn-drop" className="flex h-24 w-52 items-center justify-center gap-2 rounded-full border-[2px] text-[16px] font-extrabold active:scale-95" style={{ borderColor: "#ffd24a", color: "#fff", background: "radial-gradient(circle at 50% 38%, rgba(255,210,74,.28), rgba(20,14,4,.9))", boxShadow: "0 0 26px rgba(255,210,74,.4)", touchAction: "none" }}>
          <ChevronsDown className="h-7 w-7" style={{ color: "#ffe0a0" }} /> DROP
        </button>
      </div>
    </div>
  );
}
