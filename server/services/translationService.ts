import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const languageMap: Record<string, string> = {
  'zh-cn': 'Simplified Chinese',
  'en-us': 'English',
  'th-th': 'Thai',
};

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  if (sourceLang === targetLang) {
    return text;
  }

  try {
    const sourceLanguage = languageMap[sourceLang] || 'English';
    const targetLanguage = languageMap[targetLang] || 'English';

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_TRANSLATE || 'gpt-4o-mini',
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
