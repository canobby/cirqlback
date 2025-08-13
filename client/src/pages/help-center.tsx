import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Book, 
  MessageSquare, 
  Video, 
  FileText, 
  Users,
  Zap,
  Shield,
  CreditCard,
  Settings,
  ChevronRight,
  Star,
  Clock,
  HelpCircle
} from "lucide-react";

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const helpCategories = [
    {
      id: "getting-started",
      title: "Getting Started", 
      icon: Zap,
      description: "New to Cirqlback? Start here",
      articles: 12,
      color: "from-green-500 to-emerald-500"
    },
    {
      id: "business-setup",
      title: "Business Setup",
      icon: Settings,
      description: "Set up your business profile",
      articles: 8,
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: "quest-system",
      title: "Quest & Gaming",
      icon: Star,
      description: "Understanding the gamification features",
      articles: 15,
      color: "from-purple-500 to-pink-500"
    },
    {
      id: "billing",
      title: "Billing & Pricing",
      icon: CreditCard,
      description: "Subscription and payment help",
      articles: 6,
      color: "from-orange-500 to-red-500"
    },
    {
      id: "security",
      title: "Security & Privacy",
      icon: Shield,
      description: "Keep your account secure",
      articles: 9,
      color: "from-indigo-500 to-purple-500"
    },
    {
      id: "integrations",
      title: "Integrations",
      icon: Users,
      description: "Connect with other tools",
      articles: 11,
      color: "from-cyan-500 to-blue-500"
    }
  ];

  const popularArticles = [
    {
      title: "How to Set Up Your First Cirql Tag Campaign",
      category: "Getting Started",
      readTime: "5 min read",
      views: "2.1k views",
      helpful: 94
    },
    {
      title: "Understanding Quest Points and Customer Rewards", 
      category: "Quest System",
      readTime: "3 min read",
      views: "1.8k views",
      helpful: 89
    },
    {
      title: "Connecting Your Business to Google Analytics",
      category: "Integrations", 
      readTime: "7 min read",
      views: "1.5k views",
      helpful: 92
    },
    {
      title: "Managing Customer Privacy Settings",
      category: "Security",
      readTime: "4 min read", 
      views: "1.2k views",
      helpful: 87
    },
    {
      title: "Setting Up AR Treasure Hunts for Your Business",
      category: "Quest System",
      readTime: "8 min read",
      views: "980 views", 
      helpful: 95
    }
  ];

  const quickActions = [
    {
      title: "Contact Support",
      description: "Get help from our team",
      icon: MessageSquare,
      action: "contact"
    },
    {
      title: "Video Tutorials", 
      description: "Watch step-by-step guides",
      icon: Video,
      action: "videos"
    },
    {
      title: "Community Forum",
      description: "Connect with other users",
      icon: Users,
      action: "forum"
    },
    {
      title: "API Documentation",
      description: "Technical integration guides",
      icon: FileText,
      action: "api"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            How can we help you?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Find answers, get support, and learn how to make the most of Cirqlback
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search for help articles, guides, and more..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-3 text-lg"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          {quickActions.map((action) => (
            <Card key={action.action} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="browse" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="browse">Browse by Category</TabsTrigger>
            <TabsTrigger value="popular">Popular Articles</TabsTrigger>
            <TabsTrigger value="tutorials">Video Tutorials</TabsTrigger>
          </TabsList>

          {/* Browse by Category */}
          <TabsContent value="browse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {helpCategories.map((category) => (
                <Card key={category.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center mb-4`}>
                      <category.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{category.title}</h3>
                    <p className="text-gray-600 mb-4">{category.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{category.articles} articles</Badge>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Popular Articles */}
          <TabsContent value="popular">
            <div className="space-y-4">
              {popularArticles.map((article, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2 hover:text-blue-600 transition-colors">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <Badge variant="outline">{article.category}</Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {article.readTime}
                          </span>
                          <span>{article.views}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{article.helpful}% helpful</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 ml-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Video Tutorials */}
          <TabsContent value="tutorials">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Cirqlback Platform Overview", duration: "5:30", views: "2.1k" },
                { title: "Setting Up Your First Campaign", duration: "8:45", views: "1.8k" },
                { title: "Understanding Customer Analytics", duration: "6:20", views: "1.5k" },
                { title: "AR Gaming Features Walkthrough", duration: "10:15", views: "1.2k" },
                { title: "Integration with POS Systems", duration: "7:30", views: "980" },
                { title: "Managing Team Permissions", duration: "4:45", views: "750" }
              ].map((video, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-500 rounded-t-lg flex items-center justify-center">
                    <Video className="h-12 w-12 text-white" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">{video.title}</h3>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{video.duration}</span>
                      <span>{video.views} views</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Still Need Help */}
        <Card className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <HelpCircle className="h-16 w-16 mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl font-bold mb-2">Still need help?</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Can't find what you're looking for? Our support team is here to help you get the most out of Cirqlback.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" size="lg">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-blue-600">
                Schedule a Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}