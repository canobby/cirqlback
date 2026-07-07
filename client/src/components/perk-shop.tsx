import { useState } from "react";
import { Sparkles, X, Loader2, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { perksForGame } from "@shared/arcade-perks";

// PerkButton — the per-game power-up shop. The arcade is FREE (owner decision):
// arming a power-up for your next run costs nothing, so the arcade never touches a
// currency. Self-hides for games without a catalog. Perked runs stay off the Daily
// board (your personal best still counts).

export function PerkButton({ gameId, name, accent = "#fbbf24" }: { gameId: string; name: string; accent?: string }) {
  const { user } = useAuth();
  const perks = perksForGame(gameId);
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!perks.length) return null;

  const load = () => {
    setLoading(true);
    fetch(`/api/game/perks/shop?gameId=${encodeURIComponent(gameId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setArmed(d.armed || {}); } setLoading(false); })
      .catch(() => setLoading(false));
  };
  const openIt = () => { setOpen(true); setMsg(null); if (user) load(); };
  const arm = (pid: string) => {
    setBusy(pid); setMsg(null);
    fetch("/api/game/perks/arm", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gameId, perkId: pid }) })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (r.ok && j?.ok) { setArmed(j.armed || {}); }
        else if (j?.reason === "already") { if (j.armed) setArmed(j.armed); setMsg("Already armed for your next run."); }
        else setMsg("Couldn't arm that perk.");
        setBusy(null);
      })
      .catch(() => { setMsg("Couldn't arm that perk."); setBusy(null); });
  };

  return (
    <>
      <button onClick={openIt} data-testid="button-perks" className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12px] font-bold active:scale-95" style={{ borderColor: accent + "55", color: accent }}>
        <Sparkles className="h-3.5 w-3.5" /> Perks
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(4,3,12,.72)", backdropFilter: "blur(2px)" }} onClick={() => setOpen(false)} data-testid="perks-overlay">
          <div className="w-full max-w-[380px] rounded-2xl border p-5" style={{ borderColor: accent + "55", background: "linear-gradient(180deg, rgba(22,16,8,.98), rgba(8,6,20,.99))", boxShadow: `0 24px 70px rgba(0,0,0,.6), 0 0 40px ${accent}22` }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-extrabold text-white"><Sparkles className="h-4 w-4" style={{ color: accent }} /> Perks · {name}</div>
              <button onClick={() => setOpen(false)} data-testid="button-perks-close" className="text-violet-300/60 hover:text-violet-200"><X className="h-5 w-5" /></button>
            </div>

            {!user ? (
              <p className="py-8 text-center text-sm text-violet-100/70">Log in to arm power-ups for your runs — they're free.</p>
            ) : (
              <>
                <div className="mb-3 text-[12px]" style={{ color: accent + "cc" }}>Power-ups are <b className="text-white">free</b> — arm any for your next run {loading && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}</div>
                <div className="space-y-2">
                  {perks.map((p) => {
                    const isArmed = !!armed[p.id];
                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl border px-3 py-2" style={{ borderColor: isArmed ? accent + "66" : "rgba(150,130,255,.16)", background: isArmed ? accent + "12" : "rgba(255,255,255,.02)" }}>
                        <span className="text-xl" style={{ filter: `drop-shadow(0 0 6px ${accent})` }}>{p.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-bold text-white">{p.name}</div>
                          <div className="truncate text-[11px] text-violet-100/60">{p.desc}</div>
                        </div>
                        {isArmed ? (
                          <span className="flex items-center gap-1 text-[12px] font-bold" style={{ color: accent }}><Check className="h-4 w-4" /> Armed</span>
                        ) : (
                          <button onClick={() => arm(p.id)} disabled={busy === p.id} data-testid={`arm-${p.id}`} className="rounded-full px-3 py-1.5 text-[12px] font-bold active:scale-95 disabled:opacity-40" style={{ color: "#0a0714", background: `linear-gradient(90deg, ${accent}, #a78bfa)` }}>
                            {busy === p.id ? "…" : "Arm"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {msg && <p className="mt-3 text-center text-[12px] text-amber-300/90">{msg}</p>}
                <p className="mt-3 text-center text-[11px] text-violet-300/50">Armed perks apply to your next run — which stays off the Daily board.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
