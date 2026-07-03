import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, Package, DollarSign, CheckCircle2, XCircle } from "lucide-react";

interface Config { integrations: Record<string, boolean> }
interface AddonDef { key: string; name: string; priceCents: number; includedInTiers?: string[] }
interface Plan { id: string; name: string; price: number; yearlyPrice: number }

const usd = (c: number) => "$" + (c / 100).toFixed(2);
const INTEGRATION_LABELS: Record<string, string> = {
  database: "Database (Neon)", stripe: "Stripe (payments)", stripeWebhook: "Stripe webhook",
  googleMaps: "Google Maps", openai: "OpenAI (AI features)",
};

// Platform tab: read-only view of what's configured — integration/key status
// (booleans, never secrets), the add-on catalog + tier inclusions, and pricing.
export default function PlatformConfigPanel() {
  const { data: config } = useQuery<Config>({ queryKey: ["/api/admin/platform-config"], retry: false });
  const { data: addons = [] } = useQuery<AddonDef[]>({ queryKey: ["/api/addons/catalog"], retry: false });
  const { data: plans = [] } = useQuery<Plan[]>({ queryKey: ["/api/subscription/plans"], retry: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4 text-purple-600" /> Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {config && Object.entries(config.integrations).map(([key, ok]) => (
              <div key={key} className="flex items-center gap-2 rounded-md border border-gray-200 p-2 text-sm">
                {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
                <span className="text-gray-700">{INTEGRATION_LABELS[key] || key}</span>
                <span className={`ml-auto text-xs ${ok ? "text-green-600" : "text-red-500"}`}>{ok ? "Configured" : "Not set"}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Shows only whether each key is present — never the values.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4 text-purple-600" /> Add-on catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {addons.map((a) => (
              <div key={a.key} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-700">{a.name}</span>
                <span className="flex items-center gap-2">
                  {a.includedInTiers && a.includedInTiers.length > 0 && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">free on {a.includedInTiers.join(", ")}</Badge>
                  )}
                  <span className="font-medium text-gray-900">{usd(a.priceCents)}/mo</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4 text-green-600" /> Plan pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plans.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-700">{p.name}</span>
                <span className="font-medium text-gray-900">
                  {p.price > 0 ? `$${p.price}/mo` : "Free"}{p.yearlyPrice > 0 ? ` · $${p.yearlyPrice}/yr` : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
