import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, Users, Store, Globe, Smartphone, Target, 
  ArrowRight, PlayCircle, Star, TrendingUp, 
  Gift, Crown, Heart, Sparkles
} from "lucide-react";

export default function HomeBento() {
  const stats = {
    businesses: "2,500+",
    customers: "50K+",
    rewards: "1M+",
    cities: "25+"
  };

  const features = [
    {
      icon: Smartphone,
      title: "Tap & Earn",
      description: "Simply tap NFC tags to unlock instant rewards",
      gradient: "from-blue-500 to-cyan-500",
      pattern: "📱"
    },
    {
      icon: Target,
      title: "Smart Campaigns",
      description: "AI-powered marketing that drives real results",
      gradient: "from-purple-500 to-pink-500",
      pattern: "🎯"
    },
    {
      icon: Globe,
      title: "Local Discovery",
      description: "Explore hidden gems in your neighborhood",
      gradient: "from-green-500 to-emerald-500",
      pattern: "🌍"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 dark:from-gray-950 dark:via-purple-950/30 dark:to-blue-950/30">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        
        {/* Hero Section */}
        <div className="relative text-center mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-orange-950/20 rounded-3xl"></div>
          <div className="absolute top-4 left-8 w-20 h-20 bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-800 dark:to-pink-800 rounded-full opacity-60"></div>
          <div className="absolute top-16 right-12 w-16 h-16 bg-gradient-to-br from-orange-200 to-yellow-200 dark:from-orange-800 dark:to-yellow-800 rounded-full opacity-40"></div>
          <div className="absolute bottom-8 left-16 w-12 h-12 bg-gradient-to-br from-blue-200 to-cyan-200 dark:from-blue-800 dark:to-cyan-800 rounded-full opacity-50"></div>
          <div className="absolute bottom-4 right-8 w-14 h-14 bg-gradient-to-br from-green-200 to-emerald-200 dark:from-green-800 dark:to-emerald-800 rounded-full opacity-45"></div>
          
          <div className="relative z-10 py-16 px-8">
            <div className="mb-8">
              <span className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
                ✨ The Addictive Local Discovery Platform
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-6 leading-tight">
              Cirqlback
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              Turn every business visit into an adventure. Like Pokemon Go for local businesses - 
              <span className="font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> tap, collect, compete, and earn real rewards.</span>
            </p>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-6 auto-rows-min mb-12">
          
          {/* Main CTA - Large Hero Block */}
          <Card className="md:col-span-6 lg:col-span-5 bg-gradient-to-br from-purple-600 to-pink-600 border-0 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-4">Start Your Adventure</h2>
                  <p className="text-purple-100 text-lg mb-6">Join thousands discovering local businesses through gamified rewards</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      onClick={() => window.location.href = '/customer'}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-auto p-4 justify-start"
                      variant="outline"
                    >
                      <div className="flex items-center w-full">
                        <div className="bg-white/20 p-2 rounded-lg mr-3">
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">I'm a Customer</div>
                          <div className="text-sm text-purple-100">Discover & earn rewards</div>
                        </div>
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </div>
                    </Button>
                    
                    <Button 
                      onClick={() => window.location.href = '/merchant'}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm h-auto p-4 justify-start"
                      variant="outline"
                    >
                      <div className="flex items-center w-full">
                        <div className="bg-white/20 p-2 rounded-lg mr-3">
                          <Store className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">I'm a Business</div>
                          <div className="text-sm text-purple-100">Attract more customers</div>
                        </div>
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </div>
                    </Button>
                  </div>
                </div>
                {/* Mobile Interface Mockup */}
                <div className="hidden lg:block">
                  <div className="w-64 h-[480px] bg-white rounded-[2rem] border-4 border-gray-200 shadow-2xl overflow-hidden relative">
                    <div className="h-full bg-gradient-to-b from-gray-50 to-white">
                      {/* Status Bar */}
                      <div className="flex justify-between items-center px-4 pt-3 pb-2 text-xs text-gray-800">
                        <span>9:41</span>
                        <div className="flex space-x-1">
                          <div className="w-3 h-1.5 bg-gray-400 rounded-full"></div>
                          <div className="w-4 h-1.5 bg-gray-400 rounded-full"></div>
                          <div className="w-4 h-1.5 bg-green-500 rounded-full"></div>
                        </div>
                      </div>

                      {/* App Content */}
                      <div className="px-4 py-3">
                        <div className="text-center mb-4">
                          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                            <Gift className="text-white h-8 w-8" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-800 mb-1">Reward Unlocked!</h3>
                          <p className="text-gray-600 text-sm">Joe's Coffee Shop</p>
                        </div>

                        {/* Reward Card */}
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-base font-semibold">Free Coffee</h4>
                              <p className="text-purple-100 text-sm">Today Only</p>
                            </div>
                            <div className="text-2xl">☕</div>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="bg-white/20 px-2 py-1 rounded text-xs mr-2">+150 pts</span>
                            <span className="text-purple-100">Expires in 2 hours</span>
                          </div>
                        </div>

                        {/* Points Display */}
                        <div className="flex justify-between items-center bg-gray-100 rounded-lg p-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-800">2,847</div>
                            <div className="text-xs text-gray-600">Total Points</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-800">Level 12</div>
                            <div className="text-xs text-gray-600">Explorer</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Stats - Tall Block */}
          <Card className="md:col-span-3 lg:col-span-3 md:row-span-2 bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="h-8 w-8 text-green-100" />
                <Badge className="bg-white/20 text-white border-white/30">Growing Fast</Badge>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-green-100 mb-6">Platform Impact</h3>
                
                <div className="space-y-6">
                  <div>
                    <div className="text-3xl font-bold mb-1">{stats.businesses}</div>
                    <div className="text-green-100 text-sm">Active Businesses</div>
                  </div>
                  
                  <div>
                    <div className="text-3xl font-bold mb-1">{stats.customers}</div>
                    <div className="text-green-100 text-sm">Happy Customers</div>
                  </div>
                  
                  <div>
                    <div className="text-3xl font-bold mb-1">{stats.rewards}</div>
                    <div className="text-green-100 text-sm">Rewards Claimed</div>
                  </div>
                  
                  <div>
                    <div className="text-3xl font-bold mb-1">{stats.cities}</div>
                    <div className="text-green-100 text-sm">Cities & Growing</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Blocks */}
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card key={idx} className={`md:col-span-2 lg:col-span-${idx === 1 ? '3' : '2'} bg-gradient-to-br ${feature.gradient} border-0 text-white overflow-hidden relative`}>
                <div className="absolute top-2 right-2 text-4xl opacity-20">
                  {feature.pattern}
                </div>
                <CardContent className="p-6 relative z-10">
                  <Icon className="h-8 w-8 mb-4 text-white" />
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-white/90 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}



          {/* Success Stories */}
          <Card className="md:col-span-3 lg:col-span-4 bg-gradient-to-br from-orange-500 to-red-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Success Stories</h3>
                <Crown className="h-6 w-6 text-orange-100" />
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-300 fill-current" />
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-orange-100">Joe's Coffee</span>
                  </div>
                  <p className="text-sm text-orange-100">"Customer visits increased 40% in just 2 months!"</p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-300 fill-current" />
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-orange-100">Tech Store Plus</span>
                  </div>
                  <p className="text-sm text-orange-100">"Best marketing tool we've ever used. ROI is incredible."</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card 
            className="md:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors cursor-pointer"
            onClick={() => window.location.href = '/trial-discount'}
          >
            <CardContent className="p-6 text-center">
              <Gift className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Pricing</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Simple & transparent</p>
            </CardContent>
          </Card>

          <Card 
            className="md:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
            onClick={() => window.location.href = '/help-center'}
          >
            <CardContent className="p-6 text-center">
              <Heart className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Support</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs">We're here to help</p>
            </CardContent>
          </Card>

          <Card 
            className="md:col-span-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors cursor-pointer"
            onClick={() => window.location.href = '/platform'}
          >
            <CardContent className="p-6 text-center">
              <Zap className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">API</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Developer resources</p>
            </CardContent>
          </Card>

        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 border-0 text-white">
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
              <p className="text-indigo-100 text-lg mb-6">
                Join the revolution in local discovery. Start creating addictive customer experiences today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  className="bg-white text-black hover:bg-gray-50 hover:text-black font-bold shadow-lg"
                  onClick={() => window.location.href = '/merchant'}
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 ml-2 text-black" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-gray-900 font-semibold transition-all"
                  onClick={() => window.location.href = '/how-it-works'}
                >
                  Learn More
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}