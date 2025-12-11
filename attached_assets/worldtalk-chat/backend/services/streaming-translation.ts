/**
 * 流式翻译服务 (Streaming Translation Service)
 * 
 * 统一抽象层：STT → MT → TTS 翻译管道
 * 适用于：语音消息翻译、语音电话翻译
 * 
 * 核心原则：
 * - 谁看谁翻译：展示给谁，就按谁的首选语言翻译
 * - 谁发谁原文：发送时不翻译，老老实实按发送者原文入库
 * - 只翻译可控文本：文本 + 语音 STT 文本能翻，其它原样传输
 */

import { storage } from '../storage';
import { speechToText, textToSpeech } from './dashscope-speech';
import { getDashScopeApiKey } from '../config/dashscope';
import type { UserVoiceProfile } from '@shared/schema';

const DASHSCOPE_API_BASE = 'https://dashscope.aliyuncs.com/api/v1';

// ===================== 类型定义 =====================

export interface TranslationPipelineConfig {
  sourceUserId: string;
  targetUserId: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  ttsAudioUrl?: string;
  ttsAudioBase64?: string;
  voiceUsed?: string;
  latencies: {
    sttMs?: number;
    mtMs?: number;
    ttsMs?: number;
    totalMs: number;
  };
}

export interface VoiceSettings {
  remoteVoiceForMe: string;
  myDefaultVoiceForOthers: string;
}

// ===================== 语音偏好查询 =====================

export async function getUserVoiceSettings(userId: string): Promise<VoiceSettings> {
  const profile = await storage.getUserVoiceProfile(userId);
  
  return {
    remoteVoiceForMe: profile?.remoteVoiceForMe || 'default',
    myDefaultVoiceForOthers: profile?.myDefaultVoiceForOthers || 'default',
  };
}

/**
 * 确定 TTS 使用的声音
 * 
 * 规则：
 * 1. 如果接收者设置了 remoteVoiceForMe，使用接收者的偏好（ta 听别人的声音）
 * 2. 否则，使用发送者的 myDefaultVoiceForOthers（我的对外声音形象）
 * 3. 都没设置，使用默认声音
 */
export async function determineVoiceForTTS(
  sourceUserId: string,
  targetUserId: string,
  targetLanguage: string
): Promise<string> {
  const [sourceProfile, targetProfile] = await Promise.all([
    storage.getUserVoiceProfile(sourceUserId),
    storage.getUserVoiceProfile(targetUserId),
  ]);
  
  if (targetProfile?.remoteVoiceForMe && targetProfile.remoteVoiceForMe !== 'default') {
    return mapVoicePreferenceToVoiceId(targetProfile.remoteVoiceForMe, targetLanguage);
  }
  
  if (sourceProfile?.myDefaultVoiceForOthers && sourceProfile.myDefaultVoiceForOthers !== 'default') {
    return mapVoicePreferenceToVoiceId(sourceProfile.myDefaultVoiceForOthers, targetLanguage);
  }
  
  return getDefaultVoice(targetLanguage);
}

/**
 * 将抽象音色偏好映射到具体 voice_id
 */
function mapVoicePreferenceToVoiceId(preference: string, targetLanguage: string): string {
  const langPrefix = getLangPrefix(targetLanguage);
  
  const voiceMap: Record<string, Record<string, string>> = {
    zh: {
      male: 'longxiaochun',
      female: 'longxiaoxia',
      male_deep: 'longlaotie',
      female_sweet: 'longshuo',
      neutral: 'longxiaochun',
    },
    en: {
      male: 'Emily',
      female: 'Emily',
      male_deep: 'Emily',
      female_sweet: 'Emily',
      neutral: 'Emily',
    },
    th: {
      male: 'Achara',
      female: 'Achara',
      male_deep: 'Achara',
      female_sweet: 'Achara',
      neutral: 'Achara',
    },
    ja: {
      male: 'longxiaochun',
      female: 'longxiaoxia',
      male_deep: 'longlaotie',
      female_sweet: 'longshuo',
      neutral: 'longxiaochun',
    },
  };
  
  return voiceMap[langPrefix]?.[preference] || getDefaultVoice(targetLanguage);
}

function getLangPrefix(language: string): string {
  const code = language.toLowerCase().split('-')[0].split('_')[0];
  
  const mapping: Record<string, string> = {
    chinese: 'zh',
    mandarin: 'zh',
    zh: 'zh',
    english: 'en',
    en: 'en',
    thai: 'th',
    th: 'th',
    japanese: 'ja',
    ja: 'ja',
    korean: 'ko',
    ko: 'ko',
  };
  
  return mapping[code] || 'zh';
}

function getDefaultVoice(targetLanguage: string): string {
  const langPrefix = getLangPrefix(targetLanguage);
  
  const defaults: Record<string, string> = {
    zh: 'longxiaochun',
    en: 'Emily',
    th: 'Achara',
    ja: 'longxiaochun',
    ko: 'longxiaochun',
  };
  
  return defaults[langPrefix] || 'longxiaochun';
}

// ===================== 翻译管道 =====================

/**
 * 完整翻译管道：音频 → STT → MT → TTS → 音频
 * 
 * @param audioInput - 源音频（Buffer 或 URL）
 * @param config - 翻译配置
 * @returns 翻译结果，包含延迟统计
 */
export async function translateAudioToAudio(
  audioInput: Buffer | string,
  config: TranslationPipelineConfig
): Promise<TranslationResult> {
  const startTime = Date.now();
  
  const { sourceUserId, targetUserId, targetLanguage, sourceLanguage } = config;
  
  const sttStart = Date.now();
  const sttResult = await speechToText(audioInput, sourceLanguage || 'auto');
  const sttLatency = Date.now() - sttStart;
  
  const detectedSourceLang = sttResult.language;
  const normalizedTargetLang = normalizeLanguageCode(targetLanguage);
  const normalizedSourceLang = normalizeLanguageCode(detectedSourceLang);
  
  let translatedText = sttResult.text;
  let mtLatency = 0;
  
  if (normalizedSourceLang !== normalizedTargetLang && sttResult.text.trim()) {
    const mtStart = Date.now();
    translatedText = await translateText(sttResult.text, detectedSourceLang, targetLanguage);
    mtLatency = Date.now() - mtStart;
  } else {
    console.log(`🔇 语言相同 (${normalizedSourceLang} → ${normalizedTargetLang})，跳过翻译`);
  }
  
  const voiceToUse = await determineVoiceForTTS(sourceUserId, targetUserId, targetLanguage);
  
  let ttsResult: { audioUrl: string; audioBase64?: string } = { audioUrl: '' };
  let ttsLatency = 0;
  
  if (translatedText.trim()) {
    const ttsStart = Date.now();
    ttsResult = await textToSpeech(translatedText, targetLanguage, voiceToUse);
    ttsLatency = Date.now() - ttsStart;
  }
  
  const totalLatency = Date.now() - startTime;
  
  console.log(`🎙️ 翻译管道完成: STT ${sttLatency}ms → MT ${mtLatency}ms → TTS ${ttsLatency}ms = ${totalLatency}ms total`);
  
  return {
    originalText: sttResult.text,
    translatedText,
    sourceLanguage: detectedSourceLang,
    targetLanguage,
    ttsAudioUrl: ttsResult.audioUrl,
    ttsAudioBase64: ttsResult.audioBase64,
    voiceUsed: voiceToUse,
    latencies: {
      sttMs: sttLatency,
      mtMs: mtLatency,
      ttsMs: ttsLatency,
      totalMs: totalLatency,
    },
  };
}

/**
 * 文本翻译（使用 Qwen-MT）
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (!text.trim()) return text;
  
  const apiKey = getDashScopeApiKey();
  
  try {
    const response = await fetch(`${DASHSCOPE_API_BASE}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-mt-turbo',
        input: {
          messages: [{
            role: 'user',
            content: text,
          }],
        },
        parameters: {
          source_lang: mapToQwenMtLang(sourceLang),
          target_lang: mapToQwenMtLang(targetLang),
          terms: [],
          domains: 'general',
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Qwen-MT 翻译失败: ${response.status} - ${errorText}`);
      return text;
    }
    
    const result = await response.json();
    const translated = result.output?.choices?.[0]?.message?.content || text;
    
    return translated;
  } catch (error) {
    console.error('翻译错误:', error);
    return text;
  }
}

function mapToQwenMtLang(lang: string): string {
  const code = lang.toLowerCase().split('-')[0].split('_')[0];
  
  const mapping: Record<string, string> = {
    zh: 'Chinese',
    en: 'English',
    th: 'Thai',
    ja: 'Japanese',
    ko: 'Korean',
    vi: 'Vietnamese',
    id: 'Indonesian',
    ms: 'Malay',
    my: 'Burmese',
    chinese: 'Chinese',
    english: 'English',
    thai: 'Thai',
    japanese: 'Japanese',
    korean: 'Korean',
  };
  
  return mapping[code] || 'English';
}

function normalizeLanguageCode(lang: string): string {
  const code = lang.toLowerCase().split('-')[0].split('_')[0];
  
  const mapping: Record<string, string> = {
    chinese: 'zh',
    mandarin: 'zh',
    english: 'en',
    thai: 'th',
    japanese: 'ja',
    korean: 'ko',
    vietnamese: 'vi',
    indonesian: 'id',
    malay: 'ms',
  };
  
  return mapping[code] || code;
}

// ===================== 实时通话翻译 =====================

export interface CallTranslationConfig {
  callSessionId: string;
  callerUserId: string;
  calleeUserId: string;
  callerLang: string;
  calleeLang: string;
}

/**
 * 判断通话是否需要翻译
 */
export function needsTranslation(lang1: string, lang2: string): boolean {
  return normalizeLanguageCode(lang1) !== normalizeLanguageCode(lang2);
}

/**
 * 通话中实时翻译一段语音
 * 
 * @param audioChunk - 语音片段
 * @param speakerRole - 说话者角色 'caller' | 'callee'
 * @param config - 通话翻译配置
 */
export async function translateCallUtterance(
  audioChunk: Buffer,
  speakerRole: 'caller' | 'callee',
  config: CallTranslationConfig
): Promise<TranslationResult> {
  const { callerUserId, calleeUserId, callerLang, calleeLang } = config;
  
  const sourceUserId = speakerRole === 'caller' ? callerUserId : calleeUserId;
  const targetUserId = speakerRole === 'caller' ? calleeUserId : callerUserId;
  const sourceLang = speakerRole === 'caller' ? callerLang : calleeLang;
  const targetLang = speakerRole === 'caller' ? calleeLang : callerLang;
  
  return translateAudioToAudio(audioChunk, {
    sourceUserId,
    targetUserId,
    targetLanguage: targetLang,
    sourceLanguage: sourceLang,
  });
}

// ===================== 导出 =====================

export default {
  getUserVoiceSettings,
  determineVoiceForTTS,
  translateAudioToAudio,
  translateText,
  needsTranslation,
  translateCallUtterance,
};
