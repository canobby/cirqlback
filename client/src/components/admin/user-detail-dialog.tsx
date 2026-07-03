import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Store, Shield, UserCog, Eye, CheckCircle2, Globe, Ban } from "lucide-react";
import { useState } from "react";

interface Biz { id: string; name: string; verificationStatus: string | null; websitePublished: boolean; websiteSlug: string | null; campaigns: number; tags: number; taps: number; lastTap: string | null }
interface Detail {
  user: { id: string; email: string | null; firstName: string | null; lastName: string | null; role: string | null; subscriptionTier: string | null; subscriptionStatus: string | null; createdAt: string | null; suspended: boolean };
  isAdmin: boolean; isCoordinator: boolean; businesses: Biz[];
}

// Support 360 — an admin's full read of a user, with a "view as" (impersonate)
// action for support.
export default function UserDetailDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data } = useQuery<Detail>({
    queryKey: [`/api/admin/user/${userId}/detail`],
    enabled: !!userId,
    retry: false,
  });

  const toggleSuspend = async () => {
    if (!userId || !data) return;
    const next = !data.user.suspended;
    if (next && !confirm(`Suspend ${data.user.email}? They'll be blocked from logging in.`)) return;
    setBusy(true);
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/suspend`, { suspended: next });
      toast({ title: next ? "User suspended" : "User unsuspended" });
      qc.invalidateQueries({ queryKey: [`/api/admin/user/${userId}/detail`] });
    } catch {
      toast({ title: "Couldn't update suspension", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const impersonate = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      await apiRequest("POST", `/api/admin/impersonate/${userId}`, {});
      // Reload into the impersonated session; the banner appears app-wide.
      window.location.href = "/";
    } catch {
      toast({ title: "Couldn't start impersonation", variant: "destructive" });
      setBusy(false);
    }
  };

  const u = data?.user;
  const name = u ? (`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "—") : "";

  return (
    <Dialog open={!!userId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-purple-600" /> {name || "User"}
            {data?.user.suspended && <Badge className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>}
          </DialogTitle>
        </DialogHeader>

        {!data ? (
          <div className="py-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-5">
            {/* Profile */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Email" value={u!.email || "—"} />
              <Field label="Joined" value={u!.createdAt ? new Date(u!.createdAt).toLocaleDateString() : "—"} />
              <div>
                <div className="text-xs text-gray-500 mb-1">Roles</div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{u!.role ?? "—"}</Badge>
                  {data.isAdmin && <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1"><Shield className="h-3 w-3" />admin</Badge>}
                  {data.isCoordinator && <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1"><UserCog className="h-3 w-3" />coordinator</Badge>}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Subscription</div>
                <div className="flex gap-1">
                  <Badge variant="outline">{u!.subscriptionTier ?? "—"}</Badge>
                  <Badge variant="outline">{u!.subscriptionStatus ?? "—"}</Badge>
                </div>
              </div>
            </div>

            {/* Businesses */}
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Store className="h-4 w-4 text-purple-600" /> Businesses ({data.businesses.length})
              </div>
              {data.businesses.length === 0 ? (
                <p className="text-sm text-gray-500">No businesses owned.</p>
              ) : (
                <div className="space-y-2">
                  {data.businesses.map((b) => (
                    <div key={b.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{b.name}</span>
                        <Badge variant="outline" className={`text-xs capitalize ${b.verificationStatus === "verified" ? "border-green-300 text-green-700" : "border-gray-300 text-gray-500"}`}>{b.verificationStatus}</Badge>
                        {b.websitePublished && b.websiteSlug && (
                          <a href={`/biz/${b.websiteSlug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline inline-flex items-center gap-1"><Globe className="h-3 w-3" />live page</a>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>{b.campaigns} campaigns</span>
                        <span>{b.tags} tags</span>
                        <span>{b.taps} taps</span>
                        <span>last tap: {b.lastTap ? new Date(b.lastTap).toLocaleDateString() : "never"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              {data.isAdmin ? (
                <span className="text-xs text-gray-400 self-center flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Admin — can't impersonate or suspend</span>
              ) : (
                <>
                  <Button variant="outline" className={`mr-auto ${data.user.suspended ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700"}`} onClick={toggleSuspend} disabled={busy}>
                    <Ban className="h-4 w-4 mr-2" /> {data.user.suspended ? "Unsuspend" : "Suspend"}
                  </Button>
                  <Button variant="outline" onClick={impersonate} disabled={busy}>
                    <Eye className="h-4 w-4 mr-2" /> {busy ? "Starting…" : "View as this user"}
                  </Button>
                </>
              )}
              <Button onClick={onClose} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-gray-900 truncate">{value}</div>
    </div>
  );
}
