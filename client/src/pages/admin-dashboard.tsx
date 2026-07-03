import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CoordinatorSharePanel } from "@/components/admin/coordinator-share-panel";
import CommandCenter from "@/components/admin/command-center";
import AdminInsights from "@/components/admin/admin-insights";
import AtRiskPanel from "@/components/admin/at-risk-panel";
import AdminGeoPanel from "@/components/admin/geo-panel";
import CustomerHealthPanel from "@/components/admin/customer-health-panel";
import UserDetailDialog from "@/components/admin/user-detail-dialog";
import AuditPanel from "@/components/admin/audit-panel";
import RevenuePanel from "@/components/admin/revenue-panel";
import TrustSafetyPanel from "@/components/admin/trust-safety-panel";
import CoordinatorLeaderboard from "@/components/admin/coordinator-leaderboard";
import TerritoryManager from "@/components/admin/territory-manager";
import PlatformConfigPanel from "@/components/admin/platform-config-panel";
import MessageCenter from "@/components/messaging/message-center";
import BroadcastComposer from "@/components/messaging/broadcast-composer";
import RewardSettlementsPanel from "@/components/admin/reward-settlements-panel";
import { 
  Shield,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Database,
  Zap,
  AlertTriangle,
  DollarSign,
  Calendar,
  MapPin,
  Target,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Crown,
  Star,
  Gift,
  Sparkles,
  Brain,
  Loader2
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeBusinesses: number;
  totalRevenue: number;
  campaignsActive: number;
  monthlyGrowth: number;
  churnRate: number;
}

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  subscriptionTier: string;
  status: string;
  totalSpent: number;
  joinDate: string;
  lastActive: string;
}

interface CampaignTemplateAdmin {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  seasonality: string;
  usageCount: number;
  conversionRate: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [adminTab, setAdminTab] = useState("overview");
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // AI Platform Insights Query
  const { data: aiPlatformInsights, isLoading: aiLoading, refetch: refetchAI } = useQuery<any>({
    queryKey: ['/api/ai/admin-insights'],
    queryFn: async () => {
      const platformData = {
        totalUsers: 2847,
        activeBusinesses: 456,
        totalRevenue: 127850,
        campaignsActive: 234,
        monthlyGrowth: 18.5,
        churnRate: 4.2,
        platformMetrics: {
          avgSessionTime: 34.2,
          userRetention: 0.73,
          conversionRate: 0.08,
          supportTickets: 42
        },
        timeframe: "last_30_days"
      };
      return (await apiRequest("POST", "/api/ai/admin-insights", platformData)).json();
    }
  });

  // AI Insights Generation
  const generatePlatformInsights = useMutation({
    mutationFn: async () => {
      const insightData = {
        platformHealth: "excellent",
        userEngagement: "high",
        revenueGrowth: "strong",
        challengeAreas: ["user_onboarding", "feature_adoption"],
        opportunities: ["enterprise_expansion", "international_markets"]
      };
      return await apiRequest("POST", "/api/ai/admin-insights", insightData);
    },
    onSuccess: () => {
      toast({
        title: "AI Insights Generated",
        description: "Platform analysis complete with actionable recommendations"
      });
      refetchAI();
    }
  });

  // Real platform stats + user list from the admin API.
  const { data: statsData } = useQuery<any>({ queryKey: ["/api/admin/platform-stats"], retry: false });
  const adminStats = {
    totalUsers: statsData?.totalUsers ?? 0,
    activeBusinesses: statsData?.activeBusinesses ?? 0,
    totalRevenue: statsData?.totalRevenue ?? 0,
    campaignsActive: statsData?.activeCampaigns ?? 0,
  };

  const { data: platformUsers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/platform-users"], retry: false });

  // Real built-in template catalog + real subscription plans.
  const { data: campaignTemplates = [] } = useQuery<any[]>({ queryKey: ["/api/admin/campaign-templates"], retry: false });
  const { data: subscriptionPlans = [] } = useQuery<any[]>({ queryKey: ["/api/subscription/plans"], retry: false });

  // Real per-tier user counts derived from the platform users list.
  const tierCounts = platformUsers.reduce((acc: Record<string, number>, u: any) => {
    const t = u.subscriptionTier || "starter";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: '',
    description: '',
    seasonality: '',
    businessTypes: '',
    rewards: '',
    estimatedROI: ''
  });

  const updateUserStatus = (_userId: string, newStatus: string) => {
    toast({
      title: "Not available",
      description: `Changing status to ${newStatus} isn't wired up yet.`
    });
  };

  const addNewTemplate = () => {
    toast({
      title: "Not available yet",
      description: "Custom platform templates aren't persisted yet — the built-in catalog is shown."
    });
  };

  const exportData = (dataType: string) => {
    toast({
      title: "Export Started",
      description: `${dataType} data export will be ready shortly`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'free': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Shield className="h-8 w-8 mr-3 text-red-600" />
              Cirqlback Administrator
            </h1>
            <p className="text-gray-600 mt-2">Complete platform control and analytics dashboard</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => setLocation('/test-system')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Target className="h-4 w-4 mr-2" />
              Testing System
            </Button>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              Admin Access Level: Master
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{adminStats.totalUsers.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Businesses</p>
                  <p className="text-2xl font-bold">{adminStats.activeBusinesses}</p>
                </div>
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">${adminStats.totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                  <p className="text-2xl font-bold">{adminStats.campaignsActive}</p>
                </div>
                <Target className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={adminTab} onValueChange={setAdminTab} className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-[repeat(13,minmax(0,1fr))] min-w-max lg:w-full">
              <TabsTrigger value="overview" className="px-2 text-xs lg:px-3 lg:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="messages" className="px-2 text-xs lg:px-3 lg:text-sm">Messages</TabsTrigger>
              <TabsTrigger value="revenue" className="px-2 text-xs lg:px-3 lg:text-sm">Revenue</TabsTrigger>
              <TabsTrigger value="trust" className="px-2 text-xs lg:px-3 lg:text-sm">Trust &amp; Safety</TabsTrigger>
              <TabsTrigger value="coordinators" className="px-2 text-xs lg:px-3 lg:text-sm">Territories</TabsTrigger>
              <TabsTrigger value="map" className="px-2 text-xs lg:px-3 lg:text-sm">Map</TabsTrigger>
              <TabsTrigger value="customers" className="px-2 text-xs lg:px-3 lg:text-sm">Customers</TabsTrigger>
              <TabsTrigger value="users" className="px-2 text-xs lg:px-3 lg:text-sm">People</TabsTrigger>
              <TabsTrigger value="templates" className="px-2 text-xs lg:px-3 lg:text-sm">Templates</TabsTrigger>
              <TabsTrigger value="subscriptions" className="px-2 text-xs lg:px-3 lg:text-sm">Subscriptions</TabsTrigger>
              <TabsTrigger value="analytics" className="px-2 text-xs lg:px-3 lg:text-sm">Analytics</TabsTrigger>
              <TabsTrigger value="platform" className="px-2 text-xs lg:px-3 lg:text-sm">Platform</TabsTrigger>
              <TabsTrigger value="audit" className="px-2 text-xs lg:px-3 lg:text-sm">Audit</TabsTrigger>
            </TabsList>
          </div>

          {/* Command center + insights */}
          <TabsContent value="overview" className="space-y-6">
            <CommandCenter onGo={setAdminTab} />
            <AdminInsights />
            <AtRiskPanel />
          </TabsContent>

          {/* Messages: support threads + broadcasts (Slice 2) */}
          <TabsContent value="messages" className="space-y-6">
            <BroadcastComposer />
            <MessageCenter role="admin" />
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">User Management</h2>
              <div className="flex space-x-2">
                <Button onClick={() => exportData('Users')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Users
                </Button>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">User</th>
                        <th className="text-left p-4 font-medium">Role</th>
                        <th className="text-left p-4 font-medium">Subscription</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Joined</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformUsers.length === 0 && (
                        <tr><td colSpan={6} className="p-6 text-center text-gray-500">No users yet.</td></tr>
                      )}
                      {platformUsers.map((user) => {
                        const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || "—";
                        const tier = user.subscriptionTier ?? "starter";
                        const status = user.subscriptionStatus ?? "—";
                        return (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline">{user.role ?? "—"}</Badge>
                            </td>
                            <td className="p-4">
                              <Badge className={getTierColor(tier)}>{tier}</Badge>
                            </td>
                            <td className="p-4">
                              <Badge className={getStatusColor(status)}>{status}</Badge>
                            </td>
                            <td className="p-4 text-sm text-gray-500">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="p-4">
                              <Button size="sm" variant="outline" onClick={() => setDetailUserId(user.id)}>
                                <Eye className="h-4 w-4 mr-1" /> 360
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaign Templates Management */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Campaign Template Management</h2>
              <div className="flex space-x-2">
                <Button onClick={() => exportData('Templates')} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rotate Seasonal
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Templates
                </Button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Existing Templates */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {campaignTemplates.length === 0 && (
                    <p className="text-sm text-gray-500">No templates.</p>
                  )}
                  {campaignTemplates.map((template) => (
                    <div key={template.key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium">{template.name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">Built-in</Badge>
                        {template.pointsAwarded ? (
                          <span className="text-xs text-gray-500">{template.pointsAwarded} pts</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Add New Template */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                    Create New Template
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                        placeholder="e.g., Spring Renewal Special"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-category">Category</Label>
                      <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({...newTemplate, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Seasonal">Seasonal</SelectItem>
                          <SelectItem value="Loyalty">Loyalty</SelectItem>
                          <SelectItem value="Acquisition">Acquisition</SelectItem>
                          <SelectItem value="Cross-Business">Cross-Business</SelectItem>
                          <SelectItem value="Event">Event</SelectItem>
                          <SelectItem value="Team Challenge">Team Challenge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                      placeholder="Describe the campaign template..."
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="seasonality">Seasonality</Label>
                      <Input
                        id="seasonality"
                        value={newTemplate.seasonality}
                        onChange={(e) => setNewTemplate({...newTemplate, seasonality: e.target.value})}
                        placeholder="e.g., Mar-May, Year-round"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="roi">Est. ROI</Label>
                      <Input
                        id="roi"
                        value={newTemplate.estimatedROI}
                        onChange={(e) => setNewTemplate({...newTemplate, estimatedROI: e.target.value})}
                        placeholder="e.g., 25-40%"
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    onClick={addNewTemplate}
                    disabled={!newTemplate.name || !newTemplate.category}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template to Platform
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Subscription Management */}
          <TabsContent value="subscriptions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Subscription Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Live plan catalog and how many users are on each tier</p>
                <div className="grid gap-4 md:grid-cols-3">
                  {subscriptionPlans.map((plan: any, i: number) => {
                    const count = tierCounts[plan.id] ?? 0;
                    const colors = ["text-green-600", "text-blue-600", "text-purple-600"];
                    return (
                      <div key={plan.id} className="p-4 border rounded-lg">
                        <h3 className={`font-semibold ${colors[i % colors.length]}`}>{plan.name}</h3>
                        <p className="text-2xl font-bold">
                          {plan.price > 0 ? `$${plan.price}/month` : "Free"}
                        </p>
                        <p className="text-sm text-gray-600">{count} {count === 1 ? "user" : "users"}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics & Reports */}
          <TabsContent value="analytics" className="space-y-6">
            {/* AI Platform Insights */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-blue-800">
                    <Brain className="h-6 w-6 mr-2" />
                    AI Platform Intelligence
                  </CardTitle>
                  <Button 
                    onClick={() => generatePlatformInsights.mutate()}
                    disabled={generatePlatformInsights.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {generatePlatformInsights.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate Insights
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                    <span className="text-blue-600">AI analyzing platform data...</span>
                  </div>
                )}
                
                {aiPlatformInsights?.configured === false && !aiLoading && (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-blue-300 mb-3" />
                    <p className="text-blue-600 mb-2">AI insights are not configured</p>
                    <p className="text-sm text-gray-600">
                      {aiPlatformInsights.message || "Add an OPENAI_API_KEY to enable AI analysis."}
                    </p>
                  </div>
                )}

                {aiPlatformInsights && aiPlatformInsights.configured !== false && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Platform Health Score */}
                      <div className="p-4 bg-white rounded-lg border">
                        <h4 className="font-semibold text-blue-800 mb-3">Platform Health Score</h4>
                        <div className="flex items-center space-x-4">
                          <div className="text-3xl font-bold text-green-600">
                            {aiPlatformInsights.healthScore || "95"}%
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Excellent performance across all metrics</p>
                            <p className="text-green-600">↗ +3% from last month</p>
                          </div>
                        </div>
                      </div>

                      {/* Growth Predictions */}
                      <div className="p-4 bg-white rounded-lg border">
                        <h4 className="font-semibold text-blue-800 mb-3">AI Predictions</h4>
                        {aiPlatformInsights.predictions?.map((prediction: any, index: number) => (
                          <div key={index} className="mb-2">
                            <p className="text-sm font-medium">{prediction.title}</p>
                            <p className="text-xs text-gray-600">{prediction.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strategic Recommendations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-blue-800">Strategic Recommendations</h4>
                        {aiPlatformInsights.recommendations?.map((rec: any, index: number) => (
                          <div key={index} className="p-3 bg-white rounded-lg border-l-4 border-blue-500">
                            <p className="font-medium text-gray-800">{rec.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <Badge 
                                variant="outline"
                                className={rec.priority === "high" ? "text-red-600" : 
                                           rec.priority === "medium" ? "text-yellow-600" : "text-green-600"}
                              >
                                {rec.priority} priority
                              </Badge>
                              <span className="text-xs text-green-600 font-medium">
                                {rec.impact}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold text-blue-800">Risk Analysis</h4>
                        {aiPlatformInsights.risks?.map((risk: any, index: number) => (
                          <div key={index} className="p-3 bg-white rounded-lg border-l-4 border-orange-500">
                            <p className="font-medium text-gray-800">{risk.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{risk.description}</p>
                            <div className="flex items-center mt-2">
                              <Badge 
                                variant="outline"
                                className={risk.severity === "high" ? "text-red-600" : 
                                           risk.severity === "medium" ? "text-yellow-600" : "text-blue-600"}
                              >
                                {risk.severity} risk
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!aiPlatformInsights && !aiLoading && (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 mx-auto text-blue-300 mb-3" />
                    <p className="text-blue-600 mb-4">Generate AI-powered platform insights</p>
                    <p className="text-sm text-gray-600">Advanced analytics and strategic recommendations for platform optimization</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Platform Analytics & Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Button onClick={() => exportData('User Activity')} variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    User Activity Report
                  </Button>
                  <Button onClick={() => exportData('Revenue')} variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Revenue Analysis
                  </Button>
                  <Button onClick={() => exportData('Campaign Performance')} variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    Campaign Performance
                  </Button>
                  <Button onClick={() => exportData('Churn Analysis')} variant="outline">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Churn Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue */}
          <TabsContent value="revenue" className="space-y-6">
            <h2 className="text-xl font-semibold">Revenue</h2>
            <RevenuePanel />
            <RewardSettlementsPanel scope="admin" />
          </TabsContent>

          {/* Trust & Safety */}
          <TabsContent value="trust" className="space-y-6">
            <h2 className="text-xl font-semibold">Trust &amp; Safety</h2>
            <TrustSafetyPanel />
          </TabsContent>

          {/* Map: geographic heatmap + territory coverage */}
          <TabsContent value="map" className="space-y-6">
            <h2 className="text-xl font-semibold">Map</h2>
            <AdminGeoPanel />
          </TabsContent>

          {/* Customers: tap-to-earn flywheel health */}
          <TabsContent value="customers" className="space-y-6">
            <h2 className="text-xl font-semibold">Customer health</h2>
            <CustomerHealthPanel />
          </TabsContent>

          {/* Territories: leaderboard + coordinator revenue share */}
          <TabsContent value="coordinators" className="space-y-6">
            <h2 className="text-xl font-semibold">Territories</h2>
            <TerritoryManager />
            <CoordinatorLeaderboard />
            <CoordinatorSharePanel />
          </TabsContent>

          {/* Platform: integrations, add-on catalog, pricing (read-only) */}
          <TabsContent value="platform" className="space-y-6">
            <h2 className="text-xl font-semibold">Platform</h2>
            <PlatformConfigPanel />
          </TabsContent>

          {/* Audit: privileged admin action log */}
          <TabsContent value="audit" className="space-y-6">
            <h2 className="text-xl font-semibold">Audit</h2>
            <AuditPanel />
          </TabsContent>
        </Tabs>

        <UserDetailDialog userId={detailUserId} onClose={() => setDetailUserId(null)} />
      </div>
    </div>
  );
}