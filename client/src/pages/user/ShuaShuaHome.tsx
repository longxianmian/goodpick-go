import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Search, Heart, Play, Video, Eye, Image } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserBottomNav } from '@/components/UserBottomNav';
import { DrawerMenu } from '@/components/DrawerMenu';
import { useLanguage } from '@/contexts/LanguageContext';

interface FeedItem {
  id: number;
  contentType: 'video' | 'article';  // 内容类型
  videoUrl?: string | null;
  hlsUrl?: string;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  mediaUrls?: string[] | null;  // 图文的多张图片
  title?: string;
  description?: string;
  duration?: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  creatorName?: string;
  creatorAvatar?: string;
  creatorUserId: number;
  isLiked?: boolean;
}

interface FeedResponse {
  success: boolean;
  data: {
    items: FeedItem[];
    nextCursor: number | null;
    hasMore: boolean;
  };
}

const FEED_TABS = ['recommend', 'local'] as const;
type FeedTabType = typeof FEED_TABS[number];

const CATEGORIES = ['all', 'funny', 'musicDance', 'drama', 'daily', 'healing', 'food', 'beauty', 'games'] as const;
type CategoryType = typeof CATEGORIES[number];

const GRADIENT_COLORS = [
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-blue-500',
];

function MenuIcon({ onClick }: { onClick: () => void }) {
  return (
    <button 
      className="w-9 h-9 flex flex-col justify-center items-center gap-[3px] rounded-full hover-elevate active-elevate-2"
      onClick={onClick}
      data-testid="button-menu"
    >
      <span className="h-[1.5px] w-4 bg-foreground rounded-full" />
      <span className="h-[1.5px] w-4 bg-foreground rounded-full" />
      <span className="h-[1.5px] w-4 bg-foreground rounded-full" />
    </button>
  );
}

function FeedItemCard({ item, index }: { item: FeedItem; index: number }) {
  const { t } = useLanguage();
  const [liked, setLiked] = useState(item.isLiked || false);
  
  const gradientClass = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
  const isArticle = item.contentType === 'article';
  const imageCount = item.mediaUrls?.length || 0;

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(!liked);
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

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const coverImage = item.coverImageUrl || item.thumbnailUrl || (item.mediaUrls?.[0]);

  return (
    <Link href={isArticle ? `/articles/${item.id}` : `/videos/${item.id}`}>
      <div 
        className="bg-card rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200"
        style={{ aspectRatio: '1 / 1.618' }}
        data-testid={`card-${isArticle ? 'article' : 'video'}-${item.id}`}
      >
        <div className="relative w-full h-[65%] overflow-hidden">
          {coverImage ? (
            <>
              <img 
                src={coverImage} 
                alt={item.title || (isArticle ? t('feed.article') : t('feed.video'))} 
                className="w-full h-full object-cover"
              />
              {isArticle ? (
                <div className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Image className="w-2.5 h-2.5" />
                  <span>{imageCount}</span>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-foreground ml-0.5" fill="currentColor" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
              <div className="text-center text-white/90">
                {isArticle ? (
                  <>
                    <Image className="w-6 h-6 mx-auto mb-1 opacity-80" />
                    <span className="text-[10px] font-medium opacity-70">{t('feed.article')}</span>
                  </>
                ) : (
                  <>
                    <Video className="w-6 h-6 mx-auto mb-1 opacity-80" />
                    <span className="text-[10px] font-medium opacity-70">{t('feed.video')}</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {!isArticle && item.duration && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
              {formatDuration(item.duration)}
            </div>
          )}
        </div>

        <div className="h-[35%] p-2 flex flex-col justify-between">
          <h3 
            className="text-xs font-medium line-clamp-2 leading-tight"
            data-testid={`text-title-${item.id}`}
          >
            {item.title || t('feed.untitled')}
          </h3>

          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Avatar className="w-4 h-4 flex-shrink-0">
                <AvatarImage src={item.creatorAvatar} />
                <AvatarFallback className="text-[8px] bg-muted">
                  {(item.creatorName || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate">
                {item.creatorName || t('feed.anonymousUser')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <Eye className="w-3 h-3" />
                {formatNumber(item.viewCount)}
              </span>
              <button
                onClick={handleLike}
                className="flex items-center gap-0.5 text-[9px] text-muted-foreground"
                data-testid={`button-like-${item.id}`}
              >
                <Heart className={`w-3 h-3 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                <span className={liked ? 'text-red-500' : ''}>{formatNumber(item.likeCount + (liked ? 1 : 0))}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ContentSkeleton() {
  return (
    <div 
      className="bg-card rounded-xl overflow-hidden shadow-sm"
      style={{ aspectRatio: '1 / 1.618' }}
    >
      <div className="w-full h-[65%]">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="h-[35%] p-2 flex flex-col justify-between">
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-2 w-12" />
        </div>
      </div>
    </div>
  );
}

export default function ShuaShuaHome() {
  const { t } = useLanguage();
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTabType>('recommend');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const { data: feedData, isLoading } = useQuery<FeedResponse>({
    queryKey: ['/api/short-videos/feed', activeCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') {
        params.set('category', activeCategory);
      }
      const url = `/api/short-videos/feed${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch feed');
      }
      return response.json();
    },
  });

  const feedItems = feedData?.data?.items || [];

  const feedTabLabels: Record<FeedTabType, string> = {
    recommend: t('feed.tabRecommend'),
    local: t('feed.tabLocal'),
  };

  const categoryLabels: Record<CategoryType, string> = {
    all: t('categories.all'),
    funny: t('categories.funny'),
    musicDance: t('categories.musicDance'),
    drama: t('categories.drama'),
    daily: t('categories.daily'),
    healing: t('categories.healing'),
    food: t('categories.food'),
    beauty: t('categories.beauty'),
    games: t('categories.games'),
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
      
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-3 h-14">
          <MenuIcon onClick={() => setDrawerOpen(true)} />
          
          <div className="flex items-center gap-1">
            {FEED_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFeedTab(tab)}
                className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
                  activeFeedTab === tab
                    ? 'text-[#38B03B]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`tab-feed-${tab}`}
              >
                {feedTabLabels[tab]}
              </button>
            ))}
          </div>
          
          <button 
            className="w-9 h-9 flex items-center justify-center rounded-full hover-elevate active-elevate-2"
            data-testid="button-search"
          >
            <Search className="w-[18px] h-[18px] text-foreground" />
          </button>
        </div>
      </header>

      <div className="bg-background sticky top-14 z-30 border-b border-border/30">
        <div className="px-3 py-2.5 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-[#38B03B] text-white shadow-sm'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                data-testid={`category-${cat}`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="px-2 pt-2 pb-4 max-w-md mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ContentSkeleton key={i} />
            ))}
          </div>
        ) : feedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
              <Video className="w-10 h-10 text-primary/60" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">{t('feed.noContent')}</p>
            <p className="text-muted-foreground/70 text-xs mt-1">{t('feed.checkBackLater')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {feedItems.map((item, index) => (
              <FeedItemCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </main>

      <UserBottomNav />
    </div>
  );
}
