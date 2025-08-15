import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Crown, Users, MapPin, Star, Trophy, Gift, Zap, Shield, Play, UserCheck, MessageSquare, Video, Phone } from "lucide-react";
import CommunicationHub from "@/components/communication/communication-hub";
import SoloTestingSimulator from "@/components/communication/solo-testing-simulator";

interface TestUser {
  id: string;
  name: string;
  email: string;
  role: "customer" | "business" | "admin";
  points: number;
  tier: string;
  businessName?: string;
  subscriptionTier?: string;
  location: string;
  challengesCompleted: number;
  campaignsCreated: number;
}

interface TestBusiness {
  id: string;
  name: string;
  type: string;
  location: string;
  subscriptionTier: "starter" | "professional" | "enterprise";
  activeCampaigns: number;
  totalCustomers: number;
  monthlyRevenue: number;
  tags: string[];
}

interface TestCampaign {
  id: string;
  name: string;
  businessId: string;
  businessName: string;
  type: "loyalty" | "referral" | "seasonal" | "ar-experience";
  status: "active" | "paused" | "completed";
  participants: number;
  rewards: string;
  endDate: string;
}

export default function TestSystem() {
  const { toast } = useToast();
  const [selectedTestType, setSelectedTestType] = useState<string>("system-overview");
  const [testUsers, setTestUsers] = useState<TestUser[]>([
    {
      id: "user_1",
      name: "Alex Thompson",
      email: "alex@test.com",
      role: "customer",
      points: 2450,
      tier: "Silver",
      location: "Downtown Seattle",
      challengesCompleted: 12,
      campaignsCreated: 0
    },
    {
      id: "user_2", 
      name: "Jordan Martinez",
      email: "jordan@test.com",
      role: "customer",
      points: 3200,
      tier: "Gold",
      location: "Capitol Hill Seattle",
      challengesCompleted: 18,
      campaignsCreated: 0
    }
  ]);

  const [testBusinesses, setTestBusinesses] = useState<TestBusiness[]>([
    {
      id: "biz_1",
      name: "Grind Coffee Co.",
      type: "Coffee Shop",
      location: "Pike Place Market",
      subscriptionTier: "professional",
      activeCampaigns: 3,
      totalCustomers: 245,
      monthlyRevenue: 12500,
      tags: ["coffee", "breakfast", "wifi"]
    },
    {
      id: "biz_2",
      name: "Summit Outdoor Gear",
      type: "Retail",
      location: "University District", 
      subscriptionTier: "enterprise",
      activeCampaigns: 5,
      totalCustomers: 432,
      monthlyRevenue: 28900,
      tags: ["outdoor", "gear", "adventure"]
    }
  ]);

  const [testCampaigns, setTestCampaigns] = useState<TestCampaign[]>([
    {
      id: "camp_1",
      name: "Coffee Loyalty Rewards",
      businessId: "biz_1",
      businessName: "Grind Coffee Co.",
      type: "loyalty",
      status: "active",
      participants: 89,
      rewards: "Buy 10 get 1 free coffee",
      endDate: "2025-03-15"
    },
    {
      id: "camp_2",
      name: "Winter Adventure Challenge",
      businessId: "biz_2", 
      businessName: "Summit Outdoor Gear",
      type: "seasonal",
      status: "active",
      participants: 156,
      rewards: "25% off winter gear",
      endDate: "2025-02-28"
    },
    {
      id: "camp_3",
      name: "AR Treasure Hunt",
      businessId: "biz_1",
      businessName: "Grind Coffee Co.",
      type: "ar-experience",
      status: "active", 
      participants: 67,
      rewards: "Free pastry + coffee",
      endDate: "2025-02-20"
    }
  ]);

  const [currentRole, setCurrentRole] = useState<"customer" | "business" | "admin">("customer");
  const [selectedUser, setSelectedUser] = useState<TestUser | null>(testUsers[0]);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [competitionMode, setCompetitionMode] = useState(false);
  const [showCommunication, setShowCommunication] = useState(false);
  const [showSoloTesting, setShowSoloTesting] = useState(false);

  const createTestUser = () => {
    if (!newUserName || !newUserEmail) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and email",
        variant: "destructive"
      });
      return;
    }

    const newUser: TestUser = {
      id: `user_${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      role: currentRole,
      points: 0,
      tier: "Bronze",
      location: "Seattle",
      challengesCompleted: 0,
      campaignsCreated: 0,
      ...(currentRole === "business" && {
        businessName: `${newUserName}'s Business`,
        subscriptionTier: "starter"
      })
    };

    setTestUsers([...testUsers, newUser]);
    setNewUserName("");
    setNewUserEmail("");
    
    toast({
      title: "Test User Created",
      description: `${newUser.name} added as ${currentRole}`
    });
  };

  const simulateCustomerTap = (campaignId: string) => {
    if (!selectedUser) return;

    const campaign = testCampaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const pointsEarned = Math.floor(Math.random() * 100) + 50;
    
    setTestUsers(users => users.map(user => 
      user.id === selectedUser.id 
        ? { ...user, points: user.points + pointsEarned }
        : user
    ));

    setTestCampaigns(campaigns => campaigns.map(c => 
      c.id === campaignId 
        ? { ...c, participants: c.participants + 1 }
        : c
    ));

    toast({
      title: "Cirql Tag Tapped!",
      description: `${selectedUser.name} earned ${pointsEarned} points from ${campaign.businessName}`
    });
  };

  const switchToRole = (role: "customer" | "business" | "admin", userId?: string) => {
    setCurrentRole(role);
    if (userId) {
      const user = testUsers.find(u => u.id === userId);
      setSelectedUser(user || null);
    }
    
    toast({
      title: "Role Switched",
      description: `Now testing as ${role}${selectedUser ? ` (${selectedUser.name})` : ""}`
    });
  };

  const enableCompetition = () => {
    setCompetitionMode(!competitionMode);
    toast({
      title: competitionMode ? "Competition Disabled" : "Competition Enabled",
      description: competitionMode 
        ? "Test users can now work together" 
        : "Test users are now competing for points and challenges"
    });
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "Gold": return <Crown className="h-4 w-4 text-yellow-500" />;
      case "Silver": return <Star className="h-4 w-4 text-gray-400" />;
      default: return <Shield className="h-4 w-4 text-orange-500" />;
    }
  };

  const getSubscriptionColor = (tier: string) => {
    switch (tier) {
      case "enterprise": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "professional": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default: return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
  };

  return (
    <div className="test-system-container min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 mobile-container-fix py-4 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-6 mobile-overflow-fix">
        <div className="text-center space-y-2">
          <h1 className="responsive-heading font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
            Cirqlback Testing System
          </h1>
          <p className="responsive-text text-gray-600 dark:text-gray-300">
            Experience the platform from customer, business, and admin perspectives
          </p>
        </div>

        {/* Current Testing Status */}
        <Card className="test-system-card border-l-4 border-l-purple-500 mobile-overflow-fix">
          <CardHeader className="pb-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-2 mobile-overflow-fix">
                <UserCheck className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-lg mobile-text-overflow">Current Testing Role</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <Button 
                  onClick={() => setShowCommunication(!showCommunication)}
                  variant={showCommunication ? "default" : "outline"}
                  size="sm"
                  className={`mobile-optimized ${showCommunication ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" : ""}`}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Partner Communication</span>
                  <span className="sm:hidden">Chat</span>
                </Button>
                <Button 
                  onClick={() => setShowSoloTesting(!showSoloTesting)}
                  variant={showSoloTesting ? "default" : "outline"}
                  size="sm"
                  className={`mobile-optimized ${showSoloTesting ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white" : "border-purple-200 hover:bg-purple-50"}`}
                >
                  <Play className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Solo Testing Mode</span>
                  <span className="sm:hidden">Solo</span>
                </Button>
                <Button
                  onClick={enableCompetition}
                  variant={competitionMode ? "destructive" : "default"}
                  size="sm"
                  className="mobile-optimized"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{competitionMode ? "Disable Competition" : "Enable Competition"}</span>
                  <span className="sm:hidden">{competitionMode ? "Disable" : "Enable"}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Badge variant={currentRole === "admin" ? "destructive" : "default"} className="px-3 py-1">
                {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
              </Badge>
              {selectedUser && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Testing as:</span>
                  <span className="font-medium">{selectedUser.name}</span>
                  {currentRole === "customer" && (
                    <div className="flex items-center space-x-1">
                      {getTierIcon(selectedUser.tier)}
                      <span className="text-sm">{selectedUser.tier}</span>
                      <span className="text-sm text-gray-500">({selectedUser.points} pts)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="setup" className="test-system-tabs w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 responsive-tabs mobile-overflow-fix">
            <TabsTrigger value="setup" className="text-xs sm:text-sm mobile-optimized">Test Setup</TabsTrigger>
            <TabsTrigger value="customer" className="text-xs sm:text-sm mobile-optimized">Customer Journey</TabsTrigger>
            <TabsTrigger value="business" className="text-xs sm:text-sm mobile-optimized">Business Journey</TabsTrigger>
            <TabsTrigger value="admin" className="text-xs sm:text-sm mobile-optimized">Admin Journey</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6">
            <div className="responsive-grid-2 mobile-overflow-fix">
              {/* Create Test Users */}
              <Card className="test-system-card mobile-overflow-fix">
                <CardHeader>
                  <CardTitle>Create Test Users</CardTitle>
                  <CardDescription>Add new users for testing different scenarios</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userName">Name</Label>
                    <Input
                      id="userName"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Enter test user name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userEmail">Email</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="Enter test email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userRole">Role</Label>
                    <Select value={currentRole} onValueChange={(value) => setCurrentRole(value as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Reward Customer</SelectItem>
                        <SelectItem value="business">Business Subscriber</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createTestUser} className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Create Test User
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Test Users */}
              <Card className="test-system-card mobile-overflow-fix">
                <CardHeader>
                  <CardTitle>Test Users</CardTitle>
                  <CardDescription>Switch between different user personas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {testUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedUser?.id === user.id 
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                        }`}
                        onClick={() => switchToRole(user.role, user.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant="outline">{user.role}</Badge>
                            {user.role === "customer" && (
                              <div className="flex items-center space-x-1 text-xs">
                                {getTierIcon(user.tier)}
                                <span>{user.points} pts</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test Businesses */}
            <Card>
              <CardHeader>
                <CardTitle>Test Businesses</CardTitle>
                <CardDescription>Pre-configured businesses for testing campaigns and features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testBusinesses.map((business) => (
                    <div key={business.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{business.name}</h3>
                        <Badge className={getSubscriptionColor(business.subscriptionTier)}>
                          {business.subscriptionTier}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3 w-3" />
                          <span>{business.location}</span>
                        </div>
                        <div>Active Campaigns: {business.activeCampaigns}</div>
                        <div>Total Customers: {business.totalCustomers}</div>
                        <div>Monthly Revenue: ${business.monthlyRevenue.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customer" className="space-y-6">
            {selectedUser && selectedUser.role === "customer" ? (
              <>
                {/* Customer Dashboard */}
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Testing Dashboard</CardTitle>
                    <CardDescription>Experience the platform as a reward customer</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{selectedUser.points}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Total Points</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{selectedUser.tier}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Current Tier</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{selectedUser.challengesCompleted}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Challenges</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{testCampaigns.filter(c => c.status === "active").length}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Available</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button onClick={() => window.location.href = '/map'} className="h-20">
                        <div className="text-center">
                          <MapPin className="h-6 w-6 mx-auto mb-1" />
                          <div>Discover Map</div>
                        </div>
                      </Button>
                      <Button onClick={() => window.location.href = '/community'} variant="outline" className="h-20">
                        <div className="text-center">
                          <Users className="h-6 w-6 mx-auto mb-1" />
                          <div>Community</div>
                        </div>
                      </Button>
                      <Button onClick={() => window.location.href = '/team-challenges'} variant="outline" className="h-20">
                        <div className="text-center">
                          <Play className="h-6 w-6 mx-auto mb-1" />
                          <div>Team Challenges</div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Available Campaigns for Testing */}
                <Card>
                  <CardHeader>
                    <CardTitle>Test Cirql Tag Interactions</CardTitle>
                    <CardDescription>Simulate tapping Cirql tags to earn rewards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {testCampaigns.filter(c => c.status === "active").map((campaign) => (
                        <div key={campaign.id} className="p-4 border rounded-lg">
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-medium">{campaign.name}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{campaign.businessName}</p>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-gray-500">Reward:</span> {campaign.rewards}
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-500">Participants:</span> {campaign.participants}
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-500">Ends:</span> {campaign.endDate}
                              </div>
                            </div>
                            <Button 
                              onClick={() => simulateCustomerTap(campaign.id)}
                              className="w-full"
                              size="sm"
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Tap Cirql Tag
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">Select a customer user from the Test Setup tab to experience the customer journey</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="business" className="space-y-6">
            {selectedUser && selectedUser.role === "business" ? (
              <>
                {/* Business Dashboard */}
                <Card>
                  <CardHeader>
                    <CardTitle>Business Testing Dashboard</CardTitle>
                    <CardDescription>Experience the platform as a business subscriber</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button onClick={() => window.location.href = '/campaign-builder'} className="h-24">
                        <div className="text-center">
                          <Gift className="h-8 w-8 mx-auto mb-2" />
                          <div className="font-medium">Campaign Builder</div>
                          <div className="text-xs opacity-75">Create new campaigns</div>
                        </div>
                      </Button>
                      <Button onClick={() => window.location.href = '/analytics'} variant="outline" className="h-24">
                        <div className="text-center">
                          <Trophy className="h-8 w-8 mx-auto mb-2" />
                          <div className="font-medium">Analytics</div>
                          <div className="text-xs opacity-75">Track performance</div>
                        </div>
                      </Button>
                      <Button onClick={() => window.location.href = '/merchant'} variant="outline" className="h-24">
                        <div className="text-center">
                          <Users className="h-8 w-8 mx-auto mb-2" />
                          <div className="font-medium">Merchant Hub</div>
                          <div className="text-xs opacity-75">Manage business</div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Test Business Features */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Campaign Tests</CardTitle>
                      <CardDescription>Test different campaign types</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button onClick={() => window.location.href = '/campaign-builder?template=loyalty'} variant="outline" className="w-full justify-start">
                        <Star className="h-4 w-4 mr-2" />
                        Loyalty Program Campaign
                      </Button>
                      <Button onClick={() => window.location.href = '/campaign-builder?template=referral'} variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Referral Campaign
                      </Button>
                      <Button onClick={() => window.location.href = '/campaign-builder?template=ar'} variant="outline" className="w-full justify-start">
                        <Play className="h-4 w-4 mr-2" />
                        AR Experience Campaign
                      </Button>
                      <Button onClick={() => window.location.href = '/campaign-builder?template=seasonal'} variant="outline" className="w-full justify-start">
                        <Gift className="h-4 w-4 mr-2" />
                        Seasonal Campaign
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>AI-Powered Features</CardTitle>
                      <CardDescription>Test AI assistance tools</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button onClick={() => window.location.href = '/ai-insights'} variant="outline" className="w-full justify-start">
                        <Zap className="h-4 w-4 mr-2" />
                        AI Customer Insights
                      </Button>
                      <Button onClick={() => window.location.href = '/analytics?view=predictions'} variant="outline" className="w-full justify-start">
                        <Trophy className="h-4 w-4 mr-2" />
                        Predictive Analytics
                      </Button>
                      <Button onClick={() => window.location.href = '/merchant?tab=pricing'} variant="outline" className="w-full justify-start">
                        <Star className="h-4 w-4 mr-2" />
                        AI Pricing Optimizer
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">Select a business user from the Test Setup tab to experience the business journey</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Administrator Testing Dashboard</CardTitle>
                <CardDescription>Experience comprehensive platform management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button onClick={() => window.location.href = '/admin-dashboard'} className="h-20">
                    <div className="text-center">
                      <Shield className="h-6 w-6 mx-auto mb-1" />
                      <div>Admin Dashboard</div>
                    </div>
                  </Button>
                  <Button onClick={() => window.location.href = '/admin-invitations'} variant="outline" className="h-20">
                    <div className="text-center">
                      <Users className="h-6 w-6 mx-auto mb-1" />
                      <div>Invitations</div>
                    </div>
                  </Button>
                  <Button onClick={() => window.location.href = '/admin-training-center'} variant="outline" className="h-20">
                    <div className="text-center">
                      <Trophy className="h-6 w-6 mx-auto mb-1" />
                      <div>Training Center</div>
                    </div>
                  </Button>
                  <Button onClick={() => window.location.href = '/platform-overview'} variant="outline" className="h-20">
                    <div className="text-center">
                      <Star className="h-6 w-6 mx-auto mb-1" />
                      <div>Platform Overview</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Communication Hub Modal */}
        {showCommunication && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Partner Communication Hub</h2>
                <Button variant="outline" onClick={() => setShowCommunication(false)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
              <CommunicationHub />
            </div>
          </div>
        )}

        {/* Solo Testing Modal */}
        {showSoloTesting && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-6xl w-full max-h-[80vh] overflow-auto mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Solo Testing Simulator</h2>
                <Button variant="outline" onClick={() => setShowSoloTesting(false)}>
                  <Play className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
              <SoloTestingSimulator />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}