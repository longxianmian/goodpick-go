import { useParams } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Gift, Calendar, MapPin, Tag, Phone, Navigation, FileText, Building2, Ticket } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import MyCoupons from './MyCoupons';

declare global {
  interface Window {
    liff: any;
  }
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { isUserAuthenticated, loginUser } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // 【方案要求】最简单的状态
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  
  const [isLiffEnvironment, setIsLiffEnvironment] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeView, setActiveView] = useState<'campaign' | 'my-coupons'>('campaign');
  
  const autoplayPlugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: true }));

  // 【方案要求】检查LIFF环境（只执行一次）
  useEffect(() => {
    if (window.liff) {
      setIsLiffEnvironment(window.liff.isInClient());
    }
  }, []);

  // 【方案要求】加载活动详情（只执行一次，最简单的fetch）
  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // 【多语言支持】设置 accept-language 请求头
        const sessionId = (window as any).__GPGO_SESSION_ID__;
        const res = await fetch(`/api/campaigns/${id}`, {
          headers: {
            'Accept-Language': language,
            'X-GPGO-Session': sessionId || 'unknown',
          },
        });
        if (!res.ok) throw new Error('Failed to load campaign');
        const data = await res.json();
        
        if (!cancelled) {
          setCampaign(data.data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError('加载失败，请稍后重试');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 获取用户位置用于计算距离
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, []);

  // 计算两点之间的距离（Haversine公式）
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

  // 格式化券值显示
  const formatCouponValue = (value: string, type: string) => {
    const num = parseFloat(value);
    if (type === 'percentage_off') {
      return num % 1 === 0 ? `${Math.round(num)}%` : `${num}%`;
    } else {
      return num % 1 === 0 ? `฿${Math.round(num)}` : `฿${num}`;
    }
  };

  // 格式化日期显示
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

  // 生成Google Maps导航链接
  const getNavigationUrl = (store: any) => {
    if (store.latitude && store.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
    }
    const address = encodeURIComponent(`${store.address}, ${store.city}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${address}`;
  };

  // 检测是否为移动设备
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // 【方案要求】LIFF登录（只在按钮点击时调用）
  const handleLiffLogin = async () => {
    try {
      if (!(window as any).liff) {
        console.error('[handleLiffLogin] LIFF SDK not available');
        toast({
          title: t('common.error'),
          description: t('campaign.liffNotReady'),
          variant: 'destructive',
        });
        return;
      }

      const liff = (window as any).liff;

      // 【按需初始化 LIFF】如果还没有初始化，则在这里初始化
      if (!(window as any).__LIFF_INITED__) {
        // 优先使用 VITE_LIFF_ID
        const liffId = import.meta.env.VITE_LIFF_ID;
        if (!liffId) {
          console.error('[handleLiffLogin] No LIFF ID configured');
          toast({
            title: t('common.error'),
            description: 'LIFF ID not configured',
            variant: 'destructive',
          });
          return;
        }
        
        console.log('[handleLiffLogin] 开始按需初始化 LIFF');
        await liff.init({ liffId });
        (window as any).__LIFF_INITED__ = true;
        console.log('[handleLiffLogin] LIFF 初始化完成');
      }

      // LIFF 初始化完成后，检查登录状态
      if (!liff.isLoggedIn()) {
        console.log('[handleLiffLogin] 用户未登录，跳转 LIFF 登录');
        await liff.login();
        return;
      }

      // 已登录LIFF但未登录后端
      console.log('[handleLiffLogin] 用户已登录 LIFF，获取 ID Token');
      const idToken = liff.getIDToken();
      const response = await fetch('/api/auth/line/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[handleLiffLogin] 后端登录成功');
        loginUser(data.token, data.user);
        // 登录成功后自动领券
        await handleClaim();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('[handleLiffLogin] 错误:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('login.failed'),
        variant: 'destructive',
      });
    }
  };

  // 【方案要求】Web登录（只在按钮点击时调用）
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

  // 【方案要求】领券函数（只在按钮点击时调用）
  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
        },
        body: JSON.stringify({ channel: 'line_menu' }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: t('campaign.claimSuccess'),
          description: t('campaign.claimSuccessDesc'),
        });
        setActiveView('my-coupons');
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

  // 【方案要求】领券按钮点击（只在这里触发登录或领券）
  const handleClaimClick = async () => {
    if (!campaign) return;

    const userReachedLimit = isUserAuthenticated && 
      campaign.userClaimedCount !== undefined && 
      campaign.userClaimedCount >= campaign.maxPerUser;

    // 已达上限：切换到我的优惠券
    if (userReachedLimit) {
      setActiveView('my-coupons');
      return;
    }
    
    if (isUserAuthenticated) {
      // 已登录：直接领券
      await handleClaim();
    } else {
      // 未登录：触发登录
      if (isLiffEnvironment) {
        await handleLiffLogin();
      } else {
        await handleWebLogin();
      }
    }
  };

  // 加载中
  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // 错误
  if (error) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('common.error')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // 活动不存在
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
  const userReachedLimit = isUserAuthenticated && 
    campaign.userClaimedCount !== undefined && 
    campaign.userClaimedCount >= campaign.maxPerUser;
  const canClaim = !isExpired && !isSoldOut && !userReachedLimit;

  // 按钮文案
  const getButtonText = () => {
    if (claiming) return t('campaign.claiming');
    if (isSoldOut) return t('campaign.soldOut');
    if (isExpired) return t('campaign.expired');
    if (userReachedLimit) return t('campaign.viewMyCoupons');
    if (!isUserAuthenticated) {
      return isLiffEnvironment ? t('campaign.claimNow') : t('campaign.claimWithLine');
    }
    return t('campaign.claimNow');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {activeView === 'campaign' ? (
        <>
          {/* 固定头部 - 图片/视频 */}
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
                    {campaign.mediaUrls.map((url: string, index: number) => {
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
                                您的浏览器不支持视频播放
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

          {/* 滚动内容区域 */}
          <div className="flex-1 overflow-y-auto">
            <div className="container max-w-4xl mx-auto px-4 pt-6 space-y-6">
              {/* 活动信息 */}
              <Card data-testid="campaign-info">
                <CardHeader className="px-3 py-6">
                  <CardTitle className="text-xl md:text-2xl" data-testid="campaign-title">
                    {campaign.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4 px-3 pt-0 pb-6">
                  {/* 优惠券信息 */}
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

                  {/* 有效期 */}
                  <div className="text-sm" data-testid="campaign-duration">
                    <span className="text-muted-foreground">{t('campaign.period')}</span>
                    <span className="font-semibold ml-2">
                      {formatThaiDate(campaign.startAt, language)} - {formatThaiDate(campaign.endAt, language)}
                    </span>
                  </div>

                  {/* 库存和配额信息 */}
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
                  {/* 活动规则按钮 */}
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
                      <div className="whitespace-pre-wrap text-sm" data-testid="rules-content">
                        {campaign.description}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>

              {/* 适用门店 */}
              {campaign.stores && campaign.stores.length > 0 && (
                <Card data-testid="stores-section">
                  <CardHeader className="px-3 py-6">
                    <h3 className="text-lg md:text-xl font-semibold flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-orange-500" />
                      {t('campaign.nearestStores')}
                    </h3>
                  </CardHeader>
                  <CardContent className="px-3 pt-0 pb-6">
                    <div className="space-y-4">
                      {campaign.stores.slice(0, 3).map((store: any) => (
                        <div
                          key={store.id}
                          className="flex gap-3 p-3 border rounded-lg hover-elevate"
                          data-testid={`store-${store.id}`}
                        >
                          {store.imageUrl && (
                            <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                              <img
                                src={store.imageUrl}
                                alt={store.name}
                                className="w-full h-full object-cover"
                                data-testid={`store-image-${store.id}`}
                              />
                            </div>
                          )}
                          
                          <div className="flex-1 overflow-hidden">
                            <h3 className="font-semibold text-base mb-1" data-testid={`store-name-${store.id}`}>
                              {store.name}
                            </h3>
                            
                            <p className="text-sm text-muted-foreground truncate mb-2" data-testid={`store-address-${store.id}`}>
                              {store.address}
                            </p>
                            
                            {store.floorInfo && (
                              <p className="text-sm font-medium text-orange-600 mb-2 flex items-center gap-1.5" data-testid={`store-floor-${store.id}`}>
                                <Building2 className="h-4 w-4" />
                                {store.floorInfo}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-1.5 flex-nowrap">
                              {store.phone && (
                                <a
                                  href={`tel:${store.phone.replace(/\s/g, '')}`}
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline shrink-0"
                                  data-testid={`store-phone-${store.id}`}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  <span className="text-xs">{store.phone.replace(/\s/g, '')}</span>
                                </a>
                              )}
                              
                              {userLocation && store.latitude && store.longitude ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0" data-testid={`store-distance-${store.id}`}>
                                  <MapPin className="h-3.5 w-3.5 text-orange-500" />
                                  {calculateDistance(userLocation.lat, userLocation.lng, store.latitude, store.longitude)}
                                </span>
                              ) : null}
                              
                              <a
                                href={getNavigationUrl(store)}
                                target={isMobileDevice() ? '_self' : '_blank'}
                                rel="noopener noreferrer"
                                aria-label={t('campaign.navigateAria', { store: store.name })}
                                data-testid={`store-navigate-${store.id}`}
                                className="shrink-0"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto py-0.5 px-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                >
                                  <Navigation className="h-3.5 w-3.5 mr-1 text-orange-500" />
                                  <span className="text-xs">{t('campaign.navigate')}</span>
                                </Button>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* 固定在底部的区域 */}
          <div className="border-t bg-background">
            {/* 领取按钮 */}
            <div className="container max-w-4xl mx-auto px-4 pt-3 pb-2">
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                size="lg"
                onClick={handleClaimClick}
                disabled={(!canClaim && !userReachedLimit) || claiming}
                data-testid="button-claim"
              >
                {getButtonText()}
              </Button>
            </div>
            
            {/* 底部导航菜单 */}
            <div className="border-t">
              <div className="container max-w-4xl mx-auto grid grid-cols-2">
                <button 
                  onClick={() => setActiveView('campaign')}
                  className={`flex flex-col items-center justify-center py-3 gap-1 hover-elevate ${activeView === 'campaign' ? 'border-b-2 border-orange-500' : ''}`}
                  data-testid="nav-activities"
                >
                  <Tag className={`h-5 w-5 ${activeView === 'campaign' ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <span className={`text-xs ${activeView === 'campaign' ? 'font-medium text-orange-500' : 'text-muted-foreground'}`}>{t('nav.activities')}</span>
                </button>
                <button 
                  onClick={() => setActiveView('my-coupons')}
                  className={`flex flex-col items-center justify-center py-3 gap-1 hover-elevate ${activeView === 'my-coupons' ? 'border-b-2 border-orange-500' : ''}`}
                  data-testid="nav-my-coupons"
                >
                  <Ticket className={`h-5 w-5 ${activeView === 'my-coupons' ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <span className={`text-xs ${activeView === 'my-coupons' ? 'font-medium text-orange-500' : 'text-muted-foreground'}`}>{t('nav.myCoupons')}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 我的优惠券视图 */}
          <div className="flex-1 overflow-y-auto">
            <MyCoupons hideNavigation={true} />
          </div>

          {/* 固定在底部的区域 */}
          <div className="border-t bg-background">
            {/* 底部导航菜单 */}
            <div className="border-t">
              <div className="container max-w-4xl mx-auto grid grid-cols-2">
                <button 
                  onClick={() => setActiveView('campaign')}
                  className={`flex flex-col items-center justify-center py-3 gap-1 hover-elevate ${activeView === 'campaign' ? 'border-b-2 border-orange-500' : ''}`}
                  data-testid="nav-activities"
                >
                  <Tag className={`h-5 w-5 ${activeView === 'campaign' ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <span className={`text-xs ${activeView === 'campaign' ? 'font-medium text-orange-500' : 'text-muted-foreground'}`}>{t('nav.activities')}</span>
                </button>
                <button 
                  onClick={() => setActiveView('my-coupons')}
                  className={`flex flex-col items-center justify-center py-3 gap-1 hover-elevate ${activeView === 'my-coupons' ? 'border-b-2 border-orange-500' : ''}`}
                  data-testid="nav-my-coupons"
                >
                  <Ticket className={`h-5 w-5 ${activeView === 'my-coupons' ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <span className={`text-xs ${activeView === 'my-coupons' ? 'font-medium text-orange-500' : 'text-muted-foreground'}`}>{t('nav.myCoupons')}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
