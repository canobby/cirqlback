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
  Shield
} from "lucide-react";

interface BusinessDescriptors {
  businessDescriptors: string[];
  culturalBackground: string;
  communityFocus: string[];
  accessibilityFeatures: string[];
  sustainabilityPractices: string[];
}

export default function BusinessSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [descriptors, setDescriptors] = useState<BusinessDescriptors>({
    businessDescriptors: [],
    culturalBackground: "",
    communityFocus: [],
    accessibilityFeatures: [],
    sustainabilityPractices: []
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