/**
 * LINE Messaging API Service
 * 
 * Provides functionality to send push messages via LINE Official Account.
 */

const LINE_MESSAGING_API_URL = 'https://api.line.me/v2/bot/message/push';

/**
 * Get Channel Access Token based on OA ID
 * 
 * @param oaId - Official Account ID (e.g., 'DEECARD_MAIN_OA', 'GOODPICK_MAIN_OA')
 * @returns Channel Access Token or null if not configured
 */
function getChannelAccessToken(oaId?: string): string | null {
  // 如果指定了 oaId，优先使用对应的 token
  if (oaId === 'DEECARD_MAIN_OA') {
    return process.env.DEECARD_CHANNEL_ACCESS_TOKEN || process.env.LINE_CHANNEL_ACCESS_TOKEN || null;
  }
  
  if (oaId === 'GOODPICK_MAIN_OA') {
    return process.env.GOODPICK_CHANNEL_ACCESS_TOKEN || null;
  }
  
  // 默认使用 LINE_CHANNEL_ACCESS_TOKEN（兼容旧配置）
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || null;
}

/**
 * Push a message to a LINE user via LINE Messaging API
 * 
 * @param to - LINE user ID (recipient)
 * @param message - Message object (e.g., { type: 'text', text: '...' })
 * @param oaId - Optional OA ID to select correct Channel Access Token
 * @returns Response status information
 */
export async function pushLineMessage(
  to: string, 
  message: any, 
  oaId?: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  const channelAccessToken = getChannelAccessToken(oaId);

  if (!channelAccessToken) {
    console.error('[LINE PUSH ERROR] Channel Access Token not configured', {
      oaId: oaId || 'default',
    });
    return { success: false, error: 'Channel Access Token not configured' };
  }

  console.log('[LINE PUSH] Sending message', {
    to: to.substring(0, 8) + '...',
    oaId: oaId || 'default',
    messageType: message.type,
  });

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
        oaId: oaId || 'default',
      });
      return { 
        success: false, 
        status: response.status, 
        error: `${response.status} ${response.statusText}: ${errorText.substring(0, 100)}` 
      };
    }

    const responseData = await response.json();
    console.log('[LINE PUSH SUCCESS] Message sent to user:', {
      to: to.substring(0, 8) + '...',
      messageType: message.type,
      oaId: oaId || 'default',
      status: response.status,
      responseData,
    });
    
    return { success: true, status: response.status };
  } catch (error) {
    console.error('[LINE PUSH ERROR] Exception while sending message:', {
      error: error instanceof Error ? error.message : String(error),
      to: to.substring(0, 8) + '...',
      oaId: oaId || 'default',
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Send payment notification message to a LINE user via merchant's OA
 * 
 * @param channelAccessToken - Merchant's LINE OA Channel Access Token
 * @param lineUserId - LINE user ID (recipient)
 * @param storeName - Store name
 * @param amount - Payment amount
 * @param points - Points earned
 * @returns Response status information
 */
export async function sendPaymentNotification(
  channelAccessToken: string,
  lineUserId: string,
  storeName: string,
  amount: number,
  points: number
): Promise<{ success: boolean; status?: number; error?: string }> {
  if (!channelAccessToken) {
    console.error('[Payment Notification] Channel Access Token not provided');
    return { success: false, error: 'Channel Access Token not provided' };
  }

  const messageText = `感谢在 ${storeName} 消费 ${amount.toFixed(2)} THB！\n您已获得 ${points} 积分，快来商家页面查看您的会员权益吧！`;

  console.log('[Payment Notification] Sending message', {
    to: lineUserId.substring(0, 8) + '...',
    storeName,
    amount,
    points,
  });

  try {
    const response = await fetch(LINE_MESSAGING_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{
          type: 'text',
          text: messageText,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Payment Notification] Failed to send:', {
        status: response.status,
        error: errorText,
      });
      return { 
        success: false, 
        status: response.status, 
        error: `${response.status}: ${errorText.substring(0, 100)}` 
      };
    }

    console.log('[Payment Notification] Message sent successfully to:', lineUserId.substring(0, 8) + '...');
    return { success: true, status: response.status };
  } catch (error) {
    console.error('[Payment Notification] Exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
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
 * @returns Promise that resolves when message is sent
 */
export async function sendCampaignMessage(
  lineUserId: string,
  lang: 'th' | 'en' | 'zh',
  payload: { campaignId: number }
): Promise<{ success: boolean; status?: number; error?: string }> {
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

  // 4. Send via LINE Messaging API (using DeeCard OA)
  return await pushLineMessage(lineUserId, message, 'DEECARD_MAIN_OA');
}
