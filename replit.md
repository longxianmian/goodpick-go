# GoodPick Go MVP

## Overview
GoodPick Go is a multi-language coupon recommendation platform designed for the Thai/Asian market, enabling consumers to discover and redeem digital coupons primarily through LINE and other social media. It supports Consumers, Administrators, and Store Staff with features like LINE-based authentication, multi-language content (Chinese Simplified, English, Thai), and AI-powered translation via OpenAI. The platform prioritizes a mobile-first, product-agnostic architecture for scalability and aims to simplify coupon distribution and redemption for businesses.

## User Preferences
**语言要求**: 必须使用中文沟通（用户不懂英文，这是强制要求）
Preferred communication style: Simple, everyday language in Chinese.

## Recent Updates (2025-11-08)
- **视频缩略图黑屏修复（关键）**: 恢复阿里云OSS视频快照功能，解决视频缩略图显示问题
  - **根本原因**: 代码清理时误删了`getVideoPoster()`函数，导致video标签缺少poster属性，浏览器（尤其是LINE内嵌浏览器）无法显示视频第一帧
  - **解决方案**: 
    1. 恢复`getVideoPoster(url)`函数，使用阿里云OSS视频快照API：`?x-oss-process=video/snapshot,t_0,f_jpg,w_800`
    2. 为所有video标签添加`poster={getVideoPoster(url)}`属性，浏览器直接显示OSS生成的封面图
  - **修复范围**: CampaignDetail.tsx（用户活动详情）、StaffCampaignDetail.tsx（员工活动详情）、StaffCampaignList.tsx（员工活动列表）
  - **技术优势**: 不依赖HTTP Range请求，在任何浏览器环境下都能正常显示视频缩略图
- **数据统计逻辑重大修复（关键）**: 修复员工统计和运营后台Dashboard的数据统计错误
  - **员工统计API字段名修复**: 前端interface从`week/month`改为`thisWeek/thisMonth`，与后端API响应结构一致
  - **Dashboard统计逻辑错误**: 
    - **问题**: Brand/Store统计使用`leftJoin(coupons, eq(stores.id, coupons.redeemedStoreId))`，只能匹配已核销优惠券（未核销的`redeemedStoreId`为NULL）
    - **影响**: `issuedCount`统计错误，实际统计的是"已核销优惠券的发放时间"，而非"该门店相关活动发放的所有优惠券"
    - **修复**: 改为通过`campaign_stores`表关联，正确统计门店参与的活动发放的所有优惠券
  - **SQL优化**: 
    - 发放数量：`COUNT(DISTINCT CASE WHEN issued_at IN range THEN coupon.id END)` 通过`campaign_stores`关联
    - 核销数量：`COUNT(DISTINCT CASE WHEN status='used' AND used_at IN range AND redeemedStoreId=storeId THEN coupon.id END)`
    - 使用`COUNT(DISTINCT coupon.id)`避免多表JOIN导致的重复计数
  - **架构师审查**: 通过验证，SQL性能可接受，建议添加多门店活动场景测试和生产环境延迟监控
  - **端到端测试**: 管理后台Dashboard三个维度（活动、品牌、门店）数据展示准确，核销率计算正确
- **视频播放修复完成（关键）**: 彻底解决阿里云OSS培训视频无法播放的问题
  - **根本原因1**: OSS返回`Content-Disposition: attachment`和`x-oss-force-download: true`导致浏览器强制下载而非播放
  - **根本原因2**: OSS签名URL带查询参数（如`?Expires=123&Signature=...`），正则表达式要求扩展名在末尾，导致`isVideoUrl()`返回false，URL未转换为代理
  - **解决方案**: 
    1. 后端：实现视频代理路由`/api/media/video/:objectKey`，流式转发OSS内容，移除强制下载头
    2. 前端：使用`new URL()`解析URL（替代正则表达式），检查`pathname`而非整个字符串，正确处理带查询参数的OSS签名URL
  - **技术验证**: 服务器日志显示`HEAD /api/media/video/public/...mp4 200`，OSS视频支持HTTP Range请求（206 Partial Content），支持流式播放和进度条拖动
  - **安全措施**: 代理路由限制只允许`public/*`路径，防止开放代理滥用
- **员工活动详情页UI优化**: 完成16:9媒体展示和文本格式化
  1. **16:9媒体展示**: 使用shadcn AspectRatio组件 + object-contain，视频/图片完整显示不裁剪，竖版内容有letterboxing但使用bg-card背景
  2. **文本格式化增强**: formatTextContent支持空格可选的编号列表（1. 1) 1） ①等）和符号列表，HTML内容自动转义避免XSS
  3. **活动规则显示**: 将"活动介绍"改为"活动规则"，使用formatTextContent格式化，支持三语言翻译
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