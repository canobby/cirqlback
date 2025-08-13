import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Smartphone, 
  Plus, 
  Settings, 
  Zap, 
  QrCode, 
  MapPin,
  Tag as TagIcon,
  AlertCircle,
  CheckCircle,
  Copy,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import WebNfcInterface from '@/components/nfc/WebNfcInterface';
import { apiRequest } from '@/lib/queryClient';

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: string;
  value?: number;
  pointsAwarded?: number;
  isActive: boolean;
}

interface NfcTag {
  id: string;
  tagIdentifier: string;
  businessId: string;
  campaignId?: string;
  location: string;
  customLabel?: string;
  description?: string;
  placementNotes?: string;
  isActive: boolean;
  totalTaps: number;
  tagUrl?: string;
  qrCodeUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface TagConfiguration {
  campaignId: string;
  location: string;
  customLabel: string;
  description: string;
  placementNotes: string;
}

export default function NfcWriterPage() {
  const [selectedBusinessId] = useState('demo_biz_1'); // For demo purposes
  const [tagConfiguration, setTagConfiguration] = useState<TagConfiguration>({
    campaignId: '',
    location: '',
    customLabel: '',
    description: '',
    placementNotes: ''
  });
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [currentWritingTag, setCurrentWritingTag] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['/api/campaigns'],
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Fetch existing NFC tags
  const { data: nfcTags = [], isLoading: tagsLoading } = useQuery({
    queryKey: [`/api/nfc-tags?businessId=${selectedBusinessId}`],
    select: (data: any) => Array.isArray(data) ? data : []
  });

  // Create new NFC tag
  const createTagMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/nfc-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          ...data
        })
      });
      if (!response.ok) {
        throw new Error('Failed to create tag');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/nfc-tags?businessId=${selectedBusinessId}`] });
      setCurrentWritingTag(data);
      toast({
        title: "Tag Created Successfully",
        description: "Your NFC tag configuration has been saved and is ready for programming."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Tag",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update existing NFC tag
  const updateTagMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const response = await fetch(`/api/nfc-tags/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to update tag');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/nfc-tags?businessId=${selectedBusinessId}`] });
      toast({
        title: "Tag Updated Successfully",
        description: "Your NFC tag configuration has been updated."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Tag",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete NFC tag
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const response = await fetch(`/api/nfc-tags/${tagId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/nfc-tags?businessId=${selectedBusinessId}`] });
      toast({
        title: "Tag Deleted",
        description: "NFC tag has been removed from your account."
      });
    }
  });

  const handleCreateTag = () => {
    if (!tagConfiguration.campaignId || !tagConfiguration.location) {
      toast({
        title: "Missing Required Fields",
        description: "Please select a campaign and specify a location.",
        variant: "destructive"
      });
      return;
    }

    createTagMutation.mutate(tagConfiguration);
  };

  const handleUpdateTag = (tagId: string, updates: any) => {
    updateTagMutation.mutate({ id: tagId, ...updates });
  };

  const handleNfcWriteSuccess = (data: any) => {
    toast({
      title: "NFC Tag Programmed!",
      description: "Your physical NFC tag has been successfully programmed with campaign data.",
    });
    
    // Update the tag status in the database if needed
    if (currentWritingTag) {
      handleUpdateTag(currentWritingTag.id, {
        lastTapAt: new Date().toISOString(),
        isActive: true
      });
    }
  };

  const handleNfcWriteError = (error: string) => {
    console.error('NFC Write Error:', error);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`
    });
  };

  const selectedCampaign = campaigns.find((c: Campaign) => c.id === tagConfiguration.campaignId);
  const selectedTag = nfcTags.find((t: NfcTag) => t.id === selectedTagId);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">NFC Tag Writer</h1>
          <p className="text-gray-600 mt-2">Create and program your Cirql tags for customer engagement</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800">
            Web NFC Enabled
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Tag
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage Existing Tags
          </TabsTrigger>
          <TabsTrigger value="writer" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            NFC Writer
          </TabsTrigger>
        </TabsList>

        {/* Create New Tag */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TagIcon className="h-5 w-5" />
                  Tag Configuration
                </CardTitle>
                <CardDescription>
                  Set up your new NFC tag with campaign and location details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign Selection */}
                <div className="space-y-2">
                  <Label htmlFor="campaign">Campaign (Required)</Label>
                  <Select 
                    value={tagConfiguration.campaignId} 
                    onValueChange={(value) => setTagConfiguration(prev => ({ ...prev, campaignId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignsLoading ? (
                        <SelectItem value="loading" disabled>Loading campaigns...</SelectItem>
                      ) : campaigns.length === 0 ? (
                        <SelectItem value="none" disabled>No campaigns available</SelectItem>
                      ) : (
                        campaigns.map((campaign: Campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            <div>
                              <div className="font-medium">{campaign.name}</div>
                              <div className="text-sm text-gray-500">{campaign.type}</div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location (Required)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Front Counter, Main Entrance, Table 5"
                    value={tagConfiguration.location}
                    onChange={(e) => setTagConfiguration(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                {/* Custom Label */}
                <div className="space-y-2">
                  <Label htmlFor="customLabel">Custom Label</Label>
                  <Input
                    id="customLabel"
                    placeholder="e.g., Welcome Tag, Loyalty Rewards"
                    value={tagConfiguration.customLabel}
                    onChange={(e) => setTagConfiguration(prev => ({ ...prev, customLabel: e.target.value }))}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What should customers expect when they tap this tag?"
                    value={tagConfiguration.description}
                    onChange={(e) => setTagConfiguration(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                {/* Placement Notes */}
                <div className="space-y-2">
                  <Label htmlFor="placementNotes">Placement Notes</Label>
                  <Textarea
                    id="placementNotes"
                    placeholder="Add notes about optimal placement or special instructions..."
                    value={tagConfiguration.placementNotes}
                    onChange={(e) => setTagConfiguration(prev => ({ ...prev, placementNotes: e.target.value }))}
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleCreateTag}
                  disabled={!tagConfiguration.campaignId || !tagConfiguration.location || createTagMutation.isPending}
                  className="w-full"
                >
                  {createTagMutation.isPending ? 'Creating...' : 'Create Tag Configuration'}
                </Button>
              </CardContent>
            </Card>

            {/* Campaign Preview */}
            {selectedCampaign && (
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Preview</CardTitle>
                  <CardDescription>
                    This is what customers will experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900">{selectedCampaign.name}</h4>
                    <p className="text-blue-700 text-sm mt-1">{selectedCampaign.description}</p>
                    <div className="flex items-center mt-3 space-x-4">
                      <Badge variant="outline">{selectedCampaign.type}</Badge>
                      {selectedCampaign.value && (
                        <span className="text-blue-700 font-medium">
                          {selectedCampaign.type === 'discount' 
                            ? `${selectedCampaign.value}% off` 
                            : `${selectedCampaign.pointsAwarded} points`}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Manage Existing Tags */}
        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Your NFC Tags
              </CardTitle>
              <CardDescription>
                Manage, update, or reprogram your existing tags
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tagsLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Loading tags...</p>
                </div>
              ) : nfcTags.length === 0 ? (
                <div className="text-center py-8">
                  <TagIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No NFC Tags Yet</h3>
                  <p className="text-gray-500">Create your first NFC tag to get started with customer engagement.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nfcTags.map((tag: NfcTag) => (
                    <Card key={tag.id} className="border-gray-200">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{tag.customLabel || tag.location}</CardTitle>
                          <Badge className={tag.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                            {tag.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <CardDescription>{tag.location}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm space-y-1">
                          <div><strong>Tag ID:</strong> {tag.tagIdentifier}</div>
                          <div><strong>Total Taps:</strong> {tag.totalTaps}</div>
                          {tag.description && <div><strong>Description:</strong> {tag.description}</div>}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedTagId(tag.id);
                              setCurrentWritingTag(tag);
                            }}
                          >
                            <Smartphone className="h-3 w-3 mr-1" />
                            Program
                          </Button>
                          
                          {tag.tagUrl && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => copyToClipboard(tag.tagUrl!, 'Tag URL')}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy URL
                            </Button>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateTag(tag.id, { isActive: !tag.isActive })}
                          >
                            {tag.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => deleteTagMutation.mutate(tag.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NFC Writer Interface */}
        <TabsContent value="writer" className="space-y-6">
          {currentWritingTag ? (
            <WebNfcInterface
              tagData={{
                tagId: currentWritingTag.id,
                businessId: selectedBusinessId,
                campaignId: currentWritingTag.campaignId,
                redirectUrl: currentWritingTag.tagUrl || `${window.location.origin}/tap/${currentWritingTag.id}`,
                metadata: {
                  location: currentWritingTag.location,
                  customLabel: currentWritingTag.customLabel,
                  description: currentWritingTag.description,
                  createdAt: currentWritingTag.createdAt
                }
              }}
              onWriteSuccess={handleNfcWriteSuccess}
              onWriteError={handleNfcWriteError}
            />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please create a new tag or select an existing tag from the "Manage Existing Tags" tab to begin programming.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}