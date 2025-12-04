import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { ChevronLeft, Search, MessageCircle, Share2, Star, Ticket, Package, ThumbsUp, Clock, Headphones, Sparkles, ArrowUpDown, Eye, Heart, ShoppingCart, TrendingUp, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Campaign, Store } from '@shared/schema';

interface CampaignWithStores extends Campaign {
  stores: Store[];
}

interface StoreRole {
  storeId: number;
  storeName: string;
  storeImageUrl: string | null;
  role: 'owner' | 'operator' | 'verifier';
}

interface RolesResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      displayName: string | null;
      avatarUrl: string | null;
    };
    roles: StoreRole[];
  };
}

const SORT_OPTIONS = ['comprehensive', 'sales', 'new', 'price'] as const;
type SortType = typeof SORT_OPTIONS[number];

function StoreTag({ icon: Icon, text }: { icon: typeof Package; text: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="w-3 h-3 text-green-500" />
      <span>{text}</span>
    </div>
  );
}

function ProductCard({ campaign, rank }: { campaign: CampaignWithStores; rank?: number }) {
  const { language, t } = useLanguage();
  
  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };
  
  const formatPrice = () => {
    if (campaign.discountType === 'percentage_off') {
      return campaign.couponValue;
    }
    return campaign.couponValue;
  };

  const soldCount = Math.floor(Math.random() * 30000) + 1000;
  const formatSoldCount = (count: number) => {
    if (count >= 10000) {
      const formatted = (count / 10000).toFixed(1);
      return `${formatted}${t('merchant.units.wan')}+`;
    }
    return `${count}+`;
  };

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
          
          {rank && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 text-xs bg-orange-500 text-white border-0"
            >
              {t('merchant.topRank', { rank: String(rank) })}
            </Badge>
          )}
        </div>
        
        <div className="p-2 space-y-1.5">
          <h3 
            className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5rem]"
            data-testid={`text-product-title-${campaign.id}`}
          >
            {getTitle()}
          </h3>
          
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs text-destructive">{t('common.currencySymbol')}</span>
              <span className="text-lg font-bold text-destructive">{formatPrice()}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {t('merchant.sold')}{formatSoldCount(soldCount)}
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
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

function StoreHeader({ store }: { store: StoreRole }) {
  const { t } = useLanguage();
  const rating = 4.5;
  const soldTotal = 49000;
  const followers = 2426;
  const recentNotes = 1;

  const formatLargeNumber = (num: number) => {
    if (num >= 10000) {
      const formatted = (num / 10000).toFixed(1);
      return `${formatted}${t('merchant.units.wan')}`;
    }
    return String(num);
  };

  return (
    <div className="bg-gradient-to-b from-muted/50 to-background pt-12 pb-4 px-4">
      <div className="flex items-start gap-4">
        <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
          <AvatarImage src={store.storeImageUrl || undefined} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {store.storeName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 pt-2">
          <h1 className="text-xl font-bold mb-1" data-testid="text-store-name">
            {store.storeName}
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${i <= Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                />
              ))}
              <span className="ml-1 font-medium">{rating}</span>
            </div>
            <span className="text-muted-foreground">
              {t('merchant.sold')}{formatLargeNumber(soldTotal)}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{t('merchant.followers')}{followers}</span>
            <span>{recentNotes}{t('merchant.notesCount')}</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 mt-4">
        <StoreTag icon={Package} text={t('merchant.tagFreeReturn')} />
        <StoreTag icon={ThumbsUp} text={`${t('merchant.tagApproval')}93.2%`} />
        <StoreTag icon={Clock} text={`${t('merchant.tagShipping')}20${t('merchant.units.hours')}`} />
        <StoreTag icon={Headphones} text={`${t('merchant.tagSupport')}31${t('merchant.units.seconds')}`} />
      </div>
    </div>
  );
}

export default function MerchantHome() {
  const { t } = useLanguage();
  const { user, userToken } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeSort, setActiveSort] = useState<SortType>('comprehensive');
  const [showOwnerBar, setShowOwnerBar] = useState(true);
  
  const isLoggedIn = !!userToken && !!user;
  
  const ownerStats = {
    todayViews: 328,
    todayFavorites: 24,
    todayOrders: 18,
    conversionRate: 5.5,
    viewsTrend: 12.3,
    favoritesTrend: 8.5,
    ordersTrend: 15.2,
  };

  const handleEditStore = () => {
    const roles = rolesData?.data?.roles || [];
    const merchantRoles = roles.filter(r => r.role === 'owner' || r.role === 'operator');
    const currentStore = merchantRoles[0];
    if (currentStore) {
      navigate(`/merchant/store-edit/${currentStore.storeId}`);
    }
  };

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };
  
  const { data: rolesData, isLoading: rolesLoading } = useQuery<RolesResponse>({
    queryKey: ['/api/me/roles'],
    enabled: isLoggedIn,
  });

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery<{ success: boolean; data: CampaignWithStores[] }>({
    queryKey: ['/api/campaigns'],
  });

  const roles = rolesData?.data?.roles || [];
  const merchantRoles = roles.filter(r => r.role === 'owner' || r.role === 'operator');
  const currentStore = merchantRoles[0];
  const campaigns = campaignsData?.data || [];

  const sortLabels: Record<SortType, string> = {
    comprehensive: t('merchant.sortComprehensive'),
    sales: t('merchant.sortSales'),
    new: t('merchant.sortNew'),
    price: t('merchant.sortPrice'),
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center h-12 px-4 gap-2">
            <Link href="/me">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">{t('merchant.home')}</h1>
          </div>
        </header>
        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <Ticket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">{t('merchant.loginRequired')}</h2>
          <p className="text-sm text-muted-foreground mb-4">{t('merchant.loginRequiredDesc')}</p>
          <Link href="/">
            <Button>{t('userCenter.login')}</Button>
          </Link>
        </main>
        <MerchantBottomNav />
      </div>
    );
  }

  if (rolesLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Skeleton className="h-48 w-full" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        </div>
        <MerchantBottomNav />
      </div>
    );
  }

  if (!currentStore) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center h-12 px-4 gap-2">
            <Link href="/me">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">{t('merchant.home')}</h1>
          </div>
        </header>
        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <Ticket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">{t('merchant.noStores')}</h2>
          <p className="text-sm text-muted-foreground">{t('merchant.noStoresDesc')}</p>
        </main>
        <MerchantBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {showOwnerBar && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">老板视角</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[10px] text-white/90 hover:text-white hover:bg-white/20 gap-1"
                onClick={handleEditStore}
                data-testid="button-edit-store"
              >
                <Edit3 className="w-3 h-3" />
                编辑店铺
              </Button>
              <button 
                onClick={() => setShowOwnerBar(false)}
                className="text-white/60 hover:text-white text-xs"
                data-testid="button-collapse-owner-bar"
              >
                收起
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 px-3 pb-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-base font-bold">{ownerStats.todayViews}</span>
                <span className="text-[9px] text-green-300 flex items-center">
                  <TrendingUp className="w-2.5 h-2.5" />
                  {ownerStats.viewsTrend}%
                </span>
              </div>
              <div className="text-[9px] text-white/70 flex items-center justify-center gap-0.5">
                <Eye className="w-2.5 h-2.5" />
                今日浏览
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-base font-bold">{ownerStats.todayFavorites}</span>
                <span className="text-[9px] text-green-300 flex items-center">
                  <TrendingUp className="w-2.5 h-2.5" />
                  {ownerStats.favoritesTrend}%
                </span>
              </div>
              <div className="text-[9px] text-white/70 flex items-center justify-center gap-0.5">
                <Heart className="w-2.5 h-2.5" />
                收藏
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-base font-bold">{ownerStats.todayOrders}</span>
                <span className="text-[9px] text-green-300 flex items-center">
                  <TrendingUp className="w-2.5 h-2.5" />
                  {ownerStats.ordersTrend}%
                </span>
              </div>
              <div className="text-[9px] text-white/70 flex items-center justify-center gap-0.5">
                <ShoppingCart className="w-2.5 h-2.5" />
                下单
              </div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold">{ownerStats.conversionRate}%</div>
              <div className="text-[9px] text-white/70">转化率</div>
            </div>
          </div>
        </div>
      )}
      
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-12 px-4 bg-background/80 backdrop-blur-sm">
        <Link href="/merchant/me">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {!showOwnerBar && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-[10px] gap-1 bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setShowOwnerBar(true)}
              data-testid="button-expand-owner-bar"
            >
              <Eye className="w-3 h-3" />
              老板视角
            </Button>
          )}
          <Button variant="ghost" size="icon" data-testid="button-search" onClick={handleComingSoon}>
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" data-testid="button-message" onClick={handleComingSoon}>
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" data-testid="button-share" onClick={handleComingSoon}>
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="pt-12">
        <StoreHeader store={currentStore} />
      </div>

      <div className="sticky top-0 z-30 bg-background border-b">
        <div className="flex items-center gap-4 px-4 py-2">
          {SORT_OPTIONS.map((sort) => (
            <button
              key={sort}
              onClick={() => setActiveSort(sort)}
              className={`text-sm whitespace-nowrap transition-colors ${
                activeSort === sort
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground'
              }`}
              data-testid={`sort-${sort}`}
            >
              {sortLabels[sort]}
              {sort === 'price' && <ArrowUpDown className="inline-block ml-0.5 w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>

      <main className="px-2 py-2">
        {campaignsLoading ? (
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
            {campaigns.map((campaign, index) => (
              <ProductCard 
                key={campaign.id} 
                campaign={campaign} 
                rank={index === 0 ? 1 : undefined}
              />
            ))}
          </div>
        )}
      </main>

      <MerchantBottomNav />
    </div>
  );
}
