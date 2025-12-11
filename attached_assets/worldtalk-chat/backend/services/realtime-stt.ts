/**
 * ========================================================================
 * 流式语音识别服务 (Realtime STT)
 * ========================================================================
 * 
 * 用途：实时字幕 / 实时翻译场景（边说边识别）
 * 
 * 技术架构：
 *   前端 AudioContext(16kHz) → PCM Int16 → base64 → WebSocket → 后端解码 → DashScope
 *   
 *   注意：前端已经发送 16kHz 单声道 PCM 数据（base64编码），
 *         后端只需解码后直接发给 DashScope，无需 ffmpeg 转码！
 * 
 * DashScope 参数：
 *   - model: paraformer-realtime-v2
 *   - format: "pcm"
 *   - sample_rate: 16000
 * 
 * ========================================================================
 */

import WebSocket from 'ws';
import { getDashScopeApiKey, isDashScopeConfigured } from '../config/dashscope';

const WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';

function generateTaskId(): string {
  const chars = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface STTSession {
  ws: WebSocket;
  taskId: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
  onClose: () => void;
  isReady: boolean;
  pendingAudio: Buffer[];
  startTime: number;
  closed: boolean;
  sentences: Map<number, { text: string; isComplete: boolean }>;
}

export class RealtimeSTTService {
  private sessions: Map<string, STTSession> = new Map();

  async createSession(
    sessionId: string,
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: Error) => void,
    onClose: () => void
  ): Promise<string> {
    const apiKey = getDashScopeApiKey();
    console.log('[dashscope] runtime DASHSCOPE_API_KEY prefix:', apiKey.slice(0, 8));

    const taskId = generateTaskId();

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL, {
        headers: {
          'Authorization': `bearer ${apiKey}`,
          'X-DashScope-DataInspection': 'enable'
        }
      });

      const session: STTSession = {
        ws,
        taskId,
        onTranscript,
        onError,
        onClose,
        isReady: false,
        pendingAudio: [],
        startTime: Date.now(),
        closed: false,
        sentences: new Map()
      };

      ws.on('open', () => {
        console.log(`🎤 [STT] WebSocket连接已建立 sessionId=${sessionId}`);
        
        /**
         * ====================================================
         * DashScope paraformer-realtime-v2 参数配置
         * ====================================================
         * format: "pcm"       - 音频格式为 PCM（前端已转换好）
         * sample_rate: 16000  - 采样率 16kHz（前端 AudioContext 设置）
         * ====================================================
         */
        const runTask = {
          header: {
            action: 'run-task',
            task_id: taskId,
            streaming: 'duplex'
          },
          payload: {
            task_group: 'audio',
            task: 'asr',
            function: 'recognition',
            model: 'paraformer-realtime-v2',
            parameters: {
              format: 'pcm',           // ← PCM 格式（前端已转换）
              sample_rate: 16000,      // ← 16kHz 采样率（前端 AudioContext 设置）
              language_hints: ['zh', 'en'],
              disfluency_removal_enabled: true
            },
            input: {}
          }
        };
        ws.send(JSON.stringify(runTask));
        console.log(`📤 [STT] run-task 已发送 format=pcm, sample_rate=16000`);
      });

      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          const event = msg.header?.event;

          if (event === 'task-started') {
            console.log(`✅ [STT] 任务已启动 taskId=${taskId}`);
            session.isReady = true;
            this.sessions.set(sessionId, session);
            
            // 发送缓存的音频数据
            for (const audio of session.pendingAudio) {
              try {
                ws.send(audio);
              } catch (e) {
                console.error('[STT] 发送缓存音频失败:', e);
              }
            }
            if (session.pendingAudio.length > 0) {
              console.log(`📤 [STT] 已发送 ${session.pendingAudio.length} 个缓存音频块`);
            }
            session.pendingAudio = [];
            
            resolve(sessionId);
          } else if (event === 'result-generated') {
            const sentence = msg.payload?.output?.sentence;
            if (sentence && sentence.text) {
              const beginTime = sentence.begin_time ?? 0;
              const hasEndTime = sentence.end_time !== undefined && sentence.end_time !== null;
              
              session.sentences.set(beginTime, {
                text: sentence.text,
                isComplete: hasEndTime
              });
              
              const allText = Array.from(session.sentences.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([_, s]) => s.text)
                .join('');
              
              onTranscript(allText, false);
            }
          } else if (event === 'task-finished') {
            const elapsed = Date.now() - session.startTime;
            
            const finalText = Array.from(session.sentences.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([_, s]) => s.text)
              .join('');
            
            console.log(`🏁 [STT] 任务完成 taskId=${taskId} 耗时=${elapsed}ms`);
            console.log(`🏁 [STT] 最终文本: "${finalText.substring(0, 50)}..."`);
            if (finalText) {
              onTranscript(finalText, true);
            }
            if (!session.closed) {
              session.closed = true;
              onClose();
            }
            this.closeSession(sessionId);
          } else if (event === 'task-failed') {
            const errorMsg = msg.payload?.message || msg.header?.error_message || 'STT task failed';
            const errorCode = msg.header?.error_code || msg.payload?.code || 'unknown';
            console.error(`❌ [STT] 任务失败: code=${errorCode} msg=${errorMsg}`);
            console.error(`❌ [STT] 完整响应:`, JSON.stringify(msg, null, 2));
            onError(new Error(errorMsg));
            this.closeSession(sessionId);
          }
        } catch (e) {
          console.error('STT message parse error:', e);
        }
      });

      ws.on('error', (error) => {
        console.error(`❌ [STT] WebSocket错误:`, error);
        onError(error);
        reject(error);
      });

      ws.on('close', () => {
        const elapsed = Date.now() - session.startTime;
        console.log(`🔌 [STT] WebSocket已关闭 sessionId=${sessionId} 耗时=${elapsed}ms`);
        this.sessions.delete(sessionId);
        if (!session.closed) {
          session.closed = true;
          onClose();
        }
      });

      setTimeout(() => {
        if (!session.isReady) {
          reject(new Error('STT session startup timeout'));
          ws.close();
        }
      }, 10000);
    });
  }

  /**
   * 发送音频数据
   * 
   * 注意：前端已经发送 16kHz 单声道 PCM 数据，无需转码！
   * 直接发给 DashScope 即可。
   * 
   * @param sessionId 会话 ID
   * @param audioData PCM 音频数据（已经是 16kHz mono）
   */
  sendAudio(sessionId: string, audioData: Buffer): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.closed) {
      return false;
    }

    if (!session.isReady) {
      // 任务还没启动，先缓存
      session.pendingAudio.push(audioData);
      return true;
    }

    try {
      // 直接发送 PCM 数据给 DashScope（无需转码！）
      session.ws.send(audioData);
      return true;
    } catch (e) {
      console.error('[STT] 发送音频失败:', e);
      return false;
    }
  }

  /**
   * 结束会话
   */
  finishSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.closed) return;

    const elapsed = Date.now() - session.startTime;
    console.log(`🛑 [STT] 结束会话 sessionId=${sessionId} 耗时=${elapsed}ms`);

    session.closed = true;

    try {
      // 发送 finish-task（官方文档要求 payload.input: {}）
      const finishTask = {
        header: {
          action: 'finish-task',
          task_id: session.taskId,
          streaming: 'duplex'
        },
        payload: {
          input: {}
        }
      };
      session.ws.send(JSON.stringify(finishTask));
      console.log(`✅ [STT] finish-task 已发送`);
    } catch (e) {
      console.error('[STT] Finish session error:', e);
      session.onClose();
      this.closeSession(sessionId);
    }
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      session.ws.close();
    } catch (e) {
      console.error('[STT] Close session error:', e);
    }
    this.sessions.delete(sessionId);
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

export const realtimeSTT = new RealtimeSTTService();
