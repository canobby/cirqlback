# Cirqlback

## Overview

Cirqlback is an NFC-powered local marketing and loyalty platform for small businesses. The platform connects customers with local businesses through seamless tap-to-reward experiences, enabling merchants to create campaigns, track customer engagement, and build community partnerships. The system uses NFC tags (called "Bugs") placed in businesses that customers can tap to unlock rewards, build loyalty, and participate in "Tap Trails" that encourage multi-store shopping.

## User Preferences

Preferred communication style: Simple, everyday language.
Logo: Official Cirqlback logo (modern circular gradient with arrow design featuring orange, green, blue, purple, and pink gradient flow) locked in and implemented throughout platform with transparency.
Terminology: Uses "Cirql tags" instead of "NFC tags" and "Cirql tap" instead of "NFC tap" for user-friendly, non-technical language.
Color Palette: Comprehensive design system based on new logo gradient colors - purple (hsl(260 95% 55%)), pink (hsl(320 100% 60%)), orange (hsl(30 100% 55%)), blue (hsl(200 100% 55%)), and green (hsl(120 70% 45%)) - implemented across all UI components, cards, buttons, and brand elements.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Single-page application using React 18+ with TypeScript for type safety
- **Wouter Router**: Lightweight client-side routing for navigation between pages including account management
- **Tailwind CSS + shadcn/ui**: Utility-first CSS framework with a comprehensive component library
- **TanStack Query**: Data fetching, caching, and synchronization for server state management
- **Vite**: Fast build tool and development server with hot module replacement
- **Account Management UI**: Complete subscription dashboard with API key management, usage statistics, and billing interface

### Backend Architecture
- **Express.js**: Node.js web framework handling REST API endpoints
- **WebSocket Integration**: Real-time communication for live analytics and notifications
- **Modular Route Structure**: Organized API endpoints for businesses, campaigns, NFC tags, customer interactions, account management, and subscriptions
- **Middleware Pipeline**: Request logging, error handling, and JSON parsing
- **Multi-Platform API System**: Single authentication layer providing access to separate platform services
- **Usage Analytics**: Real-time API request tracking and rate limiting based on subscription tier

### Data Layer
- **Drizzle ORM**: Type-safe database toolkit for schema definition and queries
- **PostgreSQL**: Primary database with Neon serverless hosting
- **Schema Design**: Comprehensive tables for users, businesses, campaigns, NFC tags, taps, rewards, referrals, subscriptions, and API usage
- **Data Relationships**: Well-defined foreign key relationships between entities
- **Subscription Tables**: subscription_plans, user_subscriptions, api_usage for complete billing and usage management
- **API Tracking**: Detailed logging of all API requests with endpoint, method, response time, and status code tracking

### Key Features
- **Campaign Management**: Merchants can create discount, loyalty, and reward campaigns
- **Cirql Tag Management**: Interface for assigning campaigns to physical Cirql tags (user-friendly term for NFC)
- **Customer Cirql Tap Interface**: Mobile-optimized experience for claiming rewards via "Cirql tap"
- **Interactive Business Map**: Triple-view map showing participating businesses for customers, visibility rewards earned through referral program for businesses, and visual campaign routes with suggested tap trails for maximum rewards
- **Visual Campaign Routes**: Interactive trail system showing optimal business-to-business paths with challenge completion indicators and reward maximization suggestions
- **Badge System**: Comprehensive peer-visible badges for both customers and businesses showcasing achievements, loyalty levels, and platform contributions
- **AR Video Integration**: Immersive augmented reality experiences that transform simple Cirql taps into interactive mini-games with collectible rewards, progress visualization, and social sharing capabilities
- **Team-Based Social Gamification**: Complete friend invitation system, team formation, cooperative/competitive challenges, social events, and viral growth mechanics to maximize user acquisition and business traffic
- **Advanced Avatar Gamification Hub**: AR treasure hunts, social competitions, peer-to-peer trading system, and streak bonuses with full backend API support
- **Epic Team vs Team Battles**: Live competitive battles between teams with real-time scoring, champion rewards, and team challenge systems
- **Family Plans & Corporate Challenges**: Family group rewards (up to 10 members), corporate employee challenges, and workplace team building through local business discovery
- **Mega Flash Events**: City-wide flash mobs requiring 500+ simultaneous users, massive rewards, and real-time community engagement
- **Inclusive Business Support**: Subtle integration supporting minority groups, LGBTQ+, women-owned businesses through optional business descriptors and AI-powered challenge grouping - equal treatment while enabling community connection
- **Enhanced Marketing Intelligence**: Comprehensive business profiling with target demographics, peak hours, customer capacity, unique selling points, marketing goals, social media presence, and budget tracking for sophisticated AI-powered matching
- **Customer Profile System**: Detailed customer preferences including interests, shopping habits, dietary restrictions, spending patterns, and favorite business types for personalized experience delivery
- **How It Works Page**: Comprehensive educational page with diagrams and explanations for business growth
- **Advanced Analytics Dashboard**: Real-time metrics, AI-powered insights, and performance tracking
- **Community Hub**: Gamified challenges, leaderboards, social feeds, and group rewards
- **Comprehensive Marketing Suite**: Integrated email campaigns, social media automation, SMS marketing, customer segmentation, and multi-platform advertising with Mailchimp, Instagram, Facebook, Google Ads, and Twilio integrations
- **Global Search Functionality**: Unified search across businesses, campaigns, customers, locations, AR experiences, and analytics with keyboard shortcuts and intelligent filtering
- **Settings Management**: Comprehensive user preferences including notifications, privacy controls, integrations, and security settings
- **Visibility Rewards Referral System**: Milestone-based rewards including featured map placement, priority placement, newsletter spotlight, custom tap trails, and champion badges
- **Loyalty Points System**: Tiered membership (Bronze/Silver/Gold/Platinum) with escalating benefits
- **Smart Notifications**: Real-time alerts for rewards, challenges, and achievements
- **AI Pricing Optimization**: Dynamic pricing strategies with market analysis and revenue projections
- **Viral Marketing Campaigns**: Automated social media campaigns with FOMO and challenge templates
- **Real-Time Live Dashboard**: Live user tracking, instant leaderboards, and real-time activity feeds
- **Predictive AI Analytics**: Customer behavior prediction, automated A/B testing, and personalized recommendations
- **Enterprise Integration Hub**: Payment processors, social media APIs, POS systems, email marketing, and webhooks
- **Multi-Location Management**: Franchise operations, regional analytics, white-label branding, and global expansion tools
- **Progressive Web App**: Offline functionality, push notifications, location services, and native app experience
- **Blockchain & Web3**: NFT loyalty rewards, CIRQ token ecosystem, DAO governance, DeFi staking, and crypto payments
- **User Authentication & Subscriptions**: Complete account management with subscription tiers, API key generation, and usage tracking
- **Multi-Platform API Access**: Single API key provides access to multiple separate platforms (Cirql, InSpektAI) with platform-specific functionality
- **Cirql Tags & Add-ons**: Physical NFC stickers ($0.99 each or 6 for $4.99) and New Subscriber Starter Pack ($99) with setup support
- **Referral Program Dashboard**: Complete visibility rewards tracking with milestone progress and referral link sharing

### Authentication & Session Management
- **Session-based Authentication**: Uses connect-pg-simple for PostgreSQL session storage
- **User Types**: Support for business owners (paid subscriptions), customers (free reward access), and admin roles
- **Business Associations**: Users can manage multiple business profiles
- **Subscription Management**: Two-tier business system (Core Cirql Member $14.99/mo or $149.99/yr, Full Cirql Member $29.99/mo or $299.99/yr) - customers use the platform for free through participating businesses
- **API Key System**: Single key authentication for accessing multiple separate platforms (Cirql, InSpektAI)
- **Usage Tracking**: Real-time monitoring of API requests, success rates, and response times
- **Account Dashboard**: Complete profile management, billing, and usage analytics interface

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket Support**: Real-time communication via ws library

### UI & Styling
- **Radix UI**: Accessible, unstyled component primitives
- **Lucide React**: Comprehensive icon library
- **Class Variance Authority**: Utility for building variant-based component APIs
- **TailwindCSS**: Utility-first CSS framework with custom design tokens

### Development Tools
- **ESBuild**: Fast JavaScript bundler for production builds
- **TSX**: TypeScript execution environment for development
- **Drizzle Kit**: CLI tool for database migrations and schema management

### Frontend Libraries
- **React Hook Form**: Form validation and management
- **Date-fns**: Date manipulation and formatting
- **Embla Carousel**: Touch-friendly carousel component
- **Zod**: Runtime type validation for API schemas