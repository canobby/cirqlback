import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

// Recipient-side feed of admin broadcasts (Slice 2). Rendered in the coordinator
// and merchant hubs. Read-only; unread is a per-user watermark advanced on view.

interface Broadcast {
  id: string;
  audience: string;
  subject: string;
  body: string;
  createdAt: string | null;
}

function timeLabel(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AnnouncementsPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery<{ broadcasts: Broadcast[]; unread: number }>({
    queryKey: ["/api/messages/broadcasts"],
    retry: false,
  });

  const markSeen = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/messages/broadcasts/seen"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/messages/broadcasts"] }),
  });

  const unread = data?.unread ?? 0;
  const broadcasts = data?.broadcasts ?? [];

  // Advance the watermark once, when there's something new to mark.
  useEffect(() => {
    if (unread > 0) markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);

  if (broadcasts.length === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Megaphone className="h-5 w-5 text-purple-600" />
          Announcements
          {unread > 0 && <Badge className="bg-rose-500 text-white border-0">{unread} new</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <div
              key={b.id}
              className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 bg-gray-50/50 dark:bg-gray-900/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-900 dark:text-white">{b.subject}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{timeLabel(b.createdAt)}</span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words mt-1">
                {b.body}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
