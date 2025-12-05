import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, X, ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ChatConversation {
  id: number;
  storeId: number;
  consumerId: number;
  lastMessageAt: string;
  createdAt: string;
  consumer: {
    id: number;
    displayName: string;
    avatarUrl: string | null;
  };
  lastMessage?: {
    content: string;
    senderType: 'consumer' | 'merchant';
    createdAt: string;
  };
  unreadCount: number;
}

interface ChatMessage {
  id: number;
  conversationId: number;
  senderType: 'consumer' | 'merchant';
  senderId: number;
  content: string;
  readAt: string | null;
  createdAt: string;
}

interface MerchantChatFloatingButtonProps {
  storeId: number;
}

export function MerchantChatFloatingButton({ storeId }: MerchantChatFloatingButtonProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { data: conversationsData, refetch: refetchConversations } = useQuery<{ success: boolean; data: ChatConversation[] }>({
    queryKey: ['/api/chat/merchant/conversations', storeId],
    enabled: !!storeId && !!user,
    refetchInterval: isOpen ? 10000 : 30000,
  });

  const conversations = conversationsData?.data || [];
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const { data: messagesData, refetch: refetchMessages } = useQuery<{ success: boolean; data: ChatMessage[] }>({
    queryKey: ['/api/chat/conversations', selectedConversation?.id, 'messages'],
    enabled: !!selectedConversation?.id,
    refetchInterval: selectedConversation ? 5000 : false,
  });

  const messages = messagesData?.data || [];

  useEffect(() => {
    if (selectedConversation && messagesData?.success) {
      apiRequest('POST', `/api/chat/conversations/${selectedConversation.id}/read`)
        .then(() => refetchConversations())
        .catch(() => {});
    }
  }, [selectedConversation, messagesData]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      await apiRequest('POST', `/api/chat/conversations/${selectedConversation.id}/messages`, {
        content: messageInput.trim(),
      });
      setMessageInput('');
      refetchMessages();
      refetchConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('chat.justNow') || '刚刚';
    if (diffMins < 60) return `${diffMins}${t('chat.minutesAgo') || '分钟前'}`;
    if (diffHours < 24) return `${diffHours}${t('chat.hoursAgo') || '小时前'}`;
    if (diffDays < 7) return `${diffDays}${t('chat.daysAgo') || '天前'}`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <>
      <div 
        className="fixed bottom-24 right-4 z-50"
        data-testid="merchant-chat-floating-button"
      >
        <Button
          size="icon"
          className="w-14 h-14 rounded-full bg-[#38B03B] hover:bg-[#2d9030] shadow-lg relative"
          onClick={() => setIsOpen(true)}
          data-testid="button-open-merchant-chat"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col" data-testid="merchant-chat-panel">
          {!selectedConversation ? (
            <>
              <header className="flex items-center gap-3 p-4 border-b border-border">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  data-testid="button-close-chat-panel"
                >
                  <X className="w-5 h-5" />
                </Button>
                <h1 className="text-lg font-semibold flex-1">{t('chat.customerService') || '客服消息'}</h1>
                <Badge variant="secondary" className="text-xs">
                  {conversations.length} {t('chat.conversations') || '条对话'}
                </Badge>
              </header>

              <ScrollArea className="flex-1">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                    <p>{t('chat.noConversations') || '暂无客户消息'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        className="w-full flex items-center gap-3 p-4 hover-elevate active-elevate-2 text-left"
                        onClick={() => setSelectedConversation(conv)}
                        data-testid={`conversation-item-${conv.id}`}
                      >
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={conv.consumer.avatarUrl || undefined} />
                            <AvatarFallback className="bg-muted">
                              {conv.consumer.displayName?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {conv.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1">
                              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              {conv.consumer.displayName || t('chat.anonymousUser') || '匿名用户'}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : formatTime(conv.createdAt)}
                            </span>
                          </div>
                          {conv.lastMessage && (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {conv.lastMessage.senderType === 'merchant' && (
                                <span className="text-[#38B03B]">[{t('chat.you') || '你'}] </span>
                              )}
                              {conv.lastMessage.content}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <>
              <header className="flex items-center gap-3 p-4 border-b border-border">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSelectedConversation(null)}
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedConversation.consumer.avatarUrl || undefined} />
                  <AvatarFallback className="bg-muted">
                    {selectedConversation.consumer.displayName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="font-semibold truncate">
                    {selectedConversation.consumer.displayName || t('chat.anonymousUser') || '匿名用户'}
                  </h1>
                </div>
              </header>

              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <p className="text-sm">{t('chat.startConversation') || '发送消息开始对话吧'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderType === 'merchant' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            msg.senderType === 'merchant'
                              ? 'bg-[#38B03B] text-white rounded-br-sm'
                              : 'bg-muted text-foreground rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${
                            msg.senderType === 'merchant' ? 'text-white/70' : 'text-muted-foreground'
                          }`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={t('chat.inputPlaceholder') || '输入消息...'}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1"
                    data-testid="input-merchant-message"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || isSending}
                    className="bg-[#38B03B] hover:bg-[#2d9030]"
                    data-testid="button-send-merchant-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
