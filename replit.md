# GoodPick Go MVP

## Overview

GoodPick Go is a multi-language coupon recommendation platform targeting the Thai/Asian market. It enables consumers to discover and redeem digital coupons via social media (TikTok, Facebook, Instagram, YouTube, LINE), primarily utilizing LINE for authentication and distribution. The platform supports three user types: Consumers (claim/redeem coupons), Administrators (manage content, stores, campaigns), and Store Staff (verify redemptions). Key features include LINE-based authentication, multi-language support (Chinese Simplified, English, Thai), OpenAI-powered content translation, and a mobile-first design inspired by popular Asian e-commerce platforms. The project aims for a product-agnostic architecture to ensure scalability.

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

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `LINE_CHANNEL_ID`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `NODE_ENV`
- `REPL_ID`