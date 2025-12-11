import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { websocketService } from "./services/websocket";
import { translateMessage, generateAIResponse, detectLanguage } from "./services/openai";
import { LineAuthService } from "./services/line-auth";
import { requireAuth } from "./middleware/auth";
import { requireGenderForVoice } from "./middleware/gender-check";
import { connectionManager } from "./realtime/auth";
import { 
  insertUserSchema, 
  insertFriendSchema, 
  insertGroupSchema, 
  insertMessageSchema,
  groups,
  groupMembers,
  messages,
  digitalHumans,
  userVoiceCapabilities
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { sendVerificationCode, verifyCode } from "./services/twilio";
import multer from "multer";
import path from "path";
import fs from "fs";

// 数字人工厂路由
import dhRoutes from "./modules/digital-humans/dh.routes";
// Weyland 储能顾问数字人路由
import weylandRoutes from "./modules/digital-humans/weyland-consultant/weyland.routes";
// 语音网关路由
import voiceRoutes from "./modules/voice/voice.routes";
// Trustalk 多租户平台路由
import { trustalkRoutes } from "./modules/trustalk";
// Trustalk 智能通讯录雷达系统 (Phase 4)
import trustalkPhase4Routes from "./modules/trustalk/trustalk.routes";
// TT Social 平台级用户关注关系
import { registerTtSocialRoutes } from "./modules/tt-social/ttSocial.routes";

// 导出LINE Webhook事件处理函数供index.ts调用
export async function handleLineWebhookEvents(webhookData: any) {
  const events = webhookData.events || [];
  
  for (const event of events) {
    try {
      if (event.type === 'follow') {
        await handleLineFollow(event);
      } else if (event.type === 'unfollow') {
        await handleLineUnfollow(event);
      } else if (event.type === 'message' && event.message.type === 'text') {
        await handleLineTextMessage(event);
      }
    } catch (error) {
      console.error('❌ Error handling LINE event:', error);
    }
  }
}

// LINE事件处理函数
async function handleLineFollow(event: any) {
  const lineUserId = event.source.userId;
  
  // 获取LINE用户资料
  const lineProfile = await getLineUserProfile(lineUserId);
  if (!lineProfile) {
    console.error('❌ 无法获取LINE用户资料');
    return;
  }
  
  // 在系统中创建或更新好友
  await upsertLineFriend(lineUserId, lineProfile);
}

async function handleLineUnfollow(event: any) {
  const lineUserId = event.source.userId;
  
  // 可以选择删除好友关系或标记为inactive
  // 这里暂时不做处理，保留历史记录
}

async function handleLineTextMessage(event: any) {
  const lineUserId = event.source.userId;
  const messageText = event.message.text;
  const messageId = event.message.id;
  
  
  // 确保用户存在
  const lineProfile = await getLineUserProfile(lineUserId);
  if (!lineProfile) {
    console.error('❌ 无法获取LINE用户资料');
    return;
  }
  
  const friendship = await upsertLineFriend(lineUserId, lineProfile);
  if (!friendship) {
    console.error('❌ 无法创建LINE好友关系');
    return;
  }
  
  // 检测消息的实际语言
  const { detectTextLanguage } = await import('./services/openai.js');
  const detectedLanguage = detectTextLanguage(messageText);
  
  // 保存消息到数据库，使用检测到的语言
  await storage.sendMessage({
    fromUserId: friendship.friendId,
    toUserId: friendship.userId,
    content: messageText,
    messageType: 'text',
    channel: 'line',
    originalLanguage: detectedLanguage !== 'unknown' ? detectedLanguage : (lineProfile.language || 'th')
  });
  
}

async function getLineUserProfile(lineUserId: string) {
  try {
    const channelAccessToken = process.env.LINE_MESSAGING_TOKEN;
    if (!channelAccessToken) {
      throw new Error('LINE_MESSAGING_TOKEN not configured');
    }
    
    const response = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
      headers: {
        'Authorization': `Bearer ${channelAccessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`LINE API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ 获取LINE用户资料失败:', error);
    return null;
  }
}

// 发送消息到LINE用户（带翻译支持，支持文本和图片）
export async function pushLineMessage(lineUserId: string, content: string, recipientLanguage?: string, messageType: string = 'text') {
  try {
    const channelAccessToken = process.env.LINE_MESSAGING_TOKEN;
    if (!channelAccessToken) {
      throw new Error('LINE_MESSAGING_TOKEN not configured');
    }
    
    let messages: any[] = [];
    
    if (messageType === 'image') {
      // 发送图片消息 - 使用完整签名URL（OSS bucket为私有，必须带签名）
      messages.push({
        type: 'image',
        originalContentUrl: content,  // 保留完整签名URL
        previewImageUrl: content
      });
    } else {
      // 发送文本消息（带翻译）
      const { detectTextLanguage, translateMessage } = await import('./services/openai.js');
      const detectedLanguage = detectTextLanguage(content);
      
      let finalMessageText = content;
      
      if (recipientLanguage && detectedLanguage !== 'unknown' && detectedLanguage !== recipientLanguage) {
        
        try {
          const translationResult = await translateMessage(content, recipientLanguage, 'casual');
          finalMessageText = `${translationResult.translatedText}\n${content}`;
        } catch (translateError) {
          console.error('❌ LINE消息翻译失败，仅发送原文:', translateError);
        }
      } else {
      }
      
      messages.push({
        type: 'text',
        text: finalMessageText
      });
    }
    
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: messages
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`LINE push message failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 发送LINE消息失败:', error);
    return false;
  }
}

async function upsertLineFriend(lineUserId: string, lineProfile: any) {
  try {
    // 确保系统管理员用户存在
    const SYSTEM_ADMIN_ID = 'admin-system';
    let systemAdmin = await storage.getUser(SYSTEM_ADMIN_ID);
    
    if (!systemAdmin) {
      // 如果不存在，直接使用SQL创建（因为需要指定id）
      const { users } = await import('@shared/schema');
      const [newAdmin] = await db.insert(users).values({
        id: SYSTEM_ADMIN_ID,
        username: 'system_admin',
        firstName: 'System Admin',
        languagePreference: 'zh'
      }).returning();
      systemAdmin = newAdmin;
    }
    
    // 查找是否已存在此LINE用户
    const existingFriend = await storage.findFriendByExternalId('line', lineUserId);
    
    if (existingFriend) {
      return existingFriend;
    }
    
    // 创建新的好友用户（代表LINE用户）
    const lineUser = await storage.createUser({
      username: `line_${lineUserId.substring(0, 8)}`,
      firstName: lineProfile.displayName || 'LINE用户',
      profileImageUrl: lineProfile.pictureUrl,
      languagePreference: lineProfile.language || 'ja'
    });
    
    // 创建好友关系
    const friendship = await storage.addFriendWithChannel({
      userId: SYSTEM_ADMIN_ID,
      friendId: lineUser.id,
      status: 'accepted',
      channel: 'line',
      externalUserId: lineUserId,
      externalPlatformName: lineProfile.displayName
    });
    
    return friendship;
  } catch (error) {
    console.error('❌ upsertLineFriend失败:', error);
    return null;
  }
}

// ========== WhatsApp Business API Integration ==========

// 导出WhatsApp Webhook事件处理函数供index.ts调用
export async function handleWhatsAppWebhookEvents(webhookData: any) {
  try {
    if (webhookData.object !== 'whatsapp_business_account') {
      return;
    }
    
    const entries = webhookData.entry || [];
    
    for (const entry of entries) {
      const changes = entry.changes || [];
      
      for (const change of changes) {
        if (change.field === 'messages') {
          const value = change.value;
          
          // 处理收到的消息
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              await handleWhatsAppMessage(message, value.contacts?.[0], value.metadata);
            }
          }
          
          // 可以处理消息状态更新（delivered, read等）
          if (value.statuses && value.statuses.length > 0) {
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ 处理WhatsApp webhook事件失败:', error);
  }
}

// 处理WhatsApp消息
async function handleWhatsAppMessage(message: any, contact: any, metadata: any) {
  try {
    const whatsappUserId = message.from; // WhatsApp phone number
    const messageText = message.text?.body;
    const messageId = message.id;
    const messageType = message.type;
    
    
    // 目前只处理文本消息
    if (messageType !== 'text' || !messageText) {
      return;
    }
    
    // 获取或创建WhatsApp用户
    const whatsappProfile = {
      name: contact?.profile?.name || `WhatsApp用户`,
      phone: whatsappUserId
    };
    
    const friendship = await upsertWhatsAppFriend(whatsappUserId, whatsappProfile);
    if (!friendship) {
      console.error('❌ 无法创建WhatsApp好友关系');
      return;
    }
    
    // 检测消息的实际语言
    const { detectTextLanguage } = await import('./services/openai.js');
    const detectedLanguage = detectTextLanguage(messageText);
    
    // 保存消息到数据库
    await storage.sendMessage({
      fromUserId: friendship.friendId,
      toUserId: friendship.userId,
      content: messageText,
      messageType: 'text',
      channel: 'whatsapp',
      originalLanguage: detectedLanguage !== 'unknown' ? detectedLanguage : 'en'
    });
    
  } catch (error) {
    console.error('❌ 处理WhatsApp消息失败:', error);
  }
}

// 创建或更新WhatsApp好友
async function upsertWhatsAppFriend(whatsappUserId: string, whatsappProfile: any) {
  try {
    // 确保系统管理员用户存在
    const SYSTEM_ADMIN_ID = 'admin-system';
    let systemAdmin = await storage.getUser(SYSTEM_ADMIN_ID);
    
    if (!systemAdmin) {
      const { users } = await import('@shared/schema');
      const [newAdmin] = await db.insert(users).values({
        id: SYSTEM_ADMIN_ID,
        username: 'system_admin',
        firstName: 'System Admin',
        languagePreference: 'zh'
      }).returning();
      systemAdmin = newAdmin;
    }
    
    // 查找是否已存在此WhatsApp用户
    const existingFriend = await storage.findFriendByExternalId('whatsapp', whatsappUserId);
    
    if (existingFriend) {
      return existingFriend;
    }
    
    // 创建新的好友用户（代表WhatsApp用户）
    const whatsappUser = await storage.createUser({
      username: `whatsapp_${whatsappUserId.substring(0, 8)}`,
      firstName: whatsappProfile.name || 'WhatsApp用户',
      languagePreference: 'en' // 默认英语，可以根据区号检测
    });
    
    // 创建好友关系
    const friendship = await storage.addFriendWithChannel({
      userId: SYSTEM_ADMIN_ID,
      friendId: whatsappUser.id,
      status: 'accepted',
      channel: 'whatsapp',
      externalUserId: whatsappUserId,
      externalPlatformName: whatsappProfile.name
    });
    
    return friendship;
  } catch (error) {
    console.error('❌ upsertWhatsAppFriend失败:', error);
    return null;
  }
}

// 发送消息到WhatsApp用户（带翻译支持，支持文本和图片）
export async function pushWhatsAppMessage(whatsappUserId: string, content: string, recipientLanguage?: string, messageType: string = 'text') {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      throw new Error('WhatsApp配置缺失: WHATSAPP_ACCESS_TOKEN 或 WHATSAPP_PHONE_NUMBER_ID 未设置');
    }
    
    let requestBody: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: whatsappUserId
    };
    
    if (messageType === 'image') {
      // 发送图片消息 - 使用完整签名URL（OSS bucket为私有，必须带签名）
      requestBody.type = 'image';
      requestBody.image = {
        link: content  // 保留完整签名URL
      };
    } else {
      // 发送文本消息（带翻译）
      const { detectTextLanguage, translateMessage } = await import('./services/openai.js');
      const detectedLanguage = detectTextLanguage(content);
      
      let finalMessageText = content;
      
      if (recipientLanguage && detectedLanguage !== 'unknown' && detectedLanguage !== recipientLanguage) {
        
        try {
          const translationResult = await translateMessage(content, recipientLanguage, 'casual');
          finalMessageText = `${translationResult.translatedText}\n${content}`;
        } catch (translateError) {
          console.error('❌ WhatsApp消息翻译失败，仅发送原文:', translateError);
        }
      } else {
      }
      
      requestBody.type = 'text';
      requestBody.text = {
        body: finalMessageText
      };
    }
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`WhatsApp push message failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    return true;
  } catch (error) {
    console.error('❌ 发送WhatsApp消息失败:', error);
    return false;
  }
}

// ========== Messenger Platform API Integration ==========

// 导出Messenger Webhook事件处理函数供index.ts调用
export async function handleMessengerWebhookEvents(webhookData: any) {
  try {
    if (webhookData.object !== 'page') {
      return;
    }
    
    const entries = webhookData.entry || [];
    
    for (const entry of entries) {
      const messaging = entry.messaging || [];
      
      for (const event of messaging) {
        // 处理收到的消息
        if (event.message && !event.message.is_echo) {
          await handleMessengerMessage(event);
        }
        
        // 可以处理postback事件（快捷回复按钮）
        if (event.postback) {
        }
      }
    }
  } catch (error) {
    console.error('❌ 处理Messenger webhook事件失败:', error);
  }
}

// 处理Messenger消息
async function handleMessengerMessage(event: any) {
  try {
    const messengerUserId = event.sender.id; // Messenger User PSID
    const messageText = event.message.text;
    const messageId = event.message.mid;
    
    
    // 目前只处理文本消息
    if (!messageText) {
      return;
    }
    
    // 获取或创建Messenger用户
    const messengerProfile = {
      id: messengerUserId,
      name: `Messenger用户`
    };
    
    const friendship = await upsertMessengerFriend(messengerUserId, messengerProfile);
    if (!friendship) {
      console.error('❌ 无法创建Messenger好友关系');
      return;
    }
    
    // 检测消息的实际语言
    const { detectTextLanguage } = await import('./services/openai.js');
    const detectedLanguage = detectTextLanguage(messageText);
    
    // 保存消息到数据库
    await storage.sendMessage({
      fromUserId: friendship.friendId,
      toUserId: friendship.userId,
      content: messageText,
      messageType: 'text',
      channel: 'messenger',
      originalLanguage: detectedLanguage !== 'unknown' ? detectedLanguage : 'en'
    });
    
  } catch (error) {
    console.error('❌ 处理Messenger消息失败:', error);
  }
}

// 创建或更新Messenger好友
async function upsertMessengerFriend(messengerUserId: string, messengerProfile: any) {
  try {
    // 确保系统管理员用户存在
    const SYSTEM_ADMIN_ID = 'admin-system';
    let systemAdmin = await storage.getUser(SYSTEM_ADMIN_ID);
    
    if (!systemAdmin) {
      const { users } = await import('@shared/schema');
      const [newAdmin] = await db.insert(users).values({
        id: SYSTEM_ADMIN_ID,
        username: 'system_admin',
        firstName: 'System Admin',
        languagePreference: 'zh'
      }).returning();
      systemAdmin = newAdmin;
    }
    
    // 查找是否已存在此Messenger用户
    const existingFriend = await storage.findFriendByExternalId('messenger', messengerUserId);
    
    if (existingFriend) {
      return existingFriend;
    }
    
    // 创建新的好友用户（代表Messenger用户）
    const messengerUser = await storage.createUser({
      username: `messenger_${messengerUserId.substring(0, 8)}`,
      firstName: messengerProfile.name || 'Messenger用户',
      languagePreference: 'en' // 默认英语
    });
    
    // 创建好友关系
    const friendship = await storage.addFriendWithChannel({
      userId: SYSTEM_ADMIN_ID,
      friendId: messengerUser.id,
      status: 'accepted',
      channel: 'messenger',
      externalUserId: messengerUserId,
      externalPlatformName: messengerProfile.name
    });
    
    return friendship;
  } catch (error) {
    console.error('❌ upsertMessengerFriend失败:', error);
    return null;
  }
}

// 发送消息到Messenger用户（带翻译支持，支持文本和图片）
export async function pushMessengerMessage(messengerUserId: string, content: string, recipientLanguage?: string, messageType: string = 'text') {
  try {
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
    
    if (!pageAccessToken) {
      throw new Error('Messenger配置缺失: FB_PAGE_ACCESS_TOKEN 未设置');
    }
    
    let messagePayload: any = {};
    
    if (messageType === 'image') {
      // 发送图片消息 - 使用完整签名URL（OSS bucket为私有，必须带签名）
      messagePayload = {
        attachment: {
          type: 'image',
          payload: {
            url: content,  // 保留完整签名URL
            is_reusable: true
          }
        }
      };
    } else {
      // 发送文本消息（带翻译）
      const { detectTextLanguage, translateMessage } = await import('./services/openai.js');
      const detectedLanguage = detectTextLanguage(content);
      
      let finalMessageText = content;
      
      if (recipientLanguage && detectedLanguage !== 'unknown' && detectedLanguage !== recipientLanguage) {
        
        try {
          const translationResult = await translateMessage(content, recipientLanguage, 'casual');
          finalMessageText = `${translationResult.translatedText}\n${content}`;
        } catch (translateError) {
          console.error('❌ Messenger消息翻译失败，仅发送原文:', translateError);
        }
      } else {
      }
      
      messagePayload = { text: finalMessageText };
    }
    
    const response = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: { id: messengerUserId },
        message: messagePayload
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Messenger push message failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    return true;
  } catch (error) {
    console.error('❌ 发送Messenger消息失败:', error);
    return false;
  }
}

// ========== Instagram Messaging API Integration ==========

// 导出Instagram Webhook事件处理函数供index.ts调用
export async function handleInstagramWebhookEvents(webhookData: any) {
  try {
    if (webhookData.object !== 'instagram') {
      return;
    }
    
    const entries = webhookData.entry || [];
    
    for (const entry of entries) {
      const messaging = entry.messaging || [];
      
      for (const event of messaging) {
        // 处理收到的消息
        if (event.message && !event.message.is_echo) {
          await handleInstagramMessage(event);
        }
        
        // 可以处理message_reactions事件
        if (event.reaction) {
        }
      }
    }
  } catch (error) {
    console.error('❌ 处理Instagram webhook事件失败:', error);
  }
}

// 处理Instagram消息
async function handleInstagramMessage(event: any) {
  try {
    const instagramUserId = event.sender.id; // Instagram-scoped User ID
    const messageText = event.message.text;
    const messageId = event.message.mid;
    
    
    // 目前只处理文本消息
    if (!messageText) {
      return;
    }
    
    // 获取或创建Instagram用户
    const instagramProfile = {
      id: instagramUserId,
      name: `Instagram用户`
    };
    
    const friendship = await upsertInstagramFriend(instagramUserId, instagramProfile);
    if (!friendship) {
      console.error('❌ 无法创建Instagram好友关系');
      return;
    }
    
    // 检测消息的实际语言
    const { detectTextLanguage } = await import('./services/openai.js');
    const detectedLanguage = detectTextLanguage(messageText);
    
    // 保存消息到数据库
    await storage.sendMessage({
      fromUserId: friendship.friendId,
      toUserId: friendship.userId,
      content: messageText,
      messageType: 'text',
      channel: 'igdm',
      originalLanguage: detectedLanguage !== 'unknown' ? detectedLanguage : 'en'
    });
    
  } catch (error) {
    console.error('❌ 处理Instagram消息失败:', error);
  }
}

// 创建或更新Instagram好友
async function upsertInstagramFriend(instagramUserId: string, instagramProfile: any) {
  try {
    // 确保系统管理员用户存在
    const SYSTEM_ADMIN_ID = 'admin-system';
    let systemAdmin = await storage.getUser(SYSTEM_ADMIN_ID);
    
    if (!systemAdmin) {
      const { users } = await import('@shared/schema');
      const [newAdmin] = await db.insert(users).values({
        id: SYSTEM_ADMIN_ID,
        username: 'system_admin',
        firstName: 'System Admin',
        languagePreference: 'zh'
      }).returning();
      systemAdmin = newAdmin;
    }
    
    // 查找是否已存在此Instagram用户
    const existingFriend = await storage.findFriendByExternalId('igdm', instagramUserId);
    
    if (existingFriend) {
      return existingFriend;
    }
    
    // 创建新的好友用户（代表Instagram用户）
    const instagramUser = await storage.createUser({
      username: `instagram_${instagramUserId.substring(0, 8)}`,
      firstName: instagramProfile.name || 'Instagram用户',
      languagePreference: 'en' // 默认英语
    });
    
    // 创建好友关系
    const friendship = await storage.addFriendWithChannel({
      userId: SYSTEM_ADMIN_ID,
      friendId: instagramUser.id,
      status: 'accepted',
      channel: 'igdm',
      externalUserId: instagramUserId,
      externalPlatformName: instagramProfile.name
    });
    
    return friendship;
  } catch (error) {
    console.error('❌ upsertInstagramFriend失败:', error);
    return null;
  }
}

// 发送消息到Instagram用户（带翻译支持，支持文本和图片）
export async function pushInstagramMessage(instagramUserId: string, content: string, recipientLanguage?: string, messageType: string = 'text') {
  try {
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
    
    if (!pageAccessToken) {
      throw new Error('Instagram配置缺失: FB_PAGE_ACCESS_TOKEN 未设置');
    }
    
    let messagePayload: any = {};
    
    if (messageType === 'image') {
      // 发送图片消息 - 使用完整签名URL（OSS bucket为私有，必须带签名）
      messagePayload = {
        attachment: {
          type: 'image',
          payload: {
            url: content,  // 保留完整签名URL
            is_reusable: true
          }
        }
      };
    } else {
      // 发送文本消息（带翻译）
      const { detectTextLanguage, translateMessage } = await import('./services/openai.js');
      const detectedLanguage = detectTextLanguage(content);
      
      let finalMessageText = content;
      
      if (recipientLanguage && detectedLanguage !== 'unknown' && detectedLanguage !== recipientLanguage) {
        
        try {
          const translationResult = await translateMessage(content, recipientLanguage, 'casual');
          finalMessageText = `${translationResult.translatedText}\n${content}`;
        } catch (translateError) {
          console.error('❌ Instagram消息翻译失败，仅发送原文:', translateError);
        }
      } else {
      }
      
      messagePayload = { text: finalMessageText };
    }
    
    const response = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: { id: instagramUserId },
        message: messagePayload
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Instagram push message failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    return true;
  } catch (error) {
    console.error('❌ 发送Instagram消息失败:', error);
    return false;
  }
}

// 共享的AI自动回复处理函数
async function triggerAIAutoReply(originalMessage: any, sender: any) {
  try {
    const { AI_ASSISTANT_ID, getRandomDelay } = await import('./constants/ai');
    
    // 延迟1-2秒让对话更自然
    setTimeout(async () => {
      try {
        // 🧠 获取最近的对话历史
        const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        try {
          const { messages: recentMessages } = await storage.getMessages(
            sender.id,
            AI_ASSISTANT_ID,
            false,
            { page: 1, limit: 20 } // 获取最近20条消息（10轮对话）
          );
          
          // 将消息转换为对话历史格式（按时间正序排列）
          recentMessages
            .reverse() // 从旧到新排序
            .forEach(msg => {
              const role = msg.fromUserId === sender.id ? 'user' : 'assistant';
              conversationHistory.push({
                role,
                content: msg.content
              });
            });
          
        } catch (error) {
          console.error("获取对话历史失败，使用空历史:", error);
        }
        
        const detectedLanguage = await detectLanguage(originalMessage.content);
        
        // 生成AI回复（包含对话历史）
        const aiResponseContent = await generateAIResponse(
          originalMessage.content, 
          sender?.firstName || "用户",
          conversationHistory
        );

        // 创建AI客服回复消息 (AI强制英文回复)
        const aiMessage = await storage.sendMessage({
          fromUserId: AI_ASSISTANT_ID,
          toUserId: sender.id,
          messageType: "text",
          content: aiResponseContent,
          originalLanguage: "en" // AI回复固定为英文
        });

        // 获取AI客服用户信息
        const aiUser = await storage.getUser(AI_ASSISTANT_ID);

        // ✅ AI回复始终翻译成用户的语言偏好设置
        const targetLanguage = sender.languagePreference || 'zh';
        

        // 发送AI回复给原发送者（带翻译）
        const translatedAiMessage = await websocketService.prepareMessageWithTranslation(
          aiMessage, aiUser!, targetLanguage
        );

        // ✅ 使用connectionManager推送（与语音消息保持一致）
        const { connectionManager } = await import('./realtime/auth');
        connectionManager.broadcastToUser(sender.id, {
          type: "newMessage",
          message: translatedAiMessage,
          chatId: AI_ASSISTANT_ID,
          chatType: 'friend'
        });
        

      } catch (innerError) {
        console.error("AI response generation failed:", innerError);
      }
    }, getRandomDelay()); // 使用正确的随机延迟

  } catch (error) {
    console.error("AI auto-reply trigger error:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize LINE Auth Service
  const lineAuth = new LineAuthService();

  // Initialize WebSocket
  websocketService.initialize(httpServer);

  // 注册数字人工厂路由模块
  app.use(dhRoutes);
  
  // 注册 Weyland 储能顾问数字人路由模块
  app.use(weylandRoutes);
  
  // 注册语音网关路由模块
  app.use(voiceRoutes);
  
  // 注册 Trustalk 多租户平台路由
  app.use('/api/trustalk', trustalkRoutes);
  
  // 注册 Trustalk 智能通讯录雷达系统路由 (Phase 4)
  app.use('/api/trustalk', trustalkPhase4Routes);
  
  // 注册 TT Social 平台级用户关注关系
  registerTtSocialRoutes(app);

  // 配置multer文件上传
  const voiceStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'voice');
      // 确保目录存在
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `voice-${Date.now()}-${nanoid(8)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const uploadVoice = multer({
    storage: voiceStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB限制
    fileFilter: (req, file, cb) => {
      // 只允许音频文件
      const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('只支持音频文件'));
      }
    }
  });

  // 图片上传配置
  const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `image-${Date.now()}-${nanoid(8)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const uploadImage = multer({
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB限制
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('只支持图片文件 (jpg, png, gif, webp)'));
      }
    }
  });

  // 通用文件上传配置
  const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'files');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `file-${Date.now()}-${nanoid(8)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });

  const uploadFile = multer({
    storage: fileStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB限制
    fileFilter: (req, file, cb) => {
      // 禁止可执行文件和脚本
      const blockedExtensions = /\.(exe|bat|cmd|sh|app|dmg|jar|js|vbs|ps1)$/i;
      const blockedMimes = [
        'application/x-msdownload',
        'application/x-executable',
        'application/x-sharedlib',
        'application/javascript'
      ];
      
      if (blockedExtensions.test(file.originalname) || blockedMimes.includes(file.mimetype)) {
        cb(new Error('不允许上传可执行文件'));
      } else {
        cb(null, true);
      }
    }
  });

  // LINE Authentication routes
  app.get("/auth/line", async (req, res) => {
    try {
      // 保存前端检测的语言偏好到session
      const lang = req.query.lang as string;
      if (lang && ['zh', 'en', 'th', 'ja', 'id', 'es', 'fr', 'ar', 'hi', 'de', 'ru', 'pt'].includes(lang)) {
        req.session.pendingLanguage = lang;
      }
      
      // 保存重定向URL到session（用于登录后返回原页面）
      const redirectUrl = req.query.redirect as string;
      if (redirectUrl) {
        req.session.loginRedirectUrl = redirectUrl;
      }
      
      const { url, state } = await lineAuth.getAuthUrl(req);
      res.redirect(url);
    } catch (error) {
      console.error("LINE auth error:", error);
      res.redirect('/?error=auth_failed');
    }
  });

  app.get("/auth/line/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      // 诊断日志：检查 session 和 cookies
      console.log('🔍 [LINE Callback] 诊断信息:', {
        sessionID: req.sessionID,
        sessionExists: !!req.session,
        cookies: req.headers.cookie,
        oauthStateExists: !!req.session?.oauthState,
        receivedState: state
      });
      
      if (error) {
        console.error('LINE auth error:', error);
        return res.redirect('/?error=line_auth_error');
      }
      
      if (!code || !state) {
        console.error('Missing parameters:', { code: !!code, state: !!state });
        return res.redirect('/?error=missing_parameters');
      }
      
      // Verify state parameter against session
      if (!req.session.oauthState || req.session.oauthState !== state) {
        console.error('State verification failed:', {
          hasStoredState: !!req.session.oauthState,
          storedState: req.session.oauthState,
          receivedState: state,
          match: req.session.oauthState === state
        });
        return res.redirect('/?error=invalid_state');
      }
      
      // Exchange code for tokens
      const tokens = await lineAuth.getTokens(code as string);
      
      // Get user profile
      const profile = await lineAuth.getProfile(tokens.access_token);
      
      // 获取session中的语言偏好（如果有）
      const languagePreference = req.session.pendingLanguage;
      
      // Create or update user in database
      const user = await storage.createOrUpdateLineUser(profile.userId, profile, languagePreference);
      
      // Store user in session securely
      req.session.userId = user.id;
      req.session.authenticated = true;
      delete (req.session as any).loggedOut; // Clear logged out flag
      
      // 获取保存的重定向URL
      const savedRedirectUrl = req.session.loginRedirectUrl;
      
      // Clear OAuth state
      delete req.session.oauthState;
      delete req.session.oauthNonce;
      delete req.session.pendingLanguage;
      delete req.session.loginRedirectUrl;
      
      // 强制保存session再重定向（防止手机端session丢失）
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save failed after LINE login:', err);
          return res.redirect('/?error=session_save_failed');
        }
        
        // 重定向到原来的页面或默认首页
        const redirectTo = savedRedirectUrl || '/?login=success';
        res.redirect(redirectTo);
      });
      
    } catch (error) {
      console.error("LINE callback error:", error);
      res.redirect('/?error=auth_failed');
    }
  });

  // 测试登录页面的特殊路由 - 清除认证状态
  app.get("/test-login", (req, res) => {
    // 清除所有认证相关的session数据
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.clearCookie('connect.sid');
      // 重定向到主页，带上test_login参数来跳过自动认证
      res.redirect('/?test_login=true');
    });
  });

  // Phone verification routes
  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      // 验证手机号格式 (E.164 format)
      if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
        return res.status(400).json({ message: "Invalid phone number format. Use E.164 format (e.g., +66812345678)" });
      }
      
      await sendVerificationCode(phoneNumber);
      res.json({ success: true, message: "Verification code sent" });
    } catch (error) {
      console.error("Send verification code error:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // 语音文件上传和处理路由（上传到OSS）
  app.post("/api/upload/voice", requireAuth, requireGenderForVoice, uploadVoice.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      // 读取上传的文件
      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      
      // 上传到OSS
      const { uploadToOSS, generateSignedUrl } = await import('./services/oss');
      const { ossPath } = await uploadToOSS(
        fileBuffer, 
        'voices', 
        req.file.filename
      );
      
      // 生成签名URL（30天有效期）
      const audioUrl = await generateSignedUrl(ossPath, 2592000);
      
      // 删除本地临时文件
      fs.unlinkSync(req.file.path);
      

      res.json({ 
        success: true, 
        audioUrl,
        filename: req.file.filename,
        size: req.file.size,
        ossPath
      });
    } catch (error) {
      console.error("Voice upload error:", error);
      res.status(500).json({ message: "Failed to upload voice file" });
    }
  });

  // 通用音频上传路由（无性别验证，用于LINE等外部平台语音消息）
  app.post("/api/upload/audio", requireAuth, uploadVoice.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No audio file uploaded" });
      }

      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      
      const { uploadToOSS, generateSignedUrl } = await import('./services/oss');
      const { ossPath } = await uploadToOSS(
        fileBuffer, 
        'voices', 
        req.file.filename
      );
      
      const audioUrl = await generateSignedUrl(ossPath, 2592000);
      
      fs.unlinkSync(req.file.path);

      res.json({ 
        success: true, 
        audioUrl,
        filename: req.file.filename,
        size: req.file.size,
        ossPath
      });
    } catch (error) {
      console.error("Audio upload error:", error);
      res.status(500).json({ success: false, message: "Failed to upload audio file" });
    }
  });

  // 图片上传路由 - 支持缩略图+全尺寸双文件上传
  app.post("/api/upload/image", requireAuth, uploadImage.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'full', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files || (!files.thumbnail && !files.full)) {
        return res.status(400).json({ message: "No image files uploaded" });
      }

      const fs = await import('fs');
      const { uploadToOSS, generateSignedUrl } = await import('./services/oss');
      
      const result: any = { success: true };
      
      // 处理缩略图上传
      if (files.thumbnail && files.thumbnail[0]) {
        const thumbnailFile = files.thumbnail[0];
        const thumbnailBuffer = fs.readFileSync(thumbnailFile.path);
        
        const { ossPath: thumbnailOssPath } = await uploadToOSS(
          thumbnailBuffer,
          'images',
          `thumbnails/${thumbnailFile.filename}`
        );
        
        result.thumbnailUrl = await generateSignedUrl(thumbnailOssPath, 2592000);
        result.thumbnailKey = thumbnailOssPath;
        result.thumbnailSize = thumbnailFile.size;
        
        fs.unlinkSync(thumbnailFile.path);
        
      }
      
      // 处理全尺寸图片上传
      if (files.full && files.full[0]) {
        const fullFile = files.full[0];
        const fullBuffer = fs.readFileSync(fullFile.path);
        
        const { ossPath: fullOssPath } = await uploadToOSS(
          fullBuffer,
          'images',
          `full/${fullFile.filename}`
        );
        
        result.fullUrl = await generateSignedUrl(fullOssPath, 2592000);
        result.fullKey = fullOssPath;
        result.fullSize = fullFile.size;
        
        fs.unlinkSync(fullFile.path);
        
      }

      res.json(result);
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: "Failed to upload image files" });
    }
  });

  // 通用文件上传路由
  app.post("/api/upload/file", requireAuth, uploadFile.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fs = await import('fs');
      const fileBuffer = fs.readFileSync(req.file.path);
      
      // 上传到OSS
      const { uploadToOSS, generateSignedUrl } = await import('./services/oss');
      const { ossPath } = await uploadToOSS(
        fileBuffer, 
        'files', 
        req.file.filename
      );
      
      // 生成签名URL（30天有效期）
      const fileUrl = await generateSignedUrl(ossPath, 2592000);
      
      // 删除本地临时文件
      fs.unlinkSync(req.file.path);
      

      res.json({ 
        success: true, 
        url: fileUrl,
        fileUrl,
        filename: req.file.filename,
        size: req.file.size,
        ossPath
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // 语音翻译聊天 - STT → 翻译 → TTS
  app.post("/api/voice-translation-chat", requireAuth, requireGenderForVoice, uploadVoice.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      const { targetUserId, groupId, targetLanguage } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 获取发送者信息
      const sender = await storage.getUser(userId);
      if (!sender) {
        return res.status(404).json({ message: "User not found" });
      }

      // 获取接收者信息以确定目标语言
      let receiverLanguage = targetLanguage;

      if (!receiverLanguage) {
        if (groupId) {
          // 群聊：使用默认语言
          receiverLanguage = 'zh';
        } else if (targetUserId) {
          // 单聊：获取接收者的语言偏好
          const receiver = await storage.getUser(targetUserId);
          receiverLanguage = receiver?.languagePreference || 'zh';
        }
      }

      // 根据性别选择voice（男声用Dylan，女声用Cherry）
      const voiceName = sender.gender === 'male' ? 'Dylan' : 'Cherry';

      // 转换语言代码为DashScope格式
      const languageMap: Record<string, string> = {
        'zh': 'Chinese',
        'en': 'English',
        'ja': 'Japanese',
        'ko': 'Korean',
        'th': 'English',
        'id': 'English',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'es': 'Spanish',
        'fr': 'French',
        'ru': 'Russian'
      };
      const ttsLanguage = languageMap[receiverLanguage] || 'Chinese';

      const fs = await import('fs');
      const path = await import('path');
      
      // Step 1: STT - 语音转文字（自动检测语言）
      const { speechToText } = await import('./services/dashscope-speech');
      const transcript = await speechToText(req.file.path, 'auto');

      // Step 2: 翻译文字
      const translationResult = await translateMessage(transcript.text, receiverLanguage, 'casual');

      // Step 3: TTS - 文字转语音（使用发送者的性别音色）
      const { textToSpeech } = await import('./services/dashscope-speech');
      const ttsResult = await textToSpeech(translationResult.translatedText, ttsLanguage, voiceName);

      // Step 4: 保存并上传原始音频
      const originalBuffer = fs.readFileSync(req.file.path);
      const { uploadToOSS, generateSignedUrl } = await import('./services/oss');
      const { ossPath: originalOssPath } = await uploadToOSS(
        originalBuffer,
        'voices',
        req.file.filename
      );
      const originalAudioUrl = await generateSignedUrl(originalOssPath, 2592000);

      // TTS已经返回了OSS URL，直接使用
      const translatedAudioUrl = ttsResult.audioUrl;

      // 删除本地临时文件
      fs.unlinkSync(req.file.path);

      // Step 5: 保存消息到数据库
      const message = await storage.sendMessage({
        fromUserId: userId,
        toUserId: targetUserId || null,
        groupId: groupId || null,
        messageType: 'audio',
        modality: 'voice',
        content: originalAudioUrl,
        originalText: transcript.text,
        originalAudioUrl: originalAudioUrl,
        transcript: transcript.text,
        ttsAudioUrl: translatedAudioUrl,
        translations: {
          [receiverLanguage]: {
            text: translationResult.translatedText,
            ttsUrl: translatedAudioUrl
          }
        },
        channel: 'mytalk'
      });

      // Step 6: 通过WebSocket发送消息
      if (targetUserId) {
        connectionManager.broadcastToUser(targetUserId, {
          type: 'new_message',
          data: message
        });
      } else if (groupId) {
        connectionManager.broadcastToGroup(groupId, {
          type: 'new_message',
          data: message
        });
      }

      res.json({
        success: true,
        message,
        transcript,
        translatedText: translationResult.translatedText,
        originalAudioUrl,
        translatedAudioUrl,
        senderLanguage: sender.languagePreference,
        targetLanguage: receiverLanguage
      });
    } catch (error: any) {
      console.error("Voice translation chat error:", error);
      // 清理临时文件
      if (req.file) {
        try {
          const fs = await import('fs');
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      res.status(500).json({ message: error.message || "Failed to process voice translation" });
    }
  });

  // 语音转文字 - 只做STT，不发送消息（用于语音输入功能）
  app.post("/api/voice-to-text", requireAuth, uploadVoice.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 获取用户信息以确定语言偏好
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fs = await import('fs');
      
      // STT - 语音转文字（始终使用自动语言检测）
      // 用户说什么语言就识别什么语言
      const { speechToText } = await import('./services/dashscope-speech');
      const transcript = await speechToText(req.file.path, 'auto');

      // 删除本地临时文件
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        text: transcript.text,
        language: transcript.language || user.languagePreference
      });
    } catch (error: any) {
      console.error("Voice to text error:", error);
      // 清理临时文件
      if (req.file) {
        try {
          const fs = await import('fs');
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      res.status(500).json({ message: error.message || "Failed to convert voice to text" });
    }
  });

  // 语音输入发送 - 同步处理：等待STT完成后返回消息
  app.post("/api/voice-input-send", requireAuth, uploadVoice.single('audio'), async (req, res) => {
    const fs = await import('fs');
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      const { targetUserId, groupId } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const sender = await storage.getUser(userId);
      if (!sender) {
        return res.status(404).json({ message: "User not found" });
      }

      const audioPath = req.file.path;

      // Step 1: STT - 语音转文字（同步等待）
      // 重要：语音输入使用自动语言检测，不使用用户设置的语言
      // 用户说什么语言就识别什么语言，发送原文
      console.log(`🎤 [STT] 用户${userId}的语音识别开始（自动检测语言）...`);
      const { speechToText } = await import('./services/dashscope-speech');
      const transcript = await speechToText(audioPath, 'auto');
      console.log(`✅ [STT完成] ${transcript.text.substring(0, 50)}...`);

      // 删除临时文件
      fs.unlinkSync(audioPath);

      // Step 2: 创建消息
      const message = await storage.sendMessage({
        fromUserId: userId,
        toUserId: targetUserId || null,
        groupId: groupId || null,
        content: transcript.text,
        messageType: 'text',
        translations: {},
        channel: 'mytalk'
      });

      // Step 3: 返回成功响应（包含消息）
      res.json({
        success: true,
        message: message,
        text: transcript.text
      });

      // Step 4: 异步处理翻译和推送（不阻塞响应）
      setImmediate(async () => {
        try {
          // 检查是否发给AI助理或数字人
          const { AI_ASSISTANT_ID } = await import('./constants/ai');
          if (targetUserId === AI_ASSISTANT_ID) {
            await triggerAIAutoReply(message, sender);
          } else if (targetUserId && targetUserId.startsWith('dh-')) {
            const { dhEngine } = await import('./services/dh-engine');
            await dhEngine.chat({ userId, humanId: targetUserId, message: transcript.text });
          }

          // 推送给接收者（翻译后）
          if (targetUserId && targetUserId !== AI_ASSISTANT_ID && !targetUserId.startsWith('dh-')) {
            const receiver = await storage.getUser(targetUserId);
            const receiverLanguage = receiver?.languagePreference || 'zh';
            const translationResult = await translateMessage(transcript.text, receiverLanguage, 'casual');
            await storage.updateMessageTranslation(message.id, receiverLanguage, translationResult.translatedText);
            
            websocketService.sendToUser(targetUserId, {
              type: 'newMessage',
              message: { ...message, content: translationResult.translatedText, fromUser: sender },
              chatId: userId,
              chatType: 'friend'
            });
          }

          // 群聊推送
          if (groupId) {
            const groupMembers = await storage.getGroupMembers(groupId);
            for (const member of groupMembers) {
              if (member.id !== userId) {
                websocketService.sendToUser(member.id, {
                  type: 'newMessage',
                  message: { ...message, fromUser: sender },
                  chatId: groupId,
                  chatType: 'group'
                });
              }
            }
          }
        } catch (error) {
          console.error('❌ [异步处理失败]', error);
        }
      });

    } catch (error: any) {
      console.error("Voice input send error:", error);
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ message: error.message || "语音识别失败，请重试" });
    }
  });

  // 语音对话发送 - 发送者立即显示原语音，后台异步翻译推送给接收者
  app.post("/api/voice-chat-send", requireAuth, uploadVoice.single('audio'), async (req, res) => {
    const fs = await import('fs');
    
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No audio file uploaded" });
      }

      const { targetUserId, groupId, duration } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // 检查用户语音能力
      const [userVoiceCap] = await db
        .select()
        .from(userVoiceCapabilities)
        .where(
          and(
            eq(userVoiceCapabilities.userId, userId),
            eq(userVoiceCapabilities.capabilityType, "voice_chat"),
            eq(userVoiceCapabilities.isActive, true)
          )
        )
        .limit(1);

      if (!userVoiceCap) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ 
          success: false,
          message: "语音对话能力未激活",
          code: "NO_VOICE_CAPABILITY"
        });
      }

      // 检查能力是否过期
      if (userVoiceCap.expiresAt && new Date(userVoiceCap.expiresAt) < new Date()) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ 
          success: false,
          message: "语音对话能力已过期",
          code: "VOICE_EXPIRED"
        });
      }

      const sender = await storage.getUser(userId);
      if (!sender) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const audioPath = req.file.path;
      const audioDuration = parseInt(duration) || 0;
      console.log(`🎤 [语音对话] 用户 ${userId} -> ${targetUserId}, 时长: ${audioDuration}s`);

      // ========== 同步部分：立即返回给发送者 ==========
      
      // Step 1: 上传原始语音到OSS
      const { uploadToOSS } = await import('./services/oss');
      const audioBuffer = fs.readFileSync(audioPath);
      const ossResult = await uploadToOSS(audioBuffer, 'voices', `voice-chat-${Date.now()}.webm`);
      console.log(`✅ [原语音上传完成] ${ossResult.url}`);

      // Step 2: 创建消息记录（只包含原语音，标记为处理中）
      const message = await storage.sendMessage({
        fromUserId: userId,
        toUserId: targetUserId || null,
        groupId: groupId || null,
        content: '', // 原文稍后由STT填充
        messageType: 'audio',
        mediaUrl: ossResult.url,
        mediaDuration: audioDuration,
        mediaMetadata: { 
          voiceChatStatus: 'processing',
          originalDuration: audioDuration
        },
        channel: 'mytalk'
      });

      // Step 3: 立即返回给发送者（不用等翻译）
      console.log(`📤 [返回消息] id=${message.id}, mediaDuration=${message.mediaDuration}, mediaUrl存在=${!!message.mediaUrl}`);
      res.json({
        success: true,
        message: message
      });

      // 清理临时文件（在返回响应后）
      fs.unlinkSync(audioPath);

      // ========== 异步部分：后台翻译并推送给接收者 ==========
      setImmediate(async () => {
        try {
          // 获取接收者信息
          let targetLanguage = 'zh';
          let receiver = null;
          if (targetUserId) {
            receiver = await storage.getUser(targetUserId);
            targetLanguage = receiver?.languagePreference || 'zh';
          }
          console.log(`🔄 [异步处理] 目标语言: ${targetLanguage}`);

          // Step A: 从OSS下载语音进行STT
          const { speechToText, textToSpeech, mapLanguageToDashScope } = await import('./services/dashscope-speech');
          const sttResult = await speechToText(ossResult.url, 'auto');
          console.log(`✅ [STT完成] ${sttResult.text?.substring(0, 50) || '(空)'}...`);

          if (!sttResult.text) {
            console.error('❌ STT识别失败');
            return;
          }

          // Step B: 翻译
          let translatedText = sttResult.text;
          const senderLanguage = sender.languagePreference || 'zh';
          const needsTranslation = senderLanguage !== targetLanguage;
          
          if (needsTranslation) {
            console.log(`🌐 [翻译中] ${senderLanguage} -> ${targetLanguage}`);
            const translationResult = await translateMessage(sttResult.text, targetLanguage, 'casual');
            translatedText = translationResult.translatedText;
            console.log(`✅ [翻译完成] ${translatedText.substring(0, 50)}...`);
          }

          // Step C: TTS生成翻译语音
          console.log(`🔊 [TTS中] 生成 ${targetLanguage} 语音...`);
          const ttsLanguage = mapLanguageToDashScope(targetLanguage);
          const ttsResult = await textToSpeech(translatedText, ttsLanguage);
          console.log(`✅ [TTS完成] ${ttsResult.audioUrl}`);

          // Step D: 更新消息记录
          await storage.updateMessageVoiceProcessing(message.id, {
            transcript: sttResult.text,
            translatedTranscript: translatedText,
            ttsAudioUrl: ttsResult.audioUrl,
            processingStatus: 'ready'
          });

          // Step E: 推送给接收者（翻译后的语音）
          // 语音消息只显示语音卡片，不显示文本！
          if (targetUserId) {
            websocketService.sendToUser(targetUserId, {
              type: 'newMessage',
              message: { 
                ...message,
                // 语音消息必须的字段
                mediaUrl: ossResult.url, // 原语音URL
                mediaDuration: audioDuration, // 语音时长
                ttsAudioUrl: ttsResult.audioUrl, // 翻译后TTS语音URL
                // 元数据用于长按查看原文
                transcript: sttResult.text, // 原文（长按查看）
                translatedTranscript: translatedText, // 译文（长按查看）
                processingStatus: 'ready',
                fromUser: sender
              },
              chatId: userId,
              chatType: 'friend'
            });
            console.log(`✅ [推送完成] 接收者 ${targetUserId} 已收到翻译语音`);
          }

          // Step F: 也通知发送者消息已处理完成（更新transcript）
          websocketService.sendToUser(userId, {
            type: 'voiceProcessed',
            messageId: message.id,
            transcript: sttResult.text
          });

        } catch (error) {
          console.error('❌ [语音对话异步处理失败]:', error);
        }
      });

    } catch (error: any) {
      console.error("❌ 语音对话发送失败:", error);
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      res.status(500).json({ success: false, message: error.message || "语音对话失败，请重试" });
    }
  });

  app.post("/api/auth/verify-code", async (req, res) => {
    try {
      const { phoneNumber, code, languagePreference } = req.body;
      
      if (!phoneNumber || !code) {
        return res.status(400).json({ message: "Phone number and code are required" });
      }
      
      const isValid = verifyCode(phoneNumber, code);
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }
      
      // 查找或创建用户
      let user = await storage.getUserByPhone(phoneNumber);
      
      if (!user) {
        // 创建新用户 - 使用前端检测的语言或默认英文
        const username = `user_${nanoid(8)}`;
        user = await storage.createUser({
          username,
          phoneNumber,
          languagePreference: languagePreference || "en"
        });
      }
      
      // 设置session并强制保存
      req.session.userId = user.id;
      req.session.authenticated = true;
      delete (req.session as any).loggedOut; // Clear logged out flag
      
      // 强制保存session（防止手机端session丢失）
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save failed after phone verification:', err);
          return res.status(500).json({ message: "Session save failed" });
        }
        
        res.json({ 
          success: true, 
          user: {
            id: user.id,
            username: user.username,
            phoneNumber: user.phoneNumber,
            languagePreference: user.languagePreference
          }
        });
      });
    } catch (error) {
      console.error("Verify code error:", error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // User routes  
  app.get("/api/users/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // 获取用户所属的企业组织
      const userOrgs = await storage.getUserOrganizations(req.userId!);
      
      // 构建 availableIdentities
      const availableIdentities = [
        // 个人身份（始终存在）
        { type: "personal" },
        // 企业身份
        ...userOrgs.map(membership => ({
          type: "enterprise" as const,
          orgId: membership.org.id,
          orgName: membership.org.name,
          orgType: membership.org.type, // 添加组织类型
          role: membership.role,
          title: membership.title,
        }))
      ];

      // 从 session 中获取当前选中的企业ID（如果有）
      const currentOrgId = (req.session as any).currentOrgId || null;

      // 根据 session 中的 currentOrgId 动态确定当前激活的身份类型
      const activeAccountType = currentOrgId ? "enterprise" : "personal";
      
      // 查找当前激活的组织类型（用于前端区分企业客服 vs 自媒体账号）
      const currentOrg = userOrgs.find(m => m.org.id === currentOrgId);
      const currentOrgType = currentOrg?.org.type || null;

      // 返回统一的账号信息结构
      res.json({
        // 保留原有字段以保持兼容性（先扩展，再覆盖）
        ...user,
        // 新的统一账号信息结构（会覆盖 user.accountType）
        userId: user.id,
        accountType: activeAccountType, // 动态返回当前激活的身份类型
        profile: {
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          languagePreference: user.languagePreference,
          gender: user.gender,
        },
        availableIdentities,
        currentOrgId,
        currentOrgType, // 添加当前组织类型
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Search users route - MUST be before /api/users/:userId to avoid matching "search" as userId
  app.get("/api/users/search", requireAuth, async (req, res) => {
    const { query } = req.query;
    const userId = req.userId!; // Use authenticated user ID
    
    if (!query) {
      return res.status(400).json({ message: "Search query required" });
    }
    
    try {
      const searchResults = await storage.searchUsers(query as string, userId as string);
      if (searchResults.length > 0) {
      }
      res.json(searchResults);
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Get user by ID or username (public - for user cards)
  app.get("/api/users/:identifier", async (req, res) => {
    try {
      const { identifier } = req.params;
      // Try to find by ID first, then by username
      let user = await storage.getUser(identifier);
      if (!user) {
        user = await storage.getUserByUsername(identifier);
      }
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Return public user info only
      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl
      });
    } catch (error) {
      console.error("Get user by ID error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Switch to enterprise identity
  app.post("/api/users/switch-org", requireAuth, async (req, res) => {
    try {
      const { orgId } = req.body;
      
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      // 验证用户是否是该企业的成员
      const userOrgs = await storage.getUserOrganizations(req.userId!);
      const targetOrg = userOrgs.find(membership => membership.org.id === orgId);

      if (!targetOrg) {
        return res.status(403).json({ message: "You are not a member of this organization" });
      }

      // 在 session 中设置当前企业ID
      (req.session as any).currentOrgId = orgId;
      
      // 保存 session
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });

      res.json({ 
        success: true, 
        currentOrgId: orgId,
        orgName: targetOrg.org.name,
        role: targetOrg.role
      });
    } catch (error) {
      console.error("Switch organization error:", error);
      res.status(500).json({ message: "Failed to switch organization" });
    }
  });

  // Switch back to personal identity
  app.post("/api/users/switch-personal", requireAuth, async (req, res) => {
    try {
      // 清除 session 中的企业ID
      delete (req.session as any).currentOrgId;
      
      // 保存 session
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });

      res.json({ 
        success: true, 
        currentOrgId: null 
      });
    } catch (error) {
      console.error("Switch to personal error:", error);
      res.status(500).json({ message: "Failed to switch to personal" });
    }
  });

  // External accounts status endpoint
  app.get("/api/external-accounts/status", requireAuth, async (req, res) => {
    try {
      const accounts = {
        line: {
          connected: !!(process.env.LINE_MESSAGING_TOKEN && process.env.LINE_MESSAGING_SECRET),
          webhookConfigured: !!process.env.LINE_MESSAGING_SECRET,
          canSendMessages: !!process.env.LINE_MESSAGING_TOKEN,
          accountName: process.env.LINE_MESSAGING_TOKEN ? 'Mybaby OA' : null
        },
        whatsapp: {
          connected: false
        },
        wechat: {
          connected: false
        },
        instagram: {
          connected: false
        },
        messenger: {
          connected: false
        },
        telegram: {
          connected: false
        },
        viber: {
          connected: false
        }
      };
      
      res.json(accounts);
    } catch (error) {
      console.error("Get external accounts status error:", error);
      res.status(500).json({ message: "Failed to get external accounts status" });
    }
  });

  // WebSocket token endpoint - now sets HttpOnly cookie for security
  app.post("/api/auth/websocket-token", requireAuth, async (req, res) => {
    try {
      const { authService } = await import('./realtime/auth');
      const token = authService.generateToken(req.userId!, req.session.id);
      
      // Set HttpOnly cookie instead of returning JSON
      res.cookie('realtime_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (same as JWT expiration)
        sameSite: 'lax'
      });
      
      res.json({ success: true, message: 'WebSocket authentication cookie set' });
    } catch (error) {
      console.error("WebSocket token generation error:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Public Digital Human info API (for follow page)
  app.get("/api/digital-humans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Only return digital humans (IDs starting with "dh-")
      if (!id.startsWith('dh-')) {
        return res.status(404).json({ message: "Digital human not found" });
      }
      
      const dh = await db.select().from(digitalHumans).where(eq(digitalHumans.id, id)).limit(1);
      
      if (!dh || dh.length === 0) {
        return res.status(404).json({ message: "Digital human not found" });
      }
      
      const digitalHuman = dh[0];
      
      // Return public info only
      res.json({
        id: digitalHuman.id,
        name: digitalHuman.name,
        humanType: digitalHuman.humanType,
        description: digitalHuman.description,
        avatarUrl: digitalHuman.avatarUrl,
        isActive: digitalHuman.isActive,
      });
    } catch (error) {
      console.error("Get digital human error:", error);
      res.status(500).json({ message: "Failed to get digital human" });
    }
  });

  // Friends routes
  app.get("/api/friends", requireAuth, async (req, res) => {
    try {
      // 🔔 使用统一方法：返回accepted好友 + incoming pending请求
      const contacts = await storage.getContactsForChatList(req.userId!);
      
      res.json(contacts);
    } catch (error) {
      console.error("Get friends error:", error);
      res.status(500).json({ message: "Failed to get friends" });
    }
  });

  app.post("/api/friends", requireAuth, async (req, res) => {
    try {
      const { friendId, friendUsername } = req.body;
      const userId = req.userId!; // Use authenticated user ID
      
      
      let targetFriendId = friendId;
      
      // If friendUsername is provided, look up the user by username or broader search
      if (!targetFriendId && friendUsername) {
        // First try exact username match
        let targetUser = await storage.getUserByUsername(friendUsername);
        
        // If not found, try broader search (same as search endpoint)
        if (!targetUser) {
          const searchResults = await storage.searchUsers(friendUsername, userId);
          if (searchResults.length > 0) {
            targetUser = searchResults[0]; // Take first match
          }
        }
        
        if (!targetUser) {
          return res.status(404).json({ message: "User not found" });
        }
        targetFriendId = targetUser.id;
      }
      
      if (!targetFriendId) {
        return res.status(400).json({ message: "Friend ID or username required" });
      }
      
      // Validate that friend exists
      const targetUser = await storage.getUser(targetFriendId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if trying to add self
      if (userId === targetFriendId) {
        return res.status(400).json({ message: "Cannot add yourself as friend" });
      }
      
      // Check if already friends
      const existingFriendship = await storage.getFriendship(userId, targetFriendId);
      const reverseFriendship = await storage.getFriendship(targetFriendId, userId);
      
      if ((existingFriendship && existingFriendship.status === 'accepted') || 
          (reverseFriendship && reverseFriendship.status === 'accepted')) {
        return res.status(400).json({ message: "已经是好友了" });
      }
      
      // If already sent request, show friendly message
      if (existingFriendship && existingFriendship.status === 'pending') {
        return res.json({ message: "好友请求已发送，等待对方回应" });
      }
      
      // If they sent you a request, suggest accepting it
      if (reverseFriendship && reverseFriendship.status === 'pending') {
        return res.json({ message: "该用户已向您发送好友请求，请到好友页面接受" });
      }

      // For digital humans (IDs starting with "dh-"), auto-accept the relationship
      const isDigitalHuman = targetFriendId.startsWith('dh-');
      
      if (isDigitalHuman) {
        // Auto-accept friendship with digital human
        const friendship = await storage.addFriendWithChannel({
          userId,
          friendId: targetFriendId,
          status: 'accepted'
        });
        
        res.json({
          ...friendship,
          friendUser: targetUser,
          autoAccepted: true
        });
        return;
      }

      // Send new friend request (for regular users)
      const friendship = await storage.addFriend(userId, targetFriendId);
      
      // 发送WebSocket通知给目标用户
      const { websocketService } = await import('./services/websocket');
      const currentUser = await storage.getUser(userId);
      if (currentUser) {
        websocketService.sendFriendRequestNotification(targetFriendId, currentUser);
      }
      
      res.json({
        ...friendship,
        friendUser: targetUser
      });
    } catch (error) {
      console.error("Add friend error:", error);
      res.status(400).json({ message: "Failed to add friend" });
    }
  });

  // QR Code scan friend request - automatically accepts
  app.post("/api/friends/request", requireAuth, async (req, res) => {
    try {
      const { friendIdentifier } = req.body;
      const userId = req.userId!; // Scanner's user ID
      
      if (!friendIdentifier) {
        return res.status(400).json({ message: "Friend identifier required" });
      }
      
      // friendIdentifier is the scanned user's ID
      const scannedUserId = friendIdentifier;
      
      // Validate that scanned user exists
      const scannedUser = await storage.getUser(scannedUserId);
      if (!scannedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if trying to add self
      if (userId === scannedUserId) {
        return res.status(400).json({ message: "Cannot add yourself as friend" });
      }
      
      // Check if already friends
      const existingFriendship = await storage.getFriendship(userId, scannedUserId);
      const reverseFriendship = await storage.getFriendship(scannedUserId, userId);
      
      if ((existingFriendship && existingFriendship.status === 'accepted') || 
          (reverseFriendship && reverseFriendship.status === 'accepted')) {
        return res.json({ message: "Already friends", alreadyFriends: true });
      }
      
      // If already sent request, accept it automatically
      if (existingFriendship && existingFriendship.status === 'pending') {
        // Already pending from scanner to scanned user - just return success
        return res.json({ message: "Friend request already sent" });
      }
      
      // If scanned user already sent a request, accept it
      if (reverseFriendship && reverseFriendship.status === 'pending') {
        await storage.acceptFriend(userId, scannedUserId);
        
        // Notify scanned user that their request was accepted
        const { websocketService } = await import('./services/websocket');
        const currentUser = await storage.getUser(userId);
        if (currentUser) {
          websocketService.sendFriendRequestAcceptedNotification(scannedUserId, currentUser);
        }
        
        return res.json({ message: "Friend request accepted automatically" });
      }
      
      // Create bidirectional friendship (auto-accept for QR scan)
      await storage.addFriend(userId, scannedUserId);
      await storage.addFriendWithChannel({
        userId: scannedUserId,
        friendId: userId,
        status: 'accepted'
      });
      
      // Update first friendship to accepted
      await storage.acceptFriend(scannedUserId, userId);
      
      // Send WebSocket notification to scanned user
      const { websocketService } = await import('./services/websocket');
      const currentUser = await storage.getUser(userId);
      if (currentUser) {
        websocketService.sendToUser(scannedUserId, {
          type: 'qrCodeScanned',
          scannedBy: currentUser,
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        message: "Friend added successfully",
        friendUser: scannedUser
      });
    } catch (error) {
      console.error("QR scan friend request error:", error);
      res.status(400).json({ message: "Failed to add friend" });
    }
  });

  app.post("/api/friends/accept", requireAuth, async (req, res) => {
    const { friendId } = req.body;
    const userId = req.userId!; // Use authenticated user ID
    
    if (!friendId) {
      return res.status(400).json({ message: "Friend ID required" });
    }

    try {
      // 验证是否存在从 friendId 到 userId 的待处理好友请求
      const existingRequest = await storage.getFriendship(friendId, userId);
      if (!existingRequest || existingRequest.status !== 'pending') {
        return res.status(403).json({ message: "No pending friend request found" });
      }

      await storage.acceptFriend(userId, friendId);
      
      // 发送WebSocket通知给发送好友请求的用户
      const { websocketService } = await import('./services/websocket');
      const currentUser = await storage.getUser(userId);
      if (currentUser) {
        websocketService.sendFriendRequestAcceptedNotification(friendId, currentUser);
      }
      
      res.json({ message: "Friend request accepted" });
    } catch (error) {
      console.error("Accept friend error:", error);
      res.status(500).json({ message: "Failed to accept friend" });
    }
  });

  // 通过邀请链接添加好友（已登录用户点击他人分享链接时）
  app.post("/api/friends/add-by-invite", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { inviterUserId, platform = 'qr' } = req.body;
    
    if (!inviterUserId) {
      return res.status(400).json({ message: "Inviter user ID required" });
    }
    
    // 不能添加自己
    if (userId === inviterUserId) {
      return res.status(400).json({ message: "Cannot add yourself as friend" });
    }
    
    try {
      // 检查邀请人是否存在
      const inviterUser = await storage.getUser(inviterUserId);
      if (!inviterUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // 检查是否已经是好友
      const existingFriendship = await storage.getFriendship(userId, inviterUserId);
      if (existingFriendship && existingFriendship.status === 'accepted') {
        return res.json({ message: "Already friends", friendUser: inviterUser });
      }
      
      // 建立双向好友关系
      await storage.addFriendWithChannel({
        userId,
        friendId: inviterUserId,
        status: 'accepted',
        channel: 'mytalk'
      });
      await storage.addFriendWithChannel({
        userId: inviterUserId,
        friendId: userId,
        status: 'accepted',
        channel: 'mytalk'
      });
      
      res.json({ message: "Friend added successfully", friendUser: inviterUser });
    } catch (error) {
      console.error("Add friend by invite error:", error);
      res.status(500).json({ message: "Failed to add friend" });
    }
  });

  // Debug route to list all users (development only)
  if (process.env.NODE_ENV !== 'production') {
    app.get("/api/debug/users", requireAuth, async (req, res) => {
      try {
        const allUsers = await storage.getAllUsers?.() || [];
        res.json({
          count: allUsers.length,
          users: allUsers.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            createdAt: u.createdAt
          }))
        });
      } catch (error) {
        console.error("Debug users error:", error);
        res.status(500).json({ message: "Failed to get users" });
      }
    });
  }

  // Update user profile (username, firstName, lastName, profileImageUrl, gender, voicePersona)
  // Note: Language preference is now managed through the dedicated Language Settings menu
  app.patch("/api/users/profile", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { nickname, username, firstName, lastName, languagePreference, profileImageUrl, gender, voicePersona } = req.body;
    
    // 验证至少提供一个字段
    if (nickname === undefined && username === undefined && firstName === undefined && lastName === undefined && languagePreference === undefined && profileImageUrl === undefined && gender === undefined && voicePersona === undefined) {
      return res.status(400).json({ message: "At least one field must be provided" });
    }
    
    // 验证语言偏好（可选）- 使用宽松验证以支持未来扩展
    if (languagePreference && !/^[a-z]{2,3}(-[A-Z]{2})?$/.test(languagePreference)) {
      return res.status(400).json({ message: "Invalid language code format" });
    }
    
    // 验证性别值（可选）
    if (gender !== undefined && gender !== null && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ message: "Invalid gender value. Must be 'male', 'female', or 'other'" });
    }
    
    try {
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // 检查用户名是否已被占用（仅当提供了新username时）
      if (username && username.trim() !== currentUser.username) {
        const existingUser = await storage.getUserByUsername(username.trim());
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({ message: "Username already taken" });
        }
      }
      
      // 检测语言是否变更（用于"过往不咎"策略）
      const isLanguageChanging = languagePreference && languagePreference !== currentUser.languagePreference;
      
      // 更新用户资料 - 使用现有值作为默认值
      const updatedUser = await storage.upsertUser({
        id: userId,
        username: username?.trim() || currentUser.username,
        nickname: nickname !== undefined ? (nickname?.trim() || null) : currentUser.nickname,
        firstName: firstName?.trim() || currentUser.firstName,
        lastName: lastName !== undefined ? (lastName?.trim() || null) : currentUser.lastName,
        languagePreference: languagePreference || currentUser.languagePreference,
        // 语言变更时更新时间戳，用于"过往不咎"翻译策略
        languagePreferenceChangedAt: isLanguageChanging ? new Date() : currentUser.languagePreferenceChangedAt,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber,
        profileImageUrl: profileImageUrl !== undefined ? profileImageUrl : currentUser.profileImageUrl,
        gender: gender !== undefined ? gender : currentUser.gender,
        voicePersona: voicePersona !== undefined ? voicePersona : currentUser.voicePersona,
        isOnline: currentUser.isOnline
      });
      
      if (isLanguageChanging) {
        console.log(`🌐 用户 ${userId} 语言偏好从 ${currentUser.languagePreference} 变更为 ${languagePreference}，时间戳已更新（过往不咎策略）`);
      }
      
      res.json({ 
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          nickname: updatedUser.nickname,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          languagePreference: updatedUser.languagePreference,
          gender: updatedUser.gender,
          voicePersona: updatedUser.voicePersona
        }
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get available voice personas based on gender
  app.post("/api/voice-persona/available", requireAuth, async (req, res) => {
    try {
      const { gender, language } = req.body;
      
      if (!gender || !['male', 'female', 'other'].includes(gender)) {
        return res.status(400).json({ message: "Valid gender is required (male, female, or other)" });
      }
      
      const { getAvailableVoicesForUser } = await import('./services/voice-persona.js');
      const voices = getAvailableVoicesForUser(gender, language || 'zh-CN');
      
      res.json({ voices });
    } catch (error) {
      console.error("Get available voices error:", error);
      res.status(500).json({ message: "Failed to get available voices" });
    }
  });

  // ===================== 用户语音偏好 (Voice Profile) =====================
  // 获取用户语音偏好设置
  app.get("/api/users/voice-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      
      // 获取用户语音偏好
      const voiceProfile = await storage.getUserVoiceProfile(userId);
      
      if (!voiceProfile) {
        // 返回默认值
        return res.json({
          userId,
          remoteVoiceForMe: 'default',
          myDefaultVoiceForOthers: 'default',
          autoCallTranscript: false
        });
      }
      
      res.json(voiceProfile);
    } catch (error) {
      console.error("获取语音偏好失败:", error);
      res.status(500).json({ message: "Failed to get voice profile" });
    }
  });

  // 更新用户语音偏好设置
  app.put("/api/users/voice-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.userId!;
      const { remoteVoiceForMe, myDefaultVoiceForOthers, autoCallTranscript } = req.body;
      
      // 验证音色选项
      const validVoiceOptions = ['default', 'neutral', 'male', 'female', 'male_deep', 'female_sweet'];
      
      if (remoteVoiceForMe && !validVoiceOptions.includes(remoteVoiceForMe)) {
        return res.status(400).json({ message: "Invalid remoteVoiceForMe option" });
      }
      
      if (myDefaultVoiceForOthers && !validVoiceOptions.includes(myDefaultVoiceForOthers)) {
        return res.status(400).json({ message: "Invalid myDefaultVoiceForOthers option" });
      }
      
      // 更新或创建语音偏好
      const updatedProfile = await storage.upsertUserVoiceProfile({
        userId,
        remoteVoiceForMe: remoteVoiceForMe || 'default',
        myDefaultVoiceForOthers: myDefaultVoiceForOthers || 'default',
        autoCallTranscript: autoCallTranscript ?? false
      });
      
      console.log(`🎤 用户 ${userId} 语音偏好已更新:`, {
        remoteVoiceForMe: updatedProfile.remoteVoiceForMe,
        myDefaultVoiceForOthers: updatedProfile.myDefaultVoiceForOthers,
        autoCallTranscript: updatedProfile.autoCallTranscript
      });
      
      res.json(updatedProfile);
    } catch (error) {
      console.error("更新语音偏好失败:", error);
      res.status(500).json({ message: "Failed to update voice profile" });
    }
  });

  // 获取可用的语音选项列表（给前端下拉框用）
  app.get("/api/voice-options", async (_req, res) => {
    const { VOICE_OPTIONS } = await import('@shared/schema.js');
    res.json(VOICE_OPTIONS);
  });

  // Update username (with rate limiting: 2 times per year)
  app.put("/api/users/username", requireAuth, async (req, res) => {
    try {
      const { username } = req.body;
      
      // Validate username format
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ message: "Username is required" });
      }
      
      // Check length (3-30 characters)
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ message: "Username must be 3-30 characters" });
      }
      
      // Check allowed characters (letters, numbers, underscore only)
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
      }
      
      // Check change count this year
      const changeCount = await storage.getUsernameChangeCountThisYear(req.userId!);
      if (changeCount >= 2) {
        return res.status(429).json({ message: "You have reached the maximum of 2 username changes per year" });
      }
      
      // Attempt to update
      try {
        const updatedUser = await storage.updateUsername(req.userId!, username);
        res.json({
          user: updatedUser,
          changesRemainingThisYear: 2 - changeCount - 1,
        });
      } catch (error: any) {
        if (error.message === 'Username already taken') {
          return res.status(409).json({ message: "Username already taken" });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error updating username:", error);
      res.status(500).json({ message: "Failed to update username" });
    }
  });

  // NOTE: Search route moved before /api/users/:userId to prevent conflict

  // Friend requests routes
  app.get("/api/friend-requests", requireAuth, async (req, res) => {
    try {
      const friendRequests = await storage.getFriendRequests(req.userId!);
      res.json(friendRequests);
    } catch (error) {
      console.error("Get friend requests error:", error);
      res.status(500).json({ message: "Failed to get friend requests" });
    }
  });

  app.post("/api/friends/decline", requireAuth, async (req, res) => {
    const { friendId } = req.body;
    const userId = req.userId!; // Use authenticated user ID
    
    if (!friendId) {
      return res.status(400).json({ message: "Friend ID required" });
    }

    try {
      // 验证是否存在从 friendId 到 userId 的待处理好友请求
      const existingRequest = await storage.getFriendship(friendId, userId);
      if (!existingRequest || existingRequest.status !== 'pending') {
        return res.status(403).json({ message: "No pending friend request found" });
      }

      await storage.declineFriend(userId, friendId);
      
      res.json({ message: "Friend request declined" });
    } catch (error) {
      console.error("Decline friend error:", error);
      res.status(500).json({ message: "Failed to decline friend" });
    }
  });

  // Groups routes
  app.get("/api/groups", requireAuth, async (req, res) => {
    try {
      const groups = await storage.getGroupsList(req.userId!);
      
      
      res.json(groups);
    } catch (error) {
      console.error("Get groups error:", error);
      res.status(500).json({ message: "Failed to get groups" });
    }
  });

  app.post("/api/groups", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      const ownerId = req.userId!; // 使用认证用户ID
      
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Group name required" });
      }
      
      // 创建群聊数据
      const groupData = {
        name: name.trim(),
        ownerId: ownerId
      };
      
      const group = await storage.createGroup(groupData);
      
      // Add creator as owner
      await storage.addGroupMember(group.id, ownerId, "owner");
      
      res.json(group);
    } catch (error) {
      console.error("Create group error:", error);
      res.status(400).json({ message: "Failed to create group" });
    }
  });

  app.post("/api/groups/:groupId/members", requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const { userIds } = req.body;
    const currentUserId = req.userId!;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "User IDs required" });
    }

    try {
      // 验证当前用户是否是群管理员
      const member = await storage.getGroupMember(groupId, currentUserId);
      if (!member) {
        return res.status(403).json({ message: "Not a group member" });
      }
      if (member.role !== 'owner' && member.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can add members" });
      }

      // 获取当前成员数（在添加新成员之前）
      const currentMembers = await storage.getGroupMembers(groupId);
      const futureCount = currentMembers.length + userIds.length;
      
      // 验证添加后群组至少有3人（前端已验证，这里是后端二次验证防止绕过）
      if (futureCount < 3) {
        return res.status(400).json({ 
          message: "Groups require at least 3 members (including yourself). Please select at least 2 more friends." 
        });
      }
      
      // 批量添加成员
      const addedMembers = [];
      for (const userId of userIds) {
        const newMember = await storage.addGroupMember(groupId, userId, "member");
        addedMembers.push(newMember);
      }
      
      res.json(addedMembers);
    } catch (error) {
      console.error("Add group member error:", error);
      res.status(500).json({ message: "Failed to add group member" });
    }
  });

  app.get("/api/groups/:groupId/members", requireAuth, async (req, res) => {
    const { groupId } = req.params;

    try {
      // 返回包含角色和用户信息的群成员列表
      const members = await storage.getGroupMembersWithRoles(groupId);
      res.json(members);
    } catch (error) {
      console.error("Get group members error:", error);
      res.status(500).json({ message: "Failed to get group members" });
    }
  });

  // 获取群组详情（包括公告）
  app.get("/api/groups/:groupId", requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId!;

    try {
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // 验证用户是否是群成员
      const members = await storage.getGroupMembers(groupId);
      const isMember = members.some(m => m.id === userId);
      if (!isMember) {
        return res.status(403).json({ message: "Not a group member" });
      }

      // 返回群组信息和成员数量
      res.json({
        ...group,
        memberCount: members.length
      });
    } catch (error) {
      console.error("Get group error:", error);
      res.status(500).json({ message: "Failed to get group" });
    }
  });

  // 更新群组信息（名称、公告等）- 仅群主和管理员
  app.patch("/api/groups/:groupId", requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId!;
    const { name, announcement } = req.body;

    try {
      // 验证群组是否存在
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // 获取当前用户的群成员信息（包括角色）
      const member = await storage.getGroupMember(groupId, userId);
      
      if (!member) {
        return res.status(403).json({ message: "Not a group member" });
      }

      // 检查角色权限：群主或管理员可以修改群组信息
      const isOwner = group.ownerId === userId;
      const isAdmin = member.role === 'admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Only group owner or admins can update group info" });
      }

      // 更新群组信息
      await db.update(groups)
        .set({
          ...(name && { name: name.trim() }),
          ...(announcement !== undefined && { announcement: announcement.trim() }),
          updatedAt: new Date()
        })
        .where(eq(groups.id, groupId));

      const updatedGroup = await storage.getGroup(groupId);
      res.json(updatedGroup);
    } catch (error) {
      console.error("Update group error:", error);
      res.status(500).json({ message: "Failed to update group" });
    }
  });

  // 更新我在群里的昵称
  app.patch("/api/groups/:groupId/my-nickname", requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId!;
    const { nickname } = req.body;

    try {
      // 验证用户是群成员
      const member = await storage.getGroupMember(groupId, userId);
      if (!member) {
        return res.status(403).json({ message: "Not a group member" });
      }

      // 更新群成员昵称（只能修改自己的昵称）
      await db.update(groupMembers)
        .set({ nickname: nickname?.trim() || null })
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId)
          )
        );

      res.json({ message: "Nickname updated successfully" });
    } catch (error) {
      console.error("Update nickname error:", error);
      res.status(500).json({ message: "Failed to update nickname" });
    }
  });

  // 移除群成员（仅管理员）
  app.delete("/api/groups/:groupId/members/:userId", requireAuth, async (req, res) => {
    const { groupId, userId: targetUserId } = req.params;
    const currentUserId = req.userId!;

    try {
      // 验证群组是否存在
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // 验证当前用户是群管理员
      const currentMember = await storage.getGroupMember(groupId, currentUserId);
      if (!currentMember) {
        return res.status(403).json({ message: "Not a group member" });
      }
      if (currentMember.role !== 'owner' && currentMember.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can remove members" });
      }

      // 验证目标用户是群成员
      const targetMember = await storage.getGroupMember(groupId, targetUserId);
      if (!targetMember) {
        return res.status(404).json({ message: "Target user is not a group member" });
      }

      // 不能移除群主
      if (targetMember.role === 'owner') {
        return res.status(403).json({ message: "Cannot remove group owner" });
      }

      // 普通管理员不能移除其他管理员
      if (currentMember.role === 'admin' && targetMember.role === 'admin') {
        return res.status(403).json({ message: "Admins cannot remove other admins" });
      }

      // 删除群成员记录
      await db.delete(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, targetUserId)
          )
        );

      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Remove member error:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // 关注/取消关注群成员
  app.patch("/api/groups/:groupId/members/:userId/follow", requireAuth, async (req, res) => {
    const { groupId, userId: targetUserId } = req.params;
    const currentUserId = req.userId!;
    const { isFollowed } = req.body;

    try {
      // 验证当前用户是群成员
      const currentMember = await storage.getGroupMember(groupId, currentUserId);
      if (!currentMember) {
        return res.status(403).json({ message: "Not a group member" });
      }

      // 验证目标用户是群成员
      const targetMember = await storage.getGroupMember(groupId, targetUserId);
      if (!targetMember) {
        return res.status(404).json({ message: "Target user is not a group member" });
      }

      // 更新关注状态（只能修改自己的关注状态）
      await db.update(groupMembers)
        .set({ isFollowed: isFollowed })
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, targetUserId)
          )
        );

      res.json({ message: "Follow status updated successfully" });
    } catch (error) {
      console.error("Update follow status error:", error);
      res.status(500).json({ message: "Failed to update follow status" });
    }
  });

  // 清空群聊天记录
  app.delete("/api/groups/:groupId/clear-messages", requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId!;

    try {
      // 验证用户是群成员
      const member = await storage.getGroupMember(groupId, userId);
      if (!member) {
        return res.status(403).json({ message: "Not a group member" });
      }

      // 删除群聊天记录
      await db.delete(messages)
        .where(eq(messages.groupId, groupId));

      res.json({ message: "Messages cleared successfully" });
    } catch (error) {
      console.error("Clear messages error:", error);
      res.status(500).json({ message: "Failed to clear messages" });
    }
  });

  // 退出群聊
  app.post("/api/groups/:groupId/leave", requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId!;

    try {
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // 验证用户是群成员
      const member = await storage.getGroupMember(groupId, userId);
      if (!member) {
        return res.status(403).json({ message: "Not a group member" });
      }

      // 群主不能直接退出，需要先转让群主或解散群聊
      if (group.ownerId === userId) {
        return res.status(403).json({ message: "Owner cannot leave. Transfer ownership first or delete the group." });
      }

      // 删除群成员记录
      await db.delete(groupMembers)
        .where(
          and(
            eq(groupMembers.groupId, groupId),
            eq(groupMembers.userId, userId)
          )
        );

      res.json({ message: "Left group successfully" });
    } catch (error) {
      console.error("Leave group error:", error);
      res.status(500).json({ message: "Failed to leave group" });
    }
  });

  // 解散群聊（仅群主）
  app.delete("/api/groups/:groupId", requireAuth, async (req, res) => {
    const { groupId } = req.params;
    const userId = req.userId!;

    try {
      const group = await storage.getGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      // 只有群主可以解散群聊
      if (group.ownerId !== userId) {
        return res.status(403).json({ message: "Only owner can delete the group" });
      }

      // 删除群聊（级联删除成员和消息）
      await db.delete(groups).where(eq(groups.id, groupId));

      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      console.error("Delete group error:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  // Messages routes
  app.get("/api/messages/:targetId", async (req, res) => {
    const { targetId } = req.params;
    const userId = req.query.userId as string;
    const isGroup = req.query.isGroup === "true";
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string; // Cursor for pagination

    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }

    try {
      const result = await storage.getMessages(userId, targetId, isGroup, { page, limit, before });
      
      // 并行获取用户信息
      const [currentUser, partner] = await Promise.all([
        storage.getUser(userId),
        storage.getUser(targetId)
      ]);
      const userLanguage = currentUser?.languagePreference || 'zh';
      const partnerLanguage = partner?.languagePreference || 'zh';
      // 🌐 "过往不咎"策略：获取用户语言偏好变更时间
      const languageChangedAt = currentUser?.languagePreferenceChangedAt;
      
      // 批量获取所有消息的翻译缓存
      const messageIds = result.messages.map((m: any) => m.id);
      const allTranslations = await storage.getTranslationsBatch(messageIds, [userLanguage, partnerLanguage]);
      const translationCache = new Map<string, string>();
      allTranslations.forEach((t: any) => {
        translationCache.set(`${t.messageId}_${t.targetLanguage}`, t.translatedContent);
      });
      
      // ⚡ 性能优化：同步处理消息，只对需要翻译的消息调用API
      const { processMessageForRecipient } = await import('./services/message-processor');
      
      const messagesWithTranslation = await Promise.all(
        result.messages.map(async (message: any) => {
          try {
            const isOwnMessage = message.fromUserId === userId;
            
            // ✅ v1.1 翻译策略：
            // - 自己发的消息：显示原文（不翻译）
            // - 对方发的消息：翻译成我的语言
            if (isOwnMessage) {
              return {
                ...message,
                originalText: message.content,
                translatedText: message.content,
                needsTranslation: false
              };
            }
            
            // 对方发的消息，翻译成我的语言
            const targetLanguage = userLanguage;
            
            // 🌐 "过往不咎"策略：如果消息创建时间早于语言变更时间，不进行新翻译
            // 只使用已有的缓存翻译，不调用API生成新翻译
            const messageCreatedAt = message.createdAt ? new Date(message.createdAt) : null;
            const isBeforeLanguageChange = languageChangedAt && messageCreatedAt && messageCreatedAt < languageChangedAt;
            
            // ⚡ 从批量缓存中获取翻译
            const cacheKey = `${message.id}_${targetLanguage}`;
            const cachedTranslation = translationCache.get(cacheKey);
            
            if (cachedTranslation) {
              return {
                ...message,
                originalText: message.content,
                translatedText: cachedTranslation,
                needsTranslation: true
              };
            }
            
            // ⚡ 检查消息自带的translations JSONB字段（语音消息等使用此字段）
            let translations = message.translations;
            if (typeof translations === 'string') {
              try {
                translations = JSON.parse(translations);
              } catch (e) {
                translations = {};
              }
            }
            const embeddedTranslation = translations?.[targetLanguage]?.text;
            if (embeddedTranslation) {
              return {
                ...message,
                originalText: message.content,
                translatedText: embeddedTranslation,
                needsTranslation: true
              };
            }
            
            // 🌐 "过往不咎"：语言变更前的消息，没有缓存就直接显示原文
            if (isBeforeLanguageChange) {
              return {
                ...message,
                originalText: message.content,
                translatedText: message.content,
                needsTranslation: false
              };
            }
            
            // 如果消息语言与我的语言相同，无需翻译
            const senderLanguage = message.originalLanguage;
            if (senderLanguage === targetLanguage) {
              return {
                ...message,
                originalText: message.content,
                translatedText: message.content,
                needsTranslation: false
              };
            }
            
            // 没有缓存时，同步翻译并返回结果（仅限语言变更后的消息）
            const processed = await processMessageForRecipient(
              message.content,
              message.messageType || 'text',
              targetLanguage,
              senderLanguage,
              message.originalLanguage
            );
            
            // 保存翻译到缓存
            if (processed.needsTranslation && processed.translatedText !== message.content) {
              storage.saveTranslation({
                messageId: message.id,
                targetLanguage: targetLanguage,
                messageType: "casual",
                translatedContent: processed.translatedText
              }).catch(err => console.error("Save translation error:", err));
            }
            
            return {
              ...message,
              originalText: message.content,
              translatedText: processed.translatedText,
              needsTranslation: processed.needsTranslation
            };
          } catch (error) {
            console.error("❌ 消息处理失败:", message.id, error);
            return {
              ...message,
              originalText: message.content,
              translatedText: message.content,
              needsTranslation: false
            };
          }
        })
      );
      
      res.json({ 
        ...result, 
        messages: messagesWithTranslation 
      });
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.sendMessage(messageData);
      
      // Get sender info - 确保获取真实用户信息
      const sender = await storage.getUser(messageData.fromUserId);
      
      // 🚀 立即返回响应（毫秒级），后续处理异步执行
      res.json({
        ...message,
        fromUser: sender
      });
      
      // 🔔 异步处理所有外部渠道推送和AI回复，不阻塞响应
      setImmediate(async () => {
        try {
          const { friends, users } = await import('@shared/schema');
          
          // 检查是否发送给LINE好友
          const [lineFriend] = await db.select()
            .from(friends)
            .where(and(
              eq(friends.friendId, messageData.toUserId),
              eq(friends.channel, 'line')
            ))
            .limit(1);
          
          if (lineFriend && lineFriend.externalUserId) {
            const [lineUser] = await db.select()
              .from(users)
              .where(eq(users.id, lineFriend.friendId))
              .limit(1);
            const recipientLanguage = lineUser?.languagePreference || 'th';
            try {
              await pushLineMessage(lineFriend.externalUserId!, messageData.content, recipientLanguage);
            } catch (error) {
              console.error('❌ 推送LINE消息失败:', error);
            }
          }
          
          // 检查是否发送给WhatsApp好友
          const [whatsappFriend] = await db.select()
            .from(friends)
            .where(and(
              eq(friends.friendId, messageData.toUserId),
              eq(friends.channel, 'whatsapp')
            ))
            .limit(1);
          
          if (whatsappFriend && whatsappFriend.externalUserId) {
            const [whatsappUser] = await db.select()
              .from(users)
              .where(eq(users.id, whatsappFriend.friendId))
              .limit(1);
            const recipientLanguage = whatsappUser?.languagePreference || 'en';
            try {
              await pushWhatsAppMessage(whatsappFriend.externalUserId!, messageData.content, recipientLanguage);
            } catch (error) {
              console.error('❌ 推送WhatsApp消息失败:', error);
            }
          }
          
          // 检查是否发送给Messenger好友
          const [messengerFriend] = await db.select()
            .from(friends)
            .where(and(
              eq(friends.friendId, messageData.toUserId),
              eq(friends.channel, 'messenger')
            ))
            .limit(1);
          
          if (messengerFriend && messengerFriend.externalUserId) {
            const [messengerUser] = await db.select()
              .from(users)
              .where(eq(users.id, messengerFriend.friendId))
              .limit(1);
            const recipientLanguage = messengerUser?.languagePreference || 'en';
            try {
              await pushMessengerMessage(messengerFriend.externalUserId!, messageData.content, recipientLanguage);
            } catch (error) {
              console.error('❌ 推送Messenger消息失败:', error);
            }
          }
          
          // 检查是否发送给Instagram好友
          const [instagramFriend] = await db.select()
            .from(friends)
            .where(and(
              eq(friends.friendId, messageData.toUserId),
              eq(friends.channel, 'igdm')
            ))
            .limit(1);
          
          if (instagramFriend && instagramFriend.externalUserId) {
            const [instagramUser] = await db.select()
              .from(users)
              .where(eq(users.id, instagramFriend.friendId))
              .limit(1);
            const recipientLanguage = instagramUser?.languagePreference || 'en';
            try {
              await pushInstagramMessage(instagramFriend.externalUserId!, messageData.content, recipientLanguage);
            } catch (error) {
              console.error('❌ 推送Instagram消息失败:', error);
            }
          }
          
          // AI客服自动回复逻辑
          const { AI_ASSISTANT_ID } = await import('./constants/ai');
          if (messageData.toUserId === AI_ASSISTANT_ID) {
            try {
              await triggerAIAutoReply(message, sender);
            } catch (error) {
              console.error("AI auto-reply error:", error);
            }
          }
          
          // 数字人自动回复逻辑（dh- 开头的 ID）
          if (messageData.toUserId.startsWith('dh-')) {
            try {
              const { DigitalHumanEngine } = await import('./services/dh-engine');
              const dhEngine = new DigitalHumanEngine();
              console.log(`🤖 [DH-REST] 触发数字人回复: user=${messageData.fromUserId}, dh=${messageData.toUserId}`);
              const response = await dhEngine.chat({
                userId: messageData.fromUserId,
                humanId: messageData.toUserId,
                message: messageData.content,
                inputMode: 'text',
              });
              console.log(`✅ [DH-REST] 数字人回复成功: "${response.reply?.substring(0, 50)}..."`);
            } catch (error) {
              console.error("❌ [DH-REST] 数字人回复失败:", error);
            }
          }
        } catch (error) {
          console.error("❌ 异步消息处理失败:", error);
        }
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  // Translation routes
  app.post("/api/translate", async (req, res) => {
    const { text, targetLanguage, messageType = "casual" } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ message: "Text and target language required" });
    }

    try {
      const translation = await translateMessage(text, targetLanguage, messageType);
      res.json(translation);
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ message: "Translation failed" });
    }
  });

  app.post("/api/messages/:messageId/translate", async (req, res) => {
    const { messageId } = req.params;
    const { targetLanguage, messageType = "casual" } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({ message: "Target language required" });
    }

    try {
      const translation = await websocketService.translateMessageContent(messageId, targetLanguage, messageType);
      res.json(translation);
    } catch (error) {
      console.error("Message translation error:", error);
      res.status(500).json({ message: "Translation failed" });
    }
  });

  app.post("/api/chats/:chatId/mark-read", requireAuth, async (req, res) => {
    const { chatId } = req.params;
    const { chatType } = req.body;
    const userId = req.userId!; // Use authenticated user ID only

    if (!chatType) {
      return res.status(400).json({ message: "Chat type required" });
    }

    if (chatType !== 'friend' && chatType !== 'group') {
      return res.status(400).json({ message: "Chat type must be 'friend' or 'group'" });
    }

    try {
      await storage.markChatAsRead(chatId, chatType, userId);
      
      // Emit readReceipt WebSocket event for real-time unread count sync
      const readReceiptEvent = {
        type: 'readReceipt',
        chatId,
        chatType, 
        userId
      };

      // Broadcast to all user connections via connectionManager
      const sentCount = connectionManager.broadcastToUser(userId, readReceiptEvent);
      if (sentCount > 0) {
      }
      
      res.json({ message: "Chat marked as read" });
    } catch (error) {
      console.error("Mark chat as read error:", error);
      res.status(500).json({ message: "Failed to mark chat as read" });
    }
  });

  // Magic Link & Invite System
  // Rate limiting for magic link generation
  const magicLinkLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each user to 10 magic links per windowMs
    message: { error: 'Too many magic links generated, try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Generate Magic Link for room/group invitation
  app.post("/api/rooms/:roomId/magic-link", magicLinkLimiter, requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const inviterId = req.session.userId!;
      
      // Check if user is a guest user - guests cannot generate invite links
      const inviterUser = await storage.getUser(inviterId);
      if (inviterUser && inviterUser.username.startsWith('guest_')) {
        return res.status(403).json({ 
          error: 'GUEST_INVITE_RESTRICTED',
          message: 'Guest users must upgrade their account to invite friends'
        });
      }
      
      // Verify user has access to this room/group
      // For groups
      const groups = await storage.getGroupsList(inviterId);
      const hasGroupAccess = groups.some((g: any) => g.id === roomId);
      
      // For friends - check if roomId is a friend's ID
      const friends = await storage.getFriendsList(inviterId);
      const hasFriendAccess = friends.some((f: any) => f.id === roomId);
      
      if (!hasGroupAccess && !hasFriendAccess) {
        return res.status(403).json({ error: 'Access denied to this room' });
      }

      const payload = { 
        roomId, 
        inviterId, 
        typ: 'ml', 
        jti: nanoid(),
        iat: Math.floor(Date.now() / 1000)
      };
      
      const secret = process.env.SESSION_SECRET || 'default-secret-key';
      const token = jwt.sign(payload, secret, { expiresIn: '7d' });

      // Build full URL - using request host for dynamic domains
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const url = `${baseUrl}/invite/${token}`;
      
      res.json({ url, expiresIn: '7 days' });
    } catch (error) {
      console.error("Magic link generation error:", error);
      res.status(500).json({ error: 'Failed to generate magic link' });
    }
  });

  // 访客注册
  app.post("/api/auth/guest", async (req, res) => {
    try {
      const { username, languagePreference } = req.body;
      const guestUsername = username ? username.trim() : '访客用户';
      
      // 为访客用户创建唯一用户名
      const uniqueUsername = `guest_${nanoid(8)}`;
      
      const guestUser = await storage.createUser({
        username: uniqueUsername,
        firstName: guestUsername,
        lastName: '',
        languagePreference: languagePreference || 'en'
      });
      
      // 设置session
      req.session.userId = guestUser.id;
      req.session.authenticated = true;
      
      
      res.json({ 
        success: true,
        message: '访客登录成功',
        user: {
          id: guestUser.id,
          username: guestUser.username,
          firstName: guestUser.firstName
        }
      });
      
    } catch (error) {
      console.error("访客注册错误:", error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR',
        message: '访客登录失败，请稍后重试' 
      });
    }
  });

  // 获取session信息（包括邀请平台）
  app.get("/api/auth/session-info", (req, res) => {
    res.json({
      invitePlatform: req.session.invitePlatform || null
    });
  });

  // 访客登录（支持邀请链接）
  app.post("/api/auth/guest-login", async (req, res) => {
    try {
      const { languagePreference, inviterUserId, platform } = req.body;
      
      // 为访客用户创建唯一用户名
      const uniqueUsername = `guest_${nanoid(8)}`;
      
      const guestUser = await storage.createUser({
        username: uniqueUsername,
        firstName: '访客',
        lastName: '',
        languagePreference: languagePreference || 'en'
      });
      
      // 如果有邀请人ID或用户名，自动添加为好友
      if (inviterUserId) {
        try {
          // 支持ID或用户名查找邀请人
          let inviter = await storage.getUser(inviterUserId);
          if (!inviter) {
            inviter = await storage.getUserByUsername(inviterUserId);
          }
          if (inviter) {
            // 创建游客→邀请人的好友关系
            await storage.addFriendWithChannel({
              userId: guestUser.id,
              friendId: inviter.id,
              status: 'accepted',
              channel: 'mytalk'
            });
            
            // 创建邀请人→游客的好友关系（双向关系）
            await storage.addFriendWithChannel({
              userId: inviter.id,
              friendId: guestUser.id,
              status: 'accepted',
              channel: 'mytalk'
            });
            
          }
        } catch (error) {
          console.error('添加邀请人好友关系失败:', error);
          // 不阻止登录，继续进行
        }
      }
      
      // 设置session并存储平台信息
      req.session.userId = guestUser.id;
      req.session.authenticated = true;
      if (platform) {
        req.session.invitePlatform = platform; // 存储邀请平台，供后续登录时使用
      }
      
      // 强制保存session
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save failed after guest login:', err);
          return res.status(500).json({ message: "Session save failed" });
        }
        
        
        res.json({ 
          success: true,
          message: '访客登录成功',
          user: {
            id: guestUser.id,
            username: guestUser.username,
            firstName: guestUser.firstName,
            lastName: guestUser.lastName
          }
        });
      });
      
    } catch (error) {
      console.error("访客登录错误:", error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR',
        message: '访客登录失败，请稍后重试' 
      });
    }
  });

  // 用户名注册
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, email, languagePreference } = req.body;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ 
          error: 'INVALID_INPUT',
          message: '请提供用户名' 
        });
      }
      
      const trimmedUsername = username.trim();
      if (trimmedUsername.length === 0) {
        return res.status(400).json({ 
          error: 'INVALID_INPUT',
          message: '用户名不能为空' 
        });
      }
      
      // 检查用户名是否已存在
      try {
        const existingUser = await storage.getUserByUsername(trimmedUsername);
        if (existingUser) {
          return res.status(400).json({ 
            error: 'USERNAME_EXISTS',
            message: '用户名已存在，请选择其他用户名' 
          });
        }
      } catch (error) {
        // 用户不存在，可以继续注册
      }
      
      // 创建新用户 - 使用前端检测的语言或默认英文
      const newUser = await storage.createUser({
        username: trimmedUsername,
        firstName: trimmedUsername,
        lastName: '',
        email: email?.trim() || undefined,
        languagePreference: languagePreference || 'en'
      });
      
      // 设置session
      req.session.userId = newUser.id;
      req.session.authenticated = true;
      
      
      res.json({ 
        success: true,
        message: '注册成功',
        user: {
          id: newUser.id,
          username: newUser.username,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email
        }
      });
      
    } catch (error) {
      console.error("用户名注册错误:", error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR',
        message: '注册失败，请稍后重试' 
      });
    }
  });

  // 6位数字ID注册
  app.post("/api/auth/six-digit-signup", async (req, res) => {
    try {
      const { sixDigitId } = req.body;
      
      // 验证输入
      if (!sixDigitId || typeof sixDigitId !== 'string') {
        return res.status(400).json({ 
          error: 'INVALID_INPUT',
          message: '请提供6位数字ID' 
        });
      }
      
      const trimmedId = sixDigitId.trim();
      
      // 验证6位数字格式
      if (!/^\d{6}$/.test(trimmedId)) {
        return res.status(400).json({ 
          error: 'INVALID_FORMAT',
          message: '数字ID必须为6位数字' 
        });
      }
      
      // 检查保留数字
      const reservedNumbers = ['111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '000000'];
      if (reservedNumbers.includes(trimmedId)) {
        return res.status(400).json({ 
          error: 'RESERVED_NUMBER',
          message: '此数字ID已被系统保留，请选择其他数字' 
        });
      }
      
      // 检查是否已存在
      try {
        const existingUser = await storage.getUserByUsername(trimmedId);
        if (existingUser) {
          return res.status(400).json({ 
            error: 'ID_ALREADY_EXISTS',
            message: '此数字ID已被使用，请选择其他数字' 
          });
        }
      } catch (error) {
        // 用户不存在，可以继续注册
      }
      
      // 创建新用户 - 使用前端检测的语言或默认英文
      const { languagePreference } = req.body;
      const newUser = await storage.createUser({
        username: trimmedId,
        firstName: '用户',
        lastName: trimmedId, // 使用数字ID作为显示名
        languagePreference: languagePreference || 'en'
      });
      
      // 设置session
      req.session.userId = newUser.id;
      req.session.authenticated = true;
      
      
      res.json({ 
        success: true,
        message: '注册成功',
        user: {
          id: newUser.id,
          username: newUser.username,
          firstName: newUser.firstName,
          lastName: newUser.lastName
        }
      });
      
    } catch (error) {
      console.error("6位数字注册错误:", error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR',
        message: '注册失败，请稍后重试' 
      });
    }
  });

  // 6位数字ID登录
  app.post("/api/auth/six-digit-login", async (req, res) => {
    try {
      const { sixDigitId } = req.body;
      
      // 验证输入
      if (!sixDigitId || typeof sixDigitId !== 'string') {
        return res.status(400).json({ 
          error: 'INVALID_INPUT',
          message: '请提供6位数字ID' 
        });
      }
      
      const trimmedId = sixDigitId.trim();
      
      // 验证6位数字格式
      if (!/^\d{6}$/.test(trimmedId)) {
        return res.status(400).json({ 
          error: 'INVALID_FORMAT',
          message: '数字ID必须为6位数字' 
        });
      }
      
      // 查找用户
      try {
        const user = await storage.getUserByUsername(trimmedId);
        if (!user) {
          return res.status(401).json({ 
            error: 'USER_NOT_FOUND',
            message: '数字ID不存在，请先注册或检查输入' 
          });
        }
        
        // 设置session
        req.session.userId = user.id;
        req.session.authenticated = true;
        
        
        res.json({ 
          success: true,
          message: '登录成功',
          user: {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName
          }
        });
        
      } catch (error) {
        console.error("6位数字登录查询错误:", error);
        return res.status(401).json({ 
          error: 'USER_NOT_FOUND',
          message: '数字ID不存在，请先注册或检查输入' 
        });
      }
      
    } catch (error) {
      console.error("6位数字登录错误:", error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR',
        message: '登录失败，请稍后重试' 
      });
    }
  });

  // 用户名登录
  app.post("/api/auth/username-login", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ 
          error: 'INVALID_INPUT',
          message: '请提供用户名' 
        });
      }
      
      const trimmedUsername = username.trim();
      if (trimmedUsername.length === 0) {
        return res.status(400).json({ 
          error: 'INVALID_INPUT',
          message: '用户名不能为空' 
        });
      }
      
      // 查找用户
      try {
        const user = await storage.getUserByUsername(trimmedUsername);
        if (!user) {
          return res.status(401).json({ 
            error: 'USER_NOT_FOUND',
            message: '用户名不存在，请先注册或检查输入' 
          });
        }
        
        // 设置session
        req.session.userId = user.id;
        req.session.authenticated = true;
        
        
        res.json({ 
          success: true,
          message: '登录成功',
          user: {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          }
        });
        
      } catch (error) {
        console.error("用户名登录查询错误:", error);
        return res.status(401).json({ 
          error: 'USER_NOT_FOUND',
          message: '用户名不存在，请先注册或检查输入' 
        });
      }
      
    } catch (error) {
      console.error("用户名登录错误:", error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR',
        message: '登录失败，请稍后重试' 
      });
    }
  });

  // 邮箱密码登录
  app.post("/api/auth/email-login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'INVALID_INPUT',
          message: '请提供邮箱和密码' 
        });
      }
      
      // 查找用户
      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      if (!user) {
        return res.status(401).json({ 
          error: 'INVALID_CREDENTIALS',
          message: '邮箱或密码错误' 
        });
      }
      
      // 验证密码
      if (!user.passwordHash) {
        return res.status(401).json({ 
          error: 'INVALID_CREDENTIALS',
          message: '该账号不支持密码登录' 
        });
      }
      
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ 
          error: 'INVALID_CREDENTIALS',
          message: '邮箱或密码错误' 
        });
      }
      
      // 设置session
      req.session.userId = user.id;
      req.session.authenticated = true;
      delete (req.session as any).loggedOut; // Clear logged out flag
      
      // 保存session
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        
        console.log('✅ Email login successful:', email);
        res.json({ 
          success: true,
          message: '登录成功',
          user: {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          }
        });
      });
      
    } catch (error) {
      console.error("邮箱登录错误:", error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR',
        message: '登录失败，请稍后重试' 
      });
    }
  });

  // 登出端点 - 清除session用于测试登录页面
  app.post("/api/auth/logout", (req, res) => {
    // Clear authentication data but keep session to track logged out state
    req.session.userId = undefined;
    req.session.authenticated = false;
    (req.session as any).loggedOut = true; // Flag to prevent auto-auth in dev mode
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      console.log('✅ User logged out successfully');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
  

  // Generate friend invitation magic link
  app.post("/api/invite/magic-link", magicLinkLimiter, requireAuth, async (req, res) => {
    try {
      const inviterId = req.session.userId!;
      
      // Check if user is a guest user - guests cannot generate invite links
      const inviterUser = await storage.getUser(inviterId);
      if (inviterUser && inviterUser.username.startsWith('guest_')) {
        return res.status(403).json({ 
          error: 'GUEST_INVITE_RESTRICTED',
          message: 'Guest users must upgrade their account to invite friends'
        });
      }

      const payload = { 
        roomId: inviterId, // Use inviter's ID as roomId for friend invites
        inviterId, 
        typ: 'ml', 
        jti: nanoid(),
        iat: Math.floor(Date.now() / 1000),
        inviteType: 'friend' // Mark this as a friend invitation
      };
      
      const secret = process.env.SESSION_SECRET || 'default-secret-key';
      const token = jwt.sign(payload, secret, { expiresIn: '7d' });

      // Build full URL - using request host for dynamic domains
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const url = `${baseUrl}/invite/${token}`;
      
      res.json({ url, expiresIn: '7 days' });
    } catch (error) {
      console.error("Friend invite magic link generation error:", error);
      res.status(500).json({ error: 'Failed to generate magic link' });
    }
  });

  // Accept invitation via Magic Link
  app.post("/api/invite/accept", async (req, res) => {
    try {
      const token = String(req.query.ml || req.body.ml || '');
      if (!token) {
        return res.status(400).json({ error: 'MISSING_TOKEN' });
      }

      const secret = process.env.SESSION_SECRET || 'default-secret-key';
      const data: any = jwt.verify(token, secret);
      
      if (data.typ !== 'ml') {
        return res.status(400).json({ error: 'BAD_TOKEN' });
      }

      // Ensure user is authenticated or create guest user
      let userId = req.session.userId;
      if (!userId) {
        // Create guest user
        const guestUser = await storage.createUser({
          username: `guest_${nanoid(8)}`,
          firstName: '访客',
          lastName: `${Date.now()}`
        });
        userId = guestUser.id;
        req.session.userId = userId;
        req.session.authenticated = true;
      }

      // Check if it's a group or friend invitation
      const groups = await storage.getGroupsList(data.inviterId);
      const isGroup = groups.some((g: any) => g.id === data.roomId);
      
      if (isGroup) {
        // Add user to group
        await storage.addGroupMember(data.roomId, userId);
      } else {
        // Add as friend relationship
        await storage.addFriend(data.inviterId, userId);
      }

      res.json({ 
        ok: true, 
        roomId: data.roomId, 
        roomType: isGroup ? 'group' : 'friend',
        userId: userId
      });
    } catch (error: any) {
      console.error("Invite accept error:", error);
      if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
        return res.status(400).json({ error: 'INVALID_OR_EXPIRED' });
      }
      res.status(500).json({ error: 'Failed to accept invitation' });
    }
  });

  // Invite preview page with OG cards
  app.get("/invite/:token", (req, res) => {
    const { token } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const chatUrl = `${baseUrl}/chat/redirect?ml=${encodeURIComponent(token)}`;
    
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><html><head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta property="og:title" content="Trustalk · 多语言即时沟通" />
      <meta property="og:description" content="多语言即时沟通，让世界无语言障碍 · 支持自动翻译、语音视频通话 · Trustalk.app" />
      <meta property="og:image" content="${baseUrl}/static/share-cover.jpg" />
      <meta property="og:url" content="${chatUrl}" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Trustalk" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Trustalk · 多语言即时沟通" />
      <meta name="twitter:description" content="让世界无语言障碍，支持自动翻译和实时沟通" />
      <meta name="twitter:image" content="${baseUrl}/static/share-cover.jpg" />
      <meta http-equiv="refresh" content="0;url=${chatUrl}" />
      <title>邀请你加入Trustalk聊天</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .card { background: white; color: #333; border-radius: 16px; padding: 32px; display: inline-block; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 16px; }
        a { color: #667eea; text-decoration: none; font-weight: bold; }
      </style>
    </head><body>
      <div class="card">
        <div class="logo">Trustalk</div>
        <p>正在加入聊天会话...</p>
        <p>如未自动跳转，请<a href="${chatUrl}">点击此处</a></p>
      </div>
    </body></html>`);
  });

  // Smart Share API - AI生成平台专属分享链接
  app.post("/api/smart-share", requireAuth, async (req, res) => {
    try {
      const { platform } = req.body;
      const userId = req.session.userId!;
      
      // 平台配置类型定义
      interface PlatformConfig {
        name: string;
        icon: string;
        url: (text: string, link: string) => string;
      }
      
      // 平台配置
      const platformConfigs: Record<string, PlatformConfig> = {
        'whatsapp': {
          name: 'WhatsApp',
          icon: '💬',
          url: (text: string, link: string) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`
        },
        'line': {
          name: 'LINE',
          icon: '🟢', 
          url: (text: string, link: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
        },
        'telegram': {
          name: 'Telegram',
          icon: '✈️',
          url: (text: string, link: string) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
        },
        'messenger': {
          name: 'Messenger', 
          icon: '💙',
          url: (text: string, link: string) => `https://www.messenger.com/t/?link=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
        },
        'viber': {
          name: 'Viber',
          icon: '💜',
          url: (text: string, link: string) => `viber://forward?text=${encodeURIComponent(text + ' ' + link)}`
        },
        'zalo': {
          name: 'Zalo',
          icon: '🔵',
          url: (text: string, link: string) => `https://zalo.me/s/${encodeURIComponent(link)}?text=${encodeURIComponent(text)}`
        },
        'sms': {
          name: 'SMS',
          icon: '📱',
          url: (text: string, link: string) => `sms:?body=${encodeURIComponent(text + ' ' + link)}`
        },
        'email': {
          name: 'Email',
          icon: '📧', 
          url: (text: string, link: string) => `mailto:?subject=${encodeURIComponent('邀请加入Trustalk')}&body=${encodeURIComponent(text + '\n\n' + link)}`
        }
      };

      const config = platformConfigs[platform as string];
      if (!config) {
        return res.status(400).json({ error: 'Unsupported platform' });
      }

      // 生成Magic Link
      const roomId = "11111111-1111-1111-1111-111111111111";
      const payload = { 
        roomId, 
        inviterId: userId, 
        typ: 'ml', 
        jti: nanoid(),
        iat: Math.floor(Date.now() / 1000)
      };
      
      const secret = process.env.SESSION_SECRET || 'default-secret-key';
      const token = jwt.sign(payload, secret, { expiresIn: '7d' });
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const magicLink = `${baseUrl}/invite/${token}`;
      
      // 生成分享文案
      const shareText = `🌍 加入我在Trustalk的聊天！支持多语言自动翻译，语音视频通话无障碍，全球朋友轻松沟通！`;
      
      // 生成平台专属分享链接
      const shareUrl = config.url(shareText, magicLink);
      
      res.json({
        platform: config.name,
        icon: config.icon,
        shareUrl,
        shareText,
        magicLink,
        message: `已为您生成${config.name}分享链接！直接复制发给好友即可：`
      });
      
    } catch (error) {
      console.error("Smart share error:", error);
      res.status(500).json({ error: 'Failed to generate smart share link' });
    }
  });

  // Analytics/埋点系统
  app.post("/api/analytics/events", (req, res) => {
    try {
      const { type, channel, roomId, userId, ...extra } = req.body;
      
      // 简单日志记录，生产环境可以推送到专门的分析系统
      
      res.json({ ok: true });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: 'Failed to log analytics event' });
    }
  });

  // OSS配置测试路由（仅开发环境）
  app.post("/api/dev/oss/test-upload", requireAuth, async (req, res) => {
    try {
      const { uploadToOSS, deleteFromOSS, generateSignedUrl } = await import('./services/oss');
      
      // 创建一个测试文件
      const testContent = `OSS Test Upload - ${new Date().toISOString()}\nBucket: ${process.env.ALIYUN_OSS_BUCKET}\nRegion: ${process.env.ALIYUN_OSS_REGION}\nEndpoint: ${process.env.ALIYUN_OSS_ENDPOINT}`;
      const testBuffer = Buffer.from(testContent, 'utf-8');
      
      
      // 上传测试文件到 misc 分类
      const result = await uploadToOSS(testBuffer, 'misc', 'oss-test.txt');
      
      
      // 生成签名URL（用于私有bucket，使用默认30天有效期）
      const signedUrl = await generateSignedUrl(result.ossPath);
      
      // 立即删除测试文件（清理）
      await deleteFromOSS(result.ossPath);
      
      res.json({
        success: true,
        message: 'OSS配置测试成功！新bucket工作正常',
        details: {
          bucket: process.env.ALIYUN_OSS_BUCKET,
          region: process.env.ALIYUN_OSS_REGION,
          endpoint: process.env.ALIYUN_OSS_ENDPOINT,
          uploadedPath: result.ossPath,
          publicUrl: result.url,
          signedUrl: signedUrl,
          note: '测试文件已自动清理'
        }
      });
    } catch (error) {
      console.error('❌ OSS测试失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'OSS测试失败',
        details: {
          bucket: process.env.ALIYUN_OSS_BUCKET,
          region: process.env.ALIYUN_OSS_REGION,
          endpoint: process.env.ALIYUN_OSS_ENDPOINT
        }
      });
    }
  });

  // ⚠️ LINE Webhook已移至server/index.ts，必须在express.json()之前注册

  // ==================== 收藏消息 API ====================
  
  // 添加收藏
  app.post("/api/favorites", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { messageId, note } = req.body;
      
      if (!messageId) {
        return res.status(400).json({ error: "消息ID不能为空" });
      }
      
      // 检查消息是否存在
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "消息不存在" });
      }
      
      // 添加收藏
      const { favorites } = await import("@shared/schema");
      const [existing] = await db.select().from(favorites)
        .where(and(
          eq(favorites.userId, userId),
          eq(favorites.messageId, messageId)
        ));
      
      if (existing) {
        return res.status(400).json({ error: "已经收藏过了" });
      }
      
      const [newFavorite] = await db.insert(favorites).values({
        userId,
        messageId,
        note
      }).returning();
      
      res.json({ success: true, favorite: newFavorite });
    } catch (error) {
      console.error("添加收藏失败:", error);
      res.status(500).json({ error: "添加收藏失败" });
    }
  });
  
  // 获取收藏列表
  app.get("/api/favorites", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { favorites, messages, users } = await import("@shared/schema");
      
      const userFavorites = await db
        .select({
          id: favorites.id,
          messageId: favorites.messageId,
          note: favorites.note,
          createdAt: favorites.createdAt,
          message: {
            id: messages.id,
            content: messages.content,
            messageType: messages.messageType,
            fromUserId: messages.fromUserId,
            createdAt: messages.createdAt
          }
        })
        .from(favorites)
        .innerJoin(messages, eq(favorites.messageId, messages.id))
        .where(eq(favorites.userId, userId))
        .orderBy(desc(favorites.createdAt));
      
      res.json(userFavorites);
    } catch (error) {
      console.error("获取收藏列表失败:", error);
      res.status(500).json({ error: "获取收藏列表失败" });
    }
  });
  
  // 删除收藏
  app.delete("/api/favorites/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const favoriteId = req.params.id;
      const { favorites } = await import("@shared/schema");
      
      const result = await db.delete(favorites)
        .where(and(
          eq(favorites.id, favoriteId),
          eq(favorites.userId, userId)
        ))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "收藏不存在" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("删除收藏失败:", error);
      res.status(500).json({ error: "删除收藏失败" });
    }
  });
  
  // ==================== 删除消息 API ====================
  
  // 删除消息（仅发送者可删除）
  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const messageId = req.params.id;
      
      // 获取消息
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ error: "消息不存在" });
      }
      
      // 只有发送者可以删除自己的消息
      if (message.fromUserId !== userId) {
        return res.status(403).json({ error: "只能删除自己发送的消息" });
      }
      
      // 删除消息
      const { messages } = await import("@shared/schema");
      await db.delete(messages).where(eq(messages.id, messageId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("删除消息失败:", error);
      res.status(500).json({ error: "删除消息失败" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ==================== Trustalk 邀请链接 OG 元数据 ====================
  // 为 Trustalk 邀请链接提供专门的 OG 元数据，确保在 LINE/WhatsApp 等平台显示正确的品牌
  app.get("/transtalk/join/:code", async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    
    // 检测是否是社交平台的爬虫（用于链接预览）
    const isCrawler = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|LINE|Slackbot|TelegramBot|Discordbot/i.test(userAgent);
    
    if (isCrawler) {
      // 检测语言偏好
      const acceptLang = req.headers['accept-language'] || '';
      let lang = 'zh'; // 默认中文
      if (acceptLang.startsWith('th')) lang = 'th';
      else if (acceptLang.startsWith('en')) lang = 'en';
      else if (acceptLang.startsWith('ja')) lang = 'ja';
      else if (acceptLang.startsWith('id')) lang = 'id';
      else if (acceptLang.startsWith('vi')) lang = 'vi';
      
      // 多语言广告语
      const i18n: Record<string, { slogan: string; desc: string; invite: string; loading: string }> = {
        zh: { 
          slogan: '有信任 才沟通', 
          desc: '多语言自动翻译客服工作台',
          invite: '您收到了工作台邀请！点击加入，开启多语言客服之旅',
          loading: '正在跳转到 Trustalk...'
        },
        en: { 
          slogan: 'Trust to Communicate', 
          desc: 'Multi-language Auto-Translation Customer Service Platform',
          invite: 'You received a workspace invitation! Click to join and start your multilingual journey',
          loading: 'Redirecting to Trustalk...'
        },
        th: { 
          slogan: 'มีความเชื่อใจ จึงสื่อสาร', 
          desc: 'แพลตฟอร์มบริการลูกค้าแปลภาษาอัตโนมัติหลายภาษา',
          invite: 'คุณได้รับคำเชิญเข้าร่วมพื้นที่ทำงาน! คลิกเพื่อเข้าร่วม',
          loading: 'กำลังเปลี่ยนเส้นทางไปยัง Trustalk...'
        },
        ja: { 
          slogan: '信頼があってこそ、コミュニケーション', 
          desc: '多言語自動翻訳カスタマーサービスプラットフォーム',
          invite: 'ワークスペースへの招待を受け取りました！クリックして参加',
          loading: 'Trustalkにリダイレクト中...'
        },
        id: { 
          slogan: 'Kepercayaan untuk Berkomunikasi', 
          desc: 'Platform Layanan Pelanggan Terjemahan Otomatis Multi-bahasa',
          invite: 'Anda menerima undangan ruang kerja! Klik untuk bergabung',
          loading: 'Mengalihkan ke Trustalk...'
        },
        vi: { 
          slogan: 'Tin tưởng để Giao tiếp', 
          desc: 'Nền tảng dịch vụ khách hàng dịch tự động đa ngôn ngữ',
          invite: 'Bạn đã nhận được lời mời không gian làm việc! Nhấp để tham gia',
          loading: 'Đang chuyển hướng đến Trustalk...'
        }
      };
      
      const t = i18n[lang] || i18n.zh;
      const baseUrl = process.env.APP_URL || `https://${req.get('host')}`;
      const inviteUrl = `${baseUrl}/transtalk/join/${req.params.code}`;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trustalk · ${t.slogan}</title>
  <meta name="description" content="Trustalk - ${t.slogan} | ${t.desc}" />
  <meta property="og:title" content="Trustalk · ${t.slogan}" />
  <meta property="og:description" content="${t.invite}" />
  <meta property="og:image" content="${baseUrl}/trustalk-share.png" />
  <meta property="og:url" content="${inviteUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Trustalk" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Trustalk · ${t.slogan}" />
  <meta name="twitter:description" content="${t.invite}" />
</head>
<body>
  <script>window.location.href = "${inviteUrl}";</script>
  <p>${t.loading}</p>
</body>
</html>`);
    } else {
      // 正常用户请求，继续到 Vite/SPA 处理
      next();
    }
  });

  // ==================== 非流式 STT 接口 ====================
  // 接收任意格式音频 → ffmpeg转码为16kHz PCM → DashScope一次性识别
  const sttUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  app.post("/api/stt/recognize", requireAuth, sttUpload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "未上传音频文件" });
      }

      const { recognizeAudioNonStreaming } = await import("./services/batch-stt");
      
      // 从 mimetype 获取格式提示
      let format = 'webm';
      if (req.file.mimetype) {
        if (req.file.mimetype.includes('opus')) format = 'opus';
        else if (req.file.mimetype.includes('webm')) format = 'webm';
        else if (req.file.mimetype.includes('mp3')) format = 'mp3';
        else if (req.file.mimetype.includes('wav')) format = 'wav';
        else if (req.file.mimetype.includes('m4a')) format = 'm4a';
        else if (req.file.mimetype.includes('ogg')) format = 'ogg';
      }

      console.log(`🎤 [STT] 收到音频文件: ${req.file.size} bytes, format=${format}, mimetype=${req.file.mimetype}`);

      const recognizedText = await recognizeAudioNonStreaming(req.file.buffer, format);
      
      res.json({ 
        success: true, 
        text: recognizedText,
        format,
        audioSize: req.file.size
      });
    } catch (error: any) {
      console.error("❌ [STT] 识别失败:", error);
      res.status(500).json({ 
        error: "语音识别失败", 
        details: error.message 
      });
    }
  });

  return httpServer;
}

