import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, Settings } from "lucide-react";
import PlatformMenu from "@/components/layout/platform-menu";
import NotificationCenter from "@/components/global/notification-center";
import { LanguageSelector } from "@/components/ui/language-selector";
import cirqlbackLogo from "@assets/cirqlback-logo-transparent.png";

export default function Navbar() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto responsive-container">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center min-w-0">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
              <img 
                src={cirqlbackLogo} 
                alt="Logo" 
                className="h-5 w-auto mr-2 sm:h-6 sm:mr-3 logo-transparent"
                key="cirqlback-logo-v5"
              />
              <span className="text-lg sm:text-xl font-bold gradient-text truncate" style={{ position: 'relative', zIndex: 1 }}>Cirqlback</span>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-6 lg:ml-10 flex items-baseline space-x-2 lg:space-x-4">
              <Link href="/customer">
                <Button 
                  variant="ghost" 
                  className={`px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-all duration-200 mobile-button-size ${
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
                  className={`px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-all duration-200 mobile-button-size ${
                    isActive("/merchant") 
                      ? "text-secondary bg-secondary/10 border border-secondary/20" 
                      : "text-muted-foreground hover:text-secondary hover:bg-secondary/5"
                  }`}
                >
                  Merchant
                </Button>
              </Link>
              <Link href="/analytics">
                <Button 
                  variant="ghost" 
                  className={`px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-all duration-200 mobile-button-size ${
                    isActive("/analytics") 
                      ? "text-accent bg-accent/10 border border-accent/20" 
                      : "text-muted-foreground hover:text-accent hover:bg-accent/5"
                  }`}
                >
                  Analytics
                </Button>
              </Link>
              <Link href="/map">
                <Button 
                  variant="ghost" 
                  className={`px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-all duration-200 mobile-button-size ${
                    isActive("/map") 
                      ? "text-blue-600 bg-blue-50 border border-blue-200" 
                      : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  Map
                </Button>
              </Link>
              <Link href="/test-system">
                <Button 
                  variant="ghost" 
                  className={`px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-all duration-200 mobile-button-size ${
                    isActive("/test-system") 
                      ? "text-blue-600 bg-blue-50 border border-blue-200" 
                      : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  Testing
                </Button>
              </Link>
              <Link href="/admin-dashboard">
                <Button 
                  variant="ghost" 
                  className={`px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium transition-all duration-200 mobile-button-size ${
                    isActive("/admin-dashboard") 
                      ? "text-red-600 bg-red-50 border border-red-200" 
                      : "text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  Admin
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
            <div className="hidden sm:block">
              <LanguageSelector variant="button" size="sm" />
            </div>
            {/* Single unified navigation menu */}
            <PlatformMenu />
            <Button variant="outline" size="sm" className="hidden lg:flex mobile-sm-touch">
              <Search className="h-4 w-4" />
            </Button>
            <NotificationCenter />
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="hidden lg:flex mobile-sm-touch">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button className="gradient-bg border-0 text-white font-semibold text-xs sm:text-sm px-3 sm:px-4 py-2 mobile-sm-touch">
              Login
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}