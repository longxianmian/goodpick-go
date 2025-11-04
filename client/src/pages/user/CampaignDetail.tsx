import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Gift, Calendar, MapPin, Tag, Phone, Star, Navigation } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    liff: any;
  }
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isUserAuthenticated, loginUser } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [isLiffEnvironment, setIsLiffEnvironment] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  // 检测LIFF环境并处理登录后自动领券
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const autoClaim = urlParams.get('autoClaim');

    // Handle OAuth callback with token
    if (token && autoClaim === 'true' && !isUserAuthenticated) {
      try {
        // Decode user data from token
        const payload = JSON.parse(atob(token.split('.')[1]));
        loginUser(token, {
          id: payload.id,
          lineUserId: payload.lineUserId,
          displayName: payload.displayName || 'User',
          avatarUrl: payload.avatarUrl,
          language: payload.language || 'th-th',
        });

        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);

        // Auto-claim after a short delay
        setTimeout(() => {
          claimMutation.mutate();
        }, 300);
      } catch (error) {
        console.error('Failed to parse token:', error);
        toast({
          title: t('common.error'),
          description: t('login.failed'),
          variant: 'destructive',
        });
        window.history.replaceState({}, '', window.location.pathname);
      }
      return;
    }

    // Handle auto-claim if already logged in
    if (autoClaim === 'true' && isUserAuthenticated) {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      
      // Auto-claim after a short delay
      setTimeout(() => {
        claimMutation.mutate();
      }, 300);
      return;
    }

    // Check LIFF environment
    const checkLiff = async () => {
      if (window.liff) {
        try {
          await window.liff.init({ liffId: import.meta.env.VITE_LIFF_ID || 'dummy-liff-id' });
          setIsLiffEnvironment(window.liff.isInClient());
          
          // LIFF登录成功后的处理
          if (window.liff.isLoggedIn() && !isUserAuthenticated) {
            const idToken = window.liff.getIDToken();
            
            const response = await fetch('/api/auth/line/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idToken }),
            });

            const data = await response.json();

            if (data.success) {
              loginUser(data.token, data.user);
              
              // 检查是否有待领取的优惠券
              const pendingClaim = localStorage.getItem('pendingClaim');
              if (pendingClaim === id) {
                localStorage.removeItem('pendingClaim');
                // 延迟一下确保登录状态已更新
                setTimeout(() => {
                  claimMutation.mutate();
                }, 300);
              }
            }
          }
        } catch (error) {
          console.error('LIFF init failed:', error);
          setIsLiffEnvironment(false);
        }
      } else {
        setIsLiffEnvironment(false);
      }
    };
    checkLiff();
  }, [id, isUserAuthenticated]);

  // 获取用户位置用于计算距离
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          console.log('User location obtained:', location);
        },
        (error) => {
          console.log('Location permission denied or unavailable:', error);
          console.log('Error code:', error.code, 'Message:', error.message);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000 // 5分钟缓存
        }
      );
    } else {
      console.log('Geolocation is not supported by this browser');
    }
  }, []);

  // 计算两点之间的距离（Haversine公式）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371; // 地球半径（千米）
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

  // 获取活动详情
  const { data: response, isLoading } = useQuery<{
    success: boolean;
    data: {
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
        latitude: number | null;
        longitude: number | null;
      }>;
      userClaimedCount?: number;
      canClaim: boolean;
      claimMessage?: string;
    };
  }>({
    queryKey: ['/api/campaigns', id],
    enabled: !!id,
  });

  const campaign = response?.data;

  // 领取优惠券
  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/campaigns/${id}/claim`, { channel: 'line_menu' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', id] });
      toast({
        title: t('campaign.claimSuccess'),
        description: t('campaign.claimSuccessDesc'),
      });
      setLocation('/my-coupons');
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('campaign.claimError'),
        variant: 'destructive',
      });
    },
  });

  // LIFF环境登录
  const handleLiffLogin = async () => {
    try {
      if (!window.liff) {
        toast({
          title: t('common.error'),
          description: t('campaign.liffNotReady'),
          variant: 'destructive',
        });
        return;
      }

      if (!window.liff.isLoggedIn()) {
        // 存储领券意图
        if (id) {
          localStorage.setItem('pendingClaim', id);
        }
        // 静默登录，登录成功后会自动刷新页面并触发自动领券
        await window.liff.login();
        return;
      }

      // 已登录LIFF但未登录后端，执行后端登录
      const idToken = window.liff.getIDToken();
      
      const response = await fetch('/api/auth/line/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (data.success) {
        loginUser(data.token, data.user);
        // 登录成功后自动领券
        claimMutation.mutate();
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

  // Web环境登录
  const handleWebLogin = async () => {
    const lineChannelId = import.meta.env.VITE_LINE_CHANNEL_ID || '';
    const redirectUri = `${window.location.origin}/api/auth/line/callback`;
    
    // Generate cryptographically strong state nonce for CSRF protection
    const stateNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    try {
      // Store state server-side for CSRF validation
      const initResponse = await fetch('/api/auth/line/init-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: stateNonce,
          campaignId: id,
        }),
        credentials: 'include', // Important: include cookies for session
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initialize OAuth');
      }

      // Build LINE OAuth URL with nonce as state
      const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', lineChannelId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', stateNonce);
      authUrl.searchParams.set('scope', 'profile openid');
      authUrl.searchParams.set('nonce', stateNonce); // Also add as nonce for ID token validation
      
      // Redirect to LINE OAuth
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Failed to init OAuth:', error);
      toast({
        title: t('common.error'),
        description: t('login.failed'),
        variant: 'destructive',
      });
      setIsLoggingIn(false);
    }
  };

  // 领券按钮点击处理
  const handleClaimClick = () => {
    if (isUserAuthenticated) {
      // 已登录，直接领券
      claimMutation.mutate();
    } else {
      // 未登录
      if (isLiffEnvironment) {
        // LIFF环境：静默调用liff.login()
        handleLiffLogin();
      } else {
        // Web环境：直接跳转LINE授权（简化流程，无对话框）
        setIsLoggingIn(true);
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
  
  // 判断用户是否可以领取
  // 未登录时：允许点击（用于触发登录）
  // 已登录时：检查是否达到个人限制
  const userReachedLimit = isUserAuthenticated && campaign.userClaimedCount !== undefined && campaign.userClaimedCount >= campaign.maxPerUser;
  const canClaim = !isExpired && !isSoldOut && !userReachedLimit;

  // 生成Google Maps导航链接
  const getNavigationUrl = (store: any) => {
    // 优先使用经纬度，否则使用地址
    if (store.latitude && store.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
    }
    // 使用地址编码
    const address = encodeURIComponent(`${store.address}, ${store.city}`);
    return `https://www.google.com/maps/dir/?api=1&destination=${address}`;
  };

  // 检测是否为移动设备
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // 按钮文案逻辑
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
    if (!canClaim && isUserAuthenticated) {
      return campaign.claimMessage || t('campaign.reachedLimit');
    }
    
    // 未登录状态
    if (!isUserAuthenticated) {
      if (isLiffEnvironment) {
        // LIFF环境：不显示"登录"字样
        return t('campaign.claimNow');
      } else {
        // Web环境：显示"用LINE一键领取"
        return t('campaign.claimWithLine');
      }
    }
    
    // 已登录状态
    return t('campaign.claimNow');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        {/* 媒体轮播（图片和视频） */}
        {campaign.mediaUrls && campaign.mediaUrls.length > 0 ? (
          <Carousel 
            className="w-full" 
            plugins={[autoplayPlugin.current]}
            opts={{ 
              loop: true, 
              align: "start"
            }}
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
                  {campaign.discountType === 'percentage_off' ? `${campaign.couponValue}%` : `฿${campaign.couponValue}`}
                </span>
              </div>
            </div>

            {/* 活动时间 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="campaign-duration">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(campaign.startAt).toLocaleDateString(language)} - {new Date(campaign.endAt).toLocaleDateString(language)}
              </span>
            </div>

            {/* 库存信息 - 合并到一行 */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              {campaign.maxTotal && (
                <div data-testid="stock-info">
                  <span className="text-muted-foreground">{t('campaign.stock')}:</span>
                  <span className="font-semibold ml-2">
                    {campaign.maxTotal - campaign.currentClaimed} / {campaign.maxTotal}
                  </span>
                </div>
              )}
              <div data-testid="limit-info">
                <span className="text-muted-foreground">{t('campaign.limitPerUser')}:</span>
                <span className="font-semibold ml-2">{campaign.maxPerUser}</span>
                {isUserAuthenticated && campaign.userClaimedCount !== undefined && (
                  <span className="ml-2 text-muted-foreground">
                    ({t('campaign.claimed')}: {campaign.userClaimedCount})
                  </span>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-3 px-3 pt-0 pb-6">
            {/* 活动规则按钮 */}
            <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full"
                  data-testid="button-view-rules"
                >
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

            {/* 领取按钮 */}
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              size="lg"
              onClick={handleClaimClick}
              disabled={!canClaim || claimMutation.isPending}
              data-testid="button-claim"
            >
              {getButtonText()}
            </Button>
          </CardFooter>
        </Card>

        {/* 适用门店 - 只显示前3个 */}
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
                {campaign.stores.slice(0, 3).map((store) => (
                  <div
                    key={store.id}
                    className="flex gap-3 p-3 border rounded-lg hover-elevate"
                    data-testid={`store-${store.id}`}
                  >
                    {/* 门店图片 */}
                    {(store as any).imageUrl && (
                      <div className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                        <img
                          src={(store as any).imageUrl}
                          alt={store.name}
                          className="w-full h-full object-cover"
                          data-testid={`store-image-${store.id}`}
                        />
                      </div>
                    )}
                    
                    {/* 门店信息 - 固定3行布局 */}
                    <div className="flex-1 min-w-0">
                      {/* 第1行：店名 */}
                      <h3 className="font-semibold text-base mb-1" data-testid={`store-name-${store.id}`}>
                        {store.name}
                      </h3>
                      
                      {/* 第2行：地址（单行截断） */}
                      <p className="text-sm text-muted-foreground truncate mb-2" data-testid={`store-address-${store.id}`}>
                        {store.address}
                      </p>
                      
                      {/* 第3行：电话 + 距离 + 导航按钮 */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* 电话 */}
                        {(store as any).phone && (
                          <a
                            href={`tel:${(store as any).phone.replace(/\s/g, '')}`}
                            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                            data-testid={`store-phone-${store.id}`}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{(store as any).phone.replace(/\s/g, '')}</span>
                          </a>
                        )}
                        
                        {/* 距离 */}
                        {userLocation && store.latitude && store.longitude ? (
                          <span className="text-sm text-muted-foreground flex items-center gap-1" data-testid={`store-distance-${store.id}`}>
                            <MapPin className="h-3.5 w-3.5 text-orange-500" />
                            {calculateDistance(userLocation.lat, userLocation.lng, store.latitude, store.longitude)}
                          </span>
                        ) : null}
                        
                        {/* 导航按钮 */}
                        <a
                          href={getNavigationUrl(store)}
                          target={isMobileDevice() ? '_self' : '_blank'}
                          rel="noopener noreferrer"
                          aria-label={t('campaign.navigateAria', { store: store.name })}
                          data-testid={`store-navigate-${store.id}`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            <Navigation className="h-3.5 w-3.5 mr-1.5 text-orange-500" />
                            {t('campaign.navigate')}
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

        {/* 查看我的优惠券 */}
        {isUserAuthenticated && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation('/my-coupons')}
            data-testid="button-my-coupons"
          >
            <Tag className="mr-2 h-4 w-4" />
            {t('campaign.viewMyCoupons')}
          </Button>
        )}
      </div>
    </div>
  );
}
