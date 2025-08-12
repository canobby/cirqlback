import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit, BarChart3, Calendar } from "lucide-react";

interface CampaignManagementProps {
  businessId: string;
}

export default function CampaignManagement({ businessId }: CampaignManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    rewardType: "",
    rewardValue: "",
    expiresAt: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ["/api/campaigns", businessId],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns?businessId=${businessId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      return await apiRequest("POST", "/api/campaigns", {
        ...campaignData,
        businessId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", businessId] });
      setIsDialogOpen(false);
      setNewCampaign({
        name: "",
        description: "",
        rewardType: "",
        rewardValue: "",
        expiresAt: ""
      });
      toast({
        title: "Campaign Created",
        description: "Your new campaign is now active and ready for NFC tags.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.rewardType || !newCampaign.rewardValue) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createCampaignMutation.mutate(newCampaign);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading campaigns...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-destructive mb-4">Failed to load campaigns</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Campaign Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Campaign Management</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="campaign-name">Campaign Name *</Label>
                <Input
                  id="campaign-name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g., Free Coffee Friday"
                />
              </div>
              <div>
                <Label htmlFor="campaign-description">Description</Label>
                <Textarea
                  id="campaign-description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="Describe your campaign..."
                />
              </div>
              <div>
                <Label htmlFor="reward-type">Reward Type *</Label>
                <Select value={newCampaign.rewardType} onValueChange={(value) => setNewCampaign({ ...newCampaign, rewardType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reward type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="freebie">Free Item</SelectItem>
                    <SelectItem value="points">Loyalty Points</SelectItem>
                    <SelectItem value="punch_card">Punch Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reward-value">Reward Value *</Label>
                <Input
                  id="reward-value"
                  value={newCampaign.rewardValue}
                  onChange={(e) => setNewCampaign({ ...newCampaign, rewardValue: e.target.value })}
                  placeholder="e.g., 10% off, Free coffee, 100 points"
                />
              </div>
              <div>
                <Label htmlFor="expires-at">Expiration Date</Label>
                <Input
                  id="expires-at"
                  type="date"
                  value={newCampaign.expiresAt}
                  onChange={(e) => setNewCampaign({ ...newCampaign, expiresAt: e.target.value })}
                />
              </div>
              <Button 
                onClick={handleCreateCampaign}
                disabled={createCampaignMutation.isPending}
                className="w-full"
              >
                {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Campaigns */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="text-gray-400 h-8 w-8" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">No Campaigns Yet</h4>
              <p className="text-gray-600 mb-4">Create your first campaign to start engaging customers</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          Array.isArray(campaigns) && campaigns.map((campaign: any) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">{campaign.name}</h4>
                    <p className="text-gray-600">{campaign.description}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className="text-sm text-gray-500">
                        {campaign.rewardType}: {campaign.rewardValue}
                      </span>
                      {campaign.expiresAt && (
                        <span className="text-sm text-gray-500 flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          Expires: {new Date(campaign.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={campaign.isActive ? "default" : "secondary"}>
                    {campaign.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <span>{campaign.currentRedemptions || 0} redemptions</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="mr-2 h-3 w-3" />
                      Analytics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
