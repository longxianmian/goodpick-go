import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { storage } from "../storage";
import { translateMessage } from "./openai";
import { db } from "../db";
import { users, messages } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { authService, connectionManager, authenticateConnection } from "../realtime/auth";
import { checkMessageACL } from "../realtime/acl";
import { realtimeSTT } from "./realtime-stt";
import type {
  VoiceCallOfferPayload,
  VoiceCallAnswerPayload,
  VoiceCallIceCandidatePayload,
  VoiceCallEndPayload,
} from "../../shared/voiceCall";

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  lastSeen: Date;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      verifyClient: (info: any) => {
        // 🔒 预验证：检查是否携带token（同步检查）
        const token = authService.extractTokenFromRequest(info.req);
        return !!token; // 有token的连接通过，详细验证在connection事件中进行
      }
    });

    this.wss.on("connection", async (ws, request) => {
      try {
        const authUser = await authService.verifyWebSocketConnection({ req: request });
        
        if (!authUser) {
          ws.close(1008, 'Authentication failed');
          return;
        }

        const socketId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const authSuccess = await authenticateConnection(
          socketId,
          'websocket',
          authUser,
          ws
        );

        if (!authSuccess) {
          ws.close(1011, 'Registration failed');
          return;
        }

        (ws as any).socketId = socketId;

        this.send(ws, {
          type: "authSuccess",
          userId: authUser.userId,
          socketId
        });
      } catch (error) {
        console.error('❌ WebSocket auth error:', error);
        ws.close(1011, 'Authentication error');
        return;
      }

      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error("WebSocket message error:", error);
          this.sendError(ws, "Invalid message format");
        }
      });

      ws.on("close", () => {
        this.handleDisconnect(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case "auth":
        await this.handleAuth(ws, message);
        break;
      case "sendMessage":
        await this.handleSendMessage(ws, message);
        break;
      case "joinGroup":
        await this.handleJoinGroup(ws, message);
        break;
      case "leaveGroup":
        await this.handleLeaveGroup(ws, message);
        break;
      case "typing":
        await this.handleTyping(ws, message);
        break;
      case "markAsRead":
        await this.handleMarkAsRead(ws, message);
        break;
      case "acceptFriendRequest":
        await this.handleAcceptFriendRequest(ws, message);
        break;
      case "voice-call-offer":
      case "call-offer":
        await this.handleCallOffer(ws, message);
        break;
      case "voice-call-answer":
      case "call-answer":
        await this.handleCallAnswer(ws, message);
        break;
      case "voice-call-ice-candidate":
      case "call-ice-candidate":
        await this.handleCallIceCandidate(ws, message);
        break;
      case "voice-call-end":
      case "voice-call-reject":
      case "voice-call-busy":
      case "call-end":
      case "call-reject":
      case "call-busy":
        await this.handleCallEnd(ws, message);
        break;
      case "stt-start":
        await this.handleSTTStart(ws, message);
        break;
      case "stt-audio":
        this.handleSTTAudio(ws, message);
        break;
      case "stt-stop":
        this.handleSTTStop(ws, message);
        break;
      default:
        this.sendError(ws, "Unknown message type");
    }
  }

  private async handleSTTStart(ws: WebSocket, message: any) {
    const client = this.findClientByWs(ws);
    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }
    
    const existingSessionId = (ws as any).sttSessionId;
    if (existingSessionId && realtimeSTT.hasSession(existingSessionId)) {
      console.log(`🔄 [STT] 终止已存在的会话: ${existingSessionId}`);
      realtimeSTT.finishSession(existingSessionId);
    }
    
    const sessionId = `stt_${client.userId}_${Date.now()}`;
    
    try {
      await realtimeSTT.createSession(
        sessionId,
        (text: string, isFinal: boolean) => {
          this.send(ws, {
            type: 'stt-transcript',
            sessionId,
            text,
            isFinal
          });
        },
        (error: Error) => {
          this.send(ws, {
            type: 'stt-error',
            sessionId,
            error: error.message
          });
        },
        () => {
          this.send(ws, {
            type: 'stt-closed',
            sessionId
          });
        }
      );

      (ws as any).sttSessionId = sessionId;
      
      this.send(ws, {
        type: 'stt-ready',
        sessionId
      });
    } catch (error: any) {
      this.send(ws, {
        type: 'stt-error',
        error: error.message
      });
    }
  }

  private handleSTTAudio(ws: WebSocket, message: any) {
    const sessionId = (ws as any).sttSessionId;
    if (!sessionId) {
      return;
    }

    const { audio } = message;
    if (audio) {
      const audioBuffer = Buffer.from(audio, 'base64');
      realtimeSTT.sendAudio(sessionId, audioBuffer);
    }
  }

  private handleSTTStop(ws: WebSocket, message: any) {
    const sessionId = (ws as any).sttSessionId;
    if (!sessionId) {
      return;
    }

    realtimeSTT.finishSession(sessionId);
    (ws as any).sttSessionId = null;
  }

  private async handleAuth(ws: WebSocket, message: any) {
    this.sendError(ws, "Legacy auth not supported. Use JWT authentication.");
  }

  private async handleSendMessage(ws: WebSocket, message: any) {
    const { 
      content, 
      toUserId, 
      groupId, 
      messageType = "text", 
      clientMessageId, 
      metadata, 
      mediaMetadata,
      // 语音消息相关字段
      transcript,
      translatedTranscript,
      ttsAudioUrl,
      processingStatus,
      voiceMetadata,
      // 引用回复
      replyToMessageId
    } = message;
    const client = this.findClientByWs(ws);

    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    const { rateLimiters } = await import('../realtime/rate-limiter');
    const rateResult = rateLimiters.message.checkLimit(client.userId);
    if (!rateResult.allowed) {
      this.sendError(ws, "Rate limit exceeded. Please slow down.");
      return;
    }

    const aclAllowed = await checkMessageACL({
      fromUserId: client.userId,
      toUserId,
      groupId,
      messageType
    });

    if (!aclAllowed) {
      this.sendError(ws, "Permission denied");
      return;
    }

    try {
      const detectedLang = await this.detectLanguage(content);
      
      const newMessage = await storage.sendMessage({
        fromUserId: client.userId,
        toUserId,
        groupId,
        messageType,
        content,
        modality: messageType === 'audio' ? 'voice' : 'text',
        originalText: messageType === 'text' ? content : undefined,
        originalAudioUrl: messageType === 'audio' ? content : undefined,
        originalLang: detectedLang,
        originalLanguage: detectedLang,
        processingStatus: processingStatus || (messageType === 'audio' ? 'processing' : 'ready'),
        mediaMetadata: mediaMetadata || metadata,
        voiceMetadata: voiceMetadata,
        transcript: transcript,
        translatedTranscript: translatedTranscript,
        ttsAudioUrl: ttsAudioUrl,
        translations: {},
        replyToMessageId: replyToMessageId
      });

      // 仅在processingStatus不是'ready'时异步处理语音（前端未预处理的情况）
      if (messageType === 'audio' && processingStatus !== 'ready') {
        const { processVoiceMessage } = await import('./voice-processor');
        
        setTimeout(async () => {
          try {
            const audioPath = content.startsWith('/') ? `public${content}` : content;
            await processVoiceMessage(newMessage.id, audioPath, client.userId, toUserId || null, groupId || null);
          } catch (error) {
            console.error('❌ 语音处理失败:', error);
            await storage.updateMessageVoiceProcessing(newMessage.id, {
              processingStatus: 'error'
            });
          }
        }, 200);
      }

      const sender = await storage.getUser(client.userId);

      // 获取引用消息数据（使用storage抽象层）
      let replyToMessage = null;
      if (replyToMessageId) {
        const replyMsg = await storage.getMessage(replyToMessageId);
        if (replyMsg) {
          replyToMessage = {
            id: replyMsg.id,
            content: replyMsg.content,
            messageType: replyMsg.messageType,
            fromUserId: replyMsg.fromUserId,
            fromUser: replyMsg.fromUser,
          };
        }
      }

      let messageForSender = {
        ...newMessage,
        fromUser: sender,
        originalText: content,
        translatedText: content,
        needsTranslation: false,
        replyToMessage
      };

      this.send(ws, {
        type: "messageSent",
        messageId: newMessage.id,
        clientMessageId: clientMessageId,
        message: messageForSender,
        chatId: groupId || toUserId,
        chatType: groupId ? "group" : "friend"
      });

      setImmediate(async () => {
        try {
          // 包含引用消息数据的新消息
          const messageWithReply = { ...newMessage, replyToMessage };
          
          if (groupId) {
            const members = await storage.getGroupMembers(groupId);
            for (const member of members) {
              if (member.id !== client.userId) {
                // 使用接收者的语言偏好，而不是最后发送消息的语言
                const recipient = await storage.getUser(member.id);
                const targetLanguage = recipient?.languagePreference || 'en';
                
                const translatedMessage = await this.prepareMessageWithTranslation(
                  messageWithReply, sender!, targetLanguage
                );
                this.sendToUser(member.id, {
                  type: "newMessage",
                  message: translatedMessage,
                  chatId: groupId,
                  chatType: "group",
                  isGroup: true
                });
              }
            }
          } else if (toUserId) {
            const { AI_ASSISTANT_ID } = await import('../constants/ai');
            
            if (toUserId !== AI_ASSISTANT_ID) {
              // 使用接收者的语言偏好，而不是最后发送消息的语言
              const recipient = await storage.getUser(toUserId);
              const targetLanguage = recipient?.languagePreference || 'en';
              
              const translatedMessage = await this.prepareMessageWithTranslation(
                messageWithReply, sender!, targetLanguage
              );
              this.sendToUser(toUserId, {
                type: "newMessage",
                message: translatedMessage,
                chatId: client.userId,
                chatType: "friend",
                isGroup: false
              });
            }
          }
        } catch (error) {
          console.error("❌ 异步翻译发送失败:", error);
        }
      });

      // 🔔 检查是否发送给LINE好友，如果是则推送到LINE
      if (toUserId && (messageType === 'text' || messageType === 'image')) {
        const { friends, users } = await import('@shared/schema');
        const { db } = await import('../db');
        const { eq, and } = await import('drizzle-orm');
        const { pushLineMessage } = await import('../routes');
        
        const [lineFriend] = await db.select()
          .from(friends)
          .where(and(
            eq(friends.friendId, toUserId),
            eq(friends.channel, 'line')
          ))
          .limit(1);
        
        if (lineFriend && lineFriend.externalUserId) {
          const [lineUser] = await db.select()
            .from(users)
            .where(eq(users.id, lineFriend.friendId))
            .limit(1);
          
          const recipientLanguage = lineUser?.languagePreference || 'th';
          
          setImmediate(async () => {
            try {
              await pushLineMessage(lineFriend.externalUserId!, content, recipientLanguage, messageType);
            } catch (error) {
              console.error('❌ 推送LINE消息失败:', error);
            }
          });
        }
      }

      // 🔔 检查是否发送给WhatsApp好友，如果是则推送到WhatsApp
      if (toUserId && (messageType === 'text' || messageType === 'image')) {
        const { friends, users } = await import('@shared/schema');
        const { db } = await import('../db');
        const { eq, and } = await import('drizzle-orm');
        const { pushWhatsAppMessage } = await import('../routes');
        
        const [whatsappFriend] = await db.select()
          .from(friends)
          .where(and(
            eq(friends.friendId, toUserId),
            eq(friends.channel, 'whatsapp')
          ))
          .limit(1);
        
        if (whatsappFriend && whatsappFriend.externalUserId) {
          const [whatsappUser] = await db.select()
            .from(users)
            .where(eq(users.id, whatsappFriend.friendId))
            .limit(1);
          
          const recipientLanguage = whatsappUser?.languagePreference || 'en';
          
          setImmediate(async () => {
            try {
              await pushWhatsAppMessage(whatsappFriend.externalUserId!, content, recipientLanguage, messageType);
            } catch (error) {
              console.error('❌ 推送WhatsApp消息失败:', error);
            }
          });
        }
      }

      // 🔔 检查是否发送给Messenger好友，如果是则推送到Messenger
      if (toUserId && (messageType === 'text' || messageType === 'image')) {
        const { friends, users } = await import('@shared/schema');
        const { db } = await import('../db');
        const { eq, and } = await import('drizzle-orm');
        const { pushMessengerMessage } = await import('../routes');
        
        const [messengerFriend] = await db.select()
          .from(friends)
          .where(and(
            eq(friends.friendId, toUserId),
            eq(friends.channel, 'messenger')
          ))
          .limit(1);
        
        if (messengerFriend && messengerFriend.externalUserId) {
          const [messengerUser] = await db.select()
            .from(users)
            .where(eq(users.id, messengerFriend.friendId))
            .limit(1);
          
          const recipientLanguage = messengerUser?.languagePreference || 'en';
          
          setImmediate(async () => {
            try {
              await pushMessengerMessage(messengerFriend.externalUserId!, content, recipientLanguage, messageType);
            } catch (error) {
              console.error('❌ 推送Messenger消息失败:', error);
            }
          });
        }
      }

      // 🔔 检查是否发送给Instagram好友，如果是则推送到Instagram
      if (toUserId && (messageType === 'text' || messageType === 'image')) {
        const { friends, users } = await import('@shared/schema');
        const { db } = await import('../db');
        const { eq, and } = await import('drizzle-orm');
        const { pushInstagramMessage } = await import('../routes');
        
        const [instagramFriend] = await db.select()
          .from(friends)
          .where(and(
            eq(friends.friendId, toUserId),
            eq(friends.channel, 'igdm')
          ))
          .limit(1);
        
        if (instagramFriend && instagramFriend.externalUserId) {
          const [instagramUser] = await db.select()
            .from(users)
            .where(eq(users.id, instagramFriend.friendId))
            .limit(1);
          
          const recipientLanguage = instagramUser?.languagePreference || 'en';
          
          setImmediate(async () => {
            try {
              await pushInstagramMessage(instagramFriend.externalUserId!, content, recipientLanguage, messageType);
            } catch (error) {
              console.error('❌ 推送Instagram消息失败:', error);
            }
          });
        }
      }

      const { AI_ASSISTANT_ID } = await import('../constants/ai');
      if (toUserId === AI_ASSISTANT_ID) {
        await this.handleAIResponse(newMessage, sender);
      }

    } catch (error) {
      console.error("Send message error:", error);
      this.sendError(ws, "Failed to send message");
    }
  }

  private async handleJoinGroup(ws: WebSocket, message: any) {
    const { groupId } = message;
    const client = this.findClientByWs(ws);

    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    try {
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.find(member => member.id === client.userId);
      
      if (!isMember) {
        await storage.addGroupMember(groupId, client.userId);
      }

      this.send(ws, {
        type: "joinedGroup",
        groupId
      });
    } catch (error) {
      console.error("Join group error:", error);
      this.sendError(ws, "Failed to join group");
    }
  }

  private async handleAIResponse(originalMessage: any, sender: any) {
    try {
      const { AI_ASSISTANT_ID } = await import('../constants/ai');
      const { generateAIResponse, detectLanguage } = await import('../services/openai');
      
      const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      try {
        const { messages: recentMessages } = await storage.getMessages(
          sender.id,
          AI_ASSISTANT_ID,
          false,
          { page: 1, limit: 20 }
        );
        
        recentMessages
          .reverse()
          .forEach(msg => {
            const role = msg.fromUserId === sender.id ? 'user' : 'assistant';
            conversationHistory.push({
              role,
              content: msg.content || ''
            });
          });
      } catch (error) {
        console.error("获取对话历史失败，使用空历史:", error);
      }
      
      const { detectTextLanguage } = await import('../services/openai');
      let detectedLanguage = detectTextLanguage(originalMessage.content);
      
      if (detectedLanguage === 'en' && !/^[a-zA-Z\s\.,!?]+$/.test(originalMessage.content)) {
        try {
          const apiDetected = await detectLanguage(originalMessage.content);
          if (apiDetected && apiDetected !== 'unknown') {
            detectedLanguage = apiDetected;
          }
        } catch (error) {
          console.error("API语言检测失败，使用本地检测结果:", error);
        }
      }
      
      const aiResponseContent = await generateAIResponse(
        originalMessage.content, 
        sender?.firstName || "用户",
        conversationHistory
      );

      const aiMessage = await storage.sendMessage({
        fromUserId: AI_ASSISTANT_ID,
        toUserId: sender.id,
        messageType: "text",
        content: aiResponseContent,
        originalLanguage: "en"
      });

      const targetLanguage = detectedLanguage && detectedLanguage !== 'unknown' && detectedLanguage !== 'en' 
        ? detectedLanguage 
        : (sender.languagePreference || 'en');

      const aiUser = await storage.getUser(AI_ASSISTANT_ID);
      const translatedAiMessage = await this.prepareMessageWithTranslation(
        aiMessage, aiUser!, targetLanguage
      );

      const messageToSend = {
        type: "newMessage",
        message: translatedAiMessage,
        chatId: AI_ASSISTANT_ID,
        chatType: "friend",
        isGroup: false
      };
      
      this.sendToUser(sender.id, messageToSend);

    } catch (error) {
      console.error("❌ AI response error:", error);
    }
  }

  private async handleLeaveGroup(ws: WebSocket, message: any) {
    const { groupId } = message;
    const client = this.findClientByWs(ws);

    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    this.send(ws, {
      type: "leftGroup",
      groupId
    });
  }

  private async handleTyping(ws: WebSocket, message: any) {
    const { toUserId, groupId, isTyping } = message;
    const client = this.findClientByWs(ws);

    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    const typingMessage = {
      type: "typing",
      fromUserId: client.userId,
      isTyping,
      isGroup: !!groupId
    };

    if (groupId) {
      // Send typing indicator to all group members
      const members = await storage.getGroupMembers(groupId);
      for (const member of members) {
        if (member.id !== client.userId) {
          this.sendToUser(member.id, typingMessage);
        }
      }
    } else if (toUserId) {
      // Send typing indicator to recipient
      this.sendToUser(toUserId, typingMessage);
    }
  }

  private async handleMarkAsRead(ws: WebSocket, message: any) {
    const { messageId } = message;
    const client = this.findClientByWs(ws);

    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    try {
      await storage.markMessageAsRead(messageId);
      
      this.send(ws, {
        type: "messageMarkedAsRead",
        messageId
      });
    } catch (error) {
      console.error("Mark as read error:", error);
      this.sendError(ws, "Failed to mark message as read");
    }
  }

  private handleDisconnect(ws: WebSocket) {
    const client = this.findClientByWs(ws);
    const socketId = (ws as any).socketId;
    
    if (client) {
      if (socketId) {
        connectionManager.removeConnection(socketId);
      } else {
        const connection = connectionManager.getConnectionByUserId(client.userId);
        if (connection) {
          connectionManager.removeConnection(connection.socketId);
        } else {
          storage.updateUserOnlineStatus(client.userId, false);
        }
      }
      
      this.clients.delete(client.userId);
    }
  }

  private findClientByWs(ws: WebSocket): ConnectedClient | undefined {
    const socketId = (ws as any).socketId;
    if (socketId) {
      const userId = connectionManager.getUserIdBySocketId(socketId);
      if (userId) {
        const connection = connectionManager.getConnectionByUserId(userId);
        if (connection && connection.socketType === 'websocket') {
          return {
            ws,
            userId,
            lastSeen: connection.authenticatedAt
          };
        }
      }
    }

    const onlineUsers = connectionManager.getOnlineUsers();
    for (const userId of onlineUsers) {
      const connections = connectionManager.getConnectionsByUserId(userId);
      for (const connection of connections) {
        if (connection.socketType === 'websocket' && connection.ws === ws) {
          return {
            ws,
            userId,
            lastSeen: connection.authenticatedAt
          };
        }
      }
    }

    for (const [userId, client] of Array.from(this.clients.entries())) {
      if (client.ws === ws) {
        return client;
      }
    }
    
    return undefined;
  }

  public sendToUser(userId: string, message: any): boolean {
    const sentCount = connectionManager.broadcastToUser(userId, message);
    if (sentCount > 0) {
      console.log(`📤 [WS] 推送成功(connectionManager): userId=${userId}, type=${message.type}, connections=${sentCount}`);
      return true;
    }

    const client = this.clients.get(userId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      this.send(client.ws, message);
      console.log(`📤 [WS] 推送成功(legacy): userId=${userId}, type=${message.type}`);
      return true;
    }
    
    console.warn(`⚠️ [WS] 用户不在线，无法推送: userId=${userId}, type=${message.type}`);
    return false;
  }

  private send(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.send(ws, {
      type: "error",
      message: error
    });
  }

  // 好友请求处理函数
  private async handleAcceptFriendRequest(ws: WebSocket, message: any) {
    const { friendId } = message;
    const client = this.findClientByWs(ws);

    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    if (!friendId) {
      this.sendError(ws, "Friend ID required");
      return;
    }

    try {
      await storage.acceptFriend(client.userId, friendId);
      
      // 通知好友请求被接受
      const currentUser = await storage.getUser(client.userId);
      if (currentUser) {
        this.sendToUser(friendId, {
          type: "friendRequestAccepted",
          friendUser: currentUser,
          timestamp: new Date().toISOString()
        });
      }
      
      // 发送成功确认给请求者
      this.send(ws, {
        type: "friendRequestAcceptSuccess",
        friendId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error("Accept friend request error:", error);
      this.sendError(ws, "Failed to accept friend request");
    }
  }

  // 发送好友请求通知的公共方法
  public sendFriendRequestNotification(toUserId: string, fromUser: any) {
    this.sendToUser(toUserId, {
      type: "newFriendRequest",
      fromUser,
      timestamp: new Date().toISOString()
    });
  }

  // 发送好友请求被接受通知的公共方法
  public sendFriendRequestAcceptedNotification(toUserId: string, acceptedByUser: any) {
    this.sendToUser(toUserId, {
      type: "friendRequestAccepted",
      friendUser: acceptedByUser,
      timestamp: new Date().toISOString()
    });
  }

  // ========== 语音/视频通话信令处理 ==========

  private async handleCallOffer(ws: WebSocket, message: any) {
    const payload = message.payload as VoiceCallOfferPayload;
    const client = this.findClientByWs(ws);

    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    console.log(`[Call] Offer from ${payload.fromUserId} to ${payload.toUserId}, type: ${payload.callType || 'voice'}`);

    const targetConnection = connectionManager.getConnectionByUserId(payload.toUserId);
    if (!targetConnection) {
      console.log(`[Call] Target ${payload.toUserId} is offline`);
      this.send(ws, {
        type: 'call-busy',
        payload: {
          callId: payload.callId,
          fromUserId: payload.toUserId,
          toUserId: payload.fromUserId,
          reason: 'offline',
        },
      });
      return;
    }

    this.sendToUser(payload.toUserId, {
      type: 'call-offer',
      payload: payload
    });
  }

  private async handleCallAnswer(ws: WebSocket, message: any) {
    const payload = message.payload as VoiceCallAnswerPayload;
    const client = this.findClientByWs(ws);

    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    console.log(`[Call] Answer from ${payload.fromUserId} to ${payload.toUserId}`);

    this.sendToUser(payload.toUserId, {
      type: 'call-answer',
      payload: payload
    });
  }

  private async handleCallIceCandidate(ws: WebSocket, message: any) {
    const payload = message.payload as VoiceCallIceCandidatePayload;
    const client = this.findClientByWs(ws);

    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    this.sendToUser(payload.toUserId, {
      type: 'call-ice-candidate',
      payload: payload
    });
  }

  private async handleCallEnd(ws: WebSocket, message: any) {
    const payload = message.payload as VoiceCallEndPayload;
    const client = this.findClientByWs(ws);

    if (!client) {
      this.sendError(ws, "Not authenticated");
      return;
    }

    console.log(`[Call] End from ${payload.fromUserId} to ${payload.toUserId}, reason: ${payload.reason}, type: ${message.type}`);

    // 保留原始消息类型以区分 reject/busy/end
    this.sendToUser(payload.toUserId, {
      type: message.type, // 保留 call-reject, call-busy, call-end 等原始类型
      payload: payload
    });
  }

  private async detectLanguage(text: string): Promise<string> {
    const { detectTextLanguage } = await import('./openai');
    const detected = detectTextLanguage(text);
    return detected === 'unknown' ? 'en' : detected;
  }

  public async prepareMessageWithTranslation(message: any, sender: any, recipientLanguage: string) {
    try {
      const { processMessageForRecipient } = await import('./message-processor');
      
      // 接收者语言偏好（必须有默认值），发送者语言允许undefined（依赖语言检测）
      const senderLanguage = sender?.languagePreference;
      const finalRecipientLanguage = recipientLanguage || 'en';
      
      // 位置消息特殊处理：翻译地址而不是URL
      if (message.messageType === 'location') {
        // 兼容新旧格式：优先 mediaMetadata，回退到 metadata
        const locationMeta = message.mediaMetadata ?? message.metadata ?? {};
        const address = locationMeta.address;
        
        // 检测是否仅为坐标格式（如 "25.0330, 121.5654" 或 "-33.8688, 151.2093"）
        // 仅当地址完全匹配 "数字, 数字" 格式时才跳过翻译
        const isOnlyCoordinates = address && /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(address.trim());
        
        // 如果有地址且不只是坐标，尝试翻译
        if (address && !isOnlyCoordinates) {
          const processed = await processMessageForRecipient(
            address,
            'text',
            finalRecipientLanguage,
            senderLanguage,
            message.originalLanguage
          );
          
          // 保留完整的 message 对象，保持原有的 metadata 和 mediaMetadata 字段
          return {
            ...message,
            fromUser: sender,
            originalText: address,
            translatedText: processed.translatedText || address,
            needsTranslation: processed.needsTranslation
          };
        }
        
        // 如果地址只是坐标，不需要翻译，保持原有 message 不变
        return {
          ...message,
          fromUser: sender,
          originalText: address || message.content,
          translatedText: address || message.content,
          needsTranslation: false
        };
      }
      
      // 使用统一的消息处理服务
      const processed = await processMessageForRecipient(
        message.content,
        message.messageType || 'text',
        finalRecipientLanguage,  // 使用带默认值的语言
        senderLanguage,          // 使用带默认值的语言
        message.originalLanguage
      );
      
      // 如果有翻译，保存到缓存
      if (processed.needsTranslation && processed.translatedText !== message.content) {
        await storage.saveTranslation({
          messageId: message.id,
          targetLanguage: recipientLanguage,
          messageType: "casual",
          translatedContent: processed.translatedText
        });
      }

      return {
        ...message,
        fromUser: sender,
        ...processed
      };
    } catch (error) {
      console.error("❌ 翻译准备失败:", error);
      return {
        ...message,
        fromUser: sender,
        originalText: message.content,
        translatedText: message.content,
        needsTranslation: false
      };
    }
  }

  async translateMessageContent(messageId: string, targetLanguage: string, messageType: "casual" | "business" | "social" = "casual") {
    try {
      // Check if translation already exists
      const existingTranslation = await storage.getTranslation(messageId, targetLanguage, messageType);
      if (existingTranslation) {
        return existingTranslation;
      }

      // Get message content directly from database
      const messageQuery = await db
        .select({
          message: messages,
          fromUser: users,
        })
        .from(messages)
        .innerJoin(users, eq(messages.fromUserId, users.id))
        .where(eq(messages.id, messageId))
        .limit(1);
      
      const message = messageQuery.length > 0 ? {
        ...messageQuery[0].message,
        fromUser: messageQuery[0].fromUser
      } : null;
      
      if (!message) {
        throw new Error("Message not found");
      }

      // Translate using OpenAI
      const translationResult = await translateMessage(message.content || '', targetLanguage, messageType);

      // Save translation
      const translation = await storage.saveTranslation({
        messageId,
        targetLanguage,
        messageType,
        translatedContent: translationResult.translatedText
      });

      return translation;
    } catch (error) {
      console.error("Translation error:", error);
      throw error;
    }
  }
}

export const websocketService = new WebSocketService();
