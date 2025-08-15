import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Users, MapPin, Share2, Star, Target, Zap } from "lucide-react";
import EnhancedRewards from "@/components/customer/enhanced-rewards";
import LoyaltyIntegration from "@/components/customer/loyalty-integration";
import { GuidedTour } from "@/components/interactive/guided-tour";

export default function Customer() {
  const [customerEmail, setCustomerEmail] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);

  const handleSearch = () => {
    if (customerEmail) {
      setShowDashboard(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Advanced Community & Rewards Hub
            </h1>
            <Button 
              onClick={() => window.location.href = '/customer-bento'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              Try Bento Layout
            </Button>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join team challenges, earn exponential viral rewards, discover AI-powered cross-business partnerships with reward cost-sharing, and unlock personalized experiences across multiple merchant locations!
          </p>
        </div>

        {/* Email Input */}
        {!showDashboard && (
          <Card className="mb-8 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="customer-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your email to access your rewards dashboard
                  </label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="your@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleSearch}
                    disabled={!customerEmail}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 min-w-[120px]"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Access Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showDashboard && (
          <Tabs defaultValue="rewards" className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <TabsList className="grid w-full grid-cols-4 lg:max-w-md">
                <TabsTrigger value="rewards" className="text-xs lg:text-sm">Rewards</TabsTrigger>
                <TabsTrigger value="progress" className="text-xs lg:text-sm">Progress</TabsTrigger>
                <TabsTrigger value="community" className="text-xs lg:text-sm">Community</TabsTrigger>
                <TabsTrigger value="referrals" className="text-xs lg:text-sm">Referrals</TabsTrigger>
              </TabsList>
              <Button variant="outline" onClick={() => setShowDashboard(false)} className="lg:ml-4 whitespace-nowrap">
                Change Email
              </Button>
            </div>

            <TabsContent value="rewards" className="space-y-6">
              <div data-tour="enhanced-rewards">
                <LoyaltyIntegration />
              </div>
              <div data-tour="loyalty-integration">
                <EnhancedRewards />
              </div>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6" data-tour="team-challenges">
              <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold">Tap Trail Progress</h3>
                      <p className="text-orange-100">Multi-business challenges</p>
                    </div>
                    <Target className="h-8 w-8 text-orange-200" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Downtown Discovery</span>
                        <span className="text-sm">2/5 complete</span>
                      </div>
                      <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                        <div className="bg-white h-2 rounded-full" style={{ width: "40%" }}></div>
                      </div>
                      <p className="text-sm text-orange-100 mt-1">$20 bonus when complete</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="community" className="space-y-6">
              <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold">Community Hub</h3>
                      <p className="text-green-100">Connect with local shoppers</p>
                    </div>
                    <Users className="h-8 w-8 text-green-200" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Holiday Helper Challenge</h4>
                      <p className="text-sm text-green-100 mb-2">Help support local businesses during the holidays</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs">234/500 participants</span>
                        <Button size="sm" variant="outline" className="border-white text-white hover:bg-white hover:text-green-600">
                          Join Challenge
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card data-tour="ar-experiences">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-purple-600" />
                    AR Gaming Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="text-2xl">🎮</div>
                    <p className="text-gray-600">Access your rewards profile and team challenges</p>
                    <Button 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      onClick={() => window.location.href = '/customer-bento'}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Launch Rewards Hub
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referrals" className="space-y-6">
              <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold">Referral Program</h3>
                      <p className="text-purple-100">Earn $5 per friend + 5% lifetime</p>
                    </div>
                    <Share2 className="h-8 w-8 text-purple-200" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Your Referral Stats</h4>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold">12</div>
                          <div className="text-sm text-purple-100">Friends Referred</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">$340</div>
                          <div className="text-sm text-purple-100">Total Earned</div>
                        </div>
                      </div>
                      <Button className="w-full mt-4 bg-white text-purple-600 hover:bg-gray-100">
                        Share Your Link
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Default Feature Cards for non-logged in users */}
        {!showDashboard && (
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Smart Rewards</h3>
              <p className="text-gray-600">AI-powered personalized offers based on your preferences and shopping habits</p>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Tap Trails</h3>
              <p className="text-gray-600">Complete multi-business challenges to unlock bonus rewards and exclusive deals</p>
            </Card>

            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Community</h3>
              <p className="text-gray-600">Connect with local shoppers, join challenges, and support your community</p>
            </Card>
          </div>
        )}
      </div>

      {/* Customer Guided Tour */}
      <GuidedTour
        tourId="customer-tour"
        autoStart={false}
        steps={[
          {
            id: "email-input",
            target: "#customer-email",
            title: "Access Your Rewards",
            description: "Enter your email to view your personalized reward dashboard",
            tip: "Your rewards and progress are automatically saved across all participating businesses",
            position: "bottom"
          },
          {
            id: "enhanced-rewards",
            target: "[data-tour='enhanced-rewards']",
            title: "Smart Reward System",
            description: "AI-powered rewards that adapt to your preferences and shopping habits",
            tip: "The more you engage, the better your personalized offers become",
            position: "top"
          },
          {
            id: "team-challenges",
            target: "[data-tour='team-challenges']",
            title: "Community Challenges",
            description: "Join teams and complete multi-business challenges for bonus rewards",
            tip: "Team up with friends to multiply your reward earnings",
            position: "top"
          },
          {
            id: "ar-experiences",
            target: "[data-tour='ar-experiences']",
            title: "AR Discovery",
            description: "Unlock augmented reality treasure hunts and interactive experiences",
            tip: "Use your phone's camera to discover hidden rewards in participating locations",
            position: "top"
          },
          {
            id: "loyalty-integration",
            target: "[data-tour='loyalty-integration']",
            title: "Cross-Business Loyalty",
            description: "Your loyalty points work across all partner businesses in the network",
            tip: "Earn points at one business and redeem them at another",
            position: "top"
          }
        ]}
      />
    </div>
  );
}