import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, PlusCircle, MoreVertical, MessageSquare, MessageCircle, UserPlus, ScanLine, Wallet, Bot, Sparkles, Users, Trash2 } from 'lucide-react';
import { GroupAvatar } from '@/components/GroupAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, th, vi } from 'date-fns/locale';
import { UserBottomNav } from '@/components/UserBottomNav';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ChatMember {
  id: number;
  displayName: string;
  avatarUrl?: string;
}

interface ChatItem {
  type: 'friend' | 'group' | 'ai';
  id: number | string;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isAI?: boolean;
  members?: ChatMember[];
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

const SYSTEM_AI_ASSISTANT: ChatItem = {
  type: 'ai',
  id: 'ai-assistant',
  name: '',
  avatarUrl: undefined,
  lastMessage: '',
  unreadCount: 0,
  isAI: true,
};

export default function LiaoliaoChatList() {
  const { t, language } = useLanguage();
  const { user, isUserAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [longPressChat, setLongPressChat] = useState<ChatItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { data: chats = [], isLoading } = useQuery<ChatItem[]>({
    queryKey: ['/api/liaoliao/chats'],
    refetchInterval: 5000,
    enabled: isUserAuthenticated,
  });

  const { data: friendRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/liaoliao/friend-requests'],
    enabled: isUserAuthenticated,
  });

  const aiAssistant: ChatItem = {
    ...SYSTEM_AI_ASSISTANT,
    name: t('liaoliao.aiAssistant'),
    lastMessage: t('liaoliao.aiWelcome'),
  };

  const allChats = isUserAuthenticated ? [aiAssistant, ...chats] : [aiAssistant];

  const filteredChats = searchQuery
    ? allChats.filter(chat => chat.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : allChats;

  const handleChatClick = (chat: ChatItem) => {
    if (chat.isAI) {
      navigate('/liaoliao/ai-chat');
    } else if (chat.type === 'friend') {
      navigate(`/liaoliao/chat/${chat.id}`);
    } else if (chat.type === 'group') {
      navigate(`/liaoliao/group/${chat.id}`);
    }
  };

  const handleLongPressStart = (chat: ChatItem) => {
    if (chat.isAI) return;
    longPressTimerRef.current = setTimeout(() => {
      setLongPressChat(chat);
      setShowDeleteConfirm(true);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeleteChat = async () => {
    if (!longPressChat || isDeleting) return;
    setIsDeleting(true);
    try {
      if (longPressChat.type === 'friend') {
        await apiRequest('DELETE', `/api/liaoliao/chats/${longPressChat.id}`);
        queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/chats'] });
        toast({ title: t('liaoliao.chatDeleted') || '聊天已删除' });
      } else if (longPressChat.type === 'group') {
        await apiRequest('DELETE', `/api/liaoliao/groups/${longPressChat.id}`);
        queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/chats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/groups'] });
        toast({ title: t('liaoliao.groupDeleted') || '群组已删除' });
      }
      setShowDeleteConfirm(false);
      setLongPressChat(null);
    } catch (error) {
      toast({ title: t('common.error') || '删除失败', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-14">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost"
                data-testid="button-plus-menu"
              >
                <PlusCircle className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 bg-zinc-800 text-white border-zinc-700">
              <DropdownMenuItem 
                className="gap-3 py-3 cursor-pointer hover:bg-zinc-700"
                onClick={() => navigate('/liaoliao/new-group')}
                data-testid="menu-new-group"
              >
                <MessageSquare className="w-5 h-5" />
                <span>{t('liaoliao.startGroup')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-3 py-3 cursor-pointer hover:bg-zinc-700"
                onClick={() => navigate('/liaoliao/add-friend')}
                data-testid="menu-add-friend"
              >
                <UserPlus className="w-5 h-5" />
                <span>{t('liaoliao.addFriend')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-3 py-3 cursor-pointer hover:bg-zinc-700"
                onClick={() => navigate('/liaoliao/scan')}
                data-testid="menu-scan"
              >
                <ScanLine className="w-5 h-5" />
                <span>{t('liaoliao.scan')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="gap-3 py-3 cursor-pointer hover:bg-zinc-700"
                onClick={() => navigate('/liaoliao/payment')}
                data-testid="menu-payment"
              >
                <Wallet className="w-5 h-5" />
                <span>{t('liaoliao.payment')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <h1 className="text-xl font-bold flex-1 text-center" data-testid="text-liaoliao-title">
            {t('liaoliao.title')}
            {friendRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2" data-testid="badge-friend-requests">
                {friendRequests.length}
              </Badge>
            )}
          </h1>
          
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => navigate('/super-contacts')}
            data-testid="button-contacts"
          >
            <Users className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={t('liaoliao.searchPlaceholder')}
            className="pl-9 bg-muted/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-chat"
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {isLoading && isUserAuthenticated ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2 animate-pulse" />
            <p>{t('common.loading')}</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-4">
            <MessageCircle className="w-16 h-16 mb-4 text-muted-foreground/50" />
            <p className="text-center mb-4">{t('liaoliao.noChats')}</p>
            <Button 
              onClick={() => isUserAuthenticated ? navigate('/super-contacts') : navigate('/login')} 
              className="bg-[#38B03B] hover:bg-[#2e9632] text-white"
              data-testid="button-start-chat"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isUserAuthenticated ? t('liaoliao.addFriend') : t('common.login')}
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredChats.map((chat) => (
              <div 
                key={chat.isAI ? 'ai-assistant' : `${chat.type}-${chat.id}`}
                onClick={() => handleChatClick(chat)}
                onMouseDown={() => handleLongPressStart(chat)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(chat)}
                onTouchEnd={handleLongPressEnd}
                className="flex items-center gap-3 px-4 py-3 hover-elevate active-elevate-2 cursor-pointer select-none"
                data-testid={chat.isAI ? 'chat-item-ai' : `chat-item-${chat.type}-${chat.id}`}
              >
                {chat.isAI ? (
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-amber-900" />
                    </div>
                  </div>
                ) : chat.type === 'group' && chat.members && chat.members.length > 0 ? (
                  <GroupAvatar members={chat.members} size="md" />
                ) : (
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={chat.avatarUrl} />
                    <AvatarFallback>
                      {chat.type === 'group' ? <Users className="w-5 h-5" /> : chat.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate" data-testid={chat.isAI ? 'text-ai-name' : `text-chat-name-${chat.id}`}>
                        {chat.name}
                      </span>
                      {chat.isAI && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          AI
                        </Badge>
                      )}
                    </div>
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
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('liaoliao.confirmDelete') || '删除确认'}</AlertDialogTitle>
            <AlertDialogDescription>
              {longPressChat?.type === 'friend' 
                ? `${t('liaoliao.deleteConfirmFriend') || '确定要删除好友'} "${longPressChat?.name}" ${t('common.confirmQ') || '吗？'}`
                : `${t('liaoliao.deleteConfirmGroup') || '确定要删除群组'} "${longPressChat?.name}" ${t('common.confirmQ') || '吗？'}`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} data-testid="button-cancel-delete">
              {t('common.cancel') || '取消'}
            </AlertDialogCancel>
            <AlertDialogAction 
              disabled={isDeleting}
              onClick={handleDeleteChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {isDeleting ? `${t('common.deleting') || '删除中'}...` : (t('common.delete') || '删除')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <UserBottomNav />
    </div>
  );
}
