/**
 * LINE Messaging API Service
 * 
 * Provides functionality to send push messages via LINE Official Account.
 */

const LINE_MESSAGING_API_URL = 'https://api.line.me/v2/bot/message/push';

/**
 * Push a message to a LINE user via LINE Messaging API
 * 
 * @param to - LINE user ID (recipient)
 * @param message - Message object (e.g., { type: 'text', text: '...' })
 */
export async function pushLineMessage(to: string, message: any): Promise<void> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    console.error('[LINE PUSH ERROR] LINE_CHANNEL_ACCESS_TOKEN not configured');
    return;
  }

  try {
    const response = await fetch(LINE_MESSAGING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to,
        messages: [message],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LINE PUSH ERROR] Failed to send message:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        to: to.substring(0, 8) + '...', // 隐藏完整 user ID 保护隐私
      });
      return;
    }

    console.log('[LINE PUSH SUCCESS] Message sent to user:', {
      to: to.substring(0, 8) + '...',
      messageType: message.type,
    });
  } catch (error) {
    console.error('[LINE PUSH ERROR] Exception while sending message:', {
      error: error instanceof Error ? error.message : String(error),
      to: to.substring(0, 8) + '...',
    });
  }
}
