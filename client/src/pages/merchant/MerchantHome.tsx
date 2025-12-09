import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { 
  ChevronLeft, Search, MessageCircle, Share2, Star, Ticket, 
  MapPin, Clock, Phone, ChevronRight, Eye, Heart, ShoppingCart, 
  TrendingUp, Edit3, Store, Bike, Package, Timer, 
  BadgeCheck, ThumbsUp, Truck, Navigation, Sparkles, Grid3X3,
  QrCode, ClipboardList, Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Campaign, Store as StoreType, Product } from '@shared/schema';

interface CampaignWithStores extends Campaign {
  stores: StoreType[];
}

interface ProductWithCategory extends Product {
  category?: {
    id: number;
    name: string;
  };
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

type ContentType = 'voucher' | 'product' | 'service' | 'activity';

function UnifiedCard({ campaign }: { campaign: CampaignWithStores }) {
  const { language, t } = useLanguage();
  
  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };

  const soldCount = Math.floor(Math.random() * 10000) + 1000;
  const formatSoldCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}${t('merchant.units.wan')}+`;
    }
    return `${count}+`;
  };

  const contentType: ContentType = campaign.discountType === 'percentage_off' ? 'voucher' : 'product';
  const hasShipping = Math.random() > 0.5;

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <div 
        className="rounded-lg overflow-hidden bg-card cursor-pointer hover-elevate active-elevate-2"
        data-testid={`card-item-${campaign.id}`}
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
          
          {contentType === 'voucher' && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 text-[10px] bg-orange-500 text-white border-0 gap-0.5"
            >
              <Ticket className="w-2.5 h-2.5" />
              {t('merchant.voucher')}
            </Badge>
          )}
        </div>
        
        <div className="p-2 space-y-1.5">
          <h3 
            className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5rem]"
            data-testid={`text-item-title-${campaign.id}`}
          >
            {getTitle()}
          </h3>
          
          {hasShipping && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Truck className="w-3 h-3" />
              <span>{t('merchant.freeShipping')}</span>
            </div>
          )}
          
          <div className="flex items-end justify-between gap-1">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs text-destructive">¥</span>
              <span className="text-lg font-bold text-destructive">{campaign.couponValue}</span>
              {campaign.originalPrice && (
                <span className="text-[10px] text-muted-foreground line-through ml-1">¥{campaign.originalPrice}</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {t('merchant.sold')}{formatSoldCount(soldCount)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProductCard({ product }: { product: ProductWithCategory }) {
  const { t } = useLanguage();
  const formatPrice = (price: string | number) => {
    return Number(price).toFixed(2);
  };

  const isActive = product.status === 'active';

  return (
    <Link href={`/merchant/product/${product.id}`}>
      <div 
        className="rounded-lg overflow-hidden bg-card cursor-pointer hover-elevate active-elevate-2"
        data-testid={`card-product-${product.id}`}
      >
        <div className="relative aspect-square overflow-hidden">
          {product.coverImage ? (
            <img 
              src={product.coverImage} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          
          {product.isRecommend && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 text-[10px] bg-orange-500 text-white border-0 gap-0.5"
            >
              <Sparkles className="w-2.5 h-2.5" />
              {t('merchant.recommend')}
            </Badge>
          )}
          {product.isNew && (
            <Badge 
              variant="secondary" 
              className="absolute top-2 right-2 text-[10px] bg-blue-500 text-white border-0"
            >
              {t('merchant.newLabel')}
            </Badge>
          )}
        </div>
        
        <div className="p-2 space-y-1.5">
          <h3 
            className="font-medium text-sm line-clamp-2 leading-tight min-h-[2.5rem]"
            data-testid={`text-product-title-${product.id}`}
          >
            {product.name}
          </h3>
          
          <div className="flex items-center gap-1 flex-wrap">
            {isActive ? (
              <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 border-0 dark:bg-green-900/30 dark:text-green-400">
                {t('merchant.onShelf')}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600 border-0 dark:bg-gray-800 dark:text-gray-400">
                {t('merchant.offShelf')}
              </Badge>
            )}
            {product.isHot && (
              <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-600 border-0 dark:bg-red-900/30 dark:text-red-400">
                {t('merchant.hotSale')}
              </Badge>
            )}
          </div>
          
          <div className="flex items-end justify-between gap-1">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs text-destructive">฿</span>
              <span className="text-lg font-bold text-destructive">{formatPrice(product.price)}</span>
              {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                <span className="text-[10px] text-muted-foreground line-through ml-1">฿{formatPrice(product.originalPrice)}</span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {t('merchant.stock')}: {product.inventory ?? 0}
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

function MyAssetsEntry({ onNavigate }: { onNavigate: (type: string) => void }) {
  const { t } = useLanguage();
  const assets = [
    { 
      id: 'vouchers', 
      icon: QrCode, 
      labelKey: 'merchant.vouchers', 
      count: 3, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950'
    },
    { 
      id: 'orders', 
      icon: ClipboardList, 
      labelKey: 'merchant.orders', 
      count: 2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950'
    },
    { 
      id: 'packages', 
      icon: Box, 
      labelKey: 'merchant.packages', 
      count: 1,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950'
    },
  ];

  return (
    <div className="bg-card rounded-lg p-3 mx-4 -mt-2 relative z-10 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{t('merchant.myAssets')}</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground gap-0.5">
          {t('merchant.viewAll')} <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {assets.map(asset => (
          <button
            key={asset.id}
            onClick={() => onNavigate(asset.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg ${asset.bgColor} hover-elevate active-elevate-2`}
            data-testid={`button-my-${asset.id}`}
          >
            <div className="relative">
              <asset.icon className={`w-6 h-6 ${asset.color}`} />
              {asset.count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-destructive text-[9px] text-white flex items-center justify-center px-0.5">
                  {asset.count}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{t(asset.labelKey)}</span>
          </button>
        ))}
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

  const handleAssetNavigate = (type: string) => {
    handleComingSoon();
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

  const { data: productsData, isLoading: productsLoading } = useQuery<{ success: boolean; data: ProductWithCategory[] }>({
    queryKey: ['/api/stores', currentStore?.storeId, 'products'],
    enabled: !!currentStore?.storeId,
  });

  const products = productsData?.data || [];

  const { data: storeCampaignsData, isLoading: storeCampaignsLoading } = useQuery<{ success: boolean; data: CampaignWithStores[] }>({
    queryKey: ['/api/stores', currentStore?.storeId, 'campaigns'],
    enabled: !!currentStore?.storeId,
  });

  const storeCampaigns = storeCampaignsData?.data || [];

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
          <Skeleton className="h-20 w-full rounded-lg" />
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
          <p className="text-sm text-muted-foreground mb-6">{t('merchant.noStoresDesc')}</p>
          <Link href="/merchant/store-create">
            <Button className="gap-2" data-testid="button-create-store">
              <Store className="w-4 h-4" />
              {t('merchant.createStore')}
            </Button>
          </Link>
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
              {t('merchant.ownerView')}
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
                <span className="text-[10px] font-medium">{t('merchant.ownerView')}</span>
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
                  {t('merchant.editStore')}
                </Button>
                <button 
                  onClick={() => setShowOwnerBar(false)}
                  className="text-white/60 hover:text-white text-xs"
                  data-testid="button-collapse-owner-bar"
                >
                  {t('merchant.collapse')}
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
                <div className="text-[9px] text-white/70">{t('merchant.todayViews')}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-base font-bold">{ownerStats.todayFavorites}</span>
                  <span className="text-[9px] text-green-300 flex items-center">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {ownerStats.favoritesTrend}%
                  </span>
                </div>
                <div className="text-[9px] text-white/70">{t('merchant.favorites')}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-base font-bold">{ownerStats.todayOrders}</span>
                  <span className="text-[9px] text-green-300 flex items-center">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {ownerStats.ordersTrend}%
                  </span>
                </div>
                <div className="text-[9px] text-white/70">{t('merchant.ordersPlaced')}</div>
              </div>
              <div className="text-center">
                <div className="text-base font-bold">{ownerStats.conversionRate}%</div>
                <div className="text-[9px] text-white/70">{t('merchant.conversionRate')}</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-background pb-4">
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
                    {storeInfo.isOpen ? t('merchant.open') : t('merchant.closed')}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3 text-sm mb-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{storeInfo.rating}</span>
                  </div>
                  <span className="text-muted-foreground">{t('merchant.monthlySales')}{storeInfo.monthSales}</span>
                  <span className="text-muted-foreground">{t('merchant.perCapita')}¥{storeInfo.perCapita}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {storeInfo.supportsDineIn && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Store className="w-2.5 h-2.5" />
                      {t('merchant.dineIn')}
                    </Badge>
                  )}
                  {storeInfo.supportsDelivery && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Bike className="w-2.5 h-2.5" />
                      {t('merchant.deliveryOption')}
                    </Badge>
                  )}
                  {storeInfo.supportsShipping && (
                    <Badge variant="outline" className="text-[10px] gap-0.5">
                      <Truck className="w-2.5 h-2.5" />
                      {t('merchant.shippingOption')}
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

          <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto">
            <Badge variant="secondary" className="text-[10px] flex-shrink-0 gap-1">
              <BadgeCheck className="w-3 h-3 text-green-500" />
              {t('merchant.goodRating')}
            </Badge>
            <Badge variant="secondary" className="text-[10px] flex-shrink-0 gap-1">
              <ThumbsUp className="w-3 h-3 text-blue-500" />
              {t('merchant.returningCustomers')}
            </Badge>
            <Badge variant="secondary" className="text-[10px] flex-shrink-0 gap-1">
              <Timer className="w-3 h-3 text-orange-500" />
              {t('merchant.avgServiceTime')}
            </Badge>
          </div>
        </div>

        <MyAssetsEntry onNavigate={handleAssetNavigate} />

        <div className="mt-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">{t('merchant.storeProducts')}</h2>
              <Badge variant="secondary" className="text-[10px]">{products.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/merchant/products/${currentStore?.storeId}`}>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground gap-0.5">
                  {t('merchant.manage')} <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
          
          {productsLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">{t('merchant.noProducts')}</p>
              <Link href={`/merchant/products/${currentStore?.storeId}`}>
                <Button variant="outline" size="sm" className="mt-3">
                  {t('merchant.addProduct')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {products.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">{t('merchant.storeCampaigns')}</h2>
              <Badge variant="secondary" className="text-[10px]">{storeCampaigns.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/merchant/campaigns/${currentStore?.storeId}`}>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground gap-0.5">
                  {t('merchant.manage')} <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
          
          {storeCampaignsLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : storeCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Ticket className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">{t('merchant.noCampaigns')}</p>
              <Link href={`/merchant/campaigns/${currentStore?.storeId}`}>
                <Button variant="outline" size="sm" className="mt-3">
                  {t('merchant.createCampaign')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {storeCampaigns.slice(0, 4).map((campaign) => (
                <UnifiedCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
        </div>
      </div>

      <MerchantBottomNav />
    </div>
  );
}
