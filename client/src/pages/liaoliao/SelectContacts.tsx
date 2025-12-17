import { useState, useMemo } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatItem {
  type: 'friend' | 'group' | 'ai';
  id: number | string;
  name: string;
  avatarUrl?: string;
}

interface Friend {
  id: number | string;
  displayName: string;
  avatarUrl?: string;
  isAI?: boolean;
}

export default function SelectContacts() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/liaoliao/chat/:friendId/select-contacts');
  const friendId = params?.friendId;
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  // 获取聊天列表（包含所有好友来源）
  const { data: chatsList = [] } = useQuery<ChatItem[]>({
    queryKey: ['/api/liaoliao/chats'],
  });

  // 构建AI助理
  const aiAssistant: Friend = {
    id: 'ai-assistant',
    displayName: t('liaoliao.aiAssistant') || '刷刷小助手',
    avatarUrl: undefined,
    isAI: true,
  };

  // 转换为好友格式并过滤（显示所有好友+AI助理，排除自己和当前聊天对象）
  const filteredFriends = useMemo(() => {
    const currentFriendId = friendId ? parseInt(friendId) : null;
    const friends: Friend[] = chatsList
      .filter(chat => chat.type === 'friend')
      .map(chat => ({
        id: chat.id,
        displayName: chat.name,
        avatarUrl: chat.avatarUrl,
        isAI: false,
      }))
      .filter(friend => {
        // 排除自己
        if (friend.id === user?.id) return false;
        // 排除当前聊天对象（因为已经是组群的发起人）
        if (friend.id === currentFriendId) return false;
        // 搜索过滤
        if (searchQuery && !friend.displayName.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        return true;
      });
    
    // 添加AI助理并应用搜索过滤
    if (!searchQuery || aiAssistant.displayName.toLowerCase().includes(searchQuery.toLowerCase())) {
      friends.unshift(aiAssistant);
    }
    
    return friends;
  }, [chatsList, user?.id, friendId, searchQuery, aiAssistant.displayName]);

  // 按首字母分组
  const groupedFriends = useMemo(() => {
    const groups: Record<string, Friend[]> = {};
    filteredFriends.forEach(friend => {
      const firstChar = friend.displayName.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(friend);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredFriends]);

  const toggleSelect = (id: number | string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleComplete = () => {
    if (selectedIds.size === 0) {
      toast({
        title: t('liaoliao.selectAtLeastOne') || '请至少选择一位联系人',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: t('liaoliao.addedToGroup') || '已添加到群聊',
      description: `${selectedIds.size} ${t('liaoliao.contactsSelected') || '位联系人'}`,
    });
    navigate(`/liaoliao/chat/${friendId}`);
  };

  const handleClose = () => {
    navigate(`/liaoliao/chat/${friendId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部导航 */}
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          data-testid="button-close-select"
        >
          <X className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-medium">{t('liaoliao.selectContacts') || '选择联系人'}</h1>
        <div className="w-9" />
      </header>

      {/* 搜索框 */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('liaoliao.search') || '搜索'}
            className="pl-10"
            data-testid="input-search-contacts"
          />
        </div>
      </div>

      {/* 好友列表 */}
      <div className="flex-1 overflow-y-auto">
        {groupedFriends.map(([letter, friends]) => (
          <div key={letter}>
            <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/30">
              {letter}
            </div>
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 px-4 py-3 hover-elevate cursor-pointer"
                onClick={() => toggleSelect(friend.id)}
                data-testid={`contact-item-${friend.id}`}
              >
                <Checkbox
                  checked={selectedIds.has(friend.id)}
                  onCheckedChange={() => toggleSelect(friend.id)}
                  className="rounded-full"
                />
                <Avatar className="h-10 w-10">
                  <AvatarImage src={friend.avatarUrl} />
                  <AvatarFallback>{friend.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate">{friend.displayName}</span>
                {friend.isAI && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">AI</span>
                )}
              </div>
            ))}
          </div>
        ))}
        {filteredFriends.length === 0 && (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            {t('liaoliao.noContacts') || '暂无联系人'}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <Button variant="ghost" className="text-primary p-0">
          {t('liaoliao.shareHistory') || '分享聊天记录'}
        </Button>
        <Button
          onClick={handleComplete}
          disabled={selectedIds.size === 0}
          data-testid="button-complete-select"
        >
          {t('liaoliao.complete') || '完成'}
          {selectedIds.size > 0 && ` (${selectedIds.size})`}
        </Button>
      </div>
    </div>
  );
}
