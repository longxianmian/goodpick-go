import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Friend, User } from '@/types';
import { formatTime, t, getTranslatedUserName } from '@/lib/i18n';
import { apiRequest } from '@/lib/queryClient';

import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

// 渠道标识映射
const channelBadgeMap: Record<string, { label: string; color: string }> = {
  line: { label: '@LINE', color: 'text-green-600' },
  whatsapp: { label: '@WhatsApp', color: 'text-emerald-600' },
  telegram: { label: '@Telegram', color: 'text-blue-500' },
  phone: { label: '@Phone', color: 'text-orange-500' },
  messenger: { label: '@Messenger', color: 'text-blue-600' },
};

interface FriendsPageProps {
  currentUserId: string;
  onSelectFriend: (friend: Friend) => void;
}


interface FriendRequest extends User {
  requestId: string;
  requestDate: Date;
}

export function FriendsPage({ currentUserId, onSelectFriend }: FriendsPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friends = [], isLoading, error } = useQuery<Friend[]>({
    queryKey: ['/api/friends'],
    enabled: !!currentUserId,
    retry: 2, // Retry failed requests twice
    // 使用默认的 staleTime: Infinity，避免不必要的重新获取
  });

  const { data: friendRequests = [], isLoading: isLoadingRequests } = useQuery<FriendRequest[]>({
    queryKey: ['/api/friend-requests'],
    enabled: !!currentUserId,
    retry: 2,
  });

  const acceptFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return await apiRequest('/api/friends/accept', { 
        method: 'POST', 
        body: { friendId } 
      });
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('friendRequestAccepted'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToAcceptFriend'),
        variant: 'destructive',
      });
    },
  });

  const declineFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return await apiRequest('/api/friends/decline', { 
        method: 'POST', 
        body: { friendId } 
      });
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('friendRequestDeclined'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToDeclineFriend'),
        variant: 'destructive',
      });
    },
  });

  if (isLoading || isLoadingRequests) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-muted-foreground text-sm mb-4">
          {t('friendsList')}
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-destructive text-sm">
          {t('loadFriendsFailed')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" data-testid="friends-page">
      {/* 好友请求部分 */}
      {friendRequests.length > 0 && (
        <div className="space-y-3">
          <div className="text-muted-foreground text-sm">
            {t('friendRequests')} ({friendRequests.length})
          </div>
          
          {friendRequests.map((request) => (
            <div
              key={request.requestId}
              className="bg-card rounded-lg p-4 shadow-sm border border-border"
              data-testid={`friend-request-${request.id}`}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={request.profileImageUrl} />
                  <AvatarFallback>
                    {request.firstName?.[0] || request.username[0]}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {request.firstName && request.lastName
                      ? `${getTranslatedUserName(request.id, request.firstName)} ${request.lastName}`
                      : request.firstName
                      ? getTranslatedUserName(request.id, request.firstName)
                      : request.username}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('wantsToBeYourFriend')}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => acceptFriendMutation.mutate(request.id)}
                    disabled={acceptFriendMutation.isPending}
                    data-testid={`accept-friend-${request.id}`}
                  >
                    <Check className="w-4 h-4" />
                    {t('accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => declineFriendMutation.mutate(request.id)}
                    disabled={declineFriendMutation.isPending}
                    data-testid={`decline-friend-${request.id}`}
                  >
                    <X className="w-4 h-4" />
                    {t('decline')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          <Separator />
        </div>
      )}

      {/* 好友列表部分 */}
      <div className="space-y-3">
        {friends.length > 0 ? (
          <>
            <div className="text-muted-foreground text-sm">
              {t('friendsList')} ({friends.length})
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="text-muted-foreground text-sm">
              {t('noFriendsHint')}
            </div>
          </div>
        )}
      </div>
      
      {friends.length > 0 && friends.map((friend) => (
        <div
          key={friend.id}
          className="bg-card rounded-lg p-4 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onSelectFriend(friend)}
          data-testid={`friend-item-${friend.id}`}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={friend.profileImageUrl} />
                <AvatarFallback>
                  {friend.firstName?.[0] || friend.username[0]}
                </AvatarFallback>
              </Avatar>
              {friend.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground truncate" data-testid={`friend-name-${friend.id}`}>
                  {friend.firstName && friend.lastName
                    ? `${getTranslatedUserName(friend.id, friend.firstName)} ${friend.lastName}`
                    : friend.firstName
                    ? getTranslatedUserName(friend.id, friend.firstName)
                    : friend.nickname || friend.username}
                  {/* 🎯 IGIS v1.0：显示合并后的所有渠道标识 */}
                  {friend.channels && friend.channels.length > 0 && (
                    <span className="ml-1 text-xs font-normal">
                      {friend.channels
                        .filter(ch => channelBadgeMap[ch])
                        .map((ch, idx) => (
                          <span key={ch} className={channelBadgeMap[ch].color}>
                            {idx > 0 ? ' ' : ''}{channelBadgeMap[ch].label}
                          </span>
                        ))}
                    </span>
                  )}
                </h3>
                <div className="flex items-center space-x-2">
                  {friend.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {friend.unreadCount > 99 ? '99+' : friend.unreadCount}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {friend.lastMessage && formatTime(new Date(friend.lastMessage.createdAt))}
                  </span>
                </div>
              </div>
              
              {friend.lastMessage && (
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {friend.lastMessage.fromUserId === currentUserId ? t('mePrefix') : ''}
                  {friend.lastMessage.content}
                </p>
              )}
              
              {!friend.lastMessage && (
                <p className="text-sm text-muted-foreground mt-1">
                  {friend.isOnline ? t('online') : t('offline')}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
