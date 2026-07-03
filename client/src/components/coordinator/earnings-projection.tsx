import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Minus, Plus, TrendingUp } from "lucide-react";

// Canonical monthly prices in cents (mirror server/pricing.ts + server/addons.ts).
// This is a projection tool, so exactness to the cent isn't critical, but keep
// these in sync with the source of truth if prices change.
const CORE_CENTS = 1999;
const PRO_CENTS = 4999;
const HOSTED_CENTS = 1499;

interface Model { core: number; pro: number; hosted: number; goal: number }
const DEFAULT: Model = { core: 10, pro: 2, hosted: 5, goal: 500 };

const money = (cents: number) =>
  "$" + Math.round(cents / 100).toLocaleString();

// "Grow your earnings" — an interactive projection + goal tracker for a
// coordinator, computed from their real share %. Model + goal persist locally.
export default function EarningsProjection({ sharePct, storageKey = "me" }: { sharePct: number; storageKey?: string }) {
  const key = `cirqlback:coord-earnings:${storageKey}`;
  const [m, setM] = useState<Model>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setM({ ...DEFAULT, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, [key]);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(m)); } catch { /* ignore */ }
  }, [key, m]);

  const share = sharePct / 100;
  const grossMonthly = m.core * CORE_CENTS + m.pro * PRO_CENTS + m.hosted * HOSTED_CENTS;
  const shareMonthly = grossMonthly * share;
  const shareYearly = shareMonthly * 12;

  const goalCents = m.goal * 100;
  const pct = goalCents > 0 ? Math.min(100, Math.round((shareMonthly / goalCents) * 100)) : 0;
  const perCore = CORE_CENTS * share;
  const gap = goalCents - shareMonthly;
  const moreCore = gap > 0 && perCore > 0 ? Math.ceil(gap / perCore) : 0;

  const set = (patch: Partial<Model>) => setM((prev) => ({ ...prev, ...patch }));

  return (
    <div className="mb-6 rounded-lg border border-purple-100 dark:border-purple-900 bg-gradient-to-br from-purple-50/60 to-pink-50/60 dark:from-purple-950/20 dark:to-pink-950/20 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
        <TrendingUp className="h-4 w-4 text-purple-600" /> Grow your earnings
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Model your territory at your {sharePct}% share. These are projections to aim for — not current earnings.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <Stepper label="Core shops" sub="$19.99/mo" value={m.core} onChange={(v) => set({ core: v })} />
        <Stepper label="Pro shops" sub="$49.99/mo" value={m.pro} onChange={(v) => set({ pro: v })} />
        <Stepper label="+ Hosted Page" sub="$14.99/mo" value={m.hosted} onChange={(v) => set({ hosted: v })} max={m.core} />
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 mb-4">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Projected monthly (your share)</div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{money(shareMonthly)}<span className="text-sm font-normal text-gray-400">/mo</span></div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Per year</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">{money(shareYearly)}</div>
        </div>
      </div>

      {/* Goal */}
      <div className="border-t border-purple-100 dark:border-purple-900/60 pt-3">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Target className="h-4 w-4 text-purple-600" /> Monthly goal
          </label>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">$</span>
            <Input
              type="number"
              min={0}
              value={m.goal}
              onChange={(e) => set({ goal: Math.max(0, Number(e.target.value) || 0) })}
              className="h-8 w-24"
            />
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
          {moreCore > 0 ? (
            <>You're at <span className="font-semibold text-gray-900 dark:text-white">{money(shareMonthly)}/mo</span> ({pct}% of goal) — about <span className="font-semibold text-purple-700 dark:text-purple-300">{moreCore} more Core shop{moreCore === 1 ? "" : "s"}</span> to reach {money(goalCents)}/mo.</>
          ) : (
            <>🎉 Your model hits <span className="font-semibold text-gray-900 dark:text-white">{money(goalCents)}/mo</span> — set a bigger goal and keep going.</>
          )}
        </p>
      </div>
    </div>
  );
}

function Stepper({ label, sub, value, onChange, max }: { label: string; sub: string; value: number; onChange: (v: number) => void; max?: number }) {
  const clamp = (v: number) => Math.max(0, max != null ? Math.min(max, v) : v);
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-2">
      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</div>
      <div className="text-[10px] text-gray-400 mb-1">{sub}</div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => onChange(clamp(value - 1))}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-8 text-center font-semibold text-gray-900 dark:text-white tabular-nums">{value}</span>
        <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => onChange(clamp(value + 1))}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
