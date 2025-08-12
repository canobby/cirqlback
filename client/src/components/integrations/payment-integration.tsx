import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Smartphone, Wallet, Zap, CheckCircle, Settings, DollarSign, Share2 } from "lucide-react";

export default function PaymentIntegration() {
  const [activeIntegrations, setActiveIntegrations] = useState([
    { name: "Stripe", status: "connected", revenue: "$12,847", transactions: 234 },
    { name: "Square", status: "connected", revenue: "$8,392", transactions: 156 },
    { name: "PayPal", status: "pending", revenue: "$0", transactions: 0 }
  ]);

  const socialIntegrations = [
    { platform: "Instagram", status: "connected", followers: "12.4K", posts: 89, engagement: "4.2%" },
    { platform: "TikTok", status: "connected", followers: "8.9K", posts: 45, engagement: "6.8%" },
    { platform: "Facebook", status: "connected", followers: "15.2K", posts: 67, engagement: "3.1%" },
    { platform: "Twitter", status: "pending", followers: "0", posts: 0, engagement: "0%" }
  ];

  const posIntegrations = [
    { name: "Toast POS", status: "connected", locations: 3, dailyTaps: 89 },
    { name: "Clover", status: "connected", locations: 2, dailyTaps: 67 },
    { name: "Square Register", status: "available", locations: 0, dailyTaps: 0 },
    { name: "Shopify POS", status: "available", locations: 0, dailyTaps: 0 }
  ];

  const emailIntegrations = [
    { platform: "Mailchimp", status: "connected", subscribers: "5.2K", campaigns: 23, openRate: "34.5%" },
    { platform: "Klaviyo", status: "connected", subscribers: "3.8K", campaigns: 18, openRate: "41.2%" },
    { platform: "SendGrid", status: "available", subscribers: "0", campaigns: 0, openRate: "0%" }
  ];

  const cryptoOptions = [
    { currency: "Bitcoin", symbol: "BTC", status: "available", fee: "0.5%" },
    { currency: "Ethereum", symbol: "ETH", status: "available", fee: "0.3%" },
    { currency: "USDC", symbol: "USDC", status: "available", fee: "0.1%" },
    { currency: "Polygon", symbol: "MATIC", status: "available", fee: "0.1%" }
  ];

  const webhookEndpoints = [
    { name: "Customer Tap Event", url: "/api/webhooks/tap", status: "active", calls: 1247 },
    { name: "Reward Claimed", url: "/api/webhooks/reward", status: "active", calls: 567 },
    { name: "Payment Success", url: "/api/webhooks/payment", status: "active", calls: 234 },
    { name: "Referral Complete", url: "/api/webhooks/referral", status: "active", calls: 89 }
  ];

  return (
    <div className="space-y-6">
      <Card className="card-hover glow-effect">
        <CardHeader>
          <CardTitle className="flex items-center gradient-text">
            <Settings className="mr-2 h-6 w-6" />
            Integration Hub
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">8</div>
              <div className="text-sm text-green-700">Active Integrations</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">$21,239</div>
              <div className="text-sm text-blue-700">Payment Volume</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">390</div>
              <div className="text-sm text-purple-700">API Calls Today</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">99.9%</div>
              <div className="text-sm text-orange-700">Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="payments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="pos">POS Systems</TabsTrigger>
          <TabsTrigger value="email">Email Marketing</TabsTrigger>
          <TabsTrigger value="crypto">Crypto/Web3</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Payment Processors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeIntegrations.map((integration, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-6 w-6 text-blue-500" />
                      <div>
                        <div className="font-semibold">{integration.name}</div>
                        <div className="text-sm text-gray-600">{integration.transactions} transactions</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={integration.status === "connected" ? "default" : "secondary"}>
                        {integration.status}
                      </Badge>
                      <div className="text-sm font-bold text-green-600 mt-1">{integration.revenue}</div>
                    </div>
                  </div>
                ))}
                <Button className="w-full gradient-bg border-0 text-white">
                  <Zap className="mr-2 h-4 w-4" />
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Transaction Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">💰 Revenue Insights</h4>
                    <div className="text-sm text-green-700">Average transaction: $54.23</div>
                    <div className="text-sm text-green-700">Peak hours: 2-4 PM</div>
                    <div className="text-sm text-green-700">Top category: Food & Beverage</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="font-bold text-blue-600">2.3%</div>
                      <div className="text-xs text-blue-600">Processing Fee</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="font-bold text-purple-600">0.5s</div>
                      <div className="text-xs text-purple-600">Avg Response</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Social Platforms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {socialIntegrations.map((integration, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Share2 className="h-6 w-6 text-purple-500" />
                      <div>
                        <div className="font-semibold">{integration.platform}</div>
                        <div className="text-sm text-gray-600">{integration.followers} followers</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={integration.status === "connected" ? "default" : "secondary"}>
                        {integration.status}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-1">{integration.engagement} engagement</div>
                    </div>
                  </div>
                ))}
                <Button className="w-full gradient-bg border-0 text-white">
                  <Share2 className="mr-2 h-4 w-4" />
                  Connect Platform
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Auto-Posting Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🤖 Smart Posting</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• Auto-post new campaigns</div>
                    <div>• Share milestone achievements</div>
                    <div>• Post customer success stories</div>
                    <div>• Schedule viral challenges</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Post Frequency</span>
                    <Badge variant="outline">3x daily</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Optimal Times</span>
                    <Badge variant="outline">Auto-detect</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Hashtag Strategy</span>
                    <Badge variant="outline">AI-generated</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pos" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">POS Systems</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {posIntegrations.map((integration, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-6 w-6 text-green-500" />
                      <div>
                        <div className="font-semibold">{integration.name}</div>
                        <div className="text-sm text-gray-600">{integration.locations} locations</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={integration.status === "connected" ? "default" : "secondary"}>
                        {integration.status}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-1">{integration.dailyTaps} daily taps</div>
                    </div>
                  </div>
                ))}
                <Button className="w-full gradient-bg border-0 text-white">
                  <Smartphone className="mr-2 h-4 w-4" />
                  Integrate POS
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">POS Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">🔄 Real-time Sync</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>• Instant loyalty point updates</div>
                    <div>• Real-time inventory tracking</div>
                    <div>• Automatic reward redemption</div>
                    <div>• Sales data synchronization</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="font-bold text-blue-600">156</div>
                    <div className="text-xs text-blue-600">Daily Syncs</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="font-bold text-purple-600">99.8%</div>
                    <div className="text-xs text-purple-600">Sync Success</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Email Platforms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {emailIntegrations.map((integration, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Wallet className="h-6 w-6 text-orange-500" />
                      <div>
                        <div className="font-semibold">{integration.platform}</div>
                        <div className="text-sm text-gray-600">{integration.subscribers} subscribers</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={integration.status === "connected" ? "default" : "secondary"}>
                        {integration.status}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-1">{integration.openRate} open rate</div>
                    </div>
                  </div>
                ))}
                <Button className="w-full gradient-bg border-0 text-white">
                  <Wallet className="mr-2 h-4 w-4" />
                  Add Email Platform
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Automated Campaigns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">📧 Smart Campaigns</h4>
                  <div className="text-sm text-purple-700 space-y-1">
                    <div>• Welcome series for new users</div>
                    <div>• Re-engagement for dormant customers</div>
                    <div>• Reward expiration reminders</div>
                    <div>• Personalized offer emails</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Weekly Sends</span>
                    <Badge variant="outline">2.4K emails</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Open Rate</span>
                    <Badge variant="outline">37.8%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Click Rate</span>
                    <Badge variant="outline">12.4%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="crypto" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Crypto Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cryptoOptions.map((crypto, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{crypto.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-semibold">{crypto.currency}</div>
                        <div className="text-sm text-gray-600">{crypto.fee} transaction fee</div>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {crypto.status}
                    </Badge>
                  </div>
                ))}
                <Button className="w-full gradient-bg border-0 text-white">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Enable Crypto Payments
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="gradient-text">Web3 Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">🚀 Next-Gen Features</h4>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <div>• NFT loyalty cards</div>
                    <div>• Tokenized reward points</div>
                    <div>• DAO governance for communities</div>
                    <div>• Smart contract automation</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Wallet Connections</span>
                    <Badge variant="outline">0 connected</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Gas Optimization</span>
                    <Badge variant="outline">Layer 2 ready</Badge>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <Zap className="mr-2 h-4 w-4" />
                  Setup Web3 Features
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="gradient-text">Webhook Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {webhookEndpoints.map((webhook, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <div>
                      <div className="font-semibold">{webhook.name}</div>
                      <div className="text-sm text-gray-600 font-mono">{webhook.url}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="default">
                      {webhook.status}
                    </Badge>
                    <div className="text-sm text-gray-600 mt-1">{webhook.calls} calls</div>
                  </div>
                </div>
              ))}
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-3">Add New Webhook</h4>
                <div className="space-y-3">
                  <Input placeholder="Webhook name" />
                  <Input placeholder="https://your-app.com/webhook" />
                  <Button className="w-full gradient-bg border-0 text-white">
                    <Zap className="mr-2 h-4 w-4" />
                    Create Webhook
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}