import { useRef } from "react";
import type { Btn } from "@/game/retro-engine";

// A reusable on-screen analog joystick for the arcade cabinets. Drag the knob; it maps to
// the engine's 4 directional buttons (8-way via diagonals) through press()/release(), so
// any RetroEngine game that reads up/down/left/right works with it as a drop-in for a d-pad.
const DIRS: Btn[] = ["up", "down", "left", "right"];
const DEAD = 0.34;

export function Joystick({ press, release, color = "#b79bff", size = 132, floatOrigin = false }: { press: (b: Btn) => void; release: (b: Btn) => void; color?: string; size?: number; floatOrigin?: boolean }) {
  const active = useRef<Set<Btn>>(new Set());
  const dragging = useRef(false);
  // where "center" is for this drag. With floatOrigin, it's wherever you first pressed
  // (so a stick jammed near a screen edge still has full range — e.g. landscape "down");
  // otherwise it's the knob's fixed geometric centre.
  const origin = useRef<{ x: number; y: number } | null>(null);
  const knob = useRef<HTMLDivElement>(null);
  const R = size / 2;

  const setDirs = (dirs: Set<Btn>) => {
    for (const d of DIRS) { if (dirs.has(d) && !active.current.has(d)) press(d); else if (!dirs.has(d) && active.current.has(d)) release(d); }
    active.current = dirs;
  };
  const reset = () => { dragging.current = false; origin.current = null; setDirs(new Set()); if (knob.current) knob.current.style.transform = "translate(0px,0px)"; };
  const move = (cx: number, cy: number) => {
    const el = knob.current?.parentElement; if (!el) return;
    const r = el.getBoundingClientRect();
    const base = origin.current ?? { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const dx = cx - base.x, dy = cy - base.y;
    const len = Math.hypot(dx, dy) || 1, cl = Math.min(len, R);
    if (knob.current) knob.current.style.transform = `translate(${(dx / len) * cl}px,${(dy / len) * cl}px)`;
    const nx = dx / R, ny = dy / R;
    const dirs = new Set<Btn>();
    if (ny < -DEAD) dirs.add("up"); else if (ny > DEAD) dirs.add("down");
    if (nx < -DEAD) dirs.add("left"); else if (nx > DEAD) dirs.add("right");
    setDirs(dirs);
  };

  return (
    <div
      onPointerDown={(e) => { e.preventDefault(); dragging.current = true; origin.current = floatOrigin ? { x: e.clientX, y: e.clientY } : null; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ } move(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (dragging.current) move(e.clientX, e.clientY); }}
      onPointerUp={reset} onPointerCancel={reset}
      data-testid="joystick"
      className="relative flex-none rounded-full arcade-nograb"
      style={{ width: size, height: size, touchAction: "none", border: `1.5px solid ${color}66`, background: `radial-gradient(circle at 50% 50%, ${color}20, rgba(255,255,255,.02))`, boxShadow: `0 0 24px -8px ${color}` }}
    >
      {/* faint cardinal ticks */}
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, transparent 62%, ${color}14 63%, transparent 66%)` }} />
      <div ref={knob} className="pointer-events-none absolute rounded-full"
        style={{ left: "50%", top: "50%", width: size * 0.44, height: size * 0.44, marginLeft: -(size * 0.22), marginTop: -(size * 0.22), background: `radial-gradient(circle at 40% 34%, #fff8, ${color})`, boxShadow: `0 0 16px ${color}aa, 0 2px 6px rgba(0,0,0,.4)`, transition: "transform .03s linear" }} />
    </div>
  );
}
