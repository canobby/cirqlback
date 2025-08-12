import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignManagement from "@/components/merchant/campaign-management";
import NFCWritingInterface from "@/components/merchant/nfc-writing-interface";
import StatsCard from "@/components/ui/stats-card";
import { Store, Users, Share2, TrendingUp, Coffee, BookOpen, UtensilsCrossed } from "lucide-react";

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
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Merchant Dashboard</h1>
        <p className="text-xl text-gray-600">Manage your campaigns and track performance</p>
      </div>

      {/* Business Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">Joe's Coffee Shop</CardTitle>
              <p className="text-gray-600">Downtown Location • Active since Jan 2024</p>
            </div>
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Coffee className="text-white h-6 w-6" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Taps"
          value={stats.totalTaps.toLocaleString()}
          icon={Store}
          color="blue"
        />
        <StatsCard
          title="Active Customers"
          value={stats.activeCustomers.toLocaleString()}
          icon={Users}
          color="green"
        />
        <StatsCard
          title="Referrals"
          value={stats.referrals.toString()}
          icon={Share2}
          color="yellow"
        />
        <StatsCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="nfc-tags">NFC Tags</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignManagement businessId={selectedBusiness} />
        </TabsContent>

        <TabsContent value="nfc-tags">
          <NFCWritingInterface businessId={selectedBusiness} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Store className="text-green-600 h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">New tap on Counter NFC</p>
                      <p className="text-xs text-gray-500">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Share2 className="text-blue-600 h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Referral link shared</p>
                      <p className="text-xs text-gray-500">5 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="text-yellow-600 h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">Tap Trail completed</p>
                      <p className="text-xs text-gray-500">12 minutes ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Campaign */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Campaign</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Free Coffee Friday</span>
                    <span className="text-sm font-semibold text-gray-900">67%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-secondary h-2 rounded-full" style={{ width: "67%" }}></div>
                  </div>
                  <p className="text-xs text-gray-500">124 taps in the last 24 hours</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
