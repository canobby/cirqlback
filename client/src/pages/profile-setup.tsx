import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Briefcase,
  Users,
  Star,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";

interface ProfileData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contactName: string; // User specifically requested this
  
  // Business Information
  businessName: string;
  businessTitle: string; // User specifically requested this
  businessType: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessWebsite: string;
  businessHours: string;
  businessSize: string; // Solo, Small (2-10), Medium (11-50), Large (50+)
  
  // Financial & Payment Integration
  expectedMonthlyRevenue: string;
  averageTransactionValue: string;
  acceptsPayments: boolean;
  stripeConnected: boolean;
  taxId: string; // For payment processing compliance
  
  // Communication & Marketing
  preferredContactMethod: string;
  communicationLanguages: string[];
  socialMediaPresence: string[];
  marketingBudget: string;
  emailMarketingTool: string;
  
  // Analytics & Tracking Requirements
  googleAnalyticsId: string;
  facebookPixelId: string;
  trackingGoals: string[];
  dataPrivacyCompliance: boolean;
  
  // API & Integration Needs
  needsApiAccess: boolean;
  plannedIntegrations: string[];
  technicalContactName: string;
  technicalContactEmail: string;
  
  // AR/Gaming Profile
  gamificationInterest: boolean;
  arCampaignTypes: string[];
  rewardTypes: string[];
  
  // Partnership & Collaboration
  partnershipInterest: boolean;
  partnershipTypes: string[];
  crossPromotionWilling: boolean;
  referralProgramInterest: boolean;
  
  // Platform Information
  aboutBusiness: string;
  marketingGoals: string[];
  targetCustomers: string;
  currentChallenges: string[];
}

export default function ProfileSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    contactName: "",
    businessName: "",
    businessTitle: "",
    businessType: "",
    businessAddress: "",
    businessCity: "",
    businessState: "",
    businessZip: "",
    businessWebsite: "",
    businessHours: "",
    businessSize: "",
    expectedMonthlyRevenue: "",
    averageTransactionValue: "",
    acceptsPayments: false,
    stripeConnected: false,
    taxId: "",
    preferredContactMethod: "",
    communicationLanguages: [],
    socialMediaPresence: [],
    marketingBudget: "",
    emailMarketingTool: "",
    googleAnalyticsId: "",
    facebookPixelId: "",
    trackingGoals: [],
    dataPrivacyCompliance: false,
    needsApiAccess: false,
    plannedIntegrations: [],
    technicalContactName: "",
    technicalContactEmail: "",
    gamificationInterest: false,
    arCampaignTypes: [],
    rewardTypes: [],
    partnershipInterest: false,
    partnershipTypes: [],
    crossPromotionWilling: false,
    referralProgramInterest: false,
    aboutBusiness: "",
    marketingGoals: [],
    targetCustomers: "",
    currentChallenges: []
  });

  const businessTypes = [
    "Restaurant", "Coffee Shop", "Retail Store", "Salon/Spa", 
    "Fitness Center", "Medical Practice", "Legal Services", 
    "Real Estate", "Automotive", "Entertainment", "Other"
  ];

  const businessSizeOptions = [
    "Solo (Just me)", "Small (2-10 employees)", "Medium (11-50 employees)", "Large (50+ employees)"
  ];

  const revenueRanges = [
    "Under $5K/month", "$5K-$15K/month", "$15K-$50K/month", "$50K-$100K/month", "$100K+/month"
  ];

  const transactionRanges = [
    "Under $10", "$10-$25", "$25-$50", "$50-$100", "$100-$250", "$250+"
  ];

  const contactMethods = [
    "Email", "Phone", "Text/SMS", "In-Person", "Social Media"
  ];

  const languageOptions = [
    "English", "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese", "Other"
  ];

  const socialPlatforms = [
    "Facebook", "Instagram", "Twitter/X", "LinkedIn", "TikTok", "YouTube", "Pinterest", "Yelp"
  ];

  const marketingBudgetRanges = [
    "Under $500/month", "$500-$1,500/month", "$1,500-$5,000/month", "$5,000+/month"
  ];

  const trackingGoalOptions = [
    "Customer Acquisition", "Conversion Rates", "Customer Lifetime Value", "Return on Ad Spend", 
    "Foot Traffic", "Online Engagement", "Email Performance", "Social Media Metrics"
  ];

  const integrationOptions = [
    "Point of Sale (POS)", "Email Marketing", "Social Media", "E-commerce Platform", 
    "Customer Relationship Management (CRM)", "Inventory Management", "Accounting Software", "Analytics Tools"
  ];

  const arCampaignTypeOptions = [
    "Virtual Try-On", "Interactive Product Demos", "Location-Based Rewards", "Gamified Experiences", 
    "Virtual Store Tours", "AR Treasure Hunts", "3D Product Visualization", "Educational Content"
  ];

  const rewardTypeOptions = [
    "Discounts/Coupons", "Loyalty Points", "Free Products/Services", "VIP Access", 
    "Exclusive Content", "Early Access", "Gift Cards", "Cashback"
  ];

  const partnershipTypeOptions = [
    "Cross-Promotional Campaigns", "Joint Events", "Referral Programs", "Bundle Offers", 
    "Shared Customer Base", "Co-Marketing", "Resource Sharing", "Community Events"
  ];

  const marketingGoalOptions = [
    "Increase Customer Retention",
    "Attract New Customers", 
    "Build Customer Loyalty",
    "Improve Online Presence",
    "Cross-Business Partnerships",
    "AR Gaming Integration",
    "Team Challenge Events",
    "Viral Campaign Growth"
  ];

  const challengeOptions = [
    "Low Customer Engagement",
    "Competition from Large Chains",
    "Limited Marketing Budget",
    "Difficulty Tracking Customer Data",
    "Need for Digital Transformation",
    "Lack of Customer Feedback",
    "Seasonal Business Fluctuations",
    "Building Community Connections"
  ];

  const saveProfileMutation = useMutation({
    mutationFn: (data: ProfileData) => 
      apiRequest("POST", "/api/profile/setup", data),
    onSuccess: () => {
      toast({
        title: "Profile setup complete!",
        description: "Welcome to Cirqlback! Your comprehensive business platform is ready.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: () => {
      toast({
        title: "Setup failed",
        description: "There was an error saving your profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateField = (field: keyof ProfileData, value: string | string[]) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: 'marketingGoals' | 'currentChallenges', value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return profileData.firstName && profileData.lastName && profileData.contactName && profileData.email;
      case 1:
        return profileData.businessName && profileData.businessTitle && profileData.businessType;
      case 2:
        return profileData.taxId && profileData.dataPrivacyCompliance;
      case 3:
        return profileData.marketingGoals.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    saveProfileMutation.mutate(profileData);
  };

  const steps = [
    { title: "Personal Info", icon: User },
    { title: "Business Details", icon: Building2 },
    { title: "Platform Integration", icon: Star },
    { title: "Goals & Preferences", icon: Star },
    { title: "Review & Complete", icon: CheckCircle2 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-4">
            Welcome to Cirqlback!
          </h1>
          <p className="text-xl text-gray-600">
            Let's set up your profile and business information to get you started with the most comprehensive local business platform available.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    index <= currentStep 
                      ? "bg-purple-600 border-purple-600 text-white" 
                      : "border-gray-300 text-gray-400"
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 ${
                      index < currentStep ? "bg-purple-600" : "bg-gray-300"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {(() => {
                const Icon = steps[currentStep].icon;
                return <Icon className="h-6 w-6 text-purple-600" />;
              })()}
              {steps[currentStep].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 0: Personal Information */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      placeholder="Your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      placeholder="Your last name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    value={profileData.contactName}
                    onChange={(e) => updateField("contactName", e.target.value)}
                    placeholder="Preferred contact name (how you'd like to be addressed)"
                  />
                  <p className="text-sm text-gray-500">This is how other users and businesses will address you on the platform</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Business Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      value={profileData.businessName}
                      onChange={(e) => updateField("businessName", e.target.value)}
                      placeholder="Your business name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessTitle">Your Business Title/Role *</Label>
                    <Input
                      id="businessTitle"
                      value={profileData.businessTitle}
                      onChange={(e) => updateField("businessTitle", e.target.value)}
                      placeholder="Owner, Manager, Marketing Director, etc."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type *</Label>
                  <Select value={profileData.businessType} onValueChange={(value) => updateField("businessType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Input
                    id="businessAddress"
                    value={profileData.businessAddress}
                    onChange={(e) => updateField("businessAddress", e.target.value)}
                    placeholder="Street address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessCity">City</Label>
                    <Input
                      id="businessCity"
                      value={profileData.businessCity}
                      onChange={(e) => updateField("businessCity", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessState">State</Label>
                    <Input
                      id="businessState"
                      value={profileData.businessState}
                      onChange={(e) => updateField("businessState", e.target.value)}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessZip">ZIP Code</Label>
                    <Input
                      id="businessZip"
                      value={profileData.businessZip}
                      onChange={(e) => updateField("businessZip", e.target.value)}
                      placeholder="ZIP"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessWebsite">Business Website</Label>
                    <Input
                      id="businessWebsite"
                      value={profileData.businessWebsite}
                      onChange={(e) => updateField("businessWebsite", e.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessSize">Business Size</Label>
                    <Select value={profileData.businessSize} onValueChange={(value) => updateField("businessSize", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select business size" />
                      </SelectTrigger>
                      <SelectContent>
                        {businessSizeOptions.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aboutBusiness">About Your Business</Label>
                  <Textarea
                    id="aboutBusiness"
                    value={profileData.aboutBusiness}
                    onChange={(e) => updateField("aboutBusiness", e.target.value)}
                    placeholder="Describe your business, what makes it special, and what you offer to customers..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Platform Integration */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expectedRevenue">Expected Monthly Revenue</Label>
                    <Select value={profileData.expectedMonthlyRevenue} onValueChange={(value) => updateField("expectedMonthlyRevenue", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select revenue range" />
                      </SelectTrigger>
                      <SelectContent>
                        {revenueRanges.map(range => (
                          <SelectItem key={range} value={range}>{range}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transactionValue">Average Transaction Value</Label>
                    <Select value={profileData.averageTransactionValue} onValueChange={(value) => updateField("averageTransactionValue", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction range" />
                      </SelectTrigger>
                      <SelectContent>
                        {transactionRanges.map(range => (
                          <SelectItem key={range} value={range}>{range}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg space-y-4">
                  <h4 className="font-semibold text-blue-800">Payment Processing & Compliance</h4>
                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID (EIN or SSN) *</Label>
                    <Input
                      id="taxId"
                      value={profileData.taxId}
                      onChange={(e) => updateField("taxId", e.target.value)}
                      placeholder="Required for Stripe payment processing"
                      required
                    />
                    <p className="text-sm text-gray-600">Required for payment processing compliance and business verification</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferredContact">Preferred Contact Method</Label>
                    <Select value={profileData.preferredContactMethod} onValueChange={(value) => updateField("preferredContactMethod", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact method" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactMethods.map(method => (
                          <SelectItem key={method} value={method}>{method}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marketingBudget">Monthly Marketing Budget</Label>
                    <Select value={profileData.marketingBudget} onValueChange={(value) => updateField("marketingBudget", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        {marketingBudgetRanges.map(budget => (
                          <SelectItem key={budget} value={budget}>{budget}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Communication Languages (for customer interaction)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {languageOptions.map(language => (
                      <label key={language} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={profileData.communicationLanguages.includes(language)}
                          onChange={(e) => {
                            const newLanguages = e.target.checked 
                              ? [...profileData.communicationLanguages, language]
                              : profileData.communicationLanguages.filter(l => l !== language);
                            updateField("communicationLanguages", newLanguages);
                          }}
                        />
                        <span>{language}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg space-y-4">
                  <h4 className="font-semibold text-green-800">Analytics & Tracking Setup</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="googleAnalytics">Google Analytics ID (optional)</Label>
                      <Input
                        id="googleAnalytics"
                        value={profileData.googleAnalyticsId}
                        onChange={(e) => updateField("googleAnalyticsId", e.target.value)}
                        placeholder="G-XXXXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facebookPixel">Facebook Pixel ID (optional)</Label>
                      <Input
                        id="facebookPixel"
                        value={profileData.facebookPixelId}
                        onChange={(e) => updateField("facebookPixelId", e.target.value)}
                        placeholder="123456789012345"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="dataPrivacy"
                      checked={profileData.dataPrivacyCompliance}
                      onChange={(e) => updateField("dataPrivacyCompliance", e.target.checked)}
                      required
                    />
                    <Label htmlFor="dataPrivacy">I consent to analytics data collection for platform features and marketing compliance *</Label>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg space-y-4">
                  <h4 className="font-semibold text-purple-800">AR & Gamification Interest</h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="gamificationInterest"
                      checked={profileData.gamificationInterest}
                      onChange={(e) => updateField("gamificationInterest", e.target.checked)}
                    />
                    <Label htmlFor="gamificationInterest">I'm interested in AR gaming and gamification features</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="partnershipInterest"
                      checked={profileData.partnershipInterest}
                      onChange={(e) => updateField("partnershipInterest", e.target.checked)}
                    />
                    <Label htmlFor="partnershipInterest">I'm interested in partnering with other local businesses</Label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Goals & Challenges */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Marketing Goals (Select all that apply)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {marketingGoalOptions.map((goal) => (
                      <Button
                        key={goal}
                        variant={profileData.marketingGoals.includes(goal) ? "default" : "outline"}
                        className={`justify-start h-auto p-4 ${
                          profileData.marketingGoals.includes(goal)
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                            : ""
                        }`}
                        onClick={() => toggleArrayField("marketingGoals", goal)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{goal}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetCustomers">Target Customers</Label>
                  <Textarea
                    id="targetCustomers"
                    value={profileData.targetCustomers}
                    onChange={(e) => updateField("targetCustomers", e.target.value)}
                    placeholder="Describe your ideal customers - demographics, interests, behaviors..."
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Current Business Challenges (Select all that apply)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {challengeOptions.map((challenge) => (
                      <Button
                        key={challenge}
                        variant={profileData.currentChallenges.includes(challenge) ? "default" : "outline"}
                        className={`justify-start h-auto p-4 ${
                          profileData.currentChallenges.includes(challenge)
                            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                            : ""
                        }`}
                        onClick={() => toggleArrayField("currentChallenges", challenge)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{challenge}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Review Your Information</h3>
                  <p className="text-gray-600">Please review your information before completing setup</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p><strong>Name:</strong> {profileData.firstName} {profileData.lastName}</p>
                      <p><strong>Contact Name:</strong> {profileData.contactName}</p>
                      <p><strong>Email:</strong> {profileData.email}</p>
                      <p><strong>Phone:</strong> {profileData.phone || "Not provided"}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Business Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p><strong>Business:</strong> {profileData.businessName}</p>
                      <p><strong>Title:</strong> {profileData.businessTitle}</p>
                      <p><strong>Type:</strong> {profileData.businessType}</p>
                      <p><strong>Location:</strong> {profileData.businessCity}, {profileData.businessState}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Goals & Challenges
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <strong>Marketing Goals:</strong>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {profileData.marketingGoals.map((goal) => (
                            <Badge key={goal} variant="default" className="bg-purple-100 text-purple-800">
                              {goal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong>Current Challenges:</strong>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {profileData.currentChallenges.map((challenge) => (
                            <Badge key={challenge} variant="outline" className="border-orange-200 text-orange-800">
                              {challenge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              
              {currentStep < 4 ? (
                <Button
                  onClick={nextStep}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  disabled={
                    (currentStep === 0 && (!profileData.firstName || !profileData.lastName || !profileData.contactName || !profileData.email)) ||
                    (currentStep === 1 && (!profileData.businessName || !profileData.businessTitle || !profileData.businessType))
                  }
                >
                  Next Step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={saveProfileMutation.isPending}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {saveProfileMutation.isPending ? "Setting up..." : "Complete Setup"}
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* What's Next Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">What's Next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Profile Complete</h4>
                <p className="text-sm text-gray-600">Access your personalized dashboard and start exploring features</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Create Campaigns</h4>
                <p className="text-sm text-gray-600">Build your first marketing campaign with our powerful tools</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold mb-2">Connect & Grow</h4>
                <p className="text-sm text-gray-600">Join partnerships and expand your customer reach</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}