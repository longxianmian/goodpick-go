import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Search, Heart, MessageCircle, Ticket, Sparkles, MapPin, Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
      className="w-9 h-9 flex flex-col justify-center items-center gap-1 rounded-full hover-elevate active-elevate-2"
      onClick={onClick}
      data-testid="button-menu"
    >
      <span className="h-[2px] w-5 bg-foreground rounded-full" />
      <span className="h-[2px] w-4 bg-foreground rounded-full ml-1" />
    </button>
  );
}

function ContentCard({ campaign, index }: { campaign: CampaignWithStores; index: number }) {
  const { language, t } = useLanguage();
  const [liked, setLiked] = useState(false);
  const [likeCount] = useState(() => Math.floor(Math.random() * 2000) + 100);
  const [commentCount] = useState(() => Math.floor(Math.random() * 500) + 50);
  
  const gradientClass = GRADIENT_COLORS[index % GRADIENT_COLORS.length];
  
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

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const isVideo = campaign.bannerImageUrl?.includes('.mp4') || campaign.bannerImageUrl?.includes('video');

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <div 
        className="bg-card rounded-xl overflow-hidden flex flex-col cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200"
        data-testid={`card-feed-${campaign.id}`}
      >
        <div 
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '1 / 1.618' }}
        >
          {campaign.bannerImageUrl ? (
            <>
              <img 
                src={campaign.bannerImageUrl} 
                alt={getTitle()} 
                className="w-full h-full object-cover"
              />
              {isVideo && (
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
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-80" />
                <span className="text-xs font-medium opacity-70">{t('feed.specialOffer')}</span>
              </div>
            </div>
          )}
          
          {campaign.discountType && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 bg-red-500 text-white border-0 text-[10px] px-1.5 py-0.5"
            >
              {campaign.discountType === 'percentage_off' 
                ? `-${campaign.couponValue}%` 
                : campaign.discountType === 'cash_voucher' 
                  ? `฿${campaign.couponValue}` 
                  : `฿${campaign.couponValue}`}
            </Badge>
          )}
        </div>

        <div className="p-2.5 flex flex-col gap-2">
          <h3 
            className="text-xs font-medium text-foreground line-clamp-2 leading-snug min-h-[2.5em]"
            data-testid={`text-feed-title-${campaign.id}`}
          >
            {getTitle()}
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Avatar className="w-5 h-5 flex-shrink-0 ring-1 ring-border">
                <AvatarImage src={storeAvatar || undefined} />
                <AvatarFallback className="text-[8px] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-foreground">
                  {storeName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-none min-w-0">
                <span className="text-[10px] text-foreground font-medium truncate max-w-[80px]">{storeName}</span>
                <span className="text-[9px] text-muted-foreground truncate flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {cityName}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-shrink-0">
              <button
                onClick={handleLike}
                className="flex items-center gap-0.5 transition-colors"
                data-testid={`button-like-${campaign.id}`}
              >
                <Heart className={`w-3.5 h-3.5 transition-all ${liked ? 'fill-red-500 text-red-500 scale-110' : ''}`} />
                <span className={liked ? 'text-red-500' : ''}>{formatNumber(likeCount + (liked ? 1 : 0))}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ContentSkeleton({ index }: { index: number }) {
  return (
    <div className="bg-card rounded-xl overflow-hidden flex flex-col shadow-sm">
      <div 
        className="w-full"
        style={{ aspectRatio: '1 / 1.618' }}
      >
        <Skeleton className="w-full h-full" />
      </div>
      <div className="p-2.5 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-2.5 w-16" />
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
    <div className="min-h-screen bg-background pb-20">
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
      
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-3 py-2.5">
          <MenuIcon onClick={() => setDrawerOpen(true)} />
          
          <div className="flex items-center bg-muted rounded-full p-0.5">
            {FEED_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFeedTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  activeFeedTab === tab
                    ? 'bg-foreground text-background shadow-sm'
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

      <div className="bg-background sticky top-[52px] z-30 border-b border-border/30">
        <div className="px-3 py-2.5 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-sm'
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

      <main className="px-2 pt-2 pb-4">
        {isLoading ? (
          <div className="columns-2 gap-2 space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="break-inside-avoid mb-2">
                <ContentSkeleton index={i} />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
              <Ticket className="w-10 h-10 text-primary/60" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">{t('feed.noContent')}</p>
            <p className="text-muted-foreground/70 text-xs mt-1">{t('feed.checkBackLater')}</p>
          </div>
        ) : (
          <div className="columns-2 gap-2">
            {campaigns.map((campaign, index) => (
              <div key={campaign.id} className="break-inside-avoid mb-2">
                <ContentCard campaign={campaign} index={index} />
              </div>
            ))}
          </div>
        )}
      </main>

      <UserBottomNav />
    </div>
  );
}
