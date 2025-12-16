import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, MoreVertical, Smile, Plus, Mic, Image as ImageIcon, Camera, MapPin, Gift, X, Play, Pause } from 'lucide-react';
import { VoiceInputIcon } from '@/components/icons/VoiceInputIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface Message {
  id: number;
  fromUserId: number;
  toUserId?: number;
  groupId?: number;
  messageType: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
  fromUser: {
    id: number;
    displayName: string;
    avatarUrl?: string;
  };
}

interface ChatData {
  messages: Message[];
  hasMore: boolean;
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

export default function LiaoliaoChatDetail() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ friendId: string }>();
  const friendId = parseInt(params.friendId || '0');
  
  const [inputValue, setInputValue] = useState('');
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingToText, setIsRecordingToText] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceInputMode, setVoiceInputMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const baseInputValueRef = useRef<string>('');

  const { data: chatData, isLoading } = useQuery<ChatData>({
    queryKey: ['/api/liaoliao/messages', friendId],
    enabled: !!friendId,
    refetchInterval: 3000,
  });

  const messages = chatData?.messages || [];

  const friendInfo = messages.find(m => m.fromUserId === friendId)?.fromUser || {
    id: friendId,
    displayName: t('liaoliao.unknownUser'),
  };

  const sendMutation = useMutation({
    mutationFn: async (data: { content: string; messageType: string }) => {
      return apiRequest('POST', '/api/liaoliao/messages', {
        toUserId: friendId,
        content: data.content,
        messageType: data.messageType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/messages', friendId] });
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/chats'] });
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || sendMutation.isPending) return;
    sendMutation.mutate({ content, messageType: 'text' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    const newHeight = Math.max(44, Math.min(target.scrollHeight, 140));
    target.style.height = newHeight + 'px';
    target.scrollTop = target.scrollHeight;
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
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

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
        sendMutation.mutate({ 
          content: `[${t('liaoliao.voiceMessage')} ${recordingDuration}${t('liaoliao.seconds')}]`, 
          messageType: 'voice' 
        });
      }
      setRecordingDuration(0);
    }
  }, [isRecordingVoice, recordingDuration, sendMutation, t]);

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
    recognition.continuous = false;
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
      
      setInputValue(baseInputValueRef.current + finalTranscript + interimTranscript);
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
  ];

  const closeAllPanels = () => {
    setShowActionPanel(false);
    setShowEmojiPanel(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b px-3 py-3 flex items-center gap-2">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={() => navigate('/liaoliao')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Avatar className="w-9 h-9">
          <AvatarImage src={friendInfo.avatarUrl} />
          <AvatarFallback>{friendInfo.displayName?.charAt(0)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate" data-testid="text-chat-partner-name">
            {friendInfo.displayName}
          </h1>
        </div>
        
        <Button size="icon" variant="ghost" data-testid="button-chat-more">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </header>

      <main 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3"
        onClick={closeAllPanels}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>{t('liaoliao.startConversation')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const isOwn = message.fromUserId === user?.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  data-testid={`message-${message.id}`}
                >
                  {!isOwn && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={message.fromUser.avatarUrl} />
                      <AvatarFallback>{message.fromUser.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isOwn
                        ? 'bg-[#38B03B] text-white rounded-br-md'
                        : 'bg-muted rounded-bl-md'
                    }`}
                  >
                    {message.messageType === 'text' && (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                    {message.messageType === 'voice' && (
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        <span className="text-sm">{message.content}</span>
                      </div>
                    )}
                    {message.messageType === 'image' && message.mediaUrl && (
                      <img 
                        src={message.mediaUrl} 
                        alt="Image" 
                        className="max-w-full rounded-lg"
                      />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {showEmojiPanel && (
        <div className="bg-muted/50 border-t px-2 py-3">
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
        <div className="bg-muted/50 border-t px-4 py-4">
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

      <footer className="sticky bottom-0 bg-background border-t px-3 py-2 pb-safe">
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
                onKeyDown={handleKeyDown}
                onInput={handleTextareaInput}
                placeholder={t('liaoliao.typeMessage')}
                className={cn(
                  "w-full bg-muted/50 rounded-2xl px-4 py-2.5 text-sm",
                  "border border-border focus:ring-1 focus:ring-[#38B03B] focus:outline-none",
                  "resize-none min-h-[40px] max-h-[140px] overflow-y-auto leading-5"
                )}
                rows={1}
                data-testid="input-message"
              />
            </div>

            {inputValue.trim() ? (
              <Button 
                size="icon"
                disabled={sendMutation.isPending}
                onClick={handleSend}
                className="rounded-full shrink-0 h-10 w-10 bg-[#38B03B] hover:bg-[#2e9632] text-white"
                data-testid="button-send-message"
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
    </div>
  );
}
