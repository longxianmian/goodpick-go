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

/**
 * Campaign broadcast message templates in three languages
 * v1: Simple text messages with campaign link
 */
const CAMPAIGN_MESSAGE_TEMPLATES = {
  th: (campaignUrl: string) =>
    `🎉 มีดีลใหม่จาก DeeCard แล้ว!\nคลิกเพื่อดูรายละเอียดและรับสิทธิ์ของคุณ: ${campaignUrl}`,
  en: (campaignUrl: string) =>
    `🎉 New offer is now available on DeeCard!\nTap to view details and claim your coupon: ${campaignUrl}`,
  zh: (campaignUrl: string) =>
    `🎉 DeeCard 有新的优惠活动上线啦！\n点击查看活动详情并领取你的优惠券：${campaignUrl}`,
};

/**
 * Send campaign broadcast message to a LINE user
 * 
 * @param lineUserId - LINE user ID (recipient)
 * @param lang - User's preferred language
 * @param payload - Campaign information
 */
export async function sendCampaignMessage(
  lineUserId: string,
  lang: 'th' | 'en' | 'zh',
  payload: { campaignId: number }
): Promise<void> {
  // 1. Build campaign URL (production H5 page)
  const campaignUrl = `https://goodpickgo.com/campaign/${payload.campaignId}`;

  // 2. Select message template based on language
  const templateFn = CAMPAIGN_MESSAGE_TEMPLATES[lang] ?? CAMPAIGN_MESSAGE_TEMPLATES['th'];
  const messageText = templateFn(campaignUrl);

  // 3. Build message object
  const message = {
    type: 'text',
    text: messageText,
  };

  // 4. Send via LINE Messaging API
  await pushLineMessage(lineUserId, message);
}
