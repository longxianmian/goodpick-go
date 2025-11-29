import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Store, CreditCard, QrCode, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest } from '@/lib/queryClient';

interface StorePaymentInfo {
  store: {
    id: number;
    name: string;
    brand: string | null;
    imageUrl: string | null;
  };
  paymentConfig: {
    provider: string;
    bankName: string | null;
    accountName: string | null;
    promptpayId: string | null;
    qrCodeUrl: string | null;
    isActive: boolean;
  } | null;
}

export default function PaymentPage() {
  const [, params] = useRoute('/pay/:id');
  const storeId = params?.id ? parseInt(params.id) : 0;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, userToken, authPhase } = useAuth();
  const { t } = useLanguage();

  const [amount, setAmount] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data, isLoading, error } = useQuery<{ success: boolean; data: StorePaymentInfo }>({
    queryKey: ['/api/stores', storeId, 'pay'],
    enabled: !!storeId,
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/stores/${storeId}/payment-complete`, { amount: parseFloat(amount) });
    },
    onSuccess: (result: any) => {
      navigate(`/pay/${storeId}/success?points=${result.data.earnedPoints}&tier=${result.data.membership.tier}`);
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('payment.retryLater'), variant: 'destructive' });
    },
  });

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/line/init-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectTo: `/pay/${storeId}` }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to init OAuth');

      const result = await response.json();
      window.location.href = result.redirectUrl;
    } catch {
      toast({ title: t('common.error'), description: t('login.failed'), variant: 'destructive' });
    }
  };

  const storeInfo = data?.data?.store;
  const paymentConfig = data?.data?.paymentConfig;
  const isLoggedIn = !!userToken && !!user;

  if (authPhase === 'booting' || isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !storeInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t('payment.storeNotFound')}</h2>
            <p className="text-sm text-muted-foreground">{t('payment.retryLater')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentConfig || !paymentConfig.isActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t('payment.paymentNotEnabled')}</h2>
            <p className="text-sm text-muted-foreground">{t('payment.retryLater')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background">
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardHeader className="text-center pb-2">
            <Avatar className="w-16 h-16 mx-auto mb-2">
              <AvatarImage src={storeInfo.imageUrl || undefined} />
              <AvatarFallback>
                <Store className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <CardTitle>{storeInfo.name}</CardTitle>
            {storeInfo.brand && (
              <CardDescription>{storeInfo.brand}</CardDescription>
            )}
          </CardHeader>
        </Card>

        {!isLoggedIn ? (
          <Card>
            <CardContent className="py-8 text-center">
              <h3 className="font-semibold mb-2">{t('payment.loginRequired')}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('payment.loginToComplete')}</p>
              <Button onClick={handleLogin} className="w-full" data-testid="button-login">
                LINE
              </Button>
            </CardContent>
          </Card>
        ) : !showConfirm ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  {t('payment.scanToPay')}
                </CardTitle>
                <CardDescription>
                  {t('payment.qrCode')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentConfig.qrCodeUrl ? (
                  <div className="bg-white p-4 rounded-lg">
                    <img
                      src={paymentConfig.qrCodeUrl}
                      alt="Payment QR Code"
                      className="w-full max-w-[200px] mx-auto"
                      data-testid="img-qr-code"
                    />
                  </div>
                ) : paymentConfig.promptpayId ? (
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-1">{t('payment.promptpayLabel')}</p>
                    <p className="text-xl font-mono font-bold">{paymentConfig.promptpayId}</p>
                    {paymentConfig.accountName && (
                      <p className="text-sm text-muted-foreground mt-1">{paymentConfig.accountName}</p>
                    )}
                  </div>
                ) : null}

                {paymentConfig.bankName && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">{t('payment.orBankTransfer')}</p>
                    <div className="bg-muted p-3 rounded-lg text-sm">
                      <p>{t('payment.bankName')}: {paymentConfig.bankName}</p>
                      {paymentConfig.accountName && <p>{t('payment.accountName')}: {paymentConfig.accountName}</p>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('payment.amountLabel')}</CardTitle>
                <CardDescription>{t('payment.earnPoints')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">{t('payment.amountLabel')} (฿)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={t('payment.amountPlaceholder')}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-testid="input-amount"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!amount || parseFloat(amount) <= 0}
                  onClick={() => setShowConfirm(true)}
                  data-testid="button-confirm-payment"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('payment.confirmPayment')}
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('payment.confirmPayment')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/10 p-6 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">{t('payment.amountLabel')}</p>
                <p className="text-4xl font-bold text-primary">฿{parseFloat(amount).toLocaleString()}</p>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t('payment.earnPoints')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setShowConfirm(false)} data-testid="button-back">
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => paymentMutation.mutate()}
                  disabled={paymentMutation.isPending}
                  data-testid="button-submit"
                >
                  {paymentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('payment.paying')}
                    </>
                  ) : (
                    t('common.confirm')
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
