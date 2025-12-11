import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, MessageCircle } from 'lucide-react';
import { SiWhatsapp, SiLine, SiMessenger, SiInstagram } from 'react-icons/si';
import { Friend, Group } from '@/types';
import { formatTime, t, getTranslatedUserName } from '@/lib/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ChatsPageProps {
  currentUserId: string;
  onSelectFriend: (friend: Friend) => void;
  onSelectGroup: (group: Group) => void;
}

// 聊天项的通用类型
interface ChatItem {
  id: string;
  type: 'friend' | 'group';
  name: string;
  avatar?: string;
  isOnline?: boolean;
  unreadCount: number;
  lastMessage?: {
    id: string;
    content: string;
    messageType: string;
    fromUserId: string;
    createdAt: Date;
    isRead: boolean;
    fromUser?: {
      firstName?: string;
      username: string;
    };
  };
  data: Friend | Group;
  channel?: string;
  friendshipStatus?: 'pending' | 'accepted' | 'blocked';
  isIncomingRequest?: boolean;
  requestedAt?: Date;
  requestId?: string;
}

export function ChatsPage({ currentUserId, onSelectFriend, onSelectGroup }: ChatsPageProps) {
  // 返回好友列表时自动滚动到顶部
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // 获取好友列表
  const { data: friends = [], isLoading: isLoadingFriends, error: friendsError } = useQuery<Friend[]>({
    queryKey: ['/api/friends'],
    enabled: !!currentUserId,
    retry: 2, // Retry failed requests twice
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchInterval: 30 * 60 * 1000, // Auto-refresh every 30 minutes
  });

  // 获取群聊列表
  const { data: groups = [], isLoading: isLoadingGroups, error: groupsError } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    enabled: !!currentUserId,
    retry: 2, // Retry failed requests twice  
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchInterval: 30 * 60 * 1000, // Auto-refresh every 30 minutes
  });

  // 转换好友为聊天项
  const friendChats: ChatItem[] = friends.map(friend => {
    // 优先显示昵称：nickname > firstName + lastName > firstName > lastName > username
    let displayName = friend.username;
    if (friend.nickname) {
      displayName = friend.nickname;
    } else if (friend.firstName && friend.lastName) {
      const translatedFirstName = getTranslatedUserName(friend.id, friend.firstName);
      displayName = `${translatedFirstName} ${friend.lastName}`;
    } else if (friend.firstName) {
      displayName = getTranslatedUserName(friend.id, friend.firstName);
    } else if (friend.lastName) {
      displayName = friend.lastName;
    }
    
    return {
      id: friend.id,
      type: 'friend' as const,
      name: displayName,
      avatar: friend.profileImageUrl,
      isOnline: friend.isOnline,
      unreadCount: friend.unreadCount || 0,
      lastMessage: friend.lastMessage,
      data: friend,
      channel: friend.channel || 'mytalk',
      friendshipStatus: friend.friendshipStatus,
      isIncomingRequest: friend.isIncomingRequest,
      requestedAt: friend.requestedAt,
      requestId: friend.requestId
    };
  });

  // 转换群聊为聊天项
  const groupChats: ChatItem[] = groups.map(group => ({
    id: group.id,
    type: 'group' as const,
    name: group.name,
    avatar: group.avatarUrl,
    unreadCount: group.unreadCount || 0,
    lastMessage: group.lastMessage,
    data: group,
    channel: group.channel || 'mytalk'
  }));

  const hasError = friendsError || groupsError;
  const showSkeletonLoading = (isLoadingFriends && friends.length === 0) || (isLoadingGroups && groups.length === 0);

  // 合并并按最后消息时间排序
  const allChats = [...friendChats, ...groupChats].sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime; // 降序，最新的在前
  });

  // 显示所有会话（不再需要渠道过滤，头像徽章已提供视觉识别）
  const filteredChats = allChats;

  // 计算总的未读消息数
  const totalUnreadCount = allChats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);

  const [selectedRequest, setSelectedRequest] = useState<Friend | null>(null);
  const { toast } = useToast();

  // Accept friend request mutation
  const acceptMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return apiRequest('/api/friends/accept', {
        method: 'POST',
        body: { friendId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      setSelectedRequest(null);
      toast({
        title: t('success'),
        description: t('acceptFriendRequest'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Decline friend request mutation
  const declineMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return apiRequest('/api/friends/decline', {
        method: 'POST',
        body: { friendId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      setSelectedRequest(null);
      toast({
        title: t('success'),
        description: t('rejectFriendRequest'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleChatClick = (chat: ChatItem) => {
    if (chat.type === 'friend' && chat.isIncomingRequest) {
      setSelectedRequest(chat.data as Friend);
      return;
    }
    
    if (chat.type === 'friend') {
      onSelectFriend(chat.data as Friend);
    } else {
      onSelectGroup(chat.data as Group);
    }
  };

  // 生成群聊头像（显示成员头像组合）
  const getGroupAvatar = (group: Group) => {
    // 如果有自定义头像，优先使用
    if (group.avatarUrl) {
      return (
        <Avatar className="w-12 h-12">
          <AvatarImage src={group.avatarUrl} />
          <AvatarFallback>
            <Users className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>
      );
    }

    // 如果有成员信息，显示成员头像组合（最多6个）
    if (group.members && group.members.length > 0) {
      const displayMembers = group.members.slice(0, 6);
      const memberCount = displayMembers.length;

      // 根据成员数量使用不同布局
      if (memberCount === 1) {
        // 1人：单个头像
        return (
          <Avatar className="w-12 h-12">
            <AvatarImage src={displayMembers[0].profileImageUrl} />
            <AvatarFallback>{displayMembers[0].firstName?.[0] || displayMembers[0].username[0]}</AvatarFallback>
          </Avatar>
        );
      } else if (memberCount === 2) {
        // 2人：左右分布
        return (
          <div className="w-12 h-12 flex gap-0.5">
            {displayMembers.map((member, idx) => (
              <Avatar key={idx} className="w-[23px] h-12 rounded-lg">
                <AvatarImage src={member.profileImageUrl} />
                <AvatarFallback className="text-[10px]">{member.firstName?.[0] || member.username[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        );
      } else if (memberCount === 3) {
        // 3人：上1下2布局
        return (
          <div className="w-12 h-12 flex flex-col gap-0.5">
            <Avatar className="w-12 h-[23px] rounded-lg">
              <AvatarImage src={displayMembers[0].profileImageUrl} />
              <AvatarFallback className="text-[10px]">{displayMembers[0].firstName?.[0] || displayMembers[0].username[0]}</AvatarFallback>
            </Avatar>
            <div className="flex gap-0.5">
              {displayMembers.slice(1, 3).map((member, idx) => (
                <Avatar key={idx} className="w-[23px] h-[23px] rounded-lg">
                  <AvatarImage src={member.profileImageUrl} />
                  <AvatarFallback className="text-[10px]">{member.firstName?.[0] || member.username[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        );
      } else if (memberCount === 4) {
        // 4人：2x2网格
        return (
          <div className="w-12 h-12 grid grid-cols-2 gap-0.5">
            {displayMembers.map((member, idx) => (
              <Avatar key={idx} className="w-[23px] h-[23px] rounded-lg">
                <AvatarImage src={member.profileImageUrl} />
                <AvatarFallback className="text-[10px]">{member.firstName?.[0] || member.username[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        );
      } else {
        // 5-6人：3x2网格（显示前6个）
        return (
          <div className="w-12 h-12 grid grid-cols-3 gap-0.5">
            {displayMembers.map((member, idx) => (
              <Avatar key={idx} className="w-[15px] h-[23px] rounded-lg">
                <AvatarImage src={member.profileImageUrl} />
                <AvatarFallback className="text-[8px]">{member.firstName?.[0] || member.username[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        );
      }
    }

    // 如果没有成员信息，使用默认渐变背景
    const colors = [
      'from-blue-400 to-purple-500',
      'from-green-400 to-blue-500',
      'from-orange-400 to-red-500',
      'from-pink-400 to-rose-500',
      'from-indigo-400 to-purple-500'
    ];
    
    const colorIndex = group.name.length % colors.length;
    const gradientClass = colors[colorIndex];

    return (
      <div className={`w-12 h-12 bg-gradient-to-br ${gradientClass} rounded-lg flex items-center justify-center text-white font-semibold`}>
        <Users className="w-6 h-6" />
      </div>
    );
  };

  // 渲染平台小图标/badge
  const renderChannelIcon = (channel?: string) => {
    if (!channel || channel === 'mytalk') return null;

    const iconProps = { className: "w-3.5 h-3.5" };
    let icon;
    
    switch(channel) {
      case 'whatsapp':
        icon = <SiWhatsapp {...iconProps} className="w-3.5 h-3.5 text-green-500" />;
        break;
      case 'line':
        icon = <SiLine {...iconProps} className="w-3.5 h-3.5 text-green-600" />;
        break;
      case 'messenger':
        icon = <SiMessenger {...iconProps} className="w-3.5 h-3.5 text-blue-500" />;
        break;
      case 'igdm':
        icon = <SiInstagram {...iconProps} className="w-3.5 h-3.5 text-pink-500" />;
        break;
      default:
        return null;
    }
    
    return (
      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-800 border border-slate-700">
        {icon}
      </div>
    );
  };

  // 渲染聊天项头像
  const renderChatAvatar = (chat: ChatItem) => {
    if (chat.type === 'friend') {
      return (
        <div className="relative">
          <Avatar className="w-12 h-12">
            <AvatarImage src={chat.avatar} />
            <AvatarFallback>
              {chat.name[0]}
            </AvatarFallback>
          </Avatar>
          {chat.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
          )}
          {/* 平台 badge */}
          {chat.channel && chat.channel !== 'mytalk' && (
            <div className="absolute top-0 right-0">
              {renderChannelIcon(chat.channel)}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="relative">
          {getGroupAvatar(chat.data as Group)}
          {/* 平台 badge */}
          {chat.channel && chat.channel !== 'mytalk' && (
            <div className="absolute top-0 right-0">
              {renderChannelIcon(chat.channel)}
            </div>
          )}
        </div>
      );
    }
  };

  const renderLastMessage = (chat: ChatItem) => {
    if (chat.isIncomingRequest) {
      return (
        <p className="text-xs text-red-400 font-medium mt-1">
          {t('newFriendRequest')}
        </p>
      );
    }
    
    if (!chat.lastMessage) {
      if (chat.type === 'friend') {
        return (
          <p className="text-xs text-slate-500 mt-1">
            {chat.isOnline ? t('online') : t('offline')}
          </p>
        );
      } else {
        return (
          <p className="text-xs text-slate-500 mt-1">
            {t('noMessages')}
          </p>
        );
      }
    }

    const message = chat.lastMessage;
    let prefix = '';
    
    if (chat.type === 'friend') {
      prefix = message.fromUserId === currentUserId ? t('mePrefix') : '';
    } else {
      if (message.fromUser) {
        const displayName = message.fromUser.firstName || message.fromUser.username;
        const senderName = message.fromUserId ? getTranslatedUserName(message.fromUserId, displayName) : displayName;
        prefix = `${senderName}: `;
      } else {
        prefix = `${t('unknownUser')}: `;
      }
    }

    // 根据消息类型显示不同的预览文本
    let contentPreview = message.content;
    if (message.messageType === 'image') {
      contentPreview = '[图片]';
    } else if (message.messageType === 'voice' || message.messageType === 'audio') {
      contentPreview = '[语音]';
    } else if (message.messageType === 'file') {
      contentPreview = '[文件]';
    }

    return (
      <p className="text-xs text-slate-500 truncate mt-1">
        {prefix}{contentPreview}
      </p>
    );
  };

  if (hasError) {
    return (
      <div className="p-4 text-center bg-slate-950 min-h-screen">
        <div className="text-red-400 text-sm mb-2">
          {t('loadChatsFailed')}
        </div>
        <div className="text-xs text-slate-500">
          {friendsError && `${t('friendsList')}: ${friendsError.message}`}
          {groupsError && `${t('groupsList')}: ${groupsError.message}`}
        </div>
      </div>
    );
  }

  if (allChats.length === 0) {
    return (
      <div className="p-4 text-center bg-slate-950 min-h-screen">
        <div className="text-slate-400 text-sm">
          {t('emptyChatRecord')}
        </div>
      </div>
    );
  }

  return (
    <>
      <div data-testid="chats-page" className="bg-slate-950 min-h-screen">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center">
            <div className="text-slate-400 text-sm">
              {t('emptyChatRecord')}
            </div>
          </div>
        ) : (
          filteredChats.map((chat, index) => (
            <div
              key={`${chat.type}-${chat.id}`}
              className={`py-3 px-4 transition-colors cursor-pointer ${
                index < filteredChats.length - 1 ? 'border-b border-slate-800/50' : ''
              } ${
                chat.isIncomingRequest 
                  ? 'bg-red-950/30 hover:bg-red-950/50' 
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
              onClick={() => handleChatClick(chat)}
              data-testid={`chat-item-${chat.type}-${chat.id}`}
            >
              <div className="flex items-center space-x-3">
                {renderChatAvatar(chat)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm text-white truncate" data-testid={`chat-name-${chat.id}`}>
                      {chat.name}
                      {chat.type === 'group' && (
                        <span className="ml-1 text-xs text-slate-400">
                          {t('groupLabel')}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {chat.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500">
                        {chat.lastMessage && formatTime(new Date(chat.lastMessage.createdAt))}
                      </span>
                    </div>
                  </div>
                  
                  {renderLastMessage(chat)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <AlertDialogContent data-testid="friend-request-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('newFriendRequest')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRequest && (
                <>
                  <div className="flex items-center space-x-3 mt-4 mb-2">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={selectedRequest.profileImageUrl} />
                      <AvatarFallback>
                        {selectedRequest.firstName?.[0] || selectedRequest.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">
                        {selectedRequest.firstName || selectedRequest.username}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{selectedRequest.username}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => selectedRequest && declineMutation.mutate(selectedRequest.id)}
              disabled={declineMutation.isPending}
              data-testid="reject-friend-btn"
            >
              {t('rejectFriendRequest')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRequest && acceptMutation.mutate(selectedRequest.id)}
              disabled={acceptMutation.isPending}
              data-testid="accept-friend-btn"
            >
              {t('acceptFriendRequest')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}