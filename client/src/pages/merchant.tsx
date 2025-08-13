import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignManagement from "@/components/merchant/campaign-management";
import NFCWritingInterface from "@/components/merchant/nfc-writing-interface";
import NfcWritingWizard from "@/components/nfc/NfcWritingWizard";
import NfcTagManager from "@/components/nfc/NfcTagManager";
import NfcDeploymentGuide from "@/components/nfc/NfcDeploymentGuide";
import NfcAnalyticsDashboard from "@/components/nfc/NfcAnalyticsDashboard";
import PricingOptimizer from "@/components/merchant/pricing-optimizer";
import ViralCampaigns from "@/components/marketing/viral-campaigns";
import StatsCard from "@/components/ui/stats-card";
import WebNFCInterface from "@/components/nfc/web-nfc-interface";
import NFCStatusIndicator from "@/components/nfc/nfc-status-indicator";
import { Store, Users, Share2, TrendingUp, Coffee, BookOpen, UtensilsCrossed, DollarSign, Zap, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import PlatformSync from "@/components/global/platform-sync";
import { GuidedTour } from "@/components/interactive/guided-tour";

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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">AI-Powered Business Intelligence Hub</h1>
            <p className="text-xl text-gray-600">Complete business ecosystem with AI partnership recommendations, multi-merchant reward pools, predictive customer analytics, 22+ platform integrations, automated marketing orchestration, and comprehensive export capabilities</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/merchant-bento'}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            <Zap className="h-4 w-4 mr-2" />
            Try Bento Layout
          </Button>
        </div>
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

      {/* Platform Sync Status */}
      <div className="mb-8">
        <PlatformSync />
      </div>

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

      {/* Quick Setup Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="card-hover border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">
                  Create New Campaign
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Set up discounts, loyalty points, or referral rewards in minutes
                </p>
                <Button 
                  onClick={() => window.location.href = '/campaign-setup-bento'}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start Campaign Wizard
                </Button>
              </div>
              <div className="text-6xl opacity-20">🎯</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Program NFC Tag
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Quick physical tag setup with guided step-by-step process
                </p>
                <Button 
                  onClick={() => window.location.href = '/nfc-setup-wizard'}
                  className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Start NFC Wizard
                </Button>
              </div>
              <div className="text-6xl opacity-20">📱</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid grid-cols-8 min-w-max lg:w-full">
            <TabsTrigger value="campaigns" className="px-2 text-xs lg:px-3 lg:text-sm" data-tour="campaigns-tab">Campaigns</TabsTrigger>
            <TabsTrigger value="nfc-manager" className="px-2 text-xs lg:px-3 lg:text-sm">Tag Manager</TabsTrigger>
            <TabsTrigger value="nfc-guide" className="px-2 text-xs lg:px-3 lg:text-sm">Deployment</TabsTrigger>
            <TabsTrigger value="nfc-analytics" className="px-2 text-xs lg:px-3 lg:text-sm">Tag Analytics</TabsTrigger>
            <TabsTrigger value="pricing" className="px-2 text-xs lg:px-3 lg:text-sm">AI Pricing</TabsTrigger>
            <TabsTrigger value="viral" className="px-2 text-xs lg:px-3 lg:text-sm">Viral Marketing</TabsTrigger>
            <TabsTrigger value="marketing" className="px-2 text-xs lg:px-3 lg:text-sm" data-tour="marketing-tab">Marketing</TabsTrigger>
            <TabsTrigger value="analytics" className="px-2 text-xs lg:px-3 lg:text-sm" data-tour="analytics-tab">Analytics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="campaigns">
          <CampaignManagement businessId={selectedBusiness} />
        </TabsContent>

        <TabsContent value="campaign-builder">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-purple-500" />
                Campaign Builder Access
              </CardTitle>
              <p className="text-gray-600">Create campaigns using pre-made templates with seasonal rotation</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Advanced Campaign Templates</h3>
                <p className="text-gray-600 mb-6">Access 9+ pre-made templates with seasonal rotation and cross-business collaboration</p>
                <Button onClick={() => window.location.href = '/campaign-builder'} className="bg-purple-600 hover:bg-purple-700">
                  <Zap className="mr-2 h-4 w-4" />
                  Open Campaign Builder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nfc-wizard" className="space-y-6">
          <div className="mb-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">Advanced NFC Tag Writer</h3>
                    <p className="text-blue-700 text-sm">Program physical NFC tags with Web NFC API integration</p>
                  </div>
                  <Button 
                    onClick={() => window.location.href = '/nfc-writer'} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
                    Open Tag Writer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <NfcWritingWizard businessId={selectedBusiness} />
        </TabsContent>

        <TabsContent value="nfc-manager" className="space-y-6">
          <NfcTagManager businessId={selectedBusiness} />
        </TabsContent>

        <TabsContent value="nfc-guide" className="space-y-6">
          <NfcDeploymentGuide />
        </TabsContent>

        <TabsContent value="nfc-analytics" className="space-y-6">
          <NfcAnalyticsDashboard businessId={selectedBusiness} />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingOptimizer />
        </TabsContent>

        <TabsContent value="viral">
          <ViralCampaigns />
        </TabsContent>

        <TabsContent value="marketing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
                Marketing Suite Access
              </CardTitle>
              <p className="text-gray-600">Advanced marketing tools and customer data analytics</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/marketing'}>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-blue-800">Email Campaigns</h3>
                    <p className="text-sm text-gray-600 mt-1">Send targeted emails to customer segments</p>
                    <div className="mt-3 text-sm">
                      <span className="text-blue-600 font-medium">2,847</span> customers
                    </div>
                  </div>
                </Card>

                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/marketing'}>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <UtensilsCrossed className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-purple-800">Social Media</h3>
                    <p className="text-sm text-gray-600 mt-1">Automated Instagram and Facebook ads</p>
                    <div className="mt-3 text-sm">
                      <span className="text-purple-600 font-medium">68%</span> engagement rate
                    </div>
                  </div>
                </Card>

                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/marketing'}>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-green-800">SMS Marketing</h3>
                    <p className="text-sm text-gray-600 mt-1">Direct text message campaigns</p>
                    <div className="mt-3 text-sm">
                      <span className="text-green-600 font-medium">4.2x</span> ROI
                    </div>
                  </div>
                </Card>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">Customer Data Insights</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Frequent Visitors:</span>
                    <div className="text-2xl font-bold text-blue-800">847</div>
                  </div>
                  <div>
                    <span className="text-purple-700 font-medium">High-Value:</span>
                    <div className="text-2xl font-bold text-purple-800">234</div>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">New Customers:</span>
                    <div className="text-2xl font-bold text-green-800">456</div>
                  </div>
                  <div>
                    <span className="text-orange-700 font-medium">At Risk:</span>
                    <div className="text-2xl font-bold text-orange-800">312</div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button 
                  onClick={() => window.location.href = '/marketing'}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium"
                >
                  Open Full Marketing Suite
                </button>
              </div>
            </CardContent>
          </Card>
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

      {/* Merchant Guided Tour */}
      <GuidedTour
        tourId="merchant-tour"
        autoStart={false}
        steps={[
          {
            id: "business-header",
            target: ".card-hover.glow-effect",
            title: "Business Overview",
            description: "Your business profile with real-time status and membership tier",
            tip: "Monitor your business performance and activity status here",
            position: "bottom"
          },
          {
            id: "stats-overview",
            target: ".grid.grid-cols-1.md\\:grid-cols-4",
            title: "Performance Metrics",
            description: "Track customer taps, engagement, and conversion rates",
            tip: "These metrics update in real-time as customers interact with your business",
            position: "bottom"
          },
          {
            id: "nfc-management",
            target: "[data-tour='nfc-tab']",
            title: "Cirql Tag Management",
            description: "Create, write, and manage your Cirql tags for customer touchpoints",
            tip: "Use the NFC wizard to set up tags at tables, counters, and promotional areas",
            position: "top"
          },
          {
            id: "campaign-management",
            target: "[data-tour='campaigns-tab']",
            title: "Campaign Center",
            description: "Design and launch marketing campaigns with reward automation",
            tip: "Create cross-business partnerships to expand your customer reach",
            position: "top"
          },
          {
            id: "analytics-insights",
            target: "[data-tour='analytics-tab']",
            title: "Business Intelligence",
            description: "AI-powered insights and predictive customer analytics",
            tip: "Use these insights to optimize pricing and predict customer behavior",
            position: "top"
          },
          {
            id: "marketing-suite",
            target: "[data-tour='marketing-tab']",
            title: "Marketing Automation",
            description: "Automated social media, email, and SMS marketing campaigns",
            tip: "Your campaigns run automatically based on customer behavior patterns",
            position: "top"
          }
        ]}
      />
    </main>
  );
}
