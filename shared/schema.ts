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
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

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
