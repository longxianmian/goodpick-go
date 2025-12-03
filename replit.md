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
| 商户老板 (owner) | 商户首页 \| 运营中心 \| 我的 |
| 运营人员 (operator) | 商户首页 \| 运营管理 \| 我的 |
| 核销员 (verifier) | 核销 \| 活动说明 \| 我的 |
| 系统管理员 (sysadmin) | 刷刷运营 \| 发现运营 \| 我的 |

## 商户端路由架构
| 路径 | 页面 | 说明 |
|------|------|------|
| `/merchant` | MerchantHome | 商户首页 |
| `/merchant/operations` | MerchantOperations | 运营中心 |
| `/merchant/store-settings` | MerchantStoreSettings | 门店设置 |
| `/merchant/me` | MeOwner | 商户老板个人中心 |

## 商户门店管理系统规划
**Phase 1 - 单店模式**: 商户 = 1个门店（简化版）
**Phase 2 - 连锁模式**: 商户 = 多个门店（高级版）

### 核心数据模型
```
商户主体 (Merchant)
├── merchant_id: 唯一标识
├── business_type: 'single_store' | 'chain'  ← 单店/连锁选择
├── license_info: 营业执照信息
│
└── 门店 (Store)  [1:N 关系]
    ├── store_id
    ├── store_name
    ├── address / location
    ├── business_hours
    └── status: 营业中/休息中
```

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

## Recent Updates (2025-11-30)

### 平台架构（重要）
- **刷刷** = 内容平台（创作者发布的短视频），首页从 `short_videos` 表获取数据
- **发现** = 本土商户平台（商家活动campaigns），从 `campaigns` 表获取数据

### 内容发布同步机制
- **创作者工作室**：内容保存在 `creator_contents` 表（支持草稿/已发布状态）
- **刷刷首页Feed**：从 `short_videos` 表读取已发布的视频内容
- **自动同步**：当创作者通过 `/api/creator/contents` 发布视频时，自动同步到 `short_videos` 表
- **封面图上传**：视频内容必须上传封面图（coverImageUrl），发布时验证必填，封面图同步到 `short_videos` 表用于首页展示

### 视频分类系统
- **分类枚举**: all, funny, musicDance, drama, daily, healing, food, beauty, games
- **数据库字段**: `creator_contents.category`, `short_videos.category`
- **发布同步**: 创作者发布内容时，category自动同步到short_videos表
- **API筛选**: `/api/short-videos/feed?category=funny` 支持按分类筛选
- **翻译支持**: 所有6种语言（中、英、泰、印尼、越南、缅甸）

### Short Video System (抖音式短视频)
- **Database**: Added `short_videos`, `short_video_likes`, `short_video_comments` tables
- **API Endpoints**:
  - `GET /api/short-videos/feed` - 视频流（游标分页，支持category参数筛选）- **刷刷首页使用此API**
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
  - `ShortVideoFeed` - 短视频流页面
  - `ShuaShuaHome` - 刷刷首页（显示短视频卡片网格）
- **Routes**:
  - `/videos` - 全屏短视频Feed页面
  - `/videos/:id` - 特定视频播放页面（定位到指定视频ID）

### Rich Text Editor (富文本编辑器)
- **Component**: `RichTextEditor` - 基于Tiptap
- **Features**: 加粗、斜体、下划线、删除线、标题(H1-H3)、对齐、列表、引用、链接、撤销/重做

### Development Login
- **Endpoint**: `POST /api/auth/dev-login` (仅开发环境)
- **Page**: `/dev/login` - 测试登录页面

### Media Storage
- **Provider**: 阿里云OSS (prodee-h5-assets.oss-ap-southeast-1.aliyuncs.com)
- **Paths**: `user/{userId}/...`, `short-videos/{userId}/...`