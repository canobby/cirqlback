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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 sm:h-20 w-full">
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img 
                src={cirqlbackLogo} 
                alt="Logo" 
                className="h-5 w-auto mr-2 sm:h-6 sm:mr-3 logo-transparent"
                key="cirqlback-logo-v5"
              />
              <span className="text-lg sm:text-xl font-bold gradient-text truncate" style={{ position: 'relative', zIndex: 10 }}>Cirqlback</span>
            </Link>
          </div>
          
          <div className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center space-x-6">
              <Link href="/customer">
                <Button 
                  variant="ghost" 
                  className="px-4 py-2 text-sm font-medium text-gray-900 bg-white hover:text-purple-600 hover:bg-purple-50 border border-gray-200 shadow-sm transition-all duration-200"
                >
                  Customer
                </Button>
              </Link>
              <Link href="/merchant">
                <Button 
                  variant="ghost" 
                  className="px-4 py-2 text-sm font-medium text-gray-900 bg-white hover:text-orange-600 hover:bg-orange-50 border border-gray-200 shadow-sm transition-all duration-200"
                >
                  Merchant
                </Button>
              </Link>
              <Link href="/analytics">
                <Button 
                  variant="ghost" 
                  className="px-4 py-2 text-sm font-medium text-gray-900 bg-white hover:text-blue-600 hover:bg-blue-50 border border-gray-200 shadow-sm transition-all duration-200"
                >
                  Analytics
                </Button>
              </Link>
              <Link href="/map">
                <Button 
                  variant="ghost" 
                  className="px-4 py-2 text-sm font-medium text-gray-900 bg-white hover:text-green-600 hover:bg-green-50 border border-gray-200 shadow-sm transition-all duration-200"
                >
                  Map
                </Button>
              </Link>
              <Link href="/admin-dashboard">
                <Button 
                  variant="ghost" 
                  className="px-4 py-2 text-sm font-medium text-gray-900 bg-white hover:text-red-600 hover:bg-red-50 border border-gray-200 shadow-sm transition-all duration-200"
                >
                  Admin
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
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
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200">
              Login
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}