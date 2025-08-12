import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Handshake, Users, TrendingUp, Plus, Search, MapPin, Star, DollarSign, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BusinessPartnership {
  id: string;
  businessAId: string;
  businessBId: string;
  businessA: {
    name: string;
    category: string;
    address: string;
    rating: number;
  };
  businessB: {
    name: string;
    category: string;
    address: string;
    rating: number;
  };
  partnershipType: 'referral' | 'joint_campaign' | 'cross_promotion' | 'shared_rewards';
  status: 'pending' | 'active' | 'paused' | 'ended';
  commissionRate: number;
  sharedBudget: number;
  totalReferrals: number;
  totalRevenue: number;
  terms: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

interface CrossBusinessReward {
  id: string;
  partnershipId: string;
  triggerBusinessId: string;
  rewardBusinessId: string;
  rewardType: 'discount' | 'free_item' | 'points' | 'cashback';
  rewardValue: number;
  description: string;
  conditions: string;
  isActive: boolean;
}

export default function Partnerships() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newPartnershipOpen, setNewPartnershipOpen] = useState(false);
  const [newPartnership, setNewPartnership] = useState({
    partnerBusinessId: "",
    partnershipType: "",
    commissionRate: 0,
    terms: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: partnerships = [], isLoading: loadingPartnerships } = useQuery({
    queryKey: ["/api/partnerships"],
  });

  const { data: potentialPartners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ["/api/partnerships/potential", searchTerm, selectedCategory],
  });

  const { data: crossRewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ["/api/partnerships/cross-rewards"],
  });

  const createPartnershipMutation = useMutation({
    mutationFn: async (partnershipData: any) => {
      await apiRequest("POST", "/api/partnerships", partnershipData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
      setNewPartnershipOpen(false);
      setNewPartnership({
        partnerBusinessId: "",
        partnershipType: "",
        commissionRate: 0,
        terms: ""
      });
      toast({
        title: "Partnership Created",
        description: "Partnership proposal sent successfully!",
      });
    },
  });

  const updatePartnershipStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PUT", `/api/partnerships/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
    },
  });

  const getPartnershipTypeIcon = (type: string) => {
    switch (type) {
      case 'referral': return <Users className="w-4 h-4" />;
      case 'joint_campaign': return <TrendingUp className="w-4 h-4" />;
      case 'cross_promotion': return <Handshake className="w-4 h-4" />;
      case 'shared_rewards': return <DollarSign className="w-4 h-4" />;
      default: return <Handshake className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'paused': return 'bg-orange-500';
      case 'ended': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loadingPartnerships || loadingPartners || loadingRewards) {
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
          <Handshake className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Business Partnerships</h1>
            <p className="text-muted-foreground">Collaborate with local businesses to grow together</p>
          </div>
        </div>
        
        <Dialog open={newPartnershipOpen} onOpenChange={setNewPartnershipOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Partnership
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Partnership</DialogTitle>
              <DialogDescription>
                Propose a partnership with another local business
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="partner">Partner Business</Label>
                <Select 
                  value={newPartnership.partnerBusinessId} 
                  onValueChange={(value) => setNewPartnership({...newPartnership, partnerBusinessId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a business" />
                  </SelectTrigger>
                  <SelectContent>
                    {potentialPartners.map((business: any) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.name} - {business.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">Partnership Type</Label>
                <Select 
                  value={newPartnership.partnershipType} 
                  onValueChange={(value) => setNewPartnership({...newPartnership, partnershipType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select partnership type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">Referral Partnership</SelectItem>
                    <SelectItem value="joint_campaign">Joint Campaign</SelectItem>
                    <SelectItem value="cross_promotion">Cross Promotion</SelectItem>
                    <SelectItem value="shared_rewards">Shared Rewards</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="commission">Commission Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newPartnership.commissionRate}
                  onChange={(e) => setNewPartnership({...newPartnership, commissionRate: parseFloat(e.target.value)})}
                />
              </div>

              <div>
                <Label htmlFor="terms">Partnership Terms</Label>
                <Textarea
                  value={newPartnership.terms}
                  onChange={(e) => setNewPartnership({...newPartnership, terms: e.target.value})}
                  placeholder="Describe the partnership terms and benefits..."
                />
              </div>

              <Button 
                onClick={() => createPartnershipMutation.mutate(newPartnership)}
                disabled={createPartnershipMutation.isPending}
                className="w-full"
              >
                Send Partnership Proposal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active Partnerships</TabsTrigger>
          <TabsTrigger value="pending">Pending Requests</TabsTrigger>
          <TabsTrigger value="discovery">Partner Discovery</TabsTrigger>
          <TabsTrigger value="rewards">Cross Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(partnerships as BusinessPartnership[])
              .filter(p => p.status === 'active')
              .map((partnership) => (
                <Card key={partnership.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {getPartnershipTypeIcon(partnership.partnershipType)}
                      {partnership.partnershipType.replace('_', ' ').toUpperCase()}
                    </CardTitle>
                    <Badge className={getStatusColor(partnership.status)}>
                      {partnership.status.toUpperCase()}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium">{partnership.businessB.name}</h3>
                        <p className="text-sm text-muted-foreground">{partnership.businessB.category}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs">{partnership.businessB.rating}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Referrals:</span>
                          <div className="font-medium">{partnership.totalReferrals}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Revenue:</span>
                          <div className="font-medium">${partnership.totalRevenue}</div>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Commission: {partnership.commissionRate}%
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updatePartnershipStatus.mutate({
                            id: partnership.id, 
                            status: 'paused'
                          })}
                        >
                          Pause
                        </Button>
                        <Button size="sm">View Details</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(partnerships as BusinessPartnership[])
              .filter(p => p.status === 'pending')
              .map((partnership) => (
                <Card key={partnership.id}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {getPartnershipTypeIcon(partnership.partnershipType)}
                      Partnership Request
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium">{partnership.businessB.name}</h3>
                        <p className="text-sm text-muted-foreground">{partnership.businessB.category}</p>
                      </div>

                      <div className="text-sm">
                        <div className="text-muted-foreground">Proposed Terms:</div>
                        <div className="mt-1">{partnership.terms}</div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => updatePartnershipStatus.mutate({
                            id: partnership.id, 
                            status: 'active'
                          })}
                        >
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updatePartnershipStatus.mutate({
                            id: partnership.id, 
                            status: 'ended'
                          })}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="discovery" className="space-y-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {potentialPartners.map((business: any) => (
              <Card key={business.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{business.name}</CardTitle>
                    <Badge variant="outline">{business.category}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {business.address}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{business.rating}</span>
                      <span className="text-sm text-muted-foreground">({business.reviewCount} reviews)</span>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {business.description}
                    </div>

                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      Partnership Compatibility: {business.compatibilityScore}%
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setNewPartnership({
                          ...newPartnership,
                          partnerBusinessId: business.id
                        });
                        setNewPartnershipOpen(true);
                      }}
                    >
                      <Handshake className="w-4 h-4 mr-2" />
                      Propose Partnership
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          <div className="grid gap-6">
            {(crossRewards as CrossBusinessReward[]).map((reward) => (
              <Card key={reward.id}>
                <CardHeader>
                  <CardTitle className="text-lg">Cross-Business Reward</CardTitle>
                  <CardDescription>{reward.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Reward Type:</div>
                      <div className="font-medium capitalize">{reward.rewardType}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Value:</div>
                      <div className="font-medium">${reward.rewardValue}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status:</div>
                      <Badge variant={reward.isActive ? "default" : "secondary"}>
                        {reward.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground">Conditions:</div>
                    <div className="text-sm mt-1">{reward.conditions}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}