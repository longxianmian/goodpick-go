import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  X, 
  Heart, 
  Send,
  Reply,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface Comment {
  id: number;
  content: string;
  userId: number;
  userName: string;
  userAvatar: string | null;
  likeCount: number;
  createdAt: string;
  isLiked: boolean;
  parentId?: number | null;
  replies?: Comment[];
  replyCount?: number;
}

interface CommentsResponse {
  success: boolean;
  data: {
    items: Comment[];
    hasMore: boolean;
    nextCursor: number | null;
  };
}

interface CommentDrawerProps {
  videoId: number;
  isOpen: boolean;
  onClose: () => void;
  commentCount?: number;
}

export function CommentDrawer({ videoId, isOpen, onClose, commentCount = 0 }: CommentDrawerProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isUserAuthenticated, user } = useAuth();
  
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [commentLikes, setCommentLikes] = useState<Record<number, boolean>>({});
  const [commentLikeCounts, setCommentLikeCounts] = useState<Record<number, number>>({});
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  
  const commentInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const { data: commentsData, isLoading } = useQuery<CommentsResponse>({
    queryKey: ['/api/short-videos', videoId, 'comments'],
    queryFn: async () => {
      const response = await fetch(`/api/short-videos/${videoId}/comments`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      return response.json();
    },
    enabled: isOpen && !!videoId,
  });

  const comments = commentsData?.data?.items || [];

  useEffect(() => {
    if (comments.length > 0) {
      const initialLikes: Record<number, boolean> = {};
      const initialCounts: Record<number, number> = {};
      comments.forEach(comment => {
        initialLikes[comment.id] = comment.isLiked;
        initialCounts[comment.id] = comment.likeCount;
        if (comment.replies) {
          comment.replies.forEach(reply => {
            initialLikes[reply.id] = reply.isLiked;
            initialCounts[reply.id] = reply.likeCount;
          });
        }
      });
      setCommentLikes(initialLikes);
      setCommentLikeCounts(initialCounts);
    }
  }, [comments]);

  useEffect(() => {
    if (isOpen && commentInputRef.current) {
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: number }) => {
      const res = await apiRequest('POST', `/api/short-videos/${videoId}/comments`, { 
        content,
        parentId: parentId || null 
      });
      return res.json();
    },
    onSuccess: () => {
      setCommentText('');
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['/api/short-videos', videoId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/short-videos/feed'] });
      toast({
        title: replyingTo ? (t('article.replySuccess') || '回复成功') : (t('article.commentSuccess') || '评论成功'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error') || '操作失败',
        variant: 'destructive',
      });
    },
  });

  const commentLikeMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const res = await apiRequest('POST', `/api/short-videos/comments/${commentId}/like`);
      return res.json();
    },
    onSuccess: (data, commentId) => {
      if (data.liked) {
        setCommentLikes(prev => ({ ...prev, [commentId]: true }));
        setCommentLikeCounts(prev => ({ ...prev, [commentId]: (prev[commentId] || 0) + 1 }));
      } else {
        setCommentLikes(prev => ({ ...prev, [commentId]: false }));
        setCommentLikeCounts(prev => ({ ...prev, [commentId]: Math.max(0, (prev[commentId] || 0) - 1) }));
      }
    },
    onError: () => {
      toast({
        title: t('common.error') || '操作失败',
        variant: 'destructive',
      });
    },
  });

  const handleCommentSubmit = () => {
    if (!commentText.trim()) return;
    if (!isUserAuthenticated) {
      toast({
        title: t('auth.loginRequired') || '请先登录',
      });
      return;
    }
    commentMutation.mutate({ 
      content: commentText.trim(),
      parentId: replyingTo?.id 
    });
  };

  const handleReplyClick = (comment: Comment) => {
    if (!isUserAuthenticated) {
      toast({
        title: t('auth.loginRequired') || '请先登录',
      });
      return;
    }
    setReplyingTo(comment);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  const handleCommentLike = (commentId: number) => {
    if (!isUserAuthenticated) {
      toast({
        title: t('auth.loginRequired') || '请先登录',
      });
      return;
    }
    commentLikeMutation.mutate(commentId);
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('time.justNow') || '刚刚';
    if (diffMins < 60) return `${diffMins}${t('time.minutesAgo') || '分钟前'}`;
    if (diffHours < 24) return `${diffHours}${t('time.hoursAgo') || '小时前'}`;
    if (diffDays < 7) return `${diffDays}${t('time.daysAgo') || '天前'}`;
    return date.toLocaleDateString();
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div 
      key={comment.id} 
      className={cn("py-3", isReply && "pl-10")}
      data-testid={`comment-item-${comment.id}`}
    >
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.userAvatar || undefined} />
          <AvatarFallback className="text-xs bg-muted">
            {comment.userName?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-foreground truncate">
              {comment.userName || '匿名用户'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground"
              onClick={() => handleCommentLike(comment.id)}
              data-testid={`button-comment-like-${comment.id}`}
            >
              <Heart 
                className={cn(
                  "w-4 h-4",
                  commentLikes[comment.id] && "fill-red-500 text-red-500"
                )} 
              />
              <span>{commentLikeCounts[comment.id] || 0}</span>
            </button>
            {!isReply && (
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground"
                onClick={() => handleReplyClick(comment)}
                data-testid={`button-reply-${comment.id}`}
              >
                <Reply className="w-4 h-4" />
                <span>{t('article.reply') || '回复'}</span>
              </button>
            )}
          </div>
          
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              <button
                className="flex items-center gap-1 text-xs text-primary"
                onClick={() => toggleReplies(comment.id)}
                data-testid={`button-toggle-replies-${comment.id}`}
              >
                <ChevronDown 
                  className={cn(
                    "w-3 h-3 transition-transform",
                    expandedReplies.has(comment.id) && "rotate-180"
                  )} 
                />
                <span>
                  {expandedReplies.has(comment.id) 
                    ? (t('article.hideReplies') || '收起回复')
                    : `${t('article.viewReplies') || '查看'} ${comment.replies.length} ${t('article.repliesCount') || '条回复'}`
                  }
                </span>
              </button>
              {expandedReplies.has(comment.id) && (
                <div className="mt-2 border-l-2 border-muted">
                  {comment.replies.map(reply => renderComment(reply, true))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        data-testid="comment-drawer-overlay"
      />
      
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 flex flex-col"
        style={{ maxHeight: '70vh' }}
        data-testid="comment-drawer"
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <h3 className="text-base font-semibold">
            {t('article.comments') || '评论'} ({commentCount || comments.length})
          </h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            data-testid="button-close-comments"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">{t('article.noComments') || '暂无评论'}</p>
              <p className="text-xs mt-1">{t('article.beFirstToComment') || '快来发表第一条评论吧'}</p>
            </div>
          ) : (
            <div className="divide-y">
              {comments.map(comment => renderComment(comment))}
            </div>
          )}
        </div>

        <div className="p-3 border-t bg-background sticky bottom-0">
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 px-2 py-1 bg-muted rounded text-sm">
              <span className="text-muted-foreground">
                {t('article.replyingTo') || '回复'} @{replyingTo.userName}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={() => setReplyingTo(null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="text-xs bg-muted">
                {user?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <Input
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                replyingTo 
                  ? `${t('article.replyTo') || '回复'} @${replyingTo.userName}...`
                  : (t('article.addComment') || '写评论...')
              }
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
              disabled={!commentText.trim() || commentMutation.isPending}
              onClick={handleCommentSubmit}
              data-testid="button-send-comment"
            >
              {commentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
