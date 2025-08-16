import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Eye, Clock,
  MapPin, Calendar, Target, Zap, BarChart3, PieChart,
  ArrowRight, Download, Filter, RefreshCw
} from "lucide-react";

export default function AnalyticsBento() {
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState("week");
  
  const metrics = {
    revenue: { value: 15420, change: 18.5, trend: "up" },
    taps: { value: 1247, change: 23.4, trend: "up" },
    customers: { value: 342, change: 12.8, trend: "up" },
    conversion: { value: 23.4, change: -2.1, trend: "down" },
    avgOrder: { value: 28.50, change: 8.7, trend: "up" },
    engagement: { value: 4.2, change: 15.3, trend: "up" }
  };

  const topLocations = [
    { name: "Front Counter", taps: 456, percentage: 36.5 },
    { name: "Window Display", taps: 298, percentage: 23.9 },
    { name: "Back Tables", taps: 201, percentage: 16.1 },
    { name: "Entrance", taps: 292, percentage: 23.4 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/30">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Analytics Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Real-time business intelligence and performance insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mb-8">
          <div className="flex gap-2">
            {["day", "week", "month", "quarter"].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={timeRange === range ? "bg-purple-600 text-white" : "text-gray-700 border-gray-300 hover:bg-gray-100"}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-6 auto-rows-min">
          
          {/* Revenue - Large Hero Block */}
          <Card className="md:col-span-6 lg:col-span-4 bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Revenue Performance</h2>
                  <p className="text-green-100">This {timeRange}'s earnings breakdown</p>
                </div>
                <DollarSign className="h-12 w-12 text-green-100" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold mb-1">${metrics.revenue.value.toLocaleString()}</div>
                  <div className="text-green-100 text-sm mb-2">Total Revenue</div>
                  <Badge className="bg-white/20 text-white border-white/30">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{metrics.revenue.change}%
                  </Badge>
                </div>
                
                <div>
                  <div className="text-3xl font-bold mb-1">${metrics.avgOrder.value}</div>
                  <div className="text-green-100 text-sm mb-2">Avg Order Value</div>
                  <Badge className="bg-white/20 text-white border-white/30">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{metrics.avgOrder.change}%
                  </Badge>
                </div>
                
                <div>
                  <div className="text-3xl font-bold mb-1">$4,280</div>
                  <div className="text-green-100 text-sm mb-2">Cirql Impact</div>
                  <Badge className="bg-white/20 text-white border-white/30">
                    28% of total
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Metrics - Tall Block */}
          <Card className="md:col-span-3 lg:col-span-2 md:row-span-2 bg-gradient-to-br from-blue-500 to-cyan-600 border-0 text-white">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-8 w-8 text-blue-100" />
                <Badge className="bg-white/20 text-white border-white/30">Live</Badge>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-blue-100 mb-4">Customer Analytics</h3>
                
                <div className="space-y-6">
                  <div>
                    <div className="text-3xl font-bold mb-1">{metrics.customers.value}</div>
                    <div className="text-blue-100 text-sm mb-2">Active Customers</div>
                    <Badge className="bg-white/20 text-white border-white/30">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +{metrics.customers.change}%
                    </Badge>
                  </div>
                  
                  <div>
                    <div className="text-2xl font-bold mb-1">{metrics.engagement.value}/5</div>
                    <div className="text-blue-100 text-sm mb-2">Engagement Score</div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white h-2 rounded-full" style={{ width: `${(metrics.engagement.value / 5) * 100}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-lg font-bold mb-1">156</div>
                    <div className="text-blue-100 text-sm">New This Week</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card className="md:col-span-3 lg:col-span-2 bg-gradient-to-br from-purple-500 to-pink-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Target className="h-6 w-6 text-purple-100" />
                <Badge className={`${metrics.conversion.trend === 'up' ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'} border-white/30`}>
                  {metrics.conversion.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {Math.abs(metrics.conversion.change)}%
                </Badge>
              </div>
              <div className="text-3xl font-bold mb-1">{metrics.conversion.value}%</div>
              <p className="text-purple-100 text-sm">Conversion Rate</p>
            </CardContent>
          </Card>

          {/* NFC Taps */}
          <Card className="md:col-span-2 bg-gradient-to-br from-orange-500 to-red-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Zap className="h-6 w-6 text-orange-100" />
                <Badge className="bg-white/20 text-white border-white/30">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{metrics.taps.change}%
                </Badge>
              </div>
              <div className="text-3xl font-bold mb-1">{metrics.taps.value}</div>
              <p className="text-orange-100 text-sm">Total Taps</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-gradient-to-br from-yellow-500 to-orange-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Clock className="h-6 w-6 text-yellow-100" />
                <Badge className="bg-white/20 text-white border-white/30">Peak</Badge>
              </div>
              <div className="text-3xl font-bold mb-1">2-4 PM</div>
              <p className="text-yellow-100 text-sm">Peak Hours</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-gradient-to-br from-pink-500 to-purple-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Eye className="h-6 w-6 text-pink-100" />
                <Badge className="bg-white/20 text-white border-white/30">Today</Badge>
              </div>
              <div className="text-3xl font-bold mb-1">89</div>
              <p className="text-pink-100 text-sm">Page Views</p>
            </CardContent>
          </Card>

          {/* Top Performing Locations */}
          <Card className="md:col-span-6 lg:col-span-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                Top Performing Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topLocations.map((location, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">#{idx + 1}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{location.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{location.taps} taps</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">{location.percentage}%</div>
                      <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div 
                          className="h-2 bg-purple-500 rounded-full" 
                          style={{ width: `${location.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Real-time Activity */}
          <Card className="md:col-span-3 lg:col-span-4 bg-gradient-to-br from-indigo-500 to-purple-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Real-time Activity</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-indigo-100">Live</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-sm">New customer tap at Front Counter</span>
                  </div>
                  <span className="text-xs text-indigo-100">Just now</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                    <span className="text-sm">Reward redeemed - Free coffee</span>
                  </div>
                  <span className="text-xs text-indigo-100">2 min ago</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    <span className="text-sm">Campaign viewed 15 times</span>
                  </div>
                  <span className="text-xs text-indigo-100">5 min ago</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4 bg-white/20 hover:bg-white/30 text-white border-white/30" 
                variant="outline"
                onClick={() => setLocation('/analytics')}
              >
                View Full Activity Log
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}