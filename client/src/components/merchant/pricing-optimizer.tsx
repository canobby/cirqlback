import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, DollarSign, Target, Zap, Brain, ChartBar, Loader2, RefreshCw } from "lucide-react";

export default function PricingOptimizer() {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AI-powered pricing recommendations query
  const { data: aiRecommendations, isLoading, refetch } = useQuery<any>({
    queryKey: ['/api/ai/pricing-optimization'],
    queryFn: async () => {
      const businessData = {
        businessType: "coffee_shop",
        location: "downtown",
        currentPricing: {
          "Regular Coffee": 3.50,
          "Specialty Drinks": 5.25,
          "Food Items": 8.50,
          "Loyalty Discounts": "10%"
        },
        salesData: {
          dailyVolume: 150,
          peakHours: ["7am-9am", "12pm-2pm", "4pm-6pm"],
          seasonalTrends: ["summer_boost", "holiday_surge"],
          customerRetention: 0.68
        },
        marketConditions: {
          competition: "high",
          economicClimate: "moderate",
          demographics: "working_professionals"
        },
        goals: ["increase_revenue", "maintain_volume", "boost_loyalty"]
      };
      return await apiRequest("POST", "/api/ai/pricing-optimization", businessData);
    }
  });

  // AI analysis mutation for real-time optimization
  const analyzeCurrentPricing = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      const analysisData = {
        currentMetrics: {
          averageTransaction: 12.50,
          dailyRevenue: 1875,
          customerCount: 150,
          repeatCustomerRate: 0.42
        },
        timeframe: "last_30_days",
        objectives: ["maximize_profit", "increase_volume", "enhance_loyalty"],
        constraints: ["maintain_quality", "competitive_position"]
      };
      const result = await apiRequest("POST", "/api/ai/pricing-optimization", analysisData);
      setIsAnalyzing(false);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "AI Analysis Complete",
        description: "New pricing recommendations generated based on current data"
      });
      refetch();
    },
    onError: () => {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: "Unable to generate pricing recommendations. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Fallback mock data for display
  const mockRecommendations = [
    {
      campaign: "Free Coffee Friday",
      currentPrice: "$0.00",
      suggestedPrice: "$2.00",
      reasoning: "Premium pricing with loyalty points can increase perceived value",
      impact: "+$124/week",
      confidence: 94,
      strategy: "Premium + Points"
    },
    {
      campaign: "Book Club Discount", 
      currentPrice: "10% off",
      suggestedPrice: "15% off + points",
      reasoning: "Higher discount drives more volume, points create retention",
      impact: "+$89/week",
      confidence: 87,
      strategy: "Volume + Retention"
    },
    {
      campaign: "Lunch Special",
      currentPrice: "$12.99",
      suggestedPrice: "$14.99",
      reasoning: "Demand analysis shows customers willing to pay premium",
      impact: "+$156/week",
      confidence: 91,
      strategy: "Market Premium"
    }
  ];

  // Use AI recommendations if available, otherwise fallback to mock data
  const recommendations = aiRecommendations?.recommendations || mockRecommendations;

  const strategies = [
    {
      name: "Dynamic Pricing",
      description: "Adjust prices based on demand, time, and customer behavior",
      benefits: ["Maximize revenue during peak hours", "Optimize for low-demand periods", "Personalized pricing"],
      roi: "+23%"
    },
    {
      name: "Loyalty Integration",
      description: "Combine cash prices with point rewards for better perception",
      benefits: ["Higher perceived value", "Increased customer retention", "Cross-selling opportunities"],
      roi: "+18%"
    },
    {
      name: "Social Proof Pricing",
      description: "Use community engagement to justify premium pricing",
      benefits: ["FOMO-driven purchases", "Community validation", "Viral marketing effect"],
      roi: "+31%"
    }
  ];

  const analytics = {
    currentRevenue: 2847,
    projectedRevenue: 3654,
    optimizationGain: 807,
    priceElasticity: 0.7,
    customerLifetimeValue: 156,
    competitorAnalysis: "15% below market average"
  };

  return (
    <div className="space-y-6">
      <Card className="card-hover glow-effect">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gradient-text">
              <Brain className="mr-2 h-6 w-6" />
              AI Pricing Optimization
            </CardTitle>
            <Button 
              onClick={() => analyzeCurrentPricing.mutate()}
              disabled={isLoading || analyzeCurrentPricing.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading || analyzeCurrentPricing.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Analyze Pricing
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">${analytics.optimizationGain}</div>
              <div className="text-sm text-green-700">Monthly Revenue Gain</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{Math.round((analytics.projectedRevenue / analytics.currentRevenue - 1) * 100)}%</div>
              <div className="text-sm text-blue-700">Revenue Increase</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{analytics.priceElasticity}</div>
              <div className="text-sm text-purple-700">Price Elasticity</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="recommendations" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid grid-cols-3 min-w-max lg:w-full">
            <TabsTrigger value="recommendations" className="px-2 text-xs lg:px-3 lg:text-sm">AI Recommendations</TabsTrigger>
            <TabsTrigger value="strategies" className="px-2 text-xs lg:px-3 lg:text-sm">Pricing Strategies</TabsTrigger>
            <TabsTrigger value="analytics" className="px-2 text-xs lg:px-3 lg:text-sm">Advanced Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.map((rec: any, index: number) => (
            <Card key={index} className="card-hover">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{rec.campaign}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rec.reasoning}</p>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      {rec.confidence}% confidence
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-700">Current</div>
                      <div className="text-lg font-bold text-gray-900">{rec.currentPrice}</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-medium text-green-700">Suggested</div>
                      <div className="text-lg font-bold text-green-900">{rec.suggestedPrice}</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium text-blue-700">Impact</div>
                      <div className="text-lg font-bold text-blue-900">{rec.impact}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{rec.strategy}</Badge>
                    <Button size="sm" className="gradient-bg border-0 text-white">
                      <Zap className="mr-1 h-3 w-3" />
                      Apply Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
          {strategies.map((strategy, index) => (
            <Card key={index} className="card-hover">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{strategy.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
                    </div>
                    <Badge className="gradient-bg border-0 text-white">
                      {strategy.roi} ROI
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">Key Benefits:</div>
                    <ul className="space-y-1">
                      {strategy.benefits.map((benefit, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center">
                          <Target className="h-3 w-3 text-green-500 mr-2" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button variant="outline" className="w-full">
                    <ChartBar className="mr-2 h-4 w-4" />
                    Learn More & Implement
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Revenue Projection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Monthly Revenue</span>
                    <span className="font-bold">${analytics.currentRevenue}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Optimized Revenue</span>
                    <span className="font-bold text-green-600">${analytics.projectedRevenue}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="gradient-bg h-3 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${(analytics.projectedRevenue / (analytics.projectedRevenue * 1.2)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {Math.round((analytics.projectedRevenue / analytics.currentRevenue - 1) * 100)}% increase with AI optimization
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Market Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">Competitive Position</h4>
                    <p className="text-sm text-yellow-700">{analytics.competitorAnalysis}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="font-bold text-blue-600">${analytics.customerLifetimeValue}</div>
                      <div className="text-xs text-blue-600">Customer LTV</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="font-bold text-purple-600">{analytics.priceElasticity}</div>
                      <div className="text-xs text-purple-600">Price Elasticity</div>
                    </div>
                  </div>

                  <Button className="w-full gradient-bg border-0 text-white">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Generate Full Market Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}