import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Search, Ticket, Heart, MapPin, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Campaign, Store as StoreType } from '@shared/schema';

interface CampaignWithStores extends Campaign {
  stores: StoreType[];
}

const DISCOVER_CATEGORIES = ['food', 'shopping', 'relax', 'family', 'entertainment', 'stay', 'travel', 'featured'] as const;
type DiscoverCategoryType = typeof DISCOVER_CATEGORIES[number];

function DiscoverCard({ campaign }: { campaign: CampaignWithStores }) {
  const { language, t } = useLanguage();
  const [liked, setLiked] = useState(false);
  const [likeCount] = useState(() => Math.floor(Math.random() * 20) + 1);
  
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

  const storeName = campaign.stores?.[0]?.name || t('discover.merchantOfficial');
  const storeAvatar = campaign.stores?.[0]?.imageUrl;

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <div 
        className="bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col cursor-pointer hover-elevate active-elevate-2"
        style={{ aspectRatio: '1 / 1.618' }}
        data-testid={`card-discover-${campaign.id}`}
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

        <div className="flex-[1] px-2.5 py-2 flex flex-col justify-between">
          <div 
            className="text-[11px] font-medium text-foreground line-clamp-2"
            data-testid={`text-discover-title-${campaign.id}`}
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
                <span className="text-[10px] font-medium text-foreground truncate">{storeName}</span>
                <span className="text-[9px] text-muted-foreground">{t('discover.merchantOfficial')}</span>
              </div>
            </div>
            
            <button
              onClick={handleLike}
              className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0"
              data-testid={`button-like-${campaign.id}`}
            >
              <Heart className={`w-3 h-3 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}k` : String(likeCount)}</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

function DiscoverSkeleton() {
  return (
    <div 
      className="bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col"
      style={{ aspectRatio: '1 / 1.618' }}
    >
      <div className="flex-[2] w-full">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="flex-[1] px-2.5 py-2 space-y-2">
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

export default function ShopHome() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<DiscoverCategoryType>('food');
  
  const { data: campaignsData, isLoading } = useQuery<{ success: boolean; data: CampaignWithStores[] }>({
    queryKey: ['/api/campaigns'],
  });

  const campaigns = campaignsData?.data || [];

  const categoryLabels: Record<DiscoverCategoryType, string> = {
    food: t('discover.catFood'),
    shopping: t('discover.catShopping'),
    relax: t('discover.catRelax'),
    family: t('discover.catFamily'),
    entertainment: t('discover.catEntertainment'),
    stay: t('discover.catStay'),
    travel: t('discover.catTravel'),
    featured: t('discover.catFeatured'),
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-3">
          <button 
            className="flex items-center gap-1 text-sm font-medium text-foreground flex-shrink-0"
            data-testid="button-city-select"
          >
            <MapPin className="w-4 h-4" />
            <span>{t('discover.defaultCity')}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          <button 
            className="flex-1 flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-[12px] text-muted-foreground"
            data-testid="button-search"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{t('discover.searchPlaceholder')}</span>
          </button>

          <button 
            className="px-3 py-1.5 rounded-full text-[12px] font-medium text-foreground bg-background border border-border flex-shrink-0"
            data-testid="button-nearby"
          >
            {t('discover.nearby')}
          </button>
        </div>
      </header>

      <div className="bg-background border-b border-border">
        <div className="px-3 py-3">
          <div className="grid grid-cols-4 gap-2">
            {DISCOVER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full px-2 py-1.5 rounded-full whitespace-nowrap text-[11px] transition-colors ${
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
              <DiscoverSkeleton key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Ticket className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">{t('discover.noContent')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {campaigns.map((campaign) => (
              <DiscoverCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </main>

      <UserBottomNav />
    </div>
  );
}
