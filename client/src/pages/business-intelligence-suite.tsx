import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Zap,
  ChartBar,
  MessageSquare,
  Calendar,
  Store,
  Award,
  Rocket,
  Shield,
  Globe,
  Clock,
  Bell,
  Star
} from "lucide-react";

export default function BusinessIntelligenceSuite() {
  const { toast } = useToast();
  const [activeModule, setActiveModule] = useState("overview");

  const { data: businessMetrics } = useQuery({
    queryKey: ["/api/business-intelligence/metrics"]
  });

  const { data: automationStats } = useQuery({
    queryKey: ["/api/automation/stats"]
  });

  const aiInsightsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/generate-insights"),
    onSuccess: () => {
      toast({
        title: "AI Insights Generated",
        description: "New business recommendations are ready for review."
      });
    }
  });

  const intelligentFeatures = [
    {
      title: "Predictive Customer Behavior Engine",
      description: "AI analyzes customer patterns to predict future actions, purchases, and engagement likelihood",
      icon: Brain,
      metrics: { accuracy: 94, predictions: 1247, revenue_impact: "$15,600" },
      features: [
        "Purchase prediction with 94% accuracy",
        "Churn risk identification 30 days early", 
        "Optimal engagement timing recommendations",
        "Lifetime value forecasting",
        "Cross-sell opportunity detection"
      ],
      competitive_advantage: "Unlike basic analytics, our AI learns from NFC interactions, location data, and real-world behavior patterns"
    },
    {
      title: "Autonomous Marketing Orchestrator",
      description: "Self-optimizing campaigns that automatically adjust messaging, timing, and targeting based on performance",
      icon: Rocket,
      metrics: { campaigns_active: 12, optimization_rate: 89, roi_improvement: "156%" },
      features: [
        "Self-adjusting campaign parameters",
        "Multi-channel message synchronization",
        "Real-time budget reallocation",
        "Automated A/B testing cycles",
        "Performance-driven content generation"
      ],
      competitive_advantage: "Complete automation goes beyond scheduling - campaigns evolve and improve without human intervention"
    },
    {
      title: "Hyper-Local Intelligence Network",
      description: "Community-wide business intelligence sharing for market insights and collaboration opportunities",
      icon: Globe,
      metrics: { network_size: 847, insights_shared: 234, partnerships_formed: 56 },
      features: [
        "Anonymous competitive benchmarking",
        "Local market trend analysis",
        "Cross-business referral automation",
        "Community event coordination",
        "Shared customer loyalty programs"
      ],
      competitive_advantage: "Creates a business ecosystem where individual success drives community growth"
    },
    {
      title: "Real-Time Revenue Optimization",
      description: "Dynamic pricing and promotion engine that maximizes revenue based on demand, inventory, and customer behavior",
      icon: DollarSign,
      metrics: { revenue_increase: "23%", price_adjustments: 156, margin_improvement: "18%" },
      features: [
        "Dynamic pricing recommendations",
        "Inventory-based promotion triggers",
        "Competitor price monitoring",
        "Demand forecasting integration",
        "Margin optimization alerts"
      ],
      competitive_advantage: "Combines real-world foot traffic data with online behavior for superior pricing decisions"
    },
    {
      title: "Customer Experience Orchestration",
      description: "Seamless journey management across all touchpoints with predictive personalization",
      icon: Users,
      metrics: { satisfaction_score: 4.8, journey_completion: "87%", personalization_accuracy: "91%" },
      features: [
        "Predictive journey mapping",
        "Real-time experience optimization",
        "Emotion-based interaction adaptation",
        "Omnichannel experience consistency",
        "Proactive issue resolution"
      ],
      competitive_advantage: "Physical + digital journey tracking creates complete customer understanding"
    },
    {
      title: "Intelligent Business Relationship Engine",
      description: "AI-powered partnership matching and collaboration automation with other businesses",
      icon: Award,
      metrics: { partnerships_suggested: 23, collaboration_success: "78%", revenue_from_partnerships: "$8,900" },
      features: [
        "Compatible business identification",
        "Automated partnership proposals",
        "Collaboration opportunity scoring",
        "Joint campaign management",
        "Revenue sharing automation"
      ],
      competitive_advantage: "Creates business networks that generate mutual growth beyond traditional referral programs"
    }
  ];

  const automationCapabilities = [
    {
      category: "Customer Lifecycle Management",
      automations: [
        "New customer onboarding sequences",
        "Loyalty tier progression management", 
        "Win-back campaign deployment",
        "Birthday and anniversary recognition",
        "Dormant customer reactivation"
      ]
    },
    {
      category: "Revenue & Inventory Optimization",
      automations: [
        "Smart pricing adjustments",
        "Low inventory promotion triggers",
        "Slow-moving item clearance",
        "Seasonal demand preparation",
        "Cross-sell recommendation delivery"
      ]
    },
    {
      category: "Reputation & Review Management",
      automations: [
        "Review request timing optimization",
        "Negative feedback rapid response",
        "Review response personalization",
        "Competitor review monitoring",
        "Review-based service improvements"
      ]
    },
    {
      category: "Staff & Operations",
      automations: [
        "Staff scheduling optimization",
        "Training reminder deployment",
        "Performance milestone recognition",
        "Busy period preparation alerts",
        "Equipment maintenance scheduling"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Business Intelligence Suite
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            AI-powered business management that learns, adapts, and grows your business automatically. 
            Combining physical world insights with digital intelligence for unmatched competitive advantage.
          </p>
        </div>

        <Tabs defaultValue="intelligent-features" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="intelligent-features">Intelligent Features</TabsTrigger>
            <TabsTrigger value="automation-center">Automation Center</TabsTrigger>
            <TabsTrigger value="performance-dashboard">Performance Dashboard</TabsTrigger>
            <TabsTrigger value="competitive-advantage">Competitive Edge</TabsTrigger>
          </TabsList>

          {/* Intelligent Features Tab */}
          <TabsContent value="intelligent-features" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {intelligentFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="relative border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{feature.title}</CardTitle>
                            <Badge className="mt-1 bg-green-600">Active & Learning</Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-600">{feature.description}</p>
                      
                      <div className="grid grid-cols-3 gap-4 p-3 bg-blue-100 rounded-lg">
                        {Object.entries(feature.metrics).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div className="font-bold text-blue-800">{value}</div>
                            <div className="text-xs text-blue-600 capitalize">{key.replace('_', ' ')}</div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Key Capabilities:</h4>
                        <ul className="space-y-1">
                          {feature.features.map((feat, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <Zap className="h-3 w-3 text-yellow-500" />
                              {feat}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                        <h4 className="font-semibold text-sm text-purple-800 mb-1">Competitive Advantage:</h4>
                        <p className="text-sm text-purple-700">{feature.competitive_advantage}</p>
                      </div>

                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        onClick={() => setActiveModule(feature.title)}
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        Configure & Optimize
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Automation Center Tab */}
          <TabsContent value="automation-center" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {automationCapabilities.map((category, index) => (
                <Card key={index} className="border-2 border-green-200 bg-gradient-to-br from-white to-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-green-600" />
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.automations.map((automation, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium">{automation}</span>
                          </div>
                          <Badge className="bg-green-600 text-xs">
                            Active
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                      <Zap className="h-4 w-4 mr-2" />
                      Manage {category.category}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Performance Dashboard Tab */}
          <TabsContent value="performance-dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-2 border-yellow-200 bg-gradient-to-br from-white to-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                    AI Performance Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-600 mb-2">94%</div>
                    <Progress value={94} className="mb-4" />
                    <p className="text-sm text-gray-600">AI systems performing above industry average</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    Revenue Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">+$47,200</div>
                    <div className="text-lg text-orange-500 mb-2">This Month</div>
                    <p className="text-sm text-gray-600">Generated by AI optimizations</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-pink-200 bg-gradient-to-br from-white to-pink-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-pink-600" />
                    Customer Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-pink-600 mb-2">4.8</div>
                    <div className="flex justify-center mb-2">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`h-4 w-4 ${star <= 5 ? 'text-pink-500 fill-current' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">AI-optimized experiences</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChartBar className="h-5 w-5 text-purple-600" />
                  Real-Time Business Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-purple-100 rounded-lg">
                    <div className="text-2xl font-bold text-purple-800">156</div>
                    <div className="text-sm text-purple-600">Active Automations</div>
                  </div>
                  <div className="text-center p-4 bg-purple-100 rounded-lg">
                    <div className="text-2xl font-bold text-purple-800">89%</div>
                    <div className="text-sm text-purple-600">Optimization Rate</div>
                  </div>
                  <div className="text-center p-4 bg-purple-100 rounded-lg">
                    <div className="text-2xl font-bold text-purple-800">23</div>
                    <div className="text-sm text-purple-600">AI Recommendations</div>
                  </div>
                  <div className="text-center p-4 bg-purple-100 rounded-lg">
                    <div className="text-2xl font-bold text-purple-800">$12.4K</div>
                    <div className="text-sm text-purple-600">Weekly AI Revenue</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competitive Advantage Tab */}
          <TabsContent value="competitive-advantage" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-2 border-indigo-200 bg-gradient-to-br from-white to-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-600" />
                    Why Cirqlback Exceeds Competitors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      title: "Physical + Digital Intelligence",
                      description: "Combines real-world NFC interactions with online behavior for complete customer understanding"
                    },
                    {
                      title: "Self-Improving AI Systems",
                      description: "Machine learning algorithms that continuously optimize without human intervention"
                    },
                    {
                      title: "Community Business Network",
                      description: "Shared intelligence across local businesses creates ecosystem advantages"
                    },
                    {
                      title: "Predictive Automation",
                      description: "Proactive business management that anticipates needs before they arise"
                    }
                  ].map((advantage, index) => (
                    <div key={index} className="p-3 bg-indigo-100 rounded-lg">
                      <h4 className="font-semibold text-indigo-800 mb-1">{advantage.title}</h4>
                      <p className="text-sm text-indigo-700">{advantage.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-emerald-600" />
                    Unique Platform Capabilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      capability: "AR-Enhanced Customer Experiences",
                      impact: "40% higher engagement vs traditional loyalty programs"
                    },
                    {
                      capability: "Real-Time Location Intelligence", 
                      impact: "Foot traffic optimization increases revenue 25%"
                    },
                    {
                      capability: "Cross-Business Collaboration Engine",
                      impact: "Partnership revenue averages $8,900 per month"
                    },
                    {
                      capability: "Predictive Customer Lifetime Value",
                      impact: "94% accuracy in customer behavior predictions"
                    }
                  ].map((item, index) => (
                    <div key={index} className="p-3 bg-emerald-100 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-emerald-800 text-sm">{item.capability}</h4>
                        <Badge className="bg-emerald-600 text-xs">Unique</Badge>
                      </div>
                      <p className="text-sm text-emerald-700">{item.impact}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}