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

// 门店服务类目枚举（按东南亚本地生活热度排序）
export const storeCategoryEnum = pgEnum('store_category', [
  'dining',           // 餐饮
  'coffee',           // 咖啡
  'dessert',          // 甜品
  'bbq',              // 烧烤
  'beauty',           // 美容美发
  'cosmetics',        // 美妆护肤
  'fashion',          // 服装
  'convenience',      // 便利店
  'grocery',          // 百货/超市
  'mother_baby',      // 母婴
  'home',             // 家居
  'building',         // 建材
  'ktv',              // KTV
  'amusement',        // 游乐场
  'hotel',            // 酒店
  'tourism',          // 旅游
  'rental',           // 租房
  'training',         // 培训
  'education',        // 教育
  'other',            // 其他
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
  category: storeCategoryEnum('category').default('other'),
  
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
  
  // 外卖配送设置
  supportsDelivery: boolean('supports_delivery').default(true),     // 是否支持外卖
  supportsPickup: boolean('supports_pickup').default(true),         // 是否支持自取
  deliveryRadiusKm: decimal('delivery_radius_km', { precision: 5, scale: 2 }).default('5'),  // 配送范围（公里）
  baseDeliveryFee: decimal('base_delivery_fee', { precision: 10, scale: 2 }).default('20'),  // 基础配送费
  perKmFee: decimal('per_km_fee', { precision: 10, scale: 2 }).default('5'),                 // 每公里配送费
  freeDeliveryMinAmount: decimal('free_delivery_min_amount', { precision: 10, scale: 2 }),   // 免配送费最低消费
  packagingFee: decimal('packaging_fee', { precision: 10, scale: 2 }).default('0'),          // 打包费
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }).default('0'),     // 最低起送金额
  
  // 服务评分（JSON格式: {"product": 4.8, "logistics": 4.5, "service": 4.7}）
  serviceScores: text('service_scores'),
  
  // 商家资质
  businessLicenseUrl: text('business_license_url'),  // 营业执照
  foodLicenseUrl: text('food_license_url'),          // 食品经营许可证
  
  // 关联商户老板用户ID
  ownerId: integer('owner_id'),
  
  // LINE OA 配置（支付即会员功能）
  lineOaId: text('line_oa_id'),                      // LINE OA 标识符
  lineOaUrl: text('line_oa_url'),                    // LINE OA 添加好友链接 (如 https://line.me/R/ti/p/@xxx)
  lineOaChannelToken: text('line_oa_channel_token'), // LINE OA Channel Access Token（用于发送消息）
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
  shuaName: text('shua_name'), // Creator's custom ShuaShua account name (different from LINE display name)
  shuaBio: text('shua_bio'), // Creator's bio/introduction for ShuaShua profile
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

export const shortVideoCommentLikes = pgTable('short_video_comment_likes', {
  id: serial('id').primaryKey(),
  commentId: integer('comment_id').notNull().references(() => shortVideoComments.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqCommentUser: unique().on(table.commentId, table.userId),
}));

export const insertShortVideoCommentLikeSchema = createInsertSchema(shortVideoCommentLikes).omit({
  id: true,
  createdAt: true,
});
export type InsertShortVideoCommentLike = z.infer<typeof insertShortVideoCommentLikeSchema>;
export type ShortVideoCommentLike = typeof shortVideoCommentLikes.$inferSelect;

// 短视频收藏表
export const shortVideoBookmarks = pgTable('short_video_bookmarks', {
  id: serial('id').primaryKey(),
  videoId: integer('video_id').notNull().references(() => shortVideos.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqVideoUser: unique().on(table.videoId, table.userId),
}));

export const insertShortVideoBookmarkSchema = createInsertSchema(shortVideoBookmarks).omit({
  id: true,
  createdAt: true,
});
export type InsertShortVideoBookmark = z.infer<typeof insertShortVideoBookmarkSchema>;
export type ShortVideoBookmark = typeof shortVideoBookmarks.$inferSelect;

// 用户关注关系表
export const userFollows = pgTable('user_follows', {
  id: serial('id').primaryKey(),
  followerId: integer('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: integer('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqFollow: unique().on(table.followerId, table.followingId),
}));

export const insertUserFollowSchema = createInsertSchema(userFollows).omit({
  id: true,
  createdAt: true,
});
export type InsertUserFollow = z.infer<typeof insertUserFollowSchema>;
export type UserFollow = typeof userFollows.$inferSelect;

// ============================================
// 数字人系统 - 预留表结构 (Digital Agent System)
// ============================================

// 数字人类型枚举
export const agentTypeEnum = pgEnum('agent_type', [
  'platform',     // 平台内使用型
  'line_oa',      // LINE OA 账号型
]);

// 数字人状态枚举
export const agentStatusEnum = pgEnum('agent_status', [
  'draft',        // 草稿
  'active',       // 上架销售中
  'suspended',    // 暂停
  'deprecated',   // 已废弃
]);

// 订阅状态枚举
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trial',        // 试用中
  'active',       // 订阅中
  'expired',      // 已过期
  'cancelled',    // 已取消
]);

// 计费模式枚举（数字人专用）
export const agentPricingModelEnum = pgEnum('agent_pricing_model', [
  'free',         // 免费
  'one_time',     // 一次性购买
  'subscription', // 月度订阅
  'per_session',  // 按会话量计费
]);

// 对话状态枚举
export const conversationStatusEnum = pgEnum('conversation_status', [
  'active',       // 进行中
  'completed',    // 已完成
  'abandoned',    // 已放弃
]);

// 数字人产品表 (AI Digital Agents Catalog)
export const aiDigitalAgents = pgTable('ai_digital_agents', {
  id: serial('id').primaryKey(),
  
  // 基本信息
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  coverImageUrl: text('cover_image_url'),
  demoVideoUrl: text('demo_video_url'),
  
  // 类型与能力
  agentType: agentTypeEnum('agent_type').notNull(),
  capabilities: text('capabilities').array(),  // ['search', 'compare', 'recommend', 'payment', 'tracking']
  
  // 定价
  pricingModel: agentPricingModelEnum('pricing_model').notNull().default('subscription'),
  monthlyPrice: decimal('monthly_price', { precision: 10, scale: 2 }),
  yearlyPrice: decimal('yearly_price', { precision: 10, scale: 2 }),
  perSessionPrice: decimal('per_session_price', { precision: 10, scale: 4 }),
  trialDays: integer('trial_days').default(7),
  
  // 状态与排序
  status: agentStatusEnum('status').notNull().default('draft'),
  sortOrder: integer('sort_order').default(0),
  
  // 统计
  subscriberCount: integer('subscriber_count').default(0),
  totalSessions: integer('total_sessions').default(0),
  avgRating: decimal('avg_rating', { precision: 2, scale: 1 }),
  
  // 外部系统配置 (预留字段)
  externalSystemId: text('external_system_id'),      // 外部数字人系统ID
  externalConfig: text('external_config'),           // JSON配置
  webhookUrl: text('webhook_url'),                   // 回调URL
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertAiDigitalAgentSchema = createInsertSchema(aiDigitalAgents).omit({
  id: true,
  subscriberCount: true,
  totalSessions: true,
  avgRating: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAiDigitalAgent = z.infer<typeof insertAiDigitalAgentSchema>;
export type AiDigitalAgent = typeof aiDigitalAgents.$inferSelect;

// AI能力配置表 (统一管理所有AI能力)
export const aiCapabilities = pgTable('ai_capabilities', {
  id: serial('id').primaryKey(),
  
  // 能力标识
  capabilityKey: text('capability_key').notNull().unique(),  // 'product_search', 'price_compare', 'smart_recommend', etc.
  name: text('name').notNull(),
  description: text('description'),
  
  // 提供者信息
  provider: text('provider').notNull(),       // 'internal', 'openai', 'custom'
  modelRef: text('model_ref'),                // 模型引用
  version: text('version'),
  
  // 性能配置
  latencySla: integer('latency_sla'),         // 延迟SLA (ms)
  costPerCall: decimal('cost_per_call', { precision: 10, scale: 6 }),
  
  // 状态
  isEnabled: boolean('is_enabled').notNull().default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertAiCapabilitySchema = createInsertSchema(aiCapabilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAiCapability = z.infer<typeof insertAiCapabilitySchema>;
export type AiCapability = typeof aiCapabilities.$inferSelect;

// 商家数字人实例表 (商家购买/订阅的数字人)
export const agentStoreBindings = pgTable('agent_store_bindings', {
  id: serial('id').primaryKey(),
  
  // 关联
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  agentId: integer('agent_id').notNull().references(() => aiDigitalAgents.id, { onDelete: 'cascade' }),
  
  // LINE OA 配置 (仅 line_oa 类型使用)
  lineChannelId: text('line_channel_id'),
  lineChannelSecret: text('line_channel_secret'),
  lineAccessToken: text('line_access_token'),
  
  // 订阅信息
  subscriptionStatus: subscriptionStatusEnum('subscription_status').notNull().default('trial'),
  trialEndsAt: timestamp('trial_ends_at'),
  subscriptionEndsAt: timestamp('subscription_ends_at'),
  sessionsUsed: integer('sessions_used').default(0),
  sessionsLimit: integer('sessions_limit'),
  
  // 个性化配置 (JSON)
  customConfig: text('custom_config'),        // 推荐策略、敏感词等
  knowledgeBaseUrl: text('knowledge_base_url'),
  
  // 状态
  isActive: boolean('is_active').notNull().default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqStoreAgent: unique().on(table.storeId, table.agentId),
}));

export const insertAgentStoreBindingSchema = createInsertSchema(agentStoreBindings).omit({
  id: true,
  sessionsUsed: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAgentStoreBinding = z.infer<typeof insertAgentStoreBindingSchema>;
export type AgentStoreBinding = typeof agentStoreBindings.$inferSelect;

// 数字人对话记录表
export const agentConversations = pgTable('agent_conversations', {
  id: serial('id').primaryKey(),
  
  // 关联
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  agentId: integer('agent_id').notNull().references(() => aiDigitalAgents.id, { onDelete: 'cascade' }),
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'set null' }),
  
  // 渠道信息
  channel: text('channel').notNull(),         // 'platform', 'line'
  channelUserId: text('channel_user_id'),     // LINE user ID 等
  
  // 对话内容 (JSON Array)
  messages: text('messages'),                 // [{role, content, timestamp}]
  
  // 推荐结果 (JSON Array)
  recommendations: text('recommendations'),   // [{productId, score, reason}]
  selectedProductId: integer('selected_product_id'),
  
  // 关联订单
  paymentOrderId: integer('payment_order_id'),
  
  // 状态与统计
  status: conversationStatusEnum('status').notNull().default('active'),
  messageCount: integer('message_count').default(0),
  
  // 追踪
  traceId: text('trace_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertAgentConversationSchema = createInsertSchema(agentConversations).omit({
  id: true,
  messageCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAgentConversation = z.infer<typeof insertAgentConversationSchema>;
export type AgentConversation = typeof agentConversations.$inferSelect;

// 数字人订阅/支付订单表
export const agentPaymentOrders = pgTable('agent_payment_orders', {
  id: serial('id').primaryKey(),
  
  // 关联
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  agentId: integer('agent_id').notNull().references(() => aiDigitalAgents.id, { onDelete: 'cascade' }),
  
  // 订单类型
  orderType: text('order_type').notNull(),    // 'subscription', 'one_time', 'session_pack'
  
  // 金额
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('THB'),
  
  // 订阅周期
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  sessionsIncluded: integer('sessions_included'),
  
  // 支付状态
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  paymentMethod: text('payment_method'),
  paymentReference: text('payment_reference'),
  paidAt: timestamp('paid_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertAgentPaymentOrderSchema = createInsertSchema(agentPaymentOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAgentPaymentOrder = z.infer<typeof insertAgentPaymentOrderSchema>;
export type AgentPaymentOrder = typeof agentPaymentOrders.$inferSelect;

// 数字人物流追踪表
export const agentDeliveryTracks = pgTable('agent_delivery_tracks', {
  id: serial('id').primaryKey(),
  
  // 关联
  orderId: integer('order_id'),                               // 业务订单ID
  conversationId: integer('conversation_id').references(() => agentConversations.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  
  // 物流信息
  trackingNumber: text('tracking_number'),
  carrier: text('carrier'),                   // 物流公司
  status: text('status').notNull(),           // 'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'
  
  // 位置信息
  currentLocation: text('current_location'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  
  // 时间预估
  estimatedDeliveryTime: timestamp('estimated_delivery_time'),
  actualDeliveryTime: timestamp('actual_delivery_time'),
  
  // 骑手信息 (即时配送)
  riderName: text('rider_name'),
  riderPhone: text('rider_phone'),
  riderAvatarUrl: text('rider_avatar_url'),
  
  // 通知状态
  lastNotifiedAt: timestamp('last_notified_at'),
  notificationCount: integer('notification_count').default(0),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertAgentDeliveryTrackSchema = createInsertSchema(agentDeliveryTracks).omit({
  id: true,
  notificationCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAgentDeliveryTrack = z.infer<typeof insertAgentDeliveryTrackSchema>;
export type AgentDeliveryTrack = typeof agentDeliveryTracks.$inferSelect;

// ============================================
// 互联网基因组识别系统 - 预留表结构 (Internet Genome Recognition)
// ============================================

// 用户画像类型枚举
export const profileTypeEnum = pgEnum('profile_type', [
  'shopping',       // 购物偏好
  'content',        // 内容偏好
  'behavior',       // 行为模式
  'risk',           // 风险特征
]);

// 风险等级枚举
export const riskLevelEnum = pgEnum('risk_level', [
  'low',
  'medium',
  'high',
  'critical',
]);

// 用户AI画像表 (基因组识别用)
export const userAiProfiles = pgTable('user_ai_profiles', {
  id: serial('id').primaryKey(),
  
  // 关联
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // 画像类型与版本
  profileType: profileTypeEnum('profile_type').notNull(),
  version: integer('version').notNull().default(1),
  
  // 特征数据 (JSON)
  features: text('features'),                 // 特征向量或结构化数据
  
  // 标签
  tags: text('tags').array(),                 // ['high_value', 'price_sensitive', 'frequent_buyer']
  
  // 置信度
  confidence: decimal('confidence', { precision: 5, scale: 4 }),
  
  // 合规字段
  consentFlag: boolean('consent_flag').notNull().default(false),
  dataSource: text('data_source'),            // 数据来源
  
  // 外部系统引用
  externalProfileId: text('external_profile_id'),
  
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  uniqUserProfile: unique().on(table.userId, table.profileType),
}));

export const insertUserAiProfileSchema = createInsertSchema(userAiProfiles).omit({
  id: true,
  version: true,
  lastUpdated: true,
  createdAt: true,
});
export type InsertUserAiProfile = z.infer<typeof insertUserAiProfileSchema>;
export type UserAiProfile = typeof userAiProfiles.$inferSelect;

// 行为事件表 (用户行为分析)
export const behaviorEvents = pgTable('behavior_events', {
  id: serial('id').primaryKey(),
  
  // 用户信息
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: text('session_id'),
  
  // 事件信息
  eventType: text('event_type').notNull(),    // 'page_view', 'product_click', 'search', 'add_cart', 'purchase', etc.
  eventSource: text('event_source'),          // 'app', 'web', 'line', 'agent'
  
  // 事件数据 (JSON)
  payload: text('payload'),                   // 事件详细数据
  
  // 关联对象
  targetType: text('target_type'),            // 'product', 'campaign', 'store', 'video'
  targetId: integer('target_id'),
  
  // 追踪
  traceId: text('trace_id'),
  
  // 合规字段
  consentFlag: boolean('consent_flag').default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertBehaviorEventSchema = createInsertSchema(behaviorEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertBehaviorEvent = z.infer<typeof insertBehaviorEventSchema>;
export type BehaviorEvent = typeof behaviorEvents.$inferSelect;

// 风险告警表
export const riskAlerts = pgTable('risk_alerts', {
  id: serial('id').primaryKey(),
  
  // 关联
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'set null' }),
  
  // 告警类型
  alertType: text('alert_type').notNull(),    // 'fraud', 'abuse', 'anomaly', 'spam', 'fake_review'
  riskLevel: riskLevelEnum('risk_level').notNull(),
  
  // 风险评分
  riskScore: decimal('risk_score', { precision: 5, scale: 4 }),
  
  // 证据 (JSON)
  evidence: text('evidence'),                 // 告警详细证据
  
  // 处理状态
  status: text('status').notNull().default('pending'),  // 'pending', 'reviewing', 'confirmed', 'dismissed'
  reviewedBy: integer('reviewed_by').references(() => admins.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  resolution: text('resolution'),
  
  // 外部系统引用
  externalAlertId: text('external_alert_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertRiskAlertSchema = createInsertSchema(riskAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRiskAlert = z.infer<typeof insertRiskAlertSchema>;
export type RiskAlert = typeof riskAlerts.$inferSelect;

// ============================================================
// 收款二维码功能 - 生产级多 PSP 架构
// ============================================================

// PSP 状态枚举
export const pspStatusEnum = pgEnum('psp_status', ['active', 'disabled']);

// 商户 PSP 账户状态枚举
export const merchantPspStatusEnum = pgEnum('merchant_psp_status', ['pending_review', 'active', 'suspended']);

// 商户入驻模式枚举
export const onboardingModeEnum = pgEnum('onboarding_mode', ['manual_id', 'connect']);

// 商户入驻状态枚举
export const onboardingStatusEnum = pgEnum('onboarding_status', [
  'not_started',   // 未开始
  'invited',       // 已发送邀请链接
  'in_progress',   // 入驻中
  'completed',     // 入驻完成
  'failed',        // 入驻失败
]);

// 支付方式枚举
export const paymentMethodEnum = pgEnum('payment_method', ['promptpay', 'card']);

// 二维码类型枚举
export const qrTypeEnum = pgEnum('qr_type', ['h5_pay_entry']);

// 二维码状态枚举
export const qrStatusEnum = pgEnum('qr_status', ['active', 'disabled']);

// 支付状态枚举（用于收款二维码）
export const paymentQrStatusEnum = pgEnum('payment_qr_status', ['init', 'pending', 'paid', 'failed', 'expired']);

// 积分状态枚举
export const pointsStatusEnum = pgEnum('points_status', ['unclaimed', 'claimed']);

// 1. PSP 提供方配置表
export const pspProviders = pgTable('psp_providers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),        // 'opn' | 'two_c2p' | 'stripe'
  name: text('name').notNull(),                 // 'Opn (Thailand)' | '2C2P Thailand'
  status: pspStatusEnum('status').notNull().default('active'),
  isDefault: boolean('is_default').notNull().default(false),  // 是否可选为默认 PSP
  config: text('config'),                       // JSONB 预留扩展配置
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertPspProviderSchema = createInsertSchema(pspProviders).omit({
  id: true,
  createdAt: true,
});
export type InsertPspProvider = z.infer<typeof insertPspProviderSchema>;
export type PspProvider = typeof pspProviders.$inferSelect;

// 2. 商户 PSP 账户配置表
export const merchantPspAccounts = pgTable('merchant_psp_accounts', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),                               // 平台租户（可选）
  merchantId: integer('merchant_id'),                            // 刷刷内部商户ID
  storeId: integer('store_id').references(() => stores.id, { onDelete: 'cascade' }),  // 可空=商户级，有值=门店级
  
  // PSP 配置
  pspCode: text('psp_code').notNull(),                          // 引用 psp_providers.code
  
  // 入驻模式与状态（核心新增）
  onboardingMode: onboardingModeEnum('onboarding_mode').notNull().default('manual_id'),
  onboardingStatus: onboardingStatusEnum('onboarding_status').notNull().default('not_started'),
  
  // PSP 商户标识
  providerMerchantRef: text('provider_merchant_ref'),           // PSP 自己的 merchant/account id
  onboardingRef: text('onboarding_ref'),                        // Connect 用的 reference
  onboardingUrl: text('onboarding_url'),                        // Onboarding link
  
  // 结算银行信息
  settlementBankName: text('settlement_bank_name'),
  settlementBankCode: text('settlement_bank_code'),             // 银行代码如 BBL, KBANK, SCB
  settlementAccountName: text('settlement_account_name'),
  settlementAccountNumber: text('settlement_account_number'),
  settlementBranch: text('settlement_branch'),                  // 分行信息
  
  currency: text('currency').notNull().default('THB'),
  
  // 认证资料 URLs
  idCardUrl: text('id_card_url'),                               // 身份证/护照扫描件
  companyRegistrationUrl: text('company_registration_url'),     // 公司注册文件
  businessLicenseUrl: text('business_license_url'),             // 营业执照
  
  // 状态
  status: merchantPspStatusEnum('status').notNull().default('pending_review'),
  rejectedReason: text('rejected_reason'),
  
  // 扩展字段
  meta: text('meta'),                                           // JSONB provider 扩展字段
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertMerchantPspAccountSchema = createInsertSchema(merchantPspAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  providerMerchantRef: true,
  onboardingRef: true,
  onboardingUrl: true,
});
export type InsertMerchantPspAccount = z.infer<typeof insertMerchantPspAccountSchema>;
export type MerchantPspAccount = typeof merchantPspAccounts.$inferSelect;

// 3. 门店二维码配置表
export const storeQrCodes = pgTable('store_qr_codes', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  
  qrType: qrTypeEnum('qr_type').notNull().default('h5_pay_entry'),
  qrPayload: text('qr_payload').notNull(),                      // H5链接如 https://pay.shuashua.com/p/:qr_token
  qrToken: text('qr_token').notNull().unique(),                 // 短码/token
  qrImageUrl: text('qr_image_url'),                             // 二维码图片URL
  
  status: qrStatusEnum('status').notNull().default('active'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertStoreQrCodeSchema = createInsertSchema(storeQrCodes).omit({
  id: true,
  createdAt: true,
  qrImageUrl: true,
});
export type InsertStoreQrCode = z.infer<typeof insertStoreQrCodeSchema>;
export type StoreQrCode = typeof storeQrCodes.$inferSelect;

// 4. 支付记录表
export const qrPayments = pgTable('qr_payments', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  qrCodeId: integer('qr_code_id').references(() => storeQrCodes.id, { onDelete: 'set null' }),
  
  // 业务订单号 (前端使用的ID)
  orderId: text('order_id').unique(),                           // 返回给前端的订单号 pay_xxx
  
  // 用户信息（支付时记录，Webhook 时自动发积分）
  lineUserId: text('line_user_id'),                             // 支付用户的 LINE ID
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),  // 关联用户表
  
  // PSP 信息
  pspCode: text('psp_code').notNull(),                          // 引用 psp_providers.code
  pspPaymentId: text('psp_payment_id'),                         // PSP 订单号
  
  // 金额
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  originalAmount: decimal('original_amount', { precision: 12, scale: 2 }),  // 原始金额（使用优惠券前）
  currency: text('currency').notNull().default('THB'),
  
  // 优惠券抵扣
  couponId: integer('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }),  // 优惠金额
  
  // 支付方式 (V1 固定为 promptpay，预留 card 扩展)
  paymentMethod: paymentMethodEnum('payment_method').notNull().default('promptpay'),
  
  // 状态
  status: paymentQrStatusEnum('status').notNull().default('init'),
  paidAt: timestamp('paid_at'),
  
  // 自动积分状态
  autoPointsGranted: boolean('auto_points_granted').default(false),  // 积分是否已自动发放
  
  // PSP 回调原文
  rawPayload: text('raw_payload'),                              // JSONB 存储
  
  // 跳转 URL
  redirectUrl: text('redirect_url'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertQrPaymentSchema = createInsertSchema(qrPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  paidAt: true,
  pspPaymentId: true,
  rawPayload: true,
});
export type InsertQrPayment = z.infer<typeof insertQrPaymentSchema>;
export type QrPayment = typeof qrPayments.$inferSelect;

// 5. 积分表（与支付关联）
export const paymentPoints = pgTable('payment_points', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').notNull().references(() => qrPayments.id, { onDelete: 'cascade' }),
  
  // 会员信息（用户用LINE认领时回填）
  memberId: integer('member_id').references(() => users.id, { onDelete: 'set null' }),
  lineUserId: text('line_user_id'),
  
  // 积分
  points: integer('points').notNull(),
  
  // 状态
  status: pointsStatusEnum('status').notNull().default('unclaimed'),
  claimedAt: timestamp('claimed_at'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertPaymentPointsSchema = createInsertSchema(paymentPoints).omit({
  id: true,
  createdAt: true,
  memberId: true,
  lineUserId: true,
  claimedAt: true,
});
export type InsertPaymentPoints = z.infer<typeof insertPaymentPointsSchema>;
export type PaymentPoints = typeof paymentPoints.$inferSelect;

// ============================================
// 聊天功能 - Chat System
// ============================================

// 消息发送者类型枚举
export const chatSenderTypeEnum = pgEnum('chat_sender_type', [
  'consumer',   // 消费者
  'merchant',   // 商户（人工）
  'ai_agent',   // AI数字人
]);

// 消息类型枚举
export const chatMessageTypeEnum = pgEnum('chat_message_type', [
  'text',       // 文本消息
  'image',      // 图片
  'product',    // 商品卡片
  'coupon',     // 优惠券卡片
]);

// 会话状态枚举
export const chatConversationStatusEnum = pgEnum('chat_conversation_status', [
  'active',     // 活跃
  'closed',     // 已关闭
]);

// 1. 聊天会话表 - 消费者与门店之间的对话
export const chatConversations = pgTable('chat_conversations', {
  id: serial('id').primaryKey(),
  
  // 会话双方
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  consumerId: integer('consumer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // 最后一条消息预览
  lastMessagePreview: text('last_message_preview'),
  lastMessageAt: timestamp('last_message_at'),
  
  // 未读消息数（商户端）
  unreadCountMerchant: integer('unread_count_merchant').default(0),
  // 未读消息数（消费者端）
  unreadCountConsumer: integer('unread_count_consumer').default(0),
  
  // 状态
  status: chatConversationStatusEnum('status').notNull().default('active'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // 确保每个消费者和门店之间只有一个会话
  uniqueConversation: unique().on(table.storeId, table.consumerId),
}));

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastMessagePreview: true,
  lastMessageAt: true,
  unreadCountMerchant: true,
  unreadCountConsumer: true,
});
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;

// 2. 聊天消息表
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  
  // 关联会话
  conversationId: integer('conversation_id').notNull().references(() => chatConversations.id, { onDelete: 'cascade' }),
  
  // 发送者信息
  senderType: chatSenderTypeEnum('sender_type').notNull(),
  senderId: integer('sender_id'),  // 消费者或商户操作员的用户ID
  
  // 消息内容
  messageType: chatMessageTypeEnum('message_type').notNull().default('text'),
  content: text('content').notNull(),           // 文本内容或JSON数据
  imageUrl: text('image_url'),                  // 图片URL（如果是图片消息）
  
  // 已读状态
  isReadByMerchant: boolean('is_read_by_merchant').default(false),
  isReadByConsumer: boolean('is_read_by_consumer').default(false),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  isReadByMerchant: true,
  isReadByConsumer: true,
});
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ==================== 账号申请系统 ====================

// 申请状态枚举
export const applicationStatusEnum = pgEnum('application_status', [
  'pending',    // 待审核
  'approved',   // 已通过
  'rejected',   // 已拒绝
]);

// 发现号申请表（商家入驻申请）
export const discoverApplications = pgTable('discover_applications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // 商家基本信息
  storeName: text('store_name').notNull(),           // 店铺名称
  storeCategory: storeCategoryEnum('store_category').notNull(),  // 店铺类目
  storeAddress: text('store_address').notNull(),     // 店铺地址
  storeCity: text('store_city').notNull(),           // 所在城市
  contactName: text('contact_name').notNull(),       // 联系人姓名
  contactPhone: text('contact_phone').notNull(),     // 联系电话
  
  // 可选信息
  brandName: text('brand_name'),                     // 品牌名称（连锁店适用）
  businessLicense: text('business_license'),         // 营业执照图片URL
  storePhotos: text('store_photos'),                 // 门店照片URLs (JSON数组)
  description: text('description'),                  // 申请说明
  
  // 审核相关
  status: applicationStatusEnum('status').notNull().default('pending'),
  reviewNote: text('review_note'),                   // 审核备注
  reviewedBy: integer('reviewed_by'),                // 审核人ID
  reviewedAt: timestamp('reviewed_at'),              // 审核时间
  
  // 审核通过后创建的店铺ID
  approvedStoreId: integer('approved_store_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertDiscoverApplicationSchema = createInsertSchema(discoverApplications).omit({
  id: true,
  status: true,
  reviewNote: true,
  reviewedBy: true,
  reviewedAt: true,
  approvedStoreId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDiscoverApplication = z.infer<typeof insertDiscoverApplicationSchema>;
export type DiscoverApplication = typeof discoverApplications.$inferSelect;

// 刷刷号申请表（创作者入驻申请）
export const shuashuaApplications = pgTable('shuashua_applications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // 创作者基本信息
  shuaName: text('shua_name').notNull(),             // 刷刷号名称（唯一标识）
  displayName: text('display_name').notNull(),       // 展示昵称
  bio: text('bio'),                                  // 个人简介
  contentType: text('content_type').notNull(),       // 内容类型（美食/旅行/生活等）
  
  // 社交媒体（用于验证创作能力）
  socialLinks: text('social_links'),                 // 社交媒体链接 (JSON数组)
  followerCount: text('follower_count'),             // 大致粉丝数
  
  // 可选信息
  portfolioLinks: text('portfolio_links'),           // 作品链接 (JSON数组)
  description: text('description'),                  // 申请说明
  
  // 审核相关
  status: applicationStatusEnum('status').notNull().default('pending'),
  reviewNote: text('review_note'),                   // 审核备注
  reviewedBy: integer('reviewed_by'),                // 审核人ID
  reviewedAt: timestamp('reviewed_at'),              // 审核时间
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertShuashuaApplicationSchema = createInsertSchema(shuashuaApplications).omit({
  id: true,
  status: true,
  reviewNote: true,
  reviewedBy: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertShuashuaApplication = z.infer<typeof insertShuashuaApplicationSchema>;
export type ShuashuaApplication = typeof shuashuaApplications.$inferSelect;

// ============================================
// 外卖系统 - 购物车、订单、配送
// ============================================

// 购物车状态枚举
export const cartStatusEnum = pgEnum('cart_status', [
  'active',     // 活跃购物车
  'checked_out', // 已结账
  'abandoned',  // 已放弃
]);

// 订单类型枚举
export const orderTypeEnum = pgEnum('order_type', [
  'dine_in',    // 堂食
  'pickup',     // 自取
  'delivery',   // 外卖配送
]);

// 外卖订单状态枚举
export const deliveryOrderStatusEnum = pgEnum('delivery_order_status', [
  'pending_payment',    // 待支付
  'paid',               // 已支付，等待商家接单
  'accepted',           // 商家已接单
  'preparing',          // 备餐中
  'ready_for_pickup',   // 备餐完成，等待骑手取餐
  'picked_up',          // 骑手已取餐
  'delivering',         // 配送中
  'delivered',          // 已送达
  'completed',          // 已完成
  'cancelled',          // 已取消
  'refunded',           // 已退款
]);

// 配送任务状态枚举
export const deliveryAssignmentStatusEnum = pgEnum('delivery_assignment_status', [
  'pending',            // 等待分配骑手
  'assigned',           // 已分配骑手
  'rider_accepted',     // 骑手已接单
  'rider_arrived_store', // 骑手已到店
  'picked_up',          // 已取餐
  'delivering',         // 配送中
  'delivered',          // 已送达
  'cancelled',          // 已取消
]);

// 骑手平台提供商枚举
export const riderProviderEnum = pgEnum('rider_provider', [
  'internal',           // 内部骑手
  'lalamove',           // Lalamove
  'grab',               // Grab Express
  'lineman',            // LINE MAN
  'foodpanda_rider',    // foodpanda 骑手
  'other',              // 其他平台
]);

// 购物车表
export const carts = pgTable('carts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  
  // 购物车状态
  status: cartStatusEnum('status').notNull().default('active'),
  
  // 订单类型
  orderType: orderTypeEnum('order_type').notNull().default('delivery'),
  
  // 金额汇总（实时计算，缓存用）
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).default('0'),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).default('0'),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).default('0'),
  
  // 优惠券
  couponId: integer('coupon_id'),
  
  // 会话ID（未登录用户）
  sessionId: text('session_id'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCart = z.infer<typeof insertCartSchema>;
export type Cart = typeof carts.$inferSelect;

// 购物车商品表
export const cartItems = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  cartId: integer('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  
  // 数量和价格
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  
  // 商品规格/选项（JSON格式）
  options: text('options'), // {"size": "大杯", "sugar": "少糖", "ice": "少冰"}
  
  // 备注
  note: text('note'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

// 用户配送地址表
export const deliveryAddresses = pgTable('delivery_addresses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // 收货人信息
  recipientName: text('recipient_name').notNull(),
  recipientPhone: text('recipient_phone').notNull(),
  
  // 地址信息
  addressLine1: text('address_line1').notNull(),  // 详细地址
  addressLine2: text('address_line2'),            // 门牌号/楼层
  district: text('district'),                     // 区域
  city: text('city').notNull(),
  province: text('province'),
  postalCode: text('postal_code'),
  country: text('country').default('Thailand'),
  
  // 地理位置
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  
  // 标签
  label: text('label'),  // "家", "公司", "学校"
  
  // 默认地址
  isDefault: boolean('is_default').default(false),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertDeliveryAddressSchema = createInsertSchema(deliveryAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDeliveryAddress = z.infer<typeof insertDeliveryAddressSchema>;
export type DeliveryAddress = typeof deliveryAddresses.$inferSelect;

// 外卖订单表
export const deliveryOrders = pgTable('delivery_orders', {
  id: serial('id').primaryKey(),
  orderNo: text('order_no').notNull().unique(),  // 订单编号
  
  // 关联
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  storeId: integer('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  cartId: integer('cart_id').references(() => carts.id, { onDelete: 'set null' }),
  addressId: integer('address_id').references(() => deliveryAddresses.id, { onDelete: 'set null' }),
  
  // 订单类型和状态
  orderType: orderTypeEnum('order_type').notNull().default('delivery'),
  status: deliveryOrderStatusEnum('status').notNull().default('pending_payment'),
  
  // 收货地址快照（防止地址变更影响历史订单）
  addressSnapshot: text('address_snapshot'),  // JSON格式的地址信息
  
  // 金额
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal('delivery_fee', { precision: 10, scale: 2 }).default('0'),
  packagingFee: decimal('packaging_fee', { precision: 10, scale: 2 }).default('0'),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('THB'),
  
  // 配送信息
  distanceKm: decimal('distance_km', { precision: 10, scale: 2 }),
  estimatedPrepTime: integer('estimated_prep_time'),   // 预计备餐时间（分钟）
  estimatedDeliveryTime: integer('estimated_delivery_time'),  // 预计配送时间（分钟）
  scheduledAt: timestamp('scheduled_at'),              // 预约配送时间
  
  // 备注
  customerNote: text('customer_note'),  // 顾客备注
  merchantNote: text('merchant_note'),  // 商家备注
  
  // 支付信息
  paymentMethod: text('payment_method'),
  paymentReference: text('payment_reference'),
  paidAt: timestamp('paid_at'),
  
  // 时间戳
  acceptedAt: timestamp('accepted_at'),      // 商家接单时间
  preparedAt: timestamp('prepared_at'),      // 备餐完成时间
  pickedUpAt: timestamp('picked_up_at'),     // 骑手取餐时间
  deliveredAt: timestamp('delivered_at'),    // 送达时间
  completedAt: timestamp('completed_at'),    // 完成时间
  cancelledAt: timestamp('cancelled_at'),    // 取消时间
  cancelReason: text('cancel_reason'),       // 取消原因
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertDeliveryOrderSchema = createInsertSchema(deliveryOrders).omit({
  id: true,
  orderNo: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDeliveryOrder = z.infer<typeof insertDeliveryOrderSchema>;
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;

// 订单商品表（订单快照）
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => deliveryOrders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  
  // 商品快照
  productName: text('product_name').notNull(),
  productImage: text('product_image'),
  
  // 数量和价格
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  
  // 规格选项
  options: text('options'),  // JSON格式
  note: text('note'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// 配送任务表（骑手配送）
export const deliveryAssignments = pgTable('delivery_assignments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => deliveryOrders.id, { onDelete: 'cascade' }),
  
  // 骑手平台
  provider: riderProviderEnum('provider').notNull().default('internal'),
  providerOrderId: text('provider_order_id'),  // 第三方平台订单ID
  
  // 骑手信息
  riderId: integer('rider_id').references(() => users.id, { onDelete: 'set null' }),
  riderName: text('rider_name'),
  riderPhone: text('rider_phone'),
  riderAvatarUrl: text('rider_avatar_url'),
  
  // 状态
  status: deliveryAssignmentStatusEnum('status').notNull().default('pending'),
  
  // 位置追踪
  currentLatitude: decimal('current_latitude', { precision: 10, scale: 7 }),
  currentLongitude: decimal('current_longitude', { precision: 10, scale: 7 }),
  lastLocationUpdate: timestamp('last_location_update'),
  
  // 时间戳
  assignedAt: timestamp('assigned_at'),
  acceptedAt: timestamp('accepted_at'),
  arrivedStoreAt: timestamp('arrived_store_at'),
  pickedUpAt: timestamp('picked_up_at'),
  deliveredAt: timestamp('delivered_at'),
  
  // 配送费（骑手端）
  riderFee: decimal('rider_fee', { precision: 10, scale: 2 }),
  
  // 备注
  riderNote: text('rider_note'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertDeliveryAssignmentSchema = createInsertSchema(deliveryAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDeliveryAssignment = z.infer<typeof insertDeliveryAssignmentSchema>;
export type DeliveryAssignment = typeof deliveryAssignments.$inferSelect;

// 骑手位置历史表（用于追踪轨迹）
export const riderLocationHistory = pgTable('rider_location_history', {
  id: serial('id').primaryKey(),
  assignmentId: integer('assignment_id').notNull().references(() => deliveryAssignments.id, { onDelete: 'cascade' }),
  
  latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal('accuracy', { precision: 10, scale: 2 }),  // 精度（米）
  speed: decimal('speed', { precision: 10, scale: 2 }),        // 速度（km/h）
  heading: decimal('heading', { precision: 10, scale: 2 }),    // 方向（角度）
  
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
});
