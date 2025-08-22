import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, Store, Users, TrendingUp, MapPin, Award, Heart, Gift, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { QuickTranslate } from "@/components/ui/translated-text";
import cirqlbackLogo from "@assets/cirqlback-logo-transparent.png";

export default function HomeBento() {
  const [, setLocation] = useLocation();
  const stats = {
    businesses: "2,500+",
    customers: "50K+",
    rewards: "1M+",
    cities: "25+"
  };

  const features = [
    {
      title: "Tap & Earn",
      description: "Simply tap Cirql tags to unlock instant rewards",
      gradient: "from-blue-500 to-cyan-500",
      visual: (
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl"></div>
          <div className="absolute inset-2 bg-white rounded-xl flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full"></div>
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>
      )
    },
    {
      title: "Smart Campaigns",
      description: "AI-powered marketing that drives real results",
      gradient: "from-purple-500 to-pink-500",
      visual: (
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl"></div>
          <div className="absolute inset-2 bg-white rounded-xl flex items-center justify-center">
            <div className="grid grid-cols-2 gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
              <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Local Discovery",
      description: "Explore hidden gems in your neighborhood",
      gradient: "from-green-500 to-emerald-500",
      visual: (
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-400 rounded-2xl"></div>
          <div className="absolute inset-2 bg-white rounded-xl flex items-center justify-center">
            <div className="relative">
              <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full"></div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 dark:from-gray-950 dark:via-purple-950/30 dark:to-blue-950/30">
      <div className="responsive-container max-w-7xl mx-auto py-4 sm:py-6 lg:py-8">
        
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
                ✨ <QuickTranslate text="The Addictive Local Discovery Platform" />
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-6 leading-tight">
              Cirqlback
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              <QuickTranslate text="Transform every business visit into an exciting adventure through gamified local discovery" /> - 
              <span className="font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> <QuickTranslate text="tap, collect, compete, and earn real rewards" />.</span>
            </p>
          </div>
        </div>

        {/* Main Navigation - Bento Style */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100"><QuickTranslate text="Choose Your Experience" /></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              className="bg-gradient-to-br from-blue-500 to-cyan-500 border-0 text-white cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              onClick={() => setLocation('/customer-bento')}
            >
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Search className="h-8 w-8 text-white" />
                  </div>
                  <ArrowRight className="h-6 w-6 text-white/70" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3"><QuickTranslate text="I'm a Customer" /></h3>
                  <p className="text-blue-100 text-lg leading-relaxed"><QuickTranslate text="Discover amazing local businesses, earn rewards, and compete with friends in your neighborhood." /></p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-gradient-to-br from-orange-500 to-pink-500 border-0 text-white cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              onClick={() => setLocation('/merchant-bento')}
            >
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Store className="h-8 w-8 text-white" />
                  </div>
                  <ArrowRight className="h-6 w-6 text-white/70" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3"><QuickTranslate text="I'm a Business" /></h3>
                  <p className="text-orange-100 text-lg leading-relaxed"><QuickTranslate text="Attract more customers, increase engagement, and grow your local presence with gamified marketing." /></p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feature Showcase Section */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100"><QuickTranslate text="How It Works" /></h2>
            <p className="text-xl text-gray-600 dark:text-gray-400"><QuickTranslate text="Three simple steps to start your local discovery adventure" /></p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                <div className="mb-6">{feature.visual}</div>
                <h4 className="font-bold text-xl mb-3 text-gray-900 dark:text-gray-100">{feature.title}</h4>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="bento-grid auto-rows-min mb-8 sm:mb-12">
          
          {/* Mobile Interface Mockup Card */}
          <Card className="bento-item-large bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <CardContent className="responsive-card flex items-center justify-center">
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
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-blue-500 rounded-full"></div>
                        </div>
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
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <div className="text-lg">☕</div>
                        </div>
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
            </CardContent>
          </Card>

          {/* Platform Stats - Tall Block */}
          <Card className="md:col-span-3 lg:col-span-3 md:row-span-2 bg-gradient-to-br from-green-500 to-emerald-600 border-0 text-white">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-green-200 rounded"></div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30">Growing Fast</Badge>
              </div>
              <h3 className="text-2xl font-bold mb-2">Platform Growth</h3>
              <p className="text-green-100 mb-6 flex-1">Real numbers from our growing community of businesses and customers</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-1">{stats.businesses}</div>
                  <div className="text-green-100 text-sm">Active Businesses</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-1">{stats.customers}</div>
                  <div className="text-green-100 text-sm">Happy Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-1">{stats.rewards}</div>
                  <div className="text-green-100 text-sm">Rewards Claimed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-1">{stats.cities}</div>
                  <div className="text-green-100 text-sm">Cities Covered</div>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Gamification Highlight - Medium Block */}
          <Card className="md:col-span-3 lg:col-span-3 bg-gradient-to-br from-orange-500 to-red-500 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-orange-200 rounded-full"></div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30">Addictive</Badge>
              </div>
              <h3 className="text-2xl font-bold mb-2">Gamified Rewards</h3>
              <p className="text-orange-100 mb-4">Collect points, unlock achievements, and compete with friends while discovering amazing local businesses.</p>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-sm text-orange-100">Daily challenges & quests</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-sm text-orange-100">Level progression system</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-sm text-orange-100">Exclusive member rewards</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Proof - Medium Block */}
          <Card className="md:col-span-3 lg:col-span-3 bg-gradient-to-br from-pink-500 to-purple-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-pink-200 rounded-full animate-pulse"></div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30">Community Love</Badge>
              </div>
              <h3 className="text-2xl font-bold mb-2">Join the Movement</h3>
              <p className="text-pink-100 mb-4">Thousands of businesses and customers are already part of the Cirqlback community.</p>
              <div className="space-y-3">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <div className="flex space-x-1 mr-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      ))}
                    </div>
                    <span className="text-sm font-semibold">Sarah M.</span>
                  </div>
                  <p className="text-pink-100 text-sm">"Love discovering new places and earning rewards!"</p>
                </div>
              </div>
            </CardContent>
          </Card>



        </div>

        {/* Quick Action Buttons */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Ready to Start?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Button 
              onClick={() => setLocation('/map')}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <MapPin className="h-5 w-5 mr-2" />
              Find Businesses
            </Button>
            <Button 
              onClick={() => setLocation('/customer')}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Gift className="h-5 w-5 mr-2" />
              My Rewards
            </Button>
            <Button 
              onClick={() => setLocation('/merchant')}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Store className="h-5 w-5 mr-2" />
              Business Portal
            </Button>
            <Button 
              onClick={() => setLocation('/nfc-setup-wizard')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Zap className="h-5 w-5 mr-2" />
              NFC Setup
            </Button>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="text-center">
          <div className="flex justify-center space-x-4 mb-4">
            <div
              onClick={() => setLocation('/about')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              About Cirqlback
            </div>
            <div
              onClick={() => setLocation('/how-it-works')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              How It Works
            </div>
            <div
              onClick={() => setLocation('/contact')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Get Started
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            © 2024 Cirqlback. Making local discovery addictively fun.
          </p>
        </div>
      </div>
    </div>
  );
}