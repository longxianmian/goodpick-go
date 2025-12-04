/**
 * H5 金额确认页 - 用户扫码后的支付入口
 * 路由: /p/:qrToken
 * 
 * 优化流程：用户可选择先登录 LINE 再支付，这样积分自动入账
 */

import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, AlertCircle, User } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

interface StoreMetaData {
  qrCodeId: number;
  storeId: number;
  storeName: string;
  storeAddress: string;
  storeImageUrl: string | null;
  currency: string;
  pspDisplayName?: string;
}

export default function PayEntryPage() {
  const params = useParams<{ qrToken: string }>();
  const qrToken = params.qrToken;
  const { user, isUserAuthenticated } = useAuth();
  
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { data: storeData, isLoading, error } = useQuery<{ success: boolean; data: StoreMetaData }>({
    queryKey: ['/api/payments/qrcode/meta', qrToken],
    queryFn: async () => {
      const res = await fetch(`/api/payments/qrcode/meta?qr_token=${qrToken}`);
      return res.json();
    },
    enabled: !!qrToken,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: { qr_token: string; amount: number; currency: string; line_user_id?: string; user_id?: number }) => {
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
      // 如果用户已登录，传递 LINE 用户信息，支付成功后自动发积分
      await createPaymentMutation.mutateAsync({
        qr_token: qrToken!,
        amount: amountNum,
        currency: 'THB',
        line_user_id: user?.lineUserId,
        user_id: user?.id,
      });
    } catch (err) {
      console.error('Payment creation failed:', err);
      setIsProcessing(false);
    }
  };

  // LINE 登录处理
  const handleLineLogin = async () => {
    setIsLoggingIn(true);
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
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !storeData?.success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-[375px] bg-white rounded-3xl shadow-xl p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">QR Code Invalid</h1>
          <p className="text-slate-500">
            This payment QR code is not available or has been disabled.
          </p>
        </div>
      </div>
    );
  }

  const store = storeData.data;

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
              <div className="text-[13px] font-semibold text-slate-800">Payment amount confirmation</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-emerald-500">
                  <span className="w-1.5 h-1.5 border-[1.5px] border-white border-t-transparent border-l-transparent rounded-sm rotate-45" />
                </span>
                <span>Secure page</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] text-slate-400">Page service by</span>
            <span className="text-[11px] font-medium text-slate-600">DeeCard / Shuashua</span>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-4 pt-3 pb-4 space-y-4">
          {/* Store info + amount card */}
          <div className="bg-white rounded-2xl shadow-sm px-4 pt-4 pb-3 space-y-3">
            {/* Store info */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0">
                {store.storeImageUrl ? (
                  <img 
                    src={store.storeImageUrl} 
                    alt={store.storeName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <p className="text-[14px] font-semibold text-slate-900 truncate" data-testid="text-store-name">
                    {store.storeName}
                  </p>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-700 flex-shrink-0">
                    Verified store
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{store.storeAddress}</p>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Amount confirmation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-slate-500">Payment amount</span>
                <span className="text-[11px] text-emerald-600">Please confirm with staff</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[16px] font-semibold text-slate-900">THB</span>
                <input
                  type="number"
                  inputMode="decimal"
                  className="flex-1 text-[30px] font-semibold text-slate-900 bg-transparent outline-none placeholder:text-slate-300 tracking-tight"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  data-testid="input-payment-amount"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                The system will use this amount to create a secure payment request only for this transaction.
              </p>
            </div>

            {/* 用户登录状态 - 登录后积分自动入账 */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              {isUserAuthenticated && user ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-emerald-800 truncate">{user.displayName}</p>
                    <p className="text-[10px] text-emerald-600">Points will be auto-credited after payment</p>
                  </div>
                </div>
              ) : (
                <button
                  className="w-full py-2.5 rounded-xl bg-[#06C755] active:bg-[#05b64d] disabled:bg-slate-300 text-white text-[13px] font-medium flex items-center justify-center gap-2"
                  onClick={handleLineLogin}
                  disabled={isLoggingIn}
                  data-testid="button-line-login"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-4 h-4 rounded-[3px] bg-white flex items-center justify-center text-[10px] text-[#06C755] font-bold">L</span>
                      <span>Login with LINE for auto points</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Pay button */}
            <button
              className="mt-3 w-full py-3 rounded-2xl bg-emerald-500 active:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[15px] font-semibold shadow-sm flex items-center justify-center gap-2"
              onClick={handleConfirmPayment}
              disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
              data-testid="button-confirm-payment"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                'Confirm and continue to pay'
              )}
            </button>

            {/* PSP info - 显示名称从后端获取 */}
            <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400 flex-wrap">
              <span>Payment service via</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-600">
                {store.pspDisplayName || 'Payment Service'}
              </span>
            </div>
          </div>

          {/* Legal & branding area */}
          <div className="mt-1 text-center text-[10px] text-slate-400 space-y-1 pb-2">
            <p>
              This page is provided by DeeCard / Shuashua only to show merchant payment information and
              membership points. Actual payment services are provided directly by licensed PSPs in Thailand.
            </p>
            <p>DeeCard / Shuashua does not hold customer funds.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
