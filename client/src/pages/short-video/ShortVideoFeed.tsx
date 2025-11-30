import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { VerticalSwiper } from '@/components/short-video/VerticalSwiper';
import { VideoCard, ShortVideoData } from '@/components/short-video/VideoCard';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface FeedResponse {
  success: boolean;
  data: {
    items: ShortVideoData[];
    nextCursor: number | null;
    hasMore: boolean;
  };
}

export default function ShortVideoFeed() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isUserAuthenticated, user } = useAuth();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allVideos, setAllVideos] = useState<ShortVideoData[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [hasMore, setHasMore] = useState(true);

  const { data, isLoading, isError, error } = useQuery<FeedResponse>({
    queryKey: ['/api/short-videos/feed', { cursor: 0 }],
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (data?.success && data.data.items.length > 0) {
      setAllVideos(data.data.items);
      setCursor(data.data.nextCursor);
      setHasMore(data.data.hasMore);
    }
  }, [data]);

  const loadMore = useCallback(async () => {
    if (!hasMore || cursor === null) return;

    try {
      const response = await fetch(`/api/short-videos/feed?cursor=${cursor}&limit=10`);
      const result: FeedResponse = await response.json();
      
      if (result.success && result.data.items.length > 0) {
        setAllVideos(prev => [...prev, ...result.data.items]);
        setCursor(result.data.nextCursor);
        setHasMore(result.data.hasMore);
      }
    } catch (err) {
      console.error('Failed to load more videos:', err);
    }
  }, [cursor, hasMore]);

  const likeMutation = useMutation({
    mutationFn: async (videoId: number) => {
      const res = await apiRequest('POST', `/api/short-videos/${videoId}/like`);
      return res.json();
    },
    onError: () => {
      if (!isUserAuthenticated) {
        toast({
          title: '请先登录',
          description: '登录后即可点赞视频',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '操作失败',
          description: '请稍后重试',
          variant: 'destructive',
        });
      }
    },
  });

  const handleLike = useCallback((videoId: number) => {
    if (!isUserAuthenticated) {
      toast({
        title: '请先登录',
        description: '登录后即可点赞视频',
      });
      return;
    }
    likeMutation.mutate(videoId);
  }, [isUserAuthenticated, likeMutation, toast]);

  const handleComment = useCallback((videoId: number) => {
    toast({
      title: '评论功能',
      description: '评论功能即将上线',
    });
  }, [toast]);

  const handleShare = useCallback((videoId: number) => {
    if (navigator.share) {
      navigator.share({
        title: '分享短视频',
        url: window.location.origin + `/video/${videoId}`,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.origin + `/video/${videoId}`);
      toast({
        title: '链接已复制',
        description: '视频链接已复制到剪贴板',
      });
    }
  }, [toast]);

  const handleUserClick = useCallback((userId: number) => {
    setLocation(`/user/${userId}`);
  }, [setLocation]);

  const handleReachEnd = useCallback(() => {
    loadMore();
  }, [loadMore]);

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-white text-center">
          {(error as any)?.message || '加载视频失败'}
        </p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          data-testid="button-retry"
        >
          重试
        </Button>
      </div>
    );
  }

  if (allVideos.length === 0) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-white/60" />
        </div>
        <p className="text-white/80 text-center text-lg">
          暂无视频
        </p>
        <p className="text-white/50 text-center text-sm">
          成为第一个发布者吧
        </p>
        <Button
          className="mt-4"
          onClick={() => setLocation('/creator/create')}
          data-testid="button-create-video"
        >
          发布视频
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative">
      <div className="absolute top-4 left-4 z-50">
        <Button
          size="icon"
          variant="ghost"
          className="text-white bg-black/20 backdrop-blur"
          onClick={() => setLocation('/')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-4">
        <button className="text-white/60 text-sm font-medium">关注</button>
        <button className="text-white text-sm font-medium border-b-2 border-white pb-1">推荐</button>
      </div>

      <VerticalSwiper
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        onReachEnd={handleReachEnd}
      >
        {allVideos.map((video, index) => (
          <VideoCard
            key={video.id}
            video={video}
            isActive={index === currentIndex}
            onLike={handleLike}
            onComment={handleComment}
            onShare={handleShare}
            onUserClick={handleUserClick}
          />
        ))}
      </VerticalSwiper>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex gap-1">
          {allVideos.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, idx) => {
            const actualIdx = Math.max(0, currentIndex - 2) + idx;
            return (
              <div
                key={actualIdx}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  actualIdx === currentIndex ? 'bg-white' : 'bg-white/30'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
