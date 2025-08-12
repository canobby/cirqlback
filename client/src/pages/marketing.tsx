import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { 
  Mail,
  MessageSquare,
  Instagram,
  Facebook,
  Twitter,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  Clock,
  Eye,
  MousePointer,
  DollarSign,
  Send,
  Settings,
  Zap,
  Globe,
  Filter,
  Download,
  Upload,
  Share2,
  Bell,
  Heart,
  Star,
  Gift,
  Megaphone,
  PieChart,
  Edit,
  Menu,
  Image,
  Link,
  ExternalLink,
  Save,
  Palette
} from "lucide-react";

export default function ViralMarketingSuite() {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [websiteForm, setWebsiteForm] = useState({
    websiteEnabled: false,
    websiteSlug: "",
    websiteTheme: "modern",
    websiteContent: {
      businessName: "",
      tagline: "",
      aboutText: "",
      contactInfo: "",
      specialOffers: ""
    },
    websiteMenu: {
      categories: [],
      items: []
    },
    websiteServices: {
      services: []
    },
    websiteHours: {
      monday: { open: "9:00", close: "17:00", closed: false },
      tuesday: { open: "9:00", close: "17:00", closed: false },
      wednesday: { open: "9:00", close: "17:00", closed: false },
      thursday: { open: "9:00", close: "17:00", closed: false },
      friday: { open: "9:00", close: "17:00", closed: false },
      saturday: { open: "10:00", close: "16:00", closed: false },
      sunday: { open: "", close: "", closed: true }
    },
    websiteSocialLinks: {
      facebook: "",
      instagram: "",
      twitter: "",
      linkedin: "",
      tiktok: ""
    }
  });
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "email",
    subject: "",
    content: "",
    targetAudience: "all",
    scheduledDate: "",
    budget: "",
    platform: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mock data with proper typing to avoid unknown type errors
  const campaigns = [
    {
      id: 1,
      name: "Welcome Email Series",
      type: "email",
      status: "active",
      sent: 2450,
      opened: 1835,
      clicked: 423,
      revenue: 3200,
      scheduledDate: "2024-01-15T10:00:00",
      audience: "New Customers"
    },
    {
      id: 2,
      name: "Instagram Fitness Challenge", 
      type: "social",
      status: "scheduled",
      sent: 0,
      opened: 0,
      clicked: 0,
      revenue: 0,
      scheduledDate: "2024-01-20T14:00:00",
      audience: "All Customers"
    }
  ];

  const analytics = {
    totalEmailsSent: 15420,
    avgOpenRate: 28.5,
    avgClickRate: 12.3,
    totalRevenue: 18650,
    campaignsActive: 3,
    subscriberGrowth: 15.2
  };

  const integrations = [
    { name: "Mailchimp", connected: true, type: "email" },
    { name: "Instagram", connected: false, type: "social" },
    { name: "Google Ads", connected: true, type: "advertising" },
    { name: "Twilio SMS", connected: false, type: "sms" }
  ];

  const campaignsLoading = false;
  const analyticsLoading = false;

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      return await apiRequest("POST", "/api/marketing/campaigns", campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      toast({
        title: "Campaign Created",
        description: "Your marketing campaign has been created and scheduled.",
      });
      setCampaignForm({
        name: "",
        type: "email",
        subject: "",
        content: "",
        targetAudience: "all",
        scheduledDate: "",
        budget: "",
        platform: ""
      });
    },
  });

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case "email": return Mail;
      case "sms": return Smartphone;
      case "social": return Share2;
      case "push": return Bell;
      case "retargeting": return Target;
      default: return Megaphone;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "instagram": return Instagram;
      case "facebook": return Facebook;
      case "twitter": return Twitter;
      case "google": return Globe;
      default: return Share2;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Marketing Suite
              </h1>
              <p className="text-gray-600 mt-1">Leverage customer data for targeted marketing campaigns</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Zap className="h-4 w-4 mr-2" />
                Quick Campaign
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Marketing Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Customers</p>
                  <p className="text-3xl font-bold">2,847</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
              <div className="flex items-center mt-4 text-blue-100">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+12% this month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Email Open Rate</p>
                  <p className="text-3xl font-bold">68.3%</p>
                </div>
                <Mail className="h-8 w-8 text-green-200" />
              </div>
              <div className="flex items-center mt-4 text-green-100">
                <Eye className="h-4 w-4 mr-1" />
                <span className="text-sm">Above industry avg</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Campaign ROI</p>
                  <p className="text-3xl font-bold">4.2x</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-200" />
              </div>
              <div className="flex items-center mt-4 text-purple-100">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm">+$8,420 revenue</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Active Campaigns</p>
                  <p className="text-3xl font-bold">7</p>
                </div>
                <Megaphone className="h-8 w-8 text-orange-200" />
              </div>
              <div className="flex items-center mt-4 text-orange-100">
                <Clock className="h-4 w-4 mr-1" />
                <span className="text-sm">3 ending soon</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Marketing Tabs */}
        <Tabs defaultValue="website" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="website">Website Builder</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="audiences">Audiences</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Website Builder Tab */}
          <TabsContent value="website" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="h-5 w-5 mr-2 text-blue-600" />
                    Website Builder & Hosting
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Create a professional one-page website for your business. No technical skills required!
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">💰 Save Money on Website Costs</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Many small businesses spend $500-2000+ on website development. Our hosted solution includes:
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>✓ Professional website design & hosting</li>
                      <li>✓ Menu, services, hours, and contact info</li>
                      <li>✓ Social media integration</li>
                      <li>✓ Mobile-responsive design</li>
                      <li>✓ SEO optimization for local search</li>
                      <li>✓ Integration with your Cirql campaigns</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={websiteForm.websiteEnabled}
                        onCheckedChange={(checked) => 
                          setWebsiteForm(prev => ({ ...prev, websiteEnabled: checked }))
                        }
                      />
                      <Label>Enable Website Hosting</Label>
                    </div>
                    <Badge variant={websiteForm.websiteEnabled ? "default" : "secondary"}>
                      {websiteForm.websiteEnabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>

                  {websiteForm.websiteEnabled && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="websiteSlug">Website URL</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-500">cirqlback.com/</span>
                          <Input
                            id="websiteSlug"
                            value={websiteForm.websiteSlug}
                            onChange={(e) => setWebsiteForm(prev => ({ 
                              ...prev, 
                              websiteSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                            }))}
                            placeholder="your-business-name"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="websiteTheme">Website Theme</Label>
                        <Select value={websiteForm.websiteTheme} onValueChange={(value) => 
                          setWebsiteForm(prev => ({ ...prev, websiteTheme: value }))
                        }>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="modern">Modern & Clean</SelectItem>
                            <SelectItem value="classic">Classic Business</SelectItem>
                            <SelectItem value="creative">Creative & Artistic</SelectItem>
                            <SelectItem value="restaurant">Restaurant Focused</SelectItem>
                            <SelectItem value="fitness">Fitness & Health</SelectItem>
                            <SelectItem value="retail">Retail & Shopping</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => window.open('/website-preview', '_blank')}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Edit className="h-5 w-5 mr-2 text-green-600" />
                    Content Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={websiteForm.websiteContent.businessName}
                      onChange={(e) => setWebsiteForm(prev => ({
                        ...prev,
                        websiteContent: { ...prev.websiteContent, businessName: e.target.value }
                      }))}
                      placeholder="Your Business Name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={websiteForm.websiteContent.tagline}
                      onChange={(e) => setWebsiteForm(prev => ({
                        ...prev,
                        websiteContent: { ...prev.websiteContent, tagline: e.target.value }
                      }))}
                      placeholder="A catchy tagline for your business"
                    />
                  </div>

                  <div>
                    <Label htmlFor="aboutText">About Your Business</Label>
                    <Textarea
                      id="aboutText"
                      value={websiteForm.websiteContent.aboutText}
                      onChange={(e) => setWebsiteForm(prev => ({
                        ...prev,
                        websiteContent: { ...prev.websiteContent, aboutText: e.target.value }
                      }))}
                      placeholder="Tell customers about your business, what makes you special..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="specialOffers">Special Offers</Label>
                    <Textarea
                      id="specialOffers"
                      value={websiteForm.websiteContent.specialOffers}
                      onChange={(e) => setWebsiteForm(prev => ({
                        ...prev,
                        websiteContent: { ...prev.websiteContent, specialOffers: e.target.value }
                      }))}
                      placeholder="Current promotions, deals, or special announcements..."
                      rows={2}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save Content
                    </Button>
                    <Button variant="outline" onClick={() => window.open('/website-preview', '_blank')}>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Menu className="h-5 w-5 mr-2 text-orange-600" />
                    Menu & Services
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Add your menu items, services, or products that customers can discover.
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Service Categories</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Food & Drinks", "Services", "Products", "Classes"].map(category => (
                        <Badge key={category} variant="outline" className="cursor-pointer hover:bg-gray-100">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button variant="outline" className="w-full">
                      <Menu className="h-4 w-4 mr-2" />
                      Manage Menu
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Sync from Campaigns
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-purple-600" />
                    Business Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(websiteForm.websiteHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{day}</span>
                      <div className="flex items-center space-x-1">
                        {hours.closed ? (
                          <span className="text-gray-500">Closed</span>
                        ) : (
                          <span>{hours.open} - {hours.close}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full">
                      <Clock className="h-4 w-4 mr-2" />
                      Edit Hours
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Sync from Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Link className="h-5 w-5 mr-2 text-pink-600" />
                    Social Media Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Input
                      placeholder="Facebook URL"
                      value={websiteForm.websiteSocialLinks.facebook}
                      onChange={(e) => setWebsiteForm(prev => ({
                        ...prev,
                        websiteSocialLinks: { ...prev.websiteSocialLinks, facebook: e.target.value }
                      }))}
                    />
                    <Input
                      placeholder="Instagram URL"
                      value={websiteForm.websiteSocialLinks.instagram}
                      onChange={(e) => setWebsiteForm(prev => ({
                        ...prev,
                        websiteSocialLinks: { ...prev.websiteSocialLinks, instagram: e.target.value }
                      }))}
                    />
                    <Input
                      placeholder="Twitter URL"
                      value={websiteForm.websiteSocialLinks.twitter}
                      onChange={(e) => setWebsiteForm(prev => ({
                        ...prev,
                        websiteSocialLinks: { ...prev.websiteSocialLinks, twitter: e.target.value }
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Button variant="outline" className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      Save Links
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Import from Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Smartphone className="h-5 w-5 mr-2 text-blue-600" />
                    Website Performance & Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">245</div>
                      <div className="text-xs text-green-700">Total Views</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">18</div>
                      <div className="text-xs text-blue-700">Cirql Taps</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-xl font-bold text-purple-600">34</div>
                      <div className="text-xs text-purple-700">Contact Clicks</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-xl font-bold text-orange-600">7.3%</div>
                      <div className="text-xs text-orange-700">Conversion</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800 mb-1">📈 SEO Status</div>
                    <div className="text-xs text-yellow-700 space-y-1">
                      <div>✓ Mobile optimized & fast loading</div>
                      <div>✓ Local search keywords included</div>
                      <div>✓ Google My Business integration ready</div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button className="flex-1">
                      <Globe className="h-4 w-4 mr-2" />
                      Publish
                    </Button>
                    <Button variant="outline" onClick={() => window.open('/website-preview', '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                    Smart Integration Hub
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-2 text-sm">🎯 Live Cirql Campaigns</h4>
                      <ul className="text-xs text-green-700 space-y-1">
                        <li>✓ Auto-display active campaigns on site</li>
                        <li>✓ QR codes for instant Cirql tapping</li>
                        <li>✓ Real-time reward updates</li>
                      </ul>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-2 text-sm">⚡ Auto-Sync Data</h4>
                      <ul className="text-xs text-purple-700 space-y-1">
                        <li>✓ Business profile data auto-imports</li>
                        <li>✓ Menu syncs with campaign items</li>
                        <li>✓ Hours update everywhere at once</li>
                      </ul>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2 text-sm">🌟 AR Game Integration</h4>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>✓ Showcase AR collectibles earned here</li>
                        <li>✓ Display business AR transformation</li>
                        <li>✓ Team battle participation badges</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Zap className="h-3 w-3 mr-1" />
                      Sync All
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Share2 className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Campaign Form */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Send className="h-5 w-5 mr-2 text-blue-500" />
                    Create Campaign
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Campaign Name</label>
                    <Input
                      placeholder="Weekend Special Promotion"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Campaign Type</label>
                    <Select value={campaignForm.type} onValueChange={(value) => setCampaignForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email Marketing</SelectItem>
                        <SelectItem value="sms">SMS Marketing</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="push">Push Notifications</SelectItem>
                        <SelectItem value="retargeting">Retargeting Ads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {campaignForm.type === "email" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Subject</label>
                      <Input
                        placeholder="Don't miss out on 20% off!"
                        value={campaignForm.subject}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, subject: e.target.value }))}
                      />
                    </div>
                  )}

                  {campaignForm.type === "social" && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Platform</label>
                      <Select value={campaignForm.platform} onValueChange={(value) => setCampaignForm(prev => ({ ...prev, platform: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="facebook">Facebook</SelectItem>
                          <SelectItem value="twitter">Twitter</SelectItem>
                          <SelectItem value="google">Google Ads</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2">Message Content</label>
                    <Textarea
                      placeholder="Craft your marketing message..."
                      value={campaignForm.content}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Target Audience</label>
                    <Select value={campaignForm.targetAudience} onValueChange={(value) => setCampaignForm(prev => ({ ...prev, targetAudience: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="frequent">Frequent Visitors</SelectItem>
                        <SelectItem value="new">New Customers</SelectItem>
                        <SelectItem value="inactive">Inactive Users</SelectItem>
                        <SelectItem value="high-value">High-Value Customers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Budget (Optional)</label>
                    <Input
                      type="number"
                      placeholder="500"
                      value={campaignForm.budget}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, budget: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Schedule Date</label>
                    <Input
                      type="datetime-local"
                      value={campaignForm.scheduledDate}
                      onChange={(e) => setCampaignForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    />
                  </div>

                  <Button 
                    onClick={() => createCampaignMutation.mutate(campaignForm)}
                    disabled={!campaignForm.name || !campaignForm.content || createCampaignMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </CardContent>
              </Card>

              {/* Active Campaigns */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-green-500" />
                      Active Campaigns
                    </div>
                    <Badge variant="secondary">2 running</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {campaignsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">No Active Campaigns</h3>
                      <p>Create your first marketing campaign to start engaging customers!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        {
                          id: "camp1",
                          name: "Weekend Coffee Special",
                          type: "email",
                          status: "active",
                          sent: 2847,
                          opened: 1943,
                          clicked: 421,
                          revenue: 3420,
                          scheduledDate: "2024-01-15T10:00:00",
                          audience: "Frequent Visitors"
                        },
                        {
                          id: "camp2", 
                          name: "New Customer Welcome",
                          type: "sms",
                          status: "scheduled",
                          sent: 0,
                          opened: 0,
                          clicked: 0,
                          revenue: 0,
                          scheduledDate: "2024-01-18T14:00:00",
                          audience: "New Customers"
                        },
                        {
                          id: "camp3",
                          name: "Instagram Fitness Challenge",
                          type: "social",
                          status: "active",
                          sent: 1200,
                          opened: 890,
                          clicked: 234,
                          revenue: 1850,
                          scheduledDate: "2024-01-12T09:00:00",
                          audience: "All Customers"
                        }
                      ].map((campaign) => {
                        const Icon = getCampaignTypeIcon(campaign.type);
                        return (
                          <div key={campaign.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${
                                  campaign.status === 'active' ? 'bg-green-100' : 'bg-orange-100'
                                }`}>
                                  <Icon className={`h-5 w-5 ${
                                    campaign.status === 'active' ? 'text-green-600' : 'text-orange-600'
                                  }`} />
                                </div>
                                <div>
                                  <h4 className="font-semibold">{campaign.name}</h4>
                                  <p className="text-sm text-gray-600">{campaign.audience}</p>
                                </div>
                              </div>
                              <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                                {campaign.status}
                              </Badge>
                            </div>
                            
                            {campaign.status === 'active' ? (
                              <div className="grid grid-cols-4 gap-4 mt-4">
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-blue-600">{campaign.sent.toLocaleString()}</p>
                                  <p className="text-xs text-gray-500">Sent</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-green-600">{((campaign.opened / campaign.sent) * 100).toFixed(1)}%</p>
                                  <p className="text-xs text-gray-500">Open Rate</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-purple-600">{((campaign.clicked / campaign.sent) * 100).toFixed(1)}%</p>
                                  <p className="text-xs text-gray-500">Click Rate</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-2xl font-bold text-green-600">${campaign.revenue.toLocaleString()}</p>
                                  <p className="text-xs text-gray-500">Revenue</p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4 flex items-center text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mr-2" />
                                Scheduled for {new Date(campaign.scheduledDate).toLocaleDateString()} at {new Date(campaign.scheduledDate).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Audiences Tab */}
          <TabsContent value="audiences" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-500" />
                    Customer Segments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        name: "Frequent Visitors",
                        count: 847,
                        description: "Customers with 5+ visits this month",
                        color: "bg-green-500",
                        growth: "+12%"
                      },
                      {
                        name: "High-Value Customers", 
                        count: 234,
                        description: "Customers spending $100+ monthly",
                        color: "bg-purple-500",
                        growth: "+8%"
                      },
                      {
                        name: "New Customers",
                        count: 456,
                        description: "First visit within last 30 days",
                        color: "bg-blue-500",
                        growth: "+24%"
                      },
                      {
                        name: "Inactive Users",
                        count: 312,
                        description: "No visits in last 60 days",
                        color: "bg-orange-500",
                        growth: "-5%"
                      }
                    ].map((segment) => (
                      <div key={segment.name} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full ${segment.color}`}></div>
                          <div>
                            <h4 className="font-medium">{segment.name}</h4>
                            <p className="text-sm text-gray-600">{segment.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{segment.count.toLocaleString()}</p>
                          <p className={`text-xs ${segment.growth.startsWith('+') ? 'text-green-600' : 'text-orange-600'}`}>
                            {segment.growth}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2 text-purple-500" />
                    Smart Targeting
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">AI-Powered Recommendations</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-700">Best time to send emails</span>
                          <Badge variant="outline">Tuesday 10 AM</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-700">Highest engagement segment</span>
                          <Badge variant="outline">Frequent Visitors</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-700">Recommended offer type</span>
                          <Badge variant="outline">Percentage Discount</Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Customer Lifecycle Stages</h4>
                      <div className="space-y-3">
                        {[
                          { stage: "New Customer", count: 456, percentage: 16 },
                          { stage: "Active", count: 1234, percentage: 43 },
                          { stage: "Loyal", count: 847, percentage: 30 },
                          { stage: "At Risk", count: 312, percentage: 11 }
                        ].map((stage) => (
                          <div key={stage.stage}>
                            <div className="flex justify-between text-sm mb-1">
                              <span>{stage.stage}</span>
                              <span>{stage.count} customers</span>
                            </div>
                            <Progress value={stage.percentage} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  name: "Mailchimp",
                  description: "Email marketing automation",
                  icon: Mail,
                  connected: true,
                  category: "Email Marketing"
                },
                {
                  name: "Instagram Business",
                  description: "Social media advertising",
                  icon: Instagram,
                  connected: true,
                  category: "Social Media"
                },
                {
                  name: "Facebook Ads",
                  description: "Social media advertising",
                  icon: Facebook,
                  connected: false,
                  category: "Social Media"
                },
                {
                  name: "Google Ads",
                  description: "Search and display advertising", 
                  icon: Globe,
                  connected: true,
                  category: "Advertising"
                },
                {
                  name: "Twilio",
                  description: "SMS marketing campaigns",
                  icon: Smartphone,
                  connected: false,
                  category: "SMS Marketing"
                },
                {
                  name: "HubSpot",
                  description: "CRM and marketing automation",
                  icon: Settings,
                  connected: false,
                  category: "CRM"
                }
              ].map((integration) => {
                const Icon = integration.icon;
                return (
                  <Card key={integration.name} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${integration.connected ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <Icon className={`h-6 w-6 ${integration.connected ? 'text-green-600' : 'text-gray-600'}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold">{integration.name}</h3>
                            <p className="text-sm text-gray-600">{integration.category}</p>
                          </div>
                        </div>
                        <Badge variant={integration.connected ? "default" : "secondary"}>
                          {integration.connected ? "Connected" : "Available"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-4">{integration.description}</p>
                      <Button 
                        variant={integration.connected ? "outline" : "default"}
                        className="w-full"
                      >
                        {integration.connected ? "Configure" : "Connect"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                    Marketing Automations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        name: "Welcome Series",
                        trigger: "New customer first tap",
                        actions: ["Send welcome email", "SMS with first offer", "Social follow prompt"],
                        active: true,
                        performance: "87% completion rate"
                      },
                      {
                        name: "Re-engagement Campaign",
                        trigger: "No visit for 30 days",
                        actions: ["Send comeback email", "Special discount offer", "Phone call reminder"],
                        active: true,
                        performance: "23% return rate"
                      },
                      {
                        name: "Birthday Campaign",
                        trigger: "Customer birthday",
                        actions: ["Birthday email", "Free item coupon", "Social media shoutout"],
                        active: false,
                        performance: "Not active"
                      }
                    ].map((automation) => (
                      <div key={automation.name} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{automation.name}</h4>
                          <Switch checked={automation.active} />
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Trigger:</strong> {automation.trigger}
                        </p>
                        <div className="mb-3">
                          <p className="text-sm font-medium mb-1">Actions:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {automation.actions.map((action, i) => (
                              <li key={i} className="flex items-center">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant={automation.active ? "default" : "secondary"}>
                            {automation.active ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-sm text-gray-600">{automation.performance}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-gray-500" />
                    Create Automation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Automation Name</label>
                      <Input placeholder="Enter automation name" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Trigger Event</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trigger" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first-tap">First tap at business</SelectItem>
                          <SelectItem value="repeat-visit">Repeat visit (5+)</SelectItem>
                          <SelectItem value="inactive">30 days inactive</SelectItem>
                          <SelectItem value="high-spend">High spending threshold</SelectItem>
                          <SelectItem value="birthday">Customer birthday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Actions</label>
                      <div className="space-y-2">
                        {[
                          { id: "email", label: "Send Email", checked: true },
                          { id: "sms", label: "Send SMS", checked: false },
                          { id: "push", label: "Push Notification", checked: false },
                          { id: "social", label: "Social Media Post", checked: false }
                        ].map((action) => (
                          <div key={action.id} className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked={action.checked} className="rounded" />
                            <label className="text-sm">{action.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Delay (Optional)</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Immediate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="1hour">1 hour</SelectItem>
                          <SelectItem value="1day">1 day</SelectItem>
                          <SelectItem value="1week">1 week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                      Create Automation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-blue-500" />
                    Campaign Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      <h3 className="text-2xl font-bold text-blue-800">$12,847</h3>
                      <p className="text-blue-600">Total Campaign Revenue</p>
                      <p className="text-sm text-blue-500 mt-1">+34% vs last month</p>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Top Performing Campaigns</h4>
                      {[
                        { name: "Weekend Coffee Special", revenue: 3420, roi: "4.2x" },
                        { name: "New Customer Welcome", revenue: 2890, roi: "3.8x" },
                        { name: "Instagram Fitness Challenge", revenue: 1850, roi: "2.9x" }
                      ].map((campaign) => (
                        <div key={campaign.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-gray-600">${campaign.revenue} revenue</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">{campaign.roi} ROI</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-green-500" />
                    Channel Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { channel: "Email", sent: 8420, opened: 5756, clicked: 1263, revenue: 6840 },
                      { channel: "SMS", sent: 2340, opened: 2106, clicked: 421, revenue: 2890 },
                      { channel: "Social Media", sent: 3200, opened: 2560, clicked: 512, revenue: 1850 },
                      { channel: "Push Notifications", sent: 1200, opened: 840, clicked: 168, revenue: 750 }
                    ].map((channel) => (
                      <div key={channel.channel} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{channel.channel}</span>
                          <span className="text-sm text-gray-600">${channel.revenue}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <p className="font-semibold">{((channel.opened / channel.sent) * 100).toFixed(1)}%</p>
                            <p className="text-gray-500">Open Rate</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold">{((channel.clicked / channel.sent) * 100).toFixed(1)}%</p>
                            <p className="text-gray-500">Click Rate</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold">{(channel.revenue / channel.sent * 100).toFixed(2)}</p>
                            <p className="text-gray-500">Revenue/Send</p>
                          </div>
                        </div>
                        <Progress value={(channel.clicked / channel.sent) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}