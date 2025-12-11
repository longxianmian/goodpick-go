import {
  users,
  friends,
  groups,
  groupMembers,
  messages,
  translations,
  orgs,
  orgMembers,
  usernameChanges,
  userDhCustomizations,
  type User,
  type InsertUser,
  type UpsertUser,
  type Friend,
  type InsertFriend,
  type Group,
  type InsertGroup,
  type GroupMember,
  type InsertGroupMember,
  type Message,
  type InsertMessage,
  type Translation,
  type InsertTranslation,
  type Org,
  type OrgMember,
  type UsernameChange,
  type InsertUsernameChange,
  type UserVoiceProfile,
  type InsertUserVoiceProfile,
  userVoiceProfiles,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, like, ilike, ne, lt, inArray, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByLineId(lineUserId: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers?(): Promise<User[]>; // Debug only
  searchUsers(query: string, currentUserId: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  createOrUpdateLineUser(lineUserId: string, profile: any): Promise<User>;
  
  // Username management
  getUsernameChangeCountThisYear(userId: string): Promise<number>;
  updateUsername(userId: string, newUsername: string): Promise<User>;
  
  // Organization operations
  getUserOrganizations(userId: string): Promise<Array<OrgMember & { org: Org }>>;

  // Friend operations
  getFriendsList(userId: string): Promise<Array<User & { lastMessage?: Message; unreadCount: number }>>;
  getFriendRequests(userId: string): Promise<Array<User & { requestId: string; requestDate: Date }>>;
  // 🔔 统一获取聊天列表（包含accepted好友 + incoming pending请求）
  getContactsForChatList(userId: string): Promise<Array<User & { 
    lastMessage?: Message; 
    unreadCount: number;
    friendshipStatus?: 'pending' | 'accepted' | 'blocked';
    isIncomingRequest?: boolean;
    requestedAt?: Date;
    requestId?: string;
    channel?: string;
    customName?: string;
    customAvatarUrl?: string;
  }>>;
  addFriend(userId: string, friendId: string): Promise<Friend>;
  acceptFriend(userId: string, friendId: string): Promise<void>;
  declineFriend(userId: string, friendId: string): Promise<void>;
  getFriendship(userId: string, friendId: string): Promise<Friend | undefined>;

  // Group operations
  getGroupsList(userId: string): Promise<Array<Group & { lastMessage?: Message; unreadCount: number }>>;
  createGroup(group: InsertGroup): Promise<Group>;
  addGroupMember(groupId: string, userId: string, role?: string): Promise<GroupMember>;
  getGroupMembers(groupId: string): Promise<Array<User>>;
  getGroupMembersWithRoles(groupId: string): Promise<Array<GroupMember & { user: User }>>;
  getGroupMember(groupId: string, userId: string): Promise<GroupMember | undefined>;
  getGroup(groupId: string): Promise<Group | undefined>;

  // Message operations
  getMessage(messageId: string): Promise<(Message & { fromUser: User }) | undefined>;
  getMessages(userId: string, targetId: string, isGroup: boolean, pagination?: { page: number; limit: number; before?: string }): Promise<{
    messages: Array<Message & { fromUser: User; translations?: Translation[] }>;
    hasMore: boolean;
    nextCursor?: string;
  }>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: string): Promise<void>;
  updateMessageVoiceProcessing(messageId: string, data: {
    transcript?: string;
    translatedTranscript?: string;
    ttsAudioUrl?: string;
    processingStatus?: string;
  }): Promise<void>;

  // Translation operations
  getTranslation(messageId: string, targetLanguage: string, messageType?: string): Promise<Translation | undefined>;
  getTranslationsBatch(messageIds: string[], targetLanguages: string[]): Promise<Translation[]>;
  saveTranslation(translation: InsertTranslation): Promise<Translation>;
  updateMessageTranslation(messageId: string, targetLanguage: string, translatedText: string): Promise<Message | undefined>;
  
  // Helper: Get the most recent message language from the other person in a conversation
  getLastMessageLanguage(userId: string, partnerId: string): Promise<string | undefined>;
  getLastMessageLanguageInGroup(groupId: string, memberId: string): Promise<string | undefined>;
  
  // Voice profile operations (用户语音偏好)
  getUserVoiceProfile(userId: string): Promise<UserVoiceProfile | undefined>;
  upsertUserVoiceProfile(data: InsertUserVoiceProfile): Promise<UserVoiceProfile>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByLineId(lineUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.lineUserId, lineUserId));
    return user;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).limit(100);
    return allUsers;
  }

  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    // Search by username only (case-insensitive using ilike)
    // Note: ilike is already case-insensitive, no need to normalize query
    
    const searchResults = await db
      .select()
      .from(users)
      .where(
        and(
          ne(users.id, currentUserId), // Exclude current user
          ilike(users.username, `%${query}%`) // ilike handles case-insensitive matching
        )
      )
      .limit(10); // Limit search results
    
    // Sort results: exact match first, then prefix match, then contains match
    const queryLower = query.toLowerCase();
    const sortedResults = searchResults.sort((a, b) => {
      const aLower = a.username.toLowerCase();
      const bLower = b.username.toLowerCase();
      
      // Exact match (case-insensitive)
      if (aLower === queryLower) return -1;
      if (bLower === queryLower) return 1;
      
      // Prefix match
      const aStartsWith = aLower.startsWith(queryLower);
      const bStartsWith = bLower.startsWith(queryLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Alphabetical order for same priority
      return aLower.localeCompare(bLower);
    });
    
    return sortedResults;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    
    // 自动为新用户添加AI客服好友（单向记录）
    const { AI_ASSISTANT_ID } = await import('./constants/ai');
    try {
      await db.insert(friends).values({
        userId: AI_ASSISTANT_ID,
        friendId: newUser.id,
        status: "accepted",
      });
    } catch (error) {
      console.error("Failed to add AI assistant friend:", error);
      // 不阻止用户创建，只是记录错误
    }
    
    return newUser;
  }

  async createOrUpdateLineUser(lineUserId: string, profile: any, languagePreference?: string): Promise<User> {
    // Check if user already exists by LINE ID
    const existingUser = await this.getUserByLineId(lineUserId);
    
    if (existingUser) {
      // Update existing user with latest profile info
      // ⚠️ 不更新现有用户的语言偏好，保持他们的选择
      const [updatedUser] = await db
        .update(users)
        .set({
          firstName: profile.displayName || existingUser.firstName,
          profileImageUrl: profile.pictureUrl || existingUser.profileImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.lineUserId, lineUserId))
        .returning();
      return updatedUser;
    } else {
      // Create new user - 使用传入的语言偏好或默认英文
      const userData: InsertUser = {
        username: `line_${lineUserId}`, // Temporary username
        firstName: profile.displayName,
        profileImageUrl: profile.pictureUrl,
        lineUserId: lineUserId,
        languagePreference: languagePreference || 'en',
      };
      
      return await this.createUser(userData);
    }
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await db
      .update(users)
      .set({
        isOnline,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // ==================== Username Management ====================
  async getUsernameChangeCountThisYear(userId: string): Promise<number> {
    // Get current year boundaries
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStart = new Date(currentYear, 0, 1); // January 1st of current year
    const yearEnd = new Date(currentYear + 1, 0, 1); // January 1st of next year
    
    const changes = await db
      .select()
      .from(usernameChanges)
      .where(
        and(
          eq(usernameChanges.userId, userId),
          sql`${usernameChanges.changedAt} >= ${yearStart}`,
          sql`${usernameChanges.changedAt} < ${yearEnd}`
        )
      );
    
    return changes.length;
  }

  async updateUsername(userId: string, newUsername: string): Promise<User> {
    // Get current user
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if username actually changed (case-insensitive)
    if (newUsername.toLowerCase() === user.username.toLowerCase()) {
      // Same username (case-insensitive), just return user without counting as a change
      return user;
    }
    
    // Check uniqueness (case-insensitive) - use exact lower() comparison
    // Note: Cannot use ilike because it treats underscores as wildcards
    const normalizedUsername = newUsername.toLowerCase();
    
    const existingUsers = await db
      .select()
      .from(users)
      .where(
        and(
          sql`LOWER(${users.username}) = ${normalizedUsername}`,
          ne(users.id, userId) // Exclude current user
        )
      )
      .limit(1);
    
    if (existingUsers.length > 0) {
      throw new Error('Username already taken');
    }
    
    // Record the change in audit table
    await db.insert(usernameChanges).values({
      userId,
      oldUsername: user.username,
      newUsername: newUsername, // Store as provided (preserve case)
    });
    
    // Update username
    const [updatedUser] = await db
      .update(users)
      .set({
        username: newUsername,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  // ==================== Organization Operations ====================
  async getUserOrganizations(userId: string): Promise<Array<OrgMember & { org: Org }>> {
    const userOrgs = await db
      .select({
        id: orgMembers.id,
        orgId: orgMembers.orgId,
        userId: orgMembers.userId,
        role: orgMembers.role,
        title: orgMembers.title,
        invitationStatus: orgMembers.invitationStatus,
        createdAt: orgMembers.createdAt,
        updatedAt: orgMembers.updatedAt,
        org: orgs,
      })
      .from(orgMembers)
      .innerJoin(orgs, eq(orgMembers.orgId, orgs.id))
      .where(and(
        eq(orgMembers.userId, userId),
        eq(orgMembers.invitationStatus, 'active')
      ));
    
    return userOrgs;
  }

  // ==================== Friend Operations ====================
  async getFriendRequests(userId: string): Promise<Array<User & { requestId: string; requestDate: Date }>> {
    // 获取发给当前用户的好友请求
    const friendRequestsQuery = await db
      .select({
        user: users,
        friendship: friends,
      })
      .from(friends)
      .innerJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, userId), eq(friends.status, "pending")))
      .orderBy(desc(friends.createdAt));

    return friendRequestsQuery.map(({ user, friendship }) => ({
      ...user,
      requestId: friendship.id,
      requestDate: friendship.createdAt!
    }));
  }

  async getFriendsList(userId: string): Promise<Array<User & { lastMessage?: Message; unreadCount: number }>> {
    const { AI_ASSISTANT_ID } = await import('./constants/ai');

    // 1. 获取所有好友（单向记录模式：查找两个方向）
    const sentFriendsQuery = await db
      .select({
        user: users,
        friendship: friends,
      })
      .from(friends)
      .innerJoin(users, eq(friends.friendId, users.id))
      .where(and(eq(friends.userId, userId), eq(friends.status, "accepted")));
      
    const receivedFriendsQuery = await db
      .select({
        user: users,
        friendship: friends,
      })
      .from(friends)
      .innerJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, userId), eq(friends.status, "accepted")));
      
    const friendsQuery = [...sentFriendsQuery, ...receivedFriendsQuery];

    if (friendsQuery.length === 0) {
      return [];
    }

    // 去重，避免双向记录导致重复显示
    const uniqueFriendsMap = new Map();
    friendsQuery.forEach(({ user, friendship }) => {
      if (!uniqueFriendsMap.has(user.id)) {
        uniqueFriendsMap.set(user.id, { user, friendship });
      }
    });
    
    const uniqueFriends = Array.from(uniqueFriendsMap.values());
    const friendIds = uniqueFriends.map(({ user }) => user.id);

    // 2. 批量获取最后消息（使用窗口函数）
    const lastMessagesSubquery = db
      .select({
        messageId: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        createdAt: messages.createdAt,
        isRead: messages.isRead,
        friendId: sql<string>`CASE 
          WHEN ${messages.fromUserId} = ${userId} THEN ${messages.toUserId}
          ELSE ${messages.fromUserId}
        END`.as('friend_id'),
        rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY CASE 
          WHEN ${messages.fromUserId} = ${userId} THEN ${messages.toUserId}
          ELSE ${messages.fromUserId}
        END ORDER BY ${messages.createdAt} DESC)`.as('rn')
      })
      .from(messages)
      .where(
        and(
          or(
            and(eq(messages.fromUserId, userId), inArray(messages.toUserId, friendIds)),
            and(inArray(messages.fromUserId, friendIds), eq(messages.toUserId, userId))
          ),
          isNull(messages.groupId)
        )
      )
      .as('last_messages_subquery');

    const lastMessages = await db
      .select()
      .from(lastMessagesSubquery)
      .where(eq(lastMessagesSubquery.rn, 1));

    // 3. 批量获取未读数量
    const unreadCounts = await db
      .select({
        friendId: messages.fromUserId,
        unreadCount: sql<number>`COUNT(*)`.as('unread_count')
      })
      .from(messages)
      .where(
        and(
          inArray(messages.fromUserId, friendIds),
          eq(messages.toUserId, userId),
          eq(messages.isRead, false),
          isNull(messages.groupId)
        )
      )
      .groupBy(messages.fromUserId);

    // 4. 组合结果
    const friendsWithMessages = uniqueFriends.map(({ user, friendship }) => {
      const lastMsg = lastMessages.find(msg => msg.friendId === user.id);
      const unreadCountRaw = unreadCounts.find(uc => uc.friendId === user.id)?.unreadCount || 0;
      const unreadCount = typeof unreadCountRaw === 'string' ? parseInt(unreadCountRaw, 10) : unreadCountRaw;
      
      
      return {
        ...user,
        channel: friendship.channel || 'mytalk', // 添加渠道字段
        lastMessage: lastMsg ? {
          id: lastMsg.messageId,
          content: lastMsg.content,
          messageType: lastMsg.messageType || 'text',
          fromUserId: lastMsg.fromUserId,
          toUserId: lastMsg.toUserId,
          createdAt: lastMsg.createdAt,
          isRead: lastMsg.isRead,
          groupId: null,
          originalLanguage: null
        } as Message : undefined,
        unreadCount
      };
    });

    // AI客服置顶排序：AI客服ID在最前，其他按最后消息时间排序
    return friendsWithMessages.sort((a, b) => {
      // AI客服永远在最前面
      if (a.id === AI_ASSISTANT_ID) return -1;
      if (b.id === AI_ASSISTANT_ID) return 1;
      
      // 其他好友按最后消息时间排序
      const aTime = a.lastMessage?.createdAt?.getTime() || 0;
      const bTime = b.lastMessage?.createdAt?.getTime() || 0;
      return bTime - aTime;
    });
  }

  // 🔔 统一获取聊天列表（包含accepted好友 + incoming pending请求）
  async getContactsForChatList(userId: string): Promise<Array<User & { 
    lastMessage?: Message; 
    unreadCount: number;
    friendshipStatus?: 'pending' | 'accepted' | 'blocked';
    isIncomingRequest?: boolean;
    requestedAt?: Date;
    requestId?: string;
    channel?: string;
  }>> {
    const { AI_ASSISTANT_ID } = await import('./constants/ai');

    // 1️⃣ 获取所有accepted好友（双向查询）
    const acceptedSentQuery = await db
      .select({
        user: users,
        friendship: friends,
      })
      .from(friends)
      .innerJoin(users, eq(friends.friendId, users.id))
      .where(and(eq(friends.userId, userId), eq(friends.status, "accepted")));
      
    const acceptedReceivedQuery = await db
      .select({
        user: users,
        friendship: friends,
      })
      .from(friends)
      .innerJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, userId), eq(friends.status, "accepted")));

    // 2️⃣ 获取incoming pending请求（别人加我的）
    const incomingRequestsQuery = await db
      .select({
        user: users,
        friendship: friends,
      })
      .from(friends)
      .innerJoin(users, eq(friends.userId, users.id))
      .where(and(eq(friends.friendId, userId), eq(friends.status, "pending")))
      .orderBy(desc(friends.createdAt));

    // 3️⃣ 合并所有联系人（去重）
    const allContacts = [...acceptedSentQuery, ...acceptedReceivedQuery, ...incomingRequestsQuery];
    
    if (allContacts.length === 0) {
      return [];
    }

    // 去重，避免双向记录导致重复显示
    const uniqueContactsMap = new Map<string, { 
      user: typeof users.$inferSelect; 
      friendship: typeof friends.$inferSelect;
      channels: string[];
    }>();
    allContacts.forEach(({ user, friendship }) => {
      const existing = uniqueContactsMap.get(user.id);
      const channel = friendship.channel || 'mytalk';
      
      if (!existing) {
        uniqueContactsMap.set(user.id, { user, friendship, channels: [channel] });
      } else {
        if (!existing.channels.includes(channel)) {
          existing.channels.push(channel);
        }
        if (friendship.status === 'pending') {
          existing.friendship = friendship;
        }
      }
    });
    
    const uniqueContacts = Array.from(uniqueContactsMap.values());
    const contactIds = uniqueContacts.map(({ user }) => user.id);

    // 4️⃣ 批量获取最后消息（使用窗口函数）
    const lastMessagesSubquery = db
      .select({
        messageId: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        createdAt: messages.createdAt,
        isRead: messages.isRead,
        contactId: sql<string>`CASE 
          WHEN ${messages.fromUserId} = ${userId} THEN ${messages.toUserId}
          ELSE ${messages.fromUserId}
        END`.as('contact_id'),
        rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY CASE 
          WHEN ${messages.fromUserId} = ${userId} THEN ${messages.toUserId}
          ELSE ${messages.fromUserId}
        END ORDER BY ${messages.createdAt} DESC)`.as('rn')
      })
      .from(messages)
      .where(
        and(
          or(
            and(eq(messages.fromUserId, userId), inArray(messages.toUserId, contactIds)),
            and(inArray(messages.fromUserId, contactIds), eq(messages.toUserId, userId))
          ),
          isNull(messages.groupId)
        )
      )
      .as('last_messages_subquery');

    const lastMessages = await db
      .select()
      .from(lastMessagesSubquery)
      .where(eq(lastMessagesSubquery.rn, 1));

    // 4.5️⃣ 获取当前用户的语言偏好，用于翻译lastMessage
    const currentUser = await this.getUser(userId);
    const userLanguage = currentUser?.languagePreference || 'zh';
    
    // 4.6️⃣ 批量获取对方发送消息的翻译（用于好友列表预览）
    const otherUserMessageIds = lastMessages
      .filter(msg => msg.fromUserId !== userId)
      .map(msg => msg.messageId);
    
    let translationsMap = new Map<string, string>();
    if (otherUserMessageIds.length > 0) {
      const translationResults = await db
        .select({
          messageId: translations.messageId,
          translatedContent: translations.translatedContent,
        })
        .from(translations)
        .where(
          and(
            inArray(translations.messageId, otherUserMessageIds),
            eq(translations.targetLanguage, userLanguage)
          )
        );
      
      translationResults.forEach(t => {
        translationsMap.set(t.messageId, t.translatedContent);
      });
    }

    // 5️⃣ 批量获取未读数量
    const unreadCounts = await db
      .select({
        contactId: messages.fromUserId,
        unreadCount: sql<number>`COUNT(*)`.as('unread_count')
      })
      .from(messages)
      .where(
        and(
          inArray(messages.fromUserId, contactIds),
          eq(messages.toUserId, userId),
          eq(messages.isRead, false),
          isNull(messages.groupId)
        )
      )
      .groupBy(messages.fromUserId);

    // 5.5️⃣ 批量获取数字人自定义信息（头像和昵称）
    const customizations = await db
      .select({
        humanId: userDhCustomizations.humanId,
        customName: userDhCustomizations.customName,
        customAvatarUrl: userDhCustomizations.customAvatarUrl,
      })
      .from(userDhCustomizations)
      .where(
        and(
          eq(userDhCustomizations.userId, userId),
          inArray(userDhCustomizations.humanId, contactIds)
        )
      );
    
    const customizationsMap = new Map(
      customizations.map(c => [c.humanId, c])
    );

    // 6️⃣ 组合结果，添加好友请求元数据和数字人自定义信息
    const contactsWithMessages = uniqueContacts.map(({ user, friendship, channels }) => {
      const lastMsg = lastMessages.find(msg => msg.contactId === user.id);
      const unreadCountRaw = unreadCounts.find(uc => uc.contactId === user.id)?.unreadCount || 0;
      const unreadCount = typeof unreadCountRaw === 'string' ? parseInt(unreadCountRaw, 10) : unreadCountRaw;
      
      // 判断是否为incoming request（别人加我：我在friendId位置）
      const isIncomingRequest = friendship.friendId === userId && friendship.status === 'pending';
      
      // 确定显示的内容：对方发的消息显示翻译，自己发的消息显示原文
      let displayContent = lastMsg?.content;
      if (lastMsg && lastMsg.fromUserId !== userId) {
        // 对方发的消息，尝试获取翻译
        const translation = translationsMap.get(lastMsg.messageId);
        if (translation) {
          displayContent = translation;
        }
      }
      
      // 获取数字人自定义信息（如果存在）
      const customization = customizationsMap.get(user.id);
      
      // 🎯 主渠道优先级：用户首选渠道 > 首个非mytalk渠道 > mytalk
      const primaryChannel = user.primaryChannel || 
        channels.find(c => c !== 'mytalk') || 
        channels[0] || 
        'mytalk';
      
      return {
        ...user,
        channel: friendship.channel || 'mytalk',
        // 🎯 IGIS v1.0：返回所有关联渠道列表
        channels: channels,
        primaryChannel: primaryChannel,
        friendshipStatus: friendship.status as 'pending' | 'accepted' | 'blocked',
        isIncomingRequest,
        requestedAt: isIncomingRequest ? friendship.createdAt : undefined,
        requestId: isIncomingRequest ? friendship.id : undefined,
        customName: customization?.customName,
        customAvatarUrl: customization?.customAvatarUrl,
        lastMessage: lastMsg ? {
          id: lastMsg.messageId,
          content: displayContent,
          messageType: lastMsg.messageType || 'text',
          fromUserId: lastMsg.fromUserId,
          toUserId: lastMsg.toUserId,
          createdAt: lastMsg.createdAt,
          isRead: lastMsg.isRead,
          groupId: null,
          originalLanguage: null
        } as Message : undefined,
        unreadCount
      };
    });

    // 7️⃣ 排序：incoming请求 > AI客服 > 其他好友（按最后消息时间）
    return contactsWithMessages.sort((a, b) => {
      // Incoming请求永远在最前面
      if (a.isIncomingRequest && !b.isIncomingRequest) return -1;
      if (!a.isIncomingRequest && b.isIncomingRequest) return 1;
      
      // 如果都是incoming请求，按请求时间排序（最新的在前）
      if (a.isIncomingRequest && b.isIncomingRequest) {
        const aTime = a.requestedAt?.getTime() || 0;
        const bTime = b.requestedAt?.getTime() || 0;
        return bTime - aTime;
      }
      
      // AI客服在accepted好友中置顶
      if (a.id === AI_ASSISTANT_ID) return -1;
      if (b.id === AI_ASSISTANT_ID) return 1;
      
      // 其他好友按最后消息时间排序
      const aTime = a.lastMessage?.createdAt?.getTime() || 0;
      const bTime = b.lastMessage?.createdAt?.getTime() || 0;
      return bTime - aTime;
    });
  }

  async addFriend(userId: string, friendId: string): Promise<Friend> {
    const [friendship] = await db
      .insert(friends)
      .values({
        userId,
        friendId,
        status: "pending",
      })
      .returning();
    return friendship;
  }

  async addFriendWithChannel(data: {
    userId: string;
    friendId: string;
    status?: string;
    channel?: string;
    externalUserId?: string;
    externalPlatformName?: string;
  }): Promise<Friend> {
    const [friendship] = await db
      .insert(friends)
      .values({
        userId: data.userId,
        friendId: data.friendId,
        status: data.status || "pending",
        channel: data.channel || "mytalk",
        externalUserId: data.externalUserId,
        externalPlatformName: data.externalPlatformName,
      })
      .returning();
    return friendship;
  }

  async findFriendByExternalId(channel: string, externalUserId: string): Promise<Friend | undefined> {
    const [friendship] = await db
      .select()
      .from(friends)
      .where(
        and(
          eq(friends.channel, channel),
          eq(friends.externalUserId, externalUserId)
        )
      );
    return friendship;
  }

  async acceptFriend(userId: string, friendId: string): Promise<void> {
    // 更新好友请求状态为已接受
    await db
      .update(friends)
      .set({ status: "accepted" })
      .where(and(eq(friends.userId, friendId), eq(friends.friendId, userId)));
    
    // 检查反向好友关系是否已存在
    const existingReverse = await db
      .select()
      .from(friends)
      .where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)))
      .limit(1);
    
    // 如果不存在则创建反向好友关系（双向好友）
    if (existingReverse.length === 0) {
      await db
        .insert(friends)
        .values({
          userId: userId,
          friendId: friendId,
          status: "accepted",
          channel: "mytalk",
        });
    } else {
      // 如果已存在则更新状态为accepted
      await db
        .update(friends)
        .set({ status: "accepted" })
        .where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)));
    }
  }

  async declineFriend(userId: string, friendId: string): Promise<void> {
    // 删除好友请求记录
    await db
      .delete(friends)
      .where(and(eq(friends.userId, friendId), eq(friends.friendId, userId)));
  }

  async getFriendship(userId: string, friendId: string): Promise<Friend | undefined> {
    const [friendship] = await db
      .select()
      .from(friends)
      .where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)));
    return friendship;
  }

  async getGroupsList(userId: string): Promise<Array<Group & { lastMessage?: Message; unreadCount: number }>> {
    // 1. 获取所有群组
    const groupsQuery = await db
      .select({
        group: groups,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId));

    if (groupsQuery.length === 0) {
      return [];
    }

    const groupIds = groupsQuery.map(({ group }) => group.id);

    // 2. 批量获取每个群组的最后消息（使用窗口函数）
    const lastMessagesSubquery = db
      .select({
        messageId: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        fromUserId: messages.fromUserId,
        groupId: messages.groupId,
        createdAt: messages.createdAt,
        isRead: messages.isRead,
        rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${messages.groupId} ORDER BY ${messages.createdAt} DESC)`.as('rn')
      })
      .from(messages)
      .where(
        and(
          inArray(messages.groupId, groupIds),
          isNull(messages.toUserId) // 确保是群组消息
        )
      )
      .as('last_messages_subquery');

    const lastMessages = await db
      .select()
      .from(lastMessagesSubquery)
      .where(eq(lastMessagesSubquery.rn, 1));

    // 3. 批量获取未读数量
    const unreadCounts = await db
      .select({
        groupId: messages.groupId,
        unreadCount: sql<number>`COUNT(*)`.as('unread_count')
      })
      .from(messages)
      .where(
        and(
          inArray(messages.groupId, groupIds),
          eq(messages.isRead, false),
          ne(messages.fromUserId, userId), // 排除自己的消息
          isNull(messages.toUserId) // 确保是群组消息
        )
      )
      .groupBy(messages.groupId);

    // 4. 批量获取每个群组的前6名成员（用于显示群组头像）
    const groupMembersMap = new Map<string, User[]>();
    for (const groupId of groupIds) {
      const members = await db
        .select({
          user: users,
        })
        .from(groupMembers)
        .innerJoin(users, eq(groupMembers.userId, users.id))
        .where(eq(groupMembers.groupId, groupId))
        .limit(6);
      
      groupMembersMap.set(groupId, members.map(({ user }) => user));
    }

    // 5. 组合结果
    const groupsWithMessages = groupsQuery.map(({ group }) => {
      const lastMsg = lastMessages.find(msg => msg.groupId === group.id);
      const unreadCountRaw = unreadCounts.find(uc => uc.groupId === group.id)?.unreadCount || 0;
      const unreadCount = typeof unreadCountRaw === 'string' ? parseInt(unreadCountRaw, 10) : unreadCountRaw;
      const members = groupMembersMap.get(group.id) || [];
      
      return {
        ...group,
        channel: group.channel || 'mytalk', // 添加渠道字段
        lastMessage: lastMsg ? {
          id: lastMsg.messageId,
          content: lastMsg.content,
          messageType: lastMsg.messageType || 'text',
          fromUserId: lastMsg.fromUserId,
          toUserId: null,
          groupId: lastMsg.groupId,
          createdAt: lastMsg.createdAt,
          isRead: lastMsg.isRead,
          originalLanguage: null
        } as Message : undefined,
        unreadCount,
        members
      };
    });

    // 按最后消息时间排序
    return groupsWithMessages.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() || 0;
      const bTime = b.lastMessage?.createdAt?.getTime() || 0;
      return bTime - aTime;
    });
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async addGroupMember(groupId: string, userId: string, role: string = "member"): Promise<GroupMember> {
    const [member] = await db
      .insert(groupMembers)
      .values({
        groupId,
        userId,
        role,
      })
      .returning();
    return member;
  }

  async getGroupMembers(groupId: string): Promise<Array<User>> {
    const members = await db
      .select({
        user: users,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    return members.map(({ user }) => user);
  }

  async getGroupMembersWithRoles(groupId: string): Promise<Array<GroupMember & { user: User }>> {
    const members = await db
      .select({
        member: groupMembers,
        user: users,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, groupId));

    return members.map(({ member, user }) => ({ ...member, user }));
  }

  async getGroupMember(groupId: string, userId: string): Promise<GroupMember | undefined> {
    const [member] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        )
      );
    return member;
  }

  async getGroup(groupId: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId));
    return group;
  }

  async getMessage(messageId: string): Promise<(Message & { fromUser: User }) | undefined> {
    const [result] = await db
      .select({
        message: messages,
        fromUser: users
      })
      .from(messages)
      .innerJoin(users, eq(messages.fromUserId, users.id))
      .where(eq(messages.id, messageId));
    
    if (!result) return undefined;
    
    return {
      ...result.message,
      fromUser: result.fromUser
    };
  }

  async getMessages(
    userId: string, 
    targetId: string, 
    isGroup: boolean, 
    pagination?: { page: number; limit: number; before?: string }
  ): Promise<{
    messages: Array<Message & { fromUser: User; translations?: Translation[] }>;
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const limit = pagination?.limit || 20;
    const before = pagination?.before;
    
    let baseCondition;
    if (isGroup) {
      baseCondition = eq(messages.groupId, targetId);
    } else {
      // 私聊消息条件：
      // 1. 我发送的消息（发给对方的）- 我可以看到所有状态
      // 2. 对方发送的消息（发给我的）- 排除正在处理中的语音对话消息
      baseCondition = or(
        // 我发送的消息 - 全部可见
        and(eq(messages.fromUserId, userId), eq(messages.toUserId, targetId)),
        // 对方发送的消息 - 排除处理中的语音对话
        and(
          eq(messages.fromUserId, targetId), 
          eq(messages.toUserId, userId),
          // 要么不是处理中状态，要么processingStatus为null（普通消息）
          or(
            isNull(messages.processingStatus),
            ne(messages.processingStatus, 'processing')
          )
        )
      );
    }

    // Add cursor condition for pagination
    let whereCondition = baseCondition;
    if (before) {
      whereCondition = and(
        baseCondition,
        lt(messages.createdAt, new Date(before))
      );
    }

    const messagesQuery = await db
      .select({
        message: messages,
        fromUser: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.fromUserId, users.id))
      .where(whereCondition)
      .orderBy(desc(messages.createdAt)) // Order by newest first for pagination
      .limit(limit + 1); // Fetch one extra to check if there are more

    const hasMore = messagesQuery.length > limit;
    const actualMessages = hasMore ? messagesQuery.slice(0, limit) : messagesQuery;
    
    const messageIds = actualMessages.map(({ message }) => message.id);
    
    let allTranslations: Translation[] = [];
    if (messageIds.length > 0) {
      allTranslations = await db
        .select()
        .from(translations)
        .where(inArray(translations.messageId, messageIds))
        .orderBy(desc(translations.createdAt));
    }
    
    const translationMap = new Map<string, Translation[]>();
    allTranslations.forEach(translation => {
      const messageId = translation.messageId;
      if (!translationMap.has(messageId)) {
        translationMap.set(messageId, []);
      }
      translationMap.get(messageId)!.push(translation);
    });

    // 获取引用消息的数据
    const replyToMessageIds = actualMessages
      .map(({ message }) => message.replyToMessageId)
      .filter((id): id is string => !!id);
    
    const replyMessagesMap = new Map<string, { message: Message; fromUser: User }>();
    if (replyToMessageIds.length > 0) {
      const replyMessages = await db
        .select({
          message: messages,
          fromUser: users,
        })
        .from(messages)
        .innerJoin(users, eq(messages.fromUserId, users.id))
        .where(inArray(messages.id, replyToMessageIds));
      
      replyMessages.forEach(({ message, fromUser }) => {
        replyMessagesMap.set(message.id, { message, fromUser });
      });
    }

    const messagesWithTranslations = actualMessages.map(({ message, fromUser }) => {
      const replyData = message.replyToMessageId ? replyMessagesMap.get(message.replyToMessageId) : null;
      return {
        ...message,
        fromUser,
        translations: translationMap.get(message.id) || [],
        replyToMessage: replyData ? {
          id: replyData.message.id,
          content: replyData.message.content,
          messageType: replyData.message.messageType,
          fromUserId: replyData.message.fromUserId,
          fromUser: replyData.fromUser,
        } : undefined,
      };
    });

    // Reverse to show oldest first
    const orderedMessages = messagesWithTranslations.reverse();
    
    // Set next cursor if there are more messages
    const nextCursor = hasMore && actualMessages.length > 0 
      ? actualMessages[actualMessages.length - 1]?.message?.createdAt?.toISOString()
      : undefined;

    return {
      messages: orderedMessages,
      hasMore,
      nextCursor,
    };
  }

  async sendMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
  }

  async updateMessageVoiceProcessing(messageId: string, data: {
    transcript?: string;
    translatedTranscript?: string;
    ttsAudioUrl?: string;
    processingStatus?: string;
  }): Promise<void> {
    await db
      .update(messages)
      .set(data)
      .where(eq(messages.id, messageId));
  }

  async markChatAsRead(chatId: string, chatType: 'friend' | 'group', userId: string): Promise<void> {
    if (chatType === 'friend') {
      // 只标记对方发给我的消息为已读（不标记我发给对方的消息）
      await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.fromUserId, chatId),  // 对方发送的
            eq(messages.toUserId, userId),     // 发给我的
            eq(messages.isRead, false)
          )
        );
    } else {
      // For group chat, mark all unread messages in the group as read for this user
      await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.groupId, chatId),
            eq(messages.isRead, false),
            ne(messages.fromUserId, userId) // Don't mark own messages as read
          )
        );
    }
  }

  async getTranslation(messageId: string, targetLanguage: string, messageType = "casual"): Promise<Translation | undefined> {
    const [translation] = await db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.messageId, messageId),
          eq(translations.targetLanguage, targetLanguage),
          eq(translations.messageType, messageType)
        )
      );
    return translation;
  }

  // ⚡ 批量获取翻译（性能优化：一次查询获取所有翻译）
  async getTranslationsBatch(messageIds: string[], targetLanguages: string[]): Promise<Translation[]> {
    if (messageIds.length === 0 || targetLanguages.length === 0) {
      return [];
    }
    
    const result = await db
      .select()
      .from(translations)
      .where(
        and(
          inArray(translations.messageId, messageIds),
          inArray(translations.targetLanguage, targetLanguages)
        )
      );
    return result;
  }

  async saveTranslation(translation: InsertTranslation): Promise<Translation> {
    const [newTranslation] = await db.insert(translations).values(translation).returning();
    return newTranslation;
  }

  async updateMessageTranslation(messageId: string, targetLanguage: string, translatedText: string): Promise<Message | undefined> {
    const message = await this.getMessage(messageId);
    if (!message) return undefined;

    const updatedTranslations = {
      ...(message.translations || {}),
      [targetLanguage]: {
        text: translatedText
      }
    };

    const [updatedMessage] = await db
      .update(messages)
      .set({ translations: updatedTranslations })
      .where(eq(messages.id, messageId))
      .returning();

    return updatedMessage;
  }
  
  async getLastMessageLanguage(userId: string, partnerId: string): Promise<string | undefined> {
    const [lastMessage] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.fromUserId, partnerId),
          eq(messages.toUserId, userId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(1);
    
    return lastMessage?.originalLanguage || undefined;
  }
  
  async getLastMessageLanguageInGroup(groupId: string, memberId: string): Promise<string | undefined> {
    const [lastMessage] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.groupId, groupId),
          eq(messages.fromUserId, memberId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(1);
    
    return lastMessage?.originalLanguage || undefined;
  }
  
  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  // ===================== Voice Profile Operations =====================
  async getUserVoiceProfile(userId: string): Promise<UserVoiceProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userVoiceProfiles)
      .where(eq(userVoiceProfiles.userId, userId));
    return profile;
  }

  async upsertUserVoiceProfile(data: InsertUserVoiceProfile): Promise<UserVoiceProfile> {
    const existing = await this.getUserVoiceProfile(data.userId);
    
    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(userVoiceProfiles)
        .set({
          remoteVoiceForMe: data.remoteVoiceForMe,
          myDefaultVoiceForOthers: data.myDefaultVoiceForOthers,
          autoCallTranscript: data.autoCallTranscript,
          updatedAt: new Date(),
        })
        .where(eq(userVoiceProfiles.userId, data.userId))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [created] = await db
        .insert(userVoiceProfiles)
        .values(data)
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
