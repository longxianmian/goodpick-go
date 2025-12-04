import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, CreditCard, Building2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface PspProvider {
  code: string;
  name: string;
  supportedMethods: string[];
  isActive: boolean;
}

interface UserRole {
  storeId: number;
  storeName: string;
  role: string;
}

export default function MerchantPspSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedPsp, setSelectedPsp] = useState<string>('opn');
  const [merchantRef, setMerchantRef] = useState('');

  const { data: providersData } = useQuery<{ success: boolean; data: PspProvider[] }>({
    queryKey: ['/api/psp-providers'],
    enabled: !!user,
  });

  const ownerStores = (user?.roles || []).filter(
    (r: UserRole) => r.role === 'owner' || r.role === 'operator'
  );

  const createAccountMutation = useMutation({
    mutationFn: async (data: { storeId: number; pspCode: string; providerMerchantRef?: string }) => {
      const res = await apiRequest('POST', '/api/merchant/psp-accounts', {
        ...data,
        onboardingMode: 'manual_id',
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({ title: '配置成功', description: 'PSP 账户已创建，现在可以生成收款码了' });
        queryClient.invalidateQueries({ queryKey: ['/api/merchant/psp-accounts'] });
        navigate('/merchant/payment-qrcode');
      } else {
        toast({ title: '配置失败', description: data.message, variant: 'destructive' });
      }
    },
    onError: () => {
      toast({ title: '配置失败', description: '请稍后重试', variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!selectedStoreId) {
      toast({ title: '请选择门店', variant: 'destructive' });
      return;
    }

    createAccountMutation.mutate({
      storeId: parseInt(selectedStoreId),
      pspCode: selectedPsp,
      providerMerchantRef: merchantRef || undefined,
    });
  };

  const providers = providersData?.data || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/merchant/payment-qrcode')} data-testid="button-back">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">配置支付账户</h1>
      </header>

      <main className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              选择门店
            </CardTitle>
            <CardDescription>选择需要开通收款功能的门店</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger data-testid="select-store">
                <SelectValue placeholder="请选择门店" />
              </SelectTrigger>
              <SelectContent>
                {ownerStores.map((store: UserRole) => (
                  <SelectItem key={store.storeId} value={store.storeId.toString()}>
                    {store.storeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              选择支付服务商
            </CardTitle>
            <CardDescription>刷刷平台不直接处理资金，由持牌 PSP 直接结算给商户</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer transition-all ${selectedPsp === 'opn' ? 'border-emerald-500 bg-emerald-500/10' : 'hover-elevate'}`}
                onClick={() => setSelectedPsp('opn')}
                data-testid="card-psp-opn"
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-2 flex items-center justify-center text-white font-bold">
                    Opn
                  </div>
                  <div className="text-sm font-medium">Opn Payments</div>
                  <div className="text-xs text-muted-foreground">费率 1.6%-3.65%</div>
                  {selectedPsp === 'opn' && (
                    <Check className="w-5 h-5 text-emerald-500 mx-auto mt-2" />
                  )}
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${selectedPsp === 'two_c2p' ? 'border-emerald-500 bg-emerald-500/10' : 'hover-elevate'}`}
                onClick={() => setSelectedPsp('two_c2p')}
                data-testid="card-psp-2c2p"
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                    2C2P
                  </div>
                  <div className="text-sm font-medium">2C2P</div>
                  <div className="text-xs text-muted-foreground">企业级稳定</div>
                  {selectedPsp === 'two_c2p' && (
                    <Check className="w-5 h-5 text-emerald-500 mx-auto mt-2" />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <Label htmlFor="merchantRef">Merchant ID（可选）</Label>
              <Input
                id="merchantRef"
                placeholder="如已有 PSP 账户请输入"
                value={merchantRef}
                onChange={(e) => setMerchantRef(e.target.value)}
                data-testid="input-merchant-ref"
              />
              <p className="text-xs text-muted-foreground">
                如果您已在 PSP 开通账户，请输入 Merchant ID。留空则使用平台默认配置。
              </p>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full" 
          size="lg"
          onClick={handleSubmit}
          disabled={!selectedStoreId || createAccountMutation.isPending}
          data-testid="button-submit"
        >
          {createAccountMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              配置中...
            </>
          ) : (
            '确认配置'
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground px-4">
          配置完成后即可生成收款二维码。资金由 PSP 直接结算到您的账户，刷刷平台不触碰资金。
        </p>
      </main>

      <MerchantBottomNav />
    </div>
  );
}
