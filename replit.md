# GoodPick Go MVP

## Overview
GoodPick Go is a multi-language coupon recommendation platform targeting the Thai/Asian market. It enables consumers to discover and redeem digital coupons primarily through LINE and other social media. The platform supports Consumers, Administrators, and Store Staff, featuring LINE-based authentication, multi-language content (Chinese Simplified, English, Thai), and AI-powered translation. It emphasizes a mobile-first, product-agnostic architecture to streamline coupon distribution and redemption for businesses.

## User Preferences
语言要求: 必须使用中文沟通（用户不懂英文，这是强制要求）
Preferred communication style: Simple, everyday language in Chinese.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript, using Vite, Shadcn/ui (based on Radix UI) with Tailwind CSS for a mobile-first, responsive "New York" design variant. State management relies on React Query, React Context API, and React hooks. Wouter handles client-side routing. Authentication uses JWTs stored in localStorage.

### Backend Architecture
The backend uses Express.js on Node.js, interacting with a PostgreSQL database via Drizzle ORM. Authentication supports Admin (email/password) and User (LINE ID token) with JWT-based session management and LINE ID token verification. The API is RESTful, organized into admin, user, and authentication routes. The database schema supports multi-language UI content. Key decisions include serverless PostgreSQL with Neon for connection pooling and separate client/server build outputs.

### Security Considerations
Security features include bcryptjs for password hashing, JWT secrets from environment variables, CORS handling, Zod schema-based input validation, and protected routes with middleware authentication. Staff authorization uses token-based QR code verification and phone number matching.

### Key Features
- **Auto-Translation System**: Utilizes OpenAI GPT-4o-mini for accurate multi-language campaign content generation.
- **Redemption Code System**: Employs 8-digit numeric codes for secure coupon redemption.
- **Staff OA**: A dedicated operational area for staff with coupon redemption, personal statistics, and campaign information, all with i18n support.
- **Admin Dashboard**: Provides comprehensive analytics including monthly overviews, campaign performance, brand, and store data with time-based filtering and i18n.
- **Store Floor Information**: Detailed indoor location descriptions for improved user navigation.
- **Dynamic Campaign Form Fields**: Campaign creation fields adapt based on `discountType` for improved UX.
- **Internationalization (i18n)**: Extensive coverage for Chinese, English, and Thai across UI, forms, and messages.
- **Thai Localization Optimization**: Enhanced Thai language experience with natural translations, cleaner number formatting, and Buddhist Era calendar dates.
- **Store City Data Normalization**: Balances data integrity with operational flexibility, using Google Maps for province/city extraction while allowing manual edits.
- **Smart Language Detection**: A multi-tier system prioritizing URL parameters, user selection (localStorage), browser language detection, and defaulting to Thai.
- **Video Playback and Thumbnail Fixes**: Implemented video proxy routing for OSS content to ensure playback and correct video poster generation using OSS snapshot API.
- **QR Code Scanning**: Staff OA includes QR code scanning for coupon redemption via `html5-qrcode`.
- **Streamlined Staff OA Menu**: Simplified LINE OA bottom menu to a single entry point ("我的工作台") with internal navigation.
- **Intelligent Coupon Button Display**: Hides the "Claim Coupon" button for users who have already claimed a coupon.
- **Bottom Navigation Menu**: Fixed bottom navigation for users on campaign details and "My Coupons" pages.
- **Optimized LIFF Initialization**: LIFF initialization moved to CampaignDetail.tsx for on-demand loading, preventing redundant initialization.

## External Dependencies

### Third-Party Services
- **LINE Platform**: OAuth2, ID token verification, LIFF integration.
- **OpenAI API**: Automated content translation (`gpt-4o-mini`).
- **Neon PostgreSQL Database**: Serverless PostgreSQL hosting.
- **Google Maps API**: Address search and place details.

### UI Component Libraries
- **Radix UI Primitives**: Accessible, unstyled UI components.
- **Shadcn/ui**: Component library built on Radix UI and Tailwind CSS.
- **Additional UI Libraries**: cmdk, vaul, embla-carousel-react, react-day-picker, input-otp, recharts, html5-qrcode.

### Styling and Utilities
- **Tailwind CSS**: Utility-first styling.
- **class-variance-authority**: Component variants.
- **clsx & tailwind-merge**: Conditional CSS class concatenation.
- **Lucide React**: Icon library.
- **PostCSS with Autoprefixer**: CSS processing.

### Form and Validation
- **react-hook-form**: Form state management.
- **@hookform/resolvers**: Form validation adapters.
- **zod**: Schema validation library.
- **drizzle-zod**: Drizzle ORM schemas with Zod integration.

### Build and Development Tools
- **Vite**: Build tool and development server.
- **esbuild**: Production server bundling.
- **tsx**: TypeScript execution in development.
- **TypeScript**: Type safety.
- **Drizzle Kit**: Database migrations.

### Fonts
- **Google Fonts**: Architects Daughter, DM Sans, Fira Code, Geist Mono.