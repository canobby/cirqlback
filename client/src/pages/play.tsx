import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  CirqlbreakEngine,
  RELICS,
  type HudState,
  type RunResult,
  type CirqlbreakMode,
  type Difficulty,
  type RelicId,
  type PowerupType,
} from "@/game/cirqlbreak-engine";
import { PERKS } from "@shared/cirql-perks";

// The banked power-up tokens (everything but the Partner Power) map 1:1 to engine
// power-up types.
const TOKEN_TYPES = ["multi", "wide", "slow", "catch", "life"] as const;

// Cirqlbreak — the in-app arcade game (lazy-loaded at /play, code-split). A
// circular Breakout roguelike: rally the spark, shatter the rings, out-time the
// boss core, restore a dead world. This page is a thin React host around
// `CirqlbreakEngine` (which owns the canvas); it renders the menu, HUD, relic
// pick, and end screen and drives the engine via its callbacks + action methods.
//
// Guests play without saving; logged-in players persist (server-backed in CHR-113,
// local for now). Real taps → power-ups is CHR-115/116.

const lsGet = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } };

const MODES: { id: CirqlbreakMode; label: string; hint: string }[] = [
  { id: "journey", label: "Journey", hint: "endless climb" },
  { id: "daily", label: "Daily", hint: "shared · streak" },
  { id: "freestyle", label: "Freestyle", hint: "your rules" },
  { id: "party", label: "Party", hint: "2-player co-op" },
];
const DIFFS: { id: Difficulty; label: string; hint: string }[] = [
  { id: "easy", label: "Easy", hint: "slow · wide · 5♥" },
  { id: "medium", label: "Medium", hint: "balanced · 3♥" },
  { id: "hard", label: "Hard", hint: "fast · narrow · 2♥" },
];

export default function Play() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CirqlbreakEngine | null>(null);
  const progressRef = useRef<Record<string, any>>({}); // logged-in players: the server-side game_progress.state blob

  const [phase, setPhase] = useState<"menu" | "playing" | "over">("menu");
  const [hud, setHud] = useState<HudState | null>(null);
  const [mode, setMode] = useState<CirqlbreakMode>("journey");
  const [diff, setDiff] = useState<Difficulty>("medium");
  const [spd, setSpd] = useState(1);
  const [chaos, setChaos] = useState(true);
  const [relic, setRelic] = useState<{ options: RelicId[]; pick: (id: RelicId) => void } | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [sound, setSound] = useState(() => lsGet("cb_sound") !== "0");
  const [haptics, setHaptics] = useState(() => lsGet("cb_hap") !== "0");
  const [menuInfo, setMenuInfo] = useState({ jbest: 0, jworld: 0, streak: 0, dailyNum: 0 });
  const [shareLabel, setShareLabel] = useState("Share result");
  const [bank, setBank] = useState<Record<string, number>>({}); // tap-earned rewards (Partner Power + power-ups)

  // Menu stats come from the server for logged-in players (cross-device), and from
  // the engine's localStorage for guests.
  const refreshMenuInfo = useCallback((eng: CirqlbreakEngine) => {
    const st = progressRef.current;
    if (user && (st.journeyBest != null || st.furthestWorld != null || st.dailyStreak != null)) {
      setMenuInfo({ jbest: st.journeyBest || 0, jworld: st.furthestWorld || 0, streak: st.dailyStreak ?? eng.peekStreak(), dailyNum: eng.dailyNumber() });
    } else {
      const jb = eng.journeyBest();
      setMenuInfo({ jbest: jb.score, jworld: jb.world, streak: eng.peekStreak(), dailyNum: eng.dailyNumber() });
    }
  }, [user]);

  // Merge a patch into the server state blob and persist it (logged-in only).
  const persist = useCallback((patch: Record<string, any>) => {
    progressRef.current = { ...progressRef.current, ...patch };
    if (!user) return;
    fetch("/api/game/progress", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: progressRef.current }),
    }).catch(() => {});
  }, [user]);

  // Build the engine once, on mount.
  useEffect(() => {
    if (!canvasRef.current) return;
    const eng = new CirqlbreakEngine(canvasRef.current, {
      sound,
      haptics,
      onHud: setHud,
      onRelicOffer: (options, pick) => setRelic({ options, pick }),
      onWorldRestored: () => { /* CHR-115/116: POST /api/game/restored → points + badges */ },
      onRunEnd: (r) => { setResult(r); setPhase("over"); setShareLabel("Share result"); },
    });
    engineRef.current = eng;
    refreshMenuInfo(eng);
    return () => { eng.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate the server progress blob when a logged-in player arrives (settings +
  // best/streak sync across devices); reset to local for guests.
  useEffect(() => {
    if (!user) { progressRef.current = {}; setBank({}); if (engineRef.current) refreshMenuInfo(engineRef.current); return; }
    let cancelled = false;
    fetch("/api/game/progress", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        progressRef.current = d.state || {};
        setBank((progressRef.current.perks as Record<string, number>) || {});
        const s = progressRef.current.settings;
        if (s && typeof s.sound === "boolean") { setSound(s.sound); engineRef.current?.setMuted(!s.sound); }
        if (s && typeof s.haptics === "boolean") { setHaptics(s.haptics); engineRef.current?.setHaptics(s.haptics); }
        if (engineRef.current) refreshMenuInfo(engineRef.current);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, refreshMenuInfo]);

  // Persist bests / streak / worlds-restored at the end of each run.
  useEffect(() => {
    if (!result) return;
    const st = progressRef.current;
    const patch: Record<string, any> = {};
    if (result.mode === "journey") {
      patch.journeyBest = Math.max(st.journeyBest || 0, result.score);
      patch.furthestWorld = Math.max(st.furthestWorld || 0, result.world);
    }
    if (result.mode === "daily") patch.dailyStreak = result.streak;
    const cleared = result.mode === "daily" ? (result.restored ? 1 : 0) : Math.max(0, result.world - 1);
    if (cleared) patch.worldsRestored = (st.worldsRestored || 0) + cleared;
    if (Object.keys(patch).length) persist(patch);
    if (engineRef.current) refreshMenuInfo(engineRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const startRun = async () => {
    setResult(null);
    setRelic(null);
    // Redeem tap-earned rewards into this run (Partner Power + power-ups), server-
    // authoritative so the bank can't be over-spent.
    let boot: { nova?: boolean; powerups?: PowerupType[] } = {};
    if (user && mode !== "daily") { // Daily is competitive → perk-free
      const spend: Record<string, number> = {};
      if (bank.nova) spend.nova = 1;
      TOKEN_TYPES.forEach((t) => { if (bank[t]) spend[t] = bank[t]; });
      if (Object.keys(spend).length) {
        const r = await fetch("/api/game/perks/redeem", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spend }),
        }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
        if (r?.spent) {
          const powerups: PowerupType[] = [];
          TOKEN_TYPES.forEach((t) => { for (let i = 0; i < (r.spent[t] || 0); i++) powerups.push(t); });
          boot = { nova: (r.spent.nova || 0) > 0, powerups };
          setBank(r.perks || {});
          progressRef.current = { ...progressRef.current, perks: r.perks || {} };
        }
      }
    }
    engineRef.current?.start(mode, { diff, spd, chaos }, boot);
    setPhase("playing");
  };
  const quitToMenu = () => {
    engineRef.current?.toMenu();
    setRelic(null);
    setResult(null);
    setPhase("menu");
    if (engineRef.current) refreshMenuInfo(engineRef.current);
  };
  const pickRelic = (id: RelicId) => { relic?.pick(id); setRelic(null); };
  const toggleSound = () => setSound((v) => { const n = !v; engineRef.current?.setMuted(!n); lsSet("cb_sound", n ? "1" : "0"); persist({ settings: { sound: n, haptics } }); return n; });
  const toggleHaptics = () => setHaptics((v) => { const n = !v; engineRef.current?.setHaptics(n); lsSet("cb_hap", n ? "1" : "0"); if (n) navigator.vibrate?.(20); persist({ settings: { sound, haptics: n } }); return n; });

  const shareDaily = () => {
    if (!result) return;
    const stars = result.comboMax >= 10 ? "★★★" : result.comboMax >= 5 ? "★★☆" : "★☆☆";
    const txt = `Cirqlbreak · Daily Circle #${result.dailyNum} ${stars}\nScore ${result.score.toLocaleString()} · best combo ×${result.comboMax} · ${result.restored ? "restored 🟣" : "faded ⚫"}\ncirqlback.onrender.com/play`;
    if (navigator.share) navigator.share({ text: txt }).catch(() => {});
    else navigator.clipboard?.writeText(txt).then(() => { setShareLabel("Copied!"); setTimeout(() => setShareLabel("Share result"), 1600); }).catch(() => {});
  };

  const seg = (active: boolean) =>
    "rounded-xl border px-2 py-3 text-sm font-bold transition text-center " +
    (active ? "text-white border-transparent" : "text-violet-300/70 border-violet-400/20 bg-white/[0.03] hover:text-white");
  const segStyle = (active: boolean) => (active ? { background: "linear-gradient(135deg,rgba(124,58,237,.5),rgba(236,72,153,.4))" } : undefined);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden text-slate-100 select-none"
      style={{ background: "radial-gradient(1100px 780px at 50% -10%, rgba(124,58,237,.22), transparent 60%), #05040f", touchAction: "none" }}
    >
      {/* the game surface */}
      <div className="relative" style={{ width: "min(94vw,94vh,680px)", aspectRatio: "1" }}>
        <canvas ref={canvasRef} className="block touch-none rounded-full" style={{ boxShadow: "0 0 90px rgba(124,58,237,.15)" }} aria-label="Cirqlbreak" />
      </div>

      {/* ---------- HUD (in-run) ---------- */}
      {phase === "playing" && hud && (
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-0 left-0 right-0 flex items-start justify-between gap-3 p-4">
            <div>
              <div className="text-[12px] uppercase tracking-[0.16em] text-violet-300/70">Score<b className="block text-[26px] leading-none text-white tabular-nums" data-testid="hud-score">{hud.score.toLocaleString()}</b></div>
              <div className="mt-1.5 flex max-w-[120px] flex-wrap gap-1.5" data-testid="hud-lives">
                {Array.from({ length: Math.max(hud.lives, 0) }).map((_, i) => (
                  <span key={i} className="h-3 w-3 rounded-full" style={{ background: "radial-gradient(circle at 38% 34%,#fff,#ec4899 70%)", boxShadow: "0 0 10px rgba(236,72,153,.7)" }} />
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[12px] uppercase tracking-[0.16em] text-violet-300/70">{hud.mode === "daily" ? "Daily" : "World"}<b className="block text-[26px] leading-none text-white tabular-nums">{hud.mode === "daily" ? "#" + hud.dailyNum : hud.world}</b></div>
              {hud.combo >= 2 && <div className="mt-2 text-[12px] uppercase tracking-[0.16em]" style={{ color: "#22d3ee", textShadow: "0 0 18px rgba(34,211,238,.6)" }}>Combo<b className="block text-[22px] leading-none tabular-nums">×{hud.combo}</b></div>}
            </div>
            <div className="pointer-events-auto flex gap-2">
              <button onClick={toggleHaptics} title="Haptics" className={"grid h-9 w-9 place-items-center rounded-xl border border-violet-400/20 bg-white/[0.04] text-base " + (haptics ? "" : "opacity-40")}>📳</button>
              <button onClick={toggleSound} title="Sound" className={"grid h-9 w-9 place-items-center rounded-xl border border-violet-400/20 bg-white/[0.04] text-base " + (sound ? "" : "opacity-40")}>{sound ? "🔊" : "🔇"}</button>
              <button onClick={quitToMenu} title="Menu" data-testid="button-quit" className="grid h-9 w-9 place-items-center rounded-xl border border-violet-400/20 bg-white/[0.04] text-base">⏸</button>
            </div>
          </div>
          <div className="absolute bottom-5 left-0 right-0 flex flex-wrap justify-center gap-2.5 px-3">
            <button
              onClick={() => engineRef.current?.firePulse()}
              data-testid="button-pulse"
              className="pointer-events-auto rounded-full border px-5 py-2.5 text-xs font-extrabold tracking-[0.13em] transition"
              style={{ borderColor: "rgba(34,211,238,.5)", background: "rgba(34,211,238,.12)", color: "#a5f3fc", opacity: hud.pulseReady ? 1 : 0.35, boxShadow: "0 0 20px rgba(34,211,238,.2)" }}
            >⟳ PULSE</button>
            <button
              onClick={() => engineRef.current?.fireSuper()}
              data-testid="button-super"
              className={"pointer-events-auto rounded-full border px-5 py-2.5 text-xs font-extrabold tracking-[0.13em] transition " + (hud.superCharge >= 1 ? "animate-pulse" : "")}
              style={{ borderColor: "rgba(251,191,36,.5)", background: "rgba(251,191,36,.1)", color: "#fde68a", opacity: hud.superCharge >= 1 ? 1 : 0.28 + 0.4 * hud.superCharge, boxShadow: hud.superCharge >= 1 ? "0 0 30px rgba(251,191,36,.6)" : "0 0 18px rgba(251,191,36,.18)" }}
            >★ SUPERNOVA</button>
          </div>
        </div>
      )}

      {/* ---------- Menu ---------- */}
      {phase === "menu" && (
        <div className="fixed inset-0 grid place-items-center overflow-y-auto p-5" style={{ background: "rgba(5,4,15,.72)", backdropFilter: "blur(3px)" }}>
          <div className="w-[min(92vw,440px)] rounded-3xl border border-violet-400/15 p-6 text-center" style={{ background: "radial-gradient(600px 320px at 50% -20%, rgba(124,58,237,.32), transparent 60%), #0b0918", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
            <div className="text-[12px] font-extrabold uppercase tracking-[0.44em] text-violet-400" style={{ marginLeft: ".44em" }}>Cirqlback</div>
            <h1 className="mb-1 mt-2 text-[clamp(28px,6.5vw,42px)] font-extrabold leading-none tracking-tight" style={{ background: "linear-gradient(115deg,#e9d5ff,#ec4899 55%,#22d3ee)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Cirqlbreak</h1>

            <div className="mb-2 mt-4 text-left text-[11px] uppercase tracking-[0.2em] text-violet-300/60">Mode</div>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} data-testid={`mode-${m.id}`} className={seg(mode === m.id)} style={segStyle(mode === m.id)}>
                  {m.label}<small className="mt-0.5 block text-[10.5px] font-medium opacity-70">{m.hint}</small>
                </button>
              ))}
            </div>

            {mode === "journey" && (
              <p className="mt-4 min-h-[40px] px-1 text-[13px] leading-relaxed text-violet-300/70">
                {menuInfo.jbest ? <>Your best: <b className="text-violet-100">{menuInfo.jbest.toLocaleString()}</b> · reached World {menuInfo.jworld}.<br />Starts gentle, climbs forever — beat it.</> : <>One long run that starts gentle and climbs forever.<br />How deep into the dark can you get?</>}
              </p>
            )}
            {mode === "daily" && (
              <p className="mt-4 min-h-[40px] px-1 text-[13px] leading-relaxed text-violet-300/70">
                <b className="text-violet-100">Daily Circle #{menuInfo.dailyNum}</b> — the same board for everyone today, one ranked run.<br />
                {menuInfo.streak ? <>🔥 <b className="text-amber-400">{menuInfo.streak}-day streak</b> — play today to keep it alive.</> : "Play today to start a streak."}
              </p>
            )}
            {mode === "party" && (
              <p className="mt-4 min-h-[40px] px-1 text-[13px] leading-relaxed text-violet-300/70">
                Two players, one circle. <b className="text-violet-100">P1 guards the top</b>, <b className="text-violet-100">P2 guards the bottom</b> — pass the ball across and restore each world together.<br /><b>P1:</b> A / D · <b>P2:</b> ← / → · or two thumbs on touch.
              </p>
            )}
            {mode === "freestyle" && (
              <div className="mt-4 text-left">
                <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-violet-300/60">Difficulty</div>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFS.map((d) => (
                    <button key={d.id} onClick={() => setDiff(d.id)} data-testid={`diff-${d.id}`} className={seg(diff === d.id)} style={segStyle(diff === d.id)}>
                      {d.label}<small className="mt-0.5 block text-[10.5px] font-medium opacity-70">{d.hint}</small>
                    </button>
                  ))}
                </div>
                <div className="mb-2 mt-4 text-[11px] uppercase tracking-[0.2em] text-violet-300/60">Ball speed</div>
                <div className="flex items-center gap-3">
                  <input type="range" min={0.6} max={1.6} step={0.05} value={spd} onChange={(e) => setSpd(parseFloat(e.target.value))} className="h-1 flex-1" style={{ accentColor: "#ec4899" }} />
                  <span className="w-11 text-right text-sm tabular-nums text-cyan-300">{spd.toFixed(1)}×</span>
                </div>
                <div className="mb-2 mt-4 text-[11px] uppercase tracking-[0.2em] text-violet-300/60">Modifiers</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setChaos(true)} className={seg(chaos)} style={segStyle(chaos)}>On<small className="mt-0.5 block text-[10.5px] font-medium opacity-70">gravity, chains, orbits</small></button>
                  <button onClick={() => setChaos(false)} className={seg(!chaos)} style={segStyle(!chaos)}>Off<small className="mt-0.5 block text-[10.5px] font-medium opacity-70">pure breakout</small></button>
                </div>
              </div>
            )}

            {user && mode !== "daily" && (
              Object.values(bank).some((n) => n > 0) ? (
                <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 text-left" data-testid="tap-bank">
                  <div className="mb-1 text-[11px] uppercase tracking-[0.16em] text-amber-300/80">From your taps</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-amber-100">
                    {PERKS.filter((p) => (bank[p.id] || 0) > 0).map((p) => (
                      <span key={p.id}>{p.emoji} {p.name}{(bank[p.id] || 0) > 1 ? ` ×${bank[p.id]}` : ""}</span>
                    ))}
                  </div>
                  <div className="mt-1 text-[11px] text-amber-300/50">Unleashed when you press Play.</div>
                </div>
              ) : (
                <p className="mt-4 text-[11px] text-amber-300/45">🎯 Tap partner shops to charge your Partner Power &amp; earn power-ups.</p>
              )
            )}
            <button onClick={startRun} data-testid="button-play" className="mt-5 w-full rounded-2xl py-4 text-base font-extrabold text-white transition hover:brightness-110" style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 12px 34px rgba(124,58,237,.4)" }}>Play</button>
            <p className="mt-3.5 text-[12px] leading-relaxed text-violet-300/60">
              <b className="text-violet-100">Move</b> your mouse or finger to swing the paddle around the rim. Catch <b className="text-violet-100">power-ups</b>, clear every ring to wake the <b className="text-violet-100">core</b>, then strike its glowing gap. <b className="text-violet-100">E</b> Pulse · <b className="text-violet-100">Q</b> Supernova.
            </p>
            {!user && <p className="mt-3 text-[11px] text-violet-300/40">Log in to save your progress and earn power-ups from real taps.</p>}
            <Link href="/customer" className="mt-4 inline-flex items-center gap-1 text-xs text-violet-300/60"><ArrowLeft className="h-3 w-3" /> Back</Link>
          </div>
        </div>
      )}

      {/* ---------- Relic pick (Journey) ---------- */}
      {relic && (
        <div className="fixed inset-0 grid place-items-center overflow-y-auto p-5" style={{ background: "rgba(5,4,15,.72)", backdropFilter: "blur(3px)" }} data-testid="relic-offer">
          <div className="w-[min(92vw,440px)] rounded-3xl border border-violet-400/15 p-6 text-center" style={{ background: "radial-gradient(600px 320px at 50% -20%, rgba(124,58,237,.32), transparent 60%), #0b0918", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
            <div className="text-[12px] font-extrabold uppercase tracking-[0.44em] text-violet-400" style={{ marginLeft: ".44em" }}>Choose a boon</div>
            <h1 className="mb-1 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold" style={{ background: "linear-gradient(115deg,#e9d5ff,#ec4899 55%,#22d3ee)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Pick your power</h1>
            <p className="mx-auto mt-1 max-w-[36ch] text-sm text-violet-300/70">A relic for the rest of your run — and they stack.</p>
            <div className="mt-4 grid gap-2.5">
              {relic.options.map((id, i) => (
                <button key={i} onClick={() => pickRelic(id)} data-testid={`relic-${id}`} className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-white/[0.03] p-3.5 text-left transition hover:-translate-y-px hover:border-violet-400/50 hover:bg-violet-500/15">
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-xl text-xl" style={{ background: "rgba(124,58,237,.22)" }}>{RELICS[id].i}</div>
                  <div><b className="block text-[15px] text-white">{RELICS[id].n}</b><span className="text-[12.5px] leading-snug text-violet-300/70">{RELICS[id].d}</span></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------- End screen ---------- */}
      {phase === "over" && result && (
        <div className="fixed inset-0 grid place-items-center overflow-y-auto p-5" style={{ background: "rgba(5,4,15,.72)", backdropFilter: "blur(3px)" }} data-testid="end-screen">
          <div className="w-[min(92vw,440px)] rounded-3xl border border-violet-400/15 p-6 text-center" style={{ background: "radial-gradient(600px 320px at 50% -20%, rgba(124,58,237,.32), transparent 60%), #0b0918", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
            <div className="text-[12px] font-extrabold uppercase tracking-[0.44em]" style={{ marginLeft: ".44em", color: result.restored ? "#34d399" : "#7c3aed" }}>{result.restored ? "Restored" : "Faded"}</div>
            <h1 className="mb-1 mt-2 text-[clamp(24px,5.5vw,34px)] font-extrabold text-white">
              {result.mode === "daily" ? (result.restored ? "Daily Restored" : "Daily Complete") : "The Light Faded"}
            </h1>
            <p className="mx-auto mt-1 max-w-[38ch] text-sm text-violet-300/70">
              {result.mode === "daily"
                ? result.restored ? "You cleared today’s circle — come back tomorrow for a new one." : "Today’s circle held. One shot a day — try again tomorrow."
                : result.mode === "party" ? `Together you restored ${result.world - 1} world${result.world - 1 === 1 ? "" : "s"} before the dark closed in.`
                : `You reached World ${result.world} before the spark slipped away.`}
            </p>
            <div className="mt-3 flex justify-center gap-4">
              <div className="text-[13px] text-violet-300/70">{result.mode === "daily" ? "Daily" : "World"}<b className="mt-0.5 block text-[22px] text-white tabular-nums">{result.mode === "daily" ? "#" + result.dailyNum : result.world}</b></div>
              <div className="text-[13px] text-violet-300/70">Best combo<b className="mt-0.5 block text-[22px] text-white tabular-nums">×{result.comboMax}</b></div>
            </div>
            <div className="mt-2 text-[15px] text-violet-300/70">Score<b className="block text-[34px] text-white tabular-nums" data-testid="end-score">{result.score.toLocaleString()}</b></div>
            {result.mode === "daily" && <div className="mt-2.5 text-xs text-cyan-300">🔥 <b className="text-amber-400">{result.streak}-day streak</b></div>}
            <button onClick={startRun} data-testid="button-again" className="mt-5 w-full rounded-2xl py-4 text-base font-extrabold text-white transition hover:brightness-110" style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)", boxShadow: "0 12px 34px rgba(124,58,237,.4)" }}>{result.mode === "daily" ? "Replay (unranked)" : "Play again"}</button>
            {result.mode === "daily" && (
              <button onClick={shareDaily} data-testid="button-share" className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-violet-400/20 py-3 font-semibold text-violet-300/80 transition hover:bg-white/[0.04] hover:text-white"><Share2 className="h-4 w-4" /> {shareLabel}</button>
            )}
            <button onClick={quitToMenu} data-testid="button-menu" className="mt-2.5 w-full rounded-2xl border border-violet-400/20 py-3 font-semibold text-violet-300/80 transition hover:bg-white/[0.04] hover:text-white">Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
