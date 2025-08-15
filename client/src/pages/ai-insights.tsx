import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  Award,
  MapPin,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Search,
  ArrowUp,
  ArrowDown,
  Activity,
  Shield,
  Sparkles,
  Loader2,
  Lightbulb
} from "lucide-react";

export default function AIInsights() {
  const [selectedBusiness, setSelectedBusiness] = useState("all");
  const [timeRange, setTimeRange] = useState("30d");
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Real AI business insights
  const { data: aiInsights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ['/api/ai/business-insights', selectedBusiness, timeRange],
    queryFn: async () => {
      const businessData = {
        type: "Coffee Shop",
        revenue: 25000,
        customers: 847,
        campaigns: 7,
        location: "Downtown District"
      };
      return await apiRequest("POST", "/api/ai/business-insights", businessData);
    }
  });

  // Real AI pricing optimization
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['/api/ai/pricing-optimization', selectedBusiness],
    queryFn: async () => {
      const pricingInput = {
        businessType: "Coffee Shop",
        currentPrices: [
          { item: "Coffee", price: 4.50, volume: 200 },
          { item: "Lunch Special", price: 12.99, volume: 85 },
          { item: "Happy Hour", price: 6.00, volume: 120 },
          { item: "Weekend Brunch", price: 18.00, volume: 45 }
        ],
        location: "Downtown District"
      };
      return await apiRequest("POST", "/api/ai/pricing-optimization", pricingInput);
    }
  });

  // Real AI predictive analytics
  const { data: predictiveData, isLoading: predictiveLoading } = useQuery({
    queryKey: ['/api/ai/predictive-analytics', timeRange],
    queryFn: async () => {
      const historicalData = {
        businessType: "Coffee Shop",
        monthlyRevenue: [22000, 24000, 23500, 25000, 26500, 25800],
        customerCount: [780, 820, 810, 847, 890, 875],
        campaignPerformance: [
          { name: "Morning Rush", roi: 3.2, engagement: 78 },
          { name: "Loyalty Program", roi: 4.1, engagement: 85 },
          { name: "Social Media", roi: 2.8, engagement: 65 }
        ],
        seasonality: "Spring"
      };
      return await apiRequest("POST", "/api/ai/predictive-analytics", historicalData);
    }
  });

  // Real AI customer behavior analysis
  const { data: customerAnalysis, isLoading: customerLoading } = useQuery({
    queryKey: ['/api/ai/customer-behavior', timeRange],
    queryFn: async () => {
      const customerData = {
        segments: [
          { name: "High Value", size: 245, avgSpend: 25.50, frequency: 4.2 },
          { name: "Regular", size: 892, avgSpend: 12.75, frequency: 2.1 },
          { name: "Occasional", size: 456, avgSpend: 8.25, frequency: 0.8 }
        ],
        behaviors: [
          { action: "Coffee Purchase", frequency: 340, timeOfDay: "morning" },
          { action: "Lunch Order", frequency: 120, timeOfDay: "noon" },
          { action: "Social Check-in", frequency: 85, timeOfDay: "afternoon" }
        ],
        preferences: [
          { category: "Payment", preference: "contactless", strength: 78 },
          { category: "Rewards", preference: "instant", strength: 92 },
          { category: "Communication", preference: "app", strength: 65 }
        ]
      };
      return await apiRequest("POST", "/api/ai/customer-behavior", customerData);
    }
  });

  // Refresh all AI insights
  const refreshMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        refetchInsights(),
        // Add other refetch calls as needed
      ]);
    },
    onSuccess: () => {
      toast({
        title: "AI Insights Updated",
        description: "All insights have been refreshed with latest data.",
      });
      setRefreshing(false);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to refresh AI insights. Please try again.",
        variant: "destructive",
      });
      setRefreshing(false);
    }
  });

  // Mock data for AI insights
  const customerHealthData = [
    { name: "Week 1", healthy: 85, atrisk: 10, churned: 5 },
    { name: "Week 2", healthy: 82, atrisk: 12, churned: 6 },
    { name: "Week 3", healthy: 88, atrisk: 8, churned: 4 },
    { name: "Week 4", healthy: 90, atrisk: 7, churned: 3 }
  ];

  const churnPredictionData = [
    { segment: "High Value", risk: 15, customers: 245 },
    { segment: "Regular", risk: 28, customers: 892 },
    { segment: "New", risk: 45, customers: 156 },
    { segment: "Inactive", risk: 78, customers: 89 }
  ];

  const pricingOptimizationData = [
    { product: "Coffee", current: 4.50, optimized: 5.25, lift: 16.7 },
    { product: "Lunch Special", current: 12.99, optimized: 14.50, lift: 11.6 },
    { product: "Happy Hour", current: 6.00, optimized: 5.50, lift: -8.3 },
    { product: "Weekend Brunch", current: 18.00, optimized: 21.00, lift: 16.7 }
  ];

  const marketIntelligenceData = [
    { competitor: "Coffee Corner", distance: "0.2mi", pricing: "10% lower", traffic: "High", threat: "Medium" },
    { competitor: "Brew & Bite", distance: "0.4mi", pricing: "5% higher", traffic: "Medium", threat: "Low" },
    { competitor: "Morning Rush", distance: "0.3mi", pricing: "15% lower", traffic: "Low", threat: "High" }
  ];

  const weatherImpactData = [
    { condition: "Sunny", traffic: 125, revenue: 1850 },
    { condition: "Rainy", traffic: 78, revenue: 1200 },
    { condition: "Cloudy", traffic: 95, revenue: 1450 },
    { condition: "Hot", traffic: 110, revenue: 1650 }
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    refreshMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <Brain className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Business Intelligence
                </h1>
              </div>
              <p className="text-gray-600 text-lg">
                Predictive analytics, customer health scoring, and AI-powered business optimization
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select business" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  <SelectItem value="cafe">Downtown Cafe</SelectItem>
                  <SelectItem value="restaurant">Bistro 21</SelectItem>
                  <SelectItem value="retail">Fashion Hub</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                className="flex items-center gap-2"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* AI Insights Tabs */}
        <Tabs defaultValue="ai-insights" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-6 min-w-max lg:w-full">
              <TabsTrigger value="ai-insights" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Brain className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">AI Insights</span>
              </TabsTrigger>
              <TabsTrigger value="health-scoring" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Activity className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Health</span>
              </TabsTrigger>
              <TabsTrigger value="churn-prediction" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Churn</span>
              </TabsTrigger>
              <TabsTrigger value="pricing-optimization" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <DollarSign className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Pricing</span>
              </TabsTrigger>
              <TabsTrigger value="market-intelligence" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Target className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Market</span>
              </TabsTrigger>
              <TabsTrigger value="weather-insights" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Sparkles className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Weather</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Real AI Insights Tab */}
          <TabsContent value="ai-insights" className="space-y-6">
            {insightsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <span className="ml-2 text-lg">AI analyzing your business data...</span>
              </div>
            ) : (
              <div className="grid gap-6">
                {/* Business Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      AI Business Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {aiInsights?.insights?.map((insight: any, index: number) => (
                        <div key={index} className="p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'default' : 'secondary'}>
                                  {insight.priority} priority
                                </Badge>
                                <Badge variant="outline">{insight.category}</Badge>
                                {insight.actionable && <Badge className="bg-green-100 text-green-700">Actionable</Badge>}
                              </div>
                              <p className="text-gray-700">{insight.insight}</p>
                            </div>
                          </div>
                        </div>
                      )) || (
                        <div className="text-center py-6 text-gray-500">
                          No AI insights available. Click refresh to generate new insights.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Predictive Analytics */}
                {predictiveData && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                          Customer Retention Prediction
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span>Current Retention Rate</span>
                            <span className="font-bold">{(predictiveData as any)?.customerRetention?.current}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Predicted Next Quarter</span>
                            <span className="font-bold text-blue-600">{(predictiveData as any)?.customerRetention?.predicted}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={(predictiveData as any)?.customerRetention?.trend === 'increasing' ? 'default' : 'destructive'}>
                              {(predictiveData as any)?.customerRetention?.trend}
                            </Badge>
                          </div>
                          <div className="pt-2">
                            <p className="text-sm text-gray-600 mb-2">Key Factors:</p>
                            <ul className="text-sm text-gray-700 space-y-1">
                              {(predictiveData as any)?.customerRetention?.factors?.map((factor: string, idx: number) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  {factor}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-green-500" />
                          Revenue Growth Forecast
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span>Next Quarter Growth</span>
                            <span className="font-bold text-green-600">{(predictiveData as any)?.revenueGrowth?.nextQuarter}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Confidence Level</span>
                            <span className="font-bold">{(predictiveData as any)?.revenueGrowth?.confidence}%</span>
                          </div>
                          <div className="pt-2">
                            <p className="text-sm text-gray-600 mb-2">Key Drivers:</p>
                            <ul className="text-sm text-gray-700 space-y-1">
                              {(predictiveData as any)?.revenueGrowth?.keyDrivers?.map((driver: string, idx: number) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  {driver}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Customer Behavior Analysis */}
                {customerAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-500" />
                        Customer Behavior Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {(customerAnalysis as any)?.segments?.map((segment: any, index: number) => (
                          <div key={index} className="p-4 rounded-lg border">
                            <h4 className="font-semibold text-lg mb-2">{segment.name} Segment</h4>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-2">Key Insights:</p>
                                <ul className="text-sm space-y-1">
                                  {segment.insights?.map((insight: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                      {insight}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-2">Recommendations:</p>
                                <ul className="text-sm space-y-1">
                                  {segment.recommendations?.map((rec: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Customer Health Scoring */}
          <TabsContent value="health-scoring" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">Healthy Customers</p>
                      <p className="text-3xl font-bold">1,247</p>
                      <p className="text-sm text-green-100 flex items-center gap-1 mt-1">
                        <ArrowUp className="h-4 w-4" />
                        +8.2% from last month
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-green-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100">At-Risk Customers</p>
                      <p className="text-3xl font-bold">186</p>
                      <p className="text-sm text-orange-100 flex items-center gap-1 mt-1">
                        <ArrowDown className="h-4 w-4" />
                        -12% from last month
                      </p>
                    </div>
                    <AlertTriangle className="h-12 w-12 text-orange-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100">High Churn Risk</p>
                      <p className="text-3xl font-bold">47</p>
                      <p className="text-sm text-red-100 flex items-center gap-1 mt-1">
                        <ArrowUp className="h-4 w-4" />
                        +3 new this week
                      </p>
                    </div>
                    <TrendingDown className="h-12 w-12 text-red-100" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">AI Health Score</p>
                      <p className="text-3xl font-bold">8.7/10</p>
                      <p className="text-sm text-purple-100 flex items-center gap-1 mt-1">
                        <ArrowUp className="h-4 w-4" />
                        Excellent health
                      </p>
                    </div>
                    <Brain className="h-12 w-12 text-purple-100" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Customer Health Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={customerHealthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="healthy" stroke="#10B981" strokeWidth={3} />
                      <Line type="monotone" dataKey="atrisk" stroke="#F59E0B" strokeWidth={3} />
                      <Line type="monotone" dataKey="churned" stroke="#EF4444" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top At-Risk Customers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Sarah Johnson", risk: 85, value: "$2,450", lastVisit: "12 days ago" },
                      { name: "Mike Chen", risk: 72, value: "$1,890", lastVisit: "8 days ago" },
                      { name: "Emma Davis", risk: 68, value: "$3,100", lastVisit: "15 days ago" },
                      { name: "Alex Rodriguez", risk: 61, value: "$1,750", lastVisit: "6 days ago" }
                    ].map((customer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-gray-500">LTV: {customer.value}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={customer.risk > 70 ? "destructive" : "secondary"}>
                            {customer.risk}% risk
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">{customer.lastVisit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Churn Prediction */}
          <TabsContent value="churn-prediction" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Churn Risk by Segment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={churnPredictionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="segment" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="risk" fill="#EF4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Automated Win-Back Campaigns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { campaign: "20% Off Return Offer", sent: 47, opened: 32, converted: 8, status: "Active" },
                      { campaign: "Personal Chef Invitation", sent: 23, opened: 19, converted: 12, status: "Active" },
                      { campaign: "VIP Experience Package", sent: 15, opened: 12, converted: 7, status: "Completed" }
                    ].map((campaign, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{campaign.campaign}</h4>
                          <Badge variant={campaign.status === "Active" ? "default" : "secondary"}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Sent</p>
                            <p className="font-medium">{campaign.sent}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Opened</p>
                            <p className="font-medium">{campaign.opened}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Converted</p>
                            <p className="font-medium text-green-600">{campaign.converted}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pricing Optimization */}
          <TabsContent value="pricing-optimization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  AI-Powered Pricing Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pricingOptimizationData.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-lg">{item.product}</h4>
                        <Badge variant={item.lift > 0 ? "default" : "secondary"}>
                          {item.lift > 0 ? '+' : ''}{item.lift}% Revenue Impact
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Current Price</p>
                          <p className="text-xl font-bold">${item.current}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">AI Recommended</p>
                          <p className="text-xl font-bold text-green-600">${item.optimized}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Projected Lift</p>
                          <p className={`text-xl font-bold ${item.lift > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.lift > 0 ? '+' : ''}{item.lift}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market Intelligence */}
          <TabsContent value="market-intelligence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Local Competition Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marketIntelligenceData.map((competitor, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-gray-400" />
                          <div>
                            <h4 className="font-medium">{competitor.competitor}</h4>
                            <p className="text-sm text-gray-500">{competitor.distance} away</p>
                          </div>
                        </div>
                        <Badge variant={
                          competitor.threat === "High" ? "destructive" : 
                          competitor.threat === "Medium" ? "secondary" : "outline"
                        }>
                          {competitor.threat} Threat
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Pricing</p>
                          <p className="font-medium">{competitor.pricing}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Traffic</p>
                          <p className="font-medium">{competitor.traffic}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Distance</p>
                          <p className="font-medium">{competitor.distance}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weather Insights */}
          <TabsContent value="weather-insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Weather Impact Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weatherImpactData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="condition" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="traffic" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Tomorrow's AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-blue-100">Sunny, 75°F</Badge>
                      </div>
                      <h4 className="font-medium text-blue-800 mb-1">High Traffic Expected</h4>
                      <p className="text-sm text-blue-600">
                        Increase outdoor seating capacity by 30%. Consider lunch special promotions.
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Afternoon thunderstorms</Badge>
                      </div>
                      <h4 className="font-medium mb-1">Reduced Traffic Expected</h4>
                      <p className="text-sm text-gray-600">
                        Focus on delivery/takeout. Launch 20% off delivery promotion.
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-green-100">Perfect Weather</Badge>
                      </div>
                      <h4 className="font-medium text-green-800 mb-1">Optimal Conditions</h4>
                      <p className="text-sm text-green-600">
                        Peak performance day. Consider premium pricing on signature items.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}