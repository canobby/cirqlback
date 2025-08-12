import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Users, 
  Store, 
  MapPin, 
  Smartphone, 
  Star, 
  Award, 
  TrendingUp, 
  MessageCircle, 
  Settings,
  ChevronRight,
  CheckCircle,
  Play,
  Download
} from "lucide-react";

export default function UserGuide() {
  const [activeWalkthrough, setActiveWalkthrough] = useState<string | null>(null);

  const walkthroughs = [
    {
      id: "first-tap",
      title: "Your First Cirql Tap",
      description: "Learn how to tap Cirql tags and get instant rewards",
      steps: [
        "Look for the distinctive Cirql tag at participating businesses",
        "Simply tap your smartphone to the tag",
        "Instantly receive your reward or discount",
        "Optionally create a profile to track rewards across businesses"
      ],
      duration: "2 minutes",
      difficulty: "Beginner"
    },
    {
      id: "map-discovery",
      title: "Exploring the Discovery Map",
      description: "Find businesses, connect with customers, and plan your visits",
      steps: [
        "Navigate to the Map section in the main menu",
        "Use filters to find businesses by type or distance",
        "Toggle your visibility to appear on the map for other customers",
        "Message other customers and businesses directly",
        "Save favorite locations for future visits"
      ],
      duration: "5 minutes",
      difficulty: "Beginner"
    },
    {
      id: "team-challenges",
      title: "Joining Team Challenges",
      description: "Participate in group challenges for bigger rewards",
      steps: [
        "Create your avatar in the Avatar Creator",
        "Browse available team challenges",
        "Form a team with friends or join an existing team",
        "Visit required businesses to complete challenge objectives",
        "Claim team rewards and unlock exclusive prizes"
      ],
      duration: "10 minutes",
      difficulty: "Intermediate"
    },
    {
      id: "business-setup",
      title: "Setting Up Your Business",
      description: "Complete guide for business owners to get started",
      steps: [
        "Choose your subscription plan (Core or Full Cirql Member)",
        "Complete your business profile with photos and details",
        "Create your first campaign with rewards and offers",
        "Order and set up physical Cirql tags",
        "Build your business website using the integrated builder",
        "Monitor analytics and optimize performance"
      ],
      duration: "30 minutes",
      difficulty: "Advanced"
    }
  ];

  const features = [
    {
      icon: <MapPin className="h-6 w-6" />,
      title: "Real-World Discovery Map",
      description: "Interactive map showing live business locations, visible customers, and active rewards with privacy controls."
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Instant Cirql Taps",
      description: "Simply tap your phone to Cirql tags at businesses to unlock rewards, discounts, and loyalty points."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Customer Communication",
      description: "Connect with other customers and businesses through the map interface with full privacy controls."
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Avatar & Team Challenges",
      description: "Create your avatar, join teams, and participate in multi-business challenges for massive rewards."
    },
    {
      icon: <Store className="h-6 w-6" />,
      title: "Complete Business Websites",
      description: "Professional website builder with templates, SEO optimization, and integrated Cirql campaigns."
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Advanced Analytics",
      description: "Real-time insights, customer behavior tracking, and performance optimization tools for businesses."
    }
  ];

  const quickStartSteps = [
    {
      type: "customer",
      title: "For Customers (Free)",
      steps: [
        "Visit a participating business with Cirql tags",
        "Tap your phone to the Cirql tag",
        "Instantly receive rewards and discounts",
        "Explore the discovery map for more businesses",
        "Create your avatar and join team challenges"
      ]
    },
    {
      type: "business",
      title: "For Business Owners",
      steps: [
        "Sign up for Core ($14.99/mo) or Full ($29.99/mo) membership",
        "Get your Cirql tags starting at $0.99 each",
        "Create campaigns with discounts and offers",
        "Build your website with the integrated builder",
        "Track analytics and grow customer engagement"
      ]
    }
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold gradient-text mb-4">Cirqlback User Guide</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Complete walkthrough for customers and businesses to get the most out of the Cirqlback platform
        </p>
      </div>

      {/* Quick Start Guide */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Quick Start Guide</h2>
          <p className="text-muted-foreground">Get started in minutes with our simple setup process</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {quickStartSteps.map((guide) => (
            <Card key={guide.type} className="relative overflow-hidden">
              <CardHeader className={`pb-4 ${guide.type === 'customer' ? 'bg-primary/5' : 'bg-secondary/5'}`}>
                <CardTitle className="flex items-center gap-2">
                  {guide.type === 'customer' ? (
                    <Users className="h-5 w-5 text-primary" />
                  ) : (
                    <Store className="h-5 w-5 text-secondary" />
                  )}
                  {guide.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {guide.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        guide.type === 'customer' ? 'bg-primary' : 'bg-secondary'
                      }`}>
                        {index + 1}
                      </div>
                      <p className="text-sm text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Interactive Walkthroughs */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Interactive Walkthroughs</h2>
          <p className="text-muted-foreground">Step-by-step guides for every feature</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {walkthroughs.map((walkthrough) => (
            <Card key={walkthrough.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg mb-2">{walkthrough.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mb-3">{walkthrough.description}</p>
                  </div>
                  <Play className="h-5 w-5 text-primary" />
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {walkthrough.duration}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {walkthrough.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveWalkthrough(
                    activeWalkthrough === walkthrough.id ? null : walkthrough.id
                  )}
                >
                  {activeWalkthrough === walkthrough.id ? 'Hide Steps' : 'View Steps'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
                
                {activeWalkthrough === walkthrough.id && (
                  <div className="mt-4 space-y-3">
                    {walkthrough.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Platform Features Overview */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Platform Features</h2>
          <p className="text-muted-foreground">Comprehensive overview of all Cirqlback capabilities</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Detailed User Guides */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Detailed Guides</h2>
          <p className="text-muted-foreground">In-depth documentation for advanced features</p>
        </div>

        <Tabs defaultValue="customer" className="max-w-4xl mx-auto">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="customer">Customer Guide</TabsTrigger>
            <TabsTrigger value="business">Business Guide</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Complete Customer Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Your First Cirql Tap
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                    <li>• Look for distinctive Cirql tags at participating businesses</li>
                    <li>• Simply tap your smartphone to the tag - no downloads required</li>
                    <li>• Instantly receive rewards, discounts, or loyalty points</li>
                    <li>• Optionally create a profile to track rewards across businesses</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Exploring the Discovery Map
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                    <li>• Find nearby businesses with active Cirql campaigns</li>
                    <li>• See other customers who choose to be visible</li>
                    <li>• Filter by business type: cafes, restaurants, fitness, retail</li>
                    <li>• Search for specific businesses or customer profiles</li>
                    <li>• Contact businesses directly through the map interface</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Privacy Controls
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                    <li>• Visibility toggle: Choose to appear on the map or stay private</li>
                    <li>• Activity sharing: Control what rewards and activities others can see</li>
                    <li>• Communication preferences: Decide who can message you</li>
                    <li>• Location settings: Share your location only when you want</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Avatar & Team Challenges
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                    <li>• Create your unique avatar with extensive customization options</li>
                    <li>• Join team challenges with friends or other customers</li>
                    <li>• Compete for massive prizes through multi-business challenges</li>
                    <li>• Earn badges for loyalty, referrals, and community participation</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Business Owner Complete Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Subscription Plans</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-primary mb-2">Core Cirql Member - $14.99/month</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Cirql tag campaigns and analytics</li>
                        <li>• Basic website builder with templates</li>
                        <li>• Customer discovery map placement</li>
                        <li>• Email support</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium text-secondary mb-2">Full Cirql Member - $29.99/month</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Everything in Core, plus:</li>
                        <li>• Advanced marketing suite with automation</li>
                        <li>• Premium website themes and customization</li>
                        <li>• Priority map placement and featured listing</li>
                        <li>• Advanced analytics and customer insights</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Campaign Creation</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                    <li>• <strong>Discount campaigns:</strong> Percentage or dollar-off rewards</li>
                    <li>• <strong>Loyalty programs:</strong> Points-based systems with tier rewards</li>
                    <li>• <strong>Special offers:</strong> Limited-time promotions and flash sales</li>
                    <li>• <strong>Multi-business trails:</strong> Partner with other businesses for larger rewards</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Website Builder Features</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                    <li>• Choose from premium templates designed for local businesses</li>
                    <li>• Customize colors, fonts, and layouts to match your brand</li>
                    <li>• Add your menu, services, and pricing with drag-and-drop editing</li>
                    <li>• Integrate social media links and contact forms</li>
                    <li>• SEO optimization built-in for local search visibility</li>
                    <li>• Mobile responsive design automatically applied</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Analytics Dashboard</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                    <li>• Real-time tap statistics by location and campaign</li>
                    <li>• Customer demographics and behavior patterns</li>
                    <li>• Revenue attribution from Cirql campaigns</li>
                    <li>• Website traffic and conversion rates</li>
                    <li>• Social media engagement metrics</li>
                    <li>• Competitor analysis and market insights</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="troubleshooting" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Common Issues & Solutions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-red-600">Cirql Tag Not Working</h3>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm mb-3"><strong>Problem:</strong> Phone doesn't respond when tapping the tag</p>
                    <p className="text-sm font-medium mb-2">Solutions:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Ensure NFC is enabled in phone settings</li>
                      <li>• Try different areas of the tag surface</li>
                      <li>• Remove phone case if it's thick or metallic</li>
                      <li>• Hold phone flat against the tag for 2-3 seconds</li>
                      <li>• Try manually visiting the business's Cirql page through the map</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-orange-600">Map Not Showing Businesses</h3>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm mb-3"><strong>Problem:</strong> Discovery map appears empty or incomplete</p>
                    <p className="text-sm font-medium mb-2">Solutions:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Check location permissions in browser settings</li>
                      <li>• Refresh the page and allow location access</li>
                      <li>• Try searching for specific business names</li>
                      <li>• Check if you're in an area with Cirql-enabled businesses</li>
                      <li>• Contact support if businesses you know are participating don't appear</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-blue-600">Low Tag Engagement (Business)</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm mb-3"><strong>Problem:</strong> Few customers are tapping your Cirql tags</p>
                    <p className="text-sm font-medium mb-2">Solutions:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• Improve tag placement: Place tags where customers naturally interact</li>
                      <li>• Add signage: Create small signs explaining what Cirql tags are</li>
                      <li>• Staff training: Ensure staff can explain Cirql tags to customers</li>
                      <li>• Campaign optimization: Review if your offers are compelling enough</li>
                      <li>• Cross-promotion: Partner with other businesses for shared campaigns</li>
                    </ul>
                  </div>
                </div>

                <div className="text-center pt-6">
                  <h3 className="font-semibold mb-3">Need More Help?</h3>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="outline">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Contact Support
                    </Button>
                    <Button variant="outline">
                      <BookOpen className="mr-2 h-4 w-4" />
                      View Documentation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Success Stories */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Success Stories</h2>
          <p className="text-muted-foreground">Real results from businesses and customers using Cirqlback</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <Badge variant="secondary">Coffee Shop</Badge>
              </div>
              <blockquote className="text-sm text-muted-foreground mb-4">
                "Since implementing Cirqlback, we've seen a 40% increase in new customers and our customer retention has improved dramatically."
              </blockquote>
              <p className="text-sm font-medium">Jennifer, Brew & Bean Coffee</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <Badge variant="secondary">Restaurant Group</Badge>
              </div>
              <blockquote className="text-sm text-muted-foreground mb-4">
                "Revenue from Cirql customers is 23% higher than average. The cross-location campaigns give us insights we never had before."
              </blockquote>
              <p className="text-sm font-medium">Michael, Downtown Dining Group</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <Badge variant="secondary">Customer</Badge>
              </div>
              <blockquote className="text-sm text-muted-foreground mb-4">
                "I've discovered 12 new businesses through the map and team challenges. It's made exploring my neighborhood fun and rewarding!"
              </blockquote>
              <p className="text-sm font-medium">Rachel, Community Member</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Download Guide */}
      <section className="text-center">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <h3 className="text-2xl font-bold mb-4">Download Complete Guide</h3>
            <p className="text-muted-foreground mb-6">
              Get the full PDF version of this user guide for offline reference
            </p>
            <Button size="lg" className="bg-primary text-white hover:bg-primary/90">
              <Download className="mr-2 h-5 w-5" />
              Download PDF Guide
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Includes all walkthroughs, troubleshooting, and advanced features
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}