/**
 * H5 金额确认页 - 用户扫码后的支付入口
 * 路由: /p/:qrToken
 */

import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
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

            {/* PSP info */}
            <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400 flex-wrap">
              <span>Payment service via</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-600">
                Opn / 2C2P (Thailand)
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
