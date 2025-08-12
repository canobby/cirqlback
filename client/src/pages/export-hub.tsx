import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Download, 
  FileText, 
  BarChart3, 
  Database, 
  Settings, 
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  ExternalLink,
  Crown,
  Lock,
  CheckCircle
} from "lucide-react";

interface ExportData {
  dateRange: string;
  format: string;
  includeCustomerData: boolean;
  includeFinancialData: boolean;
  includeAnalytics: boolean;
  includeCampaignData: boolean;
}

export default function ExportHub() {
  const { toast } = useToast();
  const [exportData, setExportData] = useState<ExportData>({
    dateRange: "last-30-days",
    format: "csv",
    includeCustomerData: true,
    includeFinancialData: true,
    includeAnalytics: true,
    includeCampaignData: true
  });

  const { data: userProfile } = useQuery({
    queryKey: ["/api/profile"]
  });

  const isPremium = userProfile?.subscriptionTier === "professional" || 
                   userProfile?.subscriptionTier === "business" || 
                   userProfile?.subscriptionTier === "enterprise";

  const exportMutation = useMutation({
    mutationFn: (data: { type: string; config: any }) => 
      apiRequest("POST", "/api/exports/generate", data),
    onSuccess: (data) => {
      toast({
        title: "Export Generated Successfully",
        description: "Your export is ready for download.",
      });
      // Trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      link.click();
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "There was an error generating your export.",
        variant: "destructive",
      });
    }
  });

  const integrationMutation = useMutation({
    mutationFn: (platform: string) => 
      apiRequest("POST", `/api/integrations/${platform}/connect`),
    onSuccess: (data) => {
      toast({
        title: "Integration Initiated",
        description: "Redirecting to platform authentication...",
      });
      window.open(data.authUrl, '_blank');
    }
  });

  const exportFormats = [
    { value: "csv", label: "CSV (Excel Compatible)", icon: FileText },
    { value: "xlsx", label: "Excel Workbook", icon: FileText },
    { value: "pdf", label: "PDF Report", icon: FileText },
    { value: "json", label: "JSON Data", icon: Database }
  ];

  const dateRanges = [
    { value: "last-7-days", label: "Last 7 Days" },
    { value: "last-30-days", label: "Last 30 Days" },
    { value: "last-90-days", label: "Last 90 Days" },
    { value: "last-6-months", label: "Last 6 Months" },
    { value: "last-year", label: "Last Year" },
    { value: "all-time", label: "All Time" }
  ];

  const quickExports = [
    {
      title: "Customer Database",
      description: "Complete customer profiles, contact info, and engagement history",
      icon: Users,
      type: "customers",
      premium: false
    },
    {
      title: "Financial Summary",
      description: "Revenue, transactions, and payment analytics",
      icon: DollarSign,
      type: "financial",
      premium: true
    },
    {
      title: "Campaign Analytics",
      description: "Performance metrics, ROI, and engagement data",
      icon: BarChart3,
      type: "campaigns",
      premium: false
    },
    {
      title: "Business Intelligence Report",
      description: "Comprehensive analysis with insights and recommendations",
      icon: TrendingUp,
      type: "business-intelligence",
      premium: true
    }
  ];

  const integrationPlatforms = [
    {
      name: "QuickBooks",
      description: "Export financial data directly to QuickBooks for accounting",
      icon: "📊",
      category: "Accounting",
      premium: true,
      features: ["Revenue tracking", "Customer invoicing", "Tax reporting", "Expense categorization"]
    },
    {
      name: "Xero",
      description: "Cloud accounting integration for small-medium businesses",
      icon: "💼",
      category: "Accounting", 
      premium: true,
      features: ["Bank reconciliation", "Invoice automation", "Financial reports", "Tax compliance"]
    },
    {
      name: "Mailchimp",
      description: "Sync customer data for targeted email marketing campaigns",
      icon: "🐵",
      category: "Email Marketing",
      premium: false,
      features: ["Customer segmentation", "Automated campaigns", "Analytics sync", "List management"]
    },
    {
      name: "Constant Contact",
      description: "Email marketing with event management integration",
      icon: "📧",
      category: "Email Marketing",
      premium: false,
      features: ["Event promotion", "Customer surveys", "Social media integration", "Contact management"]
    },
    {
      name: "HubSpot",
      description: "CRM integration for comprehensive customer relationship management",
      icon: "🧡",
      category: "CRM",
      premium: true,
      features: ["Lead tracking", "Sales pipeline", "Customer journey", "Revenue attribution"]
    },
    {
      name: "Salesforce",
      description: "Enterprise CRM for advanced customer relationship management",
      icon: "☁️",
      category: "Enterprise CRM",
      premium: true,
      features: ["Lead management", "Opportunity tracking", "Custom reporting", "Automation"]
    },
    {
      name: "Google Analytics",
      description: "Enhanced analytics with Cirqlback customer behavior data",
      icon: "📈",
      category: "Analytics",
      premium: false,
      features: ["Customer journey tracking", "Conversion attribution", "Audience insights", "ROI analysis"]
    },
    {
      name: "Facebook Business",
      description: "Social media advertising with customer data integration",
      icon: "📱",
      category: "Social Media",
      premium: false,
      features: ["Custom audiences", "Lookalike targeting", "Ad performance", "Social insights"]
    },
    {
      name: "Shopify",
      description: "E-commerce integration for online store analytics",
      icon: "🛒",
      category: "E-commerce",
      premium: true,
      features: ["Product performance", "Customer sync", "Inventory insights", "Sales analysis"]
    },
    {
      name: "WooCommerce",
      description: "WordPress e-commerce integration for online stores",
      icon: "🛍️",
      category: "E-commerce",
      premium: true,
      features: ["Order management", "Customer behavior", "Product analytics", "Sales reporting"]
    },
    {
      name: "Square",
      description: "Point-of-sale system integration for retail businesses",
      icon: "⚡",
      category: "POS Systems",
      premium: true,
      features: ["Transaction sync", "Inventory management", "Customer profiles", "Sales reporting"]
    },
    {
      name: "Toast POS",
      description: "Restaurant POS integration for food service businesses",
      icon: "🍽️",
      category: "POS Systems",
      premium: true,
      features: ["Menu management", "Order tracking", "Customer preferences", "Revenue analysis"]
    },
    {
      name: "Stripe",
      description: "Payment processing integration with detailed transaction data",
      icon: "💳",
      category: "Payments",
      premium: false,
      features: ["Payment tracking", "Subscription management", "Customer billing", "Revenue analytics"]
    },
    {
      name: "PayPal Business",
      description: "PayPal integration for transaction and customer management",
      icon: "💰",
      category: "Payments",
      premium: false,
      features: ["Transaction history", "Customer insights", "Refund management", "Sales tracking"]
    },
    {
      name: "Yelp Business",
      description: "Reputation management with review and rating integration",
      icon: "⭐",
      category: "Reviews",
      premium: false,
      features: ["Review monitoring", "Rating analytics", "Customer feedback", "Reputation tracking"]
    },
    {
      name: "Google My Business",
      description: "Local business presence with customer interaction data",
      icon: "📍",
      category: "Local Business",
      premium: false,
      features: ["Location insights", "Customer photos", "Review management", "Local search data"]
    },
    {
      name: "Hootsuite",
      description: "Social media management with customer engagement tracking",
      icon: "🐦",
      category: "Social Media",
      premium: true,
      features: ["Post scheduling", "Engagement analytics", "Customer interactions", "Social listening"]
    },
    {
      name: "Buffer",
      description: "Social media scheduling with performance analytics",
      icon: "📲",
      category: "Social Media",
      premium: true,
      features: ["Content planning", "Analytics dashboard", "Team collaboration", "Engagement tracking"]
    },
    {
      name: "Canva",
      description: "Design integration for marketing materials and campaigns",
      icon: "🎨",
      category: "Design",
      premium: false,
      features: ["Template access", "Brand consistency", "Campaign materials", "Visual content"]
    },
    {
      name: "Zapier",
      description: "Workflow automation connecting Cirqlback to 5000+ apps",
      icon: "⚙️",
      category: "Automation",
      premium: true,
      features: ["Custom workflows", "Data synchronization", "Task automation", "Multi-app integration"]
    },
    {
      name: "Slack",
      description: "Team communication with customer activity notifications",
      icon: "💬",
      category: "Communication",
      premium: false,
      features: ["Real-time alerts", "Team notifications", "Customer updates", "Integration reports"]
    },
    {
      name: "Microsoft Teams",
      description: "Business communication with customer data integration",
      icon: "👥",
      category: "Communication",
      premium: false,
      features: ["Team collaboration", "Customer insights", "Data sharing", "Meeting integration"]
    }
  ];

  const handleQuickExport = (type: string) => {
    if (!isPremium && quickExports.find(item => item.type === type)?.premium) {
      toast({
        title: "Premium Feature",
        description: "This export requires a Premium subscription.",
        variant: "destructive",
      });
      return;
    }

    exportMutation.mutate({
      type,
      config: exportData
    });
  };

  const handleIntegrationConnect = (platform: string) => {
    const platformData = integrationPlatforms.find(p => p.name === platform);
    if (!isPremium && platformData?.premium) {
      toast({
        title: "Premium Feature",
        description: "This integration requires a Premium subscription.",
        variant: "destructive",
      });
      return;
    }

    integrationMutation.mutate(platform.toLowerCase());
  };

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardContent className="p-8 text-center">
              <Crown className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Export & Integration Hub</h2>
              <p className="text-lg text-gray-600 mb-6">
                Premium subscribers get powerful export capabilities and platform integrations for QuickBooks, 
                marketing tools, and comprehensive business reporting.
              </p>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-8 py-3">
                <Crown className="h-5 w-5 mr-2" />
                Upgrade to Premium
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-purple-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Export & Integration Hub
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Export your business data, generate comprehensive reports, and integrate with leading 
            accounting and marketing platforms to streamline your operations.
          </p>
        </div>

        <Tabs defaultValue="exports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="exports">Data Exports</TabsTrigger>
            <TabsTrigger value="integrations">Platform Integrations</TabsTrigger>
            <TabsTrigger value="reports">Business Reports</TabsTrigger>
          </TabsList>

          {/* Data Exports Tab */}
          <TabsContent value="exports" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Quick Exports
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {quickExports.map((exportItem, index) => {
                        const Icon = exportItem.icon;
                        return (
                          <Card key={index} className="relative">
                            <CardContent className="p-4">
                              {exportItem.premium && (
                                <Badge className="absolute top-2 right-2 bg-purple-600">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Premium
                                </Badge>
                              )}
                              <Icon className="h-8 w-8 text-purple-600 mb-3" />
                              <h4 className="font-semibold mb-2">{exportItem.title}</h4>
                              <p className="text-sm text-gray-600 mb-4">{exportItem.description}</p>
                              <Button 
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                onClick={() => handleQuickExport(exportItem.type)}
                                disabled={exportMutation.isPending}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export Now
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Export Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="date-range">Date Range</Label>
                      <Select value={exportData.dateRange} onValueChange={(value) => 
                        setExportData({...exportData, dateRange: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dateRanges.map(range => (
                            <SelectItem key={range.value} value={range.value}>
                              {range.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="format">Export Format</Label>
                      <Select value={exportData.format} onValueChange={(value) => 
                        setExportData({...exportData, format: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {exportFormats.map(format => (
                            <SelectItem key={format.value} value={format.value}>
                              {format.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Include Data Types</Label>
                      <div className="space-y-2">
                        {[
                          { key: 'includeCustomerData', label: 'Customer Data' },
                          { key: 'includeFinancialData', label: 'Financial Data' },
                          { key: 'includeAnalytics', label: 'Analytics Data' },
                          { key: 'includeCampaignData', label: 'Campaign Data' }
                        ].map(item => (
                          <label key={item.key} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={exportData[item.key as keyof ExportData] as boolean}
                              onChange={(e) => setExportData({
                                ...exportData, 
                                [item.key]: e.target.checked
                              })}
                            />
                            <span className="text-sm">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Platform Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrationPlatforms.map((platform, index) => (
                <Card key={index} className="relative">
                  <CardContent className="p-6">
                    {platform.premium && (
                      <Badge className="absolute top-4 right-4 bg-purple-600">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-2xl">{platform.icon}</div>
                      <div>
                        <h4 className="font-semibold">{platform.name}</h4>
                        <Badge variant="outline" className="text-xs">{platform.category}</Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">{platform.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <Label className="text-xs font-medium">Key Features:</Label>
                      <ul className="text-xs space-y-1">
                        {platform.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      onClick={() => handleIntegrationConnect(platform.name)}
                      disabled={integrationMutation.isPending}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect to {platform.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Business Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Analytics Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Comprehensive analysis of your business performance including customer acquisition, 
                    retention rates, campaign effectiveness, and revenue trends.
                  </p>
                  <ul className="text-sm space-y-1 mb-4">
                    <li>• Customer acquisition and retention metrics</li>
                    <li>• Campaign ROI and performance analysis</li>
                    <li>• Revenue trends and forecasting</li>
                    <li>• Competitive positioning insights</li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Business Intelligence Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    AI-powered insights and recommendations based on your business data, 
                    industry benchmarks, and predictive analytics.
                  </p>
                  <ul className="text-sm space-y-1 mb-4">
                    <li>• AI-generated business insights</li>
                    <li>• Predictive analytics and forecasting</li>
                    <li>• Industry benchmark comparisons</li>
                    <li>• Actionable recommendations</li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Generate Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}