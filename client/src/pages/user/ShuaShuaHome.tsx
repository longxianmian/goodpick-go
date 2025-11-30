import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Search, Heart, MessageCircle, Ticket } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserBottomNav } from '@/components/UserBottomNav';
import { DrawerMenu } from '@/components/DrawerMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Campaign, Store } from '@shared/schema';

interface CampaignWithStores extends Campaign {
  stores: Store[];
}

const FEED_TABS = ['recommend', 'local'] as const;
type FeedTabType = typeof FEED_TABS[number];

const CATEGORIES = ['all', 'entertainment', 'healing', 'music', 'funny', 'drama', 'scenery', 'thoughts'] as const;
type CategoryType = typeof CATEGORIES[number];

function MenuIcon({ onClick }: { onClick: () => void }) {
  return (
    <button 
      className="w-8 h-8 flex flex-col justify-center gap-0.5"
      onClick={onClick}
      data-testid="button-menu"
    >
      <span className="h-[2px] w-5 bg-foreground rounded-full" />
      <span className="h-[2px] w-4 bg-foreground rounded-full" />
      <span className="h-[2px] w-3 bg-foreground rounded-full" />
    </button>
  );
}

function ContentCard({ campaign, index }: { campaign: CampaignWithStores; index: number }) {
  const { language, t } = useLanguage();
  const [liked, setLiked] = useState(false);
  const [likeCount] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [commentCount] = useState(() => Math.floor(Math.random() * 500) + 50);
  
  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(!liked);
  };

  const storeName = campaign.stores?.[0]?.name || t('feed.anonymousUser');
  const storeAvatar = campaign.stores?.[0]?.imageUrl;
  const cityName = campaign.stores?.[0]?.city || t('feed.defaultCity');

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <div 
        className="bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col cursor-pointer hover-elevate active-elevate-2"
        style={{ aspectRatio: '1 / 1.618' }}
        data-testid={`card-feed-${campaign.id}`}
      >
        <div className="flex-[2] w-full bg-muted flex items-center justify-center relative">
          {campaign.bannerImageUrl ? (
            <img 
              src={campaign.bannerImageUrl} 
              alt={getTitle()} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-[1] px-2.5 pt-2 pb-3 flex flex-col justify-between">
          <div 
            className="text-[11px] font-medium text-foreground line-clamp-2"
            data-testid={`text-feed-title-${campaign.id}`}
          >
            {getTitle()}
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Avatar className="w-5 h-5 flex-shrink-0">
                <AvatarImage src={storeAvatar || undefined} />
                <AvatarFallback className="text-[8px] bg-muted">
                  {storeName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[10px] text-foreground truncate">{storeName}</span>
                <span className="text-[9px] text-muted-foreground truncate">{cityName} · {t('feed.lifeShare')}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
              <button
                onClick={handleLike}
                className="flex items-center gap-0.5"
                data-testid={`button-like-${campaign.id}`}
              >
                <Heart className={`w-3 h-3 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{likeCount > 10 ? `${(likeCount / 10).toFixed(1)}k` : likeCount}</span>
              </button>
              <span className="flex items-center gap-0.5">
                <MessageCircle className="w-3 h-3" />
                <span>{commentCount}</span>
              </span>
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
      className="bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col"
      style={{ aspectRatio: '1 / 1.618' }}
    >
      <div className="flex-[2] w-full">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="flex-[1] px-2.5 pt-2 pb-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex items-center gap-2 mt-auto">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-2 w-16" />
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
  
  const { data: campaignsData, isLoading } = useQuery<{ success: boolean; data: CampaignWithStores[] }>({
    queryKey: ['/api/campaigns'],
  });

  const campaigns = campaignsData?.data || [];

  const feedTabLabels: Record<FeedTabType, string> = {
    recommend: t('feed.tabRecommend'),
    local: t('feed.tabLocal'),
  };

  const categoryLabels: Record<CategoryType, string> = {
    all: t('feed.catAll'),
    entertainment: t('feed.catEntertainment'),
    healing: t('feed.catHealing'),
    music: t('feed.catMusic'),
    funny: t('feed.catFunny'),
    drama: t('feed.catDrama'),
    scenery: t('feed.catScenery'),
    thoughts: t('feed.catThoughts'),
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
      
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <MenuIcon onClick={() => setDrawerOpen(true)} />
          
          <div className="flex items-center bg-muted rounded-full p-1 text-[11px]">
            {FEED_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFeedTab(tab)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                  activeFeedTab === tab
                    ? 'bg-foreground text-background font-medium'
                    : 'text-muted-foreground'
                }`}
                data-testid={`tab-feed-${tab}`}
              >
                {feedTabLabels[tab]}
              </button>
            ))}
          </div>
          
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground"
            data-testid="button-search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="bg-background border-b border-border">
        <div className="px-3 py-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap text-[11px] transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'bg-muted text-muted-foreground'
                }`}
                data-testid={`category-${cat}`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="px-3 pt-3 pb-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <ContentSkeleton key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Ticket className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">{t('feed.noContent')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {campaigns.map((campaign, index) => (
              <ContentCard key={campaign.id} campaign={campaign} index={index} />
            ))}
          </div>
        )}
      </main>

      <UserBottomNav />
    </div>
  );
}
