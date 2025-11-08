# GoodPick Go MVP

## Overview
GoodPick Go is a multi-language coupon recommendation platform designed for the Thai/Asian market, enabling consumers to discover and redeem digital coupons primarily through LINE and other social media. It supports Consumers, Administrators, and Store Staff with features like LINE-based authentication, multi-language content (Chinese Simplified, English, Thai), and AI-powered translation via OpenAI. The platform prioritizes a mobile-first, product-agnostic architecture for scalability and aims to simplify coupon distribution and redemption for businesses.

## User Preferences
**语言要求**: 必须使用中文沟通（用户不懂英文，这是强制要求）
Preferred communication style: Simple, everyday language in Chinese.

## Recent Updates (2025-11-08)
- **员工OA活动说明页面UI/UX重构**: 完成员工活动说明页面的全面优化，解决3个关键显示问题：
  1. **折叠式展示**: 使用shadcn Accordion组件实现，默认只显示活动标题、横幅图片、日期和折扣徽章，点击后才展开详细内容（员工操作说明、培训材料），大幅改善页面可读性
  2. **文本格式化**: 实现formatTextContent工具函数，智能识别并正确渲染：编号列表（1）2）3）等）使用`<ol>`保留数字顺序、符号列表（• - *）使用`<ul>`、普通段落保留换行格式，彻底解决文字挤在一起的问题
  3. **媒体轮播**: 支持图片和视频混合展示，单个媒体直接显示，多个媒体使用shadcn Carousel (Embla)轮播组件，视频添加playsInline和controls属性确保移动端（特别是iOS LINE WebView）正常播放
- **扫码核销功能**: Staff OA核销页面新增二维码扫描功能，使用html5-qrcode库实现。页面分为两个核销方式：1) 扫码核销（主要方式）- 调用摄像头扫描用户优惠券二维码，自动提取8位核销码并核销；2) 手动核销（兜底方式）- 输入8位数字核销码。支持中文/英文/泰语三种语言，优化移动端体验。
- **Staff OA菜单优化**: 简化LINE OA官方账号底部菜单设计，只保留单一入口"我的工作台"链接到核销页面(/staff/redeem)，员工进入后通过底部导航（核销/活动说明/我的数据）在三个功能间自由切换，降低理解成本，符合移动端使用习惯。
- **智能领券按钮显示逻辑**: 优化活动详情页领券按钮的显示策略，已领取优惠券的用户将不再看到领券按钮（彻底隐藏），未登录用户和未领取用户仍显示"用LINE一键领取"按钮，提升用户体验，避免混淆。
- **浏览器语言自动检测**: 实现智能多层级语言选择系统，优先级为：URL参数 (?lang=xx) > localStorage (用户手动选择) > 浏览器语言自动检测 (navigator.language) > 默认泰语。支持中文(zh-*)、英文(en-*)、泰文(th-*)的智能识别，解决LINE OA H5页面语言显示问题。
- **底部导航菜单**: 在用户端页面（活动详情、我的优惠券）添加了固定底部导航，包含"优惠活动"和"我的优惠券"两个Tab，支持多语言切换，方便用户在两个页面之间快速导航。
- **LIFF初始化优化**: 将LIFF初始化从App.tsx全局自动执行改为CampaignDetail.tsx按需初始化，避免页面导航时重复初始化和重定向，解决页面重载问题。

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
- **Thai Localization Optimization**: Enhanced Thai language experience with natural translations (e.g., "ส่วนลด" instead of "เปอร์เซ็นต์ส่วนลด"), cleaner number formatting (removing unnecessary decimals like 70% instead of 70.00%), and Thai-friendly date display using Buddhist Era calendar format.
- **Store City Data Normalization**: Pragmatic solution balancing data integrity with operational flexibility. Google Maps integration intelligently extracts province/city names (not mall names/road names), with contextual help text guiding admins. City field remains manually editable for flexibility. E2E validated that campaign city selector shows only normalized values (Bangkok, นนทบุรี, กรุงเทพมหานคร).
- **Smart Language Detection**: Intelligent multi-tier language selection system:
  1. **URL Parameter** (`?lang=th-th`/`?lang=en-us`/`?lang=zh-cn`): Highest priority for testing and sharing
  2. **Admin Language Selector**: Manual language switching in admin backend (saved to localStorage)
  3. **Browser Language Auto-Detection**: Automatically detects user's browser language on first visit
  4. **Default Thai**: Fallback to Thai language (system operates in Thailand)

## External Dependencies

### Third-Party Services
- **LINE Platform**: Used for OAuth2 user authentication, ID token verification, and LIFF integration.
- **OpenAI API**: Utilized via Replit's AI Integrations for automated content translation (specifically `gpt-4o-mini`).
- **Neon PostgreSQL Database**: Serverless PostgreSQL hosting for the database.
- **Google Maps API**: For address search and place details within the application.

### UI Component Libraries
- **Radix UI Primitives**: Provides accessible, unstyled UI components.
- **Shadcn/ui**: Component library built on Radix UI and Tailwind CSS.
- **Additional UI Libraries**: cmdk (command palette), vaul (drawer), embla-carousel-react (carousel), react-day-picker (calendar), input-otp (OTP input), recharts (charts), html5-qrcode (QR code scanning).

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