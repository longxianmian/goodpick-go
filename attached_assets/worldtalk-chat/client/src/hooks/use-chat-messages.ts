import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Message, User } from '@/types';

interface MessageWithUser extends Message {
  fromUser: User;
  translations?: any[];
}

interface UseChatMessagesOptions {
  userId: string;
  targetId: string;
  isGroup: boolean;
  enabled: boolean;
}

interface MessagePage {
  messages: MessageWithUser[];
  hasMore: boolean;
  nextCursor?: string;
}

export function useChatMessages({ userId, targetId, isGroup, enabled }: UseChatMessagesOptions) {
  const queryClient = useQueryClient();
  // 🚀 使用 useMemo 稳定 queryKey，避免每次渲染都创建新数组导致 useCallback 依赖变化
  const queryKey = useMemo(() => ['/api/messages', targetId, isGroup, userId], [targetId, isGroup, userId]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
    refetch
  } = useInfiniteQuery<MessagePage>({
    queryKey: ['/api/messages', targetId, isGroup, userId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        userId,
        isGroup: isGroup.toString(),
        limit: '10',
        ...(pageParam ? { before: pageParam as string } : {})
      });
      
      const response = await fetch(`/api/messages/${targetId}?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    enabled,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // 🚀 单一数据源：从 React Query 缓存派生消息列表
  // 修复消息跳动问题：移除 useState + useEffect 双数据源架构
  const allMessages = useMemo(() => {
    if (!data?.pages) return [];
    // For cursor-based pagination, newer pages come first, so we need to reverse
    // the page order then flatten to get chronological order (oldest first)
    const reversedPages = [...data.pages].reverse();
    const result = reversedPages.flatMap(page => page.messages);
    console.log('🔄 [allMessages] 派生消息列表:', result.length, '条, 页数:', data.pages.length);
    return result;
  }, [data?.pages]);

  const addNewMessage = useCallback((message: MessageWithUser) => {
    console.log('📥 [addMessage] 添加消息:', message.id, message.content?.slice(0, 30));
    
    // 只更新 React Query 缓存，不再使用本地 state
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.pages) {
        console.log('📥 [addMessage] 初始化缓存');
        return {
          pages: [{ messages: [message], hasMore: false }],
          pageParams: [undefined]
        };
      }
      
      // 检查所有页面中是否已存在该消息（支持 clientMessageId 去重）
      const exists = oldData.pages.some((page: any) => 
        page.messages?.some((m: any) => m.id === message.id)
      );
      if (exists) {
        console.log('📥 [addMessage] 消息已存在，跳过:', message.id);
        return oldData;
      }
      
      const totalMsgsBefore = oldData.pages.reduce((acc: number, p: any) => acc + (p.messages?.length || 0), 0);
      console.log('📥 [addMessage] 添加前消息数:', totalMsgsBefore, '页数:', oldData.pages.length);
      
      // 🚀 修复：添加到 pages[0]（最新页），因为 allMessages 反转后 pages[0] 在末尾显示
      // pages[0] = 最新消息页，allMessages 用 reversedPages 让它显示在最后（时间顺序）
      const newData = {
        pages: oldData.pages.map((page: any, i: number) => 
          i === 0 ? { ...page, messages: [...page.messages, message] } : page
        ),
        pageParams: oldData.pageParams
      };
      
      const totalMsgsAfter = newData.pages.reduce((acc: number, p: any) => acc + (p.messages?.length || 0), 0);
      console.log('📥 [addMessage] 添加后消息数:', totalMsgsAfter);
      
      return newData;
    });
  }, [queryClient, queryKey]);

  // 🚀 更新现有消息（用于流式更新）
  const updateMessage = useCallback((messageId: string, updates: Partial<MessageWithUser>) => {
    // 只更新 React Query 缓存
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData?.pages) return oldData;
      
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          messages: page.messages?.map((msg: any) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ) || []
        }))
      };
    });
  }, [queryClient, queryKey]);

  const loadMoreMessages = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const refreshMessages = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    messages: allMessages,
    // 🚀 修复：切换聊天时显示"暂无消息"问题
    // isLoading 只在首次加载时为 true，切换聊天时因为 placeholderData 会变 false
    // 使用 isLoading || (isFetching && allMessages.length === 0) 确保切换时正确显示加载状态
    isLoading: isLoading || (isFetching && allMessages.length === 0),
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    error,
    loadMore: loadMoreMessages,
    addMessage: addNewMessage,
    updateMessage,
    refresh: refreshMessages
  };
}
