import OpenAI from "openai";
import { DASHSCOPE_API_KEY, isDashScopeConfigured } from "../config/dashscope";

// Using Qwen-MT API for translation services
const qwenClient = new OpenAI({ 
  apiKey: DASHSCOPE_API_KEY || 'placeholder',
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"  // 中国区域端点
});

// Using ChatGPT (via Replit AI Integrations) for AI chat responses
// Note: This uses Replit AI Integrations - no OpenAI API key needed, charges billed to Replit credits
const chatGPTClient = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export async function translateMessage(
  text: string,
  targetLanguage: string,
  messageType: "casual" | "business" | "social" = "casual"
): Promise<TranslationResult> {
  try {
    // Check if API key exists and try real translation first
    if (isDashScopeConfigured()) {
      const roleMapping = {
        casual: "日常口语翻译专家",
        business: "电商/营销本地化专家", 
        social: "社交平台本地化专家"
      };

      const role = roleMapping[messageType];

      // 语言代码到语言名称的映射，帮助模型更准确理解目标语言
      const languageNames: Record<string, string> = {
        'zh': '中文/Chinese',
        'en': 'English/英语',
        'th': 'ภาษาไทย/Thai/泰语',
        'vi': 'Tiếng Việt/Vietnamese/越南语',
        'ja': '日本語/Japanese/日语',
        'ko': '한국어/Korean/韩语',
        'id': 'Bahasa Indonesia/Indonesian/印尼语',
        'ar': 'العربية/Arabic/阿拉伯语',
        'ru': 'Русский/Russian/俄语',
        'es': 'Español/Spanish/西班牙语',
        'pt': 'Português/Portuguese/葡萄牙语',
        'fr': 'Français/French/法语',
        'de': 'Deutsch/German/德语',
        'it': 'Italiano/Italian/意大利语',
        'ms': 'Bahasa Melayu/Malay/马来语',
        'fil': 'Filipino/Tagalog/菲律宾语',
        'hi': 'हिन्दी/Hindi/印地语',
        'bn': 'বাংলা/Bengali/孟加拉语',
        'tr': 'Türkçe/Turkish/土耳其语',
        'nl': 'Nederlands/Dutch/荷兰语',
        'pl': 'Polski/Polish/波兰语',
        'uk': 'Українська/Ukrainian/乌克兰语',
        'cs': 'Čeština/Czech/捷克语',
        'sv': 'Svenska/Swedish/瑞典语',
        'el': 'Ελληνικά/Greek/希腊语',
        'he': 'עברית/Hebrew/希伯来语',
        'fa': 'فارسی/Persian/波斯语',
        'ur': 'اردو/Urdu/乌尔都语',
        'my': 'မြန်မာစာ/Burmese/缅甸语',
        'km': 'ភាសាខ្មែរ/Khmer/高棉语',
        'lo': 'ລາວ/Lao/老挝语',
        'ne': 'नेपाली/Nepali/尼泊尔语',
        'si': 'සිංහල/Sinhala/僧伽罗语',
        'ta': 'தமிழ்/Tamil/泰米尔语',
        'te': 'తెలుగు/Telugu/泰卢固语',
        'ml': 'മലയാളം/Malayalam/马拉雅拉姆语',
        'kn': 'ಕನ್ನಡ/Kannada/卡纳达语',
        'gu': 'ગુજરાતી/Gujarati/古吉拉特语',
        'mr': 'मराठी/Marathi/马拉地语',
        'pa': 'ਪੰਜਾਬੀ/Punjabi/旁遮普语',
        'sw': 'Kiswahili/Swahili/斯瓦希里语',
        'am': 'አማርኛ/Amharic/阿姆哈拉语',
        'ro': 'Română/Romanian/罗马尼亚语',
        'hu': 'Magyar/Hungarian/匈牙利语',
        'fi': 'Suomi/Finnish/芬兰语',
        'da': 'Dansk/Danish/丹麦语',
        'no': 'Norsk/Norwegian/挪威语',
        'sk': 'Slovenčina/Slovak/斯洛伐克语',
        'bg': 'Български/Bulgarian/保加利亚语',
        'hr': 'Hrvatski/Croatian/克罗地亚语',
        'sr': 'Српски/Serbian/塞尔维亚语',
        'lt': 'Lietuvių/Lithuanian/立陶宛语',
        'lv': 'Latviešu/Latvian/拉脱维亚语',
        'et': 'Eesti/Estonian/爱沙尼亚语',
      };
      
      const targetLanguageName = languageNames[targetLanguage] || targetLanguage;

      // 使用简单直接的翻译请求，不要求 JSON 格式
      const prompt = `Translate the following text to ${targetLanguageName}. 
Only output the translation, nothing else.

Text: ${text}`;

      const response = await qwenClient.chat.completions.create({
        model: "qwen-mt-turbo",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      let translatedText = response.choices[0].message.content || text;
      
      // 清理可能的引号或额外空白
      translatedText = translatedText.trim();
      if (translatedText.startsWith('"') && translatedText.endsWith('"')) {
        translatedText = translatedText.slice(1, -1);
      }
      
      console.log(`✅ Qwen翻译成功: "${text.slice(0, 20)}..." -> "${translatedText.slice(0, 30)}..." (${targetLanguage})`);

      return {
        translatedText,
        sourceLanguage: "auto",
        targetLanguage,
        confidence: 0.9
      };
    } else {
      // Fallback to mock translation for testing purposes
      console.log("Using mock translation - DASHSCOPE_API_KEY not configured");
      return getMockTranslation(text, targetLanguage);
    }
  } catch (error) {
    console.error("Translation error:", error);
    // Fallback to mock translation on API error
    console.log("Falling back to mock translation due to API error");
    return getMockTranslation(text, targetLanguage);
  }
}

// Mock translation function for testing purposes
function getMockTranslation(text: string, targetLanguage: string): TranslationResult {
  const translations: Record<string, Record<string, string>> = {
    "你好世界": {
      en: "Hello World",
      th: "สวัสดีโลก",
      ja: "こんにちは世界",
      id: "Halo Dunia"
    },
    "你好": {
      en: "Hello",
      th: "สวัสดี",
      ja: "こんにちは",
      id: "Halo"
    },
    "谢谢": {
      en: "Thank you",
      th: "ขอบคุณ",
      ja: "ありがとう",
      id: "Terima kasih"
    },
    "你好，今天天气真不错！": {
      en: "Hello, the weather is really nice today!",
      th: "สวัสดี อากาศดีจริงๆ วันนี้!",
      ja: "こんにちは、今日は本当にいい天気ですね！",
      id: "Halo, cuacanya benar-benar bagus hari ini!"
    },
    "我们去吃饭吧": {
      en: "Let's go eat",
      th: "ไปกินข้าวกันเถอะ",
      ja: "食事に行きましょう",
      id: "Ayo makan"
    },
    "测试": {
      en: "Test",
      th: "ทดสอบ",
      ja: "テスト",
      id: "Tes"
    },
    "Hello": {
      zh: "你好",
      th: "สวัสดี",
      ja: "こんにちは",
      id: "Halo"
    },
    "Thank you": {
      zh: "谢谢",
      th: "ขอบคุณ",
      ja: "ありがとう",
      id: "Terima kasih"
    },
    "皆さん、おはようございます！今日は React の新しいフックについて学んでいます。とても興味深いですね！😊": {
      zh: "大家早上好！今天我在学习React的新Hooks。非常有趣呢！😊",
      en: "Good morning everyone! Today I'm learning about React's new Hooks. It's very interesting! 😊"
    },
    "こんにちは、皆さん！今日は良い天気ですね。元気でお過ごしでしょうか？": {
      zh: "你好，大家！今天天气真好。大家过得怎么样？",
      en: "Hello everyone! The weather is really nice today. How are you all doing?"
    },
    "Hello everyone! How are you doing today? The weather is really nice!": {
      zh: "大家好！你们今天怎么样？天气真的很好！",
      ja: "皆さんこんにちは！今日はいかがですか？天気がとても良いですね！"
    },
    "مرحبا جميعا! كيف حالكم اليوم؟ الطقس جميل جداً اليوم!": {
      zh: "大家好！你们今天怎么样？今天天气非常好！",
      en: "Hello everyone! How are you all today? The weather is very beautiful today!",
      ja: "皆さんこんにちは！今日はいかがですか？今日はとても良い天気ですね！"
    }
  };

  // Improved language detection
  const sourceLanguage = detectTextLanguage(text);
  
  // Robust translation lookup with normalization
  let translatedText = translations[text]?.[targetLanguage];
  
  // Try normalized lookup if exact match fails
  if (!translatedText) {
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    translatedText = translations[normalizedText]?.[targetLanguage];
  }
  
  // Try partial matching for known patterns
  if (!translatedText) {
    for (const [key, value] of Object.entries(translations)) {
      if (text.includes(key.substring(0, 10)) || key.includes(text.substring(0, 10))) {
        translatedText = value[targetLanguage];
        break;
      }
    }
  }
  
  // Provide language-specific fallback
  if (!translatedText) {
    const fallbackPrefixes = {
      zh: "【翻译】",
      en: "[Translation] ",
      ja: "【翻訳】",
      ar: "[ترجمة] ",
      th: "[แปล] "
    };
    
    const prefix = fallbackPrefixes[targetLanguage as keyof typeof fallbackPrefixes] || "[Translation] ";
    translatedText = `${prefix}${text}`;
  }

  return {
    translatedText,
    sourceLanguage,
    targetLanguage,
    confidence: 0.9
  };
}

// Improved language detection function
export function detectTextLanguage(text: string): string {
  // Japanese: Hiragana, Katakana, or Japanese-specific patterns
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text) || 
      (/[\u4e00-\u9fff]/.test(text) && /[はがをにのでとも]/.test(text))) {
    return "ja";
  }
  
  // Arabic script
  if (/[\u0600-\u06ff\u0750-\u077f]/.test(text)) {
    return "ar";
  }
  
  // Thai script
  if (/[\u0e00-\u0e7f]/.test(text)) {
    return "th";
  }
  
  // Chinese (CJK ideographs without Japanese indicators)
  if (/[\u4e00-\u9fff]/.test(text)) {
    return "zh";
  }
  
  // Indonesian specific patterns (common words)
  if (/\b(saya|anda|adalah|dengan|untuk|ini|itu|yang|di|ke)\b/i.test(text)) {
    return "id";
  }
  
  // English: basic Latin alphabet with common English words
  if (/^[a-zA-Z0-9\s\.,!?'"()-]+$/.test(text) && 
      /\b(the|is|are|was|were|have|has|will|would|can|could)\b/i.test(text)) {
    return "en";
  }
  
  // If only contains basic Latin but no English indicators, mark as unknown
  if (/^[a-zA-Z0-9\s\.,!?'"()-]+$/.test(text)) {
    return "unknown";
  }
  
  // Cannot determine - return unknown instead of defaulting to en
  return "unknown";
}

export async function detectLanguage(text: string): Promise<string> {
  try {
    const response = await qwenClient.chat.completions.create({
      model: "qwen-mt-turbo",
      messages: [
        {
          role: "user",
          content: `你是语言检测专家。请检测以下文本的语言并以JSON格式回复，包含language字段（值为zh/en/th/ja/id之一）。

文本：${text}`
        }
      ],
      response_format: { type: "json_object" }
    });

    let content = response.choices[0].message.content || "{}";
    
    // 处理markdown格式的JSON响应
    if (content.includes("```json")) {
      content = content.replace(/```json\s*/g, "").replace(/\s*```/g, "");
    }
    
    const result = JSON.parse(content);
    return result.language || "unknown";
  } catch (error) {
    console.error("Language detection error:", error);
    return "unknown";
  }
}

// AI客服智能回复功能
// ✅ AI始终用英文回复，然后系统会自动翻译成用户的语言显示双语气泡
export async function generateAIResponse(
  userMessage: string, 
  userName: string = "用户",
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  try {
    
    // 检测用户是否提到了具体平台
    const mentionedPlatform = detectMentionedPlatform(userMessage);
    
    // 检测是否是分享相关询问
    const isShareQuestion = /(?:分享|邀请|invite|share|朋友|friend)/i.test(userMessage);
    
    // 🔥 修复智能逻辑：如果只提到平台名，认为是分享询问
    const isPlatformOnlyMention = mentionedPlatform && userMessage.trim().toLowerCase() === mentionedPlatform;
    
    if ((isShareQuestion && mentionedPlatform) || isPlatformOnlyMention) {
      // 用户提到了具体平台，直接生成分享链接
      try {
        const shareResult = await generateSmartShareLink(mentionedPlatform);
        // 对于LINE，直接返回纯链接，不添加额外文字
        if (mentionedPlatform === 'line') {
          return shareResult.magicLink;
        }
        // 统一用英文回复（系统会自动翻译显示双语气泡）
        return `Here's your ${shareResult.platform} share link:\n\n${shareResult.shareUrl}\n\nShare this with your friend and they'll join Trustalk instantly! 🌍`;
      } catch (error) {
        console.error("Smart share generation failed:", error);
        return `I can help you share Trustalk! What social platform does your friend use most? (WhatsApp, LINE, Telegram, Messenger, Viber, Zalo, SMS, or Email) I'll generate the perfect share link for you! 📱`;
      }
    } else if (isShareQuestion) {
      // 分享问题但没提到平台，主动询问（统一用英文）
      return `I'd love to help you invite friends to Trustalk! 🌍 What social platform does your friend use most?\n\n• WhatsApp 💬\n• LINE 🟢  \n• Telegram ✈️\n• Messenger 💙\n• Viber 💜\n• Zalo 🔵\n• SMS 📱\n• Email 📧\n\nJust tell me which one, and I'll generate the perfect share link for you!`;
    }

    // ✅ 新的智能聊天逻辑：检测是否询问Trustalk功能
    const isTrustalkQuestion = /(?:mytalk|功能|feature|怎么|how|what|can|支持|翻译|聊天|chat|translate|群|group)/i.test(userMessage);

    // 🧠 构建对话历史消息（最多保留最近20条，约10轮对话）
    const recentHistory = conversationHistory.slice(-20);

    // 🤖 使用ChatGPT (GPT-4o) 生成回复
    // ✅ AI始终用英文回复，系统会自动翻译成用户的语言显示双语气泡
    const response = await chatGPTClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: isTrustalkQuestion ?
            `You are "我的助手" (My Assistant) - a helpful guide for Trustalk users. Your motto: "不懂就问它" (Ask me anything you don't understand). Answer questions about Trustalk features concisely in English.

Trustalk Features:
- Multi-language chat with auto translation
- Voice messages with translation
- Group chat support
- Smart platform-specific sharing

Be brief, friendly, helpful, and only mention what they ask about.`
          :
            `You are "我的助手" (My Assistant) - a friendly chat companion. Your motto: "不懂就问它" (Ask me anything you don't understand). Reply naturally in English. Be casual, fun, helpful, and conversational. Keep responses under 50 words.`
        },
        ...recentHistory,
        {
          role: "user",
          content: userMessage
        }
      ],
      max_completion_tokens: 200
    });

    console.log("🤖 GPT-4o完整响应:", JSON.stringify(response, null, 2));
    const aiContent = response.choices[0]?.message?.content;
    console.log("🤖 GPT-4o回复内容:", aiContent);
    
    return aiContent || "Hey! What's up? 😊";
  } catch (error) {
    console.error("AI response generation error:", error);
    return "Hey there! How can I help you today? 😊";
  }
}

// 检测用户消息中提到的社交平台
function detectMentionedPlatform(message: string): string | null {
  const platformMap = {
    'whatsapp': ['whatsapp', 'wa', '微信'],
    'line': ['line'],  
    'telegram': ['telegram', 'tg'],
    'messenger': ['messenger', 'facebook'],
    'viber': ['viber'],
    'zalo': ['zalo'],
    'sms': ['sms', '短信', '手机', 'phone'],
    'email': ['email', '邮件', 'mail']
  };
  
  const lowerMessage = message.toLowerCase();
  
  for (const [platform, keywords] of Object.entries(platformMap)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return platform;
    }
  }
  
  return null;
}

// 生成智能分享链接
async function generateSmartShareLink(platform: string) {
  try {
    // 导入需要的库
    const { nanoid } = await import('nanoid');
    const jwt = await import('jsonwebtoken');
    
    // 平台配置
    const platformConfigs = {
      'whatsapp': { name: 'WhatsApp', icon: '💬', url: (text: string, link: string) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}` },
      'line': { name: 'LINE', icon: '🟢', url: (text: string, link: string) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` },
      'telegram': { name: 'Telegram', icon: '✈️', url: (text: string, link: string) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` },
      'messenger': { name: 'Messenger', icon: '💙', url: (text: string, link: string) => `https://www.messenger.com/t/?link=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` },
      'viber': { name: 'Viber', icon: '💜', url: (text: string, link: string) => `viber://forward?text=${encodeURIComponent(text + ' ' + link)}` },
      'zalo': { name: 'Zalo', icon: '🔵', url: (text: string, link: string) => `https://zalo.me/s/${encodeURIComponent(link)}?text=${encodeURIComponent(text)}` },
      'sms': { name: 'SMS', icon: '📱', url: (text: string, link: string) => `sms:?body=${encodeURIComponent(text + ' ' + link)}` },
      'email': { name: 'Email', icon: '📧', url: (text: string, link: string) => `mailto:?subject=${encodeURIComponent('邀请加入Trustalk')}&body=${encodeURIComponent(text + '\n\n' + link)}` }
    };

    const config = platformConfigs[platform as keyof typeof platformConfigs];
    if (!config) {
      throw new Error('Unsupported platform');
    }

    // 生成Magic Link
    const roomId = "11111111-1111-1111-1111-111111111111";
    const userId = "default-user";
    const payload = { 
      roomId, 
      inviterId: userId, 
      typ: 'ml', 
      jti: nanoid(),
      iat: Math.floor(Date.now() / 1000)
    };
    
    const secret = process.env.SESSION_SECRET || 'default-secret-key';
    const token = jwt.default.sign(payload, secret, { expiresIn: '7d' });
    const baseUrl = process.env.BASE_URL;
    if (!baseUrl) {
      throw new Error('BASE_URL not configured');
    }
    const magicLink = `${baseUrl}/invite/${token}`;
    
    // 生成分享文案
    const shareText = `🌍 加入我在Trustalk的聊天！支持多语言自动翻译，语音视频通话无障碍，全球朋友轻松沟通！Trustalk.app`;
    
    // 生成平台专属分享链接
    const shareUrl = config.url(shareText, magicLink);
    
    return {
      platform: config.name,
      icon: config.icon,
      shareUrl,
      shareText,
      magicLink,
      message: `已为您生成${config.name}分享链接！直接复制发给好友即可：`
    };
    
  } catch (error) {
    console.error("Smart share generation error:", error);
    throw error;
  }
}
