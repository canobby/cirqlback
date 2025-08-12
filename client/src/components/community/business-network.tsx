import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Coffee, BookOpen, UtensilsCrossed, Users } from "lucide-react";

interface Business {
  id: string;
  name: string;
  category: 'coffee' | 'retail' | 'restaurant';
  tapsToday: number;
  isActive: boolean;
}

const mockBusinesses: Business[] = [
  { id: "1", name: "Joe's Coffee Shop", category: "coffee", tapsToday: 124, isActive: true },
  { id: "2", name: "Downtown Books", category: "retail", tapsToday: 67, isActive: true },
  { id: "3", name: "Mama's Bistro", category: "restaurant", tapsToday: 89, isActive: true },
  { id: "4", name: "Corner Deli", category: "restaurant", tapsToday: 45, isActive: true },
  { id: "5", name: "Artisan Crafts", category: "retail", tapsToday: 32, isActive: true },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'coffee':
      return Coffee;
    case 'retail':
      return BookOpen;
    case 'restaurant':
      return UtensilsCrossed;
    default:
      return Users;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'coffee':
      return 'bg-primary';
    case 'retail':
      return 'bg-secondary';
    case 'restaurant':
      return 'bg-accent';
    default:
      return 'bg-gray-500';
  }
};

export default function BusinessNetwork() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="mr-2 h-5 w-5" />
          Local Business Network
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Map Visualization */}
        <div className="bg-gray-100 rounded-xl h-64 mb-6 relative overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400" 
            alt="Bustling community marketplace with local vendors and shoppers" 
            className="w-full h-full object-cover"
          />
          
          {/* Business Pins Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-3 gap-8">
              <div className="w-6 h-6 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                <Coffee className="text-white h-3 w-3" />
              </div>
              <div className="w-6 h-6 bg-secondary rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                <BookOpen className="text-white h-3 w-3" />
              </div>
              <div className="w-6 h-6 bg-accent rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                <UtensilsCrossed className="text-white h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Network Stats Overlay */}
          <div className="absolute top-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-3">
            <p className="text-sm font-semibold text-gray-900">{mockBusinesses.length} Active Partners</p>
            <p className="text-xs text-gray-600">
              {mockBusinesses.reduce((sum, b) => sum + b.tapsToday, 0)} taps today
            </p>
          </div>
        </div>

        {/* Partner List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-900">Active Partners</h4>
            <Button variant="outline" size="sm">
              <Users className="mr-2 h-4 w-4" />
              View All
            </Button>
          </div>
          
          {mockBusinesses.slice(0, 4).map((business) => {
            const Icon = getCategoryIcon(business.category);
            const colorClass = getCategoryColor(business.category);
            
            return (
              <div key={business.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center">
                  <div className={`w-10 h-10 ${colorClass} rounded-full flex items-center justify-center`}>
                    <Icon className="text-white h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{business.name}</p>
                    <p className="text-xs text-gray-500">{business.tapsToday} taps today</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={business.isActive ? "default" : "secondary"}>
                    {business.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Network Growth */}
        <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-gray-900">Growing Network</h5>
              <p className="text-sm text-gray-600">3 new partners this month</p>
            </div>
            <Button variant="outline" size="sm">
              Invite Business
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
