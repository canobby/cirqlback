import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Sparkles, Gift, Flame, Gem, Map as MapIcon, CalendarDays, Share2, Radio } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CirqlEngine, type GameState } from "@/game/cirql-engine";
import { CRAFTED_WORLDS, type WorldConfig } from "@/game/worlds";
import { generateWorld, dailyWorld, todayDay, dailyPuzzleNumber } from "@/game/procedural";
import { CirqlCollection } from "@/components/game/cirql-collection";
import { WorldMap } from "@/components/game/world-map";
import { DailyResult } from "@/components/game/daily-result";
import { Echoes } from "@/components/game/echoes";
import { getCosmetic, DEFAULT_COSMETIC } from "@shared/cirql-cosmetics";
import { PERKS } from "@shared/cirql-perks";
import { nextCommunityMilestone } from "@shared/cirql-community";

const todayStr = () => new Date().toISOString().slice(0, 10); // UTC yyyy-mm-dd (matches the server)

// The world at an absolute index: crafted "signature" worlds first, then an
// infinite procedurally-generated tail (CHR-101), seeded per player.
const worldAt = (i: number, seed = 0): WorldConfig =>
  i < CRAFTED_WORLDS.length ? CRAFTED_WORLDS[i] : generateWorld(i, seed);

// CIRQL — the in-app game page (lazy-loaded at /play, code-split). Guests play
// without saving; logged-in players resume where they left off (CHR-94).
export default function Play() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CirqlEngine | null>(null);
  const loadedRef = useRef(false);
  const wonRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [playerSeed, setPlayerSeed] = useState(0);
  const [restored, setRestored] = useState(0);
  const [hud, setHud] = useState<GameState>({
    worldName: CRAFTED_WORLDS[0].name, aligned: 0, total: CRAFTED_WORLDS[0].ringCount, moves: 0, won: false,
  });
  const [muted, setMuted] = useState(false);
  const [zen, setZen] = useState(false); // CHR-106 Zen mode
  const [award, setAward] = useState(0);
  const [newBadges, setNewBadges] = useState<string[]>([]); // CHR-103: achievements just earned
  const [perfectWin, setPerfectWin] = useState(false); // CHR-105: no-wasted-moves solve
  const [shinies, setShinies] = useState(0); // CHR-108: shiny worlds discovered
  const [greatRing, setGreatRing] = useState<number | null>(null); // CHR-97: shared community total

  const refreshGreatRing = () => {
    fetch("/api/game/great-ring", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && typeof d.total === "number") setGreatRing(d.total); })
      .catch(() => {});
  };
  useEffect(() => { refreshGreatRing(); }, []);
  // CHR-93 daily reward
  const dailyLoadedRef = useRef(false);
  const [daily, setDaily] = useState<{ canClaim: boolean; streak: number; reward: number } | null>(null);
  const [dailyClaimed, setDailyClaimed] = useState<{ points: number; streak: number } | null>(null);
  // CHR-104 Daily Circle — one shared world per day + a shareable result.
  const dailyPuzzle = useMemo(() => { const day = todayDay(); return { day, num: dailyPuzzleNumber(day), world: dailyWorld(day) }; }, []);
  const dailyModeRef = useRef(false);
  const dailyStartRef = useRef(0);
  const [dailyMode, setDailyMode] = useState(false);
  const [dailyDone, setDailyDone] = useState(false);
  const [dailyResult, setDailyResult] = useState<{ moves: number; timeMs: number; points: number } | null>(null);
  const [showDaily, setShowDaily] = useState(false);
  // CHR-96 reward bridge — perks banked from partner taps, spent in-game.
  const [perks, setPerks] = useState<Record<string, number>>({});
  const [guidingActive, setGuidingActive] = useState(false);
  // CHR-91 world map
  const [showMap, setShowMap] = useState(false);
  // CHR-98 Echoes
  const [showEchoes, setShowEchoes] = useState(false);
  // CHR-92 Your Cirql + collection
  const [showCollection, setShowCollection] = useState(false);
  const [equipped, setEquipped] = useState<string>(DEFAULT_COSMETIC);
  const [streak, setStreak] = useState(0);
  const [equipBusy, setEquipBusy] = useState<string | null>(null);

  // The default cosmetic means "the world's own light" (no override); any other
  // tints the core/bloom regardless of world.
  const applyAura = (id: string) => engineRef.current?.setAura(id && id !== DEFAULT_COSMETIC ? getCosmetic(id).accent : null);

  // Fire-and-forget save (logged-in only).
  const save = (patch: { worldIndex?: number; worldsRestored?: number }) => {
    if (!user) return;
    fetch("/api/game/progress", {
      method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(patch),
    }).catch(() => {});
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new CirqlEngine(canvasRef.current, worldAt(0), { onState: setHud });
    engineRef.current = engine;
    return () => { engine.destroy(); engineRef.current = null; };
  }, []);

  // Load saved progress once the user is known.
  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;
    fetch("/api/game/progress", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p || !engineRef.current) return;
        const seed = typeof p.playerSeed === "number" ? p.playerSeed : 0;
        setPlayerSeed(seed);
        setRestored(p.worldsRestored || 0);
        if (p.worldIndex > 0) { setIndex(p.worldIndex); engineRef.current.setWorld(worldAt(p.worldIndex, seed)); }
        // CHR-92: restore the equipped cosmetic + streak from saved state.
        const st = p.state || {};
        if (typeof st.dailyStreak === "number") setStreak(st.dailyStreak);
        if (typeof st.cosmetic === "string") { setEquipped(st.cosmetic); applyAura(st.cosmetic); }
        // CHR-104: was today's Daily Circle already completed?
        if (st.dailyCircle?.date === todayStr()) {
          setDailyDone(true);
          setDailyResult({ moves: st.dailyCircle.moves, timeMs: st.dailyCircle.timeMs || 0, points: 0 });
        }
        // CHR-96: banked perks from partner taps.
        if (st.perks && typeof st.perks === "object") setPerks(st.perks);
        if (typeof st.shinies === "number") setShinies(st.shinies); // CHR-108
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load daily-reward status once the user is known (logged-in only).
  useEffect(() => {
    if (!user || dailyLoadedRef.current) return;
    dailyLoadedRef.current = true;
    fetch("/api/game/daily", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setDaily(d); setStreak((s) => Math.max(s, d.streak || 0)); } })
      .catch(() => {});
  }, [user]);

  const claimDaily = () => {
    if (!user || !daily?.canClaim) return;
    setDaily((d) => (d ? { ...d, canClaim: false } : d)); // optimistic: prevent double-claim
    fetch("/api/game/daily", { method: "POST", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (res) { setDailyClaimed({ points: res.pointsAwarded, streak: res.streak }); setStreak(res.streak); }
        else setDaily((d) => (d ? { ...d, canClaim: true } : d)); // 409/err — allow retry
      })
      .catch(() => setDaily((d) => (d ? { ...d, canClaim: true } : d)));
  };

  // CHR-92: equip a cosmetic — server validates it's unlocked, then we tint live.
  const equip = (id: string) => {
    if (!user || equipBusy) return;
    setEquipBusy(id);
    fetch("/api/game/cosmetic", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ cosmetic: id }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => { if (res?.cosmetic) { setEquipped(res.cosmetic); applyAura(res.cosmetic); } })
      .catch(() => {})
      .finally(() => setEquipBusy(null));
  };

  // A world was restored (won: false -> true).
  useEffect(() => {
    if (hud.won && !wonRef.current) {
      wonRef.current = true;
      if (dailyModeRef.current) {
        // CHR-104: Daily Circle completion — record once/day + show the share card.
        const moves = hud.moves;
        const timeMs = Math.round(performance.now() - dailyStartRef.current);
        setDailyDone(true);
        if (user) {
          fetch("/api/game/daily-circle", {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ moves, timeMs }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((res) => {
              const rr = res?.result;
              setDailyResult({ moves: rr?.moves ?? moves, timeMs: rr?.timeMs ?? timeMs, points: res?.pointsAwarded || 0 });
              setShowDaily(true);
            })
            .catch(() => { setDailyResult({ moves, timeMs, points: 0 }); setShowDaily(true); });
        } else {
          setDailyResult({ moves, timeMs, points: 0 }); setShowDaily(true);
        }
      } else {
        // CHR-105/108: perfect = no wasted moves; shiny = a rare world.
        const perfect = hud.moves > 0 && hud.moves <= hud.total;
        const shiny = !!worldAt(index, playerSeed).shiny;
        setPerfectWin(perfect);
        if (user) {
          // CHR-95: normal restore — server records it + awards points/badges.
          fetch("/api/game/restored", {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ worldIndex: index, perfect, shiny, worldName: hud.worldName }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((res) => { if (res) { setRestored(res.worldsRestored); setAward(res.pointsAwarded || 0); setNewBadges(res.badges || []); if (typeof res.shinies === "number") setShinies(res.shinies); refreshGreatRing(); } })
            .catch(() => {});
        } else {
          setRestored((r) => r + 1);
          if (shiny) setShinies((s) => s + 1);
        }
      }
    }
    if (!hud.won) wonRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud.won]);

  const goIndex = (i: number) => {
    setAward(0); setNewBadges([]); setPerfectWin(false); setGuidingActive(false); // Guiding Light is per-world; engine resets it too
    if (dailyModeRef.current) { dailyModeRef.current = false; setDailyMode(false); setShowDaily(false); wonRef.current = false; }
    setIndex(i); engineRef.current?.setWorld(worldAt(i, playerSeed)); save({ worldIndex: i });
  };

  // CHR-96: spend a banked perk — apply the in-game effect, then consume server-side.
  const usePerk = (perk: string) => {
    if (dailyMode || !user || (perks[perk] || 0) <= 0) return; // perk-free in the competitive Daily Circle
    if (perk === "echo") { if (!engineRef.current?.autoAlignOne()) return; } // nothing to align → don't spend
    else if (perk === "guiding") { if (guidingActive) return; engineRef.current?.setGuidingLight(true); setGuidingActive(true); }
    setPerks((p) => ({ ...p, [perk]: (p[perk] || 0) - 1 })); // optimistic
    fetch("/api/game/perk/use", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ perk }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => { if (res?.perks) setPerks(res.perks); else setPerks((p) => ({ ...p, [perk]: (p[perk] || 0) + 1 })); })
      .catch(() => setPerks((p) => ({ ...p, [perk]: (p[perk] || 0) + 1 })));
  };

  // CHR-104: enter / leave the shared Daily Circle without disturbing the resume point.
  const startDaily = () => {
    setShowDaily(false); wonRef.current = false; dailyStartRef.current = performance.now(); setGuidingActive(false);
    dailyModeRef.current = true; setDailyMode(true);
    engineRef.current?.setWorld(dailyPuzzle.world);
  };
  const exitDaily = () => {
    dailyModeRef.current = false; setDailyMode(false); setShowDaily(false); wonRef.current = false; setGuidingActive(false);
    engineRef.current?.setWorld(worldAt(index, playerSeed));
  };
  const nextWorld = () => goIndex(index + 1);
  const endless = () => goIndex(Math.max(index + 1, CRAFTED_WORLDS.length));
  const toggleMute = () => { const m = !muted; setMuted(m); engineRef.current?.setMuted(m); };
  const toggleZen = () => { const z = !zen; setZen(z); engineRef.current?.setZen(z); };
  const inEndless = index >= CRAFTED_WORLDS.length;

  return (
    <div
      className="min-h-screen flex flex-col items-center text-slate-100 select-none"
      style={{ background: "radial-gradient(1000px 700px at 50% -12%, rgba(124,58,237,.28), transparent 60%), #05040f" }}
    >
      <div className="w-full max-w-lg px-4 pt-6 pb-1 text-center">
        <div className="text-[12px] tracking-[0.42em] font-bold text-violet-300 ml-[0.42em]">C I R Q L</div>
        <h1 className="text-lg font-bold mt-2">Restore the Circle</h1>
        <p className="text-xs text-violet-300/70 mt-0.5">Drag each ring so its light points to the top. Align them all to bring the world back.</p>
      </div>

      {/* CHR-97 · Great Ring — one shared community total, filled by every restoration everywhere */}
      {greatRing !== null && (() => {
        const m = nextCommunityMilestone(greatRing);
        return (
          <div className="w-full max-w-lg px-4 mt-1" data-testid="great-ring">
            <div className="rounded-2xl border border-violet-400/20 bg-white/[0.03] px-4 py-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-violet-200/90 font-semibold">🌍 Great Ring · together</span>
                <span className="text-violet-300/70 tabular-nums">{greatRing.toLocaleString()} worlds restored</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.round(Math.max(0, Math.min(1, m.pct)) * 100)}%`, background: "linear-gradient(90deg,#7c3aed,#ec4899,#22d3ee)" }} />
              </div>
              <div className="mt-1 text-[10px] text-violet-300/50 tabular-nums">Next: {m.name} · {greatRing.toLocaleString()}/{m.to.toLocaleString()}</div>
            </div>
          </div>
        );
      })()}

      {/* World selector — crafted worlds + the endless stream (placeholder until the CHR-91 map) */}
      <div className="flex gap-2 mt-2 flex-wrap justify-center px-4">
        {CRAFTED_WORLDS.map((w, i) => (
          <button
            key={w.id}
            onClick={() => goIndex(i)}
            data-testid={`world-${w.id}`}
            className="rounded-full border px-3 py-1 text-xs font-semibold transition"
            style={{
              borderColor: index === i ? w.accent : "rgba(150,130,255,.25)",
              color: index === i ? "#fff" : "rgba(196,181,253,.75)",
              background: index === i ? `${w.accent}22` : "transparent",
            }}
          >
            {w.name}
          </button>
        ))}
        <button
          onClick={endless}
          data-testid="world-endless"
          className="rounded-full border px-3 py-1 text-xs font-semibold transition inline-flex items-center gap-1"
          style={{
            borderColor: inEndless ? "#c4b5fd" : "rgba(150,130,255,.25)",
            color: inEndless ? "#fff" : "rgba(196,181,253,.75)",
            background: inEndless ? "rgba(196,181,253,.13)" : "transparent",
          }}
        >
          <Sparkles className="h-3 w-3" /> Endless
        </button>
      </div>

      <div className="mt-2 text-[11px] text-violet-300/60 tabular-nums">
        {dailyMode ? (
          <span className="text-violet-200/90">🗓 Daily Circle #{dailyPuzzle.num} · {hud.worldName}</span>
        ) : (
          <>
            World {index + 1} · <span className="text-violet-200/90">{hud.worldName}</span>
            {worldAt(index, playerSeed).shiny && <span className="text-fuchsia-300 font-semibold" data-testid="shiny-tag"> · 🌈 Shiny</span>}
            {inEndless ? " · endless" : ""}
            {user ? <span className="text-emerald-300/70"> · {restored} restored</span> : <span className="text-violet-300/40"> · log in to save</span>}
          </>
        )}
      </div>

      {/* CHR-93 · Daily reward — one calm, escalating bonus per day for playing */}
      {user && (daily?.canClaim || dailyClaimed) && (
        <div className="mt-2 px-4 w-full max-w-lg">
          {dailyClaimed ? (
            <div
              data-testid="daily-claimed"
              className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 flex items-center justify-center gap-2 text-sm"
            >
              <Gift className="h-4 w-4 text-emerald-300" />
              <span className="font-semibold text-emerald-200">Daily reward claimed · +{dailyClaimed.points} ✦</span>
              <span className="inline-flex items-center gap-1 text-amber-300/90"><Flame className="h-3.5 w-3.5" />{dailyClaimed.streak}-day streak</span>
            </div>
          ) : (
            <button
              onClick={claimDaily}
              data-testid="button-claim-daily"
              className="w-full rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}
            >
              <Gift className="h-4 w-4" /> Claim daily reward · +{daily?.reward} ✦
              {daily && daily.streak > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-200/90 font-semibold"><Flame className="h-3.5 w-3.5" />{daily.streak}</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* CHR-104 · Daily Circle — one shared world per day + shareable result */}
      <div className="mt-2 px-4 w-full max-w-lg">
        {dailyMode ? (
          <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 flex items-center justify-center gap-2 text-xs">
            <CalendarDays className="h-4 w-4 text-violet-300" />
            <span className="font-semibold text-violet-100">Daily Circle #{dailyPuzzle.num}</span>
            <button onClick={exitDaily} data-testid="button-exit-daily" className="ml-1 rounded-lg border border-violet-400/30 px-2 py-0.5 text-violet-200/80 hover:bg-white/5">Exit</button>
          </div>
        ) : dailyDone ? (
          <div data-testid="daily-done" className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 flex items-center justify-center gap-2 text-xs">
            <CalendarDays className="h-4 w-4 text-emerald-300" />
            <span className="font-semibold text-emerald-200">Daily Circle #{dailyPuzzle.num} complete</span>
            {dailyResult && (
              <button onClick={() => setShowDaily(true)} data-testid="button-share-daily-open" className="ml-1 rounded-lg border border-emerald-400/30 px-2 py-0.5 text-emerald-200/90 hover:bg-white/5 inline-flex items-center gap-1"><Share2 className="h-3 w-3" /> Share</button>
            )}
          </div>
        ) : (
          <button
            onClick={startDaily}
            data-testid="button-play-daily"
            className="w-full rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/20 transition"
          >
            <CalendarDays className="h-4 w-4 text-violet-300" /> Play today's Daily Circle #{dailyPuzzle.num}
          </button>
        )}
      </div>

      <div className="flex gap-5 items-center my-2 text-sm tabular-nums">
        {zen ? (
          <span className="text-violet-300/80" data-testid="zen-indicator">🧘 Zen — just restore</span>
        ) : (
          <>
            <span className="text-emerald-400 font-semibold">{hud.aligned}/{hud.total} aligned</span>
            <span>Moves <b>{hud.moves}</b></span>
          </>
        )}
      </div>

      {/* CHR-96 · Perks — banked from partner taps, spent in-game (perk-free in the Daily Circle) */}
      {user && !dailyMode && (
        <div className="flex gap-2 flex-wrap justify-center px-4 min-h-[28px]" data-testid="perk-bar">
          {PERKS.some((p) => (perks[p.id] || 0) > 0) ? (
            PERKS.filter((p) => (perks[p.id] || 0) > 0).map((p) => {
              const disabled = p.id === "guiding" && guidingActive;
              return (
                <button
                  key={p.id}
                  onClick={() => usePerk(p.id)}
                  disabled={disabled}
                  title={p.desc}
                  data-testid={`perk-${p.id}`}
                  className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-100 hover:bg-violet-500/20 transition disabled:opacity-40"
                >
                  {p.emoji} {p.name} <span className="text-violet-300/80">·{perks[p.id]}</span>{disabled ? " ✓" : ""}
                </button>
              );
            })
          ) : (
            <span className="text-[11px] text-violet-300/45">🎯 Tap at partner shops to earn in-game perks</span>
          )}
        </div>
      )}

      <div className="relative" style={{ width: "min(92vw, 540px)", aspectRatio: "1" }}>
        <canvas ref={canvasRef} className="block touch-none" style={{ cursor: "grab" }} aria-label="Ring alignment puzzle" />
        {hud.won && !dailyMode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center backdrop-blur-[2px]">
            <h2
              className="text-2xl font-extrabold"
              style={{ background: "linear-gradient(120deg,#c4b5fd,#ec4899 75%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
            >
              {hud.worldName} Restored
            </h2>
            <p className="text-sm text-violet-300">Beautiful. The circle is whole again.</p>
            {perfectWin && (
              <div data-testid="perfect-win" className="text-sm font-bold inline-flex items-center gap-1" style={{ color: "#67e8f9" }}>💎 Perfect — no wasted moves</div>
            )}
            {user && award > 0 && (
              <div className="text-sm font-semibold text-emerald-300" data-testid="points-award">+{award} ✦ points</div>
            )}
            {newBadges.map((name) => (
              <div key={name} data-testid="badge-earned" className="text-sm font-semibold text-amber-300 inline-flex items-center gap-1">🏅 {name} unlocked</div>
            ))}
            <button
              onClick={nextWorld}
              data-testid="button-next-world"
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/30"
              style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}
            >
              Next world →
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 my-4 flex-wrap justify-center">
        <button onClick={() => engineRef.current?.newPuzzle()} data-testid="button-new-puzzle" className="rounded-xl border border-violet-400/25 bg-white/5 px-4 py-2 text-sm font-semibold">New puzzle</button>
        <button onClick={toggleMute} aria-pressed={muted} className="rounded-xl border border-violet-400/25 bg-white/5 px-4 py-2 text-sm font-semibold">{muted ? "🔇 Muted" : "🔊 Sound"}</button>
        <button onClick={toggleZen} aria-pressed={zen} data-testid="button-zen" className="rounded-xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: zen ? "#c4b5fd" : "rgba(150,130,255,.25)", background: zen ? "rgba(196,181,253,.13)" : "rgba(255,255,255,.05)" }}>🧘 Zen</button>
        <button onClick={() => setShowMap(true)} data-testid="button-world-map" className="rounded-xl border border-violet-400/25 bg-white/5 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5">
          <MapIcon className="h-4 w-4 text-violet-300" /> Worlds
        </button>
        {user && (
          <button onClick={() => setShowEchoes(true)} data-testid="button-echoes" className="rounded-xl border border-violet-400/25 bg-white/5 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5">
            <Radio className="h-4 w-4 text-violet-300" /> Echoes
          </button>
        )}
        {user && (
          <button onClick={() => setShowCollection(true)} data-testid="button-your-cirql" className="rounded-xl border border-violet-400/25 bg-white/5 px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5">
            <Gem className="h-4 w-4 text-violet-300" /> Your Cirql
          </button>
        )}
      </div>
      <Link href="/customer" className="text-xs text-violet-300/60 mb-6 inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back</Link>

      <DailyResult
        open={showDaily && !!dailyResult}
        puzzleNumber={dailyPuzzle.num}
        worldName={dailyPuzzle.world.name}
        rings={dailyPuzzle.world.ringCount}
        moves={dailyResult?.moves ?? 0}
        timeMs={dailyResult?.timeMs ?? 0}
        pointsAwarded={dailyResult?.points ?? 0}
        onClose={() => (dailyMode ? exitDaily() : setShowDaily(false))}
      />

      <Echoes open={showEchoes} onClose={() => setShowEchoes(false)} />

      <WorldMap
        open={showMap}
        onClose={() => setShowMap(false)}
        current={index}
        restored={restored}
        resolve={(i) => worldAt(i, playerSeed)}
        onGo={goIndex}
      />

      <CirqlCollection
        open={showCollection}
        onClose={() => setShowCollection(false)}
        worlds={restored}
        streak={streak}
        shinies={shinies}
        equipped={equipped}
        onEquip={equip}
        busy={equipBusy}
      />
    </div>
  );
}
