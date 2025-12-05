/**
 * Campaign Broadcast Service
 * 
 * Handles sending campaign broadcast messages to all OA-linked users.
 * v1: Manual trigger from admin panel, simple sequential sending.
 */

import { db } from '../db';
import { campaignBroadcasts, oaUserLinks, users, campaigns } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { sendCampaignMessage } from './lineMessagingService';

/**
 * Create a new campaign broadcast task
 * 
 * @param campaignId - Campaign ID to broadcast
 * @param adminId - Admin ID who triggered the broadcast
 * @param oaId - OA ID (e.g., GOODPICK_MAIN_OA_ID)
 * @returns Created broadcast record
 */
export async function createCampaignBroadcast(
  campaignId: number,
  adminId: number,
  oaId: string
) {
  // Verify campaign exists
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (!campaign) {
    throw new Error(`Campaign with ID ${campaignId} not found`);
  }

  // Create broadcast record
  const [broadcast] = await db
    .insert(campaignBroadcasts)
    .values({
      campaignId,
      oaId,
      targetType: 'ALL',
      sendTime: new Date(),
      status: 'pending',
      totalTargets: 0,
      sentCount: 0,
      failedCount: 0,
      createdBy: adminId,
    })
    .returning();

  console.log('[BROADCAST] Created new broadcast task:', {
    broadcastId: broadcast.id,
    campaignId,
    oaId,
    createdBy: adminId,
  });

  return broadcast;
}

/**
 * Execute a campaign broadcast task
 * 
 * Sends campaign message to all users linked to the specified OA.
 * Updates broadcast status and counters in real-time.
 * 
 * @param broadcastId - Broadcast task ID
 */
export async function runBroadcastTask(broadcastId: number): Promise<void> {
  console.log('[BROADCAST] Starting broadcast task:', { broadcastId });

  try {
    // 1. Fetch broadcast record
    const [broadcast] = await db
      .select()
      .from(campaignBroadcasts)
      .where(eq(campaignBroadcasts.id, broadcastId))
      .limit(1);

    if (!broadcast) {
      console.error('[BROADCAST ERROR] Broadcast record not found:', { broadcastId });
      return;
    }

    if (broadcast.status !== 'pending') {
      console.warn('[BROADCAST WARN] Broadcast is not in pending status:', {
        broadcastId,
        currentStatus: broadcast.status,
      });
      return;
    }

    // Update status to 'sending'
    await db
      .update(campaignBroadcasts)
      .set({
        status: 'sending',
        updatedAt: new Date(),
      })
      .where(eq(campaignBroadcasts.id, broadcastId));

    // 2. Fetch all OA-linked users
    const oaLinks = await db
      .select({
        id: oaUserLinks.id,
        lineUserId: oaUserLinks.lineUserId,
        userId: oaUserLinks.userId,
        initialLanguage: oaUserLinks.initialLanguage,
      })
      .from(oaUserLinks)
      .where(eq(oaUserLinks.oaId, broadcast.oaId));

    console.log('[BROADCAST] Found OA links:', {
      broadcastId,
      totalLinks: oaLinks.length,
    });

    // Update totalTargets
    await db
      .update(campaignBroadcasts)
      .set({
        totalTargets: oaLinks.length,
        updatedAt: new Date(),
      })
      .where(eq(campaignBroadcasts.id, broadcastId));

    // 3. Send messages to each user
    let sentCount = 0;
    let failedCount = 0;

    for (const link of oaLinks) {
      try {
        // Skip if no userId (incomplete link)
        if (!link.userId) {
          console.warn('[BROADCAST SKIP] OA link has no userId:', {
            linkId: link.id,
            lineUserId: link.lineUserId.substring(0, 8) + '...',
          });
          failedCount++;
          continue;
        }

        // Fetch user to get preferred_language
        const [user] = await db
          .select({
            id: users.id,
            preferredLanguage: users.preferredLanguage,
          })
          .from(users)
          .where(eq(users.id, link.userId))
          .limit(1);

        if (!user) {
          console.warn('[BROADCAST SKIP] User not found:', {
            userId: link.userId,
            lineUserId: link.lineUserId.substring(0, 8) + '...',
          });
          failedCount++;
          continue;
        }

        // 5. Determine final language
        const lang = (user.preferredLanguage ?? link.initialLanguage ?? 'th') as 'th' | 'en' | 'zh';

        // 6. Send campaign message
        const result = await sendCampaignMessage(link.lineUserId, lang, {
          campaignId: broadcast.campaignId,
        });

        if (result.success) {
          sentCount++;
          console.log('[BROADCAST] Message sent:', {
            broadcastId,
            userId: user.id,
            lineUserId: link.lineUserId.substring(0, 8) + '...',
            language: lang,
            progress: `${sentCount}/${oaLinks.length}`,
          });
        } else {
          failedCount++;
          console.error('[BROADCAST] Message send failed:', {
            broadcastId,
            userId: user.id,
            lineUserId: link.lineUserId.substring(0, 8) + '...',
            error: result.error,
            status: result.status,
          });
        }

        // Update counters every 10 messages for performance
        if (sentCount % 10 === 0) {
          await db
            .update(campaignBroadcasts)
            .set({
              sentCount,
              failedCount,
              updatedAt: new Date(),
            })
            .where(eq(campaignBroadcasts.id, broadcastId));
        }
      } catch (error) {
        failedCount++;
        console.error('[BROADCAST ERROR] Failed to send to user:', {
          broadcastId,
          userId: link.userId,
          lineUserId: link.lineUserId.substring(0, 8) + '...',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 7. Final status update
    const finalStatus = failedCount === 0 ? 'done' : 'failed';

    await db
      .update(campaignBroadcasts)
      .set({
        status: finalStatus,
        sentCount,
        failedCount,
        updatedAt: new Date(),
      })
      .where(eq(campaignBroadcasts.id, broadcastId));

    console.log('[BROADCAST] Task completed:', {
      broadcastId,
      status: finalStatus,
      totalTargets: oaLinks.length,
      sentCount,
      failedCount,
    });
  } catch (error) {
    // 8. Handle fatal errors
    console.error('[BROADCAST FATAL ERROR] Broadcast task failed:', {
      broadcastId,
      error: error instanceof Error ? error.message : String(error),
    });

    await db
      .update(campaignBroadcasts)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(campaignBroadcasts.id, broadcastId));

    throw error;
  }
}
