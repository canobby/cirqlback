import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  Search, 
  Store, 
  Users, 
  Target, 
  MapPin, 
  Gift,
  BarChart3,
  Camera,
  X,
  Command
} from "lucide-react";

interface SearchResult {
  id: string;
  type: 'business' | 'campaign' | 'customer' | 'location' | 'reward' | 'analytics' | 'ar-experience';
  title: string;
  description: string;
  url: string;
  badge?: string;
  metadata?: any;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["/api/search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const response = await apiRequest("GET", `/api/search?q=${encodeURIComponent(query)}`);
      return response.results || [];
    },
    enabled: query.length > 2,
  });

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'business': return Store;
      case 'campaign': return Target;
      case 'customer': return Users;
      case 'location': return MapPin;
      case 'reward': return Gift;
      case 'analytics': return BarChart3;
      case 'ar-experience': return Camera;
      default: return Search;
    }
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case 'business': return 'bg-blue-100 text-blue-800';
      case 'campaign': return 'bg-green-100 text-green-800';
      case 'customer': return 'bg-purple-100 text-purple-800';
      case 'location': return 'bg-orange-100 text-orange-800';
      case 'reward': return 'bg-pink-100 text-pink-800';
      case 'analytics': return 'bg-indigo-100 text-indigo-800';
      case 'ar-experience': return 'bg-violet-100 text-violet-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setLocation(result.url);
    setIsOpen(false);
    setQuery("");
  };

  const popularSearches = [
    { query: "coffee shops", type: "business" },
    { query: "loyalty campaigns", type: "campaign" },
    { query: "downtown locations", type: "location" },
    { query: "AR experiences", type: "ar-experience" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        >
          <Search className="h-4 w-4 xl:mr-2" />
          <span className="hidden xl:inline-flex">Search platform...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground xl:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Search Platform
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search businesses, campaigns, customers, analytics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-10"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {query.length > 2 ? (
              <div className="space-y-2">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex items-center space-x-3 p-3">
                        <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result: SearchResult) => {
                    const Icon = getResultIcon(result.type);
                    return (
                      <Card
                        key={result.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleResultClick(result)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <Icon className="h-5 w-5 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {result.title}
                                </h4>
                                <Badge className={`text-xs ${getResultBadgeColor(result.type)}`}>
                                  {result.type}
                                </Badge>
                                {result.badge && (
                                  <Badge variant="secondary" className="text-xs">
                                    {result.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 truncate">
                                {result.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No results found for "{query}"</p>
                    <p className="text-sm mt-1">Try different keywords or browse popular searches below</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Popular Searches</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {popularSearches.map((search, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start h-auto p-3"
                        onClick={() => setQuery(search.query)}
                      >
                        <div className="text-left">
                          <p className="text-sm font-medium">{search.query}</p>
                          <p className="text-xs text-gray-500 capitalize">{search.type}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h4>
                  <div className="space-y-1">
                    {[
                      { label: "Create new campaign", url: "/merchant", icon: Target },
                      { label: "View analytics dashboard", url: "/analytics", icon: BarChart3 },
                      { label: "Explore community", url: "/community", icon: Users },
                      { label: "Browse business map", url: "/map", icon: MapPin }
                    ].map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            setLocation(action.url);
                            setIsOpen(false);
                          }}
                          className="w-full text-left p-2 hover:bg-gray-50 rounded flex items-center space-x-2"
                        >
                          <Icon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Use ↑↓ to navigate, ↵ to select, ESC to close</span>
              <div className="flex items-center space-x-2">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">⌘K</kbd>
                <span>to search</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}