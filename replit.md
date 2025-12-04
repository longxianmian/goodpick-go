# ShuaShua (刷刷) O2O Platform

## Overview
ShuaShua (刷刷) is a multi-merchant O2O local life platform designed to connect consumers with local businesses, offering deal discovery and coupon redemption, primarily through platforms like LINE. The platform supports three main user terminals: Consumer, Merchant Portal, and Staff Workstation. It features a robust multi-role authorization system (7 types), multi-platform login (LINE, Google, Apple, Phone), payment-as-membership functionalities, and is designed for future AI agent integration. The platform aims to be a comprehensive local life service, emulating successful O2O models like Meituan.

## User Preferences
语言要求: 必须使用中文沟通（用户不懂英文，这是强制要求）
Preferred communication style: Simple, everyday language in Chinese.

## System Architecture

### Frontend
The frontend is developed with React and TypeScript, utilizing Vite for tooling. It employs Shadcn/ui (based on Radix UI) with Tailwind CSS, adhering to a mobile-first "New York" design aesthetic. State management is handled by React Query, React Context API, and standard React hooks. Wouter manages client-side routing, and JWTs stored in localStorage are used for authentication.

### Backend
The backend is built on Express.js with Node.js and interacts with a PostgreSQL database via Drizzle ORM. Authentication supports Admin (email/password) and User (LINE ID token), managed through JWT-based sessions. The API is RESTful, organized into admin, user, and authentication routes, and supports multi-language UI content. Serverless PostgreSQL with Neon provides connection pooling.

### Security
Security features include bcryptjs for password hashing, JWT secrets managed via environment variables, CORS handling, Zod schema validation for input, and middleware for protected routes. Staff authorization incorporates token-based QR code verification. Media URLs are automatically converted to HTTPS at the API level to prevent mixed content issues.

### Key Features
- **Multi-Role System**: Supports 7 distinct roles (Consumer, Creator, Owner, Verifier, Operator, Member, Sysadmin) with dynamic navigation and role-specific "Me" pages.
- **Internationalization (i18n)**: Comprehensive multi-language support (Chinese, English, Thai, Indonesian, Vietnamese, Myanmar) for UI, forms, and content, including smart language detection.
- **Automated Translation**: Uses OpenAI GPT-4o-mini for generating multi-language campaign content.
- **Coupon Redemption**: Secure 8-digit numeric codes for verification, with QR code scanning for staff.
- **Admin & Merchant Portals**: Dashboards for analytics, campaign management, and operations.
- **Dynamic UI/UX**: Adaptive campaign forms, e-commerce style product detail pages, and Meituan-style store front pages with real-time status and detailed information.
- **LINE Integration**: Streamlined LIFF initialization, robust OAuth, and improved LINE OA messaging.
- **Multi-Platform Login**: Supports LINE, Google, and Apple ID token binding.
- **Store City Data Normalization**: Integrates Google Maps for location data with manual override.
- **Short Video System**: "ShuaShua" (刷刷) serves as a content platform for short videos, supporting feed display, upload, likes, comments, and categorization.
- **Rich Text Editor**: Integrated Tiptap-based editor for content creation.
- **Merchant Store Management**: Supports single and chain store models, with detailed store editing (basic info, business hours, images, multi-language descriptions), and a consumer-facing store front.
- **Merchant Owner Management**: "MeOwner" page provides an overview of 'People', 'Operations', and 'Assets', with detailed management accessible via a dedicated 'Operations Center'.

## External Dependencies

### Third-Party Services
- **LINE Platform**: OAuth2, ID token verification, LIFF integration.
- **OpenAI API**: Automated content translation (`gpt-4o-mini`).
- **Neon PostgreSQL Database**: Serverless PostgreSQL hosting.
- **Google Maps API**: Address search and place details.
- **阿里云OSS**: Media storage (prodee-h5-assets.oss-ap-southeast-1.aliyuncs.com).

### UI Component Libraries
- **Radix UI Primitives**: Accessible, unstyled UI components.
- **Shadcn/ui**: Component library built on Radix UI and Tailwind CSS.
- **Additional UI Libraries**: cmdk, vaul, embla-carousel-react, react-day-picker, input-otp, recharts, html5-qrcode.
- **Tiptap**: Rich text editor.

### Styling and Utilities
- **Tailwind CSS**: Utility-first styling.
- **class-variance-authority**: Component variants.
- **clsx & tailwind-merge**: Conditional CSS class concatenation.
- **Lucide React**: Icon library.

### Form and Validation
- **react-hook-form**: Form state management.
- **@hookform/resolvers**: Form validation adapters.
- **zod**: Schema validation library.
- **drizzle-zod**: Drizzle ORM schemas with Zod integration.

### Build and Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Type safety.
- **Drizzle Kit**: Database migrations.