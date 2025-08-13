import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SimpleSalesInput } from "@/components/analytics/simple-sales-input";
import cirqlbackLogo from "@assets/cirqlback-logo-transparent.png";
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
  Brain,
  Lightbulb,
  Loader2,
  Database
} from "lucide-react";

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedBusiness, setSelectedBusiness] = useState("all");
  const [showAIInsights, setShowAIInsights] = useState(false);

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
    queryFn: async () => {
      const response = await fetch("/api/businesses");
      if (!response.ok) throw new Error('Failed to fetch businesses');
      return response.json();
    },
  });

  // AI Predictive Analytics
  const { data: aiAnalytics, isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ['/api/ai/predictive-analytics', timeRange, selectedBusiness],
    queryFn: async () => {
      const historicalData = {
        timeRange,
        businessId: selectedBusiness,
        metrics: analytics || defaultAnalytics,
        customerBehavior: {
          averageVisits: 2.3,
          retentionRate: 0.68,
          seasonalTrends: ["summer_peak", "weekend_boost"],
          preferredTimes: ["10am-12pm", "3pm-5pm"]
        },
        campaignPerformance: {
          activeCount: 5,
          averageROI: 2.4,
          topPerforming: ["coffee_loyalty", "weekend_special"]
        }
      };
      return await apiRequest("POST", "/api/ai/predictive-analytics", historicalData);
    },
    enabled: !!analytics && showAIInsights
  });

  // AI Insights Generation Mutation
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const insightData = {
        businessType: "coffee_shop",
        currentPerformance: analytics || defaultAnalytics,
        timeframe: timeRange,
        goals: ["increase_retention", "boost_revenue", "optimize_operations"],
        challenges: ["seasonal_fluctuations", "weekend_traffic"],
        marketConditions: "competitive_local_market"
      };
      return await apiRequest("POST", "/api/ai/predictive-analytics", insightData);
    },
    onSuccess: () => {
      setShowAIInsights(true);
      refetchAI();
    }
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
              <div className="flex items-center mb-2">
                <img 
                  src={cirqlbackLogo} 
                  alt="Cirqlback" 
                  className="h-6 w-auto mr-3 logo-transparent"
                />
                <h1 className="text-3xl font-bold gradient-text">
                  Platform Analytics
                </h1>
              </div>
              <p className="text-gray-600 mt-1">AI-powered predictive analytics with customer health scoring, churn prediction, partnership revenue tracking, AR engagement, team challenges, and viral campaign performance across the complete ecosystem</p>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="real-data" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              Real Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* AI-Powered Predictive Insights */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-purple-800">
                    <Brain className="h-6 w-6 mr-2" />
                    AI Predictive Insights
                  </CardTitle>
                  <Button 
                    onClick={() => generateInsightsMutation.mutate()}
                    disabled={generateInsightsMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {generateInsightsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate AI Insights
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500 mr-2" />
                    <span className="text-purple-600">AI analyzing your business data...</span>
                  </div>
                )}
                
                {aiAnalytics?.analytics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Predictions */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-purple-800 flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Predictions
                        </h4>
                        {aiAnalytics.analytics.predictions?.map((prediction: any, index: number) => (
                          <div key={index} className="p-3 bg-white rounded-lg border">
                            <p className="font-medium text-gray-800">{prediction.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{prediction.description}</p>
                            <div className="flex items-center mt-2">
                              <Badge 
                                variant="outline" 
                                className={prediction.confidence >= 0.8 ? "text-green-600" : 
                                           prediction.confidence >= 0.6 ? "text-yellow-600" : "text-gray-600"}
                              >
                                {Math.round(prediction.confidence * 100)}% confidence
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Recommendations */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-purple-800 flex items-center">
                          <Lightbulb className="h-4 w-4 mr-2" />
                          AI Recommendations
                        </h4>
                        {aiAnalytics.analytics.recommendations?.map((rec: any, index: number) => (
                          <div key={index} className="p-3 bg-white rounded-lg border">
                            <p className="font-medium text-gray-800">{rec.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <Badge 
                                variant="outline" 
                                className={rec.priority === "high" ? "text-red-600" : 
                                           rec.priority === "medium" ? "text-yellow-600" : "text-green-600"}
                              >
                                {rec.priority} priority
                              </Badge>
                              {rec.expectedImpact && (
                                <span className="text-xs text-green-600 font-medium">
                                  +{rec.expectedImpact} impact
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Insights */}
                    {aiAnalytics.analytics.keyInsights && (
                      <div className="mt-6 p-4 bg-purple-100 rounded-lg">
                        <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                          <Eye className="h-4 w-4 mr-2" />
                          Key Business Insights
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {aiAnalytics.analytics.keyInsights.map((insight: any, index: number) => (
                            <div key={index} className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                              <p className="text-sm text-purple-700">{insight}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {!showAIInsights && !aiLoading && (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-purple-300 mb-3" />
                    <p className="text-purple-600 mb-4">Get AI-powered predictions and business insights</p>
                    <p className="text-sm text-gray-600">Our AI will analyze your data to provide personalized recommendations for growth</p>
                  </div>
                )}
              </CardContent>
            </Card>

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
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Performing Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Weekend Coffee Special", clicks: 847, conversions: 203, revenue: "$2,847" },
                      { name: "Loyalty Rewards Program", clicks: 612, conversions: 156, revenue: "$1,923" },
                      { name: "Happy Hour Tacos", clicks: 534, conversions: 127, revenue: "$1,456" }
                    ].map((campaign, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium">{campaign.name}</h4>
                          <p className="text-sm text-gray-600">{campaign.clicks} clicks • {campaign.conversions} conversions</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">{campaign.revenue}</div>
                          <div className="text-xs text-gray-500">{((campaign.conversions/campaign.clicks)*100).toFixed(1)}% CVR</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Campaign ROI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { campaign: "Weekend Coffee Special", spend: "$450", revenue: "$2,847", roi: "533%" },
                      { campaign: "Loyalty Rewards Program", spend: "$320", revenue: "$1,923", roi: "501%" },
                      { campaign: "Happy Hour Tacos", spend: "$280", revenue: "$1,456", roi: "420%" }
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{item.campaign}</span>
                          <Badge className="bg-green-100 text-green-800">{item.roi}</Badge>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Spend: {item.spend}</span>
                          <span>Revenue: {item.revenue}</span>
                        </div>
                        <Progress value={parseInt(item.roi)} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Timeline Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-4 mb-6">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
                    const values = [45, 52, 48, 61, 55, 67, 73];
                    return (
                      <div key={day} className="text-center">
                        <div className="text-xs text-gray-500 mb-2">{day}</div>
                        <div className={`h-${Math.floor(values[index]/10) + 8} bg-gradient-to-t from-blue-500 to-purple-500 rounded-t mx-auto w-8 mb-1`}></div>
                        <div className="text-xs font-medium">{values[index]}%</div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-sm text-gray-600">
                  Average campaign engagement rate by day of week
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Segments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { segment: "VIP Customers", count: 89, percentage: 12, color: "bg-purple-500" },
                      { segment: "Regular Visitors", count: 245, percentage: 34, color: "bg-blue-500" },
                      { segment: "Occasional", count: 178, percentage: 25, color: "bg-green-500" },
                      { segment: "New Customers", count: 203, percentage: 29, color: "bg-orange-500" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                          <span className="text-sm font-medium">{item.segment}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{item.count}</div>
                          <div className="text-xs text-gray-500">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Purchase Behavior</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">$47.30</div>
                      <div className="text-sm text-gray-600">Average Order Value</div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Visit Frequency</span>
                        <span className="text-sm font-medium">2.3x/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Retention Rate</span>
                        <span className="text-sm font-medium">68%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Loyalty Program</span>
                        <span className="text-sm font-medium">42% enrolled</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Peak Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { hour: "8-9 AM", traffic: 85, label: "Morning Rush" },
                      { hour: "12-1 PM", traffic: 95, label: "Lunch Peak" },
                      { hour: "3-4 PM", traffic: 65, label: "Afternoon" },
                      { hour: "6-7 PM", traffic: 78, label: "Evening" }
                    ].map((period, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{period.hour}</span>
                          <span className="font-medium">{period.traffic}%</span>
                        </div>
                        <Progress value={period.traffic} className="h-2" />
                        <div className="text-xs text-gray-500">{period.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customer Journey Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  {[
                    { stage: "Discovery", customers: 1247, conversion: "100%", color: "from-blue-500 to-blue-600" },
                    { stage: "First Visit", customers: 892, conversion: "71.5%", color: "from-green-500 to-green-600" },
                    { stage: "Return Visit", customers: 547, conversion: "61.3%", color: "from-orange-500 to-orange-600" },
                    { stage: "Loyalty Member", customers: 234, conversion: "42.8%", color: "from-purple-500 to-purple-600" }
                  ].map((stage, index) => (
                    <div key={index} className="text-center">
                      <div className={`w-16 h-16 bg-gradient-to-br ${stage.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                        <span className="text-white font-bold text-lg">{index + 1}</span>
                      </div>
                      <h4 className="font-semibold mb-1">{stage.stage}</h4>
                      <div className="text-2xl font-bold text-gray-900">{stage.customers.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">{stage.conversion} conversion</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Location Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { location: "Downtown Store", taps: 847, revenue: "$12,450", growth: "+23%" },
                      { location: "Mall Location", taps: 623, revenue: "$8,970", growth: "+18%" },
                      { location: "University Area", taps: 534, revenue: "$7,230", growth: "+31%" },
                      { location: "Suburban Plaza", taps: 412, revenue: "$5,680", growth: "+12%" }
                    ].map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <MapPin className="h-5 w-5 text-blue-500" />
                          <div>
                            <h4 className="font-medium">{location.location}</h4>
                            <p className="text-sm text-gray-600">{location.taps} taps this month</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{location.revenue}</div>
                          <Badge className="bg-green-100 text-green-800">{location.growth}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Geographic Heat Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-2 text-blue-500" />
                      <p className="text-sm text-gray-600">Interactive map visualization</p>
                      <p className="text-xs text-gray-500">Showing customer density by area</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">4.2km</div>
                      <div className="text-xs text-gray-600">Avg. Travel Distance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">85%</div>
                      <div className="text-xs text-gray-600">Local Market Share</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Regional Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">67%</div>
                    <div className="text-sm font-medium">Downtown Traffic</div>
                    <div className="text-xs text-gray-600">Highest conversion area</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">$52.30</div>
                    <div className="text-sm font-medium">Suburban AOV</div>
                    <div className="text-xs text-gray-600">Highest spending customers</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">3.4x</div>
                    <div className="text-sm font-medium">University Frequency</div>
                    <div className="text-xs text-gray-600">Most loyal customers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="real-data" className="space-y-6">
            <SimpleSalesInput />
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