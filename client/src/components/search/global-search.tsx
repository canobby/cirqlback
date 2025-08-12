import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Search, Building2, Target, Users, MapPin, Zap, BarChart3, Gift } from "lucide-react";
import { useLocation } from "wouter";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string;
  url: string;
  badge?: string;
  metadata?: any;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search functionality
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results || []);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setLocation(result.url);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'business': return Building2;
      case 'campaign': return Target;
      case 'customer': return Users;
      case 'location': return MapPin;
      case 'ar-experience': return Zap;
      case 'analytics': return BarChart3;
      case 'reward': return Gift;
      default: return Search;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'business': return 'text-blue-500';
      case 'campaign': return 'text-purple-500';
      case 'customer': return 'text-green-500';
      case 'location': return 'text-orange-500';
      case 'ar-experience': return 'text-pink-500';
      case 'analytics': return 'text-indigo-500';
      case 'reward': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2">
          <Search className="h-4 w-4 xl:mr-2" />
          <span className="hidden xl:inline-flex">Search...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <Command className="rounded-lg border-0 shadow-md">
          <CommandInput 
            placeholder="Search businesses, campaigns, customers, and more..." 
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
            
            {!loading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>No results found for "{query}"</CommandEmpty>
            )}

            {!loading && results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((result) => {
                  const Icon = getResultIcon(result.type);
                  const iconColor = getResultColor(result.type);
                  
                  return (
                    <CommandItem
                      key={result.id}
                      value={result.title}
                      onSelect={() => handleResultClick(result)}
                      className="flex items-center space-x-3 px-4 py-3 cursor-pointer"
                    >
                      <div className={`flex-shrink-0 ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          {result.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {result.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="text-xs capitalize">
                          {result.type.replace('-', ' ')}
                        </Badge>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {query.length < 2 && (
              <CommandGroup heading="Quick Actions">
                <CommandItem onSelect={() => handleResultClick({ id: 'analytics', type: 'analytics', title: 'Analytics Dashboard', description: 'View real-time business metrics', url: '/analytics' })}>
                  <BarChart3 className="mr-2 h-4 w-4 text-blue-500" />
                  <span>Analytics Dashboard</span>
                </CommandItem>
                <CommandItem onSelect={() => handleResultClick({ id: 'merchant', type: 'business', title: 'Merchant Tools', description: 'Manage campaigns and rewards', url: '/merchant' })}>
                  <Building2 className="mr-2 h-4 w-4 text-purple-500" />
                  <span>Merchant Tools</span>
                </CommandItem>
                <CommandItem onSelect={() => handleResultClick({ id: 'community', type: 'community', title: 'Community Hub', description: 'Challenges and leaderboards', url: '/community' })}>
                  <Users className="mr-2 h-4 w-4 text-green-500" />
                  <span>Community Hub</span>
                </CommandItem>
                <CommandItem onSelect={() => handleResultClick({ id: 'map', type: 'location', title: 'Business Map', description: 'Find nearby participating businesses', url: '/map' })}>
                  <MapPin className="mr-2 h-4 w-4 text-orange-500" />
                  <span>Business Map</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}