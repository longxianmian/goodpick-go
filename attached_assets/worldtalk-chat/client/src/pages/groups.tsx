import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { Group } from '@/types';
import { formatTime, t } from '@/lib/i18n';

interface GroupsPageProps {
  currentUserId: string;
  onSelectGroup: (group: Group) => void;
}


export function GroupsPage({ currentUserId, onSelectGroup }: GroupsPageProps) {
  const { data: groups = [], isLoading, error } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    enabled: !!currentUserId,
    retry: 2, // Retry failed requests twice
    // 使用默认的 staleTime: Infinity，避免不必要的重新获取
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-muted-foreground text-sm mb-4">
          {t('groupsList')}
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-card rounded-lg p-4 border border-border">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-5 w-5 rounded-full" />
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
          {t('loadGroupsFailed')}
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-muted-foreground text-sm">
          {t('noGroupsHint')}
        </div>
      </div>
    );
  }

  const getGroupAvatar = (group: Group) => {
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

    // Generate gradient background based on group name
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

  return (
    <div className="p-4 space-y-3" data-testid="groups-page">
      <div className="text-muted-foreground text-sm mb-4">
        {t('groupsList')} ({groups.length})
      </div>
      
      {groups.map((group) => (
        <div
          key={group.id}
          className="bg-card rounded-lg p-4 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onSelectGroup(group)}
          data-testid={`group-item-${group.id}`}
        >
          <div className="flex items-center space-x-3">
            {getGroupAvatar(group)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground truncate" data-testid={`group-name-${group.id}`}>
                  {group.name}
                </h3>
                <div className="flex items-center space-x-2">
                  {group.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {group.unreadCount > 99 ? '99+' : group.unreadCount}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {group.lastMessage && formatTime(new Date(group.lastMessage.createdAt))}
                  </span>
                </div>
              </div>
              
              {group.lastMessage && (
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {group.lastMessage.fromUser?.firstName || group.lastMessage.fromUser?.username}: {group.lastMessage.content}
                </p>
              )}
              
              {!group.lastMessage && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('noMessages')}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
