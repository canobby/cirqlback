// CIRQL — "Your Cirql" + collection screen (CHR-92).
//
// The player's evolving orb (level/XP from worlds restored) plus a grid of
// unlockable cosmetics. Catalog + unlock rules live in @shared/cirql-cosmetics
// so the server validates equips against the exact same data. Equipping is a
// live tint (the parent calls engine.setAura) and is persisted server-side.

import { useEffect, useState } from "react";
import { Lock, Check, X, Gem, Award } from "lucide-react";
import { COSMETICS, getCosmetic, isUnlocked, levelInfo, DEFAULT_COSMETIC } from "@shared/cirql-cosmetics";
import { GAME_ACHIEVEMENTS, nextWorldMilestone } from "@shared/cirql-achievements";

interface BadgeRow { id: string; name: string; emoji: string | null; color: string | null; description: string | null; }

interface Props {
  open: boolean;
  onClose: () => void;
  worlds: number;
  streak: number;
  shinies: number;
  equipped: string;
  onEquip: (id: string) => void;
  busy?: string | null; // id currently being equipped (in-flight)
}

const KIND_LABEL: Record<string, string> = { aura: "Aura", skin: "Skin", trail: "Trail" };

export function CirqlCollection({ open, onClose, worlds, streak, shinies, equipped, onEquip, busy }: Props) {
  // CHR-103: the player's game-earned badges (also shown on the Cirqlback profile).
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  useEffect(() => {
    if (!open) return;
    fetch("/api/game/badges", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((b) => Array.isArray(b) && setBadges(b))
      .catch(() => {});
  }, [open]);

  if (!open) return null;
  const { level, into, need, pct } = levelInfo(worlds);
  const earnedKeys = new Set(badges.map((b) => b.name));
  const eq = getCosmetic(equipped);
  const progress = { worlds, streak };
  const unlockedCount = COSMETICS.filter((c) => isUnlocked(c, progress)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Your Cirql">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl border border-violet-400/25 p-5 text-slate-100 shadow-2xl"
        style={{ background: "radial-gradient(700px 400px at 50% -10%, rgba(124,58,237,.35), transparent 60%), #0b0918" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide inline-flex items-center gap-1.5"><Gem className="h-4 w-4 text-violet-300" /> Your Cirql</h2>
          <button onClick={onClose} data-testid="button-close-collection" aria-label="Close" className="rounded-lg p-1 text-violet-300/70 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        {/* The orb — tinted by the equipped cosmetic, level in the center */}
        <div className="flex flex-col items-center mt-3">
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: 108, height: 108,
              background: `radial-gradient(circle at 50% 42%, #fff 0%, ${eq.accent} 34%, ${eq.accent}55 60%, transparent 74%)`,
              boxShadow: `0 0 34px 6px ${eq.accent}66, inset 0 0 22px ${eq.accent}55`,
            }}
            data-testid="cirql-orb"
          >
            <span className="text-lg font-extrabold text-white drop-shadow">Lv {level}</span>
          </div>
          <div className="mt-1 text-[11px] text-violet-300/70">{eq.name} · {KIND_LABEL[eq.kind]}</div>
        </div>

        {/* XP toward next level */}
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-violet-300/70 tabular-nums">
            <span>Level {level}</span><span>{into}/{need} to Lv {level + 1}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.round(pct * 100)}%`, background: "linear-gradient(90deg,#7c3aed,#ec4899)" }} />
          </div>
        </div>

        {/* CHR-107 · Universe Restored — cumulative light returned + next milestone */}
        {(() => {
          const m = nextWorldMilestone(worlds);
          return (
            <div className="mt-3 rounded-xl border border-violet-400/20 bg-white/[0.03] px-3 py-2" data-testid="universe-restored">
              <div className="flex justify-between text-[11px]">
                <span className="text-violet-200/90 font-semibold">🌌 Universe Restored</span>
                <span className="text-violet-300/70 tabular-nums">{worlds} worlds of light</span>
              </div>
              {m ? (
                <>
                  <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round(m.pct * 100)}%`, background: "linear-gradient(90deg,#7c3aed,#22d3ee)" }} />
                  </div>
                  <div className="mt-1 text-[10px] text-violet-300/50 tabular-nums">Next: {m.name} · {worlds}/{m.to}</div>
                </>
              ) : (
                <div className="mt-1 text-[10px] text-amber-300/80">Universe Keeper — the whole sky shines.</div>
              )}
            </div>
          );
        })()}

        {/* Stats */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          <Stat label="Worlds" value={worlds} />
          <Stat label="Streak" value={streak} />
          <Stat label="🌈 Shiny" value={shinies} />
          <Stat label="Collected" value={`${unlockedCount}/${COSMETICS.length}`} />
        </div>

        {/* Collection grid */}
        <div className="mt-4 text-[11px] font-semibold text-violet-300/70">Collection</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {COSMETICS.map((c) => {
            const unlocked = isUnlocked(c, progress);
            const isEquipped = equipped === c.id || (!equipped && c.id === DEFAULT_COSMETIC);
            return (
              <div
                key={c.id}
                data-testid={`cosmetic-${c.id}`}
                className="rounded-xl border p-2.5"
                style={{ borderColor: isEquipped ? c.accent : "rgba(150,130,255,.2)", background: isEquipped ? `${c.accent}18` : "rgba(255,255,255,.03)" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-6 w-6 rounded-full shrink-0"
                    style={{ background: unlocked ? `radial-gradient(circle at 40% 35%, #fff, ${c.accent} 70%)` : "#2a2740", boxShadow: unlocked ? `0 0 8px ${c.accent}88` : "none", opacity: unlocked ? 1 : 0.5 }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{c.name}</div>
                    <div className="text-[10px] text-violet-300/50">{KIND_LABEL[c.kind]}</div>
                  </div>
                </div>
                <div className="mt-2">
                  {!unlocked ? (
                    <div className="inline-flex items-center gap-1 text-[10px] text-violet-300/50"><Lock className="h-3 w-3" /> {c.unlockLabel}</div>
                  ) : isEquipped ? (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300"><Check className="h-3.5 w-3.5" /> Equipped</div>
                  ) : (
                    <button
                      onClick={() => onEquip(c.id)}
                      disabled={busy === c.id}
                      data-testid={`button-equip-${c.id}`}
                      className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#ec4899)" }}
                    >
                      {busy === c.id ? "…" : "Equip"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CHR-103 · Awards — game achievements (also shown on your Cirqlback profile) */}
        <div className="mt-4 text-[11px] font-semibold text-violet-300/70 inline-flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Awards <span className="text-violet-300/40">· {badges.length}/{GAME_ACHIEVEMENTS.length}</span></div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GAME_ACHIEVEMENTS.map((a) => {
            const earned = earnedKeys.has(a.name);
            return (
              <div key={a.key} data-testid={`award-${a.key}`} className="rounded-xl border p-2.5 flex items-center gap-2"
                style={{ borderColor: earned ? a.color : "rgba(150,130,255,.2)", background: earned ? `${a.color}18` : "rgba(255,255,255,.03)" }}>
                <span className="text-xl shrink-0" style={{ filter: earned ? "none" : "grayscale(1)", opacity: earned ? 1 : 0.4 }}>{a.emoji}</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{a.name}</div>
                  <div className="text-[10px] text-violet-300/50 leading-tight">{earned ? "Earned" : a.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-violet-300/40">Awards also appear on your Cirqlback profile.</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-white/5 py-2">
      <div className="text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-violet-300/60">{label}</div>
    </div>
  );
}
