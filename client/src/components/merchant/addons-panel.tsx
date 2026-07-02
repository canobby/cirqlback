import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Check, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Biz { id: string; name: string }
interface AddonDef { key: string; name: string; priceCents: number; blurb: string; includedInTiers?: string[] }
interface Entitlement { id: string; addonKey: string; status: string; source?: string }

const TIER_LABEL: Record<string, string> = { core: "Core", pro: "Pro", starter: "Starter" };

// CHR-35/65/66: per-business add-on status for the signed-in merchant.
// Self-contained (mirrors GroupCampaignsPanel) so it drops into the merchant
// page without depending on its state. Purchase runs through Stripe checkout
// (create-payment-intent type=addon) once live keys are configured. Add-ons a
// plan includes for free (e.g. hosted_website on Pro) show "Included", not a price.
export default function AddonsPanel() {
  const { user } = useAuth();
  const tier = (user?.subscriptionTier as string) || "starter";

  const { data: myBiz } = useQuery<Biz[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const businessId = myBiz?.[0]?.id;

  const { data: catalog = [] } = useQuery<AddonDef[]>({ queryKey: ["/api/addons/catalog"], retry: false });
  const { data: entitlements = [] } = useQuery<Entitlement[]>({
    queryKey: [`/api/businesses/${businessId}/addons`],
    enabled: !!businessId,
    retry: false,
  });

  if (!businessId) return null;

  const active = new Map(
    (entitlements || []).filter((e) => e.status === "active").map((e) => [e.addonKey, e]),
  );

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
            const ent = active.get(a.key);
            const isActive = !!ent;
            const includedInPlan = (a.includedInTiers ?? []).includes(tier);
            // "Included" = granted free by the plan (either the server marked the
            // entitlement source, or the plan simply includes it).
            const included = ent?.source === "included" || (includedInPlan && !ent);
            return (
              <div
                key={a.key}
                className={`p-4 rounded-lg border ${isActive ? "border-green-300 bg-green-50/50" : "border-gray-200 bg-gray-50"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-gray-900">{a.name}</div>
                  {included ? (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs flex items-center gap-1">
                      <Check className="h-3 w-3" /> Included with {TIER_LABEL[tier] ?? tier}
                    </Badge>
                  ) : isActive ? (
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
                {a.key === "map_priority" && isActive && (
                  <p className="mt-2 text-xs text-green-700 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Your business is boosted on the discovery map.
                  </p>
                )}
                {a.key === "hosted_website" && isActive && (
                  <p className="mt-2 text-xs text-green-700 flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Your one-page site is enabled — customize and publish it from your dashboard.
                  </p>
                )}
                {a.key === "hosted_website" && !isActive && a.includedInTiers?.length ? (
                  <p className="mt-2 text-xs text-gray-400">
                    Free on {a.includedInTiers.map((t) => TIER_LABEL[t] ?? t).join(", ")}.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
