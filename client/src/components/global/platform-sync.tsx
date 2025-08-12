import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Globe,
  Users,
  BarChart3,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SyncStatus {
  component: string;
  status: "synced" | "pending" | "error";
  lastSync: string;
  description: string;
}

export default function PlatformSync() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([
    {
      component: "Business Profile",
      status: "synced",
      lastSync: "2 minutes ago",
      description: "Profile data synchronized with website and campaigns"
    },
    {
      component: "Active Campaigns",
      status: "synced", 
      lastSync: "5 minutes ago",
      description: "Campaign data updated across website and AR experiences"
    },
    {
      component: "Customer Analytics",
      status: "pending",
      lastSync: "15 minutes ago",
      description: "Analytics data needs synchronization"
    },
    {
      component: "AR Game Progress",
      status: "synced",
      lastSync: "1 minute ago", 
      description: "Avatar data and achievements synchronized"
    },
    {
      component: "Website Content",
      status: "synced",
      lastSync: "3 minutes ago",
      description: "Business website content auto-synced with profile"
    }
  ]);

  const handleFullSync = async () => {
    setIsSyncing(true);
    
    // Simulate sync process
    toast({
      title: "Platform Sync Started",
      description: "Synchronizing all platform components..."
    });

    try {
      // Update statuses to pending
      setSyncStatuses(prev => prev.map(status => ({
        ...status,
        status: "pending" as const
      })));

      // Simulate API calls for each component
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update all to synced
      setSyncStatuses(prev => prev.map(status => ({
        ...status,
        status: "synced" as const,
        lastSync: "Just now"
      })));

      toast({
        title: "Sync Complete",
        description: "All platform components are now synchronized"
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Some components failed to synchronize",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "synced": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending": return <RefreshCw className="h-4 w-4 text-orange-600 animate-spin" />;
      case "error": return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <RefreshCw className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "synced": return <Badge className="bg-green-100 text-green-800">Synced</Badge>;
      case "pending": return <Badge className="bg-orange-100 text-orange-800">Pending</Badge>;
      case "error": return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-blue-600" />
            Platform Sync Status
          </CardTitle>
          <Button 
            onClick={handleFullSync}
            disabled={isSyncing}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncStatuses.map((sync, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(sync.status)}
              <div>
                <div className="font-semibold text-sm">{sync.component}</div>
                <div className="text-xs text-gray-600">{sync.description}</div>
              </div>
            </div>
            <div className="text-right">
              {getStatusBadge(sync.status)}
              <div className="text-xs text-gray-500 mt-1">{sync.lastSync}</div>
            </div>
          </div>
        ))}

        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-2" />
              <span>Auto-sync enabled</span>
            </div>
            <div className="flex items-center text-blue-600">
              <Globe className="h-4 w-4 mr-2" />
              <span>Real-time updates</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}