import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Store, Smartphone, BarChart3, Users, Coffee, BookOpen, UtensilsCrossed, CheckCircle, Wifi, Share2, MapPin } from "lucide-react";
import cirqlbackLogo from "@assets/cirqlback-logo-new.png";

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="gradient-bg rounded-2xl p-8 mb-8 text-white">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center mb-6">
              <img 
                src={cirqlbackLogo} 
                alt="Cirqlback" 
                className="h-16 w-auto mr-4"
              />
              <div className="text-3xl font-bold">Cirqlback</div>
            </div>
            <h1 className="text-4xl font-bold mb-4">NFC-Powered Local Marketing</h1>
            <p className="text-xl opacity-90 mb-6">
              Connect customers with local businesses through seamless tap-to-reward experiences
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/customer">
                <Button variant="secondary" size="lg">
                  <Smartphone className="mr-2 h-5 w-5" />
                  Try Customer Experience
                </Button>
              </Link>
              <Link href="/merchant">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">
                  <Store className="mr-2 h-5 w-5" />
                  Merchant Dashboard
                </Button>
              </Link>
            </div>
          </div>
          <div className="text-center">
            <img 
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400" 
              alt="NFC payment technology in modern retail environment" 
              className="rounded-xl shadow-lg w-full h-auto"
            />
          </div>
        </div>
      </div>

      {/* Customer Experience Section */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold gradient-text mb-4">Customer Experience</h2>
          <p className="text-xl text-muted-foreground">Simple tap-to-reward system that keeps customers coming back</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">1</div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Tap NFC Tag</h3>
                  <p className="text-muted-foreground">Customer taps the Cirqlback NFC tag at participating businesses</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white font-bold">2</div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Instant Rewards</h3>
                  <p className="text-muted-foreground">Receive loyalty points, discounts, or special offers immediately</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white font-bold">3</div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Build Tap Trails</h3>
                  <p className="text-muted-foreground">Visit multiple partner businesses to unlock bonus rewards</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Interface Mockup */}
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative">
              <div className="w-80 h-[600px] bg-white rounded-[2.5rem] border-8 border-gray-300 shadow-2xl overflow-hidden">
                <div className="h-full bg-gradient-to-b from-gray-50 to-white">
                  {/* Status Bar */}
                  <div className="flex justify-between items-center px-6 pt-4 pb-2 text-sm text-foreground">
                    <span>9:41</span>
                    <div className="flex space-x-1">
                      <div className="w-4 h-2 bg-muted rounded-full"></div>
                      <div className="w-6 h-2 bg-muted rounded-full"></div>
                      <div className="w-6 h-2 bg-secondary rounded-full"></div>
                    </div>
                  </div>

                  {/* App Content */}
                  <div className="px-6 py-4">
                    <div className="text-center mb-6">
                      <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <CheckCircle className="text-white h-12 w-12" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">Reward Unlocked!</h3>
                      <p className="text-muted-foreground">Joe's Coffee Shop</p>
                    </div>

                    {/* Reward Card */}
                    <div className="gradient-bg rounded-xl p-6 text-white mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold">Free Coffee</h4>
                          <p className="text-sm opacity-90">Buy 2, Get 1 Free</p>
                        </div>
                        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                          <Coffee className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm opacity-90">Expires: Dec 31, 2024</span>
                        <Button variant="secondary" size="sm">
                          Redeem Now
                        </Button>
                      </div>
                    </div>

                    {/* Tap Trail Progress */}
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground">Downtown Tap Trail</h4>
                          <span className="text-sm text-muted-foreground">2/5 shops</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 mb-3">
                          <div className="bg-gradient-to-r from-secondary to-accent h-3 rounded-full" style={{ width: "40%" }}></div>
                        </div>
                        <p className="text-sm text-muted-foreground">Visit 3 more shops to unlock $20 bonus!</p>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button className="w-full bg-primary text-white">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Referral Link
                      </Button>
                      <Button variant="outline" className="w-full">
                        <MapPin className="mr-2 h-4 w-4" />
                        Find Nearby Shops
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* NFC Animation */}
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center nfc-pulse">
                <Wifi className="text-white h-8 w-8" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Showcase */}
      <section className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold gradient-text mb-4">Join Local Businesses</h2>
          <p className="text-xl text-muted-foreground">See how Cirqlback transforms customer engagement</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
              alt="Warm coffee shop interior with wooden tables and customers enjoying drinks" 
              className="w-full h-48 object-cover"
            />
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Joe's Coffee Shop</h3>
              <p className="text-muted-foreground mb-4">Increased customer retention by 40% with loyalty tap campaigns</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">1,247 total taps</span>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">Active</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
              alt="Charming independent bookstore with tall shelves and cozy reading nooks" 
              className="w-full h-48 object-cover"
            />
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Downtown Books</h3>
              <p className="text-muted-foreground mb-4">Connected with local coffee shops through tap trails</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">892 total taps</span>
                <span className="bg-secondary/10 text-secondary px-2 py-1 rounded-full text-xs font-medium">Active</span>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300" 
              alt="Bustling local restaurant with outdoor patio seating and warm lighting" 
              className="w-full h-48 object-cover"
            />
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Mama's Bistro</h3>
              <p className="text-muted-foreground mb-4">Boosted referrals by 60% with tap-to-share campaigns</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">1,543 total taps</span>
                <span className="bg-accent/10 text-accent px-2 py-1 rounded-full text-xs font-medium">Active</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold gradient-text mb-6">Ready to Transform Your Local Business?</h2>
          <p className="text-xl text-muted-foreground mb-8">Join the Cirqlback community and start building stronger customer relationships today</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/merchant">
              <Button size="lg" className="bg-primary text-white hover:bg-primary/90">
                <Store className="mr-2 h-5 w-5" />
                Start Free Trial
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              <BarChart3 className="mr-2 h-5 w-5" />
              Schedule Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">No credit card required • 5 free NFC tags included</p>
        </div>
      </section>
    </main>
  );
}
