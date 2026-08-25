// CIRQL — Daily Circle result card + share (CHR-104).
//
// Shown after completing today's shared puzzle. Spoiler-free summary (rings,
// moves, time, a star rating) + copy-to-clipboard share text — the growth loop.

import { useState } from "react";
import { X, Share2, Check, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  puzzleNumber: number;
  worldName: string;
  rings: number;
  moves: number;
  timeMs: number;
  pointsAwarded: number; // 0 if already recorded today or guest
  onClose: () => void;
}

const SHARE_URL = "https://cirqlback.onrender.com/play";

function stars(moves: number, rings: number): number {
  if (moves <= rings * 2) return 3;
  if (moves <= rings * 4) return 2;
  return 1;
}
function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function DailyResult({ open, puzzleNumber, worldName, rings, moves, timeMs, pointsAwarded, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const rating = stars(moves, rings);
  const sparkle = "✨".repeat(rating);
  const shareText = `CIRQL Daily #${puzzleNumber} — ${worldName}\n${sparkle} · ${rings} rings · ${moves} moves · ${fmtTime(timeMs)}\n${SHARE_URL}`;

  const share = async () => {
    try {
      // Prefer the native share sheet on mobile; fall back to clipboard.
      if (navigator.share) { await navigator.share({ text: shareText }); return; }
      await navigator.clipboard.writeText(shareText);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* user dismissed / unsupported — ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Daily Circle result">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-violet-400/25 p-5 text-slate-100 shadow-2xl text-center"
        style={{ background: "radial-gradient(700px 400px at 50% -10%, rgba(124,58,237,.4), transparent 60%), #0b0918" }}
      >
        <button onClick={onClose} data-testid="button-close-daily" aria-label="Close" className="absolute top-3 right-3 rounded-lg p-1 text-violet-300/70 hover:bg-white/5"><X className="h-4 w-4" /></button>

        <div className="text-[11px] font-bold tracking-[0.3em] text-violet-300 inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> DAILY CIRCLE</div>
        <h2 className="mt-1 text-xl font-extrabold" style={{ background: "linear-gradient(120deg,#c4b5fd,#ec4899 75%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          #{puzzleNumber} · {worldName}
        </h2>
        <div className="mt-2 text-2xl" data-testid="daily-stars">{sparkle}</div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Rings" value={rings} />
          <Stat label="Moves" value={moves} />
          <Stat label="Time" value={fmtTime(timeMs)} />
        </div>

        {pointsAwarded > 0 && <div className="mt-3 text-sm font-semibold text-emerald-300" data-testid="daily-points">+{pointsAwarded} ✦ points</div>}

        <button
          onClick={share}
          data-testid="button-share-daily"
          className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white inline-flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
          style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}
        >
          {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Share2 className="h-4 w-4" /> Share result</>}
        </button>
        <p className="mt-2 text-[11px] text-violet-300/50">Same puzzle for everyone today · come back tomorrow</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white/5 py-2">
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-violet-300/60">{label}</div>
    </div>
  );
}
