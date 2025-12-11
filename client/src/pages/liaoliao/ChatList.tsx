import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Users, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, th, vi } from 'date-fns/locale';

interface ChatItem {
  type: 'friend' | 'group';
  id: number;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

function getDateLocale(lang: string) {
  switch (lang) {
    case 'zh-cn':
    case 'zh-tw':
      return zhCN;
    case 'th-th':
      return th;
    case 'vi-vn':
      return vi;
    default:
      return undefined;
  }
}

export default function LiaoliaoChatList() {
  const { t, language } = useLanguage();
  const [, navigate] = useLocation();
  
  const { data: chats = [], isLoading } = useQuery<ChatItem[]>({
    queryKey: ['/api/liaoliao/chats'],
    refetchInterval: 5000,
  });

  const { data: friendRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/liaoliao/friend-requests'],
  });

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h1 className="text-xl font-bold" data-testid="text-liaoliao-title">
            {t('liaoliao.title')}
          </h1>
          <div className="flex items-center gap-1">
            {friendRequests.length > 0 && (
              <Badge variant="destructive" className="mr-1" data-testid="badge-friend-requests">
                {friendRequests.length}
              </Badge>
            )}
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => navigate('/liaoliao/add-friend')}
              data-testid="button-add-friend"
            >
              <UserPlus className="w-5 h-5" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => navigate('/liaoliao/new-group')}
              data-testid="button-new-group"
            >
              <Users className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={t('liaoliao.searchPlaceholder')}
            className="pl-9"
            data-testid="input-search-chat"
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2 animate-pulse" />
            <p>{t('common.loading')}</p>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-4">
            <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-center mb-4">{t('liaoliao.noChats')}</p>
            <Button onClick={() => navigate('/liaoliao/add-friend')} data-testid="button-start-chat">
              <UserPlus className="w-4 h-4 mr-2" />
              {t('liaoliao.addFriend')}
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {chats.map((chat) => (
              <Link 
                key={`${chat.type}-${chat.id}`}
                href={chat.type === 'friend' ? `/liaoliao/chat/${chat.id}` : `/liaoliao/group/${chat.id}`}
                className="flex items-center gap-3 px-4 py-3 hover-elevate active-elevate-2"
                data-testid={`chat-item-${chat.type}-${chat.id}`}
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={chat.avatarUrl} />
                  <AvatarFallback>
                    {chat.type === 'group' ? <Users className="w-5 h-5" /> : chat.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate" data-testid={`text-chat-name-${chat.id}`}>
                      {chat.name}
                    </span>
                    {chat.lastMessageAt && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(chat.lastMessageAt), {
                          addSuffix: false,
                          locale: getDateLocale(language),
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage || t('liaoliao.noMessages')}
                    </p>
                    {chat.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs min-w-[20px] justify-center" data-testid={`badge-unread-${chat.id}`}>
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
