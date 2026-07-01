import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, CheckCircle, Clock, XCircle, ArrowRight, Store } from "lucide-react";

interface RewardView {
  code: string;
  title: string;
  description: string | null;
  value: string | null;
  businessName: string | null;
  status: "valid" | "redeemed" | "expired";
  expiresAt: string | null;
  redeemedAt: string | null;
}

// CHR-74: customer-facing reward view. Opened by code (?code=) — e.g. from the
// tap success screen or a shared link. Customer shows the code; staff redeems.
export default function RewardPage() {
  const [, setLocation] = useLocation();
  const code = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("code") || "";

  const { data, isLoading, isError } = useQuery<RewardView>({
    queryKey: [`/api/rewards/lookup?code=${code}`],
    enabled: !!code,
    retry: false,
  });

  const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : "");

  return (
    <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-4 min-h-[80vh]">
      <div className="max-w-md mx-auto pt-8">
        <Button variant="ghost" onClick={() => setLocation("/")} className="mb-4">
          <ArrowRight className="h-4 w-4 rotate-180 mr-2" /> Home
        </Button>

        {!code ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No reward code provided.</CardContent></Card>
        ) : isLoading ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">Loading reward…</CardContent></Card>
        ) : isError || !data ? (
          <Card><CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-muted-foreground">We couldn't find that reward.</p>
          </CardContent></Card>
        ) : (
          <Card className="card-hover">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="gradient-text text-xl">{data.title}</CardTitle>
              {data.businessName && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Store className="h-3 w-3" /> {data.businessName}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {data.description && <p className="text-center text-muted-foreground">{data.description}</p>}
              {data.value && data.value !== "0.00" && (
                <p className="text-center text-2xl font-bold text-primary">${data.value} value</p>
              )}

              {data.status === "valid" && (
                <>
                  <div className="p-4 rounded-lg border-2 border-dashed border-primary/40 text-center bg-white">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Show this code to staff</p>
                    <p className="text-2xl font-mono font-bold tracking-widest text-gray-900">{data.code}</p>
                  </div>
                  <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" /> Expires {fmtDate(data.expiresAt)}
                  </p>
                </>
              )}
              {data.status === "redeemed" && (
                <div className="p-4 rounded-lg bg-gray-100 text-center">
                  <CheckCircle className="h-6 w-6 text-gray-500 mx-auto mb-1" />
                  <Badge variant="outline">Already redeemed{data.redeemedAt ? ` · ${fmtDate(data.redeemedAt)}` : ""}</Badge>
                </div>
              )}
              {data.status === "expired" && (
                <div className="p-4 rounded-lg bg-red-50 text-center">
                  <XCircle className="h-6 w-6 text-red-400 mx-auto mb-1" />
                  <Badge variant="outline" className="text-red-600 border-red-300">Expired {fmtDate(data.expiresAt)}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
