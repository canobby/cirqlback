import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Globe, Heart, ExternalLink, Eye, CheckCircle2 } from "lucide-react";

interface QueueRow { id: string; name: string; address: string | null; ownerEmail: string | null }
interface PageRow { id: string; name: string; slug: string | null; views: number | null }
interface NonprofitRow { id: string; name: string; ein: string | null; mission: string | null }

// Admin Trust & Safety tab: verify/reject the business queue, moderate (kill)
// hosted pages, and manage nonprofit (501c3) status.
export default function TrustSafetyPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: queue = [] } = useQuery<QueueRow[]>({ queryKey: ["/api/admin/verification-queue"], retry: false });
  const { data: pages = [] } = useQuery<PageRow[]>({ queryKey: ["/api/admin/hosted-pages"], retry: false });
  const { data: nonprofits = [] } = useQuery<NonprofitRow[]>({ queryKey: ["/api/admin/nonprofits"], retry: false });

  const invalidate = (key: string) => qc.invalidateQueries({ queryKey: [key] });

  const verify = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/admin/businesses/${id}/verification`, { status }),
    onSuccess: (_r, v) => { toast({ title: v.status === "verified" ? "Business verified" : "Business rejected" }); invalidate("/api/admin/verification-queue"); invalidate("/api/admin/overview"); },
    onError: () => toast({ title: "Couldn't update", variant: "destructive" }),
  });

  const unpublish = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/admin/businesses/${id}/unpublish`, {}),
    onSuccess: () => { toast({ title: "Page unpublished" }); invalidate("/api/admin/hosted-pages"); invalidate("/api/admin/overview"); },
    onError: () => toast({ title: "Couldn't unpublish", variant: "destructive" }),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/admin/businesses/${id}/revoke-nonprofit`, {}),
    onSuccess: () => { toast({ title: "Nonprofit status revoked" }); invalidate("/api/admin/nonprofits"); },
    onError: () => toast({ title: "Couldn't revoke", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {/* Verification queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-blue-600" /> Verification queue
            {queue.length > 0 && <Badge className="bg-blue-100 text-blue-700 border-blue-200">{queue.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-gray-500"><CheckCircle2 className="h-4 w-4 text-green-600" /> No businesses awaiting verification.</p>
          ) : (
            <div className="space-y-2">
              {queue.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{b.name}</div>
                    <div className="text-xs text-gray-500 truncate">{b.ownerEmail || "—"}{b.address ? ` · ${b.address}` : ""}</div>
                  </div>
                  <Button size="sm" variant="outline" disabled={verify.isPending} onClick={() => verify.mutate({ id: b.id, status: "verified" })}>Verify</Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={verify.isPending} onClick={() => verify.mutate({ id: b.id, status: "rejected" })}>Reject</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hosted pages moderation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-purple-600" /> Hosted pages
            {pages.length > 0 && <Badge className="bg-purple-100 text-purple-700 border-purple-200">{pages.length} live</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <p className="text-sm text-gray-500">No live hosted pages.</p>
          ) : (
            <div className="space-y-2">
              {pages.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.slug && (
                      <a href={`/biz/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> /biz/{p.slug}
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {(p.views ?? 0).toLocaleString()}</span>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={unpublish.isPending}
                          onClick={() => { if (confirm(`Unpublish ${p.name}'s page?`)) unpublish.mutate(p.id); }}>
                    Unpublish
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nonprofits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-pink-600" /> Nonprofits (501c3)
            {nonprofits.length > 0 && <Badge className="bg-pink-100 text-pink-700 border-pink-200">{nonprofits.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nonprofits.length === 0 ? (
            <p className="text-sm text-gray-500">No nonprofits registered.</p>
          ) : (
            <div className="space-y-2">
              {nonprofits.map((n) => (
                <div key={n.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{n.name}</div>
                    <div className="text-xs text-gray-500 truncate">EIN {n.ein || "—"}{n.mission ? ` · ${n.mission}` : ""}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={revoke.isPending}
                          onClick={() => { if (confirm(`Revoke ${n.name}'s nonprofit (free-plan) status?`)) revoke.mutate(n.id); }}>
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
