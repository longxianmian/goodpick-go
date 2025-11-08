import OpenAI from 'openai';

// 使用标准 OpenAI HTTP API（兼容普通 Node.js 环境）
// 不再依赖 Replit AI Integrations / wss://localhost/v2
// 如果没有配置 OPENAI_API_KEY，翻译功能会自动降级为“直接返回原文”，系统仍可正常运行。

let openai: OpenAI | null = null;

try {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (apiKey && apiKey.trim()) {
    openai = new OpenAI({
      apiKey,
      baseURL,
    });
    console.log('✅ OpenAI 翻译服务已启用');
  } else {
    console.warn('⚠️ 未配置 OPENAI_API_KEY，翻译功能已禁用，将使用原文作为翻译结果');
  }
} catch (error) {
  console.error('❌ OpenAI 初始化失败，翻译功能已禁用:', error);
  openai = null;
}

// 语言代码映射
const languageMap: Record<string, string> = {
  'zh-cn': 'Simplified Chinese',
  'en-us': 'English',
  'th-th': 'Thai',
};

const supportedLanguages = ['zh-cn', 'en-us', 'th-th'] as const;

function validateLanguageCode(lang: string): lang is (typeof supportedLanguages)[number] {
  return supportedLanguages.includes(lang as any);
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

  // 源语言和目标语言相同，直接返回
  if (sourceLang === targetLang) {
    return text;
  }

  // 语言代码校验
  if (!validateLanguageCode(sourceLang) || !validateLanguageCode(targetLang)) {
    console.warn(`⚠️ 无效的语言代码: sourceLang=${sourceLang}, targetLang=${targetLang}，返回原文`);
    return text;
  }

  // 未配置 OpenAI，降级为原文
  if (!openai) {
    return text;
  }

  try {
    const sourceLanguage = languageMap[sourceLang];
    const targetLanguage = languageMap[targetLang];

    const response = await openai.chat.completions.create({
      // 如需改模型，可以换成 gpt-4o / gpt-5 等
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
      max_completion_tokens: 1024,
    });

    return response.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error('❌ Translation failed, fallback to original text:', error);
    return text;
  }
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
      const suffix = targetLang.replace('-', '');

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

