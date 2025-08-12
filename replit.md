# Cirqlback

## Overview

Cirqlback is an NFC-powered local marketing and loyalty platform for small businesses. The platform connects customers with local businesses through seamless tap-to-reward experiences, enabling merchants to create campaigns, track customer engagement, and build community partnerships. The system uses NFC tags (called "Bugs") placed in businesses that customers can tap to unlock rewards, build loyalty, and participate in "Tap Trails" that encourage multi-store shopping.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Single-page application using React 18+ with TypeScript for type safety
- **Wouter Router**: Lightweight client-side routing for navigation between pages
- **Tailwind CSS + shadcn/ui**: Utility-first CSS framework with a comprehensive component library
- **TanStack Query**: Data fetching, caching, and synchronization for server state management
- **Vite**: Fast build tool and development server with hot module replacement

### Backend Architecture
- **Express.js**: Node.js web framework handling REST API endpoints
- **WebSocket Integration**: Real-time communication for live analytics and notifications
- **Modular Route Structure**: Organized API endpoints for businesses, campaigns, NFC tags, and customer interactions
- **Middleware Pipeline**: Request logging, error handling, and JSON parsing

### Data Layer
- **Drizzle ORM**: Type-safe database toolkit for schema definition and queries
- **PostgreSQL**: Primary database with Neon serverless hosting
- **Schema Design**: Comprehensive tables for users, businesses, campaigns, NFC tags, taps, rewards, and referrals
- **Data Relationships**: Well-defined foreign key relationships between entities

### Key Features
- **Campaign Management**: Merchants can create discount, loyalty, and reward campaigns
- **NFC Tag Writing**: Interface for assigning campaigns to physical NFC tags
- **Customer Tap Interface**: Mobile-optimized experience for claiming rewards
- **Advanced Analytics Dashboard**: Real-time metrics, AI-powered insights, and performance tracking
- **Community Hub**: Gamified challenges, leaderboards, social feeds, and group rewards
- **Premium Referral System**: $5 per friend + 5% lifetime earnings with viral growth mechanics
- **Loyalty Points System**: Tiered membership (Bronze/Silver/Gold/Platinum) with escalating benefits
- **Smart Notifications**: Real-time alerts for rewards, challenges, and achievements
- **AI Pricing Optimization**: Dynamic pricing strategies with market analysis and revenue projections
- **Viral Marketing Campaigns**: Automated social media campaigns with FOMO and challenge templates

### Authentication & Session Management
- **Session-based Authentication**: Uses connect-pg-simple for PostgreSQL session storage
- **User Types**: Support for merchants, customers, and admin roles
- **Business Associations**: Users can manage multiple business profiles

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