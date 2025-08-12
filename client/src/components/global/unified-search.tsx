import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MapPin, 
  Users, 
  Target, 
  BarChart3,
  Store,
  Gift,
  Star,
  Zap,
  ArrowRight
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "business" | "campaign" | "customer" | "location" | "ar_experience" | "analytics";
  title: string;
  subtitle: string;
  description: string;
  url: string;
  relevance: number;
  tags: string[];
}

export default function UnifiedSearch({ onClose }: { onClose?: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length > 2) {
      performSearch(query);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    
    // Simulate comprehensive search across platform
    const mockResults = [
      {
        id: "1",
        type: "business",
        title: "Brew & Bean Coffee",
        subtitle: "Coffee Shop • Downtown",
        description: "Local coffee shop with active loyalty campaigns and AR experiences",
        url: "/map?business=brew-bean",
        relevance: 95,
        tags: ["coffee", "downtown", "active", "ar-games"]
      },
      {
        id: "2",
        type: "campaign",
        title: "Morning Boost Campaign",
        subtitle: "Active Campaign • 20% Off",
        description: "Limited time morning discount at participating coffee shops",
        url: "/merchant?tab=campaigns&id=morning-boost",
        relevance: 90,
        tags: ["discount", "morning", "coffee", "active"]
      },
      {
        id: "3",
        type: "ar_experience",
        title: "Coffee Collector AR Game",
        subtitle: "AR Experience • 5 Collectibles",
        description: "Collect virtual coffee beans across downtown businesses",
        url: "/ar-hub?game=coffee-collector",
        relevance: 85,
        tags: ["ar", "collectibles", "downtown", "game"]
      },
      {
        id: "4",
        type: "analytics",
        title: "Customer Engagement Report",
        subtitle: "Analytics • This Month",
        description: "Detailed report on customer engagement and campaign performance",
        url: "/analytics?report=engagement",
        relevance: 80,
        tags: ["analytics", "engagement", "report", "performance"]
      },
      {
        id: "5",
        type: "customer",
        title: "Sarah Johnson",
        subtitle: "Gold Member • 2,847 Points",
        description: "Active customer with high engagement in coffee shop campaigns",
        url: "/customer?email=sarah@example.com",
        relevance: 75,
        tags: ["gold", "active", "high-engagement", "coffee"]
      }
    ].filter(result => 
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.tags.some(tag => tag.includes(searchQuery.toLowerCase()))
    );

    setResults(mockResults);
    setIsLoading(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "business": return <Store className="h-4 w-4 text-blue-600" />;
      case "campaign": return <Target className="h-4 w-4 text-green-600" />;
      case "customer": return <Users className="h-4 w-4 text-purple-600" />;
      case "location": return <MapPin className="h-4 w-4 text-orange-600" />;
      case "ar_experience": return <Zap className="h-4 w-4 text-pink-600" />;
      case "analytics": return <BarChart3 className="h-4 w-4 text-gray-600" />;
      default: return <Search className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      business: "bg-blue-100 text-blue-800",
      campaign: "bg-green-100 text-green-800", 
      customer: "bg-purple-100 text-purple-800",
      location: "bg-orange-100 text-orange-800",
      ar_experience: "bg-pink-100 text-pink-800",
      analytics: "bg-gray-100 text-gray-800"
    };
    
    return (
      <Badge className={colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  const handleResultClick = (result: SearchResult) => {
    window.location.href = result.url;
    onClose?.();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search businesses, campaigns, customers, analytics..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-4 py-2 w-full"
        />
      </div>

      {(results.length > 0 || isLoading) && (
        <Card className="mt-2 shadow-lg border-2">
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No results found for "{query}"
                </div>
              ) : (
                <>
                  <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                    {results.length} results found
                  </div>
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start space-x-3">
                        {getTypeIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{result.title}</h4>
                            {getTypeBadge(result.type)}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{result.subtitle}</p>
                          <p className="text-sm text-gray-500">{result.description}</p>
                          <div className="flex items-center space-x-1 mt-2">
                            {result.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-3 bg-gray-50 text-center">
                    <p className="text-xs text-gray-500">
                      Press <kbd className="px-1 py-0.5 bg-gray-200 rounded">Enter</kbd> to view first result
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}