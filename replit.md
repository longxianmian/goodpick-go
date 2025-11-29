# ShuaShua (刷刷) O2O Platform

## Overview
ShuaShua (刷刷) is a multi-merchant O2O local life platform evolved from GoodPick Go. It enables consumers to discover deals, redeem coupons, and connect with local businesses through LINE and other social media. The platform supports three user terminals: **Consumer (C-端)** with three-tab structure (Discover/Shop/Me), **Merchant Portal (商户端)** with home and operations center, and **Staff Workstation (员工端)** for coupon verification. It features multi-role authorization (owner/operator/verifier), multi-platform login (LINE/Google/Apple/Phone), payment-as-membership, and AI agent integration readiness.

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
- **LINE OAuth Session Fix**: Fixed production OAuth state loss issue by using dedicated `goodpickgo.sid` cookie name (avoiding historical `connect.sid` conflicts), extended session lifetime to 7 days, and enhanced callback logging for better debugging.
- **DeeCard OA Welcome Message Fix**: Fixed welcome message delivery by correctly routing messages to DeeCard OA (instead of GoodPick Go OA), implementing multi-OA token management, strict failure handling (only marks `welcome_sent = true` on actual success), and comprehensive logging for debugging LINE Messaging API responses.
- **Campaign Detail Page State Machine Refactor**: Completely refactored the campaign detail page claim flow to use a unified state machine based on backend `myStatus` field (containing `loggedIn` and `hasClaimed`). Removed all LIFF-related code, implemented proper login state validation via GET /api/me, fixed OAuth callback race conditions, and ensured button states correctly reflect user authentication and claim status at all times.
- **AuthContext Centralized State Machine (2025-11-17)**: Completely refactored authentication state management by centralizing all auth logic in AuthContext. Implemented `authPhase` ('booting'|'ready'|'error') to replace scattered loading flags, unified token handling (URL + localStorage) in a single bootstrap function, and added `reloadAuth()` trigger to safely reload user state after login/logout/claim operations. Removed all OAuth callback handling from page components (now managed centrally in AuthContext). Fixed critical issue where `logoutUser()` would leave stale state by making data reload independent of `userToken` dependency. CampaignDetail page now uses `authPhase` and `user` from AuthContext, ensuring correct button states: "用 LINE 一键领取" for anonymous users, "立即领取" for logged-in users without coupons, and "查看我的优惠券" for logged-in users with coupons.
- **Backend OAuth State Generation Fix (2025-11-17)**: Fixed production OAuth initialization issue where undefined state caused 400 errors. Backend now automatically generates state using nanoid when frontend doesn't provide it, ensuring OAuth flow works even when state is missing. Modified `/api/auth/line/init-oauth` to construct and return LINE OAuth URL (redirectUrl) instead of requiring frontend to build it. Removed strict state format validation (64-char hex) to support nanoid-generated states. Frontend updated to use `redirectUrl` instead of `liffUrl`. This ensures robust OAuth initialization that tolerates missing state parameters from client.
- **Store Card Navigation Interaction (2025-11-17)**: Optimized store card UX on campaign detail page. Entire store card now triggers Google Maps navigation on click (reusing existing `getNavigationUrl()` logic), while phone number link independently triggers dialing without propagating click to parent. Removed redundant standalone navigation button. Uses `e.stopPropagation()` to prevent phone clicks from triggering navigation, ensuring clean mobile-first interaction pattern.
- **ShuaShua Platform Upgrade Phase 1 (2025-11-29)**: Major architecture upgrade from GoodPick Go to ShuaShua multi-merchant O2O platform:
  - **Database Layer**: Added `merchantStaffRoles` table for multi-role system (owner/operator/verifier), `oauthAccounts` for multi-platform login binding, `agentTokens` for AI agent integration, and payment-related tables (`paymentConfigs`, `paymentTransactions`, `userStoreMemberships`, `membershipRules`).
  - **Role System API**: Implemented GET `/api/me/roles` endpoint returning user roles per store.
  - **Auto Role Assignment**: Staff binding flows (OAuth callback + regular binding) now auto-assign verifier role in `merchantStaffRoles`.
  - **C-端 Three-Tab Navigation**: Created `UserBottomNav` component with Discover/Shop/Me tabs, `ShuaShuaHome` (content feed with campaign cards), `ShopHome` (campaign listings), and `UserCenter` (profile, coupons, workstation entry).
  - **i18n Updates**: Complete translations for all new UI elements in Chinese, English, and Thai.
- **ShuaShua Platform Upgrade Phase 2 (2025-11-29)**: Continued platform development:
  - **Merchant Portal**: Created `MerchantHome` (store list, stats, quick actions) and `MerchantOperations` (campaign/staff/settings management) pages with `MerchantBottomNav` navigation.
  - **User Center Pages**: Added `LanguageSettings` (tri-language selector), `HelpPage` (FAQ, contact, phone, email), and `AboutPage` (app info, version, legal links).
  - **Navigation Handlers**: All merchant operation menu items now have proper onClick handlers linking to admin pages or showing "coming soon" toast.
  - **i18n Expansion**: Added merchant.* translations for all new features in Chinese, English, and Thai, plus common.comingSoon and common.featureInDevelopment keys.
- **i18n Hardcoded Strings Fix (2025-11-29)**: Fixed all hardcoded Chinese/English strings in the three main pages to use translation functions:
  - **ShopHome.tsx**: Replaced "9折券" with `t('shop.discountBadge')`, "已售" with `t('shop.sold')`, and "Store" fallback with `t('shop.storeFallback')`.
  - **MerchantHome.tsx**: Replaced "当月加购第{rank}名" with `t('merchant.topRank')`, "篇笔记" with `t('merchant.notesCount')`, time units with `t('merchant.units.hours/seconds')`, large number suffixes with `t('merchant.units.wan')`, currency symbol (฿) with `t('common.currencySymbol')`, and sort arrow (↕) with Lucide `ArrowUpDown` icon.
  - **LanguageContext.tsx**: Added 10+ new translation keys (shop.sold, shop.discountBadge, shop.storeFallback, merchant.notesCount, merchant.topRank, merchant.units.wan/hours/seconds, common.currencySymbol) for Chinese, English, and Thai.

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