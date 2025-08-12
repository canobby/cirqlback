import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  ExternalLink, 
  Smartphone, 
  Share2, 
  Edit,
  Clock,
  MapPin,
  Phone,
  Mail,
  Star,
  Target,
  Zap
} from "lucide-react";

export default function BusinessWebsitePreview() {
  const [selectedTheme, setSelectedTheme] = useState("modern");
  
  const { data: websiteData } = useQuery({
    queryKey: ['/api/business/website/sample-business'],
  });

  const themes = {
    modern: {
      name: "Modern & Clean",
      colors: "from-blue-600 to-purple-600",
      description: "Professional and minimal design"
    },
    restaurant: {
      name: "Restaurant Focused", 
      colors: "from-orange-500 to-red-600",
      description: "Warm colors perfect for dining"
    },
    creative: {
      name: "Creative & Artistic",
      colors: "from-pink-500 to-purple-600", 
      description: "Bold and expressive design"
    },
    fitness: {
      name: "Fitness & Health",
      colors: "from-green-500 to-blue-600",
      description: "Energetic and motivating"
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Website Preview</h1>
              <p className="text-gray-600">See how your website looks across all devices</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Content
              </Button>
              <Button>
                <Globe className="h-4 w-4 mr-2" />
                Publish Live
              </Button>
            </div>
          </div>
        </div>

        {/* Theme Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Website Theme & Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(themes).map(([key, theme]) => (
                <div 
                  key={key}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTheme === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTheme(key)}
                >
                  <div className={`h-8 rounded bg-gradient-to-r ${theme.colors} mb-2`}></div>
                  <h4 className="font-medium text-sm">{theme.name}</h4>
                  <p className="text-xs text-gray-600">{theme.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Mobile Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Smartphone className="h-5 w-5 mr-2" />
                Mobile View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-[280px] bg-gray-900 rounded-[2rem] p-2">
                <div className="bg-white rounded-[1.5rem] overflow-hidden shadow-xl">
                  <div className={`bg-gradient-to-r ${themes[selectedTheme].colors} text-white p-4 text-center`}>
                    <h2 className="text-lg font-bold">Local Coffee House</h2>
                    <p className="text-sm opacity-90">Artisan coffee & fresh pastries</p>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="bg-gradient-to-r from-green-100 to-blue-100 p-3 rounded-lg">
                      <div className="text-xs font-semibold text-green-800 mb-1">🎯 Tap to Earn Rewards!</div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs">20% Off</Badge>
                        <Badge variant="secondary" className="text-xs">2x Points</Badge>
                        <Badge variant="secondary" className="text-xs">Trail</Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded">
                        <h4 className="font-medium text-sm">About Us</h4>
                        <p className="text-xs text-gray-600">Artisan coffee and fresh pastries in the heart of downtown...</p>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded">
                        <h4 className="font-medium text-sm">Hours</h4>
                        <p className="text-xs text-gray-600">Mon-Fri: 7:00 AM - 7:00 PM</p>
                      </div>

                      <div className="bg-gray-50 p-3 rounded">
                        <h4 className="font-medium text-sm">Contact</h4>
                        <p className="text-xs text-gray-600">(555) 123-4567</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Desktop Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Desktop View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden shadow-lg bg-white">
                <div className={`bg-gradient-to-r ${themes[selectedTheme].colors} text-white p-8 text-center`}>
                  <h1 className="text-3xl font-bold mb-2">Local Coffee House</h1>
                  <p className="text-lg opacity-90">Artisan coffee and fresh pastries in the heart of downtown</p>
                </div>
                
                <div className="p-6">
                  <div className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-lg mb-6">
                    <h3 className="font-semibold text-green-800 mb-2">🎯 Tap to Earn Rewards!</h3>
                    <p className="text-sm text-green-700 mb-3">Look for our Cirql tags in-store to unlock exclusive deals and join local treasure hunts!</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">💰 20% Off Coffee</Badge>
                      <Badge variant="secondary">🏆 Loyalty Points 2x</Badge>
                      <Badge variant="secondary">🗺️ Downtown Trail</Badge>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">About Us</h3>
                      <p className="text-sm text-gray-600">We're a local business passionate about providing quality service to our community. Visit us and discover what makes us special!</p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Hours</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Mon-Fri:</span>
                          <span>7:00 AM - 7:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sat:</span>
                          <span>8:00 AM - 8:00 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sun:</span>
                          <span>8:00 AM - 6:00 PM</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Special Offers</h3>
                      <p className="text-sm text-gray-600">New customer discount: 10% off your first visit!</p>
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" className="text-xs">
                          <Target className="h-3 w-3 mr-1" />
                          Claim Offer
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integration Status */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                Smart Integrations Active
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-green-800">Cirql Campaigns</div>
                  <div className="text-xs text-green-600">Auto-displaying 3 active campaigns</div>
                </div>
                <Badge variant="default" className="bg-green-600">Live</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium text-blue-800">Business Profile Sync</div>
                  <div className="text-xs text-blue-600">Hours, contact info, and social links</div>
                </div>
                <Badge variant="default" className="bg-blue-600">Synced</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <div className="font-medium text-purple-800">AR Game Integration</div>
                  <div className="text-xs text-purple-600">Showcasing collectibles and achievements</div>
                </div>
                <Badge variant="default" className="bg-purple-600">Active</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Share2 className="h-5 w-5 mr-2 text-blue-600" />
                Website Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">245</div>
                  <div className="text-xs text-green-700">Total Views</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">18</div>
                  <div className="text-xs text-blue-700">Cirql Taps</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">34</div>
                  <div className="text-xs text-purple-700">Contact Clicks</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">7.3%</div>
                  <div className="text-xs text-orange-700">Conversion</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg">
                <div className="text-sm font-medium text-yellow-800 mb-1">📈 SEO Optimized</div>
                <div className="text-xs text-yellow-700 space-y-1">
                  <div>✓ Mobile responsive & fast loading</div>
                  <div>✓ Local search optimized</div>
                  <div>✓ Social media ready</div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Live
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Share2 className="h-3 w-3 mr-1" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}