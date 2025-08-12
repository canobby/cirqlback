import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Bell, Gift, TrendingUp, Users, AlertCircle, CheckCircle, X } from "lucide-react";

interface Notification {
  id: string;
  type: 'reward' | 'analytics' | 'campaign' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "reward",
      title: "New Reward Earned",
      message: "You've earned 100 points from Joe's Coffee Shop!",
      timestamp: "2 minutes ago",
      read: false
    },
    {
      id: "2",
      type: "analytics",
      title: "Weekly Report Ready",
      message: "Your business analytics report for this week is now available",
      timestamp: "1 hour ago",
      read: false,
      actionUrl: "/analytics"
    },
    {
      id: "3",
      type: "campaign",
      title: "Campaign Performance Update",
      message: "Your Weekend Special campaign has reached 85% of its target",
      timestamp: "3 hours ago",
      read: true,
      actionUrl: "/merchant"
    },
    {
      id: "4",
      type: "system",
      title: "System Maintenance",
      message: "Scheduled maintenance completed successfully",
      timestamp: "1 day ago",
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reward': return Gift;
      case 'analytics': return TrendingUp;
      case 'campaign': return Users;
      case 'system': return AlertCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'reward': return 'text-green-500';
      case 'analytics': return 'text-blue-500';
      case 'campaign': return 'text-purple-500';
      case 'system': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification, index) => {
                  const Icon = getNotificationIcon(notification.type);
                  const iconColor = getNotificationColor(notification.type);
                  
                  return (
                    <div key={notification.id}>
                      <div 
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 mt-1 ${iconColor}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.timestamp}
                            </p>
                          </div>
                          {notification.read && (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </div>
            )}
            
            {notifications.length > 0 && (
              <>
                <Separator />
                <div className="p-3">
                  <Button variant="outline" className="w-full text-sm">
                    View All Notifications
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}