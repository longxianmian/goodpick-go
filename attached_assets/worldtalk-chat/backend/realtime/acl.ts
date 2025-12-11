// 📌 实时通信权限控制 (ACL) - 消息与信令权限校验
import { storage } from '../storage';
import { connectionManager } from './auth';

export interface MessageACLContext {
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  messageType: 'text' | 'image' | 'file' | 'sticker' | 'voice' | 'video' | 'card';
}

export interface SignalingACLContext {
  fromUserId: string;
  toUserId?: string;
  roomId: string;
  action: 'join-room' | 'leave-room' | 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-response' | 'end-call';
}

// ACL权限检查器
class ACLService {
  
  // 检查消息发送权限
  async checkMessagePermission(context: MessageACLContext): Promise<{ allowed: boolean; reason?: string }> {
    const { fromUserId, toUserId, groupId } = context;

    // 1. 检查发送者是否在线且已认证
    const connection = connectionManager.getConnectionByUserId(fromUserId);
    if (!connection) {
      return { allowed: false, reason: 'Sender not authenticated' };
    }

    // 2. 群组消息权限检查
    if (groupId) {
      try {
        const groupMembers = await storage.getGroupMembers(groupId);
        const isMember = groupMembers.some(member => member.id === fromUserId);
        
        if (!isMember) {
          return { allowed: false, reason: 'Not a group member' };
        }
      } catch (error) {
        return { allowed: false, reason: 'Group not found' };
      }
    }

    // 3. 私聊消息权限检查
    if (toUserId) {
      // 检查接收者是否存在
      const recipient = await storage.getUser(toUserId);
      if (!recipient) {
        return { allowed: false, reason: 'Recipient not found' };
      }

      // 检查是否为好友关系（可选：根据业务需求调整）
      const areFriends = await this.checkFriendship(fromUserId, toUserId);
      if (!areFriends) {
        // 注意：这里可以根据产品需求调整，是否允许非好友发消息
        console.warn(`Non-friend message attempt: ${fromUserId} → ${toUserId}`);
      }
    }

    return { allowed: true };
  }

  // 检查信令权限
  async checkSignalingPermission(context: SignalingACLContext): Promise<{ allowed: boolean; reason?: string }> {
    const { fromUserId, toUserId, roomId, action } = context;

    // 1. 检查发送者是否已认证
    const connection = connectionManager.getConnectionByUserId(fromUserId);
    if (!connection) {
      return { allowed: false, reason: 'User not authenticated' };
    }

    // 2. 房间权限检查
    const roomAccess = await this.checkRoomAccess(fromUserId, roomId);
    if (!roomAccess.allowed) {
      return { allowed: false, reason: roomAccess.reason };
    }

    // 3. 特定动作权限检查
    switch (action) {
      case 'join-room':
        // 加入房间：检查是否有权限加入此房间
        return await this.checkRoomJoinPermission(fromUserId, roomId);
        
      case 'call-request':
        // 发起通话：检查目标用户关系
        if (toUserId) {
          const callPermission = await this.checkCallPermission(fromUserId, toUserId);
          return callPermission;
        }
        break;
        
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // WebRTC信令：必须在房间内
        return { allowed: true }; // 房间权限已在上面检查
        
      case 'end-call':
        // 结束通话：房间内任何人都可以结束
        return { allowed: true };
    }

    return { allowed: true };
  }

  // 检查房间访问权限
  private async checkRoomAccess(userId: string, roomId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // 房间ID格式: "chat_<conversationId>" 或 "call_<conversationId>"
      if (roomId.startsWith('chat_') || roomId.startsWith('call_')) {
        const conversationId = roomId.split('_')[1];
        
        // 检查用户是否是此对话的参与者
        const isParticipant = await this.checkConversationParticipant(userId, conversationId);
        if (!isParticipant) {
          return { allowed: false, reason: 'Not a conversation participant' };
        }
      } else {
        // 自定义房间格式检查
        console.warn(`Unknown room format: ${roomId}`);
        return { allowed: false, reason: 'Invalid room format' };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Room access check error:', error);
      return { allowed: false, reason: 'Room access verification failed' };
    }
  }

  // 检查房间加入权限
  private async checkRoomJoinPermission(userId: string, roomId: string): Promise<{ allowed: boolean; reason?: string }> {
    // 对于聊天房间，任何有对话权限的用户都可以加入
    // 对于通话房间，需要是好友或被邀请
    return this.checkRoomAccess(userId, roomId);
  }

  // 检查通话发起权限
  private async checkCallPermission(fromUserId: string, toUserId: string): Promise<{ allowed: boolean; reason?: string }> {
    // 检查目标用户是否存在
    const targetUser = await storage.getUser(toUserId);
    if (!targetUser) {
      return { allowed: false, reason: 'Target user not found' };
    }

    // 检查好友关系（可选：根据产品需求调整）
    const areFriends = await this.checkFriendship(fromUserId, toUserId);
    if (!areFriends) {
      console.warn(`Non-friend call attempt: ${fromUserId} → ${toUserId}`);
      // 可以选择允许或拒绝非好友通话
    }

    // 检查目标用户是否在线
    const targetConnection = connectionManager.getConnectionByUserId(toUserId);
    if (!targetConnection) {
      return { allowed: false, reason: 'Target user offline' };
    }

    return { allowed: true };
  }

  // 检查好友关系
  private async checkFriendship(userId1: string, userId2: string): Promise<boolean> {
    try {
      // 这里需要根据实际的好友关系存储结构实现
      // 目前先返回true，后续需要实现真正的好友关系检查
      return true;
    } catch (error) {
      console.error('Friendship check error:', error);
      return false;
    }
  }

  // 检查对话参与者
  private async checkConversationParticipant(userId: string, conversationId: string): Promise<boolean> {
    try {
      // 根据conversationId格式判断是私聊还是群聊
      if (conversationId.includes('_')) {
        // 私聊格式: userId1_userId2
        const [user1, user2] = conversationId.split('_');
        return userId === user1 || userId === user2;
      } else {
        // 群聊：检查群组成员
        const groupMembers = await storage.getGroupMembers(conversationId);
        return groupMembers.some(member => member.id === userId);
      }
    } catch (error) {
      console.error('Conversation participant check error:', error);
      return false;
    }
  }
}

export const aclService = new ACLService();

// ACL中间件：消息权限检查
export async function checkMessageACL(context: MessageACLContext): Promise<boolean> {
  const result = await aclService.checkMessagePermission(context);
  
  if (!result.allowed) {
    console.warn(`❌ Message ACL denied: ${result.reason}`, context);
    return false;
  }
  
  return true;
}

// ACL中间件：信令权限检查
export async function checkSignalingACL(context: SignalingACLContext): Promise<boolean> {
  const result = await aclService.checkSignalingPermission(context);
  
  if (!result.allowed) {
    console.warn(`❌ Signaling ACL denied: ${result.reason}`, context);
    return false;
  }
  
  return true;
}