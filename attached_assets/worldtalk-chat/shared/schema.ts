import { sql, relations, desc } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  text,
  uuid,
  jsonb,
  boolean,
  index,
  uniqueIndex,
  numeric,
  integer,
  serial
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// 渠道类型定义 - 用于区分消息来源平台
export type ChannelType = "mytalk" | "whatsapp" | "line" | "messenger" | "igdm";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  internalIdentity: varchar("internal_identity", { length: 12 }).unique(), // 12位混合字符，系统内部识别码（不对外公开）
  username: varchar("username", { length: 50 }).notNull().unique(), // 账号名称，对外唯一标识，用于搜索添加好友（大小写不敏感，一年最多修改2次）
  nickname: varchar("nickname", { length: 50 }), // 昵称，用户自定义显示名称
  email: varchar("email", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 20 }).unique(), // 手机号登录
  firstName: varchar("first_name", { length: 50 }), // 保留用于向后兼容
  lastName: varchar("last_name", { length: 50 }), // 保留用于向后兼容
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  languagePreference: varchar("language_preference", { length: 5 }).default("zh"),
  languagePreferenceChangedAt: timestamp("language_preference_changed_at"), // 语言偏好变更时间，用于"过往不咎"翻译策略
  gender: varchar("gender", { length: 10 }), // male, female, other - ⚠️ 必填才能使用语音聊天
  voicePersona: jsonb("voice_persona"), // 语音形象: { lang: string, voiceId: string, gender: 'male'|'female'|'neutral' }
  lineUserId: varchar("line_user_id", { length: 100 }).unique(), // LINE user ID for OAuth
  
  // 🎯 统一账号体系
  accountType: varchar("account_type", { length: 30 }).default("personal"), // personal, enterprise, service, creator
  
  // 🔗 IGIS 统一身份关联
  masterUserId: uuid("master_user_id"), // 关联 master_users.id，实现跨渠道身份统一
  primaryChannel: varchar("primary_channel", { length: 20 }).default("mytalk"), // 主要渠道来源: mytalk, line, whatsapp, telegram, phone
  
  // 🔐 后台系统角色与权限 (V0) - 将逐步迁移到 org_members
  role: varchar("role", { length: 30 }).default("user"), // user, platform_admin, merchant_admin, merchant_staff
  merchantId: uuid("merchant_id").references(() => merchants.id, { onDelete: "set null" }), // 商户管理员/员工所属商户ID
  passwordHash: varchar("password_hash", { length: 255 }), // 后台账号密码（bcrypt哈希）
  
  isOnline: boolean("is_online").default(false),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Friends relationship table
export const friends = pgTable("friends", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  friendId: varchar("friend_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, blocked
  channel: varchar("channel", { length: 20 }).default("mytalk"), // 渠道来源: mytalk, whatsapp, line, messenger, igdm
  externalUserId: varchar("external_user_id", { length: 100 }), // 外部平台用户ID（LINE userId, WhatsApp phone等）
  externalPlatformName: varchar("external_platform_name", { length: 100 }), // 外部平台显示名称
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // 🚀 优化：添加好友查询索引
    userIdStatusIdx: index("friends_user_id_status_idx").on(table.userId, table.status),
    friendIdStatusIdx: index("friends_friend_id_status_idx").on(table.friendId, table.status),
    // 外部平台用户唯一索引（确保每个外部用户在每个渠道只有一个映射）
    channelExternalUserUniqueIdx: uniqueIndex("friends_channel_external_user_unique_idx")
      .on(table.channel, table.externalUserId)
      .where(sql`${table.externalUserId} IS NOT NULL`),
  };
});

// Groups table
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  announcement: text("announcement"), // 群公告
  isActive: boolean("is_active").default(true),
  channel: varchar("channel", { length: 20 }).default("mytalk"), // 渠道来源: mytalk, whatsapp, line, messenger, igdm
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group members table
export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).default("member"), // admin, member
  nickname: varchar("nickname", { length: 50 }), // 我在群里的昵称
  isFollowed: boolean("is_followed").default(false), // 是否关注该成员（用于工作群标记重要同事）
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => {
  return {
    // 🚀 优化：添加群成员查询索引  
    userIdIdx: index("group_members_user_id_idx").on(table.userId),
    groupIdIdx: index("group_members_group_id_idx").on(table.groupId),
    userGroupIdx: index("group_members_user_group_idx").on(table.userId, table.groupId),
  };
});

// Messages table - 符合《世界聊 · 聊天内容翻译 & 语音策略 v1.1》规范
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: varchar("to_user_id").references(() => users.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }),
  
  // 🔗 IGIS v1.0: 统一身份字段
  masterId: uuid("master_id"), // 发送者的统一身份 ID (关联 master_users.id)
  sourceUserId: varchar("source_user_id"), // 原始渠道用户 ID (保留原始值用于追溯)
  
  // 🎯 消息模态 (v1.1)
  modality: varchar("modality", { length: 10 }).default("text"), // 'text' | 'voice'
  
  // 🎯 原始内容 (v1.1)
  originalLang: varchar("original_lang", { length: 10 }), // 原始语言，如 'zh-CN'
  originalText: text("original_text"), // 原始文本（打字 or STT识别）
  originalAudioUrl: text("original_audio_url"), // 原始语音URL（仅语音消息）
  
  // 🎯 多语言视图 (v1.1) - Record<lang, { text?: string; ttsUrl?: string; }>
  translations: jsonb("translations"), // 翻译缓存: { 'zh-CN': {text: '...', ttsUrl: '...'}, 'en-US': {...}, ... }
  
  // 📌 向后兼容字段（保留用于现有数据）
  messageType: varchar("message_type", { length: 20 }).default("text"), // text, image, file, audio, sticker
  content: text("content"), // 兼容旧数据
  originalLanguage: varchar("original_language", { length: 5 }), // 兼容旧数据
  transcript: text("transcript"), // 兼容旧数据
  translatedTranscript: text("translated_transcript"), // 兼容旧数据
  ttsAudioUrl: text("tts_audio_url"), // 兼容旧数据
  
  // 引用回复
  replyToMessageId: uuid("reply_to_message_id").references(() => messages.id, { onDelete: "set null" }),
  
  // 媒体字段
  mediaUrl: text("media_url"), // 媒体文件URL（图片/语音等）
  mediaDuration: integer("media_duration"), // 语音/视频时长（秒）
  
  // 其他字段
  isRead: boolean("is_read").default(false),
  isDeleted: boolean("is_deleted").default(false), // 软删除标记
  channel: varchar("channel", { length: 20 }).default("mytalk"), // 渠道来源: mytalk, whatsapp, line, messenger, igdm
  voiceMetadata: jsonb("voice_metadata"), // { duration: number, mime: string, waveform?: number[] }
  processingStatus: varchar("processing_status", { length: 20 }).default("ready"), // ready, processing, error
  mediaMetadata: jsonb("media_metadata"), // { thumbnailKey: string, fullKey: string, width: number, height: number, thumbnailSize: number, fullSize: number }
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // 🚀 添加索引以优化查询性能
    groupMessagesIdx: index("group_messages_idx").on(table.groupId, desc(table.createdAt)),
    friendMessagesIdx: index("friend_messages_idx").on(table.fromUserId, table.toUserId, desc(table.createdAt)),
    userMessagesIdx: index("user_messages_idx").on(table.toUserId, table.fromUserId, desc(table.createdAt)),
    createdAtIdx: index("messages_created_at_idx").on(desc(table.createdAt)),
    // 🔗 IGIS v1.0: 统一身份索引
    masterIdIdx: index("messages_master_id_idx").on(table.masterId),
  };
});

// Translations cache table
export const translations = pgTable("translations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  targetLanguage: varchar("target_language", { length: 5 }).notNull(),
  messageType: varchar("message_type", { length: 20 }).default("casual"), // casual, business, social
  translatedContent: text("translated_content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    // 🚀 添加索引以优化翻译查询性能
    messageTranslationsIdx: index("message_translations_idx").on(table.messageId, table.targetLanguage, desc(table.createdAt)),
    messageIdIdx: index("translations_message_id_idx").on(table.messageId),
  };
});

// Favorites/Bookmarks table - 消息收藏表
export const favorites = pgTable("favorites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  note: text("note"), // 用户添加的备注
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userMessageIdx: uniqueIndex("favorites_user_message_unique_idx").on(table.userId, table.messageId),
    userIdIdx: index("favorites_user_id_idx").on(table.userId),
  };
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// ==================== Organization & Enterprise Domain Tables ====================
// Added for unified account system (C-end personal + B-end enterprise)

// Organizations table - 企业主体表（用于Trustalk B端企业客服系统）
export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // crossborder_ecom, foreign_trade, buyer, enterprise_mgmt
  logoUrl: varchar("logo_url", { length: 500 }),
  description: text("description"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    typeIdx: index("orgs_type_idx").on(table.type),
  };
});

// Organization Members table - 企业成员关系表
export const orgMembers = pgTable("org_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid("org_id").notNull().references(() => orgs.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).default("staff"), // owner, admin, staff
  title: varchar("title", { length: 100 }), // Job title (e.g., "采购经理", "客服主管")
  invitationStatus: varchar("invitation_status", { length: 20 }).default("active"), // pending, active, inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    orgUserIdx: uniqueIndex("org_members_org_user_unique_idx").on(table.orgId, table.userId),
    userIdIdx: index("org_members_user_id_idx").on(table.userId),
    orgIdIdx: index("org_members_org_id_idx").on(table.orgId),
  };
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  friendsAsUser: many(friends, { relationName: "userFriends" }),
  friendsAsFriend: many(friends, { relationName: "friendUsers" }),
  ownedGroups: many(groups),
  groupMemberships: many(groupMembers),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  orgMemberships: many(orgMembers),
}));

export const friendsRelations = relations(friends, ({ one }) => ({
  user: one(users, {
    fields: [friends.userId],
    references: [users.id],
    relationName: "userFriends",
  }),
  friend: one(users, {
    fields: [friends.friendId],
    references: [users.id],
    relationName: "friendUsers",
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, {
    fields: [groups.ownerId],
    references: [users.id],
  }),
  members: many(groupMembers),
  messages: many(messages),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  fromUser: one(users, {
    fields: [messages.fromUserId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  toUser: one(users, {
    fields: [messages.toUserId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
  group: one(groups, {
    fields: [messages.groupId],
    references: [groups.id],
  }),
  translations: many(translations),
}));

export const translationsRelations = relations(translations, ({ one }) => ({
  message: one(messages, {
    fields: [translations.messageId],
    references: [messages.id],
  }),
}));

export const orgsRelations = relations(orgs, ({ many }) => ({
  members: many(orgMembers),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  org: one(orgs, {
    fields: [orgMembers.orgId],
    references: [orgs.id],
  }),
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFriendSchema = createInsertSchema(friends).omit({
  id: true,
  createdAt: true,
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertTranslationSchema = createInsertSchema(translations).omit({
  id: true,
  createdAt: true,
});

export const insertOrgSchema = createInsertSchema(orgs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrgMemberSchema = createInsertSchema(orgMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Username changes audit table - 追踪账号名称修改历史（每年最多2次）
export const usernameChanges = pgTable("username_changes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  oldUsername: varchar("old_username", { length: 50 }).notNull(),
  newUsername: varchar("new_username", { length: 50 }).notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("username_changes_user_id_idx").on(table.userId, desc(table.changedAt)),
  };
});

export const insertUsernameChangeSchema = createInsertSchema(usernameChanges).omit({
  id: true,
  changedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UsernameChange = typeof usernameChanges.$inferSelect;
export type InsertUsernameChange = z.infer<typeof insertUsernameChangeSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type Friend = typeof friends.$inferSelect;
export type InsertFriend = z.infer<typeof insertFriendSchema>;

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;

export type Org = typeof orgs.$inferSelect;
export type InsertOrg = z.infer<typeof insertOrgSchema>;

export type OrgMember = typeof orgMembers.$inferSelect;
export type InsertOrgMember = z.infer<typeof insertOrgMemberSchema>;

// ==================== Commerce & Membership Domain Tables ====================
// Added for multi-merchant commerce, membership, and O2O delivery features

// Merchants table - 商户表（用于电商业务，与orgs分离以避免跨领域耦合）
export const merchants = pgTable("merchants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // URL slug for merchant homepage
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // restaurant, retail, service, brand
  languages: jsonb("languages").default(sql`'["zh","en"]'`), // Supported languages array
  services: jsonb("services").default(sql`'[]'`), // Service types: dine_in, pickup, delivery
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 500 }),
  coverImageUrl: varchar("cover_image_url", { length: 500 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    slugIdx: index("merchants_slug_idx").on(table.slug),
    typeIdx: index("merchants_type_idx").on(table.type),
  };
});

// Membership Configs table - 商户会员配置表（每个商户一条配置）
export const membershipConfigs = pgTable("membership_configs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: uuid("merchant_id").notNull().unique().references(() => merchants.id, { onDelete: "cascade" }), // One config per merchant
  loyaltyEnabled: boolean("loyalty_enabled").default(true), // 是否启用会员+积分
  pointsEarnRate: numeric("points_earn_rate", { precision: 10, scale: 4 }).default("1"), // 每 1 THB 获得多少积分
  maxRedeemRatio: numeric("max_redeem_ratio", { precision: 5, scale: 2 }).default("0.5"), // 积分抵扣最高比例 (0-1)
  tierRules: jsonb("tier_rules").default(sql`'{"normal":{"min_points":0,"label":"普通会员"},"silver":{"min_points":1000,"label":"银卡会员"},"gold":{"min_points":5000,"label":"金卡会员"},"platinum":{"min_points":20000,"label":"白金会员"}}'`), // 各等级门槛配置
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    merchantIdIdx: index("membership_configs_merchant_id_idx").on(table.merchantId),
  };
});

// Merchant Payment Accounts table - 商户支付账户表（V0支付配置骨架）
export const merchantPaymentAccounts = pgTable("merchant_payment_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }), // 商户可有0~N个支付账户（V0只用1条）
  psp: varchar("psp", { length: 50 }).notNull(), // PSP类型：stripe_connect, omise 等
  pspAccountId: varchar("psp_account_id", { length: 255 }).notNull(), // PSP子商户账号ID（如Stripe的acct_xxx）
  displayName: varchar("display_name", { length: 200 }).notNull(), // 给商户看的账号名（如"Kasikorn Bank ····1234"）
  supportedMethods: jsonb("supported_methods").default(sql`'["card"]'`), // 支持的支付方式：["card", "promptpay"]
  status: varchar("status", { length: 20 }).default("pending"), // 账户状态：pending, active, suspended
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    merchantIdx: index("merchant_payment_accounts_merchant_idx").on(table.merchantId),
    pspAccountIdx: index("merchant_payment_accounts_psp_account_idx").on(table.pspAccountId),
  };
});

// Stores table - 门店表（多门店支持）
export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }), // Optional store-specific slug
  location: jsonb("location"), // { address: string, lat: number, lng: number }
  openingHours: jsonb("opening_hours"), // { mon: "09:00-22:00", ... }
  contactPhone: varchar("contact_phone", { length: 20 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    merchantIdIdx: index("stores_merchant_id_idx").on(table.merchantId),
  };
});

// Memberships table - 会员关系表（按商户维度）
export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  tier: varchar("tier", { length: 50 }).default("regular"), // regular, silver, gold, platinum, black_gold
  pointsBalance: varchar("points_balance", { length: 50 }).default("0"), // Using varchar to avoid integer overflow (can be large numbers)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    userMerchantIdx: index("memberships_user_merchant_idx").on(table.userId, table.merchantId),
    merchantIdIdx: index("memberships_merchant_id_idx").on(table.merchantId),
  };
});

// Loyalty Point Events table - 积分流水表
export const loyaltyPointEvents = pgTable("loyalty_point_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  membershipId: uuid("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // earn, redeem, adjust, expire
  amount: varchar("amount", { length: 50 }).notNull(), // Points amount (positive for earn, negative for redeem)
  reason: text("reason"), // order_payment, promotion_bonus, manual_adjustment, etc.
  relatedOrderId: uuid("related_order_id"), // Reference to order if applicable
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    membershipIdIdx: index("loyalty_point_events_membership_id_idx").on(table.membershipId),
    createdAtIdx: index("loyalty_point_events_created_at_idx").on(desc(table.createdAt)),
  };
});

// Orders table - 订单表（商品/服务订单）
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(), // Human-readable order number
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  merchantId: uuid("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
  items: jsonb("items").notNull(), // Array of order items with product/service details
  amountSubtotal: varchar("amount_subtotal", { length: 50 }).notNull(), // Subtotal before discounts
  amountDiscount: varchar("amount_discount", { length: 50 }).default("0"), // Total discounts
  amountDelivery: varchar("amount_delivery", { length: 50 }).default("0"), // Delivery fee
  amountTotal: varchar("amount_total", { length: 50 }).notNull(), // Final total amount
  fulfillmentType: varchar("fulfillment_type", { length: 20 }).notNull(), // dine_in, pickup, delivery
  status: varchar("status", { length: 20 }).default("pending"), // pending, paid, processing, completed, cancelled, refunded
  deliveryAddress: jsonb("delivery_address"), // { address, lat, lng, phone, notes }
  deliveryFee: varchar("delivery_fee", { length: 50 }).default("0"),
  deliveryTip: varchar("delivery_tip", { length: 50 }).default("0"),
  customerNotes: text("customer_notes"),
  metadata: jsonb("metadata"), // Additional order context
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("orders_user_id_idx").on(table.userId),
    merchantIdIdx: index("orders_merchant_id_idx").on(table.merchantId),
    statusIdx: index("orders_status_idx").on(table.status),
    createdAtIdx: index("orders_created_at_idx").on(desc(table.createdAt)),
  };
});

// Payments table - 支付记录表（Pay-to-Member逻辑）
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), // PSP identifier: stripe, promptpay, linepay, etc.
  providerTransactionId: varchar("provider_transaction_id", { length: 200 }), // External transaction ID
  status: varchar("status", { length: 20 }).default("pending"), // pending, succeeded, failed, cancelled, refunded
  paidAmount: varchar("paid_amount", { length: 50 }).notNull(), // Amount actually paid
  currency: varchar("currency", { length: 3 }).default("THB"),
  paymentMethod: varchar("payment_method", { length: 50 }), // credit_card, qr_code, cash, etc.
  metadata: jsonb("metadata"), // Provider-specific data
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    orderIdIdx: index("payments_order_id_idx").on(table.orderId),
    statusIdx: index("payments_status_idx").on(table.status),
  };
});

// Deliveries table - 配送记录表（骑手平台对接）
export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(), // internal, grab, lineman, lalamove, etc.
  providerOrderId: varchar("provider_order_id", { length: 200 }), // External delivery order ID
  trackingUrl: varchar("tracking_url", { length: 500 }),
  status: varchar("status", { length: 30 }).default("pending"), // pending, waiting_rider, picked_up, on_the_way, delivered, failed, cancelled
  riderInfo: jsonb("rider_info"), // { name, phone, vehicle, photo_url }
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  metadata: jsonb("metadata"), // Provider-specific delivery data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    orderIdIdx: index("deliveries_order_id_idx").on(table.orderId),
    statusIdx: index("deliveries_status_idx").on(table.status),
  };
});

// User Purchased Content table - 用户已购内容表（数字商品解锁）
export const userPurchasedContent = pgTable("user_purchased_content", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: uuid("content_id").notNull(), // Reference to discoveryContent.id
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  contentType: varchar("content_type", { length: 50 }).notNull(), // digital_human, course, template, etc.
  accessType: varchar("access_type", { length: 20 }).default("permanent"), // permanent, subscription, limited_time
  expiresAt: timestamp("expires_at"), // For subscription/limited_time access
  metadata: jsonb("metadata"), // Additional access data (download links, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    userIdIdx: index("user_purchased_content_user_id_idx").on(table.userId),
    contentIdIdx: index("user_purchased_content_content_id_idx").on(table.contentId),
    userContentIdx: index("user_purchased_content_user_content_idx").on(table.userId, table.contentId),
  };
});

// Relations for new tables
export const merchantsRelations = relations(merchants, ({ many }) => ({
  stores: many(stores),
  memberships: many(memberships),
  orders: many(orders),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [stores.merchantId],
    references: [merchants.id],
  }),
  orders: many(orders),
}));

export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  merchant: one(merchants, {
    fields: [memberships.merchantId],
    references: [merchants.id],
  }),
  pointEvents: many(loyaltyPointEvents),
}));

export const loyaltyPointEventsRelations = relations(loyaltyPointEvents, ({ one }) => ({
  membership: one(memberships, {
    fields: [loyaltyPointEvents.membershipId],
    references: [memberships.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  merchant: one(merchants, {
    fields: [orders.merchantId],
    references: [merchants.id],
  }),
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  payments: many(payments),
  delivery: one(deliveries),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  order: one(orders, {
    fields: [deliveries.orderId],
    references: [orders.id],
  }),
}));

// Insert schemas for new tables
export const insertMerchantSchema = createInsertSchema(merchants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMembershipConfigSchema = createInsertSchema(membershipConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMerchantPaymentAccountSchema = createInsertSchema(merchantPaymentAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMembershipSchema = createInsertSchema(memberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoyaltyPointEventSchema = createInsertSchema(loyaltyPointEvents).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for new tables
export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;

export type MembershipConfig = typeof membershipConfigs.$inferSelect;
export type InsertMembershipConfig = z.infer<typeof insertMembershipConfigSchema>;

export type MerchantPaymentAccount = typeof merchantPaymentAccounts.$inferSelect;
export type InsertMerchantPaymentAccount = z.infer<typeof insertMerchantPaymentAccountSchema>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = z.infer<typeof insertMembershipSchema>;

export type LoyaltyPointEvent = typeof loyaltyPointEvents.$inferSelect;
export type InsertLoyaltyPointEvent = z.infer<typeof insertLoyaltyPointEventSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Delivery = typeof deliveries.$inferSelect;
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;

// ==================== Digital Human Factory Tables ====================
// 数字人工厂底座 - 支持创建多种类型的数字人（短视频创作、律师、教师、闺蜜等）

// 技能类型枚举
export type DhSkillType = 
  | "chat"           // 基础对话
  | "translation"    // 翻译
  | "tts"            // 语音合成
  | "stt"            // 语音识别
  | "video_edit"     // 视频编辑
  | "image_gen"      // 图片生成
  | "document"       // 文档处理
  | "search"         // 知识检索
  | "code"           // 代码生成
  | "analysis";      // 数据分析

// 数字人类型枚举
export type DhHumanType = 
  | "shortvideo_creator"  // 短视频创作数字人
  | "lawyer"              // 律师数字人
  | "teacher"             // 教师数字人
  | "companion"           // 陪伴数字人（闺蜜/伴侣）
  | "consultant"          // 顾问数字人（企业老板顾问）
  | "customer_service"    // 客服数字人
  | "custom";             // 自定义类型

// 数字人定义表 - 存储所有数字人的基础信息
export const digitalHumans = pgTable("digital_humans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 基础信息
  name: varchar("name", { length: 100 }).notNull(),           // 数字人名称
  humanType: varchar("human_type", { length: 50 }).notNull(), // 类型：shortvideo_creator, lawyer, teacher...
  description: text("description"),                            // 简介
  avatarUrl: varchar("avatar_url", { length: 500 }),          // 头像
  
  // 人设配置
  persona: jsonb("persona"),  // { personality, tone, expertise, constraints, systemPrompt }
  
  // 技能配置（JSON数组，便于快速查询）
  enabledSkills: jsonb("enabled_skills"),  // ["chat", "tts", "video_edit"]
  
  // UI配置
  uiConfig: jsonb("ui_config"),  // { tabs: [...], primaryColor, theme }
  
  // 可见性
  isPublic: boolean("is_public").default(false),              // 是否公开（数字商城）
  allowedUserIds: jsonb("allowed_user_ids"),                  // 允许使用的用户ID列表（内测）
  
  // 计费配置（未来扩展）
  pricingConfig: jsonb("pricing_config"),  // { type: 'free'|'subscription'|'pay_per_use', price }
  
  // 元数据
  createdBy: varchar("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 技能模块表 - 定义可复用的能力模块
export const dhSkills = pgTable("dh_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  skillType: varchar("skill_type", { length: 50 }).notNull().unique(),  // chat, tts, video_edit...
  name: varchar("name", { length: 100 }).notNull(),                      // 显示名称
  description: text("description"),
  
  // 技能配置模板
  configSchema: jsonb("config_schema"),   // JSON Schema定义该技能需要的配置项
  defaultConfig: jsonb("default_config"), // 默认配置
  
  // 调用配置
  provider: varchar("provider", { length: 50 }),  // dashscope, openai, custom
  endpoint: varchar("endpoint", { length: 200 }), // API端点
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// 数字人-技能关联表（存储每个数字人对技能的个性化配置）
export const dhHumanSkills = pgTable("dh_human_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  humanId: varchar("human_id").notNull().references(() => digitalHumans.id, { onDelete: "cascade" }),
  skillId: varchar("skill_id").notNull().references(() => dhSkills.id, { onDelete: "cascade" }),
  
  // 该数字人对该技能的个性化配置
  config: jsonb("config"),  // 覆盖默认配置
  
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  humanSkillIdx: index("dh_human_skills_human_skill_idx").on(table.humanId, table.skillId),
}));

// 用户与数字人的会话表
export const dhConversations = pgTable("dh_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  humanId: varchar("human_id").notNull().references(() => digitalHumans.id, { onDelete: "cascade" }),
  
  // 会话状态
  status: varchar("status", { length: 30 }).default("active"),  // active, archived
  
  // 会话上下文（用于AI连续对话）
  context: jsonb("context"),  // 存储对话上下文、用户偏好等
  
  // 关联的项目ID（如果有）
  currentProjectId: varchar("current_project_id"),
  
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userHumanIdx: index("dh_conversations_user_human_idx").on(table.userId, table.humanId),
}));

// 数字人消息表
export const dhMessages = pgTable("dh_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  conversationId: varchar("conversation_id").notNull().references(() => dhConversations.id, { onDelete: "cascade" }),
  
  role: varchar("role", { length: 20 }).notNull(),  // user, assistant, system
  content: text("content").notNull(),
  
  // 消息类型
  messageType: varchar("message_type", { length: 30 }).default("text"),  // text, image, audio, video, card, action
  
  // 输入模式（语音聊天核心字段）
  inputMode: varchar("input_mode", { length: 20 }).default("text"),  // text, voice_input, voice_chat
  
  // 语音消息相关字段
  rawAudioUrl: varchar("raw_audio_url", { length: 500 }),  // 原始语音文件 OSS URL
  transcript: text("transcript"),  // 语音转写文本（长按显示）
  audioDuration: integer("audio_duration"),  // 语音时长（秒）
  
  // 附件
  attachments: jsonb("attachments"),  // [{ type, url, meta }]
  
  // UI提示（机器人回复时可带）
  uiHints: jsonb("ui_hints"),  // { currentStep, progress, actions }
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  conversationIdx: index("dh_messages_conversation_idx").on(table.conversationId, desc(table.createdAt)),
}));

// 数字人项目表 - 通用项目/任务（短视频项目、法律咨询案例等）
export const dhProjects = pgTable("dh_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  humanId: varchar("human_id").notNull().references(() => digitalHumans.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id").references(() => dhConversations.id),
  
  // 项目基础信息
  title: varchar("title", { length: 200 }),
  projectType: varchar("project_type", { length: 50 }),  // shortvideo, legal_case, lesson_plan...
  status: varchar("status", { length: 30 }).default("init"),  // init, in_progress, completed, cancelled
  
  // 项目配置（根据类型不同，结构不同）
  config: jsonb("config"),  // { platform, duration, audience, goal... }
  
  // 项目数据
  data: jsonb("data"),  // 项目相关的结构化数据
  
  // 当前步骤
  currentStep: varchar("current_step", { length: 50 }),
  
  // 输出结果
  outputUrl: text("output_url"),       // 最终输出文件URL
  outputMeta: jsonb("output_meta"),    // 输出相关元数据
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userHumanIdx: index("dh_projects_user_human_idx").on(table.userId, table.humanId),
  statusIdx: index("dh_projects_status_idx").on(table.status),
}));

// 项目步骤表 - 记录项目的分步骤信息
export const dhProjectSteps = pgTable("dh_project_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  projectId: varchar("project_id").notNull().references(() => dhProjects.id, { onDelete: "cascade" }),
  
  stepKey: varchar("step_key", { length: 50 }).notNull(),  // planning, shot_design, asset_prep...
  stepIndex: numeric("step_index"),                         // 步骤序号
  stepName: varchar("step_name", { length: 100 }),          // 显示名称
  
  status: varchar("status", { length: 30 }).default("pending"),  // pending, in_progress, completed, skipped
  
  // 步骤数据
  inputData: jsonb("input_data"),    // 输入数据
  outputData: jsonb("output_data"),  // 输出数据/结果
  
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  projectStepIdx: index("dh_project_steps_project_idx").on(table.projectId, table.stepIndex),
}));

// 项目资源表 - 素材/文件
export const dhAssets = pgTable("dh_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  projectId: varchar("project_id").notNull().references(() => dhProjects.id, { onDelete: "cascade" }),
  stepId: varchar("step_id").references(() => dhProjectSteps.id, { onDelete: "set null" }),
  
  // 资源信息
  assetType: varchar("asset_type", { length: 30 }).notNull(),  // image, video, audio, document, subtitle
  sourceType: varchar("source_type", { length: 30 }),           // user_upload, ai_generated
  
  name: varchar("name", { length: 200 }),
  url: text("url"),                                              // OSS URL
  
  // 元数据
  meta: jsonb("meta"),  // { duration, resolution, size, taskId... }
  
  status: varchar("status", { length: 30 }).default("pending"),  // pending, processing, ready, failed
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  projectIdx: index("dh_assets_project_idx").on(table.projectId),
  stepIdx: index("dh_assets_step_idx").on(table.stepId),
}));

// ==================== 语音能力系统 ====================

// 用户语音能力表 - 用户扫码激活的全局语音能力
export const userVoiceCapabilities = pgTable("user_voice_capabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  
  // 能力类型
  capabilityType: varchar("capability_type", { length: 50 }).notNull().default("voice_chat"),
  
  // 激活状态
  isActive: boolean("is_active").default(true),
  
  // 激活来源
  activationSource: varchar("activation_source", { length: 30 }).default("qr_scan"),
  
  // 激活码（用于二维码）
  activationCode: varchar("activation_code", { length: 100 }),
  
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userCapIdx: index("user_voice_cap_user_idx").on(table.userId, table.capabilityType),
  codeIdx: index("user_voice_cap_code_idx").on(table.activationCode),
}));

// 数字人语音能力表 - 数字人通过商店购买激活的语音能力
export const dhVoiceCapabilities = pgTable("dh_voice_capabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  humanId: varchar("human_id").notNull().references(() => digitalHumans.id, { onDelete: "cascade" }),
  
  // 能力类型
  capabilityType: varchar("capability_type", { length: 50 }).notNull().default("voice_chat"),
  
  // 激活状态
  isActive: boolean("is_active").default(true),
  
  // 激活来源
  activationSource: varchar("activation_source", { length: 30 }).default("store_purchase"),
  
  // 关联订单
  orderId: varchar("order_id"),
  
  activatedAt: timestamp("activated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  humanCapIdx: index("dh_voice_cap_human_idx").on(table.humanId, table.capabilityType),
}));

// 保留旧表兼容性（标记为废弃）
// @deprecated - 请使用 userVoiceCapabilities 和 dhVoiceCapabilities
export const userDhCapabilities = pgTable("user_dh_capabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  humanId: varchar("human_id").notNull().references(() => digitalHumans.id, { onDelete: "cascade" }),
  
  capabilityType: varchar("capability_type", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true),
  activationSource: varchar("activation_source", { length: 30 }).default("qr_scan"),
  activationCode: varchar("activation_code", { length: 100 }),
  
  activatedAt: timestamp("activated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userHumanCapIdx: index("user_dh_cap_user_human_idx").on(table.userId, table.humanId, table.capabilityType),
  humanCapIdx: index("user_dh_cap_human_idx").on(table.humanId, table.capabilityType),
  codeIdx: index("user_dh_cap_code_idx").on(table.activationCode),
}));

// 用户数字人自定义表 - 存储用户对已购买数字人的个性化设置
export const userDhCustomizations = pgTable("user_dh_customizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 用户和数字人关联
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  humanId: varchar("human_id").notNull().references(() => digitalHumans.id, { onDelete: "cascade" }),
  
  // 自定义设置（可选，为空则使用原始值）
  customName: varchar("custom_name", { length: 100 }), // 自定义名称
  customAvatarUrl: varchar("custom_avatar_url", { length: 500 }), // 自定义头像URL
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // 唯一索引：每个用户对每个数字人只有一套自定义设置
  userHumanUniqueIdx: uniqueIndex("user_dh_customizations_user_human_unique").on(table.userId, table.humanId),
  userIdx: index("user_dh_customizations_user_idx").on(table.userId),
}));

// ==================== Digital Human Factory Insert Schemas & Types ====================

export const insertDigitalHumanSchema = createInsertSchema(digitalHumans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDhSkillSchema = createInsertSchema(dhSkills).omit({
  id: true,
  createdAt: true,
});

export const insertDhHumanSkillSchema = createInsertSchema(dhHumanSkills).omit({
  id: true,
  createdAt: true,
});

export const insertDhConversationSchema = createInsertSchema(dhConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDhMessageSchema = createInsertSchema(dhMessages).omit({
  id: true,
  createdAt: true,
});

export const insertDhProjectSchema = createInsertSchema(dhProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDhProjectStepSchema = createInsertSchema(dhProjectSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDhAssetSchema = createInsertSchema(dhAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserDhCapabilitySchema = createInsertSchema(userDhCapabilities).omit({
  id: true,
  createdAt: true,
});

export const insertUserDhCustomizationSchema = createInsertSchema(userDhCustomizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type DigitalHuman = typeof digitalHumans.$inferSelect;
export type InsertDigitalHuman = z.infer<typeof insertDigitalHumanSchema>;

export type DhSkill = typeof dhSkills.$inferSelect;
export type InsertDhSkill = z.infer<typeof insertDhSkillSchema>;

export type DhHumanSkill = typeof dhHumanSkills.$inferSelect;
export type InsertDhHumanSkill = z.infer<typeof insertDhHumanSkillSchema>;

export type DhConversation = typeof dhConversations.$inferSelect;
export type InsertDhConversation = z.infer<typeof insertDhConversationSchema>;

export type DhMessage = typeof dhMessages.$inferSelect;
export type InsertDhMessage = z.infer<typeof insertDhMessageSchema>;

export type DhProject = typeof dhProjects.$inferSelect;
export type InsertDhProject = z.infer<typeof insertDhProjectSchema>;

export type DhProjectStep = typeof dhProjectSteps.$inferSelect;
export type InsertDhProjectStep = z.infer<typeof insertDhProjectStepSchema>;

export type DhAsset = typeof dhAssets.$inferSelect;
export type InsertDhAsset = z.infer<typeof insertDhAssetSchema>;

export type UserDhCapability = typeof userDhCapabilities.$inferSelect;
export type InsertUserDhCapability = z.infer<typeof insertUserDhCapabilitySchema>;

export type UserDhCustomization = typeof userDhCustomizations.$inferSelect;
export type InsertUserDhCustomization = z.infer<typeof insertUserDhCustomizationSchema>;

// 新语音能力系统类型
export type UserVoiceCapability = typeof userVoiceCapabilities.$inferSelect;
export type DhVoiceCapability = typeof dhVoiceCapabilities.$inferSelect;

// ==================== Enterprise Account Management ====================
// 企业号管理 - 扩展orgs表的审核状态，用于运营后台管理

// 企业号审核状态类型
export type EnterpriseStatus = "pending" | "approved" | "rejected" | "suspended";

// 企业号申请表 - 记录企业号开通申请
export const enterpriseApplications = pgTable("enterprise_applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 申请人信息
  applicantUserId: varchar("applicant_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // 企业信息
  companyName: varchar("company_name", { length: 200 }).notNull(),
  companyType: varchar("company_type", { length: 50 }).notNull(), // crossborder_ecom, foreign_trade, manufacturing, etc.
  businessLicense: varchar("business_license", { length: 500 }), // 营业执照图片URL
  contactName: varchar("contact_name", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  
  // 申请说明
  description: text("description"),
  
  // 审核状态
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected
  reviewNote: text("review_note"), // 审核备注
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  // 关联的企业ID（审核通过后创建）
  orgId: uuid("org_id").references(() => orgs.id),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  applicantIdx: index("enterprise_applications_applicant_idx").on(table.applicantUserId),
  statusIdx: index("enterprise_applications_status_idx").on(table.status),
}));

// ==================== Discovery Account System ====================
// 发现号系统 - 自媒体/商户用于发布内容、展示商品和数字人

// 发现号类型
export type DiscoveryAccountType = "creator" | "merchant" | "brand" | "official";

// 发现号表 - 自媒体/商户账号
export const discoveryAccounts = pgTable("discovery_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 关联用户（账号持有人）
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // 发现号信息
  handle: varchar("handle", { length: 50 }).notNull().unique(), // 唯一标识，类似@username
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  coverUrl: varchar("cover_url", { length: 500 }),
  bio: text("bio"),
  
  // 账号类型
  accountType: varchar("account_type", { length: 20 }).default("creator"), // creator, merchant, brand, official
  
  // 分类标签
  categoryId: uuid("category_id").references(() => discoveryCategories.id),
  tags: jsonb("tags"), // 标签数组 ["美食", "探店"]
  
  // 联系方式
  contactPhone: varchar("contact_phone", { length: 20 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  
  // 社交链接
  socialLinks: jsonb("social_links"), // { website, instagram, youtube, tiktok }
  
  // 统计数据（缓存）
  followersCount: varchar("followers_count", { length: 20 }).default("0"),
  contentCount: varchar("content_count", { length: 20 }).default("0"),
  
  // 认证状态
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at"),
  
  // 审核状态
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected, suspended
  reviewNote: text("review_note"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  ownerIdx: index("discovery_accounts_owner_idx").on(table.ownerId),
  handleIdx: index("discovery_accounts_handle_idx").on(table.handle),
  statusIdx: index("discovery_accounts_status_idx").on(table.status),
  categoryIdx: index("discovery_accounts_category_idx").on(table.categoryId),
}));

// 发现内容分类表
export const discoveryCategories = pgTable("discovery_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 分类信息
  name: varchar("name", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }), // 英文名
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  icon: varchar("icon", { length: 100 }), // 图标名称或URL
  color: varchar("color", { length: 20 }), // 主题色
  
  // 层级结构
  parentId: uuid("parent_id").references((): any => discoveryCategories.id),
  sortOrder: varchar("sort_order", { length: 10 }).default("0"),
  
  // 描述
  description: text("description"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  slugIdx: index("discovery_categories_slug_idx").on(table.slug),
  parentIdx: index("discovery_categories_parent_idx").on(table.parentId),
}));

// 发现内容表 - 发现号发布的内容
export const discoveryContent = pgTable("discovery_content", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 关联发现号
  accountId: uuid("account_id").notNull().references(() => discoveryAccounts.id, { onDelete: "cascade" }),
  
  // 内容信息
  title: varchar("title", { length: 200 }),
  content: text("content"),
  
  // 内容类型
  contentType: varchar("content_type", { length: 20 }).notNull(), // post, product, service, video, article
  
  // 媒体
  coverUrl: varchar("cover_url", { length: 500 }),
  mediaUrls: jsonb("media_urls"), // 媒体文件URL数组
  
  // 分类和标签
  categoryId: uuid("category_id").references(() => discoveryCategories.id),
  tags: jsonb("tags"),
  
  // 商品/服务相关（如果是商品类型）
  price: varchar("price", { length: 50 }),
  currency: varchar("currency", { length: 10 }).default("THB"),
  productMeta: jsonb("product_meta"), // { sku, stock, specs... }
  
  // 推广商品关联（用于内容带货）
  promotedProductId: uuid("promoted_product_id"), // 关联推广的商品ID
  
  // 互动统计（缓存）
  viewCount: varchar("view_count", { length: 20 }).default("0"),
  likeCount: varchar("like_count", { length: 20 }).default("0"),
  commentCount: varchar("comment_count", { length: 20 }).default("0"),
  shareCount: varchar("share_count", { length: 20 }).default("0"),
  
  // 发布设置
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  isPinned: boolean("is_pinned").default(false),
  
  // 审核状态
  status: varchar("status", { length: 20 }).default("draft"), // draft, pending, approved, rejected
  reviewNote: text("review_note"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  accountIdx: index("discovery_content_account_idx").on(table.accountId),
  categoryIdx: index("discovery_content_category_idx").on(table.categoryId),
  statusIdx: index("discovery_content_status_idx").on(table.status),
  publishedAtIdx: index("discovery_content_published_idx").on(desc(table.publishedAt)),
}));

// 发现首页推荐位表
export const discoverySpotlights = pgTable("discovery_spotlights", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 推荐类型
  spotlightType: varchar("spotlight_type", { length: 30 }).notNull(), // banner, featured_account, featured_content, hot_topic
  
  // 关联内容（根据类型可能是账号、内容或自定义）
  targetType: varchar("target_type", { length: 20 }), // account, content, custom
  targetId: uuid("target_id"),
  
  // 自定义内容（当target_type为custom时）
  title: varchar("title", { length: 200 }),
  subtitle: varchar("subtitle", { length: 300 }),
  imageUrl: varchar("image_url", { length: 500 }),
  linkUrl: varchar("link_url", { length: 500 }),
  
  // 显示位置
  position: varchar("position", { length: 20 }).default("home"), // home, category_xxx
  sortOrder: varchar("sort_order", { length: 10 }).default("0"),
  
  // 有效期
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  typeIdx: index("discovery_spotlights_type_idx").on(table.spotlightType),
  positionIdx: index("discovery_spotlights_position_idx").on(table.position),
}));

// 用户关注发现号表
export const discoveryFollows = pgTable("discovery_follows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => discoveryAccounts.id, { onDelete: "cascade" }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userAccountIdx: uniqueIndex("discovery_follows_user_account_idx").on(table.userId, table.accountId),
  accountIdx: index("discovery_follows_account_idx").on(table.accountId),
}));

// ==================== Digital Human Factory Extensions ====================
// 数字人工厂扩展 - 知识库管理、发现号关联

// 知识库表 - 存储三类知识库
// 类型说明:
// - industry (行业知识): 由平台运营添加，全局共享给所有数字人
// - enterprise (企业资料): 用户为特定数字人添加的公司/产品介绍
// - operations (运营动态与FAQ): 用户添加的常见问题、活动信息等
export const dhKnowledgeBases = pgTable("dh_knowledge_bases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 知识库信息
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // 知识库类型: industry(行业知识), enterprise(企业资料), operations(运营动态与FAQ)
  kbType: varchar("kb_type", { length: 30 }).notNull(),
  
  // 关联（行业知识库由平台创建，其他由用户为特定数字人创建）
  ownerId: varchar("owner_id").references(() => users.id), // null表示平台所有
  digitalHumanId: varchar("digital_human_id").references(() => digitalHumans.id, { onDelete: "cascade" }), // 关联的数字人
  
  // 领域/行业（用于分类行业知识库）
  domain: varchar("domain", { length: 100 }), // legal, education, food, beauty, tech...
  
  // 知识库配置
  config: jsonb("config"), // { embeddingModel, chunkSize, ... }
  
  // 统计
  documentCount: varchar("document_count", { length: 20 }).default("0"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  typeIdx: index("dh_knowledge_bases_type_idx").on(table.kbType),
  ownerIdx: index("dh_knowledge_bases_owner_idx").on(table.ownerId),
  domainIdx: index("dh_knowledge_bases_domain_idx").on(table.domain),
  dhIdx: index("dh_knowledge_bases_dh_idx").on(table.digitalHumanId),
}));

// 知识库文档表
export const dhKnowledgeDocuments = pgTable("dh_knowledge_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  knowledgeBaseId: uuid("knowledge_base_id").notNull().references(() => dhKnowledgeBases.id, { onDelete: "cascade" }),
  
  // 文档信息
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content"), // 文档原文
  
  // 文档类型
  docType: varchar("doc_type", { length: 30 }), // text, pdf, url, qa
  
  // 来源
  sourceUrl: varchar("source_url", { length: 500 }),
  sourceFile: varchar("source_file", { length: 500 }),
  
  // 处理状态
  status: varchar("status", { length: 20 }).default("pending"), // pending, processing, ready, failed
  
  // 元数据
  meta: jsonb("meta"), // { wordCount, chunks, ... }
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  kbIdx: index("dh_knowledge_documents_kb_idx").on(table.knowledgeBaseId),
  statusIdx: index("dh_knowledge_documents_status_idx").on(table.status),
}));

// 文档分块表（用于向量检索）
export const dhDocumentChunks = pgTable("dh_document_chunks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  documentId: uuid("document_id").notNull().references(() => dhKnowledgeDocuments.id, { onDelete: "cascade" }),
  
  // 分块内容
  content: text("content").notNull(),  // 分块文本
  chunkIndex: integer("chunk_index").notNull(), // 分块序号
  
  // 向量嵌入（使用jsonb存储float数组，兼容性最好）
  embedding: jsonb("embedding"), // [0.123, -0.456, ...] 1024维向量
  
  // 元数据
  tokenCount: integer("token_count"),
  meta: jsonb("meta"), // { startPos, endPos, ... }
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  docIdx: index("dh_document_chunks_doc_idx").on(table.documentId),
}));

// 数字人-知识库关联表
export const dhHumanKnowledgeLinks = pgTable("dh_human_knowledge_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  humanId: varchar("human_id").notNull().references(() => digitalHumans.id, { onDelete: "cascade" }),
  knowledgeBaseId: uuid("knowledge_base_id").notNull().references(() => dhKnowledgeBases.id, { onDelete: "cascade" }),
  
  // 优先级（多个知识库时的检索优先级）
  priority: varchar("priority", { length: 10 }).default("1"),
  
  isEnabled: boolean("is_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  humanKbIdx: uniqueIndex("dh_human_knowledge_links_idx").on(table.humanId, table.knowledgeBaseId),
}));

// 数字人-发现号关联表（数字人通过发现号展示）
export const dhHumanDiscoveryLinks = pgTable("dh_human_discovery_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  humanId: varchar("human_id").notNull().references(() => digitalHumans.id, { onDelete: "cascade" }),
  discoveryAccountId: uuid("discovery_account_id").notNull().references(() => discoveryAccounts.id, { onDelete: "cascade" }),
  
  // 展示配置
  displayOrder: varchar("display_order", { length: 10 }).default("0"),
  isFeatured: boolean("is_featured").default(false),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  humanDiscoveryIdx: uniqueIndex("dh_human_discovery_links_idx").on(table.humanId, table.discoveryAccountId),
}));

// ==================== Admin Activity Logs ====================
// 管理员活动日志 - 记录运营后台操作

export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 操作者
  adminId: varchar("admin_id").notNull().references(() => users.id),
  
  // 操作信息
  action: varchar("action", { length: 50 }).notNull(), // create, update, delete, approve, reject, suspend
  targetType: varchar("target_type", { length: 50 }).notNull(), // user, enterprise, discovery_account, digital_human, content
  targetId: varchar("target_id", { length: 100 }),
  
  // 操作详情
  description: text("description"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  
  // 请求信息
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  adminIdx: index("admin_activity_logs_admin_idx").on(table.adminId),
  actionIdx: index("admin_activity_logs_action_idx").on(table.action),
  targetIdx: index("admin_activity_logs_target_idx").on(table.targetType, table.targetId),
  createdAtIdx: index("admin_activity_logs_created_idx").on(desc(table.createdAt)),
}));

// ==================== Insert Schemas for New Tables ====================

export const insertEnterpriseApplicationSchema = createInsertSchema(enterpriseApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscoveryAccountSchema = createInsertSchema(discoveryAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscoveryCategorySchema = createInsertSchema(discoveryCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscoveryContentSchema = createInsertSchema(discoveryContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscoverySpotlightSchema = createInsertSchema(discoverySpotlights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscoveryFollowSchema = createInsertSchema(discoveryFollows).omit({
  id: true,
  createdAt: true,
});

export const insertDhKnowledgeBaseSchema = createInsertSchema(dhKnowledgeBases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDhKnowledgeDocumentSchema = createInsertSchema(dhKnowledgeDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDhDocumentChunkSchema = createInsertSchema(dhDocumentChunks).omit({
  id: true,
  createdAt: true,
});

export const insertDhHumanKnowledgeLinkSchema = createInsertSchema(dhHumanKnowledgeLinks).omit({
  id: true,
  createdAt: true,
});

export const insertDhHumanDiscoveryLinkSchema = createInsertSchema(dhHumanDiscoveryLinks).omit({
  id: true,
  createdAt: true,
});

export const insertAdminActivityLogSchema = createInsertSchema(adminActivityLogs).omit({
  id: true,
  createdAt: true,
});

// ==================== Types for New Tables ====================

export type EnterpriseApplication = typeof enterpriseApplications.$inferSelect;
export type InsertEnterpriseApplication = z.infer<typeof insertEnterpriseApplicationSchema>;

export type DiscoveryAccount = typeof discoveryAccounts.$inferSelect;
export type InsertDiscoveryAccount = z.infer<typeof insertDiscoveryAccountSchema>;

export type DiscoveryCategory = typeof discoveryCategories.$inferSelect;
export type InsertDiscoveryCategory = z.infer<typeof insertDiscoveryCategorySchema>;

export type DiscoveryContent = typeof discoveryContent.$inferSelect;
export type InsertDiscoveryContent = z.infer<typeof insertDiscoveryContentSchema>;

export type DiscoverySpotlight = typeof discoverySpotlights.$inferSelect;
export type InsertDiscoverySpotlight = z.infer<typeof insertDiscoverySpotlightSchema>;

export type DiscoveryFollow = typeof discoveryFollows.$inferSelect;
export type InsertDiscoveryFollow = z.infer<typeof insertDiscoveryFollowSchema>;

export type DhKnowledgeBase = typeof dhKnowledgeBases.$inferSelect;
export type InsertDhKnowledgeBase = z.infer<typeof insertDhKnowledgeBaseSchema>;

export type DhKnowledgeDocument = typeof dhKnowledgeDocuments.$inferSelect;
export type InsertDhKnowledgeDocument = z.infer<typeof insertDhKnowledgeDocumentSchema>;

export type DhDocumentChunk = typeof dhDocumentChunks.$inferSelect;
export type InsertDhDocumentChunk = z.infer<typeof insertDhDocumentChunkSchema>;

export type DhHumanKnowledgeLink = typeof dhHumanKnowledgeLinks.$inferSelect;
export type InsertDhHumanKnowledgeLink = z.infer<typeof insertDhHumanKnowledgeLinkSchema>;

export type DhHumanDiscoveryLink = typeof dhHumanDiscoveryLinks.$inferSelect;
export type InsertDhHumanDiscoveryLink = z.infer<typeof insertDhHumanDiscoveryLinkSchema>;

export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;
export type InsertAdminActivityLog = z.infer<typeof insertAdminActivityLogSchema>;

// ==================== 数字产品商店 (Digital Product Store) ====================

// 统一商品表 - 整合数字人、能力工具、数字内容
export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 归属店铺（发现号）
  shopId: uuid("shop_id").notNull().references(() => discoveryAccounts.id, { onDelete: "cascade" }),
  
  // 商品类型
  productType: varchar("product_type", { length: 30 }).notNull(), // digital_human, ability_tool, ebook, audio, video
  
  // 基础信息
  title: varchar("title", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 300 }),
  coverUrl: varchar("cover_url", { length: 500 }),
  shortDesc: text("short_desc"),
  detailRichText: text("detail_rich_text"), // 详情页富文本
  
  // 来源引用（关联到模板或内容）
  originType: varchar("origin_type", { length: 30 }), // digital_human, ability_template, discovery_content
  originId: varchar("origin_id", { length: 100 }), // 模板ID或内容ID
  
  // 价格配置
  pricePlan: jsonb("price_plan"), // { type: 'one_time'|'subscription'|'free', price, currency, period }
  originalPrice: varchar("original_price", { length: 20 }), // 原价（划线价）
  currentPrice: varchar("current_price", { length: 20 }), // 现价
  currency: varchar("currency", { length: 10 }).default("THB"),
  
  // 分类和标签
  categoryId: uuid("category_id").references(() => discoveryCategories.id),
  tags: jsonb("tags"), // ["AI助手", "语音对话"]
  
  // 统计数据
  viewCount: varchar("view_count", { length: 20 }).default("0"),
  purchaseCount: varchar("purchase_count", { length: 20 }).default("0"),
  likeCount: varchar("like_count", { length: 20 }).default("0"),
  rating: varchar("rating", { length: 10 }), // 评分 4.8
  
  // 排序和推荐
  sortOrder: varchar("sort_order", { length: 10 }).default("0"),
  isFeatured: boolean("is_featured").default(false),
  isHot: boolean("is_hot").default(false),
  isNew: boolean("is_new").default(true),
  
  // 状态
  status: varchar("status", { length: 20 }).default("draft"), // draft, pending_review, on_shelf, off_shelf
  reviewNote: text("review_note"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  shopIdx: index("products_shop_idx").on(table.shopId),
  typeIdx: index("products_type_idx").on(table.productType),
  statusIdx: index("products_status_idx").on(table.status),
  categoryIdx: index("products_category_idx").on(table.categoryId),
  originIdx: index("products_origin_idx").on(table.originType, table.originId),
}));

// 能力工具模板表 - 数字工厂的工具模板
export const abilityTemplates = pgTable("ability_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 基础信息
  name: varchar("name", { length: 100 }).notNull(),
  abilityType: varchar("ability_type", { length: 50 }).notNull(), // voice_input, voice_chat, image_gen, video_edit
  description: text("description"),
  iconUrl: varchar("icon_url", { length: 500 }),
  
  // 能力配置
  config: jsonb("config"), // 能力特定的配置
  
  // 计费配置
  pricingConfig: jsonb("pricing_config"), // { type, price, quota }
  
  // 可见性
  isPublic: boolean("is_public").default(false),
  
  // 元数据
  createdBy: varchar("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  typeIdx: index("ability_templates_type_idx").on(table.abilityType),
}));

// 用户购买记录表
export const userPurchases = pgTable("user_purchases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 购买者
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // 购买的商品
  productId: uuid("product_id").notNull().references(() => products.id),
  productType: varchar("product_type", { length: 30 }).notNull(), // 冗余存储，方便查询
  
  // 购买详情
  pricePaid: varchar("price_paid", { length: 20 }),
  currency: varchar("currency", { length: 10 }).default("THB"),
  paymentMethod: varchar("payment_method", { length: 30 }), // wallet, card, promptpay
  transactionId: varchar("transaction_id", { length: 100 }),
  
  // 订阅信息（如果是订阅类型）
  subscriptionStart: timestamp("subscription_start"),
  subscriptionEnd: timestamp("subscription_end"),
  isSubscriptionActive: boolean("is_subscription_active").default(true),
  
  // 状态
  status: varchar("status", { length: 20 }).default("completed"), // pending, completed, refunded, expired
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("user_purchases_user_idx").on(table.userId),
  productIdx: index("user_purchases_product_idx").on(table.productId),
  userProductIdx: uniqueIndex("user_purchases_user_product_idx").on(table.userId, table.productId),
}));

// 用户数字人个性化配置表 - 用户购买数字人后的个性化设置
export const userDhConfigs = pgTable("user_dh_configs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 关联
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  digitalHumanId: varchar("digital_human_id").notNull().references(() => digitalHumans.id, { onDelete: "cascade" }),
  
  // 基础自定义
  customNickname: varchar("custom_nickname", { length: 50 }), // 用户给数字人取的名字
  customAvatarUrl: varchar("custom_avatar_url", { length: 500 }), // 自定义头像
  
  // 音色配置
  voiceId: varchar("voice_id", { length: 100 }), // CosyVoice 声音ID
  voiceSpeed: varchar("voice_speed", { length: 10 }).default("1.0"), // 语速
  
  // 人设配置
  persona: jsonb("persona"), /* {
    age: "25",
    gender: "female",
    occupation: "咖啡师",
    hobbies: ["烘焙", "看电影", "旅行"],
    personalityTraits: {
      underPressure: "冷静分析", // 压力时
      whenHappy: "热情分享",    // 高兴时
      whenSad: "需要陪伴",      // 难过时
      whenAngry: "讲道理",      // 生气时
      whenPraised: "害羞否认",  // 被夸奖时
      chatStyle: "温柔体贴"     // 聊天风格
    },
    backstory: "...",           // 背景故事
    customPrompt: "..."         // 用户自定义的额外提示
  } */
  
  // 聊天设置
  chatSettings: jsonb("chat_settings"), // { autoPlayVoice, notificationEnabled, ... }
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userDhIdx: uniqueIndex("user_dh_configs_user_dh_idx").on(table.userId, table.digitalHumanId),
  userIdx: index("user_dh_configs_user_idx").on(table.userId),
}));

// 用户能力工具使用记录表
export const userAbilities = pgTable("user_abilities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  abilityType: varchar("ability_type", { length: 50 }).notNull(), // voice_input, voice_chat, image_gen
  
  // 来源（购买的商品或赠送）
  sourceType: varchar("source_type", { length: 30 }), // purchase, gift, trial
  sourcePurchaseId: uuid("source_purchase_id").references(() => userPurchases.id),
  
  // 配额
  quotaTotal: varchar("quota_total", { length: 20 }), // 总配额（-1表示无限）
  quotaUsed: varchar("quota_used", { length: 20 }).default("0"), // 已使用
  quotaResetAt: timestamp("quota_reset_at"), // 配额重置时间（订阅类型）
  
  // 有效期
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdx: index("user_abilities_user_idx").on(table.userId),
  userAbilityIdx: index("user_abilities_user_ability_idx").on(table.userId, table.abilityType),
}));

// ==================== Insert Schemas for Digital Store ====================

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAbilityTemplateSchema = createInsertSchema(abilityTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserPurchaseSchema = createInsertSchema(userPurchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserDhConfigSchema = createInsertSchema(userDhConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAbilitySchema = createInsertSchema(userAbilities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ==================== Types for Digital Store ====================

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type AbilityTemplate = typeof abilityTemplates.$inferSelect;
export type InsertAbilityTemplate = z.infer<typeof insertAbilityTemplateSchema>;

export type UserPurchase = typeof userPurchases.$inferSelect;
export type InsertUserPurchase = z.infer<typeof insertUserPurchaseSchema>;

export type UserDhConfig = typeof userDhConfigs.$inferSelect;
export type InsertUserDhConfig = z.infer<typeof insertUserDhConfigSchema>;

export type UserAbility = typeof userAbilities.$inferSelect;
export type InsertUserAbility = z.infer<typeof insertUserAbilitySchema>;

// ==================== Trustalk Multi-tenant Platform Tables ====================
// For Trustalk B-end: Multi-tenant LINE OA management platform

// Tenants table - 租户/工作空间（多租户核心表）
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 租户名称，如"宝宝龙电商"
  ownerUserId: varchar("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: text("plan_id").default("C"), // 套餐ID: 'C'=个人版(默认), 'SB'=小B版(小团队), 'BB'=大B版(企业版)
  status: varchar("status", { length: 20 }).default("active"), // active, paused, closed
  defaultTargetLang: varchar("default_target_lang", { length: 10 }).default("zh-CN"), // 老板看消息的默认语言
  oaQrImageUrl: text("oa_qr_image_url"), // LINE OA 二维码图片 URL（面对面加好友用）
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  ownerIdx: index("tenants_owner_idx").on(table.ownerUserId),
  statusIdx: index("tenants_status_idx").on(table.status),
}));

// Tenant Users table - 租户成员关系表
export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).default("member"), // owner, admin, member
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantUserIdx: uniqueIndex("tenant_users_tenant_user_idx").on(table.tenantId, table.userId),
  userIdx: index("tenant_users_user_idx").on(table.userId),
}));

// Tenant Invitations table - 租户邀请码表（Tenant = Workbench 工作台）
export const tenantInvitations = pgTable("tenant_invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  inviterUserId: varchar("inviter_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 32 }).notNull(), // 邀请码，如 "ABC123"
  role: varchar("role", { length: 20 }).default("member"), // 邀请加入的角色：admin, member
  maxUses: integer("max_uses").default(1), // 最大使用次数，-1 表示无限
  usedCount: integer("used_count").default(0), // 已使用次数
  expiresAt: timestamp("expires_at"), // 过期时间，null 表示永不过期
  status: varchar("status", { length: 20 }).default("active"), // active, expired, revoked
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("tenant_invitations_tenant_idx").on(table.tenantId),
  codeIdx: uniqueIndex("tenant_invitations_code_idx").on(table.code),
  statusIdx: index("tenant_invitations_status_idx").on(table.status),
}));

// Tenant Invitation Uses table - 租户邀请码使用记录
export const tenantInvitationUses = pgTable("tenant_invitation_uses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invitationId: uuid("invitation_id").notNull().references(() => tenantInvitations.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  usedAt: timestamp("used_at").defaultNow(),
}, (table) => ({
  invitationIdx: index("tenant_invitation_uses_invitation_idx").on(table.invitationId),
  userIdx: index("tenant_invitation_uses_user_idx").on(table.userId),
}));

// ==================== Trustalk 统一渠道模型 ====================
// 渠道 Provider 类型定义
export type TrustalkProvider = 'line' | 'whatsapp' | 'zalo' | 'telegram' | 'web' | 'other';

// Trustalk Channels table - 统一渠道抽象（所有外部 IM 渠道）
export const transtalkChannels = pgTable("transtalk_channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // 统一渠道字段
  provider: varchar("provider", { length: 32 }).notNull().default("line"), // line, whatsapp, zalo, telegram, web, other
  displayName: text("display_name").notNull(), // 对老板看的名字：OA 名 / Bot 名 / Web Widget 名
  externalId: text("external_id").notNull(), // 平台侧 ID：LINE OA ID / WhatsApp Business ID / Bot ID 等
  status: varchar("status", { length: 20 }).default("connected"), // connected, disconnected, error, pending
  config: jsonb("config"), // 平台相关配置：token、secret、webhook 等（敏感字段）
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("transtalk_channels_tenant_idx").on(table.tenantId),
  providerExternalIdx: uniqueIndex("transtalk_channels_provider_external_idx").on(table.provider, table.externalId),
  providerIdx: index("transtalk_channels_provider_idx").on(table.provider),
}));

// Trustalk LINE Channels table - LINE 特定配置（保留用于兼容）
export const transtalkLineChannels = pgTable("transtalk_line_channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // 老板看的名字：如"宝宝龙主号"
  channelId: text("channel_id").notNull(), // LINE 控制台的 Channel ID
  channelSecret: text("channel_secret").notNull(), // Channel Secret
  accessToken: text("access_token").notNull(), // Channel Access Token
  botUserId: text("bot_user_id"), // 通过 Profile API 获取的 Bot User ID
  basicId: text("basic_id"), // LINE OA 的 Basic ID（@开头，如 @abc123，用于生成加好友二维码）
  pictureUrl: text("picture_url"), // OA 头像 URL（从 LINE Bot Info API 获取）
  status: varchar("status", { length: 20 }).default("connected"), // connected, error, disabled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("transtalk_line_channels_tenant_idx").on(table.tenantId),
  channelIdIdx: uniqueIndex("transtalk_line_channels_channel_id_idx").on(table.channelId),
  botUserIdx: index("transtalk_line_channels_bot_user_idx").on(table.botUserId),
}));

// Trustalk Conversations table - Trustalk 会话
export const transtalkConversations = pgTable("transtalk_conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // 🎯 IGIS: 统一身份关联
  masterId: uuid("master_id").references(() => masterUsers.id, { onDelete: "set null" }), // IGIS 主用户 ID
  
  // 🎯 统一渠道字段（新增）
  channelId: uuid("channel_id").references(() => transtalkChannels.id, { onDelete: "cascade" }), // 统一渠道 ID
  provider: varchar("provider", { length: 32 }), // line, whatsapp, zalo, telegram, web, digital_human, other
  
  // 🎯 数字人会话字段（当 provider='digital_human' 时使用）
  humanId: varchar("human_id").references(() => digitalHumans.id, { onDelete: "cascade" }), // 数字人 ID
  
  // LINE 兼容字段（保留）
  lineChannelId: uuid("line_channel_id").references(() => transtalkLineChannels.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).default("direct"), // direct, group
  lineSourceType: varchar("line_source_type", { length: 20 }), // user, group
  lineUserId: text("line_user_id"), // 私聊时的 LINE User ID
  lineGroupId: text("line_group_id"), // 群聊时的 LINE Group ID
  displayName: text("display_name"), // 会话名称（用户昵称/群名/自定义备注）
  customerAvatarUrl: text("customer_avatar_url"), // 客户头像
  customerLanguage: varchar("customer_language", { length: 10 }), // 客户在 LINE App 设置的语言，如 'th', 'en', 'ja'
  lastMessagePreview: text("last_message_preview"), // 最后一条消息预览
  lastMessageAt: timestamp("last_message_at"), // 最后消息时间
  unreadCount: integer("unread_count").default(0), // 未读消息数
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("transtalk_conversations_tenant_idx").on(table.tenantId),
  masterIdx: index("transtalk_conversations_master_idx").on(table.masterId), // IGIS 索引
  channelIdx: index("transtalk_conversations_channel_idx").on(table.channelId),
  providerIdx: index("transtalk_conversations_provider_idx").on(table.provider),
  lineChannelIdx: index("transtalk_conversations_line_channel_idx").on(table.lineChannelId),
  lineUserIdx: index("transtalk_conversations_line_user_idx").on(table.lineUserId),
  lineGroupIdx: index("transtalk_conversations_line_group_idx").on(table.lineGroupId),
  lastMessageIdx: index("transtalk_conversations_last_message_idx").on(table.tenantId, desc(table.lastMessageAt)),
}));

// Trustalk Messages table - Trustalk 消息
export const transtalkMessages = pgTable("transtalk_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").notNull().references(() => transtalkConversations.id, { onDelete: "cascade" }),
  
  // 🔗 IGIS v1.0: 统一身份字段
  masterId: uuid("master_id").references(() => masterUsers.id, { onDelete: "set null" }), // 发送者的统一身份 ID
  sourceUserId: varchar("source_user_id"), // 原始渠道用户 ID (如 LINE UID)
  
  // 🎯 统一渠道字段
  channelId: uuid("channel_id").references(() => transtalkChannels.id, { onDelete: "cascade" }), // 统一渠道 ID
  provider: varchar("provider", { length: 32 }), // line, whatsapp, zalo, telegram, web, other
  
  direction: varchar("direction", { length: 10 }).notNull(), // in, out
  fromLineUserId: text("from_line_user_id"), // 发送者 LINE User ID（in消息用）- 保留兼容
  fromDisplayName: text("from_display_name"), // 发送者显示名
  textOriginal: text("text_original"), // 原文
  langOriginal: varchar("lang_original", { length: 10 }), // 原文语言
  textTranslated: text("text_translated"), // 翻译后文本（给老板看）
  langTranslated: varchar("lang_translated", { length: 10 }).default("zh-CN"), // 翻译目标语言
  messageType: varchar("message_type", { length: 20 }).default("text"), // text, image, sticker, audio, video
  mediaUrl: text("media_url"), // 媒体文件URL
  mediaDuration: integer("media_duration"), // 语音/视频时长（秒）
  ttsAudioUrl: text("tts_audio_url"), // 入站语音消息的翻译TTS音频URL
  lineMessageId: text("line_message_id"), // LINE 消息ID（用于追踪）
  status: varchar("status", { length: 20 }).default("ok"), // ok, failed, pending
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("transtalk_messages_tenant_idx").on(table.tenantId),
  conversationIdx: index("transtalk_messages_conversation_idx").on(table.conversationId),
  channelIdx: index("transtalk_messages_channel_idx").on(table.channelId),
  providerIdx: index("transtalk_messages_provider_idx").on(table.provider),
  conversationTimeIdx: index("transtalk_messages_conversation_time_idx").on(table.conversationId, desc(table.createdAt)),
  tenantConversationTimeIdx: index("transtalk_messages_tenant_conv_time_idx").on(table.tenantId, table.conversationId, desc(table.createdAt)),
  // 🔗 IGIS v1.0: 统一身份索引
  masterIdIdx: index("transtalk_messages_master_id_idx").on(table.masterId),
}));

// ==================== Trustalk Contacts (IGIS v1.0 联系人) ====================
// 基于 master_id 的统一联系人系统

export const transtalkContacts = pgTable("transtalk_contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  
  // 🔗 IGIS v1.0: 核心关联字段
  masterId: uuid("master_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  
  // 📋 联系人信息（企业自定义）
  customName: text("custom_name"), // 企业自定义备注名
  customTags: text("custom_tags").array(), // 标签数组: ['VIP', '重点客户', '潜在客户']
  notes: text("notes"), // 备注
  
  // 📊 统计信息
  messageCount: integer("message_count").default(0), // 总消息数
  lastContactAt: timestamp("last_contact_at"), // 最后联系时间
  firstContactAt: timestamp("first_contact_at"), // 首次联系时间
  
  // 🎯 状态
  isStarred: boolean("is_starred").default(false), // 星标客户
  isBlocked: boolean("is_blocked").default(false), // 已屏蔽
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("transtalk_contacts_tenant_idx").on(table.tenantId),
  masterIdx: index("transtalk_contacts_master_idx").on(table.masterId),
  tenantMasterUniqueIdx: uniqueIndex("transtalk_contacts_tenant_master_unique").on(table.tenantId, table.masterId),
  lastContactIdx: index("transtalk_contacts_last_contact_idx").on(table.tenantId, desc(table.lastContactAt)),
}));

export const insertTrustalkContactSchema = createInsertSchema(transtalkContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TrustalkContact = typeof transtalkContacts.$inferSelect;
export type InsertTrustalkContact = z.infer<typeof insertTrustalkContactSchema>;

// ==================== Trustalk Relations ====================

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  owner: one(users, {
    fields: [tenants.ownerUserId],
    references: [users.id],
  }),
  members: many(tenantUsers),
  channels: many(transtalkChannels),
  lineChannels: many(transtalkLineChannels),
  conversations: many(transtalkConversations),
  contacts: many(transtalkContacts),
}));

export const transtalkChannelsRelations = relations(transtalkChannels, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [transtalkChannels.tenantId],
    references: [tenants.id],
  }),
  conversations: many(transtalkConversations),
  messages: many(transtalkMessages),
}));

export const tenantUsersRelations = relations(tenantUsers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantUsers.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [tenantUsers.userId],
    references: [users.id],
  }),
}));

export const transtalkLineChannelsRelations = relations(transtalkLineChannels, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [transtalkLineChannels.tenantId],
    references: [tenants.id],
  }),
  conversations: many(transtalkConversations),
}));

export const transtalkConversationsRelations = relations(transtalkConversations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [transtalkConversations.tenantId],
    references: [tenants.id],
  }),
  channel: one(transtalkChannels, {
    fields: [transtalkConversations.channelId],
    references: [transtalkChannels.id],
  }),
  lineChannel: one(transtalkLineChannels, {
    fields: [transtalkConversations.lineChannelId],
    references: [transtalkLineChannels.id],
  }),
  messages: many(transtalkMessages),
}));

export const transtalkMessagesRelations = relations(transtalkMessages, ({ one }) => ({
  tenant: one(tenants, {
    fields: [transtalkMessages.tenantId],
    references: [tenants.id],
  }),
  conversation: one(transtalkConversations, {
    fields: [transtalkMessages.conversationId],
    references: [transtalkConversations.id],
  }),
  channel: one(transtalkChannels, {
    fields: [transtalkMessages.channelId],
    references: [transtalkChannels.id],
  }),
}));

export const transtalkContactsRelations = relations(transtalkContacts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [transtalkContacts.tenantId],
    references: [tenants.id],
  }),
  masterUser: one(masterUsers, {
    fields: [transtalkContacts.masterId],
    references: [masterUsers.id],
  }),
}));

// ==================== Trustalk Insert Schemas ====================

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantUserSchema = createInsertSchema(tenantUsers).omit({
  id: true,
  createdAt: true,
});

export const insertTrustalkChannelSchema = createInsertSchema(transtalkChannels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrustalkLineChannelSchema = createInsertSchema(transtalkLineChannels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrustalkConversationSchema = createInsertSchema(transtalkConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrustalkMessageSchema = createInsertSchema(transtalkMessages).omit({
  id: true,
  createdAt: true,
});

// ==================== Trustalk Types ====================

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type TenantUser = typeof tenantUsers.$inferSelect;
export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;

export type TrustalkChannel = typeof transtalkChannels.$inferSelect;
export type InsertTrustalkChannel = z.infer<typeof insertTrustalkChannelSchema>;

export type TrustalkLineChannel = typeof transtalkLineChannels.$inferSelect;
export type InsertTrustalkLineChannel = z.infer<typeof insertTrustalkLineChannelSchema>;

export type TrustalkConversation = typeof transtalkConversations.$inferSelect;
export type InsertTrustalkConversation = z.infer<typeof insertTrustalkConversationSchema>;

export type TrustalkMessage = typeof transtalkMessages.$inferSelect;
export type InsertTrustalkMessage = z.infer<typeof insertTrustalkMessageSchema>;

// ==================== TT User Relationships (平台级关注关系) ====================

export const ttUserRelationships = pgTable("tt_user_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  fromUserId: varchar("from_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  toUserId: varchar("to_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  relationType: text("relation_type")
    .notNull()
    .$type<"follow" | "block">()
    .default("follow"),
  
  status: text("status")
    .notNull()
    .$type<"active" | "deleted">()
    .default("active"),
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("tt_user_relationships_unique_follow")
    .on(table.fromUserId, table.toUserId, table.relationType),
  index("tt_user_relationships_from_idx")
    .on(table.fromUserId),
  index("tt_user_relationships_to_idx")
    .on(table.toUserId),
]);

export const ttUserRelationshipsRelations = relations(ttUserRelationships, ({ one }) => ({
  fromUser: one(users, {
    fields: [ttUserRelationships.fromUserId],
    references: [users.id],
    relationName: "fromUserRelations",
  }),
  toUser: one(users, {
    fields: [ttUserRelationships.toUserId],
    references: [users.id],
    relationName: "toUserRelations",
  }),
}));

export const insertTtUserRelationshipSchema = createInsertSchema(ttUserRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TtUserRelationship = typeof ttUserRelationships.$inferSelect;
export type InsertTtUserRelationship = z.infer<typeof insertTtUserRelationshipSchema>;

// ==================== 用户语音偏好 (Voice Profiles) ====================
// 语音角色设置 - 适用于语音消息翻译和语音电话翻译

export const userVoiceProfiles = pgTable("user_voice_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // 我听别人时的音色偏好 - 系统用什么声音给我播放别人的译音
  remoteVoiceForMe: varchar("remote_voice_for_me", { length: 50 }).default("default"),
  // 选项: default, neutral, male, female, male_deep, female_sweet, 或具体 voice_id
  
  // 别人听我时的音色 - 我的语音形象，别人听到我的翻译语音时用的声音
  myDefaultVoiceForOthers: varchar("my_default_voice_for_others", { length: 50 }).default("default"),
  // 选项: default, neutral, male, female, male_deep, female_sweet, 或具体 voice_id
  
  // 通话后是否自动生成双语记录
  autoCallTranscript: boolean("auto_call_transcript").default(false),
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userVoiceProfilesRelations = relations(userVoiceProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userVoiceProfiles.userId],
    references: [users.id],
  }),
}));

export const insertUserVoiceProfileSchema = createInsertSchema(userVoiceProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserVoiceProfile = typeof userVoiceProfiles.$inferSelect;
export type InsertUserVoiceProfile = z.infer<typeof insertUserVoiceProfileSchema>;

// ==================== 翻译语音电话 (Call Translation) ====================

// 通话会话表
export const callSessions = pgTable("call_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 可选绑定到工作空间（Trustalk B端）
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  
  // 通话双方
  callerUserId: varchar("caller_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  calleeUserId: varchar("callee_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // 通话类型和状态
  callType: varchar("call_type", { length: 20 }).notNull().default("voice"), // voice, video
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, ringing, connected, ended, missed, rejected
  
  // 是否启用翻译
  translationEnabled: boolean("translation_enabled").default(true),
  
  // 时间记录
  startedAt: timestamp("started_at", { withTimezone: true }),
  connectedAt: timestamp("connected_at", { withTimezone: true }), // 接通时间
  endedAt: timestamp("ended_at", { withTimezone: true }),
  
  // 通话时长（秒）
  duration: integer("duration"),
  
  // 结束原因
  endReason: varchar("end_reason", { length: 50 }), // completed, caller_hangup, callee_hangup, timeout, error
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("call_sessions_caller_idx").on(table.callerUserId),
  index("call_sessions_callee_idx").on(table.calleeUserId),
  index("call_sessions_created_at_idx").on(table.createdAt),
]);

// 通话端（每个参与者的状态）
export const callLegs = pgTable("call_legs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  callSessionId: varchar("call_session_id")
    .notNull()
    .references(() => callSessions.id, { onDelete: "cascade" }),
  
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  role: varchar("role", { length: 20 }).notNull(), // caller, callee
  
  // 语言偏好快照（通话时的设置）
  preferredLang: varchar("preferred_lang", { length: 10 }).notNull().default("zh"),
  
  // 音色偏好快照
  remoteVoiceForMe: varchar("remote_voice_for_me", { length: 50 }).default("default"),
  myVoiceForOther: varchar("my_voice_for_other", { length: 50 }).default("default"),
  
  // 连接状态
  connectionState: varchar("connection_state", { length: 20 }).default("connecting"),
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("call_legs_session_idx").on(table.callSessionId),
  index("call_legs_user_idx").on(table.userId),
]);

// 通话语音片段记录（用于生成通话记录）
export const callUtterances = pgTable("call_utterances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  callSessionId: varchar("call_session_id")
    .notNull()
    .references(() => callSessions.id, { onDelete: "cascade" }),
  
  // 说话方
  speakerUserId: varchar("speaker_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  speakerRole: varchar("speaker_role", { length: 20 }).notNull(), // caller, callee
  
  // 序号（用于排序）
  sequence: integer("sequence").notNull(),
  
  // 时间
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  
  // 语言
  sourceLang: varchar("source_lang", { length: 10 }), // STT 检测的源语言
  targetLang: varchar("target_lang", { length: 10 }), // 翻译目标语言
  
  // 内容
  originalText: text("original_text"), // STT 识别的原文
  translatedText: text("translated_text"), // 翻译后的文本
  
  // 音频URL（可选，用于归档）
  originalAudioUrl: text("original_audio_url"),
  translatedAudioUrl: text("translated_audio_url"),
  
  // 延迟统计（毫秒）
  sttLatencyMs: integer("stt_latency_ms"),
  mtLatencyMs: integer("mt_latency_ms"),
  ttsLatencyMs: integer("tts_latency_ms"),
  totalLatencyMs: integer("total_latency_ms"),
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("call_utterances_session_idx").on(table.callSessionId),
  index("call_utterances_session_sequence_idx").on(table.callSessionId, table.sequence),
]);

// 通话记录文件（双语记录）
export const callTranscripts = pgTable("call_transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  callSessionId: varchar("call_session_id")
    .notNull()
    .references(() => callSessions.id, { onDelete: "cascade" }),
  
  // 请求生成的用户
  requestedByUserId: varchar("requested_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // 文件信息
  format: varchar("format", { length: 20 }).notNull().default("pdf"), // pdf, markdown, docx
  fileUrl: text("file_url"),
  fileName: varchar("file_name", { length: 255 }),
  
  // 状态
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, generating, completed, failed
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("call_transcripts_session_idx").on(table.callSessionId),
]);

// Relations
export const callSessionsRelations = relations(callSessions, ({ one, many }) => ({
  caller: one(users, {
    fields: [callSessions.callerUserId],
    references: [users.id],
    relationName: "callerSessions",
  }),
  callee: one(users, {
    fields: [callSessions.calleeUserId],
    references: [users.id],
    relationName: "calleeSessions",
  }),
  tenant: one(tenants, {
    fields: [callSessions.tenantId],
    references: [tenants.id],
  }),
  legs: many(callLegs),
  utterances: many(callUtterances),
  transcripts: many(callTranscripts),
}));

export const callLegsRelations = relations(callLegs, ({ one }) => ({
  session: one(callSessions, {
    fields: [callLegs.callSessionId],
    references: [callSessions.id],
  }),
  user: one(users, {
    fields: [callLegs.userId],
    references: [users.id],
  }),
}));

export const callUtterancesRelations = relations(callUtterances, ({ one }) => ({
  session: one(callSessions, {
    fields: [callUtterances.callSessionId],
    references: [callSessions.id],
  }),
  speaker: one(users, {
    fields: [callUtterances.speakerUserId],
    references: [users.id],
  }),
}));

export const callTranscriptsRelations = relations(callTranscripts, ({ one }) => ({
  session: one(callSessions, {
    fields: [callTranscripts.callSessionId],
    references: [callSessions.id],
  }),
  requestedBy: one(users, {
    fields: [callTranscripts.requestedByUserId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCallSessionSchema = createInsertSchema(callSessions).omit({
  id: true,
  createdAt: true,
});

export const insertCallLegSchema = createInsertSchema(callLegs).omit({
  id: true,
  createdAt: true,
});

export const insertCallUtteranceSchema = createInsertSchema(callUtterances).omit({
  id: true,
  createdAt: true,
});

export const insertCallTranscriptSchema = createInsertSchema(callTranscripts).omit({
  id: true,
  createdAt: true,
});

// Types
export type CallSession = typeof callSessions.$inferSelect;
export type InsertCallSession = z.infer<typeof insertCallSessionSchema>;

export type CallLeg = typeof callLegs.$inferSelect;
export type InsertCallLeg = z.infer<typeof insertCallLegSchema>;

export type CallUtterance = typeof callUtterances.$inferSelect;
export type InsertCallUtterance = z.infer<typeof insertCallUtteranceSchema>;

export type CallTranscript = typeof callTranscripts.$inferSelect;
export type InsertCallTranscript = z.infer<typeof insertCallTranscriptSchema>;

// 音色选项常量
export const VOICE_OPTIONS = {
  default: { label: '默认', labelEn: 'Default' },
  neutral: { label: '中性', labelEn: 'Neutral' },
  male: { label: '男声', labelEn: 'Male' },
  female: { label: '女声', labelEn: 'Female' },
  male_deep: { label: '磁性男声', labelEn: 'Deep Male' },
  female_sweet: { label: '甜美女声', labelEn: 'Sweet Female' },
} as const;

export type VoiceOption = keyof typeof VOICE_OPTIONS;

// ============================================================================
// IGIS v1.0 - 互联网基因身份识别系统 (Internet Genome Identity System)
// 统一账号体系：master_user + 渠道子身份表
// ============================================================================

// 主用户表 - 统一身份中心
export const masterUsers = pgTable("master_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  displayName: varchar("display_name", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  source: varchar("source", { length: 30 }).notNull(), // 首次来源渠道: line, whatsapp, telegram, messenger, web, guest
  
  // 互联网基因向量（未来 IGIS v1.0 使用）
  genomeVector: jsonb("genome_vector"), // 512维向量，用于跨渠道身份识别
  
  // 用户状态
  isActive: boolean("is_active").default(true),
  lastActiveAt: timestamp("last_active_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  sourceIdx: index("master_users_source_idx").on(table.source),
  lastActiveIdx: index("master_users_last_active_idx").on(table.lastActiveAt),
}));

// LINE 子身份表
export const userLine = pgTable("user_line", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: uuid("master_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  lineUid: varchar("line_uid", { length: 100 }).notNull().unique(), // LINE 用户 ID
  lineDisplayName: varchar("line_display_name", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  language: varchar("language", { length: 10 }), // LINE 返回的语言偏好
  metadata: jsonb("metadata"), // 其他 LINE 返回的元数据
  linkedAt: timestamp("linked_at").defaultNow(),
}, (table) => ({
  masterIdIdx: index("user_line_master_id_idx").on(table.masterId),
  lineUidIdx: uniqueIndex("user_line_uid_unique_idx").on(table.lineUid),
}));

// WhatsApp 子身份表
export const userWhatsapp = pgTable("user_whatsapp", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: uuid("master_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  waPhone: varchar("wa_phone", { length: 20 }).notNull().unique(), // WhatsApp 手机号 (E.164格式)
  waName: varchar("wa_name", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  metadata: jsonb("metadata"),
  linkedAt: timestamp("linked_at").defaultNow(),
}, (table) => ({
  masterIdIdx: index("user_whatsapp_master_id_idx").on(table.masterId),
  waPhoneIdx: uniqueIndex("user_whatsapp_phone_unique_idx").on(table.waPhone),
}));

// Telegram 子身份表
export const userTelegram = pgTable("user_telegram", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: uuid("master_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  tgId: varchar("tg_id", { length: 50 }).notNull().unique(), // Telegram 用户 ID
  tgUsername: varchar("tg_username", { length: 100 }), // @username
  tgFirstName: varchar("tg_first_name", { length: 100 }),
  tgLastName: varchar("tg_last_name", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  metadata: jsonb("metadata"),
  linkedAt: timestamp("linked_at").defaultNow(),
}, (table) => ({
  masterIdIdx: index("user_telegram_master_id_idx").on(table.masterId),
  tgIdIdx: uniqueIndex("user_telegram_id_unique_idx").on(table.tgId),
}));

// Messenger 子身份表 (Facebook)
export const userMessenger = pgTable("user_messenger", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: uuid("master_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  fbPsid: varchar("fb_psid", { length: 100 }).notNull().unique(), // Facebook Page-Scoped ID
  fbName: varchar("fb_name", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  metadata: jsonb("metadata"),
  linkedAt: timestamp("linked_at").defaultNow(),
}, (table) => ({
  masterIdIdx: index("user_messenger_master_id_idx").on(table.masterId),
  fbPsidIdx: uniqueIndex("user_messenger_psid_unique_idx").on(table.fbPsid),
}));

// Web 子身份表 (浏览器指纹)
export const userWeb = pgTable("user_web", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: uuid("master_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  cookieId: varchar("cookie_id", { length: 100 }).notNull().unique(), // 浏览器 Cookie ID
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }), // 设备指纹
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  linkedAt: timestamp("linked_at").defaultNow(),
}, (table) => ({
  masterIdIdx: index("user_web_master_id_idx").on(table.masterId),
  cookieIdIdx: uniqueIndex("user_web_cookie_unique_idx").on(table.cookieId),
}));

// Guest 子身份表 (访客用户)
export const userGuest = pgTable("user_guest", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  masterId: uuid("master_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  guestId: varchar("guest_id", { length: 50 }).notNull().unique(), // 访客 ID (nanoid生成)
  deviceInfo: jsonb("device_info"), // 设备信息
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  masterIdIdx: index("user_guest_master_id_idx").on(table.masterId),
  guestIdIdx: uniqueIndex("user_guest_id_unique_idx").on(table.guestId),
}));

// ============================================================================
// IGIS Relations - 表关系定义
// ============================================================================

export const masterUsersRelations = relations(masterUsers, ({ many }) => ({
  lineIdentities: many(userLine),
  whatsappIdentities: many(userWhatsapp),
  telegramIdentities: many(userTelegram),
  messengerIdentities: many(userMessenger),
  webIdentities: many(userWeb),
  guestIdentities: many(userGuest),
}));

export const userLineRelations = relations(userLine, ({ one }) => ({
  master: one(masterUsers, {
    fields: [userLine.masterId],
    references: [masterUsers.id],
  }),
}));

export const userWhatsappRelations = relations(userWhatsapp, ({ one }) => ({
  master: one(masterUsers, {
    fields: [userWhatsapp.masterId],
    references: [masterUsers.id],
  }),
}));

export const userTelegramRelations = relations(userTelegram, ({ one }) => ({
  master: one(masterUsers, {
    fields: [userTelegram.masterId],
    references: [masterUsers.id],
  }),
}));

export const userMessengerRelations = relations(userMessenger, ({ one }) => ({
  master: one(masterUsers, {
    fields: [userMessenger.masterId],
    references: [masterUsers.id],
  }),
}));

export const userWebRelations = relations(userWeb, ({ one }) => ({
  master: one(masterUsers, {
    fields: [userWeb.masterId],
    references: [masterUsers.id],
  }),
}));

export const userGuestRelations = relations(userGuest, ({ one }) => ({
  master: one(masterUsers, {
    fields: [userGuest.masterId],
    references: [masterUsers.id],
  }),
}));

// ============================================================================
// IGIS Insert Schemas
// ============================================================================

export const insertMasterUserSchema = createInsertSchema(masterUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserLineSchema = createInsertSchema(userLine).omit({
  id: true,
  linkedAt: true,
});

export const insertUserWhatsappSchema = createInsertSchema(userWhatsapp).omit({
  id: true,
  linkedAt: true,
});

export const insertUserTelegramSchema = createInsertSchema(userTelegram).omit({
  id: true,
  linkedAt: true,
});

export const insertUserMessengerSchema = createInsertSchema(userMessenger).omit({
  id: true,
  linkedAt: true,
});

export const insertUserWebSchema = createInsertSchema(userWeb).omit({
  id: true,
  linkedAt: true,
});

export const insertUserGuestSchema = createInsertSchema(userGuest).omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// IGIS Types
// ============================================================================

export type MasterUser = typeof masterUsers.$inferSelect;
export type InsertMasterUser = z.infer<typeof insertMasterUserSchema>;

export type UserLine = typeof userLine.$inferSelect;
export type InsertUserLine = z.infer<typeof insertUserLineSchema>;

export type UserWhatsapp = typeof userWhatsapp.$inferSelect;
export type InsertUserWhatsapp = z.infer<typeof insertUserWhatsappSchema>;

export type UserTelegram = typeof userTelegram.$inferSelect;
export type InsertUserTelegram = z.infer<typeof insertUserTelegramSchema>;

export type UserMessenger = typeof userMessenger.$inferSelect;
export type InsertUserMessenger = z.infer<typeof insertUserMessengerSchema>;

export type UserWeb = typeof userWeb.$inferSelect;
export type InsertUserWeb = z.infer<typeof insertUserWebSchema>;

export type UserGuest = typeof userGuest.$inferSelect;
export type InsertUserGuest = z.infer<typeof insertUserGuestSchema>;

// 渠道来源类型
export type IdentitySource = 'line' | 'whatsapp' | 'telegram' | 'messenger' | 'web' | 'guest';

// ============================================================================
// 智能通讯录雷达系统 (Phase 4) - Trustalk Contacts
// ============================================================================

// 手机号哈希注册表 - 用于跨渠道手机号匹配
export const igisPhoneHashRegistry = pgTable("igis_phone_hash_registry", {
  id: serial("id").primaryKey(),
  hashSha256: varchar("hash_sha256", { length: 64 }).notNull(), // SHA256 哈希值
  channel: varchar("channel", { length: 32 }).notNull(), // line, whatsapp, telegram, trustalk
  masterUserId: uuid("master_user_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  hashChannelUniqueIdx: uniqueIndex("igis_phone_hash_registry_hash_channel_unique").on(table.hashSha256, table.channel),
  hashIdx: index("igis_phone_hash_registry_hash_idx").on(table.hashSha256),
  masterIdx: index("igis_phone_hash_registry_master_idx").on(table.masterUserId),
}));

// TT联系人主表 - 基于 master_id 的统一联系人
export const ttContacts = pgTable("tt_contacts", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  masterUserId: uuid("master_user_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 128 }).notNull(),
  avatarUrl: text("avatar_url"),
  remarkName: varchar("remark_name", { length: 128 }), // 企业自定义备注名
  tags: text("tags").array(), // 标签数组
  firstSeenAt: timestamp("first_seen_at"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantMasterUniqueIdx: uniqueIndex("tt_contacts_tenant_master_unique").on(table.tenantId, table.masterUserId),
  tenantIdx: index("tt_contacts_tenant_idx").on(table.tenantId),
  masterIdx: index("tt_contacts_master_idx").on(table.masterUserId),
}));

// TT联系人渠道表 - 记录联系人在各渠道的身份
export const ttContactChannels = pgTable("tt_contact_channels", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  masterUserId: uuid("master_user_id").notNull().references(() => masterUsers.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 32 }).notNull(), // line, whatsapp, telegram, trustalk, system
  channelUserId: text("channel_user_id"), // 渠道内的用户ID
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tenantMasterChannelUniqueIdx: uniqueIndex("tt_contact_channels_tenant_master_channel_unique").on(table.tenantId, table.masterUserId, table.channel),
  tenantMasterIdx: index("tt_contact_channels_tenant_master_idx").on(table.tenantId, table.masterUserId),
  channelIdx: index("tt_contact_channels_channel_idx").on(table.channel),
}));

// TT邀请记录表 - 记录邀请状态
export const ttContactInvites = pgTable("tt_contact_invites", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  masterUserId: uuid("master_user_id").references(() => masterUsers.id, { onDelete: "set null" }),
  localContactId: integer("local_contact_id"), // 本地通讯录联系人ID
  channel: varchar("channel", { length: 32 }).notNull(), // line, whatsapp, wechat, link
  inviteType: varchar("invite_type", { length: 32 }).notNull(), // trustalk_follow, oa_subscribe, app_join
  status: varchar("status", { length: 32 }).default("pending").notNull(), // pending, sent, clicked, converted, expired
  inviteToken: varchar("invite_token", { length: 64 }),
  createdByUser: varchar("created_by_user").references(() => users.id, { onDelete: "set null" }), // users.id 是 varchar
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("tt_contact_invites_tenant_idx").on(table.tenantId),
  tokenIdx: index("tt_contact_invites_token_idx").on(table.inviteToken),
}));

// ============================================================================
// Phase 4 Insert Schemas
// ============================================================================

export const insertIgisPhoneHashRegistrySchema = createInsertSchema(igisPhoneHashRegistry).omit({
  id: true,
  createdAt: true,
});

export const insertTtContactSchema = createInsertSchema(ttContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTtContactChannelSchema = createInsertSchema(ttContactChannels).omit({
  id: true,
  createdAt: true,
});

export const insertTtContactInviteSchema = createInsertSchema(ttContactInvites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// Phase 4 Types
// ============================================================================

export type IgisPhoneHashRegistry = typeof igisPhoneHashRegistry.$inferSelect;
export type InsertIgisPhoneHashRegistry = z.infer<typeof insertIgisPhoneHashRegistrySchema>;

export type TtContact = typeof ttContacts.$inferSelect;
export type InsertTtContact = z.infer<typeof insertTtContactSchema>;

export type TtContactChannel = typeof ttContactChannels.$inferSelect;
export type InsertTtContactChannel = z.infer<typeof insertTtContactChannelSchema>;

export type TtContactInvite = typeof ttContactInvites.$inferSelect;
export type InsertTtContactInvite = z.infer<typeof insertTtContactInviteSchema>;

// ============================================================================
// Phase 5: Enterprise Messaging Infrastructure (企业级消息基础架构)
// ============================================================================

// 消息状态枚举 - 完整生命周期
export const MessageStatus = {
  PENDING: 'pending',       // 待处理
  QUEUED: 'queued',         // 已入队列
  SENDING: 'sending',       // 发送中
  SENT: 'sent',             // 已发送到平台
  DELIVERED: 'delivered',   // 已送达用户
  READ: 'read',             // 已读
  FAILED: 'failed',         // 发送失败
  EXPIRED: 'expired',       // 已过期
} as const;

export type MessageStatusType = typeof MessageStatus[keyof typeof MessageStatus];

// 消息作业类型
export const JobType = {
  SEND_TEXT: 'send_text',
  SEND_MEDIA: 'send_media',
  SEND_LOCATION: 'send_location',
  SEND_TEMPLATE: 'send_template',
  TRANSLATE: 'translate',
  TRANSCRIBE: 'transcribe',
  PROCESS_MEDIA: 'process_media',
} as const;

export type JobTypeValue = typeof JobType[keyof typeof JobType];

// 渠道提供商枚举
export const ChannelProvider = {
  LINE: 'line',
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  MESSENGER: 'messenger',
  WEB: 'web',
  TRUSTALK: 'trustalk',
} as const;

export type ChannelProviderType = typeof ChannelProvider[keyof typeof ChannelProvider];

// ==================== 消息生命周期表 ====================
// 追踪每条消息的完整状态变化历史

export const ttMessageLifecycle = pgTable("tt_message_lifecycle", {
  id: serial("id").primaryKey(),
  
  // 消息关联 - 支持两种消息系统
  trustalkMessageId: uuid("trustalk_message_id").references(() => transtalkMessages.id, { onDelete: "cascade" }),
  worldtalkMessageId: uuid("worldtalk_message_id").references(() => messages.id, { onDelete: "cascade" }),
  
  // 外部平台消息ID
  externalMessageId: text("external_message_id"), // LINE/WhatsApp 返回的消息ID
  
  // 状态信息
  status: varchar("status", { length: 32 }).notNull(), // pending, queued, sending, sent, delivered, read, failed
  previousStatus: varchar("previous_status", { length: 32 }),
  
  // 时间戳
  statusChangedAt: timestamp("status_changed_at").defaultNow().notNull(),
  
  // 元数据
  metadata: jsonb("metadata"), // { error?: string, retryCount?: number, deliveredTo?: string, readBy?: string }
  
  // 渠道信息
  provider: varchar("provider", { length: 32 }), // line, whatsapp, telegram, web
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  trustalkMsgIdx: index("tt_msg_lifecycle_trustalk_msg_idx").on(table.trustalkMessageId),
  worldtalkMsgIdx: index("tt_msg_lifecycle_worldtalk_msg_idx").on(table.worldtalkMessageId),
  externalMsgIdx: index("tt_msg_lifecycle_external_msg_idx").on(table.externalMessageId),
  statusIdx: index("tt_msg_lifecycle_status_idx").on(table.status),
  statusChangedAtIdx: index("tt_msg_lifecycle_status_changed_at_idx").on(table.statusChangedAt),
}));

// ==================== 消息作业队列表 ====================
// 用于持久化消息发送任务，配合 pg-boss 使用

export const ttMessageJobs = pgTable("tt_message_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 作业类型
  jobType: varchar("job_type", { length: 32 }).notNull(), // send_text, send_media, translate, etc.
  
  // 消息关联
  trustalkMessageId: uuid("trustalk_message_id").references(() => transtalkMessages.id, { onDelete: "cascade" }),
  worldtalkMessageId: uuid("worldtalk_message_id").references(() => messages.id, { onDelete: "cascade" }),
  
  // 租户和渠道
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  channelId: uuid("channel_id").references(() => transtalkChannels.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 32 }).notNull(), // line, whatsapp, telegram, web
  
  // 作业状态
  status: varchar("status", { length: 32 }).default("pending").notNull(), // pending, processing, completed, failed, dead
  
  // 作业载荷
  payload: jsonb("payload").notNull(), // 发送内容、目标用户等
  
  // 重试信息
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  lastError: text("last_error"),
  
  // 优先级 (1=最高, 10=最低)
  priority: integer("priority").default(5).notNull(),
  
  // 调度时间
  scheduledAt: timestamp("scheduled_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // pg-boss 作业ID (用于关联)
  pgBossJobId: text("pg_boss_job_id"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("tt_msg_jobs_status_idx").on(table.status),
  tenantIdx: index("tt_msg_jobs_tenant_idx").on(table.tenantId),
  providerIdx: index("tt_msg_jobs_provider_idx").on(table.provider),
  priorityScheduledIdx: index("tt_msg_jobs_priority_scheduled_idx").on(table.priority, table.scheduledAt),
  trustalkMsgIdx: index("tt_msg_jobs_trustalk_msg_idx").on(table.trustalkMessageId),
  pgBossJobIdx: index("tt_msg_jobs_pg_boss_job_idx").on(table.pgBossJobId),
}));

// ==================== 媒体资产表 ====================
// 统一管理所有渠道的媒体文件

export const ttMediaAssets = pgTable("tt_media_assets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 消息关联
  trustalkMessageId: uuid("trustalk_message_id").references(() => transtalkMessages.id, { onDelete: "set null" }),
  worldtalkMessageId: uuid("worldtalk_message_id").references(() => messages.id, { onDelete: "set null" }),
  
  // 租户
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  
  // 媒体类型
  mediaType: varchar("media_type", { length: 32 }).notNull(), // image, video, audio, file, sticker
  mimeType: varchar("mime_type", { length: 128 }), // image/jpeg, video/mp4, etc.
  
  // 来源信息
  sourceProvider: varchar("source_provider", { length: 32 }), // line, whatsapp, telegram, web, upload
  sourceUrl: text("source_url"), // 原始URL (临时)
  sourceMessageId: text("source_message_id"), // 平台消息ID
  
  // OSS 存储信息
  ossKey: text("oss_key"), // OSS 对象键
  ossBucket: varchar("oss_bucket", { length: 128 }),
  ossRegion: varchar("oss_region", { length: 64 }),
  
  // 签名URL (带过期时间)
  signedUrl: text("signed_url"),
  signedUrlExpiresAt: timestamp("signed_url_expires_at"),
  
  // 缩略图 (图片/视频)
  thumbnailOssKey: text("thumbnail_oss_key"),
  thumbnailSignedUrl: text("thumbnail_signed_url"),
  
  // 文件信息
  fileName: varchar("file_name", { length: 256 }),
  fileSize: integer("file_size"), // 字节
  width: integer("width"), // 图片/视频宽度
  height: integer("height"), // 图片/视频高度
  duration: integer("duration"), // 音频/视频时长(秒)
  
  // 处理状态
  processingStatus: varchar("processing_status", { length: 32 }).default("pending").notNull(), // pending, downloading, processing, completed, failed
  processingError: text("processing_error"),
  
  // 转录信息 (语音)
  transcriptText: text("transcript_text"),
  transcriptLang: varchar("transcript_lang", { length: 10 }),
  
  // 安全扫描
  scanStatus: varchar("scan_status", { length: 32 }), // pending, clean, infected, error
  scanResult: jsonb("scan_result"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  trustalkMsgIdx: index("tt_media_assets_trustalk_msg_idx").on(table.trustalkMessageId),
  worldtalkMsgIdx: index("tt_media_assets_worldtalk_msg_idx").on(table.worldtalkMessageId),
  tenantIdx: index("tt_media_assets_tenant_idx").on(table.tenantId),
  mediaTypeIdx: index("tt_media_assets_media_type_idx").on(table.mediaType),
  processingStatusIdx: index("tt_media_assets_processing_status_idx").on(table.processingStatus),
  ossKeyIdx: index("tt_media_assets_oss_key_idx").on(table.ossKey),
}));

// ==================== 实时事件追踪表 ====================
// 记录 Socket.IO 事件分发状态

export const ttRealtimeEvents = pgTable("tt_realtime_events", {
  id: serial("id").primaryKey(),
  
  // 事件信息
  eventType: varchar("event_type", { length: 64 }).notNull(), // message:new, message:status, typing, etc.
  eventData: jsonb("event_data").notNull(),
  
  // 目标用户
  targetUserId: varchar("target_user_id").references(() => users.id, { onDelete: "cascade" }),
  targetTenantId: uuid("target_tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  
  // 分发状态
  status: varchar("status", { length: 32 }).default("pending").notNull(), // pending, delivered, failed
  deliveredAt: timestamp("delivered_at"),
  
  // 重试信息
  retryCount: integer("retry_count").default(0).notNull(),
  lastError: text("last_error"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // 过期后自动清理
}, (table) => ({
  targetUserIdx: index("tt_realtime_events_target_user_idx").on(table.targetUserId),
  targetTenantIdx: index("tt_realtime_events_target_tenant_idx").on(table.targetTenantId),
  statusIdx: index("tt_realtime_events_status_idx").on(table.status),
  createdAtIdx: index("tt_realtime_events_created_at_idx").on(table.createdAt),
}));

// ============================================================================
// Phase 5 Insert Schemas
// ============================================================================

export const insertTtMessageLifecycleSchema = createInsertSchema(ttMessageLifecycle).omit({
  id: true,
  createdAt: true,
});

export const insertTtMessageJobSchema = createInsertSchema(ttMessageJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTtMediaAssetSchema = createInsertSchema(ttMediaAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTtRealtimeEventSchema = createInsertSchema(ttRealtimeEvents).omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// Phase 5 Types
// ============================================================================

export type TtMessageLifecycle = typeof ttMessageLifecycle.$inferSelect;
export type InsertTtMessageLifecycle = z.infer<typeof insertTtMessageLifecycleSchema>;

export type TtMessageJob = typeof ttMessageJobs.$inferSelect;
export type InsertTtMessageJob = z.infer<typeof insertTtMessageJobSchema>;

export type TtMediaAsset = typeof ttMediaAssets.$inferSelect;
export type InsertTtMediaAsset = z.infer<typeof insertTtMediaAssetSchema>;

export type TtRealtimeEvent = typeof ttRealtimeEvents.$inferSelect;
export type InsertTtRealtimeEvent = z.infer<typeof insertTtRealtimeEventSchema>;
