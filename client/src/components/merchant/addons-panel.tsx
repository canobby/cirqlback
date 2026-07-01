import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Check } from "lucide-react";

interface Biz { id: string; name: string }
interface AddonDef { key: string; name: string; priceCents: number; blurb: string }
interface Entitlement { id: string; addonKey: string; status: string }

// CHR-35/65/66: per-business add-on status for the signed-in merchant.
// Self-contained (mirrors GroupCampaignsPanel) so it drops into the merchant
// page without depending on its state. Purchase runs through Stripe checkout
// (create-payment-intent type=addon) once live keys are configured.
export default function AddonsPanel() {
  const { data: myBiz } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const businessId = myBiz?.[0]?.id;

  const { data: catalog = [] } = useQuery<AddonDef[]>({ queryKey: ["/api/addons/catalog"], retry: false });
  const { data: entitlements = [] } = useQuery<Entitlement[]>({
    queryKey: [`/api/businesses/${businessId}/addons`],
    enabled: !!businessId,
    retry: false,
  });

  if (!businessId) return null;

  const activeKeys = new Set((entitlements || []).filter((e) => e.status === "active").map((e) => e.addonKey));

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Add-ons
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {catalog.map((a) => {
            const active = activeKeys.has(a.key);
            return (
              <div
                key={a.key}
                className={`p-4 rounded-lg border ${active ? "border-green-300 bg-green-50/50" : "border-gray-200 bg-gray-50"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-gray-900">{a.name}</div>
                  {active ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs flex items-center gap-1">
                      <Check className="h-3 w-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-gray-500">
                      ${(a.priceCents / 100).toFixed(2)}/mo
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">{a.blurb}</p>
                {a.key === "map_priority" && active && (
                  <p className="mt-2 text-xs text-green-700 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Your business is boosted on the discovery map.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
