import { useQuery } from "@tanstack/react-query";

// Shows any active seasonal event(s) as a limited-time banner.
interface Ev { id: string; name: string; emoji: string | null; pointMultiplier: number; endsAt: string }

export default function EventBanner() {
  const { data = [] } = useQuery<Ev[]>({ queryKey: ["/api/events/active"], retry: false });
  if (data.length === 0) return null;
  return (
    <div className="mb-6 space-y-2">
      {data.map((e) => (
        <div key={e.id} className="rounded-xl p-4 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 text-white flex items-center gap-3">
          <span className="text-2xl">{e.emoji || "🎉"}</span>
          <div className="min-w-0 flex-1">
            <div className="font-bold">{e.name} · {e.pointMultiplier}× points</div>
            <div className="text-xs text-purple-100">Limited time — ends {new Date(e.endsAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Tap now to earn more!</div>
          </div>
        </div>
      ))}
    </div>
  );
}
