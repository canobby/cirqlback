import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, Settings } from "lucide-react";
import PlatformMenu from "@/components/layout/platform-menu";
import NotificationCenter from "@/components/global/notification-center";
import { LanguageSelector } from "@/components/ui/language-selector";
import { QuickTranslate } from "@/components/ui/translated-text";
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
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex items-center min-w-0">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
              <img 
                src={cirqlbackLogo} 
                alt="Logo" 
                className="h-5 w-auto mr-2 sm:h-6 sm:mr-3 logo-transparent"
                key="cirqlback-logo-v5"
              />
              <span className="text-lg sm:text-xl font-bold gradient-text truncate">Cirqlback</span>
            </Link>
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
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200">
              <QuickTranslate text="Login" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}