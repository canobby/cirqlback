import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Gift, Trophy, Users, MapPin, Zap, X } from "lucide-react";

interface Notification {
  id: string;
  type: "reward" | "challenge" | "referral" | "trail" | "achievement";
  title: string;
  message: string;
  time: string;
  read: boolean;
  action?: {
    label: string;
    value: string;
  };
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "reward",
      title: "New Reward Available!",
      message: "Free coffee at Joe's Coffee Shop - expires in 24 hours",
      time: "5 minutes ago",
      read: false,
      action: { label: "Claim Now", value: "claim-coffee" }
    },
    {
      id: "2",
      type: "challenge",
      title: "Challenge Almost Complete!",
      message: "You're 2 taps away from completing Downtown Coffee Crawl",
      time: "1 hour ago",
      read: false,
      action: { label: "View Progress", value: "view-challenge" }
    },
    {
      id: "3",
      type: "referral",
      title: "Friend Joined!",
      message: "Sarah joined using your referral code. You earned $5!",
      time: "3 hours ago",
      read: false,
      action: { label: "Share More", value: "share-referral" }
    },
    {
      id: "4",
      type: "achievement",
      title: "Streak Milestone!",
      message: "Congratulations on your 10-day streak! Bonus rewards unlocked.",
      time: "1 day ago",
      read: true
    },
    {
      id: "5",
      type: "trail",
      title: "Tap Trail Bonus",
      message: "Complete the Foodie Trail today for a $20 bonus",
      time: "2 days ago",
      read: true,
      action: { label: "Start Trail", value: "start-foodie-trail" }
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reward": return <Gift className="h-4 w-4 text-green-600" />;
      case "challenge": return <Trophy className="h-4 w-4 text-yellow-600" />;
      case "referral": return <Users className="h-4 w-4 text-blue-600" />;
      case "trail": return <MapPin className="h-4 w-4 text-purple-600" />;
      case "achievement": return <Zap className="h-4 w-4 text-orange-600" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-hidden shadow-lg z-50 border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center space-x-2">
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsOpen(false)}
                  className="p-1"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications yet
                </div>
              ) : (
                <div className="space-y-0">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="p-1 h-auto"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {notification.time}
                            </span>
                            {notification.action && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-xs h-6 px-2"
                              >
                                {notification.action.label}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}