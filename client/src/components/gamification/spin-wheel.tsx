import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

// Daily free spin → random points. One per day. The wheel spins for fun; the
// points are server-decided.
const SEGMENTS = [5, 10, 25, 50, 100, 250, 10, 25];
const COLORS = ["#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6"];

export default function SpinWheel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: status } = useQuery<{ canSpin: boolean }>({ queryKey: ["/api/spin/status"], retry: false });
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);

  const spin = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/spin"); return (await r.json()) as { points: number }; },
    onMutate: () => {
      setSpinning(true); setWon(null);
      // several full turns + a random landing offset
      setRot((r) => r + 360 * 5 + Math.floor(Math.random() * 360));
    },
    onSuccess: (d) => {
      setTimeout(() => {
        setWon(d.points); setSpinning(false);
        toast({ title: `You won ${d.points} points! 🎉` });
        qc.invalidateQueries({ queryKey: ["/api/spin/status"] });
        qc.invalidateQueries({ queryKey: ["/api/user-stats"] });
        qc.invalidateQueries({ queryKey: ["/api/points/rewards"] });
      }, 2600);
    },
    onError: (e: any) => { setSpinning(false); toast({ title: "Couldn't spin", description: String(e?.message ?? "").slice(0, 120), variant: "destructive" }); },
  });

  const gradient = SEGMENTS.map((_, i) => `${COLORS[i % COLORS.length]} ${(i * 360) / SEGMENTS.length}deg ${((i + 1) * 360) / SEGMENTS.length}deg`).join(", ");

  return (
    <Card className="mb-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100"><Sparkles className="h-5 w-5 text-amber-500" /> Daily spin</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-10 text-2xl">▼</div>
          <div
            className="rounded-full border-4 border-white shadow-lg flex items-center justify-center"
            style={{ width: 180, height: 180, background: `conic-gradient(${gradient})`, transform: `rotate(${rot}deg)`, transition: "transform 2.5s cubic-bezier(.17,.67,.32,1.34)" }}
          >
            <div className="rounded-full bg-white dark:bg-gray-800 w-12 h-12 flex items-center justify-center text-sm font-bold text-purple-600">
              {won != null ? `+${won}` : "?"}
            </div>
          </div>
        </div>
        {status?.canSpin ? (
          <Button onClick={() => spin.mutate()} disabled={spinning} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            {spinning ? "Spinning…" : "Spin the wheel"}
          </Button>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">You've spun today — come back tomorrow! 🎡</p>
        )}
      </CardContent>
    </Card>
  );
}
