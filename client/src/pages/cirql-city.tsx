import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CirqlCityEngine } from "@/game/cirql-city-engine";
import type { Btn } from "@/game/retro-engine";
import { recordRun, recordPoints } from "@/game/rewards";
import { syncProgressFromServer } from "@/game/cirql-city-save";
import { Joystick } from "@/components/joystick";

const GAME_ID = "cirqlcity";

export default function CirqlCity() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CirqlCityEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;
  const [daily, setDaily] = useState<{ rank: number; total: number; reward?: number } | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new CirqlCityEngine(canvasRef.current, {
      onHud: (h: any) => { if (h.state !== "over" && h.state !== "clear") { setOver(false); setDaily(null); } else setOver(true); },
      onEnterShop: (route: string) => {                     // walk into a shop → play that cabinet, breadcrumb home
        try { sessionStorage.setItem("cc_return", String(Date.now())); sessionStorage.setItem("cc_shop", route); } catch { /* ignore */ }
        setLocation(route);
      },
      onRunEnd: (r: { score: number; shift: number }) => {
        recordRun(GAME_ID, r as any, { points: (userRef.current as any)?.totalPoints ?? (userRef.current as any)?.points ?? 0 });
        const u = userRef.current; if (!u) return;
        fetch("/api/game/daily/score", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: GAME_ID, score: r.score, bestCombo: 0, restored: false }) })
          .then((res) => (res.ok ? res.json() : null)).then((j) => { if (j) { setDaily({ rank: j.rank, total: j.total, reward: j.reward?.points }); if (j.reward?.total != null) recordPoints(j.reward.total); } }).catch(() => {});
      },
    });
    engineRef.current = eng;
    // returning from a shop mini-game? step back out in front of that shop
    try { const back = sessionStorage.getItem("cc_shop"); if (back) { sessionStorage.removeItem("cc_shop"); eng.returnToShop(back); } } catch { /* ignore */ }
    // resume: adopt server-saved district/unlock progress once it arrives
    syncProgressFromServer().then((p) => engineRef.current?.applyProgress(p)).catch(() => {});
    // personalize the town: name shop fronts after the real places this player has tapped
    fetch("/api/game/my-businesses", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.businesses?.length) engineRef.current?.applyBusinesses(j.businesses.map((b: any) => b.name)); })
      .catch(() => {});
    if (import.meta.env.DEV) (window as any).__game = eng;
    return () => { eng.destroy(); engineRef.current = null; };
  }, [setLocation]);

  const hold = (b: Btn) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } engineRef.current?.press(b); },
    onPointerUp: () => engineRef.current?.release(b),
    onPointerCancel: () => engineRef.current?.release(b),
    style: { touchAction: "none" as const },
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "#0a0714", color: "#fff4ea", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[620px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold uppercase tracking-wide" style={{ color: "#ffd24a", textShadow: "0 0 10px rgba(255,210,74,.5)" }}>Cirql City</div>
        <span className="rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider" style={{ borderColor: "#ffd24a66", color: "#ffd24a" }}>Flagship</span>
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <canvas ref={canvasRef} data-testid="cirqlcity-canvas" className="block" style={{ imageRendering: "pixelated", boxShadow: "0 0 60px rgba(255,210,74,.16)", borderRadius: 6 }} />
        {over && daily && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-4 py-1.5 text-[12px] font-bold" style={{ borderColor: "#3bb6ff66", background: "rgba(10,7,20,.9)", color: "#7be0ff" }} data-testid="daily-banner">
            Daily #{daily.rank} of {daily.total}{daily.reward ? <span className="text-amber-300"> · 🎁 +{daily.reward}</span> : null}
          </div>
        )}
      </div>

      {/* controls: analog joystick (town + platforming) · RUN + JUMP/ENTER */}
      <div className="flex w-full max-w-[620px] items-center justify-between gap-4 px-6 pb-[calc(18px+env(safe-area-inset-bottom))] pt-2">
        <Joystick press={(b) => engineRef.current?.press(b)} release={(b) => engineRef.current?.release(b)} color="#b79bff" size={140} />
        <div className="flex items-center gap-3">
          <button {...hold("b")} data-testid="btn-run" className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-[1.5px] text-[10px] font-extrabold active:scale-90" style={{ borderColor: "#3bb6ff", color: "#7be0ff", background: "rgba(255,255,255,.03)", boxShadow: "0 0 18px rgba(59,182,255,.25) inset", touchAction: "none" }}><Zap className="h-5 w-5" /> RUN</button>
          <button {...hold("a")} data-testid="btn-jump" className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-full border-[2px] text-[13px] font-extrabold active:scale-90" style={{ borderColor: "#ffd24a", color: "#fff", background: "radial-gradient(circle at 50% 38%, rgba(255,210,74,.3), rgba(20,12,6,.9))", boxShadow: "0 0 26px rgba(255,210,74,.4)", touchAction: "none" }}>JUMP</button>
        </div>
      </div>
    </div>
  );
}
