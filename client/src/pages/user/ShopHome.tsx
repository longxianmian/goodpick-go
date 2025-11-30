import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Search, Heart, MapPin, ChevronDown, Sparkles, Locate, Ticket, Users, Clock, Percent } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Campaign, Store as StoreType } from '@shared/schema';

interface CampaignWithStores extends Campaign {
  stores: StoreType[];
}

const DISCOVER_CATEGORIES = ['food', 'shopping', 'relax', 'family', 'entertainment', 'stay', 'travel', 'featured'] as const;
type DiscoverCategoryType = typeof DISCOVER_CATEGORIES[number];

const PROMO_TYPES = ['coupon', 'groupBuy', 'presale', 'discount'] as const;
type PromoType = typeof PROMO_TYPES[number];

const GRADIENT_COLORS = [
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-blue-500',
];

function DiscoverCard({ campaign, index }: { campaign: CampaignWithStores; index: number }) {
  const { language, t } = useLanguage();
  const [liked, setLiked] = useState(false);
  const [likeCount] = useState(() => Math.floor(Math.random() * 2000) + 100);
  
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

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <div 
        className="bg-card rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200"
        style={{ aspectRatio: '1 / 1.618' }}
        data-testid={`card-discover-${campaign.id}`}
      >
        <div className="relative w-full h-[65%] overflow-hidden">
          {campaign.bannerImageUrl ? (
            <img 
              src={campaign.bannerImageUrl} 
              alt={getTitle()} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
              <div className="text-center text-white/90">
                <Sparkles className="w-6 h-6 mx-auto mb-1 opacity-80" />
                <span className="text-[10px] font-medium opacity-70">{t('feed.specialOffer')}</span>
              </div>
            </div>
          )}
          
          {campaign.discountType && (
            <Badge 
              variant="secondary" 
              className="absolute top-1.5 left-1.5 bg-red-500 text-white border-0 text-[9px] px-1.5 py-0.5"
            >
              {campaign.discountType === 'percentage_off' 
                ? `-${campaign.couponValue}%` 
                : campaign.discountType === 'cash_voucher' 
                  ? `฿${campaign.couponValue}` 
                  : `฿${campaign.couponValue}`}
            </Badge>
          )}
        </div>

        <div className="h-[35%] p-2 flex flex-col justify-between">
          <h3 
            className="text-[11px] font-medium text-foreground line-clamp-2 leading-tight"
            data-testid={`text-discover-title-${campaign.id}`}
          >
            {getTitle()}
          </h3>
          
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <Avatar className="w-4 h-4 flex-shrink-0">
                <AvatarImage src={storeAvatar || undefined} />
                <AvatarFallback className="text-[7px] bg-muted">
                  {storeName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[9px] text-muted-foreground truncate">{storeName}</span>
            </div>
            
            <button
              onClick={handleLike}
              className="flex items-center gap-0.5 text-[9px] text-muted-foreground"
              data-testid={`button-like-${campaign.id}`}
            >
              <Heart className={`w-3 h-3 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
              <span className={liked ? 'text-red-500' : ''}>{formatNumber(likeCount + (liked ? 1 : 0))}</span>
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
      className="bg-card rounded-xl shadow-sm overflow-hidden"
      style={{ aspectRatio: '1 / 1.618' }}
    >
      <div className="h-[65%] w-full">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="h-[35%] p-2 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex items-center gap-1 mt-auto">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-2 w-12" />
        </div>
      </div>
    </div>
  );
}

export default function ShopHome() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<DiscoverCategoryType>('food');
  const [activePromo, setActivePromo] = useState<PromoType | null>(null);
  
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

  const promoLabels: Record<PromoType, { label: string; icon: typeof Ticket }> = {
    coupon: { label: t('discover.promoCoupon'), icon: Ticket },
    groupBuy: { label: t('discover.promoGroupBuy'), icon: Users },
    presale: { label: t('discover.promoPresale'), icon: Clock },
    discount: { label: t('discover.promoDiscount'), icon: Percent },
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-3 h-14 gap-2">
          <button 
            className="flex items-center gap-1 text-sm font-semibold text-[#38B03B] flex-shrink-0"
            data-testid="button-city-select"
          >
            <MapPin className="w-4 h-4" />
            <span>{t('discover.defaultCity')}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <button 
            className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground max-w-[200px]"
            data-testid="button-search"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="truncate">{t('discover.searchPlaceholder')}</span>
          </button>

          <button 
            className="flex items-center gap-1 text-sm font-semibold text-[#38B03B] flex-shrink-0"
            data-testid="button-nearby"
          >
            <Locate className="w-4 h-4" />
            <span>{t('discover.nearby')}</span>
          </button>
        </div>
      </header>

      <div className="bg-background sticky top-14 z-30 border-b border-border/30">
        <div className="px-3 py-2.5 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {DISCOVER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full px-2 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-all duration-200 ${
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
          <div className="grid grid-cols-4 gap-2">
            {PROMO_TYPES.map((promo) => {
              const PromoIcon = promoLabels[promo].icon;
              return (
                <button
                  key={promo}
                  onClick={() => setActivePromo(activePromo === promo ? null : promo)}
                  className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-all duration-200 ${
                    activePromo === promo
                      ? 'bg-[#38B03B] text-white shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  data-testid={`promo-${promo}`}
                >
                  <PromoIcon className="w-3 h-3" />
                  <span>{promoLabels[promo].label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="px-2 pt-2 pb-4 max-w-md mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <DiscoverSkeleton key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Sparkles className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">{t('discover.noContent')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {campaigns.map((campaign, index) => (
              <DiscoverCard key={campaign.id} campaign={campaign} index={index} />
            ))}
          </div>
        )}
      </main>

      <UserBottomNav />
    </div>
  );
}
