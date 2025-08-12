import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BusinessNetwork from "@/components/community/business-network";
import { Users, MapPin, Plus, Coffee, BookOpen, UtensilsCrossed } from "lucide-react";

export default function Community() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Community Partnerships</h1>
        <p className="text-xl text-gray-600">Connect local businesses and strengthen community bonds</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <BusinessNetwork />

        {/* Tap Trails */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Active Tap Trails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-primary to-secondary rounded-xl text-white">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">Downtown Discovery</h4>
                    <p className="text-sm opacity-90">Visit 5 shops for $20 bonus</p>
                  </div>
                  <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">4 days left</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">127 participants</span>
                  <Button variant="secondary" size="sm">
                    View Details
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-secondary to-accent rounded-xl text-white">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">Foodie Trail</h4>
                    <p className="text-sm opacity-90">Try 3 restaurants for free dessert</p>
                  </div>
                  <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs">1 week left</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">89 participants</span>
                  <Button variant="secondary" size="sm">
                    View Details
                  </Button>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Plus className="text-gray-400 h-6 w-6" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Create New Trail</h4>
                <p className="text-sm text-gray-600 mb-3">Partner with other businesses</p>
                <Button className="bg-primary text-white">
                  Start Trail
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Community Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="text-blue-600 h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total Partners</p>
                <p className="text-2xl font-bold text-blue-900">47</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MapPin className="text-green-600 h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Active Trails</p>
                <p className="text-2xl font-bold text-green-900">8</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="text-purple-600 h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Trail Participants</p>
                <p className="text-2xl font-bold text-purple-900">1,234</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Partner Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Partner Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center mb-3">
                <Coffee className="text-orange-600 h-6 w-6 mr-2" />
                <h3 className="font-semibold text-orange-800">Food & Beverage</h3>
              </div>
              <p className="text-orange-700 text-sm">18 businesses</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center mb-3">
                <BookOpen className="text-blue-600 h-6 w-6 mr-2" />
                <h3 className="font-semibold text-blue-800">Retail & Services</h3>
              </div>
              <p className="text-blue-700 text-sm">23 businesses</p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center mb-3">
                <UtensilsCrossed className="text-green-600 h-6 w-6 mr-2" />
                <h3 className="font-semibold text-green-800">Restaurants</h3>
              </div>
              <p className="text-green-700 text-sm">6 businesses</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
