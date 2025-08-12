import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share2, TrendingUp, Users, Zap, Gift, Copy, MessageCircle, Heart, Plus, BarChart3, Crown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ViralCampaign {
  id: string;
  businessId: string;
  businessName: string;
  title: string;
  description: string;
  campaignType: 'friend_referral' | 'social_share' | 'group_visit' | 'challenge_completion';
  viralMechanic: 'exponential_rewards' | 'friend_multipliers' | 'group_discounts' | 'fomo_triggers';
  baseReward: number;
  viralMultiplier: number;
  maxReward: number;
  participantCount: number;
  shareCount: number;
  conversionRate: number;
  totalRevenue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  userProgress?: {
    participated: boolean;
    friendsReferred: number;
    rewardEarned: number;
    sharesMade: number;
  };
}

interface SocialProofEvent {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  businessId: string;
  businessName: string;
  eventType: 'visit' | 'review' | 'share' | 'recommend' | 'check_in';
  visibility: 'public' | 'friends' | 'private';
  message: string;
  viewCount: number;
  interactionCount: number;
  createdAt: string;
}

interface FriendConnection {
  id: string;
  friendId: string;
  friendName: string;
  friendAvatar: string;
  status: 'pending' | 'accepted' | 'blocked';
  sharedVisits: number;
  mutualRewards: number;
  connectedAt: string;
}

export default function ViralCampaigns() {
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<ViralCampaign | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    campaignType: "",
    viralMechanic: "",
    baseReward: 0,
    viralMultiplier: 1.5,
    maxReward: 0
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: viralCampaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["/api/viral-campaigns"],
  });

  const { data: socialProof = [], isLoading: loadingSocial } = useQuery({
    queryKey: ["/api/social-proof"],
  });

  const { data: friendNetwork = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["/api/friends"],
  });

  const { data: viralStats = {}, isLoading: loadingStats } = useQuery({
    queryKey: ["/api/viral-stats"],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      await apiRequest("POST", "/api/viral-campaigns", campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral-campaigns"] });
      setNewCampaignOpen(false);
      setNewCampaign({
        title: "",
        description: "",
        campaignType: "",
        viralMechanic: "",
        baseReward: 0,
        viralMultiplier: 1.5,
        maxReward: 0
      });
      toast({
        title: "Campaign Created",
        description: "Your viral campaign is now live!",
      });
    },
  });

  const participateMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      await apiRequest("POST", `/api/viral-campaigns/${campaignId}/participate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral-campaigns"] });
      toast({
        title: "Joined Campaign",
        description: "Start sharing to earn rewards!",
      });
    },
  });

  const shareCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, platform }: { campaignId: string; platform: string }) => {
      await apiRequest("POST", `/api/viral-campaigns/${campaignId}/share`, { platform });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viral-campaigns"] });
      toast({
        title: "Shared Successfully",
        description: "Your share has been tracked and rewards updated!",
      });
    },
  });

  const addFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      await apiRequest("POST", "/api/friends/add", { friendId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Friend Request Sent",
        description: "Your friend will be notified of your request!",
      });
    },
  });

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'friend_referral': return <Users className="w-4 h-4" />;
      case 'social_share': return <Share2 className="w-4 h-4" />;
      case 'group_visit': return <Users className="w-4 h-4" />;
      case 'challenge_completion': return <TrendingUp className="w-4 h-4" />;
      default: return <Share2 className="w-4 h-4" />;
    }
  };

  const getViralMechanicColor = (mechanic: string) => {
    switch (mechanic) {
      case 'exponential_rewards': return 'bg-purple-500';
      case 'friend_multipliers': return 'bg-blue-500';
      case 'group_discounts': return 'bg-green-500';
      case 'fomo_triggers': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const calculatePotentialReward = (campaign: ViralCampaign, referrals: number) => {
    const multipliedReward = campaign.baseReward * Math.pow(campaign.viralMultiplier, referrals);
    return Math.min(multipliedReward, campaign.maxReward);
  };

  const shareUrl = selectedCampaign 
    ? `${window.location.origin}/viral/${selectedCampaign.id}?ref=${btoa('user-id')}`
    : '';

  if (loadingCampaigns || loadingSocial || loadingFriends || loadingStats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-pink-600" />
          <div>
            <h1 className="text-3xl font-bold">Viral Growth Hub</h1>
            <p className="text-muted-foreground">Social campaigns that grow exponentially through friend networks</p>
          </div>
        </div>
        
        <Dialog open={newCampaignOpen} onOpenChange={setNewCampaignOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Viral Campaign</DialogTitle>
              <DialogDescription>
                Design a campaign that grows through social sharing
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign({...newCampaign, title: e.target.value})}
                  placeholder="Enter campaign title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                  placeholder="Describe your viral campaign..."
                />
              </div>

              <div>
                <Label htmlFor="type">Campaign Type</Label>
                <Select 
                  value={newCampaign.campaignType} 
                  onValueChange={(value) => setNewCampaign({...newCampaign, campaignType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friend_referral">Friend Referral</SelectItem>
                    <SelectItem value="social_share">Social Share</SelectItem>
                    <SelectItem value="group_visit">Group Visit</SelectItem>
                    <SelectItem value="challenge_completion">Challenge Completion</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mechanic">Viral Mechanic</Label>
                <Select 
                  value={newCampaign.viralMechanic} 
                  onValueChange={(value) => setNewCampaign({...newCampaign, viralMechanic: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select viral mechanic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exponential_rewards">Exponential Rewards</SelectItem>
                    <SelectItem value="friend_multipliers">Friend Multipliers</SelectItem>
                    <SelectItem value="group_discounts">Group Discounts</SelectItem>
                    <SelectItem value="fomo_triggers">FOMO Triggers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="baseReward">Base Reward ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newCampaign.baseReward}
                    onChange={(e) => setNewCampaign({...newCampaign, baseReward: parseFloat(e.target.value)})}
                  />
                </div>

                <div>
                  <Label htmlFor="maxReward">Max Reward ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newCampaign.maxReward}
                    onChange={(e) => setNewCampaign({...newCampaign, maxReward: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <Button 
                onClick={() => createCampaignMutation.mutate(newCampaign)}
                disabled={createCampaignMutation.isPending}
                className="w-full"
              >
                Launch Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns">Active Campaigns</TabsTrigger>
          <TabsTrigger value="social-feed">Social Feed</TabsTrigger>
          <TabsTrigger value="friends">Friend Network</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(viralCampaigns as ViralCampaign[]).map((campaign) => (
              <Card key={campaign.id} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-pink-400 to-purple-600 opacity-10 rounded-bl-full" />
                
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getCampaignTypeIcon(campaign.campaignType)}
                    {campaign.title}
                  </CardTitle>
                  <Badge className={getViralMechanicColor(campaign.viralMechanic)}>
                    {campaign.viralMechanic.replace('_', ' ').toUpperCase()}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{campaign.description}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Participants:</span>
                        <div className="font-medium">{campaign.participantCount}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Shares:</span>
                        <div className="font-medium">{campaign.shareCount}</div>
                      </div>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">Conversion Rate:</span>
                      <div className="font-medium">{(campaign.conversionRate * 100).toFixed(1)}%</div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Reward Structure:</div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Base: ${campaign.baseReward}</div>
                        <div>Multiplier: {campaign.viralMultiplier}x per referral</div>
                        <div>Max: ${campaign.maxReward}</div>
                      </div>
                    </div>

                    {campaign.userProgress ? (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Your Progress:</div>
                        <div className="text-xs space-y-1">
                          <div>Friends Referred: {campaign.userProgress.friendsReferred}</div>
                          <div>Reward Earned: ${campaign.userProgress.rewardEarned}</div>
                          <div>Potential Next: ${calculatePotentialReward(campaign, campaign.userProgress.friendsReferred + 1)}</div>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setSelectedCampaign(campaign);
                            setShareModalOpen(true);
                          }}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Share & Earn More
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => participateMutation.mutate(campaign.id)}
                        disabled={participateMutation.isPending}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Join Campaign
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="social-feed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Local Social Activity
              </CardTitle>
              <CardDescription>See what your friends and community are up to</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(socialProof as SocialProofEvent[]).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center text-white text-sm">
                      {event.userName[0]}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{event.userName}</span>
                        <span className="text-muted-foreground">
                          {event.eventType === 'visit' && 'visited'}
                          {event.eventType === 'review' && 'reviewed'}
                          {event.eventType === 'share' && 'shared'}
                          {event.eventType === 'recommend' && 'recommended'}
                          {event.eventType === 'check_in' && 'checked in at'}
                        </span>
                        <span className="font-medium text-blue-600">{event.businessName}</span>
                      </div>
                      {event.message && (
                        <p className="text-sm text-muted-foreground mt-1">{event.message}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{event.viewCount} views</span>
                        <span>{event.interactionCount} interactions</span>
                        <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="friends" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(friendNetwork as FriendConnection[]).map((friend) => (
              <Card key={friend.id}>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-blue-600 flex items-center justify-center text-white">
                      {friend.friendName[0]}
                    </div>
                    <div>
                      <div className="font-medium">{friend.friendName}</div>
                      <div className="text-xs text-muted-foreground">
                        Connected {new Date(friend.connectedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {friend.status === 'accepted' && <Crown className="w-4 h-4 text-yellow-500" />}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Shared Visits:</span>
                        <div className="font-medium">{friend.sharedVisits}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mutual Rewards:</span>
                        <div className="font-medium">{friend.mutualRewards}</div>
                      </div>
                    </div>

                    <Badge variant={friend.status === 'accepted' ? 'default' : 'secondary'}>
                      {friend.status.toUpperCase()}
                    </Badge>

                    <Button size="sm" className="w-full">
                      <Gift className="w-4 h-4 mr-2" />
                      Invite to Campaign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{viralStats.totalShares || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{viralStats.sharesGrowth || 0}% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Viral Coefficient</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{viralStats.viralCoefficient || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Average referrals per user
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campaign ROI</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{viralStats.campaignROI || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Return on investment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{viralStats.activeParticipants || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Currently engaged users
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Viral Growth Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4" />
                  <p>Viral analytics dashboard coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Share Modal */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Campaign</DialogTitle>
            <DialogDescription>
              Share with friends to earn exponential rewards
            </DialogDescription>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border">
                <div className="text-2xl font-bold text-purple-600">
                  ${calculatePotentialReward(selectedCampaign, (selectedCampaign.userProgress?.friendsReferred || 0) + 1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Potential reward for next referral
                </div>
              </div>

              <div>
                <Label htmlFor="shareUrl">Share URL</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={shareUrl}
                    className="text-sm"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      toast({ title: "Copied to clipboard!" });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => shareCampaignMutation.mutate({ 
                    campaignId: selectedCampaign.id, 
                    platform: 'facebook' 
                  })}
                >
                  Facebook
                </Button>
                <Button 
                  onClick={() => shareCampaignMutation.mutate({ 
                    campaignId: selectedCampaign.id, 
                    platform: 'twitter' 
                  })}
                >
                  Twitter
                </Button>
                <Button 
                  onClick={() => shareCampaignMutation.mutate({ 
                    campaignId: selectedCampaign.id, 
                    platform: 'instagram' 
                  })}
                >
                  Instagram
                </Button>
                <Button 
                  onClick={() => shareCampaignMutation.mutate({ 
                    campaignId: selectedCampaign.id, 
                    platform: 'whatsapp' 
                  })}
                >
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}