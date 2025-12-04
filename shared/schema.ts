import { pgTable, text, integer, boolean, timestamp, serial, decimal, pgEnum, unique } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
export const discountTypeEnum = pgEnum('discount_type', ['final_price', 'percentage_off', 'cash_voucher']);
export const couponStatusEnum = pgEnum('coupon_status', ['unused', 'used', 'expired']);
export const languageEnum = pgEnum('language', ['zh-cn', 'en-us', 'th-th']);
export const preferredLanguageEnum = pgEnum('preferred_language', ['th', 'en', 'zh']);
export const channelEnum = pgEnum('channel', ['line_menu', 'tiktok', 'facebook', 'ig', 'youtube', 'other']);
export const broadcastStatusEnum = pgEnum('broadcast_status', ['pending', 'sending', 'done', 'failed', 'cancelled']);

// 刷刷升级 - 新增枚举
export const staffRoleEnum = pgEnum('staff_role', [
  'owner',      // 老板 / 创始人
  'operator',   // 运营号：负责发内容、上商品、配活动
  'verifier',   // 核销员：负责扫码/手动核销
]);

export const oauthProviderEnum = pgEnum('oauth_provider', [
  'line',    // LINE Login
  'google',  // Google OAuth
  'apple',   // Sign in with Apple
  'phone',   // 手机号 + 验证码登录
]);

export const membershipTierEnum = pgEnum('membership_tier', [
  'basic',     // 基础会员
  'silver',    // 银卡
  'gold',      // 金卡
  'platinum',  // 白金卡
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',    // 待支付
  'paid',       // 已支付
  'failed',     // 支付失败
  'refunded',   // 已退款
]);

// 门店相关枚举
export const industryTypeEnum = pgEnum('industry_type', [
  'food',          // 餐饮美食
  'retail',        // 百货零售
  'service',       // 生活服务
  'entertainment', // 休闲娱乐
]);

export const businessStatusEnum = pgEnum('business_status', [
  'open',          // 营业中
  'closed',        // 休息中
  'temporarily_closed', // 暂停营业
]);

// Admin table
export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;

// Stores table
export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  brand: text('brand'),
  city: text('city').notNull(),
  address: text('address').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  phone: text('phone'),
  rating: decimal('rating', { precision: 2, scale: 1 }),
  imageUrl: text('image_url'),
  floorInfo: text('floor_info'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  
  // 新增字段 - 门店首页展示相关
  industryType: industryTypeEnum('industry_type').default('food'),
  businessStatus: businessStatusEnum('business_status').default('open'),
  
  // 门店描述（多语言）
  descriptionZh: text('description_zh'),
  descriptionEn: text('description_en'),
  descriptionTh: text('description_th'),
  
  // 封面图轮播（图片URL数组）
  coverImages: text('cover_images').array(),
  
  // 营业时间（JSON格式: {"mon": "09:00-22:00", "tue": "09:00-22:00", ...}）
  businessHours: text('business_hours'),
  
  // 统计数据
  monthlySales: integer('monthly_sales').default(0),
  fansCount: integer('fans_count').default(0),
  topRank: integer('top_rank'),
  
  // 配送信息
  deliveryTime: integer('delivery_time'), // 分钟
  pickupTime: integer('pickup_time'),     // 自取等待时间（分钟）
  
  // 服务评分（JSON格式: {"product": 4.8, "logistics": 4.5, "service": 4.7}）
  serviceScores: text('service_scores'),
  
  // 商家资质
  businessLicenseUrl: text('business_license_url'),  // 营业执照
  foodLicenseUrl: text('food_license_url'),          // 食品经营许可证
  
  // 关联商户老板用户ID
  ownerId: integer('owner_id'),
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

// 商品状态枚举
export const productStatusEnum = pgEnum('product_status', [
  'draft',      // 草稿
  'active',     // 上架
  'inactive',   // 下架
  'soldout',    // 售罄
]);

// 商品分类表
export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull(),
  
  // 分类名称（多语言）
  nameSource: text('name_source').notNull(),
  nameZh: text('name_zh'),
  nameEn: text('name_en'),
  nameTh: text('name_th'),
  
  // 排序
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;

// 商品表
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull(),
  categoryId: integer('category_id'),
  
  // 商品基本信息
  name: text('name').notNull(),
  sku: text('sku'),
  
  // 商品描述（多语言，自动翻译）
  descriptionSource: text('description_source'),
  descriptionZh: text('description_zh'),
  descriptionEn: text('description_en'),
  descriptionTh: text('description_th'),
  
  // 价格信息
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  unit: text('unit').default('份'),
  
  // 库存管理
  inventory: integer('inventory').default(0),
  lowStockThreshold: integer('low_stock_threshold').default(10),
  
  // 商品图片
  coverImage: text('cover_image'),
  gallery: text('gallery').array(),
  
  // 商品状态
  status: productStatusEnum('status').default('draft'),
  
  // 商品标签
  isRecommend: boolean('is_recommend').default(false),
  isNew: boolean('is_new').default(false),
  isHot: boolean('is_hot').default(false),
  
  // 销售限制
  minPurchaseQty: integer('min_purchase_qty').default(1),
  maxPurchaseQty: integer('max_purchase_qty'),
  dailyLimit: integer('daily_limit'),
  
  // 配送选项
  isAvailableForDelivery: boolean('is_available_for_delivery').default(true),
  isAvailableForPickup: boolean('is_available_for_pickup').default(true),
  prepTimeMinutes: integer('prep_time_minutes').default(15),
  
  // 排序
  sortOrder: integer('sort_order').default(0),
  
  // 统计
  salesCount: integer('sales_count').default(0),
  viewCount: integer('view_count').default(0),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  salesCount: true,
  viewCount: true,
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Campaigns table - multi-language with OpenAI translation
export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  
  // Multi-language content fields
  titleSourceLang: languageEnum('title_source_lang').notNull().default('th-th'),
  titleSource: text('title_source').notNull(),
  titleZh: text('title_zh'),
  titleEn: text('title_en'),
  titleTh: text('title_th'),
  
  descriptionSourceLang: languageEnum('description_source_lang').notNull().default('th-th'),
  descriptionSource: text('description_source').notNull(),
  descriptionZh: text('description_zh'),
  descriptionEn: text('description_en'),
  descriptionTh: text('description_th'),
  
  // Media
  bannerImageUrl: text('banner_image_url'),
  mediaUrls: text('media_urls').array(),
  
  // Coupon rules
  couponValue: decimal('coupon_value', { precision: 10, scale: 2 }).notNull(),
  discountType: discountTypeEnum('discount_type').notNull(),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  currency: text('currency').notNull().default('THB'),
  
  // Time & limits
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  maxPerUser: integer('max_per_user').notNull().default(1),
  maxTotal: integer('max_total'),
  currentClaimed: integer('current_claimed').notNull().default(0),
  
  // Promotion channel (optional)
  channel: channelEnum('channel'),
  
  // Staff Instructions - multi-language
  staffInstructionsSourceLang: languageEnum('staff_instructions_source_lang').default('th-th'),
  staffInstructionsSource: text('staff_instructions_source'),
  staffInstructionsZh: text('staff_instructions_zh'),
  staffInstructionsEn: text('staff_instructions_en'),
  staffInstructionsTh: text('staff_instructions_th'),
  
  // Staff Training - multi-language
  staffTrainingSourceLang: languageEnum('staff_training_source_lang').default('th-th'),
  staffTrainingSource: text('staff_training_source'),
  staffTrainingZh: text('staff_training_zh'),
  staffTrainingEn: text('staff_training_en'),
  staffTrainingTh: text('staff_training_th'),
  
  staffTrainingMediaUrls: text('staff_training_media_urls').array(),
  
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentClaimed: true,
});
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Campaign-Store relationship table
export const campaignStores = pgTable('campaign_stores', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
});

export const insertCampaignStoreSchema = createInsertSchema(campaignStores).omit({
  id: true,
});
export type InsertCampaignStore = z.infer<typeof insertCampaignStoreSchema>;
export type CampaignStore = typeof campaignStores.$inferSelect;

// Users table (LINE-based) - Default language: Thai
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  lineUserId: text('line_user_id').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  phone: text('phone'), // Phone number from LINE profile (for staff binding verification)
  language: languageEnum('language').notNull().default('th-th'),
  preferredLanguage: preferredLanguageEnum('preferred_language'), // User's preferred language for OA messages (nullable)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// OA User Links table (tracks LINE OA relationships and welcome message status)
export const oaUserLinks = pgTable('oa_user_links', {
  id: serial('id').primaryKey(),
  oaId: text('oa_id').notNull(), // OA identifier (e.g., 'GOODPICK_MAIN_OA')
  lineUserId: text('line_user_id').notNull(), // LINE user ID
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }), // Platform user ID (nullable)
  initialLanguage: preferredLanguageEnum('initial_language').notNull(), // First detected language
  welcomeSent: boolean('welcome_sent').notNull().default(false), // Whether welcome message was sent
  welcomeSentAt: timestamp('welcome_sent_at'), // When welcome message was sent (nullable)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Composite unique constraint: one LINE user per OA
  uniqueOaLineUser: unique().on(table.oaId, table.lineUserId),
}));

export const insertOaUserLinkSchema = createInsertSchema(oaUserLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOaUserLink = z.infer<typeof insertOaUserLinkSchema>;
export type OaUserLink = typeof oaUserLinks.$inferSelect;

// Coupons table (user claimed coupons)
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  status: couponStatusEnum('status').notNull().default('unused'),
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  usedAt: timestamp('used_at'),
  expiredAt: timestamp('expired_at').notNull(),
  channel: channelEnum('channel').notNull().default('other'),
  redeemedStoreId: integer('redeemed_store_id').references(() => stores.id),
  notes: text('notes'),
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  issuedAt: true,
});
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

// Media files table for Object Storage tracking
export const mediaFiles = pgTable('media_files', {
  id: serial('id').primaryKey(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  uploadedBy: integer('uploaded_by').references(() => admins.id),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertMediaFileSchema = createInsertSchema(mediaFiles).omit({
  id: true,
  createdAt: true,
});
export type InsertMediaFile = z.infer<typeof insertMediaFileSchema>;
export type MediaFile = typeof mediaFiles.$inferSelect;

// Staff Presets table (for redemption authorization)
export const staffPresets = pgTable('staff_presets', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Staff name
  staffId: text('staff_id').notNull(), // Employee ID/number
  phone: text('phone').notNull(), // Phone number for binding verification
  authToken: text('auth_token').notNull().unique(), // Unique token for QR code binding
  isBound: boolean('is_bound').notNull().default(false), // Whether bound to a LINE account
  boundUserId: integer('bound_user_id').references(() => users.id, { onDelete: 'set null' }), // Bound user
  boundAt: timestamp('bound_at'), // Binding timestamp
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertStaffPresetSchema = createInsertSchema(staffPresets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  authToken: true,
  isBound: true,
  boundUserId: true,
  boundAt: true,
});
export type InsertStaffPreset = z.infer<typeof insertStaffPresetSchema>;
export type StaffPreset = typeof staffPresets.$inferSelect;

// Campaign Broadcasts table (for OA campaign message broadcasting)
export const campaignBroadcasts = pgTable('campaign_broadcasts', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  oaId: text('oa_id').notNull(), // OA identifier
  targetType: text('target_type').notNull().default('ALL'), // v1: fixed to 'ALL', future: 'SEGMENT'
  sendTime: timestamp('send_time').notNull(), // Scheduled send time
  status: broadcastStatusEnum('status').notNull().default('pending'),
  totalTargets: integer('total_targets').notNull().default(0), // Planned target count
  sentCount: integer('sent_count').notNull().default(0), // Actual sent count
  failedCount: integer('failed_count').notNull().default(0), // Failed count
  createdBy: integer('created_by').notNull().references(() => admins.id), // Admin who created the broadcast
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertCampaignBroadcastSchema = createInsertSchema(campaignBroadcasts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCampaignBroadcast = z.infer<typeof insertCampaignBroadcastSchema>;
export type CampaignBroadcast = typeof campaignBroadcasts.$inferSelect;

// ============================================
// 刷刷升级 - 新增表定义
// ============================================

// 门店角色关联表 (老板/运营/核销员)
export const merchantStaffRoles = pgTable('merchant_staff_roles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  role: staffRoleEnum('role').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqUserStoreRole: unique().on(table.userId, table.storeId, table.role),
}));

export const insertMerchantStaffRoleSchema = createInsertSchema(merchantStaffRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMerchantStaffRole = z.infer<typeof insertMerchantStaffRoleSchema>;
export type MerchantStaffRole = typeof merchantStaffRoles.$inferSelect;

// OAuth 多端登录绑定表
export const oauthAccounts = pgTable('oauth_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: oauthProviderEnum('provider').notNull(),
  providerUserId: text('provider_user_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqProviderUser: unique().on(table.provider, table.providerUserId),
}));

export const insertOAuthAccountSchema = createInsertSchema(oauthAccounts).omit({
  id: true,
  createdAt: true,
});
export type InsertOAuthAccount = z.infer<typeof insertOAuthAccountSchema>;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;

// 数字人接入凭证表 (Agent Token)
export const agentTokens = pgTable('agent_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  tokenHash: text('token_hash').notNull(),
  scopes: text('scopes').notNull().default('basic'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertAgentTokenSchema = createInsertSchema(agentTokens).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentToken = z.infer<typeof insertAgentTokenSchema>;
export type AgentToken = typeof agentTokens.$inferSelect;

// 支付配置表 (每个门店一条)
export const paymentConfigs = pgTable('payment_configs', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }).unique(),
  provider: text('provider').notNull().default('promptpay'),
  providerMerchantId: text('provider_merchant_id'),
  webhookSecret: text('webhook_secret'),
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  accountName: text('account_name'),
  promptpayId: text('promptpay_id'),
  qrCodeUrl: text('qr_code_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertPaymentConfigSchema = createInsertSchema(paymentConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentConfig = z.infer<typeof insertPaymentConfigSchema>;
export type PaymentConfig = typeof paymentConfigs.$inferSelect;

// 支付交易表
export const paymentTransactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  provider: text('provider').notNull(),
  providerTxnId: text('provider_txn_id').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('THB'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqProviderTxn: unique().on(table.provider, table.providerTxnId),
}));

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

// 会员规则表 (每个门店一条)
export const membershipRules = pgTable('membership_rules', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }).unique(),
  silverThreshold: decimal('silver_threshold', { precision: 10, scale: 2 }).notNull().default('500'),
  goldThreshold: decimal('gold_threshold', { precision: 10, scale: 2 }).notNull().default('2000'),
  platinumThreshold: decimal('platinum_threshold', { precision: 10, scale: 2 }).notNull().default('5000'),
  pointsDivisor: integer('points_divisor').notNull().default(10),
  welcomeCampaignId: integer('welcome_campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertMembershipRuleSchema = createInsertSchema(membershipRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMembershipRule = z.infer<typeof insertMembershipRuleSchema>;
export type MembershipRule = typeof membershipRules.$inferSelect;

// 用户门店会员表
export const userStoreMemberships = pgTable('user_store_memberships', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  tier: membershipTierEnum('tier').notNull().default('basic'),
  points: integer('points').notNull().default(0),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  visitCount: integer('visit_count').notNull().default(0),
  lastVisitAt: timestamp('last_visit_at'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqUserStore: unique().on(table.userId, table.storeId),
}));

export const insertUserStoreMembershipSchema = createInsertSchema(userStoreMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserStoreMembership = z.infer<typeof insertUserStoreMembershipSchema>;
export type UserStoreMembership = typeof userStoreMemberships.$inferSelect;

// ============================================
// 刷刷号创作者 - 内容和推广表
// ============================================

// 内容类型枚举
export const contentTypeEnum = pgEnum('content_type', ['video', 'article']);

// 内容状态枚举
export const contentStatusEnum = pgEnum('content_status', ['draft', 'published', 'archived']);

// 计费模式枚举
export const billingModeEnum = pgEnum('billing_mode', ['cpc', 'cpm', 'cps']);

// 推广项目类型枚举
export const promotionItemTypeEnum = pgEnum('promotion_item_type', ['coupon', 'campaign']);

// 创作者内容表
export const creatorContents = pgTable('creator_contents', {
  id: serial('id').primaryKey(),
  creatorUserId: integer('creator_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contentType: contentTypeEnum('content_type').notNull().default('video'),
  category: text('category'),  // 视频分类: funny, musicDance, drama, daily, healing, food, beauty, games
  title: text('title').notNull(),
  description: text('description'),
  mediaUrls: text('media_urls').array(),
  coverImageUrl: text('cover_image_url'),
  status: contentStatusEnum('status').notNull().default('draft'),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  shareCount: integer('share_count').notNull().default(0),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertCreatorContentSchema = createInsertSchema(creatorContents).omit({
  id: true,
  viewCount: true,
  likeCount: true,
  shareCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCreatorContent = z.infer<typeof insertCreatorContentSchema>;
export type CreatorContent = typeof creatorContents.$inferSelect;

// 推广绑定表 (内容绑定商户的卡券/活动)
export const promotionBindings = pgTable('promotion_bindings', {
  id: serial('id').primaryKey(),
  contentId: integer('content_id').notNull().references(() => creatorContents.id, { onDelete: 'cascade' }),
  promotionType: promotionItemTypeEnum('promotion_type').notNull(),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'cascade' }),
  billingMode: billingModeEnum('billing_mode').notNull().default('cpc'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  platformFeeRate: decimal('platform_fee_rate', { precision: 5, scale: 4 }).notNull().default('0.30'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertPromotionBindingSchema = createInsertSchema(promotionBindings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPromotionBinding = z.infer<typeof insertPromotionBindingSchema>;
export type PromotionBinding = typeof promotionBindings.$inferSelect;

// 推广收益表 (记录每次推广产生的收益)
export const promotionEarnings = pgTable('promotion_earnings', {
  id: serial('id').primaryKey(),
  bindingId: integer('binding_id').notNull().references(() => promotionBindings.id, { onDelete: 'cascade' }),
  creatorUserId: integer('creator_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  grossAmount: decimal('gross_amount', { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 10, scale: 2 }).notNull(),
  creatorEarning: decimal('creator_earning', { precision: 10, scale: 2 }).notNull(),
  referenceId: text('reference_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertPromotionEarningSchema = createInsertSchema(promotionEarnings).omit({
  id: true,
  createdAt: true,
});
export type InsertPromotionEarning = z.infer<typeof insertPromotionEarningSchema>;
export type PromotionEarning = typeof promotionEarnings.$inferSelect;

// ============================================
// 抖音式短视频系统（支持视频和图文）
// ============================================

// 短视频状态枚举
export const shortVideoStatusEnum = pgEnum('short_video_status', [
  'processing',   // 视频转码处理中
  'ready',        // 可播放
  'failed',       // 处理失败
  'deleted',      // 已删除
]);

// Feed内容类型枚举
export const feedContentTypeEnum = pgEnum('feed_content_type', [
  'video',        // 视频内容
  'article',      // 图文日记
]);

// 短视频表（现已支持图文日记）
export const shortVideos = pgTable('short_videos', {
  id: serial('id').primaryKey(),
  creatorUserId: integer('creator_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // 内容类型
  contentType: feedContentTypeEnum('content_type').notNull().default('video'),
  sourceContentId: integer('source_content_id'),  // 关联creator_contents表的ID
  
  // 视频媒体资源（视频类型必填）
  videoUrl: text('video_url'),                    // 原始视频URL（MP4）
  hlsUrl: text('hls_url'),                        // HLS流URL (m3u8)，由阿里云MPS转码生成
  coverImageUrl: text('cover_image_url'),         // 封面图（大图）
  thumbnailUrl: text('thumbnail_url'),            // 缩略图（列表用小图）
  
  // 图文媒体资源（图文类型使用）
  mediaUrls: text('media_urls').array(),          // 图文的多张图片URL数组
  
  // 视频元数据
  duration: integer('duration'),                  // 视频时长（秒）
  width: integer('width'),                        // 视频宽度
  height: integer('height'),                      // 视频高度
  fileSize: integer('file_size'),                 // 文件大小（字节）
  
  // 内容信息
  title: text('title'),                           // 标题（可选）
  description: text('description'),               // 描述
  category: text('category'),                     // 分类: funny, musicDance, drama, daily, healing, food, beauty, games
  hashtags: text('hashtags').array(),             // 话题标签
  locationName: text('location_name'),            // 位置名称
  locationLat: decimal('location_lat', { precision: 10, scale: 7 }),
  locationLng: decimal('location_lng', { precision: 10, scale: 7 }),
  
  // 关联推广
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'set null' }),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  
  // 状态与统计
  status: shortVideoStatusEnum('status').notNull().default('processing'),
  isPublic: boolean('is_public').notNull().default(true),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  shareCount: integer('share_count').notNull().default(0),
  
  // 时间戳
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertShortVideoSchema = createInsertSchema(shortVideos).omit({
  id: true,
  viewCount: true,
  likeCount: true,
  commentCount: true,
  shareCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertShortVideo = z.infer<typeof insertShortVideoSchema>;
export type ShortVideo = typeof shortVideos.$inferSelect;

// 短视频点赞表
export const shortVideoLikes = pgTable('short_video_likes', {
  id: serial('id').primaryKey(),
  videoId: integer('video_id').notNull().references(() => shortVideos.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqVideoUser: unique().on(table.videoId, table.userId),
}));

export const insertShortVideoLikeSchema = createInsertSchema(shortVideoLikes).omit({
  id: true,
  createdAt: true,
});
export type InsertShortVideoLike = z.infer<typeof insertShortVideoLikeSchema>;
export type ShortVideoLike = typeof shortVideoLikes.$inferSelect;

// 短视频评论表
export const shortVideoComments = pgTable('short_video_comments', {
  id: serial('id').primaryKey(),
  videoId: integer('video_id').notNull().references(() => shortVideos.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parentId: integer('parent_id').references((): any => shortVideoComments.id, { onDelete: 'cascade' }),
  likeCount: integer('like_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertShortVideoCommentSchema = createInsertSchema(shortVideoComments).omit({
  id: true,
  likeCount: true,
  createdAt: true,
});
export type InsertShortVideoComment = z.infer<typeof insertShortVideoCommentSchema>;
export type ShortVideoComment = typeof shortVideoComments.$inferSelect;
