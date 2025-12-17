import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Send, MoreVertical, Loader2, Mic, Smile, Plus, X,
  ImageIcon, Camera, MapPin, Gift, Folder, UserCircle, Phone, Video, Star, Wallet, Music, FileText, Bot, Sparkles
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AI_ASSISTANT_USER_ID = 4;

const VoiceInputIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
  '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
  '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝',
  '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
  '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
  '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔',
];

interface Message {
  id: number;
  fromUserId: number;
  groupId: number;
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

interface GroupInfo {
  id: number;
  name: string;
  avatarUrl?: string;
  ownerId: number;
  memberCount: number;
}

export default function GroupChat() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ groupId: string }>();
  const groupId = parseInt(params.groupId || '0');
  
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingToText, setIsRecordingToText] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showRedPacketDialog, setShowRedPacketDialog] = useState(false);
  const [redPacketAmount, setRedPacketAmount] = useState('');
  const [redPacketMessage, setRedPacketMessage] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: groupInfo, isLoading: groupLoading } = useQuery<GroupInfo>({
    queryKey: ['/api/liaoliao/groups', groupId],
    enabled: !!groupId,
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery<{ messages: Message[] }>({
    queryKey: ['/api/liaoliao/groups', groupId, 'messages'],
    enabled: !!groupId,
    refetchInterval: 3000,
  });

  const messages = messagesData?.messages || [];

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { messageType: string; content: string; mediaUrl?: string }) => {
      const res = await apiRequest('POST', `/api/liaoliao/groups/${groupId}/messages`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/groups', groupId, 'messages'] });
      setInputValue('');
    },
    onError: () => {
      toast({
        title: t('common.error') || '发送失败',
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessageMutation.mutate({ messageType: 'text', content: inputValue.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  };

  const toggleEmojiPanel = () => {
    setShowEmojiPanel(!showEmojiPanel);
    setShowActionPanel(false);
  };

  const toggleActionPanel = () => {
    setShowActionPanel(!showActionPanel);
    setShowEmojiPanel(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice.webm');
        formData.append('type', 'voice');
        
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          const result = await response.json();
          if (result.url) {
            sendMessageMutation.mutate({ 
              messageType: 'audio', 
              content: `[${t('liaoliao.voiceMessage')} ${recordingDuration}${t('liaoliao.seconds')}]`,
              mediaUrl: result.url 
            });
          }
        } catch (error) {
          toast({ title: t('common.error') || '上传失败', variant: 'destructive' });
        }
        
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({ title: t('liaoliao.micPermissionDenied') || '麦克风权限被拒绝', variant: 'destructive' });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecordingVoice(false);
      setRecordingDuration(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const startSpeechToText = async () => {
    if (isRecordingToText) {
      setIsRecordingToText(false);
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        const formData = new FormData();
        formData.append('file', audioBlob, 'speech.webm');
        
        try {
          const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          const result = await response.json();
          if (result.text) {
            setInputValue(prev => prev + result.text);
          }
        } catch (error) {
          toast({ title: t('common.error') || '语音识别失败', variant: 'destructive' });
        }
        
        setIsRecordingToText(false);
      };

      mediaRecorder.start();
      setIsRecordingToText(true);
      
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 10000);
    } catch (error) {
      toast({ title: t('liaoliao.micPermissionDenied') || '麦克风权限被拒绝', variant: 'destructive' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'camera' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type === 'file' ? 'file' : 'image');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const result = await response.json();
      if (result.url) {
        const messageType = type === 'file' ? 'file' : 'image';
        sendMessageMutation.mutate({ 
          messageType, 
          content: file.name,
          mediaUrl: result.url 
        });
      }
    } catch (error) {
      toast({ title: t('common.error') || '上传失败', variant: 'destructive' });
    }

    e.target.value = '';
    setShowActionPanel(false);
  };

  const handleSendRedPacket = () => {
    if (!redPacketAmount) return;
    sendMessageMutation.mutate({
      messageType: 'text',
      content: `[${t('liaoliao.redPacket')}] ${redPacketMessage || t('liaoliao.bestWishes')}`
    });
    setShowRedPacketDialog(false);
    setRedPacketAmount('');
    setRedPacketMessage('');
  };

  const actionItems = [
    { icon: ImageIcon, label: t('liaoliao.actionPhoto'), color: 'bg-blue-500', action: () => { photoInputRef.current?.click(); setShowActionPanel(false); } },
    { icon: Camera, label: t('liaoliao.actionCamera'), color: 'bg-green-500', action: () => { cameraInputRef.current?.click(); setShowActionPanel(false); } },
    { icon: MapPin, label: t('liaoliao.actionLocation'), color: 'bg-orange-500', action: () => toast({ title: t('liaoliao.comingSoon') }) },
    { icon: Gift, label: t('liaoliao.actionRedPacket'), color: 'bg-red-500', action: () => { setShowRedPacketDialog(true); setShowActionPanel(false); } },
    { icon: Folder, label: t('liaoliao.actionFolder'), color: 'bg-purple-500', action: () => { fileInputRef.current?.click(); setShowActionPanel(false); } },
    { icon: UserCircle, label: t('liaoliao.actionContact'), color: 'bg-cyan-500', action: () => toast({ title: t('liaoliao.comingSoon') }) },
    { icon: Phone, label: t('liaoliao.actionVoiceCall'), color: 'bg-emerald-500', action: () => toast({ title: t('liaoliao.comingSoon') }) },
    { icon: Video, label: t('liaoliao.actionVideoCall'), color: 'bg-pink-500', action: () => toast({ title: t('liaoliao.comingSoon') }) },
    { icon: Star, label: t('liaoliao.actionFavorite'), color: 'bg-amber-500', action: () => toast({ title: t('liaoliao.comingSoon') }) },
    { icon: Wallet, label: t('liaoliao.actionTransfer'), color: 'bg-teal-500', action: () => toast({ title: t('liaoliao.comingSoon') }) },
    { icon: Music, label: t('liaoliao.actionMusic'), color: 'bg-rose-500', action: () => toast({ title: t('liaoliao.comingSoon') }) },
    { icon: FileText, label: t('liaoliao.actionCoupon'), color: 'bg-indigo-500', action: () => toast({ title: t('liaoliao.comingSoon') }) },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  if (groupLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b px-3 py-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/liaoliao')}
          data-testid="button-back-group"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{groupInfo?.name || t('liaoliao.groupChat')}</h1>
          <p className="text-xs text-muted-foreground">
            {groupInfo?.memberCount || 0} {t('liaoliao.members') || '成员'}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(`/liaoliao/group/${groupId}/settings`)}
          data-testid="button-group-menu"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            {t('liaoliao.noMessages') || '暂无消息'}
          </div>
        ) : (
          messages.map((message) => {
            const isMe = message.fromUserId === user?.id;
            const isAiAssistant = message.fromUserId === AI_ASSISTANT_USER_ID;
            return (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2',
                  isMe ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {isAiAssistant ? (
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                      <Sparkles className="w-2 h-2 text-amber-900" />
                    </div>
                  </div>
                ) : (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.fromUser?.avatarUrl} />
                    <AvatarFallback>
                      {message.fromUser?.displayName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn('max-w-[70%]', isMe ? 'items-end' : 'items-start')}>
                  {!isMe && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {message.fromUser?.displayName}
                    </p>
                  )}
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2 break-words',
                      isMe
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {message.messageType === 'image' && message.mediaUrl ? (
                      <img src={message.mediaUrl} alt="" className="max-w-[200px] rounded" />
                    ) : message.messageType === 'audio' && message.mediaUrl ? (
                      <audio controls src={message.mediaUrl} className="max-w-[200px]" />
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

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
            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 h-8">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#38B03B] rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 24 + 8}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.3 + Math.random() * 0.3}s`
                      }}
                    />
                  ))}
                </div>
                <span className="text-lg font-medium ml-2">{formatDuration(recordingDuration)}</span>
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
        ) : (
          <div className="flex items-center gap-2">
            <Button 
              size="icon"
              variant="ghost"
              onClick={startVoiceRecording}
              className="shrink-0 h-10 w-10 rounded-full [&_svg]:size-6"
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
                data-testid="input-group-message"
              />
            </div>

            {inputValue.trim() ? (
              <Button 
                size="icon"
                disabled={sendMessageMutation.isPending}
                onClick={handleSend}
                className="rounded-full shrink-0 h-10 w-10 bg-[#38B03B] hover:bg-[#2e9632] text-white"
                data-testid="button-send-group-message"
              >
                <Send className="w-5 h-5" />
              </Button>
            ) : (
              <>
                <Button 
                  size="icon"
                  variant="ghost"
                  onClick={startSpeechToText}
                  className={cn(
                    "shrink-0 h-10 w-10 rounded-full [&_svg]:size-6",
                    isRecordingToText && "bg-red-100 dark:bg-red-900/30"
                  )}
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
                onClick={item.action}
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

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'photo')}
        data-testid="input-photo"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'camera')}
        data-testid="input-camera"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'file')}
        data-testid="input-file"
      />

      <Dialog open={showRedPacketDialog} onOpenChange={setShowRedPacketDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t('liaoliao.sendRedPacket')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-500 rounded-lg p-6 text-white text-center">
              <Gift className="w-12 h-12 mx-auto mb-2" />
              <Input
                type="number"
                placeholder={t('liaoliao.enterAmount')}
                value={redPacketAmount}
                onChange={(e) => setRedPacketAmount(e.target.value)}
                className="bg-white/20 border-0 text-white placeholder:text-white/70 text-center text-2xl font-bold"
                data-testid="input-redpacket-amount"
              />
              <p className="text-sm mt-2 opacity-80">THB</p>
            </div>
            <Input
              placeholder={t('liaoliao.redPacketWish')}
              value={redPacketMessage}
              onChange={(e) => setRedPacketMessage(e.target.value)}
              data-testid="input-redpacket-message"
            />
            <Button 
              className="w-full bg-red-500 hover:bg-red-600" 
              onClick={handleSendRedPacket}
              disabled={!redPacketAmount || sendMessageMutation.isPending}
              data-testid="button-send-redpacket"
            >
              {t('liaoliao.send')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
