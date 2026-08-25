import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";

interface Entry { id: string; adminEmail: string | null; action: string; targetType: string | null; targetId: string | null; detail: string | null; createdAt: string | null }

const ACTION_LABELS: Record<string, string> = {
  "business.verify": "Verified business", "business.reject": "Rejected business",
  "page.unpublish": "Unpublished page", "nonprofit.revoke": "Revoked nonprofit",
  "user.suspend": "Suspended user", "user.unsuspend": "Unsuspended user",
  "user.impersonate": "Impersonated user",
};
const ACTION_TONE: Record<string, string> = {
  "business.reject": "border-red-300 text-red-700", "page.unpublish": "border-red-300 text-red-700",
  "nonprofit.revoke": "border-red-300 text-red-700", "user.suspend": "border-red-300 text-red-700",
  "user.impersonate": "border-amber-300 text-amber-700",
};

// Admin audit log — a chronological record of privileged admin actions.
export default function AuditPanel() {
  const { data = [], isLoading } = useQuery<Entry[]>({ queryKey: ["/api/admin/audit"], retry: false });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4 text-purple-600" /> Audit log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-6 text-center text-gray-400">Loading…</div>
        ) : data.length === 0 ? (
          <p className="text-sm text-gray-500">No admin actions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Admin</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pl-2 font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-4 text-gray-700">{e.adminEmail || "—"}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className={`text-xs ${ACTION_TONE[e.action] || "text-gray-600"}`}>
                        {ACTION_LABELS[e.action] || e.action}
                      </Badge>
                    </td>
                    <td className="py-2 pl-2 text-gray-600">
                      {e.detail || (e.targetType ? `${e.targetType} ${e.targetId?.slice(0, 8) ?? ""}` : "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
