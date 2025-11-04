# GoodPick Go MVP

## Overview

GoodPick Go is a multi-language coupon recommendation platform designed for the Thai/Asian market. The system enables consumers to discover deals through social media channels (TikTok, Facebook, Instagram, YouTube, LINE), claim digital coupons, and redeem them at partner stores. The platform emphasizes LINE as the primary authentication and distribution channel, with a mobile-first design approach inspired by popular Asian e-commerce platforms like LINE Shopping and Shopee.

The platform serves three main user types:
- **Consumers**: Browse campaigns, claim coupons, and redeem them at stores
- **Administrators**: Manage stores, campaigns, and multi-language content
- **Store Staff**: Verify and redeem customer coupons (simplified in MVP)

Key business requirements include:
- Product-agnostic architecture (no hardcoded product names)
- LINE-based authentication and distribution
- Multi-language support (Chinese Simplified, English, Thai)
- OpenAI-powered content translation
- Mobile-optimized user experience

## Recent Changes

### Campaign Detail Page O2O Optimization (November 2025)
Enhanced the campaign detail page to strengthen online-to-offline conversion with focus on store navigation:
- **Navigation Feature** (Core O2O Value):
  - Added Google Maps navigation buttons on each store card
  - Generates deep links using coordinates or encoded addresses
  - Mobile: Opens native Maps app (`_self` target)
  - Desktop: Opens in new tab (`_blank` with `rel="noopener"`)
  - Translation support: 导航/Navigate/นำทาง
- **Visual Refinements**:
  - Carousel arrows: Reduced to 32px (h-8 w-8) for subtler appearance
  - Campaign title: Reduced from text-2xl to text-xl md:text-2xl
  - Store section heading: Reduced from default CardTitle to text-lg md:text-xl
  - Campaign rules: Moved to Dialog (ghost button above claim CTA)
  - Stock/limit info: Combined to single-line flex layout
  - Store display: Limited to 3 nearest stores with enhanced cards (image, rating, phone, navigation)
- **Impact**: Strengthens core business value of driving users from online campaigns to physical store visits

### Web OAuth Flow Simplified to 2 Steps (November 2025)
Dramatically improved conversion rates by simplifying the Web OAuth user flow:
- **Before**: 5 steps (click claim → explanation dialog → confirm → LINE auth → callback)
- **After**: 2 steps (click claim → LINE auth → auto-complete)
- **Changes**:
  - Removed login explanation dialog to eliminate friction
  - Direct redirect to LINE OAuth authorization
  - CSRF protection remains intact (transparent to users)
  - Auto-claim after successful authentication
- **Impact**: Expected to significantly reduce bounce rates for external traffic from TikTok, Facebook, Instagram ads

### Staff Redemption Authorization System (November 2025)
Implemented multi-staff coupon redemption authorization system with the following features:
- **Backend APIs**:
  - Staff preset CRUD operations (`/api/admin/staff-presets`)
  - QR code generation for authorization (`/api/admin/staff-presets/qr/:token`)
  - Token verification and staff binding (`/api/user/staff-presets/verify`, `/api/user/staff-presets/bind`)
- **Frontend**:
  - Staff authorization management UI in AdminStores page
  - Staff binding page at `/staff/bind` for QR code verification and LINE login
  - Multi-language support for all staff-related features (zh-cn, en-us, th-th)
- **Security**:
  - Token-based authorization workflow with one-time-use tokens (nanoid)
  - Phone number verification (LINE account phone must match preset phone)
  - One store can have multiple staff presets (one-to-many relationship)
- **JWT Security Enhancement**:
  - JWT_SECRET now required in production (fails fast if not set)
  - Development mode shows warning when using fallback secret
  - All JWT signing and verification now use consistent JWT_SECRET_VALUE

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: 
- Shadcn/ui components with Radix UI primitives for accessible, customizable components
- Tailwind CSS for styling with custom design tokens
- Design follows "New York" style variant from Shadcn
- Mobile-first responsive design with specific breakpoints for tablet and desktop

**State Management**:
- React Query (TanStack Query) for server state management
- React Context API for authentication state (AuthContext)
- Local state with React hooks for component-level state

**Routing**: Wouter for lightweight client-side routing

**Authentication Flow**:
- Separate authentication contexts for admin and user sessions
- Token-based authentication stored in localStorage
- JWT tokens passed via Authorization headers for API requests

**Key Design Decisions**:
- Component-driven architecture with reusable UI primitives
- Path aliases (@/, @shared/, @assets/) for clean imports
- Custom CSS variables for theming and dark mode support
- Accessibility-first approach using Radix UI primitives

### Backend Architecture

**Framework**: Express.js running on Node.js

**Database ORM**: Drizzle ORM with PostgreSQL dialect (configured for Neon serverless PostgreSQL)

**Authentication Strategy**:
- Dual authentication system: Admin (email/password) and User (LINE ID token)
- JWT-based session management with configurable expiration
- Separate middleware for admin and user route protection
- LINE ID token verification through LINE's OAuth2 API

**API Structure**:
- RESTful API design with `/api` prefix
- Route organization:
  - `/api/auth/admin/*` - Admin authentication
  - `/api/auth/user/*` - User authentication with LINE
  - `/api/admin/*` - Protected admin routes (stores, campaigns)
  - `/api/user/*` - Protected user routes (coupons)

**Database Schema Design**:

Core entities:
- **Admins**: Platform administrators with email/password authentication
- **Users**: End consumers authenticated via LINE (lineUserId as unique identifier, optional phone field for staff binding)
- **Stores**: Physical locations with geocoding support and Google Maps integration
- **Campaigns**: Marketing campaigns with simple title and description fields
- **CampaignStores**: Many-to-many relationship linking campaigns to stores
- **Coupons**: User-claimed coupons with unique codes and redemption tracking
- **MediaFiles**: Images and videos associated with campaigns
- **StaffPresets**: Staff authorization presets for coupon redemption at stores

Important Design Decision:
- Campaign content (title, description) uses **single-language** fields only
- Multi-language support is for **UI interface** translation via i18n, not campaign data
- Administrators input campaign content in one language of their choice
- No automatic translation feature for campaign content

Enums:
- discount_type: final_price, gift_card, cash_voucher, full_reduction, percentage_off
- coupon_status: unused, used, expired
- language: zh-cn, en-us, th-th
- channel: line_menu, tiktok, facebook, ig, youtube, other

**Key Architectural Decisions**:
- Serverless PostgreSQL with connection pooling via Neon
- WebSocket constructor override for Neon compatibility
- Raw body preservation for potential webhook integrations
- Request/response logging middleware for API debugging
- Separate build outputs for client (dist/public) and server (dist)

### Security Considerations

- Password hashing using bcryptjs
- JWT secret from environment variables (required in production, warning in development)
  - Production environments must set JWT_SECRET to avoid security vulnerabilities
  - Development uses fallback secret with console warning
- CORS and credential handling in API client
- Input validation using Zod schemas
- Protected routes with middleware authentication checks
- Staff authorization system with token-based QR code verification
  - Phone number verification required for staff binding (LINE phone must match preset phone)
  - One-time-use tokens with nanoid for security
  - Authorization tokens bound to specific stores

### Development vs Production

**Development Mode**:
- Vite dev server with HMR (Hot Module Replacement)
- Replit-specific plugins (cartographer, dev banner, runtime error overlay)
- Source maps enabled
- Custom logging with timestamp formatting

**Production Mode**:
- Static asset compilation to dist/public
- Server bundled with esbuild (ESM format)
- Environment-specific configuration
- Optimized build outputs

## External Dependencies

### Third-Party Services

**LINE Platform Integration**:
- LINE Login OAuth2 for user authentication
- ID token verification endpoint: `https://api.line.me/oauth2/v2.1/verify`
- Required environment variables: LINE_CHANNEL_ID
- Enables one-click social login and LIFF (LINE Front-end Framework) support

**OpenAI API**:
- Accessed through Replit's AI Integrations service
- Used for automated content translation between supported languages
- Model: gpt-4o-mini for cost-effective translations
- Environment variables: AI_INTEGRATIONS_OPENAI_BASE_URL, AI_INTEGRATIONS_OPENAI_API_KEY
- Translation service maintains language mappings and handles fallbacks

**Neon PostgreSQL Database**:
- Serverless PostgreSQL hosting
- Connection via @neondatabase/serverless package
- WebSocket-based connection protocol
- Environment variable: DATABASE_URL
- Schema migrations managed via Drizzle Kit

### UI Component Libraries

**Radix UI Primitives**: 
- Accordion, Alert Dialog, Aspect Ratio, Avatar, Checkbox, Collapsible
- Context Menu, Dialog, Dropdown Menu, Hover Card, Label, Menubar
- Navigation Menu, Popover, Progress, Radio Group, Scroll Area
- Select, Separator, Slider, Switch, Tabs, Toast, Toggle, Tooltip
- Provides accessibility features and unstyled base components

**Additional UI Dependencies**:
- cmdk - Command palette/search interface
- vaul - Drawer component for mobile
- embla-carousel-react - Carousel/slider functionality
- react-day-picker - Calendar/date picker
- input-otp - OTP input fields
- recharts - Data visualization and charts

### Styling and Utilities

- Tailwind CSS with custom configuration
- class-variance-authority - Component variant management
- clsx & tailwind-merge - Conditional className utilities
- Lucide React - Icon library
- PostCSS with Autoprefixer

### Form and Validation

- react-hook-form - Form state management
- @hookform/resolvers - Form validation adapters
- zod - Schema validation
- drizzle-zod - Drizzle ORM schema to Zod conversion

### Build and Development Tools

- Vite - Build tool and dev server
- esbuild - Production server bundling
- tsx - TypeScript execution for development
- TypeScript - Type safety
- Drizzle Kit - Database migrations and schema management

### Fonts

Google Fonts integration:
- Architects Daughter (decorative)
- DM Sans (primary sans-serif)
- Fira Code (monospace)
- Geist Mono (alternative monospace)

### Environment Configuration

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing (default: 'change_this_to_strong_secret')
- `JWT_EXPIRES_IN` - Token expiration time (default: '7d')
- `LINE_CHANNEL_ID` - LINE authentication channel ID
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API base URL (Replit integration)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (Replit integration)
- `NODE_ENV` - Environment indicator (development/production)
- `REPL_ID` - Replit environment identifier