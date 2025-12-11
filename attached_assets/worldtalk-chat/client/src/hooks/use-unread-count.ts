import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Friend, Group } from '@/types';

interface UseUnreadCountOptions {
  userId?: string;
  enabled?: boolean;
}

/**
 * Global hook to get total unread message count across all chats
 * This can be used by BottomNavigation and other components regardless of page
 */
export function useUnreadCount({ userId, enabled = true }: UseUnreadCountOptions) {
  // Get friends data to calculate friend chat unread counts
  const { data: friends = [] } = useQuery<Friend[]>({
    queryKey: ['/api/friends'],
    enabled: enabled && !!userId,
    // 🔧 修复未读计数缓存问题：允许定期刷新以获取最新未读计数
    staleTime: 30 * 1000, // 30秒后数据变陈旧，允许重新获取
    refetchInterval: 60 * 1000, // 每60秒自动刷新一次
  });

  // Get groups data to calculate group chat unread counts
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['/api/groups'],
    enabled: enabled && !!userId,
    // 🔧 修复未读计数缓存问题：允许定期刷新以获取最新未读计数
    staleTime: 30 * 1000, // 30秒后数据变陈旧，允许重新获取
    refetchInterval: 60 * 1000, // 每60秒自动刷新一次
  });

  // Calculate total unread count from both friends and groups
  const totalUnreadCount = useMemo(() => {
    const friendsUnread = friends.reduce((total, friend) => total + (friend.unreadCount || 0), 0);
    const groupsUnread = groups.reduce((total, group) => total + (group.unreadCount || 0), 0);
    const total = friendsUnread + groupsUnread;
    
    return total;
  }, [friends, groups]);

  return totalUnreadCount;
}