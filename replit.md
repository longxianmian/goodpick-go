# GoodPick Go MVP

## Overview
GoodPick Go is a multi-language coupon recommendation platform designed for the Thai/Asian market, enabling consumers to discover and redeem digital coupons primarily through LINE and other social media. It supports Consumers, Administrators, and Store Staff with features like LINE-based authentication, multi-language content (Chinese Simplified, English, Thai), and AI-powered translation via OpenAI. The platform prioritizes a mobile-first, product-agnostic architecture for scalability and aims to simplify coupon distribution and redemption for businesses.

## User Preferences
**语言要求**: 必须使用中文沟通（用户不懂英文，这是强制要求）
Preferred communication style: Simple, everyday language in Chinese.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript, leveraging Vite for tooling. UI/UX is based on Shadcn/ui components with Radix UI primitives, styled using Tailwind CSS, following a "New York" design variant with a mobile-first, responsive approach. State management utilizes React Query for server state, React Context API for authentication, and React hooks for local state. Wouter handles client-side routing. Authentication is token-based using JWTs stored in localStorage. Key design principles include a component-driven architecture, path aliases, custom CSS variables for theming, and an accessibility-first approach.

### Backend Architecture
The backend uses Express.js on Node.js. It interacts with a PostgreSQL database via Drizzle ORM. Authentication supports both Admin (email/password) and User (LINE ID token) with JWT-based session management, including LINE ID token verification through LINE's OAuth2 API. The API is RESTful, organized into admin, user, and authentication routes. The database schema includes Admins, Users, Stores, Campaigns, CampaignStores, Coupons, MediaFiles, and StaffPresets, designed for multi-language UI content. Architectural decisions include serverless PostgreSQL with Neon for connection pooling, WebSocket constructor override for Neon compatibility, request/response logging, and separate client/server build outputs.

### Security Considerations
Security features include bcryptjs for password hashing, JWT secrets from environment variables, CORS handling, Zod schema-based input validation, and protected routes with middleware authentication. Staff authorization is managed via token-based QR code verification and phone number matching.

### Key Features
- **Auto-Translation System**: Frontend now correctly uses the interface language as the source for OpenAI GPT-4o-mini translations, ensuring accurate multi-language campaign content generation.
- **Redemption Code System**: Switched to 8-digit numeric codes for enhanced security and uniqueness in coupon redemption.
- **Staff OA**: Dedicated Staff Operational Area with independent routes for coupon redemption, personal statistics, and campaign information, all with full i18n support.
- **Admin Dashboard**: Comprehensive analytics dashboard providing monthly overviews, campaign performance, brand statistics, and store-level data with time-based filtering and full i18n support.
- **Store Floor Information**: Added `floorInfo` field to stores to provide detailed indoor location descriptions, improving user navigation within complex venues.
- **Dynamic Campaign Form Fields**: Campaign creation form fields adapt dynamically based on the selected `discountType`, optimizing UX and reducing data entry errors for administrators.
- **Internationalization (i18n)**: Extensive i18n coverage across the application, including UI elements, form fields, and error messages, supporting Chinese, English, and Thai.

## External Dependencies

### Third-Party Services
- **LINE Platform**: Used for OAuth2 user authentication, ID token verification, and LIFF integration.
- **OpenAI API**: Utilized via Replit's AI Integrations for automated content translation (specifically `gpt-4o-mini`).
- **Neon PostgreSQL Database**: Serverless PostgreSQL hosting for the database.
- **Google Maps API**: For address search and place details within the application.

### UI Component Libraries
- **Radix UI Primitives**: Provides accessible, unstyled UI components.
- **Shadcn/ui**: Component library built on Radix UI and Tailwind CSS.
- **Additional UI Libraries**: cmdk (command palette), vaul (drawer), embla-carousel-react (carousel), react-day-picker (calendar), input-otp (OTP input), recharts (charts).

### Styling and Utilities
- **Tailwind CSS**: For utility-first styling.
- **class-variance-authority**: Manages component variants.
- **clsx & tailwind-merge**: For conditional CSS class concatenation.
- **Lucide React**: Icon library.
- **PostCSS with Autoprefixer**: For CSS processing.

### Form and Validation
- **react-hook-form**: For form state management.
- **@hookform/resolvers**: Adapters for form validation.
- **zod**: Schema validation library.
- **drizzle-zod**: Integrates Drizzle ORM schemas with Zod.

### Build and Development Tools
- **Vite**: Build tool and development server.
- **esbuild**: For production server bundling.
- **tsx**: For TypeScript execution in development.
- **TypeScript**: Ensures type safety.
- **Drizzle Kit**: For database migrations.

### Fonts
- **Google Fonts**: Architects Daughter, DM Sans, Fira Code, Geist Mono.

### Environment Configuration
Key environment variables include `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LIFF_ID`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`, `GOOGLE_MAPS_API_KEY`, and optional Aliyun OSS credentials (`OSS_REGION`, `OSS_ENDPOINT`, etc.). Frontend specific variables are prefixed with `VITE_`.