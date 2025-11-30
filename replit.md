# ShuaShua (刷刷) O2O Platform

## Overview
ShuaShua (刷刷) is a multi-merchant O2O local life platform that evolved from GoodPick Go. Its primary purpose is to connect consumers with local businesses, offering deal discovery and coupon redemption through platforms like LINE. The platform caters to three main user terminals: Consumer (C-端), Merchant Portal (商户端), and Staff Workstation (员工端). Key capabilities include multi-role authorization (7种账号类型), multi-platform login (LINE, Google, Apple, Phone), payment-as-membership features, and readiness for AI agent integration.

## 账号类型 (7种)
| 序号 | 账号类型 | 代码名称 | 说明 |
|------|----------|----------|------|
| 1 | 个人号 | consumer | 普通消费者，所有用户默认角色 |
| 2 | 刷刷号 | creator | 内容创作者/自媒体 |
| 3 | 发现号（商户号）| owner | 商户老板 |
| 4 | 核销号 | verifier | 核销员 |
| 5 | 运营号 | operator | 运营人员 |
| 6 | 商户会员号 | member | 商户会员 |
| 7 | 系统运营管理账号 | sysadmin | 系统管理员 |

## 测试账号
- **配置文件**: `shared/testAccounts.ts`
- **宝宝龙**: LINE User ID `U36ca390160a7674f51442fa6df2290f0`
- **权限**: 测试账号拥有所有7种账号类型的访问权限

## 开发预览路由
| 路径 | 角色页面 |
|------|----------|
| `/dev/me/consumer` | 消费者个人中心 |
| `/dev/me/creator` | 刷刷号创作者中心 |
| `/dev/me/owner` | 商户老板管理页 |
| `/dev/me/verifier` | 核销员页面 |
| `/dev/me/operator` | 运营人员页面 |
| `/dev/me/sysadmin` | 系统管理员页面 |

## 各角色底部导航设计
| 角色 | 底部导航按钮 |
|------|-------------|
| 消费者 (consumer) | 刷刷 \| 发现 \| 我的 |
| 刷刷号 (creator) | 账号首页 \| 创作中心 \| 我的 |
| 商户老板 (owner) | 商户首页 \| 运营数据 \| 我的 |
| 运营人员 (operator) | 商户首页 \| 运营管理 \| 我的 |
| 核销员 (verifier) | 核销 \| 活动说明 \| 我的 |
| 系统管理员 (sysadmin) | 刷刷运营 \| 发现运营 \| 我的 |

## User Preferences
语言要求: 必须使用中文沟通（用户不懂英文，这是强制要求）
Preferred communication style: Simple, everyday language in Chinese.

## System Architecture

### Frontend
The frontend is built with React and TypeScript, leveraging Vite, Shadcn/ui (based on Radix UI) with Tailwind CSS for a mobile-first "New York" design. State management uses React Query, React Context API, and React hooks. Wouter handles client-side routing, and JWTs stored in localStorage manage authentication.

### Backend
The backend utilizes Express.js on Node.js, interacting with a PostgreSQL database via Drizzle ORM. Authentication supports Admin (email/password) and User (LINE ID token) with JWT-based session management. The API is RESTful and organized into admin, user, and authentication routes, supporting multi-language UI content. Serverless PostgreSQL with Neon is used for connection pooling.

### Security
Security measures include bcryptjs for password hashing, environment variable-based JWT secrets, CORS handling, Zod schema validation for input, and middleware for protected routes. Staff authorization employs token-based QR code verification.

### Key Features
- **Multi-Role System**: Supports Consumer, Owner, Operator, and Verifier roles with dynamic navigation and role-specific "Me" pages.
- **Internationalization (i18n)**: Extensive multi-language support (Chinese, English, Thai, Indonesian, Vietnamese, Myanmar) across UI, forms, and content, with smart language detection.
- **Automated Translation**: Uses OpenAI GPT-4o-mini for multi-language campaign content generation.
- **Coupon Redemption System**: Secure 8-digit numeric codes for coupon verification, including QR code scanning for staff.
- **Admin & Merchant Portals**: Comprehensive dashboards for analytics, campaign management, and staff operations.
- **Dynamic UI/UX**: Campaign forms adapt to discount types, product detail pages feature e-commerce style redesigns (image carousels, detailed pricing, service tags), and store front pages emulate Meituan-style design with store stats, coupons, and tabbed content (Menu, Deals, Reviews, Info).
- **Optimized LINE Integration**: Streamlined LIFF initialization, robust OAuth session handling, and improved LINE OA welcome message delivery.
- **State Management Refinements**: Centralized authentication state management in `AuthContext` and a unified state machine for campaign detail page claim flows.
- **Multi-Platform Login**: Supports LINE, Google, and Apple ID token binding.
- **Store City Data Normalization**: Integrates Google Maps for province/city extraction with manual override capabilities.

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

### Form and Validation
- **react-hook-form**: Form state management.
- **@hookform/resolvers**: Form validation adapters.
- **zod**: Schema validation library.
- **drizzle-zod**: Drizzle ORM schemas with Zod integration.

### Build and Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Type safety.
- **Drizzle Kit**: Database migrations.

## Recent Updates (2024-11-30)

### Short Video System (抖音式短视频)
- **Database**: Added `short_videos`, `short_video_likes`, `short_video_comments` tables
- **API Endpoints**:
  - `GET /api/short-videos/feed` - 视频流（游标分页）
  - `GET /api/short-videos/:id` - 视频详情
  - `POST /api/short-videos` - 上传短视频（含封面/缩略图）
  - `POST /api/short-videos/:id/like` - 点赞/取消点赞
  - `GET /api/short-videos/:id/comments` - 获取评论
  - `POST /api/short-videos/:id/comments` - 发表评论
  - `GET /api/creator/short-videos` - 创作者视频列表
  - `DELETE /api/short-videos/:id` - 删除视频
- **Frontend Components**:
  - `VideoCard` - 全屏视频播放卡片（自动播放、点赞、评论、分享）
  - `VerticalSwiper` - 上下滑动切换组件（支持触摸、鼠标滚轮、键盘）
  - `ShortVideoFeed` - 短视频流页面（/videos路由）

### Rich Text Editor (富文本编辑器)
- **Component**: `RichTextEditor` - 基于Tiptap
- **Features**: 加粗、斜体、下划线、删除线、标题(H1-H3)、对齐、列表、引用、链接、撤销/重做

### Development Login
- **Endpoint**: `POST /api/auth/dev-login` (仅开发环境)
- **Page**: `/dev/login` - 测试登录页面

### Media Storage
- **Provider**: 阿里云OSS (prodee-h5-assets.oss-ap-southeast-1.aliyuncs.com)
- **Paths**: `user/{userId}/...`, `short-videos/{userId}/...`