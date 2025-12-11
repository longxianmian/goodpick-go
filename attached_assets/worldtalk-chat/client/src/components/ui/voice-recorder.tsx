import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  isRecording: boolean;
  duration: number;
  audioLevel: number; // 0-1 真实音量级别
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onSend: () => void;
  className?: string;
}

export function VoiceRecorder({
  isRecording,
  duration,
  audioLevel,
  onStart,
  onStop,
  onCancel,
  onSend,
  className
}: VoiceRecorderProps) {
  // 格式化时间显示
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 自动发送：录音超过60秒自动停止
  useEffect(() => {
    if (isRecording && duration >= 60) {
      onStop();
    }
  }, [isRecording, duration, onStop]);

  if (!isRecording) {
    // 未录音状态：不显示任何内容
    return null;
  }

  // 录音中状态：显示波形动画和控制按钮
  return (
    <div className={cn("fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50 animate-in slide-in-from-bottom", className)}>
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {/* 取消按钮 */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0 rounded-full hover:bg-destructive/10"
          onClick={onCancel}
          data-testid="button-cancel-recording"
        >
          <X className="w-5 h-5 text-destructive" />
        </Button>

        {/* 录音波形和时间 */}
        <div className="flex-1 mx-4 flex items-center justify-center space-x-3">
          {/* 真实波形 */}
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, i) => {
              const height = 10 + audioLevel * 20; // 10-30px基于真实音量
              return (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full transition-all duration-100"
                  style={{
                    height: `${height}px`
                  }}
                />
              );
            })}
          </div>
          
          {/* 时间显示 */}
          <span className="text-lg font-mono font-medium text-foreground" data-testid="recording-duration">
            {formatDuration(duration)}
          </span>
        </div>

        {/* 发送按钮 */}
        <Button
          type="button"
          size="sm"
          className="w-10 h-10 p-0 rounded-full bg-primary hover:bg-primary/90"
          onClick={onSend}
          data-testid="button-send-recording"
        >
          <Send className="w-5 h-5 text-white" />
        </Button>
      </div>
    </div>
  );
}
