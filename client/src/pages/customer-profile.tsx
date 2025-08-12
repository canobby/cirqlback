import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  Save, 
  Heart, 
  MapPin, 
  Users, 
  ShoppingBag,
  Star,
  MessageCircle,
  TrendingUp
} from "lucide-react";

interface CustomerProfile {
  age: number;
  location: string;
  interests: string[];
  shoppingPreferences: string[];
  dietaryRestrictions: string[];
  spendingHabits: string;
  socialMediaActivity: string[];
  referralSource: string;
  preferredContactMethod: string;
  favoriteBusinessTypes: string[];
  visitFrequency: string;
  averageSpendRange: string;
}

export default function CustomerProfile() {
  const { toast } = useToast();

  const [profile, setProfile] = useState<CustomerProfile>({
    age: 0,
    location: "",
    interests: [],
    shoppingPreferences: [],
    dietaryRestrictions: [],
    spendingHabits: "",
    socialMediaActivity: [],
    referralSource: "",
    preferredContactMethod: "",
    favoriteBusinessTypes: [],
    visitFrequency: "",
    averageSpendRange: ""
  });

  const interestsOptions = [
    "Local dining",
    "Coffee culture",
    "Craft beer/spirits",
    "Live music",
    "Art & creativity",
    "Fitness & wellness", 
    "Technology",
    "Books & reading",
    "Fashion & style",
    "Home decor",
    "Outdoor activities",
    "Sports",
    "Gaming",
    "Photography",
    "Travel",
    "Cooking",
    "Sustainable living",
    "Community events"
  ];

  const shoppingPreferencesOptions = [
    "Support local businesses",
    "Brand loyalty",
    "Price-conscious",
    "Quality focused",
    "Convenience first",
    "Experience-driven",
    "Research before buying",
    "Impulse purchases",
    "Social recommendations",
    "Online reviews matter",
    "Eco-friendly products",
    "Try new things",
    "Stick to favorites",
    "Bulk buying",
    "Small batch/artisanal"
  ];

  const dietaryRestrictionsOptions = [
    "Vegetarian",
    "Vegan",
    "Gluten-free",
    "Dairy-free",
    "Keto",
    "Paleo",
    "Low-carb",
    "Nut allergies",
    "Halal",
    "Kosher",
    "Low-sodium",
    "Sugar-free",
    "Organic preferred",
    "No restrictions"
  ];

  const socialMediaActivityOptions = [
    "Instagram stories/posts",
    "Facebook check-ins", 
    "TikTok videos",
    "Twitter/X updates",
    "Google reviews",
    "Yelp reviews",
    "Food photography",
    "Location tagging",
    "Business recommendations",
    "Event sharing",
    "Deal hunting",
    "Minimal social media use"
  ];

  const favoriteBusinessTypesOptions = [
    "Coffee shops",
    "Restaurants",
    "Bars & breweries",
    "Retail stores",
    "Fitness studios",
    "Salons & spas",
    "Bookstores",
    "Art galleries",
    "Music venues",
    "Markets & food halls",
    "Bakeries",
    "Ice cream shops",
    "Tech stores",
    "Home goods",
    "Outdoor gear"
  ];

  const handleCheckboxChange = (field: keyof CustomerProfile, value: string, checked: boolean) => {
    const currentArray = profile[field] as string[];
    if (checked) {
      setProfile(prev => ({ 
        ...prev, 
        [field]: [...currentArray, value] 
      }));
    } else {
      setProfile(prev => ({ 
        ...prev, 
        [field]: currentArray.filter(item => item !== value) 
      }));
    }
  };

  const handleSave = async () => {
    try {
      await apiRequest("PUT", "/api/customer/profile", profile);
      toast({
        title: "Profile Updated",
        description: "Your preferences have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Customer Profile</h1>
        <p className="text-gray-600">
          Help us personalize your Cirqlback experience and discover businesses that match your interests.
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age" className="text-sm font-medium">Age</Label>
                <Input
                  type="number"
                  id="age"
                  placeholder="Enter your age"
                  value={profile.age || ""}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    age: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                <Input
                  id="location"
                  placeholder="City, State"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    location: e.target.value 
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="visit-frequency" className="text-sm font-medium">How often do you visit local businesses?</Label>
                <Select 
                  value={profile.visitFrequency} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, visitFrequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Several times a week">Several times a week</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Rarely">Rarely</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="spend-range" className="text-sm font-medium">Average spending per visit</Label>
                <Select 
                  value={profile.averageSpendRange} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, averageSpendRange: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Spending range" />
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

        {/* Interests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <span>Interests & Hobbies</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">What are you interested in?</Label>
              <div className="grid grid-cols-2 gap-2">
                {interestsOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`interest-${option}`}
                      checked={profile.interests.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('interests', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`interest-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shopping & Dining */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingBag className="h-5 w-5 text-green-600" />
              <span>Shopping & Dining Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Shopping preferences</Label>
              <div className="grid grid-cols-2 gap-2">
                {shoppingPreferencesOptions.slice(0, 10).map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`shopping-${option}`}
                      checked={profile.shoppingPreferences.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('shoppingPreferences', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`shopping-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Dietary preferences/restrictions</Label>
              <div className="grid grid-cols-2 gap-2">
                {dietaryRestrictionsOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dietary-${option}`}
                      checked={profile.dietaryRestrictions.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('dietaryRestrictions', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`dietary-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="spending-habits" className="text-sm font-medium">Spending habits</Label>
              <Select 
                value={profile.spendingHabits} 
                onValueChange={(value) => setProfile(prev => ({ ...prev, spendingHabits: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How do you approach spending?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Budget-conscious">Budget-conscious</SelectItem>
                  <SelectItem value="Value-focused">Value-focused</SelectItem>
                  <SelectItem value="Quality over price">Quality over price</SelectItem>
                  <SelectItem value="Experience-driven">Experience-driven</SelectItem>
                  <SelectItem value="Convenience-focused">Convenience-focused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Business Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>Favorite Business Types</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">What types of businesses do you visit most?</Label>
              <div className="grid grid-cols-2 gap-2">
                {favoriteBusinessTypesOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`business-${option}`}
                      checked={profile.favoriteBusinessTypes.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('favoriteBusinessTypes', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`business-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social & Communication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              <span>Social & Communication</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Social media activity</Label>
              <div className="grid grid-cols-2 gap-2">
                {socialMediaActivityOptions.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={`social-${option}`}
                      checked={profile.socialMediaActivity.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('socialMediaActivity', option, checked as boolean)
                      }
                    />
                    <Label htmlFor={`social-${option}`} className="text-sm">{option}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="referral-source" className="text-sm font-medium">How did you hear about Cirqlback?</Label>
                <Select 
                  value={profile.referralSource} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, referralSource: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Friend/family">Friend/family</SelectItem>
                    <SelectItem value="Social media">Social media</SelectItem>
                    <SelectItem value="Business recommendation">Business recommendation</SelectItem>
                    <SelectItem value="Online search">Online search</SelectItem>
                    <SelectItem value="Local event">Local event</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="contact-method" className="text-sm font-medium">Preferred contact method</Label>
                <Select 
                  value={profile.preferredContactMethod} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, preferredContactMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How should we contact you?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="App notifications">App notifications</SelectItem>
                    <SelectItem value="No contact">No contact preferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Save Profile</span>
          </Button>
        </div>

        {/* Marketing Benefits */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-800 mb-3">🎯 Personalized Experience Benefits</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <strong>Smart Recommendations:</strong> Discover businesses that match your interests and preferences
              </div>
              <div>
                <strong>Targeted Rewards:</strong> Receive offers and deals relevant to your spending habits
              </div>
              <div>
                <strong>Custom Challenges:</strong> Participate in gamified experiences tailored to your lifestyle
              </div>
              <div>
                <strong>Social Connections:</strong> Connect with like-minded community members and friends
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}