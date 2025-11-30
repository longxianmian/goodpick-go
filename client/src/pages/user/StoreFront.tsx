import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { 
  ArrowLeft, Search, Heart, Share2, Star, MapPin, Clock, Phone, 
  ShoppingCart, MessageCircle, ChevronRight, Ticket, Gift, Plus,
  Utensils, ShoppingBag, Scissors, Gamepad2, Store as StoreIcon,
  Users, Award, TrendingUp, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Store, Campaign } from '@shared/schema';

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

  return (
    <div className="relative">
      <div className="h-48 bg-gradient-to-b from-orange-400 to-orange-500 relative overflow-hidden">
        {store.imageUrl ? (
          <img 
            src={store.imageUrl} 
            alt={store.name}
            className="w-full h-full object-cover"
          />
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
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{store.name}</h1>
                {store.brand && (
                  <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0">
                    {t('storeFront.verified')}
                  </Badge>
                )}
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
  // TODO: Replace with real store statistics from backend when available
  // Using deterministic values based on store.id for consistent display
  const monthlySales = 1000 + (store.id * 137) % 4000;
  const fansCount = 5000 + (store.id * 293) % 10000;
  const topRank = 1 + (store.id % 5);
  const deliveryTime = 25 + (store.id % 15);

  return (
    <div className="bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
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
        <Badge variant="outline" className="text-orange-500 border-orange-500">
          {t('storeFront.topSeller', { rank: String(topRank) })}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        <span>{t('storeFront.deliveryTime', { time: String(deliveryTime) })}</span>
        <span className="mx-1">|</span>
        <MapPin className="w-3.5 h-3.5" />
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

function CouponSection() {
  const { t } = useLanguage();
  // TODO: Replace with real coupon data from store campaigns when available
  const coupons = [
    { discount: 18, minSpend: 25, type: 'voucher' },
    { discount: 30, percentage: true, type: 'discount' },
    { discount: 38, reduction: 1, type: 'reduction' },
    { discount: 48, reduction: 2, type: 'reduction' },
  ];

  return (
    <div className="bg-card p-4 border-t border-border">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {coupons.map((coupon, i) => (
          <Badge 
            key={i} 
            variant="outline" 
            className="flex-shrink-0 text-destructive border-destructive/30 bg-destructive/5"
          >
            {coupon.type === 'voucher' && (
              <span>{t('storeFront.couponVoucher', { amount: String(coupon.discount), min: String(coupon.minSpend) })}</span>
            )}
            {coupon.type === 'discount' && (
              <span>{t('storeFront.couponDiscount', { percent: String(coupon.discount) })}</span>
            )}
            {coupon.type === 'reduction' && (
              <span>{t('storeFront.couponReduction', { spend: String(coupon.discount), save: String(coupon.reduction) })}</span>
            )}
          </Badge>
        ))}
        <Button variant="ghost" size="sm" className="flex-shrink-0 text-xs text-primary h-6 px-2">
          {t('storeFront.getCoupon')}
        </Button>
      </div>
    </div>
  );
}

function ServiceScores() {
  const { t } = useLanguage();
  const scores = [
    { label: t('storeFront.scoreProduct'), value: 4.8 },
    { label: t('storeFront.scoreLogistics'), value: 4.5 },
    { label: t('storeFront.scoreService'), value: 4.7 },
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

function MenuTab({ campaigns, storeId }: { campaigns: Campaign[]; storeId: number }) {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('newShopWelfare');
  
  const getTitle = (campaign: Campaign) => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };

  const categories = [
    { key: 'newShopWelfare', label: t('storeFront.menu.newShopWelfare') },
    { key: 'chefSpecial', label: t('storeFront.menu.chefSpecial') },
    { key: 'chefSignature', label: t('storeFront.menu.chefSignature') },
    { key: 'seasonal', label: t('storeFront.menu.seasonal') },
    { key: 'stirFry', label: t('storeFront.menu.stirFry') },
    { key: 'staples', label: t('storeFront.menu.staples') },
    { key: 'drinks', label: t('storeFront.menu.drinks') },
    { key: 'liveSets', label: t('storeFront.menu.liveSets') },
    { key: 'recommend', label: t('storeFront.menu.recommend') },
  ];

  const generateMenuItems = () => {
    if (campaigns.length === 0) return [];
    // Generate more items to ensure all categories have content
    const items: Array<{
      id: number;
      name: string;
      image: string | null;
      monthlySales: number;
      reviewCount: number;
      reviewText: string;
      discount: number;
      price: number;
      originalPrice: number;
      tag: string | null;
      hasSpecs: boolean;
      categoryKey: string;
    }> = [];
    
    campaigns.forEach((campaign, campaignIndex) => {
      // Generate multiple items per campaign for different categories
      categories.forEach((cat, catIndex) => {
        const index = campaignIndex * categories.length + catIndex;
        const basePrice = Number(campaign.couponValue) || 10;
        const monthlySales = 100 + (storeId * 37 + index * 73) % 400;
        const reviewCount = 5 + (storeId * 13 + index * 17) % 30;
        const discount = 70 + (index * 7) % 25;
        const originalPrice = Math.round(Number(basePrice) * 100 / discount);
        const hasSpecs = index % 3 === 2;
        
        items.push({
          id: campaign.id * 100 + catIndex,
          name: getTitle(campaign),
          image: campaign.bannerImageUrl,
          monthlySales,
          reviewCount,
          reviewText: t('storeFront.menu.portionGood'),
          discount,
          price: basePrice + catIndex * 2,
          originalPrice,
          tag: index % 2 === 1 ? t('storeFront.menu.singleNoDelivery') : null,
          hasSpecs,
          categoryKey: cat.key,
        });
      });
    });
    
    return items;
  };

  const menuItems = generateMenuItems();
  const filteredItems = activeCategory === 'newShopWelfare' 
    ? menuItems.slice(0, 8) 
    : menuItems.filter(item => item.categoryKey === activeCategory);

  return (
    <div className="flex h-[calc(100vh-280px)]">
      <div className="w-20 flex-shrink-0 bg-muted/30 overflow-y-auto">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`w-full py-3 px-2 text-xs text-left border-l-2 transition-colors ${
              activeCategory === cat.key
                ? 'bg-background border-l-orange-500 text-foreground font-medium'
                : 'border-l-transparent text-muted-foreground hover:bg-background/50'
            }`}
            data-testid={`menu-category-${cat.key}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeCategory === 'newShopWelfare' && (
          <div className="px-3 py-2 text-xs text-muted-foreground bg-orange-50 dark:bg-orange-950/20">
            {t('storeFront.menu.warmTip')}
          </div>
        )}
        
        <div className="divide-y divide-border">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <Link key={item.id} href={`/campaign/${item.id}`}>
                <div className="flex gap-3 p-3 hover:bg-muted/30 active:bg-muted/50 transition-colors" data-testid={`menu-item-${item.id}`}>
                  <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Ticket className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                        <span>{t('storeFront.menu.monthlySales', { count: String(item.monthlySales) })}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-orange-500">
                        <span>{t('storeFront.menu.reviewCount', { count: String(item.reviewCount) })}{item.reviewText}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <Badge className="text-[10px] px-1 py-0 h-4 bg-orange-100 text-orange-600 border-0 dark:bg-orange-900/30">
                        {t('storeFront.menu.discount', { percent: String(item.discount / 10) })}
                      </Badge>
                      {item.tag && (
                        <span className="text-[10px] text-muted-foreground">{item.tag}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-destructive font-bold text-base">
                          {t('common.currencySymbol')}{item.price}
                        </span>
                        <span className="text-xs text-muted-foreground line-through">
                          {t('common.currencySymbol')}{item.originalPrice}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 flex items-end pb-1">
                    {item.hasSpecs ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs border-orange-500 text-orange-500"
                        data-testid={`button-menu-specs-${item.id}`}
                      >
                        {t('storeFront.menu.selectSpecs')}
                      </Button>
                    ) : (
                      <Button 
                        size="icon" 
                        className="h-7 w-7 rounded-full bg-orange-500 hover:bg-orange-600"
                        data-testid={`button-menu-add-${item.id}`}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('storeFront.noProducts')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DealsTab({ campaigns, storeId }: { campaigns: Campaign[]; storeId: number }) {
  const { t, language } = useLanguage();
  
  const getTitle = (campaign: Campaign) => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };

  const generateDealItems = () => {
    if (campaigns.length === 0) return [];
    return campaigns.slice(0, 6).map((campaign, index) => {
      const basePrice = Number(campaign.couponValue) || 20;
      const discountPercent = 90 + (index * 2) % 8;
      const originalPrice = Math.round(Number(basePrice) * 100 / discountPercent);
      const monthlySales = 50 + (storeId * 23 + index * 47) % 400;
      const repeatCustomers = 10 + (storeId * 11 + index * 19) % 100;
      const recentOrders = 50 + (storeId * 7 + index * 31) % 100;
      const portionReviews = 3 + (storeId * 5 + index * 7) % 10;
      const tasteReviews = 5 + (storeId * 3 + index * 11) % 15;
      const newCustomerPrice = Math.round(Number(basePrice) * 0.4);
      const hasSpecs = index % 2 === 1;
      const badgeType = index === 0 ? 'new' : index === 1 ? 'signature' : null;
      
      return {
        id: campaign.id,
        name: getTitle(campaign),
        image: campaign.bannerImageUrl,
        badgeType,
        monthlySales,
        repeatCustomers,
        recentOrders,
        portionReviews,
        tasteReviews,
        discountPercent,
        price: basePrice,
        originalPrice,
        newCustomerPrice,
        hasSpecs,
      };
    });
  };

  const dealItems = generateDealItems();

  return (
    <div className="overflow-y-auto h-[calc(100vh-280px)]">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{t('storeFront.deals.sectionTitle')}</h3>
          <span className="text-xs text-muted-foreground">{t('storeFront.deals.limitHint')}</span>
        </div>
      </div>

      <div className="divide-y divide-border">
        {dealItems.length > 0 ? (
          dealItems.map((item) => (
            <Link key={item.id} href={`/campaign/${item.id}`}>
              <div className="p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors" data-testid={`deal-item-${item.id}`}>
                <div className="flex gap-3">
                  <div className="relative w-28 h-28 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                    {item.badgeType && (
                      <Badge 
                        className={`absolute top-1 left-1 text-[10px] px-1.5 py-0.5 z-10 ${
                          item.badgeType === 'new' 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-yellow-500 text-white'
                        }`}
                      >
                        {item.badgeType === 'new' ? t('storeFront.deals.badgeNew') : t('storeFront.deals.badgeSignature')}
                      </Badge>
                    )}
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Ticket className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col">
                    <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                    
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      <span>{t('storeFront.menu.monthlySales', { count: String(item.monthlySales) })}</span>
                      <span className="text-orange-500">{t('storeFront.deals.repeatCustomers', { count: String(item.repeatCustomers) })}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
                      <span className="text-orange-500">{t('storeFront.deals.recentOrders', { count: String(item.recentOrders) })}</span>
                      <span className="text-muted-foreground">"{t('storeFront.deals.portionGood')}"</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      <span>{t('storeFront.deals.reviewPortion', { count: String(item.portionReviews) })}</span>
                      <span>{t('storeFront.deals.reviewTaste', { count: String(item.tasteReviews) })}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 text-orange-600 border-0 dark:bg-orange-900/30">
                        {t('storeFront.deals.discountPercent', { percent: String(item.discountPercent / 10) })}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                          <span className="text-destructive font-bold text-lg">
                            {t('common.currencySymbol')}{item.price}
                          </span>
                          <span className="text-xs text-muted-foreground line-through">
                            {t('common.currencySymbol')}{item.originalPrice}
                          </span>
                        </div>
                        <span className="text-xs text-orange-500">
                          {t('common.currencySymbol')}{item.newCustomerPrice} {t('storeFront.deals.newCustomerPrice')}
                        </span>
                      </div>
                      
                      {item.hasSpecs ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs border-orange-500 text-orange-500"
                          data-testid={`button-deals-specs-${item.id}`}
                        >
                          {t('storeFront.menu.selectSpecs')}
                        </Button>
                      ) : (
                        <Button 
                          size="icon" 
                          className="h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-600"
                          data-testid={`button-deals-add-${item.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('storeFront.noProducts')}</p>
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
  const { t } = useLanguage();

  return (
    <div className="p-4 space-y-4">
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
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{t('storeFront.hours')}</p>
              <p>09:00 - 22:00</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">{t('storeFront.qualifications')}</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500" />
            <span>{t('storeFront.licenseFood')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500" />
            <span>{t('storeFront.licenseBusiness')}</span>
          </div>
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

function BottomActionBar() {
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 z-50">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <button className="flex flex-col items-center gap-0.5" data-testid="button-store">
            <StoreIcon className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{t('storeFront.store')}</span>
          </button>
          <button className="flex flex-col items-center gap-0.5" data-testid="button-service">
            <MessageCircle className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{t('storeFront.service')}</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 relative" data-testid="button-cart">
            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center">
              0
            </Badge>
            <span className="text-[10px] text-muted-foreground">{t('storeFront.cart')}</span>
          </button>
        </div>
        <div className="flex-1 flex gap-2">
          <Button variant="outline" className="flex-1 border-orange-500 text-orange-500">
            {t('storeFront.addToCart')}
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white">
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
  const [, params] = useRoute('/store/:id');
  const storeId = params?.id;
  const [activeTab, setActiveTab] = useState('menu');

  const { data: storeData, isLoading: storeLoading } = useQuery<{ success: boolean; data: Store }>({
    queryKey: ['/api/stores', storeId],
    enabled: !!storeId,
  });

  const { data: campaignsData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/campaigns'],
  });

  const store = storeData?.data;
  const allCampaigns = campaignsData?.data || [];
  
  // Filter campaigns by store, or use all campaigns if no store-specific ones exist
  // TODO: Implement proper campaign-store relationship in backend
  const storeSpecificCampaigns = allCampaigns.filter((c: any) => 
    c.stores?.some((s: any) => s.id === parseInt(storeId || '0'))
  );
  const storeCampaigns = storeSpecificCampaigns.length > 0 ? storeSpecificCampaigns : allCampaigns;

  if (storeLoading) {
    return <StoreFrontSkeleton />;
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <StoreIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">{t('storeFront.notFound')}</h2>
          <Link href="/shop">
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
      <CouponSection />
      <ServiceScores />

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
          <MenuTab campaigns={storeCampaigns} storeId={store.id} />
        </TabsContent>
        <TabsContent value="deals" className="mt-0">
          <DealsTab campaigns={storeCampaigns} storeId={store.id} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-0">
          <ReviewsTab />
        </TabsContent>
        <TabsContent value="info" className="mt-0">
          <InfoTab store={store} />
        </TabsContent>
      </Tabs>

      <BottomActionBar />
    </div>
  );
}
