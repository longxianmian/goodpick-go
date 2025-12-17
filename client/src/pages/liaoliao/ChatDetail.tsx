import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImagePreview } from '@/components/ui/image-preview';
import { LocationPicker } from '@/components/LocationPicker';
import { ArrowLeft, Send, MoreVertical, Smile, Plus, Mic, Image as ImageIcon, Camera, MapPin, Gift, X, Play, Pause, FileText, Phone, Video, Star, UserCircle, Wallet, Music, Folder, Loader2, Check, Navigation } from 'lucide-react';
import { VoiceInputIcon } from '@/components/icons/VoiceInputIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Message {
  id: number;
  fromUserId: number;
  toUserId?: number;
  groupId?: number;
  messageType: string;
  content: string;
  mediaUrl?: string;
  metadata?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    title?: string;
    mapUrl?: string;
    callType?: 'voice' | 'video';
    status?: string;
    duration?: number;
    timestamp?: string;
    contactId?: string;
    contactUsername?: string;
    contactName?: string;
    contactAvatar?: string;
    fileSize?: number;
    fileName?: string;
  };
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
  const { toast } = useToast();
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
  
  const [showRedPacketDialog, setShowRedPacketDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [showFavoriteDialog, setShowFavoriteDialog] = useState(false);
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState<'voice' | 'video' | null>(null);
  
  const [redPacketAmount, setRedPacketAmount] = useState('');
  const [redPacketMessage, setRedPacketMessage] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number; address: string} | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // 图片预览状态 - 使用现有的ImagePreview组件
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const baseInputValueRef = useRef<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    mutationFn: async (data: { content: string; messageType: string; mediaUrl?: string; metadata?: any }) => {
      return apiRequest('POST', '/api/liaoliao/messages', {
        toUserId: friendId,
        content: data.content,
        messageType: data.messageType,
        mediaUrl: data.mediaUrl,
        metadata: data.metadata,
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

  // 处理图片预览 - 使用现有的ImagePreview组件
  const handleImagePreview = useCallback((imageUrl: string) => {
    // 收集所有图片消息的URL
    const allImageUrls = messages
      .filter(m => m.messageType === 'image' && m.mediaUrl)
      .map(m => m.mediaUrl as string);
    
    const index = allImageUrls.indexOf(imageUrl);
    setPreviewImages(allImageUrls);
    setPreviewImageIndex(index >= 0 ? index : 0);
    setShowImagePreview(true);
  }, [messages]);

  // 处理文件下载 - 直接跳转到文件URL
  const handleFileDownload = useCallback((url: string, filename: string) => {
    if (!url) {
      toast({
        title: t('liaoliao.uploadFailed'),
        variant: 'destructive'
      });
      return;
    }
    
    // 直接跳转到文件URL，浏览器会处理下载或预览
    // 注意：需要在阿里云OSS配置CORS才能正常工作
    window.location.href = url;
  }, [toast, t]);

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

  const stopVoiceRecording = useCallback(async () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      const duration = recordingDuration;
      
      // 创建一个Promise来等待录制完成
      const audioPromise = new Promise<Blob>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            resolve(audioBlob);
          };
        }
      });
      
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (duration >= 1) {
        try {
          const audioBlob = await audioPromise;
          const formData = new FormData();
          formData.append('file', audioBlob, `voice_${Date.now()}.webm`);
          
          const token = localStorage.getItem('userToken');
          const response = await fetch('/api/user/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
          
          const result = await response.json();
          
          if (result.success && (result.url || result.fileUrl)) {
            const audioUrl = result.url || result.fileUrl;
            sendMutation.mutate({ 
              content: `[${t('liaoliao.voiceMessage')} ${duration}${t('liaoliao.seconds')}]`, 
              messageType: 'audio',
              mediaUrl: audioUrl
            });
          } else {
            // 如果上传失败，仍发送文本描述
            sendMutation.mutate({ 
              content: `[${t('liaoliao.voiceMessage')} ${duration}${t('liaoliao.seconds')}]`, 
              messageType: 'audio' 
            });
          }
        } catch (error) {
          console.error('Voice upload error:', error);
          sendMutation.mutate({ 
            content: `[${t('liaoliao.voiceMessage')} ${duration}${t('liaoliao.seconds')}]`, 
            messageType: 'audio' 
          });
        }
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
        const newHeight = Math.max(44, Math.min(textareaRef.current.scrollHeight, 140));
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

  const handlePhotoSelect = () => {
    photoInputRef.current?.click();
    setShowActionPanel(false);
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
    setShowActionPanel(false);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
    setShowActionPanel(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'camera' | 'file') => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      toast({ title: t('liaoliao.uploading'), description: file.name });
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadEndpoint = '/api/user/upload';
        
        const token = localStorage.getItem('userToken');
        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        
        const result = await response.json();
        
        if (result.success && (result.url || result.fileUrl)) {
          const fileUrl = result.url || result.fileUrl;
          const messageContent = type === 'file' 
            ? `[${t('liaoliao.fileMessage')}] ${file.name}`
            : `[${t('liaoliao.imageMessage')}]`;
          
          sendMutation.mutate({ 
            content: messageContent, 
            messageType: type === 'file' ? 'file' : 'image',
            mediaUrl: fileUrl,
            metadata: type === 'file' ? { fileSize: file.size, fileName: file.name } : undefined
          });
          toast({ title: t('liaoliao.messageSent'), description: file.name });
        } else {
          toast({ title: t('liaoliao.uploadFailed'), variant: 'destructive' });
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast({ title: t('liaoliao.uploadFailed'), variant: 'destructive' });
      }
    }
    e.target.value = '';
  };

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      
      const { latitude, longitude } = position.coords;
      setCurrentLocation({
        lat: latitude,
        lng: longitude,
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      });
    } catch (error) {
      toast({ title: t('liaoliao.locationError'), variant: 'destructive' });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSendLocation = () => {
    if (currentLocation) {
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${currentLocation.lat},${currentLocation.lng}`;
      sendMutation.mutate({ 
        content: googleMapsUrl,
        messageType: 'location',
        metadata: {
          mapUrl: googleMapsUrl,
          address: currentLocation.address,
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          title: t('liaoliao.myLocation')
        }
      });
      setShowLocationDialog(false);
      setCurrentLocation(null);
      toast({ title: t('liaoliao.locationSent') || '位置已发送' });
    }
  };

  const handleSendRedPacket = () => {
    const amount = parseFloat(redPacketAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: t('liaoliao.invalidAmount'), variant: 'destructive' });
      return;
    }
    sendMutation.mutate({ 
      content: `[${t('liaoliao.redPacketMessage')}] ${amount.toFixed(2)} THB${redPacketMessage ? ` - ${redPacketMessage}` : ''}`, 
      messageType: 'text' 
    });
    setShowRedPacketDialog(false);
    setRedPacketAmount('');
    setRedPacketMessage('');
  };

  const handleSendTransfer = () => {
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: t('liaoliao.invalidAmount'), variant: 'destructive' });
      return;
    }
    sendMutation.mutate({ 
      content: `[${t('liaoliao.transferMessage')}] ${amount.toFixed(2)} THB${transferNote ? ` - ${transferNote}` : ''}`, 
      messageType: 'text' 
    });
    setShowTransferDialog(false);
    setTransferAmount('');
    setTransferNote('');
  };

  const handleVoiceCall = () => {
    setShowCallDialog('voice');
    setShowActionPanel(false);
  };

  const handleVideoCall = () => {
    setShowCallDialog('video');
    setShowActionPanel(false);
  };

  const handleStartCall = () => {
    const callType = showCallDialog;
    if (!callType) return;
    
    setShowCallDialog(null);
    
    const callData = {
      callType: callType,
      status: 'initiated' as const,
      duration: 0,
      timestamp: new Date().toISOString(),
    };
    
    sendMutation.mutate({ 
      content: JSON.stringify(callData),
      messageType: 'call',
      metadata: callData
    });
    
    toast({ 
      title: callType === 'voice' ? t('liaoliao.voiceCallStarted') : t('liaoliao.videoCallStarted'),
      description: t('liaoliao.callFeatureDemo')
    });
  };

  const handleSendContact = () => {
    sendMutation.mutate({ 
      content: `[${t('liaoliao.contactCard')}] ${user?.displayName || 'User'}`, 
      messageType: 'card' 
    });
    setShowContactDialog(false);
  };

  const handleSendFavorite = () => {
    sendMutation.mutate({ 
      content: `[${t('liaoliao.favoriteMessage')}]`, 
      messageType: 'text' 
    });
    setShowFavoriteDialog(false);
  };

  const handleSendMusic = () => {
    sendMutation.mutate({ 
      content: `[${t('liaoliao.musicMessage')}]`, 
      messageType: 'text' 
    });
    setShowMusicDialog(false);
  };

  const handleSendCoupon = () => {
    sendMutation.mutate({ 
      content: `[${t('liaoliao.couponMessage')}]`, 
      messageType: 'text' 
    });
    setShowCouponDialog(false);
  };

  const actionItems = [
    { icon: ImageIcon, label: t('liaoliao.actionPhoto'), color: 'bg-blue-500', action: handlePhotoSelect },
    { icon: Camera, label: t('liaoliao.actionCamera'), color: 'bg-green-500', action: handleCameraCapture },
    { icon: MapPin, label: t('liaoliao.actionLocation'), color: 'bg-orange-500', action: () => { setShowLocationDialog(true); setShowActionPanel(false); } },
    { icon: Gift, label: t('liaoliao.actionRedPacket'), color: 'bg-red-500', action: () => { setShowRedPacketDialog(true); setShowActionPanel(false); } },
    { icon: Folder, label: t('liaoliao.actionFolder'), color: 'bg-purple-500', action: handleFileSelect },
    { icon: UserCircle, label: t('liaoliao.actionContact'), color: 'bg-cyan-500', action: () => { setShowContactDialog(true); setShowActionPanel(false); } },
    { icon: Phone, label: t('liaoliao.actionVoiceCall'), color: 'bg-emerald-500', action: handleVoiceCall },
    { icon: Video, label: t('liaoliao.actionVideoCall'), color: 'bg-pink-500', action: handleVideoCall },
    { icon: Star, label: t('liaoliao.actionFavorite'), color: 'bg-amber-500', action: () => { setShowFavoriteDialog(true); setShowActionPanel(false); } },
    { icon: Wallet, label: t('liaoliao.actionTransfer'), color: 'bg-teal-500', action: () => { setShowTransferDialog(true); setShowActionPanel(false); } },
    { icon: Music, label: t('liaoliao.actionMusic'), color: 'bg-rose-500', action: () => { setShowMusicDialog(true); setShowActionPanel(false); } },
    { icon: FileText, label: t('liaoliao.actionCoupon'), color: 'bg-indigo-500', action: () => { setShowCouponDialog(true); setShowActionPanel(false); } },
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
                    {message.messageType === 'audio' && (
                      message.mediaUrl ? (
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <button
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isOwn ? 'bg-white/20' : 'bg-primary/10'
                            }`}
                            onClick={() => {
                              const audio = new Audio(message.mediaUrl);
                              audio.play();
                            }}
                            data-testid={`voice-play-${message.id}`}
                          >
                            <Play className={`w-4 h-4 ${isOwn ? 'text-white' : 'text-primary'}`} />
                          </button>
                          <div className="flex-1">
                            <div className={`h-1 rounded-full ${isOwn ? 'bg-white/30' : 'bg-primary/20'}`}>
                              <div className={`h-full w-0 rounded-full ${isOwn ? 'bg-white' : 'bg-primary'}`} />
                            </div>
                          </div>
                          <span className={`text-xs ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {message.content?.match(/\d+/)?.[0] || '0'}s
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          <span className="text-sm">{message.content}</span>
                        </div>
                      )
                    )}
                    {message.messageType === 'image' && (
                      message.mediaUrl ? (
                        <div className="overflow-hidden rounded-lg">
                          <img 
                            src={message.mediaUrl} 
                            alt="Image" 
                            className="max-w-[200px] max-h-[200px] object-cover cursor-pointer"
                            onClick={() => handleImagePreview(message.mediaUrl!)}
                            data-testid={`image-message-${message.id}`}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          <span className="text-sm">{message.content}</span>
                        </div>
                      )
                    )}
                    {message.messageType === 'file' && (
                      <FileMessageCard message={message} isOwn={isOwn} />
                    )}
                    {message.messageType === 'location' && (
                      <LocationMapCard message={message} isOwn={isOwn} />
                    )}
                    {message.messageType === 'card' && (
                      <CardMessage message={message} isOwn={isOwn} />
                    )}
                    {message.messageType === 'call' && (
                      <CallRecordMessage message={message} isOwn={isOwn} />
                    )}
                    {!['text', 'audio', 'image', 'file', 'location', 'card', 'call'].includes(message.messageType || 'text') && (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
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
              disabled={!redPacketAmount || sendMutation.isPending}
              data-testid="button-send-redpacket"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('liaoliao.sendRedPacket')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t('liaoliao.transfer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-teal-500 rounded-lg p-6 text-white text-center">
              <Wallet className="w-12 h-12 mx-auto mb-2" />
              <Input
                type="number"
                placeholder={t('liaoliao.enterAmount')}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="bg-white/20 border-0 text-white placeholder:text-white/70 text-center text-2xl font-bold"
                data-testid="input-transfer-amount"
              />
              <p className="text-sm mt-2 opacity-80">THB</p>
            </div>
            <Input
              placeholder={t('liaoliao.transferNote')}
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              data-testid="input-transfer-note"
            />
            <Button 
              className="w-full bg-teal-500 hover:bg-teal-600" 
              onClick={handleSendTransfer}
              disabled={!transferAmount || sendMutation.isPending}
              data-testid="button-send-transfer"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('liaoliao.confirmTransfer')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showLocationDialog && (
        <LocationPicker
          onClose={() => setShowLocationDialog(false)}
          onSelectLocation={(location) => {
            sendMutation.mutate({ 
              content: location.mapUrl,
              messageType: 'location',
              metadata: {
                mapUrl: location.mapUrl,
                address: location.address,
                latitude: location.latitude,
                longitude: location.longitude,
                title: location.name
              }
            });
            setShowLocationDialog(false);
            toast({ title: t('liaoliao.locationSent') || '位置已发送' });
          }}
        />
      )}

      <Dialog open={showCallDialog !== null} onOpenChange={() => setShowCallDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {showCallDialog === 'voice' ? t('liaoliao.voiceCall') : t('liaoliao.videoCall')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            <Avatar className="w-20 h-20 mx-auto">
              <AvatarImage src={friendInfo.avatarUrl} />
              <AvatarFallback className="text-2xl">{friendInfo.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="font-medium">{friendInfo.displayName}</p>
            <p className="text-sm text-muted-foreground">{t('liaoliao.callConfirmation')}</p>
            <div className="flex gap-4 justify-center pt-4">
              <Button 
                size="icon"
                variant="outline"
                className="w-14 h-14 rounded-full"
                onClick={() => setShowCallDialog(null)}
                data-testid="button-cancel-call"
              >
                <X className="w-6 h-6" />
              </Button>
              <Button 
                size="icon"
                className={cn(
                  "w-14 h-14 rounded-full",
                  showCallDialog === 'voice' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-pink-500 hover:bg-pink-600"
                )}
                onClick={handleStartCall}
                data-testid="button-start-call"
              >
                {showCallDialog === 'voice' ? <Phone className="w-6 h-6" /> : <Video className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t('liaoliao.shareContact')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-cyan-100 dark:bg-cyan-900/30 rounded-lg p-4 flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.displayName}</p>
                <p className="text-sm text-muted-foreground">{t('liaoliao.myContact')}</p>
              </div>
            </div>
            <Button 
              className="w-full bg-cyan-500 hover:bg-cyan-600" 
              onClick={handleSendContact}
              disabled={sendMutation.isPending}
              data-testid="button-send-contact"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('liaoliao.sendContact')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFavoriteDialog} onOpenChange={setShowFavoriteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t('liaoliao.favorites')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-6 text-center">
              <Star className="w-12 h-12 mx-auto mb-2 text-amber-500" />
              <p className="text-sm text-muted-foreground">{t('liaoliao.noFavorites')}</p>
            </div>
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600" 
              onClick={handleSendFavorite}
              disabled={sendMutation.isPending}
              data-testid="button-send-favorite"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('liaoliao.sendFromFavorites')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMusicDialog} onOpenChange={setShowMusicDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t('liaoliao.shareMusic')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-rose-100 dark:bg-rose-900/30 rounded-lg p-6 text-center">
              <Music className="w-12 h-12 mx-auto mb-2 text-rose-500" />
              <p className="text-sm text-muted-foreground">{t('liaoliao.noMusic')}</p>
            </div>
            <Button 
              className="w-full bg-rose-500 hover:bg-rose-600" 
              onClick={handleSendMusic}
              disabled={sendMutation.isPending}
              data-testid="button-send-music"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('liaoliao.sendMusic')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{t('liaoliao.myCoupons')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-lg p-6 text-center">
              <FileText className="w-12 h-12 mx-auto mb-2 text-indigo-500" />
              <p className="text-sm text-muted-foreground">{t('liaoliao.noCoupons')}</p>
            </div>
            <Button 
              className="w-full bg-indigo-500 hover:bg-indigo-600" 
              onClick={handleSendCoupon}
              disabled={sendMutation.isPending}
              data-testid="button-send-coupon"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('liaoliao.sendCoupon')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 图片预览 - 使用现有的ImagePreview组件 */}
      <ImagePreview
        images={previewImages}
        initialIndex={previewImageIndex}
        isOpen={showImagePreview}
        onClose={() => setShowImagePreview(false)}
      />
    </div>
  );

  // File Message Card Component - 微信风格文件消息卡片
  function FileMessageCard({ message, isOwn }: { message: Message; isOwn: boolean }) {
    // 从消息内容中提取文件名
    const filename = message.content?.replace(/^\[文件\]\s*/, '').replace(/^\[File\]\s*/, '') || 'file';
    const fileUrl = message.mediaUrl || '';
    const fileSize = message.metadata?.fileSize;
    
    // 获取文件扩展名
    const getFileExtension = (name: string): string => {
      const ext = name.split('.').pop()?.toLowerCase() || '';
      return ext;
    };
    
    // 格式化文件大小
    const formatFileSize = (bytes?: number): string => {
      if (!bytes) return '';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };
    
    // 根据文件类型获取图标配置
    const getFileIconConfig = (ext: string): { icon: string; color: string; bgColor: string } => {
      const configs: Record<string, { icon: string; color: string; bgColor: string }> = {
        // 文档类
        pdf: { icon: 'PDF', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
        doc: { icon: 'W', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
        docx: { icon: 'W', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
        xls: { icon: 'X', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
        xlsx: { icon: 'X', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
        ppt: { icon: 'P', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
        pptx: { icon: 'P', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
        txt: { icon: 'TXT', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
        // 压缩包
        zip: { icon: 'ZIP', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
        rar: { icon: 'RAR', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
        '7z': { icon: '7Z', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
        // 音频
        mp3: { icon: 'MP3', color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
        wav: { icon: 'WAV', color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
        // 视频
        mp4: { icon: 'MP4', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
        mov: { icon: 'MOV', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
        avi: { icon: 'AVI', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
        // 代码
        js: { icon: 'JS', color: 'text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
        ts: { icon: 'TS', color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
        json: { icon: 'JSON', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
        // 图片（作为文件发送时）
        png: { icon: 'PNG', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
        jpg: { icon: 'JPG', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
        jpeg: { icon: 'JPG', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
        gif: { icon: 'GIF', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
        svg: { icon: 'SVG', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
      };
      return configs[ext] || { icon: ext.toUpperCase().slice(0, 3) || 'FILE', color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' };
    };
    
    const ext = getFileExtension(filename);
    const iconConfig = getFileIconConfig(ext);
    
    // 处理点击事件 - 使用<a>标签打开文件（兼容移动端）
    const handleClick = () => {
      console.log('[FileMessageCard] 点击文件:', { filename, fileUrl, fileSize });
      if (!fileUrl) {
        console.log('[FileMessageCard] fileUrl为空，无法打开');
        return;
      }
      
      // 创建临时<a>标签并触发点击
      const link = document.createElement('a');
      link.href = fileUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      console.log('[FileMessageCard] 触发链接点击:', fileUrl);
      link.click();
      document.body.removeChild(link);
    };
    
    return (
      <div 
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg min-w-[220px] max-w-[280px] cursor-pointer transition-opacity hover:opacity-90",
          isOwn ? "bg-white/10" : "bg-background border"
        )}
        data-testid={`file-message-${message.id}`}
      >
        {/* 文件图标 */}
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs",
          isOwn ? "bg-white/20 text-white" : iconConfig.bgColor + ' ' + iconConfig.color
        )}>
          {iconConfig.icon}
        </div>
        
        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isOwn ? "text-white" : "text-foreground"
          )}>
            {filename}
          </p>
          <div className={cn(
            "flex items-center gap-2 text-xs mt-0.5",
            isOwn ? "text-white/70" : "text-muted-foreground"
          )}>
            {fileSize && <span>{formatFileSize(fileSize)}</span>}
            {fileSize && <span>·</span>}
            <span>{fileUrl ? t('liaoliao.clickToOpen') || '点击打开' : t('liaoliao.uploadFailed')}</span>
          </div>
        </div>
      </div>
    );
  }

  // Location Map Card Component
  function LocationMapCard({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // 优先使用 metadata 中的坐标
  let lat = message.metadata?.latitude;
  let lng = message.metadata?.longitude;
  let title = message.metadata?.title || message.metadata?.address || t('liaoliao.location');
  let googleMapsUrl = message.metadata?.mapUrl;

  // 如果没有 metadata，尝试从 content 解析
  if ((!lat || !lng) && message.content) {
    // 尝试匹配 Google Maps URL
    const urlMatch = message.content.match(/query=([\d.-]+),([\d.-]+)/);
    if (urlMatch) {
      lat = parseFloat(urlMatch[1]);
      lng = parseFloat(urlMatch[2]);
    } else {
      // 尝试匹配中文格式
      const latMatch = message.content.match(/纬度[：:]\s*([\d.-]+)/);
      const lngMatch = message.content.match(/经度[：:]\s*([\d.-]+)/);
      if (latMatch && lngMatch) {
        lat = parseFloat(latMatch[1]);
        lng = parseFloat(lngMatch[1]);
      }
    }
  }

  // 如果没有 mapUrl，生成一个
  if (!googleMapsUrl && lat && lng) {
    googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  
  const coordsDisplay = lat && lng ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : null;

  useEffect(() => {
    if (!mapContainerRef.current || !lat || !lng || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    L.marker([lat, lng], { icon: redIcon }).addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng]);

    return (
      <div 
        className="relative cursor-pointer max-w-[280px]"
        onClick={() => googleMapsUrl && window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')}
        data-testid={`location-${message.id}`}
      >
        <div className={cn(
          "rounded-lg overflow-hidden shadow-sm",
          isOwn ? "bg-[#38B03B]" : "bg-muted"
        )}>
          <div className="relative w-[280px] h-[150px] bg-gradient-to-br from-blue-100 to-green-100 dark:from-slate-700 dark:to-slate-600">
            {lat && lng ? (
              <>
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-full"
                  style={{ zIndex: 0 }}
                />
                {!mapReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100 dark:from-slate-700 dark:to-slate-600">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-red-500 mx-auto animate-pulse" />
                      <p className="text-xs text-slate-500 mt-1">加载中...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-10 h-10 text-red-500 drop-shadow-lg" />
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-slate-800/90 rounded-full p-2 shadow z-10">
              <Navigation className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </div>
          </div>
          
          <div className={cn("p-3", isOwn ? "bg-[#38B03B] text-white" : "bg-white dark:bg-slate-800")}>
            <p className={cn("text-[14px] font-medium truncate", isOwn ? "text-white" : "text-slate-900 dark:text-slate-100")}>
              {title}
            </p>
            {message.metadata?.address && (
              <p className={cn("text-xs mt-0.5 line-clamp-2", isOwn ? "text-white/70" : "text-slate-500 dark:text-slate-400")}>
                {message.metadata.address}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card Message Component
  function CardMessage({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const cardMeta = (message as any)?.metadata || {};
  let contactInfo: any = {
    id: cardMeta?.contactId || '',
    username: cardMeta?.contactUsername || '',
    name: cardMeta?.contactName || cardMeta?.contactUsername || message.content || '联系人',
    avatar: cardMeta?.contactAvatar || null
  };

    return (
      <div 
        className={cn(
          "rounded-lg overflow-hidden w-[240px] cursor-pointer hover:opacity-90 transition-opacity",
          isOwn ? "bg-[#38B03B]" : "bg-muted"
        )}
        data-testid={`card-${message.id}`}
      >
        <div className={cn("p-4", isOwn ? "bg-gradient-to-r from-green-600 to-green-500" : "bg-gradient-to-r from-blue-600 to-blue-500")}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border-2 border-white/30 bg-white/20 flex items-center justify-center overflow-hidden">
              {contactInfo.avatar ? (
                <img src={contactInfo.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-full h-full text-white/40" />
              )}
            </div>
            <div>
              <div className="text-white font-semibold text-lg">{contactInfo.name}</div>
              {contactInfo.username && (
                <div className="text-white/70 text-sm">@{contactInfo.username}</div>
              )}
            </div>
          </div>
        </div>
        <div className={cn("p-3 text-center", isOwn ? "bg-green-50 dark:bg-green-900/20" : "bg-blue-50 dark:bg-blue-900/20")}>
          <p className={cn("text-xs font-medium", isOwn ? "text-green-700 dark:text-green-300" : "text-blue-700 dark:text-blue-300")}>点击添加朋友</p>
        </div>
      </div>
    );
  }

  // Call Record Message Component
  function CallRecordMessage({ message, isOwn }: { message: Message; isOwn: boolean }) {
  // 优先从 metadata 获取通话信息
  let isVideo = message.metadata?.callType === 'video';
  let duration = message.metadata?.duration || 0;
  let status = message.metadata?.status || 'initiated';
  
  // 如果没有 metadata，从 content 解析（兼容旧消息）
  if (!message.metadata) {
    try {
      const parsed = JSON.parse(message.content);
      isVideo = parsed.callType === 'video';
      duration = parsed.duration || 0;
      status = parsed.status || 'initiated';
    } catch {
      isVideo = message.content?.includes('video') || message.content?.includes('视频');
      const durationMatch = message.content?.match(/(\d+)s?/);
      duration = durationMatch ? parseInt(durationMatch[1]) : 0;
    }
  }

  // 格式化时长
  const formatCallDuration = (seconds: number) => {
    if (seconds === 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return ` ${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return ` ${secs}s`;
  };

  // 获取状态显示
  const getStatusText = () => {
    switch (status) {
      case 'answered': return t('liaoliao.callAnswered');
      case 'missed': return t('liaoliao.callMissed');
      case 'rejected': return t('liaoliao.callRejected');
      case 'cancelled': return t('liaoliao.callCancelled');
      case 'failed': return t('liaoliao.callFailed');
      default: return isVideo ? t('liaoliao.videoCall') : t('liaoliao.voiceCall');
    }
  };

    return (
      <div 
        className={cn(
          "rounded-lg p-3 min-w-[200px] flex items-center gap-3",
          isOwn ? "bg-white/10" : "bg-primary/10"
        )}
        data-testid={`call-${message.id}`}
      >
        {isVideo ? (
          <Video className={cn("w-5 h-5 flex-shrink-0", isOwn ? "text-white" : "text-primary")} />
        ) : (
          <Phone className={cn("w-5 h-5 flex-shrink-0", isOwn ? "text-white" : "text-primary")} />
        )}
        <div className="flex-1">
          <p className={cn("text-sm", isOwn ? "text-white" : "text-foreground")}>
            {getStatusText()}{formatCallDuration(duration)}
          </p>
        </div>
      </div>
    );
  }
}
