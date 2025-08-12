import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CircleX } from "lucide-react";
import NotificationCenter from "@/components/notifications/notification-center";
import cirqlbackLogo from "@assets/066CD1BA-FD9A-40FE-8568-177951876A13_1754965785754.png";

export default function Navbar() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <img 
                src={cirqlbackLogo} 
                alt="Cirqlback" 
                className="h-8 w-auto"
              />
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link href="/customer">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    isActive("/customer") 
                      ? "text-gray-900 bg-gray-100" 
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Customer
                </Button>
              </Link>
              <Link href="/merchant">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    isActive("/merchant") 
                      ? "text-gray-900 bg-gray-100" 
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Merchant
                </Button>
              </Link>
              <Link href="/community">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    isActive("/community") 
                      ? "text-gray-900 bg-gray-100" 
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Community
                </Button>
              </Link>
              <Link href="/analytics">
                <Button 
                  variant="ghost" 
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    isActive("/analytics") 
                      ? "text-gray-900 bg-gray-100" 
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Analytics
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            <Button className="gradient-bg border-0 text-white font-semibold">
              Login
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
