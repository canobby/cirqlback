// CHR-32: admin control to set each coordinator's revenue-share % within the
// 50–100 band (server-validated at PATCH /api/admin/coordinators/:id/share).
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Percent, Loader2 } from "lucide-react";

const SHARE_MIN = 50;
const SHARE_MAX = 100;

interface Coordinator {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  sharePct: number;
  planStatus?: string | null;
  isActive?: boolean | null;
}

function CoordinatorRow({ c }: { c: Coordinator }) {
  const { toast } = useToast();
  const [val, setVal] = useState(String(c.sharePct ?? 70));
  const name = c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email;

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/admin/coordinators/${c.id}/share`, { sharePct: Number(val) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coordinators"] });
      toast({ title: "Share updated", description: `${name}: ${val}% coordinator / ${100 - Number(val)}% platform` });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't update share", description: String(e?.message || e).replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });

  const pctNum = Number(val);
  const invalid = !Number.isInteger(pctNum) || pctNum < SHARE_MIN || pctNum > SHARE_MAX;
  const changed = String(c.sharePct) !== val.trim();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <div className="font-medium truncate">{name}</div>
        <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
          <span className="truncate">{c.email}</span>
          {c.planStatus && <Badge variant="outline" className="capitalize">{c.planStatus}</Badge>}
          {c.isActive === false && <Badge variant="destructive">inactive</Badge>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right text-xs text-muted-foreground leading-tight">
          platform keeps
          <div className="font-semibold text-foreground">
            {Number.isFinite(pctNum) ? `${100 - pctNum}%` : "—"}
          </div>
        </div>
        <div className="relative">
          <Input
            type="number"
            min={SHARE_MIN}
            max={SHARE_MAX}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className={`w-20 pr-6 ${invalid ? "border-destructive" : ""}`}
            aria-label={`${name} share percent`}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
        </div>
        <Button size="sm" disabled={!changed || invalid || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function CoordinatorSharePanel() {
  const { data, isLoading, error } = useQuery<Coordinator[]>({ queryKey: ["/api/admin/coordinators"] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" /> Coordinator revenue share
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Set each coordinator's share of gross revenue (subscriptions + add-ons). Allowed range {SHARE_MIN}–{SHARE_MAX}%;
          the default is 70%. Changes apply to future earnings only — past payouts keep the rate they were charged at.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">Loading coordinators…</div>}
        {error && <div className="text-sm text-destructive">Failed to load coordinators.</div>}
        {data && data.length === 0 && (
          <div className="text-sm text-muted-foreground">No coordinators yet. Provision one to manage its share here.</div>
        )}
        {data?.map((c) => <CoordinatorRow key={c.id} c={c} />)}
      </CardContent>
    </Card>
  );
}
