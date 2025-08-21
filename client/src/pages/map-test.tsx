import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function MapTest() {
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Map Test Page</h1>
        
        <Card className="mb-6">
          <CardHeader className="bg-blue-500 text-white">
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Test Map Display
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                <p className="text-gray-600">Map Component Working</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Yakima Coffee Company</h3>
              <p className="text-gray-600">Coffee • 4.8 stars • 3 rewards • Open</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Valley Electronics</h3>
              <p className="text-gray-600">Electronics • 4.6 stars • 2 rewards • Open</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}