/**
 * Welcome Message Service
 * 
 * Sends a one-time welcome message to users when they first authenticate via LINE OAuth.
 * Uses user's preferred language to select appropriate message template.
 */

import { db } from '../db';
import { oaUserLinks } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { pushLineMessage } from './lineMessagingService';

/**
 * Welcome message templates in three languages
 * v1: Simple text messages (can be extended to Flex/Button messages later)
 */
const WELCOME_TEMPLATES = {
  th: {
    text: 'ยินดีต้อนรับสู่ GoodPick Go! 🎉\n\nคุณสามารถดูคูปองและสิทธิพิเศษของคุณได้ที่นี่ เริ่มต้นใช้งานและรับส่วนลดสุดพิเศษกันเลย!',
  },
  en: {
    text: 'Welcome to GoodPick Go! 🎉\n\nYou can view your coupons and member benefits here. Start exploring and enjoy exclusive discounts!',
  },
  zh: {
    text: '欢迎加入 GoodPick Go！🎉\n\n你可以在这里查看你的优惠券和会员权益。开始探索并享受专属优惠吧！',
  },
};

type SendWelcomeOptions = {
  user: { id: number; preferredLanguage: 'th' | 'en' | 'zh' | null };
  lineUserId: string;
  oaId: string;
  initialLanguage: 'th' | 'en' | 'zh';
};

/**
 * Send welcome message to user if conditions are met
 * 
 * Conditions:
 * 1. Development environment: Only send to LINE_DEV_TEST_USER_ID
 * 2. Production environment: Send to all users
 * 3. Only send if welcome_sent === false in oa_user_links
 * 
 * @param options - User and OA link information
 */
export async function sendWelcomeMessageIfNeeded(
  options: SendWelcomeOptions
): Promise<void> {
  const { user, lineUserId, oaId, initialLanguage } = options;

  // A. Development environment safety valve
  const devTestUserId = process.env.LINE_DEV_TEST_USER_ID;
  const isDevEnvironment = process.env.NODE_ENV !== 'production';

  if (isDevEnvironment && devTestUserId) {
    if (lineUserId !== devTestUserId) {
      console.log('[WELCOME DEV] Skip sending welcome message to non-test user', {
        lineUserId: lineUserId.substring(0, 8) + '...',
      });
      return;
    }
    console.log('[WELCOME DEV] Sending welcome message to test user', {
      lineUserId: lineUserId.substring(0, 8) + '...',
    });
  }

  // B. Check oa_user_links record and welcome_sent status
  const [link] = await db
    .select()
    .from(oaUserLinks)
    .where(
      and(
        eq(oaUserLinks.oaId, oaId),
        eq(oaUserLinks.lineUserId, lineUserId)
      )
    )
    .limit(1);

  if (!link) {
    console.warn('[WELCOME WARN] No oa_user_link found, skipping welcome message', {
      oaId,
      lineUserId: lineUserId.substring(0, 8) + '...',
    });
    return;
  }

  if (link.welcomeSent) {
    console.log('[WELCOME SKIP] Welcome message already sent', {
      linkId: link.id,
      welcomeSentAt: link.welcomeSentAt,
    });
    return;
  }

  // C. Determine language to use
  const lang = (user.preferredLanguage ?? initialLanguage ?? 'th') as 'th' | 'en' | 'zh';

  // D. Select welcome message template
  const template = WELCOME_TEMPLATES[lang] ?? WELCOME_TEMPLATES['th'];
  const message = {
    type: 'text',
    text: template.text,
  };

  console.log('[WELCOME SEND] Preparing to send welcome message', {
    userId: user.id,
    lineUserId: lineUserId.substring(0, 8) + '...',
    language: lang,
  });

  // E. Call LINE Messaging API to send message
  try {
    await pushLineMessage(lineUserId, message);

    // F. Update welcome_sent status
    await db
      .update(oaUserLinks)
      .set({
        welcomeSent: true,
        welcomeSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(oaUserLinks.id, link.id));

    console.log('[WELCOME SUCCESS] Welcome message sent and status updated', {
      linkId: link.id,
      userId: user.id,
      language: lang,
    });
  } catch (error) {
    console.error('[WELCOME ERROR] Failed to send welcome message', {
      error: error instanceof Error ? error.message : String(error),
      userId: user.id,
      lineUserId: lineUserId.substring(0, 8) + '...',
    });
    // Don't throw - we don't want welcome message failure to break login flow
  }
}
