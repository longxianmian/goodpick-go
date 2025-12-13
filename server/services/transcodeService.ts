import { db } from '../db';
import { shortVideos } from '@shared/schema';
import { eq } from 'drizzle-orm';

let Mts20140618: any = null;
let OpenApiConfig: any = null;

async function loadMtsModule() {
  if (!Mts20140618) {
    const MtsModule = await import('@alicloud/mts20140618');
    const OpenApi = await import('@alicloud/openapi-client');
    Mts20140618 = MtsModule;
    OpenApiConfig = OpenApi.Config;
  }
}

interface TranscodeJobResult {
  success: boolean;
  mediaId?: string;
  error?: string;
}

interface TranscodeConfig {
  accessKeyId: string;
  accessKeySecret: string;
  regionId: string;
  inputBucket: string;
  workflowId: string;
}

function getConfig(): TranscodeConfig {
  const accessKeyId = process.env.MPS_ACCESS_KEY_ID || process.env.ALI_OSS_ACCESS_KEY_ID || '';
  const accessKeySecret = process.env.MPS_ACCESS_KEY_SECRET || process.env.ALI_OSS_ACCESS_KEY_SECRET || '';
  const regionId = process.env.MPS_REGION_ID || 'ap-southeast-1';
  const inputBucket = process.env.OSS_VIDEO_BUCKET || 'shuashua-video';
  const workflowId = process.env.MPS_WORKFLOW_ID || '1991fa795ff14d29aefc26e340107ea0';

  return {
    accessKeyId,
    accessKeySecret,
    regionId,
    inputBucket,
    workflowId,
  };
}

async function createClient(config: TranscodeConfig) {
  await loadMtsModule();
  const clientConfig = new OpenApiConfig({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
  });
  
  clientConfig.endpoint = `mts.${config.regionId}.aliyuncs.com`;
  
  return new Mts20140618.default(clientConfig);
}

export async function submitTranscodeJob(
  inputObjectKey: string,
  videoId: number
): Promise<TranscodeJobResult> {
  const config = getConfig();

  if (!config.accessKeyId || !config.accessKeySecret) {
    console.warn('[Transcode] Missing Aliyun credentials, skipping transcode job');
    return { success: false, error: 'Missing Aliyun credentials' };
  }

  try {
    await loadMtsModule();
    const client = await createClient(config);

    const fileURL = `http://${config.inputBucket}.oss-${config.regionId}.aliyuncs.com/${inputObjectKey}`;
    
    console.log(`[Transcode] Adding media for video ${videoId}`);
    console.log(`[Transcode] FileURL: ${fileURL}`);
    console.log(`[Transcode] WorkflowId: ${config.workflowId}`);

    const addMediaRequest = new Mts20140618.AddMediaRequest({
      mediaWorkflowId: config.workflowId,
      fileURL: fileURL,
      title: `video-${videoId}`,
      description: `Short video ${videoId}`,
    });

    const response = await client.addMedia(addMediaRequest);
    
    console.log('[Transcode] AddMedia Response:', JSON.stringify(response.body, null, 2));

    const media = response.body?.media;
    const mediaId = media?.mediaId;
    
    if (mediaId) {
      console.log(`[Transcode] Media added successfully, MediaId: ${mediaId}`);
      
      const runIdList = media?.runIdList?.runId;
      const runId = Array.isArray(runIdList) ? runIdList[0] : runIdList;
      
      await db.update(shortVideos)
        .set({ 
          transcodeJobId: runId || mediaId,
          transcodeStatus: 'SUBMITTED',
        })
        .where(eq(shortVideos.id, videoId));
      
      return { success: true, mediaId };
    }

    console.error('[Transcode] No MediaId returned from API');
    return { success: false, error: 'No MediaId returned' };
  } catch (error: any) {
    const errMsg = error.message || 'Unknown error';
    console.error('[Transcode] AddMedia error:', errMsg);
    console.error('[Transcode] Full error:', JSON.stringify({
      code: error.code,
      statusCode: error.statusCode,
      data: error.data,
    }, null, 2));
    
    await db.update(shortVideos)
      .set({ 
        transcodeStatus: 'FAILED',
        transcodeError: errMsg,
      })
      .where(eq(shortVideos.id, videoId));
    
    return { success: false, error: errMsg };
  }
}

export function isTranscodeConfigured(): boolean {
  const config = getConfig();
  return !!(
    config.accessKeyId &&
    config.accessKeySecret &&
    config.inputBucket
  );
}

export async function triggerTranscodeAfterUpload(
  videoObjectKey: string,
  videoId: number
): Promise<void> {
  if (!isTranscodeConfigured()) {
    console.log('[Transcode] Not configured, skipping auto-transcode');
    return;
  }

  try {
    const result = await submitTranscodeJob(videoObjectKey, videoId);
    if (!result.success) {
      console.warn(`[Transcode] Failed to add media for video ${videoId}: ${result.error}`);
    }
  } catch (error) {
    console.error(`[Transcode] Error triggering transcode for video ${videoId}:`, error);
  }
}

export async function batchTranscodePendingVideos(): Promise<number> {
  if (!isTranscodeConfigured()) {
    console.log('[Transcode] Not configured, skipping batch transcode');
    return 0;
  }

  try {
    const { and, eq, isNotNull } = await import('drizzle-orm');
    const pendingVideos = await db
      .select()
      .from(shortVideos)
      .where(and(
        eq(shortVideos.transcodeStatus, 'PENDING'),
        isNotNull(shortVideos.videoObjectKey)
      ));

    console.log(`[Transcode] Found ${pendingVideos.length} pending videos to transcode`);

    let triggered = 0;
    for (const video of pendingVideos) {
      if (video.videoObjectKey) {
        await submitTranscodeJob(video.videoObjectKey, video.id);
        triggered++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[Transcode] Triggered ${triggered} media additions`);
    return triggered;
  } catch (error) {
    console.error('[Transcode] Batch transcode error:', error);
    return 0;
  }
}

export async function checkTranscodeStatus(mediaId: string): Promise<string> {
  const config = getConfig();
  
  if (!config.accessKeyId || !config.accessKeySecret) {
    return 'UNKNOWN';
  }

  try {
    await loadMtsModule();
    const client = await createClient(config);
    
    const request = new Mts20140618.QueryMediaListRequest({
      mediaIds: mediaId,
    });
    
    const response = await client.queryMediaList(request);
    
    const mediaList = response.body?.mediaList?.media;
    if (mediaList && mediaList.length > 0) {
      const media = mediaList[0];
      console.log(`[Transcode] Media ${mediaId} status: ${media.publishState}`);
      return media.publishState || 'UNKNOWN';
    }
    
    return 'UNKNOWN';
  } catch (error: any) {
    console.error('[Transcode] Check status error:', error.message);
    return 'ERROR';
  }
}

setTimeout(() => {
  batchTranscodePendingVideos().catch(console.error);
}, 5000);
