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
**Latest Updates**: Successfully resolved Real Data input system crashes and database integration issues. Fixed UUID generation, data type mismatches, and API validation. Real sales data input now works seamlessly with proper ROI calculations and comparison analytics. Platform ready for production use with stable form handling and reliable data persistence.

## System Architecture

### UI/UX Decisions
The platform features a comprehensive design system utilizing the Cirqlback logo's gradient colors (purple, pink, orange, blue, green) across all UI components, cards, and buttons. It employs consistent responsive tab layouts, mobile-friendly navigation with progressive disclosure, and standardized overflow scrolling. The user interface prioritizes ease-of-use with consistent workflow patterns and user feedback systems. The dynamic map for merchants adapts based on zoom level and includes comprehensive customer privacy controls for visibility and information sharing.

### Technical Implementations
The frontend is a React 18+ TypeScript single-page application using Wouter for routing, Tailwind CSS and shadcn/ui for styling, and TanStack Query for data management. The backend is built with Express.js for REST API endpoints and integrates WebSockets for real-time communication. It features a modular route structure and a middleware pipeline. The data layer uses Drizzle ORM with PostgreSQL for type-safe schema definition and queries.

### Feature Specifications
Key features include comprehensive NFC system integration for tag writing, management, and analytics; a Campaign Builder with pre-made templates and cross-business collaboration; an Administrator Dashboard with master control, real-time analytics, and subscription management; and a 6-month trial system with tier selection discounts. The platform also offers advanced admin invitation and training systems with role-based access control and certification tracking. 

**Business Intelligence Suite**: Comprehensive AI-powered business management featuring predictive customer behavior analysis, autonomous marketing orchestration, hyper-local intelligence networks, real-time revenue optimization, customer experience orchestration, and intelligent business relationship engines. The suite includes advanced automation capabilities across customer lifecycle management, revenue optimization, reputation management, and staff operations that exceed competitor offerings through integration of physical NFC interactions with digital analytics.

**Export & Integration Hub**: Premium feature providing extensive platform integrations with 22+ major business tools including QuickBooks, Xero, Mailchimp, HubSpot, Salesforce, Shopify, Square, Toast POS, Stripe, Google Analytics, social media platforms, and communication tools. Features marketing automation, customer communication hubs, A/B testing suites, and competitive intelligence capabilities.

**Cirql Quest Gamification System**: Pokemon Go-like customer experience featuring collectible quest items, daily challenges, achievement systems, global leaderboards, item crafting/fusion mechanics, and addictive progression loops. Players collect rare items (common to legendary) through business visits, complete daily quests for rewards, compete on global leaderboards, and unlock achievements. The system creates customer addiction through collecting, building, crafting, and competing while driving continuous engagement with local businesses.

**AR Game Hub with Platform Choice**: Multi-platform gaming system allowing customers to choose their preferred gaming style (Pokemon Go, Minecraft, Fortnite, Candy Crush) while maintaining merchant integration. Features AR treasure hunts, business builder challenges, merchant battle royales, and puzzle matching games. Each style provides unique experiences while driving customers to local businesses through missions, rewards, and return visits. System includes real-time AR instructions, business location integration, and progressive rewards tied to merchant goals.

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