import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Instagram, Twitter, Facebook, Users, Zap, Share2, Heart, MessageCircle, TrendingUp, Target } from "lucide-react";

export default function ViralCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const campaigns = [
    {
      id: "coffee-challenge",
      name: "Coffee Shop Challenge",
      description: "Tag 3 friends for a free coffee chain reaction",
      platform: "Instagram",
      status: "Active",
      reach: 12847,
      engagement: 34.5,
      conversions: 89,
      viralFactor: 2.3,
      content: "🚨 Coffee Emergency! 🚨\n\nFirst 50 people to tap our NFC tag get a FREE coffee! ☕\n\nBUT WAIT... if you tag 3 friends, they get 50% off too! 🤯\n\n#CoffeeChallenge #Cirqlback #FreeCoffee"
    },
    {
      id: "mystery-reward",
      name: "Mystery Monday",
      description: "Random rewards for Monday tappers",
      platform: "TikTok",
      status: "Scheduled",
      reach: 8934,
      engagement: 67.2,
      conversions: 156,
      viralFactor: 4.1,
      content: "POV: You tap the NFC tag and win... 🤔\n\n✨ Free lunch?\n💰 $50 gift card?\n🎁 Mystery prize?\n\nOnly one way to find out! 👀\n\n#MysteryMonday #TapToWin"
    },
    {
      id: "streak-showoff",
      name: "Streak Flex Friday",
      description: "Show off your tap streaks for rewards",
      platform: "Instagram Stories",
      status: "Draft",
      reach: 5621,
      engagement: 45.8,
      conversions: 67,
      viralFactor: 1.8,
      content: "How long is your Cirqlback streak? 🔥\n\nShare your streak on your story and tag us for:\n• 5+ days: Free pastry\n• 10+ days: Free meal\n• 20+ days: VIP status!\n\n#StreakFlex #LoyaltyRewards"
    }
  ];

  const templates = [
    {
      category: "FOMO Campaigns",
      templates: [
        "🚨 LAST CHANCE! Only X spots left for [reward]",
        "⏰ 24 hours left to claim your [reward]", 
        "🔥 This is going VIRAL! Don't miss out on [reward]"
      ]
    },
    {
      category: "Social Proof",
      templates: [
        "1000+ people already claimed their [reward] today!",
        "Your friends are already earning rewards - join them!",
        "Be part of the X people who discovered this hidden gem"
      ]
    },
    {
      category: "Challenge Campaigns",
      templates: [
        "Can you tap X locations in one day? We dare you!",
        "Tag X friends and unlock the group reward",
        "Beat your friend's streak and win [reward]"
      ]
    }
  ];

  const viralMetrics = {
    totalReach: 27402,
    avgEngagement: 49.2,
    viralCoefficient: 2.73,
    referralRate: 34,
    socialConversions: 312,
    ugcPosts: 89
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "Instagram": return <Instagram className="h-4 w-4 text-pink-600" />;
      case "TikTok": return <div className="h-4 w-4 bg-black rounded text-white text-xs flex items-center justify-center">T</div>;
      case "Twitter": return <Twitter className="h-4 w-4 text-blue-500" />;
      case "Facebook": return <Facebook className="h-4 w-4 text-blue-600" />;
      default: return <Share2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="card-hover glow-effect">
        <CardHeader>
          <CardTitle className="flex items-center gradient-text">
            <Zap className="mr-2 h-6 w-6" />
            Viral Marketing Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">{viralMetrics.totalReach.toLocaleString()}</div>
              <div className="text-sm text-pink-700">Total Reach</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{viralMetrics.avgEngagement}%</div>
              <div className="text-sm text-blue-700">Avg Engagement</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{viralMetrics.viralCoefficient}x</div>
              <div className="text-sm text-green-700">Viral Coefficient</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{viralMetrics.socialConversions}</div>
              <div className="text-sm text-purple-700">Social Conversions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active Campaigns</TabsTrigger>
          <TabsTrigger value="create">Create Campaign</TabsTrigger>
          <TabsTrigger value="templates">Viral Templates</TabsTrigger>
          <TabsTrigger value="analytics">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="card-hover">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      {getPlatformIcon(campaign.platform)}
                      <div>
                        <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                        <p className="text-sm text-gray-600">{campaign.description}</p>
                      </div>
                    </div>
                    <Badge variant={campaign.status === "Active" ? "default" : campaign.status === "Scheduled" ? "secondary" : "outline"}>
                      {campaign.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-bold text-blue-600">{campaign.reach.toLocaleString()}</div>
                      <div className="text-xs text-blue-600">Reach</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-bold text-green-600">{campaign.engagement}%</div>
                      <div className="text-xs text-green-600">Engagement</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="font-bold text-purple-600">{campaign.conversions}</div>
                      <div className="text-xs text-purple-600">Conversions</div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="font-bold text-orange-600">{campaign.viralFactor}x</div>
                      <div className="text-xs text-orange-600">Viral Factor</div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Campaign Content:</div>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{campaign.content}</p>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <MessageCircle className="mr-1 h-3 w-3" />
                      Edit Content
                    </Button>
                    <Button size="sm" variant="outline">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      Boost Campaign
                    </Button>
                    <Button size="sm" className="gradient-bg border-0 text-white">
                      <Share2 className="mr-1 h-3 w-3" />
                      Share Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="gradient-text">Create Viral Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Campaign Name</label>
                    <Input placeholder="e.g., Flash Friday Deal" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Platform</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button variant="outline" size="sm">
                        <Instagram className="mr-1 h-3 w-3" />
                        Instagram
                      </Button>
                      <Button variant="outline" size="sm">
                        <Twitter className="mr-1 h-3 w-3" />
                        Twitter
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Campaign Type</label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      <Button variant="outline" size="sm">
                        <Target className="mr-1 h-3 w-3" />
                        FOMO Campaign
                      </Button>
                      <Button variant="outline" size="sm">
                        <Users className="mr-1 h-3 w-3" />
                        Referral Challenge
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Campaign Content</label>
                    <Textarea 
                      placeholder="Write your viral campaign content here..."
                      className="min-h-32"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Reward/Incentive</label>
                    <Input placeholder="e.g., Free coffee, 50% off, $10 credit" />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Button variant="outline" className="flex-1">
                  <Heart className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button className="flex-1 gradient-bg border-0 text-white">
                  <Zap className="mr-2 h-4 w-4" />
                  Launch Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {templates.map((category, index) => (
            <Card key={index} className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">{category.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.templates.map((template, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                      <span className="text-sm text-gray-700">{template}</span>
                      <Button size="sm" variant="outline">
                        Use Template
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Viral Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">🚀 Top Performer</h4>
                    <p className="text-sm text-green-700">Coffee Challenge achieved 4.1x viral coefficient</p>
                    <div className="text-xs text-green-600 mt-1">Generated 156 new customers</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Shares per Post</span>
                      <span className="font-bold">23.4</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">User-Generated Content</span>
                      <span className="font-bold">{viralMetrics.ugcPosts} posts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Referral Conversion</span>
                      <span className="font-bold">{viralMetrics.referralRate}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Growth Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">💡 AI Recommendation</h4>
                    <p className="text-sm text-blue-700">Friday 3-5 PM shows highest engagement. Schedule premium campaigns then.</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">🎯 Next Action</h4>
                    <p className="text-sm text-purple-700">Launch a group challenge campaign to boost viral coefficient by 40%.</p>
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