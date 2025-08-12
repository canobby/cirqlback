import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Zap, 
  MapPin, 
  Target, 
  Share2, 
  Eye, 
  Globe,
  Settings,
  BarChart3,
  Users,
  Gift,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface QuickActionsProps {
  userRole?: "customer" | "merchant" | "admin";
  currentPage?: string;
}

export default function QuickActions({ userRole = "customer", currentPage }: QuickActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions = {
    customer: [
      { label: "Find Nearby Deals", icon: MapPin, action: () => window.location.href = '/map', color: "text-blue-600" },
      { label: "Share Referral", icon: Share2, action: () => window.location.href = '/customer', color: "text-green-600" },
      { label: "AR Game Hub", icon: Target, action: () => window.location.href = '/ar-hub', color: "text-purple-600" },
      { label: "My Rewards", icon: Gift, action: () => window.location.href = '/customer', color: "text-orange-600" },
    ],
    merchant: [
      { label: "Quick Campaign", icon: Target, action: () => window.location.href = '/merchant', color: "text-blue-600" },
      { label: "Website Preview", icon: Eye, action: () => window.open('/website-preview', '_blank'), color: "text-green-600" },
      { label: "Live Analytics", icon: BarChart3, action: () => window.location.href = '/analytics', color: "text-purple-600" },
      { label: "Marketing Suite", icon: Zap, action: () => window.location.href = '/marketing', color: "text-orange-600" },
    ],
    admin: [
      { label: "Platform Analytics", icon: BarChart3, action: () => window.location.href = '/analytics', color: "text-blue-600" },
      { label: "User Management", icon: Users, action: () => window.location.href = '/admin', color: "text-green-600" },
      { label: "System Settings", icon: Settings, action: () => window.location.href = '/settings', color: "text-purple-600" },
      { label: "Live Map", icon: MapPin, action: () => window.location.href = '/map', color: "text-orange-600" },
    ]
  };

  const actions = quickActions[userRole] || quickActions.customer;
  const displayActions = isExpanded ? actions : actions.slice(0, 2);

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-64 shadow-lg border-2 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm text-gray-800">Quick Actions</h4>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
        </div>
        
        <div className="space-y-2">
          {displayActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button 
                key={index}
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-xs"
                onClick={action.action}
              >
                <Icon className={`h-3 w-3 mr-2 ${action.color}`} />
                {action.label}
              </Button>
            );
          })}
        </div>
        
        {actions.length > 2 && (
          <div className="text-center mt-2">
            <span className="text-xs text-gray-500">
              {isExpanded ? 'Show Less' : `+${actions.length - 2} more`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}