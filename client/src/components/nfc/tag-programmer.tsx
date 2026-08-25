import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import UniversalNFCWriter from "@/components/nfc/ios-nfc-writer";
import { Store, AlertTriangle, Loader2 } from "lucide-react";

interface Business { id: string; name: string }
interface Campaign { id: string; name: string; type?: string }
interface CreatedTag { id: string; tagIdentifier?: string; tagUrl?: string }

// Printed identifier written to the tag record. The tap URL uses the internal
// id, but the schema requires a unique identifier, so mint one client-side
// (matches the server's fallback format).
function newTagIdentifier(index: number): string {
  return `CIRQL-${index}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * The real "self-write" flow: an authenticated business owner picks one of their
 * businesses + a campaign + a location, mints a real NFC tag (so /tap/<id>
 * resolves), then programs a physical tag with that URL via UniversalNFCWriter.
 */
export default function TagProgrammer() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [businessId, setBusinessId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [location, setLocationLabel] = useState("");
  const [createdTag, setCreatedTag] = useState<CreatedTag | null>(null);

  const { data: businesses = [], isLoading: bizLoading } = useQuery<Business[]>({
    queryKey: ["/api/my/businesses"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns", businessId],
    enabled: !!businessId,
    retry: false,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/campaigns?businessId=${encodeURIComponent(businessId)}`);
      return res.json();
    },
  });

  const selectedBusiness = businesses.find((b) => b.id === businessId);
  const selectedCampaign = campaigns.find((c) => c.id === campaignId);

  const createTag = useMutation({
    mutationFn: async (): Promise<CreatedTag> => {
      const res = await apiRequest("POST", "/api/nfc-tags", {
        businessId,
        campaignId: campaignId || undefined,
        location: location || undefined,
        tagIdentifier: newTagIdentifier(businesses.length + campaigns.length + 1),
      });
      return res.json();
    },
    onSuccess: (tag) => setCreatedTag(tag),
    onError: (err: any) =>
      toast({
        title: "Couldn't create tag",
        description: String(err?.message || "Please try again."),
        variant: "destructive",
      }),
  });

  const tapUrl = useMemo(() => {
    if (!createdTag) return "";
    return createdTag.tagUrl || `${window.location.origin}/tap/${createdTag.id}`;
  }, [createdTag]);

  // ── Not signed in ──
  if (!authLoading && !isAuthenticated) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-muted-foreground">
            Sign in to your business account to create and program Cirql tags.
          </p>
          <Button onClick={() => setLocation("/auth")}>Sign in</Button>
        </CardContent>
      </Card>
    );
  }

  // ── Tag created → hand off to the writer ──
  if (createdTag) {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <UniversalNFCWriter
          tagData={{
            url: tapUrl,
            campaignId: campaignId || undefined,
            businessName: selectedBusiness?.name,
            campaignType: selectedCampaign?.name || selectedCampaign?.type,
          }}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setCreatedTag(null);
            setCampaignId("");
            setLocationLabel("");
          }}
        >
          Create another tag
        </Button>
      </div>
    );
  }

  // ── Selection form ──
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" /> Create a Cirql tag
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {bizLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your businesses…
          </div>
        ) : businesses.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don’t have a business yet. Create one first, then come back to program a tag.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Business</Label>
              <Select value={businessId} onValueChange={(v) => { setBusinessId(v); setCampaignId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select a business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Campaign {campaigns.length === 0 && businessId ? "(none yet — optional)" : "(optional)"}</Label>
              <Select value={campaignId} onValueChange={setCampaignId} disabled={!businessId || campaigns.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={campaigns.length === 0 ? "No campaigns — tag will just record taps" : "Select a campaign"} />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A campaign is what awards points/rewards when a customer taps.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag-location">Tag location (optional)</Label>
              <Input
                id="tag-location"
                placeholder="e.g. Front counter"
                value={location}
                onChange={(e) => setLocationLabel(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              disabled={!businessId || createTag.isPending}
              onClick={() => createTag.mutate()}
            >
              {createTag.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</>
              ) : (
                "Create tag & continue"
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
