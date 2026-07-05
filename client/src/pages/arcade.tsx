import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { ARCADE_GAMES } from "@/game/registry";

// CirqlArcade — the game picker. A grid of tiles, each a circular retro game that
// shares the arcade's look, reward bridge, and Daily boards. Lazy-loaded at
// /arcade. "Soon" tiles preview what's coming without a dead route.

export default function Arcade() {
  return (
    <div className="min-h-screen w-full px-5 py-8" style={{ background: "radial-gradient(120% 80% at 50% 0%, #100c2a 0%, #05040f 55%, #030208 100%)", color: "#e6e9ff" }}>
      <div className="mx-auto w-full max-w-[720px]">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-home">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>

        <div className="mb-1 text-[11px] uppercase tracking-[0.34em] text-violet-300/50">One thumb · quick sessions · earn as you play</div>
        <h1 className="mb-2 text-4xl font-extrabold" style={{ textWrap: "balance", background: "linear-gradient(90deg,#67e8f9,#a78bfa,#ec4899)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          CirqlArcade
        </h1>
        <p className="mb-7 max-w-[52ch] text-sm leading-relaxed text-violet-100/60">
          A little arcade of circular retro games. Tap real shops around town to earn power-ups, climb the Daily boards, and collect badges on your profile.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ARCADE_GAMES.map((g) => {
            const live = g.status === "live";
            const Tile = (
              <div
                className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-5 transition"
                style={{ borderColor: live ? g.accent + "44" : "rgba(150,130,255,.14)", background: "rgba(255,255,255,.02)", boxShadow: live ? `0 10px 40px ${g.accent}18` : "none", opacity: live ? 1 : 0.62 }}
                data-testid={`tile-${g.id}`}
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl transition group-hover:scale-125" style={{ background: g.accent, opacity: live ? 0.16 : 0.06 }} />
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-xl" style={{ background: g.accent + "1f", border: `1px solid ${g.accent}55` }}>{g.glyph}</div>
                  <div>
                    <div className="text-lg font-extrabold leading-tight">{g.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-violet-300/50">{g.genre}</div>
                  </div>
                  {!live && <div className="ml-auto rounded-full border border-violet-400/25 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-violet-300/60">Soon</div>}
                </div>
                <p className="text-sm leading-relaxed text-violet-100/65">{g.tagline}</p>
                {live && (
                  <div className="mt-auto pt-1 text-sm font-bold" style={{ color: g.accent }}>
                    Play <span className="transition group-hover:translate-x-0.5 inline-block">→</span>
                  </div>
                )}
              </div>
            );
            return live ? (
              <Link key={g.id} href={g.route} className="block h-full" data-testid={`link-${g.id}`}>{Tile}</Link>
            ) : (
              <div key={g.id} className="h-full cursor-default">{Tile}</div>
            );
          })}
        </div>

        <div className="mt-8 text-center text-[11px] text-violet-300/40">More games in the works — Snake, Spin, and a very zen Bloom.</div>
      </div>
    </div>
  );
}
