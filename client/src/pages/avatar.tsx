import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  AvatarConfig, DEFAULT_AVATAR, SKINS, EYES, HAT_COLORS, BODY_COLORS, SIDEKICKS,
  SHOP_OUTFITS, avatarForShop, drawAvatarToCanvas, loadAvatarLS, saveAvatarLS,
} from "@/game/avatar";

const AVATAR_GAME_ID = "avatar"; // stored in game_progress.state (no migration needed)

// The three shop looks previewed under the editor (proves the per-shop re-skin).
const SHOP_PREVIEWS: { key: string; label: string }[] = [
  { key: "cuppa", label: "Barista" },
  { key: "slice", label: "Courier" },
  { key: "fixit", label: "Handy" },
];

export default function AvatarPage() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState<AvatarConfig>(() => loadAvatarLS());
  const [saved, setSaved] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);
  const shopRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // pull any saved avatar from the profile
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/game/progress?gameId=${AVATAR_GAME_ID}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.state && d.state.skin) setCfg({ ...DEFAULT_AVATAR, ...d.state }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // redraw preview + shop looks whenever the avatar changes
  useEffect(() => {
    const pc = preview.current;
    if (pc) { const ctx = pc.getContext("2d"); if (ctx) { ctx.clearRect(0, 0, pc.width, pc.height); drawAvatarToCanvas(ctx, cfg, 4, 20, 40); } }
    SHOP_PREVIEWS.forEach((s, i) => {
      const c = shopRefs.current[i]; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      drawAvatarToCanvas(ctx, avatarForShop(cfg, s.key), 3, 12, 27);
    });
  }, [cfg]);

  const set = (patch: Partial<AvatarConfig>) => { setCfg((c) => ({ ...c, ...patch })); setSaved(false); };

  const save = async () => {
    saveAvatarLS(cfg);
    if (user) {
      try {
        await fetch("/api/game/progress", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId: AVATAR_GAME_ID, state: cfg }) });
      } catch { /* LS already saved */ }
    }
    setSaved(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "radial-gradient(120% 90% at 50% -10%, #1c1348 0%, #0d0a20 45%, #0a0714 100%)", color: "#fff4ea", touchAction: "pan-y" }}>
      <div className="mx-auto flex max-w-[720px] flex-col px-4 pb-16 pt-4">
        <div className="mb-3 flex items-center gap-3">
          <Link href="/arcade" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
          <div className="ml-1 text-sm font-extrabold uppercase tracking-[0.14em]" style={{ color: "#fff", textShadow: "0 0 12px rgba(183,155,255,.6)" }}>Your Avatar</div>
        </div>

        <div className="grid gap-5 sm:grid-cols-[190px_1fr]">
          {/* preview */}
          <div className="flex flex-col items-center">
            <canvas ref={preview} width={160} height={176} data-testid="avatar-preview"
              className="rounded-xl" style={{ imageRendering: "pixelated", width: 160, background: "radial-gradient(60% 55% at 50% 42%, #241a48, #0c0820)", border: "1.5px solid #2e2158" }} />
            <div className="mt-2 text-[15px] font-extrabold" style={{ color: "#fff" }}>{(user as any)?.username || (user as any)?.name || "Player"}</div>
            <div className="text-[11px] tracking-[0.1em]" style={{ color: "#3bb6ff" }}>CIRQLER</div>
            <button onClick={save} data-testid="button-save-avatar"
              className="mt-3 flex items-center gap-1.5 rounded-full px-6 py-2.5 text-[14px] font-extrabold active:scale-95"
              style={{ color: "#0a0714", background: "linear-gradient(90deg,#3bb6ff,#b79bff)", boxShadow: "0 8px 24px rgba(59,182,255,.4)" }}>
              {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save avatar"}
            </button>
            {!user && <div className="mt-2 max-w-[24ch] text-center text-[10.5px] text-violet-300/50">Saved on this device. Log in to keep it across the arcade.</div>}
          </div>

          {/* options */}
          <div className="flex flex-col gap-3">
            <Row label="Skin"><Swatches items={SKINS.map((c) => ({ c }))} value={cfg.skin} onPick={(c) => set({ skin: c })} testid="skin" /></Row>
            <Row label="Eyes"><Swatches items={EYES.map((c) => ({ c }))} value={cfg.eye} onPick={(c) => set({ eye: c })} testid="eyes" /></Row>
            <Row label="Cap"><Swatches items={HAT_COLORS} value={cfg.hat} onPick={(c) => set({ hat: c })} testid="hat" /></Row>
            <Row label="Outfit"><Swatches items={BODY_COLORS} value={cfg.body} onPick={(c) => set({ body: c })} testid="body" /></Row>
            <Row label="Sidekick">
              <div className="flex flex-wrap gap-2">
                {SIDEKICKS.map((s) => {
                  const on = cfg.sidekick === s.k; const locked = !!s.lock;
                  return (
                    <button key={s.k} disabled={locked} onClick={() => set({ sidekick: s.k })} data-testid={`sidekick-${s.k}`} title={s.lock || s.label}
                      className="relative rounded-lg border px-3 py-1.5 text-[12px] font-bold active:scale-95"
                      style={{ borderColor: on ? "#b79bff" : "#2e2158", color: locked ? "#6b5e8f" : "#e6dcff", background: on ? "rgba(183,155,255,.14)" : "rgba(255,255,255,.02)", boxShadow: on ? "0 0 14px -2px #b79bff" : "none", opacity: locked ? 0.6 : 1 }}>
                      {s.label}{locked && <Lock className="ml-1 inline h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </Row>
          </div>
        </div>

        {/* per-shop looks */}
        <div className="mt-7">
          <div className="mb-3 flex items-center gap-3 text-[12px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "#ffb020", textShadow: "0 0 10px rgba(255,176,32,.4)" }}>
            One hero, every cabinet
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,176,32,.5), transparent)" }} />
          </div>
          <p className="mb-3 text-[13px] leading-relaxed text-violet-100/60">You star in every game — re-skinned for the shop. Play a cabinet to unlock its outfit.</p>
          <div className="flex flex-wrap gap-3">
            {SHOP_PREVIEWS.map((s, i) => (
              <div key={s.key} className="rounded-xl border p-2 text-center" style={{ borderColor: "#2e2158", background: "linear-gradient(180deg,#180f34,#130d28)" }}>
                <canvas ref={(el) => (shopRefs.current[i] = el)} width={72} height={90} style={{ imageRendering: "pixelated", width: 72, background: "radial-gradient(60% 55% at 50% 45%, #241a48, #0c0820)", borderRadius: 8 }} />
                <div className="mt-1 text-[12px] font-bold text-white">{s.label}</div>
                <div className="text-[9.5px] uppercase tracking-[0.05em]" style={{ color: "#ffd24a" }}>✦ {s.key === "cuppa" ? "Cuppa Rush" : s.key === "slice" ? "Slice Route" : "Fix-It"}</div>
              </div>
            ))}
            <div className="flex items-center px-1 text-[11px] text-violet-300/40">…and {Object.keys(SHOP_OUTFITS).length + 5} more cabinets</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 flex-none text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "#8676ad" }}>{label}</div>
      {children}
    </div>
  );
}

function Swatches({ items, value, onPick, testid }: { items: { c: string; lock?: string }[]; value: string; onPick: (c: string) => void; testid: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const on = value.toLowerCase() === it.c.toLowerCase(); const locked = !!it.lock;
        return (
          <button key={it.c} disabled={locked} onClick={() => onPick(it.c)} data-testid={`swatch-${testid}-${it.c.replace("#", "")}`} title={it.lock || undefined}
            className="relative h-7 w-7 rounded-md active:scale-90"
            style={{ background: it.c, border: on ? "2px solid #fff" : "1.5px solid rgba(255,255,255,.14)", boxShadow: on ? "0 0 12px #b79bff" : "none", opacity: locked ? 0.5 : 1 }}>
            {locked && <Lock className="absolute inset-0 m-auto h-3 w-3 text-white/90" />}
          </button>
        );
      })}
    </div>
  );
}
