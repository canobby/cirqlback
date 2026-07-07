import { useEffect, useMemo, useRef, useState } from "react";
import {
  type AvatarConfig, DEFAULT_AVATAR, drawAvatarToCanvas,
  SKINS, EYES, HAT_COLORS, HAT_STYLES, BODY_COLORS, SIDEKICKS, AURAS, AURA_COLORS,
} from "@/game/avatar";

// CIRQL character creator (CHR-242/243). Shown on first entry (create) and from
// an "edit look" button (edit). Lots of fun, spark-free-at-creation choices —
// skin, eyes, hat colour + shape, body colour, aura glow, and a companion —
// with a live glowing preview. Confirm returns the config + display name.

type Mode = "create" | "edit";
interface Props {
  initial?: AvatarConfig;
  initialName?: string;
  mode?: Mode;
  onConfirm: (cfg: AvatarConfig, name: string) => void;
  onCancel?: () => void;
}

type CatId = "skin" | "eye" | "hatColor" | "hatStyle" | "body" | "aura" | "companion";
const CATS: { id: CatId; label: string }[] = [
  { id: "skin", label: "Skin" }, { id: "eye", label: "Eyes" }, { id: "hatColor", label: "Hat" },
  { id: "hatStyle", label: "Shape" }, { id: "body", label: "Outfit" }, { id: "aura", label: "Aura" }, { id: "companion", label: "Friend" },
];

export function CharacterCreator({ initial, initialName, mode = "create", onConfirm, onCancel }: Props) {
  const [cfg, setCfg] = useState<AvatarConfig>({ ...DEFAULT_AVATAR, ...(initial || {}) });
  const [name, setName] = useState((initialName || "").slice(0, 16));
  const [cat, setCat] = useState<CatId>("skin");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const set = (patch: Partial<AvatarConfig>) => setCfg((c) => ({ ...c, ...patch }));

  // live preview
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const S = 5, W = 132, H = 168;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    const ctx = cv.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const feetX = Math.round(W / S / 2), feetY = Math.round(H / S) - 4;
    // aura glow behind
    const aura = cfg.aura && AURA_COLORS[cfg.aura];
    if (aura) {
      const gx = feetX * S, gy = (feetY - 19) * S;
      const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, 64);
      g.addColorStop(0, aura + "cc"); g.addColorStop(0.5, aura + "55"); g.addColorStop(1, aura + "00");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, 64, 0, Math.PI * 2); ctx.fill();
    }
    drawAvatarToCanvas(ctx, cfg, S, feetX, feetY);
  }, [cfg]);

  const swatches = (list: string[] | { c: string }[], key: "skin" | "eye" | "hat" | "body", cur: string) => (
    <div className="flex flex-wrap gap-2">
      {list.map((s) => { const c = typeof s === "string" ? s : s.c; return (
        <button key={c} onClick={() => set({ [key]: c } as any)} data-testid={`sw-${key}-${c}`}
          className="h-9 w-9 rounded-full border-2 transition active:scale-90"
          style={{ background: c, borderColor: cur === c ? "#fff" : "transparent", boxShadow: cur === c ? "0 0 12px rgba(255,255,255,.5)" : "0 0 0 1px rgba(255,255,255,.12)" }} />
      ); })}
    </div>
  );
  const chips = <T extends string>(opts: { k: T; label: string }[], cur: T | undefined, on: (k: T) => void, tint?: (k: T) => string | null) => (
    <div className="flex flex-wrap gap-2">
      {opts.map((o) => { const active = cur === o.k; const dot = tint?.(o.k); return (
        <button key={o.k} onClick={() => on(o.k)} data-testid={`chip-${o.k}`}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95"
          style={{ borderColor: active ? "#35e0d0" : "rgba(255,255,255,.14)", color: active ? "#eaf6ff" : "#9fb0d0", background: active ? "rgba(53,224,208,.12)" : "transparent" }}>
          {dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />}
          {o.label}
        </button>
      ); })}
    </div>
  );

  const panel = useMemo(() => {
    switch (cat) {
      case "skin": return swatches(SKINS, "skin", cfg.skin);
      case "eye": return swatches(EYES, "eye", cfg.eye);
      case "hatColor": return swatches(HAT_COLORS, "hat", cfg.hat);
      case "hatStyle": return chips(HAT_STYLES, cfg.hatStyle ?? "cap", (k) => set({ hatStyle: k }));
      case "body": return swatches(BODY_COLORS, "body", cfg.body);
      case "aura": return chips(AURAS, cfg.aura ?? "none", (k) => set({ aura: k }), (k) => AURA_COLORS[k]);
      case "companion": return chips(SIDEKICKS, cfg.sidekick ?? "none", (k) => set({ sidekick: k }));
    }
  }, [cat, cfg]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(4,7,16,.88)", backdropFilter: "blur(3px)" }}>
      <div className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(53,224,208,.25)", background: "#0a1226", boxShadow: "0 0 60px rgba(53,224,208,.15)", maxHeight: "94vh" }}>
        <div className="px-5 pt-4 pb-2 text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/70">{mode === "create" ? "Welcome to CIRQLVERSE" : "Your Cirql identity"}</div>
          <h2 className="mt-1 font-extrabold tracking-wide text-white" style={{ textShadow: "0 0 14px rgba(53,224,208,.5)" }}>{mode === "create" ? "Create your character" : "Edit your look"}</h2>
        </div>

        <div className="flex items-center justify-center gap-4 px-5 py-2">
          <div className="rounded-xl p-1" style={{ background: "radial-gradient(circle at 50% 38%, rgba(53,224,208,.10), transparent 70%)" }}>
            <canvas ref={canvasRef} data-testid="creator-preview" style={{ imageRendering: "pixelated" }} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-cyan-300/60">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 16))} maxLength={16} placeholder="Traveller" data-testid="creator-name"
              className="w-36 rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: "rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", color: "#fff" }} />
            <p className="w-36 text-[10px] leading-snug text-slate-400">More looks unlock with <span className="text-amber-300">sparks</span> as you play.</p>
          </div>
        </div>

        {/* category tabs */}
        <div className="flex gap-1.5 overflow-x-auto px-5 py-2" style={{ scrollbarWidth: "none" }}>
          {CATS.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} data-testid={`cat-${c.id}`}
              className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition"
              style={{ background: cat === c.id ? "rgba(255,196,107,.14)" : "transparent", color: cat === c.id ? "#ffc46b" : "#8fa6c6" }}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="min-h-[92px] px-5 py-3">{panel}</div>

        <div className="flex gap-2 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-1">
          {mode === "edit" && onCancel && (
            <button onClick={onCancel} data-testid="creator-cancel" className="flex-1 rounded-xl border py-3 text-sm font-bold text-slate-300" style={{ borderColor: "rgba(255,255,255,.14)" }}>Cancel</button>
          )}
          <button onClick={() => onConfirm(cfg, name.trim())} data-testid="creator-confirm"
            className="flex-[2] rounded-xl py-3 text-sm font-extrabold text-slate-900"
            style={{ background: "linear-gradient(90deg,#35e0d0,#7fffe6)", boxShadow: "0 0 20px rgba(53,224,208,.4)" }}>
            {mode === "create" ? "Enter CIRQLVERSE ✦" : "Save look"}
          </button>
        </div>
      </div>
    </div>
  );
}
