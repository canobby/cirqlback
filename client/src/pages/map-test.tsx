import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { QuickTranslate } from "@/components/ui/translated-text";
import { ArrowRight } from "lucide-react";
import RealGoogleMap from "@/components/map/real-google-map";

export default function MapTest() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mb-4"
          >
            <ArrowRight className="h-4 w-4 rotate-180 mr-2" />
            <QuickTranslate text="Back to Home" />
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <QuickTranslate text="Discover Local Businesses" />
          </h1>
          <p className="text-gray-600">
            <QuickTranslate text="Tap Cirql tags to earn rewards and discover amazing local spots in Yakima, WA" />
          </p>
        </div>

        {/* Interactive Map with Navigation */}
        <RealGoogleMap />
      </div>
    </div>
  );
}