import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Trophy, Star, Heart, User, Play } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { loadAvatarLS, drawAvatarToCanvas } from "@/game/avatar";
import { MAIN_STREET_CABINETS, FLAGSHIP_CABINET, paintCover, COVER_W, COVER_H, type Cabinet } from "@/game/cabinet-covers";
import { CATEGORIES, metaFor } from "@/game/cabinet-meta";
import { InsertCoinCutscene } from "@/components/insert-coin";
import { takePending, syncRewardsFromServer, type Achievement } from "@/game/rewards";
import { getFavorites, toggleFavorite, syncFavoritesFromServer } from "@/game/favorites";

// The CIRQLBACK · MAIN STREET ARCADE lobby — pixel/CRT front door. Genre category rail,
// equal-size cover cards, and a per-game info panel (how-to-play + rewards) with CIRQL
// CITY featured. Tap a card to select it, tap again (or the panel's PLAY) to launch.
const S = 2;
const stars = (d: number) => "★★★☆☆☆".slice(3 - d, 6 - d);

interface Game { cab: Cabinet; cat: string; howto: string; flagship: boolean }
const GAMES: Game[] = [FLAGSHIP_CABINET, ...MAIN_STREET_CABINETS].map((c) => ({ cab: c, cat: metaFor(c.id).cat, howto: metaFor(c.id).howto, flagship: c.id === "cirqlcity" }));

export default function Lobby() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [cat, setCat] = useState<string>("all");
  const [selId, setSelId] = useState<string>("cirqlcity");
  const [launch, setLaunch] = useState<Cabinet | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const avatarCanvas = useRef<HTMLCanvasElement>(null);
  const coverRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [rewardQ, setRewardQ] = useState<Achievement[]>([]);
  const [favs, setFavs] = useState<string[]>(() => getFavorites());

  // Returning from a CIRQL City shop mini-game? The cabinet's back button lands here
  // (every cabinet points at the lobby); honor the breadcrumb and bounce to the town.
  useEffect(() => {
    try { const ts = Number(sessionStorage.getItem("cc_return") || 0); if (ts && Date.now() - ts < 3_600_000) { sessionStorage.removeItem("cc_return"); setLocation("/play/cirql-city"); } } catch { /* ignore */ }
  }, [setLocation]);

  useEffect(() => {
    syncRewardsFromServer().then(() => { const p = takePending(); if (p.length) setRewardQ(p); });
    syncFavoritesFromServer().then(setFavs);
  }, []);
  const onToggleFav = (id: string) => setFavs(toggleFavorite(id));
  useEffect(() => { if (!rewardQ.length) return; const t = window.setTimeout(() => setRewardQ((q) => q.slice(1)), 3200); return () => window.clearTimeout(t); }, [rewardQ]);

  const pts = (user as any)?.totalPoints ?? (user as any)?.points ?? 0;
  const level = Math.floor(pts / 500) + 1;

  useEffect(() => { const c = avatarCanvas.current; if (!c) return; const ctx = c.getContext("2d"); if (ctx) drawAvatarToCanvas(ctx, loadAvatarLS(), 3, 10, 20); }, []);

  const shown = cat === "favorites" ? GAMES.filter((g) => favs.includes(g.cab.id)) : cat === "all" ? GAMES : GAMES.filter((g) => g.cat === cat);
  // paint the visible cards' covers
  useEffect(() => { shown.forEach((g) => { const el = coverRefs.current[g.cab.id]; if (el) { const ctx = el.getContext("2d"); if (ctx) paintCover(ctx, g.cab); } }); /* eslint-disable-next-line */ }, [cat, favs]);

  const sel = GAMES.find((g) => g.cab.id === selId) || GAMES[0];
  const rail = [{ id: "favorites", name: "Favorites", accent: "#ff8ab5", count: favs.length }, ...CATEGORIES.map((c) => ({ id: c.id, name: c.name, accent: c.accent, count: c.id === "all" ? GAMES.length : GAMES.filter((g) => g.cat === c.id).length }))];

  const doLaunch = (g: Game) => { if (g.flagship) setLocation(g.cab.route); else setLaunch(g.cab); };
  const onCard = (g: Game) => { if (selId === g.cab.id) doLaunch(g); else { setSelId(g.cab.id); if (window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const onCutsceneDone = () => { const cab = launch; setLaunch(null); if (cab?.built) setLocation(cab.route); else { setToast(`${cab?.name} is in the workshop — coming soon!`); window.setTimeout(() => setToast(null), 2600); } };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "radial-gradient(120% 90% at 50% -10%, #1c1348 0%, #0d0a20 45%, #0a0714 100%)", color: "#fff4ea" }}>
      <div className="pointer-events-none fixed inset-0 z-[70]" style={{ background: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.14) 2px 3px)", mixBlendMode: "multiply", opacity: 0.5 }} />

      <div className="relative mx-auto max-w-[1180px] px-4 pb-24 pt-4">
        {/* top row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/avatar" data-testid="link-player" className="flex items-center gap-2.5 rounded-xl border px-3 py-2" style={{ borderColor: "#3a2a72", background: "linear-gradient(180deg, rgba(59,42,114,.35), rgba(20,13,40,.4))" }}>
            <canvas ref={avatarCanvas} width={60} height={68} style={{ imageRendering: "pixelated", width: 46, borderRadius: 8, background: "#0c0820", border: "1px solid #3a2a72" }} />
            <div className="pr-1">
              <div className="text-[13px] font-extrabold text-white">{(user as any)?.username || (user as any)?.name || "Player"}</div>
              <div className="text-[10px] tracking-[0.08em] text-cyan-300">LEVEL {level} · CIRQLER</div>
              <div className="mt-0.5 text-[12px] font-bold tabular-nums text-amber-300">★ {pts.toLocaleString()}</div>
            </div>
          </Link>
          <div className="flex-1 text-center" style={{ minWidth: 200 }}>
            <div className="inline-block">
              <div className="font-extrabold uppercase leading-[0.9] text-white" style={{ fontSize: "clamp(24px,5vw,44px)", letterSpacing: "0.04em", whiteSpace: "nowrap", textShadow: "0 0 4px #fff, 0 0 14px #3bb6ff, 0 0 30px #3bb6ff, 0 3px 0 #0a3a63" }}>CIRQLBACK</div>
              <div className="font-extrabold uppercase text-white" style={{ fontSize: "clamp(12px,2.3vw,20px)", letterSpacing: "0.04em", marginTop: 2, textShadow: "0 0 4px #fff, 0 0 12px #ff5d7d, 0 0 24px #ff5d7d, 0 2px 0 #7a1030" }}>MAIN STREET ARCADE</div>
            </div>
          </div>
          <div className="hidden rounded-xl border px-3.5 py-2.5 text-[11px] font-extrabold leading-[1.7] sm:block" style={{ borderColor: "#3a2a72", background: "linear-gradient(180deg, rgba(59,42,114,.28), rgba(20,13,40,.4))" }}>
            <div style={{ color: "#3bb6ff" }}>PLAY MORE.</div><div style={{ color: "#ff8ab5" }}>DISCOVER MORE.</div><div style={{ color: "#ffd24a" }}>EARN MORE.</div>
          </div>
        </div>

        {/* body: rail · grid · info panel (flex; info sits above grid on mobile, right on desktop) */}
        <div className="mt-4 flex flex-col gap-4 lg:flex-row">
          {/* rail */}
          <div className="lg:order-1 lg:w-[168px] lg:flex-none">
            <div className="mb-2 hidden text-center text-[11px] uppercase tracking-[0.24em] text-cyan-300/70 lg:block">◄ Categories ►</div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col" style={{ scrollbarWidth: "none" }}>
              {rail.map((r) => {
                const on = cat === r.id;
                return (
                  <button key={r.id} onClick={() => setCat(r.id)} data-testid={`cat-${r.id}`}
                    className="flex flex-none items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-[12px] font-extrabold active:scale-95"
                    style={{ borderColor: on ? r.accent : "#2e2158", color: on ? "#fff" : "#c3b4de", background: on ? `linear-gradient(180deg, ${r.accent}22, rgba(20,13,40,.3))` : "rgba(255,255,255,.015)", boxShadow: on ? `0 0 16px -4px ${r.accent}` : "none" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: r.accent, display: "inline-block", boxShadow: `0 0 6px ${r.accent}` }} />
                    {r.name}<span className="ml-auto text-[10px] tabular-nums text-violet-300/50">{r.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* info panel */}
          <div className="lg:order-3 lg:w-[268px] lg:flex-none">
            <div className="rounded-2xl border p-3.5" data-testid="info-panel" style={{ borderColor: sel.flagship ? "#ffd24a" : sel.cab.accent, background: "linear-gradient(180deg, rgba(24,15,52,.9), rgba(13,10,32,.9))", boxShadow: sel.flagship ? "0 0 26px -8px #ffd24a" : `0 0 22px -10px ${sel.cab.accent}` }}>
              <div className="mb-1.5 flex items-center gap-2">
                {sel.flagship
                  ? <span className="rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#0a0714]" style={{ background: "#ffd24a", boxShadow: "0 0 12px rgba(255,210,74,.6)" }}>★ Flagship</span>
                  : <span className="rounded px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em]" style={{ background: sel.cab.accent + "22", color: sel.cab.accent, border: `1px solid ${sel.cab.accent}66` }}>{CATEGORIES.find((c) => c.id === sel.cat)?.name}</span>}
                <span className="text-[9px] uppercase tracking-[0.14em] text-violet-200/50">{sel.cab.homage}</span>
              </div>
              <div className="text-[20px] font-extrabold uppercase leading-none text-white" style={{ textShadow: `0 0 8px ${sel.flagship ? "#ffd24a" : sel.cab.accent}` }}>{sel.cab.name}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-violet-200/60">{sel.cab.shop}</span>
                {!sel.flagship && <span className="text-[11px] tracking-[1px] text-amber-300">{stars(sel.cab.difficulty)}</span>}
              </div>
              <div className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.16em] text-cyan-300/70">How to play</div>
              <div className="mt-1 text-[11.5px] leading-snug text-violet-100/75">{sel.howto}</div>
              <div className="mt-3 text-[9px] font-extrabold uppercase tracking-[0.16em]" style={{ color: sel.flagship ? "#ffd24a" : "#33e650" }}>Rewards</div>
              <div className="mt-1 text-[11px] leading-snug text-violet-100/70">{sel.flagship
                ? "The main event — most achievements & platform rewards land here as power-ups, unlocks and deeper progression, and your run saves."
                : "Earn ★ points every play and top the Daily board for a bonus. Perks & unlocks funnel into Cirql City; here you might snag a free life."}</div>
              <button onClick={() => doLaunch(sel)} data-testid="info-play" className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[14px] font-extrabold uppercase tracking-wide active:scale-95" style={{ color: "#0a0714", background: sel.flagship ? "linear-gradient(180deg,#ffe27a,#ffb020)" : `linear-gradient(180deg, ${sel.cab.accent}, ${sel.cab.accent}bb)`, boxShadow: `0 8px 24px -6px ${sel.flagship ? "#ffb020" : sel.cab.accent}` }}>
                <Play className="h-4 w-4" fill="#0a0714" /> Play
              </button>
            </div>
          </div>

          {/* grid */}
          <div className="lg:order-2 lg:flex-1">
            <div className="mb-3 flex items-center gap-3 text-[14px] font-extrabold uppercase tracking-[0.05em]" style={{ color: "#ffb020", textShadow: "0 0 10px rgba(255,176,32,.4)" }}>
              ▸ {cat === "favorites" ? "★ Favorites" : CATEGORIES.find((c) => c.id === cat)?.name}
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,176,32,.5), transparent)" }} />
            </div>
            {shown.length === 0 ? (
              <div className="rounded-xl border py-10 text-center" style={{ borderColor: "#2e2158", background: "rgba(255,255,255,.02)" }} data-testid="empty">
                <div className="text-[13px] font-extrabold text-white">Nothing here yet</div>
                <div className="mt-1 text-[11px] text-violet-300/50">{cat === "favorites" ? "Tap the ★ on any game to pin it here." : "No games in this category yet."}</div>
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))" }}>
                {shown.map((g, i) => {
                  const cab = g.cab, selectd = selId === cab.id;
                  return (
                    <div key={cab.id} onClick={() => onCard(g)} role="button" tabIndex={0} data-testid={g.flagship ? "flagship-card" : `cabinet-${cab.id}`}
                      className="cursor-pointer overflow-hidden rounded-xl border text-left active:scale-[0.98]"
                      style={{ borderColor: selectd ? "#fff" : g.flagship ? "#ffd24a" : cab.accent, background: "linear-gradient(180deg,#180f34,#130d28)", boxShadow: selectd ? `0 0 0 2px ${g.flagship ? "#ffd24a" : cab.accent}, 0 8px 24px rgba(0,0,0,.5)` : `0 8px 24px rgba(0,0,0,.5), 0 0 18px -6px ${g.flagship ? "#ffd24a" : cab.accent}` }}>
                      <div className="relative" style={{ background: "#000", borderBottom: "1px solid #2e2158" }}>
                        <canvas ref={(el) => (coverRefs.current[cab.id] = el)} width={COVER_W * S} height={COVER_H * S} style={{ display: "block", width: "100%", height: "auto", imageRendering: "pixelated" }} />
                        <span className="absolute left-2 top-1.5 text-[13px] font-extrabold" style={{ color: g.flagship ? "#ffd24a" : "#fff", textShadow: `0 0 7px ${g.flagship ? "#ffd24a" : cab.accent}, 0 1px 0 #000` }}>{g.flagship ? "★" : String(i).padStart(2, "0")}</span>
                        <span className="absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[8px] font-extrabold tracking-[0.06em] text-[#0a0714]" style={{ background: g.flagship ? "#7be0ff" : "#ffd24a", boxShadow: "0 0 10px rgba(255,210,74,.5)" }}>{g.flagship ? "FLAGSHIP" : "DAILY"}</span>
                        <div className="pointer-events-none absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.16) 2px 4px), radial-gradient(130% 120% at 50% 45%, transparent 66%, rgba(0,0,0,.4) 100%)" }} />
                        {selectd && <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center py-0.5 text-[8px] font-extrabold uppercase tracking-[0.14em]" style={{ background: "rgba(10,7,20,.7)", color: g.flagship ? "#ffd24a" : cab.accent }}>Tap again to play ▸</div>}
                      </div>
                      <div className="px-2.5 py-2">
                        <div className="flex items-center justify-between gap-1">
                          <div className="min-w-0 truncate text-[13px] font-extrabold uppercase leading-none text-white" style={{ textShadow: `0 0 7px ${g.flagship ? "#ffd24a" : cab.accent}` }}>{cab.name}</div>
                          <FavStar id={cab.id} on={favs.includes(cab.id)} onToggle={onToggleFav} />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[9.5px] uppercase tracking-[0.05em] text-violet-200/60">{cab.shop}</span>
                          <span className="text-[11px] tracking-[1px] text-amber-300">{stars(cab.difficulty)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* bottom nav — evenly spaced so all five fit on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-[71] flex items-center justify-around gap-0.5 border-t px-1 py-2" style={{ borderColor: "#2e2158", background: "linear-gradient(180deg, rgba(13,10,32,.6), rgba(10,7,20,.94))", backdropFilter: "blur(4px)" }}>
        <NavItem to="/" icon={<Home className="h-4 w-4" />} label="Home" color="#3bb6ff" />
        <NavItem to="/leaderboard" icon={<Trophy className="h-4 w-4" />} label="Ranks" color="#ffd24a" />
        <NavItem to="/achievements" icon={<Star className="h-4 w-4" />} label="Badges" color="#33e650" />
        <NavItem onClick={() => { setCat("favorites"); window.scrollTo({ top: 0, behavior: "smooth" }); }} icon={<Heart className="h-4 w-4" />} label="Faves" color="#ff8ab5" />
        <NavItem to="/avatar" icon={<User className="h-4 w-4" />} label="Avatar" color="#b79bff" />
      </div>

      {toast && <div className="fixed bottom-16 left-1/2 z-[75] -translate-x-1/2 rounded-full border px-5 py-2.5 text-[13px] font-bold" style={{ borderColor: "#ffb020", background: "rgba(20,13,40,.96)", color: "#ffd24a", boxShadow: "0 8px 30px rgba(0,0,0,.5)" }} data-testid="lobby-toast">🔧 {toast}</div>}

      {rewardQ[0] && (
        <Link href="/achievements" data-testid="reward-toast" className="fixed left-1/2 top-16 z-[76] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border px-4 py-2.5" style={{ borderColor: "#ffd24a", background: "rgba(20,13,40,.97)", boxShadow: "0 12px 40px rgba(0,0,0,.6), 0 0 30px -6px #ffd24a" }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-extrabold" style={{ background: "linear-gradient(180deg,#ffd24a,#ff9e2c)", color: "#0a0714" }}>{rewardQ[0].icon}</div>
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-amber-300">🏆 Achievement</div>
              <div className="text-[14px] font-extrabold leading-tight text-white">{rewardQ[0].name}</div>
              {rewardQ[0].unlocks?.length ? <div className="text-[10px] text-cyan-300/80">New cosmetic unlocked!</div> : <div className="text-[10px] text-violet-200/50">{rewardQ[0].desc}</div>}
            </div>
          </div>
        </Link>
      )}

      {launch && <InsertCoinCutscene title={launch.name} accent={launch.accent} onDone={onCutsceneDone} />}
    </div>
  );
}

function NavItem({ to, icon, label, color, onClick }: { to?: string; icon: React.ReactNode; label: string; color: string; onClick?: () => void }) {
  const inner = (
    <div className="flex flex-col items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-[0.04em]" style={{ color }}>
      <span style={{ filter: `drop-shadow(0 0 6px ${color})` }}>{icon}</span>{label}
    </div>
  );
  if (to) return <Link href={to} data-testid={`nav-${label.toLowerCase()}`} className="flex flex-1 justify-center">{inner}</Link>;
  return <button onClick={onClick} data-testid={`nav-${label.toLowerCase()}`} className="flex flex-1 justify-center active:scale-90">{inner}</button>;
}

function FavStar({ id, on, onToggle }: { id: string; on: boolean; onToggle: (id: string) => void }) {
  return (
    <button data-testid={`fav-${id}`} aria-label={on ? "Remove from favorites" : "Add to favorites"} aria-pressed={on}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(id); }}
      className="flex h-6 w-6 flex-none items-center justify-center rounded-full active:scale-90"
      style={{ background: on ? "rgba(255,210,74,.16)" : "rgba(255,255,255,.05)", border: `1px solid ${on ? "#ffd24a" : "#3a2a72"}` }}>
      <Star className="h-3.5 w-3.5" style={{ color: on ? "#ffd24a" : "#8a7fb0", fill: on ? "#ffd24a" : "none" }} />
    </button>
  );
}
