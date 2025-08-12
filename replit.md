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
- **How It Works Page**: Comprehensive educational page with diagrams and explanations for business growth
- **Advanced Analytics Dashboard**: Real-time metrics, AI-powered insights, and performance tracking
- **Community Hub**: Gamified challenges, leaderboards, social feeds, and group rewards
- **Premium Referral System**: $5 per friend + 5% lifetime earnings with viral growth mechanics
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

### Authentication & Session Management
- **Session-based Authentication**: Uses connect-pg-simple for PostgreSQL session storage
- **User Types**: Support for merchants, customers, and admin roles
- **Business Associations**: Users can manage multiple business profiles
- **Subscription Management**: Three-tier system (Free $0, Premium $99, Enterprise $299) with feature restrictions
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