/**
 * H5 金额确认页 - 用户扫码后的支付入口
 * 路由: /p/:qrToken
 */

import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Shield, Store, MapPin, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface StoreMetaData {
  qrCodeId: number;
  storeId: number;
  storeName: string;
  storeAddress: string;
  storeImageUrl: string | null;
  currency: string;
}

export default function PayEntryPage() {
  const params = useParams<{ qrToken: string }>();
  const qrToken = params.qrToken;
  
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: storeData, isLoading, error } = useQuery<{ success: boolean; data: StoreMetaData }>({
    queryKey: ['/api/payments/qrcode/meta', qrToken],
    queryFn: async () => {
      const res = await fetch(`/api/payments/qrcode/meta?qr_token=${qrToken}`);
      return res.json();
    },
    enabled: !!qrToken,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: { qr_token: string; amount: number; currency: string }) => {
      const res = await apiRequest('POST', '/api/payments/qrcode/create', paymentData);
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success && data.data?.redirect_url) {
        window.location.href = data.data.redirect_url;
      }
    },
  });

  const handleConfirmPayment = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      return;
    }

    setIsProcessing(true);
    try {
      await createPaymentMutation.mutateAsync({
        qr_token: qrToken!,
        amount: amountNum,
        currency: 'THB',
      });
    } catch (err) {
      console.error('Payment creation failed:', err);
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !storeData?.success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">QR Code Invalid</h1>
        <p className="text-muted-foreground text-center">
          This payment QR code is not available or has been disabled.
        </p>
      </div>
    );
  }

  const store = storeData.data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background dark:from-green-950/20 dark:to-background">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-green-600" />
          <span className="text-sm text-muted-foreground">Secure payment via HTTPS</span>
        </div>

        <h1 className="text-2xl font-bold mb-6">Payment amount confirmation</h1>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {store.storeImageUrl ? (
                <img 
                  src={store.storeImageUrl} 
                  alt={store.storeName}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                  <Store className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg truncate" data-testid="text-store-name">
                  {store.storeName}
                </h2>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{store.storeAddress}</span>
                </div>
                <Badge variant="outline" className="mt-2">Verified Merchant</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <label className="block text-sm font-medium mb-2">
              Payment Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold">
                ฿
              </span>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-2xl h-14 font-semibold"
                data-testid="input-payment-amount"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Please confirm the amount with the merchant before paying.
            </p>
          </CardContent>
        </Card>

        <Button
          className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700"
          disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
          onClick={handleConfirmPayment}
          data-testid="button-confirm-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Confirm and continue to pay'
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Page service provided by ShuaShua / DeeCard. 
          Actual payment is processed by licensed payment service provider.
        </p>
      </div>
    </div>
  );
}
