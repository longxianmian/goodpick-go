/**
 * 支付成功确认页 - 展示积分并引导 LINE 绑定
 * 路由: /success/:paymentId
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentData {
  id: number;
  storeId: number;
  orderId?: string;
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
  const [mockCompleting, setMockCompleting] = useState(false);
  const mockCompleteTriggered = useRef(false);
  
  // 检查是否为 Mock 模式
  const urlParams = new URLSearchParams(window.location.search);
  const isMockMode = urlParams.get('mock') === 'true';

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

  // Mock 模式自动完成支付
  useEffect(() => {
    const triggerMockComplete = async () => {
      if (isMockMode && paymentData?.data?.status === 'pending' && !mockCompleteTriggered.current) {
        mockCompleteTriggered.current = true;
        setMockCompleting(true);
        
        console.log('[Mock] Triggering mock payment completion for:', paymentId);
        
        try {
          const res = await fetch('/api/payments/mock-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId }),
          });
          const result = await res.json();
          console.log('[Mock] Mock complete result:', result);
          
          // 刷新支付状态
          setTimeout(() => refetch(), 500);
        } catch (err) {
          console.error('[Mock] Mock complete failed:', err);
        } finally {
          setMockCompleting(false);
        }
      }
    };
    
    triggerMockComplete();
  }, [isMockMode, paymentData?.data?.status, paymentId, refetch]);

  const [redirectingToLine, setRedirectingToLine] = useState(false);
  
  const claimPointsMutation = useMutation({
    mutationFn: async (lineUserId: string) => {
      const res = await apiRequest('POST', '/api/points/claim', {
        payment_id: paymentId,
        line_user_id: lineUserId,
      });
      return res.json();
    },
    onSuccess: (result) => {
      refetch();
      
      // 如果有 LINE OA URL，延迟跳转
      if (result?.data?.lineOaUrl) {
        setRedirectingToLine(true);
        setTimeout(() => {
          window.location.href = result.data.lineOaUrl;
        }, 2000); // 2秒后跳转，让用户看到成功信息
      }
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
      // 使用 LINE OAuth 登录（生产环境）
      const returnUrl = window.location.href;
      const origin = window.location.origin;
      const redirectUri = `${origin}/api/auth/line/callback`;
      
      try {
        const initResponse = await fetch('/api/auth/line/init-oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ redirectUri, returnTo: returnUrl }),
        });
        
        if (initResponse.ok) {
          const { state } = await initResponse.json();
          const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
          authUrl.searchParams.set('response_type', 'code');
          authUrl.searchParams.set('client_id', import.meta.env.VITE_LINE_CHANNEL_ID || '');
          authUrl.searchParams.set('redirect_uri', redirectUri);
          authUrl.searchParams.set('state', state);
          authUrl.searchParams.set('scope', 'profile openid');
          window.location.href = authUrl.toString();
        } else {
          // 回退到开发登录
          window.location.href = `/dev/login?returnTo=${encodeURIComponent(returnUrl)}`;
        }
      } catch (err) {
        console.error('LINE OAuth init failed:', err);
        window.location.href = `/dev/login?returnTo=${encodeURIComponent(returnUrl)}`;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !paymentData?.success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-[375px] bg-white rounded-3xl shadow-xl p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Payment Not Found</h1>
          <p className="text-slate-500">
            Unable to find payment information.
          </p>
        </div>
      </div>
    );
  }

  const payment = paymentData.data;
  const isPending = payment.status === 'pending';
  const isPaid = payment.status === 'paid';
  const isClaimed = payment.pointsStatus === 'claimed';

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-[375px] bg-white rounded-3xl shadow-xl p-6 text-center">
          <Loader2 className="w-16 h-16 animate-spin text-slate-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Processing Payment...</h1>
          <p className="text-slate-500">
            Please wait while we confirm your payment.
          </p>
        </div>
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-[375px] bg-white rounded-3xl shadow-xl p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Payment Failed</h1>
          <p className="text-slate-500">
            Your payment was not completed. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const formattedAmount = parseFloat(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-[375px] bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 flex flex-col" style={{ minHeight: '600px' }}>
        {/* Top bar */}
        <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 flex items-center justify-center text-xs font-bold text-white">
              S
            </div>
            <div className="flex flex-col leading-tight">
              <div className="text-[13px] font-semibold text-slate-800">Payment success</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-emerald-500">
                  <span className="w-1.5 h-1.5 border-[1.5px] border-white border-t-transparent border-l-transparent rounded-sm rotate-45" />
                </span>
                <span>Secure page</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 pt-5 pb-4 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm px-4 pt-5 pb-5 space-y-4 flex flex-col items-center text-center">
            {/* Success icon */}
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
              <span className="w-6 h-6 border-[3px] border-emerald-500 border-t-transparent border-l-transparent rounded-md rotate-45" />
            </div>

            {/* Payment amount */}
            <div className="space-y-1">
              <p className="text-[13px] text-slate-500">Payment amount</p>
              <p className="text-[28px] font-semibold text-slate-900" data-testid="text-payment-amount">
                THB {formattedAmount}
              </p>
            </div>

            {/* Points earned */}
            <div className="space-y-1">
              <p className="text-[13px] text-slate-500">Points earned this time</p>
              <p className="text-[22px] font-semibold text-amber-500" data-testid="text-points-earned">
                {payment.points} pts
              </p>
            </div>

            {/* Claim button or claimed status */}
            {isClaimed || redirectingToLine ? (
              <div className="mt-4 w-full py-3 rounded-2xl bg-slate-100 text-slate-600 text-[15px] font-semibold flex items-center justify-center gap-2">
                {redirectingToLine ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#06C755]" />
                    <span>Redirecting to merchant LINE...</span>
                  </>
                ) : (
                  <>
                    <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <span className="w-2 h-2 border-[2px] border-white border-t-transparent border-l-transparent rounded-sm rotate-45" />
                    </span>
                    <span>Points claimed to your account</span>
                  </>
                )}
              </div>
            ) : (
              <button 
                className="mt-4 w-full py-3 rounded-2xl bg-[#06C755] active:bg-[#05b64d] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[15px] font-semibold shadow-sm flex items-center justify-center gap-2"
                onClick={handleClaimPoints}
                disabled={isClaiming}
                data-testid="button-claim-points"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Claiming...</span>
                  </>
                ) : (
                  <>
                    <span className="w-5 h-5 rounded-[4px] bg-white flex items-center justify-center text-[11px] text-[#06C755] font-bold">
                      L
                    </span>
                    <span>Claim points via LINE</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Bottom info */}
          <div className="mt-1 text-center text-[10px] text-slate-400 space-y-1 pb-2">
            <p>
              Points are stored in the merchant membership account on the DeeCard / Shuashua platform. This
              confirmation page itself does not process any payment.
            </p>
            <p>
              If the LINE page does not open correctly, you can later check your points in the "My points" section
              of the Shuashua system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
