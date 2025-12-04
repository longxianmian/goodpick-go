import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { 
  ChevronLeft, Search, MessageCircle, Share2, Star, Ticket, 
  MapPin, Clock, Phone, ChevronRight, Eye, Heart, ShoppingCart, 
  TrendingUp, Edit3, Store, Bike, Package, QrCode, Timer, 
  BadgeCheck, ThumbsUp, Truck, Navigation, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Campaign, Store as StoreType } from '@shared/schema';

interface CampaignWithStores extends Campaign {
  stores: StoreType[];
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

type ServiceMode = 'dineIn' | 'delivery' | 'shipping';

function CouponCard({ campaign }: { campaign: CampaignWithStores }) {
  const { language } = useLanguage();
  
  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };

  const soldCount = Math.floor(Math.random() * 5000) + 500;

  return (
    <div 
      className="flex gap-3 p-3 bg-card rounded-lg hover-elevate active-elevate-2"
      data-testid={`card-coupon-${campaign.id}`}
    >
      <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
        {campaign.bannerImageUrl ? (
          <img 
            src={campaign.bannerImageUrl} 
            alt={getTitle()} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Ticket className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2 mb-1" data-testid={`text-coupon-title-${campaign.id}`}>
          {getTitle()}
        </h3>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-xs text-destructive">¥</span>
          <span className="text-lg font-bold text-destructive">{campaign.couponValue}</span>
          {campaign.originalPrice && (
            <span className="text-xs text-muted-foreground line-through ml-1">¥{campaign.originalPrice}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">已售{soldCount}+</span>
          <Button size="sm" className="h-6 px-3 text-xs" data-testid={`button-claim-${campaign.id}`}>
            立即抢
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeliveryProductCard({ campaign }: { campaign: CampaignWithStores }) {
  const { language } = useLanguage();
  
  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };

  return (
    <div 
      className="flex gap-3 p-3 bg-card rounded-lg hover-elevate active-elevate-2"
      data-testid={`card-delivery-${campaign.id}`}
    >
      <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
        {campaign.bannerImageUrl ? (
          <img 
            src={campaign.bannerImageUrl} 
            alt={getTitle()} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">
          {getTitle()}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span className="flex items-center gap-0.5">
            <Timer className="w-3 h-3" />
            约30分钟送达
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs text-destructive">¥</span>
            <span className="text-lg font-bold text-destructive">{campaign.couponValue}</span>
          </div>
          <Button size="sm" className="h-6 px-3 text-xs" data-testid={`button-add-cart-${campaign.id}`}>
            加入购物车
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShippingProductCard({ campaign, rank }: { campaign: CampaignWithStores; rank?: number }) {
  const { language } = useLanguage();
  
  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };

  const soldCount = Math.floor(Math.random() * 30000) + 1000;
  const formatSoldCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万+`;
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
              TOP{rank}
            </Badge>
          )}
        </div>
        
        <div className="p-2 space-y-1.5">
          <h3 className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
            {getTitle()}
          </h3>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Truck className="w-3 h-3" />
            <span>包邮</span>
          </div>
          
          <div className="flex items-end justify-between gap-1">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs text-destructive">¥</span>
              <span className="text-lg font-bold text-destructive">{campaign.couponValue}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              已售{formatSoldCount(soldCount)}
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

export default function MerchantHome() {
  const { t } = useLanguage();
  const { user, userToken } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showOwnerBar, setShowOwnerBar] = useState(true);
  const [activeMode, setActiveMode] = useState<ServiceMode>('dineIn');
  
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

  const storeInfo = {
    rating: 4.8,
    monthSales: 2847,
    perCapita: 68,
    distance: 1.2,
    address: '曼谷市中心 Sukhumvit路 123号',
    phone: '+66 2 123 4567',
    businessHours: '10:00 - 22:00',
    isOpen: true,
    deliveryTime: 30,
    deliveryFee: 5,
    minOrder: 30,
    supportsDineIn: true,
    supportsDelivery: true,
    supportsShipping: true,
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
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
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
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">{t('merchant.noStores')}</h2>
          <p className="text-sm text-muted-foreground">{t('merchant.noStoresDesc')}</p>
        </main>
        <MerchantBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-12 px-4 bg-background/90 backdrop-blur-sm border-b">
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
                <div className="text-[9px] text-white/70">今日浏览</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-base font-bold">{ownerStats.todayFavorites}</span>
                  <span className="text-[9px] text-green-300 flex items-center">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {ownerStats.favoritesTrend}%
                  </span>
                </div>
                <div className="text-[9px] text-white/70">收藏</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-base font-bold">{ownerStats.todayOrders}</span>
                  <span className="text-[9px] text-green-300 flex items-center">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {ownerStats.ordersTrend}%
                  </span>
                </div>
                <div className="text-[9px] text-white/70">下单</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold">{ownerStats.conversionRate}%</div>
                <div className="text-[9px] text-white/70">转化率</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-background">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-16 h-16 border-2 border-background shadow-md">
                <AvatarImage src={currentStore.storeImageUrl || undefined} />
                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                  {currentStore.storeName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg font-bold truncate" data-testid="text-store-name">
                    {currentStore.storeName}
                  </h1>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px]">
                    {storeInfo.isOpen ? '营业中' : '休息中'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-sm mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{storeInfo.rating}</span>
                  </div>
                  <span className="text-muted-foreground">月售{storeInfo.monthSales}</span>
                  <span className="text-muted-foreground">人均¥{storeInfo.perCapita}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {storeInfo.supportsDineIn && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Store className="w-2.5 h-2.5" />
                      到店
                    </Badge>
                  )}
                  {storeInfo.supportsDelivery && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Bike className="w-2.5 h-2.5" />
                      外卖
                    </Badge>
                  )}
                  {storeInfo.supportsShipping && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Truck className="w-2.5 h-2.5" />
                      快递
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{storeInfo.address}</span>
              <span className="flex-shrink-0">{storeInfo.distance}km</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={handleComingSoon} data-testid="button-navigate">
                <Navigation className="w-4 h-4 text-primary" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{storeInfo.businessHours}</span>
              <span className="mx-1">|</span>
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{storeInfo.phone}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
            <Badge variant="secondary" className="text-[10px] flex-shrink-0 gap-1">
              <BadgeCheck className="w-3 h-3 text-green-500" />
              好评率98%
            </Badge>
            <Badge variant="secondary" className="text-[10px] flex-shrink-0 gap-1">
              <ThumbsUp className="w-3 h-3 text-blue-500" />
              回头客多
            </Badge>
            <Badge variant="secondary" className="text-[10px] flex-shrink-0 gap-1">
              <Timer className="w-3 h-3 text-orange-500" />
              平均{storeInfo.deliveryTime}分钟
            </Badge>
          </div>
        </div>

        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as ServiceMode)} className="bg-background mt-2">
          <TabsList className="w-full h-12 rounded-none bg-transparent border-b justify-start gap-0 p-0">
            <TabsTrigger 
              value="dineIn" 
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5"
              data-testid="tab-dine-in"
            >
              <Store className="w-4 h-4" />
              到店消费
            </TabsTrigger>
            <TabsTrigger 
              value="delivery" 
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5"
              data-testid="tab-delivery"
            >
              <Bike className="w-4 h-4" />
              即时配送
            </TabsTrigger>
            <TabsTrigger 
              value="shipping" 
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5"
              data-testid="tab-shipping"
            >
              <Truck className="w-4 h-4" />
              快递发货
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dineIn" className="mt-0 p-4 space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium">到店核销</p>
                      <p className="text-xs text-muted-foreground">扫码或出示优惠券核销</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">热门优惠券</h3>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={handleComingSoon}>
                  查看全部 <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              {campaignsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无优惠活动</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 3).map(campaign => (
                    <CouponCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="mt-0 p-4 space-y-4">
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Bike className="w-5 h-5 text-orange-500" />
                      <span className="font-medium">骑手配送</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>约{storeInfo.deliveryTime}分钟送达</span>
                      <span>配送费¥{storeInfo.deliveryFee}</span>
                      <span>起送¥{storeInfo.minOrder}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">热销商品</h3>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={handleComingSoon}>
                  查看全部 <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              {campaignsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无商品</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 3).map(campaign => (
                    <DeliveryProductCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="mt-0 p-4 space-y-4">
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Truck className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">全国包邮</p>
                    <p className="text-xs text-muted-foreground">支持快递发货，全国配送</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">店铺商品</h3>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={handleComingSoon}>
                  查看全部 <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              {campaignsLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <ProductSkeleton key={i} />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无商品</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {campaigns.map((campaign, index) => (
                    <ShippingProductCard 
                      key={campaign.id} 
                      campaign={campaign} 
                      rank={index === 0 ? 1 : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <MerchantBottomNav />
    </div>
  );
}
