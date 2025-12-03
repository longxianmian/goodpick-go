import { useState, useCallback, useRef } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export interface ArticleCardData {
  id: number;
  contentType: 'article';
  coverImageUrl?: string | null;
  mediaUrls?: string[] | null;
  title?: string | null;
  description?: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  creatorUserId: number;
  creatorName?: string | null;
  creatorAvatar?: string | null;
  isLiked?: boolean;
}

interface ArticleCardProps {
  article: ArticleCardData;
  isActive: boolean;
  onLike?: (id: number) => void;
  onUserClick?: (userId: number) => void;
}

export function ArticleCard({ 
  article, 
  isActive, 
  onLike,
  onUserClick 
}: ArticleCardProps) {
  const [, setLocation] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liked, setLiked] = useState(article.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(article.likeCount);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const images = article.mediaUrls?.length 
    ? article.mediaUrls 
    : article.coverImageUrl 
      ? [article.coverImageUrl] 
      : [];
  const imageCount = images.length;

  const handleImageScroll = useCallback(() => {
    if (!imageContainerRef.current) return;
    const container = imageContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    const index = Math.round(scrollLeft / width);
    setCurrentImageIndex(index);
  }, []);

  const scrollToImage = useCallback((index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!imageContainerRef.current) return;
    const container = imageContainerRef.current;
    container.scrollTo({
      left: index * container.clientWidth,
      behavior: 'smooth'
    });
  }, []);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    onLike?.(article.id);
  }, [liked, article.id, onLike]);

  const handleCardClick = useCallback(() => {
    setLocation(`/articles/${article.id}`);
  }, [article.id, setLocation]);

  const formatCount = (count: number): string => {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + 'w';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div 
      className="relative h-full w-full bg-black flex flex-col"
      onClick={handleCardClick}
      data-testid={`article-card-${article.id}`}
    >
      {imageCount > 0 && (
        <div className="relative flex-1 min-h-0">
          <div 
            ref={imageContainerRef}
            className="h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
            onScroll={handleImageScroll}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {images.map((url, idx) => (
              <div 
                key={idx} 
                className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center"
              >
                <img
                  src={url}
                  alt={`${article.title || 'Article'} ${idx + 1}`}
                  className="max-w-full max-h-full object-contain"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>
          
          {imageCount > 1 && (
            <>
              <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {currentImageIndex + 1} / {imageCount}
              </div>
              
              {currentImageIndex > 0 && (
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"
                  onClick={(e) => scrollToImage(currentImageIndex - 1, e)}
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              )}
              
              {currentImageIndex < imageCount - 1 && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"
                  onClick={(e) => scrollToImage(currentImageIndex + 1, e)}
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              )}
              
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

      <div className="absolute bottom-20 left-4 right-16 text-white">
        <div 
          className="flex items-center gap-3 mb-3"
          onClick={(e) => {
            e.stopPropagation();
            onUserClick?.(article.creatorUserId);
          }}
        >
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={article.creatorAvatar || undefined} />
            <AvatarFallback className="bg-gray-600 text-white">
              {(article.creatorName || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm drop-shadow-lg">
            @{article.creatorName || 'Anonymous'}
          </span>
        </div>

        {article.title && (
          <h3 className="font-bold text-base mb-2 drop-shadow-lg line-clamp-2">
            {article.title}
          </h3>
        )}

        {article.description && (
          <p className="text-sm mb-2 drop-shadow-lg line-clamp-2 text-white/90">
            {stripHtml(article.description)}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2">
          <Button 
            size="sm" 
            className="bg-[#38B03B] hover:bg-[#2d8f2f] text-white text-xs h-7 px-4"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/articles/${article.id}`);
            }}
          >
            查看详情
          </Button>
        </div>
      </div>

      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <button
          className="flex flex-col items-center gap-1"
          onClick={handleLike}
          data-testid={`button-like-article-${article.id}`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${liked ? 'bg-red-500' : 'bg-white/20'} backdrop-blur`}>
            <Heart className={`w-5 h-5 ${liked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(likeCount)}
          </span>
        </button>

        <button
          className="flex flex-col items-center gap-1"
          onClick={(e) => { 
            e.stopPropagation(); 
            setLocation(`/articles/${article.id}`);
          }}
          data-testid={`button-comment-article-${article.id}`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(article.commentCount)}
          </span>
        </button>

        <button
          className="flex flex-col items-center gap-1"
          onClick={(e) => { e.stopPropagation(); }}
          data-testid={`button-bookmark-article-${article.id}`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(Math.floor(article.shareCount / 2))}
          </span>
        </button>

        <button
          className="flex flex-col items-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.share) {
              navigator.share({
                title: article.title || '分享图文',
                url: window.location.origin + `/articles/${article.id}`,
              }).catch(() => {});
            } else {
              navigator.clipboard.writeText(window.location.origin + `/articles/${article.id}`);
            }
          }}
          data-testid={`button-share-article-${article.id}`}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            分享
          </span>
        </button>
      </div>
    </div>
  );
}
