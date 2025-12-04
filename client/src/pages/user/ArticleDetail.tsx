import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link, useLocation } from 'wouter';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark,
  Eye,
  MoreHorizontal,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ArticleData {
  id: number;
  contentType: 'article' | 'video';
  title?: string;
  description?: string;
  coverImageUrl?: string;
  mediaUrls?: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  creatorName?: string;
  creatorAvatar?: string;
  creatorUserId: number;
  storeId?: number;
  createdAt: string;
  isLiked?: boolean;
}

interface Comment {
  id: number;
  content: string;
  userId: number;
  userName: string;
  userAvatar: string | null;
  likeCount: number;
  createdAt: string;
  isLiked: boolean;
}

interface ArticleResponse {
  success: boolean;
  data: ArticleData;
}

interface CommentsResponse {
  success: boolean;
  data: {
    items: Comment[];
    hasMore: boolean;
    nextCursor: number | null;
  };
}

export default function ArticleDetail() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isUserAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/articles/:id');
  const articleId = params?.id;
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery<ArticleResponse>({
    queryKey: ['/api/short-videos', articleId],
    queryFn: async () => {
      const response = await fetch(`/api/short-videos/${articleId}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }
      return response.json();
    },
    enabled: !!articleId,
  });

  const { data: commentsData } = useQuery<CommentsResponse>({
    queryKey: ['/api/short-videos', articleId, 'comments'],
    queryFn: async () => {
      const response = await fetch(`/api/short-videos/${articleId}/comments`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      return response.json();
    },
    enabled: !!articleId,
  });

  const article = data?.data;
  const comments = commentsData?.data?.items || [];
  const images = article?.mediaUrls?.length ? article.mediaUrls : 
                 article?.coverImageUrl ? [article.coverImageUrl] : [];
  const imageCount = images.length;

  useEffect(() => {
    if (article) {
      setLiked(article.isLiked || false);
      setLikeCount(article.likeCount);
    }
  }, [article]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/short-videos/${articleId}/like`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.liked) {
        setLiked(true);
        setLikeCount(prev => prev + 1);
      } else {
        setLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      }
      queryClient.invalidateQueries({ queryKey: ['/api/short-videos', articleId] });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', `/api/short-videos/${articleId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      setCommentText('');
      setShowCommentInput(false);
      queryClient.invalidateQueries({ queryKey: ['/api/short-videos', articleId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/short-videos', articleId] });
      toast({
        title: t('article.commentSuccess') || '评论成功',
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    },
  });

  const handleLike = () => {
    if (!isUserAuthenticated) {
      toast({
        title: t('auth.loginRequired') || '请先登录',
      });
      return;
    }
    likeMutation.mutate();
  };

  const handleBookmark = () => {
    if (!isUserAuthenticated) {
      toast({
        title: t('auth.loginRequired') || '请先登录',
      });
      return;
    }
    setBookmarked(!bookmarked);
    toast({
      title: bookmarked ? (t('article.unbookmarked') || '已取消收藏') : (t('article.bookmarked') || '已收藏'),
    });
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title || t('feed.article'),
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: t('common.linkCopied') || '链接已复制',
      });
    }
  };

  const handleCommentSubmit = () => {
    if (!commentText.trim()) return;
    if (!isUserAuthenticated) {
      toast({
        title: t('auth.loginRequired') || '请先登录',
      });
      return;
    }
    commentMutation.mutate(commentText.trim());
  };

  const handleCommentClick = () => {
    setShowCommentInput(true);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  const handleImageScroll = () => {
    if (imageContainerRef.current) {
      const container = imageContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const width = container.clientWidth;
      const newIndex = Math.round(scrollLeft / width);
      setCurrentImageIndex(newIndex);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + 'w';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('time.justNow') || '刚刚';
    if (diffMins < 60) return `${diffMins}${t('time.minutesAgo') || '分钟前'}`;
    if (diffHours < 24) return `${diffHours}${t('time.hoursAgo') || '小时前'}`;
    if (diffDays < 7) return `${diffDays}${t('time.daysAgo') || '天前'}`;
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const formatCommentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('time.justNow') || '刚刚';
    if (diffMins < 60) return `${diffMins}${t('time.minutesAgo') || '分钟前'}`;
    if (diffHours < 24) return `${diffHours}${t('time.hoursAgo') || '小时前'}`;
    if (diffDays < 30) return `${diffDays}${t('time.daysAgo') || '天前'}`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="flex items-center h-12 px-4 gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </header>
        <div className="space-y-0">
          <Skeleton className="w-full aspect-[3/4]" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">{t('common.error')}</p>
        <Link href="/">
          <Button variant="outline">{t('common.back')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between h-12 px-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                if (article.storeId) {
                  setLocation(`/store/${article.storeId}`);
                }
              }}
              data-testid="link-creator-avatar"
            >
              <Avatar className="w-8 h-8 border">
                <AvatarImage src={article.creatorAvatar || undefined} />
                <AvatarFallback className="text-xs bg-muted">
                  {(article.creatorName || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium max-w-[120px] truncate">
                {article.creatorName || t('feed.anonymousUser')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="default" 
              size="sm"
              className="h-7 px-4 text-xs font-medium bg-[#38B03B] hover:bg-[#2d8f2f]"
              data-testid="button-follow"
            >
              {t('article.follow')}
            </Button>
            <Button variant="ghost" size="icon" data-testid="button-more">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-16">
        {imageCount > 0 && (
          <div className="relative bg-black">
            <div 
              ref={imageContainerRef}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              onScroll={handleImageScroll}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {images.map((url, idx) => (
                <div 
                  key={idx} 
                  className="flex-shrink-0 w-full snap-center"
                >
                  <img
                    src={url}
                    alt={`${t('feed.article')} ${idx + 1}`}
                    className="w-full h-auto"
                    style={{ maxHeight: '70vh', objectFit: 'contain' }}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              ))}
            </div>
            
            {imageCount > 1 && (
              <>
                <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {currentImageIndex + 1} / {imageCount}
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentImageIndex 
                          ? 'bg-white w-4' 
                          : 'bg-white/40 w-1.5'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="p-4 space-y-4">
          {article.title && (
            <h1 className="text-lg font-bold leading-snug" data-testid="text-article-title">
              {article.title}
            </h1>
          )}

          {article.description && (
            <div 
              className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap prose prose-sm max-w-none
                prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
                prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm"
              dangerouslySetInnerHTML={{ __html: article.description }}
              data-testid="text-article-content"
            />
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2">
            <span>{formatDate(article.createdAt)}</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatNumber(article.viewCount)} {t('article.views') || '阅读'}
            </span>
          </div>
        </div>

        <div className="border-t">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">
              {t('article.comments') || '评论'} {article.commentCount > 0 && `(${article.commentCount})`}
            </span>
          </div>

          {comments.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t('article.noComments') || '还没有评论，快来抢沙发吧'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {comments.map((comment) => (
                <div key={comment.id} className="px-4 py-3 flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={comment.userAvatar || undefined} />
                    <AvatarFallback className="text-xs bg-muted">
                      {(comment.userName || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{comment.userName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCommentDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                        {comment.likeCount > 0 && comment.likeCount}
                      </button>
                      <button className="text-xs text-muted-foreground">
                        {t('article.reply') || '回复'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t safe-area-inset-bottom">
        <div className="flex items-center gap-2 px-3 py-2">
          {showCommentInput ? (
            <div className="flex-1 flex items-center gap-2">
              <Input
                ref={commentInputRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('article.writeComment') || '写评论...'}
                className="flex-1 h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommentSubmit();
                  }
                }}
                data-testid="input-comment"
              />
              <Button 
                size="icon"
                variant="ghost"
                onClick={handleCommentSubmit}
                disabled={!commentText.trim() || commentMutation.isPending}
                data-testid="button-send-comment"
              >
                <Send className="w-5 h-5 text-[#38B03B]" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShowCommentInput(false)}
                className="text-xs"
              >
                {t('common.cancel') || '取消'}
              </Button>
            </div>
          ) : (
            <>
              <div 
                className="flex-1 h-9 px-4 rounded-full bg-muted flex items-center cursor-text"
                onClick={handleCommentClick}
                data-testid="button-open-comment"
              >
                <span className="text-sm text-muted-foreground">
                  {t('article.writeComment') || '写评论...'}
                </span>
              </div>

              <button
                onClick={handleLike}
                className="flex flex-col items-center justify-center w-12 py-1"
                data-testid="button-like"
              >
                <Heart 
                  className={`w-6 h-6 ${liked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                />
                <span className={`text-xs mt-0.5 ${liked ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {formatNumber(likeCount)}
                </span>
              </button>

              <button
                onClick={handleBookmark}
                className="flex flex-col items-center justify-center w-12 py-1"
                data-testid="button-bookmark"
              >
                <Bookmark 
                  className={`w-6 h-6 ${bookmarked ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} 
                />
                <span className={`text-xs mt-0.5 ${bookmarked ? 'text-amber-500' : 'text-muted-foreground'}`}>
                  {t('article.collect') || '收藏'}
                </span>
              </button>

              <button
                onClick={handleCommentClick}
                className="flex flex-col items-center justify-center w-12 py-1"
                data-testid="button-comment"
              >
                <MessageCircle className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs mt-0.5 text-muted-foreground">
                  {article.commentCount > 0 ? formatNumber(article.commentCount) : (t('article.comment') || '评论')}
                </span>
              </button>

              <button
                onClick={handleShare}
                className="flex flex-col items-center justify-center w-12 py-1"
                data-testid="button-share"
              >
                <Share2 className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs mt-0.5 text-muted-foreground">
                  {t('common.share') || '分享'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
