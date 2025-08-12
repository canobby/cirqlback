import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebSocket } from "@/lib/websocket";
import { BarChart3, Activity } from "lucide-react";
import { useEffect, useState } from "react";

interface AnalyticsDashboardProps {
  businessId: string;
}

interface ChartData {
  day: string;
  taps: number;
}

export default function AnalyticsDashboard({ businessId }: AnalyticsDashboardProps) {
  const [chartData, setChartData] = useState<ChartData[]>([
    { day: "Mon", taps: 120 },
    { day: "Tue", taps: 80 },
    { day: "Wed", taps: 160 },
    { day: "Thu", taps: 140 },
    { day: "Fri", taps: 200 },
    { day: "Sat", taps: 180 },
    { day: "Sun", taps: 100 },
  ]);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics", businessId],
    queryFn: () => 
      fetch(`/api/analytics?businessId=${businessId}`)
        .then(res => res.json()),
  });

  // WebSocket for real-time updates
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'new_tap') {
      // Update chart data with new tap
      const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
      setChartData(prev => 
        prev.map(item => 
          item.day === today 
            ? { ...item, taps: item.taps + 1 }
            : item
        )
      );
    }
  }, [lastMessage]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          Loading analytics...
        </CardContent>
      </Card>
    );
  }

  const maxTaps = Math.max(...chartData.map(d => d.taps));

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Tap Activity
          </CardTitle>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 3 months</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Simple Bar Chart */}
        <div className="h-64 flex items-end justify-between space-x-2 mb-4">
          {chartData.map((item) => {
            const height = (item.taps / maxTaps) * 200;
            return (
              <div key={item.day} className="flex flex-col items-center space-y-2 flex-1">
                <div 
                  className="w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary/80 min-h-[4px] flex items-end justify-center"
                  style={{ height: `${height}px` }}
                >
                  <span className="text-white text-xs font-medium mb-1 opacity-0 hover:opacity-100 transition-opacity">
                    {item.taps}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-medium">{item.day}</span>
              </div>
            );
          })}
        </div>

        {/* Real-time indicator */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Tap counts by day</span>
          <div className="flex items-center">
            <Activity className="h-3 w-3 mr-1 text-green-500" />
            <span className="text-green-600">Live updates</span>
          </div>
        </div>

        {/* Summary stats */}
        {analytics && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total Taps</p>
              <p className="text-xl font-bold text-blue-900">{analytics.totalTaps}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Unique Customers</p>
              <p className="text-xl font-bold text-green-900">{analytics.uniqueCustomers}</p>
            </div>
          </div>
        )}

        {/* Campaign Performance */}
        {analytics?.campaignPerformance && analytics.campaignPerformance.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-3">Campaign Performance</h4>
            <div className="space-y-2">
              {analytics.campaignPerformance.slice(0, 3).map((campaign: any) => (
                <div key={campaign.campaignName} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{campaign.campaignName}</span>
                  <span className="text-sm font-semibold text-gray-900">{campaign.taps} taps</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
