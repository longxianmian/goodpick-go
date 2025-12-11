/**
 * 翻译语音电话核心服务
 * 
 * 实现流式 STT → 流式 MT → 流式 TTS 通话链路
 * 遵循天条规则：
 * - 谁说就保留谁的原文语音
 * - 谁听就按谁的语言翻译
 * - 语言相同不翻译，语言不同才走翻译链路
 */

import { db } from '../db';
import { callSessions, callUtterances, userVoiceProfiles, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { translateMessage } from './openai';
import { textToSpeech, mapLanguageToDashScope, mapUserVoicePreference } from './dashscope-speech';

export interface CallParticipant {
  userId: string;
  preferredLang: string;
  voicePreference?: string;
}

export interface TranslatedCallConfig {
  callSessionId: string;
  tenantId?: string;
  caller: CallParticipant;
  callee: CallParticipant;
}

export interface UtteranceResult {
  id: string;
  speakerRole: 'caller' | 'callee';
  sourceLang: string;
  targetLang: string;
  originalText: string;
  translatedText?: string;
  translatedAudioUrl?: string;
  needsTranslation: boolean;
}

/**
 * 翻译语音电话管理器
 * 处理通话中的实时语音翻译
 */
export class TranslatedCallManager {
  private config: TranslatedCallConfig;
  private utteranceSequence: number = 0;

  constructor(config: TranslatedCallConfig) {
    this.config = config;
  }

  /**
   * 获取通话双方的语音偏好设置
   */
  static async getParticipantVoiceProfiles(callerUserId: string, calleeUserId: string) {
    const [callerProfile, calleeProfile] = await Promise.all([
      db.query.userVoiceProfiles.findFirst({
        where: eq(userVoiceProfiles.userId, callerUserId)
      }),
      db.query.userVoiceProfiles.findFirst({
        where: eq(userVoiceProfiles.userId, calleeUserId)
      })
    ]);

    return { callerProfile, calleeProfile };
  }

  /**
   * 处理一段语音输入（STT 结果）
   * 
   * @param speakerRole - 说话方（caller 或 callee）
   * @param sttResult - STT 识别结果
   * @returns 翻译结果（如果需要翻译）
   */
  async processUtterance(
    speakerRole: 'caller' | 'callee',
    sttResult: {
      text: string;
      sourceLang: string;
      isFinal: boolean;
      utteranceId?: string;
    }
  ): Promise<UtteranceResult | null> {
    const { text, sourceLang, isFinal, utteranceId } = sttResult;
    
    if (!text || text.trim().length === 0) {
      return null;
    }

    const speaker = speakerRole === 'caller' ? this.config.caller : this.config.callee;
    const listener = speakerRole === 'caller' ? this.config.callee : this.config.caller;

    const needsTranslation = sourceLang !== listener.preferredLang;

    console.log(`🎤 [TranslatedCall] ${speakerRole} 说话: "${text.substring(0, 50)}..." (${sourceLang}) → ${listener.preferredLang}, 需翻译: ${needsTranslation}`);

    if (!needsTranslation) {
      if (isFinal) {
        await this.saveUtterance({
          speakerRole,
          speakerUserId: speaker.userId,
          sourceLang,
          targetLang: listener.preferredLang,
          originalText: text,
          translatedText: undefined
        });
      }
      return {
        id: utteranceId || `utt-${Date.now()}`,
        speakerRole,
        sourceLang,
        targetLang: listener.preferredLang,
        originalText: text,
        translatedText: undefined,
        translatedAudioUrl: undefined,
        needsTranslation: false
      };
    }

    try {
      const translateResult = await translateMessage(text, listener.preferredLang, 'casual');
      
      console.log(`🌐 [TranslatedCall] 翻译完成: "${translateResult.translatedText.substring(0, 50)}..."`);

      let translatedAudioUrl: string | undefined;

      if (isFinal) {
        const ttsLang = mapLanguageToDashScope(listener.preferredLang);
        const voicePreference = listener.voicePreference || 'female';
        const mappedVoice = mapUserVoicePreference(voicePreference, ttsLang);
        
        console.log(`🔊 [TranslatedCall] TTS生成 ${listener.preferredLang} 语音, 音色: ${mappedVoice}...`);
        
        const ttsResult = await textToSpeech(translateResult.translatedText, ttsLang, mappedVoice);
        translatedAudioUrl = ttsResult.audioUrl;
        
        console.log(`✅ [TranslatedCall] TTS生成成功`);

        await this.saveUtterance({
          speakerRole,
          speakerUserId: speaker.userId,
          sourceLang,
          targetLang: listener.preferredLang,
          originalText: text,
          translatedText: translateResult.translatedText
        });
      }

      return {
        id: utteranceId || `utt-${Date.now()}`,
        speakerRole,
        sourceLang,
        targetLang: listener.preferredLang,
        originalText: text,
        translatedText: translateResult.translatedText,
        translatedAudioUrl,
        needsTranslation: true
      };
    } catch (error) {
      console.error('❌ [TranslatedCall] 翻译/TTS失败:', error);
      return {
        id: utteranceId || `utt-${Date.now()}`,
        speakerRole,
        sourceLang,
        targetLang: listener.preferredLang,
        originalText: text,
        translatedText: undefined,
        translatedAudioUrl: undefined,
        needsTranslation: true
      };
    }
  }

  /**
   * 保存通话片段到数据库
   */
  private async saveUtterance(data: {
    speakerRole: 'caller' | 'callee';
    speakerUserId: string;
    sourceLang: string;
    targetLang: string;
    originalText: string;
    translatedText?: string;
  }) {
    try {
      this.utteranceSequence++;

      await db.insert(callUtterances).values({
        callSessionId: this.config.callSessionId,
        speakerUserId: data.speakerUserId,
        speakerRole: data.speakerRole,
        sequence: this.utteranceSequence,
        startedAt: new Date(),
        sourceLang: data.sourceLang,
        targetLang: data.targetLang,
        originalText: data.originalText,
        translatedText: data.translatedText || null
      });

      console.log(`💾 [TranslatedCall] 保存通话片段: ${data.speakerRole}, ${data.originalText.substring(0, 30)}...`);
    } catch (error) {
      console.error('❌ [TranslatedCall] 保存通话片段失败:', error);
    }
  }

  /**
   * 结束通话，返回是否需要生成双语记录
   */
  async endCall(): Promise<{
    callSessionId: string;
    utteranceCount: number;
    hasTranslations: boolean;
  }> {
    const utterances = await db.query.callUtterances.findMany({
      where: eq(callUtterances.callSessionId, this.config.callSessionId)
    });

    const hasTranslations = utterances.some(u => u.translatedText !== null);

    console.log(`📞 [TranslatedCall] 通话结束: ${utterances.length} 个片段, 有翻译: ${hasTranslations}`);

    return {
      callSessionId: this.config.callSessionId,
      utteranceCount: utterances.length,
      hasTranslations
    };
  }
}

/**
 * 创建通话会话
 */
export async function createCallSession(data: {
  tenantId?: string;
  callerUserId: string;
  calleeUserId: string;
  callType?: 'voice' | 'video';
  translationEnabled?: boolean;
}) {
  const [session] = await db.insert(callSessions).values({
    tenantId: data.tenantId || null,
    callerUserId: data.callerUserId,
    calleeUserId: data.calleeUserId,
    callType: data.callType || 'voice',
    translationEnabled: data.translationEnabled !== false,
    status: 'pending'
  }).returning();

  console.log(`📞 [TranslatedCall] 创建通话会话: ${session.id}`);
  return session;
}

/**
 * 更新通话状态
 */
export async function updateCallSessionStatus(
  callSessionId: string, 
  status: 'pending' | 'ringing' | 'connected' | 'ended' | 'missed' | 'rejected',
  endReason?: string
) {
  const updates: Record<string, any> = { status };
  
  if (status === 'ringing') {
    updates.startedAt = new Date();
  } else if (status === 'connected') {
    updates.connectedAt = new Date();
  } else if (status === 'ended' || status === 'missed' || status === 'rejected') {
    updates.endedAt = new Date();
    if (endReason) {
      updates.endReason = endReason;
    }
  }

  await db.update(callSessions)
    .set(updates)
    .where(eq(callSessions.id, callSessionId));

  console.log(`📞 [TranslatedCall] 通话状态更新: ${callSessionId} → ${status}`);
}

/**
 * 获取通话记录（用于生成双语记录文件）
 */
export async function getCallTranscript(callSessionId: string) {
  const session = await db.query.callSessions.findFirst({
    where: eq(callSessions.id, callSessionId),
    with: {
      utterances: {
        orderBy: (utterances, { asc }) => [asc(utterances.sequence)]
      },
      caller: true,
      callee: true
    }
  });

  if (!session) {
    return null;
  }

  return {
    session,
    utterances: session.utterances,
    caller: session.caller,
    callee: session.callee
  };
}

/**
 * 生成双语通话记录文件内容（Markdown格式）
 */
export async function generateBilingualTranscript(callSessionId: string): Promise<string | null> {
  const data = await getCallTranscript(callSessionId);
  
  if (!data || data.utterances.length === 0) {
    return null;
  }

  const { session, utterances, caller, callee } = data;
  
  const callerName = (caller as any)?.nickname || (caller as any)?.username || '用户A';
  const calleeName = (callee as any)?.nickname || (callee as any)?.username || '用户B';
  
  const lines: string[] = [
    `# 通话记录 / Call Transcript`,
    ``,
    `**通话时间**: ${session.startedAt?.toLocaleString() || 'N/A'} - ${session.endedAt?.toLocaleString() || 'N/A'}`,
    `**参与者**: ${callerName} ↔ ${calleeName}`,
    ``,
    `---`,
    ``
  ];

  for (const utt of utterances) {
    const speakerName = utt.speakerRole === 'caller' ? callerName : calleeName;
    const time = utt.createdAt ? new Date(utt.createdAt).toLocaleTimeString() : '';
    
    lines.push(`**${time} - ${speakerName}** (${utt.sourceLang || ''})`);
    lines.push(`> ${utt.originalText || ''}`);
    
    if (utt.translatedText) {
      lines.push(`> *[${utt.targetLang}]* ${utt.translatedText}`);
    }
    
    lines.push(``);
  }

  return lines.join('\n');
}
