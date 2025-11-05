# GoodPick Go MVP

## Overview

GoodPick Go is a multi-language coupon recommendation platform targeting the Thai/Asian market. It enables consumers to discover and redeem digital coupons via social media (TikTok, Facebook, Instagram, YouTube, LINE), primarily utilizing LINE for authentication and distribution. The platform supports three user types: Consumers (claim/redeem coupons), Administrators (manage content, stores, campaigns), and Store Staff (verify redemptions). Key features include LINE-based authentication, multi-language support (Chinese Simplified, English, Thai), OpenAI-powered content translation, and a mobile-first design inspired by popular Asian e-commerce platforms. The project aims for a product-agnostic architecture to ensure scalability.

## Recent Changes (November 2025)

### Redemption Code System Update
- **8-Digit Redemption Codes**: Changed from 6-digit to 8-digit numeric codes (00000000-99999999) for improved uniqueness and security
- Updated `generateUniqueCouponCode()` function and database schema to support the new format

### Staff OA Implementation
- **Three Independent Routes**: Created dedicated Staff OA pages with independent routing structure:
  - `/staff/redeem` - Coupon redemption interface (8-digit code input, two-step verification)
  - `/staff/stats` - Personal statistics dashboard (daily/weekly/monthly redemption counts, campaign breakdown)
  - `/staff/campaign` - Campaign information and training materials
- **Complete i18n Support**: All Staff OA pages fully support Chinese/English/Thai language switching
- **Backend APIs**:
  - `POST /api/staff/redeem/query` - Query coupon details by 8-digit code
  - `POST /api/staff/redeem/execute` - Execute redemption after verification
  - `GET /api/staff/summary` - Get staff's redemption statistics
  - `GET /api/staff/recent-redemptions` - Get recent redemption records
  - `GET /api/staff/campaigns` - Get campaigns with multi-language content

### Admin Dashboard Implementation
- **Multi-Dimensional Analytics**: Created comprehensive dashboard at `/admin/dashboard` with:
  - **Summary Cards**: Monthly overview (issued count, redeemed count, redemption rate, active stores)
  - **Campaign Dimension**: Performance metrics by campaign (issued, redeemed, rate)
  - **Brand Dimension**: Aggregated statistics by brand (stores count, issued, redeemed, rate)
  - **Store Dimension**: Detailed store-level performance with pagination support
- **Time-Based Analysis**: Month selector with navigation (previous/next month) for historical data queries
- **Backend Dashboard APIs**:
  - `GET /api/admin/dashboard/summary?month=YYYY-MM` - Monthly summary statistics
  - `GET /api/admin/dashboard/campaigns?month=YYYY-MM` - Campaign dimension data
  - `GET /api/admin/dashboard/brands?month=YYYY-MM` - Brand dimension data  
  - `GET /api/admin/dashboard/stores?month=YYYY-MM&page=1&limit=20` - Store dimension data with pagination
- **Full i18n Coverage**: All UI text uses i18n keys (no hardcoded strings), supports Chinese/English/Thai
- **Testing**: End-to-end testing completed successfully, verified all Dashboard features and multi-language switching

### Store Floor Information Feature
- **Business Problem**: Partner stores are often shop-in-shop locations within large shopping malls. Google Maps can only navigate to the mall entrance, leaving customers unable to find the specific store location within the building.
- **Solution**: Added `floorInfo` field to stores table for location descriptions (e.g., "3rd Floor, near Starbucks")
- **Database Schema**: Added optional `floorInfo` text column to `stores` table
- **Admin Interface**: Store management form includes floor/location info input with multi-language placeholder examples
- **User Interface**: Store cards prominently display floor information with Building2 icon in orange accent color
- **Multi-Language Support**: Complete i18n coverage for Chinese/English/Thai (stores.floorInfo, stores.floorInfoPlaceholder, stores.floorInfoHelp)
- **Data Flow**: Admin fills form → Frontend mutation → Backend API (POST/PUT /api/admin/stores) → PostgreSQL → User campaign detail page displays with icon
- **Use Case**: Users see floor info before navigation, remember location details, navigate to mall entrance via Google Maps, then find specific store using floor info + store photo

## User Preferences

**语言要求**: 必须使用中文沟通（用户不懂英文，这是强制要求）
Preferred communication style: Simple, everyday language in Chinese.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite.
**UI/UX**: Shadcn/ui components with Radix UI primitives, styled with Tailwind CSS following a "New York" design variant. Emphasizes mobile-first responsive design.
**State Management**: React Query for server state, React Context API for authentication, and React hooks for local state.
**Routing**: Wouter for client-side routing.
**Authentication**: Token-based authentication stored in localStorage, JWTs passed via Authorization headers.
**Key Design Decisions**: Component-driven architecture, path aliases for clean imports, custom CSS variables for theming, and an accessibility-first approach.

### Backend Architecture

**Framework**: Express.js on Node.js.
**Database ORM**: Drizzle ORM with PostgreSQL dialect (configured for Neon serverless PostgreSQL).
**Authentication**: Dual system for Admin (email/password) and User (LINE ID token) with JWT-based session management. LINE ID token verification is handled via LINE's OAuth2 API.
**API Structure**: RESTful API (`/api` prefix) with organized routes for admin, user, and authentication.
**Database Schema**: Core entities include Admins, Users (LINE ID), Stores, Campaigns, CampaignStores (many-to-many), Coupons, MediaFiles, and StaffPresets. Campaign content fields are single-language; multi-language support is for UI translation via i18n.
**Key Architectural Decisions**: Serverless PostgreSQL with connection pooling (Neon), WebSocket constructor override for Neon compatibility, request/response logging, and separate client/server build outputs.

### Security Considerations

- Password hashing using bcryptjs.
- JWT secret from environment variables (required in production, warning in development).
- CORS and credential handling.
- Input validation using Zod schemas.
- Protected routes with middleware authentication.
- Staff authorization with token-based QR code verification and phone number matching.

### Development vs Production

**Development**: Vite dev server with HMR, Replit-specific plugins, source maps.
**Production**: Static asset compilation, server bundled with esbuild, environment-specific configuration, optimized builds.

## External Dependencies

### Third-Party Services

- **LINE Platform**: OAuth2 for user authentication, ID token verification, LIFF support.
- **OpenAI API**: Via Replit's AI Integrations for automated content translation (gpt-4o-mini).
- **Neon PostgreSQL Database**: Serverless PostgreSQL hosting with `@neondatabase/serverless`.

### UI Component Libraries

- **Radix UI Primitives**: Comprehensive set of accessible, unstyled UI components.
- **Additional UI**: cmdk (command palette), vaul (drawer), embla-carousel-react (carousel), react-day-picker (calendar), input-otp (OTP input), recharts (charts).

### Styling and Utilities

- **Tailwind CSS**: With custom configuration.
- **class-variance-authority**: Component variant management.
- **clsx & tailwind-merge**: Conditional className utilities.
- **Lucide React**: Icon library.
- **PostCSS with Autoprefixer**.

### Form and Validation

- **react-hook-form**: Form state management.
- **@hookform/resolvers**: Form validation adapters.
- **zod**: Schema validation.
- **drizzle-zod**: Drizzle ORM schema to Zod conversion.

### Build and Development Tools

- **Vite**: Build tool and dev server.
- **esbuild**: Production server bundling.
- **tsx**: TypeScript execution for development.
- **TypeScript**: Type safety.
- **Drizzle Kit**: Database migrations.

### Fonts

- **Google Fonts**: Architects Daughter, DM Sans, Fira Code, Geist Mono.

### Environment Configuration

#### Required in Production
- `DATABASE_URL` - PostgreSQL connection string (validated in server/db.ts, throws error if missing)
- `JWT_SECRET` - JWT signing key (validated in server/routes.ts, exits with error in production if missing)
- `SESSION_SECRET` - Session encryption key for OAuth state management

#### LINE Platform Integration
- `LINE_CHANNEL_ID` - LINE Login Channel ID
- `LINE_CHANNEL_SECRET` - LINE Channel Secret for OAuth
- `LIFF_ID` - LIFF App ID for frontend initialization

#### External Services
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI API endpoint (provided by Replit)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (provided by Replit)
- `GOOGLE_MAPS_API_KEY` - Google Maps API for address search and place details

#### Object Storage (Optional)
- `OSS_REGION` - Aliyun OSS region
- `OSS_ENDPOINT` - Aliyun OSS endpoint URL
- `OSS_ACCESS_KEY_ID` - Aliyun OSS access key
- `OSS_ACCESS_KEY_SECRET` - Aliyun OSS secret key
- `OSS_BUCKET` - Aliyun OSS bucket name
- `OSS_PUBLIC_BASE_URL` - Public base URL for OSS objects
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` - Alternative: Replit/GCS bucket ID
- `PUBLIC_OBJECT_SEARCH_PATHS` - Search paths for public assets (default: public)
- `PRIVATE_OBJECT_DIR` - Directory for private objects (default: .private)

#### Frontend Environment Variables (VITE_ prefix required)
- `VITE_API_BASE_URL` - Backend API endpoint URL (required for production deployment)
- `VITE_LIFF_ID` - LIFF App ID for frontend LIFF SDK initialization
- `VITE_LINE_CHANNEL_ID` - LINE Channel ID for frontend OAuth URL construction

#### PostgreSQL Connection Variables (auto-provided by Neon/Replit)
- `PGHOST` - PostgreSQL server hostname
- `PGPORT` - PostgreSQL server port (default: 5432)
- `PGUSER` - PostgreSQL username
- `PGPASSWORD` - PostgreSQL password
- `PGDATABASE` - PostgreSQL database name

Note: These PG* variables are automatically injected by Replit/Neon when using managed PostgreSQL. When migrating to other platforms (e.g., Aliyun), ensure these are configured or construct the full `DATABASE_URL` instead.

#### System Configuration
- `JWT_EXPIRES_IN` - JWT token expiration (default: 7d)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production)
- `REPL_ID` - Replit project ID (auto-provided)

#### Migration Notes
- All environment variables are documented in `.env.example` with detailed setup instructions
- See `.env.example` for LINE Platform configuration steps and security recommendations
- Frontend environment variables require `VITE_` prefix to be accessible in client code
- When migrating from Replit to other platforms, ensure all VITE_* variables are configured in the new environment
- PostgreSQL connection can be configured via either `DATABASE_URL` or individual `PG*` variables