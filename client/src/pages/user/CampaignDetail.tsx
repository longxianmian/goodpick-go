import { useParams, useLocation, Link } from 'wouter';
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
import { Gift, Calendar, MapPin, Tag, Phone, Star, Navigation, FileText, Building2, Ticket } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    liff: any;
  }
}

// 定义页面状态枚举
type PageState = 
  | 'INIT'              // 初始化中
  | 'CHECK_LOGIN'       // 检查登录状态
  | 'READY'             // 就绪（可以领券或查看详情）
  | 'CLAIMING'          // 领券中
  | 'CLAIMED';          // 已领取（跳转到我的优惠券）

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isUserAuthenticated, loginUser } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [pageState, setPageState] = useState<PageState>('READY'); // 【修复】直接以READY状态开始，避免INIT→READY导致的重新渲染
  const [isLiffEnvironment, setIsLiffEnvironment] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [autoClaimProcessed, setAutoClaimProcessed] = useState(false); // 标记autoClaim是否已处理
  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  // 【修复】一次性检查LIFF环境（仅在首次挂载时执行）
  useEffect(() => {
    console.log('[CampaignDetail] 首次挂载，检查LIFF环境');
    if (!window.liff) {
      setIsLiffEnvironment(false);
    } else {
      setIsLiffEnvironment(window.liff.isInClient());
    }
  }, []); // 空依赖，只执行一次

  // 步骤1：处理OAuth回调（一次性消费autoClaim参数）
  useEffect(() => {
    if (autoClaimProcessed) return; // 已处理过，跳过

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const autoClaim = urlParams.get('autoClaim');

    if (token && autoClaim === 'true') {
      console.log('[CampaignDetail] OAuth回调检测到，处理登录和自动领券');
      setAutoClaimProcessed(true); // 立即标记为已处理，防止重复

      try {
        // 解析token
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // 更新登录状态
        loginUser(token, {
          id: payload.id,
          lineUserId: payload.lineUserId,
          displayName: payload.displayName || 'User',
          avatarUrl: payload.avatarUrl,
          language: payload.language || 'th-th',
        });

        // 清理URL（移除token和autoClaim参数）
        window.history.replaceState({}, '', window.location.pathname);

        // 设置为领券中状态
        setPageState('CLAIMING');
      } catch (error) {
        console.error('[CampaignDetail] Token解析失败:', error);
        toast({
          title: t('common.error'),
          description: t('login.failed'),
          variant: 'destructive',
        });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [autoClaimProcessed]); // 只依赖autoClaimProcessed

  // 步骤2：在CLAIMING状态下执行领券
  useEffect(() => {
    if (pageState === 'CLAIMING' && isUserAuthenticated) {
      console.log('[CampaignDetail] 状态为CLAIMING，触发领券');
      claimMutation.mutate();
    }
  }, [pageState, isUserAuthenticated]);

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
  console.log('[CampaignDetail] 组件挂载/更新，id:', id, 'pageState:', pageState);
  
  // 检查queryClient中是否有缓存
  const cachedData = queryClient.getQueryData(['/api/campaigns', id]);
  console.log('[CampaignDetail] queryClient缓存检查 - 有缓存:', !!cachedData);
  
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
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  
  console.log('[CampaignDetail] useQuery结果 - isLoading:', isLoading, 'hasData:', !!response);

  const campaign = response?.data;

  // 格式化券值显示（去除不必要的小数）
  const formatCouponValue = (value: string, type: string) => {
    const num = parseFloat(value);
    if (type === 'percentage_off') {
      // 折扣：如果是整数，不显示小数位
      return num % 1 === 0 ? `${Math.round(num)}%` : `${num}%`;
    } else {
      // 其他类型：如果是整数，不显示小数位
      return num % 1 === 0 ? `฿${Math.round(num)}` : `฿${num}`;
    }
  };

  // 格式化日期显示（泰文友好格式）
  const formatThaiDate = (dateString: string, lang: string) => {
    const date = new Date(dateString);
    
    if (lang === 'th-th') {
      // 泰文：使用简洁格式（日/月/年，泰历）
      const thaiYear = date.getFullYear() + 543; // 佛历
      const day = date.getDate();
      const month = date.getMonth() + 1;
      return `${day}/${month}/${thaiYear}`;
    } else {
      // 其他语言：使用标准格式
      return date.toLocaleDateString(lang);
    }
  };

  // 领取优惠券
  const claimMutation = useMutation({
    mutationFn: async () => {
      console.log('[Claim] 开始领券请求');
      const res = await apiRequest('POST', `/api/campaigns/${id}/claim`, { channel: 'line_menu' });
      return res.json();
    },
    onSuccess: () => {
      console.log('[Claim] 领券成功');
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', id] });
      toast({
        title: t('campaign.claimSuccess'),
        description: t('campaign.claimSuccessDesc'),
      });
      setPageState('CLAIMED');
      setLocation('/my-coupons');
    },
    onError: (error: any) => {
      console.error('[Claim] 领券失败:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('campaign.claimError'),
        variant: 'destructive',
      });
      // 失败后回到READY状态
      setPageState('READY');
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
        console.log('[LIFF] 未登录，触发liff.login()');
        // 触发LINE登录（会刷新页面）
        await window.liff.login();
        return;
      }

      // 已登录LIFF但未登录后端，执行后端登录
      console.log('[LIFF] 已登录LIFF，执行后端登录');
      setPageState('CHECK_LOGIN');
      
      const idToken = window.liff.getIDToken();
      const response = await fetch('/api/auth/line/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (data.success) {
        loginUser(data.token, data.user);
        console.log('[LIFF] 后端登录成功，设置为CLAIMING状态');
        // 登录成功后进入领券状态
        setPageState('CLAIMING');
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('[LIFF] 登录失败:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('login.failed'),
        variant: 'destructive',
      });
      setPageState('READY');
    }
  };

  // Web环境登录
  const handleWebLogin = async () => {
    const lineChannelId = import.meta.env.VITE_LINE_CHANNEL_ID;
    if (!lineChannelId) {
      toast({
        title: t('common.error'),
        description: 'LINE Channel ID not configured',
        variant: 'destructive',
      });
      setIsLoggingIn(false);
      return;
    }
    // 强制使用 HTTPS（LINE 要求）
    const origin = window.location.origin.replace(/^http:/, 'https:');
    const redirectUri = `${origin}/api/auth/line/callback`;
    
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
    // 用户已达到领取上限：跳转到我的优惠券页面
    if (userReachedLimit) {
      console.log('[Claim] 用户已达上限，跳转到我的优惠券');
      setLocation('/my-coupons');
      return;
    }
    
    if (isUserAuthenticated) {
      // 已登录，设置为领券中状态
      console.log('[Claim] 用户已登录，设置为CLAIMING状态');
      setPageState('CLAIMING');
    } else {
      // 未登录，触发登录
      console.log('[Claim] 用户未登录，触发登录流程');
      if (isLiffEnvironment) {
        // LIFF环境：调用handleLiffLogin
        handleLiffLogin();
      } else {
        // Web环境：跳转LINE OAuth
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
    // 状态：领券中或检查登录中
    if (pageState === 'CLAIMING' || claimMutation.isPending) {
      return t('campaign.claiming');
    }
    if (pageState === 'CHECK_LOGIN') {
      return t('common.loading');
    }
    if (isSoldOut) {
      return t('campaign.soldOut');
    }
    if (isExpired) {
      return t('campaign.expired');
    }
    // 用户已达到领取上限：显示"查看我的优惠券"
    if (userReachedLimit) {
      return t('campaign.viewMyCoupons');
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
    <div className="h-screen flex flex-col bg-background">
      {/* 固定头部 - 图片/视频 */}
      <div className="flex-shrink-0">
        <div className="container max-w-4xl mx-auto p-4 pb-0">
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

            {/* 库存和配额信息 - 参考设计格式 */}
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
                    <div className="flex-1 overflow-hidden">
                      {/* 第1行：店名 */}
                      <h3 className="font-semibold text-base mb-1" data-testid={`store-name-${store.id}`}>
                        {store.name}
                      </h3>
                      
                      {/* 第2行：地址（单行截断） */}
                      <p className="text-sm text-muted-foreground truncate mb-2" data-testid={`store-address-${store.id}`}>
                        {store.address}
                      </p>
                      
                      {/* 楼层信息（如果有） */}
                      {(store as any).floorInfo && (
                        <p className="text-sm font-medium text-orange-600 mb-2 flex items-center gap-1.5" data-testid={`store-floor-${store.id}`}>
                          <Building2 className="h-4 w-4" />
                          {(store as any).floorInfo}
                        </p>
                      )}
                      
                      {/* 第3行：电话 + 距离 + 导航按钮 */}
                      <div className="flex items-center gap-1.5 flex-nowrap">
                        {/* 电话 */}
                        {(store as any).phone && (
                          <a
                            href={`tel:${(store as any).phone.replace(/\s/g, '')}`}
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline shrink-0"
                            data-testid={`store-phone-${store.id}`}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span className="text-xs">{(store as any).phone.replace(/\s/g, '')}</span>
                          </a>
                        )}
                        
                        {/* 距离 */}
                        {userLocation && store.latitude && store.longitude ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0" data-testid={`store-distance-${store.id}`}>
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
            disabled={(!canClaim && !userReachedLimit) || pageState === 'CLAIMING' || pageState === 'CHECK_LOGIN' || claimMutation.isPending}
            data-testid="button-claim"
          >
            {getButtonText()}
          </Button>
        </div>
        
        {/* 底部导航菜单 */}
        <div className="border-t">
          <div className="container max-w-4xl mx-auto grid grid-cols-2">
            <Link href="/campaign/1" className="flex flex-col items-center justify-center py-3 gap-1 hover-elevate border-b-2 border-orange-500" data-testid="nav-activities">
              <Tag className="h-5 w-5 text-orange-500" />
              <span className="text-xs font-medium text-orange-500">{t('nav.activities')}</span>
            </Link>
            <Link href="/my-coupons" className="flex flex-col items-center justify-center py-3 gap-1 hover-elevate" data-testid="nav-my-coupons">
              <Ticket className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('nav.myCoupons')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
