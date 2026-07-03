import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BadgeMedallion from "./badge-medallion";
import AwardBadgeDialog from "./award-badge-dialog";
import { Award, Plus } from "lucide-react";

type Mode = "customer" | "business" | "coordinator" | "admin";
interface AwardRow {
  id: string; name: string; description: string | null; emoji: string | null;
  imageDataUri: string | null; color: string | null; note: string | null;
  awardedBy: string; awardedAt: string | null; awarderUserId: string | null;
}
interface Biz { id: string; name: string }

// Badges hub card. Shows the relevant badges (a user's own, or a business's) and
// an "Award a badge" action appropriate to the role.
export default function BadgesPanel({ mode }: { mode: Mode }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState(false);

  const { data: myBiz = [] } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false, enabled: mode === "business" });
  const businessId = myBiz[0]?.id;

  // What to display: business badges for business mode, else the user's own.
  const displayKey = mode === "business" ? (businessId ? `/api/badges/business/${businessId}` : null) : "/api/badges/mine";
  const { data: awards = [] } = useQuery<AwardRow[]>({ queryKey: [displayKey], enabled: !!displayKey, retry: false });

  const revoke = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/badges/awards/${id}/revoke`),
    onSuccess: () => { toast({ title: "Badge removed" }); if (displayKey) qc.invalidateQueries({ queryKey: [displayKey] }); },
    onError: () => toast({ title: "Couldn't remove badge", variant: "destructive" }),
  });

  const refresh = () => { if (displayKey) qc.invalidateQueries({ queryKey: [displayKey] }); };

  const heading =
    mode === "business" ? "Your badges" : mode === "admin" ? "Badges" : "My badges";
  const awardLabel =
    mode === "customer" ? "Give a business a badge"
    : mode === "business" ? "Award a customer"
    : mode === "coordinator" ? "Award a business"
    : "Award a badge";

  if (mode === "business" && !businessId) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
          <span className="flex items-center gap-2"><Award className="h-5 w-5 text-purple-600" /> {heading}</span>
          <Button size="sm" onClick={() => setDialog(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <Plus className="h-4 w-4 mr-1" /> {awardLabel}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {mode !== "admin" && (
          awards.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No badges yet. Earn them through achievements or receive them from others.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {awards.map((a) => (
                <div key={a.id} className="flex flex-col items-center gap-1 w-24 text-center group">
                  <BadgeMedallion emoji={a.emoji} imageDataUri={a.imageDataUri} color={a.color} name={a.name} size={56} />
                  <div className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">{a.name}</div>
                  <div className="text-[10px] text-gray-400">from {a.awardedBy}</div>
                  {a.note && <div className="text-[10px] text-gray-500 italic leading-tight">“{a.note}”</div>}
                </div>
              ))}
            </div>
          )
        )}
        {mode === "admin" && (
          <p className="text-sm text-gray-500">Award a badge to any person or business.</p>
        )}
      </CardContent>

      <AwardBadgeDialog as={mode} open={dialog} onOpenChange={setDialog} onDone={refresh} awarderBusinessId={businessId} />
    </Card>
  );
}
