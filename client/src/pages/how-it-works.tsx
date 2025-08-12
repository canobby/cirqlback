import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  Smartphone, 
  Zap, 
  Gift, 
  TrendingUp, 
  Users, 
  Crown, 
  Target,
  MapPin,
  Star,
  ChevronRight,
  Sparkles,
  DollarSign
} from "lucide-react";
import cirqlLogoPath from "@assets/cirqlback-logo-transparent.png";

export default function HowItWorksPage() {
  const [, setLocation] = useLocation();

  const steps = [
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Discover AI-Enhanced Business Network",
      description: "Find businesses with predictive analytics, cross-partnerships, AR adventures, and complete digital presence",
      details: "Each business offers AI-powered customer intelligence, partnership rewards, city-wide AR treasure hunts, team challenges, and comprehensive websites"
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Tap for AI-Powered Experiences",
      description: "One tap unlocks predictive rewards, cross-business benefits, AR treasure hunts, team challenges, and viral campaigns",
      details: "Instantly access AI-enhanced rewards, partnership networks, immersive AR adventures, exponential referral multipliers, and comprehensive business platforms"
    },
    {
      icon: <Gift className="h-8 w-8" />,
      title: "Advanced Team & Viral Growth",
      description: "Form teams, compete in city-wide AR adventures, earn exponential referral rewards, and drive community engagement",
      details: "Every tap contributes to team challenges, unlocks AR treasure hunt clues, multiplies viral referral rewards, and builds cross-business partnerships"
    },
    {
      icon: <Crown className="h-8 w-8" />,
      title: "Build Your Legacy",
      description: "Advance through loyalty tiers while building your AR avatar and team ranking",
      details: "Unlock exclusive business content, AR abilities, team leadership roles, and platform-wide recognition"
    }
  ];

  const businessBenefits = [
    {
      icon: <TrendingUp className="h-6 w-6 text-green-500" />,
      title: "AI-Powered Business Intelligence",
      description: "Get predictive customer analytics, cross-business partnerships, AR treasure hunts, viral campaigns, complete websites, and automated growth optimization"
    },
    {
      icon: <Users className="h-6 w-6 text-blue-500" />,
      title: "Comprehensive Ecosystem Integration",
      description: "Connect AI-powered analytics, cross-business rewards, AR adventures, team competitions, viral growth mechanics, and complete digital presence seamlessly"
    },
    {
      icon: <Target className="h-6 w-6 text-purple-500" />,
      title: "Predictive Business Intelligence",
      description: "Monitor customer health scoring, churn prediction, partnership revenue, AR engagement, team challenges, viral campaign performance, and cross-platform analytics"
    },
    {
      icon: <Sparkles className="h-6 w-6 text-orange-500" />,
      title: "Complete Tesla-Level Integration",
      description: "Most comprehensive local business platform available: AI analytics, cross-business networks, AR treasure hunts, team challenges, viral campaigns, complete websites, and predictive optimization - no competitor can replicate this ecosystem"
    }
  ];

  const tierBenefits = [
    {
      tier: "Bronze",
      color: "from-amber-600 to-amber-700",
      points: "0-999 points",
      benefits: ["Standard rewards", "Basic point multiplier", "Monthly challenges"]
    },
    {
      tier: "Silver", 
      color: "from-gray-400 to-gray-600",
      points: "1,000-4,999 points",
      benefits: ["Enhanced rewards", "1.5x point multiplier", "Exclusive offers", "Priority support"]
    },
    {
      tier: "Gold",
      color: "from-yellow-400 to-yellow-600", 
      points: "5,000-14,999 points",
      benefits: ["Premium rewards", "2x point multiplier", "VIP events", "Early access", "Free delivery"]
    },
    {
      tier: "Platinum",
      color: "from-purple-500 to-indigo-600",
      points: "15,000+ points", 
      benefits: ["Maximum rewards", "3x point multiplier", "Concierge service", "Exclusive partnerships", "Custom experiences"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <img src={cirqlLogoPath} alt="Cirqlback" className="h-16 mx-auto mb-6" />
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            How Cirqlback Works
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
            Discover how our innovative Cirql tag technology transforms local shopping into 
            rewarding experiences for customers and powerful growth tools for businesses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-purple-600 hover:bg-gray-100"
              onClick={() => setLocation("/tap")}
            >
              Try a Cirql Tap
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10"
              onClick={() => setLocation("/merchant")}
            >
              For Businesses
            </Button>
          </div>
        </div>
      </div>

      {/* How It Works Steps */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple as 1-2-3-4
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the complete Cirqlback platform: instant rewards, AR gaming, team challenges, 
              business websites, and community features - all connected through simple Cirql taps.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <Card key={index} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 opacity-10 rounded-bl-full"></div>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white">
                      {step.icon}
                    </div>
                    <Badge variant="outline" className="text-lg font-bold px-3 py-1">
                      {index + 1}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-3">{step.description}</p>
                  <p className="text-sm text-gray-500">{step.details}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tier System */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Rewards System
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Advance through loyalty tiers while building your AR avatar, joining team battles, 
              and unlocking exclusive business content across the entire platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tierBenefits.map((tier, index) => (
              <Card key={tier.tier} className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-300">
                <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${tier.color}`}></div>
                <CardHeader className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-xl">{tier.tier}</CardTitle>
                    <Crown className={`h-6 w-6 ${index === 3 ? 'text-purple-500' : index === 2 ? 'text-yellow-500' : index === 1 ? 'text-gray-500' : 'text-amber-600'}`} />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">{tier.points}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tier.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center text-sm">
                        <Star className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Business Benefits */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Businesses Love Cirqlback
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform doesn't just reward customers - it drives real business growth 
              with measurable results.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {businessBenefits.map((benefit, index) => (
              <Card key={index} className="p-6 border-0 shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {benefit.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              onClick={() => setLocation("/merchant")}
            >
              Start Growing Your Business
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Referral Program */}
      <section className="py-20 px-4 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <DollarSign className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Earn $5 for Every Friend
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Share Cirqlback with friends and both of you earn $5 when they make their first tap.
              Plus, earn 5% of their lifetime activity!
            </p>
          </div>

          <Card className="p-8 border-2 border-green-200 bg-white">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Share Your Code</h3>
                <p className="text-gray-600 text-sm">Send your unique referral code to friends</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">They Tap & Earn</h3>
                <p className="text-gray-600 text-sm">Your friend makes their first Cirql tap</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Both Get $5</h3>
                <p className="text-gray-600 text-sm">Instant $5 bonus plus ongoing earnings</p>
              </div>
            </div>
          </Card>

          <div className="mt-8">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              onClick={() => setLocation("/community")}
            >
              Get Your Referral Code
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of customers already earning rewards and businesses growing 
            their communities with Cirqlback.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-purple-600 hover:bg-gray-100"
              onClick={() => setLocation("/customer")}
            >
              Find Rewards Near You
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10"
              onClick={() => setLocation("/merchant")}
            >
              Grow Your Business
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}