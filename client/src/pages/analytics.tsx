import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnalyticsDashboard from "@/components/analytics/analytics-dashboard";
import StatsCard from "@/components/ui/stats-card";
import { BarChart3, Users, TrendingUp, Shield } from "lucide-react";

export default function Analytics() {
  // Mock business ID for demo
  const businessId = "business-1";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/taps/stats", businessId],
    queryFn: () => 
      fetch(`/api/taps/stats?businessId=${businessId}`)
        .then(res => res.json()),
  });

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading analytics...</div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Real-Time Analytics</h1>
        <p className="text-xl text-gray-600">Track performance and optimize your campaigns</p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Taps"
            value={stats.totalTaps.toLocaleString()}
            icon={BarChart3}
            color="blue"
          />
          <StatsCard
            title="Active Customers"
            value={stats.activeCustomers.toLocaleString()}
            icon={Users}
            color="green"
          />
          <StatsCard
            title="Referrals"
            value={stats.referrals.toString()}
            icon={TrendingUp}
            color="yellow"
          />
          <StatsCard
            title="Conversion Rate"
            value={`${stats.conversionRate}%`}
            icon={TrendingUp}
            color="purple"
          />
        </div>
      )}

      {/* Main Analytics Dashboard */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <AnalyticsDashboard businessId={businessId} />
        </div>

        <div className="space-y-6">
          {/* Time Period Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Time Period</CardTitle>
            </CardHeader>
            <CardContent>
              <Select defaultValue="7days">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">Last 24 hours</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="3months">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Security Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="text-green-600 h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">All Systems Secure</p>
                  <p className="text-xs text-gray-500">No suspicious activity detected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Campaign Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Free Coffee Friday</span>
                    <span className="text-sm font-semibold text-gray-900">67%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: "67%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Loyalty Punch Card</span>
                    <span className="text-sm font-semibold text-gray-900">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: "45%" }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Weekend Special</span>
                    <span className="text-sm font-semibold text-gray-900">32%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full" style={{ width: "32%" }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
