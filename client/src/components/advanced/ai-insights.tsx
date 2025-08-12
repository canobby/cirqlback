import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Users, 
  DollarSign, 
  Clock,
  Lightbulb,
  Zap,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'trend' | 'optimization';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
  data: any;
}

interface AIInsightsProps {
  businessId?: string;
}

export default function AIInsights({ businessId }: AIInsightsProps) {
  // Mock AI insights - in real implementation these would come from ML models
  const insights: AIInsight[] = [
    {
      id: '1',
      type: 'opportunity',
      title: 'Peak Hour Optimization',
      description: 'Your 3-5 PM period shows 40% higher conversion rates. Consider launching targeted campaigns during these hours.',
      impact: 'high',
      confidence: 87,
      actionable: true,
      data: { timeSlot: '3-5 PM', conversionIncrease: 40, potentialRevenue: 2400 }
    },
    {
      id: '2', 
      type: 'trend',
      title: 'Customer Retention Improving',
      description: 'Repeat customer rate increased 23% this month. Your loyalty program is showing strong results.',
      impact: 'medium',
      confidence: 92,
      actionable: false,
      data: { retentionIncrease: 23, monthlyGrowth: 15 }
    },
    {
      id: '3',
      type: 'warning',
      title: 'Weekend Performance Drop',
      description: 'Weekend engagement down 18%. Consider special weekend promotions or events.',
      impact: 'medium',
      confidence: 78,
      actionable: true,
      data: { weekendDrop: 18, recommendedDiscount: 15 }
    },
    {
      id: '4',
      type: 'optimization',
      title: 'Campaign Mix Optimization',
      description: 'Discount campaigns outperform point-based by 2.3x. Shift 30% more budget to discounts.',
      impact: 'high',
      confidence: 94,
      actionable: true,
      data: { discountPerformance: 2.3, recommendedShift: 30 }
    }
  ];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'trend': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'optimization': return <Target className="h-5 w-5 text-blue-500" />;
      default: return <Brain className="h-5 w-5" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const predictiveMetrics = [
    {
      metric: 'Revenue Forecast (Next 30 Days)',
      current: '$12,450',
      predicted: '$15,680',
      change: 26,
      confidence: 89
    },
    {
      metric: 'Customer Acquisition',
      current: '145 customers',
      predicted: '189 customers',
      change: 30,
      confidence: 76
    },
    {
      metric: 'Retention Rate',
      current: '68%',
      predicted: '74%',
      change: 6,
      confidence: 82
    }
  ];

  const optimizationSuggestions = [
    {
      category: 'Pricing',
      suggestion: 'Increase discount campaigns by 15% during peak hours',
      impact: '+$1,200 monthly revenue',
      effort: 'Low'
    },
    {
      category: 'Timing',
      suggestion: 'Launch flash sales on Wednesdays 2-4 PM',
      impact: '+18% engagement',
      effort: 'Medium'
    },
    {
      category: 'Targeting',
      suggestion: 'Create Silver tier exclusive offers',
      impact: '+25% tier advancement',
      effort: 'Low'
    }
  ];

  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">AI-Powered Insights</CardTitle>
              <p className="text-sm text-gray-600">
                Intelligent recommendations based on your business data
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Predictive Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span>Predictive Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {predictiveMetrics.map((metric, index) => (
              <div key={index} className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.metric}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-2xl font-bold">{metric.predicted}</span>
                    <div className="flex items-center text-green-600">
                      <ArrowUp className="h-4 w-4" />
                      <span className="text-sm font-medium">+{metric.change}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">vs current: {metric.current}</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Confidence</span>
                    <span>{metric.confidence}%</span>
                  </div>
                  <Progress value={metric.confidence} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {insights.map((insight) => (
          <Card key={insight.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getInsightIcon(insight.type)}
                  <CardTitle className="text-lg">{insight.title}</CardTitle>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getImpactColor(insight.impact)}>
                    {insight.impact} impact
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {insight.confidence}% confident
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{insight.description}</p>
              
              {/* Insight-specific data visualization */}
              {insight.type === 'opportunity' && insight.data && (
                <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Potential Revenue Increase:</span>
                    <span className="font-bold text-green-600">
                      +${insight.data.potentialRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {insight.type === 'trend' && insight.data && (
                <div className="bg-green-50 p-3 rounded-lg mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Monthly Growth:</span>
                    <span className="font-bold text-green-600">
                      +{insight.data.monthlyGrowth}%
                    </span>
                  </div>
                </div>
              )}

              {insight.actionable && (
                <Button size="sm" className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Take Action
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Optimization Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-500" />
            <span>Optimization Suggestions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {optimizationSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {suggestion.category}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        suggestion.effort === 'Low' ? 'text-green-600' : 
                        suggestion.effort === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                      }`}
                    >
                      {suggestion.effort} effort
                    </Badge>
                  </div>
                  <p className="font-medium">{suggestion.suggestion}</p>
                  <p className="text-sm text-green-600 font-medium">{suggestion.impact}</p>
                </div>
                <Button size="sm" variant="outline">
                  Implement
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Score */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>AI Performance Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Performance</span>
                <span className="text-sm font-bold">87/100</span>
              </div>
              <Progress value={87} className="h-3" />
              <p className="text-xs text-gray-500 mt-1">
                Excellent! Your campaigns are performing above average.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">87</div>
              <div className="text-xs text-gray-500">Performance Score</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}