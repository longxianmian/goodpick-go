import OpenAI from 'openai';

// 使用标准 OpenAI HTTP API（兼容普通 Node.js 环境）
// 不再依赖 Replit AI Integrations / wss://localhost/v2
// 如果没有配置 OPENAI_API_KEY，翻译功能会自动降级为"直接返回原文"，系统仍可正常运行。

let openai: OpenAI | null = null;

try {
  // 优先使用 Replit AI Integrations
  const replitApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const replitBaseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  
  // 备用：使用自己的 OpenAI API Key
  const ownApiKey = process.env.OPENAI_API_KEY;
  const ownBaseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (replitApiKey && replitBaseURL) {
    openai = new OpenAI({
      apiKey: replitApiKey,
      baseURL: replitBaseURL,
    });
    console.log('✅ OpenAI 翻译服务已启用 (Replit AI Integrations)');
  } else if (ownApiKey && ownApiKey.trim()) {
    openai = new OpenAI({
      apiKey: ownApiKey,
      baseURL: ownBaseURL,
    });
    console.log('✅ OpenAI 翻译服务已启用 (自有 API Key)');
  } else {
    console.warn('⚠️ 未配置 OPENAI_API_KEY，翻译功能已禁用，将使用原文作为翻译结果');
  }
} catch (error) {
  console.error('❌ OpenAI 初始化失败，翻译功能已禁用:', error);
  openai = null;
}

// 语言代码映射 - 扩展支持更多语言
const languageMap: Record<string, string> = {
  'zh-cn': 'Simplified Chinese',
  'zh-tw': 'Traditional Chinese',
  'en-us': 'English',
  'en-gb': 'English',
  'th-th': 'Thai',
  'id-id': 'Indonesian',
  'vi-vn': 'Vietnamese',
  'my-mm': 'Burmese',
  'ja-jp': 'Japanese',
  'ko-kr': 'Korean',
  'ms-my': 'Malay',
  'tl-ph': 'Filipino',
};

// 支持的语言列表
const supportedLanguages = Object.keys(languageMap);

// 规范化语言代码（如 zh-CN -> zh-cn, en -> en-us）
function normalizeLanguageCode(lang: string): string {
  if (!lang) return 'en-us';
  
  const normalized = lang.toLowerCase().replace('_', '-');
  
  // 精确匹配
  if (languageMap[normalized]) {
    return normalized;
  }
  
  // 简写匹配（如 zh -> zh-cn, en -> en-us）
  const shortCode = normalized.split('-')[0];
  const mapping: Record<string, string> = {
    'zh': 'zh-cn',
    'en': 'en-us',
    'th': 'th-th',
    'id': 'id-id',
    'vi': 'vi-vn',
    'my': 'my-mm',
    'ja': 'ja-jp',
    'ko': 'ko-kr',
    'ms': 'ms-my',
    'tl': 'tl-ph',
  };
  
  return mapping[shortCode] || 'en-us';
}

function validateLanguageCode(lang: string): boolean {
  const normalized = normalizeLanguageCode(lang);
  return supportedLanguages.includes(normalized);
}

/**
 * 检测文本语言
 * 返回规范化的语言代码
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text || !text.trim()) {
    return 'en-us';
  }

  if (!openai) {
    // 简单的语言检测（基于字符特征）
    const chinesePattern = /[\u4e00-\u9fff]/;
    const thaiPattern = /[\u0e00-\u0e7f]/;
    const vietnamesePattern = /[\u00C0-\u1EF9]/;
    const japanesePattern = /[\u3040-\u309f\u30a0-\u30ff]/;
    const koreanPattern = /[\uac00-\ud7af\u1100-\u11ff]/;
    const burmesePattern = /[\u1000-\u109f]/;
    
    if (chinesePattern.test(text)) return 'zh-cn';
    if (thaiPattern.test(text)) return 'th-th';
    if (burmesePattern.test(text)) return 'my-mm';
    if (japanesePattern.test(text)) return 'ja-jp';
    if (koreanPattern.test(text)) return 'ko-kr';
    if (vietnamesePattern.test(text)) return 'vi-vn';
    
    return 'en-us';
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Detect the language of the following text. Return ONLY one of these language codes: zh-cn, zh-tw, en-us, th-th, id-id, vi-vn, my-mm, ja-jp, ko-kr, ms-my, tl-ph. Return just the code, nothing else.`,
        },
        {
          role: 'user',
          content: text.slice(0, 200), // 只取前200字符进行检测
        },
      ],
      temperature: 0,
      max_completion_tokens: 10,
    });

    const detectedCode = response.choices[0]?.message?.content?.trim().toLowerCase() || 'en-us';
    return normalizeLanguageCode(detectedCode);
  } catch (error) {
    console.error('❌ Language detection failed:', error);
    return 'en-us';
  }
}

/**
 * 翻译单段文本
 * - 如果未配置 OPENAI_API_KEY：直接返回原文
 * - 如果语言代码不合法：直接返回原文
 * - 如果调用 OpenAI 失败：打印日志，返回原文
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  // 空文本或空白，直接返回
  if (!text || !text.trim()) {
    return text;
  }

  // 规范化语言代码
  const normalizedSource = normalizeLanguageCode(sourceLang);
  const normalizedTarget = normalizeLanguageCode(targetLang);

  // 源语言和目标语言相同，直接返回
  if (normalizedSource === normalizedTarget) {
    return text;
  }

  // 未配置 OpenAI，降级为原文
  if (!openai) {
    return text;
  }

  try {
    const sourceLanguage = languageMap[normalizedSource] || 'Unknown';
    const targetLanguage = languageMap[normalizedTarget] || 'English';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text without any explanation or additional content. Preserve the original meaning, tone, and style.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 2048,
    });

    return response.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error('❌ Translation failed, fallback to original text:', error);
    return text;
  }
}

/**
 * 翻译聊天消息
 * - 自动检测源语言
 * - 返回翻译结果和检测到的源语言
 */
export async function translateMessage(
  text: string,
  targetLang: string
): Promise<{ translatedText: string; detectedLang: string; needsTranslation: boolean }> {
  if (!text || !text.trim()) {
    return { translatedText: text, detectedLang: 'en-us', needsTranslation: false };
  }

  // 检测源语言
  const detectedLang = await detectLanguage(text);
  const normalizedTarget = normalizeLanguageCode(targetLang);

  // 如果语言相同，不需要翻译
  if (detectedLang === normalizedTarget) {
    return { translatedText: text, detectedLang, needsTranslation: false };
  }

  // 执行翻译
  const translatedText = await translateText(text, detectedLang, normalizedTarget);

  return {
    translatedText,
    detectedLang,
    needsTranslation: translatedText !== text,
  };
}

/**
 * 批量翻译活动字段（标题 + 描述）
 * - 保持函数签名不变，供活动创建 / 编辑时调用
 * - 任一目标语言翻译失败不会影响其他语言
 */
export async function translateCampaignFields(
  fields: { title?: string; description?: string },
  sourceLang: string,
  targetLangs: string[]
): Promise<Record<string, string>> {
  const translations: Record<string, string> = {};

  for (const targetLang of targetLangs) {
    try {
      const suffix = normalizeLanguageCode(targetLang).replace('-', '');

      if (fields.title) {
        const titleKey = `title_${suffix}`;
        translations[titleKey] = await translateText(fields.title, sourceLang, targetLang);
      }

      if (fields.description) {
        const descKey = `description_${suffix}`;
        translations[descKey] = await translateText(fields.description, sourceLang, targetLang);
      }
    } catch (error) {
      // 单个语言翻译失败不影响其他语言
      console.error(`❌ 翻译 ${targetLang} 失败:`, error);
    }
  }

  return translations;
}

/**
 * 对外暴露一个状态检查函数（可选）
 * 方便在其他地方根据是否启用翻译做一些显示控制
 */
export function isTranslationEnabled(): boolean {
  return openai !== null;
}

/**
 * 获取支持的语言列表
 */
export function getSupportedLanguages(): Array<{ code: string; name: string }> {
  return Object.entries(languageMap).map(([code, name]) => ({ code, name }));
}

/**
 * 规范化语言代码的导出版本
 */
export { normalizeLanguageCode };

/**
 * 语音转文字（Speech-to-Text）
 * 使用 OpenAI Whisper API 将音频转录为文本
 * @param audioUrl - 音频文件的URL
 * @returns 转录的文本内容，失败时返回 null
 */
export async function transcribeAudio(audioUrl: string): Promise<{ transcript: string; detectedLanguage: string } | null> {
  if (!openai) {
    console.warn('⚠️ OpenAI 未配置，无法进行语音转文字');
    return null;
  }

  try {
    // 下载音频文件
    const response = await fetch(audioUrl);
    if (!response.ok) {
      console.error('❌ 无法下载音频文件:', audioUrl);
      return null;
    }
    
    const audioBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    
    // 创建 File 对象用于 Whisper API
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
    
    // 调用 Whisper API 进行转录
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
    });
    
    const transcript = transcription.text?.trim() || '';
    const detectedLanguage = (transcription as any).language || 'unknown';
    
    console.log(`✅ 语音转文字成功: "${transcript.slice(0, 50)}..." (语言: ${detectedLanguage})`);
    
    return {
      transcript,
      detectedLanguage: normalizeWhisperLanguage(detectedLanguage),
    };
  } catch (error: any) {
    console.error('❌ 语音转文字失败:', error?.message || error);
    return null;
  }
}

/**
 * 将 Whisper 返回的语言代码转换为我们的格式
 */
function normalizeWhisperLanguage(whisperLang: string): string {
  const mapping: Record<string, string> = {
    'chinese': 'zh-cn',
    'mandarin': 'zh-cn',
    'zh': 'zh-cn',
    'english': 'en-us',
    'en': 'en-us',
    'thai': 'th-th',
    'th': 'th-th',
    'indonesian': 'id-id',
    'id': 'id-id',
    'vietnamese': 'vi-vn',
    'vi': 'vi-vn',
    'burmese': 'my-mm',
    'my': 'my-mm',
    'japanese': 'ja-jp',
    'ja': 'ja-jp',
    'korean': 'ko-kr',
    'ko': 'ko-kr',
    'malay': 'ms-my',
    'ms': 'ms-my',
    'tagalog': 'tl-ph',
    'tl': 'tl-ph',
    'filipino': 'tl-ph',
  };
  
  const normalized = whisperLang.toLowerCase();
  return mapping[normalized] || 'en-us';
}
