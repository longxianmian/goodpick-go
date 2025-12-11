import { useParams, Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ChevronLeft, 
  Heart, 
  Share2, 
  ChevronRight,
  Clock,
  MapPin,
  Shield,
  CheckCircle2,
  Star,
  Store,
  Play,
  Ticket
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import MyCoupons from './MyCoupons';

declare global {
  interface Window {
    liff: any;
  }
}

const TABS = ['product', 'reviews', 'details', 'recommend'] as const;
type TabType = typeof TABS[number];

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { authPhase, user, userToken, reloadAuth } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabType>('product');
  const [activeView, setActiveView] = useState<'campaign' | 'my-coupons'>('campaign');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [isFavorited, setIsFavorited] = useState(false);
  const [playingVideos, setPlayingVideos] = useState<Set<number>>(new Set());
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);

  useEffect(() => {
    if (!carouselApi) return;
    
    carouselApi.on('select', () => {
      setCurrentImageIndex(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  useEffect(() => {
    if (!id) return;
    if (authPhase === 'booting') return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const sessionId = (window as any).__GPGO_SESSION_ID__;
        const headers: Record<string, string> = {
          'Accept-Language': language,
          'X-GPGO-Session': sessionId || 'unknown',
        };
        
        if (userToken) {
          headers['Authorization'] = `Bearer ${userToken}`;
        }
        
        const res = await fetch(`/api/campaigns/${id}`, { headers });
        
        if (!res.ok) throw new Error('Failed to load campaign');
        const data = await res.json();
        
        if (!cancelled) {
          if (!data.data.myStatus) {
            data.data.myStatus = { loggedIn: !!user, hasClaimed: false };
          }
          setCampaign(data.data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(t('campaign.loadFailed'));
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [id, language, authPhase, userToken, user]);

  const formatCouponValue = (value: string, type: string) => {
    const num = parseFloat(value);
    if (type === 'percentage_off') {
      return num % 1 === 0 ? `${Math.round(num)}%` : `${num}%`;
    } else {
      return num % 1 === 0 ? `${t('common.currencySymbol')}${Math.round(num)}` : `${t('common.currencySymbol')}${num}`;
    }
  };

  const convertToProxyUrl = (ossUrl: string): string => {
    try {
      const urlObj = new URL(ossUrl.trim());
      const pathname = urlObj.pathname;
      if (!/\.(mp4|webm|ogg|mov)$/i.test(pathname)) return ossUrl;
      if (pathname.startsWith('/public/')) return `/api/media/video${pathname}`;
      return ossUrl;
    } catch {
      return ossUrl;
    }
  };

  const getVideoPoster = (url: string): string => {
    try {
      const urlObj = new URL(url.trim());
      if (urlObj.hostname.includes('aliyuncs.com')) {
        return `${url}?x-oss-process=video/snapshot,t_0,f_jpg,w_800`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const handleLineLogin = async () => {
    try {
      const res = await fetch('/api/auth/line/init-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: id }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!data.success || !data.redirectUrl) {
        throw new Error(data.message || 'Failed to initialize OAuth');
      }
      window.location.href = data.redirectUrl;
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('login.failed'),
        variant: 'destructive',
      });
    }
  };

  const handleClaim = async () => {
    if (!userToken) {
      toast({
        title: t('common.error'),
        description: t('login.sessionExpired'),
        variant: 'destructive',
      });
      return;
    }

    setClaiming(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({ channel: 'line_menu' }),
      });

      const data = await res.json();

      if (res.status === 401) {
        toast({
          title: t('common.error'),
          description: t('login.sessionExpired'),
          variant: 'destructive',
        });
        reloadAuth();
        return;
      }

      if (data.success) {
        toast({
          title: t('campaign.claimSuccess'),
          description: t('campaign.claimSuccessDesc'),
        });
        reloadAuth();
      } else if (res.status === 409) {
        toast({
          title: t('campaign.limitReached'),
          description: data.message,
        });
        reloadAuth();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('campaign.claimError'),
        variant: 'destructive',
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimClick = async () => {
    if (!campaign) return;
    const { loggedIn, hasClaimed } = campaign.myStatus || { loggedIn: false, hasClaimed: false };

    if (!loggedIn) {
      await handleLineLogin();
      return;
    }

    if (hasClaimed) {
      setActiveView('my-coupons');
      return;
    }

    await handleClaim();
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: campaign?.title || 'Campaign',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: t('common.success'),
          description: t('productDetail.linkCopied'),
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background animate-in fade-in duration-150">
        <header className="fixed top-0 left-0 right-0 z-50 px-3 py-2 flex items-center justify-between">
          <Link href="/shuashua">
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-background/60 backdrop-blur-sm rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-full" />
            <Skeleton className="w-9 h-9 rounded-full" />
          </div>
        </header>
        <Skeleton className="h-[400px] w-full" />
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center gap-3 pt-2">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-full mt-4" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3">
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 flex-1" />
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{error || t('campaign.notFound')}</p>
          <Link href="/shop">
            <Button variant="outline" className="mt-4">{t('common.back')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(campaign.endAt) < new Date();
  const isSoldOut = campaign.maxTotal && campaign.currentClaimed >= campaign.maxTotal;
  const { loggedIn, hasClaimed } = campaign.myStatus || { loggedIn: false, hasClaimed: false };

  const getTitle = () => {
    if (language === 'zh-cn') return campaign.titleZh || campaign.titleSource;
    if (language === 'en-us') return campaign.titleEn || campaign.titleSource;
    return campaign.titleTh || campaign.titleSource;
  };

  const storeName = campaign.stores?.[0]?.name || t('shop.storeFallback');
  const storeImage = campaign.stores?.[0]?.imageUrl;
  const soldCount = campaign.currentClaimed || Math.floor(Math.random() * 500) + 50;
  const addToCartCount = Math.floor(Math.random() * 2000) + 500;
  const recentBuyCount = Math.floor(Math.random() * 600) + 100;

  const mediaUrls = campaign.mediaUrls && campaign.mediaUrls.length > 0 
    ? campaign.mediaUrls 
    : campaign.bannerImageUrl 
      ? [campaign.bannerImageUrl] 
      : [];

  const tabLabels: Record<TabType, string> = {
    product: t('productDetail.tabProduct'),
    reviews: t('productDetail.tabReviews'),
    details: t('productDetail.tabDetails'),
    recommend: t('productDetail.tabRecommend'),
  };

  if (activeView === 'my-coupons') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setActiveView('campaign')}
            data-testid="button-back-to-campaign"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium">{t('nav.myCoupons')}</span>
        </header>
        <div className="flex-1 overflow-y-auto">
          <MyCoupons hideNavigation={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[120px]">
      {/* Header - Floating over image */}
      <header className="fixed top-0 left-0 right-0 z-50 px-3 py-2 flex items-center justify-between">
        <Link href="/shop">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-background/60 backdrop-blur-sm rounded-full"
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-background/60 backdrop-blur-sm rounded-full"
            onClick={() => setIsFavorited(!isFavorited)}
            data-testid="button-favorite"
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-destructive text-destructive' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-background/60 backdrop-blur-sm rounded-full"
            onClick={handleShare}
            data-testid="button-share"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto">
        {/* Image Carousel */}
        <div className="relative">
          {mediaUrls.length > 0 ? (
            <Carousel 
              className="w-full" 
              setApi={setCarouselApi}
              opts={{ loop: true }}
              data-testid="product-carousel"
            >
              <CarouselContent>
                {mediaUrls.map((url: string, index: number) => {
                  const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
                  return (
                    <CarouselItem key={index}>
                      <div className="bg-muted relative aspect-square">
                        {isVideo ? (
                          <div 
                            className="w-full h-full relative cursor-pointer"
                            onClick={(e) => {
                              const video = e.currentTarget.querySelector('video') as HTMLVideoElement;
                              if (video) {
                                if (video.paused) video.play();
                                else video.pause();
                              }
                            }}
                          >
                            <video
                              ref={(el) => {
                                if (el) {
                                  el.onplay = () => setPlayingVideos(prev => new Set(prev).add(index));
                                  el.onpause = () => {
                                    const newSet = new Set(playingVideos);
                                    newSet.delete(index);
                                    setPlayingVideos(newSet);
                                  };
                                }
                              }}
                              poster={getVideoPoster(url)}
                              controls
                              preload="metadata"
                              className="w-full h-full object-contain pointer-events-none"
                            >
                              <source src={convertToProxyUrl(url)} type="video/mp4" />
                            </video>
                            {!playingVideos.has(index) && (
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                <div className="bg-black/70 backdrop-blur-sm rounded-full p-3">
                                  <Play className="w-8 h-8 text-white fill-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`${getTitle()} - ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          ) : (
            <div className="bg-muted flex items-center justify-center aspect-square">
              <Store className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          
        </div>

        {/* Thumbnail row */}
        {mediaUrls.length > 1 && (
          <div className="flex items-center px-4 py-3 gap-2 bg-card border-b">
            <div className="flex gap-2 overflow-x-auto flex-1">
              {mediaUrls.slice(0, 4).map((url: string, index: number) => (
                <button
                  key={index}
                  onClick={() => carouselApi?.scrollTo(index)}
                  className={`w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border-2 ${
                    currentImageIndex === index ? 'border-primary' : 'border-transparent'
                  }`}
                  data-testid={`thumbnail-${index}`}
                >
                  <img 
                    src={url} 
                    alt={`Thumbnail ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
              <span>{t('productDetail.totalStyles', { count: String(mediaUrls.length) })}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Coupon Value Section */}
        <div className="px-4 py-4 bg-gradient-to-r from-[#38B03B]/10 to-[#38B03B]/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-6 h-6 text-[#38B03B]" />
              <span className="text-2xl font-bold text-[#38B03B]">
                {formatCouponValue(campaign.couponValue, campaign.discountType)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">
                {t('coupon.claimedCount')} {soldCount}
              </span>
              {campaign.maxTotal && (
                <span className="text-sm text-muted-foreground ml-2">
                  / {t('coupon.remainingCount')} {campaign.maxTotal - campaign.currentClaimed}
                </span>
              )}
            </div>
          </div>
          
          {/* Coupon type tag */}
          <div className="mt-2 flex items-center gap-2">
            <Badge className="bg-[#38B03B] text-white text-xs">
              {t(`discountType.${campaign.discountType}`)}
            </Badge>
            <Badge variant="outline" className="text-[#38B03B] border-[#38B03B] text-xs">
              {t('coupon.useWhenPay')}
            </Badge>
          </div>
        </div>

        {/* Title section */}
        <div className="px-4 py-3 bg-card border-t">
          <div className="flex items-start gap-2">
            <Badge className="bg-[#38B03B] text-white text-xs flex-shrink-0">
              {storeName.slice(0, 4)}
            </Badge>
            <h1 className="text-base font-medium leading-tight" data-testid="product-title">
              {getTitle()}
            </h1>
          </div>
        </div>

        {/* Coupon info */}
        <div className="px-4 py-3 bg-card border-t space-y-2.5">
          {/* Validity period */}
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium">{t('productDetail.validPeriod')}</span>
              <span className="text-muted-foreground ml-2">
                {new Date(campaign.startAt).toLocaleDateString(language)} - {new Date(campaign.endAt).toLocaleDateString(language)}
              </span>
            </div>
          </div>
          
          {/* Store location */}
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
            <span className="text-sm">
              {campaign.stores?.[0]?.city || t('productDetail.defaultLocation')} - {storeName}
            </span>
          </div>
          
          {/* How to use */}
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-[#38B03B] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium">{t('coupon.howToUse')}</span>
              <span className="text-muted-foreground ml-2">{t('coupon.redeemAtStore')}</span>
            </div>
          </div>
          
          {/* Selected specs */}
          <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex items-start gap-3 w-full text-left" data-testid="button-rules">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm">
                    {t('productDetail.selected')}: {t(`discountType.${campaign.discountType}`)} {formatCouponValue(campaign.couponValue, campaign.discountType)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('campaign.rules')}</DialogTitle>
              </DialogHeader>
              <div className="whitespace-pre-wrap text-sm">
                {campaign.description}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tab navigation */}
        <div className="sticky top-0 z-40 bg-background border-b">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground'
                }`}
                data-testid={`tab-${tab}`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 space-y-4">
          {activeTab === 'product' && (
            <>
              {/* Store card */}
              <div className="bg-card rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={storeImage || ''} />
                    <AvatarFallback>{storeName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{storeName}</h3>
                      <Badge variant="outline" className="text-xs">{t('productDetail.verified')}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span>4.7</span>
                      </div>
                      <span>|</span>
                      <span>{t('productDetail.followers', { count: '6.7' })}{t('merchant.units.wan')}</span>
                      <span>|</span>
                      <span>{t('shop.sold')}{soldCount}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {campaign.stores?.[0]?.id ? (
                      <Link href={`/store/${campaign.stores[0].id}`}>
                        <Button size="sm" className="h-7 text-xs">
                          {t('productDetail.enterStore')}
                        </Button>
                      </Link>
                    ) : (
                      <Button size="sm" className="h-7 text-xs" disabled>
                        {t('productDetail.enterStore')}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive">
                      {t('productDetail.getCoupon', { amount: '20' })}
                    </Button>
                  </div>
                </div>
                
                {/* Store ratings */}
                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-sm font-medium">4.8</div>
                    <div className="text-xs text-muted-foreground">{t('productDetail.productQuality')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">4.5</div>
                    <div className="text-xs text-muted-foreground">{t('productDetail.logistics')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">4.7</div>
                    <div className="text-xs text-muted-foreground">{t('productDetail.customerService')}</div>
                  </div>
                </div>
              </div>
              
              {/* Campaign validity */}
              <div className="bg-card rounded-lg p-4">
                <h4 className="font-medium mb-2">{t('productDetail.validPeriod')}</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(campaign.startAt).toLocaleDateString(language)} - {new Date(campaign.endAt).toLocaleDateString(language)}
                </p>
                {campaign.maxTotal && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('productDetail.stockInfo', { 
                      remaining: String(campaign.maxTotal - campaign.currentClaimed), 
                      total: String(campaign.maxTotal) 
                    })}
                  </p>
                )}
              </div>
            </>
          )}
          
          {activeTab === 'reviews' && (
            <div className="text-center py-8 text-muted-foreground">
              {t('productDetail.noReviews')}
            </div>
          )}
          
          {activeTab === 'details' && (
            <div className="bg-card rounded-lg p-4">
              <p className="text-sm whitespace-pre-wrap">{campaign.description || t('productDetail.noDetails')}</p>
            </div>
          )}
          
          {activeTab === 'recommend' && (
            <div className="text-center py-8 text-muted-foreground">
              {t('productDetail.noRecommend')}
            </div>
          )}
        </div>
      </main>

      {/* Fixed bottom bar - Coupon style */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex items-center px-3 py-2 gap-2">
          {/* Store link */}
          <Link href={campaign.stores?.[0]?.id ? `/store/${campaign.stores[0].id}` : '/shop'}>
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-0.5 h-auto py-1 px-3">
              <Store className="w-5 h-5" />
              <span className="text-[10px]">{t('coupon.viewStore')}</span>
            </Button>
          </Link>
          
          {/* Favorite button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center gap-0.5 h-auto py-1 px-3"
            onClick={() => {
              setIsFavorited(!isFavorited);
              toast({
                title: t('common.success'),
                description: isFavorited ? t('coupon.removedFromFavorites') : t('coupon.addedToFavorites'),
              });
            }}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-destructive text-destructive' : ''}`} />
            <span className="text-[10px]">{t('coupon.favorite')}</span>
          </Button>
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Main claim button */}
          <Button 
            className="flex-1 max-w-[200px] bg-[#38B03B] hover:bg-[#38B03B]/90 text-white"
            onClick={handleClaimClick}
            disabled={claiming || isExpired || isSoldOut}
            data-testid="button-claim-coupon"
          >
            {claiming ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                {t('campaign.claiming')}
              </span>
            ) : isSoldOut ? (
              t('campaign.soldOut')
            ) : isExpired ? (
              t('campaign.expired')
            ) : hasClaimed ? (
              <span className="flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                {t('campaign.viewMyCoupons')}
              </span>
            ) : loggedIn ? (
              <span className="flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                {t('coupon.claimNow')}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                {t('coupon.loginToClaim')}
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
