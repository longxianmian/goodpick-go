/**
 * 支付成功确认页 - 展示积分并引导 LINE 绑定
 * 路由: /success/:paymentId
 */

import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Shield, Gift, Sparkles, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentData {
  id: number;
  storeId: number;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
  storeName: string;
  points: number;
  pointsStatus: string;
}

export default function PaySuccessPage() {
  const params = useParams<{ paymentId: string }>();
  const paymentId = params.paymentId;
  const { user, isUserAuthenticated } = useAuth();
  
  const [isClaiming, setIsClaiming] = useState(false);

  const { data: paymentData, isLoading, error, refetch } = useQuery<{ success: boolean; data: PaymentData }>({
    queryKey: ['/api/payments', paymentId],
    queryFn: async () => {
      const res = await fetch(`/api/payments/${paymentId}`);
      return res.json();
    },
    enabled: !!paymentId,
    refetchInterval: (query) => {
      if (query?.state?.data?.data?.status === 'pending') {
        return 3000;
      }
      return false;
    },
  });

  const claimPointsMutation = useMutation({
    mutationFn: async (lineUserId: string) => {
      const res = await apiRequest('POST', '/api/points/claim', {
        payment_id: paymentId,
        line_user_id: lineUserId,
      });
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleClaimPoints = async () => {
    if (isUserAuthenticated && user?.lineUserId) {
      setIsClaiming(true);
      try {
        await claimPointsMutation.mutateAsync(user.lineUserId);
      } catch (err) {
        console.error('Claim points failed:', err);
      } finally {
        setIsClaiming(false);
      }
    } else {
      const returnUrl = window.location.href;
      window.location.href = `/dev/login?returnTo=${encodeURIComponent(returnUrl)}`;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !paymentData?.success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">Payment Not Found</h1>
        <p className="text-muted-foreground text-center">
          Unable to find payment information.
        </p>
      </div>
    );
  }

  const payment = paymentData.data;
  const isPending = payment.status === 'pending';
  const isPaid = payment.status === 'paid';
  const isClaimed = payment.pointsStatus === 'claimed';

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-16 h-16 animate-spin text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">Processing Payment...</h1>
        <p className="text-muted-foreground text-center">
          Please wait while we confirm your payment.
        </p>
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">Payment Failed</h1>
        <p className="text-muted-foreground text-center">
          Your payment was not completed. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background dark:from-green-950/20 dark:to-background">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-green-600" />
          <span className="text-sm text-muted-foreground">Secure payment via HTTPS</span>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-600">Payment Successful</h1>
          <p className="text-muted-foreground mt-1">{payment.storeName}</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Payment Amount</p>
              <p className="text-4xl font-bold" data-testid="text-payment-amount">
                ฿{parseFloat(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                <Gift className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Points earned this time</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-points-earned">
                  {payment.points} pts
                </p>
              </div>
            </div>

            {isClaimed ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Points claimed to your account</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm">Claim your points via LINE to save them!</span>
              </div>
            )}
          </CardContent>
        </Card>

        {!isClaimed && (
          <Button
            className="w-full h-14 text-lg font-semibold bg-[#06C755] hover:bg-[#05b34d]"
            disabled={isClaiming}
            onClick={handleClaimPoints}
            data-testid="button-claim-points"
          >
            {isClaiming ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 5.81 2 10.52c0 2.6 1.24 4.91 3.18 6.57V22l4.38-2.4c.78.12 1.6.19 2.44.19 5.52 0 10-3.81 10-8.48S17.52 2 12 2z"/>
                </svg>
                Claim points via LINE
              </>
            )}
          </Button>
        )}

        {isClaimed && (
          <div className="text-center">
            <Badge variant="secondary" className="text-base px-4 py-2">
              <CheckCircle className="w-4 h-4 mr-2" />
              Points Added to Your Account
            </Badge>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground mt-8">
          Page service provided by ShuaShua / DeeCard.
          Points will be added to your ShuaShua membership account.
        </p>
      </div>
    </div>
  );
}
