import Mts20140618, { SubmitJobsRequest } from '@alicloud/mts20140618';
import * as OpenApi from '@alicloud/openapi-client';
import { db } from '../db';
import { shortVideos } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface TranscodeJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

interface TranscodeConfig {
  accessKeyId: string;
  accessKeySecret: string;
  regionId: string;
  pipelineId: string;
  templateId: string;
  inputBucket: string;
  outputBucket: string;
  callbackUrl: string;
}

function getConfig(): TranscodeConfig {
  const accessKeyId = process.env.MPS_ACCESS_KEY_ID || process.env.ALI_OSS_ACCESS_KEY_ID || '';
  const accessKeySecret = process.env.MPS_ACCESS_KEY_SECRET || process.env.ALI_OSS_ACCESS_KEY_SECRET || '';
  const regionId = process.env.MPS_REGION_ID || 'ap-southeast-1';
  const pipelineId = process.env.MPS_PIPELINE_ID || '';
  const templateId = process.env.MPS_TEMPLATE_ID || '';
  const inputBucket = process.env.OSS_BUCKET || process.env.ALI_OSS_BUCKET || '';
  const outputBucket = process.env.OSS_BUCKET || process.env.ALI_OSS_BUCKET || '';
  const callbackUrl = process.env.MPS_CALLBACK_URL || 'https://www.goodpickgo.com/api/transcode/callback';

  return {
    accessKeyId,
    accessKeySecret,
    regionId,
    pipelineId,
    templateId,
    inputBucket,
    outputBucket,
    callbackUrl,
  };
}

function createClient(config: TranscodeConfig): Mts20140618 {
  const clientConfig = new OpenApi.Config({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
  });
  
  clientConfig.endpoint = `mts.${config.regionId}.aliyuncs.com`;
  
  return new Mts20140618(clientConfig);
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

  if (!config.pipelineId || !config.templateId) {
    console.warn('[Transcode] Missing MPS pipeline or template ID, skipping transcode job');
    return { success: false, error: 'Missing MPS pipeline or template ID' };
  }

  try {
    const client = createClient(config);

    const inputData = {
      Bucket: config.inputBucket,
      Location: `oss-${config.regionId}`,
      Object: inputObjectKey,
    };

    const outputObjectKey = inputObjectKey.replace(/\.[^/.]+$/, '');
    
    const outputs = [{
      OutputObject: `${outputObjectKey}/{Count}.ts`,
      TemplateId: config.templateId,
      Container: {
        Format: 'm3u8',
      },
      MuxConfig: {
        Segment: {
          Duration: '10',
        },
      },
    }];

    const submitJobsRequest = new SubmitJobsRequest({
      input: JSON.stringify(inputData),
      outputs: JSON.stringify(outputs),
      outputBucket: config.outputBucket,
      outputLocation: `oss-${config.regionId}`,
      pipelineId: config.pipelineId,
    });

    console.log(`[Transcode] Submitting job for video ${videoId}, input: ${inputObjectKey}`);
    console.log(`[Transcode] Input: ${JSON.stringify(inputData)}`);
    console.log(`[Transcode] Outputs: ${JSON.stringify(outputs)}`);

    const response = await client.submitJobs(submitJobsRequest);
    
    console.log('[Transcode] API Response:', JSON.stringify(response.body, null, 2));

    const jobResult = response.body?.jobResultList?.jobResult?.[0];
    
    if (jobResult?.success && jobResult?.job?.jobId) {
      const jobId = jobResult.job.jobId;
      console.log(`[Transcode] Job submitted successfully, JobId: ${jobId}`);
      
      await db.update(shortVideos)
        .set({ 
          transcodeJobId: jobId,
          transcodeStatus: 'SUBMITTED',
        })
        .where(eq(shortVideos.id, videoId));
      
      return { success: true, jobId };
    }

    const errorCode = jobResult?.code || 'Unknown';
    const errorMessage = jobResult?.message || 'Unknown error';
    console.error(`[Transcode] API Error: ${errorCode} - ${errorMessage}`);
    
    await db.update(shortVideos)
      .set({ 
        transcodeStatus: 'FAILED',
        transcodeError: `${errorCode}: ${errorMessage}`,
      })
      .where(eq(shortVideos.id, videoId));
    
    return { success: false, error: `${errorCode}: ${errorMessage}` };
  } catch (error: any) {
    const errMsg = error.message || 'Unknown error';
    console.error('[Transcode] Submit job error:', errMsg);
    
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
    config.pipelineId &&
    config.templateId &&
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
      console.warn(`[Transcode] Failed to submit job for video ${videoId}: ${result.error}`);
    }
  } catch (error) {
    console.error(`[Transcode] Error triggering transcode for video ${videoId}:`, error);
  }
}
