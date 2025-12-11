import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { 
  ArrowLeft, Search, Heart, Share2, Star, MapPin, Clock, Phone, 
  ShoppingCart, MessageCircle, ChevronRight, Ticket, Gift, Plus,
  Utensils, ShoppingBag, Scissors, Gamepad2, Store as StoreIcon,
  Users, Award, TrendingUp, Check, Truck, Package, ChevronLeft,
  FileCheck, Building2, CircleDot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { UserBottomNav } from '@/components/UserBottomNav';
import { ChatWindow } from '@/components/ChatWindow';
import { CartDrawer, useAddToCart } from '@/components/CartDrawer';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Store, Campaign, Product } from '@shared/schema';

interface StoreWithCampaigns extends Store {
  campaigns?: Campaign[];
}

type IndustryType = 'food' | 'retail' | 'service' | 'entertainment';

const INDUSTRY_CONFIG: Record<IndustryType, {
  icon: typeof Utensils;
  tabs: string[];
  color: string;
}> = {
  food: {
    icon: Utensils,
    tabs: ['menu', 'deals', 'reviews', 'info'],
    color: 'bg-orange-500'
  },
  retail: {
    icon: ShoppingBag,
    tabs: ['products', 'deals', 'reviews', 'info'],
    color: 'bg-blue-500'
  },
  service: {
    icon: Scissors,
    tabs: ['services', 'packages', 'reviews', 'info'],
    color: 'bg-purple-500'
  },
  entertainment: {
    icon: Gamepad2,
    tabs: ['tickets', 'packages', 'reviews', 'info'],
    color: 'bg-green-500'
  }
};

function StoreHeader({ store, onBack }: { store: Store; onBack: () => void }) {
  const { t } = useLanguage();
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // 获取轮播图列表（优先使用 coverImages，否则使用 imageUrl）
  const images = store.coverImages && store.coverImages.length > 0 
    ? store.coverImages 
    : store.imageUrl 
      ? [store.imageUrl] 
      : [];
  
  // 自动轮播
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  // 营业状态显示
  const getBusinessStatusBadge = () => {
    const status = store.businessStatus || 'open';
    if (status === 'open') {
      return <Badge className="text-[10px] bg-green-500 text-white border-0">{t('storeFront.statusOpen')}</Badge>;
    } else if (status === 'closed') {
      return <Badge className="text-[10px] bg-gray-500 text-white border-0">{t('storeFront.statusClosed')}</Badge>;
    } else {
      return <Badge className="text-[10px] bg-red-500 text-white border-0">{t('storeFront.statusTemporarilyClosed')}</Badge>;
    }
  };

  return (
    <div className="relative">
      <div className="h-52 bg-gradient-to-b from-orange-400 to-orange-500 relative overflow-hidden">
        {images.length > 0 ? (
          <>
            <div className="relative w-full h-full">
              {images.map((img, index) => (
                <img 
                  key={index}
                  src={img} 
                  alt={`${store.name} - ${index + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
            </div>
            
            {/* 轮播指示器 */}
            {images.length > 1 && (
              <>
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        index === currentSlide 
                          ? 'bg-white w-4' 
                          : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
                
                {/* 相册入口 */}
                <div className="absolute bottom-20 right-3 bg-black/40 backdrop-blur-sm rounded-md px-2 py-1 text-white text-xs z-10">
                  {t('storeFront.album')} {currentSlide + 1}/{images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <StoreIcon className="w-20 h-20 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <Button 
            size="icon" 
            variant="ghost" 
            className="bg-black/20 text-white backdrop-blur-sm"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="bg-black/20 text-white backdrop-blur-sm">
              <Search className="w-5 h-5" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="bg-black/20 text-white backdrop-blur-sm"
              onClick={() => setIsFavorite(!isFavorite)}
              data-testid="button-favorite"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button size="icon" variant="ghost" className="bg-black/20 text-white backdrop-blur-sm">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end gap-3">
            <Avatar className="w-16 h-16 border-2 border-white">
              <AvatarImage src={store.imageUrl || undefined} />
              <AvatarFallback className="bg-orange-600 text-white text-xl">
                {store.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-white pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold">{store.name}</h1>
                {store.brand && (
                  <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0">
                    {t('storeFront.verified')}
                  </Badge>
                )}
                {getBusinessStatusBadge()}
              </div>
              <p className="text-xs text-white/80 mt-0.5">{store.city}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoreStats({ store }: { store: Store }) {
  const { t } = useLanguage();
  const rating = store.rating ? parseFloat(String(store.rating)) : 4.5;
  
  // 使用数据库中的真实数据，如果没有则使用默认值
  const monthlySales = store.monthlySales || (1000 + (store.id * 137) % 4000);
  const fansCount = store.fansCount || (5000 + (store.id * 293) % 10000);
  const topRank = store.topRank || (1 + (store.id % 5));
  const deliveryTime = store.deliveryTime || (25 + (store.id % 15));
  const pickupTime = store.pickupTime || 10;

  return (
    <div className="bg-card p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{rating.toFixed(1)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{monthlySales}+</span> {t('storeFront.monthlySales')}
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{fansCount}</span> {t('storeFront.fans')}
          </div>
        </div>
        {topRank && topRank <= 10 && (
          <Badge variant="outline" className="text-orange-500 border-orange-500 flex-shrink-0">
            {t('storeFront.topSeller', { rank: String(topRank) })}
          </Badge>
        )}
      </div>

      {/* 配送/自取切换 */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="outline" size="sm" className="flex-1 h-8 border-orange-500 text-orange-500">
          <Truck className="w-3.5 h-3.5 mr-1" />
          {t('storeFront.delivery')}
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 h-8 text-muted-foreground">
          <Package className="w-3.5 h-3.5 mr-1" />
          {t('storeFront.pickup')}
          <span className="text-orange-500 ml-1 text-xs">{t('storeFront.pickupTime', { time: String(pickupTime) })}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{t('storeFront.deliveryTime', { time: String(deliveryTime) })}</span>
        <span className="mx-1">|</span>
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="line-clamp-1 flex-1">{store.address}</span>
      </div>

      {store.phone && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Phone className="w-3.5 h-3.5" />
          <a href={`tel:${store.phone}`} className="text-primary">{store.phone}</a>
        </div>
      )}
    </div>
  );
}

function CouponSection({ campaigns }: { campaigns: Campaign[] }) {
  const { t, language } = useLanguage();
  
  const activeCampaigns = campaigns.filter(c => c.isActive).slice(0, 4);
  
  if (activeCampaigns.length === 0) return null;

  const getCouponLabel = (campaign: Campaign) => {
    if (campaign.discountType === 'percentage') {
      return t('storeFront.couponDiscount', { percent: String(campaign.couponValue || 10) });
    }
    return t('storeFront.couponVoucher', { 
      amount: String(campaign.couponValue || 0), 
      min: String(campaign.originalPrice || 0) 
    });
  };

  return (
    <div className="bg-card p-4 border-t border-border">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {activeCampaigns.map((campaign) => (
          <Link key={campaign.id} href={`/campaign/${campaign.id}`}>
            <Badge 
              variant="outline" 
              className="flex-shrink-0 text-destructive border-destructive/30 bg-destructive/5 cursor-pointer"
            >
              {getCouponLabel(campaign)}
            </Badge>
          </Link>
        ))}
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex-shrink-0 text-xs text-primary h-6 px-2">
            {t('storeFront.getCoupon')}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ServiceScores({ store }: { store: Store }) {
  const { t } = useLanguage();
  
  // 从数据库解析服务评分，如果没有则使用默认值
  const parseServiceScores = () => {
    try {
      if (store.serviceScores) {
        const parsed = JSON.parse(store.serviceScores);
        return {
          product: parsed.product || 4.8,
          logistics: parsed.logistics || 4.5,
          service: parsed.service || 4.7,
        };
      }
    } catch (e) {
      // 解析失败使用默认值
    }
    return { product: 4.8, logistics: 4.5, service: 4.7 };
  };
  
  const serviceScores = parseServiceScores();
  
  const scores = [
    { label: t('storeFront.scoreProduct'), value: serviceScores.product },
    { label: t('storeFront.scoreLogistics'), value: serviceScores.logistics },
    { label: t('storeFront.scoreService'), value: serviceScores.service },
  ];

  return (
    <div className="bg-card p-4 border-t border-border">
      <div className="grid grid-cols-3 gap-4 text-center">
        {scores.map((score, i) => (
          <div key={i}>
            <div className="text-lg font-semibold text-foreground">{score.value}</div>
            <div className="text-xs text-muted-foreground">{score.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuTab({ products, campaigns, storeId }: { products: Product[]; campaigns: Campaign[]; storeId: number }) {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('all');
  const addToCart = useAddToCart(storeId);

  const handleAddToCart = (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate({ productId, quantity: 1 });
  };
  
  const getProductName = (product: Product) => {
    return product.name;
  };

  const getCampaignTitle = (campaign: Campaign) => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };

  const categories = [
    { key: 'all', label: t('storeFront.menu.all') || t('storeFront.menu.newShopWelfare') },
    { key: 'recommend', label: t('storeFront.menu.recommend') },
    { key: 'hot', label: t('storeFront.menu.hot') || t('storeFront.menu.chefSpecial') },
    { key: 'new', label: t('storeFront.menu.new') || t('storeFront.menu.chefSignature') },
    { key: 'deals', label: t('storeFront.menu.deals') || t('storeFront.menu.seasonal') },
  ];

  const filteredProducts = activeCategory === 'all' 
    ? products
    : activeCategory === 'recommend'
      ? products.filter(p => p.isRecommend)
      : activeCategory === 'hot'
        ? products.filter(p => p.isHot)
        : activeCategory === 'new'
          ? products.filter(p => p.isNew)
          : activeCategory === 'deals'
            ? campaigns.length > 0 ? [] : products.slice(0, 4)
            : products;

  const showDeals = activeCategory === 'deals' && campaigns.length > 0;

  return (
    <div className="flex h-[calc(100vh-280px)]">
      <div className="w-20 flex-shrink-0 bg-muted/30 overflow-y-auto">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`w-full py-3 px-2 text-xs text-left border-l-2 transition-colors ${
              activeCategory === cat.key
                ? 'bg-background border-l-[#38B03B] text-foreground font-medium'
                : 'border-l-transparent text-muted-foreground hover:bg-background/50'
            }`}
            data-testid={`menu-category-${cat.key}`}
          >
            {cat.label}
            {cat.key === 'all' && products.length > 0 && (
              <span className="ml-1 text-muted-foreground">({products.length})</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeCategory === 'all' && products.length > 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground bg-[#38B03B]/10">
            {t('storeFront.menu.warmTip')}
          </div>
        )}
        
        <div className="divide-y divide-border">
          {showDeals ? (
            campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/campaign/${campaign.id}`}>
                <div className="flex gap-3 p-3 hover:bg-muted/30 active:bg-muted/50 transition-colors" data-testid={`deal-item-${campaign.id}`}>
                  <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                    {campaign.bannerImageUrl ? (
                      <img src={campaign.bannerImageUrl} alt={getCampaignTitle(campaign)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Ticket className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-medium text-sm line-clamp-2">{getCampaignTitle(campaign)}</h4>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge className="text-[10px] px-1 py-0 h-4 bg-destructive/10 text-destructive border-0">
                          {t('storeFront.deals.discountBadge')}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-destructive font-bold text-base">
                        {t('common.currencySymbol')}{campaign.couponValue || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-end pb-1">
                    <Button size="icon" className="h-7 w-7 rounded-full bg-[#38B03B]" data-testid={`button-deal-add-${campaign.id}`}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Link>
            ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const hasDiscount = product.originalPrice && Number(product.originalPrice) > Number(product.price);
              const discountPercent = hasDiscount 
                ? Math.round((1 - Number(product.price) / Number(product.originalPrice)) * 100)
                : 0;
              
              return (
                <Link key={product.id} href={`/product/${product.id}`}>
                  <div className="flex gap-3 p-3 hover:bg-muted/30 active:bg-muted/50 transition-colors" data-testid={`menu-item-${product.id}`}>
                    <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted relative">
                      {product.coverImage ? (
                        <img src={product.coverImage} alt={getProductName(product)} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      {product.isHot && (
                        <Badge className="absolute top-1 left-1 text-[9px] px-1 py-0 h-4 bg-destructive text-white border-0">
                          {t('product.hot')}
                        </Badge>
                      )}
                      {product.isNew && !product.isHot && (
                        <Badge className="absolute top-1 left-1 text-[9px] px-1 py-0 h-4 bg-[#38B03B] text-white border-0">
                          {t('product.new')}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="font-medium text-sm line-clamp-2">{getProductName(product)}</h4>
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                          <span>{t('product.sold')} {product.salesCount || 0}</span>
                        </div>
                      </div>
                      
                      {hasDiscount && (
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge className="text-[10px] px-1 py-0 h-4 bg-[#38B03B]/10 text-[#38B03B] border-0">
                            {t('storeFront.menu.discount', { percent: String(discountPercent) })}% OFF
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-destructive font-bold text-base">
                            {t('common.currencySymbol')}{Number(product.price).toFixed(0)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-muted-foreground line-through">
                              {t('common.currencySymbol')}{Number(product.originalPrice).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 flex items-end pb-1">
                      <Button 
                        size="icon" 
                        className="h-7 w-7 rounded-full bg-[#38B03B]"
                        data-testid={`button-menu-add-${product.id}`}
                        onClick={(e) => handleAddToCart(e, product.id)}
                        disabled={addToCart.isPending}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('storeFront.noProducts')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DealsTab({ campaigns }: { campaigns: Campaign[] }) {
  const { t, language } = useLanguage();
  
  const getTitle = (campaign: Campaign) => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };

  const getDescription = (campaign: Campaign) => {
    if (language === 'zh-cn') return campaign.descriptionZh || campaign.descriptionSource;
    if (language === 'en-us') return campaign.descriptionEn || campaign.descriptionSource;
    return campaign.descriptionTh || campaign.descriptionSource;
  };

  return (
    <div className="overflow-y-auto h-[calc(100vh-280px)]">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{t('storeFront.deals.sectionTitle')}</h3>
          <span className="text-xs text-muted-foreground">{t('storeFront.deals.limitHint')}</span>
        </div>
      </div>

      <div className="divide-y divide-border">
        {campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaign/${campaign.id}`}>
              <div className="p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors" data-testid={`deal-item-${campaign.id}`}>
                <div className="flex gap-3">
                  <div className="relative w-28 h-28 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                    {campaign.bannerImageUrl ? (
                      <img src={campaign.bannerImageUrl} alt={getTitle(campaign)} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Ticket className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col">
                    <h4 className="font-medium text-sm line-clamp-2">{getTitle(campaign)}</h4>
                    
                    {getDescription(campaign) && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {getDescription(campaign)}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {campaign.discountType && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-[#38B03B]/10 text-[#38B03B] border-0">
                          {campaign.discountType === 'percentage' ? t('storeFront.deals.discountBadge') : t('storeFront.deals.voucherBadge')}
                        </Badge>
                      )}
                      {campaign.maxTotal && campaign.currentClaimed !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          {t('storeFront.deals.remaining')}: {campaign.maxTotal - (campaign.currentClaimed || 0)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-destructive font-bold text-lg">
                          {t('common.currencySymbol')}{campaign.couponValue || 0}
                        </span>
                        {campaign.originalPrice && Number(campaign.originalPrice) > Number(campaign.couponValue) && (
                          <span className="text-xs text-muted-foreground line-through">
                            {t('common.currencySymbol')}{campaign.originalPrice}
                          </span>
                        )}
                      </div>
                      
                      <Button 
                        size="icon" 
                        className="h-8 w-8 rounded-full bg-[#38B03B]"
                        data-testid={`button-deals-add-${campaign.id}`}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('storeFront.noCampaigns')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewsTab() {
  const { t } = useLanguage();
  const reviews = [
    { user: 'A***n', rating: 5, content: '很好吃，下次还来！', time: '2天前' },
    { user: 'M***k', rating: 4, content: '服务态度很好', time: '3天前' },
    { user: 'L***a', rating: 5, content: '物超所值', time: '1周前' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('storeFront.allReviews', { count: String(930) })}</h3>
        <Button variant="ghost" size="sm" className="text-xs">
          {t('storeFront.viewAll')} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-4">
        {reviews.map((review, i) => (
          <div key={i} className="border-b border-border pb-4 last:border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{review.user.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{review.user}</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
            <p className="text-sm mt-2">{review.content}</p>
            <span className="text-xs text-muted-foreground mt-1 block">{review.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoTab({ store }: { store: Store }) {
  const { t, language } = useLanguage();
  
  // 解析营业时间
  const parseBusinessHours = () => {
    try {
      if (store.businessHours) {
        return JSON.parse(store.businessHours);
      }
    } catch (e) {
      // 解析失败
    }
    // 默认营业时间
    return {
      mon: '09:00-22:00',
      tue: '09:00-22:00',
      wed: '09:00-22:00',
      thu: '09:00-22:00',
      fri: '09:00-22:00',
      sat: '10:00-22:00',
      sun: '10:00-22:00',
    };
  };
  
  const businessHours = parseBusinessHours();
  
  // 获取门店描述（多语言）
  const getDescription = () => {
    if (language === 'zh-cn') return store.descriptionZh;
    if (language === 'en-us') return store.descriptionEn;
    return store.descriptionTh;
  };
  
  const description = getDescription();
  
  // 星期翻译映射
  const dayLabels: Record<string, string> = {
    mon: t('storeFront.dayMon'),
    tue: t('storeFront.dayTue'),
    wed: t('storeFront.dayWed'),
    thu: t('storeFront.dayThu'),
    fri: t('storeFront.dayFri'),
    sat: t('storeFront.daySat'),
    sun: t('storeFront.daySun'),
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* 门店描述 */}
      {description && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">{t('storeFront.aboutStore')}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </Card>
      )}
      
      {/* 商家信息 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">{t('storeFront.businessInfo')}</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-muted-foreground">{t('storeFront.address')}</p>
              <p>{store.address}</p>
              {store.floorInfo && <p className="text-muted-foreground">{store.floorInfo}</p>}
            </div>
          </div>
          {store.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">{t('storeFront.phone')}</p>
                <a href={`tel:${store.phone}`} className="text-primary">{store.phone}</a>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* 营业时间 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">{t('storeFront.hours')}</h3>
        <div className="space-y-2 text-sm">
          {Object.entries(businessHours).map(([day, hours]) => (
            <div key={day} className="flex justify-between">
              <span className="text-muted-foreground">{dayLabels[day] || day}</span>
              <span>{hours as string}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 商家资质 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">{t('storeFront.qualifications')}</h3>
        <div className="space-y-3">
          {store.businessLicenseUrl && (
            <div className="flex items-center gap-2 text-sm">
              <FileCheck className="w-4 h-4 text-green-500" />
              <span>{t('storeFront.licenseBusiness')}</span>
              <Button variant="ghost" size="sm" className="ml-auto text-xs text-primary h-6">
                {t('storeFront.viewLicense')}
              </Button>
            </div>
          )}
          {store.foodLicenseUrl && (
            <div className="flex items-center gap-2 text-sm">
              <FileCheck className="w-4 h-4 text-green-500" />
              <span>{t('storeFront.licenseFood')}</span>
              <Button variant="ghost" size="sm" className="ml-auto text-xs text-primary h-6">
                {t('storeFront.viewLicense')}
              </Button>
            </div>
          )}
          {!store.businessLicenseUrl && !store.foodLicenseUrl && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>{t('storeFront.licenseFood')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500" />
                <span>{t('storeFront.licenseBusiness')}</span>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function IndustryPlaceholder({ type }: { type: IndustryType }) {
  const { t } = useLanguage();
  const config = INDUSTRY_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="p-8 text-center">
      <div className={`w-16 h-16 ${config.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="font-semibold mb-2">
        {type === 'food' && t('storeFront.industryFood')}
        {type === 'retail' && t('storeFront.industryRetail')}
        {type === 'service' && t('storeFront.industryService')}
        {type === 'entertainment' && t('storeFront.industryEntertainment')}
      </h3>
      <p className="text-sm text-muted-foreground">{t('storeFront.comingSoon')}</p>
    </div>
  );
}

function BottomActionBar({ onChatClick }: { onChatClick: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 z-50">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <button 
            className="flex flex-col items-center gap-0.5" 
            data-testid="button-chat"
            onClick={onChatClick}
          >
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{t('storeFront.chat')}</span>
          </button>
          <button className="flex flex-col items-center gap-0.5" data-testid="button-delivery">
            <Truck className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{t('storeFront.delivery')}</span>
          </button>
          <button className="flex flex-col items-center gap-0.5" data-testid="button-pickup">
            <Package className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{t('storeFront.pickup')}</span>
          </button>
        </div>
        <div className="flex-1 flex gap-2">
          <Button variant="outline" className="flex-1 border-orange-500 text-orange-500" data-testid="button-add-to-cart">
            {t('storeFront.addToCart')}
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white" data-testid="button-buy-now">
            {t('storeFront.buyNow')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StoreFrontSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function StoreFront() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, params] = useRoute('/store/:id');
  const storeId = params?.id;
  const [activeTab, setActiveTab] = useState('menu');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { data: storeData, isLoading: storeLoading } = useQuery<{ success: boolean; data: Store }>({
    queryKey: ['/api/stores', storeId],
    enabled: !!storeId,
  });

  const { data: productsData } = useQuery<{ success: boolean; data: Product[] }>({
    queryKey: ['/api/stores', storeId, 'products'],
    enabled: !!storeId,
  });

  const { data: campaignsData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/campaigns'],
  });

  const store = storeData?.data;
  const storeProducts = productsData?.data || [];
  const allCampaigns = campaignsData?.data || [];
  
  // Filter campaigns by store, or use all campaigns if no store-specific ones exist
  const storeSpecificCampaigns = allCampaigns.filter((c: any) => 
    c.stores?.some((s: any) => s.id === parseInt(storeId || '0'))
  );
  const storeCampaigns = storeSpecificCampaigns.length > 0 ? storeSpecificCampaigns : allCampaigns;

  const handleChatClick = () => {
    if (!user) {
      window.location.href = '/me';
      return;
    }
    setIsChatOpen(true);
  };

  if (storeLoading) {
    return <StoreFrontSkeleton />;
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <StoreIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">{t('storeFront.notFound')}</h2>
          <Link href="/">
            <Button className="mt-4">{t('storeFront.backToShop')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <StoreHeader store={store} onBack={() => window.history.back()} />
      <StoreStats store={store} />
      <CouponSection campaigns={storeCampaigns} />
      <ServiceScores store={store} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
        <TabsList className="w-full justify-start bg-card rounded-none border-b border-border h-12 p-0">
          <TabsTrigger 
            value="menu" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full"
          >
            {t('storeFront.tabMenu')}
          </TabsTrigger>
          <TabsTrigger 
            value="deals" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full"
          >
            {t('storeFront.tabDeals')}
          </TabsTrigger>
          <TabsTrigger 
            value="reviews" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full"
          >
            {t('storeFront.tabReviews')}
          </TabsTrigger>
          <TabsTrigger 
            value="info" 
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full"
          >
            {t('storeFront.tabInfo')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="mt-0">
          <MenuTab products={storeProducts} campaigns={storeCampaigns} storeId={store.id} />
        </TabsContent>
        <TabsContent value="deals" className="mt-0">
          <DealsTab campaigns={storeCampaigns} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-0">
          <ReviewsTab />
        </TabsContent>
        <TabsContent value="info" className="mt-0">
          <InfoTab store={store} />
        </TabsContent>
      </Tabs>

      <CartDrawer storeId={store.id} storeName={store.name} />
      
      <BottomActionBar onChatClick={handleChatClick} />

      <ChatWindow
        storeId={store.id}
        storeName={store.name}
        storeImageUrl={store.imageUrl || undefined}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}
