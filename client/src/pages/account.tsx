import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Key, CreditCard, Settings, Shield, Copy, RefreshCw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { StarterTrialBanner } from "@/components/StarterTrialBanner";

export default function Account() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["/api/account/profile"],
  });

  const { data: plans } = useQuery({
    queryKey: ["/api/subscription/plans"],
  });

  const { data: usage } = useQuery({
    queryKey: ["/api/account/usage"],
  });

  const generateApiKeyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/account/generate-api-key"),
    onSuccess: (data) => {
      toast({ title: "API Key regenerated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/account/profile"] });
    },
  });

  const copyApiKey = () => {
    if (profile?.apiKey) {
      navigator.clipboard.writeText(profile.apiKey);
      setCopied(true);
      toast({ title: "API Key copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const regenerateApiKey = () => {
    generateApiKeyMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Advanced Platform Management
          </h1>
          <p className="text-xl text-gray-600">
            Manage comprehensive subscriptions, multi-platform API access, usage analytics, and advanced platform settings
          </p>
        </div>

        {/* Starter Trial Banner */}
        <StarterTrialBanner userId={profile?.id} />

        <Tabs defaultValue="subscription" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="api">API Access</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{profile?.subscriptionTier?.charAt(0).toUpperCase() + profile?.subscriptionTier?.slice(1)} Cirql Member</h3>
                    <p className="text-gray-600">Business platform access with campaign management</p>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    {profile?.subscriptionStatus?.charAt(0).toUpperCase() + profile?.subscriptionStatus?.slice(1)}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{profile?.subscriptionTier === "full" ? "Unlimited" : "1"}</div>
                    <div className="text-sm text-gray-600">Business{profile?.subscriptionTier === "full" ? "es" : ""}</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{usage?.currentPeriod?.apiRequests?.toLocaleString() || "0"}</div>
                    <div className="text-sm text-gray-600">API Requests Used</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{usage?.referralStats?.totalReferrals || 0}</div>
                    <div className="text-sm text-gray-600">Referrals</div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Next billing: January 15, 2025</p>
                    <p className="font-semibold">
                      ${profile?.subscriptionTier === "starter" ? "0" : 
                        profile?.subscriptionTier === "professional" ? "39" :
                        profile?.subscriptionTier === "business" ? "79" : 
                        profile?.subscriptionTier === "enterprise" ? "149" : "0"}/month
                    </p>
                  </div>
                  <div className="space-x-2">
                    <Button variant="outline">Change Plan</Button>
                    <Button variant="outline">Cancel Subscription</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans?.map((plan: any, index: number) => (
                    <div key={plan.id} className={`p-4 border rounded-lg relative ${index === 1 ? 'border-2 border-purple-500' : ''}`}>
                      {index === 1 && <Badge className="absolute -top-2 left-4 bg-purple-500">Popular</Badge>}
                      <h4 className="font-semibold mb-2">{plan.name}</h4>
                      <div className="mb-2">
                        <p className="text-2xl font-bold">
                          ${plan.price}<span className="text-sm font-normal">/month</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          or ${plan.yearlyPrice}/year (save ${((plan.price * 12) - plan.yearlyPrice).toFixed(2)})
                        </p>
                      </div>
                      <ul className="text-sm space-y-1 text-gray-600">
                        {plan.features?.map((feature: string, i: number) => (
                          <li key={i}>• {feature}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 text-orange-800">Cirql Tags</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Single tag</span>
                        <span className="font-semibold">$0.99</span>
                      </div>
                      <div className="flex justify-between">
                        <span>6-pack bundle</span>
                        <span className="font-semibold">$4.99</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Physical NFC stickers for your campaigns
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 text-green-800">New Subscriber Starter Pack</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Complete setup package</span>
                        <span className="font-semibold">$99</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        • 6 Cirqlback NFC stickers<br/>
                        • In-store signage<br/>
                        • 1 hour personalized setup support
                      </div>
                    </div>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Referral Program - Visibility Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-2">Your Progress</h4>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{usage?.referralStats?.totalReferrals || 0}</div>
                      <div className="text-sm text-purple-600">Total Referrals</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">Progress to next reward</div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" 
                          style={{width: `${Math.min(((usage?.referralStats?.totalReferrals || 0) % 10) * 10, 100)}%`}}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {10 - ((usage?.referralStats?.totalReferrals || 0) % 10)} more for next milestone
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Visibility Rewards Milestones</h4>
                  <div className="space-y-3">
                    <div className={`flex items-center p-3 rounded-lg border ${(usage?.referralStats?.totalReferrals || 0) >= 5 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${(usage?.referralStats?.totalReferrals || 0) >= 5 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {(usage?.referralStats?.totalReferrals || 0) >= 5 ? '✓' : '5'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Featured Referrer Map Layer</div>
                        <div className="text-sm text-gray-600">Highlighted pin + badge on the map</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center p-3 rounded-lg border ${(usage?.referralStats?.totalReferrals || 0) >= 10 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${(usage?.referralStats?.totalReferrals || 0) >= 10 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {(usage?.referralStats?.totalReferrals || 0) >= 10 ? '✓' : '10'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Priority Map Placement</div>
                        <div className="text-sm text-gray-600">Your business appears higher in search results</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center p-3 rounded-lg border ${(usage?.referralStats?.totalReferrals || 0) >= 25 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${(usage?.referralStats?.totalReferrals || 0) >= 25 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {(usage?.referralStats?.totalReferrals || 0) >= 25 ? '✓' : '25'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Newsletter & Social Spotlight</div>
                        <div className="text-sm text-gray-600">Featured in our newsletter and social channels</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center p-3 rounded-lg border ${(usage?.referralStats?.totalReferrals || 0) >= 50 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${(usage?.referralStats?.totalReferrals || 0) >= 50 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {(usage?.referralStats?.totalReferrals || 0) >= 50 ? '✓' : '50'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Custom Tap Trail</div>
                        <div className="text-sm text-gray-600">Your shop becomes an anchor in a custom tap trail</div>
                      </div>
                    </div>
                    
                    <div className={`flex items-center p-3 rounded-lg border ${(usage?.referralStats?.totalReferrals || 0) >= 100 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${(usage?.referralStats?.totalReferrals || 0) >= 100 ? 'bg-gold-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {(usage?.referralStats?.totalReferrals || 0) >= 100 ? '👑' : '100'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">"Powered by Cirqlback Champion" Badge</div>
                        <div className="text-sm text-gray-600">Top billing in seasonal promotions + exclusive champion badge</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Share Your Referral Link</h4>
                  <div className="flex space-x-2 mb-2">
                    <Input
                      value="https://cirqlback.com/ref/user123"
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button onClick={() => {
                      navigator.clipboard.writeText("https://cirqlback.com/ref/user123");
                      toast({ title: "Referral link copied!" });
                    }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-blue-700">
                    Share this link to earn visibility rewards and help grow the Cirqlback community!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  API Key Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">🔑 Business Platform API Access</h4>
                  <p className="text-sm text-yellow-700">
                    Your API key provides business-level access to multiple platforms. Use the same key across different services
                    by specifying the platform in your API requests. Customer accounts do not require API keys.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Your API Key
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      value={profile?.apiKey || "Loading..."}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      onClick={copyApiKey}
                      variant="outline"
                      size="icon"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={regenerateApiKey}
                      variant="outline"
                      size="icon"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Keep your API key secure. Do not share it in publicly accessible areas.
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Platform Access</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-purple-800 mb-2">Cirql Platform</h5>
                      <div className="space-y-1 text-sm">
                        <div className="font-mono text-xs">POST /api/cirql/tap</div>
                        <div className="font-mono text-xs">GET /api/cirql/analytics</div>
                        <div className="font-mono text-xs">POST /api/cirql/campaigns</div>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium text-blue-800 mb-2">InSpektAI Platform</h5>
                      <div className="space-y-1 text-sm">
                        <div className="font-mono text-xs">POST /api/inspekt/analyze</div>
                        <div className="font-mono text-xs">GET /api/inspekt/insights</div>
                        <div className="font-mono text-xs">POST /api/inspekt/reports</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use the same API key for both platforms. Include platform context in your requests.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{usage?.currentPeriod?.apiRequests?.toLocaleString() || "0"}</div>
                    <div className="text-sm text-blue-600">Requests This Month</div>
                    <div className="text-xs text-gray-500">
                      {usage?.currentPeriod?.apiRequestsLimit ? 
                        `${((usage?.currentPeriod?.apiRequests / usage?.currentPeriod?.apiRequestsLimit) * 100).toFixed(1)}% of limit` : 
                        "Unlimited"}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{usage?.monthlyStats?.successRate?.toFixed(1) || "0"}%</div>
                    <div className="text-sm text-green-600">Success Rate</div>
                    <div className="text-xs text-gray-500">Last 30 days</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{usage?.monthlyStats?.avgResponseTime || "0"}ms</div>
                    <div className="text-sm text-purple-600">Avg Response Time</div>
                    <div className="text-xs text-gray-500">Last 7 days</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Recent API Activity</h4>
                  <div className="space-y-2">
                    {usage?.recentActivity?.map((activity: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <span className="font-mono text-sm">{activity.method} {activity.endpoint}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <Badge className={activity.statusCode < 400 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {activity.statusCode}
                        </Badge>
                      </div>
                    )) || <p className="text-gray-500 text-center py-4">No recent activity</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <Input defaultValue={profile?.firstName || ""} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <Input defaultValue={profile?.lastName || ""} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <Input defaultValue={profile?.email || ""} type="email" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Enable 2FA
                  </Button>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <Button variant="outline">Save Changes</Button>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}