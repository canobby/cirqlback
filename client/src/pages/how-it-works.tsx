import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone, Store, Users, TrendingUp, Zap, Gift, Star, Target, BarChart3, Globe, Crown } from "lucide-react";
import { Link } from "wouter";

export default function HowItWorksPage() {
  return (
    <div className="bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold gradient-text mb-6">How Cirqlback Works</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Transform your business with Cirql tags - small, smart devices that create instant connections 
            between you and your customers. No apps to download, no codes to scan, just tap and reward.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/tap">
              <Button size="lg" className="gradient-bg">
                <Smartphone className="mr-2 h-5 w-5" />
                Try Live Demo
              </Button>
            </Link>
            <Link href="/merchant">
              <Button variant="outline" size="lg">
                <Store className="mr-2 h-5 w-5" />
                Merchant Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* What Are Cirql Tags Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">What Are Cirql Tags?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cirql tags are small, wireless devices that customers can tap with their phone to instantly 
              connect with your business and earn rewards.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
            <div>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Instant Connection</h3>
                    <p className="text-muted-foreground">
                      No apps to download or QR codes to scan. Customers simply tap their phone on the tag 
                      and instantly connect to your business.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                    <Gift className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Immediate Rewards</h3>
                    <p className="text-muted-foreground">
                      Customers earn points, discounts, or special offers the moment they tap. 
                      Build loyalty with every interaction.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Track Everything</h3>
                    <p className="text-muted-foreground">
                      See real-time analytics of customer visits, popular campaigns, 
                      and reward redemptions to optimize your marketing.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual representation of Cirql tag */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-80 h-80 bg-white rounded-full border-8 border-gray-200 shadow-2xl flex items-center justify-center relative overflow-hidden">
                  {/* Cirql tag design */}
                  <div className="w-60 h-60 gradient-bg rounded-full flex items-center justify-center relative">
                    <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center">
                      <div className="text-6xl font-bold gradient-text">C</div>
                    </div>
                    {/* Animated pulse rings */}
                    <div className="absolute inset-0 rounded-full border-4 border-white opacity-30 animate-ping"></div>
                    <div className="absolute inset-4 rounded-full border-2 border-white opacity-20 animate-ping" style={{animationDelay: '0.5s'}}></div>
                  </div>
                  
                  {/* Tap indicator */}
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                    <Smartphone className="h-8 w-8" />
                  </div>
                </div>
                
                {/* Helper text */}
                <div className="text-center mt-6">
                  <p className="text-lg font-semibold text-foreground">Cirql Tag</p>
                  <p className="text-sm text-muted-foreground">Tap with any smartphone</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step-by-Step Process */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">How It Works for Your Business</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Set up your Cirql-powered marketing system in minutes and start building customer loyalty immediately.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <Card className="card-hover text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <CardTitle>Setup Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Create reward campaigns like "10% off next purchase" or "Buy 5 get 1 free" in our easy dashboard.
                </p>
                <div className="w-full h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                  <Target className="h-12 w-12 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="card-hover text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <CardTitle>Place Cirql Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Put small Cirql tags at your counter, tables, or anywhere customers visit. We'll help you optimize placement.
                </p>
                <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
                  <Store className="h-12 w-12 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="card-hover text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <CardTitle>Customers Tap</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Customers tap their phone on the tag, enter their email, and instantly receive rewards and points.
                </p>
                <div className="w-full h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                  <Users className="h-12 w-12 text-green-600" />
                </div>
              </CardContent>
            </Card>

            {/* Step 4 */}
            <Card className="card-hover text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">4</span>
                </div>
                <CardTitle>Watch Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Track customer visits, popular campaigns, and revenue growth through our analytics dashboard.
                </p>
                <div className="w-full h-32 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-12 w-12 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Advanced Features */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Advanced Features for Growth</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Go beyond basic rewards with features designed to build community and drive viral growth.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Tap Trails */}
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Tap Trails</CardTitle>
                    <Badge variant="secondary">Community Feature</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Create multi-business challenges where customers visit partner locations to unlock bonus rewards. 
                  Build a network of local businesses working together.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Partner with nearby businesses</li>
                  <li>• Create "Coffee Shop → Bakery → Bookstore" trails</li>
                  <li>• Offer big rewards for completion</li>
                  <li>• Share customers with trusted partners</li>
                </ul>
              </CardContent>
            </Card>

            {/* Referral System */}
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Viral Referrals</CardTitle>
                    <Badge variant="secondary">Growth Engine</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Turn customers into advocates with our built-in referral system. 
                  Reward both referrer and referee to create viral growth loops.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• $5 bonus per successful referral</li>
                  <li>• 5% lifetime earnings from referees</li>
                  <li>• Automated tracking and payouts</li>
                  <li>• Social sharing tools included</li>
                </ul>
              </CardContent>
            </Card>

            {/* Premium Analytics */}
            <Card className="card-hover">
              <CardHeader>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Smart Analytics</CardTitle>
                    <Badge variant="secondary">AI-Powered</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Get AI-powered insights about customer behavior, optimal pricing, 
                  and campaign performance to maximize your ROI.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Real-time customer insights</li>
                  <li>• Predictive analytics</li>
                  <li>• Automated A/B testing</li>
                  <li>• Revenue optimization suggestions</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Business Benefits */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Why Businesses Choose Cirqlback</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of local businesses using Cirql technology to build stronger customer relationships and increase revenue.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Increase Repeat Visits</h3>
              <p className="text-muted-foreground">
                Customers return 3x more often with reward programs. Build lasting loyalty with every tap.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Build Community</h3>
              <p className="text-muted-foreground">
                Connect with other local businesses through Tap Trails and cross-promotional campaigns.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Stand Out</h3>
              <p className="text-muted-foreground">
                Be the first in your area to offer cutting-edge Cirql tap technology to customers.
              </p>
            </div>
          </div>
        </section>

        {/* Getting Started CTA */}
        <section className="text-center">
          <Card className="max-w-4xl mx-auto gradient-bg text-white">
            <CardContent className="p-12">
              <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
              <p className="text-xl opacity-90 mb-8">
                Start building customer loyalty with Cirql technology today. 
                Set up takes less than 10 minutes, and your first customers can start earning rewards immediately.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/merchant">
                  <Button size="lg" variant="secondary">
                    <Store className="mr-2 h-5 w-5" />
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="/tap">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                    <Smartphone className="mr-2 h-5 w-5" />
                    Try Demo
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}