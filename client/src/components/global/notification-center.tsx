import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, Gift, Target, Users, Zap, MapPin } from "lucide-react";

interface Notification {
  id: string;
  type: "reward" | "campaign" | "social" | "system" | "ar_game";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  priority: "low" | "medium" | "high";
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { data: liveNotifications } = useQuery({
    queryKey: ["/api/notifications/live"],
    refetchInterval: 30000, // Poll every 30 seconds
  });

  useEffect(() => {
    // Mock real-time notifications
    const mockNotifications: Notification[] = [
      {
        id: "1",
        type: "reward",
        title: "🎉 New Reward Earned!",
        message: "You earned 50 points at Brew & Bean Coffee",
        timestamp: "2 min ago",
        isRead: false,
        actionUrl: "/customer",
        priority: "high"
      },
      {
        id: "2", 
        type: "campaign",
        title: "📈 Campaign Update",
        message: "Your 'Morning Discount' campaign is performing well",
        timestamp: "15 min ago",
        isRead: false,
        actionUrl: "/merchant",
        priority: "medium"
      },
      {
        id: "3",
        type: "social",
        title: "👥 Team Challenge",
        message: "Your team is #3 in the Downtown Trail challenge",
        timestamp: "1 hour ago",
        isRead: true,
        actionUrl: "/ar-hub",
        priority: "medium"
      },
      {
        id: "4",
        type: "ar_game",
        title: "🏆 Achievement Unlocked",
        message: "You collected all coffee collectibles!",
        timestamp: "2 hours ago",
        isRead: false,
        actionUrl: "/ar-hub",
        priority: "high"
      }
    ];
    
    setNotifications(mockNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "reward": return Gift;
      case "campaign": return Target;
      case "social": return Users;
      case "ar_game": return Zap;
      default: return Bell;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 z-50">
          <Card className="shadow-lg border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notifications</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => {
                    const Icon = getIcon(notification.type);
                    return (
                      <div
                        key={notification.id}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                          !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className={`h-5 w-5 mt-0.5 ${
                            notification.priority === 'high' ? 'text-red-500' :
                            notification.priority === 'medium' ? 'text-orange-500' : 'text-blue-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {notification.timestamp}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-3 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    View All Notifications
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}