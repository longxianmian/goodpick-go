import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Search, ShoppingCart, Ticket, MessageCircle, Footprints, Receipt, Gift, Sparkles, Percent, Heart, Store, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Campaign, Store as StoreType } from '@shared/schema';

interface CampaignWithStores extends Campaign {
  stores: StoreType[];
}

const CATEGORIES = ['recommend', 'digital', 'fashion', 'home', 'beauty', 'food', 'trendy', 'baby', 'outdoor'] as const;
type CategoryType = typeof CATEGORIES[number];

interface QuickEntry {
  icon: typeof Radio;
  labelKey: string;
  color: string;
}

const QUICK_ENTRIES: QuickEntry[] = [
  { icon: Radio, labelKey: 'shop.entryLive', color: 'bg-pink-100 dark:bg-pink-900/30' },
  { icon: Store, labelKey: 'shop.entryShowroom', color: 'bg-purple-100 dark:bg-purple-900/30' },
  { icon: Sparkles, labelKey: 'shop.entryNewArrivals', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { icon: Percent, labelKey: 'shop.entrySuperSale', color: 'bg-orange-100 dark:bg-orange-900/30' },
  { icon: Heart, labelKey: 'shop.entryFanList', color: 'bg-red-100 dark:bg-red-900/30' },
];

interface FunctionEntry {
  icon: typeof Receipt;
  labelKey: string;
  badge?: string;
}

const FUNCTION_ENTRIES: FunctionEntry[] = [
  { icon: Receipt, labelKey: 'shop.funcOrders' },
  { icon: ShoppingCart, labelKey: 'shop.funcCart' },
  { icon: Ticket, labelKey: 'shop.funcCoupons', badge: 'shop.discountBadge' },
  { icon: MessageCircle, labelKey: 'shop.funcMessages' },
  { icon: Footprints, labelKey: 'shop.funcHistory' },
];

function ProductCard({ campaign }: { campaign: CampaignWithStores }) {
  const { language, t } = useLanguage();
  
  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };
  
  const formatPrice = () => {
    if (campaign.discountType === 'percentage_off') {
      return `${campaign.couponValue}%`;
    }
    return `฿${campaign.couponValue}`;
  };

  const storeName = campaign.stores?.[0]?.name || t('shop.storeFallback');
  const soldCount = Math.floor(Math.random() * 500) + 50;

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <div 
        className="rounded-lg overflow-hidden bg-card cursor-pointer hover-elevate active-elevate-2"
        data-testid={`card-product-${campaign.id}`}
      >
        <div className="relative aspect-square overflow-hidden">
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
        </div>
        
        <div className="p-2 space-y-1.5">
          <div className="flex items-start gap-1">
            <Badge variant="outline" className="text-[10px] px-1 py-0 flex-shrink-0 border-primary text-primary">
              {storeName.slice(0, 4)}
            </Badge>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {getTitle()}
            </p>
          </div>
          
          <h3 
            className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5rem]"
            data-testid={`text-product-title-${campaign.id}`}
          >
            {getTitle()}
          </h3>
          
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-destructive">{formatPrice()}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {t('shop.sold')}{soldCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden bg-card">
      <Skeleton className="aspect-square" />
      <div className="p-2 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

export default function ShopHome() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<CategoryType>('recommend');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: campaignsData, isLoading } = useQuery<{ success: boolean; data: CampaignWithStores[] }>({
    queryKey: ['/api/campaigns'],
  });

  const campaigns = campaignsData?.data || [];

  const categoryLabels: Record<CategoryType, string> = {
    recommend: t('shop.catRecommend'),
    digital: t('shop.catDigital'),
    fashion: t('shop.catFashion'),
    home: t('shop.catHome'),
    beauty: t('shop.catBeauty'),
    food: t('shop.catFood'),
    trendy: t('shop.catTrendy'),
    baby: t('shop.catBaby'),
    outdoor: t('shop.catOutdoor'),
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-4 py-2">
          <div className="flex gap-2">
            <Input
              type="search"
              placeholder={t('shop.searchPlaceholder')}
              className="flex-1 h-9 bg-muted border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
            <Button 
              size="sm" 
              className="h-9 px-4"
              data-testid="button-search"
            >
              {t('shop.search')}
            </Button>
          </div>
        </div>
        
        <div className="px-4 pb-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 min-w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-sm whitespace-nowrap transition-colors pb-1 ${
                  activeCategory === cat
                    ? 'text-foreground font-semibold border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
                data-testid={`category-${cat}`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 py-3 space-y-4">
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-4 min-w-max">
            {QUICK_ENTRIES.map((entry, i) => (
              <button 
                key={i} 
                className="flex flex-col items-center gap-1.5 w-16"
                data-testid={`quick-entry-${i}`}
              >
                <div className={`w-14 h-14 rounded-full ${entry.color} flex items-center justify-center`}>
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-transparent">
                      <entry.icon className="w-6 h-6 text-foreground" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs text-center line-clamp-1">{t(entry.labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 bg-card rounded-lg p-3">
          {FUNCTION_ENTRIES.map((entry, i) => (
            <button 
              key={i} 
              className="flex flex-col items-center gap-1 relative"
              data-testid={`func-entry-${i}`}
            >
              <div className="relative">
                <entry.icon className="w-6 h-6 text-primary" />
                {entry.badge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-3 text-[8px] px-1 py-0 h-4"
                  >
                    {t(entry.badge)}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{t(entry.labelKey)}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
          <Badge variant="outline" className="text-xs border-green-500 text-green-600 dark:text-green-400">
            {t('shop.verified')}
          </Badge>
          <span>{t('shop.nearbyDeals')}</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Ticket className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('shuashua.noActivities')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {campaigns.map((campaign) => (
              <ProductCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </main>

      <UserBottomNav />
    </div>
  );
}
