import { useState, useRef, useCallback, useEffect } from 'react';
import { useSimpleRealtimeContext } from '@/contexts/simple-realtime-context';

interface RealtimeSTTOptions {
  onInterimResult?: (text: string) => void;
  onFinalResult?: (text: string) => void;
  onError?: (error: string) => void;
  onReady?: () => void;
  onClosed?: () => void;
}

// 模块级单例 AudioContext，复用以减少初始化开销
let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext({ sampleRate: 16000 });
  }
  return sharedAudioContext;
}

// 确保 AudioContext 处于活跃状态（iOS Safari 需要用户交互后才能 resume）
async function ensureAudioContextResumed(): Promise<void> {
  const ctx = getSharedAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

const SILENCE_TIMEOUT_MS = 6000; // 6秒无语音自动关闭

export function useRealtimeSTT(options: RealtimeSTTOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopRecordingRef = useRef<(() => void) | null>(null);
  optionsRef.current = options;
  
  const { sendMessage, isConnected, addMessageHandler, removeMessageHandler } = useSimpleRealtimeContext();

  // 重置静音计时器
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      console.log('⏱️ 6秒无语音输入，自动关闭');
      if (stopRecordingRef.current) {
        stopRecordingRef.current();
      }
    }, SILENCE_TIMEOUT_MS);
  }, []);

  // 清除静音计时器
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleSTTMessage = (msg: any) => {
      switch (msg.type) {
        case 'stt-ready':
          console.log('🎤 STT就绪');
          sessionIdRef.current = msg.sessionId;
          setIsReady(true);
          optionsRef.current.onReady?.();
          break;
          
        case 'stt-transcript':
          if (msg.text) {
            // 收到语音结果，重置静音计时器
            resetSilenceTimer();
            
            if (msg.isFinal) {
              console.log(`📝 最终结果: "${msg.text.substring(0, 50)}..."`);
              optionsRef.current.onFinalResult?.(msg.text);
            } else {
              console.log(`📝 实时: "${msg.text.substring(0, 30)}..."`);
              optionsRef.current.onInterimResult?.(msg.text);
            }
          }
          break;
          
        case 'stt-error':
          console.error('❌ STT错误:', msg.error);
          optionsRef.current.onError?.(msg.error);
          break;
          
        case 'stt-closed':
          console.log('🔌 STT会话关闭');
          setIsReady(false);
          sessionIdRef.current = null;
          clearSilenceTimer();
          optionsRef.current.onClosed?.();
          break;
      }
    };

    addMessageHandler(handleSTTMessage);
    return () => removeMessageHandler(handleSTTMessage);
  }, [addMessageHandler, removeMessageHandler, resetSilenceTimer, clearSilenceTimer]);

  const startRecording = useCallback(async () => {
    if (!isConnected) {
      optionsRef.current.onError?.('WebSocket未连接');
      return;
    }

    try {
      // 确保 AudioContext 处于活跃状态
      await ensureAudioContextResumed();
      const audioContext = getSharedAudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      streamRef.current = stream;

      sendMessage({ type: 'stt-start' });
      
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      
      // 使用 ScriptProcessorNode，bufferSize=2048 (128ms @ 16kHz)
      // 更大的缓冲区减少 CPU 开销，同时保持合理的延迟
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      workletNodeRef.current = processor;
      
      let chunkCount = 0;
      processor.onaudioprocess = (e) => {
        if (!sessionIdRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        const base64 = btoa(
          new Uint8Array(pcm16.buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        
        sendMessage({ 
          type: 'stt-audio', 
          audio: base64,
          sessionId: sessionIdRef.current
        });
        
        chunkCount++;
        if (chunkCount % 8 === 0) {
          console.log(`🎤 已发送 ${chunkCount} 块 (${(chunkCount * 128).toFixed(0)}ms)`);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
      // 开始录音时启动静音计时器
      resetSilenceTimer();
      console.log('🎤 开始语音输入 (PCM 16kHz, 128ms/块, 6秒无语音自动关闭)');
    } catch (error: any) {
      console.error('启动录音失败:', error);
      optionsRef.current.onError?.(error.message || '无法访问麦克风');
    }
  }, [isConnected, sendMessage, resetSilenceTimer]);

  const stopRecording = useCallback(() => {
    // 清除静音计时器
    clearSilenceTimer();
    
    // 断开音频节点（但不关闭共享的 AudioContext）
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    // 停止麦克风流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (sessionIdRef.current) {
      sendMessage({ type: 'stt-stop', sessionId: sessionIdRef.current });
    }

    setIsRecording(false);
    setIsReady(false);
    console.log('🛑 停止语音输入');
  }, [sendMessage, clearSilenceTimer]);

  // 将 stopRecording 存储到 ref 中，以便静音计时器可以调用
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  // 组件卸载时清理计时器
  useEffect(() => {
    return () => {
      clearSilenceTimer();
    };
  }, [clearSilenceTimer]);

  return {
    isRecording,
    isReady,
    startRecording,
    stopRecording,
    isConnected
  };
}
