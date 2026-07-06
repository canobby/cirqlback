import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Waves } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SudsyEngine } from "@/game/sudsy-engine";
import type { Btn } from "@/game/retro-engine";
import { recordRun, recordPoints } from "@/game/rewards";

const GAME_ID = "sudsy";
const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };

export default function Sudsy() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SudsyEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const [daily, setDaily] = useState<{ rank: number; total: number; reward?: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new SudsyEngine(canvasRef.current, {
      onHud: (h: any) => { if (h.state !== "over") { setOver(false); setDaily(null); } else setOver(true); },
      onRunEnd: (r: { score: number; shift: number }) => {
        const best = +(lsGet("sudsy_best") || 0);
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

  const tap = (b: Btn) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } engineRef.current?.press(b); },
    onPointerUp: () => engineRef.current?.release(b),
    onPointerCancel: () => engineRef.current?.release(b),
    style: { touchAction: "none" as const },
  });
  const btn = "flex h-24 w-28 flex-col items-center justify-center gap-1 rounded-2xl border-[2px] text-[13px] font-extrabold active:scale-95";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#0c1420", color: "#dff2ff", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: "#7be0ff", textShadow: "0 0 10px rgba(123,224,255,.5)" }}>Sudsy</div>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="sudsy-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(123,224,255,.18)", borderRadius: 6 }} />
        {over && daily && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[12px] font-bold" style={{ borderColor: "#3bb6ff66", background: "rgba(10,7,20,.9)", color: "#7be0ff" }} data-testid="daily-banner">
            Daily #{daily.rank} of {daily.total}{daily.reward ? <span className="text-amber-300"> · 🎁 +{daily.reward}</span> : null}
          </div>
        )}
      </div>

      <div className="flex w-full max-w-[560px] items-center justify-between gap-4 px-6 pb-[calc(18px+env(safe-area-inset-bottom))] pt-2">
        <button {...tap("a")} data-testid="btn-scrubL" className={btn} style={{ borderColor: "#3bb6ff", color: "#fff", background: "radial-gradient(circle at 50% 38%, rgba(59,182,255,.28), rgba(6,14,22,.9))", boxShadow: "0 0 26px rgba(59,182,255,.4)", touchAction: "none" }}><Waves className="h-7 w-7" style={{ color: "#bfe6ff" }} /> SCRUB L</button>
        <button {...tap("b")} data-testid="btn-scrubR" className={btn} style={{ borderColor: "#7be0ff", color: "#fff", background: "radial-gradient(circle at 50% 38%, rgba(123,224,255,.28), rgba(6,14,22,.9))", boxShadow: "0 0 26px rgba(123,224,255,.4)", touchAction: "none" }}><Waves className="h-7 w-7" style={{ color: "#bfe6ff" }} /> SCRUB R</button>
      </div>
    </div>
  );
}
