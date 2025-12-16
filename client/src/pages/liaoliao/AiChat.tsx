import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Bot, Sparkles, MoreVertical, Mic, Smile, Plus, X, Image as ImageIcon, Camera, MapPin, Gift, FileText, Phone, Video, Star, UserCircle, Wallet, Music, Folder } from 'lucide-react';
import { VoiceInputIcon } from '@/components/icons/VoiceInputIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗',
  '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
  '🤔', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
  '😬', '😮', '😯', '😲', '😳', '🥺', '😢', '😭',
  '😤', '😡', '🤬', '😈', '👿', '💀', '💩', '🤡',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔',
];

export default function LiaoliaoAiChat() {
  const { t } = useLanguage();
  const { user, isUserAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: t('liaoliao.aiWelcome'),
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [isRecordingToText, setIsRecordingToText] = useState(false);
  const [voiceInputMode, setVoiceInputMode] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const baseInputValueRef = useRef<string>('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await apiRequest('POST', '/api/liaoliao/ai-chat', {
        messages: chatHistory,
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || t('liaoliao.aiError'),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('liaoliao.aiError'),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const toggleEmojiPanel = () => {
    setShowEmojiPanel(!showEmojiPanel);
    setShowActionPanel(false);
  };

  const toggleActionPanel = () => {
    setShowActionPanel(!showActionPanel);
    setShowEmojiPanel(false);
  };

  const toggleVoiceInputMode = () => {
    setVoiceInputMode(!voiceInputMode);
    setShowEmojiPanel(false);
    setShowActionPanel(false);
  };

  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, []);

  const stopVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (recordingDuration >= 1) {
        const voiceMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: `[${t('liaoliao.voiceMessage')} ${recordingDuration}${t('liaoliao.seconds')}]`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, voiceMessage]);
      }
      setRecordingDuration(0);
    }
  }, [isRecordingVoice, recordingDuration, t]);

  const cancelVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
    setRecordingDuration(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const startSpeechToText = useCallback(async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(t('liaoliao.speechNotSupported'));
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onstart = () => {
      baseInputValueRef.current = inputValue;
      setIsRecordingToText(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      const newValue = baseInputValueRef.current + finalTranscript + interimTranscript;
      setInputValue(newValue);
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        const newHeight = Math.max(40, Math.min(textareaRef.current.scrollHeight, 140));
        textareaRef.current.style.height = newHeight + 'px';
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecordingToText(false);
    };

    recognition.onend = () => {
      setIsRecordingToText(false);
    };

    recognition.start();
  }, [t, inputValue]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const actionItems = [
    { icon: ImageIcon, label: t('liaoliao.actionPhoto'), color: 'bg-blue-500' },
    { icon: Camera, label: t('liaoliao.actionCamera'), color: 'bg-green-500' },
    { icon: MapPin, label: t('liaoliao.actionLocation'), color: 'bg-orange-500' },
    { icon: Gift, label: t('liaoliao.actionRedPacket'), color: 'bg-red-500' },
    { icon: FileText, label: t('liaoliao.actionFile'), color: 'bg-purple-500' },
    { icon: UserCircle, label: t('liaoliao.actionContact'), color: 'bg-cyan-500' },
    { icon: Phone, label: t('liaoliao.actionVoiceCall'), color: 'bg-emerald-500' },
    { icon: Video, label: t('liaoliao.actionVideoCall'), color: 'bg-pink-500' },
    { icon: Star, label: t('liaoliao.actionFavorite'), color: 'bg-amber-500' },
    { icon: Wallet, label: t('liaoliao.actionTransfer'), color: 'bg-teal-500' },
    { icon: Music, label: t('liaoliao.actionMusic'), color: 'bg-rose-500' },
    { icon: Folder, label: t('liaoliao.actionFolder'), color: 'bg-indigo-500' },
  ];

  const closeAllPanels = () => {
    setShowActionPanel(false);
    setShowEmojiPanel(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate('/liaoliao')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-2 h-2 text-amber-900" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold" data-testid="text-ai-chat-title">
                {t('liaoliao.aiAssistant')}
              </h1>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">AI</span>
            </div>
          </div>
          <Button size="icon" variant="ghost" data-testid="button-more">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4" onClick={closeAllPanels}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center mr-2 shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-[#38B03B] text-white rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}
              data-testid={`message-${message.id}`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center mr-2 shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="sticky bottom-0 bg-background border-t px-3 py-2">
        {isRecordingVoice ? (
          <div className="flex items-center justify-center gap-4 py-2">
            <Button 
              size="icon"
              variant="ghost"
              onClick={cancelVoiceRecording}
              className="h-12 w-12 rounded-full bg-destructive/10"
              data-testid="button-cancel-recording"
            >
              <X className="w-6 h-6 text-destructive" />
            </Button>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-lg font-medium">{formatDuration(recordingDuration)}</span>
              </div>
              <span className="text-xs text-muted-foreground">{t('liaoliao.recording')}</span>
            </div>
            <Button 
              size="icon"
              onClick={stopVoiceRecording}
              className="h-12 w-12 rounded-full bg-[#38B03B]"
              data-testid="button-send-recording"
            >
              <Send className="w-6 h-6 text-white" />
            </Button>
          </div>
        ) : voiceInputMode ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <button
              className="w-full py-4 bg-muted rounded-full flex items-center justify-center gap-2 active:bg-muted/80 transition-colors"
              onTouchStart={startVoiceRecording}
              onTouchEnd={stopVoiceRecording}
              onMouseDown={startVoiceRecording}
              onMouseUp={stopVoiceRecording}
              onMouseLeave={cancelVoiceRecording}
              data-testid="button-hold-to-record"
            >
              <VoiceInputIcon className="w-6 h-6" />
              <span className="text-muted-foreground">{t('liaoliao.holdToTalk')}</span>
            </button>
            <Button 
              size="sm"
              variant="ghost"
              onClick={toggleVoiceInputMode}
              data-testid="button-switch-to-text"
            >
              {t('liaoliao.switchToText')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button 
              size="icon"
              variant="ghost"
              className="shrink-0 h-10 w-10 rounded-full [&_svg]:size-6"
              onClick={toggleVoiceInputMode}
              data-testid="button-voice"
            >
              <VoiceInputIcon className="text-muted-foreground" />
            </Button>

            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  const newHeight = Math.max(40, Math.min(target.scrollHeight, 140));
                  target.style.height = newHeight + 'px';
                  target.scrollTop = target.scrollHeight;
                }}
                placeholder={t('liaoliao.typeMessage')}
                className="w-full bg-muted/50 rounded-2xl px-4 py-2.5 text-sm border border-border focus:ring-1 focus:ring-[#38B03B] focus:outline-none resize-none min-h-[40px] max-h-[140px] overflow-y-auto leading-5"
                rows={1}
                data-testid="input-message"
              />
            </div>

            {inputValue.trim() ? (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={isLoading}
                className="rounded-full shrink-0 h-10 w-10 bg-[#38B03B] hover:bg-[#2e9632] text-white"
                data-testid="button-send"
              >
                <Send className="w-5 h-5" />
              </Button>
            ) : (
              <>
                <Button 
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "shrink-0 h-10 w-10 rounded-full [&_svg]:size-6",
                    isRecordingToText && "bg-red-100 dark:bg-red-900/30"
                  )}
                  onClick={startSpeechToText}
                  data-testid="button-mic"
                >
                  <Mic className={cn(
                    "text-muted-foreground",
                    isRecordingToText && "text-red-500 animate-pulse"
                  )} />
                </Button>
                <Button 
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "shrink-0 h-10 w-10 rounded-full [&_svg]:size-6",
                    showEmojiPanel && "bg-muted"
                  )}
                  onClick={toggleEmojiPanel}
                  data-testid="button-emoji"
                >
                  <Smile className="text-muted-foreground" />
                </Button>
                <Button 
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "shrink-0 h-10 w-10 rounded-full [&_svg]:size-6",
                    showActionPanel && "bg-muted"
                  )}
                  onClick={toggleActionPanel}
                  data-testid="button-more"
                >
                  <Plus className="text-muted-foreground" />
                </Button>
              </>
            )}
          </div>
        )}
      </footer>

      {showEmojiPanel && (
        <div className="bg-muted/50 border-t px-2 py-3 pb-safe">
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {COMMON_EMOJIS.map((emoji, index) => (
              <button
                key={index}
                className="w-10 h-10 flex items-center justify-center text-xl hover:bg-muted rounded-lg transition-colors"
                onClick={() => handleEmojiSelect(emoji)}
                data-testid={`emoji-${index}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {showActionPanel && (
        <div className="bg-muted/50 border-t px-4 py-4 pb-safe">
          <div className="grid grid-cols-4 gap-4">
            {actionItems.map((item, index) => (
              <button
                key={index}
                className="flex flex-col items-center gap-2"
                onClick={() => setShowActionPanel(false)}
                data-testid={`action-${index}`}
              >
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", item.color)}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
