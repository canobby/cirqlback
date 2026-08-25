import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Store, Megaphone } from "lucide-react";

// Customer feed (Slice 3): receive-only. Merges reminders from businesses the
// customer follows with admin announcements addressed to customers. Unread is a
// per-user watermark advanced on view.

interface FeedItem {
  id: string;
  kind: "reminder" | "announcement";
  title: string;
  body: string;
  createdAt: string | null;
}

function timeLabel(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function CustomerFeedPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery<{ items: FeedItem[]; unread: number }>({
    queryKey: ["/api/customer/feed"],
    retry: false,
  });

  const markSeen = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/customer/feed/seen"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/customer/feed"] }),
  });

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  useEffect(() => {
    if (unread > 0) markSeen.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread]);

  if (items.length === 0) return null;

  return (
    <Card className="mb-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Bell className="h-5 w-5 text-purple-600" />
          Updates
          {unread > 0 && <Badge className="bg-rose-500 text-white border-0">{unread} new</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3 bg-gray-50/50 dark:bg-gray-900/30"
            >
              <div className="mt-0.5">
                {it.kind === "reminder" ? (
                  <Store className="h-5 w-5 text-blue-600" />
                ) : (
                  <Megaphone className="h-5 w-5 text-purple-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white truncate">{it.title}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeLabel(it.createdAt)}</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                  {it.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
