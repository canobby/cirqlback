import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Users, 
  Gift, 
  Target, 
  Calendar,
  MapPin,
  DollarSign,
  Heart,
  Coffee,
  ShoppingBag,
  Utensils,
  Dumbbell,
  Palette,
  Car,
  Home,
  Briefcase,
  Crown,
  Zap,
  Share2,
  Plus,
  X,
  Check
} from "lucide-react";

interface CampaignTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  businessTypes: string[];
  collaborationType: 'solo' | 'partner' | 'network';
  rewards: {
    type: 'discount' | 'points' | 'freebie' | 'experience';
    value: string;
    description: string;
  }[];
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedROI: string;
}

const campaignTemplates: CampaignTemplate[] = [
  {
    id: 'coffee_loyalty',
    name: 'Coffee Loyalty Punch Card',
    category: 'Loyalty',
    description: 'Classic punch card system - buy 9, get 10th free',
    icon: Coffee,
    businessTypes: ['cafe', 'bakery', 'restaurant'],
    collaborationType: 'solo',
    rewards: [
      { type: 'freebie', value: 'Free Coffee', description: 'Complimentary medium coffee after 9 purchases' }
    ],
    duration: '30 days',
    difficulty: 'easy',
    estimatedROI: '15-25%'
  },
  {
    id: 'local_discovery',
    name: 'Local Discovery Trail',
    category: 'Cross-Business',
    description: 'Partner with 3-5 local businesses for a discovery challenge',
    icon: MapPin,
    businessTypes: ['all'],
    collaborationType: 'network',
    rewards: [
      { type: 'discount', value: '20% off', description: 'Discount at each participating business' },
      { type: 'experience', value: 'VIP Experience', description: 'Exclusive behind-the-scenes tour' }
    ],
    duration: '60 days',
    difficulty: 'medium',
    estimatedROI: '30-50%'
  },
  {
    id: 'fitness_buddy',
    name: 'Workout Buddy Challenge',
    category: 'Team Challenge',
    description: 'Bring a friend challenge with escalating rewards',
    icon: Dumbbell,
    businessTypes: ['gym', 'fitness', 'wellness'],
    collaborationType: 'partner',
    rewards: [
      { type: 'discount', value: '50% off', description: 'Partner gets 50% off first month' },
      { type: 'freebie', value: 'Free Personal Training', description: 'Complimentary PT session for referrer' }
    ],
    duration: '45 days',
    difficulty: 'medium',
    estimatedROI: '40-60%'
  },
  {
    id: 'seasonal_feast',
    name: 'Seasonal Taste Tour',
    category: 'Seasonal',
    description: 'Multi-restaurant seasonal menu exploration',
    icon: Utensils,
    businessTypes: ['restaurant', 'cafe', 'bar'],
    collaborationType: 'network',
    rewards: [
      { type: 'discount', value: '15% off', description: 'Discount on seasonal items at each location' },
      { type: 'experience', value: "Chef's Table", description: 'Exclusive chef experience at final restaurant' }
    ],
    duration: '90 days',
    difficulty: 'hard',
    estimatedROI: '35-55%'
  },
  {
    id: 'first_visit',
    name: 'New Customer Welcome',
    category: 'Acquisition',
    description: 'Special offer for first-time customers',
    icon: Gift,
    businessTypes: ['all'],
    collaborationType: 'solo',
    rewards: [
      { type: 'discount', value: '25% off', description: 'First purchase discount' },
      { type: 'freebie', value: 'Welcome Gift', description: 'Small branded item or sample' }
    ],
    duration: 'Ongoing',
    difficulty: 'easy',
    estimatedROI: '20-35%'
  },
  {
    id: 'milestone_celebration',
    name: 'Business Milestone Celebration',
    category: 'Event',
    description: 'Celebrate business anniversaries or achievements',
    icon: Crown,
    businessTypes: ['all'],
    collaborationType: 'partner',
    rewards: [
      { type: 'discount', value: '30% off', description: 'Anniversary celebration discount' },
      { type: 'experience', value: 'VIP Event Access', description: 'Exclusive celebration event invitation' }
    ],
    duration: '14 days',
    difficulty: 'medium',
    estimatedROI: '25-45%'
  }
];

const businessCategories = [
  { value: 'restaurant', label: 'Restaurant & Food', icon: Utensils },
  { value: 'retail', label: 'Retail & Shopping', icon: ShoppingBag },
  { value: 'fitness', label: 'Fitness & Wellness', icon: Dumbbell },
  { value: 'services', label: 'Professional Services', icon: Briefcase },
  { value: 'entertainment', label: 'Entertainment & Arts', icon: Palette },
  { value: 'automotive', label: 'Automotive', icon: Car },
  { value: 'home', label: 'Home & Garden', icon: Home },
  { value: 'other', label: 'Other', icon: Sparkles }
];

export default function CampaignBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    businessCategory: '',
    collaborationType: 'solo' as 'solo' | 'partner' | 'network',
    isOpen: false,
    maxPartners: 5,
    duration: 30,
    targetAudience: '',
    rewards: [] as Array<{
      type: 'discount' | 'points' | 'freebie' | 'experience';
      value: string;
      description: string;
    }>
  });
  const [partnerBusinesses, setPartnerBusinesses] = useState<Array<{id: string, name: string, category: string}>>([]);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const { toast } = useToast();

  const handleTemplateSelect = (template: CampaignTemplate) => {
    setSelectedTemplate(template);
    setCampaignData({
      ...campaignData,
      name: template.name,
      description: template.description,
      collaborationType: template.collaborationType as 'solo' | 'partner' | 'network',
      rewards: template.rewards
    });
  };

  const generateAISuggestion = () => {
    const suggestions = [
      "Create a 'Coffee & Code' campaign targeting remote workers with coding bootcamp partnerships",
      "Design a 'Healthy Habit Stack' combining gym, smoothie bar, and wellness clinic visits",
      "Build a 'Date Night Discovery' trail featuring restaurant, entertainment, and dessert spots",
      "Launch a 'Small Business Saturday' network campaign with 10+ local businesses",
      "Develop a 'Seasonal Wellness Journey' with spa, yoga studio, and organic market collaboration"
    ];
    
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    setAiSuggestion(randomSuggestion);
    setShowAIBuilder(true);
  };

  const addPartnerBusiness = (business: {id: string, name: string, category: string}) => {
    if (partnerBusinesses.length < campaignData.maxPartners) {
      setPartnerBusinesses([...partnerBusinesses, business]);
      toast({
        title: "Partner Added",
        description: `${business.name} has been added to your campaign`
      });
    }
  };

  const removePartnerBusiness = (businessId: string) => {
    setPartnerBusinesses(partnerBusinesses.filter(b => b.id !== businessId));
  };

  const createCampaign = () => {
    toast({
      title: "Campaign Created!",
      description: `${campaignData.name} is now live with ${partnerBusinesses.length} partners`
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCollaborationIcon = (type: string) => {
    switch (type) {
      case 'solo': return <Target className="h-4 w-4" />;
      case 'partner': return <Users className="h-4 w-4" />;
      case 'network': return <Share2 className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaign Builder</h1>
          <p className="text-gray-600">Create engaging campaigns with pre-made templates, AI suggestions, or custom designs</p>
        </div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="ai-builder">AI Builder</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="collaboration">Partners</TabsTrigger>
          </TabsList>

          {/* Template Selection */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Pre-Made Campaign Templates</h2>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {campaignTemplates.length} Templates Available
              </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {campaignTemplates.map((template) => {
                const IconComponent = template.icon;
                return (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id 
                        ? 'ring-2 ring-purple-500 bg-purple-50' 
                        : 'hover:shadow-lg'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white">
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <span className="text-sm font-semibold">{template.name}</span>
                        </div>
                        {selectedTemplate?.id === template.id && (
                          <Check className="h-5 w-5 text-purple-600" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">{template.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{template.category}</Badge>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          {getCollaborationIcon(template.collaborationType)}
                          <span className="capitalize">{template.collaborationType}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Duration:</span>
                          <span>{template.duration}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Est. ROI:</span>
                          <span className="text-green-600 font-semibold">{template.estimatedROI}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge className={getDifficultyColor(template.difficulty)}>
                          {template.difficulty}
                        </Badge>
                        <div className="text-xs text-purple-600">
                          {template.rewards.length} reward{template.rewards.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {selectedTemplate && (
              <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                    Selected: {selectedTemplate.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-semibold">Rewards Included:</Label>
                      <div className="space-y-2 mt-2">
                        {selectedTemplate.rewards.map((reward, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <Gift className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">{reward.value}</span>
                            <span className="text-gray-600">- {reward.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Compatible Business Types:</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedTemplate.businessTypes.map((type, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {type === 'all' ? 'Any Business' : type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    onClick={() => setCampaignData({...campaignData, name: selectedTemplate.name, description: selectedTemplate.description})}
                  >
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Builder */}
          <TabsContent value="ai-builder" className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold">AI Campaign Builder</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Let our AI analyze your business type, location, and goals to suggest unique campaign ideas
              </p>
              
              <Button 
                onClick={generateAISuggestion}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Generate AI Campaign Idea
              </Button>
            </div>

            {showAIBuilder && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-blue-600" />
                    AI Suggestion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{aiSuggestion}</p>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => setCampaignData({...campaignData, description: aiSuggestion})}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Use This Idea
                    </Button>
                    <Button variant="outline" onClick={generateAISuggestion}>
                      Generate Another
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Custom Builder */}
          <TabsContent value="custom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData({...campaignData, name: e.target.value})}
                      placeholder="Enter campaign name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="business-category">Business Category</Label>
                    <Select value={campaignData.businessCategory} onValueChange={(value) => setCampaignData({...campaignData, businessCategory: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessCategories.map((category) => {
                          const IconComponent = category.icon;
                          return (
                            <SelectItem key={category.value} value={category.value}>
                              <div className="flex items-center">
                                <IconComponent className="h-4 w-4 mr-2" />
                                {category.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-description">Campaign Description</Label>
                  <Textarea
                    id="campaign-description"
                    value={campaignData.description}
                    onChange={(e) => setCampaignData({...campaignData, description: e.target.value})}
                    placeholder="Describe your campaign goals and mechanics"
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Campaign Type</Label>
                    <Select value={campaignData.collaborationType} onValueChange={(value: 'solo' | 'partner' | 'network') => setCampaignData({...campaignData, collaborationType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo">Solo Campaign</SelectItem>
                        <SelectItem value="partner">Partner Campaign</SelectItem>
                        <SelectItem value="network">Network Campaign</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={campaignData.duration}
                      onChange={(e) => setCampaignData({...campaignData, duration: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-partners">Max Partners</Label>
                    <Input
                      id="max-partners"
                      type="number"
                      value={campaignData.maxPartners}
                      onChange={(e) => setCampaignData({...campaignData, maxPartners: parseInt(e.target.value)})}
                      disabled={campaignData.collaborationType === 'solo'}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={campaignData.isOpen}
                    onCheckedChange={(checked) => setCampaignData({...campaignData, isOpen: checked})}
                  />
                  <Label>Open for other businesses to join</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Collaboration Management */}
          <TabsContent value="collaboration" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Campaign Partners</h2>
              <Badge variant="outline">
                {partnerBusinesses.length}/{campaignData.maxPartners} Partners
              </Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Partner Business
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Search and invite local businesses to join your campaign
                  </p>
                  <Input placeholder="Search businesses by name or category" />
                  
                  {/* Mock search results */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                          <Coffee className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">Bean There Cafe</p>
                          <p className="text-xs text-gray-500">Coffee Shop • 0.3 miles</p>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => addPartnerBusiness({id: 'bean-there', name: 'Bean There Cafe', category: 'Coffee Shop'})}
                      >
                        Invite
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <Utensils className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">Fresh Garden Bistro</p>
                          <p className="text-xs text-gray-500">Restaurant • 0.5 miles</p>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => addPartnerBusiness({id: 'fresh-garden', name: 'Fresh Garden Bistro', category: 'Restaurant'})}
                      >
                        Invite
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Current Partners
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {partnerBusinesses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No partners added yet</p>
                      <p className="text-sm">Invite businesses to collaborate</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {partnerBusinesses.map((business) => (
                        <div key={business.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <div>
                            <p className="font-medium">{business.name}</p>
                            <p className="text-xs text-gray-500">{business.category}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removePartnerBusiness(business.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Campaign Button */}
        <div className="flex justify-center pt-6">
          <Button
            onClick={createCampaign}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8"
            disabled={!campaignData.name || !campaignData.description}
          >
            <Target className="h-5 w-5 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>
    </div>
  );
}