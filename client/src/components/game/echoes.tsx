// CIRQL — Echoes (CHR-98): a calm community feed of recent restorations by
// other players. A gentle re-skin of an activity feed — subtle community
// without disrupting the relaxed atmosphere. Optional / ambient.

import { useEffect, useState } from "react";
import { X, Radio } from "lucide-react";

interface Echo { name: string; world: string; at: number }
interface Props { open: boolean; onClose: () => void }

function ago(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Echoes({ open, onClose }: Props) {
  const [echoes, setEchoes] = useState<Echo[] | null>(null);
  useEffect(() => {
    if (!open) return;
    setEchoes(null);
    fetch("/api/game/echoes", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((e) => setEchoes(Array.isArray(e) ? e : []))
      .catch(() => setEchoes([]));
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Echoes">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-2xl border border-violet-400/25 p-5 text-slate-100 shadow-2xl"
        style={{ background: "radial-gradient(700px 400px at 50% -10%, rgba(124,58,237,.35), transparent 60%), #0b0918" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide inline-flex items-center gap-1.5"><Radio className="h-4 w-4 text-violet-300" /> Echoes</h2>
          <button onClick={onClose} data-testid="button-close-echoes" aria-label="Close" className="rounded-lg p-1 text-violet-300/70 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-[11px] text-violet-300/60">Recent light, restored by others.</p>

        <div className="mt-3 space-y-1.5" data-testid="echoes-list">
          {echoes === null ? (
            <p className="text-xs text-violet-300/50">Listening…</p>
          ) : echoes.length === 0 ? (
            <p className="text-xs text-violet-300/50">No echoes yet — be the first to restore a world.</p>
          ) : (
            echoes.map((e, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "#c4b5fd", boxShadow: "0 0 6px #c4b5fd" }} />
                <div className="min-w-0 flex-1 text-xs">
                  <span className="font-semibold text-violet-100">{e.name}</span>
                  <span className="text-violet-300/70"> restored </span>
                  <span className="text-violet-200/90 truncate">{e.world}</span>
                </div>
                <span className="text-[10px] text-violet-300/40 shrink-0 tabular-nums">{ago(e.at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
