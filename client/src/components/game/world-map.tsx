// CIRQL — world map / journey screen (CHR-91).
//
// Worlds are infinite + seeded per player (CHR-101), so this isn't a fixed
// board — it's a journey view: the crafted "signature" worlds, then a window of
// the procedural tail around where the player is. Each world shows its theme and
// visited / current / upcoming status, and you can jump straight into any of
// them. Nothing is artificially locked (the endless model is open), so we show
// honest status rather than fake gates.

import { X, Map as MapIcon, Check, Play } from "lucide-react";
import { CRAFTED_WORLDS, type WorldConfig } from "@/game/worlds";

interface Props {
  open: boolean;
  onClose: () => void;
  current: number; // current absolute world index
  restored: number; // worlds restored (headline progress)
  resolve: (i: number) => WorldConfig; // absolute index -> world config (seeded)
  onGo: (i: number) => void; // jump into a world
}

const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);

export function WorldMap({ open, onClose, current, restored, resolve, onGo }: Props) {
  if (!open) return null;
  const crafted = CRAFTED_WORLDS.length;
  const tailStart = Math.max(crafted, current - 3);
  const tailEnd = current + 5; // a few upcoming worlds to peek at
  const sig = range(0, crafted);
  const tail = range(tailStart, tailEnd);
  const gap = tailStart > crafted;

  const go = (i: number) => { onGo(i); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="World map">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl border border-violet-400/25 p-5 text-slate-100 shadow-2xl"
        style={{ background: "radial-gradient(700px 400px at 50% -10%, rgba(124,58,237,.35), transparent 60%), #0b0918" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide inline-flex items-center gap-1.5"><MapIcon className="h-4 w-4 text-violet-300" /> World Map</h2>
          <button onClick={onClose} data-testid="button-close-map" aria-label="Close" className="rounded-lg p-1 text-violet-300/70 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-1 text-[11px] text-violet-300/70 tabular-nums">
          <span className="text-emerald-300/90 font-semibold">{restored}</span> restored · currently in <span className="text-violet-200">World {current + 1}</span>
        </div>

        <div className="mt-3 text-[11px] font-semibold text-violet-300/60">Signature worlds</div>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {sig.map((i) => <WorldRow key={i} i={i} w={resolve(i)} current={current} onGo={go} />)}
        </div>

        <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-violet-300/60">
          Endless journey <span className="text-violet-300/40">· seeded for you</span>
        </div>
        {gap && <div className="mt-1 text-center text-violet-300/30 text-xs tracking-widest">···</div>}
        <div className="mt-2 grid grid-cols-1 gap-2">
          {tail.map((i) => <WorldRow key={i} i={i} w={resolve(i)} current={current} onGo={go} />)}
        </div>
      </div>
    </div>
  );
}

function WorldRow({ i, w, current, onGo }: { i: number; w: WorldConfig; current: number; onGo: (i: number) => void }) {
  const status = i < current ? "visited" : i === current ? "current" : "upcoming";
  const isCurrent = status === "current";
  return (
    <button
      onClick={() => onGo(i)}
      data-testid={`map-world-${i}`}
      className="w-full text-left rounded-xl border p-2.5 flex items-center gap-3 transition hover:brightness-110"
      style={{ borderColor: isCurrent ? w.accent : "rgba(150,130,255,.18)", background: isCurrent ? `${w.accent}1f` : "rgba(255,255,255,.03)" }}
    >
      <span
        className="h-8 w-8 rounded-full shrink-0 grid place-items-center text-[10px] font-bold tabular-nums text-white/90"
        style={{ background: `radial-gradient(circle at 40% 35%, ${w.accent}, ${w.accent}55)`, boxShadow: `0 0 10px ${w.accent}66` }}
      >
        {i + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold truncate">{w.name}</div>
        <div className="text-[10px] text-violet-300/50">{w.ringCount} rings</div>
      </div>
      {status === "visited" && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80"><Check className="h-3.5 w-3.5" /> Visited</span>}
      {status === "current" && <span className="text-[10px] font-semibold" style={{ color: w.accent }}>Current</span>}
      {status === "upcoming" && <span className="inline-flex items-center gap-1 text-[10px] text-violet-300/60"><Play className="h-3 w-3" /> Play</span>}
    </button>
  );
}
