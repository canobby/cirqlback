# Cirqlback

## Overview
Cirqlback is the addictive local discovery platform that turns every business visit into an adventure. Like Pokemon Go for local businesses, customers tap "Cirql tags" to unlock collectible treasures, complete daily quests, compete with friends, and earn real rewards. The name "Cirqlback" represents the endless circle of discovery - one tap leads to another adventure, creating an addictive loop that brings customers back again and again. The platform combines gaming excitement with genuine business value, making neighborhood exploration irresistibly fun while driving meaningful engagement for local merchants.

## User Preferences
Preferred communication style: Simple, everyday language.
No Tesla references: User prefers to avoid any Tesla/Elon Musk references in platform messaging.
Logo: Official Cirqlback logo (modern circular gradient with arrow design featuring orange, green, blue, purple, and pink gradient flow) locked in and implemented throughout platform with transparency.
Terminology: Uses "Cirql tags" instead of "NFC tags" and "Cirql tap" instead of "NFC tap" for user-friendly, non-technical language.
Color Palette: Comprehensive design system based on new logo gradient colors - purple (hsl(260 95% 55%)), pink (hsl(320 100% 60%)), orange (hsl(30 100% 55%)), blue (hsl(200 100% 55%)), and green (hsl(120 70% 45%)) - implemented across all UI components, cards, buttons, and brand elements.
**Locked-In Features**: All confirmed features, changes, and billing items are documented in LOCKED_IN_FEATURES_LIST.md and must not be forgotten or overlooked in future development.
**Latest Updates**: Successfully implemented comprehensive iOS NFC writing capabilities using Core NFC framework alongside existing Android Web NFC API support. Created cross-platform NFC writer with device detection, campaign selection, and universal tag programming. Platform now supports NFC tag writing on both iOS (Safari 13+) and Android (Chrome) devices. AR and Pokémon references completely removed from entire platform for business partner presentation readiness.

**STREAMLINED FOR FIRST DEPLOYMENT** (January 2025): Removed AR gaming features, complex viral campaigns, advanced business intelligence suites, and extensive integrations to focus on core NFC tap-to-earn functionality, basic analytics, and essential business management. This creates a focused, easily deployable beta that maintains the addictive discovery experience while being simpler for mass deployment and user onboarding.

**COMPLETE BENTO GRID TRANSFORMATION**: Bento Grid design is now the exclusive interface throughout the entire platform. Implemented modern visual layouts with bold blocks across all major sections:
- Homepage (/) - Modern Bento Grid landing page with integrated phone mockup
- Customer Hub (/customer) - Gamified Bento interface with achievement tracking
- Merchant Dashboard (/merchant) - Bold gradient business management blocks
- Analytics Dashboard (/analytics) - Real-time business intelligence Bento layout
- Discovery Map (/map) - Interactive location-based Bento design
- Campaign Setup (/campaign-setup-wizard) - Visual campaign creation Bento interface
- NFC Setup (/nfc-setup-wizard) - Streamlined tag programming Bento layout

The Bento Grid system features responsive layouts, gradient backgrounds from our color palette (purple, pink, orange, blue, green), visual depth with shadows and animations, large touch-friendly interactive areas, and integrated phone mockups showcasing the customer experience. Classic view options have been completely removed to maintain focus on the modern, visually striking Bento Grid design that provides superior user experience and intuitive navigation.

**Complete Bento Grid Ecosystem Implemented:**
- /merchant-bento - Business management dashboard with bold gradient blocks
- /customer-bento - Gamified discovery interface with achievement tracking  
- /campaign-setup-bento - Visual campaign creation with step-by-step guidance
- /analytics-bento - Real-time business intelligence with visual data blocks
- /home-bento - Modern landing page showcasing platform capabilities
- /nfc-setup-wizard-bento - Guided NFC tag programming with visual steps
- /map-bento - Interactive location discovery with nearby business rewards

Each Bento interface includes navigation buttons to switch between classic and modern layouts, creating a dual-interface system that maintains all functionality while offering visually enhanced user experiences through bold blocks, gradient backgrounds, and intuitive visual hierarchies.

## System Architecture

### UI/UX Decisions
The platform features a comprehensive design system utilizing the Cirqlback logo's gradient colors (purple, pink, orange, blue, green) across all UI components, cards, and buttons. It employs consistent responsive tab layouts, mobile-friendly navigation with progressive disclosure, and standardized overflow scrolling. The user interface prioritizes ease-of-use with consistent workflow patterns and user feedback systems. The dynamic map for merchants adapts based on zoom level and includes comprehensive customer privacy controls for visibility and information sharing.

### Technical Implementations
The frontend is a React 18+ TypeScript single-page application using Wouter for routing, Tailwind CSS and shadcn/ui for styling, and TanStack Query for data management. The backend is built with Express.js for REST API endpoints and integrates WebSockets for real-time communication. It features a modular route structure and a middleware pipeline. The data layer uses Drizzle ORM with PostgreSQL for type-safe schema definition and queries.

### Feature Specifications
Key features include comprehensive cross-platform NFC system integration supporting both iOS Core NFC framework and Android Web NFC API for universal tag writing, management, and analytics; a Campaign Builder with pre-made templates and cross-business collaboration; an Administrator Dashboard with master control, real-time analytics, and subscription management; and a 6-month trial system with tier selection discounts. The platform offers advanced admin invitation and training systems with role-based access control and certification tracking. **iOS NFC Implementation**: Full Safari compatibility for iOS 13+ devices with device detection, campaign selection interface, and guided writing process. **Cross-Platform NFC Writer**: Universal NFC tag programming tool accessible at /nfc-writer with campaign selection, custom URL support, and device-optimized writing protocols. 

**SIMPLIFIED FOR FIRST DEPLOYMENT**: Advanced Business Intelligence and Export Hub features have been streamlined to focus on core analytics and basic integrations. Complex predictive features and extensive third-party integrations will be added in future releases.

**SIMPLIFIED FOR FIRST DEPLOYMENT**: Basic gamification system with points, levels, and simple daily challenges. Complex quest items, crafting mechanics, and competitive elements have been simplified to focus on core reward collection and business discovery functionality.

**COMPLETE AR REMOVAL COMPLETED**: All AR functionality has been completely removed from the platform including AR Game Hub, Treasure Hunts, Avatar Creator, AR schemas, AR routes, and all AR references throughout the codebase. The platform now focuses exclusively on core NFC tap-to-earn functionality with basic gamification elements like points, levels, and team challenges. This streamlined approach ensures maximum demonstration readiness for business partners and simplified mass deployment.

AI functionality is integrated for insights, predictive analytics, and pricing optimization, with full OpenAI integration. It supports session-based authentication for business owners, customers, and admins, with multi-business profile management and a three-tier business subscription system.

### System Design Choices
The system is designed for 100% comprehensive platform validation, ensuring all 32+ pages are optimized for ease-of-use and UX/UI consistency. It supports global networking, allowing customers and merchants to connect for campaigns regardless of proximity. The platform incorporates a flexible location system for merchant discovery on the map and robust privacy controls for users. **Real Data Integration**: Successfully implemented stable sales data input system with proper database schema alignment, UUID generation, and error handling. All form crashes resolved through systematic debugging and API optimization. Comprehensive API endpoint validation ensures production readiness across all core business, customer engagement, analytics, and subscription management functionalities.

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