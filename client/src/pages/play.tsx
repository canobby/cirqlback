import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CirqlEngine, type GameState } from "@/game/cirql-engine";
import { CRAFTED_WORLDS, type WorldConfig } from "@/game/worlds";
import { generateWorld } from "@/game/procedural";

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
  const [award, setAward] = useState(0);

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
      })
      .catch(() => {});
  }, [user]);

  // A world was restored (won: false -> true). Server records it + awards points
  // (CHR-95); guests just get a local count.
  useEffect(() => {
    if (hud.won && !wonRef.current) {
      wonRef.current = true;
      if (user) {
        fetch("/api/game/restored", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ worldIndex: index }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((res) => { if (res) { setRestored(res.worldsRestored); setAward(res.pointsAwarded || 0); } })
          .catch(() => {});
      } else {
        setRestored((r) => r + 1);
      }
    }
    if (!hud.won) wonRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud.won]);

  const goIndex = (i: number) => { setAward(0); setIndex(i); engineRef.current?.setWorld(worldAt(i, playerSeed)); save({ worldIndex: i }); };
  const nextWorld = () => goIndex(index + 1);
  const endless = () => goIndex(Math.max(index + 1, CRAFTED_WORLDS.length));
  const toggleMute = () => { const m = !muted; setMuted(m); engineRef.current?.setMuted(m); };
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
        World {index + 1} · <span className="text-violet-200/90">{hud.worldName}</span>{inEndless ? " · endless" : ""}
        {user ? <span className="text-emerald-300/70"> · {restored} restored</span> : <span className="text-violet-300/40"> · log in to save</span>}
      </div>

      <div className="flex gap-5 items-center my-2 text-sm tabular-nums">
        <span className="text-emerald-400 font-semibold">{hud.aligned}/{hud.total} aligned</span>
        <span>Moves <b>{hud.moves}</b></span>
      </div>

      <div className="relative" style={{ width: "min(92vw, 540px)", aspectRatio: "1" }}>
        <canvas ref={canvasRef} className="block touch-none" style={{ cursor: "grab" }} aria-label="Ring alignment puzzle" />
        {hud.won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center backdrop-blur-[2px]">
            <h2
              className="text-2xl font-extrabold"
              style={{ background: "linear-gradient(120deg,#c4b5fd,#ec4899 75%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
            >
              {hud.worldName} Restored
            </h2>
            <p className="text-sm text-violet-300">Beautiful. The circle is whole again.</p>
            {user && award > 0 && (
              <div className="text-sm font-semibold text-emerald-300" data-testid="points-award">+{award} ✦ points</div>
            )}
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

      <div className="flex gap-2 my-4">
        <button onClick={() => engineRef.current?.newPuzzle()} data-testid="button-new-puzzle" className="rounded-xl border border-violet-400/25 bg-white/5 px-4 py-2 text-sm font-semibold">New puzzle</button>
        <button onClick={toggleMute} aria-pressed={muted} className="rounded-xl border border-violet-400/25 bg-white/5 px-4 py-2 text-sm font-semibold">{muted ? "🔇 Muted" : "🔊 Sound"}</button>
      </div>
      <Link href="/customer" className="text-xs text-violet-300/60 mb-6 inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back</Link>
    </div>
  );
}
