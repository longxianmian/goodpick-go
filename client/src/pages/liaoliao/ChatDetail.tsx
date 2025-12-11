import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Image, Mic, MoreVertical } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';

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

export default function LiaoliaoChatDetail() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ friendId: string }>();
  const friendId = parseInt(params.friendId || '0');
  
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    mutationFn: async (content: string) => {
      return apiRequest('POST', '/api/liaoliao/messages', {
        toUserId: friendId,
        content,
        messageType: 'text',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/messages', friendId] });
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/chats'] });
      setInputValue('');
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || sendMutation.isPending) return;
    sendMutation.mutate(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-2 py-2 flex items-center gap-2">
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

      <footer className="sticky bottom-0 bg-background border-t px-3 py-2 pb-safe">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" data-testid="button-attach-image">
            <Image className="w-5 h-5" />
          </Button>
          <Button size="icon" variant="ghost" data-testid="button-voice-message">
            <Mic className="w-5 h-5" />
          </Button>
          
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('liaoliao.typeMessage')}
            className="flex-1"
            data-testid="input-message"
          />
          
          <Button 
            size="icon"
            disabled={!inputValue.trim() || sendMutation.isPending}
            onClick={handleSend}
            data-testid="button-send-message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
