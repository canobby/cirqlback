import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Zap,
  TrendingUp,
  Share2,
  Users,
  Target,
  Star,
  Clock,
  Gift,
  Award,
  Sparkles,
  Crown,
  Heart,
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  QrCode,
  MapPin,
  Calendar,
  BarChart3,
  Eye,
  UserPlus,
  Rocket,
  Flame,
  Megaphone,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Repeat,
  ArrowUp,
  Globe
} from "lucide-react";

export default function ViralCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignFilter, setCampaignFilter] = useState("active");
  const [templateType, setTemplateType] = useState("all");

  // Mock data for viral campaigns
  const activeCampaigns = [
    {
      id: 1,
      title: "Coffee Lover's Challenge",
      description: "Share your coffee moments and invite friends to join the caffeine adventure",
      type: "Social Sharing",
      status: "Active",
      reach: 12450,
      engagement: 8.7,
      referrals: 347,
      revenue: "$4,250",
      viralCoefficient: 2.3,
      growth: 185,
      timeLeft: "5 days",
      participants: 1247,
      businesses: ["Brew & Bite", "Coffee Corner", "Morning Rush"],
      socialPlatforms: ["Instagram", "Facebook", "TikTok"],
      reward: "Free Coffee for a Month + VIP Status"
    },
    {
      id: 2,
      title: "Flash Mob Friday",
      description: "Synchronized city-wide check-ins creating massive FOMO and social buzz",
      type: "FOMO Event",
      status: "Scheduled",
      reach: 28500,
      engagement: 12.4,
      referrals: 892,
      revenue: "$8,750",
      viralCoefficient: 3.8,
      growth: 340,
      timeLeft: "2 days",
      participants: 2847,
      businesses: ["Multiple Locations"],
      socialPlatforms: ["Instagram", "TikTok", "Twitter"],
      reward: "Exclusive Flash Mob Badge + Premium Rewards"
    },
    {
      id: 3,
      title: "Local Foodie Influencer",
      description: "Turn customers into micro-influencers with exponential sharing rewards",
      type: "Influencer Network",
      status: "Active",
      reach: 18900,
      engagement: 15.2,
      referrals: 567,
      revenue: "$6,890",
      viralCoefficient: 4.1,
      growth: 275,
      timeLeft: "1 week",
      participants: 1892,
      businesses: ["Bistro 21", "Farm Table", "Sunset Grill"],
      socialPlatforms: ["Instagram", "YouTube", "TikTok"],
      reward: "Influencer Status + Revenue Sharing"
    }
  ];

  const campaignTemplates = [
    {
      name: "Friend Referral Multiplier",
      description: "Exponential rewards that grow with each successful referral",
      viralPotential: 5.2,
      setup: "30 minutes",
      mechanics: ["Friend invitation", "Exponential rewards", "Social proof", "FOMO triggers"],
      expectedROI: "450%",
      type: "Referral"
    },
    {
      name: "Social Proof Automation",
      description: "Real-time customer activity feeds that drive FOMO and engagement",
      viralPotential: 4.8,
      setup: "45 minutes",
      mechanics: ["Live activity feed", "Social validation", "Peer pressure", "Instant gratification"],
      expectedROI: "380%",
      type: "Social Proof"
    },
    {
      name: "Cross-Platform Sharing",
      description: "Integrated social media campaigns with conversion tracking",
      viralPotential: 4.2,
      setup: "1 hour",
      mechanics: ["Multi-platform posting", "Hashtag campaigns", "User-generated content", "Viral challenges"],
      expectedROI: "320%",
      type: "Social Media"
    },
    {
      name: "Community-Driven Marketing",
      description: "User-generated content campaigns with viral mechanics built-in",
      viralPotential: 4.6,
      setup: "2 hours",
      mechanics: ["Content creation contests", "Peer voting", "Community rewards", "Viral distribution"],
      expectedROI: "420%",
      type: "Community"
    }
  ];

  const viralMetrics = {
    totalReach: 89750,
    viralCoefficient: 3.2,
    socialShares: 15420,
    newCustomers: 2847,
    revenueGenerated: 28450,
    engagementRate: 12.8,
    conversionRate: 8.7,
    averageOrderValue: 24.50
  };

  const socialPlatforms = [
    { name: "Instagram", icon: Instagram, reach: 34500, engagement: 14.2, color: "bg-pink-500" },
    { name: "TikTok", icon: Share2, reach: 28900, engagement: 18.7, color: "bg-black" },
    { name: "Facebook", icon: Facebook, reach: 21200, engagement: 9.8, color: "bg-blue-600" },
    { name: "Twitter", icon: Twitter, reach: 15800, engagement: 11.3, color: "bg-blue-400" },
    { name: "YouTube", icon: Share2, reach: 12400, engagement: 16.5, color: "bg-red-600" }
  ];

  const viralMechanics = [
    {
      title: "Exponential Referral System",
      description: "Rewards multiply with each successful friend invitation",
      icon: <UserPlus className="h-6 w-6" />,
      impact: "5x growth rate",
      implementation: "Friend codes, bonus escalation, social validation"
    },
    {
      title: "Real-Time Social Proof",
      description: "Live customer activity feeds create FOMO and urgency",
      icon: <Eye className="h-6 w-6" />,
      impact: "3x conversion rate",
      implementation: "Activity streams, live counters, social notifications"
    },
    {
      title: "Cross-Platform Integration",
      description: "Seamless sharing across all major social media platforms",
      icon: <Globe className="h-6 w-6" />,
      impact: "8x reach amplification",
      implementation: "Auto-posting, hashtag optimization, viral content templates"
    },
    {
      title: "Community Challenge Engine",
      description: "User-generated viral challenges with peer competition",
      icon: <Zap className="h-6 w-6" />,
      impact: "10x engagement boost",
      implementation: "Challenge creation tools, voting systems, viral distribution"
    }
  ];

  const upcomingCampaigns = [
    {
      id: 1,
      title: "Valentine's Day Love Local",
      date: "Feb 14, 2025",
      type: "Seasonal",
      expectedReach: 50000,
      businesses: 45,
      description: "Couples challenge promoting local date night experiences"
    },
    {
      id: 2,
      title: "Spring Break Discovery",
      date: "Mar 15, 2025",
      type: "Youth Focused",
      expectedReach: 35000,
      businesses: 28,
      description: "Student-focused viral campaign for spring activities"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white">
              <Rocket className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Viral Growth Engine
              </h1>
              <p className="text-gray-600 text-lg mt-1">
                Exponential viral growth mechanics, social proof automation, and community-driven marketing campaigns
              </p>
            </div>
          </div>

          {/* Viral Metrics Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100">Total Reach</p>
                    <p className="text-3xl font-bold">{viralMetrics.totalReach.toLocaleString()}</p>
                    <p className="text-sm text-pink-100">+340% growth</p>
                  </div>
                  <Eye className="h-12 w-12 text-pink-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Viral Coefficient</p>
                    <p className="text-3xl font-bold">{viralMetrics.viralCoefficient}x</p>
                    <p className="text-sm text-purple-100">Each user brings 3.2 others</p>
                  </div>
                  <Repeat className="h-12 w-12 text-purple-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Social Shares</p>
                    <p className="text-3xl font-bold">{viralMetrics.socialShares.toLocaleString()}</p>
                    <p className="text-sm text-blue-100">+890% increase</p>
                  </div>
                  <Share2 className="h-12 w-12 text-blue-100" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Revenue Generated</p>
                    <p className="text-3xl font-bold">${viralMetrics.revenueGenerated.toLocaleString()}</p>
                    <p className="text-sm text-green-100">+560% ROI</p>
                  </div>
                  <TrendingUp className="h-12 w-12 text-green-100" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Viral Campaign Tabs */}
        <Tabs defaultValue="active-campaigns" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="active-campaigns" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Active Campaigns
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Viral Templates
            </TabsTrigger>
            <TabsTrigger value="social-platforms" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Social Platforms
            </TabsTrigger>
            <TabsTrigger value="viral-mechanics" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Viral Mechanics
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Events
            </TabsTrigger>
          </TabsList>

          {/* Active Campaigns */}
          <TabsContent value="active-campaigns" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter campaigns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Campaigns</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="high-performing">High Performing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Viral Campaign
              </Button>
            </div>

            <div className="space-y-6">
              {activeCampaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">{campaign.title}</CardTitle>
                          <Badge variant={campaign.status === "Active" ? "default" : "secondary"}
                                 className={campaign.status === "Active" ? "bg-green-500" : ""}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600">{campaign.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">{campaign.viralCoefficient}x</div>
                        <p className="text-sm text-gray-500">Viral Coefficient</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                      <div className="text-center p-4 bg-pink-50 rounded-lg">
                        <Eye className="h-6 w-6 text-pink-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-pink-600">{campaign.reach.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Total Reach</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <UserPlus className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-600">{campaign.referrals}</p>
                        <p className="text-sm text-gray-500">Referrals</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-600">{campaign.engagement}%</p>
                        <p className="text-sm text-gray-500">Engagement</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">{campaign.revenue}</p>
                        <p className="text-sm text-gray-500">Revenue</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Viral Growth Progress</span>
                          <span>+{campaign.growth}% this week</span>
                        </div>
                        <Progress value={Math.min(campaign.growth, 100)} className="h-3" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{campaign.participants.toLocaleString()} participants</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{campaign.timeLeft} remaining</span>
                          </div>
                        </div>
                        <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                          View Details
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Viral Templates */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Proven Viral Campaign Templates</h2>
                <p className="text-gray-600">Ready-to-use campaigns with exponential growth mechanics built-in</p>
              </div>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social-proof">Social Proof</SelectItem>
                  <SelectItem value="social-media">Social Media</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {campaignTemplates.map((template, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <p className="text-gray-600 mt-1">{template.description}</p>
                      </div>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        {template.viralPotential}x Viral
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Expected ROI</p>
                          <p className="text-lg font-bold text-green-600">{template.expectedROI}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Setup Time</p>
                          <p className="text-lg font-bold text-blue-600">{template.setup}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Viral Mechanics</p>
                        <div className="flex flex-wrap gap-2">
                          {template.mechanics.map((mechanic, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {mechanic}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                        Use Template
                        <Sparkles className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Social Platforms */}
          <TabsContent value="social-platforms" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {socialPlatforms.map((platform, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${platform.color} text-white`}>
                          <platform.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{platform.name}</h3>
                          <p className="text-sm text-gray-500">Social Platform</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{platform.reach.toLocaleString()}</p>
                          <p className="text-sm text-gray-500">Reach</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{platform.engagement}%</p>
                          <p className="text-sm text-gray-500">Engagement</p>
                        </div>
                      </div>

                      <Button className="w-full" variant="outline">
                        Connect Platform
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Viral Mechanics */}
          <TabsContent value="viral-mechanics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Exponential Growth Mechanics</h2>
                {viralMechanics.map((mechanic, index) => (
                  <Card key={index} className="border-l-4 border-l-purple-500">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
                          {mechanic.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{mechanic.title}</h3>
                          <p className="text-gray-600 mb-3">{mechanic.description}</p>
                          <div className="flex items-center gap-4">
                            <Badge className="bg-green-100 text-green-700">{mechanic.impact}</Badge>
                            <p className="text-sm text-gray-500">{mechanic.implementation}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="p-8 text-center">
                    <Rocket className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-4">Viral Growth Calculator</h3>
                    <p className="text-gray-600 mb-6">
                      Calculate your potential viral reach and revenue growth with our advanced modeling tools.
                    </p>
                    <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      Launch Calculator
                      <ArrowUp className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Viral Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Average Viral Coefficient</span>
                        <span className="font-semibold">3.2x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Share Rate</span>
                        <span className="font-semibold">24.8%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conversion from Shares</span>
                        <span className="font-semibold">8.7%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Campaign ROI</span>
                        <span className="font-semibold text-green-600">420%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Upcoming Events */}
          <TabsContent value="upcoming" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {upcomingCampaigns.map((campaign) => (
                <Card key={campaign.id} className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl text-blue-800">{campaign.title}</CardTitle>
                        <p className="text-gray-600 mt-1">{campaign.description}</p>
                      </div>
                      <Badge className="bg-blue-500 text-white">{campaign.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{campaign.date}</p>
                            <p className="text-sm text-gray-500">Launch Date</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{campaign.expectedReach.toLocaleString()}</p>
                            <p className="text-sm text-gray-500">Expected Reach</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{campaign.businesses} participating businesses</span>
                        </div>
                        <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          Join Campaign
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}