import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { HelpButton } from "@/components/how-to";
import { DailyButton } from "@/components/daily-board";
import { BloomEngine, type BloomHud, type BloomResult } from "@/game/bloom-engine";

// Cirql Bloom — the zen garden (lazy at /play/bloom, code-split). Sweep to gather
// light, grow petal rings, leave when you're ready. No enemies, no clock. Persists
// best + Daily under gameId 'bloom'.

const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } };

export default function Bloom() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BloomEngine | null>(null);
  const userRef = useRef(user); userRef.current = user;

  const [phase, setPhase] = useState<"menu" | "playing" | "over">("menu");
  const [hud, setHud] = useState<BloomHud | null>(null);
  const [result, setResult] = useState<BloomResult | null>(null);
  const [best, setBest] = useState(() => +(lsGet("cbloom_best") || 0));
  const [sound, setSound] = useState(() => lsGet("cbloom_sound") !== "0");
  const [haptics, setHaptics] = useState(() => lsGet("cbloom_hap") !== "0");

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new BloomEngine(canvasRef.current, {
      sound, haptics,
      onHud: setHud,
      onRunEnd: (r) => {
        setResult(r); setPhase("over"); setBest(r.best);
        if (r.best > +(lsGet("cbloom_best") || 0)) lsSet("cbloom_best", String(r.best));
        const u = userRef.current; if (!u) return;
        fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: "bloom", state: { best: r.best, settings: { sound, haptics } } }) }).catch(() => {});
        fetch("/api/game/daily/score", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: "bloom", score: r.score, bestCombo: r.blooms, restored: false }) }).catch(() => {});
      },
    });
    engineRef.current = eng;
    return () => { eng.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return; let cancelled = false;
    fetch("/api/game/progress?gameId=bloom", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return; const st = d.state || {};
        if (typeof st.best === "number" && st.best > best) { setBest(st.best); lsSet("cbloom_best", String(st.best)); }
        const s = st.settings;
        if (s && typeof s.sound === "boolean") { setSound(s.sound); engineRef.current?.setMuted(!s.sound); }
        if (s && typeof s.haptics === "boolean") { setHaptics(s.haptics); engineRef.current?.setHaptics(s.haptics); }
      }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startRun = () => { setResult(null); setPhase("playing"); engineRef.current?.start(); };
  const toMenu = () => { setPhase("menu"); engineRef.current?.toMenu(); };
  const toggleSound = () => { const v = !sound; setSound(v); lsSet("cbloom_sound", v ? "1" : "0"); engineRef.current?.setMuted(!v); };
  const toggleHap = () => { const v = !haptics; setHaptics(v); lsSet("cbloom_hap", v ? "1" : "0"); engineRef.current?.setHaptics(v); };

  const pct = hud ? Math.min(1, hud.energy / hud.toNext) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: "radial-gradient(120% 90% at 50% 12%, #1a0f22 0%, #0a0714 55%, #05040f 100%)", color: "#f3e9f2", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-pink-200/60 hover:text-pink-100" data-testid="link-back-arcade"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold tracking-wide" style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#a5f3fc)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Cirql Bloom</div>
        {phase === "playing" && (
          <>
            <div className="ml-auto flex items-center gap-2">
              <div className="text-right leading-none"><div className="text-xl font-extrabold tabular-nums text-pink-200">{hud?.blooms ?? 0}</div><div className="text-[9px] uppercase tracking-[0.18em] text-pink-200/40">Blooms</div></div>
            </div>
            <button onClick={() => engineRef.current?.finish()} data-testid="button-finish" className="rounded-full border border-pink-300/30 px-4 py-2 text-xs font-bold text-pink-100/90 active:scale-95">Finish</button>
          </>
        )}
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <canvas ref={canvasRef} className="block" style={{ touchAction: "none" }} />
        {phase === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(26,15,34,.82), rgba(10,7,20,.94))" }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-pink-200/50">A garden · nothing to fear</div>
            <h1 className="text-3xl font-extrabold" style={{ textWrap: "balance", background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#a5f3fc)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Grow a little light</h1>
            <p className="max-w-[34ch] text-sm leading-relaxed text-pink-100/70">Sweep your finger through the drifting motes to gather them. The seed answers — petals unfurl, ring by ring. No enemies, no clock. Leave whenever you like.</p>
            <div className="text-sm text-pink-200/90">Best <b className="tabular-nums text-white">{best}</b></div>
            <button onClick={startRun} data-testid="button-bloom-start" className="rounded-full px-10 py-3.5 text-[15px] font-extrabold tracking-wide active:scale-95" style={{ color: "#1a0f22", background: "linear-gradient(90deg,#f9a8d4,#c4b5fd)", boxShadow: "0 8px 30px rgba(249,168,212,.5)" }}>Begin</button>
            <div className="flex items-center gap-2"><HelpButton gameId="bloom" name="Cirql Bloom" accent="#f9a8d4" /><DailyButton gameId="bloom" name="Cirql Bloom" accent="#f9a8d4" /></div>
            <div className="flex gap-4 text-[11px] text-pink-200/60"><button onClick={toggleSound} data-testid="toggle-sound">{sound ? "🔊 Sound" : "🔇 Muted"}</button><button onClick={toggleHap} data-testid="toggle-haptics">{haptics ? "📳 Haptics" : "Haptics off"}</button></div>
          </div>
        )}
        {phase === "over" && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(26,15,34,.72), rgba(10,7,20,.9))" }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-pink-200/50">Your garden</div>
            <h1 className="text-3xl font-extrabold text-white">In full bloom</h1>
            <div className="flex gap-7">
              <div><div className="text-[9px] uppercase tracking-[0.2em] text-pink-200/50">Blooms</div><div className="text-3xl font-extrabold tabular-nums text-pink-200">{result.blooms}</div></div>
              <div><div className="text-[9px] uppercase tracking-[0.2em] text-pink-200/50">Score</div><div className="text-3xl font-extrabold tabular-nums">{result.score}</div></div>
              <div><div className="text-[9px] uppercase tracking-[0.2em] text-pink-200/50">Best</div><div className="text-3xl font-extrabold tabular-nums text-amber-200">{result.best}</div></div>
            </div>
            {!user && <div className="text-[11px] text-pink-200/50">Log in to save your best garden.</div>}
            <div className="flex gap-3">
              <button onClick={startRun} data-testid="button-bloom-again" className="rounded-full px-8 py-3 text-[15px] font-extrabold tracking-wide active:scale-95" style={{ color: "#1a0f22", background: "linear-gradient(90deg,#f9a8d4,#c4b5fd)", boxShadow: "0 8px 30px rgba(249,168,212,.5)" }}>Grow another</button>
              <button onClick={toMenu} data-testid="button-bloom-menu" className="rounded-full border border-pink-300/30 px-6 py-3 text-[15px] font-extrabold tracking-wide text-pink-100 active:scale-95">Menu</button>
            </div>
          </div>
        )}
      </div>

      {phase === "playing" && (
        <div className="w-full max-w-[560px] px-6 pb-[calc(18px+env(safe-area-inset-bottom))] pt-2">
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.18em] text-pink-200/50">
            <span>Light</span><span>{hud?.energy ?? 0} / {hud?.toNext ?? 0} to next bloom</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(249,168,212,.12)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: "linear-gradient(90deg,#f9a8d4,#c4b5fd)" }} />
          </div>
        </div>
      )}
    </div>
  );
}
