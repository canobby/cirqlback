import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronsLeft, ChevronsRight, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { HelpButton } from "@/components/how-to";
import { SnakeEngine, type SnakeHud, type SnakeResult } from "@/game/snake-engine";

// Cirql Snake — concentric-lane snake (lazy at /play/snake, code-split). Hop lanes
// to weave through orbs and dodge your own trail. Persists best + Daily under 'snake'.

const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } };

export default function Snake() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;

  const [phase, setPhase] = useState<"menu" | "playing" | "over">("menu");
  const [hud, setHud] = useState<SnakeHud | null>(null);
  const [result, setResult] = useState<SnakeResult | null>(null);
  const [best, setBest] = useState(() => +(lsGet("csnake_best") || 0));
  const [sound, setSound] = useState(() => lsGet("csnake_sound") !== "0");
  const [haptics, setHaptics] = useState(() => lsGet("csnake_hap") !== "0");
  const [dailyRank, setDailyRank] = useState<{ rank: number; total: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new SnakeEngine(canvasRef.current, {
      sound, haptics,
      onHud: setHud,
      onRunEnd: (r) => {
        setResult(r); setPhase("over"); setBest(r.best);
        if (r.best > +(lsGet("csnake_best") || 0)) lsSet("csnake_best", String(r.best));
        const u = userRef.current; if (!u) return;
        fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: "snake", state: { best: r.best, settings: { sound, haptics } } }) }).catch(() => {});
        setDailyRank(null);
        fetch("/api/game/daily/score", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: "snake", score: r.score, bestCombo: r.orbs, restored: false }) })
          .then((res) => (res.ok ? res.json() : null)).then((d) => { if (d) setDailyRank({ rank: d.rank, total: d.total }); }).catch(() => {});
      },
    });
    engineRef.current = eng;
    return () => { eng.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return; let cancelled = false;
    fetch("/api/game/progress?gameId=snake", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return; const st = d.state || {};
        if (typeof st.best === "number" && st.best > best) { setBest(st.best); lsSet("csnake_best", String(st.best)); }
        const s = st.settings;
        if (s && typeof s.sound === "boolean") { setSound(s.sound); engineRef.current?.setMuted(!s.sound); }
        if (s && typeof s.haptics === "boolean") { setHaptics(s.haptics); engineRef.current?.setHaptics(s.haptics); }
      }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startRun = () => { setResult(null); setDailyRank(null); setPhase("playing"); engineRef.current?.start(); };
  const toMenu = () => { setPhase("menu"); engineRef.current?.toMenu(); };
  const toggleSound = () => { const v = !sound; setSound(v); lsSet("csnake_sound", v ? "1" : "0"); engineRef.current?.setMuted(!v); };
  const toggleHap = () => { const v = !haptics; setHaptics(v); lsSet("csnake_hap", v ? "1" : "0"); engineRef.current?.setHaptics(v); };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "radial-gradient(120% 90% at 50% 8%, #06231a 0%, #05040f 60%, #030208 100%)", color: "#e6e9ff", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back-arcade"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold tracking-wide" style={{ background: "linear-gradient(90deg,#34d399,#38bdf8,#a78bfa)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Cirql Snake</div>
        {phase === "playing" && (
          <>
            <div className="ml-auto text-right leading-none"><div className="text-xl font-extrabold tabular-nums text-emerald-300">{hud?.length ?? 0}</div><div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/50">Length</div></div>
            <div className="text-right leading-none"><div className="text-xl font-extrabold tabular-nums">{hud?.score ?? 0}</div><div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/50">Score</div></div>
          </>
        )}
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <canvas ref={canvasRef} className="block" style={{ touchAction: "none" }} />
        {phase === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(6,20,15,.82), rgba(5,4,15,.94))" }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300/50">Snake · without the grid</div>
            <h1 className="text-3xl font-extrabold" style={{ textWrap: "balance", background: "linear-gradient(90deg,#34d399,#38bdf8,#a78bfa)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Glide the lanes</h1>
            <p className="max-w-[34ch] text-sm leading-relaxed text-violet-100/70">Your snake circles forever. <b className="text-white">Hop in or out</b> a lane to catch orbs and dodge your own tail. <b className="text-white">Boost</b> to escape a tight loop.</p>
            <div className="text-sm text-amber-300/90">Best <b className="tabular-nums text-white">{best}</b></div>
            <button onClick={startRun} data-testid="button-snake-start" className="rounded-full px-10 py-3.5 text-[15px] font-extrabold tracking-wide active:scale-95" style={{ color: "#06231a", background: "linear-gradient(90deg,#34d399,#38bdf8)", boxShadow: "0 8px 30px rgba(52,211,153,.5)" }}>Play</button>
            <HelpButton gameId="snake" name="Cirql Snake" accent="#34d399" />
            <div className="flex gap-4 text-[11px] text-violet-300/60"><button onClick={toggleSound} data-testid="toggle-sound">{sound ? "🔊 Sound" : "🔇 Muted"}</button><button onClick={toggleHap} data-testid="toggle-haptics">{haptics ? "📳 Haptics" : "Haptics off"}</button></div>
          </div>
        )}
        {phase === "over" && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(6,20,15,.86), rgba(5,4,15,.96))" }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-rose-300/60">You crossed your trail</div>
            <h1 className="text-3xl font-extrabold text-white">Tangled</h1>
            <div className="flex gap-7">
              <div><div className="text-[9px] uppercase tracking-[0.2em] text-violet-300/50">Score</div><div className="text-3xl font-extrabold tabular-nums">{result.score}</div></div>
              <div><div className="text-[9px] uppercase tracking-[0.2em] text-violet-300/50">Orbs</div><div className="text-3xl font-extrabold tabular-nums text-emerald-300">{result.orbs}</div></div>
              <div><div className="text-[9px] uppercase tracking-[0.2em] text-violet-300/50">Best</div><div className="text-3xl font-extrabold tabular-nums text-amber-300">{result.best}</div></div>
            </div>
            {dailyRank && <div className="text-xs text-cyan-300/80">Daily rank <b className="text-white">#{dailyRank.rank}</b> of {dailyRank.total}</div>}
            {!user && <div className="text-[11px] text-violet-300/50">Log in to save your best &amp; join the Daily board.</div>}
            <div className="flex gap-3">
              <button onClick={startRun} data-testid="button-snake-again" className="rounded-full px-8 py-3 text-[15px] font-extrabold tracking-wide active:scale-95" style={{ color: "#06231a", background: "linear-gradient(90deg,#34d399,#38bdf8)", boxShadow: "0 8px 30px rgba(52,211,153,.5)" }}>Play again</button>
              <button onClick={toMenu} data-testid="button-snake-menu" className="rounded-full border border-violet-400/30 px-6 py-3 text-[15px] font-extrabold tracking-wide text-violet-200 active:scale-95">Menu</button>
            </div>
          </div>
        )}
      </div>

      {phase === "playing" && (
        <div className="flex w-full max-w-[560px] items-center justify-between gap-4 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2">
          <button onClick={() => engineRef.current?.nudge(-1)} data-testid="button-in" className="flex h-[74px] w-[74px] flex-col items-center justify-center gap-0.5 rounded-full border-[1.5px] text-[10px] font-extrabold tracking-wide transition active:scale-90" style={{ borderColor: "#34d399", color: "#6ee7b7", background: "rgba(255,255,255,.03)" }}>
            <ChevronsLeft className="h-6 w-6" />IN
          </button>
          <button onClick={() => engineRef.current?.boost()} data-testid="button-boost" className="flex h-[86px] w-[86px] flex-col items-center justify-center gap-0.5 rounded-full border-[1.5px] text-[11px] font-extrabold tracking-wide transition active:scale-90" style={{ borderColor: "#38bdf8", color: "#a5f3fc", opacity: hud?.boostReady ? 1 : 0.4, boxShadow: hud?.boostReady ? "0 0 22px rgba(56,189,248,.45) inset" : "none", background: "rgba(255,255,255,.03)" }}>
            <Zap className="h-6 w-6" />BOOST
          </button>
          <button onClick={() => engineRef.current?.nudge(1)} data-testid="button-out" className="flex h-[74px] w-[74px] flex-col items-center justify-center gap-0.5 rounded-full border-[1.5px] text-[10px] font-extrabold tracking-wide transition active:scale-90" style={{ borderColor: "#34d399", color: "#6ee7b7", background: "rgba(255,255,255,.03)" }}>
            <ChevronsRight className="h-6 w-6" />OUT
          </button>
        </div>
      )}
    </div>
  );
}
