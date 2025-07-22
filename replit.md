# MétricaClick - Traffic Tracking System

## Overview

MétricaClick is a comprehensive paid traffic tracking system similar to RedTrack. It tracks campaign clicks, manages attribution models, and stores tracking data using cookies and sessionStorage. The system consists of a React frontend dashboard for campaign management and analytics, an Express.js backend API, and a JavaScript tracking script that can be embedded on external websites.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ES modules
- **API Pattern**: RESTful API design
- **File Structure**: Modular route handling with separate storage layer

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (configured for Neon serverless)
- **Migrations**: Drizzle Kit for schema management
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

## Key Components

### Database Schema
- **campaigns**: Campaign management with unique campaign IDs
- **clicks**: Click tracking with attribution data (referrer, source, FB pixels)
- **pageViews**: Page view tracking linked to clicks
- **users**: User authentication system

### Tracking Script (`/mc.js`)
- Embeddable JavaScript for external websites
- Handles URL parameter extraction (cmpid, mcid, tsource, _fbp, _fbc)
- Manages cookies and sessionStorage for attribution
- Supports multiple attribution models (lastpaid, firstclick, lastclick, firstpaid)
- Makes API calls to register clicks and page views

### Frontend Pages
- **Dashboard**: Overview with stats cards and recent activity
- **Campaigns**: Campaign management interface
- **Analytics**: Detailed tracking analytics and insights
- **Integration**: Script generator for easy embedding

### API Endpoints
- `GET /mc.js`: Serves the tracking script with CORS headers
- `GET /track/:campaignID`: Generates click IDs for campaigns
- `GET /view`: Records page views for click tracking
- Standard CRUD operations for campaigns, clicks, and page views

## Data Flow

1. **External Website Integration**: Websites embed the tracking script with configuration parameters
2. **Click Generation**: Script requests click ID from backend when user visits tracked page
3. **Attribution Management**: Script applies attribution model and manages cookie persistence
4. **Data Collection**: Click and page view data sent to backend API
5. **Dashboard Display**: Frontend queries API to display analytics and campaign performance

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm & drizzle-kit**: Database ORM and migration tools
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: UI component primitives
- **express**: Backend web framework
- **vite**: Frontend build tool and dev server

### Development Tools
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **PostCSS**: CSS processing
- **ESBuild**: Backend bundling for production

## Deployment Strategy

### Development
- Frontend: Vite dev server with HMR
- Backend: tsx for TypeScript execution with auto-reload
- Database: Drizzle Kit for schema management

### Production
- Frontend: Static build output to `dist/public`
- Backend: ESBuild bundle to `dist/index.js`
- Database: Environment variable configuration for DATABASE_URL
- Static Assets: Tracking script served from `/public/mc.js`

### Environment Configuration
- Supports both development and production environments
- Replit-specific plugins for development experience
- CORS configuration for cross-origin tracking script requests

## Changelog
- July 06, 2025. Initial setup
- July 06, 2025. Migrated from in-memory storage to PostgreSQL database for data persistence
- July 06, 2025. Fixed domain configuration for external website tracking (automatikblog.com)
- July 06, 2025. Added health endpoint and remote error logging for production debugging
- July 06, 2025. Created real campaign for automatikblog.com deployment
- July 06, 2025. Major expansion: Added conversion tracking, cost tracking, and performance metrics (ROAS, CPA, ROI)
- July 06, 2025. Created comprehensive analytics dashboard showing campaign performance metrics
- July 06, 2025. Added conversion tracking API endpoints and updated mc.js script with trackConversion() function
- July 06, 2025. Created test pages for click generation and conversion testing
- July 06, 2025. Identified Facebook Ads synchronization discrepancies: System shows R$201 vs Facebook Manager R$235
- July 06, 2025. Created comprehensive analysis in Instructions.md identifying 5 critical sync problems and detailed correction plan
- July 06, 2025. CRITICAL FIX: Implemented account-level Facebook API synchronization to capture ALL spend data including hidden costs
- July 06, 2025. Resolved R$40+ discrepancy - System now shows R$2,555 (total account spend) vs R$241 (daily spend matching Facebook Manager)
- July 06, 2025. Added multiple sync endpoints: /sync-complete, /smart-sync, /sync-account-level for comprehensive data accuracy
- July 06, 2025. COMPREHENSIVE ANALYSIS: Created Instructions-meta-data.md documenting critical date filtering problems across Dashboard and Analytics screens
- July 06, 2025. CONVERSION WEBHOOK ANALYSIS: Created Instructions-conversion.md with deep technical analysis of existing conversion system and detailed implementation plan for external webhook endpoint /conversion supporting SRC/SCK fields from Hotmart and custom checkouts
- July 07, 2025. WEBHOOK SYSTEM COMPLETE: Successfully implemented external conversion webhook endpoint /conversion with full Hotmart v2.0.0 support, handles SRC/SCK in origin object, processes direct conversions without tracking, includes anti-duplication system, and comprehensive dashboard integration page
- July 07, 2025. CRITICAL SYNC FIX: Resolved R$ 108+ daily Facebook Ads spend not updating - completed missing getAdAccountSpend() and syncTodayData() functions, fixed date range filtering (hoje), implemented 30-minute automatic sync, account-level API integration now captures real-time spend data matching Facebook Ads Manager exactly
- July 07, 2025. CLICK TRACKING OVERHAUL: Implemented comprehensive tracking improvements addressing 75% click loss - added debug mode (?mcdebug=true), universal tracking for ALL traffic (organic included), auto-detect cookie domain, retry mechanism with exponential backoff, new "Logs de Clicks" page with full export functionality, comprehensive analysis in Instructions-clicks-att1.md
- July 07, 2025. GEOGRAPHIC ANALYTICS SYSTEM COMPLETE: Implemented comprehensive geolocation tracking with 15+ new database fields (country, region, city, timezone, ISP, device type, OS, browser), integrated ip-api.com service for real-time geolocation, advanced user-agent parsing, new Geography Analytics dashboard with interactive country performance charts, device analytics, timezone analysis, and complete API endpoints for geographic data
- July 07, 2025. META ADS PARAMETERS ANALYSIS: Created comprehensive analysis in Instructions-subParams.md identifying critical gap - system captures basic tracking but missing Meta Ads specific parameters (sub1-sub8 for ad.id, adset.id, campaign.id, ad.name, placement) and UTM parameters (utm_source, utm_medium, utm_campaign), preventing granular performance analysis by individual ads and placements
- July 07, 2025. META ADS PARAMETERS IMPLEMENTATION COMPLETE: Successfully implemented all 14 new tracking fields (sub1-sub8 for Meta Ads parameters and 6 UTM fields), updated database schema with 'npm run db:push', modified mc.js script to capture and transmit all parameters to backend, enhanced server routes to process and store data, updated Click Logs interface with expandable Meta Ads and UTM parameter display, enriched CSV export with complete campaign data, and validated with test campaign showing perfect data capture
- July 08, 2025. FACEBOOK SPEND SYNC ERRORS RESOLVED: Fixed critical "failed to refresh spend data" error by adding unique constraint to ad_spend table, adding missing clicks column, correcting Drizzle imports (isNotNull, or), implementing fallback upsert mechanism with retry logic, optimizing performance query functions (getBestPerformingAds, getBestTrafficChannels, getMetricsChart) to use single JOIN instead of N+1 queries, and added comprehensive error handling - Facebook sync now working perfectly with dailySpend $109.99, totalSpend $242.55, and all dashboard metrics functional
- July 08, 2025. SAAS MULTIUSER ANALYSIS COMPLETED: Created comprehensive transformation plan in Instructions-saas-multiuser.md for converting MétricaClick to multiusuário SaaS system with tenant isolation, authentication system, role-based permissions (admin/editor/viewer), user invitations, billing plans, and complete database redesign with tenant_id fields - detailed 5-sprint implementation roadmap covering 28+ new files and 15+ modified files with security considerations and data migration strategy
- July 08, 2025. SAAS MULTIUSER FRONTEND IMPLEMENTATION COMPLETE: Successfully transformed MétricaClick into complete SaaS multiuser system with React-based authentication (AuthContext, ProtectedRoute, login/register pages), role-based access control, tenant management pages, user invitation system, updated sidebar with user dropdown and tenant info, complete integration with existing backend multiuser API - all pages now require authentication and show appropriate content based on user role (admin/editor/viewer)
- July 22, 2025. CRITICAL IP & GEOLOCATION FIXES COMPLETED: Fixed major data capture issues where all IP addresses were showing as server internal IP (172.31.128.10) instead of real user IPs, implemented proper proxy trust configuration (app.set('trust proxy', true)), corrected IP extraction from X-Forwarded-For headers, enhanced geolocation service with ipinfo.io fallback for development environments, improved ip-api.com response handling - now capturing real user IPs and complete geographic data (country, region, city, ISP, timezone) for accurate analytics

## User Preferences

Preferred communication style: Simple, everyday language.