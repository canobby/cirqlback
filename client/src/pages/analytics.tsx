import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LiveDashboard from "@/components/realtime/live-dashboard";
import PredictiveAnalytics from "@/components/ai/predictive-analytics";
import PaymentIntegration from "@/components/integrations/payment-integration";
import MultiLocationManager from "@/components/enterprise/multi-location";
import PWAFeatures from "@/components/mobile/pwa-features";
import BlockchainFeatures from "@/components/web3/blockchain-features";

export default function Analytics() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Advanced Analytics & Enterprise Suite</h1>
          <p className="text-gray-600">Complete business intelligence, predictive insights, and enterprise-grade features</p>
        </div>

        <Tabs defaultValue="live" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="live">Live Dashboard</TabsTrigger>
            <TabsTrigger value="ai">AI Analytics</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
            <TabsTrigger value="mobile">Mobile PWA</TabsTrigger>
            <TabsTrigger value="web3">Web3 & Crypto</TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            <LiveDashboard />
          </TabsContent>

          <TabsContent value="ai">
            <PredictiveAnalytics />
          </TabsContent>

          <TabsContent value="integrations">
            <PaymentIntegration />
          </TabsContent>

          <TabsContent value="enterprise">
            <MultiLocationManager />
          </TabsContent>

          <TabsContent value="mobile">
            <PWAFeatures />
          </TabsContent>

          <TabsContent value="web3">
            <BlockchainFeatures />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}