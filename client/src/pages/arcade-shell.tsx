import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Swords, SlidersHorizontal, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { HelpButton } from "@/components/how-to";
import { DailyButton } from "@/components/daily-board";
import { PerkButton } from "@/components/perk-shop";
import { ARCADE_GAMES } from "@/game/registry";

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
  setTimeScale?: (s: number) => void; // freestyle game-speed (ArcadeEngine provides it)
}
// A freestyle slider — a tunable engine knob exposed to the player in Freestyle mode.
export interface FreestyleKnob { key: string; label: string; min: number; max: number; step: number; def: number; fmt?: (v: number) => string; }
export interface EngineHooks {
  sound: boolean; haptics: boolean;
  onHud: (h: any) => void;
  onRunEnd: (r: any) => void;
}
export interface Chip { label: string; value: string | number; color?: string; }
export interface ControlSpec { testid: string; label: string; node: React.ReactNode; onPress: () => void; color: string; active?: (hud: any) => boolean; big?: boolean; hold?: boolean; }
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
  online?: { href: string; label?: string }; // if set, the menu shows a "Play online" button
  // Freestyle/practice mode. Available by default on real-time action games (by
  // category); a game can add extra per-engine knobs here and how to apply them.
  freestyle?: { knobs?: FreestyleKnob[]; apply?: (eng: any, vals: Record<string, number>) => void };
  // Arcade perks (the reward-bridge moat): apply the armed perk ids to the engine
  // at run start. The catalog itself lives in shared/arcade-perks.ts by gameId.
  perks?: { apply: (eng: any, ids: string[]) => void };
}

// Which categories get Freestyle (real-time games where speed/knobs make sense).
const FREESTYLE_CATEGORIES = new Set(["classic", "blast", "skill"]);

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
  const [dailyReward, setDailyReward] = useState<{ points: number } | null>(null);

  // Freestyle / practice mode + arcade perks
  const freestyleRef = useRef(false);
  const perkedRef = useRef(false);
  const [wasFreestyle, setWasFreestyle] = useState(false);
  const [wasPerked, setWasPerked] = useState(false);
  const category = ARCADE_GAMES.find((g) => g.id === c.gameId)?.category;
  const freestyleEligible = (!!category && FREESTYLE_CATEGORIES.has(category)) || !!c.freestyle;
  const knobs = c.freestyle?.knobs || [];
  const [freestyleOpen, setFreestyleOpen] = useState(false);
  const [freestyleVals, setFreestyleVals] = useState<Record<string, number>>(() => { const o: Record<string, number> = { speed: 1 }; for (const k of (c.freestyle?.knobs || [])) o[k.key] = k.def; return o; });

  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = c.makeEngine(canvasRef.current, {
      sound, haptics,
      onHud: setHud,
      onRunEnd: (r: any) => {
        setResult(r); setPhase("over"); setWasFreestyle(freestyleRef.current); setWasPerked(perkedRef.current);
        if (freestyleRef.current) return; // freestyle runs aren't saved or ranked
        const b = c.bestFrom(r); setBest(b);
        if (b > +(lsGet(c.lsKey) || 0)) lsSet(c.lsKey, String(b));
        const u = userRef.current; if (!u) return;
        fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: c.gameId, state: { best: b, settings: { sound, haptics } } }) }).catch(() => {});
        if (perkedRef.current) return; // perked run: personal best saved, but kept off the cross-player Daily board
        const d = c.toDaily(r); setDailyRank(null); setDailyReward(null);
        fetch("/api/game/daily/score", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: c.gameId, score: d.score, bestCombo: d.bestCombo, restored: false }) })
          .then((res) => (res.ok ? res.json() : null)).then((j) => { if (j) { setDailyRank({ rank: j.rank, total: j.total }); if (j.reward) setDailyReward(j.reward); } }).catch(() => {});
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

  const startRun = async () => {
    freestyleRef.current = false; perkedRef.current = false;
    const eng = engineRef.current; eng?.setTimeScale?.(1);
    if (c.freestyle?.apply && eng) { const d: Record<string, number> = { speed: 1 }; for (const k of knobs) d[k.key] = k.def; c.freestyle.apply(eng, d); } // reset knobs to default for a ranked run
    if (c.perks?.apply && eng) {
      let ids: string[] = [];
      if (userRef.current) { try { const r = await fetch("/api/game/perks/consume", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: c.gameId }) }); if (r.ok) { const j = await r.json(); if (Array.isArray(j.armed)) ids = j.armed; } } catch { /* ignore */ } }
      c.perks.apply(eng, ids); perkedRef.current = ids.length > 0;
    }
    setResult(null); setDailyRank(null); setDailyReward(null); setPhase("playing"); eng?.start();
  };
  const startFreestyle = () => {
    const eng = engineRef.current; if (!eng) return;
    eng.setTimeScale?.(freestyleVals.speed ?? 1);
    if (c.freestyle?.apply) c.freestyle.apply(eng, freestyleVals);
    if (c.perks?.apply) c.perks.apply(eng, []); // freestyle runs ignore armed perks
    freestyleRef.current = true; perkedRef.current = false;
    setFreestyleOpen(false); setResult(null); setDailyRank(null); setDailyReward(null); setPhase("playing"); eng.start();
  };
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
            {c.online && (
              <Link href={c.online.href} data-testid="button-online" className="flex items-center gap-1.5 rounded-full border px-6 py-2 text-[13px] font-bold active:scale-95" style={{ borderColor: c.accent + "66", color: c.accent }}>
                <Swords className="h-4 w-4" /> {c.online.label || "Play online"}
              </Link>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <HelpButton gameId={c.gameId} name={c.name} accent={c.accent} />
              <DailyButton gameId={c.gameId} name={c.name} accent={c.accent} />
              <PerkButton gameId={c.gameId} name={c.name} accent={c.accent} />
              {freestyleEligible && (
                <button onClick={() => setFreestyleOpen(true)} data-testid="button-freestyle" className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12px] font-bold active:scale-95" style={{ borderColor: c.accent + "55", color: c.accent }}>
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Freestyle
                </button>
              )}
            </div>
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
            {dailyReward && <div className="text-xs text-amber-300/90">🎁 Daily reward <b className="text-white">+{dailyReward.points}</b> points</div>}
            {wasFreestyle && <div className="text-[11px] text-violet-300/50">Freestyle run — not ranked</div>}
            {wasPerked && <div className="text-[11px] text-amber-300/70">✦ Perked run — off the Daily board</div>}
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
              {controls.length >= 2 ? <ControlButton spec={controls[0]} hud={hud} /> : <div style={{ width: 74 }} />}
              <AimWheel onAim={dialFn} accent={c.accent} />
              {(controls.length >= 2 ? controls[1] : controls[0]) ? <ControlButton spec={controls.length >= 2 ? controls[1] : controls[0]} hud={hud} /> : <div style={{ width: 74 }} />}
            </>
          ) : (
            controls.map((s) => <ControlButton key={s.testid} spec={s} hud={hud} />)
          )}
        </div>
      )}

      {freestyleOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(4,3,12,.72)", backdropFilter: "blur(2px)" }} onClick={() => setFreestyleOpen(false)} data-testid="freestyle-overlay">
          <div className="w-full max-w-[360px] rounded-2xl border p-5" style={{ borderColor: c.accent + "55", background: "linear-gradient(180deg, rgba(20,14,40,.98), rgba(8,6,20,.99))", boxShadow: `0 24px 70px rgba(0,0,0,.6), 0 0 40px ${c.accent}22` }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-extrabold text-white"><SlidersHorizontal className="h-4 w-4" style={{ color: c.accent }} /> Freestyle</div>
              <button onClick={() => setFreestyleOpen(false)} data-testid="button-freestyle-close" className="text-violet-300/60 hover:text-violet-200"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-4 text-[12px] text-violet-100/60">Tune the game to practise or crank the challenge. Freestyle runs aren't ranked.</p>
            <Slider label="Game speed" value={freestyleVals.speed} min={0.5} max={1.6} step={0.1} accent={c.accent} fmt={(v) => (v < 0.85 ? "Chill" : v > 1.15 ? "Fast" : "Normal")} onChange={(v) => setFreestyleVals((s) => ({ ...s, speed: v }))} />
            {knobs.map((k) => (
              <Slider key={k.key} label={k.label} value={freestyleVals[k.key] ?? k.def} min={k.min} max={k.max} step={k.step} accent={c.accent} fmt={k.fmt} onChange={(v) => setFreestyleVals((s) => ({ ...s, [k.key]: v }))} />
            ))}
            <button onClick={startFreestyle} data-testid="button-freestyle-play" className="mt-2 w-full rounded-full py-3 text-[15px] font-extrabold active:scale-95" style={{ color: "#0a0714", background: grad, boxShadow: `0 8px 30px ${c.accent}70` }}>Play freestyle</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step, accent, fmt, onChange }: { label: string; value: number; min: number; max: number; step: number; accent: string; fmt?: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="text-violet-100/85">{label}</span>
        <span className="tabular-nums font-bold" style={{ color: accent }}>{fmt ? fmt(value) : value.toFixed(1) + "×"}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" style={{ accentColor: accent }} data-testid={`slider-${label.toLowerCase().replace(/\s+/g, "-")}`} />
    </div>
  );
}

// A control button that fires on POINTER-DOWN (instant + reliable under multi-touch,
// unlike onClick) so you can hold the aim dial with one thumb and this with the
// other. `hold` buttons auto-repeat while pressed — hold-to-fire — so sustained fire
// and aiming happen at the same time.
function ControlButton({ spec, hud }: { spec: ControlSpec; hud: any }) {
  const on = spec.active ? spec.active(hud) : true;
  const sz = spec.big ? 86 : 74;
  const repeat = useRef<number | null>(null);
  const stop = () => { if (repeat.current != null) { window.clearInterval(repeat.current); repeat.current = null; } };
  useEffect(() => stop, []);
  const press = (e: React.PointerEvent) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    spec.onPress();
    if (spec.hold) { stop(); repeat.current = window.setInterval(spec.onPress, 90); }
  };
  return (
    <button
      onPointerDown={press} onPointerUp={stop} onPointerCancel={stop}
      data-testid={spec.testid}
      className="flex flex-col items-center justify-center gap-0.5 rounded-full border-[1.5px] text-[10px] font-extrabold tracking-wide transition active:scale-90"
      style={{ width: sz, height: sz, borderColor: spec.color, color: "#fff", opacity: on ? 1 : 0.4, boxShadow: on ? `0 0 20px ${spec.color}55 inset` : "none", background: "rgba(255,255,255,.03)", touchAction: "none" }}>
      <span className="text-[20px] leading-none">{spec.node}</span>{spec.label}
    </button>
  );
}
