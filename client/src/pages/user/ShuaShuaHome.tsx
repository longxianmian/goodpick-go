import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ChevronLeft, Search, Heart, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Campaign, Store } from '@shared/schema';

interface CampaignWithStores extends Campaign {
  stores: Store[];
}

const TABS = ['follow', 'discover', 'nearby'] as const;
type TabType = typeof TABS[number];

const CATEGORIES = ['recommend', 'digitalHuman', 'education', 'funny', 'food', 'music', 'pets'] as const;
type CategoryType = typeof CATEGORIES[number];

function ContentCard({ campaign, index }: { campaign: CampaignWithStores; index: number }) {
  const { language } = useLanguage();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 100));
  
  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };
  
  const formatPrice = () => {
    if (campaign.discountType === 'percentage_off') {
      return `${campaign.couponValue}% OFF`;
    }
    return `฿${campaign.couponValue}`;
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const isProduct = index % 2 === 0;
  const storeName = campaign.stores?.[0]?.name || 'Store';
  const storeAvatar = campaign.stores?.[0]?.imageUrl;

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <div 
        className="rounded-lg overflow-hidden bg-card cursor-pointer hover-elevate active-elevate-2"
        data-testid={`card-content-${campaign.id}`}
      >
        <div className="relative aspect-[2/3]">
          {campaign.bannerImageUrl ? (
            <img 
              src={campaign.bannerImageUrl} 
              alt={getTitle()} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Ticket className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          
          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2 text-xs bg-background/80 backdrop-blur-sm"
          >
            {isProduct ? '商品' : '图文'}
          </Badge>
          
          {campaign.couponValue && (
            <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded px-2 py-0.5">
              <span className="text-sm font-bold text-primary">{formatPrice()}</span>
            </div>
          )}

          <button
            onClick={handleLike}
            className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1"
            data-testid={`button-like-${campaign.id}`}
          >
            <Heart 
              className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} 
            />
            <span className="text-xs text-white">{likeCount}</span>
          </button>
        </div>
        
        <div className="p-2">
          <h3 
            className="font-medium text-sm line-clamp-2 mb-2 leading-tight min-h-[2.5rem]"
            data-testid={`text-content-title-${campaign.id}`}
          >
            {getTitle()}
          </h3>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Avatar className="w-5 h-5 flex-shrink-0">
                <AvatarImage src={storeAvatar || undefined} />
                <AvatarFallback className="text-[10px]">
                  {storeName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {storeName}
              </span>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              <Heart className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{likeCount}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ContentSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-card">
      <Skeleton className="aspect-[2/3]" />
      <div className="p-2 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function ShuaShuaHome() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('recommend');
  
  const { data: campaignsData, isLoading } = useQuery<{ success: boolean; data: CampaignWithStores[] }>({
    queryKey: ['/api/campaigns'],
  });

  const campaigns = campaignsData?.data || [];

  const tabLabels: Record<TabType, string> = {
    follow: t('shuashua.tabFollow'),
    discover: t('shuashua.tabDiscover'),
    nearby: t('shuashua.tabNearby'),
  };

  const categoryLabels: Record<CategoryType, string> = {
    recommend: t('shuashua.catRecommend'),
    digitalHuman: t('shuashua.catDigitalHuman'),
    education: t('shuashua.catEducation'),
    funny: t('shuashua.catFunny'),
    food: t('shuashua.catFood'),
    music: t('shuashua.catMusic'),
    pets: t('shuashua.catPets'),
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between h-12 px-4">
          <Button variant="ghost" size="icon" className="invisible">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-4">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-sm font-medium py-1 px-2 rounded-md transition-colors ${
                  activeTab === tab 
                    ? 'bg-muted text-foreground' 
                    : 'text-muted-foreground'
                }`}
                data-testid={`tab-${tab}`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>
          
          <Button variant="ghost" size="icon" data-testid="button-search">
            <Search className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                data-testid={`category-${cat}`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-2 py-2">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <ContentSkeleton key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Ticket className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('shuashua.noActivities')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
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
