import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building2, 
  Save, 
  Heart, 
  Globe, 
  Users, 
  Leaf,
  Shield,
  Star
} from "lucide-react";

interface BusinessDescriptors {
  businessDescriptors: string[];
  culturalBackground: string;
  communityFocus: string[];
  accessibilityFeatures: string[];
  sustainabilityPractices: string[];
  businessMaturity: string;
  establishmentType: string[];
  specialtyFeatures: string[];
  priceRange: string;
  // Enhanced marketing fields
  targetDemographics: string[];
  peakHours: string[];
  seasonalPatterns: string[];
  customerCapacity: number;
  averageVisitDuration: string;
  primaryProducts: string[];
  uniqueSellingPoints: string[];
  competitorAdvantages: string[];
  marketingGoals: string[];
  customerRetentionRate: string;
  averageSpendPerCustomer: string;
  socialMediaPresence: string[];
  eventHostingCapability: boolean;
  loyaltyProgramInterest: string;
  marketingBudget: string;
}

export default function BusinessSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [descriptors, setDescriptors] = useState<BusinessDescriptors>({
    businessDescriptors: [],
    culturalBackground: "",
    communityFocus: [],
    accessibilityFeatures: [],
    sustainabilityPractices: [],
    businessMaturity: "",
    establishmentType: [],
    specialtyFeatures: [],
    priceRange: "",
    // Enhanced marketing fields
    targetDemographics: [],
    peakHours: [],
    seasonalPatterns: [],
    customerCapacity: 0,
    averageVisitDuration: "",
    primaryProducts: [],
    uniqueSellingPoints: [],
    competitorAdvantages: [],
    marketingGoals: [],
    customerRetentionRate: "",
    averageSpendPerCustomer: "",
    socialMediaPresence: [],
    eventHostingCapability: false,
    loyaltyProgramInterest: "",
    marketingBudget: ""
  });

  // Available descriptor options
  const businessDescriptorOptions = [
    "Women-owned business",
    "Minority-owned business", 
    "LGBTQ+ owned business",
    "Veteran-owned business",
    "Family-owned business",
    "Local entrepreneur",
    "Social enterprise",
    "B-Corp certified"
  ];

  const culturalBackgroundOptions = [
    "African American heritage",
    "Hispanic/Latino heritage", 
    "Asian heritage",
    "Native American heritage",
    "Middle Eastern heritage",
    "European heritage",
    "Mixed cultural heritage",
    "International cuisine focus",
    "Local cultural traditions"
  ];

  const communityFocusOptions = [
    "Youth programs",
    "Senior community support",
    "Educational partnerships",
    "Local artist support",
    "Community events hosting",
    "Charity partnerships",
    "Local employment focus",
    "Community gathering space",
    "Cultural celebration hosting"
  ];

  const accessibilityOptions = [
    "Wheelchair accessible",
    "ASL interpretation available",
    "Braille menus available",
    "Service animal friendly",
    "Sensory-friendly environment",
    "Large print materials",
    "Audio descriptions available",
    "Quiet spaces available"
  ];

  const sustainabilityOptions = [
    "Locally sourced ingredients",
    "Organic products",
    "Zero waste practices",
    "Renewable energy use",
    "Eco-friendly packaging",
    "Recycling programs",
    "Community garden support",
    "Fair trade partnerships"
  ];

  const businessMaturityOptions = [
    "New business (under 2 years)",
    "Established business (2-10 years)",
    "Veteran business (10+ years)",
    "Legacy business (20+ years)",
    "Multi-generational family business"
  ];

  const establishmentTypeOptions = [
    "Independent local business",
    "Small chain (2-5 locations)",
    "Regional chain",
    "Franchise location",
    "Pop-up business",
    "Seasonal business",
    "Home-based business",
    "Mobile business/food truck",
    "Co-op or collective"
  ];

  const specialtyFeaturesOptions = [
    "24/7 operation",
    "Delivery available",
    "Online ordering",
    "Outdoor seating",
    "Live entertainment",
    "Pet-friendly",
    "Kid-friendly",
    "Group bookings",
    "Private events",
    "Catering services",
    "WiFi available",
    "Parking available",
    "Public transportation accessible",
    "Tourist attraction nearby",
    "Historic building/location"
  ];

  const priceRangeOptions = [
    "Budget-friendly ($)",
    "Moderate ($$)",
    "Premium ($$$)",
    "Luxury ($$$$)"
  ];

  const targetDemographicsOptions = [
    "Families with children",
    "Young professionals (25-35)",
    "Students",
    "Seniors (55+)",
    "Millennials",
    "Gen Z",
    "Working parents",
    "Empty nesters",
    "First-time visitors",
    "Regular locals",
    "Business travelers",
    "Tourists",
    "Date night couples",
    "Friend groups",
    "Solo diners/shoppers"
  ];

  const peakHoursOptions = [
    "Early morning (6-9 AM)",
    "Mid-morning (9-11 AM)",
    "Lunch hours (11 AM-2 PM)",
    "Afternoon (2-5 PM)",
    "Happy hour (5-7 PM)",
    "Dinner time (7-9 PM)",
    "Late evening (9-11 PM)",
    "Weekend mornings",
    "Weekend evenings",
    "Weekdays only",
    "24/7 operation"
  ];

  const seasonalPatternsOptions = [
    "Spring surge",
    "Summer peak",
    "Fall boost",
    "Winter slow",
    "Holiday rush",
    "Back-to-school busy",
    "Tourist season dependent",
    "Weather dependent",
    "Event-driven traffic",
    "Consistent year-round"
  ];

  const primaryProductsOptions = [
    "Food & beverages",
    "Retail merchandise",
    "Professional services",
    "Entertainment",
    "Health & wellness",
    "Personal care",
    "Home & garden",
    "Technology & electronics",
    "Art & crafts",
    "Books & media",
    "Clothing & accessories",
    "Sports & recreation",
    "Automotive services",
    "Education & training"
  ];

  const uniqueSellingPointsOptions = [
    "Handmade/artisanal products",
    "Locally sourced ingredients",
    "Award-winning quality",
    "Fastest service in area",
    "Largest selection",
    "Best prices guaranteed",
    "Expert consultation",
    "Customization available",
    "Same-day service",
    "Family recipes/tradition",
    "Eco-friendly approach",
    "Latest technology",
    "Personalized experience",
    "Community gathering space",
    "Educational workshops"
  ];

  const marketingGoalsOptions = [
    "Increase foot traffic",
    "Build brand awareness",
    "Attract new customers",
    "Improve customer retention",
    "Boost average spending",
    "Launch new products",
    "Compete with chains",
    "Seasonal promotions",
    "Community engagement",
    "Social media growth",
    "Customer education",
    "Loyalty program adoption",
    "Event promotion",
    "Cross-selling opportunities"
  ];

  const socialMediaPresenceOptions = [
    "Instagram active",
    "Facebook business page",
    "TikTok content creator",
    "Twitter/X updates",
    "LinkedIn professional",
    "YouTube channel",
    "Google My Business",
    "Yelp presence",
    "Pinterest boards",
    "Snapchat geofilters",
    "Local blogger partnerships",
    "Influencer collaborations"
  ];

  const updateDescriptorsMutation = useMutation({
    mutationFn: async (data: BusinessDescriptors) => {
      return await apiRequest("PUT", "/api/business/descriptors", data);
    },
    onSuccess: () => {
      toast({
        title: "Business profile updated",
        description: "Your business descriptors have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/business/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update business descriptors. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckboxChange = (category: keyof BusinessDescriptors, value: string, checked: boolean) => {
    setDescriptors(prev => ({
      ...prev,
      [category]: checked 
        ? [...(prev[category] as string[]), value]
        : (prev[category] as string[]).filter(item => item !== value)
    }));
  };

  const handleSave = () => {
    updateDescriptorsMutation.mutate(descriptors);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <span>Business Profile & Community</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Help us understand your business better to connect you with relevant community challenges and partnerships. 
          All information is optional and used only for better matching opportunities.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <span>Business Identity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Business characteristics (select all that apply)</Label>
              <div className="grid grid-cols-1 gap-2">
                {businessDescriptorOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={descriptors.businessDescriptors.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('businessDescriptors', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={option} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="cultural-background" className="text-sm font-medium">Cultural heritage or cuisine focus</Label>
              <Select 
                value={descriptors.culturalBackground} 
                onValueChange={(value) => setDescriptors(prev => ({ ...prev, culturalBackground: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cultural background (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {culturalBackgroundOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Community Focus */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span>Community Involvement</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Community focus areas</Label>
              <div className="grid grid-cols-1 gap-2">
                {communityFocusOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`community-${option}`}
                      checked={descriptors.communityFocus.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('communityFocus', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`community-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span>Accessibility Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Accessibility accommodations</Label>
              <div className="grid grid-cols-1 gap-2">
                {accessibilityOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`accessibility-${option}`}
                      checked={descriptors.accessibilityFeatures.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('accessibilityFeatures', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`accessibility-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sustainability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Leaf className="h-5 w-5 text-green-600" />
              <span>Sustainability Practices</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Environmental and social practices</Label>
              <div className="grid grid-cols-1 gap-2">
                {sustainabilityOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sustainability-${option}`}
                      checked={descriptors.sustainabilityPractices.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('sustainabilityPractices', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`sustainability-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Maturity & Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span>Business Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="business-maturity" className="text-sm font-medium">Business maturity</Label>
              <Select 
                value={descriptors.businessMaturity} 
                onValueChange={(value) => setDescriptors(prev => ({ ...prev, businessMaturity: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How long has your business been operating?" />
                </SelectTrigger>
                <SelectContent>
                  {businessMaturityOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="price-range" className="text-sm font-medium">Price range</Label>
              <Select 
                value={descriptors.priceRange} 
                onValueChange={(value) => setDescriptors(prev => ({ ...prev, priceRange: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="What's your typical price range?" />
                </SelectTrigger>
                <SelectContent>
                  {priceRangeOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Establishment type</Label>
              <div className="grid grid-cols-1 gap-2">
                {establishmentTypeOptions.slice(0, 5).map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`establishment-${option}`}
                      checked={descriptors.establishmentType.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('establishmentType', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`establishment-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Special Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>Special Features & Services</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">What makes your business special?</Label>
              <div className="grid grid-cols-1 gap-2">
                {specialtyFeaturesOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`specialty-${option}`}
                      checked={descriptors.specialtyFeatures.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('specialtyFeatures', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`specialty-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Marketing Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              <span>Marketing Intelligence</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Target demographics</Label>
              <div className="grid grid-cols-1 gap-2">
                {targetDemographicsOptions.slice(0, 8).map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`demographics-${option}`}
                      checked={descriptors.targetDemographics.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('targetDemographics', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`demographics-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Peak hours</Label>
              <div className="grid grid-cols-1 gap-2">
                {peakHoursOptions.slice(0, 6).map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`peak-${option}`}
                      checked={descriptors.peakHours.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('peakHours', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`peak-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer-capacity" className="text-sm font-medium">Customer capacity</Label>
                <input
                  type="number"
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  placeholder="Max customers"
                  value={descriptors.customerCapacity || ""}
                  onChange={(e) => setDescriptors(prev => ({ 
                    ...prev, 
                    customerCapacity: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="visit-duration" className="text-sm font-medium">Average visit duration</Label>
                <Select 
                  value={descriptors.averageVisitDuration} 
                  onValueChange={(value) => setDescriptors(prev => ({ ...prev, averageVisitDuration: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Typical visit length" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Under 15 minutes">Under 15 minutes</SelectItem>
                    <SelectItem value="15-30 minutes">15-30 minutes</SelectItem>
                    <SelectItem value="30-60 minutes">30-60 minutes</SelectItem>
                    <SelectItem value="1-2 hours">1-2 hours</SelectItem>
                    <SelectItem value="2+ hours">2+ hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Intelligence */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-indigo-600" />
              <span>Business Intelligence</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Primary products/services</Label>
              <div className="grid grid-cols-1 gap-2">
                {primaryProductsOptions.slice(0, 7).map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`products-${option}`}
                      checked={descriptors.primaryProducts.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('primaryProducts', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`products-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Unique selling points</Label>
              <div className="grid grid-cols-1 gap-2">
                {uniqueSellingPointsOptions.slice(0, 8).map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`usp-${option}`}
                      checked={descriptors.uniqueSellingPoints.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('uniqueSellingPoints', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`usp-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="retention-rate" className="text-sm font-medium">Customer retention rate</Label>
                <Select 
                  value={descriptors.customerRetentionRate} 
                  onValueChange={(value) => setDescriptors(prev => ({ ...prev, customerRetentionRate: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Estimated retention" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Under 25%">Under 25%</SelectItem>
                    <SelectItem value="25-50%">25-50%</SelectItem>
                    <SelectItem value="50-75%">50-75%</SelectItem>
                    <SelectItem value="75%+">75%+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="average-spend" className="text-sm font-medium">Average spend per customer</Label>
                <Select 
                  value={descriptors.averageSpendPerCustomer} 
                  onValueChange={(value) => setDescriptors(prev => ({ ...prev, averageSpendPerCustomer: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Average transaction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Under $15">Under $15</SelectItem>
                    <SelectItem value="$15-$30">$15-$30</SelectItem>
                    <SelectItem value="$30-$50">$30-$50</SelectItem>
                    <SelectItem value="$50-$100">$50-$100</SelectItem>
                    <SelectItem value="$100+">$100+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Marketing Goals & Strategy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-pink-600" />
              <span>Marketing Strategy</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Marketing goals</Label>
              <div className="grid grid-cols-1 gap-2">
                {marketingGoalsOptions.slice(0, 7).map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`goals-${option}`}
                      checked={descriptors.marketingGoals.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('marketingGoals', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`goals-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Social media presence</Label>
              <div className="grid grid-cols-1 gap-2">
                {socialMediaPresenceOptions.slice(0, 6).map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`social-${option}`}
                      checked={descriptors.socialMediaPresence.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('socialMediaPresence', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`social-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="loyalty-interest" className="text-sm font-medium">Loyalty program interest</Label>
                <Select 
                  value={descriptors.loyaltyProgramInterest} 
                  onValueChange={(value) => setDescriptors(prev => ({ ...prev, loyaltyProgramInterest: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Interest level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Very interested">Very interested</SelectItem>
                    <SelectItem value="Somewhat interested">Somewhat interested</SelectItem>
                    <SelectItem value="Not sure">Not sure</SelectItem>
                    <SelectItem value="Not interested">Not interested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="marketing-budget" className="text-sm font-medium">Monthly marketing budget</Label>
                <Select 
                  value={descriptors.marketingBudget} 
                  onValueChange={(value) => setDescriptors(prev => ({ ...prev, marketingBudget: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Under $100">Under $100</SelectItem>
                    <SelectItem value="$100-$500">$100-$500</SelectItem>
                    <SelectItem value="$500-$1000">$500-$1000</SelectItem>
                    <SelectItem value="$1000-$2500">$1000-$2500</SelectItem>
                    <SelectItem value="$2500+">$2500+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="event-hosting"
                checked={descriptors.eventHostingCapability}
                onCheckedChange={(checked) => 
                  setDescriptors(prev => ({ ...prev, eventHostingCapability: checked as boolean }))
                }
              />
              <Label htmlFor="event-hosting" className="text-sm">Can host events or workshops</Label>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">How this information is used:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Connect your business with relevant community challenges and partnerships</li>
              <li>• Group businesses with similar values for collaborative marketing opportunities</li>
              <li>• Help customers discover businesses that align with their values</li>
              <li>• Create inclusive tap trails and community events</li>
              <li>• All businesses receive equal treatment regardless of descriptors</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={updateDescriptorsMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateDescriptorsMutation.isPending ? "Saving..." : "Save Business Profile"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}