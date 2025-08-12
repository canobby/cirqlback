import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Brain, TrendingUp, AlertTriangle, Users, Target, Zap, DollarSign, Calendar, CloudRain, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CustomerHealthScore {
  id: string;
  userId: string;
  businessId: string;
  healthScore: number;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  visitPrediction: number;
  spendingPrediction: number;
  riskFactors: string[];
  retentionStrategies: string[];
  lastCalculated: string;
}

interface PredictivePricing {
  id: string;
  businessId: string;
  itemCategory: string;
  currentPrice: number;
  suggestedPrice: number;
  priceChangeReason: string;
  expectedDemandChange: number;
  expectedRevenueImpact: number;
  marketFactors: {
    weather: string;
    events: string[];
    competition: string;
    seasonality: string;
  };
  validFrom: string;
  validUntil: string;
}

interface LocalMarketData {
  id: string;
  businessId: string;
  dataType: 'weather_impact' | 'traffic_patterns' | 'event_correlation' | 'competitor_analysis';
  date: string;
  dataPoints: any;
  insights: string;
  recommendations: string[];
  confidenceScore: number;
  isActionable: boolean;
}

export default function AIInsights() {
  const queryClient = useQueryClient();

  const { data: healthScores = [], isLoading: loadingHealth } = useQuery({
    queryKey: ["/api/ai/customer-health"],
  });

  const { data: pricingRecommendations = [], isLoading: loadingPricing } = useQuery({
    queryKey: ["/api/ai/predictive-pricing"],
  });

  const { data: marketData = [], isLoading: loadingMarket } = useQuery({
    queryKey: ["/api/ai/market-intelligence"],
  });

  const { data: weatherTriggers = [], isLoading: loadingWeather } = useQuery({
    queryKey: ["/api/ai/weather-triggers"],
  });

  const applyPricingMutation = useMutation({
    mutationFn: async (pricingId: string) => {
      await apiRequest("POST", `/api/ai/apply-pricing/${pricingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/predictive-pricing"] });
    },
  });

  const createWinBackCampaignMutation = useMutation({
    mutationFn: async (customerId: string) => {
      await apiRequest("POST", `/api/ai/create-winback/${customerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/customer-health"] });
    },
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loadingHealth || loadingPricing || loadingMarket || loadingWeather) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-8 h-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold">AI-Powered Business Insights</h1>
          <p className="text-muted-foreground">Predictive analytics and intelligent recommendations for your business</p>
        </div>
      </div>

      <Tabs defaultValue="customer-health" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customer-health" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customer Health
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Predictive Pricing
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Market Intelligence
          </TabsTrigger>
          <TabsTrigger value="weather" className="flex items-center gap-2">
            <CloudRain className="w-4 h-4" />
            Weather Marketing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customer-health" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(healthScores as CustomerHealthScore[]).map((score) => (
              <Card key={score.id} className="relative">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Customer Health Score</CardTitle>
                  <Badge className={getRiskColor(score.churnRisk)}>
                    {score.churnRisk.toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    <span className={getHealthColor(score.healthScore)}>
                      {score.healthScore}/100
                    </span>
                  </div>
                  <Progress value={score.healthScore} className="mb-4" />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Visit:</span>
                      <span>{score.visitPrediction} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Spend:</span>
                      <span>${score.spendingPrediction}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Risk Factors:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {score.riskFactors.map((factor, index) => (
                        <li key={index}>• {factor}</li>
                      ))}
                    </ul>
                  </div>

                  {score.churnRisk === 'high' || score.churnRisk === 'critical' ? (
                    <Button
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => createWinBackCampaignMutation.mutate(score.userId)}
                      disabled={createWinBackCampaignMutation.isPending}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Create Win-Back Campaign
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <div className="grid gap-6">
            {(pricingRecommendations as PredictivePricing[]).map((pricing) => (
              <Card key={pricing.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pricing.itemCategory}</CardTitle>
                    <Badge variant={pricing.expectedDemandChange > 0 ? "default" : "secondary"}>
                      {pricing.expectedDemandChange > 0 ? "Increase" : "Decrease"} Demand
                    </Badge>
                  </div>
                  <CardDescription>{pricing.priceChangeReason}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Price:</span>
                        <span className="font-medium">${pricing.currentPrice}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Suggested Price:</span>
                        <span className="font-bold text-green-600">${pricing.suggestedPrice}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Expected Impact:</span>
                        <span className="font-medium">${pricing.expectedRevenueImpact}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Market Factors:</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Weather: {pricing.marketFactors.weather}</div>
                        <div>Competition: {pricing.marketFactors.competition}</div>
                        <div>Season: {pricing.marketFactors.seasonality}</div>
                        {pricing.marketFactors.events.length > 0 && (
                          <div>Events: {pricing.marketFactors.events.join(", ")}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => applyPricingMutation.mutate(pricing.id)}
                      disabled={applyPricingMutation.isPending}
                      className="flex-1"
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Apply Pricing
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Schedule Later
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <div className="grid gap-6">
            {(marketData as LocalMarketData[]).map((data) => (
              <Card key={data.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize">
                      {data.dataType.replace('_', ' ')} Analysis
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Confidence:</span>
                      <Badge variant={data.confidenceScore > 0.8 ? "default" : "secondary"}>
                        {Math.round(data.confidenceScore * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {new Date(data.date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">AI Insights:</h4>
                      <p className="text-sm text-muted-foreground">{data.insights}</p>
                    </div>

                    {data.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Recommendations:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {data.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-green-600 mt-0.5">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {data.isActionable && (
                      <Button size="sm" className="w-full">
                        <Zap className="w-4 h-4 mr-2" />
                        Take Action
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="weather" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CloudRain className="w-5 h-5" />
                Weather-Based Marketing Automation
              </CardTitle>
              <CardDescription>
                Automatically trigger campaigns based on weather conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {weatherTriggers.map((trigger: any) => (
                  <div key={trigger.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">{trigger.weatherCondition}</h4>
                      <Badge variant={trigger.isActive ? "default" : "secondary"}>
                        {trigger.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{trigger.customMessage}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span>Discount: {trigger.discountPercentage}%</span>
                      <span>Triggered: {trigger.triggerCount} times</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}