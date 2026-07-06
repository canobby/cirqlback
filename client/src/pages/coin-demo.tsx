import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { InsertCoinCutscene } from "@/components/insert-coin";

// A tiny harness for the Insert-Coin cutscene: pick a sample cabinet, play the
// sequence, land on a "READY" card. Proves the reusable overlay the lobby will use.
const SAMPLES = [
  { title: "Cuppa Rush", accent: "#ffb020" },
  { title: "Slice Route", accent: "#ff5d7d" },
  { title: "Sundae Stack", accent: "#3bb6ff" },
];

export default function CoinDemo() {
  const [playing, setPlaying] = useState<null | { title: string; accent: string }>(null);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: "radial-gradient(120% 90% at 50% -10%, #1c1348 0%, #0d0a20 45%, #0a0714 100%)", color: "#fff4ea" }}>
      <div className="absolute left-4 top-4">
        <Link href="/" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </div>

      <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/60">Insert-Coin cutscene</div>
      <h1 className="text-2xl font-extrabold" style={{ textShadow: "0 0 16px rgba(255,210,74,.5)" }}>Pick a cabinet</h1>
      <p className="max-w-[40ch] text-sm text-violet-100/60">Choosing a game plays the coin-drop → boot → marquee sequence with your avatar. Tap during it to skip.</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {SAMPLES.map((s) => (
          <button key={s.title} onClick={() => setPlaying(s)} data-testid={`play-${s.title.split(" ")[0].toLowerCase()}`}
            className="rounded-full px-6 py-3 text-[14px] font-extrabold active:scale-95"
            style={{ color: "#0a0714", background: `linear-gradient(90deg, ${s.accent}, #b79bff)`, boxShadow: `0 8px 26px ${s.accent}66` }}>
            ◗ Insert coin — {s.title}
          </button>
        ))}
      </div>

      <Link href="/avatar" className="text-[12px] text-violet-300/60 underline-offset-2 hover:underline">Customize your avatar →</Link>

      {playing && (
        <InsertCoinCutscene title={playing.title} accent={playing.accent} onDone={() => setPlaying(null)} />
      )}
    </div>
  );
}
