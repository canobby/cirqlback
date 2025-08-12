import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  MapPin, 
  Users, 
  Star, 
  MessageCircle, 
  Eye, 
  EyeOff, 
  Navigation, 
  Gift, 
  Crown, 
  Coffee, 
  ShoppingBag, 
  Utensils,
  Phone,
  Mail,
  Clock,
  Heart,
  Award,
  Target,
  Zap,
  Send,
  Settings,
  Filter,
  Search,
  RefreshCw,
  Plus,
  Minus
} from "lucide-react";

interface Business {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  address: string;
  rating: number;
  activeRewards: number;
  customersNearby: number;
  isSubscribed: boolean;
  phone?: string;
  email?: string;
  hours: string;
  specialOffer?: string;
}

interface Customer {
  id: string;
  name: string;
  avatar: string;
  location: { lat: number; lng: number };
  isVisible: boolean;
  status: string;
  rewardsEarned: number;
  favoriteBusinessType: string;
  lastActive: string;
  preferences: {
    allowMessages: boolean;
    showLocation: boolean;
    showActivity: boolean;
  };
}

export default function InteractiveDiscoveryMap() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messageDialog, setMessageDialog] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("local"); // "local" or "global"
  const [partnershipMode, setPartnershipMode] = useState(false);
  const { toast } = useToast();

  // Mock data for businesses
  const businesses: Business[] = [
    {
      id: "biz1",
      name: "Central Coffee Roasters",
      type: "cafe",
      location: { lat: 40.7128, lng: -74.0060 },
      address: "123 Main St, New York, NY",
      rating: 4.8,
      activeRewards: 3,
      customersNearby: 12,
      isSubscribed: true,
      phone: "(555) 123-4567",
      email: "hello@centralcoffee.com",
      hours: "6:00 AM - 8:00 PM",
      specialOffer: "Buy 2 coffees, get 1 free pastry!"
    },
    {
      id: "biz2", 
      name: "Green Leaf Fitness",
      type: "fitness",
      location: { lat: 40.7580, lng: -73.9855 },
      address: "456 Broadway, New York, NY",
      rating: 4.9,
      activeRewards: 2,
      customersNearby: 8,
      isSubscribed: true,
      phone: "(555) 234-5678",
      email: "info@greenleaffitness.com",
      hours: "5:00 AM - 11:00 PM",
      specialOffer: "First month membership 50% off!"
    },
    {
      id: "biz3",
      name: "Pizza Palace LA",
      type: "restaurant",
      location: { lat: 34.0522, lng: -118.2437 },
      address: "789 Sunset Blvd, Los Angeles, CA",
      rating: 4.6,
      activeRewards: 5,
      customersNearby: 23,
      isSubscribed: true,
      phone: "(555) 345-6789",
      email: "orders@pizzapalacela.com",
      hours: "11:00 AM - 12:00 AM",
      specialOffer: "Cross-city partnership: 20% off when you show Cirql tap from NY!"
    },
    {
      id: "biz4",
      name: "Austin Book Nook",
      type: "retail",
      location: { lat: 30.2672, lng: -97.7431 },
      address: "321 South St, Austin, TX",
      rating: 4.7,
      activeRewards: 1,
      customersNearby: 5,
      isSubscribed: true,
      phone: "(555) 456-7890",
      email: "hello@austinbooknook.com",
      hours: "9:00 AM - 9:00 PM",
      specialOffer: "Partner rewards: Get book credits for coffee shop visits nationwide!"
    },
    {
      id: "biz5",
      name: "Seattle Artisan Coffee", 
      type: "cafe",
      location: { lat: 47.6062, lng: -122.3321 },
      address: "555 Pike St, Seattle, WA",
      rating: 4.8,
      activeRewards: 3,
      customersNearby: 14,
      isSubscribed: true,
      phone: "(555) 567-8901",
      email: "roasters@seattleartisan.com",
      hours: "6:00 AM - 8:00 PM",
      specialOffer: "Global coffee network: Show any Cirql tap for 15% off specialty drinks!"
    }
  ];

  // Mock data for visible customers
  const visibleCustomers: Customer[] = [
    {
      id: "cust1",
      name: "Sarah M.",
      avatar: "👩‍💼",
      location: { lat: 40.7140, lng: -74.0055 },
      isVisible: true,
      status: "Looking for lunch spots",
      rewardsEarned: 47,
      favoriteBusinessType: "restaurants",
      lastActive: "2 min ago",
      preferences: {
        allowMessages: true,
        showLocation: true,
        showActivity: true
      }
    },
    {
      id: "cust2",
      name: "Mike K.",
      avatar: "👨‍🎓",
      location: { lat: 40.7580, lng: -73.9855 },
      isVisible: true,
      status: "Just finished workout",
      rewardsEarned: 32,
      favoriteBusinessType: "fitness",
      lastActive: "5 min ago", 
      preferences: {
        allowMessages: true,
        showLocation: true,
        showActivity: false
      }
    },
    {
      id: "cust3",
      name: "Emma L.",
      avatar: "👩‍🎨",
      location: { lat: 40.7510, lng: -73.9930 },
      isVisible: true,
      status: "Coffee hunting ☕",
      rewardsEarned: 63,
      favoriteBusinessType: "cafes",
      lastActive: "1 min ago",
      preferences: {
        allowMessages: false,
        showLocation: true,
        showActivity: true
      }
    }
  ];

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Location access denied");
          // Default to NYC for demo
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    }
  }, []);

  const getBusinessIcon = (type: string) => {
    switch (type) {
      case "cafe": return Coffee;
      case "restaurant": return Utensils;
      case "fitness": return Target;
      case "retail": return ShoppingBag;
      default: return MapPin;
    }
  };

  const sendMessage = () => {
    if (!messageContent.trim()) return;
    
    toast({
      title: "Message Sent",
      description: `Your message was sent to ${selectedCustomer?.name}`,
    });
    
    setMessageContent("");
    setMessageDialog(false);
  };

  const contactBusiness = (business: Business) => {
    toast({
      title: "Contact Request Sent",
      description: `Your inquiry was sent to ${business.name}`,
    });
  };

  const filteredBusinesses = businesses.filter(business => {
    const matchesType = filterType === "all" || business.type === filterType;
    const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // In local mode, show only nearby businesses (simulated with first 2 businesses)
    // In global mode, show all subscribed merchants regardless of location
    const matchesLocation = viewMode === "global" || ["biz1", "biz2"].includes(business.id);
    
    return matchesType && matchesSearch && matchesLocation;
  });

  const filteredCustomers = visibleCustomers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         customer.status.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Local Discovery Map
              </h1>
              <p className="text-gray-600 mt-1">Find nearby businesses, connect with other customers, and discover rewards</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="visibility-toggle">Visible to others</Label>
                <Switch
                  id="visibility-toggle"
                  checked={isVisible}
                  onCheckedChange={setIsVisible}
                />
                {isVisible ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
              </div>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Privacy Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map View */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Navigation className="h-5 w-5 mr-2 text-blue-500" />
                    Live Map View
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-1" />
                      Filters
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter Controls */}
                <div className="mb-4 space-y-3">
                  <Input
                    placeholder="Search businesses or customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  <div className="flex space-x-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Filter by business type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Businesses</SelectItem>
                        <SelectItem value="cafe">Cafes</SelectItem>
                        <SelectItem value="restaurant">Restaurants</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={viewMode} onValueChange={setViewMode}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="View mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Nearby Only</SelectItem>
                        <SelectItem value="global">All Cirqlback Merchants</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <Switch
                      id="partnership-mode"
                      checked={partnershipMode}
                      onCheckedChange={setPartnershipMode}
                    />
                    <Label htmlFor="partnership-mode" className="text-sm font-medium">
                      Partnership Network Mode
                    </Label>
                    <div className="text-xs text-purple-600 ml-2">
                      Connect with merchants anywhere for cross-campaigns
                    </div>
                  </div>
                </div>

                {/* Interactive Map Display */}
                <div className="bg-gray-100 rounded-lg h-96 relative overflow-hidden">
                  {/* Map Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-blue-50 to-purple-50">
                    {/* Grid pattern to simulate map */}
                    <div className="absolute inset-0 opacity-20" 
                         style={{
                           backgroundImage: `
                             linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                           `,
                           backgroundSize: '20px 20px'
                         }}>
                    </div>
                  </div>

                  {/* User Location */}
                  {userLocation && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                      <div className="relative">
                        <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-lg"></div>
                        <div className="absolute -top-1 -left-1 w-6 h-6 bg-orange-300 rounded-full animate-ping opacity-30"></div>
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          Your Location
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Business Markers */}
                  {filteredBusinesses.map((business, index) => {
                    const Icon = getBusinessIcon(business.type);
                    // Position businesses around the map - more spread out for global view
                    const localPositions = [
                      { top: '25%', left: '30%' },
                      { top: '60%', left: '70%' }
                    ];
                    const globalPositions = [
                      { top: '20%', left: '25%' }, // NY area
                      { top: '45%', left: '50%' }, // Central
                      { top: '70%', left: '15%' }, // LA area
                      { top: '40%', left: '75%' }, // Austin area
                      { top: '15%', left: '80%' }  // Seattle area
                    ];
                    
                    const positions = viewMode === "global" ? globalPositions : localPositions;
                    const position = positions[index % positions.length];
                    
                    // Different colors for local vs global merchants
                    const isGlobalMerchant = !["biz1", "biz2"].includes(business.id);
                    const markerColor = isGlobalMerchant && viewMode === "global" 
                      ? "bg-gradient-to-r from-purple-500 to-pink-500" 
                      : "bg-blue-500";
                    
                    return (
                      <div
                        key={business.id}
                        className="absolute z-10 cursor-pointer transform hover:scale-110 transition-transform"
                        style={position}
                        onClick={() => setSelectedBusiness(business)}
                      >
                        <div className="relative">
                          <div className={`w-8 h-8 ${markerColor} rounded-lg border-2 border-white shadow-lg flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          {business.activeRewards > 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border border-white text-xs text-white flex items-center justify-center font-bold">
                              {business.activeRewards}
                            </div>
                          )}
                          {partnershipMode && (
                            <div className="absolute -top-2 -left-2 w-3 h-3 bg-yellow-400 rounded-full border border-white animate-pulse"></div>
                          )}
                          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                            {business.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Customer Markers */}
                  {isVisible && filteredCustomers.map((customer, index) => {
                    // Position customers around the map
                    const positions = [
                      { top: '35%', left: '60%' },
                      { top: '55%', left: '25%' },
                      { top: '75%', left: '65%' }
                    ];
                    const position = positions[index % positions.length];
                    
                    return (
                      <div
                        key={customer.id}
                        className="absolute z-10 cursor-pointer transform hover:scale-110 transition-transform"
                        style={position}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <div className="relative">
                          <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs">
                            {customer.avatar}
                          </div>
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                            {customer.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Map Controls */}
                  <div className="absolute top-4 right-4 space-y-2">
                    <Button size="sm" variant="outline" className="bg-white/90 backdrop-blur">
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="bg-white/90 backdrop-blur">
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Map Legend */}
                  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 space-y-2">
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>Local Businesses</span>
                    </div>
                    {viewMode === "global" && (
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded"></div>
                        <span>Global Partners</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Customers</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span>Active Rewards</span>
                    </div>
                    {partnershipMode && (
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span>Partnership Ready</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span>Your Location</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{filteredBusinesses.length}</p>
                    <p className="text-xs text-gray-600">Nearby Businesses</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{filteredCustomers.length}</p>
                    <p className="text-xs text-gray-600">Visible Customers</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">12</p>
                    <p className="text-xs text-gray-600">Active Rewards</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">0.5</p>
                    <p className="text-xs text-gray-600">Miles Radius</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Nearby Businesses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-500" />
                  Nearby Businesses ({filteredBusinesses.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {filteredBusinesses.map((business) => {
                  const Icon = getBusinessIcon(business.type);
                  return (
                    <div
                      key={business.id}
                      className="p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedBusiness(business)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Icon className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{business.name}</h4>
                            <p className="text-sm text-gray-600">{business.address}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="flex items-center">
                                <Star className="h-3 w-3 text-yellow-500 mr-1" />
                                <span className="text-xs">{business.rating}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {business.activeRewards} rewards
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Badge variant={business.isSubscribed ? "default" : "secondary"}>
                          {business.isSubscribed ? "Active" : "Basic"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Visible Customers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-500" />
                  Visible Customers ({filteredCustomers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{customer.avatar}</div>
                        <div>
                          <h4 className="font-medium">{customer.name}</h4>
                          <p className="text-sm text-gray-600">{customer.status}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {customer.rewardsEarned} rewards
                            </Badge>
                            <span className="text-xs text-gray-500">{customer.lastActive}</span>
                          </div>
                        </div>
                      </div>
                      {customer.preferences.allowMessages && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(customer);
                            setMessageDialog(true);
                          }}
                        >
                          <MessageCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Business Details Dialog */}
      <Dialog open={!!selectedBusiness} onOpenChange={() => setSelectedBusiness(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedBusiness && (() => {
                const Icon = getBusinessIcon(selectedBusiness.type);
                return <Icon className="h-5 w-5 mr-2 text-blue-600" />;
              })()}
              {selectedBusiness?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedBusiness && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>{selectedBusiness.rating} rating</span>
                </div>
                <Badge variant={selectedBusiness.isSubscribed ? "default" : "secondary"}>
                  {selectedBusiness.isSubscribed ? "Cirql Member" : "Basic"}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{selectedBusiness.address}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{selectedBusiness.hours}</span>
                </div>
                {selectedBusiness.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedBusiness.phone}</span>
                  </div>
                )}
              </div>

              {selectedBusiness.specialOffer && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Gift className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Special Offer</span>
                  </div>
                  <p className="text-sm text-green-700">{selectedBusiness.specialOffer}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <p className="text-lg font-bold text-blue-600">{selectedBusiness.activeRewards}</p>
                  <p className="text-xs text-gray-600">Active Rewards</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <p className="text-lg font-bold text-green-600">{selectedBusiness.customersNearby}</p>
                  <p className="text-xs text-gray-600">Customers Nearby</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  className="flex-1"
                  onClick={() => contactBusiness(selectedBusiness)}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Contact
                </Button>
                <Button variant="outline" className="flex-1">
                  <Navigation className="h-4 w-4 mr-2" />
                  Directions
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={!!selectedCustomer && !messageDialog} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <span className="text-2xl mr-2">{selectedCustomer?.avatar}</span>
              {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  {selectedCustomer.rewardsEarned} rewards earned
                </Badge>
                <span className="text-sm text-gray-500">{selectedCustomer.lastActive}</span>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{selectedCustomer.status}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Prefers {selectedCustomer.favoriteBusinessType}</span>
                  <Heart className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Location sharing</span>
                  {selectedCustomer.preferences.showLocation ? 
                    <Eye className="h-4 w-4 text-green-500" /> : 
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  }
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Activity visible</span>
                  {selectedCustomer.preferences.showActivity ? 
                    <Eye className="h-4 w-4 text-green-500" /> : 
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  }
                </div>
              </div>

              {selectedCustomer.preferences.allowMessages && (
                <Button 
                  className="w-full"
                  onClick={() => setMessageDialog(true)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
              Message {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Send a friendly message to connect with other reward customers in your area!
              </p>
            </div>
            
            <Textarea
              placeholder="Type your message here..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={4}
            />
            
            <div className="flex space-x-2">
              <Button 
                className="flex-1"
                onClick={sendMessage}
                disabled={!messageContent.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setMessageDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}