import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, Calendar, MapPin, Tag } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';

declare global {
  interface Window {
    liff: any;
  }
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isUserAuthenticated, loginUser, user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // 获取活动详情
  const { data: response, isLoading } = useQuery<{
    success: boolean;
    data: {
      id: number;
      title: string;
      description: string;
      bannerImageUrl: string | null;
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
        title: t('campaign.claimSuccess') || '领券成功',
        description: t('campaign.claimSuccessDesc') || '您可以在"我的优惠券"中查看',
      });
      setLocation('/my-coupons');
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('campaign.claimError') || '领券失败',
        variant: 'destructive',
      });
    },
  });

  // LINE登录
  const handleLineLogin = async () => {
    try {
      if (!window.liff) {
        toast({
          title: t('common.error'),
          description: t('campaign.liffNotReady') || '请在LINE中打开',
          variant: 'destructive',
        });
        return;
      }

      if (!window.liff.isLoggedIn()) {
        window.liff.login();
        return;
      }

      const idToken = window.liff.getIDToken();
      
      const response = await fetch('/api/auth/line/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();

      if (data.success) {
        loginUser(data.token, data.user);
        toast({
          title: t('common.success'),
          description: t('login.success') || '登录成功',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || t('login.failed') || '登录失败',
        variant: 'destructive',
      });
    }
  };

  // 领券处理
  const handleClaim = () => {
    if (!isUserAuthenticated) {
      handleLineLogin();
    } else {
      claimMutation.mutate();
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
            <CardTitle>{t('campaign.notFound') || '活动不存在'}</CardTitle>
            <CardDescription>{t('campaign.notFoundDesc') || '该活动可能已下线或不存在'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(campaign.endAt) < new Date();
  const isSoldOut = campaign.maxTotal && campaign.currentClaimed >= campaign.maxTotal;
  const canClaim = campaign.canClaim && !isExpired && !isSoldOut;

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
                {isExpired ? (t('campaign.expired') || '已过期') : (t('campaign.active') || '进行中')}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 优惠券信息 */}
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg" data-testid="coupon-info">
              <Gift className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold text-lg">
                  {t(`discountType.${campaign.discountType}`) || campaign.discountType}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {campaign.discountType === 'percentage_off' ? `${campaign.couponValue}%` : `฿${campaign.couponValue}`}
                </div>
                {campaign.originalPrice && (
                  <div className="text-sm text-muted-foreground line-through">
                    {t('campaign.originalPrice') || '原价'}: ฿{campaign.originalPrice}
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
                  <span className="text-muted-foreground">{t('campaign.stock') || '剩余'}:</span>
                  <span className="font-semibold ml-2">
                    {campaign.maxTotal - campaign.currentClaimed} / {campaign.maxTotal}
                  </span>
                </div>
              )}
              <div className="text-sm" data-testid="limit-info">
                <span className="text-muted-foreground">{t('campaign.limitPerUser') || '每人限领'}:</span>
                <span className="font-semibold ml-2">{campaign.maxPerUser}</span>
                {isUserAuthenticated && campaign.userClaimedCount !== undefined && (
                  <span className="ml-2 text-muted-foreground">
                    ({t('campaign.claimed') || '已领'}: {campaign.userClaimedCount})
                  </span>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              size="lg"
              onClick={handleClaim}
              disabled={!canClaim || claimMutation.isPending}
              data-testid="button-claim"
            >
              {claimMutation.isPending
                ? (t('campaign.claiming') || '领取中...')
                : !isUserAuthenticated
                ? (t('campaign.loginToClaim') || 'LINE登录领券')
                : isSoldOut
                ? (t('campaign.soldOut') || '已抢光')
                : isExpired
                ? (t('campaign.expired') || '已过期')
                : !canClaim
                ? (campaign.claimMessage || t('campaign.reachedLimit') || '已达领取上限')
                : (t('campaign.claimNow') || '立即领取')}
            </Button>
          </CardFooter>
        </Card>

        {/* 适用门店 */}
        {campaign.stores && campaign.stores.length > 0 && (
          <Card data-testid="stores-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('campaign.applicableStores') || '适用门店'}
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
            {t('campaign.viewMyCoupons') || '查看我的优惠券'}
          </Button>
        )}
      </div>
    </div>
  );
}
