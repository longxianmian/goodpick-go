/**
 * H5 金额确认页 - 用户扫码后的支付入口
 * 路由: /p/:qrToken
 * 
 * 简洁流程：扫码 → 输入金额 → 选优惠券 → 支付 → 成功页一键登录成为会员
 */

import { useState, useMemo } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, AlertCircle, Ticket, ChevronRight, Check, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useLanguage } from '@/contexts/LanguageContext';

interface StoreMetaData {
  qrCodeId: number;
  storeId: number;
  storeName: string;
  storeAddress: string;
  storeImageUrl: string | null;
  currency: string;
  pspDisplayName?: string;
}

interface AvailableCoupon {
  id: number;
  code: string;
  campaignId: number;
  campaignTitle: string;
  couponValue: string;
  discountType: 'percent' | 'fixed';
  expiredAt: string;
}

export default function PayEntryPage() {
  const { t } = useLanguage();
  const params = useParams<{ qrToken: string }>();
  const qrToken = params.qrToken;
  
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<AvailableCoupon | null>(null);
  const [showCouponSelector, setShowCouponSelector] = useState(false);

  const { data: storeData, isLoading, error } = useQuery<{ success: boolean; data: StoreMetaData }>({
    queryKey: ['/api/payments/qrcode/meta', qrToken],
    queryFn: async () => {
      const res = await fetch(`/api/payments/qrcode/meta?qr_token=${qrToken}`);
      return res.json();
    },
    enabled: !!qrToken,
  });

  const storeId = storeData?.data?.storeId;

  const { data: couponsData } = useQuery<{ success: boolean; data: AvailableCoupon[] }>({
    queryKey: ['/api/payments/qrcode/available-coupons', storeId],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/payments/qrcode/available-coupons?store_id=${storeId}`, { headers });
      return res.json();
    },
    enabled: !!storeId,
  });

  const availableCoupons = couponsData?.data || [];

  const discountInfo = useMemo(() => {
    const originalAmount = parseFloat(amount) || 0;
    if (!selectedCoupon || originalAmount <= 0) {
      return { discountAmount: 0, finalAmount: originalAmount };
    }
    
    const couponValue = parseFloat(selectedCoupon.couponValue) || 0;
    let discountAmount = 0;
    
    if (selectedCoupon.discountType === 'percent') {
      discountAmount = originalAmount * (couponValue / 100);
    } else {
      discountAmount = Math.min(couponValue, originalAmount);
    }
    
    return {
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount: Math.max(0, Math.round((originalAmount - discountAmount) * 100) / 100),
    };
  }, [amount, selectedCoupon]);

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: { 
      qr_token: string; 
      amount: number; 
      currency: string;
      coupon_id?: number;
      discount_amount?: number;
    }) => {
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
        amount: discountInfo.finalAmount,
        currency: 'THB',
        coupon_id: selectedCoupon?.id,
        discount_amount: selectedCoupon ? discountInfo.discountAmount : undefined,
      });
    } catch (err) {
      console.error('Payment creation failed:', err);
      setIsProcessing(false);
    }
  };

  const handleSelectCoupon = (coupon: AvailableCoupon) => {
    setSelectedCoupon(coupon);
    setShowCouponSelector(false);
  };

  const handleClearCoupon = () => {
    setSelectedCoupon(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="animate-pulse">
          <div className="bg-white shadow-sm">
            <div className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-48" />
              </div>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="h-4 bg-slate-200 rounded w-20 mb-4" />
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="h-12 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-14 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !storeData?.success) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-[375px] bg-white rounded-3xl shadow-xl p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-800 mb-2">{t('payEntry.qrInvalid')}</h1>
          <p className="text-slate-500">
            {t('payEntry.qrInvalidDesc')}
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
              <div className="text-[13px] font-semibold text-slate-800">{t('payEntry.title')}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-emerald-500">
                  <span className="w-1.5 h-1.5 border-[1.5px] border-white border-t-transparent border-l-transparent rounded-sm rotate-45" />
                </span>
                <span>{t('payEntry.securePage')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] text-slate-400">{t('payEntry.serviceBy')}</span>
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
                    {t('payEntry.verifiedStore')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{store.storeAddress}</p>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Amount confirmation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-slate-500">{t('payEntry.paymentAmount')}</span>
                <span className="text-[11px] text-emerald-600">{t('payEntry.confirmWithStaff')}</span>
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
                {t('payEntry.amountHint')}
              </p>
            </div>

            {/* Coupon selector */}
            {availableCoupons.length > 0 && (
              <>
                <div className="h-px bg-slate-100" />
                <div 
                  className="flex items-center justify-between gap-2 py-2 cursor-pointer"
                  onClick={() => setShowCouponSelector(true)}
                  data-testid="button-select-coupon"
                >
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-emerald-500" />
                    <span className="text-[13px] text-slate-700">{t('payEntry.useCoupon')}</span>
                    <span className="text-[11px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      {availableCoupons.length} {t('payEntry.available')}
                    </span>
                  </div>
                  {selectedCoupon ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-emerald-600 font-medium">
                        -{selectedCoupon.discountType === 'percent' 
                          ? `${selectedCoupon.couponValue}%` 
                          : `THB ${selectedCoupon.couponValue}`}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleClearCoupon(); }}
                        className="p-0.5 rounded-full bg-slate-100"
                        data-testid="button-clear-coupon"
                      >
                        <X className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </>
            )}

            {/* Discount summary */}
            {selectedCoupon && parseFloat(amount) > 0 && (
              <>
                <div className="h-px bg-slate-100" />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="text-slate-500">{t('payEntry.originalAmount')}</span>
                    <span className="text-slate-600">THB {parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="text-emerald-600">{t('payEntry.couponDiscount')}</span>
                    <span className="text-emerald-600">-THB {discountInfo.discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[14px] font-semibold">
                    <span className="text-slate-700">{t('payEntry.finalAmount')}</span>
                    <span className="text-slate-900">THB {discountInfo.finalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}

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
                  <span>{t('payEntry.processing')}</span>
                </>
              ) : (
                selectedCoupon 
                  ? `${t('payEntry.payAmount')} ${discountInfo.finalAmount.toFixed(2)}`
                  : t('payEntry.confirmAndPay')
              )}
            </button>

            {/* PSP info - 显示名称从后端获取 */}
            <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400 flex-wrap">
              <span>{t('payEntry.paymentVia')}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-600">
                {store.pspDisplayName || 'Payment Service'}
              </span>
            </div>
          </div>

          {/* Legal & branding area */}
          <div className="mt-1 text-center text-[10px] text-slate-400 space-y-1 pb-2">
            <p>{t('payEntry.disclaimer')}</p>
          </div>
        </div>
      </div>

      {/* Coupon selector modal */}
      {showCouponSelector && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="w-full max-w-[375px] bg-white rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold text-slate-800">{t('payEntry.selectCoupon')}</h3>
              <button 
                onClick={() => setShowCouponSelector(false)}
                className="p-1 rounded-full bg-slate-100"
                data-testid="button-close-coupon-modal"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {availableCoupons.map((coupon) => (
                <div 
                  key={coupon.id}
                  onClick={() => handleSelectCoupon(coupon)}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedCoupon?.id === coupon.id 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-slate-200 bg-white'
                  }`}
                  data-testid={`coupon-item-${coupon.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 truncate">
                        {coupon.campaignTitle}
                      </p>
                      <p className="text-[18px] font-bold text-emerald-600 mt-1">
                        {coupon.discountType === 'percent' 
                          ? `${coupon.couponValue}% ${t('payEntry.off')}` 
                          : `THB ${coupon.couponValue} ${t('payEntry.off')}`}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {t('payEntry.expires')}: {new Date(coupon.expiredAt).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedCoupon?.id === coupon.id && (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {availableCoupons.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-[13px]">
                  No coupons available for this store
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
