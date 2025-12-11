import { useState, useEffect, useCallback } from 'react';
import { Mic, Send, X, Loader2 } from 'lucide-react';
import { Button } from './button';
import { useRealtimeSTT } from '@/hooks/use-realtime-stt';

interface RealtimeVoiceInputProps {
  onSend: (text: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export function RealtimeVoiceInput({ onSend, onCancel, disabled }: RealtimeVoiceInputProps) {
  const [showPanel, setShowPanel] = useState(false);
  
  const {
    isRecording,
    isReady,
    transcript,
    finalTranscript,
    startRecording,
    stopRecording,
    getFullTranscript,
    clearTranscript,
    isConnected
  } = useRealtimeSTT({
    onError: (error) => {
      console.error('STT Error:', error);
    }
  });

  const fullText = getFullTranscript();

  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setShowPanel(true);
      clearTranscript();
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording, clearTranscript]);

  const handleSend = useCallback(() => {
    const text = getFullTranscript();
    if (text.trim()) {
      onSend(text.trim());
    }
    stopRecording();
    setShowPanel(false);
    clearTranscript();
  }, [getFullTranscript, onSend, stopRecording, clearTranscript]);

  const handleCancel = useCallback(() => {
    stopRecording();
    setShowPanel(false);
    clearTranscript();
    onCancel?.();
  }, [stopRecording, clearTranscript, onCancel]);

  if (!showPanel) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleMicPress}
        disabled={disabled || !isConnected}
        className="h-10 w-10"
        data-testid="button-realtime-voice"
      >
        <Mic className="h-5 w-5 text-slate-400" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" data-testid="realtime-voice-panel">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all ${
          isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-600'
        }`}>
          {isRecording ? (
            <Mic className="h-12 w-12 text-white" />
          ) : (
            <Loader2 className="h-12 w-12 text-white animate-spin" />
          )}
        </div>

        <div className="text-white text-lg mb-2">
          {isRecording ? '正在识别...' : '准备中...'}
        </div>

        <div className="w-full max-w-md bg-slate-800 rounded-lg p-4 min-h-[120px] max-h-[200px] overflow-y-auto">
          <p className="text-white text-lg">
            {finalTranscript}
            <span className="text-slate-400">{transcript}</span>
            {!fullText && <span className="text-slate-500">说点什么...</span>}
          </p>
        </div>
      </div>

      <div className="p-6 flex justify-center gap-6">
        <Button
          variant="outline"
          size="lg"
          onClick={handleCancel}
          className="w-16 h-16 rounded-full bg-slate-700 border-slate-600"
          data-testid="button-cancel-voice"
        >
          <X className="h-8 w-8 text-white" />
        </Button>

        <Button
          size="lg"
          onClick={handleSend}
          disabled={!fullText.trim()}
          className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600"
          data-testid="button-send-voice"
        >
          <Send className="h-8 w-8 text-white" />
        </Button>
      </div>
    </div>
  );
}
