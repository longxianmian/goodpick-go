import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Gift, Calendar, MapPin, LogOut, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

declare global {
  interface Window {
    liff: any;
  }
}

type CouponStatus = 'unused' | 'used' | 'expired';

interface Coupon {
  id: number;
  code: string;
  status: CouponStatus;
  campaign: {
    id: number;
    title: string;
    description: string;
    bannerImageUrl: string | null;
    couponValue: string;
    discountType: string;
    originalPrice: string | null;
  };
  issuedAt: string;
  expiredAt: string;
  usedAt: string | null;
  redeemedStoreId: number | null;
}

export default function MyCoupons() {
  const { isUserAuthenticated, logoutUser, user } = useAuth();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<CouponStatus | 'all'>('all');

  // LINE登录检查
  useEffect(() => {
    if (!isUserAuthenticated) {
      if (window.liff && !window.liff.isLoggedIn()) {
        window.liff.login();
      }
    }
  }, [isUserAuthenticated]);

  // 获取优惠券列表
  const { data: response, isLoading } = useQuery<{
    success: boolean;
    data: Coupon[];
  }>({
    queryKey: ['/api/me/coupons', activeTab !== 'all' ? activeTab : ''],
    queryFn: async () => {
      const token = localStorage.getItem('userToken');
      const url = activeTab !== 'all' 
        ? `/api/me/coupons?status=${activeTab}`
        : '/api/me/coupons';
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept-Language': language,
        },
      });
      
      if (!res.ok) throw new Error('Failed to fetch coupons');
      return res.json();
    },
    enabled: isUserAuthenticated,
  });

  const coupons = response?.data || [];

  // 生成二维码
  useEffect(() => {
    if (selectedCoupon) {
      QRCode.toDataURL(selectedCoupon.code, {
        width: 300,
        margin: 2,
      }).then(setQrCodeUrl);
    }
  }, [selectedCoupon]);

  const handleLogout = () => {
    logoutUser();
    if (window.liff) {
      window.liff.logout();
    }
    setLocation('/');
  };

  if (!isUserAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{t('myCoupons.loginRequired') || '请先登录'}</CardTitle>
            <CardDescription>{t('myCoupons.loginDesc') || '使用LINE账号登录查看您的优惠券'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: CouponStatus) => {
    const variants: Record<CouponStatus, 'default' | 'secondary' | 'destructive'> = {
      unused: 'default',
      used: 'secondary',
      expired: 'destructive',
    };
    
    const labels: Record<CouponStatus, string> = {
      unused: t('coupon.unused') || '未使用',
      used: t('coupon.used') || '已使用',
      expired: t('coupon.expired') || '已过期',
    };

    return <Badge variant={variants[status]} data-testid={`badge-${status}`}>{labels[status]}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        {/* 头部 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user?.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-12 h-12 rounded-full"
                    data-testid="user-avatar"
                  />
                )}
                <div>
                  <CardTitle data-testid="user-name">{user?.displayName}</CardTitle>
                  <CardDescription>{t('myCoupons.title') || '我的优惠券'}</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                {t('common.logout')}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* 优惠券列表 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} data-testid="tabs-status">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" data-testid="tab-all">
              {t('myCoupons.all') || '全部'}
            </TabsTrigger>
            <TabsTrigger value="unused" data-testid="tab-unused">
              {t('coupon.unused') || '未使用'}
            </TabsTrigger>
            <TabsTrigger value="used" data-testid="tab-used">
              {t('coupon.used') || '已使用'}
            </TabsTrigger>
            <TabsTrigger value="expired" data-testid="tab-expired">
              {t('coupon.expired') || '已过期'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            {isLoading ? (
              <>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </>
            ) : coupons.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground" data-testid="no-coupons">
                    {t('myCoupons.noCoupons') || '暂无优惠券'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              coupons.map((coupon) => {
                const isExpired = new Date(coupon.expiredAt) < new Date();
                const actualStatus = isExpired && coupon.status === 'unused' ? 'expired' : coupon.status;
                
                return (
                  <Card
                    key={coupon.id}
                    className="overflow-hidden hover-elevate cursor-pointer"
                    onClick={() => setSelectedCoupon(coupon)}
                    data-testid={`coupon-${coupon.id}`}
                  >
                    <div className="flex">
                      {/* 左侧：优惠券信息 */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-lg mb-1" data-testid="coupon-title">
                              {coupon.campaign.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {coupon.campaign.description}
                            </p>
                          </div>
                          {getStatusBadge(actualStatus)}
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Gift className="h-5 w-5 text-primary" />
                          <span className="text-xl font-bold text-primary">
                            {coupon.campaign.discountType === 'percentage_off' 
                              ? `${coupon.campaign.couponValue}%` 
                              : `฿${coupon.campaign.couponValue}`}
                          </span>
                          {coupon.campaign.originalPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              ฿{coupon.campaign.originalPrice}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {t('coupon.validUntil') || '有效期至'}: {new Date(coupon.expiredAt).toLocaleDateString(language)}
                            </span>
                          </div>
                          {coupon.usedAt && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {t('coupon.usedAt') || '使用时间'}: {new Date(coupon.usedAt).toLocaleDateString(language)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 右侧：Banner图 */}
                      {coupon.campaign.bannerImageUrl && (
                        <div className="w-32 bg-muted flex-shrink-0">
                          <img
                            src={coupon.campaign.bannerImageUrl}
                            alt={coupon.campaign.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* 优惠券详情对话框（含二维码） */}
        <Dialog open={!!selectedCoupon} onOpenChange={() => setSelectedCoupon(null)}>
          <DialogContent data-testid="dialog-coupon-detail">
            <DialogHeader>
              <DialogTitle>{selectedCoupon?.campaign.title}</DialogTitle>
            </DialogHeader>
            {selectedCoupon && (
              <div className="space-y-6">
                {/* 二维码 */}
                <div className="flex flex-col items-center p-6 bg-muted rounded-lg">
                  {qrCodeUrl && (
                    <img 
                      src={qrCodeUrl} 
                      alt="Coupon QR Code" 
                      className="w-64 h-64"
                      data-testid="qr-code"
                    />
                  )}
                  <p className="mt-4 text-sm font-mono text-center" data-testid="coupon-code">
                    {selectedCoupon.code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('coupon.scanToRedeem') || '向店员出示此二维码以核销'}
                  </p>
                </div>

                {/* 优惠券信息 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('coupon.status') || '状态'}</span>
                    {getStatusBadge(selectedCoupon.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('coupon.value') || '优惠值'}</span>
                    <span className="font-semibold">
                      {selectedCoupon.campaign.discountType === 'percentage_off'
                        ? `${selectedCoupon.campaign.couponValue}%`
                        : `฿${selectedCoupon.campaign.couponValue}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('coupon.issuedAt') || '领取时间'}</span>
                    <span className="text-sm">
                      {new Date(selectedCoupon.issuedAt).toLocaleDateString(language)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('coupon.validUntil') || '有效期至'}</span>
                    <span className="text-sm">
                      {new Date(selectedCoupon.expiredAt).toLocaleDateString(language)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
