import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScanLine, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface CouponData {
  coupon: {
    id: number;
    code: string;
    status: string;
    issuedAt: string;
    expiredAt: string;
  };
  campaign: {
    id: number;
    title: string;
    description: string;
    bannerImageUrl: string | null;
    couponValue: string;
    discountType: 'final_price' | 'percentage_off' | 'cash_voucher';
    originalPrice: string | null;
  };
  user: {
    id: number;
    displayName: string | null;
    phone: string | null;
  };
}

export default function StaffRedeem() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, userToken } = useAuth();
  const { t, language } = useLanguage();

  const [inputCode, setInputCode] = useState('');
  const [notes, setNotes] = useState('');
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [querying, setQuerying] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  // Check if user is authenticated
  if (!user || !userToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              需要登录
            </CardTitle>
            <CardDescription>
              请先登录您的店员账号
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/')}
              className="w-full"
              data-testid="button-goto-home"
            >
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleQuery = async () => {
    if (!inputCode.trim()) {
      toast({
        title: '请输入核销码',
        description: '请输入8位数字核销码',
        variant: 'destructive',
      });
      return;
    }

    if (!/^\d{8}$/.test(inputCode.trim())) {
      toast({
        title: '核销码格式错误',
        description: '核销码必须是8位数字',
        variant: 'destructive',
      });
      return;
    }

    setQuerying(true);
    setCouponData(null);

    try {
      const response = await fetch('/api/staff/redeem/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ code: inputCode.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setCouponData(data.data);
        toast({
          title: '优惠券查询成功',
          description: '请核对优惠券信息后确认核销',
        });
      } else {
        toast({
          title: '查询失败',
          description: data.message || '优惠券不存在或已被使用',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Query error:', error);
      toast({
        title: '查询失败',
        description: error.message || '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setQuerying(false);
    }
  };

  const handleRedeem = async () => {
    if (!couponData) {
      return;
    }

    setRedeeming(true);

    try {
      const response = await fetch('/api/staff/redeem/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          couponId: couponData.coupon.id,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRedeemSuccess(true);
        toast({
          title: '核销成功',
          description: `优惠券 ${couponData.coupon.code} 已成功核销`,
        });
      } else {
        toast({
          title: '核销失败',
          description: data.message || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Redeem error:', error);
      toast({
        title: '核销失败',
        description: error.message || '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setRedeeming(false);
    }
  };

  const handleReset = () => {
    setInputCode('');
    setNotes('');
    setCouponData(null);
    setRedeemSuccess(false);
  };

  if (redeemSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              核销成功
            </CardTitle>
            <CardDescription>
              优惠券已成功核销
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-center text-2xl font-bold text-green-600">
                {couponData?.coupon.code}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">用户:</span>
                <span className="font-medium">{couponData?.user.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">活动:</span>
                <span className="font-medium">{couponData?.campaign.title}</span>
              </div>
              {notes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">备注:</span>
                  <span className="font-medium">{notes}</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleReset}
              className="w-full"
              data-testid="button-redeem-another"
            >
              核销下一张
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4 pb-20">
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="w-5 h-5" />
              店员核销
            </CardTitle>
            <CardDescription>
              请输入8位数字核销码或扫描用户二维码
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="input-code">核销码（8位数字）</Label>
              <div className="flex gap-2">
                <Input
                  id="input-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{8}"
                  maxLength={8}
                  placeholder="00000000"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !querying) {
                      handleQuery();
                    }
                  }}
                  disabled={querying || !!couponData}
                  className="text-2xl tracking-widest text-center font-mono"
                  data-testid="input-redemption-code"
                />
                <Button
                  onClick={handleQuery}
                  disabled={querying || !!couponData}
                  data-testid="button-query-coupon"
                >
                  {querying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '查询'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {couponData && (
          <Card>
            <CardHeader>
              <CardTitle>优惠券详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {couponData.campaign.bannerImageUrl && (
                <img
                  src={couponData.campaign.bannerImageUrl}
                  alt={couponData.campaign.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}

              <div>
                <h3 className="text-xl font-semibold">{couponData.campaign.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {couponData.campaign.description}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">核销码</p>
                  <p className="font-mono font-bold text-lg">{couponData.coupon.code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">优惠值</p>
                  <p className="font-bold text-lg text-orange-600">
                    {couponData.campaign.discountType === 'percentage_off'
                      ? `${couponData.campaign.couponValue}%`
                      : `฿${couponData.campaign.couponValue}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">用户</p>
                  <p className="font-medium">{couponData.user.displayName || '未知用户'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">手机</p>
                  <p className="font-medium">{couponData.user.phone || '无'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">领取时间</p>
                  <p className="text-xs">
                    {new Date(couponData.coupon.issuedAt).toLocaleString(language)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">有效期至</p>
                  <p className="text-xs">
                    {new Date(couponData.coupon.expiredAt).toLocaleString(language)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="textarea-notes">备注（可选）</Label>
                <Textarea
                  id="textarea-notes"
                  placeholder="记录核销相关信息..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  取消
                </Button>
                <Button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  data-testid="button-confirm-redeem"
                >
                  {redeeming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      核销中...
                    </>
                  ) : (
                    '确认核销'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
