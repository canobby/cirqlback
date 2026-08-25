import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ACHIEVEMENTS, getRewards, syncRewardsFromServer, levelFromPoints, type RewardState } from "@/game/rewards";
import { MAIN_STREET_CABINETS } from "@/game/cabinet-covers";
import { SIDEKICKS } from "@/game/avatar";

const cabName = (id: string) => MAIN_STREET_CABINETS.find((c) => c.id === id)?.name || id;
const sideLabel = (k: string) => SIDEKICKS.find((s) => s.k === k)?.label || k;
const isColor = (id: string) => id.startsWith("#");

export default function Achievements() {
  const { user } = useAuth();
  const [rw, setRw] = useState<RewardState>(() => getRewards());
  useEffect(() => { let ok = true; syncRewardsFromServer().then((s) => { if (ok) setRw(s); }); return () => { ok = false; }; }, []);

  const points = (user as any)?.totalPoints ?? (user as any)?.points ?? 0;
  const earned = new Set(rw.earned);
  const globals = ACHIEVEMENTS.filter((a) => a.scope === "global");
  const perCab = ACHIEVEMENTS.filter((a) => a.scope !== "global");
  const doneCount = ACHIEVEMENTS.filter((a) => earned.has(a.id)).length;

  const Badge = ({ a }: { a: typeof ACHIEVEMENTS[number] }) => {
    const got = earned.has(a.id);
    return (
      <div className="flex items-start gap-2.5 rounded-xl border p-2.5" data-testid={`ach-${a.id}`}
        style={{ borderColor: got ? "#ffd24a" : "#2e2158", background: got ? "linear-gradient(180deg, rgba(255,210,74,.1), rgba(20,13,40,.4))" : "linear-gradient(180deg,#160f2e,#120c26)", boxShadow: got ? "0 0 18px -6px #ffd24a" : "none" }}>
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[15px] font-extrabold"
          style={{ background: got ? "linear-gradient(180deg,#ffd24a,#ff9e2c)" : "#241a44", color: got ? "#0a0714" : "#6b5e8f", boxShadow: got ? "0 0 12px rgba(255,210,74,.5)" : "none" }}>
          {got ? a.icon : <Lock className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold leading-tight" style={{ color: got ? "#fff" : "#9a8fc0" }}>{a.name}</div>
          <div className="text-[11px] leading-snug text-violet-200/50">{a.desc}</div>
          {a.unlocks && a.unlocks.length > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold" style={{ color: got ? "#7be0c2" : "#83769c" }}>
              {got ? "Unlocked:" : "Unlocks:"}
              {a.unlocks.map((u) => isColor(u)
                ? <span key={u} className="inline-block h-3 w-3 rounded-sm align-middle" style={{ background: u, boxShadow: got ? `0 0 6px ${u}` : "none" }} />
                : <span key={u} className="rounded bg-white/5 px-1.5 py-0.5">{sideLabel(u)}</span>)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "radial-gradient(120% 90% at 50% -10%, #1c1348 0%, #0d0a20 45%, #0a0714 100%)", color: "#fff4ea", touchAction: "pan-y" }}>
      <div className="mx-auto flex max-w-[760px] flex-col px-4 pb-16 pt-4">
        <div className="mb-3 flex items-center gap-3">
          <Link href="/lobby" className="flex items-center gap-1 text-xs text-violet-300/70 hover:text-violet-200" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
          <div className="ml-1 text-sm font-extrabold uppercase tracking-[0.14em]" style={{ color: "#fff", textShadow: "0 0 12px rgba(255,210,74,.5)" }}>Achievements</div>
          <div className="ml-auto text-[12px] font-bold tabular-nums text-amber-300">{doneCount}/{ACHIEVEMENTS.length}</div>
        </div>

        {/* stat strip */}
        <div className="mb-5 grid grid-cols-4 gap-2">
          {[
            { k: "Cabinets", v: `${rw.stats.played.length}/10` },
            { k: "Runs", v: rw.stats.runs },
            { k: "★ Points", v: (points as number).toLocaleString() },
            { k: "Level", v: levelFromPoints(points) },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border py-2 text-center" style={{ borderColor: "#2e2158", background: "rgba(255,255,255,.02)" }}>
              <div className="text-[17px] font-extrabold tabular-nums text-white">{s.v}</div>
              <div className="text-[9px] uppercase tracking-[0.1em] text-violet-300/50">{s.k}</div>
            </div>
          ))}
        </div>

        <Section title="Arcade">{globals.map((a) => <Badge key={a.id} a={a} />)}</Section>
        <Section title="By cabinet">{perCab.map((a) => <div key={a.id}><div className="mb-1 text-[9.5px] uppercase tracking-[0.08em] text-violet-300/40">{cabName(a.scope)}</div><Badge a={a} /></div>)}</Section>

        {!user && <div className="mt-5 text-center text-[11px] text-violet-300/50">Log in to keep your achievements &amp; unlocks across the arcade.</div>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-3 text-[13px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "#ffb020", textShadow: "0 0 10px rgba(255,176,32,.4)" }}>
        {title}<div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,176,32,.5), transparent)" }} />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>
    </div>
  );
}
