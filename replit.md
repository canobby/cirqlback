# Cirqlback

## Overview
Cirqlback is an NFC-powered local marketing and loyalty platform. It integrates business websites, AR gaming, team challenges, and customer rewards into a single experience. The platform connects customers with local businesses via "Cirql tag" taps, which unlock rewards, AR adventures, team competitions, and access to business digital presences, including hosted websites, marketing suites, and analytics. Its vision is to be the most comprehensive local business platform available, offering revolutionary features for business growth, customer engagement, and community building, with ambitions for widespread adoption and a strong market presence.

## User Preferences
Preferred communication style: Simple, everyday language.
No Tesla references: User prefers to avoid any Tesla/Elon Musk references in platform messaging.
Logo: Official Cirqlback logo (modern circular gradient with arrow design featuring orange, green, blue, purple, and pink gradient flow) locked in and implemented throughout platform with transparency.
Terminology: Uses "Cirql tags" instead of "NFC tags" and "Cirql tap" instead of "NFC tap" for user-friendly, non-technical language.
Color Palette: Comprehensive design system based on new logo gradient colors - purple (hsl(260 95% 55%)), pink (hsl(320 100% 60%)), orange (hsl(30 100% 55%)), blue (hsl(200 100% 55%)), and green (hsl(120 70% 45%)) - implemented across all UI components, cards, buttons, and brand elements.

## Recent Changes (August 12, 2025)
- Fixed AR Gaming Hub routing issue: Added missing route `/ar-game-hub` to App.tsx router
- Added AR Experience routes: `/ar-experience/:id` and `/ar/:tapId` for AR functionality  
- Added Business Settings route: `/business-settings` for merchant configuration
- **MAJOR: Implemented comprehensive Campaign Builder with cross-business collaboration**
  * Pre-made campaign templates (6 categories: loyalty, cross-business, team challenges, seasonal, acquisition, events)
  * AI campaign suggestion engine for unique ideas
  * Cross-business partnership system with open/closed campaign options
  * Template-driven reward systems with ROI estimations
  * Smart partner search and invitation system
  * Campaign collaboration types: Solo, Partner, Network campaigns
- Added campaign database schema supporting collaboration and participation tracking
- Campaign Builder route: `/campaign-builder` now fully operational
- Resolved all LSP diagnostic errors in schema and routes files
- All 27+ page routes now fully operational with complete feature set
- Comprehensive platform testing completed: API endpoints, database systems, frontend systems, and advanced features all confirmed working

## System Architecture

### Frontend
The frontend is a React 18+ TypeScript single-page application using Wouter for routing, Tailwind CSS and shadcn/ui for styling, and TanStack Query for data management. It includes a comprehensive account management UI with subscription, API key, usage, and billing interfaces.

### Backend
The backend is built with Express.js for REST API endpoints, integrating WebSockets for real-time communication. It features a modular route structure, a middleware pipeline for logging and error handling, and a multi-platform API system with a single authentication layer. It also tracks API usage for analytics and rate limiting.

### Data Layer
The data layer uses Drizzle ORM with PostgreSQL (hosted on Neon) for type-safe schema definition and queries. The schema includes comprehensive tables for users, businesses, campaigns, NFC tags, taps, rewards, referrals, subscriptions, and API usage, with well-defined relationships and detailed API tracking.

### Key Features
- **Campaign & Cirql Tag Management**: Merchants can create discount, loyalty, and reward campaigns and assign them to physical Cirql tags.
- **Customer Engagement**: Mobile-optimized "Cirql tap" interface for reward claims, a local discovery map with privacy controls, and a peer-visible badge system.
- **Social & Gamification**: Customer-to-customer communication, team-based social gamification with challenges, AR treasure hunts, real-time competitive battles, and family/corporate plans.
- **Business Intelligence**: AI-powered analytics dashboard with customer health scoring, dynamic pricing optimization, market intelligence, and predictive customer retention.
- **Marketing & Website Platform**: Integrated marketing suite (email, SMS, social media automation) and a comprehensive business website builder with professional themes and content management.
- **Unified Platform Integration**: Seamless cross-platform synchronization, real-time notifications, unified search, and transitions across all features.
- **Authentication & Subscriptions**: Session-based authentication supporting business owners, customers, and admins. Users can manage multiple business profiles. A three-tier business subscription system with API key generation and usage tracking is included.
- **Growth Engines**: Cross-business partnership network, exponential viral growth engine with referral multiplication and social proof automation.

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **ws**: WebSocket library for real-time communication.

### UI & Styling
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **Class Variance Authority**: Utility for building variant-based component APIs.
- **TailwindCSS**: Utility-first CSS framework.

### Development Tools
- **ESBuild**: Fast JavaScript bundler.
- **TSX**: TypeScript execution environment.
- **Drizzle Kit**: CLI tool for database migrations and schema management.

### Frontend Libraries
- **React Hook Form**: Form validation and management.
- **Date-fns**: Date manipulation.
- **Embla Carousel**: Touch-friendly carousel.
- **Zod**: Runtime type validation.