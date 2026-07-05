import { useState } from "react";
import { Info, X } from "lucide-react";
import { helpFor } from "@/game/game-help";

// HelpButton — the shared "How to play" ⓘ button + modal for any arcade game.
// Reads content from game-help.ts by gameId. Used on the shell menu and on the
// bespoke game pages so every game explains itself.

export function HelpButton({ gameId, name, accent = "#a78bfa" }: { gameId: string; name: string; accent?: string }) {
  const [open, setOpen] = useState(false);
  const h = helpFor(gameId);
  if (!h) return null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="button-howto"
        className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12px] font-bold active:scale-95"
        style={{ borderColor: accent + "55", color: accent }}
      >
        <Info className="h-3.5 w-3.5" /> How to play
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: "rgba(4,3,12,.72)", backdropFilter: "blur(2px)" }}
          onClick={() => setOpen(false)}
          data-testid="howto-overlay"
        >
          <div
            className="w-full max-w-[360px] rounded-2xl border p-5 text-left"
            style={{ borderColor: accent + "55", background: "linear-gradient(180deg, rgba(20,14,40,.98), rgba(8,6,20,.99))", boxShadow: `0 24px 70px rgba(0,0,0,.6), 0 0 40px ${accent}22` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-extrabold text-white">{name}</div>
              <button onClick={() => setOpen(false)} data-testid="button-howto-close" className="text-violet-300/60 hover:text-violet-200"><X className="h-5 w-5" /></button>
            </div>
            <Section label="Goal" accent={accent} text={h.objective} />
            <Section label="Controls" accent={accent} text={h.controls} />
            <div className="mt-3">
              <div className="mb-1 text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>Tips</div>
              <ul className="list-disc space-y-1 pl-4 text-[13px] leading-snug text-violet-100/80">
                {h.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ label, text, accent }: { label: string; text: string; accent: string }) {
  return (
    <div className="mb-3">
      <div className="mb-0.5 text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>{label}</div>
      <div className="text-[13px] leading-snug text-violet-100/85">{text}</div>
    </div>
  );
}
