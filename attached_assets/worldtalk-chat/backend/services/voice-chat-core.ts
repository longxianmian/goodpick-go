/**
 * VoiceChatCore - 语音聊天引擎
 * 
 * 核心功能：
 * 1. 语音输入 -> ASR转写 -> 保留原始语音 + 转写文本
 * 2. 支持多语言语音识别
 * 3. 为数字人会话提供语音聊天能力
 */

import { speechToText } from './dashscope-speech';
import { recognizeAudioNonStreaming } from './batch-stt';
import { downloadFromOSS } from './oss';
import fs from 'fs';
import path from 'path';
import os from 'os';

// 支持的语音语言代码
export type VoiceLangCode = "zh" | "en" | "th" | "vi" | "fr" | "ja" | "ko" | "auto";

// 语言代码映射（用于ASR）
const LANG_CODE_MAP: Record<VoiceLangCode, string[]> = {
  "zh": ["zh"],
  "en": ["en"],
  "th": ["th"],
  "vi": ["vi"],
  "fr": ["fr"],
  "ja": ["ja"],
  "ko": ["ko"],
  "auto": ["zh", "en", "th", "ja", "ko"],
};

// 输入模式
export type InputMode = "text" | "voice_input" | "voice_chat";

// 语音聊天配置
export interface VoiceChatConfig {
  enabledLanguages: VoiceLangCode[];
}

// 数字人信息（简化版）
export interface AgentInfo {
  id: string;
  name: string;
  capabilities: string[];
  voiceChatConfig?: VoiceChatConfig;
}

// VoiceChatCore 输入
export interface VoiceChatInput {
  sessionId: string;
  agent: AgentInfo;
  userId: string;
  mode: InputMode;
  text?: string;
  audioUrl?: string;  // OSS URL
  audioBuffer?: Buffer;  // 或直接传 Buffer
}

// VoiceChatCore 输出
export interface VoiceChatOutput {
  text: string;           // 转写/原始文本
  rawAudioUrl?: string;   // 原始语音 URL
  transcript?: string;    // 转写文本（用于长按显示）
  audioDuration?: number; // 语音时长（秒）
  detectedLanguage?: string;
}

/**
 * 从 OSS URL 下载音频文件到本地
 */
async function downloadAudioFromUrl(audioUrl: string): Promise<{ localPath: string; isTemp: boolean }> {
  if (audioUrl.startsWith('https://') || audioUrl.startsWith('http://')) {
    const urlObj = new URL(audioUrl);
    const ossPath = urlObj.pathname.substring(1);
    const localPath = await downloadFromOSS(ossPath);
    return { localPath, isTemp: true };
  }
  return { localPath: audioUrl, isTemp: false };
}

/**
 * 估算音频时长（简单版本，基于文件大小）
 * 实际应用中可以使用 ffprobe 获取精确时长
 */
async function estimateAudioDuration(audioPath: string): Promise<number> {
  try {
    const stats = fs.statSync(audioPath);
    // 假设平均比特率 32kbps for voice
    const durationSeconds = Math.round(stats.size / (32 * 1024 / 8));
    return Math.max(1, Math.min(durationSeconds, 300)); // 1秒 - 5分钟
  } catch {
    return 0;
  }
}

/**
 * 选择使用的语音语言
 * 优先使用数字人配置的语言，否则使用自动检测
 */
function pickVoiceLanguage(agent: AgentInfo, _userId: string): VoiceLangCode {
  const config = agent.voiceChatConfig;
  if (config?.enabledLanguages && config.enabledLanguages.length > 0) {
    return config.enabledLanguages[0];
  }
  return "auto";
}

/**
 * VoiceChatCore 主函数
 * 处理语音输入，返回转写文本和原始语音信息
 */
export async function voiceChatCore(input: VoiceChatInput): Promise<VoiceChatOutput> {
  const { sessionId, agent, userId, mode, text, audioUrl, audioBuffer } = input;

  console.log(`🎤 [VoiceChatCore] 开始处理: mode=${mode}, hasAudioUrl=${!!audioUrl}, hasBuffer=${!!audioBuffer}`);

  // 1) 文本模式：直接返回
  if (mode === "text" && text) {
    return {
      text: text,
      rawAudioUrl: undefined,
      transcript: undefined,
    };
  }

  // 2) 语音模式：需要 ASR 转写
  if ((mode === "voice_input" || mode === "voice_chat") && (audioUrl || audioBuffer)) {
    let userText = text;
    let duration = 0;
    let detectedLang = "unknown";
    
    try {
      // 选择语言
      const lang = pickVoiceLanguage(agent, userId);
      console.log(`🌐 [VoiceChatCore] 使用语言: ${lang}`);

      if (audioBuffer) {
        // 直接使用 Buffer 进行识别
        userText = await recognizeAudioNonStreaming(audioBuffer, 'webm');
        duration = Math.round(audioBuffer.length / (32 * 1024 / 8));
      } else if (audioUrl) {
        // 从 URL 下载并识别
        const { localPath, isTemp } = await downloadAudioFromUrl(audioUrl);
        
        try {
          const result = await speechToText(localPath, lang);
          userText = result.text;
          detectedLang = result.language;
          duration = await estimateAudioDuration(localPath);
        } finally {
          if (isTemp) {
            try { fs.unlinkSync(localPath); } catch {}
          }
        }
      }

      console.log(`✅ [VoiceChatCore] 转写完成: "${userText?.substring(0, 50)}..." (${duration}s)`);

    } catch (error) {
      console.error(`❌ [VoiceChatCore] 语音识别失败:`, error);
      userText = text || "[语音识别失败]";
    }

    return {
      text: userText || "",
      rawAudioUrl: audioUrl,
      transcript: userText,
      audioDuration: duration,
      detectedLanguage: detectedLang,
    };
  }

  // 3) 回退：返回原始文本
  return {
    text: text || "",
    rawAudioUrl: audioUrl,
    transcript: undefined,
  };
}

/**
 * 检查数字人是否具备语音聊天能力
 */
export function hasVoiceChatCapability(agent: AgentInfo): boolean {
  return agent.capabilities?.includes("voice_chat") || false;
}

/**
 * 获取数字人已开通的语音语言列表
 */
export function getEnabledVoiceLanguages(agent: AgentInfo): VoiceLangCode[] {
  return agent.voiceChatConfig?.enabledLanguages || [];
}

/**
 * 所有支持的语音语言列表
 */
export function getAllSupportedVoiceLangs(): VoiceLangCode[] {
  return ["zh", "en", "th", "vi", "fr", "ja", "ko"];
}
