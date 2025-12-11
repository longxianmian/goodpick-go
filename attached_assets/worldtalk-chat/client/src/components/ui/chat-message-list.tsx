import { useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChatBubble } from '@/components/ui/chat-bubble';
import { Loader2 } from 'lucide-react';
import { Message, User } from '@/types';
import { t } from '@/lib/i18n';

interface MessageWithUser extends Message {
  fromUser: User;
  translations?: any[];
}

interface ChatMessageListProps {
  messages: MessageWithUser[];
  currentUser: User;
  typingUsers: string[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  chatTargetName: string;
  chatTargetType: 'friend' | 'group';
  autoPlayMessageId?: string; // 需要自动播放的消息ID
  onQuote?: (message: MessageWithUser) => void;
  onForward?: (message: MessageWithUser) => void;
  onFavorite?: (message: MessageWithUser) => void;
  onDelete?: (message: MessageWithUser) => void;
  onCallClick?: (callType: 'voice' | 'video') => void;
  onCardClick?: (contactId: string) => void;
}

export function ChatMessageList({
  messages,
  currentUser,
  typingUsers,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  chatTargetName,
  chatTargetType,
  autoPlayMessageId,
  onQuote,
  onForward,
  onFavorite,
  onDelete,
  onCallClick,
  onCardClick
}: ChatMessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, MessageWithUser[]>);

  // Function to determine if avatar should be shown
  const shouldShowAvatar = useCallback((message: MessageWithUser, index: number) => {
    return true;
  }, [messages, chatTargetType]);

  // Auto-scroll to bottom when new messages arrive (but not when loading more)
  useEffect(() => {
    if (!isLoadingMore && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages.length, isLoadingMore]);

  // Handle scroll to load more messages
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    
    // Load more when scrolled to top
    if (scrollTop === 0 && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div className="h-full relative">
      <div 
        className="h-full overflow-y-auto px-2 py-4"
        ref={scrollAreaRef} 
        data-testid="chat-messages"
        onScroll={handleScroll}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="space-y-4">
        {/* Loading skeleton */}
        {isLoading && messages.length === 0 && (
          <div className="space-y-3 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                {i % 2 !== 0 && <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />}
                <div className={`max-w-[70%] space-y-1 ${i % 2 === 0 ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`h-12 rounded-2xl bg-muted animate-pulse ${i === 2 ? 'w-48' : 'w-32'}`} />
                </div>
                {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />}
              </div>
            ))}
          </div>
        )}
        
        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="text-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              data-testid="button-load-more-messages"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('loading')}
                </>
              ) : (
                t('loadMore')
              )}
            </Button>
          </div>
        )}

        {/* Messages grouped by date */}
        {!isLoading && Object.entries(groupedMessages).map(([date, dayMessages]) => (
          <div key={date}>
            {/* Date Separator */}
            <div className="text-center my-4">
              <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                {new Date(date).toLocaleDateString('zh-CN', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </span>
            </div>
            
            {/* Messages for this date */}
            <div className="space-y-4">
              {dayMessages.map((message, index) => {
                const globalIndex = messages.findIndex(m => m.id === message.id);
                return (
                  <ChatBubble
                    key={message.clientId ?? message.id}
                    message={message}
                    isOwn={message.fromUserId === currentUser.id}
                    showAvatar={chatTargetType === 'group' ? true : shouldShowAvatar(message, globalIndex)}
                    isGroupChat={chatTargetType === 'group'}
                    autoPlayAudio={message.id === autoPlayMessageId && message.messageType === 'audio'}
                    onQuote={onQuote}
                    onForward={onForward}
                    onFavorite={onFavorite}
                    onDelete={onDelete}
                    onCallClick={onCallClick}
                    onCardClick={onCardClick}
                  />
                );
              })}
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {!isLoading && typingUsers.length > 0 && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8" /> {/* Spacer for alignment */}
            <div className="bg-muted rounded-lg p-3 max-w-xs">
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground py-8">
            <div className="text-sm">
              {chatTargetType === 'friend' 
                ? t('startConversation', chatTargetName)
                : t('welcomeToGroup', chatTargetName)
              }
            </div>
          </div>
        )}
        
        {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}