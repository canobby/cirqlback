import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Store, Users, Share2, TrendingUp, Coffee, Zap, Smartphone, 
  BarChart3, Target, Gift, ArrowRight, Settings, Globe, 
  MessageSquare, Calendar, DollarSign, Crown, Trophy
} from "lucide-react";

export default function MerchantBento() {
  const [selectedBusiness] = useState("business-1");

  // Mock stats data
  const stats = {
    totalTaps: 1247,
    activeCustomers: 342,
    referrals: 89,
    conversionRate: 23.4,
    monthlyRevenue: 15420,
    growthRate: 18.5
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/30 dark:from-gray-950 dark:via-purple-950/30 dark:to-pink-950/30">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                Business Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Complete control center for Joe's Coffee Shop
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => window.location.href = '/merchant'}
                variant="outline"
                className="text-white"
              >
                Classic View
              </Button>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Live
              </Badge>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-6 auto-rows-min">
          
          {/* Quick Actions - Large Block */}
          <Card className="md:col-span-6 lg:col-span-4 bg-gradient-to-br from-purple-500 to-pink-500 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            <CardContent className="p-8 relative z-10">
              <h2 className="text-2xl font-bold mb-2">Quick Setup</h2>
              <p className="text-purple-100 mb-6">Get your campaigns and tags running in minutes</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => window.location.href = '/campaign-setup-wizard'}
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
                  onClick={() => window.location.href = '/nfc-setup-wizard'}
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
          <Card className="md:col-span-3 lg:col-span-2 md:row-span-2 bg-gradient-to-br from-green-500 to-blue-500 border-0 text-white">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="h-8 w-8 text-green-100" />
                <Badge className="bg-white/20 text-white border-white/30">+{stats.growthRate}%</Badge>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-green-100 mb-2">Monthly Revenue</h3>
                <div className="text-3xl font-bold mb-1">${stats.monthlyRevenue.toLocaleString()}</div>
                <p className="text-green-100 text-sm">Up 18.5% from last month</p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/20">
                <div className="text-sm text-green-100 mb-1">Cirql Impact</div>
                <div className="text-xl font-semibold">$4,280</div>
                <div className="text-xs text-green-200">28% of total revenue</div>
              </div>
            </CardContent>
          </Card>

          {/* Active Campaigns - Medium Block */}
          <Card className="md:col-span-3 lg:col-span-2 bg-gradient-to-br from-orange-500 to-red-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Gift className="h-6 w-6 text-orange-100" />
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-1">Active Campaigns</h3>
              <p className="text-orange-100 text-sm mb-4">Running promotions</p>
              <Button 
                size="sm" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                variant="outline"
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
                <Badge className="bg-white/20 text-white border-white/30">+23%</Badge>
              </div>
              <div className="text-2xl font-bold">{stats.activeCustomers}</div>
              <p className="text-blue-100 text-sm">Active Customers</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-gradient-to-br from-pink-500 to-purple-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Share2 className="h-6 w-6 text-pink-100" />
                <Badge className="bg-white/20 text-white border-white/30">+45%</Badge>
              </div>
              <div className="text-2xl font-bold">{stats.referrals}</div>
              <p className="text-pink-100 text-sm">Referrals Generated</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-gradient-to-br from-yellow-500 to-orange-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-6 w-6 text-yellow-100" />
                <Badge className="bg-white/20 text-white border-white/30">+5.2%</Badge>
              </div>
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
              <p className="text-yellow-100 text-sm">Conversion Rate</p>
            </CardContent>
          </Card>

          {/* Management Tools */}
          <Card className="md:col-span-3 lg:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Performance insights</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.location.href = '/analytics'}
                className="text-white"
              >
                View Details
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 lg:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Smartphone className="h-6 w-6 text-blue-600" />
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">NFC Tags</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Manage your tags</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => window.location.href = '/nfc-writer'}
                className="text-white"
              >
                Tag Manager
              </Button>
            </CardContent>
          </Card>

          {/* Additional Tools Row */}
          <Card className="md:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Communication</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Customer messaging</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-600 transition-colors">
            <CardContent className="p-6 text-center">
              <Calendar className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Campaigns</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Schedule & manage</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
            <CardContent className="p-6 text-center">
              <Settings className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Settings</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Business config</p>
            </CardContent>
          </Card>

          {/* Recent Activity - Wide Block */}
          <Card className="md:col-span-6 lg:col-span-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <Trophy className="h-5 w-5 mr-2 text-purple-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-900 dark:text-white">Campaign "Summer Special" activated</span>
                  </div>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-900 dark:text-white">NFC tag programmed at front counter</span>
                  </div>
                  <span className="text-xs text-gray-500">4 hours ago</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-900 dark:text-white">23 new customer taps today</span>
                  </div>
                  <span className="text-xs text-gray-500">6 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Chart Placeholder */}
          <Card className="md:col-span-3 lg:col-span-4 bg-gradient-to-br from-indigo-500 to-purple-600 border-0 text-white">
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
                  <div className="text-lg font-bold">1,247</div>
                  <div className="text-xs text-indigo-100">Total Taps</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">342</div>
                  <div className="text-xs text-indigo-100">Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">89</div>
                  <div className="text-xs text-indigo-100">Referrals</div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}