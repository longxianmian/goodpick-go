import { speechToText, textToSpeech, mapLanguageToDashScope } from './dashscope-speech';
import { callCosyVoiceTTS, callOpenAITTS } from './dh-ai-client';
import { storage } from '../storage';
import { db } from '../db';
import { messages, digitalHumans, dhConversations, dhMessages, type DhMessage } from '../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { dhStreamService } from './dh-stream';

/**
 * 处理语音消息的完整流程：
 * 1. STT: 语音识别（原语言）
 * 2. 翻译：翻译成目标语言（普通用户）
 *    或 GPT回复 + TTS（数字人）
 * 3. TTS: 语音合成（目标语言）
 * 
 * @param audioInput - 可以是 OSS URL 或直接传入 Buffer（更快）
 */
export async function processVoiceMessage(
  messageId: string,
  audioInput: string | Buffer,
  fromUserId: string,
  toUserId: string | null,
  groupId: string | null
): Promise<void> {
  try {
    // 检测是否是发给数字人的消息
    const isDigitalHuman = toUserId?.startsWith('dh-') ?? false;
    
    if (isDigitalHuman && toUserId) {
      // 数字人语音处理：简化流程
      await processDigitalHumanVoice(messageId, audioInput, fromUserId, toUserId);
      return;
    }
    
    // === 普通好友语音处理（简化版：只做 STT 识别文字，不做 TTS）===
    
    console.log(`🎤 [VoiceFriend] 普通好友语音消息: ${messageId}`);
    
    // 步骤1: 语音识别（STT）- 将语音转成文字显示
    let transcript = '';
    try {
      const sttResult = await speechToText(audioInput, 'auto');
      transcript = sttResult.text || '';
      console.log(`✅ [VoiceFriend] STT完成: "${transcript.slice(0, 50)}..."`);
    } catch (sttError) {
      console.warn(`⚠️ [VoiceFriend] STT失败，继续处理:`, sttError);
    }

    // 步骤2: 更新消息记录（只保存识别的文字，不生成 TTS）
    await storage.updateMessageVoiceProcessing(messageId, {
      transcript: transcript,
      translatedTranscript: transcript, // 普通好友不翻译，直接用原文
      processingStatus: 'ready'
    });

    // 步骤3: 通过 WebSocket 通知前端更新（已识别文字）
    const { websocketService } = await import('./websocket');
    
    const updatedMessage = await storage.getMessage(messageId);
    if (updatedMessage) {
      // 通知发送者
      websocketService.sendToUser(fromUserId, {
        type: 'voiceProcessed',
        message: updatedMessage
      });
      
      // 通知接收者
      if (toUserId) {
        websocketService.sendToUser(toUserId, {
          type: 'voiceProcessed',
          message: updatedMessage
        });
      } else if (groupId) {
        const groupMembers = await storage.getGroupMembers(groupId);
        for (const member of groupMembers) {
          if (member.id !== fromUserId) {
            websocketService.sendToUser(member.id, {
              type: 'voiceProcessed',
              message: updatedMessage
            });
          }
        }
      }
    }
    
    console.log(`✅ [VoiceFriend] 语音消息处理完成: ${messageId}`);
  } catch (error) {
    console.error('语音消息处理失败:', error);
    
    // 标记处理失败
    await storage.updateMessageVoiceProcessing(messageId, {
      processingStatus: 'error'
    });
    
    // 通知所有相关用户处理失败
    const { websocketService } = await import('./websocket');
    
    // 获取失败后的消息（包含fromUser）
    const failedMessage = await storage.getMessage(messageId);
    if (failedMessage) {
      // 通知发送者
      websocketService.sendToUser(fromUserId, {
        type: 'voiceProcessed',
        message: failedMessage
      });
      
      // 通知接收者（私聊或群聊）
      if (toUserId) {
        websocketService.sendToUser(toUserId, {
          type: 'voiceProcessed',
          message: failedMessage
        });
      } else if (groupId) {
        const groupMembers = await storage.getGroupMembers(groupId);
        for (const member of groupMembers) {
          if (member.id !== fromUserId) {
            websocketService.sendToUser(member.id, {
              type: 'voiceProcessed',
              message: failedMessage
            });
          }
        }
      }
    }
    
    throw error;
  }
}

/**
 * 🚀 数字人语音处理 - 分阶段推送架构（低延迟）
 * 
 * 延迟优化策略：
 * 1. 立即创建占位消息 "正在思考..." (0ms)
 * 2. STT完成后更新用户消息 (3-5s)
 * 3. GPT流式生成，边生成边推送文字更新 (再加3-5s)
 * 4. TTS完成后更新语音URL (再加5-10s)
 * 
 * 目标：用户3秒内看到反馈，5秒内看到文字回复
 */
async function processDigitalHumanVoice(
  messageId: string,
  audioInput: string | Buffer,
  fromUserId: string,
  toUserId: string
): Promise<void> {
  const { websocketService } = await import('./websocket');
  const { callChatGPTStreaming, callOpenAITTS, callCosyVoiceTTS, isOpenAITTSAvailable } = await import('./dh-ai-client');
  const startTime = Date.now();
  
  // 辅助函数：双通道推送消息
  const pushToUser = (message: any, eventType: string = 'newMessage') => {
    // WebSocket 推送（C端 Trustalk）
    websocketService.sendToUser(fromUserId, {
      type: eventType,
      message,
      chatId: toUserId,
      chatType: 'friend',
      isGroup: false
    });
    // SSE 推送（B端 Trustalk 工作台）
    dhStreamService.pushMessage(fromUserId, message);
  };
  
  // 辅助函数：推送消息更新（增量更新）
  const pushMessageUpdate = (messageId: string, updates: any) => {
    // WebSocket 推送（C端 Trustalk）
    websocketService.sendToUser(fromUserId, {
      type: 'messageUpdate',
      messageId,
      updates,
      chatId: toUserId,
      chatType: 'friend'
    });
    // SSE 推送消息更新（B端 Trustalk 工作台）
    dhStreamService.pushMessageUpdate(fromUserId, messageId, updates);
  };
  
  let replyMessageId: string | null = null;
  
  try {
    console.log(`🚀 [DH-Voice-v2] 开始低延迟处理: ${messageId}`);
    
    // ========== 阶段0: 立即创建占位消息 (0ms) ==========
    const placeholderInsert = await db
      .insert(messages)
      .values({
        fromUserId: toUserId,
        toUserId: fromUserId,
        content: '...',
        originalText: '...',
        originalLang: 'zh',
        messageType: 'text',
        modality: 'text',
        channel: 'mytalk',
        isRead: false,
      })
      .returning();
    const placeholderMsg = Array.isArray(placeholderInsert) ? placeholderInsert[0] : placeholderInsert;
    replyMessageId = placeholderMsg.id;
    
    if (!replyMessageId) {
      throw new Error('创建占位消息失败');
    }
    
    // 立即推送占位消息
    const fullPlaceholder = await storage.getMessage(replyMessageId);
    if (fullPlaceholder) {
      pushToUser(fullPlaceholder);
      console.log(`⚡ [DH-Voice-v2] 占位消息已推送 (${Date.now() - startTime}ms)`);
    }
    
    // ========== 阶段1: STT语音识别 (3-5s) ==========
    const sttResult = await speechToText(audioInput, 'auto');
    if (!sttResult.text) {
      throw new Error('语音识别失败：无法识别内容');
    }
    console.log(`✅ [DH-Voice-v2] STT完成 (${Date.now() - startTime}ms): "${sttResult.text.slice(0, 30)}..."`);
    
    // 更新用户消息的转写
    await storage.updateMessageVoiceProcessing(messageId, {
      transcript: sttResult.text,
      processingStatus: 'ready'
    });
    const userMessage = await storage.getMessage(messageId);
    if (userMessage) {
      websocketService.sendToUser(fromUserId, { type: 'voiceProcessed', message: userMessage });
    }
    
    // ========== 阶段2: 获取数字人信息 ==========
    const [human] = await db.select().from(digitalHumans).where(eq(digitalHumans.id, toUserId)).limit(1);
    if (!human) throw new Error(`数字人不存在: ${toUserId}`);
    
    const recipient = await storage.getUser(fromUserId);
    const userLang = recipient?.languagePreference || 'zh';
    const persona = human.persona as any;
    
    const languageInstruction = userLang === 'zh' 
      ? '请用中文简洁回复，不超过100字。' 
      : userLang === 'en' 
        ? 'Reply briefly in English, under 50 words.' 
        : `Reply briefly in language: ${userLang}.`;
    
    const voiceCapabilityNote = userLang === 'zh'
      ? '你具备语音对话能力。当用户发送语音消息时，你的回复会自动转换成语音播放。所以你不需要提醒用户"发语音给我"，直接自然对话即可。'
      : 'You have voice conversation capability. When users send voice messages, your replies will be automatically converted to speech. You do not need to ask users to send voice messages.';
    
    const basePrompt = persona?.systemPrompt || `你是${human.name}，一个友好的AI助手。`;
    const systemPrompt = `${basePrompt}\n\n${voiceCapabilityNote}\n\n${languageInstruction}`;
    
    // ========== 阶段2.5: 获取或创建对话，加载对话历史（共享文字和语音历史）==========
    // 查找或创建 dhConversation
    let conversation = await db
      .select()
      .from(dhConversations)
      .where(
        and(
          eq(dhConversations.userId, fromUserId),
          eq(dhConversations.humanId, toUserId),
          eq(dhConversations.status, 'active')
        )
      )
      .limit(1)
      .then(rows => rows[0]);
    
    if (!conversation) {
      const [newConv] = await db
        .insert(dhConversations)
        .values({
          userId: fromUserId,
          humanId: toUserId,
          status: 'active',
          context: {},
        })
        .returning();
      conversation = newConv;
      console.log(`📝 [DH-Voice-v2] 创建新对话: ${conversation.id}`);
    }
    
    // 加载对话历史（最近20条）
    const historyMessages = await db
      .select()
      .from(dhMessages)
      .where(eq(dhMessages.conversationId, conversation.id))
      .orderBy(desc(dhMessages.createdAt))
      .limit(20);
    
    // 将历史消息转换为 GPT 格式（按时间正序，只保留 user/assistant 角色）
    const historyForGPT = historyMessages
      .reverse()
      .filter((msg: DhMessage) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg: DhMessage) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
    
    console.log(`📚 [DH-Voice-v2] 加载对话历史: ${historyForGPT.length} 条消息`);
    
    // ========== 阶段3: 流式GPT生成（带历史上下文）==========
    // 用户发语音时，不推送文本，等 TTS 完成后直接推送语音
    console.log(`🎤 [DH-Voice-v2] 用户发送语音消息，等待生成语音后推送`);
    
    // 构建带历史的消息数组
    const gptMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...historyForGPT,
      { role: 'user' as const, content: sttResult.text }
    ];
    
    const aiResponse = await callChatGPTStreaming(
      gptMessages,
      { maxTokens: 500 },
      {
        onToken: () => {
          // 语音模式：不推送中间文本，保持占位状态
        },
        onComplete: (fullText) => {
          console.log(`✅ [DH-Voice-v2] GPT完成 (${Date.now() - startTime}ms): ${fullText.length}字符`);
        }
      }
    );
    
    // ========== 保存用户语音消息和AI回复到 dhMessages（确保历史连续）==========
    await db.insert(dhMessages).values([
      {
        conversationId: conversation.id,
        role: 'user',
        content: sttResult.text,
        messageType: 'text',
        inputMode: 'voice',
      },
      {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiResponse,
        messageType: 'text',
        inputMode: 'voice',
      }
    ]);
    
    // 更新会话最后消息时间
    await db
      .update(dhConversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(dhConversations.id, conversation.id));
    
    console.log(`💾 [DH-Voice-v2] 对话历史已保存到 dhMessages`);
    
    // 更新数据库中的文字内容
    await db.update(messages)
      .set({ 
        content: aiResponse,
        originalText: aiResponse,
        originalLang: userLang
      })
      .where(eq(messages.id, replyMessageId!));
    
    // ========== 阶段4: TTS语音合成（同步等待） ==========
    console.log(`🎤 [DH-Voice-v2] 开始生成语音 (${Date.now() - startTime}ms)`);
    
    // 同步等待 TTS 完成
    try {
      let ttsAudioUrl: string | undefined;
      let ttsDuration: number = 0;
      
      // 使用 OpenAI TTS（nova 音色 - 明亮女声，语速1.15增加活泼感）
      if (isOpenAITTSAvailable()) {
        try {
          const openaiVoice = userLang === 'zh' ? 'nova' : 'nova';
          const ttsResult = await callOpenAITTS(aiResponse, { voice: openaiVoice, speed: 1.15 });
          ttsAudioUrl = ttsResult.audioUrl;
          if (ttsResult.audioBuffer) {
            ttsDuration = Math.ceil(ttsResult.audioBuffer.length / 24000);
          }
          console.log(`🎵 [DH-Voice-v2] 使用 OpenAI TTS nova 音色，语速 1.15`);
        } catch (openaiError) {
          console.warn(`⚠️ [DH-Voice-v2] OpenAI TTS失败，回退到 CosyVoice:`, openaiError);
          // 回退到 CosyVoice TTS
          const customVoice = persona?.voiceId;
          const voice = customVoice || (userLang === 'zh' ? 'longxiaoxia_v2' : 'loongstella_v2');
          const ttsResult = await callCosyVoiceTTS(aiResponse, { voice });
          ttsAudioUrl = ttsResult.audioUrl;
          if (ttsResult.audioBuffer) {
            ttsDuration = Math.ceil(ttsResult.audioBuffer.length / 16000);
          }
        }
      } else {
        // 如果 OpenAI TTS 不可用，回退到 CosyVoice
        const customVoice = persona?.voiceId;
        const voice = customVoice || (userLang === 'zh' ? 'longxiaoxia_v2' : 'loongstella_v2');
        const ttsResult = await callCosyVoiceTTS(aiResponse, { voice });
        ttsAudioUrl = ttsResult.audioUrl;
        if (ttsResult.audioBuffer) {
          ttsDuration = Math.ceil(ttsResult.audioBuffer.length / 16000);
        }
      }
      
      if (ttsAudioUrl) {
        // 更新数据库
        await db.update(messages)
          .set({
            messageType: 'audio',
            modality: 'audio',
            mediaUrl: ttsAudioUrl,
            mediaDuration: ttsDuration,
            transcript: aiResponse
          })
          .where(eq(messages.id, replyMessageId!));
        
        // 推送语音更新（增量更新，前端会更新已有的占位消息）
        pushMessageUpdate(replyMessageId!, {
          messageType: 'audio',
          mediaUrl: ttsAudioUrl,
          mediaDuration: ttsDuration,
          transcript: aiResponse
        });
        console.log(`🔊 [DH-Voice-v2] 语音更新已推送 (${Date.now() - startTime}ms)`);
      }
    } catch (ttsError) {
      console.error(`⚠️ [DH-Voice-v2] TTS失败，回退文本消息:`, ttsError);
      // TTS 失败时，推送文本消息作为兜底（更新占位消息为文本内容）
      pushMessageUpdate(replyMessageId!, {
        content: aiResponse,
        messageType: 'text'
      });
      console.log(`📝 [DH-Voice-v2] 文本更新已推送（TTS失败兜底） (${Date.now() - startTime}ms)`);
    }
    
    console.log(`✅ [DH-Voice-v2] 完整流程完成 (${Date.now() - startTime}ms)`);
    
  } catch (error) {
    console.error(`❌ [DH-Voice-v2] 处理失败:`, error);
    
    try {
      // 更新用户消息的失败状态
      await storage.updateMessageVoiceProcessing(messageId, { processingStatus: 'error' });
      
      // 如果有占位消息，更新为错误提示（不删除，避免重复创建）
      if (replyMessageId) {
        await db.update(messages)
          .set({ 
            content: '抱歉，处理失败，请重试',
            messageType: 'text',
            modality: 'text'
          })
          .where(eq(messages.id, replyMessageId));
        
        // 推送更新后的错误消息
        pushMessageUpdate(replyMessageId, { 
          content: '抱歉，处理失败，请重试' 
        });
      }
    } catch (cleanupError) {
      console.error(`❌ [DH-Voice-v2] 清理失败:`, cleanupError);
    }
    
    // 不再重新抛出错误，避免上层重复处理
    // throw error;
  }
}
