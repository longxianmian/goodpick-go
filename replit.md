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
- **Digital Agent Marketplace**: AI assistant marketplace where merchant owners can discover and purchase digital agents (guide assistant, graphic designer, video creator, business advisor, campaign planner, operations expert). Purchased agents appear in both Staff tab (as virtual team members) and Assets tab (as digital resources), with online/working status indicators and monthly subscription pricing.
- **Merchant Campaign Management**: Full CRUD operations for store campaigns with secure store ownership validation. Includes campaign list page with status filtering and progress tracking, and campaign edit form with banner upload, coupon settings (percent/fixed), time periods, and quantity limits. All APIs validate user has owner/operator role for the specific store.

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

## Future Integration: Digital Agent & Genome System

### Digital Agent System (数字人系统)
预留的数据库表结构和API接口，用于后期集成数字人系统。

**两类数字人产品:**
- **平台内使用型 (platform)**: 在刷刷 App/H5 内使用
- **LINE OA 账号型 (line_oa)**: 部署到商家 LINE 官方账号

**核心能力:**
- 智能搜索商品
- 比价分析
- 智能推荐 TOP 3
- 聊天内支付
- 实时物流追踪

**预留表结构:**
- `ai_digital_agents`: 数字人产品目录
- `ai_capabilities`: AI能力配置
- `agent_store_bindings`: 商家数字人实例
- `agent_conversations`: 对话记录
- `agent_payment_orders`: 订阅/支付订单
- `agent_delivery_tracks`: 物流追踪

**预留API接口规范:**
```
POST /api/ai/orchestrations    # 触发 AI 会话
POST /api/ai/events            # 外部系统回调 (CloudEvents)
GET  /api/insights/user/:id    # 用户画像查询
POST /api/behavior/events      # 行为事件上报
GET  /api/ai/agents            # 数字人列表
POST /api/ai/agents/:id/activate  # 激活数字人
```

### Internet Genome Recognition System (互联网基因组识别)
预留的数据库表结构，用于后期集成用户行为分析和风险识别系统。

**预留表结构:**
- `user_ai_profiles`: 用户AI画像（购物偏好、内容偏好、行为模式、风险特征）
- `behavior_events`: 行为事件记录
- `risk_alerts`: 风险告警

**关键设计原则:**
- 松耦合: 通过事件总线异步通信
- 标准化: 采用 CloudEvents 等业界标准格式
- 可开关: 每个 AI 能力都有启用/禁用开关
- 合规优先: 所有用户数据都有 consent 字段

## Operations Backend (运营后台) - 已实现

### 已完成模块
运营中心 (`/ops`) 作为平台级管理控制台，已实现以下功能:

**1. 数据看板 (OpsDashboard)**
- 平台核心指标概览：用户数、商户数、活动总数、核销率
- 待处理事项提醒：商户入驻审核、内容审核、即将到期活动
- 流量概览：刷刷播放量、发现页浏览、优惠券领取
- 核销数据统计：总发放量、已核销、核销率、待使用

**2. 商户生态管理 (OpsMerchants)**
- 商户列表与搜索
- 状态筛选：待审核、运营中、已暂停
- 入驻审核功能：查看资质、通过/拒绝操作
- 商户详情弹窗

**3. 内容与活动管理 (OpsContent)**
- 短视频审核：待审核列表、内容预览、通过/拒绝
- 活动审核：商户发布活动审核
- 支持填写拒绝原因

**4. 用户与角色管理 (OpsUsers)**
- 用户列表与搜索
- 角色筛选：消费者、创作者、商户、管理员
- 用户统计面板
- 用户详情与角色展示

**5. 系统配置 (开发中)**
- 预留多语言配置
- 预留功能开关

### 路由结构
- `/ops` - 运营中心入口
- 从 MeSysAdmin 页面可直接进入

## Operations Backend Strategy (运营后台战略)

### 核心定位
"平台指挥塔" - 区别于商户门户（单商户视角），运营后台是全局视角，负责跨商户治理、平台策略、风险控制。

### 8大核心模块 (按优先级)
**P0 - 必须优先实现:**
1. 用户与角色管理
2. 商户生态管理（入驻审核、资质验证）
3. 内容与活动管理（审核、违规处理）
4. 基础数据看板

**P1 - 第二阶段:**
5. 订单与客服（核销监控、投诉仲裁）
6. 财务与结算（佣金配置、对账）

**P2 - 第三阶段:**
7. 运营工具（人群分群、A/B测试）
8. 平台配置（多语言、功能开关）

## Payment QR Code System (收款二维码系统) - 已实现

### 功能概述
商户收款二维码功能，支持顾客扫码支付自动成为会员。刷刷/DeeCard 只提供「收款页面 + 会员积分」服务，不直接提供支付服务，资金由持牌 PSP 直接结算给商户。

### 多 PSP 架构（2024-12 重构）
基于接口的可插拔 PSP 提供商架构 (`server/services/paymentProvider.ts`)：
- **PaymentProvider 接口**: 定义 createCharge, verifyPaymentWebhookSignature, parsePaymentWebhook 方法
- **OpnProvider**: Opn Payments (主力 PSP)，支持 Mock 模式和真实 API
- **TwoC2PProvider**: 2C2P (备用 PSP)，支持 Mock 模式
- **Mock 模式**: 当密钥未配置或为测试占位值时自动启用，返回模拟支付链接

### 商户入驻两种模式（已实现）
- **manual_id (已有账户)**: 商户已有 PSP 账户，直接输入 Merchant ID，即时激活
- **connect (新开通账户)**: 商户填写银行账户信息（泰国银行列表）、证件资料，提交后状态为 pending_review，等待 PSP 审核

### PSP 集成方案
- **主力PSP**: Opn Payments (Omise) - 开发者友好、费率低 (1.6-3.65%)
- **备用PSP**: 2C2P - 企业级稳定性

### 支持的支付方式
- PromptPay（泰国银行二维码）- V1 支持
- TrueMoney Wallet、Rabbit LINE Pay（规划中）
- 信用卡/借记卡（Visa、Mastercard）（规划中）
- Alipay、WeChat Pay（中国游客）（规划中）

### 数据库表结构
- `psp_providers`: PSP 服务商配置表
- `merchant_psp_accounts`: 商户 PSP 收款账户（含 psp_code, onboarding_mode, onboarding_status 字段）
- `store_qr_codes`: 门店收款二维码
- `qr_payments`: 二维码支付订单（含 payment_method 字段）
- `payment_points`: 支付积分记录

### API 接口
- `GET /api/psp-providers`: 获取可用 PSP 列表
- `GET/POST /api/merchant/psp-accounts`: 商户 PSP 账户管理
- `POST /api/merchant/qr-codes`: 生成门店收款二维码
- `GET /api/payments/qrcode/meta`: 获取二维码元数据（含 pspDisplayName）
- `POST /api/payments/qrcode/create`: 创建支付订单
- `GET /api/payments/:id`: 查询支付状态
- `POST /api/payments/webhook/opn`: Opn 支付回调
- `POST /api/payments/webhook/two_c2p`: 2C2P 支付回调
- `POST /api/payments/mock-complete`: Mock 支付完成（仅开发环境）
- `POST /api/points/claim`: 积分认领

### H5 页面
- `/p/:qrToken`: 支付入口页 (PayEntryPage)
- `/success/:paymentId`: 支付成功页 (PaySuccessPage)

### LINE OA 会员绑定流程（已实现）
支付即会员的核心功能，支持商户配置 LINE 官方账号，自动引导付款用户成为会员。

**商户配置（门店编辑 → LINE OA 设置）：**
- `lineOaId`: LINE OA 的 @ID（例如 @myshop）
- `lineOaUrl`: 加好友链接（支付成功后跳转）
- `lineOaChannelToken`: Channel Access Token（发送消费通知用，安全脱敏处理）

**用户流程：**
1. 顾客扫码支付 → 支付成功页
2. 用户领取积分（需先登录 LINE）
3. 如商户已配置 LINE OA Token，发送消费通知消息
4. 如商户已配置 LINE OA URL，引导跳转加好友

**安全措施：**
- Channel Access Token 不会在 API 响应中返回（GET/PATCH 均脱敏）
- 商户后台只显示"已配置"状态指示器，不显示实际 Token
- 仅当用户输入新值时才更新 Token
- 积分领取 API 验证 LINE OA 配置完整性后才触发消息发送

**技术实现：**
- `server/services/lineMessagingService.ts`: LINE Messaging API 集成
- 门店表新增字段：lineOaId, lineOaUrl, lineOaChannelToken
- API 返回 `hasLineOaToken: boolean` 替代实际 Token

### 安全措施
- Webhook 签名验证（生产环境强制开启）
- 商户权限验证（owner/operator 角色检查）
- 幂等性处理（重复 webhook 不重复处理）
- 开发环境需设置 `ALLOW_DEV_WEBHOOKS=true` 才能测试

### 开发文档
详见: `docs/payment-qrcode-integration.md`