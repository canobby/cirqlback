import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, TrendingUp, Users, DollarSign, Target, Zap, AlertTriangle, CheckCircle } from "lucide-react";

export default function PredictiveAnalytics() {
  const predictions = [
    {
      category: "Customer Behavior",
      insights: [
        { prediction: "Sarah M. will visit 3x this week", confidence: 94, action: "Send personalized offer", impact: "+$45 revenue" },
        { prediction: "Downtown traffic will peak at 2pm", confidence: 89, action: "Launch flash campaign", impact: "+67 taps" },
        { prediction: "Coffee loyalty users likely to churn", confidence: 78, action: "Retention campaign", impact: "Save 23 customers" }
      ]
    },
    {
      category: "Revenue Optimization", 
      insights: [
        { prediction: "Premium pricing will increase revenue 23%", confidence: 91, action: "Adjust pricing model", impact: "+$234/week" },
        { prediction: "Bundle deals will boost average spend", confidence: 86, action: "Create combo offers", impact: "+$156/customer" },
        { prediction: "Weekend campaigns underperforming", confidence: 83, action: "Revise weekend strategy", impact: "+$89/weekend" }
      ]
    },
    {
      category: "Viral Growth",
      insights: [
        { prediction: "Friday posts get 3x engagement", confidence: 92, action: "Schedule viral content", impact: "+340% reach" },
        { prediction: "Challenge campaigns will trend", confidence: 87, action: "Launch group challenges", impact: "+2.4x shares" },
        { prediction: "Referral bonuses need adjustment", confidence: 79, action: "Optimize referral rates", impact: "+45% referrals" }
      ]
    }
  ];

  const abTests = [
    {
      name: "Reward Message Copy",
      variant_a: "You earned 50 points!",
      variant_b: "Boom! 50 points unlocked!",
      winner: "B",
      improvement: "+23% engagement",
      status: "completed"
    },
    {
      name: "Campaign Button Color",
      variant_a: "Blue button",
      variant_b: "Gradient button", 
      winner: "B",
      improvement: "+18% clicks",
      status: "completed"
    },
    {
      name: "Referral Incentive",
      variant_a: "$5 cash reward",
      variant_b: "$3 + bonus points",
      winner: "pending",
      improvement: "TBD",
      status: "running"
    }
  ];

  const personalizedRecommendations = [
    {
      customer: "Emma Rodriguez",
      profile: "High-value regular (Gold tier)",
      nextVisit: "Tomorrow 2-4pm",
      suggestedOffer: "Free dessert with lunch",
      expectedValue: "$23",
      confidence: 91
    },
    {
      customer: "James Chen", 
      profile: "Weekend visitor (Silver tier)",
      nextVisit: "This Saturday",
      suggestedOffer: "20% off brunch special",
      expectedValue: "$18",
      confidence: 87
    },
    {
      customer: "Maya Patel",
      profile: "New customer (Bronze tier)",
      nextVisit: "Next week",
      suggestedOffer: "Buy 2 get 1 free coffee",
      expectedValue: "$12",
      confidence: 73
    }
  ];

  const marketTrends = {
    seasonality: {
      current: "Rising demand period",
      peak: "Next Friday 3-5pm",
      recommendation: "Increase inventory 40%"
    },
    competition: {
      status: "2 new competitors detected",
      threat: "Medium",
      response: "Launch loyalty bonus campaign"
    },
    demographics: {
      growing: "18-25 age group (+34%)",
      declining: "45+ age group (-12%)",
      opportunity: "Target Gen Z with social campaigns"
    }
  };

  return (
    <div className="space-y-6">
      <Card className="card-hover glow-effect">
        <CardHeader>
          <CardTitle className="flex items-center gradient-text">
            <Brain className="mr-2 h-6 w-6" />
            AI Predictive Analytics Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">94%</div>
              <div className="text-sm text-blue-700">Prediction Accuracy</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">$1,247</div>
              <div className="text-sm text-green-700">Revenue Impact</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">156</div>
              <div className="text-sm text-purple-700">Automated Actions</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">2.4x</div>
              <div className="text-sm text-orange-700">Performance Boost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="predictions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
          <TabsTrigger value="abtests">Auto A/B Tests</TabsTrigger>
          <TabsTrigger value="personalized">Personalization</TabsTrigger>
          <TabsTrigger value="trends">Market Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="space-y-6">
          {predictions.map((category, index) => (
            <Card key={index} className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">{category.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.insights.map((insight, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{insight.prediction}</h4>
                          <p className="text-sm text-gray-600">Recommended: {insight.action}</p>
                        </div>
                        <Badge variant="outline" className="ml-4">
                          {insight.confidence}% confident
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-green-600">{insight.impact}</span>
                        <Button size="sm" className="gradient-bg border-0 text-white">
                          <Zap className="mr-1 h-3 w-3" />
                          Auto-Execute
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="abtests" className="space-y-4">
          {abTests.map((test, index) => (
            <Card key={index} className="card-hover">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gray-900">{test.name}</h4>
                    <Badge variant={test.status === "completed" ? "default" : "secondary"}>
                      {test.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700">Variant A</div>
                      <div className="text-sm text-gray-600">{test.variant_a}</div>
                    </div>
                    <div className={`p-3 rounded-lg ${test.winner === 'B' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                      <div className="text-sm font-medium text-gray-700 flex items-center">
                        Variant B
                        {test.winner === 'B' && <CheckCircle className="ml-2 h-4 w-4 text-green-600" />}
                      </div>
                      <div className="text-sm text-gray-600">{test.variant_b}</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-600">{test.improvement}</span>
                    <Button size="sm" variant="outline">
                      <Target className="mr-1 h-3 w-3" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="personalized" className="space-y-4">
          {personalizedRecommendations.map((rec, index) => (
            <Card key={index} className="card-hover">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{rec.customer}</h4>
                      <p className="text-sm text-gray-600">{rec.profile}</p>
                    </div>
                    <Badge variant="outline">
                      {rec.confidence}% match
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Next Visit:</span>
                      <div className="font-medium">{rec.nextVisit}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Expected Value:</span>
                      <div className="font-medium text-green-600">{rec.expectedValue}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-800">Suggested Offer</div>
                    <div className="text-sm text-blue-700">{rec.suggestedOffer}</div>
                  </div>

                  <Button size="sm" className="w-full gradient-bg border-0 text-white">
                    <Users className="mr-2 h-4 w-4" />
                    Send Personalized Offer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Seasonality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm font-medium text-green-800">Current Trend</div>
                    <div className="text-sm text-green-700">{marketTrends.seasonality.current}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Peak Expected:</span>
                    <div className="font-medium">{marketTrends.seasonality.peak}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Recommendation:</span>
                    <div className="font-medium text-blue-600">{marketTrends.seasonality.recommendation}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Competition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Alert
                    </div>
                    <div className="text-sm text-yellow-700">{marketTrends.competition.status}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Threat Level:</span>
                    <div className="font-medium text-yellow-600">{marketTrends.competition.threat}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Suggested Response:</span>
                    <div className="font-medium text-purple-600">{marketTrends.competition.response}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Demographics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-800">Growing Segment</div>
                    <div className="text-sm text-blue-700">{marketTrends.demographics.growing}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Declining:</span>
                    <div className="font-medium text-red-600">{marketTrends.demographics.declining}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Opportunity:</span>
                    <div className="font-medium text-green-600">{marketTrends.demographics.opportunity}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}