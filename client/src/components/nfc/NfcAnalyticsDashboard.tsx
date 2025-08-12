import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  MapPin, 
  Clock, 
  Users, 
  Zap,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  Smartphone
} from "lucide-react";

interface NfcAnalyticsDashboardProps {
  businessId: string;
}

interface TagAnalytics {
  id: string;
  location: string;
  totalTaps: number;
  uniqueCustomers: number;
  conversionRate: number;
  avgSessionTime: number;
  recentActivity: Array<{
    timestamp: string;
    customerEmail: string;
    action: string;
  }>;
  performanceMetrics: {
    dailyTaps: Array<{ date: string; taps: number }>;
    hourlyDistribution: Array<{ hour: number; taps: number }>;
    customerRetention: number;
    rewardsClaimed: number;
  };
}

export default function NfcAnalyticsDashboard({ businessId }: NfcAnalyticsDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");
  const [selectedTag, setSelectedTag] = useState<string>("all");

  // Fetch tag analytics
  const { data: tagAnalytics = [], isLoading } = useQuery({
    queryKey: [`/api/nfc-analytics?businessId=${businessId}&range=${selectedTimeRange}`],
    enabled: !!businessId
  });

  // Fetch NFC tags for filter
  const { data: tags = [] } = useQuery({
    queryKey: [`/api/nfc-tags?businessId=${businessId}`],
    enabled: !!businessId
  });

  // Calculate overall metrics
  const overallMetrics = {
    totalTaps: tagAnalytics.reduce((sum: number, tag: TagAnalytics) => sum + tag.totalTaps, 0),
    uniqueCustomers: tagAnalytics.reduce((sum: number, tag: TagAnalytics) => sum + tag.uniqueCustomers, 0),
    avgConversionRate: tagAnalytics.length > 0 
      ? tagAnalytics.reduce((sum: number, tag: TagAnalytics) => sum + tag.conversionRate, 0) / tagAnalytics.length 
      : 0,
    topPerformer: tagAnalytics.sort((a: TagAnalytics, b: TagAnalytics) => b.totalTaps - a.totalTaps)[0]
  };

  const timeRanges = [
    { value: "24h", label: "Last 24 Hours" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "90d", label: "Last 90 Days" }
  ];

  const getPerformanceColor = (taps: number) => {
    if (taps >= 100) return "text-green-600 bg-green-100";
    if (taps >= 50) return "text-blue-600 bg-blue-100";
    if (taps >= 20) return "text-yellow-600 bg-yellow-100";
    return "text-gray-600 bg-gray-100";
  };

  const getPerformanceLabel = (taps: number) => {
    if (taps >= 100) return "Excellent";
    if (taps >= 50) return "Good";
    if (taps >= 20) return "Fair";
    return "Needs Attention";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Loading analytics data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cirql Tag Analytics</h2>
          <p className="text-gray-600">Performance insights and customer engagement metrics</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Taps</p>
                <p className="text-2xl font-bold text-gray-900">{overallMetrics.totalTaps.toLocaleString()}</p>
                <p className="text-xs text-green-600">+23% from last period</p>
              </div>
              <Smartphone className="h-8 w-8 text-primary opacity-75" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Customers</p>
                <p className="text-2xl font-bold text-gray-900">{overallMetrics.uniqueCustomers.toLocaleString()}</p>
                <p className="text-xs text-green-600">+18% from last period</p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{overallMetrics.avgConversionRate.toFixed(1)}%</p>
                <p className="text-xs text-green-600">+5.2% from last period</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Top Performer</p>
                <p className="text-lg font-bold text-gray-900">
                  {overallMetrics.topPerformer?.location || "No data"}
                </p>
                <p className="text-xs text-blue-600">
                  {overallMetrics.topPerformer?.totalTaps || 0} taps
                </p>
              </div>
              <MapPin className="h-8 w-8 text-purple-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Tag Performance</TabsTrigger>
          <TabsTrigger value="trends">Usage Trends</TabsTrigger>
          <TabsTrigger value="customers">Customer Insights</TabsTrigger>
          <TabsTrigger value="locations">Location Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {tagAnalytics.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Yet</h3>
                <p className="text-gray-500">Tag performance data will appear here once customers start tapping your Cirql tags.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {tagAnalytics.map((tag: TagAnalytics) => (
                <Card key={tag.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{tag.location}</CardTitle>
                      <Badge className={getPerformanceColor(tag.totalTaps)}>
                        {getPerformanceLabel(tag.totalTaps)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Taps</p>
                        <p className="font-bold text-lg">{tag.totalTaps}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Unique Users</p>
                        <p className="font-bold text-lg">{tag.uniqueCustomers}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Conversion</p>
                        <p className="font-bold text-lg">{tag.conversionRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Session</p>
                        <p className="font-bold text-lg">{tag.avgSessionTime}s</p>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <h5 className="font-medium text-gray-900 mb-2">Recent Activity</h5>
                      <div className="space-y-1">
                        {tag.recentActivity?.slice(0, 3).map((activity, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{activity.action}</span>
                            <span className="text-gray-500">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Usage Trends Over Time
              </CardTitle>
              <CardDescription>
                Track how customer engagement changes throughout the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Trend visualization will appear here</p>
                  <p className="text-sm text-gray-400">Based on {selectedTimeRange} data</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Customer Segments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">First-time visitors</span>
                    <Badge variant="outline">64%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Returning customers</span>
                    <Badge variant="outline">36%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High engagement</span>
                    <Badge variant="outline">18%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Peak Usage Times
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Morning (8-12 PM)</span>
                    <Badge variant="outline">32%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Afternoon (12-5 PM)</span>
                    <Badge variant="outline">45%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Evening (5-9 PM)</span>
                    <Badge variant="outline">23%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Location Performance Comparison
              </CardTitle>
              <CardDescription>
                Compare engagement rates across different tag placement locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tagAnalytics.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-gray-500">
                  No location data available
                </div>
              ) : (
                <div className="space-y-4">
                  {tagAnalytics.map((tag: TagAnalytics, index: number) => (
                    <div key={tag.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                          <span className="text-white text-sm font-bold">{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium">{tag.location}</h4>
                          <p className="text-sm text-gray-600">{tag.totalTaps} total taps</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getPerformanceColor(tag.totalTaps)}>
                          {getPerformanceLabel(tag.totalTaps)}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">
                          {tag.conversionRate.toFixed(1)}% conversion
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}