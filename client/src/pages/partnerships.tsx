import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  Users, 
  MapPin, 
  Star, 
  Lightbulb, 
  Target, 
  DollarSign,
  BarChart3,
  Clock,
  Handshake,
  ArrowRight,
  Filter,
  Search,
  Store,
  Route,
  Zap,
  CheckCircle,
  AlertCircle,
  Calendar,
  ThumbsUp,
  Eye,
  Heart,
  MessageSquare
} from 'lucide-react';

interface BusinessRecommendation {
  id: string;
  businessName: string;
  businessType: string;
  compatibilityScore: number;
  expectedBenefit: string;
  estimatedTrafficIncrease: number;
  estimatedCostSavings: number;
  estimatedRevenueBoost: number;
  distance: number;
  sharedCustomers: number;
  recommendationType: string;
  campaignSuggestions: string[];
  optimalTiming: {
    bestMonths: string[];
    bestDaysOfWeek: string[];
    bestHours: string[];
  };
  isViewed: boolean;
  confidenceScore: number;
}

interface CustomerJourney {
  id: string;
  date: string;
  businessesVisited: string[];
  totalValue: number;
  journeyDuration: number;
  efficiency: number;
  missedOpportunities: string[];
}

interface TrafficPattern {
  businessType: string;
  peakHours: string[];
  busyDays: string[];
  seasonalTrends: {
    month: string;
    multiplier: number;
  }[];
  avgCustomersPerHour: number;
}

export default function PartnershipsPage() {
  const [activeTab, setActiveTab] = useState('recommendations');
  const [recommendations, setRecommendations] = useState<BusinessRecommendation[]>([]);
  const [customerJourneys, setCustomerJourneys] = useState<CustomerJourney[]>([]);
  const [trafficPatterns, setTrafficPatterns] = useState<TrafficPattern[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    setRecommendations([
      {
        id: '1',
        businessName: 'Brew & Bean Coffee House',
        businessType: 'Coffee Shop',
        compatibilityScore: 94,
        expectedBenefit: 'morning_traffic_boost',
        estimatedTrafficIncrease: 32,
        estimatedCostSavings: 450,
        estimatedRevenueBoost: 2800,
        distance: 0.3,
        sharedCustomers: 47,
        recommendationType: 'campaign_partner',
        campaignSuggestions: [
          'Morning Rush Combo Deals',
          'Coffee + Breakfast Cross-Promotion',
          'Loyalty Point Sharing Program'
        ],
        optimalTiming: {
          bestMonths: ['March', 'April', 'October', 'November'],
          bestDaysOfWeek: ['Monday', 'Tuesday', 'Wednesday'],
          bestHours: ['7:00 AM', '8:00 AM', '9:00 AM']
        },
        isViewed: false,
        confidenceScore: 89
      },
      {
        id: '2',
        businessName: 'FitZone Gym & Wellness',
        businessType: 'Fitness Center',
        compatibilityScore: 87,
        expectedBenefit: 'cross_customer_acquisition',
        estimatedTrafficIncrease: 28,
        estimatedCostSavings: 320,
        estimatedRevenueBoost: 1950,
        distance: 0.7,
        sharedCustomers: 23,
        recommendationType: 'referral_partner',
        campaignSuggestions: [
          'Healthy Lifestyle Package',
          'Post-Workout Meal Discounts',
          'Wellness Challenge Rewards'
        ],
        optimalTiming: {
          bestMonths: ['January', 'February', 'September'],
          bestDaysOfWeek: ['Monday', 'Wednesday', 'Saturday'],
          bestHours: ['6:00 AM', '5:00 PM', '6:00 PM']
        },
        isViewed: true,
        confidenceScore: 76
      },
      {
        id: '3',
        businessName: 'BookNook Literary Cafe',
        businessType: 'Bookstore & Cafe',
        compatibilityScore: 82,
        expectedBenefit: 'evening_customer_retention',
        estimatedTrafficIncrease: 22,
        estimatedCostSavings: 280,
        estimatedRevenueBoost: 1420,
        distance: 0.5,
        sharedCustomers: 31,
        recommendationType: 'pool_participant',
        campaignSuggestions: [
          'Literary Dinner Events',
          'Book Club Dining Discounts',
          'Study Session Meal Deals'
        ],
        optimalTiming: {
          bestMonths: ['October', 'November', 'December', 'February'],
          bestDaysOfWeek: ['Thursday', 'Friday', 'Sunday'],
          bestHours: ['2:00 PM', '7:00 PM', '8:00 PM']
        },
        isViewed: false,
        confidenceScore: 71
      }
    ]);

    setCustomerJourneys([
      {
        id: '1',
        date: '2024-12-15',
        businessesVisited: ['Coffee Shop', 'Your Restaurant', 'Bookstore'],
        totalValue: 45.80,
        journeyDuration: 185,
        efficiency: 14.8,
        missedOpportunities: ['Gym membership offer after lunch', 'Dessert pairing suggestion']
      },
      {
        id: '2',
        date: '2024-12-14',
        businessesVisited: ['Gym', 'Your Restaurant', 'Smoothie Bar'],
        totalValue: 38.20,
        journeyDuration: 120,
        efficiency: 19.1,
        missedOpportunities: ['Pre-workout meal combo', 'Protein supplement cross-sell']
      }
    ]);

    setTrafficPatterns([
      {
        businessType: 'Coffee Shop',
        peakHours: ['7:00 AM', '8:00 AM', '2:00 PM'],
        busyDays: ['Monday', 'Tuesday', 'Wednesday'],
        seasonalTrends: [
          { month: 'Dec', multiplier: 1.3 },
          { month: 'Jan', multiplier: 0.8 },
          { month: 'Feb', multiplier: 0.9 },
          { month: 'Mar', multiplier: 1.1 }
        ],
        avgCustomersPerHour: 24
      },
      {
        businessType: 'Fitness Center',
        peakHours: ['6:00 AM', '5:00 PM', '6:00 PM'],
        busyDays: ['Monday', 'Wednesday', 'Saturday'],
        seasonalTrends: [
          { month: 'Dec', multiplier: 0.7 },
          { month: 'Jan', multiplier: 1.4 },
          { month: 'Feb', multiplier: 1.2 },
          { month: 'Mar', multiplier: 1.0 }
        ],
        avgCustomersPerHour: 18
      }
    ]);
  }, []);

  const filteredRecommendations = recommendations.filter(rec => {
    const matchesFilter = filterType === 'all' || rec.recommendationType === filterType;
    const matchesSearch = rec.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rec.businessType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const RecommendationCard = ({ recommendation }: { recommendation: BusinessRecommendation }) => (
    <Card className={`transition-all hover:shadow-lg ${!recommendation.isViewed ? 'ring-2 ring-blue-200' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">{recommendation.businessName}</h3>
              {!recommendation.isViewed && <Badge variant="secondary">New</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{recommendation.businessType}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {recommendation.distance}km away
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {recommendation.sharedCustomers} shared customers
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold">{recommendation.compatibilityScore}/100</span>
            </div>
            <Badge variant={recommendation.compatibilityScore >= 90 ? 'default' : 
                          recommendation.compatibilityScore >= 80 ? 'secondary' : 'outline'}>
              {recommendation.recommendationType.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-green-700">+{recommendation.estimatedTrafficIncrease}%</p>
            <p className="text-xs text-green-600">Traffic Increase</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <DollarSign className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-blue-700">${recommendation.estimatedCostSavings}</p>
            <p className="text-xs text-blue-600">Cost Savings</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <Target className="h-4 w-4 text-purple-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-purple-700">${recommendation.estimatedRevenueBoost}</p>
            <p className="text-xs text-purple-600">Revenue Boost</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-orange-500" />
              Campaign Suggestions
            </h4>
            <div className="flex flex-wrap gap-2">
              {recommendation.campaignSuggestions.map((suggestion, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Optimal Timing
            </h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p><span className="font-medium">Best Months:</span> {recommendation.optimalTiming.bestMonths.join(', ')}</p>
              <p><span className="font-medium">Best Days:</span> {recommendation.optimalTiming.bestDaysOfWeek.join(', ')}</p>
              <p><span className="font-medium">Peak Hours:</span> {recommendation.optimalTiming.bestHours.join(', ')}</p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {recommendation.confidenceScore}% AI Confidence
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
            <Button size="sm" className="gradient-bg">
              <Handshake className="h-4 w-4 mr-1" />
              Partner Up
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Smart Business Partnerships</h1>
          <p className="text-xl text-muted-foreground">
            AI-powered recommendations for optimal merchant collaborations and campaign partnerships
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Partnerships</p>
                <p className="text-2xl font-bold">7</p>
                <p className="text-xs text-green-600">+2 this month</p>
              </div>
              <Handshake className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New Recommendations</p>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-blue-600">High potential matches</p>
              </div>
              <Lightbulb className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Traffic Boost</p>
                <p className="text-2xl font-bold">+24%</p>
                <p className="text-xs text-green-600">From partnerships</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">91%</p>
                <p className="text-xs text-green-600">Partnership success</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="journeys">Customer Journeys</TabsTrigger>
          <TabsTrigger value="patterns">Traffic Patterns</TabsTrigger>
          <TabsTrigger value="analytics">Partnership Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="filter">Filter by type:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="campaign_partner">Campaign Partners</SelectItem>
                  <SelectItem value="referral_partner">Referral Partners</SelectItem>
                  <SelectItem value="pool_participant">Pool Participants</SelectItem>
                  <SelectItem value="cross_promotion">Cross Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            {filteredRecommendations.map((recommendation) => (
              <RecommendationCard key={recommendation.id} recommendation={recommendation} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="journeys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-blue-500" />
                Customer Journey Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerJourneys.map((journey) => (
                  <div key={journey.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">Journey on {journey.date}</p>
                        <p className="text-sm text-muted-foreground">
                          {journey.businessesVisited.length} businesses • {journey.journeyDuration} minutes • ${journey.totalValue}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {journey.efficiency} value/min
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      {journey.businessesVisited.map((business, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            {business}
                          </div>
                          {index < journey.businessesVisited.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {journey.missedOpportunities.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-orange-600 mb-2">Missed Opportunities:</p>
                        <div className="flex flex-wrap gap-2">
                          {journey.missedOpportunities.map((opportunity, index) => (
                            <Badge key={index} variant="outline" className="text-xs text-orange-600">
                              {opportunity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {trafficPatterns.map((pattern, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    {pattern.businessType} Traffic Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Peak Hours</p>
                      <div className="flex flex-wrap gap-2">
                        {pattern.peakHours.map((hour, i) => (
                          <Badge key={i} variant="secondary">{hour}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Busiest Days</p>
                      <div className="flex flex-wrap gap-2">
                        {pattern.busyDays.map((day, i) => (
                          <Badge key={i} variant="outline">{day}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Seasonal Trends</p>
                      <div className="space-y-2">
                        {pattern.seasonalTrends.map((trend, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm">{trend.month}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={trend.multiplier * 50} className="w-20 h-2" />
                              <span className="text-sm font-medium">{trend.multiplier}x</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Average Customers/Hour</p>
                      <p className="text-xl font-bold text-blue-700">{pattern.avgCustomersPerHour}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  Partnership ROI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Revenue Increase</span>
                    <span className="font-semibold text-green-600">+18.5%</span>
                  </div>
                  <Progress value={18.5} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Customer Acquisition Rate</span>
                    <span className="font-semibold text-blue-600">+31%</span>
                  </div>
                  <Progress value={31} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cross-Business Visit Rate</span>
                    <span className="font-semibold text-purple-600">67%</span>
                  </div>
                  <Progress value={67} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Partnership Satisfaction</span>
                    <span className="font-semibold text-orange-600">4.7/5</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Recommendation Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">91%</p>
                    <p className="text-sm text-muted-foreground">Overall Success Rate</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Campaign Partners</span>
                      <span className="font-semibold">94%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Referral Partners</span>
                      <span className="font-semibold">89%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pool Participants</span>
                      <span className="font-semibold">87%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Cross Promotions</span>
                      <span className="font-semibold">92%</span>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-600">AI Model Accuracy</p>
                    <p className="text-xl font-bold text-yellow-700">96.2%</p>
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