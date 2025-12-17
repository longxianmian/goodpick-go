import { useState, useMemo } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Search, Loader2, Bot, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

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

// AI助理的固定用户ID（对应数据库中的用户记录）
const AI_ASSISTANT_USER_ID = 4;

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

  // 构建AI助理（使用固定的数据库用户ID）
  const aiAssistant: Friend = {
    id: AI_ASSISTANT_USER_ID,
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

  // 创建群聊mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; memberIds: number[] }) => {
      const res = await apiRequest('POST', '/api/liaoliao/groups', data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/liaoliao/chats'] });
      toast({
        title: t('liaoliao.groupCreated') || '群组创建成功',
      });
      // 导航到新创建的群聊
      navigate(`/liaoliao/group/${data.id}`);
    },
    onError: () => {
      toast({
        title: t('common.error') || '创建失败',
        variant: 'destructive',
      });
    },
  });

  const handleComplete = () => {
    // 群聊需要至少3人：群主(自动) + 当前聊天对象(自动) + 至少1位选中的联系人
    if (selectedIds.size < 1) {
      toast({
        title: t('liaoliao.selectAtLeastOne') || '请至少选择1位联系人',
        variant: 'destructive',
      });
      return;
    }
    
    // 收集所有成员ID（当前聊天对象 + 选中的联系人，包括AI助理）
    const memberIds: number[] = [];
    if (friendId) {
      memberIds.push(parseInt(friendId));
    }
    selectedIds.forEach(id => {
      if (typeof id === 'number') {
        memberIds.push(id);
      }
    });

    // 获取选中的联系人名称用于生成群名
    const selectedNames = filteredFriends
      .filter(f => selectedIds.has(f.id))
      .map(f => f.displayName)
      .slice(0, 3);
    
    // 找到当前聊天对象的名称
    const currentFriend = chatsList.find(c => c.id === parseInt(friendId || '0'));
    const allNames = currentFriend ? [currentFriend.name, ...selectedNames] : selectedNames;
    const groupName = allNames.slice(0, 4).join('、');

    createGroupMutation.mutate({
      name: groupName,
      memberIds,
    });
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
                {friend.isAI ? (
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#38B03B] to-[#2e9632] flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center">
                      <Sparkles className="w-2 h-2 text-amber-900" />
                    </div>
                  </div>
                ) : (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.avatarUrl} />
                    <AvatarFallback>{friend.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
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
          disabled={selectedIds.size === 0 || createGroupMutation.isPending}
          data-testid="button-complete-select"
        >
          {createGroupMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : null}
          {t('liaoliao.complete') || '完成'}
          {selectedIds.size > 0 && ` (${selectedIds.size + 2})`}
        </Button>
      </div>
    </div>
  );
}
