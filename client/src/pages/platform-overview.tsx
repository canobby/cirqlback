import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Store, 
  Users, 
  BarChart3, 
  Settings, 
  Map, 
  Zap, 
  BookOpen,
  CreditCard,
  User,
  UserCircle,
  Gamepad2,
  Globe,
  HelpCircle,
  NfcIcon,
  ArrowRight
} from "lucide-react";

const platformSections = [
  {
    title: "Core Platform",
    description: "Main dashboard and user portals",
    pages: [
      { path: "/", name: "Home Dashboard", icon: Home, description: "Main platform overview and quick access" },
      { path: "/customer", name: "Customer Portal", icon: User, description: "Tap rewards, trails, and customer features" },
      { path: "/merchant", name: "Merchant Dashboard", icon: Store, description: "Business management and campaign tools" },
    ]
  },
  {
    title: "AR & Gaming",
    description: "Augmented reality experiences and avatar system",
    pages: [
      { path: "/ar-hub", name: "AR Game Hub", icon: Gamepad2, description: "Central hub for AR gaming and challenges" },
      { path: "/avatar", name: "Avatar Creator", icon: UserCircle, description: "Create and customize your virtual avatar" },
      { path: "/ar/demo", name: "AR Experience", icon: Zap, description: "Demo AR interaction with NFC tags" },
    ]
  },
  {
    title: "Discovery & Social",
    description: "Maps, community features, and social interactions",
    pages: [
      { path: "/map", name: "Interactive Map", icon: Map, description: "Find businesses and tap trails near you" },
      { path: "/community", name: "Community Hub", icon: Users, description: "Social challenges, leaderboards, and groups" },
      { path: "/tap", name: "Tap Interface", icon: NfcIcon, description: "NFC tag scanning and reward claiming" },
    ]
  },
  {
    title: "Business Tools",
    description: "Analytics, marketing, and business management",
    pages: [
      { path: "/analytics", name: "Analytics Dashboard", icon: BarChart3, description: "Real-time business insights and metrics" },
      { path: "/marketing", name: "Marketing Suite", icon: BookOpen, description: "Email, SMS, and social media campaigns" },
      { path: "/website-preview", name: "Website Builder", icon: Globe, description: "Create professional business websites" },
    ]
  },
  {
    title: "Account & Settings",
    description: "User profiles, subscriptions, and platform settings",
    pages: [
      { path: "/account", name: "Account Management", icon: User, description: "Subscription plans, API keys, and billing" },
      { path: "/profile", name: "Customer Profile", icon: UserCircle, description: "Personal preferences and activity history" },
      { path: "/settings", name: "Platform Settings", icon: Settings, description: "Notifications, privacy, and integrations" },
      { path: "/checkout", name: "Subscription Checkout", icon: CreditCard, description: "Upgrade to Core or Full Cirql Member" },
    ]
  },
  {
    title: "Information",
    description: "Platform guides and help documentation",
    pages: [
      { path: "/how-it-works", name: "How It Works", icon: HelpCircle, description: "Complete guide to the Cirqlback platform" },
    ]
  }
];

export default function PlatformOverview() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Cirqlback Platform Directory
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Explore all features of the comprehensive NFC-powered local marketing and loyalty platform. 
            Navigate to any section to test functionality and see the full Cirqlback experience.
          </p>
          <Badge variant="secondary" className="text-sm">
            No login required for demo - Full platform access available
          </Badge>
        </div>

        <div className="grid gap-8">
          {platformSections.map((section, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                <CardTitle className="text-xl text-gray-800">{section.title}</CardTitle>
                <p className="text-gray-600">{section.description}</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.pages.map((page, pageIndex) => {
                    const Icon = page.icon;
                    return (
                      <Link key={pageIndex} href={page.path}>
                        <Card className="h-full hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary/30">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-800 truncate">{page.name}</h3>
                              </div>
                              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{page.description}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-2xl font-bold">Ready to Explore?</h2>
            <p className="text-blue-100">
              Click on any page above to start testing the Cirqlback platform. 
              All features are available in demo mode without requiring authentication.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/customer">
                <Button variant="secondary" className="gap-2">
                  <User className="h-4 w-4" />
                  Start as Customer
                </Button>
              </Link>
              <Link href="/merchant">
                <Button variant="secondary" className="gap-2">
                  <Store className="h-4 w-4" />
                  Start as Merchant
                </Button>
              </Link>
              <Link href="/ar-hub">
                <Button variant="secondary" className="gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  Try AR Gaming
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}