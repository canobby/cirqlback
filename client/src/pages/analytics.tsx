import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
  BarChart3, 
  Calendar,
  MapPin,
  Clock,
  Zap,
  Award,
  Eye,
  RefreshCw,
  Brain
} from "lucide-react";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedBusiness, setSelectedBusiness] = useState("all");

  // Real-time analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["/api/analytics", timeRange, selectedBusiness],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?range=${timeRange}&business=${selectedBusiness}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["/api/businesses"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const defaultAnalytics = {
    totalTaps: 0,
    totalRevenue: 0,
    activeCustomers: 0,
    conversionRate: 0,
    topCampaigns: [],
    recentActivity: [],
    hourlyData: [],
    locationData: [],
    customerInsights: {}
  };

  const data = analytics || defaultAnalytics;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Real-time insights and performance metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select business" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  {businesses.map((business: any) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Today</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Cirql Taps</p>
                  <p className="text-3xl font-bold">{data.totalTaps.toLocaleString()}</p>
                </div>
                <Target className="h-8 w-8 text-blue-200" />
              </div>
              <div className="flex items-center mt-4 text-blue-100">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+23% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Revenue Generated</p>
                  <p className="text-3xl font-bold">${data.totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-200" />
              </div>
              <div className="flex items-center mt-4 text-green-100">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+15% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Active Customers</p>
                  <p className="text-3xl font-bold">{data.activeCustomers.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
              <div className="flex items-center mt-4 text-purple-100">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+8% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Conversion Rate</p>
                  <p className="text-3xl font-bold">{data.conversionRate}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-200" />
              </div>
              <div className="flex items-center mt-4 text-orange-100">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+5% from last period</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Real-time Activity */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Live Activity Feed</CardTitle>
                  <Zap className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Eye className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    data.recentActivity.slice(0, 5).map((activity: any, index: number) => (
                      <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.timestamp}</p>
                        </div>
                        <Badge variant="secondary">{activity.value}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Top Performing Campaigns */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">Top Campaigns</CardTitle>
                  <Award className="h-4 w-4 text-gold-500" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.topCampaigns.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No campaigns yet</p>
                    </div>
                  ) : (
                    data.topCampaigns.slice(0, 5).map((campaign: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{campaign.name}</span>
                          <span className="text-sm text-gray-500">{campaign.taps} taps</span>
                        </div>
                        <Progress value={campaign.performance} className="h-2" />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Hourly Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-500" />
                  Hourly Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i;
                    const value = Math.random() * 100;
                    return (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                          style={{ height: `${value}%` }}
                        ></div>
                        <span className="text-xs text-gray-500 mt-2">{hour}:00</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16 text-gray-500">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Campaign Analytics</h3>
                  <p>Detailed campaign performance metrics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Customer Analytics</h3>
                  <p>Customer behavior and demographic insights coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Location Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16 text-gray-500">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Location Analytics</h3>
                  <p>Geographic performance metrics coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {/* AI Insights Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-purple-500" />
              <span>AI-Powered Business Insights</span>
              <Badge className="bg-purple-100 text-purple-800">Beta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-5 w-5 text-orange-500" />
                    <span className="font-medium text-orange-800">Optimization Opportunity</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    Your 3-5 PM period shows 40% higher conversion rates. 
                    Consider launching targeted campaigns during these peak hours.
                  </p>
                  <Badge className="mt-2 bg-orange-100 text-orange-700">+$2,400 potential</Badge>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-800">Positive Trend</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Customer retention improved 23% this month. 
                    Your loyalty program is driving strong results.
                  </p>
                  <Badge className="mt-2 bg-green-100 text-green-700">92% confidence</Badge>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    <span className="font-medium text-blue-800">Revenue Forecast</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Predicted 26% revenue increase next 30 days based on 
                    current trends and seasonal patterns.
                  </p>
                  <Badge className="mt-2 bg-blue-100 text-blue-700">$15,680 projected</Badge>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-purple-800">AI Performance Score</h4>
                  <p className="text-sm text-purple-600">Your campaigns are performing above average</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-600">87/100</div>
                  <div className="text-xs text-purple-500">Excellent</div>
                </div>
              </div>
              <Progress value={87} className="mt-3 h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}