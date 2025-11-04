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
import { Gift, Calendar, MapPin, Tag } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useState, useEffect } from 'react';

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
  const canClaim = campaign.canClaim && !isExpired && !isSoldOut;

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
        {/* Banner */}
        {campaign.bannerImageUrl && (
          <div className="w-full aspect-video rounded-lg overflow-hidden" data-testid="campaign-banner">
            <img
              src={campaign.bannerImageUrl}
              alt={campaign.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* 媒体轮播（图片和视频） */}
        {campaign.mediaUrls && campaign.mediaUrls.length > 0 && (
          <Carousel 
            className="w-full" 
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
            {campaign.mediaUrls.length > 1 && (
              <>
                <CarouselPrevious />
                <CarouselNext />
              </>
            )}
          </Carousel>
        )}

        {/* 活动信息 */}
        <Card data-testid="campaign-info">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2" data-testid="campaign-title">
                  {campaign.title}
                </CardTitle>
                <CardDescription className="text-base whitespace-pre-wrap" data-testid="campaign-description">
                  {campaign.description}
                </CardDescription>
              </div>
              <Badge variant={isExpired ? 'destructive' : 'default'} data-testid="campaign-status">
                {isExpired ? t('campaign.expired') : t('campaign.active')}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 优惠券信息 */}
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg" data-testid="coupon-info">
              <Gift className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold text-lg">
                  {t(`discountType.${campaign.discountType}`)}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {campaign.discountType === 'percentage_off' ? `${campaign.couponValue}%` : `฿${campaign.couponValue}`}
                </div>
                {campaign.originalPrice && (
                  <div className="text-sm text-muted-foreground line-through">
                    {t('campaign.originalPrice')}: ฿{campaign.originalPrice}
                  </div>
                )}
              </div>
            </div>

            {/* 活动时间 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="campaign-duration">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(campaign.startAt).toLocaleDateString(language)} - {new Date(campaign.endAt).toLocaleDateString(language)}
              </span>
            </div>

            {/* 库存信息 */}
            <div className="space-y-2">
              {campaign.maxTotal && (
                <div className="text-sm" data-testid="stock-info">
                  <span className="text-muted-foreground">{t('campaign.stock')}:</span>
                  <span className="font-semibold ml-2">
                    {campaign.maxTotal - campaign.currentClaimed} / {campaign.maxTotal}
                  </span>
                </div>
              )}
              <div className="text-sm" data-testid="limit-info">
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

          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={handleClaimClick}
              disabled={!canClaim || claimMutation.isPending}
              data-testid="button-claim"
            >
              {getButtonText()}
            </Button>
          </CardFooter>
        </Card>

        {/* 适用门店 */}
        {campaign.stores && campaign.stores.length > 0 && (
          <Card data-testid="stores-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('campaign.applicableStores')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {campaign.stores.map((store) => (
                  <div
                    key={store.id}
                    className="p-3 border rounded-lg hover-elevate"
                    data-testid={`store-${store.id}`}
                  >
                    <div className="font-semibold">{store.name}</div>
                    <div className="text-sm text-muted-foreground">
                      <div>{store.city}</div>
                      <div>{store.address}</div>
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
