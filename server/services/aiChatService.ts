import OpenAI from 'openai';

let openai: OpenAI | null = null;

try {
  // 优先使用 Replit AI Integrations（不需要自己的API Key）
  const replitApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const replitBaseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  
  // 备用：使用自己的 OpenAI API Key（用于阿里云ECS部署）
  const ownApiKey = process.env.OPENAI_API_KEY;
  const ownBaseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (replitApiKey && replitBaseURL) {
    openai = new OpenAI({
      apiKey: replitApiKey,
      baseURL: replitBaseURL,
    });
    console.log('✅ AI Chat 服务已启用 (Replit AI Integrations)');
  } else if (ownApiKey && ownApiKey.trim()) {
    openai = new OpenAI({
      apiKey: ownApiKey,
      baseURL: ownBaseURL,
    });
    console.log('✅ AI Chat 服务已启用 (自有 API Key)');
  } else {
    console.warn('⚠️ 未配置 OpenAI，AI Chat 功能已禁用');
  }
} catch (error) {
  console.error('❌ OpenAI 初始化失败，AI Chat 功能已禁用:', error);
  openai = null;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const systemPrompt = `你是刷刷小助手，一个友好、专业的AI助理。你的任务是帮助用户解答问题、提供建议，并以热情、亲切的方式与用户交流。

你的特点：
- 使用用户使用的语言回复
- 回答简洁明了，避免冗长
- 友好且有帮助
- 如果不确定答案，坦诚告知

你可以帮助用户：
- 回答一般性问题
- 提供本地生活服务的建议
- 解答关于平台使用的问题
- 日常对话和闲聊`;

export async function chat(
  messages: ChatMessage[],
  userLanguage: string = 'zh-cn'
): Promise<string> {
  if (!openai) {
    return '抱歉，AI服务暂时不可用。请稍后再试。';
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '抱歉，我没有理解您的问题。';
  } catch (error) {
    console.error('AI Chat 调用失败:', error);
    return '抱歉，AI服务暂时出错。请稍后再试。';
  }
}

export function isAiChatEnabled(): boolean {
  return openai !== null;
}
