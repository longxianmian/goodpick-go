import OpenAI from 'openai';

// 使用标准OpenAI API（兼容普通Node.js环境）
// 如果没有配置OPENAI_API_KEY，翻译功能将被禁用，系统仍可正常运行
let openai: OpenAI | null = null;

try {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey.trim()) {
    openai = new OpenAI({
      apiKey: apiKey,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
    console.log('✅ OpenAI翻译服务已启用');
  } else {
    console.warn('⚠️ 未配置OPENAI_API_KEY，翻译功能已禁用，将使用原文作为翻译结果');
  }
} catch (error) {
  console.error('❌ OpenAI初始化失败，翻译功能已禁用:', error);
  openai = null;
}

const languageMap: Record<string, string> = {
  'zh-cn': 'Simplified Chinese',
  'en-us': 'English',
  'th-th': 'Thai',
};

const supportedLanguages = ['zh-cn', 'en-us', 'th-th'] as const;

function validateLanguageCode(lang: string): boolean {
  return supportedLanguages.includes(lang as any);
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  // 如果源语言和目标语言相同，直接返回原文
  if (sourceLang === targetLang) {
    return text;
  }

  // 验证语言代码
  if (!validateLanguageCode(sourceLang) || !validateLanguageCode(targetLang)) {
    console.warn(`⚠️ 无效的语言代码: sourceLang=${sourceLang}, targetLang=${targetLang}，返回原文`);
    return text;
  }

  // 如果OpenAI未初始化（未配置API Key或初始化失败），返回原文
  if (!openai) {
    console.log(`ℹ️ OpenAI未启用，无法翻译 ${sourceLang} -> ${targetLang}，返回原文`);
    return text;
  }

  try {
    const sourceLanguage = languageMap[sourceLang];
    const targetLanguage = languageMap[targetLang];

    console.log(`🔄 正在翻译: ${sourceLang} -> ${targetLang} (${text.substring(0, 50)}...)`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text without any explanation or additional content.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 8192,
    });

    const translatedText = response.choices[0]?.message?.content?.trim();
    if (!translatedText) {
      console.warn('⚠️ OpenAI返回空结果，使用原文');
      return text;
    }

    console.log(`✅ 翻译成功: ${sourceLang} -> ${targetLang}`);
    return translatedText;
  } catch (error: any) {
    // 详细记录错误，但不影响系统运行
    console.error(`❌ 翻译失败 (${sourceLang} -> ${targetLang}):`, {
      message: error?.message,
      status: error?.response?.status,
      code: error?.code,
    });
    // 翻译失败时返回原文，确保系统可用
    return text;
  }
}

export async function translateCampaignFields(
  fields: { title?: string; description?: string },
  sourceLang: string,
  targetLangs: string[]
): Promise<Record<string, string>> {
  const translations: Record<string, string> = {};

  // 如果OpenAI未启用，返回空翻译（调用方会使用原文填充）
  if (!openai) {
    console.log('ℹ️ OpenAI未启用，跳过批量翻译');
    return translations;
  }

  for (const targetLang of targetLangs) {
    try {
      if (fields.title) {
        const titleKey = `title_${targetLang.replace('-', '')}`;
        translations[titleKey] = await translateText(fields.title, sourceLang, targetLang);
      }

      if (fields.description) {
        const descKey = `description_${targetLang.replace('-', '')}`;
        translations[descKey] = await translateText(fields.description, sourceLang, targetLang);
      }
    } catch (error) {
      // 单个语言翻译失败不影响其他语言
      console.error(`❌ 翻译${targetLang}失败:`, error);
    }
  }

  return translations;
}

// 导出OpenAI状态检查函数
export function isTranslationEnabled(): boolean {
  return openai !== null;
}
