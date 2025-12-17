import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, MoreVertical, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: number;
  fromUserId: number;
  groupId: number;
  messageType: string;
  content: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', `/api/liaoliao/groups/${groupId}/messages`, {
        messageType: 'text',
        content,
      });
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
    sendMessageMutation.mutate(inputValue.trim());
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
            return (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2',
                  isMe ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={message.fromUser?.avatarUrl} />
                  <AvatarFallback>
                    {message.fromUser?.displayName?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
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
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-3 flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={t('liaoliao.typeMessage') || '输入消息...'}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          data-testid="input-group-message"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!inputValue.trim() || sendMessageMutation.isPending}
          data-testid="button-send-group-message"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
