import OpenAI from 'openai';

// Using Replit's AI Integrations service for OpenAI access
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

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
  if (sourceLang === targetLang) {
    return text;
  }

  if (!validateLanguageCode(sourceLang) || !validateLanguageCode(targetLang)) {
    console.warn(`Invalid language code: sourceLang=${sourceLang}, targetLang=${targetLang}`);
    return text;
  }

  try {
    const sourceLanguage = languageMap[sourceLang];
    const targetLanguage = languageMap[targetLang];

    const response = await openai.chat.completions.create({
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
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

    return response.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error('Translation failed:', error);
    return text;
  }
}

export async function translateCampaignFields(
  fields: { title?: string; description?: string },
  sourceLang: string,
  targetLangs: string[]
): Promise<Record<string, string>> {
  const translations: Record<string, string> = {};

  for (const targetLang of targetLangs) {
    if (fields.title) {
      const titleKey = `title_${targetLang.replace('-', '')}`;
      translations[titleKey] = await translateText(fields.title, sourceLang, targetLang);
    }

    if (fields.description) {
      const descKey = `description_${targetLang.replace('-', '')}`;
      translations[descKey] = await translateText(fields.description, sourceLang, targetLang);
    }
  }

  return translations;
}
