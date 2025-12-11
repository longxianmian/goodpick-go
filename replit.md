# ShuaShua (刷刷) O2O Platform

## Overview
ShuaShua (刷刷) is a multi-merchant O2O local life platform connecting consumers with local businesses through deal discovery and coupon redemption, primarily via LINE. It supports Consumer, Merchant Portal, and Staff Workstation terminals, features a multi-role authorization system, multi-platform login, and payment-as-membership. The platform is designed for future AI agent integration, aiming to become a comprehensive local life service akin to Meituan.

## User Preferences
语言要求: 必须使用中文沟通（用户不懂英文，这是强制要求）

## System Architecture

### Frontend
Developed with React, TypeScript, and Vite, the frontend uses Shadcn/ui (Radix UI) with Tailwind CSS for a mobile-first "New York" design. State management uses React Query and Context API, Wouter for routing, and JWTs for authentication.

### Backend
The backend is built with Express.js and Node.js, using PostgreSQL via Drizzle ORM. Authentication is JWT-based, supporting Admin and User roles. The API is RESTful, multi-language, and uses Neon for serverless PostgreSQL. Security features include bcryptjs, environment variable-managed JWT secrets, CORS, Zod validation, and token-based QR verification for staff.

### Key Features
-   **Multi-Role System**: 7 distinct roles with dynamic navigation and role-specific "Me" pages.
-   **Internationalization (i18n)**: Multi-language support (Chinese, English, Thai, Indonesian, Vietnamese, Myanmar) with smart language detection.
-   **Automated Translation**: Uses OpenAI GPT-4o-mini for campaign content.
-   **Coupon Redemption**: Secure 8-digit codes with staff QR scanning.
-   **Admin & Merchant Portals**: Dashboards for analytics, campaign, and operations management.
-   **Dynamic UI/UX**: Adaptive forms, e-commerce style product pages, and Meituan-style store fronts.
-   **LINE Integration**: LIFF initialization, OAuth, and LINE OA messaging.
-   **Multi-Platform Login**: Supports LINE, Google, and Apple ID token binding.
-   **Store Address Search**: Google Maps Places API integration with multilingual input support (English, Chinese, Thai, Vietnamese, Myanmar, Indonesian). Auto-extracts city, country, and GPS coordinates for "nearby" functionality.
-   **Short Video System**: "ShuaShua" for short video feed, upload, likes, comments, and categorization.
-   **User Profile & Social Features**: Public profiles with follow/unfollow, follower counts, and share functionality.
-   **Rich Text Editor**: Tiptap-based editor for content creation.
-   **Merchant Store Management**: Single and chain store models, detailed editing, and consumer-facing store fronts.
-   **Merchant Owner Management**: "MeOwner" page with overview and operations center.
-   **Digital Agent Marketplace**: AI assistant marketplace for merchants with subscription pricing.
-   **Merchant Campaign Management**: Full CRUD for store campaigns with secure validation, banner upload, coupon settings, time periods, and quantity limits.
-   **Merchant-Consumer Chat System**: Real-time messaging with full-screen consumer chat and floating merchant customer service button, including unread counts and conversation lists. Uses `chat_conversations` and `chat_messages` tables with real-time polling.
-   **Operations Backend**: Platform-level control for global management, including data dashboards, merchant ecosystem management (onboarding, verification), content and activity management (short video and campaign review), user and role management, and system configuration.
-   **Payment QR Code System**: Enables merchants to accept payments via QR codes, automatically enrolling customers as members. Integrates with multiple Payment Service Providers (PSPs) like Opn Payments and 2C2P through a pluggable architecture, supporting PromptPay, and planned for TrueMoney, Rabbit LINE Pay, credit cards, Alipay, and WeChat Pay. Includes merchant PSP account management (manual ID or connect onboarding) and LINE OA membership binding.
-   **Super Contacts (超级通讯录)**: Privacy-first contact import and multi-IM friend invitation system. Supports phone contact import with SHA256 hash matching (no plaintext upload), multi-channel invitations (LINE, WhatsApp, Viber, Telegram, Facebook, SMS), face-to-face QR code, and invite link sharing. Friend status tracking (not_known → invited → registered → friend) with unified contact management for users, merchants, and AI agents.

## External Dependencies

### Third-Party Services
-   **LINE Platform**: OAuth2, ID token verification, LIFF integration.
-   **OpenAI API**: `gpt-4o-mini` for automated content translation.
-   **Neon PostgreSQL Database**: Serverless PostgreSQL hosting.
-   **Google Maps API**: Address search and place details.
-   **阿里云OSS**: Media storage (prodee-h5-assets.oss-ap-southeast-1.aliyuncs.com).
-   **Opn Payments**: Primary Payment Service Provider (PSP).
-   **2C2P**: Backup Payment Service Provider (PSP).

### UI Component Libraries
-   **Radix UI Primitives**: Accessible, unstyled UI components.
-   **Shadcn/ui**: Component library built on Radix UI and Tailwind CSS.
-   **Additional UI Libraries**: cmdk, vaul, embla-carousel-react, react-day-picker, input-otp, recharts, html5-qrcode.
-   **Tiptap**: Rich text editor.

### Styling and Utilities
-   **Tailwind CSS**: Utility-first styling.
-   **class-variance-authority**: Component variants.
-   **clsx & tailwind-merge**: Conditional CSS class concatenation.
-   **Lucide React**: Icon library.

### Form and Validation
-   **react-hook-form**: Form state management.
-   **@hookform/resolvers**: Form validation adapters.
-   **zod**: Schema validation library.
-   **drizzle-zod**: Drizzle ORM schemas with Zod integration.

### Build and Development Tools
-   **Vite**: Build tool and development server.
-   **TypeScript**: Type safety.
-   **Drizzle Kit**: Database migrations.

## Deployment

### Git Branches
-   **开发环境 (Replit)**: `main` 分支
-   **生产服务器 (阿里云ECS)**: `main` 分支（从Replit推送后拉取）
-   **服务器路径**: `/var/www/goodpick-go`

### 推送部署流程
1. **从 Replit 推送代码**:
```bash
git add .
git commit -m "描述你的更改"
git push origin main
```

2. **在阿里云服务器部署**:
```bash
ssh root@服务器IP
cd /var/www/goodpick-go
git pull origin main
npm install  # 如果有新依赖
pm2 restart all
```

### Server Info
-   **阿里云ECS实例**: iZt4n4cftt8gn7dthjne54Z
-   **区域**: ap-southeast-1 (新加坡)