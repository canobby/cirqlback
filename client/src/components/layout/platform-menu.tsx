import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { 
  Menu, 
  Home, 
  Store, 
  Users, 
  BarChart3, 
  Settings, 
  Map, 
  Zap, 
  BookOpen,
  CreditCard,
  User,
  UserCircle,
  Gamepad2,
  Globe,
  HelpCircle,
  NfcIcon
} from "lucide-react";

export default function PlatformMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 sm:gap-2 mobile-sm-touch px-2 sm:px-3">
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">All Pages</span>
          <span className="sm:hidden">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 sm:w-64" align="end">
        <DropdownMenuLabel>🏠 Core Platform</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/" className="flex items-center gap-2 w-full">
            <Home className="h-4 w-4" />
            Home Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/customer" className="flex items-center gap-2 w-full">
            <User className="h-4 w-4" />
            Customer Portal
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/merchant" className="flex items-center gap-2 w-full">
            <Store className="h-4 w-4" />
            Merchant Dashboard
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>🎮 AR & Gaming</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/ar-hub" className="flex items-center gap-2 w-full">
            <Gamepad2 className="h-4 w-4" />
            AR Game Hub
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/avatar" className="flex items-center gap-2 w-full">
            <UserCircle className="h-4 w-4" />
            Avatar Creator
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/ar/demo" className="flex items-center gap-2 w-full">
            <Zap className="h-4 w-4" />
            AR Experience
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>📍 Discovery & Social</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/map" className="flex items-center gap-2 w-full">
            <Map className="h-4 w-4" />
            Interactive Map
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/community" className="flex items-center gap-2 w-full">
            <Users className="h-4 w-4" />
            Community Hub
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/tap" className="flex items-center gap-2 w-full">
            <NfcIcon className="h-4 w-4" />
            Tap Interface
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>📊 Business Tools</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/analytics" className="flex items-center gap-2 w-full">
            <BarChart3 className="h-4 w-4" />
            Analytics Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/marketing" className="flex items-center gap-2 w-full">
            <BookOpen className="h-4 w-4" />
            Marketing Suite
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/website-preview" className="flex items-center gap-2 w-full">
            <Globe className="h-4 w-4" />
            Website Builder
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>⚙️ Account & Settings</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/account" className="flex items-center gap-2 w-full">
            <User className="h-4 w-4" />
            Account Management
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile-setup" className="flex items-center gap-2 w-full">
            <UserCircle className="h-4 w-4" />
            Profile Setup
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2 w-full">
            <UserCircle className="h-4 w-4" />
            Customer Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2 w-full">
            <Settings className="h-4 w-4" />
            Platform Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/checkout" className="flex items-center gap-2 w-full">
            <CreditCard className="h-4 w-4" />
            Subscription Checkout
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>🔧 Development & Testing</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/test-system" className="flex items-center gap-2 w-full">
            <Settings className="h-4 w-4" />
            Test System
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin-dashboard" className="flex items-center gap-2 w-full">
            <Settings className="h-4 w-4" />
            Admin Dashboard
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>📚 Information</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/how-it-works" className="flex items-center gap-2 w-full">
            <HelpCircle className="h-4 w-4" />
            How It Works
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}