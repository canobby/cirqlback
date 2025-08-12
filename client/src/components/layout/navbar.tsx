import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import NotificationCenter from "@/components/notifications/notification-center";
import cirqlbackLogo from "@assets/cirqlback-logo-transparent.png";

export default function Navbar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img 
                src={cirqlbackLogo} 
                alt="Cirqlback" 
                className="h-6 w-auto mr-3 logo-transparent"
                key="cirqlback-logo-v5"
              />
              <span className="text-xl font-bold gradient-text">Cirqlback</span>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link href="/customer">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/customer") 
                      ? "text-primary bg-primary/10 border border-primary/20" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  Customer
                </Button>
              </Link>
              <Link href="/merchant">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/merchant") 
                      ? "text-secondary bg-secondary/10 border border-secondary/20" 
                      : "text-muted-foreground hover:text-secondary hover:bg-secondary/5"
                  }`}
                >
                  Merchant
                </Button>
              </Link>
              <Link href="/community">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/community") 
                      ? "text-accent bg-accent/10 border border-accent/20" 
                      : "text-muted-foreground hover:text-accent hover:bg-accent/5"
                  }`}
                >
                  Community
                </Button>
              </Link>
              <Link href="/map">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/map") 
                      ? "text-primary bg-primary/10 border border-primary/20" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  Map
                </Button>
              </Link>
              <Link href="/analytics">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/analytics") 
                      ? "text-primary bg-primary/10 border border-primary/20" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                >
                  Analytics
                </Button>
              </Link>
              <Link href="/account">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/account") 
                      ? "text-purple-600 bg-purple-50 border border-purple-200" 
                      : "text-muted-foreground hover:text-purple-600 hover:bg-purple-50"
                  }`}
                >
                  Account
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive("/how-it-works") 
                      ? "text-secondary bg-secondary/10 border border-secondary/20" 
                      : "text-muted-foreground hover:text-secondary hover:bg-secondary/5"
                  }`}
                >
                  How It Works
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            <Button className="gradient-bg border-0 text-white font-semibold">
              Login
            </Button>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-500 hover:text-gray-700"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link href="/customer">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start px-3 py-2 text-sm font-medium ${
                    isActive("/customer") 
                      ? "text-primary bg-primary/10" 
                      : "text-gray-700 hover:text-primary"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Customer
                </Button>
              </Link>
              <Link href="/merchant">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start px-3 py-2 text-sm font-medium ${
                    isActive("/merchant") 
                      ? "text-secondary bg-secondary/10" 
                      : "text-gray-700 hover:text-secondary"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Merchant
                </Button>
              </Link>
              <Link href="/community">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start px-3 py-2 text-sm font-medium ${
                    isActive("/community") 
                      ? "text-accent bg-accent/10" 
                      : "text-gray-700 hover:text-accent"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Community
                </Button>
              </Link>
              <Link href="/analytics">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start px-3 py-2 text-sm font-medium ${
                    isActive("/analytics") 
                      ? "text-primary bg-primary/10" 
                      : "text-gray-700 hover:text-primary"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Analytics
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start px-3 py-2 text-sm font-medium ${
                    isActive("/how-it-works") 
                      ? "text-secondary bg-secondary/10" 
                      : "text-gray-700 hover:text-secondary"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
