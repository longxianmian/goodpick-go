import { useState, useRef, useCallback } from 'react';

export interface VoiceRecorderState {
  isRecording: boolean;
  duration: number; // 秒
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  audioLevel: number; // 0-1 真实音量级别
  hasPermission: boolean; // 是否已获取麦克风权限
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
    audioLevel: 0,
    hasPermission: false
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // 缓存的MediaStream
  
  // Web Audio API - 用于真实波形
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 预先请求麦克风权限并缓存stream
  const ensurePermission = useCallback(async (): Promise<boolean> => {
    try {
      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持录音功能');
      }

      // 如果已经有缓存的stream，直接返回
      if (streamRef.current && streamRef.current.active) {
        setState(prev => ({ ...prev, hasPermission: true }));
        return true;
      }

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setState(prev => ({ ...prev, hasPermission: true }));
      return true;
    } catch (error: any) {
      console.error('[useVoiceRecorder] 麦克风权限请求失败:', error);
      let errorMessage = '无法访问麦克风';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = '请允许使用麦克风权限';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '未检测到麦克风设备';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '您的浏览器不支持录音';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setState(prev => ({
        ...prev,
        hasPermission: false,
        error: errorMessage
      }));
      
      alert(errorMessage);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    console.log('🎤 [useVoiceRecorder] startRecording 被调用');
    try {
      // 检查浏览器支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('🎤 [useVoiceRecorder] 浏览器不支持录音');
        throw new Error('您的浏览器不支持录音功能');
      }
      console.log('🎤 [useVoiceRecorder] 浏览器支持检查通过');

      // 使用缓存的stream，如果没有则请求新的
      let stream = streamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setState(prev => ({ ...prev, hasPermission: true }));
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Float32Array(analyser.frequencyBinCount);
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyser.getFloatTimeDomainData(dataArray);
        
        // 计算RMS音量（0-1）
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalizedLevel = Math.min(1, rms * 3); // 放大3倍提高灵敏度
        
        setState(prev => ({
          ...prev,
          audioLevel: normalizedLevel
        }));
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();
      
      // 尝试多种音频格式，找到第一个支持的
      let mimeType = 'audio/webm;codecs=opus';
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];

      const supportedType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type));
      if (supportedType) {
        mimeType = supportedType;
      }

      console.log('使用音频格式:', mimeType);

      // 创建MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // 使用实际录制的mimeType
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        console.log('录音完成:', {
          size: audioBlob.size,
          type: audioBlob.type,
          duration: Math.floor((Date.now() - startTimeRef.current) / 1000)
        });
        
        setState(prev => ({
          ...prev,
          isRecording: false,
          audioBlob,
          audioUrl
        }));
        
        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
        
        // 清除Web Audio API
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        
        // 清除计时器
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      startTimeRef.current = Date.now();
      
      // 开始计时（带自动停止限制）
      const MAX_DURATION = 15; // 最大录音时长15秒
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({
          ...prev,
          duration: elapsed
        }));
        
        // 超过15秒自动停止
        if (elapsed >= MAX_DURATION) {
          console.log(`⏱️ 录音已达${MAX_DURATION}秒上限，自动停止`);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      }, 100);
      
      setState({
        isRecording: true,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
        error: null,
        audioLevel: 0,
        hasPermission: true
      });
      
    } catch (error: any) {
      console.error('录音启动失败:', error);
      let errorMessage = '无法访问麦克风';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = '请允许使用麦克风权限';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '未检测到麦克风设备';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '您的浏览器不支持录音';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setState(prev => ({
        ...prev,
        isRecording: false,
        hasPermission: false,
        error: errorMessage
      }));
      
      // 显示错误提示
      alert(errorMessage);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !state.isRecording) {
        resolve(null);
        return;
      }

      const recorder = mediaRecorderRef.current;
      
      // 保存当前的onstop回调
      const originalOnStop = recorder.onstop;
      
      // 临时覆盖onstop回调
      recorder.onstop = (event) => {
        // 先调用原始回调
        if (originalOnStop && recorder) {
          originalOnStop.call(recorder, event);
        }
        
        // 等待一小段时间让state更新
        setTimeout(() => {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: recorder?.mimeType || 'audio/webm' 
          });
          resolve(audioBlob);
        }, 100);
      };

      recorder.stop();
    });
  }, [state.isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      // 清除录音数据
      audioChunksRef.current = [];
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setState({
        isRecording: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
        error: null,
        audioLevel: 0,
        hasPermission: streamRef.current?.active || false
      });
    }
  }, [state.isRecording]);

  const reset = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    
    setState({
      isRecording: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
      audioLevel: 0,
      hasPermission: streamRef.current?.active || false
    });
  }, [state.audioUrl]);

  // 清理函数 - 释放MediaStream
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState({
      isRecording: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
      audioLevel: 0,
      hasPermission: false
    });
  }, [state.audioUrl]);

  return {
    ...state,
    ensurePermission,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
    cleanup
  };
}
