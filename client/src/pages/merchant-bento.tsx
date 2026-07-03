import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store, Users, Share2, TrendingUp, Coffee, Zap, Smartphone,
  BarChart3, Target, Gift, ArrowRight, Settings, Globe,
  MessageSquare, Calendar, DollarSign, Crown, Trophy
} from "lucide-react";
import GroupCampaignsPanel from "@/components/merchant/group-campaigns-panel";
import AddonsPanel from "@/components/merchant/addons-panel";
import TapBrandingEditor from "@/components/merchant/tap-branding-editor";
import WebsiteEditor from "@/components/merchant/website-editor";
import ScavengerBuilder from "@/components/merchant/scavenger-builder";
import RemindersPanel from "@/components/merchant/reminders-panel";
import MessageCenter from "@/components/messaging/message-center";

export default function MerchantBento() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Real data: the owner's first business + its analytics (auto-scoped server-side).
  const { data: businesses = [] } = useQuery<any[]>({ queryKey: ["/api/my/businesses"], retry: false });
  const business = businesses[0];
  const { data: analytics } = useQuery<any>({ queryKey: ["/api/analytics/dashboard"], retry: false });

  const tier = (user?.subscriptionTier as string) || "starter";
  const tierLabel = tier === "pro" ? "Pro" : tier === "core" ? "Core" : "Starter";

  const stats = {
    totalTaps: analytics?.totalTaps ?? 0,
    activeCustomers: analytics?.activeCustomers ?? 0,
    rewardsIssued: analytics?.rewardsIssued ?? 0,
    conversionRate: analytics?.conversionRate ?? 0,
    monthlyRevenue: analytics?.totalRevenue ?? 0,
    cirqlImpact: analytics?.cirqlDrivenRevenue ?? 0,
    activeCampaigns: Array.isArray(analytics?.topCampaigns) ? analytics.topCampaigns.length : 0,
  };
  const cirqlPct = stats.monthlyRevenue > 0 ? Math.round((stats.cirqlImpact / stats.monthlyRevenue) * 100) : 0;
  const recentActivity: any[] = Array.isArray(analytics?.recentActivity) ? analytics.recentActivity : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/30 pb-8 pt-20">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-2">
                Business Hub
              </h1>
              <p className="text-gray-600 text-lg">
                Complete control center for {business?.name ?? "your business"}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Live
              </Badge>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                <Crown className="w-3 h-3 mr-1" />
                {tierLabel}
              </Badge>
            </div>
          </div>
        </div>

        {/* CHR-58: real multi-store group-campaign membership */}
        <GroupCampaignsPanel />

        {/* CHR-35/66: add-on entitlement status */}
        <AddonsPanel />

        {/* CHR-68: custom tap-screen branding editor (add-on) */}
        <TapBrandingEditor />

        {/* Hosted business page editor (hosted_website add-on) */}
        <WebsiteEditor />

        {/* CHR-69: contest & scavenger-hunt builder (add-on) */}
        <ScavengerBuilder />

        {/* CHR-75: reminders to favoriters */}
        <RemindersPanel />

        {/* Cross-role messaging (Slice 1) — talk to your community coordinator */}
        <MessageCenter role="business" />

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-min">
          
          {/* Quick Actions - Large Block */}
          <Card className="md:col-span-6 bg-gradient-to-br from-purple-500 to-pink-500 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            <CardContent className="p-6 relative z-10">
              <h2 className="text-2xl font-bold mb-2">Quick Setup</h2>
              <p className="text-purple-100 mb-6">Get your campaigns and tags running in minutes</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => setLocation('/campaign-setup-wizard')}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-auto p-4 justify-start"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <div className="bg-white/20 p-2 rounded-lg mr-3">
                      <Target className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Create Campaign</div>
                      <div className="text-sm text-purple-100">Discounts & rewards</div>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </div>
                </Button>
                
                <Button 
                  onClick={() => setLocation('/nfc-setup-wizard-bento')}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-auto p-4 justify-start"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <div className="bg-white/20 p-2 rounded-lg mr-3">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Program Tag</div>
                      <div className="text-sm text-purple-100">NFC setup wizard</div>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Metrics - Tall Block */}
          <Card className="md:col-span-3 bg-gradient-to-br from-green-500 to-blue-500 border-0 text-white">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="h-8 w-8 text-green-100" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-green-100 mb-2">Revenue</h3>
                <div className="text-3xl font-bold mb-1">${stats.monthlyRevenue.toLocaleString()}</div>
                <p className="text-green-100 text-sm">Tap-attributed revenue to date</p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/20">
                <div className="text-sm text-green-100 mb-1">Cirql Impact</div>
                <div className="text-xl font-semibold">${stats.cirqlImpact.toLocaleString()}</div>
                <div className="text-xs text-green-200">{cirqlPct}% of total revenue</div>
              </div>
            </CardContent>
          </Card>

          {/* Active Campaigns - Medium Block */}
          <Card className="md:col-span-3 bg-gradient-to-br from-orange-500 to-red-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Gift className="h-6 w-6 text-orange-100" />
                <span className="text-2xl font-bold">{stats.activeCampaigns}</span>
              </div>
              <h3 className="font-semibold mb-1">Active Campaigns</h3>
              <p className="text-orange-100 text-sm mb-4">Running promotions</p>
              <Button
                variant="outline"
                size="sm" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                onClick={() => setLocation('/campaign-setup-wizard')}
              >
                Manage
              </Button>
            </CardContent>
          </Card>

          {/* Customer Stats Row */}
          <Card className="md:col-span-2 bg-gradient-to-br from-blue-500 to-purple-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-6 w-6 text-blue-100" />
              </div>
              <div className="text-2xl font-bold">{stats.activeCustomers}</div>
              <p className="text-blue-100 text-sm">Active Customers</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-gradient-to-br from-pink-500 to-purple-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Gift className="h-6 w-6 text-pink-100" />
              </div>
              <div className="text-2xl font-bold">{stats.rewardsIssued}</div>
              <p className="text-pink-100 text-sm">Rewards Issued</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-gradient-to-br from-yellow-500 to-orange-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-6 w-6 text-yellow-100" />
              </div>
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
              <p className="text-yellow-100 text-sm">Conversion Rate</p>
            </CardContent>
          </Card>

          {/* Management Tools */}
          <Card className="md:col-span-3 bg-white border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer" onClick={() => setLocation('/analytics')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Analytics</h3>
              <p className="text-gray-600 text-sm mb-4">Performance insights</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                View Details
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 bg-white border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => setLocation('/nfc-writer')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Smartphone className="h-6 w-6 text-blue-600" />
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">NFC Tags</h3>
              <p className="text-gray-600 text-sm mb-4">Manage your tags</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
              >
                Tag Manager
              </Button>
            </CardContent>
          </Card>

          {/* Additional Tools Row */}
          <Card 
            className="md:col-span-2 bg-white border-2 border-gray-200 hover:border-green-300 transition-colors cursor-pointer"
            onClick={() => setLocation('/communication')}
          >
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Communication</h3>
              <p className="text-gray-600 text-xs">Customer messaging</p>
            </CardContent>
          </Card>

          <Card 
            className="md:col-span-2 bg-white border-2 border-gray-200 hover:border-yellow-300 transition-colors cursor-pointer"
            onClick={() => setLocation('/campaign-setup-wizard')}
          >
            <CardContent className="p-6 text-center">
              <Calendar className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Campaigns</h3>
              <p className="text-gray-600 text-xs">Schedule & manage</p>
            </CardContent>
          </Card>

          <Card 
            className="md:col-span-2 bg-white border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
            onClick={() => setLocation('/settings')}
          >
            <CardContent className="p-6 text-center">
              <Settings className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Settings</h3>
              <p className="text-gray-600 text-xs">Business config</p>
            </CardContent>
          </Card>

          {/* Recent Activity - Wide Block */}
          <Card className="md:col-span-6 bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <Trophy className="h-5 w-5 mr-2 text-purple-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">No recent activity yet. Taps and redemptions will show here.</p>
                )}
                {recentActivity.slice(0, 6).map((a, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${a.kind === "redemption" ? "bg-purple-50" : "bg-green-50"}`}>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${a.kind === "redemption" ? "bg-purple-500" : "bg-green-500"}`}></div>
                      <span className="text-sm text-gray-900">{a.action}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Chart Placeholder */}
          <Card className="md:col-span-6 bg-gradient-to-br from-indigo-500 to-purple-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Performance Overview</h3>
                <Button size="sm" variant="outline" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                  View Full Report
                </Button>
              </div>
              
              {/* Mock chart area */}
              <div className="h-32 bg-white/10 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-indigo-100" />
                  <p className="text-indigo-100 text-sm">Interactive charts loading...</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-lg font-bold">{stats.totalTaps.toLocaleString()}</div>
                  <div className="text-xs text-indigo-100">Total Taps</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{stats.activeCustomers.toLocaleString()}</div>
                  <div className="text-xs text-indigo-100">Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{stats.rewardsIssued.toLocaleString()}</div>
                  <div className="text-xs text-indigo-100">Rewards</div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}