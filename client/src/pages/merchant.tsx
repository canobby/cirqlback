import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignManagement from "@/components/merchant/campaign-management";
import NFCWritingInterface from "@/components/merchant/nfc-writing-interface";
import PricingOptimizer from "@/components/merchant/pricing-optimizer";
import ViralCampaigns from "@/components/marketing/viral-campaigns";
import StatsCard from "@/components/ui/stats-card";
import { Store, Users, Share2, TrendingUp, Coffee, BookOpen, UtensilsCrossed, DollarSign, Zap } from "lucide-react";

export default function Merchant() {
  const [selectedBusiness] = useState("business-1"); // Simulate selected business

  // Mock stats data
  const stats = {
    totalTaps: 1247,
    activeCustomers: 342,
    referrals: 89,
    conversionRate: 23.4
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold gradient-text mb-4">Merchant Dashboard</h1>
        <p className="text-xl text-gray-600">Manage your campaigns and track performance with powerful analytics</p>
      </div>

      {/* Enhanced Business Header */}
      <Card className="mb-8 card-hover glow-effect">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl gradient-text">☕ Joe's Coffee Shop</CardTitle>
              <p className="text-gray-600">Downtown Location • Active since Jan 2024 • Premium Member</p>
              <div className="flex items-center mt-2 space-x-4">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">🟢 Live</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">💎 Gold Tier</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">⚡ High Volume</span>
              </div>
            </div>
            <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center floating-animation">
              <Coffee className="text-white h-8 w-8" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Taps"
          value={stats.totalTaps.toLocaleString()}
          icon={Store}
          color="blue"
          subtitle="This month"
          trend={{ value: "+23%", isPositive: true }}
        />
        <StatsCard
          title="Active Customers"
          value={stats.activeCustomers.toLocaleString()}
          icon={Users}
          color="green"
          subtitle="Weekly active"
          trend={{ value: "+18%", isPositive: true }}
        />
        <StatsCard
          title="Referrals Generated"
          value={stats.referrals.toString()}
          icon={Share2}
          color="yellow"
          subtitle="This month"
          trend={{ value: "+45%", isPositive: true }}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={TrendingUp}
          color="purple"
          subtitle="Tap to purchase"
          trend={{ value: "+5.2%", isPositive: true }}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="nfc-tags">NFC Tags</TabsTrigger>
          <TabsTrigger value="pricing">AI Pricing</TabsTrigger>
          <TabsTrigger value="viral">Viral Marketing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignManagement businessId={selectedBusiness} />
        </TabsContent>

        <TabsContent value="nfc-tags">
          <NFCWritingInterface businessId={selectedBusiness} />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingOptimizer />
        </TabsContent>

        <TabsContent value="viral">
          <ViralCampaigns />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Premium Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="card-hover glow-effect">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text">$2,847</div>
                  <div className="text-sm text-gray-600 mt-1">Revenue This Month</div>
                  <div className="text-xs text-green-600 mt-1">↗ +32% vs last month</div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover glow-effect">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text">4.8⭐</div>
                  <div className="text-sm text-gray-600 mt-1">Customer Rating</div>
                  <div className="text-xs text-blue-600 mt-1">Based on 127 reviews</div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover glow-effect">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text">68%</div>
                  <div className="text-sm text-gray-600 mt-1">Return Rate</div>
                  <div className="text-xs text-purple-600 mt-1">Customers come back</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Enhanced Real-Time Activity */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gradient-text">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  Live Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg floating-animation">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Store className="text-green-600 h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">💰 Sarah earned $5 referral bonus</p>
                      <p className="text-xs text-gray-500">2 minutes ago • Counter NFC</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg floating-animation" style={{ animationDelay: '0.3s' }}>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Share2 className="text-blue-600 h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">🎯 Mike completed Downtown Trail</p>
                      <p className="text-xs text-gray-500">5 minutes ago • $20 bonus earned</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-2 bg-yellow-50 rounded-lg floating-animation" style={{ animationDelay: '0.6s' }}>
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="text-yellow-600 h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">🎉 Jennifer shared referral link</p>
                      <p className="text-xs text-gray-500">12 minutes ago • Instagram</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Performance */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-800">☕ Free Coffee Friday</span>
                      <span className="text-sm font-bold text-green-900">67%</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-3 mb-2">
                      <div className="bg-green-500 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: "67%" }}></div>
                    </div>
                    <p className="text-xs text-green-600">124 taps • $1,240 revenue • 89% conversion</p>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800">📚 Book Club Discount</span>
                      <span className="text-sm font-bold text-blue-900">45%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                      <div className="bg-blue-500 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: "45%" }}></div>
                    </div>
                    <p className="text-xs text-blue-600">78 taps • $890 revenue • 67% conversion</p>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-800">🍕 Lunch Special</span>
                      <span className="text-sm font-bold text-purple-900">52%</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-3 mb-2">
                      <div className="bg-purple-500 h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: "52%" }}></div>
                    </div>
                    <p className="text-xs text-purple-600">92 taps • $1,150 revenue • 71% conversion</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Premium Insights */}
          <Card className="card-hover glow-effect">
            <CardHeader>
              <CardTitle className="gradient-text">🚀 AI-Powered Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">🎯 Peak Performance</h4>
                    <p className="text-sm text-yellow-700">Friday afternoons show 3x higher tap rates. Consider running special campaigns during 2-4 PM.</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">💡 Revenue Opportunity</h4>
                    <p className="text-sm text-green-700">Coffee + pastry bundles could increase average order value by $3.20 based on customer patterns.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">📈 Growth Prediction</h4>
                    <p className="text-sm text-purple-700">Current trends suggest you'll reach 500 active customers by next month with 15% revenue growth.</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">🔥 Trending Now</h4>
                    <p className="text-sm text-blue-700">Referral campaigns are performing 34% better than average. Perfect time to boost rewards!</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
