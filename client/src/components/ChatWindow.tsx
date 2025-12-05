import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Send, Loader2, Store as StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChatMessage {
  id: number;
  conversationId: number;
  senderType: 'consumer' | 'merchant' | 'ai_agent';
  senderId: number;
  messageType: 'text' | 'image' | 'product' | 'coupon';
  content: string;
  imageUrl?: string;
  createdAt: string;
}

interface ConversationInfo {
  id: number;
  storeId: number;
  storeName: string;
  storeImageUrl?: string;
  status: string;
}

interface ChatWindowProps {
  storeId: number;
  storeName: string;
  storeImageUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatWindow({ storeId, storeName, storeImageUrl, isOpen, onClose }: ChatWindowProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/chat/conversations', { storeId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setConversationId(data.data.id);
      }
    },
  });

  useEffect(() => {
    if (isOpen && !conversationId) {
      createConversationMutation.mutate();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const { data: messagesData, isLoading: messagesLoading } = useQuery<{ success: boolean; data: ChatMessage[] }>({
    queryKey: ['/api/chat/conversations', conversationId, 'messages'],
    enabled: !!conversationId && isOpen,
    refetchInterval: 3000,
  });

  const messages = messagesData?.data || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', `/api/chat/conversations/${conversationId}/messages`, {
        content,
        messageType: 'text',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/conversations', conversationId, 'messages'] });
      setInputValue('');
    },
  });

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !conversationId || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <header className="flex items-center gap-3 p-3 border-b border-border bg-card">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          data-testid="button-chat-close"
        >
          <X className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={storeImageUrl} alt={storeName} />
          <AvatarFallback>
            <StoreIcon className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="font-medium truncate">{storeName}</h2>
          <p className="text-xs text-muted-foreground">{t('chat.merchantCustomerService')}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {createConversationMutation.isPending || messagesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-1/2 ml-auto" />
            <Skeleton className="h-12 w-2/3" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <Avatar className="w-16 h-16 mx-auto mb-4">
              <AvatarImage src={storeImageUrl} alt={storeName} />
              <AvatarFallback>
                <StoreIcon className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <h3 className="font-medium mb-1">{storeName}</h3>
            <p className="text-sm text-muted-foreground">{t('chat.startConversation')}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === 'consumer' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 ${
                  msg.senderType === 'consumer'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.messageType === 'text' && (
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                )}
                {msg.messageType === 'image' && msg.imageUrl && (
                  <img src={msg.imageUrl} alt="" className="max-w-full rounded" />
                )}
                <span className="text-[10px] opacity-70 mt-1 block">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.inputPlaceholder')}
            className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            disabled={!conversationId || sendMessageMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || !conversationId || sendMessageMutation.isPending}
            data-testid="button-chat-send"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
