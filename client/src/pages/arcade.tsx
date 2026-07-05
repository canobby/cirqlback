import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ChevronLeft, ChevronRight, Dices, Play, CornerUpLeft } from "lucide-react";
import { ARCADE_GAMES, ARCADE_CIRCLES, gamesInCircle, type CircleId } from "@/game/registry";

// CirqlCade — the arcade wheel, two-tier. First you spin a ring of "Game Circles"
// (categories); pick one and it opens into a ring of just that Circle's games.
// Same spin physics at both levels (flick / arrows / prev-next), the item under the
// top marker is selected, and the centre shows the current Circle or game with an
// action button. A circle of circular games — the picker itself is on-theme.
// Lazy-loaded at /arcade; honours reduced motion.

const TAU = Math.PI * 2;
const LIVE = ARCADE_GAMES.filter((g) => g.status === "live");
const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// A ring item is either a Circle (choosing) or a game (inside a Circle).
interface RingItem { id: string; accent: string; glyph: string; }

export default function Arcade() {
  const [, navigate] = useLocation();
  const [circleId, setCircleId] = useState<CircleId | null>(null); // null = choosing a Circle
  const circle = circleId ? ARCADE_CIRCLES.find((c) => c.id === circleId)! : null;
  const games = circleId ? gamesInCircle(circleId) : [];

  const items: RingItem[] = circleId
    ? games.map((g) => ({ id: g.id, accent: g.accent, glyph: g.glyph }))
    : ARCADE_CIRCLES.map((c) => ({ id: c.id, accent: c.accent, glyph: c.glyph }));
  const N = items.length;
  const STEP = TAU / N;
  const nRef = useRef(N); nRef.current = N;

  const [pos, setPos] = useState(0);          // continuous wheel position (float index at the top marker)
  const posRef = useRef(0); posRef.current = pos;
  const velRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const dragRef = useRef<{ x: number; active: boolean; moved: boolean }>({ x: 0, active: false, moved: false });
  const rafRef = useRef(0);

  const selected = ((Math.round(pos) % N) + N) % N;
  const selItem = items[selected];
  const accent = selItem?.accent || "#a78bfa";

  // reset the wheel whenever the level (Circle vs games) changes
  const resetWheel = useCallback(() => { posRef.current = 0; velRef.current = 0; targetRef.current = null; setPos(0); }, []);
  const openCircle = useCallback((id: CircleId) => { setCircleId(id); resetWheel(); }, [resetWheel]);
  const backToCircles = useCallback(() => { setCircleId(null); resetWheel(); }, [resetWheel]);

  // animation loop: momentum + snap / ease-to-target
  useEffect(() => {
    const tick = () => {
      const d = dragRef.current;
      if (!d.active) {
        if (targetRef.current != null) {
          const t = targetRef.current, cur = posRef.current;
          const next = cur + (t - cur) * (reduce ? 1 : 0.18);
          if (Math.abs(t - cur) < 0.001) { targetRef.current = null; setPos(t); }
          else setPos(next);
        } else if (Math.abs(velRef.current) > 0.0005) {
          const next = posRef.current + velRef.current;
          velRef.current *= reduce ? 0 : 0.9;
          if (Math.abs(velRef.current) <= 0.02) { velRef.current = 0; targetRef.current = Math.round(next); }
          setPos(next);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const go = useCallback((delta: number) => { targetRef.current = Math.round(posRef.current) + delta; velRef.current = 0; }, []);
  const goTo = useCallback((idx: number) => {
    const n = nRef.current;
    const cur = Math.round(posRef.current); const mod = ((idx - cur) % n + n) % n;
    targetRef.current = cur + (mod > n / 2 ? mod - n : mod); velRef.current = 0;
  }, []);

  // activate the centred item: open the Circle, or launch the game
  const activate = useCallback((idx: number) => {
    if (!circleId) { openCircle(ARCADE_CIRCLES[idx].id); return; }
    navigate(gamesInCircle(circleId)[idx].route);
  }, [circleId, navigate, openCircle]);

  // Surprise = jump straight into a random live game (from anywhere)
  const surprise = useCallback(() => { navigate(LIVE[Math.floor(Math.random() * LIVE.length)].route); }, [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Enter") activate((((Math.round(posRef.current)) % nRef.current) + nRef.current) % nRef.current);
      else if (e.key === "Escape" && circleId) backToCircles();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, activate, backToCircles, circleId]);

  // horizontal flick to spin
  const onDown = (e: React.PointerEvent) => { dragRef.current = { x: e.clientX, active: true, moved: false }; targetRef.current = null; velRef.current = 0; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d.active) return;
    const dx = e.clientX - d.x; d.x = e.clientX; if (Math.abs(dx) > 2) d.moved = true;
    const dp = -dx * 0.011; // drag right → wheel spins toward earlier items
    velRef.current = dp; setPos((p) => p + dp);
  };
  const onUp = (e: React.PointerEvent) => { const d = dragRef.current; d.active = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ } if (!d.moved) return; if (Math.abs(velRef.current) < 0.02) targetRef.current = Math.round(posRef.current); };

  // geometry
  const R = 168; // wheel radius (px)
  const chip = (i: number) => {
    let delta = (i - pos) % N; if (delta > N / 2) delta -= N; if (delta < -N / 2) delta += N;
    const ang = -Math.PI / 2 + delta * STEP;
    const near = Math.abs(delta);
    const scale = Math.max(0.4, 1.15 - near * 0.16);
    const opacity = Math.max(0.16, 1 - near * 0.14);
    const x = Math.cos(ang) * R, y = Math.sin(ang) * R;
    return { x, y, scale, opacity, isSel: i === selected, z: Math.round(100 - near * 5) };
  };

  const selGame = circleId ? games[selected] : null;

  return (
    <div className="fixed inset-0 z-50 w-full overflow-auto" style={{ background: "radial-gradient(120% 80% at 50% -5%, #140c2e 0%, #08061a 45%, #030208 100%)", color: "#e6e9ff" }}>
      <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col px-5 pb-6 pt-[calc(18px+env(safe-area-inset-top))]">
        {/* top row: home + (in a Circle) breadcrumb back */}
        <div className="mb-2 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-home"><ArrowLeft className="h-4 w-4" /> Home</Link>
          {circle && (
            <button onClick={backToCircles} data-testid="button-back-circles" className="ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold" style={{ borderColor: circle.accent + "55", color: circle.accent }}>
              <CornerUpLeft className="h-3.5 w-3.5" /> Circles
            </button>
          )}
        </div>

        {/* title */}
        <div className="text-center">
          {circle ? (
            <>
              <div className="mb-1 text-[11px] uppercase tracking-[0.4em]" style={{ color: circle.accent + "99" }}>Game Circle</div>
              <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "system-ui", color: "#fff", filter: `drop-shadow(0 0 20px ${circle.accent}66)` }}>{circle.name}</h1>
              <div className="mt-1 text-xs" style={{ color: circle.accent + "aa" }}>{games.length} games · {circle.tagline}</div>
            </>
          ) : (
            <>
              <div className="mb-1 text-[11px] uppercase tracking-[0.4em] text-violet-300/50">Insert coin · one thumb</div>
              <h1 className="text-5xl font-black tracking-tight" style={{ fontFamily: "system-ui", background: "linear-gradient(92deg,#67e8f9,#a78bfa 45%,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 0 22px rgba(167,139,250,.45))" }}>
                CIRQLCADE
              </h1>
              <div className="mt-1 text-xs text-violet-300/45">{LIVE.length} games in {ARCADE_CIRCLES.length} circles · pick one</div>
            </>
          )}
        </div>

        {/* the wheel */}
        <div className="relative flex flex-1 items-center justify-center" style={{ minHeight: 420 }}>
          {/* selection marker */}
          <div className="pointer-events-none absolute left-1/2 z-[200] -translate-x-1/2" style={{ top: `calc(50% - ${R + 44}px)` }}>
            <div style={{ width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `12px solid ${accent}`, filter: `drop-shadow(0 0 8px ${accent})` }} />
          </div>

          {/* spinnable ring surface */}
          <div
            className="absolute inset-0 touch-none"
            style={{ cursor: "grab" }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            data-testid="wheel-surface"
          >
            {/* faint guide ring */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: R * 2 + 8, height: R * 2 + 8, border: "1px dashed rgba(150,130,255,.14)" }} />
            {items.map((it, i) => {
              const cc = chip(i);
              return (
                <button
                  key={it.id}
                  onClick={(e) => { if (dragRef.current.moved) { e.preventDefault(); return; } if (i === selected) activate(i); else goTo(i); }}
                  data-testid={`chip-${it.id}`}
                  className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full"
                  style={{
                    transform: `translate(calc(-50% + ${cc.x}px), calc(-50% + ${cc.y}px)) scale(${cc.scale})`,
                    width: 62, height: 62, zIndex: cc.z, opacity: cc.opacity,
                    background: `radial-gradient(circle at 40% 34%, ${it.accent}33, rgba(10,8,26,.9))`,
                    border: `1.5px solid ${cc.isSel ? it.accent : it.accent + "55"}`,
                    boxShadow: cc.isSel ? `0 0 26px ${it.accent}aa, inset 0 0 16px ${it.accent}44` : `0 4px 14px rgba(0,0,0,.4)`,
                    transition: dragRef.current.active ? "none" : "box-shadow .2s, border-color .2s",
                    fontSize: 24,
                  }}
                >
                  <span style={{ filter: `drop-shadow(0 0 6px ${it.accent})` }}>{it.glyph}</span>
                </button>
              );
            })}
          </div>

          {/* centre card */}
          <div className="pointer-events-none z-[150] flex w-[214px] flex-col items-center text-center">
            {circle && selGame ? (
              <>
                <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: selGame.accent }}>{selGame.genre}</div>
                <div className="mb-1 text-2xl font-extrabold leading-tight text-white" style={{ textWrap: "balance" }}>{selGame.name}</div>
                <p className="mb-3 text-[12px] leading-snug text-violet-100/60" style={{ minHeight: 46 }}>{selGame.tagline}</p>
                <Link href={selGame.route} className="pointer-events-auto" data-testid="button-play">
                  <span className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-extrabold tracking-wide active:scale-95" style={{ color: "#0a0714", background: `linear-gradient(90deg, ${selGame.accent}, #a78bfa)`, boxShadow: `0 8px 26px ${selGame.accent}70` }}>
                    <Play className="h-4 w-4" fill="currentColor" /> PLAY
                  </span>
                </Link>
              </>
            ) : (
              <>
                <div className="mb-1 text-3xl" style={{ filter: `drop-shadow(0 0 12px ${accent})`, color: accent }}>{selItem?.glyph}</div>
                <div className="mb-1 text-2xl font-extrabold leading-tight text-white">{ARCADE_CIRCLES[selected]?.name}</div>
                <p className="mb-3 text-[12px] leading-snug text-violet-100/60" style={{ minHeight: 46 }}>{ARCADE_CIRCLES[selected]?.tagline}<br /><span className="text-violet-300/50">{gamesInCircle(ARCADE_CIRCLES[selected]?.id).length} games</span></p>
                <button onClick={() => activate(selected)} className="pointer-events-auto" data-testid="button-open-circle">
                  <span className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-extrabold tracking-wide active:scale-95" style={{ color: "#0a0714", background: `linear-gradient(90deg, ${accent}, #a78bfa)`, boxShadow: `0 8px 26px ${accent}70` }}>
                    Open
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* controls */}
        <div className="mt-2 flex items-center justify-center gap-5">
          <button onClick={() => go(-1)} data-testid="wheel-prev" className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/25 text-violet-200 active:scale-90"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={surprise} data-testid="button-surprise" className="flex items-center gap-2 rounded-full border border-violet-400/25 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-violet-100/80 active:scale-95"><Dices className="h-4 w-4" /> Surprise me</button>
          <button onClick={() => go(1)} data-testid="wheel-next" className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/25 text-violet-200 active:scale-90"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="mt-3 text-center text-[11px] tabular-nums text-violet-300/40">{selected + 1} / {N}{circle ? ` · ${circle.name}` : ""}</div>
      </div>
    </div>
  );
}
