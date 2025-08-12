import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MapPin, Zap, TrendingUp, Eye, Clock, Star, Trophy } from "lucide-react";

export default function LiveDashboard() {
  const [liveUsers, setLiveUsers] = useState(247);
  const [activeTaps, setActiveTaps] = useState(12);
  const [realtimeEvents, setRealtimeEvents] = useState([
    { id: 1, user: "Sarah M.", action: "earned Gold status", location: "Bean There Coffee", time: "2s ago", points: 500 },
    { id: 2, user: "Mike T.", action: "completed Tap Trail", location: "Downtown Loop", time: "5s ago", points: 200 },
    { id: 3, user: "Lisa K.", action: "referred friend", location: "Pizza Palace", time: "8s ago", points: 50 },
    { id: 4, user: "Alex R.", action: "claimed mystery reward", location: "Book Nook", time: "12s ago", points: 100 },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveUsers(prev => prev + Math.floor(Math.random() * 3) - 1);
      setActiveTaps(prev => Math.max(0, prev + Math.floor(Math.random() * 5) - 2));
      
      // Add new events occasionally
      if (Math.random() > 0.7) {
        const newEvent = {
          id: Date.now(),
          user: ["Emma S.", "David L.", "Taylor M.", "Jordan P."][Math.floor(Math.random() * 4)],
          action: ["earned points", "completed challenge", "shared reward", "invited friend"][Math.floor(Math.random() * 4)],
          location: ["Cafe Central", "Burger Hub", "Tech Store", "Yoga Studio"][Math.floor(Math.random() * 4)],
          time: "just now",
          points: Math.floor(Math.random() * 300) + 50
        };
        setRealtimeEvents(prev => [newEvent, ...prev.slice(0, 9)]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const hotspots = [
    { name: "Downtown District", users: 89, avgTime: "12m", conversion: "34%" },
    { name: "University Area", users: 67, avgTime: "8m", conversion: "28%" },
    { name: "Shopping Mall", users: 45, avgTime: "15m", conversion: "41%" },
    { name: "Business Quarter", users: 32, avgTime: "6m", conversion: "52%" }
  ];

  return (
    <div className="space-y-6">
      <Card className="card-hover glow-effect">
        <CardHeader>
          <CardTitle className="flex items-center gradient-text">
            <Eye className="mr-2 h-6 w-6" />
            Live Activity Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg relative">
              <div className="absolute top-2 right-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-2xl font-bold text-green-600">{liveUsers}</div>
              <div className="text-sm text-green-700">Active Users</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg relative">
              <div className="absolute top-2 right-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-2xl font-bold text-blue-600">{activeTaps}</div>
              <div className="text-sm text-blue-700">Taps This Minute</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">$1,247</div>
              <div className="text-sm text-purple-700">Revenue Today</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">156</div>
              <div className="text-sm text-orange-700">New Signups</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="gradient-text">Live Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {realtimeEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{event.user.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        <span className="font-semibold">{event.user}</span> {event.action}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {event.location} • {event.time}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    +{event.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="gradient-text">Live Hotspots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hotspots.map((hotspot, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{hotspot.name}</h4>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">{hotspot.users}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-3 w-3 mr-1" />
                      Avg Time: {hotspot.avgTime}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Conversion: {hotspot.conversion}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="gradient-bg h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${parseInt(hotspot.conversion)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="gradient-text">Live Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 flex items-center">
                <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                Top Earners Today
              </h4>
              {[
                { name: "Emma Rodriguez", points: 1240, streak: 15 },
                { name: "James Chen", points: 1180, streak: 12 },
                { name: "Maya Patel", points: 1050, streak: 8 }
              ].map((user, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-yellow-600">#{index + 1}</span>
                    <span className="text-sm font-medium">{user.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-yellow-600">{user.points} pts</div>
                    <div className="text-xs text-yellow-500">{user.streak} day streak</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 flex items-center">
                <Star className="h-4 w-4 mr-2 text-purple-500" />
                Most Active Businesses
              </h4>
              {[
                { name: "Bean There Coffee", taps: 89, revenue: "$456" },
                { name: "Pizza Palace", taps: 67, revenue: "$389" },
                { name: "Tech Repair Shop", taps: 45, revenue: "$234" }
              ].map((business, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-purple-600">#{index + 1}</span>
                    <span className="text-sm font-medium">{business.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-purple-600">{business.taps} taps</div>
                    <div className="text-xs text-purple-500">{business.revenue} today</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 flex items-center">
                <Zap className="h-4 w-4 mr-2 text-blue-500" />
                Viral Campaigns
              </h4>
              {[
                { name: "Coffee Challenge", shares: 234, reach: "12.4K" },
                { name: "Mystery Monday", shares: 189, reach: "8.9K" },
                { name: "Friend Friday", shares: 156, reach: "6.7K" }
              ].map((campaign, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-blue-600">#{index + 1}</span>
                    <span className="text-sm font-medium">{campaign.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-600">{campaign.shares} shares</div>
                    <div className="text-xs text-blue-500">{campaign.reach} reach</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}