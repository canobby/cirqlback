import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Plus } from "lucide-react";

// Admin: create time-boxed seasonal events that multiply tap points while active.
interface Ev { id: string; name: string; emoji: string | null; pointMultiplier: number; startsAt: string; endsAt: string; isActive: boolean }

export default function EventsAdminPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: list = [] } = useQuery<Ev[]>({ queryKey: ["/api/admin/events"], retry: false });

  const [form, setForm] = useState({ name: "", emoji: "🎉", pointMultiplier: "2", startsAt: "", endsAt: "" });
  const create = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/events", {
      name: form.name.trim(), emoji: form.emoji, pointMultiplier: Number(form.pointMultiplier) || 2,
      startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(),
    }),
    onSuccess: () => { toast({ title: "Event created" }); setForm({ name: "", emoji: "🎉", pointMultiplier: "2", startsAt: "", endsAt: "" }); qc.invalidateQueries({ queryKey: ["/api/admin/events"] }); },
    onError: (e: any) => toast({ title: "Couldn't create event", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }),
  });

  const now = Date.now();
  const state = (e: Ev) => new Date(e.startsAt).getTime() > now ? "upcoming" : new Date(e.endsAt).getTime() < now ? "ended" : "live";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white"><CalendarClock className="h-5 w-5 text-purple-600" /> Seasonal events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">A time-boxed event multiplies tap points while it's live (e.g. First Fridays, 2×).</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="w-16 text-center" maxLength={4} />
          <Input placeholder="Event name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="flex-1" />
          <select value={form.pointMultiplier} onChange={(e) => setForm({ ...form, pointMultiplier: e.target.value })} className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-sm">
            {[2, 3, 5].map((m) => <option key={m} value={m}>{m}× points</option>)}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <label className="text-sm text-gray-500">Start</label>
          <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="flex-1" />
          <label className="text-sm text-gray-500">End</label>
          <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="flex-1" />
        </div>
        <Button onClick={() => create.mutate()} disabled={!form.name.trim() || !form.startsAt || !form.endsAt || create.isPending} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <Plus className="h-4 w-4 mr-1" /> Create event
        </Button>
        {list.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            {list.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-800 dark:text-gray-200">{e.emoji} {e.name} · {e.pointMultiplier}×</span>
                <Badge variant="outline" className={state(e) === "live" ? "border-green-300 text-green-700" : ""}>{state(e)}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
