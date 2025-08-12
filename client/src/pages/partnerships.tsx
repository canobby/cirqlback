import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Handshake,
  Users,
  DollarSign,
  TrendingUp,
  Star,
  MapPin,
  Clock,
  Award,
  Target,
  Zap,
  Network,
  Gift,
  ArrowRight,
  Plus,
  Search,
  Filter,
  Calendar,
  BarChart3,
  MessageSquare,
  CheckCircle
} from "lucide-react";

export default function Partnerships() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedPartnership, setSelectedPartnership] = useState<any>(null);

  // Mock data for partnerships
  const availablePartners = [
    {
      id: 1,
      name: "Brew & Bite Cafe",
      category: "Food & Beverage",
      distance: "0.3 miles",
      compatibility: 94,
      customers: 1250,
      rating: 4.8,
      image: "/api/placeholder/64/64",
      description: "Popular breakfast spot with complementary customer base",
      potentialRevenue: "$2,400/month",
      type: "Cross-Promotion"
    },
    {
      id: 2,
      name: "FitZone Gym",
      category: "Fitness",
      distance: "0.5 miles",
      compatibility: 87,
      customers: 890,
      rating: 4.6,
      image: "/api/placeholder/64/64",
      description: "Health-focused clientele perfect for healthy menu items",
      potentialRevenue: "$1,800/month",
      type: "Referral Program"
    },
    {
      id: 3,
      name: "BookNook Library Cafe",
      category: "Entertainment",
      distance: "0.7 miles",
      compatibility: 91,
      customers: 650,
      rating: 4.9,
      image: "/api/placeholder/64/64",
      description: "Quiet study space seekers who value premium coffee",
      potentialRevenue: "$1,200/month",
      type: "Joint Loyalty"
    }
  ];

  const activePartnerships = [
    {
      id: 1,
      name: "TechHub Coworking",
      type: "Corporate Partnership",
      revenue: "$3,200",
      growth: 15.7,
      customers: 145,
      status: "Active",
      campaign: "Business Lunch Special",
      startDate: "2024-01-15"
    },
    {
      id: 2,
      name: "Sunset Yoga Studio",
      type: "Cross-Promotion",
      revenue: "$1,850",
      growth: 22.3,
      customers: 89,
      status: "Active",
      campaign: "Post-Workout Smoothies",
      startDate: "2024-02-01"
    }
  ];

  const partnershipTemplates = [
    {
      name: "Cross-Promotion Campaign",
      description: "Share customers through joint marketing efforts",
      benefits: ["20% customer crossover", "Shared marketing costs", "Increased visibility"],
      setup: "2-3 days"
    },
    {
      name: "Referral Network",
      description: "Earn commissions by referring customers to partners",
      benefits: ["5-10% commission", "Passive income", "Customer retention"],
      setup: "1 day"
    },
    {
      name: "Joint Loyalty Program",
      description: "Shared rewards program across multiple businesses",
      benefits: ["Higher retention", "Increased spending", "Network effects"],
      setup: "1 week"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <Handshake className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Partnership Network
              </h1>
              <p className="text-gray-600 text-lg mt-1">
                AI-powered business partnerships, cross-promotions, and revenue sharing opportunities
              </p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Partners</p>
                    <p className="text-3xl font-bold text-blue-600">12</p>
                    <p className="text-sm text-green-600">+3 this month</p>
                  </div>
                  <Network className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-3xl font-bold text-green-600">$8,450</p>
                    <p className="text-sm text-green-600">+18.5% growth</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Shared Customers</p>
                    <p className="text-3xl font-bold text-purple-600">347</p>
                    <p className="text-sm text-green-600">+12% retention</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Match Score</p>
                    <p className="text-3xl font-bold text-orange-600">92%</p>
                    <p className="text-sm text-green-600">Excellent fit</p>
                  </div>
                  <Target className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Partnership Tabs */}
        <Tabs defaultValue="discover" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-4 min-w-max lg:w-full">
              <TabsTrigger value="discover" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Search className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Discover</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Handshake className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Active</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <Zap className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="px-2 text-xs lg:px-3 lg:text-sm flex items-center gap-1">
                <BarChart3 className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Discover Partners */}
          <TabsContent value="discover" className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search local businesses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="food">Food & Beverage</SelectItem>
                  <SelectItem value="fitness">Fitness & Health</SelectItem>
                  <SelectItem value="retail">Retail & Shopping</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {availablePartners.map((partner) => (
                <Card key={partner.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg flex items-center justify-center">
                          <Handshake className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{partner.name}</h3>
                          <p className="text-sm text-gray-500">{partner.category}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {partner.compatibility}% Match
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">{partner.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">Distance</p>
                        <p className="text-sm text-gray-500">{partner.distance}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Customers</p>
                        <p className="text-sm text-gray-500">{partner.customers}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Revenue Potential</p>
                        <p className="text-sm text-green-600 font-medium">{partner.potentialRevenue}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Rating</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{partner.rating}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full" onClick={() => setSelectedPartnership(partner)}>
                      Start Partnership
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Active Partnerships */}
          <TabsContent value="active" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activePartnerships.map((partnership) => (
                <Card key={partnership.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{partnership.name}</CardTitle>
                        <p className="text-sm text-gray-500">{partnership.type}</p>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {partnership.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{partnership.revenue}</p>
                        <p className="text-sm text-gray-500">This Month</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{partnership.customers}</p>
                        <p className="text-sm text-gray-500">Shared Customers</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Growth Rate</span>
                        <span className="text-sm text-green-600 font-medium">+{partnership.growth}%</span>
                      </div>
                      <Progress value={partnership.growth} className="h-2" />
                      
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-1">Active Campaign</p>
                        <p className="text-sm text-gray-600">{partnership.campaign}</p>
                        <p className="text-xs text-gray-500 mt-1">Started {partnership.startDate}</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button variant="outline" className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Partnership Templates */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {partnershipTemplates.map((template, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-purple-400 to-pink-400 text-white">
                        <Zap className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <p className="text-gray-600 text-sm">{template.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Key Benefits</h4>
                        <ul className="space-y-1">
                          {template.benefits.map((benefit, i) => (
                            <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                          <p className="text-sm font-medium">Setup Time</p>
                          <p className="text-sm text-gray-500">{template.setup}</p>
                        </div>
                        <Button size="sm">
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Partnership Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Growth from Partnerships
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-4xl font-bold text-green-600 mb-2">$24,750</div>
                    <div className="text-gray-500 mb-4">Total partnership revenue this quarter</div>
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">+32% from last quarter</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Customer Acquisition via Partners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { source: "TechHub Coworking", customers: 89, percentage: 35 },
                      { source: "Sunset Yoga Studio", customers: 67, percentage: 28 },
                      { source: "BookNook Cafe", customers: 45, percentage: 18 },
                      { source: "FitZone Gym", customers: 34, percentage: 14 }
                    ].map((source, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{source.source}</span>
                          <span className="text-sm text-gray-500">{source.customers} customers</span>
                        </div>
                        <Progress value={source.percentage} className="h-2" />
                      </div>
                    ))}
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