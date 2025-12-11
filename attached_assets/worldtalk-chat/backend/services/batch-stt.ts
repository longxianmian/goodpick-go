/**
 * ========================================================================
 * 非流式语音识别服务 (Batch STT)
 * ========================================================================
 * 
 * 用途：短语音一次性识别（录完 → 上传 → 返回结果）
 * 
 * 技术架构：
 *   前端录音完成 → 整段音频上传 → ffmpeg 转码为 16kHz mono WAV → DashScope HTTP API
 * 
 * DashScope 参数：
 *   - model: paraformer-v2（非实时版本）
 *   - format: "wav"
 *   - sample_rate: 16000
 * 
 * API 端点：POST /api/stt/recognize
 * 
 * ========================================================================
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

import { getDashScopeApiKey } from '../config/dashscope';

export async function recognizeAudioNonStreaming(audioBuffer: Buffer, audioFormat?: string): Promise<string> {
  const apiKey = getDashScopeApiKey();
  console.log('[dashscope] batch-stt DASHSCOPE_API_KEY prefix:', apiKey.slice(0, 8));

  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const inputFile = path.join(tempDir, `input_${timestamp}.${audioFormat || 'webm'}`);
  const outputFile = path.join(tempDir, `output_${timestamp}.wav`);

  try {
    fs.writeFileSync(inputFile, audioBuffer);
    console.log(`🎵 [Batch STT] 保存输入文件: ${inputFile} (${audioBuffer.length} bytes)`);

    const ffmpegCmd = `ffmpeg -y -i "${inputFile}" -ac 1 -ar 16000 -acodec pcm_s16le "${outputFile}" 2>&1`;
    console.log(`🔄 [Batch STT] 执行转码...`);
    
    try {
      await execAsync(ffmpegCmd, { timeout: 30000 });
    } catch (ffmpegError: any) {
      console.error(`❌ [Batch STT] ffmpeg转码失败:`, ffmpegError.stderr || ffmpegError.message);
      throw new Error(`音频转码失败: ${ffmpegError.message}`);
    }

    if (!fs.existsSync(outputFile)) {
      throw new Error('ffmpeg转码输出文件不存在');
    }

    const wavBuffer = fs.readFileSync(outputFile);
    console.log(`✅ [Batch STT] 转码完成: ${wavBuffer.length} bytes`);

    const recognitionResult = await callDashScopeParaformerHTTP(wavBuffer);
    console.log(`🎯 [Batch STT] 识别结果: "${recognitionResult.substring(0, 50)}..."`);

    return recognitionResult;
  } finally {
    try {
      if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
      if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    } catch (e) {
      console.warn('[Batch STT] Cleanup warning:', e);
    }
  }
}

/**
 * 调用DashScope Paraformer非实时API（使用file-urls方式）
 * 由于multipart复杂，改用base64 + JSON方式
 */
async function callDashScopeParaformerHTTP(wavBuffer: Buffer): Promise<string> {
  const apiKey = getDashScopeApiKey();
  const apiUrl = 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription';

  const audioBase64 = wavBuffer.toString('base64');
  
  const requestBody = {
    model: 'paraformer-v2',
    input: {
      audio: `data:audio/wav;base64,${audioBase64}`
    },
    parameters: {
      sample_rate: 16000,
      format: 'wav',
      language_hints: ['zh', 'en']
    }
  };

  console.log(`📡 [DashScope] 发送识别请求...`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [DashScope] API错误: ${response.status}`, errorText);
    throw new Error(`DashScope API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json() as any;
  console.log(`📝 [DashScope] 响应:`, JSON.stringify(result, null, 2));

  if (result.output?.task_status === 'PENDING') {
    return await pollTranscriptionTask(result.output.task_id);
  }

  return extractTranscription(result);
}

async function pollTranscriptionTask(taskId: string, maxAttempts = 30): Promise<string> {
  const apiKey = getDashScopeApiKey();
  const statusUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(statusUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Task status check failed: ${response.status}`);
    }

    const result = await response.json() as any;
    const status = result.output?.task_status;

    if (status === 'SUCCEEDED') {
      return extractTranscription(result);
    } else if (status === 'FAILED') {
      throw new Error(`Transcription failed: ${result.output?.message || 'Unknown error'}`);
    }

    console.log(`⏳ [DashScope] 任务状态: ${status} (${attempt + 1}/${maxAttempts})`);
  }

  throw new Error('Transcription timeout');
}

function extractTranscription(result: any): string {
  if (result.output?.results?.[0]?.transcription_url) {
    return result.output.results[0].transcription_url;
  }
  
  if (result.output?.sentence?.text) {
    return result.output.sentence.text;
  }
  
  if (result.output?.text) {
    return result.output.text;
  }

  const sentences = result.output?.results?.[0]?.sentences || [];
  if (sentences.length > 0) {
    return sentences.map((s: any) => s.text).join('');
  }

  return '';
}
