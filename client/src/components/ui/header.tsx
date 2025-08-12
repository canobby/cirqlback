import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Store, Smartphone, BarChart3, Users } from "lucide-react";
import cirqlbackLogo from "@assets/066CD1BA-FD9A-40FE-8568-177951876A13_1754965785754.png";

export default function Header() {
  const [location] = useLocation();

  const navigation = [
    { name: "Home", href: "/", icon: null },
    { name: "Customer", href: "/customer", icon: Smartphone },
    { name: "Merchant", href: "/merchant", icon: Store },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Community", href: "/community", icon: Users },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <img 
                src={cirqlbackLogo} 
                alt="Cirqlback Logo" 
                className="h-8 w-auto"
              />
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.name} href={item.href}>
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    isActive 
                      ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}>
                    {Icon && <Icon className="h-4 w-4" />}
                    <span className="font-medium">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu button - simplified for now */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}