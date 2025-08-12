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
            Account & Subscription
          </h1>
          <p className="text-xl text-gray-600">
            Manage your subscription, API access, and account settings
          </p>
        </div>

        <Tabs defaultValue="subscription" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
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
                    <h3 className="text-xl font-semibold">{profile?.subscriptionTier?.charAt(0).toUpperCase() + profile?.subscriptionTier?.slice(1)} Plan</h3>
                    <p className="text-gray-600">Access to multiple platform services</p>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    {profile?.subscriptionStatus?.charAt(0).toUpperCase() + profile?.subscriptionStatus?.slice(1)}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">Unlimited</div>
                    <div className="text-sm text-gray-600">Businesses</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{usage?.currentPeriod?.apiRequests?.toLocaleString() || "0"}</div>
                    <div className="text-sm text-gray-600">API Requests Used</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">✓</div>
                    <div className="text-sm text-gray-600">AI Insights</div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Next billing: January 15, 2025</p>
                    <p className="font-semibold">$99.00/month</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans?.map((plan: any, index: number) => (
                    <div key={plan.id} className={`p-4 border rounded-lg relative ${index === 1 ? 'border-2 border-purple-500' : ''}`}>
                      {index === 1 && <Badge className="absolute -top-2 left-4 bg-purple-500">Popular</Badge>}
                      <h4 className="font-semibold mb-2">{plan.name}</h4>
                      <p className="text-2xl font-bold mb-2">
                        ${plan.price}{plan.price > 0 && <span className="text-sm font-normal">/month</span>}
                      </p>
                      <ul className="text-sm space-y-1 text-gray-600">
                        {plan.features?.map((feature: string, i: number) => (
                          <li key={i}>• {feature}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
                  <h4 className="font-medium text-yellow-800 mb-2">🔑 Multi-Platform API Access</h4>
                  <p className="text-sm text-yellow-700">
                    Your API key provides access to multiple platforms. Use the same key across different services
                    by specifying the platform in your API requests.
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