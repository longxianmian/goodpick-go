import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, QrCode, Plus, Copy, Check, AlertCircle, Settings, CreditCard, Store, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface PspAccount {
  id: number;
  storeId: number;
  storeName: string;
  pspCode: string;
  onboardingMode: string;
  onboardingStatus: string;
  status: string;
  providerMerchantRef?: string;
}

interface QrCodeData {
  id: number;
  storeId: number;
  qrToken: string;
  status: string;
  createdAt: string;
}

interface PspProvider {
  code: string;
  name: string;
  supportedMethods: string[];
  isActive: boolean;
}

export default function MerchantPaymentQrCode() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: pspAccountsData, isLoading: loadingAccounts } = useQuery<{ success: boolean; data: PspAccount[] }>({
    queryKey: ['/api/merchant/psp-accounts'],
    enabled: !!user,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const { data: providersData } = useQuery<{ success: boolean; data: PspProvider[] }>({
    queryKey: ['/api/psp-providers'],
    enabled: !!user,
  });

  const { data: qrCodesData, isLoading: loadingQrCodes } = useQuery<{ success: boolean; data: QrCodeData[] }>({
    queryKey: ['/api/merchant/qr-codes', selectedStoreId],
    queryFn: async () => {
      if (!selectedStoreId) return { success: true, data: [] };
      const token = localStorage.getItem('userToken');
      const res = await fetch(`/api/merchant/qr-codes/${selectedStoreId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      return res.json();
    },
    enabled: !!selectedStoreId,
  });

  const generateQrMutation = useMutation({
    mutationFn: async (storeId: number) => {
      const res = await apiRequest('POST', '/api/merchant/qr-codes', { storeId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: '二维码生成成功', description: '顾客现在可以扫码支付了' });
        queryClient.invalidateQueries({ queryKey: ['/api/merchant/qr-codes', selectedStoreId] });
      } else {
        toast({ title: '生成失败', description: data.message, variant: 'destructive' });
      }
    },
    onError: () => {
      toast({ title: '生成失败', description: '请稍后重试', variant: 'destructive' });
    },
  });

  const copyToClipboard = async (token: string) => {
    const paymentUrl = `${window.location.origin}/p/${token}`;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopiedToken(token);
      toast({ title: '已复制', description: '支付链接已复制到剪贴板' });
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast({ title: '复制失败', description: '请手动复制', variant: 'destructive' });
    }
  };

  const pspAccounts = pspAccountsData?.data || [];
  const qrCodes = qrCodesData?.data || [];
  const providers = providersData?.data || [];

  const storesWithPsp = pspAccounts.filter(a => a.status === 'active');
  const currentStore = storesWithPsp.find(s => s.storeId === selectedStoreId);

  const getProviderName = (code: string) => {
    const provider = providers.find(p => p.code === code);
    return provider?.name || code;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-[#38B03B] text-[10px]">已激活</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500 text-[10px]">待审核</Badge>;
      case 'disabled':
        return <Badge variant="secondary" className="text-[10px]">已禁用</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/merchant/operations')} data-testid="button-back">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">收款码管理</h1>
      </header>

      <main className="p-4 space-y-4">
        {loadingAccounts ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : storesWithPsp.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="font-semibold mb-2">尚未配置支付账户</h3>
              <p className="text-sm text-muted-foreground mb-4">
                请先配置 PSP（支付服务商）账户，才能使用收款码功能
              </p>
              <Button onClick={() => navigate('/merchant/psp-setup')} data-testid="button-setup-psp">
                <Settings className="w-4 h-4 mr-2" />
                配置支付账户
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  选择门店
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  value={selectedStoreId?.toString() || ''} 
                  onValueChange={(v) => setSelectedStoreId(parseInt(v))}
                >
                  <SelectTrigger data-testid="select-store">
                    <SelectValue placeholder="请选择门店" />
                  </SelectTrigger>
                  <SelectContent>
                    {storesWithPsp.map((account) => (
                      <SelectItem key={account.storeId} value={account.storeId.toString()}>
                        {account.storeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {currentStore && (
              <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{getProviderName(currentStore.pspCode)}</div>
                      <div className="text-xs text-muted-foreground">
                        {currentStore.providerMerchantRef || '已配置'}
                      </div>
                    </div>
                    {getStatusBadge(currentStore.status)}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedStoreId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">收款二维码</h2>
                  <Button 
                    size="sm" 
                    onClick={() => generateQrMutation.mutate(selectedStoreId)}
                    disabled={generateQrMutation.isPending}
                    data-testid="button-generate-qr"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    生成新码
                  </Button>
                </div>

                {loadingQrCodes ? (
                  <div className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : qrCodes.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">暂无收款码，点击上方按钮生成</p>
                    </CardContent>
                  </Card>
                ) : (
                  qrCodes.map((qr) => (
                    <Card key={qr.id} data-testid={`card-qrcode-${qr.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                            <QrCode className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {qr.qrToken.slice(0, 8)}...{qr.qrToken.slice(-4)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(qr.createdAt).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(qr.status)}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => copyToClipboard(qr.qrToken)}
                              data-testid={`button-copy-${qr.id}`}
                            >
                              {copiedToken === qr.qrToken ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => window.open(`/p/${qr.qrToken}`, '_blank')}
                              data-testid={`button-preview-${qr.id}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      <MerchantBottomNav />
    </div>
  );
}
