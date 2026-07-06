import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Trophy, Star, Heart, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { loadAvatarLS, drawAvatarToCanvas } from "@/game/avatar";
import { MAIN_STREET_CABINETS, paintCover, COVER_W, COVER_H, type Cabinet } from "@/game/cabinet-covers";
import { InsertCoinCutscene } from "@/components/insert-coin";
import { takePending, syncRewardsFromServer, type Achievement } from "@/game/rewards";
import { getFavorites, toggleFavorite, syncFavoritesFromServer } from "@/game/favorites";

// The CIRQLBACK · MAIN STREET ARCADE lobby — the pixel/CRT front door for the 10
// 16-bit cabinets. Player card (your avatar), a category rail, cover-art cards, and
// the Insert-Coin cutscene on cabinet launch.
const S = 2;
const stars = (d: number) => "★★★☆☆☆".slice(3 - d, 6 - d);

type CatId = "favorites" | "main";

// metadata for a favoritable cabinet
type FavGame = { id: string; name: string; sub: string; accent: string; route: string; cab: Cabinet };
const ALL_FAV: FavGame[] = MAIN_STREET_CABINETS.map((c) => ({ id: c.id, name: c.name, sub: c.shop, accent: c.accent, route: c.route, cab: c }));

export default function Lobby() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [cat, setCat] = useState<CatId>("main");
  const [launch, setLaunch] = useState<Cabinet | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const avatarCanvas = useRef<HTMLCanvasElement>(null);
  const coverRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [rewardQ, setRewardQ] = useState<Achievement[]>([]);
  const [favs, setFavs] = useState<string[]>(() => getFavorites());

  // sync rewards + surface any achievements earned since the last visit
  useEffect(() => {
    syncRewardsFromServer().then(() => { const p = takePending(); if (p.length) setRewardQ(p); });
    syncFavoritesFromServer().then(setFavs);
  }, []);

  const onToggleFav = (id: string) => setFavs(toggleFavorite(id));
  useEffect(() => {
    if (!rewardQ.length) return;
    const t = window.setTimeout(() => setRewardQ((q) => q.slice(1)), 3200);
    return () => window.clearTimeout(t);
  }, [rewardQ]);

  const pts = (user as any)?.totalPoints ?? (user as any)?.points ?? 0;
  const level = Math.floor(pts / 500) + 1;

  useEffect(() => {
    const c = avatarCanvas.current; if (!c) return; const ctx = c.getContext("2d"); if (ctx) drawAvatarToCanvas(ctx, loadAvatarLS(), 3, 10, 20);
  }, []);

  // paint cabinet covers whenever the Main Street grid is shown
  useEffect(() => {
    if (cat !== "main") return;
    MAIN_STREET_CABINETS.forEach((cab) => { const c = coverRefs.current[cab.id]; if (c) { const ctx = c.getContext("2d"); if (ctx) paintCover(ctx, cab); } });
  }, [cat]);

  const rail: { id: CatId; name: string; count: number; accent: string }[] = [
    { id: "favorites", name: "Favorites", count: favs.length, accent: "#ff8ab5" },
    { id: "main", name: "Main Street", count: MAIN_STREET_CABINETS.length, accent: "#b79bff" },
  ];
  const favGames = ALL_FAV.filter((g) => favs.includes(g.id));

  const onLaunch = (cab: Cabinet) => setLaunch(cab);
  const onCutsceneDone = () => {
    const cab = launch; setLaunch(null);
    if (cab?.built) setLocation(cab.route);
    else { setToast(`${cab?.name} is in the workshop — coming soon!`); window.setTimeout(() => setToast(null), 2600); }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "radial-gradient(120% 90% at 50% -10%, #1c1348 0%, #0d0a20 45%, #0a0714 100%)", color: "#fff4ea" }}>
      {/* global scanline wash */}
      <div className="pointer-events-none fixed inset-0 z-[70]" style={{ background: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.14) 2px 3px)", mixBlendMode: "multiply", opacity: 0.5 }} />

      <div className="relative mx-auto max-w-[1180px] px-4 pb-24 pt-4">
        {/* top row: player card · brand · tagline */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <Link href="/avatar" data-testid="link-player" className="flex items-center gap-2.5 rounded-xl border px-3 py-2" style={{ borderColor: "#3a2a72", background: "linear-gradient(180deg, rgba(59,42,114,.35), rgba(20,13,40,.4))" }}>
            <canvas ref={avatarCanvas} width={60} height={68} style={{ imageRendering: "pixelated", width: 56, borderRadius: 8, background: "#0c0820", border: "1px solid #3a2a72" }} />
            <div className="pr-1">
              <div className="text-[14px] font-extrabold text-white">{(user as any)?.username || (user as any)?.name || "Player"}</div>
              <div className="text-[11px] tracking-[0.08em] text-cyan-300">LEVEL {level} · CIRQLER</div>
              <div className="mt-0.5 text-[12px] font-bold tabular-nums text-amber-300">★ {pts.toLocaleString()}</div>
            </div>
          </Link>

          <div className="flex-1 text-center" style={{ minWidth: 240 }}>
            <div className="inline-block">
              <div className="font-extrabold uppercase leading-[0.9] text-white" style={{ fontSize: "clamp(28px,5vw,48px)", letterSpacing: "0.04em", whiteSpace: "nowrap", textShadow: "0 0 4px #fff, 0 0 14px #3bb6ff, 0 0 30px #3bb6ff, 0 3px 0 #0a3a63" }}>CIRQLBACK</div>
              <div className="font-extrabold uppercase text-white" style={{ fontSize: "clamp(13px,2.3vw,22px)", letterSpacing: "0.04em", marginTop: 2, textShadow: "0 0 4px #fff, 0 0 12px #ff5d7d, 0 0 24px #ff5d7d, 0 2px 0 #7a1030" }}>MAIN STREET ARCADE</div>
            </div>
          </div>

          <div className="rounded-xl border px-3.5 py-2.5 text-[12px] font-extrabold leading-[1.7]" style={{ borderColor: "#3a2a72", background: "linear-gradient(180deg, rgba(59,42,114,.28), rgba(20,13,40,.4))" }}>
            <div style={{ color: "#3bb6ff" }}>PLAY MORE.</div><div style={{ color: "#ff8ab5" }}>DISCOVER MORE.</div><div style={{ color: "#ffd24a" }}>EARN MORE.</div>
          </div>
        </div>

        {/* flagship spotlight — CIRQL CITY */}
        <Link href="/play/cirql-city" data-testid="spotlight-cirqlcity" className="mt-5 block active:scale-[0.99]">
          <div className="relative overflow-hidden rounded-2xl border p-4 sm:p-5" style={{ borderColor: "#ffd24a", background: "linear-gradient(110deg, #1a1038 0%, #241848 45%, #3a1f4a 100%)", boxShadow: "0 12px 40px rgba(0,0,0,.5), 0 0 30px -8px #ffd24a" }}>
            <div className="pointer-events-none absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.14) 2px 4px)" }} />
            <div className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,210,74,.28), transparent 68%)" }} />
            <div className="relative flex items-center gap-4">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#0a0714]" style={{ background: "#ffd24a", boxShadow: "0 0 12px rgba(255,210,74,.6)" }}>★ Flagship</span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-cyan-300/70">New</span>
                </div>
                <div className="text-[26px] font-extrabold uppercase leading-none text-white sm:text-[32px]" style={{ letterSpacing: "0.03em", textShadow: "0 0 4px #fff, 0 0 16px #ffd24a, 0 2px 0 #7a5410" }}>CIRQL CITY</div>
                <div className="mt-1.5 text-[12px] font-bold text-violet-100/70">Main Street has gone dark. Run, jump &amp; light every shop — then <span className="text-amber-300">close the cirql</span> and watch the whole street blaze back to life.</div>
              </div>
              <div className="flex-none rounded-full px-6 py-3 text-[14px] font-extrabold uppercase tracking-wide" style={{ color: "#0a0714", background: "linear-gradient(180deg,#ffe27a,#ffb020)", boxShadow: "0 8px 24px rgba(255,176,32,.4)" }}>Play ▸</div>
            </div>
          </div>
        </Link>

        {/* body: rail + grid */}
        <div className="mt-5 grid gap-5" style={{ gridTemplateColumns: "minmax(0,196px) 1fr" }}>
          <div>
            <div className="mb-2.5 text-center text-[12px] uppercase tracking-[0.24em] text-cyan-300/70">◄ Categories ►</div>
            <div className="flex flex-col gap-2 max-[720px]:flex-row max-[720px]:overflow-x-auto">
              {rail.map((r) => {
                const on = cat === r.id;
                return (
                  <button key={r.id} onClick={() => setCat(r.id)} data-testid={`cat-${r.id}`}
                    className="flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-[13px] font-extrabold active:scale-95"
                    style={{ borderColor: on ? "#b79bff" : "#2e2158", color: on ? "#fff" : "#c3b4de", background: on ? "linear-gradient(180deg, rgba(183,155,255,.14), rgba(20,13,40,.3))" : "rgba(255,255,255,.015)", boxShadow: on ? "0 0 18px -3px #b79bff" : "none" }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: r.accent, display: "inline-block", boxShadow: `0 0 6px ${r.accent}` }} />
                    {r.name}
                    <span className="ml-auto text-[10.5px] tabular-nums text-violet-300/50">{r.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-3 text-[15px] font-extrabold uppercase tracking-[0.05em]" style={{ color: "#ffb020", textShadow: "0 0 10px rgba(255,176,32,.4)" }}>
              ▸ {cat === "favorites" ? "★ Favorites" : "Main Street · 16-bit cabinets"}
              <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,176,32,.5), transparent)" }} />
            </div>

            {cat === "favorites" ? (
              favGames.length ? (
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))" }}>
                  {favGames.map((g) => (
                    <div key={g.id} onClick={() => onLaunch(g.cab)} role="button" tabIndex={0} data-testid={`fav-card-${g.id}`} className="cursor-pointer active:scale-[0.98]">
                      <div className="relative flex h-full items-center gap-2.5 rounded-xl border p-2.5" style={{ borderColor: g.accent + "88", background: "linear-gradient(180deg,#180f34,#130d28)", boxShadow: "0 6px 18px rgba(0,0,0,.4)" }}>
                        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-[20px]" style={{ background: `${g.accent}1f`, border: `1px solid ${g.accent}55`, filter: `drop-shadow(0 0 6px ${g.accent}88)` }}>🕹️</div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-extrabold text-white">{g.name}</div>
                          <div className="truncate text-[10px] uppercase tracking-wide text-violet-200/50">Main Street · {g.sub}</div>
                        </div>
                        <FavStar id={g.id} on={true} onToggle={onToggleFav} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border py-10 text-center" style={{ borderColor: "#2e2158", background: "rgba(255,255,255,.02)" }} data-testid="fav-empty">
                  <div className="text-[13px] font-extrabold text-white">No favorites yet</div>
                  <div className="mt-1 text-[11px] text-violet-300/50">Tap the ★ on any cabinet to pin it here for quick access.</div>
                </div>
              )
            ) : (
              <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(158px,1fr))" }}>
                {MAIN_STREET_CABINETS.map((cab, i) => (
                  <div key={cab.id} onClick={() => onLaunch(cab)} role="button" tabIndex={0} data-testid={`cabinet-${cab.id}`}
                    className="cursor-pointer overflow-hidden rounded-xl border text-left active:scale-[0.98]"
                    style={{ borderColor: cab.accent, background: "linear-gradient(180deg,#180f34,#130d28)", boxShadow: `0 8px 24px rgba(0,0,0,.5), 0 0 18px -6px ${cab.accent}` }}>
                    <div className="relative" style={{ background: "#000", borderBottom: "1px solid #2e2158" }}>
                      <canvas ref={(el) => (coverRefs.current[cab.id] = el)} width={COVER_W * S} height={COVER_H * S} style={{ display: "block", width: "100%", height: "auto", imageRendering: "pixelated" }} />
                      <span className="absolute left-2 top-1.5 text-[13px] font-extrabold text-white" style={{ textShadow: `0 0 7px ${cab.accent}, 0 1px 0 #000` }}>{String(i + 1).padStart(2, "0")}</span>
                      <span className="absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-[8px] font-extrabold tracking-[0.06em] text-[#0a0714]" style={{ background: cab.built ? "#ffd24a" : "#5f574f", boxShadow: cab.built ? "0 0 10px rgba(255,210,74,.6)" : "none" }}>{cab.built ? "DAILY" : "SOON"}</span>
                      <div className="pointer-events-none absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,.16) 2px 4px), radial-gradient(130% 120% at 50% 45%, transparent 66%, rgba(0,0,0,.4) 100%)" }} />
                    </div>
                    <div className="px-2.5 py-2">
                      <div className="flex items-center justify-between gap-1">
                        <div className="min-w-0 truncate text-[13px] font-extrabold uppercase leading-none text-white" style={{ textShadow: `0 0 7px ${cab.accent}` }}>{cab.name}</div>
                        <FavStar id={cab.id} on={favs.includes(cab.id)} onToggle={onToggleFav} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[9.5px] uppercase tracking-[0.05em] text-violet-200/60">{cab.shop}</span>
                        <span className="text-[11px] tracking-[1px] text-amber-300">{stars(cab.difficulty)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-[71] flex items-center justify-center gap-7 border-t px-4 py-2.5" style={{ borderColor: "#2e2158", background: "linear-gradient(180deg, rgba(13,10,32,.6), rgba(10,7,20,.92))", backdropFilter: "blur(4px)" }}>
        <NavItem to="/" icon={<Home className="h-4 w-4" />} label="Home" color="#3bb6ff" />
        <NavItem to="/leaderboard" icon={<Trophy className="h-4 w-4" />} label="Leaderboard" color="#ffd24a" />
        <NavItem to="/achievements" icon={<Star className="h-4 w-4" />} label="Achievements" color="#33e650" />
        <NavItem onClick={() => { setCat("favorites"); window.scrollTo({ top: 0, behavior: "smooth" }); }} icon={<Heart className="h-4 w-4" />} label="Favorites" color="#ff8ab5" />
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
    <div className="flex flex-col items-center gap-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em]" style={{ color }}>
      <span style={{ filter: `drop-shadow(0 0 6px ${color})` }}>{icon}</span>{label}
    </div>
  );
  if (to) return <Link href={to} data-testid={`nav-${label.toLowerCase()}`}>{inner}</Link>;
  return <button onClick={onClick} data-testid={`nav-${label.toLowerCase()}`} className={onClick ? "active:scale-90" : "opacity-80"}>{inner}</button>;
}

// star toggle used on both card lines — a filled gold star means favorited.
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
