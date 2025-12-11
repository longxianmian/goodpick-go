import { translateMessage, detectTextLanguage } from './openai';
import type { User } from '@shared/schema';

/**
 * 统一的消息处理结果
 */
export interface ProcessedMessage {
  originalText: string;
  translatedText: string;
  needsTranslation: boolean;
  translationInfo?: {
    sourceLanguage: string;
    targetLanguage: string;
    confidence: number;
  };
}

/**
 * 统一的消息处理服务 - 简单直接
 * 
 * 核心原则：
 * 1. 检测消息实际语言
 * 2. 对比接收者语言偏好
 * 3. 不同就翻译，相同就跳过
 * 
 * 这个函数被HTTP和WebSocket共用，确保逻辑一致
 */
export async function processMessageForRecipient(
  messageContent: string,
  messageType: string,
  recipientLanguage: string,
  senderLanguage?: string,
  originalLanguage?: string
): Promise<ProcessedMessage> {
  
  // 非文本消息不翻译
  if (messageType !== 'text') {
    return {
      originalText: messageContent,
      translatedText: messageContent,
      needsTranslation: false
    };
  }

  // ✅ 确定消息的实际语言
  const detectedLanguage = detectTextLanguage(messageContent);
  
  let actualLanguage: string;
  if (originalLanguage) {
    actualLanguage = originalLanguage;
  } else if (detectedLanguage !== 'unknown') {
    actualLanguage = detectedLanguage;
  } else {
    actualLanguage = 'unknown';
  }

  console.log(`🌐 翻译判断: 消息语言=${actualLanguage}, 目标语言=${recipientLanguage}, 内容="${messageContent.substring(0, 30)}..."`);

  // 核心逻辑：比较消息实际语言 vs 接收者目标语言
  if (actualLanguage !== 'unknown' && actualLanguage === recipientLanguage) {
    console.log(`⏭️ 跳过翻译: 语言相同 (${actualLanguage})`);
    return {
      originalText: messageContent,
      translatedText: messageContent,
      needsTranslation: false
    };
  }

  // 语言不同，需要翻译
  console.log(`🔄 执行翻译: ${actualLanguage} -> ${recipientLanguage}`);
  try {
    const translationResult = await translateMessage(
      messageContent,
      recipientLanguage,
      "casual"
    );

    console.log(`✅ 翻译完成: "${translationResult.translatedText.substring(0, 30)}..."`);
    return {
      originalText: messageContent,
      translatedText: translationResult.translatedText,
      needsTranslation: true,
      translationInfo: {
        sourceLanguage: actualLanguage,
        targetLanguage: recipientLanguage,
        confidence: translationResult.confidence
      }
    };
  } catch (error) {
    console.error('❌ 翻译失败:', error);
    return {
      originalText: messageContent,
      translatedText: messageContent,
      needsTranslation: false
    };
  }
}
