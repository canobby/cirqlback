import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DefenderEngine, type DefenderHud, type DefenderResult } from "@/game/defender-engine";

// Cirql Defender — the second CirqlArcade game (lazy-loaded at /play/defender,
// code-split). Missile Command on a circle: rotate a shield to deflect enemies
// back into the swarm and guard the sleeping core. A thin React host around
// `DefenderEngine` (which owns the canvas): it renders the menu, HUD and end
// screen and drives the engine via `start()` + `aimTo/fire/pulse`.
//
// Guests play without saving; logged-in players persist best + submit the Daily
// board under gameId 'defender' (the shared CirqlArcade backend).

const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } };

// A spin dial below the field so your thumb never covers the arena — the touch
// angle around the dial maps 1:1 to the shield's rim angle (dial "up" = shield top).
function AimWheel({ onAim }: { onAim: (a: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ang, setAng] = useState(-Math.PI / 2);
  const dragging = useRef(false);
  const SZ = 128, R = 46;
  const compute = (e: React.PointerEvent) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    setAng(a); onAim(a);
  };
  return (
    <div
      ref={ref}
      data-testid="defender-dial"
      onPointerDown={(e) => { dragging.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } compute(e); }}
      onPointerMove={(e) => { if (dragging.current) compute(e); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      className="relative flex-none rounded-full"
      style={{ width: SZ, height: SZ, touchAction: "none", cursor: "grab", background: "radial-gradient(circle at 50% 38%, rgba(124,58,237,.18), rgba(11,9,24,.92))", border: "1px solid rgba(150,130,255,.3)", boxShadow: "0 10px 34px rgba(0,0,0,.5), inset 0 0 22px rgba(124,58,237,.14)" }}
    >
      <div className="absolute inset-[10px] rounded-full" style={{ border: "1px dashed rgba(150,130,255,.2)" }} />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "rgba(196,181,253,.5)" }} />
      <div className="absolute h-7 w-7 rounded-full" style={{ left: SZ / 2 + Math.cos(ang) * R, top: SZ / 2 + Math.sin(ang) * R, transform: "translate(-50%,-50%)", background: "radial-gradient(circle at 38% 34%, #fff, #67e8f9 75%)", boxShadow: "0 0 15px rgba(103,232,249,.75)" }} />
      <div className="pointer-events-none absolute bottom-[9px] left-0 right-0 text-center text-[9px] uppercase tracking-[0.24em] text-violet-300/40">aim</div>
    </div>
  );
}

export default function Defender() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DefenderEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;

  const [phase, setPhase] = useState<"menu" | "playing" | "over">("menu");
  const [hud, setHud] = useState<DefenderHud | null>(null);
  const [result, setResult] = useState<DefenderResult | null>(null);
  const [best, setBest] = useState(() => +(lsGet("cdef_best") || 0));
  const [sound, setSound] = useState(() => lsGet("cdef_sound") !== "0");
  const [haptics, setHaptics] = useState(() => lsGet("cdef_hap") !== "0");
  const [dailyRank, setDailyRank] = useState<{ rank: number; total: number } | null>(null);

  // Build the engine once, on mount.
  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new DefenderEngine(canvasRef.current, {
      sound, haptics,
      onHud: setHud,
      onRunEnd: (r) => {
        setResult(r); setPhase("over"); setBest(r.best);
        if (r.best > +(lsGet("cdef_best") || 0)) lsSet("cdef_best", String(r.best));
        const u = userRef.current;
        if (!u) return;
        // Persist best under gameId 'defender', and submit to the Defender Daily board.
        fetch("/api/game/progress", {
          method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: "defender", state: { best: r.best, settings: { sound, haptics } } }),
        }).catch(() => {});
        setDailyRank(null);
        fetch("/api/game/daily/score", {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: "defender", score: r.score, bestCombo: r.comboMax, restored: false }),
        }).then((res) => (res.ok ? res.json() : null)).then((d) => { if (d) setDailyRank({ rank: d.rank, total: d.total }); }).catch(() => {});
      },
    });
    engineRef.current = eng;
    return () => { eng.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate best + settings for a logged-in player (cross-device).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/game/progress?gameId=defender", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const st = d.state || {};
        if (typeof st.best === "number" && st.best > best) { setBest(st.best); lsSet("cdef_best", String(st.best)); }
        const s = st.settings;
        if (s && typeof s.sound === "boolean") { setSound(s.sound); engineRef.current?.setMuted(!s.sound); }
        if (s && typeof s.haptics === "boolean") { setHaptics(s.haptics); engineRef.current?.setHaptics(s.haptics); }
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Hold-to-fire: keep firing while the FIRE button is held, so you can aim with the
  // other thumb at the same time.
  const fireRepeat = useRef<number | null>(null);
  const stopFire = () => { if (fireRepeat.current != null) { window.clearInterval(fireRepeat.current); fireRepeat.current = null; } };
  useEffect(() => stopFire, []);

  const startRun = () => { setResult(null); setDailyRank(null); setPhase("playing"); engineRef.current?.start(); };
  const toMenu = () => { setPhase("menu"); engineRef.current?.toMenu(); };
  const toggleSound = () => { const v = !sound; setSound(v); lsSet("cdef_sound", v ? "1" : "0"); engineRef.current?.setMuted(!v); };
  const toggleHap = () => { const v = !haptics; setHaptics(v); lsSet("cdef_hap", v ? "1" : "0"); engineRef.current?.setHaptics(v); };

  const hearts = hud?.coreHp ?? 5, maxHearts = hud?.maxCoreHp ?? 5;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "radial-gradient(120% 90% at 50% 8%, #0d0a24 0%, #05040f 60%, #030208 100%)", color: "#e6e9ff", touchAction: "none", userSelect: "none" }}>
      {/* top bar */}
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back-arcade">
          <ArrowLeft className="h-4 w-4" /> Arcade
        </Link>
        <div className="ml-1 text-sm font-extrabold tracking-wide" style={{ background: "linear-gradient(90deg,#67e8f9,#a78bfa,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          Cirql Defender
        </div>
        {phase === "playing" && (
          <>
            <div className="ml-auto text-right leading-none">
              <div className="text-xl font-extrabold tabular-nums text-violet-300">{hud?.wave ?? 1}</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/50">Wave</div>
            </div>
            <div className="flex gap-[3px]">
              {Array.from({ length: maxHearts }).map((_, i) => (
                <div key={i} className="h-3 w-3 rounded-full transition-all" style={i < hearts ? { background: "#fbbf24", boxShadow: "0 0 8px #fbbf24" } : { background: "#2a2740" }} />
              ))}
            </div>
            <div className="text-right leading-none">
              <div className="text-xl font-extrabold tabular-nums">{hud?.score ?? 0}</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/50">Score</div>
            </div>
          </>
        )}
      </div>

      {/* arena */}
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <canvas ref={canvasRef} className="block" style={{ touchAction: "none" }} />

        {phase === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(10,8,30,.82), rgba(5,4,15,.94))" }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300/50">Missile Command · reimagined</div>
            <h1 className="text-3xl font-extrabold" style={{ textWrap: "balance", background: "linear-gradient(90deg,#67e8f9,#a78bfa,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Guard the sleeping core</h1>
            <p className="max-w-[34ch] text-sm leading-relaxed text-violet-100/70">Rotate your shield to meet the swarm — a clean block <b className="text-white">hurls enemies back out</b>, and a bounced enemy shreds the ones behind it. Fire orbs to pick off stragglers.</p>
            <div className="text-sm text-amber-300/90">Best <b className="tabular-nums text-white">{best}</b></div>
            <button onClick={startRun} data-testid="button-defend" className="rounded-full px-10 py-3.5 text-[15px] font-extrabold tracking-wide active:scale-95" style={{ color: "#180a1e", background: "linear-gradient(90deg,#67e8f9,#a78bfa)", boxShadow: "0 8px 30px rgba(124,58,237,.5)" }}>Defend</button>
            <div className="flex gap-4 text-[11px] text-violet-300/60">
              <button onClick={toggleSound} data-testid="toggle-sound">{sound ? "🔊 Sound" : "🔇 Muted"}</button>
              <button onClick={toggleHap} data-testid="toggle-haptics">{haptics ? "📳 Haptics" : "Haptics off"}</button>
            </div>
          </div>
        )}

        {phase === "over" && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(10,8,30,.86), rgba(5,4,15,.96))" }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-rose-300/60">The core went dark</div>
            <h1 className="text-3xl font-extrabold text-white">Overrun</h1>
            <div className="flex gap-7">
              <div><div className="text-[9px] uppercase tracking-[0.2em] text-violet-300/50">Score</div><div className="text-3xl font-extrabold tabular-nums">{result.score}</div></div>
              <div><div className="text-[9px] uppercase tracking-[0.2em] text-violet-300/50">Waves</div><div className="text-3xl font-extrabold tabular-nums">{result.wave}</div></div>
              <div><div className="text-[9px] uppercase tracking-[0.2em] text-violet-300/50">Best</div><div className="text-3xl font-extrabold tabular-nums text-amber-300">{result.best}</div></div>
            </div>
            {dailyRank && <div className="text-xs text-cyan-300/80">Daily rank <b className="text-white">#{dailyRank.rank}</b> of {dailyRank.total}</div>}
            {!user && <div className="text-[11px] text-violet-300/50">Log in to save your best &amp; join the Daily board.</div>}
            <div className="flex gap-3">
              <button onClick={startRun} data-testid="button-again" className="rounded-full px-8 py-3 text-[15px] font-extrabold tracking-wide active:scale-95" style={{ color: "#180a1e", background: "linear-gradient(90deg,#67e8f9,#a78bfa)", boxShadow: "0 8px 30px rgba(124,58,237,.5)" }}>Defend again</button>
              <button onClick={toMenu} data-testid="button-menu" className="rounded-full border border-violet-400/30 px-6 py-3 text-[15px] font-extrabold tracking-wide text-violet-200 active:scale-95">Menu</button>
            </div>
          </div>
        )}
      </div>

      {/* control band */}
      {phase === "playing" && (
        <div className="flex w-full max-w-[560px] items-center justify-between gap-4 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2">
          <button
            onPointerDown={(e) => { e.preventDefault(); engineRef.current?.pulse(); }}
            data-testid="button-pulse"
            className="flex h-[74px] w-[74px] flex-col items-center justify-center gap-0.5 rounded-full border-[1.5px] text-[11px] font-extrabold tracking-wide transition active:scale-90"
            style={{ borderColor: "#ec4899", color: "#f9a8d4", opacity: hud?.pulseReady ? 1 : 0.35, boxShadow: hud?.pulseReady ? "0 0 20px rgba(236,72,153,.45) inset" : "none", background: "rgba(255,255,255,.03)", touchAction: "none" }}
          >
            <span className="text-[22px] leading-none">✷</span>PULSE
          </button>

          <AimWheel onAim={(a) => engineRef.current?.aimTo(a)} />

          <button
            onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } engineRef.current?.fire(); stopFire(); fireRepeat.current = window.setInterval(() => engineRef.current?.fire(), 90); }}
            onPointerUp={stopFire}
            onPointerCancel={stopFire}
            data-testid="button-fire"
            className="flex h-[74px] w-[74px] flex-col items-center justify-center gap-0.5 rounded-full border-[1.5px] text-[11px] font-extrabold tracking-wide transition active:scale-90"
            style={{ borderColor: "#67e8f9", color: "#a5f3fc", background: "rgba(255,255,255,.03)", touchAction: "none" }}
          >
            <span className="text-[22px] leading-none">◎</span>FIRE
          </button>
        </div>
      )}
    </div>
  );
}
