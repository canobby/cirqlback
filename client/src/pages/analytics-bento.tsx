import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, DollarSign, Clock,
  MapPin, Target, Zap, Gift,
  ArrowRight, Download, Filter, RefreshCw
} from "lucide-react";
import AdvancedAnalyticsSection from "@/components/merchant/advanced-analytics-section";

interface AnalyticsResponse {
  totalTaps: number;
  totalRevenue: number;
  activeCustomers: number;
  conversionRate: number;
  avgOrderValue: number;
  cirqlDrivenRevenue: number;
  rewardsIssued: number;
  rewardsRedeemed: number;
  newCustomers: number;
  returningCustomers: number;
  peakHour: string;
  topCampaigns: { id: string; name: string; taps: number; revenue: number }[];
  topLocations: { name: string; taps: number; percentage: number }[];
  recentActivity: { kind: string; action: string; timestamp: string | null; value: string }[];
  hourlyData: { hour: number; taps: number; revenue: number }[];
}

const EMPTY: AnalyticsResponse = {
  totalTaps: 0, totalRevenue: 0, activeCustomers: 0, conversionRate: 0,
  avgOrderValue: 0, cirqlDrivenRevenue: 0, rewardsIssued: 0, rewardsRedeemed: 0,
  newCustomers: 0, returningCustomers: 0, peakHour: "—",
  topCampaigns: [], topLocations: [], recentActivity: [], hourlyData: [],
};

function money(n: number): string {
  return `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

const activityColor: Record<string, string> = {
  tap: "bg-green-400",
  redemption: "bg-blue-400",
};

export default function AnalyticsBento() {
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState("week");

  const { data, isLoading, isError, refetch, isFetching } = useQuery<AnalyticsResponse>({
    queryKey: ["/api/analytics/dashboard"],
  });

  const a = data ?? EMPTY;
  const cirqlPct = a.totalRevenue > 0
    ? Math.round((a.cirqlDrivenRevenue / a.totalRevenue) * 100)
    : 0;
  const redemptionPct = a.rewardsIssued > 0
    ? Math.round((a.rewardsRedeemed / a.rewardsIssued) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
      <div className="container max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Analytics Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Business intelligence and performance insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8">
          <div className="flex gap-2">
            {["day", "week", "month", "quarter"].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={timeRange === range ? "bg-purple-600 text-white" : "text-gray-700 border-gray-300 hover:bg-gray-100"}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {isError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            Couldn't load analytics. Try refreshing.
          </div>
        )}
        {isLoading && (
          <div className="mb-6 text-gray-500 dark:text-gray-400">Loading analytics…</div>
        )}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-6 auto-rows-min">

          {/* Revenue - Large Hero Block */}
          <Card className="md:col-span-6 lg:col-span-4 bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Revenue Performance</h2>
                  <p className="text-green-100">Earnings breakdown</p>
                </div>
                <DollarSign className="h-12 w-12 text-green-100" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold mb-1">{money(a.totalRevenue)}</div>
                  <div className="text-green-100 text-sm mb-2">Total Revenue</div>
                </div>

                <div>
                  <div className="text-3xl font-bold mb-1">{money(a.avgOrderValue)}</div>
                  <div className="text-green-100 text-sm mb-2">Avg Order Value</div>
                </div>

                <div>
                  <div className="text-3xl font-bold mb-1">{money(a.cirqlDrivenRevenue)}</div>
                  <div className="text-green-100 text-sm mb-2">Cirql Impact</div>
                  <Badge className="bg-white/20 text-white border-white/30">
                    {cirqlPct}% of total
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Metrics - Tall Block */}
          <Card className="md:col-span-3 lg:col-span-2 md:row-span-2 bg-gradient-to-br from-blue-500 to-cyan-600 border-0 text-white">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8 text-blue-100" />
                <Badge className="bg-white/20 text-white border-white/30">Live</Badge>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-blue-100 mb-4">Customer Analytics</h3>

                <div className="space-y-6">
                  <div>
                    <div className="text-3xl font-bold mb-1">{a.activeCustomers}</div>
                    <div className="text-blue-100 text-sm mb-2">Active Customers</div>
                  </div>

                  <div>
                    <div className="text-2xl font-bold mb-1">{a.rewardsRedeemed}/{a.rewardsIssued}</div>
                    <div className="text-blue-100 text-sm mb-2">Rewards Redeemed</div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full" style={{ width: `${redemptionPct}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="text-lg font-bold mb-1">{a.newCustomers}</div>
                    <div className="text-blue-100 text-sm">New Customers</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card className="md:col-span-3 lg:col-span-2 bg-gradient-to-br from-purple-500 to-pink-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Target className="h-6 w-6 text-purple-100" />
              </div>
              <div className="text-3xl font-bold mb-1">{a.conversionRate}%</div>
              <p className="text-purple-100 text-sm">Reward Conversion</p>
            </CardContent>
          </Card>

          {/* NFC Taps */}
          <Card className="md:col-span-2 bg-gradient-to-br from-orange-500 to-red-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Zap className="h-6 w-6 text-orange-100" />
              </div>
              <div className="text-3xl font-bold mb-1">{a.totalTaps.toLocaleString()}</div>
              <p className="text-orange-100 text-sm">Total Taps</p>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card className="md:col-span-2 bg-gradient-to-br from-yellow-500 to-orange-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Clock className="h-6 w-6 text-yellow-100" />
                <Badge className="bg-white/20 text-white border-white/30">Peak</Badge>
              </div>
              <div className="text-3xl font-bold mb-1">{a.peakHour}</div>
              <p className="text-yellow-100 text-sm">Peak Hours</p>
            </CardContent>
          </Card>

          {/* Rewards Issued */}
          <Card className="md:col-span-2 bg-gradient-to-br from-pink-500 to-purple-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Gift className="h-6 w-6 text-pink-100" />
              </div>
              <div className="text-3xl font-bold mb-1">{a.rewardsIssued.toLocaleString()}</div>
              <p className="text-pink-100 text-sm">Rewards Issued</p>
            </CardContent>
          </Card>

          {/* Top Performing Locations */}
          <Card className="md:col-span-6 lg:col-span-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                Top Performing Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.topLocations.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
                  No tap activity yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {a.topLocations.map((location, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">#{idx + 1}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{location.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{location.taps} taps</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 dark:text-white">{location.percentage}%</div>
                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                          <div
                            className="h-2 bg-purple-500 rounded-full"
                            style={{ width: `${location.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="md:col-span-3 lg:col-span-4 bg-gradient-to-br from-indigo-500 to-purple-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-indigo-100">Live</span>
                </div>
              </div>

              {a.recentActivity.length === 0 ? (
                <div className="text-sm text-indigo-100 py-6 text-center">
                  No recent activity.
                </div>
              ) : (
                <div className="space-y-3">
                  {a.recentActivity.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-2 h-2 ${activityColor[item.kind] || "bg-purple-400"} rounded-full mr-3`}></div>
                        <span className="text-sm">{item.action}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.value && <span className="text-xs font-medium text-white">{item.value}</span>}
                        <span className="text-xs text-indigo-100">{relativeTime(item.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-white/30"
                variant="outline"
                onClick={() => setLocation('/merchant')}
              >
                View Merchant Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* CHR-67: advanced analytics pack (add-on) */}
        <AdvancedAnalyticsSection />
      </div>
    </div>
  );
}
