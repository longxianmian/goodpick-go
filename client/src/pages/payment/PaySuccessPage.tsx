/**
 * 支付成功确认页 - 展示积分并引导 LINE 绑定
 * 路由: /success/:paymentId
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

// 自定义 hook：检测页面可见性
function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  return isVisible;
}

interface PaymentData {
  id: number;
  storeId: number;
  orderId?: string;
  lineUserId?: string;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
  storeName: string;
  points: number;
  pointsStatus: string;
  autoPointsGranted: boolean;
  lineOaUrl?: string | null;
  lineOaId?: string | null;
}

export default function PaySuccessPage() {
  const { t } = useLanguage();
  const params = useParams<{ paymentId: string }>();
  const paymentId = params.paymentId;
  const { user, isUserAuthenticated } = useAuth();
  const isPageVisible = usePageVisibility();
  
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
    // 只在页面可见且状态为 pending 时轮询，减少移动端资源消耗
    refetchInterval: (query) => {
      if (!isPageVisible) return false; // 页面不可见时暂停轮询
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
      
      try {
        console.log('[PaySuccess] Initiating LINE OAuth, returnTo:', returnUrl);
        const initResponse = await fetch('/api/auth/line/init-oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnTo: returnUrl }),
        });
        
        const result = await initResponse.json();
        console.log('[PaySuccess] OAuth init response:', result);
        
        if (initResponse.ok && result.redirectUrl) {
          // 直接使用后端返回的完整 OAuth URL
          console.log('[PaySuccess] Redirecting to LINE OAuth:', result.redirectUrl);
          window.location.href = result.redirectUrl;
        } else {
          console.error('[PaySuccess] OAuth init failed:', result.message);
          // 回退到开发登录
          window.location.href = `/dev/login?returnTo=${encodeURIComponent(returnUrl)}`;
        }
      } catch (err) {
        console.error('[PaySuccess] LINE OAuth init failed:', err);
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
          <h1 className="text-xl font-semibold text-slate-800 mb-2">{t('paySuccess.notFound')}</h1>
          <p className="text-slate-500">
            {t('paySuccess.notFoundDesc')}
          </p>
        </div>
      </div>
    );
  }

  const payment = paymentData.data;
  const isPending = payment.status === 'pending';
  const isPaid = payment.status === 'paid';
  const isClaimed = payment.pointsStatus === 'claimed';
  const isAutoGranted = payment.autoPointsGranted;
  const hasLineOa = !!payment.lineOaUrl;

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-100 overflow-y-auto py-4 px-4 md:flex md:items-center md:justify-center">
        <div className="w-full max-w-[375px] mx-auto bg-white rounded-3xl shadow-xl p-6 text-center">
          <Loader2 className="w-16 h-16 animate-spin text-slate-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">{t('paySuccess.processing')}</h1>
          <p className="text-slate-500">
            {t('paySuccess.processingDesc')}
          </p>
        </div>
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="min-h-screen bg-slate-100 overflow-y-auto py-4 px-4 md:flex md:items-center md:justify-center">
        <div className="w-full max-w-[375px] mx-auto bg-white rounded-3xl shadow-xl p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">{t('paySuccess.failed')}</h1>
          <p className="text-slate-500">
            {t('paySuccess.failedDesc')}
          </p>
        </div>
      </div>
    );
  }

  const formattedAmount = parseFloat(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-slate-100 overflow-y-auto py-4 px-4 md:flex md:items-center md:justify-center">
      <div className="w-full max-w-[375px] mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Top bar */}
        <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 flex items-center justify-center text-xs font-bold text-white">
              S
            </div>
            <div className="flex flex-col leading-tight">
              <div className="text-[13px] font-semibold text-slate-800">{t('paySuccess.title')}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-emerald-500">
                  <span className="w-1.5 h-1.5 border-[1.5px] border-white border-t-transparent border-l-transparent rounded-sm rotate-45" />
                </span>
                <span>{t('paySuccess.securePage')}</span>
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
              <p className="text-[13px] text-slate-500">{t('paySuccess.paymentAmount')}</p>
              <p className="text-[28px] font-semibold text-slate-900" data-testid="text-payment-amount">
                THB {formattedAmount}
              </p>
            </div>

            {/* Points earned */}
            <div className="space-y-1">
              <p className="text-[13px] text-slate-500">{t('paySuccess.pointsEarned')}</p>
              <p className="text-[22px] font-semibold text-amber-500" data-testid="text-points-earned">
                {payment.points} {t('paySuccess.pts')}
              </p>
            </div>

            {/* 积分状态 - 自动发放或手动领取 */}
            {isAutoGranted || isClaimed ? (
              <div className="mt-4 w-full space-y-3">
                {/* 积分已入账提示 */}
                <div className="w-full py-3 rounded-2xl bg-emerald-50 text-emerald-700 text-[15px] font-semibold flex items-center justify-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <span className="w-2 h-2 border-[2px] border-white border-t-transparent border-l-transparent rounded-sm rotate-45" />
                  </span>
                  <span>{t('paySuccess.pointsCredited')}</span>
                </div>
                
                {/* 加好友按钮 - 如果有配置 LINE OA */}
                {hasLineOa && (
                  <button 
                    className="w-full py-3 rounded-2xl bg-[#06C755] active:bg-[#05b64d] text-white text-[15px] font-semibold shadow-sm flex items-center justify-center gap-2"
                    onClick={() => window.location.href = payment.lineOaUrl!}
                    data-testid="button-add-line-friend"
                  >
                    <span className="w-5 h-5 rounded-[4px] bg-white flex items-center justify-center text-[11px] text-[#06C755] font-bold">
                      L
                    </span>
                    <span>{t('paySuccess.addLineFriend')}</span>
                  </button>
                )}
              </div>
            ) : redirectingToLine ? (
              <div className="mt-4 w-full py-3 rounded-2xl bg-slate-100 text-slate-600 text-[15px] font-semibold flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#06C755]" />
                <span>{t('paySuccess.redirectingLine')}</span>
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
                    <span>{t('paySuccess.claiming')}</span>
                  </>
                ) : (
                  <>
                    <span className="w-5 h-5 rounded-[4px] bg-white flex items-center justify-center text-[11px] text-[#06C755] font-bold">
                      L
                    </span>
                    <span>{t('paySuccess.loginLineClaim')}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Bottom info */}
          <div className="mt-1 text-center text-[10px] text-slate-400 space-y-1 pb-2">
            <p>{t('paySuccess.disclaimer1')}</p>
            <p>{t('paySuccess.disclaimer2')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
