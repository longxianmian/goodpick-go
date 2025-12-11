import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

interface ChatComposerProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (content: string) => void;
  onShowActionPanel: () => void;
  onShowStickerPanel: () => void;
  onVoiceMessageSend: (audioBlob: Blob, duration: number) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  quotedMessage?: { 
    fromUser?: { firstName?: string; username?: string }; 
    messageType?: string; 
    content: string;
    mediaUrl?: string;
    mediaMetadata?: { thumbnailUrl?: string; duration?: number };
  } | null;
  onClearQuote?: () => void;
  hasVoiceCapability?: boolean;
  isRealtimeRecording?: boolean;
  sttConnected?: boolean;
  isProcessingVoice?: boolean;
  onVoiceInputToggle?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

type ComposerMode = 'text' | 'voice-record';

export function ChatComposer({
  inputValue,
  onInputChange,
  onSend,
  onShowActionPanel,
  onShowStickerPanel,
  onVoiceMessageSend,
  disabled = false,
  placeholder,
  quotedMessage,
  onClearQuote,
  hasVoiceCapability = false,
  isRealtimeRecording = false,
  sttConnected = false,
  isProcessingVoice = false,
  onVoiceInputToggle,
  onSubmit,
  textareaRef
}: ChatComposerProps) {
  const { toast } = useToast();
  const localInputRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = textareaRef || localInputRef;
  
  const [mode, setMode] = useState<ComposerMode>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isVoiceInputting, setIsVoiceInputting] = useState(false);
  const [voiceInputText, setVoiceInputText] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const isCancellingRef = useRef(false);
  const voiceButtonRef = useRef<HTMLDivElement>(null);

  const cleanupRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordDuration(0);
    setAudioLevel(0);
    setIsCancelling(false);
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    const normalizedLevel = Math.min(avg / 100, 1);
    setAudioLevel(normalizedLevel);
    
    if (isRecordingRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, []);

  const startVoiceRecord = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({ title: '您的浏览器不支持录音功能', variant: 'destructive' });
        return;
      }

      setIsRecording(true);
      startTimeRef.current = Date.now();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!isRecordingRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordDuration(elapsed);
        if (elapsed >= 60) {
          stopVoiceRecord(false);
        }
      }, 1000);

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    } catch (error: any) {
      console.error('录音启动失败:', error);
      setIsRecording(false);
      let msg = '无法访问麦克风';
      if (error.name === 'NotAllowedError') msg = '请允许使用麦克风权限';
      else if (error.name === 'NotFoundError') msg = '未检测到麦克风设备';
      toast({ title: msg, variant: 'destructive' });
    }
  }, [toast, updateAudioLevel]);

  const stopVoiceRecord = useCallback(async (cancel: boolean) => {
    setIsRecording(false);
    setIsCancelling(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      return;
    }

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        if (!cancel && audioChunksRef.current.length > 0 && duration >= 1) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          try {
            await onVoiceMessageSend(audioBlob, duration);
          } catch (error) {
            console.error('语音发送失败:', error);
            toast({ title: '语音发送失败，请重试', variant: 'destructive' });
          }
        } else if (!cancel && duration < 1) {
          toast({ title: '录音时间太短', description: '请按住说话至少1秒' });
        }

        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setRecordDuration(0);
        setAudioLevel(0);
        resolve();
      };

      mediaRecorderRef.current!.stop();
    });
  }, [onVoiceMessageSend, toast]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isCancellingRef.current = isCancelling;
  }, [isCancelling]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    touchStartYRef.current = e.touches[0].clientY;
    startVoiceRecord();
  }, [startVoiceRecord]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isRecordingRef.current) return;
    const deltaY = touchStartYRef.current - e.touches[0].clientY;
    setIsCancelling(deltaY > 50);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (isRecordingRef.current) {
      stopVoiceRecord(isCancellingRef.current);
    }
  }, [stopVoiceRecord]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startVoiceRecord();
  }, [startVoiceRecord]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecordingRef.current) {
      stopVoiceRecord(isCancellingRef.current);
    }
  }, [stopVoiceRecord]);

  const handleMouseLeave = useCallback(() => {
    if (isRecordingRef.current) {
      setIsCancelling(true);
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (isRecordingRef.current) {
      setIsCancelling(false);
    }
  }, []);

  const handleVoiceInput = useCallback(async () => {
    if (isVoiceInputting) {
      setIsVoiceInputting(false);
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({ title: '您的浏览器不支持录音功能', variant: 'destructive' });
        return;
      }

      setIsVoiceInputting(true);
      setVoiceInputText('正在听你说话...');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunks.length > 0) {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          setVoiceInputText('正在转文字...');
          
          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice.webm');
            
            const response = await fetch('/api/voice/asr', {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success && result.text) {
              onInputChange(inputValue + result.text);
              inputRef.current?.focus();
            } else {
              toast({ title: '语音转文字失败', description: result.message || '请重试', variant: 'destructive' });
            }
          } catch (error) {
            console.error('ASR请求失败:', error);
            toast({ title: '语音识别失败', variant: 'destructive' });
          }
        }
        
        setIsVoiceInputting(false);
        setVoiceInputText('');
      };

      mediaRecorder.start();

      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 10000);

    } catch (error: any) {
      console.error('语音输入失败:', error);
      setIsVoiceInputting(false);
      setVoiceInputText('');
      let msg = '无法访问麦克风';
      if (error.name === 'NotAllowedError') msg = '请允许使用麦克风权限';
      toast({ title: msg, variant: 'destructive' });
    }
  }, [isVoiceInputting, inputValue, onInputChange, toast]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (onSubmit) {
      onSubmit(e as React.FormEvent);
    } else if (inputValue.trim() && !disabled) {
      onSend(inputValue.trim());
      onInputChange('');
      if (inputRef.current) {
        inputRef.current.style.height = '44px';
      }
    }
  }, [inputValue, disabled, onSend, onInputChange, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMode = useCallback(() => {
    if (mode === 'text') {
      setMode('voice-record');
    } else {
      setMode('text');
      cleanupRecording();
    }
  }, [mode, cleanupRecording]);

  useEffect(() => {
    return () => {
      cleanupRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [cleanupRecording]);

  // 原生事件监听器 - 确保在 Android Chrome 上阻止长按上下文菜单
  useEffect(() => {
    const button = voiceButtonRef.current;
    if (!button) return;

    const preventContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // 使用 passive: false 确保 preventDefault 生效
    button.addEventListener('contextmenu', preventContextMenu, { passive: false });
    button.addEventListener('selectstart', preventSelection, { passive: false });
    button.addEventListener('touchstart', preventSelection, { passive: false });

    return () => {
      button.removeEventListener('contextmenu', preventContextMenu);
      button.removeEventListener('selectstart', preventSelection);
      button.removeEventListener('touchstart', preventSelection);
    };
  }, [mode]);

  // 当 inputValue 变化时（包括 STT 更新），自动调整 textarea 高度并滚动到底部
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    
    // 重置高度后计算新高度，确保有最小高度
    textarea.style.height = 'auto';
    const newHeight = Math.max(44, Math.min(textarea.scrollHeight, 120));
    textarea.style.height = newHeight + 'px';
    
    // 确保滚动到底部显示最新输入
    requestAnimationFrame(() => {
      textarea.scrollTop = textarea.scrollHeight;
    });
  }, [inputValue]);

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800">
      {quotedMessage && (
        <div className="mb-2 px-3 py-2 bg-slate-800/50 rounded-lg flex items-start gap-2 border-l-2 border-primary">
          {/* 图片/视频缩略图 */}
          {(quotedMessage.messageType === 'image' || quotedMessage.messageType === 'video') && 
           (quotedMessage.mediaMetadata?.thumbnailUrl || quotedMessage.mediaUrl) && (
            <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-slate-700">
              <img 
                src={quotedMessage.mediaMetadata?.thumbnailUrl || quotedMessage.mediaUrl} 
                alt="" 
                className="w-full h-full object-cover"
              />
              {quotedMessage.messageType === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-4 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[5px] border-l-white border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">
              {quotedMessage.fromUser?.firstName || quotedMessage.fromUser?.username || ''}
            </p>
            <p className="text-xs text-muted-foreground/70 truncate">
              {quotedMessage.messageType === 'image' ? '[图片]' :
               quotedMessage.messageType === 'video' ? '[视频]' :
               quotedMessage.messageType === 'audio' ? `[语音] ${quotedMessage.mediaMetadata?.duration ? Math.ceil(quotedMessage.mediaMetadata.duration) + '"' : ''}` :
               quotedMessage.messageType === 'file' ? '[文件]' :
               quotedMessage.messageType === 'sticker' ? '[表情]' :
               quotedMessage.messageType === 'location' ? '[位置]' :
               quotedMessage.messageType === 'card' ? '[名片]' :
               (quotedMessage.content || '').slice(0, 50)}
              {quotedMessage.messageType === 'text' && (quotedMessage.content || '').length > 50 && '...'}
            </p>
          </div>
          <button
            onClick={onClearQuote}
            className="flex-shrink-0 p-1 text-slate-500 hover:text-slate-300"
            data-testid="button-clear-quote"
          >
            ×
          </button>
        </div>
      )}

      {/* 实时语音识别状态 */}
      {isRealtimeRecording && (
        <div className="mb-2 px-3 py-2 bg-red-500/20 rounded-lg text-center border border-red-500/30">
          <p className="text-sm text-red-400 font-medium flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            正在听你说话...
          </p>
        </div>
      )}

      {isVoiceInputting && !isRealtimeRecording && (
        <div className="mb-2 px-3 py-2 bg-primary/10 rounded-lg text-center">
          <p className="text-sm text-primary font-medium animate-pulse">
            🎤 {voiceInputText}
          </p>
        </div>
      )}

      {/* 录音时的覆盖层 - pointer-events-none 让触摸事件穿透到按钮 */}
      {isRecording && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 flex flex-col items-center justify-center pointer-events-none"
        >
          {/* 半透明灰色背景卡片 */}
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-3xl px-12 py-8 flex flex-col items-center shadow-2xl border border-slate-700/50">
            {/* 麦克风图标 */}
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mb-5",
              isCancelling 
                ? "bg-red-500/20 border-2 border-red-500/60" 
                : "bg-primary/20 border-2 border-primary/60"
            )}>
              <svg 
                className={cn("w-10 h-10", isCancelling ? "text-red-500" : "text-primary")} 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
            
            {/* 录制时间 */}
            <p className={cn(
              "text-4xl font-bold mb-3 tabular-nums",
              isCancelling ? "text-red-500" : "text-white"
            )}>
              {formatDuration(recordDuration)}
            </p>
            
            {/* 操作提示 */}
            <p className={cn(
              "text-base font-medium",
              isCancelling ? "text-red-400" : "text-slate-200"
            )}>
              {isCancelling ? '↑ 松开取消' : '松开发送'}
            </p>
          </div>
        </div>
      )}

      {mode === 'voice-record' ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 bg-slate-800 hover:bg-slate-700 rounded-full flex-shrink-0"
            onClick={toggleMode}
            data-testid="button-keyboard-mode"
          >
            <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
            </svg>
          </Button>

          <div
            ref={voiceButtonRef}
            className={cn(
              "voice-record-button flex-1 h-12 rounded-full flex items-center justify-center cursor-pointer select-none transition-all touch-none",
              "bg-slate-800 hover:bg-slate-700",
              isRecording && "bg-primary/20"
            )}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
            data-testid="button-hold-to-talk"
          >
            <span className="text-slate-400 text-sm">🎤 按住说话</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 hover:bg-slate-700 rounded-full flex-shrink-0"
            onClick={onShowActionPanel}
            data-testid="button-attachment"
          >
            <svg className="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-9 h-9 p-0 hover:bg-slate-700 rounded-full flex-shrink-0"
            onClick={toggleMode}
            data-testid="button-voice-record-mode"
          >
            <svg className="w-7 h-7 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.5 12l1.2-1.2v2.4l-1.2-1.2z" fill="currentColor" stroke="none" />
              <path d="M11.5 10.2c0.7 0.35 1.1 1.05 1.1 1.8s-0.4 1.45-1.1 1.8" />
              <path d="M13.2 8.5c1.3 0.7 2 2 2 3.5s-0.7 2.8-2 3.5" />
            </svg>
          </Button>

          <div className="flex-1 relative min-w-0">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || t('typeMessage')}
              className={cn(
                "w-full bg-slate-800 text-white placeholder:text-slate-500 rounded-2xl pl-3 py-2.5 pb-3 text-sm border border-slate-700 focus:ring-1 focus:ring-primary focus:outline-none resize-none min-h-[44px] max-h-[120px] overflow-y-auto leading-5 break-all",
                isRealtimeRecording ? "pr-3" : "pr-12"
              )}
              style={{ height: 'auto', wordBreak: 'break-all' }}
              rows={1}
              disabled={disabled}
              data-testid="input-message"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                const newHeight = Math.max(44, Math.min(target.scrollHeight, 120));
                target.style.height = newHeight + 'px';
                // 始终滚动到底部，确保最新输入可见
                requestAnimationFrame(() => {
                  target.scrollTop = target.scrollHeight;
                });
              }}
            />
            
            {/* 录音时隐藏麦克风按钮，让文字可以填满输入框 */}
            {!isRealtimeRecording && (
              <div className="absolute right-1 bottom-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 p-0 rounded-full transition-all bg-primary/80 hover:bg-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    // 优先使用实时流式语音识别
                    if (onVoiceInputToggle) {
                      onVoiceInputToggle();
                    } else {
                      handleVoiceInput();
                    }
                  }}
                  disabled={disabled || isProcessingVoice}
                  data-testid="button-voice-input"
                >
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </Button>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-9 h-9 p-0 rounded-full hover:bg-slate-700 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onShowStickerPanel();
            }}
            data-testid="button-emoji"
          >
            <svg className="w-7 h-7 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="8.5" cy="9.5" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="9.5" r="1.3" fill="currentColor" stroke="none" />
              <path d="M7 13.5c0 0 2 3.5 5 3.5s5-3.5 5-3.5" />
            </svg>
          </Button>

          {inputValue.trim() ? (
            <Button
              type="submit"
              size="sm"
              className="w-9 h-9 p-0 bg-primary hover:bg-primary/90 text-white rounded-full flex-shrink-0"
              disabled={disabled}
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-9 h-9 p-0 hover:bg-slate-700 rounded-full flex-shrink-0"
              onClick={onShowActionPanel}
              data-testid="button-attachment"
            >
              <svg className="w-7 h-7 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
