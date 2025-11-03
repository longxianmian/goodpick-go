import { pgTable, text, integer, boolean, timestamp, serial, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
export const discountTypeEnum = pgEnum('discount_type', ['final_price', 'gift_card', 'cash_voucher', 'full_reduction', 'percentage_off']);
export const couponStatusEnum = pgEnum('coupon_status', ['unused', 'used', 'expired']);
export const languageEnum = pgEnum('language', ['zh-cn', 'en-us', 'th-th']);
export const channelEnum = pgEnum('channel', ['line_menu', 'tiktok', 'facebook', 'ig', 'youtube', 'other']);

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

// Campaigns table with multi-language support
export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  
  // Source language fields
  titleSourceLang: languageEnum('title_source_lang').notNull().default('zh-cn'),
  titleSource: text('title_source').notNull(),
  descriptionSourceLang: languageEnum('description_source_lang').notNull().default('zh-cn'),
  descriptionSource: text('description_source').notNull(),
  
  // Translated fields
  titleZh: text('title_zh'),
  titleEn: text('title_en'),
  titleTh: text('title_th'),
  descriptionZh: text('description_zh'),
  descriptionEn: text('description_en'),
  descriptionTh: text('description_th'),
  
  // Business fields
  bannerImageUrl: text('banner_image_url'),
  couponValue: decimal('coupon_value', { precision: 10, scale: 2 }).notNull(),
  discountType: discountTypeEnum('discount_type').notNull(),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  maxPerUser: integer('max_per_user').notNull().default(1),
  maxTotal: integer('max_total'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Users table (LINE-based)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  lineUserId: text('line_user_id').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  language: languageEnum('language').notNull().default('zh-cn'),
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

// Coupons table (user coupon records)
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
  storeId: integer('store_id').references(() => stores.id),
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
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
