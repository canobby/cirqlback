import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ChevronLeft, ChevronRight, Dices, Play } from "lucide-react";
import { ARCADE_GAMES } from "@/game/registry";

// CirqlCade — the arcade wheel. Every game is a chip on a spinning ring; flick to
// browse, the game at the top marker is selected, tap PLAY (or the chip) to launch.
// A circle of circular games — the picker itself is on-theme. Lazy-loaded at
// /arcade. Falls back to arrow keys + click-a-chip; honours reduced motion.

const TAU = Math.PI * 2;
const LIVE = ARCADE_GAMES.filter((g) => g.status === "live");
const N = LIVE.length;
const STEP = TAU / N;
const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Arcade() {
  const [, navigate] = useLocation();
  const [pos, setPos] = useState(0);          // continuous wheel position (float index at the top marker)
  const posRef = useRef(0); posRef.current = pos;
  const velRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const dragRef = useRef<{ x: number; active: boolean; moved: boolean }>({ x: 0, active: false, moved: false });
  const rafRef = useRef(0);

  const selected = ((Math.round(pos) % N) + N) % N;
  const game = LIVE[selected];

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
          let next = posRef.current + velRef.current;
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
    // shortest wrap-around path to the chosen index
    const cur = Math.round(posRef.current); let t = idx; const mod = ((idx - cur) % N + N) % N;
    t = cur + (mod > N / 2 ? mod - N : mod); targetRef.current = t; velRef.current = 0;
  }, []);
  const surprise = useCallback(() => { const idx = Math.floor(Math.random() * N); targetRef.current = Math.round(posRef.current) + N * 2 + (((idx - Math.round(posRef.current)) % N + N) % N); velRef.current = 0; }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Enter") navigate(LIVE[(((Math.round(posRef.current)) % N) + N) % N].route);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, navigate]);

  // horizontal flick to spin
  const onDown = (e: React.PointerEvent) => { dragRef.current = { x: e.clientX, active: true, moved: false }; targetRef.current = null; velRef.current = 0; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d.active) return;
    const dx = e.clientX - d.x; d.x = e.clientX; if (Math.abs(dx) > 2) d.moved = true;
    const dp = -dx * 0.011; // drag right → wheel spins toward earlier games
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

  return (
    <div className="fixed inset-0 z-50 w-full overflow-auto" style={{ background: "radial-gradient(120% 80% at 50% -5%, #140c2e 0%, #08061a 45%, #030208 100%)", color: "#e6e9ff" }}>
      <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col px-5 pb-6 pt-[calc(18px+env(safe-area-inset-top))]">
        {/* marquee */}
        <div className="mb-2 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-home"><ArrowLeft className="h-4 w-4" /> Home</Link>
        </div>
        <div className="text-center">
          <div className="mb-1 text-[11px] uppercase tracking-[0.4em] text-violet-300/50">Insert coin · one thumb</div>
          <h1 className="text-5xl font-black tracking-tight" style={{ fontFamily: "system-ui", background: "linear-gradient(92deg,#67e8f9,#a78bfa 45%,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 0 22px rgba(167,139,250,.45))" }}>
            CIRQLCADE
          </h1>
          <div className="mt-1 text-xs text-violet-300/45">{N} circular games · spin the wheel</div>
        </div>

        {/* the wheel */}
        <div className="relative flex flex-1 items-center justify-center" style={{ minHeight: 420 }}>
          {/* selection marker */}
          <div className="pointer-events-none absolute left-1/2 z-[200] -translate-x-1/2" style={{ top: `calc(50% - ${R + 44}px)` }}>
            <div style={{ width: 0, height: 0, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `12px solid ${game.accent}`, filter: `drop-shadow(0 0 8px ${game.accent})` }} />
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
            {LIVE.map((g, i) => {
              const c = chip(i);
              return (
                <button
                  key={g.id}
                  onClick={(e) => { if (dragRef.current.moved) { e.preventDefault(); return; } goTo(i); }}
                  data-testid={`chip-${g.id}`}
                  className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full"
                  style={{
                    transform: `translate(calc(-50% + ${c.x}px), calc(-50% + ${c.y}px)) scale(${c.scale})`,
                    width: 62, height: 62, zIndex: c.z, opacity: c.opacity,
                    background: `radial-gradient(circle at 40% 34%, ${g.accent}33, rgba(10,8,26,.9))`,
                    border: `1.5px solid ${c.isSel ? g.accent : g.accent + "55"}`,
                    boxShadow: c.isSel ? `0 0 26px ${g.accent}aa, inset 0 0 16px ${g.accent}44` : `0 4px 14px rgba(0,0,0,.4)`,
                    transition: dragRef.current.active ? "none" : "box-shadow .2s, border-color .2s",
                    fontSize: 24,
                  }}
                >
                  <span style={{ filter: `drop-shadow(0 0 6px ${g.accent})` }}>{g.glyph}</span>
                </button>
              );
            })}
          </div>

          {/* selected game card (centre of the wheel) */}
          <div className="pointer-events-none z-[150] flex w-[210px] flex-col items-center text-center">
            <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: game.accent }}>{game.genre}</div>
            <div className="mb-1 text-2xl font-extrabold leading-tight text-white" style={{ textWrap: "balance" }}>{game.name}</div>
            <p className="mb-3 text-[12px] leading-snug text-violet-100/60" style={{ minHeight: 46 }}>{game.tagline}</p>
            <Link href={game.route} className="pointer-events-auto" data-testid="button-play">
              <span className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-extrabold tracking-wide active:scale-95" style={{ color: "#0a0714", background: `linear-gradient(90deg, ${game.accent}, #a78bfa)`, boxShadow: `0 8px 26px ${game.accent}70` }}>
                <Play className="h-4 w-4" fill="currentColor" /> PLAY
              </span>
            </Link>
          </div>
        </div>

        {/* controls */}
        <div className="mt-2 flex items-center justify-center gap-5">
          <button onClick={() => go(-1)} data-testid="wheel-prev" className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/25 text-violet-200 active:scale-90"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={surprise} data-testid="button-surprise" className="flex items-center gap-2 rounded-full border border-violet-400/25 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-violet-100/80 active:scale-95"><Dices className="h-4 w-4" /> Surprise me</button>
          <button onClick={() => go(1)} data-testid="wheel-next" className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/25 text-violet-200 active:scale-90"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="mt-3 text-center text-[11px] tabular-nums text-violet-300/40">{selected + 1} / {N}</div>
      </div>
    </div>
  );
}
