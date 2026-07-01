import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search,
  Plus,
  Wifi,
  MapPin,
  TrendingUp,
  Settings,
  Edit3,
  Trash2,
  Power,
  Download,
  QrCode,
  Copy,
  ExternalLink,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NfcWritingWizard from "./NfcWritingWizard";

interface NfcTagManagerProps {
  businessId: string;
}

interface NfcTag {
  id: string;
  tagIdentifier: string;
  campaignId?: string;
  location: string;
  customLabel?: string;
  isActive: boolean;
  totalTaps: number;
  createdAt: string;
  lastTapAt?: string;
  campaign?: {
    name: string;
    type: string;
    isActive: boolean;
  };
}

export default function NfcTagManager({ businessId }: NfcTagManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [selectedTag, setSelectedTag] = useState<NfcTag | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch NFC tags
  const { data: tags = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/nfc-tags?businessId=${businessId}`],
    enabled: !!businessId
  });

  // Fetch campaigns for reference
  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: [`/api/campaigns?businessId=${businessId}`],
    enabled: !!businessId
  });

  // Toggle tag status mutation
  const toggleTagMutation = useMutation({
    mutationFn: async ({ tagId, isActive }: { tagId: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/nfc-tags/${tagId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/nfc-tags`] });
      toast({
        title: "Tag Updated",
        description: "Tag status updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update tag status.",
        variant: "destructive"
      });
    }
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return apiRequest("DELETE", `/api/nfc-tags/${tagId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/nfc-tags`] });
      toast({
        title: "Tag Deleted",
        description: "Tag removed successfully."
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete tag.",
        variant: "destructive"
      });
    }
  });

  // Filter tags based on search and status
  const filteredTags = (tags as NfcTag[]).filter((tag: NfcTag) => {
    const matchesSearch = tag.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tag.customLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tag.tagIdentifier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && tag.isActive) ||
                         (filterStatus === 'inactive' && !tag.isActive);
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: (tags as NfcTag[]).length,
    active: (tags as NfcTag[]).filter((tag: NfcTag) => tag.isActive).length,
    inactive: (tags as NfcTag[]).filter((tag: NfcTag) => !tag.isActive).length,
    totalTaps: (tags as NfcTag[]).reduce((sum: number, tag: NfcTag) => sum + tag.totalTaps, 0)
  };

  const copyTagUrl = (tagId: string) => {
    const url = `${window.location.origin}/tap/${tagId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "URL Copied",
      description: "Tag URL copied to clipboard."
    });
  };

  const getStatusIcon = (tag: NfcTag) => {
    if (!tag.isActive) return <XCircle className="h-4 w-4 text-red-500" />;
    if (tag.totalTaps === 0) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = (tag: NfcTag) => {
    if (!tag.isActive) return "Inactive";
    if (tag.totalTaps === 0) return "No Taps Yet";
    return "Active";
  };

  if (showWizard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setShowWizard(false)}>
            ← Back to Tag Manager
          </Button>
        </div>
        <NfcWritingWizard 
          businessId={businessId} 
          onComplete={() => setShowWizard(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cirql Tag Manager</h2>
          <p className="text-gray-600">Create, manage, and monitor your NFC tags</p>
        </div>
        <Button 
          onClick={() => setShowWizard(true)}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Tag
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tags</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Wifi className="h-8 w-8 text-primary opacity-75" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Tags</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive Tags</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Taps</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalTaps}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tags by location, label, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
          <TabsList>
            <TabsTrigger value="all">All Tags</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tags List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Wifi className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-500">Loading your Cirql tags...</p>
          </div>
        </div>
      ) : filteredTags.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Wifi className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {tags.length === 0 ? "No Cirql Tags Yet" : "No Matching Tags"}
            </h3>
            <p className="text-gray-500 mb-6">
              {tags.length === 0 
                ? "Create your first Cirql tag to start engaging customers with tap-to-reward experiences."
                : "Try adjusting your search or filter criteria to find the tags you're looking for."
              }
            </p>
            {tags.length === 0 && (
              <Button 
                onClick={() => setShowWizard(true)}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Tag
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTags.map((tag: NfcTag) => {
            const campaign = (campaigns as any[]).find((c: any) => c.id === tag.campaignId);
            
            return (
              <Card key={tag.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Wifi className="text-white h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {tag.customLabel || tag.location}
                        </CardTitle>
                        {tag.customLabel && (
                          <CardDescription className="text-xs">
                            {tag.location}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(tag)}
                      <Badge variant={tag.isActive ? "default" : "secondary"} className="text-xs">
                        {getStatusText(tag)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Tag Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tag ID:</span>
                      <span className="font-mono text-xs">{tag.tagIdentifier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Campaign:</span>
                      <span className="font-medium">{campaign?.name || "No Campaign"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Taps:</span>
                      <span className="font-bold text-primary">{tag.totalTaps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{new Date(tag.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Performance Indicator */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Performance:</span>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${
                          tag.totalTaps > 50 ? 'bg-green-500' :
                          tag.totalTaps > 10 ? 'bg-yellow-500' :
                          tag.totalTaps > 0 ? 'bg-orange-500' : 'bg-gray-300'
                        }`} />
                        <span className={
                          tag.totalTaps > 50 ? 'text-green-600' :
                          tag.totalTaps > 10 ? 'text-yellow-600' :
                          tag.totalTaps > 0 ? 'text-orange-600' : 'text-gray-500'
                        }>
                          {tag.totalTaps > 50 ? 'Excellent' :
                           tag.totalTaps > 10 ? 'Good' :
                           tag.totalTaps > 0 ? 'Fair' : 'No Activity'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyTagUrl(tag.id)}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copy URL
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => console.log('View QR Code for', tag.id)}
                    >
                      <QrCode className="mr-1 h-3 w-3" />
                      QR Code
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => console.log('View analytics for', tag.id)}
                    >
                      <BarChart3 className="mr-1 h-3 w-3" />
                      Analytics
                    </Button>
                  </div>

                  {/* Quick Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Power className="h-3 w-3 text-gray-400" />
                      <Label htmlFor={`toggle-${tag.id}`} className="text-sm">
                        {tag.isActive ? 'Active' : 'Inactive'}
                      </Label>
                    </div>
                    <Switch
                      id={`toggle-${tag.id}`}
                      checked={tag.isActive}
                      onCheckedChange={(checked) => 
                        toggleTagMutation.mutate({ tagId: tag.id, isActive: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Help */}
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          <strong>Pro Tips:</strong> Place tags in high-visibility areas, test them regularly, 
          and monitor performance through analytics. Toggle tags off temporarily if you need to 
          update campaigns or relocate them.
        </AlertDescription>
      </Alert>
    </div>
  );
}