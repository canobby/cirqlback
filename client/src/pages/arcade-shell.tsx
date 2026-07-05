import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// ArcadeGameShell — the shared React host for CirqlArcade games. A game supplies a
// GameConfig (id, look, how to build its engine, how to read its HUD/result) and
// the shell handles the rest: menu, HUD, control band, end screen, sound/haptics,
// and the gameId-keyed backend wiring (progress + Daily board). This keeps each
// new game to an engine + a small config instead of a bespoke ~150-line page.
//
// Any engine works as long as it takes { sound, haptics, onHud, onRunEnd } and
// exposes start() / toMenu() / setMuted() / setHaptics() / destroy().

export interface ShellEngine {
  start: () => void;
  toMenu: () => void;
  setMuted: (m: boolean) => void;
  setHaptics: (h: boolean) => void;
  destroy: () => void;
}
export interface EngineHooks {
  sound: boolean; haptics: boolean;
  onHud: (h: any) => void;
  onRunEnd: (r: any) => void;
}
export interface Chip { label: string; value: string | number; color?: string; }
export interface ControlSpec { testid: string; label: string; node: React.ReactNode; onPress: () => void; color: string; active?: (hud: any) => boolean; big?: boolean; }
export interface GameConfig {
  gameId: string;
  name: string;
  eyebrow: string;      // menu eyebrow ("Missile Command · reimagined")
  title: string;        // menu headline
  body: string;         // menu paragraph
  overEyebrow: string;  // end-screen eyebrow
  overTitle: string;    // end-screen headline
  accent: string;       // primary hex
  accent2?: string;     // secondary hex for the gradient
  bg: string;           // page background (CSS)
  lsKey: string;        // localStorage best key (e.g. "creactor_best")
  makeEngine: (canvas: HTMLCanvasElement, hooks: EngineHooks) => ShellEngine;
  hudChips: (hud: any) => Chip[];
  endChips: (r: any) => Chip[];
  bestFrom: (r: any) => number;
  toDaily: (r: any) => { score: number; bestCombo: number };
  controls?: (eng: any) => ControlSpec[]; // control band buttons
  dial?: (eng: any) => (angle: number) => void; // if set, render the spin dial
  progress?: (hud: any) => { label: string; right: string; pct: number } | null; // zen-style progress bar
  startLabel?: string;  // "Play" | "Defend" | "Begin"
}

const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } };

function AimWheel({ onAim, accent }: { onAim: (a: number) => void; accent: string }) {
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
    <div ref={ref} data-testid="aim-dial"
      onPointerDown={(e) => { dragging.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } compute(e); }}
      onPointerMove={(e) => { if (dragging.current) compute(e); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      className="relative flex-none rounded-full"
      style={{ width: SZ, height: SZ, touchAction: "none", cursor: "grab", background: `radial-gradient(circle at 50% 38%, ${accent}22, rgba(11,9,24,.92))`, border: "1px solid rgba(150,130,255,.3)", boxShadow: "0 10px 34px rgba(0,0,0,.5), inset 0 0 22px rgba(124,58,237,.14)" }}>
      <div className="absolute inset-[10px] rounded-full" style={{ border: "1px dashed rgba(150,130,255,.2)" }} />
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "rgba(196,181,253,.5)" }} />
      <div className="absolute h-7 w-7 rounded-full" style={{ left: SZ / 2 + Math.cos(ang) * R, top: SZ / 2 + Math.sin(ang) * R, transform: "translate(-50%,-50%)", background: `radial-gradient(circle at 38% 34%, #fff, ${accent} 75%)`, boxShadow: `0 0 15px ${accent}cc` }} />
      <div className="pointer-events-none absolute bottom-[9px] left-0 right-0 text-center text-[9px] uppercase tracking-[0.24em] text-violet-300/40">aim</div>
    </div>
  );
}

export default function ArcadeGameShell({ config }: { config: GameConfig }) {
  const c = config;
  const grad = `linear-gradient(90deg, ${c.accent}, ${c.accent2 || "#a78bfa"})`;
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);
  const userRef = useRef(user); userRef.current = user;

  const [phase, setPhase] = useState<"menu" | "playing" | "over">("menu");
  const [hud, setHud] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [best, setBest] = useState(() => +(lsGet(c.lsKey) || 0));
  const [sound, setSound] = useState(() => lsGet(c.lsKey + "_snd") !== "0");
  const [haptics, setHaptics] = useState(() => lsGet(c.lsKey + "_hap") !== "0");
  const [dailyRank, setDailyRank] = useState<{ rank: number; total: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = c.makeEngine(canvasRef.current, {
      sound, haptics,
      onHud: setHud,
      onRunEnd: (r: any) => {
        setResult(r); setPhase("over");
        const b = c.bestFrom(r); setBest(b);
        if (b > +(lsGet(c.lsKey) || 0)) lsSet(c.lsKey, String(b));
        const u = userRef.current; if (!u) return;
        fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: c.gameId, state: { best: b, settings: { sound, haptics } } }) }).catch(() => {});
        const d = c.toDaily(r); setDailyRank(null);
        fetch("/api/game/daily/score", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: c.gameId, score: d.score, bestCombo: d.bestCombo, restored: false }) })
          .then((res) => (res.ok ? res.json() : null)).then((j) => { if (j) setDailyRank({ rank: j.rank, total: j.total }); }).catch(() => {});
      },
    });
    engineRef.current = eng;
    if (import.meta.env.DEV) (window as any).__game = eng; // dev-only handle for verification (stripped in prod)
    return () => { eng.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return; let cancelled = false;
    fetch(`/api/game/progress?gameId=${c.gameId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return; const st = d.state || {};
        if (typeof st.best === "number" && st.best > best) { setBest(st.best); lsSet(c.lsKey, String(st.best)); }
        const s = st.settings;
        if (s && typeof s.sound === "boolean") { setSound(s.sound); engineRef.current?.setMuted(!s.sound); }
        if (s && typeof s.haptics === "boolean") { setHaptics(s.haptics); engineRef.current?.setHaptics(s.haptics); }
      }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startRun = () => { setResult(null); setDailyRank(null); setPhase("playing"); engineRef.current?.start(); };
  const toMenu = () => { setPhase("menu"); engineRef.current?.toMenu(); };
  const toggleSound = () => { const v = !sound; setSound(v); lsSet(c.lsKey + "_snd", v ? "1" : "0"); engineRef.current?.setMuted(!v); };
  const toggleHap = () => { const v = !haptics; setHaptics(v); lsSet(c.lsKey + "_hap", v ? "1" : "0"); engineRef.current?.setHaptics(v); };

  const controls = phase === "playing" && c.controls && engineRef.current ? c.controls(engineRef.current) : [];
  const dialFn = c.dial && engineRef.current ? c.dial(engineRef.current) : null;
  const prog = phase === "playing" && c.progress ? c.progress(hud) : null;
  const chips: Chip[] = phase === "playing" && hud ? c.hudChips(hud) : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: c.bg, color: "#e6e9ff", touchAction: "none", userSelect: "none" }}>
      <div className="flex w-full max-w-[560px] items-center gap-3 px-4 pb-1 pt-3">
        <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back-arcade"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <div className="ml-1 text-sm font-extrabold tracking-wide" style={{ background: grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{c.name}</div>
        {phase === "playing" && chips.length > 0 && (
          <div className="ml-auto flex items-center gap-4">
            {chips.map((ch, i) => (
              <div key={i} className="text-right leading-none">
                <div className="text-xl font-extrabold tabular-nums" style={ch.color ? { color: ch.color } : undefined}>{ch.value}</div>
                <div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/50">{ch.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <canvas ref={canvasRef} className="block" style={{ touchAction: "none" }} />

        {phase === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(8,6,22,.82), rgba(5,4,15,.95))" }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-violet-300/50">{c.eyebrow}</div>
            <h1 className="text-3xl font-extrabold" style={{ textWrap: "balance", background: grad, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{c.title}</h1>
            <p className="max-w-[34ch] text-sm leading-relaxed text-violet-100/70">{c.body}</p>
            <div className="text-sm text-amber-300/90">Best <b className="tabular-nums text-white">{best}</b></div>
            <button onClick={startRun} data-testid="button-start" className="rounded-full px-10 py-3.5 text-[15px] font-extrabold tracking-wide active:scale-95" style={{ color: "#0a0714", background: grad, boxShadow: `0 8px 30px ${c.accent}80` }}>{c.startLabel || "Play"}</button>
            <div className="flex gap-4 text-[11px] text-violet-300/60"><button onClick={toggleSound} data-testid="toggle-sound">{sound ? "🔊 Sound" : "🔇 Muted"}</button><button onClick={toggleHap} data-testid="toggle-haptics">{haptics ? "📳 Haptics" : "Haptics off"}</button></div>
          </div>
        )}

        {phase === "over" && result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(8,6,22,.86), rgba(5,4,15,.96))" }}>
            <div className="text-[10px] uppercase tracking-[0.3em] text-rose-300/60">{c.overEyebrow}</div>
            <h1 className="text-3xl font-extrabold text-white">{c.overTitle}</h1>
            <div className="flex gap-7">
              {c.endChips(result).map((ch, i) => (
                <div key={i}><div className="text-[9px] uppercase tracking-[0.2em] text-violet-300/50">{ch.label}</div><div className="text-3xl font-extrabold tabular-nums" style={ch.color ? { color: ch.color } : undefined}>{ch.value}</div></div>
              ))}
            </div>
            {dailyRank && <div className="text-xs text-cyan-300/80">Daily rank <b className="text-white">#{dailyRank.rank}</b> of {dailyRank.total}</div>}
            {!user && <div className="text-[11px] text-violet-300/50">Log in to save your best &amp; join the Daily board.</div>}
            <div className="flex gap-3">
              <button onClick={startRun} data-testid="button-again" className="rounded-full px-8 py-3 text-[15px] font-extrabold tracking-wide active:scale-95" style={{ color: "#0a0714", background: grad, boxShadow: `0 8px 30px ${c.accent}80` }}>Play again</button>
              <button onClick={toMenu} data-testid="button-menu" className="rounded-full border border-violet-400/30 px-6 py-3 text-[15px] font-extrabold tracking-wide text-violet-200 active:scale-95">Menu</button>
            </div>
          </div>
        )}
      </div>

      {phase === "playing" && prog && (
        <div className="w-full max-w-[560px] px-6 pb-[calc(18px+env(safe-area-inset-bottom))] pt-2">
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-[0.18em] text-violet-300/50"><span>{prog.label}</span><span>{prog.right}</span></div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: `${c.accent}22` }}><div className="h-full rounded-full transition-all" style={{ width: `${prog.pct * 100}%`, background: grad }} /></div>
        </div>
      )}

      {phase === "playing" && (controls.length > 0 || dialFn) && (
        <div className="flex w-full max-w-[560px] items-center justify-between gap-4 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2">
          {dialFn ? (
            <>
              {controls[0] && <ControlButton spec={controls[0]} hud={hud} />}
              <AimWheel onAim={dialFn} accent={c.accent} />
              {controls[1] && <ControlButton spec={controls[1]} hud={hud} />}
            </>
          ) : (
            controls.map((s) => <ControlButton key={s.testid} spec={s} hud={hud} />)
          )}
        </div>
      )}
    </div>
  );
}

function ControlButton({ spec, hud }: { spec: ControlSpec; hud: any }) {
  const on = spec.active ? spec.active(hud) : true;
  const sz = spec.big ? 86 : 74;
  return (
    <button onClick={spec.onPress} data-testid={spec.testid}
      className="flex flex-col items-center justify-center gap-0.5 rounded-full border-[1.5px] text-[10px] font-extrabold tracking-wide transition active:scale-90"
      style={{ width: sz, height: sz, borderColor: spec.color, color: "#fff", opacity: on ? 1 : 0.4, boxShadow: on ? `0 0 20px ${spec.color}55 inset` : "none", background: "rgba(255,255,255,.03)" }}>
      <span className="text-[20px] leading-none">{spec.node}</span>{spec.label}
    </button>
  );
}
