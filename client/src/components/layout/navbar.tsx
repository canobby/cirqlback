import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Map,
  HelpCircle,
  User,
  Users,
  Store,
  BarChart3,
  Zap,
  BookOpen,
  Shield,
  Settings,
  LogOut,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { LanguageSelector } from "@/components/ui/language-selector";
import NotificationCenter from "@/components/global/notification-center";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import cirqlbackLogo from "@assets/cirqlback-logo-transparent.png";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Everyone sees these.
const COMMON: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/map", label: "Map", icon: Map },
  { href: "/how-it-works", label: "How it works", icon: HelpCircle },
];

// Added based on the authenticated user's role.
const BY_ROLE: Record<string, NavItem[]> = {
  customer: [
    { href: "/customer", label: "My Rewards", icon: User },
    { href: "/community", label: "Community", icon: Users },
  ],
  merchant: [
    { href: "/merchant", label: "Dashboard", icon: Store },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/campaign-builder", label: "Campaigns", icon: Zap },
    { href: "/marketing", label: "Marketing", icon: BookOpen },
  ],
  admin: [{ href: "/admin-dashboard", label: "Admin", icon: Shield }],
};

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const role = (user?.role as string) || "";
  const navItems: NavItem[] = [...COMMON, ...(BY_ROLE[role] || [])];

  const isActive = (path: string) =>
    path === "/" ? location === "/" : location.startsWith(path);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Signed out" });
      setLocation("/");
    },
  });

  const initial = (user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Left: logo + desktop primary nav */}
          <div className="flex items-center min-w-0 gap-6">
            <Link
              href="/"
              className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <img
                src={cirqlbackLogo}
                alt="Logo"
                className="h-5 w-auto mr-2 sm:h-6 sm:mr-3 logo-transparent"
                key="cirqlback-logo-v5"
              />
              <span className="text-lg sm:text-xl font-bold gradient-text truncate">
                Cirqlback
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: language, notifications, auth, mobile menu */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden sm:block">
              <LanguageSelector variant="button" size="sm" />
            </div>
            {isAuthenticated && <NotificationCenter />}

            {/* Auth control (desktop) */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden lg:flex items-center gap-2"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold">
                      {initial}
                    </span>
                    <span className="max-w-[120px] truncate text-sm">
                      {user?.firstName || user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {user?.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="flex items-center gap-2 w-full">
                      <User className="h-4 w-4" /> Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2 w-full">
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  {role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin-dashboard"
                        className="flex items-center gap-2 w-full"
                      >
                        <Shield className="h-4 w-4" /> Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth" className="hidden lg:block">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200">
                  Log in
                </Button>
              </Link>
            )}

            {/* Mobile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden px-2">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="flex items-center gap-2 w-full">
                        <Icon className="h-4 w-4" /> {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/account" className="flex items-center gap-2 w-full">
                        <User className="h-4 w-4" /> Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2 w-full">
                        <Settings className="h-4 w-4" /> Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => logoutMutation.mutate()}
                      className="flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link href="/auth" className="flex items-center gap-2 w-full">
                      <User className="h-4 w-4" /> Log in
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
