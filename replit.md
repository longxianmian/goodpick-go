# ShuaShua (刷刷) O2O Platform

## 分析问题天条（最高准则，分析任何问题前必须先阅读）

### 1. 只允许说已验证事实
你只能输出：已验证的事实 + 证据（日志/截图/代码行号/命令输出）。没证据就说"不知道"。

### 2. 先给验证步骤，再给结论
先给一条条可执行的检查步骤；每一步用户给你输出，你再推进下一步。

### 3. 任何"已检查/已确认"必须附上"怎么检查的"
如果说检查了什么，必须同时给出具体命令/路径/控制台输出依据。

## Overview
ShuaShua (刷刷) is a multi-merchant O2O local life platform connecting consumers with local businesses through deal discovery and coupon redemption, primarily via LINE. It supports Consumer, Merchant Portal, and Staff Workstation terminals, features a multi-role authorization system, multi-platform login, and payment-as-membership. The platform is designed for future AI agent integration, aiming to become a comprehensive local life service akin to Meituan.

## User Preferences
语言要求: 必须使用中文沟通（用户不懂英文，这是强制要求）

## 开发天条（最高准则，不可违反）

### 聊聊(LiaoLiao)模块开发规范
**凡是聊聊相关的功能模块，要求100%原样恢复源代码的功能！不能有一丝一点偏差！**

具体要求：
1. **必须复用现有组件**: 使用 `client/src/components/ui/image-preview.tsx` 处理图片预览，禁止自行实现
2. **必须复用现有工具函数**: 使用项目中已有的下载、上传、预览等工具函数，禁止自行编写
3. **禁止偷工减料**: 每个功能必须完整实现，包括所有交互细节、错误处理、加载状态
4. **严格遵循现有设计模式**: 先彻底阅读理解现有代码，再进行任何修改
5. **功能验证**: 每个功能修改后必须完整测试，确保与原设计一致

聊聊相关文件：
- `client/src/pages/liaoliao/ChatDetail.tsx` - 好友聊天详情
- `client/src/pages/liaoliao/AiChat.tsx` - AI助手聊天
- `client/src/pages/liaoliao/LiaoliaoHome.tsx` - 聊聊首页
- `client/src/pages/liaoliao/FriendList.tsx` - 好友列表
- `client/src/components/ui/image-preview.tsx` - 图片预览组件（必须复用）
- `client/src/components/MediaUploader.tsx` - 媒体上传组件（必须复用）

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
-   **Attribution Tracking (归因追踪)**: End-to-end marketing ROI tracking system that traces user journeys from traffic source to conversion. Supports three-piece tracking suite:
    - `trace_id`: Unique visit identifier (nanoid 21 chars), persisted in localStorage
    - `src`: Traffic source channel (tiktok, fb, ig, line, offline_qr, referral, etc.)
    - `bind_id`: Affiliate/creator ID for commission tracking
    - Frontend auto-parses URL params (?src=xxx&bind_id=xxx) and injects headers on all API requests
    - Backend captures attribution on key write points: coupon claims, QR payments, delivery orders
    - Key files: `client/src/lib/attribution.ts`, `client/src/lib/queryClient.ts`

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