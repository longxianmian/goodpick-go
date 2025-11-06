import { useParams } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Gift, Calendar, MapPin, Tag, Phone, Star, Navigation, FileText, Building2, Ticket } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useState, useEffect, useRef } from 'react';
import { isLiffEnvironment, getLiff } from '@/lib/liffClient';
import MyCoupons from './MyCoupons';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { isUserAuthenticated, loginUser } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeView, setActiveView] = useState<'campaign' | 'my-coupons'>('campaign');
  const autoplayPlugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: true }));

  useEffect(() => {
    console.log('[CampaignDetail] mounted');
    return () => console.log('[CampaignDetail] unmounted');
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const autoClaim = urlParams.get('autoClaim');

    if (token && autoClaim === 'true') {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        loginUser(token, {
          id: payload.id,
          lineUserId: payload.lineUserId,
          displayName: payload.displayName || 'User',
          avatarUrl: payload.avatarUrl,
          language: payload.language || 'th-th',
        });
        window.history.replaceState({}, '', window.location.pathname);
        
        setTimeout(() => {
          claimMutation.mutate();
        }, 100);
      } catch (error) {
        console.error('[CampaignDetail] Token解析失败:', error);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.log('Location permission denied:', error.code),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const [campaign, setCampaign] = useState<{
    id: number;
    title: string;
    description: string;
    bannerImageUrl: string | null;
    mediaUrls: string[];
    discountType: string;
    couponValue: string;
    originalPrice: string | null;
    startAt: string;
    endAt: string;
    maxPerUser: number;
    maxTotal: number | null;
    currentClaimed: number;
    stores: Array<{
      id: number;
      name: string;
      address: string;
      city: string;
      floorInfo: string | null;
      phone: string | null;
      latitude: number | null;
      longitude: number | null;
    }>;
    userClaimedCount?: number;
    canClaim: boolean;
    claimMessage?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    let cancelled = false;
    
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/campaigns/${id}`);
        if (!cancelled) {
          const data = await res.json();
          if (data.success) {
            setCampaign(data.data);
          }
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[CampaignDetail] 加载活动失败:', error);
          setIsLoading(false);
        }
      }
    })();
    
    return () => { cancelled = true; };
  }, [id]);

  const formatCouponValue = (value: string, type: string) => {
    const num = parseFloat(value);
    if (type === 'percentage_off') {
      return num % 1 === 0 ? `${Math.round(num)}%` : `${num}%`;
    } else {
      return num % 1 === 0 ? `฿${Math.round(num)}` : `฿${num}`;
    }
  };

  const formatThaiDate = (dateString: string, lang: string) => {
    const date = new Date(dateString);
    if (lang === 'th-th') {
      const thaiYear = date.getFullYear() + 543;
      const day = date.getDate();
      const month = date.getMonth() + 1;
      return `${day}/${month}/${thaiYear}`;
    } else {
      return date.toLocaleDateString(lang);
    }
  };

  const refreshCampaign = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (data.success) {
        setCampaign(data.data);
      }
    } catch (error) {
      console.error('[CampaignDetail] 刷新活动失败:', error);
    }
  };

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/campaigns/${id}/claim`, { channel: 'line_menu' });
      return res.json();
    },
    onSuccess: () => {
      refreshCampaign();
      toast({
        title: t('campaign.claimSuccess'),
        description: t('campaign.claimSuccessDesc'),
      });
      setActiveView('my-coupons');
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('campaign.claimError'),
        variant: 'destructive',
      });
    },
  });

  const handleLiffLogin = async () => {
    try {
      const liff = getLiff();
      if (!liff) {
        toast({
          title: t('common.error'),
          description: t('campaign.liffNotReady'),
          variant: 'destructive',
        });
        return;
      }

      if (!liff.isLoggedIn()) {
        await liff.login();
        return;
      }

      const idToken = liff.getIDToken();
      const response = await fetch('/api/auth/line/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (data.success) {
        loginUser(data.token, data.user);
        setTimeout(() => {
          claimMutation.mutate();
        }, 100);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('login.failed'),
        variant: 'destructive',
      });
    }
  };

  const handleWebLogin = async () => {
    const lineChannelId = import.meta.env.VITE_LINE_CHANNEL_ID;
    if (!lineChannelId) {
      toast({
        title: t('common.error'),
        description: 'LINE Channel ID not configured',
        variant: 'destructive',
      });
      return;
    }

    const origin = window.location.origin.replace(/^http:/, 'https:');
    const redirectUri = `${origin}/api/auth/line/callback`;
    const stateNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    try {
      const initResponse = await fetch('/api/auth/line/init-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: stateNonce,
          campaignId: id,
        }),
        credentials: 'include',
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initialize OAuth');
      }

      const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', lineChannelId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', stateNonce);
      authUrl.searchParams.set('scope', 'profile openid');
      authUrl.searchParams.set('nonce', stateNonce);
      
      window.location.href = authUrl.toString();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('login.failed'),
        variant: 'destructive',
      });
    }
  };

  const handleClaimClick = () => {
    const userReachedLimit = isUserAuthenticated && campaign.userClaimedCount !== undefined && campaign.userClaimedCount >= campaign.maxPerUser;
    
    if (userReachedLimit) {
      setActiveView('my-coupons');
      return;
    }
    
    if (isUserAuthenticated) {
      claimMutation.mutate();
    } else {
      if (isLiffEnvironment()) {
        handleLiffLogin();
      } else {
        handleWebLogin();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('campaign.notFound')}</CardTitle>
            <CardDescription>{t('campaign.notFoundDesc')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(campaign.endAt) < new Date();
  const isSoldOut = campaign.maxTotal && campaign.currentClaimed >= campaign.maxTotal;
  const userReachedLimit = isUserAuthenticated && campaign.userClaimedCount !== undefined && campaign.userClaimedCount >= campaign.maxPerUser;
  const canClaim = !isExpired && !isSoldOut && !userReachedLimit;

  const getNavigationUrl = (store: any) => {
    if (store.latitude && store.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
    }
    const address = encodeURIComponent(`${store.address}, ${store.city}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${address}`;
  };

  const getButtonText = () => {
    if (claimMutation.isPending) {
      return t('campaign.claiming');
    }
    if (isSoldOut) {
      return t('campaign.soldOut');
    }
    if (isExpired) {
      return t('campaign.expired');
    }
    if (userReachedLimit) {
      return t('campaign.viewMyCoupons');
    }
    if (!isUserAuthenticated) {
      return isLiffEnvironment() ? t('campaign.claimNow') : t('campaign.claimWithLine');
    }
    return t('campaign.claimNow');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div style={{ display: activeView === 'campaign' ? 'flex' : 'none' }} className="h-full flex-col">
        <div className="flex-shrink-0">
          <div className="container max-w-4xl mx-auto p-4 pb-0">
            {campaign.mediaUrls && campaign.mediaUrls.length > 0 ? (
              <Carousel 
                className="w-full" 
                plugins={[autoplayPlugin.current]}
                opts={{ loop: true, align: "start" }}
                data-testid="campaign-media"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {campaign.mediaUrls.map((url, index) => {
                    const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
                    return (
                      <CarouselItem key={index} className="pl-2 md:pl-4">
                        <div className="w-full aspect-video rounded-lg overflow-hidden bg-black">
                          {isVideo ? (
                            <video
                              controls
                              className="w-full h-full object-contain"
                              data-testid={`media-video-${index}`}
                            >
                              <source src={url} type="video/mp4" />
                            </video>
                          ) : (
                            <img
                              src={url}
                              alt={`${campaign.title} - ${index + 1}`}
                              className="w-full h-full object-contain"
                              data-testid={`media-image-${index}`}
                            />
                          )}
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
              </Carousel>
            ) : campaign.bannerImageUrl ? (
              <div className="w-full aspect-video rounded-lg overflow-hidden" data-testid="campaign-banner">
                <img
                  src={campaign.bannerImageUrl}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-4xl mx-auto px-4 pt-6 pb-32 space-y-6">
            <Card data-testid="campaign-info">
              <CardHeader className="px-3 py-6">
                <CardTitle className="text-xl md:text-2xl" data-testid="campaign-title">
                  {campaign.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 px-3 pt-0 pb-6">
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg" data-testid="coupon-info">
                  <Gift className="h-8 w-8 text-orange-500" />
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-lg text-orange-900">
                      {t(`discountType.${campaign.discountType}`)}
                    </span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatCouponValue(campaign.couponValue, campaign.discountType)}
                    </span>
                  </div>
                </div>

                <div className="text-sm" data-testid="campaign-duration">
                  <span className="text-muted-foreground">{t('campaign.period')}</span>
                  <span className="font-semibold ml-2">
                    {formatThaiDate(campaign.startAt, language)} - {formatThaiDate(campaign.endAt, language)}
                  </span>
                </div>

                <div className="text-sm" data-testid="stock-and-limit-info">
                  {campaign.maxTotal && (
                    <span data-testid="stock-info">
                      <span className="text-muted-foreground">{t('campaign.stock')}</span>
                      <span className="font-semibold ml-1">
                        {campaign.maxTotal - campaign.currentClaimed} {t('campaign.remaining')}
                      </span>
                      <span className="text-muted-foreground mx-1">{t('campaign.from')}</span>
                      <span className="font-semibold">
                        {campaign.maxTotal} {t('campaign.remaining')}
                      </span>
                      <span className="text-muted-foreground mx-2">•</span>
                    </span>
                  )}
                  <span data-testid="limit-info">
                    <span className="text-muted-foreground">{t('campaign.limitPerUser')}</span>
                    <span className="font-semibold ml-1">
                      {campaign.maxPerUser} {t('campaign.rightsPerPerson')}
                    </span>
                  </span>
                </div>
              </CardContent>

              <CardFooter className="px-3 pt-0 pb-6">
                <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-0"
                      data-testid="button-view-rules"
                    >
                      <FileText className="mr-2 h-4 w-4 text-orange-500" />
                      {t('campaign.viewRules')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="rules-dialog">
                    <DialogHeader>
                      <DialogTitle>{t('campaign.rules')}</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                      {campaign.description}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>

            <Card data-testid="stores-section">
              <CardHeader className="px-3 py-6">
                <CardTitle className="text-lg">{t('campaign.stores')}</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-6 space-y-3">
                {campaign.stores.map((store, index) => (
                  <Card key={store.id} className="p-4" data-testid={`store-card-${store.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-orange-500 flex-shrink-0" />
                          <h3 className="font-semibold">{store.name}</h3>
                        </div>

                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p>{store.address}</p>
                            {store.floorInfo && (
                              <p className="text-xs mt-1 text-orange-600">{store.floorInfo}</p>
                            )}
                          </div>
                        </div>

                        {store.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            <a href={`tel:${store.phone}`} className="hover:underline">
                              {store.phone}
                            </a>
                          </div>
                        )}

                        {userLocation && store.latitude && store.longitude && (
                          <div className="flex items-center gap-2 text-sm">
                            <Navigation className="h-4 w-4 text-orange-500 flex-shrink-0" />
                            <span className="text-muted-foreground">
                              {t('campaign.distance')}: <span className="font-semibold text-foreground">
                                {calculateDistance(userLocation.lat, userLocation.lng, store.latitude, store.longitude)}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                        onClick={() => window.open(getNavigationUrl(store), '_blank')}
                        data-testid={`button-navigate-${store.id}`}
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        {t('campaign.navigate')}
                      </Button>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
          <div className="container max-w-4xl mx-auto p-4 space-y-3">
            <Button
              className="w-full"
              size="lg"
              disabled={(!canClaim && !userReachedLimit) || claimMutation.isPending}
              onClick={handleClaimClick}
              data-testid="button-claim"
            >
              {getButtonText()}
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveView('campaign')}
                className={`flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-colors ${
                  activeView === 'campaign' 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                data-testid="tab-campaign"
              >
                <Tag className="h-5 w-5 mb-1" />
                <span className="text-sm font-medium">{t('nav.campaigns')}</span>
              </button>

              <button
                onClick={() => setActiveView('my-coupons')}
                className={`flex flex-col items-center justify-center py-2 px-4 rounded-lg transition-colors ${
                  activeView === 'my-coupons' 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                data-testid="tab-my-coupons"
              >
                <Ticket className="h-5 w-5 mb-1" />
                <span className="text-sm font-medium">{t('nav.myCoupons')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: activeView === 'my-coupons' ? 'block' : 'none' }} className="h-full overflow-hidden">
        <MyCoupons hideNavigation />
      </div>
    </div>
  );
}
