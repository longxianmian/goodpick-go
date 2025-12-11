import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSimpleRealtimeContext } from '@/contexts/simple-realtime-context';
import { useCallContext } from '@/contexts/call-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  MoreVertical,
  Mic,
  Smile,
  Plus,
  Send,
  Video
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessageList } from '@/components/ui/chat-message-list';
import { ChatActionPanel } from '@/components/ui/chat-action-panel';
import { StickerPanel } from '@/components/ui/sticker-panel';
import { ChatComposer } from '@/components/ui/chat-composer';
import { GuestUpgradeDialog } from '@/components/ui/guest-upgrade-dialog';
import { ForwardModal } from '@/components/ui/message-context-menu';
import { BusinessCardModal, ContactInfo } from '@/components/ui/business-card-modal';
import { CallOverlay } from '@/components/CallOverlay';
import { RealtimeVoiceChat } from '@/components/RealtimeVoiceChat';
import { DigitalHumanChatPanel } from '@/components/digital-human/DigitalHumanChatPanel';
import { useCall } from '@/hooks/use-call';
import { User, Message, ChatState, Friend } from '@/types';
import { t } from '@/lib/i18n';
import { useChatMessages } from '@/hooks/use-chat-messages';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { useRealtimeSTT } from '@/hooks/use-realtime-stt';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { soundManager } from '@/utils/soundManager';
import { SiWhatsapp, SiLine, SiMessenger, SiInstagram } from 'react-icons/si';
import { useIOSKeyboardAdapter, useIOSInputFocus } from '@/hooks/use-ios-keyboard';
import type { CallOfferPayload, CallAnswerPayload, CallIceCandidatePayload, CallEndPayload } from '@shared/voiceCall';

interface MessageWithUser extends Message {
  fromUser: User;
  translations?: any[];
}

interface ChatPageProps {
  currentUser: User;
  chatState: ChatState;
  typingUsers: string[];
  onSendMessage: (content: string, messageType?: string) => void;
  onTyping: (isTyping: boolean) => void;
  onBack: () => void;
  onShowChatInfo?: () => void;
  isConnected?: boolean;
  reconnectAttempts?: number;
  hideHeader?: boolean; // 允许隐藏头部（Trustalk 使用）
  onNavigateToVoiceSetup?: () => void; // 导航到语音设置页面
  pendingIncomingCall?: {
    callId: string;
    fromUserId: string;
    callType: 'voice' | 'video';
    callerName: string;
    callerAvatar?: string;
    sdp: string;
  } | null;
  onClearPendingCall?: () => void;
}

export function ChatPage({ 
  currentUser, 
  chatState, 
  typingUsers,
  onSendMessage, 
  onTyping,
  onBack,
  onShowChatInfo,
  isConnected = true,
  reconnectAttempts = 0,
  hideHeader = false,
  onNavigateToVoiceSetup,
  pendingIncomingCall,
  onClearPendingCall
}: ChatPageProps) {
  const { sendMessage, isConnected: wsConnected, typingUsers: realtimeTypingUsers, addMessageHandler, removeMessageHandler } = useSimpleRealtimeContext();
  const { incomingCall, clearIncomingCall } = useCallContext();
  
  const currentChatTypingUsers = realtimeTypingUsers[chatState.targetId || ''] || [];
  
  // Chat messages with pagination - 数字人模式下禁用，使用专用的 DigitalHumanChatPanel
  const {
    messages,
    isLoading: isLoadingMessages,
    isLoadingMore,
    hasMore,
    loadMore,
    addMessage
  } = useChatMessages({
    userId: currentUser.id,
    targetId: chatState.targetId || '',
    isGroup: chatState.targetType === 'group',
    enabled: !!chatState.targetId && !chatState.isDigitalHuman
  });

  // 自动播放收到的语音消息（数字人和好友都自动播放）
  useEffect(() => {
    if (messages.length === 0) {
      prevMessagesLengthRef.current = messages.length;
      return;
    }
    
    // 检测是否有新消息
    if (messages.length > prevMessagesLengthRef.current) {
      const newestMessage = messages[messages.length - 1];
      
      // 如果是收到的语音消息（非自己发送的），自动播放
      if (
        newestMessage && 
        newestMessage.messageType === 'audio' && 
        newestMessage.fromUserId !== currentUser.id
      ) {
        setAutoPlayMessageId(newestMessage.id);
        
        // 5秒后清除autoPlayMessageId，避免重复播放
        setTimeout(() => {
          setAutoPlayMessageId(null);
        }, 5000);
      }
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages, currentUser.id]);

  // 检查用户是否是游客（username 以 'guest_' 开头）
  const isGuestUser = currentUser?.username?.startsWith('guest_') ?? true;
  
  // 获取好友列表用于转发功能
  const { data: friendsList = [] } = useQuery<Friend[]>({
    queryKey: ['/api/friends'],
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Mark chat as read and join group when entering the chat
  useEffect(() => {
    const markChatAsRead = async () => {
      if (chatState.targetId && currentUser.id) {
        const queryKey = chatState.targetType === 'group' ? ['/api/groups'] : ['/api/friends'];
        
        // 保存当前缓存用于回滚
        const previousData = queryClient.getQueryData(queryKey);
        
        // 乐观更新：立即将未读计数设为0
        queryClient.setQueryData(queryKey, (oldData: any[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(item => 
            item.id === chatState.targetId 
              ? { ...item, unreadCount: 0 }
              : item
          );
        });
        
        try {
          await apiRequest(`/api/chats/${chatState.targetId}/mark-read`, {
            method: 'POST',
            body: { chatType: chatState.targetType }
          });
        } catch (error) {
          console.error('Failed to mark chat as read:', error);
          // API 失败时回滚缓存
          if (previousData) {
            queryClient.setQueryData(queryKey, previousData);
          }
        }
      }
    };

    const joinGroupIfNeeded = () => {
      if (chatState.targetType === 'group' && chatState.targetId) {
        sendMessage({
          type: 'joinGroup',
          groupId: chatState.targetId
        });
      }
    };

    markChatAsRead();
    joinGroupIfNeeded();

    return () => {
      if (chatState.targetType === 'group' && chatState.targetId) {
        sendMessage({
          type: 'leaveGroup',
          groupId: chatState.targetId
        });
      }
    };
  }, [chatState.targetId, chatState.targetType, currentUser.id]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // 清空输入框并重置高度
  const clearInput = useCallback(() => {
    setInputValue('');
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = '44px';
      }
    }, 0);
  }, []);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [isDHSending, setIsDHSending] = useState(false); // 数字人消息发送状态
  const [autoPlayMessageId, setAutoPlayMessageId] = useState<string | null>(null); // 自动播放的语音消息ID
  const prevMessagesLengthRef = useRef(0); // 跟踪消息数量变化
  
  // 长按菜单相关状态
  const [quotedMessage, setQuotedMessage] = useState<MessageWithUser | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<MessageWithUser | null>(null);
  const [showBusinessCardModal, setShowBusinessCardModal] = useState(false);
  const [showRealtimeVoiceChat, setShowRealtimeVoiceChat] = useState(false); // 实时语音通话UI
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const sttSentRef = useRef(false); // 标记STT结果是否已发送，避免重复
  
  // 查询用户语音能力（用于判断是否显示实时语音按钮）
  const { data: voiceCapabilities } = useQuery<{
    hasVoiceChat: boolean;
    hasRealtimeVoice: boolean;
    hasVideoCall: boolean;
  }>({
    queryKey: ['/api/user/voice-capabilities'],
    enabled: !!currentUser?.id && chatState.isDigitalHuman,
    staleTime: 5 * 60 * 1000,
  });

  // P2P 语音/视频通话
  const {
    callState,
    localStream,
    remoteStream,
    startCall,
    handleIncomingCall,
    acceptCall,
    rejectCall,
    endCall,
    handleCallAnswer,
    handleIceCandidate,
    handleCallEnd,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useCall({
    currentUserId: currentUser.id,
    sendMessage: (msg) => {
      sendMessage(msg);
      return true;
    },
    onCallEnded: (reason) => {
      toast({
        title: reason === 'rejected' ? '对方拒绝了通话' :
               reason === 'busy' ? '对方正忙' :
               reason === 'offline' ? '对方不在线' :
               reason === 'timeout' ? '通话超时' :
               '通话已结束',
      });
    },
    onSaveCallRecord: async (peerId, callData) => {
      try {
        // 构建通话记录消息内容
        const callRecordContent = JSON.stringify({
          callType: callData.callType,
          status: callData.status,
          duration: callData.duration,
          timestamp: callData.timestamp,
        });
        
        // 通过 API 保存通话记录为消息
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromUserId: currentUser.id,
            toUserId: peerId,
            content: callRecordContent,
            messageType: 'call',
          }),
        });
        
        if (response.ok) {
          console.log('[chat] Call record saved successfully');
          // 刷新消息列表
          queryClient.invalidateQueries({ queryKey: ['/api/messages', peerId] });
        } else {
          console.error('[chat] Failed to save call record:', await response.text());
        }
      } catch (error) {
        console.error('[chat] Error saving call record:', error);
      }
    },
  });
  
  const inputContainerRef = useIOSKeyboardAdapter(0);
  const inputRef = useIOSInputFocus() as React.RefObject<HTMLInputElement>;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { toast } = useToast();

  // 语音输入功能
  const voiceRecorder = useVoiceRecorder();
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceProcessingMessage, setVoiceProcessingMessage] = useState('');
  const prevRecordingStateRef = useRef(false);

  // 流式语音识别 - 后端处理后返回完整句子
  const {
    isRecording: isRealtimeRecording,
    startRecording: startRealtimeRecording,
    stopRecording: stopRealtimeRecording,
    isConnected: sttConnected
  } = useRealtimeSTT({
    onInterimResult: (text) => {
      // 如果已发送，忽略结果（避免发送后又出现重复文本）
      if (sttSentRef.current) {
        return;
      }
      if (text) {
        setInputValue(text);
        requestAnimationFrame(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 120);
            textarea.style.height = newHeight + 'px';
            // 始终滚动到底部，确保最新输入可见
            textarea.scrollTop = textarea.scrollHeight;
          }
        });
      }
    },
    onFinalResult: (text) => {
      // 如果已发送，忽略最终结果（避免发送后又出现重复文本）
      if (sttSentRef.current) {
        sttSentRef.current = false;
        return;
      }
      if (text.trim()) {
        setInputValue(text.trim());
        requestAnimationFrame(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 120);
            textarea.style.height = newHeight + 'px';
            // 始终滚动到底部，确保最新输入可见
            textarea.scrollTop = textarea.scrollHeight;
          }
        });
      }
    },
    onError: (error) => {
      console.error('STT错误:', error);
      toast({
        title: "语音识别失败",
        description: error,
        variant: "destructive",
      });
    }
  });

  // 处理全局来电（从 CallContext 接收）- 当在聊天页时直接处理
  useEffect(() => {
    if (incomingCall && incomingCall.payload.fromUserId === chatState.targetId) {
      // 只有当来电者是当前聊天对象时才在这里处理
      handleIncomingCall(incomingCall.payload, incomingCall.callerName, incomingCall.callerAvatar);
      clearIncomingCall();
    }
  }, [incomingCall, handleIncomingCall, clearIncomingCall, chatState.targetId]);

  // 处理从 IncomingCallOverlay 接听的来电（用户点击了接听按钮）
  useEffect(() => {
    if (pendingIncomingCall && pendingIncomingCall.fromUserId === chatState.targetId) {
      // 用户已点击接听，立即处理来电
      const payload: CallOfferPayload = {
        callId: pendingIncomingCall.callId,
        fromUserId: pendingIncomingCall.fromUserId,
        toUserId: currentUser.id,
        callType: pendingIncomingCall.callType,
        sdp: pendingIncomingCall.sdp,
        createdAt: new Date().toISOString(),
      };
      handleIncomingCall(payload, pendingIncomingCall.callerName, pendingIncomingCall.callerAvatar);
      // 自动接听（因为用户已在 IncomingCallOverlay 点击了接听）
      setTimeout(() => {
        acceptCall();
      }, 100);
      onClearPendingCall?.();
    }
  }, [pendingIncomingCall, chatState.targetId, currentUser.id, handleIncomingCall, acceptCall, onClearPendingCall]);

  // 监听 WebSocket 通话信令消息（call-offer 已移到全局 CallContext）
  useEffect(() => {
    const handleCallSignal = (msg: any) => {
      switch (msg.type) {
        case 'call-answer':
          // 对方接听
          const answerPayload = msg.payload as CallAnswerPayload;
          if (answerPayload.toUserId === currentUser.id) {
            handleCallAnswer(answerPayload);
          }
          break;
        case 'call-ice-candidate':
          // ICE 候选
          const icePayload = msg.payload as CallIceCandidatePayload;
          if (icePayload.toUserId === currentUser.id) {
            handleIceCandidate(icePayload);
          }
          break;
        case 'call-end':
        case 'call-reject':
        case 'call-busy':
          // 通话结束
          const endPayload = msg.payload as CallEndPayload;
          if (endPayload.toUserId === currentUser.id) {
            handleCallEnd(endPayload);
          }
          break;
      }
    };

    addMessageHandler(handleCallSignal);
    return () => removeMessageHandler(handleCallSignal);
  }, [currentUser.id, addMessageHandler, removeMessageHandler, handleCallAnswer, handleIceCandidate, handleCallEnd]);

  // 发送语音消息的旧函数（保留作为后备）
  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (isProcessingVoice) return;
    
    setIsProcessingVoice(true);
    setVoiceProcessingMessage('🎤 正在识别语音...');
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.webm');
    formData.append('targetUserId', chatState.targetId || '');
    formData.append('groupId', chatState.targetType === 'group' ? chatState.targetId || '' : '');
    
    fetch('/api/voice-input-send', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(result => {
      if (result.success && result.message) {
        addMessage({
          ...result.message,
          fromUser: currentUser,
          translations: []
        });
        soundManager.playSend();
      }
    })
    .catch(error => {
      console.error('语音发送失败:', error);
      toast({
        title: "发送失败",
        description: '语音发送失败，请重试',
        variant: "destructive",
      });
    })
    .finally(() => {
      setIsProcessingVoice(false);
      setVoiceProcessingMessage('');
      voiceRecorder.reset();
    });
  };

  // 监听15秒自动停止，自动发送录音（旧功能后备）
  useEffect(() => {
    const wasRecording = prevRecordingStateRef.current;
    const isRecording = voiceRecorder.isRecording;
    prevRecordingStateRef.current = isRecording;
    
    if (wasRecording && !isRecording && voiceRecorder.duration >= 15 && voiceRecorder.audioBlob) {
      sendVoiceMessage(voiceRecorder.audioBlob);
    }
  }, [voiceRecorder.isRecording, voiceRecorder.duration, voiceRecorder.audioBlob]);

  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showGuestUpgradeDialog, setShowGuestUpgradeDialog] = useState(false);
  const [invitePlatform, setInvitePlatform] = useState<string | undefined>();

  // 获取邀请平台信息
  useEffect(() => {
    const fetchPlatform = async () => {
      try {
        const response = await fetch('/api/auth/session-info');
        const data = await response.json();
        if (data.invitePlatform) {
          setInvitePlatform(data.invitePlatform);
        }
      } catch (error) {
        console.error('Failed to fetch session info:', error);
      }
    };

    if (isGuestUser) {
      fetchPlatform();
    }
  }, [isGuestUser]);

  const handleTypingChange = (isTyping: boolean) => {
    sendMessage({
      type: 'typing',
      isTyping,
      ...(chatState.targetType === 'group' 
        ? { groupId: chatState.targetId }
        : { toUserId: chatState.targetId }
      )
    });
  };

  // 长按菜单回调函数
  const handleQuote = (message: MessageWithUser) => {
    setQuotedMessage(message);
    // 聚焦输入框
    inputRef.current?.focus();
  };

  const handleForward = (message: MessageWithUser) => {
    setForwardMessage(message);
    setShowForwardModal(true);
  };

  // 执行转发消息到选定的好友
  const executeForward = async (friendIds: string[]) => {
    if (!forwardMessage || friendIds.length === 0) return;
    
    try {
      // 转发消息到每个选定的好友
      for (const friendId of friendIds) {
        const tempId = `temp-forward-${Date.now()}-${friendId}`;
        
        // 构建转发消息内容
        let content = forwardMessage.content;
        let messageType = forwardMessage.messageType || 'text';
        let metadata = forwardMessage.metadata;
        
        // 通过 WebSocket 发送消息
        sendMessage({
          type: 'sendMessage',
          content: content,
          clientMessageId: tempId,
          toUserId: friendId,
          messageType: messageType,
          metadata: metadata
        });
      }
      
      toast({ 
        title: `已转发给 ${friendIds.length} 位好友`,
      });
      
      setShowForwardModal(false);
      setForwardMessage(null);
    } catch (error) {
      console.error('转发失败:', error);
      toast({ title: '转发失败', variant: 'destructive' });
    }
  };

  // 发送名片
  const sendBusinessCard = (contact: ContactInfo) => {
    const tempId = `temp-card-${Date.now()}`;
    
    // 构建名片消息的 metadata
    const cardMetadata = {
      contactId: contact.id,
      contactUsername: contact.username,
      contactName: contact.firstName || contact.nickname || contact.username,
      contactAvatar: contact.profileImageUrl
    };
    
    // 通过 WebSocket 发送名片消息
    sendMessage({
      type: 'sendMessage',
      content: JSON.stringify(cardMetadata),
      clientMessageId: tempId,
      ...(chatState.targetType === 'group' 
        ? { groupId: chatState.targetId }
        : { toUserId: chatState.targetId }
      ),
      messageType: 'card',
      metadata: cardMetadata
    });
    
    toast({ title: '名片已发送' });
    setShowBusinessCardModal(false);
  };

  const handleFavorite = async (message: MessageWithUser) => {
    try {
      await apiRequest('/api/favorites', {
        method: 'POST',
        body: { messageId: message.id }
      });
      toast({ title: '已收藏' });
    } catch (error) {
      console.error('收藏失败:', error);
      toast({ title: '收藏失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (message: MessageWithUser) => {
    try {
      await apiRequest(`/api/messages/${message.id}`, {
        method: 'DELETE'
      });
      // 从本地列表移除消息
      queryClient.setQueryData(['/api/messages', chatState.targetId, chatState.targetType === 'group', currentUser.id], (oldData: any) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.filter((msg: any) => msg.id !== message.id)
          }))
        };
      });
      toast({ title: '已删除' });
    } catch (error) {
      console.error('删除失败:', error);
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const clearQuotedMessage = () => {
    setQuotedMessage(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Handle typing indicator
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      handleTypingChange(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      handleTypingChange(false);
    }, 1000);
  };

  // 检测 Google Maps 链接
  const detectGoogleMapsLink = (text: string): { isMapLink: boolean; url: string; address: string } | null => {
    // 匹配各种 Google Maps 链接格式
    const mapPatterns = [
      /https?:\/\/(www\.)?google\.(com|[a-z]{2,3})\/maps\S*/i,
      /https?:\/\/maps\.google\.(com|[a-z]{2,3})\S*/i,
      /https?:\/\/goo\.gl\/maps\/\S*/i,
      /https?:\/\/maps\.app\.goo\.gl\/\S*/i,
    ];
    
    for (const pattern of mapPatterns) {
      const match = text.match(pattern);
      if (match) {
        const url = match[0];
        // 尝试从URL提取地址信息
        let address = '共享位置';
        // 检查URL中是否有地址参数
        const queryMatch = url.match(/query=([^&]+)/);
        const placeMatch = url.match(/place\/([^\/]+)/);
        if (queryMatch) {
          address = decodeURIComponent(queryMatch[1].replace(/\+/g, ' '));
        } else if (placeMatch) {
          address = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
        }
        return { isMapLink: true, url, address };
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 如果正在语音录音，先停止，并标记已发送
    if (isRealtimeRecording) {
      sttSentRef.current = true; // 标记已发送，避免 onFinalResult 重复填充
      stopRealtimeRecording();
    }
    
    if (inputValue.trim()) {
      if (isGuestUser) {
        const newCount = guestMessageCount + 1;
        
        if (newCount > 3) {
          setShowGuestUpgradeDialog(true);
          toast({
            title: "需要登录",
            description: "您已达到游客消息限制，请登录后继续使用",
            variant: "default"
          });
          return;
        }
        
        setGuestMessageCount(newCount);
        
        if (newCount === 3) {
          setShowGuestUpgradeDialog(true);
        }
      }

      const tempId = `temp-${Date.now()}`;
      const messageContent = inputValue.trim();
      
      // 检测是否是 Google Maps 链接
      const mapLinkInfo = detectGoogleMapsLink(messageContent);
      if (mapLinkInfo) {
        const isGroup = chatState.targetType === 'group';
        const chatId = chatState.targetId;
        
        const tempMessage: any = {
          id: tempId,
          content: mapLinkInfo.url,
          fromUserId: currentUser.id,
          toUserId: isGroup ? null : chatId,
          groupId: isGroup ? chatId : null,
          messageType: 'location',
          metadata: {
            mapUrl: mapLinkInfo.url,
            address: mapLinkInfo.address
          },
          createdAt: new Date(),
          isRead: false,
          fromUser: currentUser
        };
        
        // 乐观更新 UI
        queryClient.setQueryData(['/api/messages', chatId, isGroup, currentUser.id], (oldData: any) => {
          if (!oldData?.pages) {
            return {
              pages: [{ messages: [tempMessage], hasMore: false }],
              pageParams: [undefined]
            };
          }
          const updatedPages = [...oldData.pages];
          updatedPages[0] = {
            ...updatedPages[0],
            messages: [...(updatedPages[0]?.messages || []), tempMessage]
          };
          return { ...oldData, pages: updatedPages };
        });
        
        sendMessage({
          type: 'sendMessage',
          content: mapLinkInfo.url,
          clientMessageId: tempId,
          ...(isGroup 
            ? { groupId: chatId }
            : { toUserId: chatId }
          ),
          messageType: 'location',
          metadata: {
            mapUrl: mapLinkInfo.url,
            address: mapLinkInfo.address
          }
        });
        
        clearInput();
        soundManager.playSend();
        return;
      }
      
      const isGroup = chatState.targetType === 'group';
      const chatId = chatState.targetId;
      
      // 数字人聊天：跳过，由 DigitalHumanChatPanel 独立处理
      if (chatState.isDigitalHuman) {
        return;
      }
      
      // 普通聊天：使用WebSocket
      // Create temp message for optimistic UI
      const tempMessage = {
        id: tempId,
        content: messageContent,
        fromUserId: currentUser.id,
        toUserId: isGroup ? null : chatId,
        groupId: isGroup ? chatId : null,
        messageType: 'text',
        originalLanguage: currentUser.languagePreference || 'zh',
        createdAt: new Date(),
        isRead: false,
        fromUser: currentUser,
        replyToMessageId: quotedMessage?.id || null,
        replyToMessage: quotedMessage ? {
          id: quotedMessage.id,
          content: quotedMessage.content,
          messageType: quotedMessage.messageType,
          fromUserId: quotedMessage.fromUserId,
          fromUser: quotedMessage.fromUser
        } : null
      };
      
      queryClient.setQueryData(['/api/messages', chatId, isGroup, currentUser.id], (oldData: any) => {
        if (!oldData?.pages) {
          return {
            pages: [{ messages: [tempMessage], hasMore: false }],
            pageParams: [undefined]
          };
        }
        
        // 添加到第一页
        const updatedPages = [...oldData.pages];
        updatedPages[0] = {
          ...updatedPages[0],
          messages: [...(updatedPages[0]?.messages || []), tempMessage]
        };
        
        return {
          ...oldData,
          pages: updatedPages
        };
      });
      
      const success = sendMessage({
        type: 'sendMessage',
        content: messageContent,
        clientMessageId: tempId,
        ...(isGroup 
          ? { groupId: chatId }
          : { toUserId: chatId }
        ),
        messageType: 'text',
        replyToMessageId: quotedMessage?.id || undefined
      });
      
      if (success) {
        soundManager.playSend();
        
        clearInput();
        setQuotedMessage(null); // 清除引用消息
        // Clear typing state
        setIsTyping(false);
        handleTypingChange(false);
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/messages', chatId, isGroup, currentUser.id] });
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleActionPanelSelect = (action: 'gallery' | 'camera' | 'location' | 'voice-call' | 'file' | 'favorites' | 'card' | 'video-call') => {
    switch (action) {
      case 'gallery':
        // 打开相册选择
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            handleFileUpload(file, 'image');
          }
        };
        fileInput.click();
        break;
        
      case 'camera':
        // 打开摄像头拍照
        const cameraInput = document.createElement('input');
        cameraInput.type = 'file';
        cameraInput.accept = 'image/*';
        cameraInput.capture = 'environment';
        cameraInput.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            handleFileUpload(file, 'image');
          }
        };
        cameraInput.click();
        break;
        
      case 'voice-call':
        // 语音通话：数字人用GPT实时语音，普通好友用P2P
        if (chatState.targetType === 'group') {
          toast({ title: '暂不支持群组通话', variant: 'destructive' });
          return;
        }
        
        // 如果是数字人且有实时语音能力，启动GPT实时语音
        if (chatState.isDigitalHuman && voiceCapabilities?.hasRealtimeVoice) {
          setShowRealtimeVoiceChat(true);
          setShowActionPanel(false);
          return;
        }
        
        // 如果是数字人但没有实时语音能力
        if (chatState.isDigitalHuman) {
          toast({ 
            title: '暂无实时语音能力', 
            description: '请扫码激活实时语音通话功能',
            variant: 'destructive' 
          });
          return;
        }
        
        // 普通好友：P2P语音通话
        startCall(
          chatState.targetId || '',
          chatState.targetName || '',
          chatState.targetAvatar,
          'voice'
        );
        break;
        
      case 'location':
        // 发送位置 - 生成 Google Maps 链接
        if (navigator.geolocation) {
          toast({ title: '正在获取位置...' });
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              // 生成 Google Maps 链接（支持导航）
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
              
              const tempId = `temp_${Date.now()}`;
              const isGroup = chatState.targetType === 'group';
              const chatId = chatState.targetId;
              
              // 创建临时消息用于立即显示
              const tempMessage: any = {
                id: tempId,
                content: googleMapsUrl,
                fromUserId: currentUser.id,
                toUserId: isGroup ? null : chatId,
                groupId: isGroup ? chatId : null,
                messageType: 'location',
                metadata: {
                  mapUrl: googleMapsUrl,
                  address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                  lat: latitude,
                  lng: longitude
                },
                createdAt: new Date(),
                isRead: false,
                fromUser: currentUser
              };
              
              // 乐观更新 UI
              queryClient.setQueryData(['/api/messages', chatId, isGroup, currentUser.id], (oldData: any) => {
                if (!oldData?.pages) {
                  return {
                    pages: [{ messages: [tempMessage], hasMore: false }],
                    pageParams: [undefined]
                  };
                }
                const updatedPages = [...oldData.pages];
                updatedPages[0] = {
                  ...updatedPages[0],
                  messages: [...(updatedPages[0]?.messages || []), tempMessage]
                };
                return { ...oldData, pages: updatedPages };
              });
              
              sendMessage({
                type: 'sendMessage',
                content: googleMapsUrl,
                clientMessageId: tempId,
                ...(isGroup 
                  ? { groupId: chatId }
                  : { toUserId: chatId }
                ),
                messageType: 'location',
                metadata: {
                  mapUrl: googleMapsUrl,
                  address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                  lat: latitude,
                  lng: longitude
                }
              });
              
              soundManager.playSend();
              toast({ title: '位置已发送' });
            },
            (error) => {
              console.error('获取位置失败:', error);
              toast({ 
                title: '获取位置失败', 
                description: '请检查位置权限设置',
                variant: 'destructive' 
              });
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        } else {
          toast({ 
            title: '不支持定位', 
            description: '您的浏览器不支持地理位置功能',
            variant: 'destructive' 
          });
        }
        break;
        
      case 'file':
        // 选择文件
        const docInput = document.createElement('input');
        docInput.type = 'file';
        docInput.accept = '*/*';
        docInput.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            handleFileUpload(file, 'file');
          }
        };
        docInput.click();
        break;
        
      case 'favorites':
        // 打开收藏夹
        alert(t('favoritesNotImplemented'));
        break;
        
      case 'card':
        // 打开名片选择弹窗
        setShowBusinessCardModal(true);
        break;
        
      case 'video-call':
        // P2P 视频通话
        if (chatState.targetType === 'group') {
          toast({ title: '暂不支持群组视频通话', variant: 'destructive' });
          return;
        }
        startCall(
          chatState.targetId || '',
          chatState.targetName || '',
          chatState.targetAvatar,
          'video'
        );
        break;
    }
    // 关闭面板（对所有操作都适用）
    setShowActionPanel(false);
  };

  const handleFileUpload = async (file: File, type: 'image' | 'file') => {
    const fileName = file.name;
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    
    try {
      // 生成clientMessageId用于前端匹配
      const clientMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      if (type === 'image') {
        const { compressImageForChat, uploadImageWithThumbnail } = await import('@/utils/imageCompression');
        
        // 1. 生成缩略图
        const compressed = await compressImageForChat(file);
        
        const uploadResult = await uploadImageWithThumbnail(compressed);
        
        sendMessage({
          type: 'sendMessage',
          content: uploadResult.thumbnailUrl, // 消息内容使用缩略图URL
          ...(chatState.targetType === 'group' 
            ? { groupId: chatState.targetId }
            : { toUserId: chatState.targetId }
          ),
          messageType: 'image',
          metadata: {
            thumbnailKey: uploadResult.thumbnailKey,
            thumbnailUrl: uploadResult.thumbnailUrl,
            thumbnailSize: uploadResult.thumbnailSize,
            fullKey: uploadResult.fullKey,
            fullUrl: uploadResult.fullUrl,
            fullSize: uploadResult.fullSize,
            width: uploadResult.width,
            height: uploadResult.height
          },
          clientMessageId
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload/file', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`上传失败: ${response.statusText}`);
        }
        
        const data = await response.json();
        const serverUrl = data.url || data.fileUrl;
        
        if (!serverUrl) {
          throw new Error('服务器未返回文件URL');
        }
        
        sendMessage({
          type: 'sendMessage',
          content: `📎 ${fileName} (${fileSize}MB)\n${serverUrl}`,
          ...(chatState.targetType === 'group' 
            ? { groupId: chatState.targetId }
            : { toUserId: chatState.targetId }
          ),
          messageType: 'file',
          metadata: { fileName, fileSize, fileUrl: serverUrl },
          clientMessageId
        });
      }
      
      toast({
        title: "上传成功",
        description: `${fileName} 已上传`,
      });
    } catch (error: any) {
      console.error('文件上传失败:', error);
      toast({
        title: "上传失败",
        description: error.message || '文件上传失败，请重试',
        variant: "destructive",
      });
    }
  };


  // 获取渠道显示名称 - 使用i18n翻译
  const getChannelDisplayName = (channel?: string): string => {
    if (!channel || channel === 'mytalk') return '';
    
    // 将 channel 值映射到 i18n 翻译键（驼峰命名）
    const channelKeyMap: Record<string, string> = {
      'whatsapp': 'channelWhatsapp',
      'line': 'channelLine',
      'messenger': 'channelMessenger',
      'igdm': 'channelInstagram'
    };
    
    const translationKey = channelKeyMap[channel];
    return translationKey ? t(translationKey as any) : channel;
  };

  // 语音输入处理 - 流式识别，文字填入输入框
  const handleVoiceInput = async () => {
    if (isProcessingVoice) return;

    // 如果正在流式录音，停止
    if (isRealtimeRecording) {
      stopRealtimeRecording();
      return;
    }

    // 开始流式录音
    try {
      await startRealtimeRecording();
    } catch (error: any) {
      console.error('录音启动失败:', error);
      toast({
        title: "录音失败",
        description: error.message || '无法启动录音，请检查麦克风权限',
        variant: "destructive",
      });
    }
  };


  const handleStickerSelect = (emoji: string) => {
    // 如果输入框有内容，在光标位置插入表情包
    if (inputValue.length > 0) {
      const input = inputRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const newValue = inputValue.slice(0, start) + emoji + inputValue.slice(end);
        setInputValue(newValue);
        
        // 恢复焦点并设置光标位置
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
        
        // 触发打字状态
        setIsTyping(true);
        onTyping(true);
        
        // 重置打字超时
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          onTyping(false);
        }, 1000);
      } else {
        // 回退到简单追加
        setInputValue(inputValue + emoji);
      }
      setShowStickerPanel(false);
      return;
    }
    
    // 输入框为空时，直接发送表情包消息 - 乐观更新
    const tempId = `temp-${Date.now()}`; // 临时ID
    const tempMessage = {
      id: tempId,
      content: emoji,
      fromUserId: currentUser.id,
      toUserId: chatState.targetType === 'friend' ? chatState.targetId : undefined,
      groupId: chatState.targetType === 'group' ? chatState.targetId : undefined,
      messageType: 'sticker' as const,
      createdAt: new Date(),
      isRead: false,
      originalLanguage: undefined,
      fromUser: currentUser
    };
    
    addMessage(tempMessage);
    
    const success = sendMessage({
      type: 'sendMessage',
      content: emoji,
      clientMessageId: tempId,
      ...(chatState.targetType === 'group' 
        ? { groupId: chatState.targetId }
        : { toUserId: chatState.targetId }
      ),
      messageType: 'sticker'
    });
    
    if (success) {
      soundManager.playSend();
    }
    
    setShowStickerPanel(false);
  };


  return (
    <div 
      className="flex flex-col h-full relative overflow-hidden" 
      data-testid="chat-page"
      onContextMenu={(e) => {
        // 阻止浏览器默认右键/长按菜单
        e.preventDefault();
      }}
    >
      {!hideHeader && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900 h-14 px-4 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 hover:bg-slate-800"
                onClick={onBack}
                data-testid="button-back-chat"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </Button>
              
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-lg text-white" data-testid="chat-target-name">
                  {chatState.targetName}
                </h2>
                {chatState.channel && chatState.channel !== 'mytalk' && chatState.channel !== 'digital_human' && (
                  <>
                    <span className="text-sm text-slate-400">·</span>
                    <span className="text-sm text-slate-400">{getChannelDisplayName(chatState.channel)}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 hover:bg-slate-800"
                onClick={onShowChatInfo}
                data-testid="button-more"
              >
                <MoreVertical className="w-5 h-5 text-white" />
              </Button>
            </div>
          </div>
          
          {typingUsers.length > 0 && (
            <div className="mt-1 text-xs text-slate-400">
              <span className="typing-indicator">
                <span className="typing-dot bg-primary/60"></span>
                <span className="typing-dot bg-primary/60"></span>
                <span className="typing-dot bg-primary/60"></span>
                <span className="ml-1">正在输入...</span>
              </span>
            </div>
          )}
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto pb-20", !hideHeader && "pt-[70px]")}>
        {chatState.isDigitalHuman ? (
          <DigitalHumanChatPanel
            chatId={chatState.targetId || ''}
            currentUserId={currentUser.id}
            currentUserLanguage={currentUser.languagePreference || 'zh'}
          />
        ) : (
          <ChatMessageList
            messages={messages}
            currentUser={currentUser}
            typingUsers={typingUsers}
            isLoading={isLoadingMessages}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={loadMore}
            chatTargetName={chatState.targetName || ''}
            chatTargetType={chatState.targetType || 'friend'}
            autoPlayMessageId={autoPlayMessageId || undefined}
            onQuote={handleQuote}
            onForward={handleForward}
            onFavorite={handleFavorite}
            onDelete={handleDelete}
            onCallClick={(callType) => {
              // 点击通话记录时回拨
              if (chatState.targetId && chatState.targetName) {
                startCall(
                  chatState.targetId, 
                  chatState.targetName, 
                  chatState.targetAvatar,
                  callType
                );
              }
            }}
            onCardClick={(contactId) => {
              // 点击名片跳转到用户资料页
              window.location.href = `/profile/${contactId}`;
            }}
          />
        )}
      </div>

      {!chatState.isDigitalHuman && (
        <div ref={inputContainerRef} className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
          <ChatComposer
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={(content) => {
            if (content.trim()) {
              const isGroup = chatState.targetType === 'group';
              const chatId = chatState.targetId;
              const mapLinkInfo = detectGoogleMapsLink(content);
              const tempId = `temp-${Date.now()}`;
              
              if (mapLinkInfo) {
                sendMessage({
                  type: 'sendMessage',
                  content: mapLinkInfo.url,
                  clientMessageId: tempId,
                  ...(isGroup ? { groupId: chatId } : { toUserId: chatId }),
                  messageType: 'location',
                  metadata: { mapUrl: mapLinkInfo.url, address: mapLinkInfo.address }
                });
              } else {
                // 普通文字消息 - 乐观更新 UI
                const tempMessage = {
                  id: tempId,
                  content: content,
                  fromUserId: currentUser.id,
                  toUserId: isGroup ? null : chatId,
                  groupId: isGroup ? chatId : null,
                  messageType: 'text' as const,
                  originalLanguage: currentUser.languagePreference || 'zh',
                  createdAt: new Date(),
                  isRead: false,
                  fromUser: currentUser,
                  replyToMessageId: quotedMessage?.id || null,
                  replyToMessage: quotedMessage ? {
                    id: quotedMessage.id,
                    content: quotedMessage.content,
                    messageType: quotedMessage.messageType,
                    fromUserId: quotedMessage.fromUserId,
                    fromUser: quotedMessage.fromUser
                  } : null
                };
                
                // 乐观更新缓存
                queryClient.setQueryData(['/api/messages', chatId, isGroup, currentUser.id], (oldData: any) => {
                  if (!oldData?.pages) {
                    return {
                      pages: [{ messages: [tempMessage], hasMore: false }],
                      pageParams: [undefined]
                    };
                  }
                  const updatedPages = [...oldData.pages];
                  updatedPages[0] = {
                    ...updatedPages[0],
                    messages: [...(updatedPages[0]?.messages || []), tempMessage]
                  };
                  return { ...oldData, pages: updatedPages };
                });
                
                // 发送 WebSocket 消息
                sendMessage({
                  type: 'sendMessage',
                  content: content,
                  clientMessageId: tempId,
                  ...(isGroup ? { groupId: chatId } : { toUserId: chatId }),
                  messageType: 'text',
                  replyToMessageId: quotedMessage?.id || undefined
                });
                
                // 清除引用消息
                setQuotedMessage(null);
              }
              soundManager.playSend();
            }
          }}
          onShowActionPanel={() => setShowActionPanel(true)}
          onShowStickerPanel={() => setShowStickerPanel(true)}
          onVoiceMessageSend={async (audioBlob, duration) => {
            const targetId = chatState.targetId || '';
            const isGroup = chatState.targetType === 'group';
            
            // 统一使用 /api/voice/message，后端自动识别数字人
            const formData = new FormData();
            formData.append('audio', audioBlob, 'voice.webm');
            formData.append('toId', isGroup ? '' : targetId);
            formData.append('groupId', isGroup ? targetId : '');
            formData.append('duration', String(duration));
            
            const response = await fetch('/api/voice/message', {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            const result = await response.json();
            if (result.success && result.message) {
              addMessage({
                ...result.message,
                fromUser: currentUser,
                translations: []
              });
              soundManager.playSend();
            } else {
              throw new Error(result.message || '发送失败');
            }
          }}
          disabled={isDHSending}
          quotedMessage={quotedMessage}
          onClearQuote={clearQuotedMessage}
          onVoiceInputToggle={handleVoiceInput}
          isRealtimeRecording={isRealtimeRecording}
          sttConnected={sttConnected}
          isProcessingVoice={isProcessingVoice}
          onSubmit={(e) => {
            e?.preventDefault();
            // 如果正在语音录音，先停止
            if (isRealtimeRecording) {
              sttSentRef.current = true;
              stopRealtimeRecording();
            }
            // 发送消息并清空输入框
            if (inputValue.trim()) {
              handleSubmit(e as React.FormEvent);
              setInputValue('');
            }
          }}
            textareaRef={textareaRef}
          />
        </div>
      )}

      {/* 功能面板 */}
      <ChatActionPanel
        isOpen={showActionPanel}
        onClose={() => setShowActionPanel(false)}
        onSelectAction={handleActionPanelSelect}
      />

      {/* 表情包面板 */}
      <StickerPanel
        isOpen={showStickerPanel}
        onClose={() => setShowStickerPanel(false)}
        onSelectSticker={handleStickerSelect}
      />

      {/* 游客登录提示对话框 */}
      <GuestUpgradeDialog
        open={showGuestUpgradeDialog}
        onOpenChange={setShowGuestUpgradeDialog}
        platform={invitePlatform}
      />

      {/* P2P 语音/视频通话界面 */}
      <CallOverlay
        state={callState}
        localStream={localStream}
        remoteStream={remoteStream}
        onAccept={acceptCall}
        onReject={rejectCall}
        onHangup={() => endCall('hungup')}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSwitchCamera={switchCamera}
      />

      {/* 数字人实时语音通话界面（OpenAI Realtime API） */}
      {showRealtimeVoiceChat && (
        <RealtimeVoiceChat
          targetName={chatState.targetName || '数字人'}
          targetAvatar={chatState.targetAvatar}
          voice="shimmer"
          onClose={() => setShowRealtimeVoiceChat(false)}
        />
      )}

      {/* 转发消息弹窗 */}
      {showForwardModal && forwardMessage && (
        <ForwardModal
          isOpen={showForwardModal}
          onClose={() => {
            setShowForwardModal(false);
            setForwardMessage(null);
          }}
          message={forwardMessage}
          friends={friendsList.map(f => ({
            id: f.id,
            firstName: f.firstName || f.nickname,
            username: f.username,
            profileImageUrl: f.profileImageUrl
          }))}
          onForward={executeForward}
        />
      )}

      {/* 名片选择弹窗 */}
      <BusinessCardModal
        isOpen={showBusinessCardModal}
        onClose={() => setShowBusinessCardModal(false)}
        currentUser={{
          id: currentUser.id,
          username: currentUser.username,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          nickname: currentUser.nickname,
          profileImageUrl: currentUser.profileImageUrl
        }}
        friends={friendsList.map(f => ({
          id: f.id,
          username: f.username,
          firstName: f.firstName,
          nickname: f.nickname,
          profileImageUrl: f.profileImageUrl
        }))}
        onSendCard={sendBusinessCard}
      />
    </div>
  );
}
