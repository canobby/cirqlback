# Cirqlback

## Overview

Cirqlback is a comprehensive NFC-powered local marketing and loyalty platform that unifies business websites, AR gaming, team challenges, and customer rewards into one seamless experience. The platform connects customers with local businesses through Cirql tag taps that unlock rewards, immersive AR adventures, team competitions, and access to complete business digital presence - from hosted websites to marketing suites and analytics dashboards.

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
- **Local Discovery Map**: Real-time interactive map displaying subscribed businesses, visible customers, and active rewards with comprehensive search and filtering capabilities
- **Privacy-Controlled Visibility**: Customers can choose their visibility settings, control what information others can see, and manage communication preferences
- **Badge System**: Comprehensive peer-visible badges for both customers and businesses showcasing achievements, loyalty levels, and platform contributions
- **Real-World Map Integration**: Interactive map showing live locations of subscribed businesses, visible customers, and active rewards with privacy controls and communication features
- **Customer-to-Customer Communication**: Messaging system allowing visible customers to connect with each other and contact businesses directly through the map interface
- **Team-Based Social Gamification**: Complete friend invitation system, team formation, cooperative/competitive challenges, social events, and viral growth mechanics to maximize user acquisition and business traffic
- **Advanced Avatar Gamification Hub**: AR treasure hunts, social competitions, peer-to-peer trading system, and streak bonuses with full backend API support
- **Epic Team vs Team Battles**: Live competitive battles between teams with real-time scoring, champion rewards, and team challenge systems
- **Family Plans & Corporate Challenges**: Family group rewards (up to 10 members), corporate employee challenges, and workplace team building through local business discovery
- **Mega Flash Events**: City-wide flash mobs requiring 500+ simultaneous users, massive rewards, and real-time community engagement
- **Inclusive Business Support**: Subtle integration supporting minority groups, LGBTQ+, women-owned businesses through optional business descriptors and AI-powered challenge grouping - equal treatment while enabling community connection
- **Platform-Wide Analytics Integration**: Comprehensive analytics dashboard tracking Cirql taps, website visits, AR engagement, team participation, and cross-platform user journeys. Real-time insights with sophisticated AI-powered business profiling including target demographics, peak hours, customer capacity, unique selling points, marketing goals, and unified performance metrics across all platform features
- **Customer Profile System**: Detailed customer preferences including interests, shopping habits, dietary restrictions, spending patterns, and favorite business types for personalized experience delivery
- **How It Works Page**: Comprehensive educational page with diagrams and explanations for business growth
- **Advanced Analytics Dashboard**: Real-time metrics, AI-powered insights, and performance tracking
- **Community Hub**: Gamified challenges, leaderboards, social feeds, and group rewards
- **Comprehensive Marketing Suite**: Integrated email campaigns, social media automation, SMS marketing, customer segmentation, and multi-platform advertising with Mailchimp, Instagram, Facebook, Google Ads, and Twilio integrations
- **Complete Business Website Platform**: Comprehensive website builder with professional themes, menu management, business hours, social media integration, QR code generation, and SEO optimization. Features live preview, auto-sync with business profiles, integrated Cirql campaigns, AR game showcases, and complete content management - saving businesses $500-2000+ on website development costs while providing unified platform integration
- **Unified Platform Integration**: Complete cross-platform synchronization with real-time notifications, unified search across all features (businesses, campaigns, customers, AR experiences, analytics), platform-wide sync status monitoring, and seamless transitions between customer rewards, AR gaming, business websites, and analytics dashboards
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

### ADVANCED FEATURES INTEGRATION (Latest Implementation - 2025) - COMPLETE

**Platform-Wide Content Alignment Completed - All Major Pages Updated**
✓ Complete platform content updated to reflect advanced AI-powered capabilities
✓ All page titles, descriptions, and feature lists updated across the entire platform
✓ Navigation updated with advanced feature links and comprehensive menu structure
✓ Consistent messaging emphasizing "Tesla of local business platforms" positioning
✓ Navigation bars updated to include Team Challenges, AR Treasure Hunts, and Viral Campaigns
✓ How It Works page enhanced with advanced features showcase and comprehensive capabilities
✓ User guides and interactive walkthroughs updated to reflect complete platform ecosystem
✓ Home page descriptions updated to emphasize unified platform differentiators
✓ Platform overview and documentation comprehensively updated for all advanced features

**AI-Powered Business Intelligence Suite - IMPLEMENTED**
✓ **Customer Health Scoring**: Predictive churn risk analysis with automated win-back campaigns
✓ **Dynamic Pricing Optimization**: Weather-based, competition-aware, and demand-driven pricing recommendations
✓ **Market Intelligence**: Local competition analysis, weather impact insights, and actionable business recommendations
✓ **Predictive Customer Retention**: Automated alerts for at-risk customers with personalized retention strategies

**Cross-Business Partnership Network - IMPLEMENTED**
✓ **Partnership Discovery Engine**: AI-powered compatibility scoring for potential business partnerships
✓ **Cross-Promotion Management**: Automated referral systems between complementary businesses
✓ **Shared Rewards Programs**: Joint campaigns that benefit multiple business locations
✓ **Revenue Sharing Analytics**: Transparent commission tracking and partnership performance metrics

**Team-Based Community Challenges - IMPLEMENTED**
✓ **Multi-Tier Team System**: Casual, competitive, corporate, and family team formations
✓ **Dynamic Challenge Creation**: Business-sponsored and community-driven challenge campaigns
✓ **Social Gamification**: Team leaderboards, achievement badges, and collaborative goals
✓ **Corporate Team Building**: Workplace challenges designed to drive local business discovery

**Advanced AR Treasure Hunt Platform - IMPLEMENTED**
✓ **City-Wide AR Adventures**: Multi-business treasure hunts with immersive storytelling
✓ **Interactive Clue System**: GPS-based, NFC-triggered, and business-integrated puzzle solving
✓ **Virtual Reality Experiences**: Immersive AR menus, 3D product showcases, and interactive business tours
✓ **Achievement-Based Rewards**: Completion certificates, exclusive badges, and business prize integrations

**Exponential Viral Growth Engine - IMPLEMENTED**
✓ **Friend Referral Multiplication**: Exponential reward systems that grow with network effects
✓ **Social Proof Automation**: Real-time customer activity feeds that drive FOMO and engagement
✓ **Cross-Platform Sharing**: Integrated social media campaigns with conversion tracking
✓ **Community-Driven Marketing**: User-generated content campaigns with viral mechanics built-in

**Complete Platform Documentation Update - IMPLEMENTED**
✓ **Navigation Enhancement**: All navigation bars updated with Team Challenges, AR Hunts, Viral Campaigns, and Partnerships
✓ **Content Alignment**: Platform descriptions updated across home page, how-it-works, user guides, and walkthroughs
✓ **Advanced Features Showcase**: Comprehensive feature explanations added to documentation and educational pages
✓ **Unified Messaging**: Consistent "Tesla of local business platforms" positioning throughout all content
✓ **User Experience Optimization**: Interactive walkthroughs and guides updated to reflect complete advanced ecosystem

### Authentication & Session Management
- **Session-based Authentication**: Uses connect-pg-simple for PostgreSQL session storage
- **User Types**: Support for business owners (paid subscriptions), customers (free reward access), and admin roles
- **Business Associations**: Users can manage multiple business profiles
- **Subscription Management**: Three-tier business system with competitive pricing aligned to comprehensive feature set and market standards - customers use the platform for free through participating businesses
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