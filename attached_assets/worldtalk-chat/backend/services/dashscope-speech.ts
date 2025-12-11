import FormData from 'form-data';
import fs from 'fs';
import { downloadFromOSS } from './oss';
import { getDashScopeApiKey } from '../config/dashscope';

// 使用中国版endpoint（国际版为 dashscope-intl.aliyuncs.com）
const DASHSCOPE_API_BASE = 'https://dashscope.aliyuncs.com/api/v1';

/**
 * 语音识别（STT）- 将音频转文字
 * 使用 Paraformer-v2 实时语音识别模型（更快）
 * @param audioInput - 可以是文件路径、URL，或直接传入 Buffer
 */
export async function speechToText(audioInput: string | Buffer, language: string = 'auto'): Promise<{
  text: string;
  language: string;
}> {
  const apiKey = getDashScopeApiKey();
  console.log('[dashscope] speechToText DASHSCOPE_API_KEY prefix:', apiKey.slice(0, 8));

  let audioBase64: string;
  let isTemporaryFile = false;
  let localFilePath: string | null = null;

  try {
    // 🚀 直接传入 Buffer - 最快路径，跳过所有文件操作
    if (Buffer.isBuffer(audioInput)) {
      audioBase64 = audioInput.toString('base64');
      console.log(`⚡ [STT] 直接使用Buffer (${audioInput.length} bytes)`);
    }
    // 如果是OSS URL，先下载到本地
    else if (audioInput.startsWith('https://') || audioInput.startsWith('http://')) {
      const urlObj = new URL(audioInput);
      const ossPath = urlObj.pathname.substring(1);
      localFilePath = await downloadFromOSS(ossPath);
      isTemporaryFile = true;
      const audioBuffer = fs.readFileSync(localFilePath);
      audioBase64 = audioBuffer.toString('base64');
    }
    // 本地文件路径
    else {
      const audioBuffer = fs.readFileSync(audioInput);
      audioBase64 = audioBuffer.toString('base64');
    }
    
    const startTime = Date.now();

    // 使用 Paraformer-v2 实时语音识别（更快）
    const response = await fetch(`${DASHSCOPE_API_BASE}/services/audio/asr/transcription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'paraformer-v2',
        input: {
          audio: audioBase64,
          format: 'webm',
          sample_rate: 16000
        },
        parameters: {
          language_hints: language === 'auto' ? ['zh', 'en', 'th', 'ja', 'ko'] : [language]
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // 如果 paraformer-v2 失败，回退到 qwen3-asr-flash
      console.warn(`Paraformer-v2 failed, falling back to qwen3-asr-flash: ${errorText}`);
      return await speechToTextFallback(audioBase64, language);
    }

    const result = await response.json();
    const elapsed = Date.now() - startTime;
    console.log(`⚡ STT完成 (${elapsed}ms)`);

    // 提取识别文本
    const transcript = result.output?.text || result.output?.sentence || '';
    const detectedLanguage = result.output?.language || language;

    // 清理临时文件
    if (isTemporaryFile && localFilePath) {
      try { fs.unlinkSync(localFilePath); } catch {}
    }

    return { text: transcript, language: detectedLanguage };
  } catch (error) {
    if (isTemporaryFile && localFilePath) {
      try { fs.unlinkSync(localFilePath); } catch {}
    }
    console.error('语音识别失败:', error);
    throw error;
  }
}

/**
 * 备用STT方法 - 使用 qwen3-asr-flash
 */
async function speechToTextFallback(audioBase64: string, language: string): Promise<{
  text: string;
  language: string;
}> {
  const apiKey = getDashScopeApiKey();
  const response = await fetch(`${DASHSCOPE_API_BASE}/services/aigc/multimodal-generation/generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen3-asr-flash',
      input: {
        messages: [{
          role: 'user',
          content: [{
            audio: `data:audio/webm;base64,${audioBase64}`
          }]
        }]
      },
      parameters: {
        asr_options: {
          enable_itn: true,
          language: language === 'auto' ? undefined : language
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DashScope ASR failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const transcript = result.output?.choices?.[0]?.message?.content?.[0]?.text || '';
  const detectedLanguage = result.output?.asr_result?.language || language;

  return { text: transcript, language: detectedLanguage };
}

/**
 * 语音合成（TTS）- 将文字转语音
 * 使用 Qwen TTS 模型
 */
export async function textToSpeech(
  text: string,
  targetLanguage: string = 'Chinese',
  voice?: string
): Promise<{
  audioUrl: string;
  audioBase64?: string;
}> {
  const apiKey = getDashScopeApiKey();
  console.log('[dashscope] textToSpeech DASHSCOPE_API_KEY prefix:', apiKey.slice(0, 8));

  try {
    // 根据语言选择默认声音
    const defaultVoice = getDefaultVoiceForLanguage(targetLanguage);
    const selectedVoice = voice || defaultVoice;

    // 调用DashScope TTS API
    const response = await fetch(`${DASHSCOPE_API_BASE}/services/aigc/multimodal-generation/generation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen3-tts-flash',
        input: {
          text: text,
          voice: selectedVoice,
          language_type: targetLanguage
        },
        parameters: {
          format: 'mp3',
          sample_rate: 16000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DashScope TTS failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // 检查多种可能的响应格式
    const audioBase64 = result.output?.audio?.data || result.output?.audio || result.data;
    const audioUrl = result.output?.audio?.url || result.output?.url || result.url;
    
    if (!audioBase64 && !audioUrl) {
      throw new Error(`No audio data in TTS response. Response: ${JSON.stringify(result)}`);
    }
    
    // 如果有URL，下载并上传到OSS（DashScope的URL会过期）
    let buffer: Buffer;
    if (audioUrl) {
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio from DashScope: ${audioResponse.status}`);
      }
      const arrayBuffer = await audioResponse.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (audioBase64) {
      // 将base64解码为Buffer
      buffer = Buffer.from(audioBase64 as string, 'base64');
    } else {
      throw new Error('No audio data available');
    }
    
    // 上传到阿里云OSS（永久存储）
    const { nanoid } = await import('nanoid');
    const { uploadToOSS, generateSignedUrl } = await import('./oss');
    
    const fileName = `tts-${Date.now()}-${nanoid(8)}.mp3`;
    const { ossPath } = await uploadToOSS(buffer, 'voices', fileName);
    
    // 生成签名URL（30天有效期）
    const ossAudioUrl = await generateSignedUrl(ossPath, 2592000);

    return {
      audioUrl: ossAudioUrl,
      audioBase64: audioBase64 as string
    };
  } catch (error) {
    console.error('语音合成失败:', error);
    throw error;
  }
}

/**
 * 根据语言选择默认声音
 */
function getDefaultVoiceForLanguage(language: string): string {
  const voiceMap: Record<string, string> = {
    'Chinese': 'Sunny',
    'zh': 'Sunny',
    'English': 'Cherry',
    'en': 'Cherry',
    'Japanese': 'Kiki',
    'ja': 'Kiki',
    'Thai': 'Cherry',  // 泰语可以用英语声音
    'th': 'Cherry',
    'Indonesian': 'Cherry', // 印尼语可以用英语声音
    'id': 'Cherry',
    'Auto': 'Cherry'
  };

  return voiceMap[language] || 'Cherry';
}

/**
 * 将用户设置的语音偏好映射到 DashScope TTS 支持的音色
 * 
 * DashScope Qwen3-TTS-Flash 支持的音色 (2024):
 * - Cherry: 女声（中英双语）
 * - Ethan: 男声
 * - Elias: 男声
 * - Jada: 女声（上海话）
 * - Dylan: 男声（北京话）
 * - Sunny: 女声（四川话）
 * - Rocky: 男声
 * 
 * 用户设置选项:
 * - default: 使用系统默认
 * - male: 男声
 * - female: 女声
 * - male_deep: 男声(浑厚)
 * - female_sweet: 女声(甜美)
 * - neutral: 中性
 */
export function mapUserVoicePreference(preference: string | undefined, language: string): string {
  if (!preference || preference === 'default') {
    return getDefaultVoiceForLanguage(language);
  }
  
  // DashScope Qwen3-TTS 支持的音色映射
  // 男声: Ethan(标准), Dylan(北京话), Elias, Rocky
  // 女声: Cherry(标准), Sunny(四川话), Jada(上海话)
  const voiceMapping: Record<string, string> = {
    'male': 'Ethan',           // 标准男声
    'female': 'Cherry',        // 标准女声
    'male_deep': 'Rocky',      // 浑厚男声
    'female_sweet': 'Jada',    // 甜美女声
    'neutral': 'Cherry',       // 中性 -> 女声
  };
  
  const mappedVoice = voiceMapping[preference];
  if (mappedVoice) {
    return mappedVoice;
  }
  
  // 如果用户直接传入了 DashScope 支持的音色名称，直接使用
  const validVoices = ['Cherry', 'Ethan', 'Elias', 'Jada', 'Dylan', 'Sunny', 'Rocky'];
  if (validVoices.includes(preference)) {
    return preference;
  }
  
  return getDefaultVoiceForLanguage(language);
}

/**
 * 语言代码映射 - DashScope使用的语言代码
 */
export function mapLanguageToDashScope(lang: string): string {
  const langMap: Record<string, string> = {
    'zh': 'Chinese',
    'en': 'English',
    'ja': 'Japanese',
    'th': 'English',  // 泰语使用英语声音
    'id': 'English',  // 印尼语使用英语声音
  };

  return langMap[lang] || 'Auto';
}
