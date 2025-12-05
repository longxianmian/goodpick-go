import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, CreditCard, Building2, Check, Loader2, Upload, FileText, Landmark, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface UserRole {
  storeId: number;
  storeName: string;
  role: string;
}

const THAI_BANKS = [
  { code: 'BBL', name: '曼谷银行 Bangkok Bank' },
  { code: 'KBANK', name: '开泰银行 Kasikornbank' },
  { code: 'SCB', name: '暹罗商业银行 SCB' },
  { code: 'KTB', name: '泰京银行 Krungthai Bank' },
  { code: 'TMB', name: 'TMB Thanachart Bank' },
  { code: 'GSB', name: '政府储蓄银行 GSB' },
  { code: 'BAY', name: '大城银行 Bank of Ayudhya' },
  { code: 'CIMB', name: 'CIMB Thai' },
  { code: 'UOB', name: '大华银行 UOB' },
  { code: 'TBANK', name: '泰纳昌银行 Thanachart' },
];

export default function MerchantPspSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [onboardingMode, setOnboardingMode] = useState<'manual_id' | 'connect'>('connect');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedPsp, setSelectedPsp] = useState<string>('opn');
  
  // Manual ID mode fields
  const [merchantRef, setMerchantRef] = useState('');
  
  // Connect mode fields - Bank account info
  const [bankCode, setBankCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  
  // Connect mode fields - Business docs (URLs after upload)
  const [idCardUrl, setIdCardUrl] = useState('');
  const [businessLicenseUrl, setBusinessLicenseUrl] = useState('');

  const ownerStores = (user?.roles || []).filter(
    (r: UserRole) => r.role === 'owner' || r.role === 'operator'
  );

  const createAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/merchant/psp-accounts', data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        const message = onboardingMode === 'manual_id' 
          ? 'PSP 账户已配置，现在可以生成收款码了'
          : '资料已提交，等待 PSP 审核';
        toast({ title: '提交成功', description: message });
        queryClient.invalidateQueries({ queryKey: ['/api/merchant/psp-accounts'] });
        navigate('/merchant/payment-qrcode');
      } else {
        toast({ title: '提交失败', description: data.message, variant: 'destructive' });
      }
    },
    onError: () => {
      toast({ title: '提交失败', description: '请稍后重试', variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!selectedStoreId) {
      toast({ title: '请选择门店', variant: 'destructive' });
      return;
    }

    if (onboardingMode === 'manual_id') {
      if (!merchantRef.trim()) {
        toast({ title: '请输入 Merchant ID', variant: 'destructive' });
        return;
      }
      createAccountMutation.mutate({
        storeId: parseInt(selectedStoreId),
        pspCode: selectedPsp,
        onboardingMode: 'manual_id',
        providerMerchantRef: merchantRef.trim(),
      });
    } else {
      // Connect mode - validate bank info
      if (!bankCode || !accountName.trim() || !accountNumber.trim()) {
        toast({ title: '请填写完整的银行账户信息', variant: 'destructive' });
        return;
      }
      createAccountMutation.mutate({
        storeId: parseInt(selectedStoreId),
        pspCode: selectedPsp,
        onboardingMode: 'connect',
        settlementBankCode: bankCode,
        settlementBankName: THAI_BANKS.find(b => b.code === bankCode)?.name || bankCode,
        settlementAccountName: accountName.trim(),
        settlementAccountNumber: accountNumber.trim(),
        settlementBranch: branchName.trim() || undefined,
        idCardUrl: idCardUrl || undefined,
        businessLicenseUrl: businessLicenseUrl || undefined,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/merchant/payment-qrcode')} data-testid="button-back">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">配置支付账户</h1>
      </header>

      <main className="p-4 space-y-4">
        {/* 选择门店 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              选择门店
            </CardTitle>
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

        {/* 选择 PSP */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              选择支付服务商
            </CardTitle>
            <CardDescription className="text-xs">
              刷刷平台不直接处理资金，由持牌 PSP 直接结算给商户
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer transition-all ${selectedPsp === 'opn' ? 'border-emerald-500 bg-emerald-500/10' : 'hover-elevate'}`}
                onClick={() => setSelectedPsp('opn')}
                data-testid="card-psp-opn"
              >
                <CardContent className="p-3 text-center">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm">
                    Opn
                  </div>
                  <div className="text-sm font-medium">Opn Payments</div>
                  <div className="text-[10px] text-muted-foreground">费率 1.6%-3.65%</div>
                  {selectedPsp === 'opn' && (
                    <Check className="w-4 h-4 text-emerald-500 mx-auto mt-1" />
                  )}
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${selectedPsp === 'two_c2p' ? 'border-emerald-500 bg-emerald-500/10' : 'hover-elevate'}`}
                onClick={() => setSelectedPsp('two_c2p')}
                data-testid="card-psp-2c2p"
              >
                <CardContent className="p-3 text-center">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 mx-auto mb-2 flex items-center justify-center text-white font-bold text-xs">
                    2C2P
                  </div>
                  <div className="text-sm font-medium">2C2P</div>
                  <div className="text-[10px] text-muted-foreground">企业级稳定</div>
                  {selectedPsp === 'two_c2p' && (
                    <Check className="w-4 h-4 text-emerald-500 mx-auto mt-1" />
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* 入驻方式选择 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">入驻方式</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={onboardingMode} onValueChange={(v) => setOnboardingMode(v as 'manual_id' | 'connect')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="connect" data-testid="tab-connect">
                  新开通账户
                </TabsTrigger>
                <TabsTrigger value="manual_id" data-testid="tab-manual">
                  已有账户
                </TabsTrigger>
              </TabsList>

              {/* 新开通账户 - 需要提交银行资料 */}
              <TabsContent value="connect" className="mt-4 space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                  首次开通需提交银行账户信息，PSP 审核通过后即可收款
                </div>

                {/* 银行账户信息 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Landmark className="w-4 h-4" />
                    银行账户信息
                  </div>

                  <div className="space-y-2">
                    <Label>开户银行</Label>
                    <Select value={bankCode} onValueChange={setBankCode}>
                      <SelectTrigger data-testid="select-bank">
                        <SelectValue placeholder="请选择银行" />
                      </SelectTrigger>
                      <SelectContent>
                        {THAI_BANKS.map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>账户名称</Label>
                    <Input
                      placeholder="与银行账户一致的名称"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      data-testid="input-account-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>银行账号</Label>
                    <Input
                      placeholder="收款银行账号"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      data-testid="input-account-number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>开户支行（可选）</Label>
                    <Input
                      placeholder="开户支行名称"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      data-testid="input-branch"
                    />
                  </div>
                </div>

                {/* 证件资料 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="w-4 h-4" />
                    证件资料（可选）
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">身份证/护照</Label>
                      <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover-elevate">
                        <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">点击上传</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">营业执照</Label>
                      <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover-elevate">
                        <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">点击上传</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    证件资料用于 PSP 实名认证，部分商户类型可能需要提供
                  </p>
                </div>
              </TabsContent>

              {/* 已有账户 - 直接输入 Merchant ID */}
              <TabsContent value="manual_id" className="mt-4 space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                  如果您已在 {selectedPsp === 'opn' ? 'Opn Payments' : '2C2P'} 开通收款账户，请直接输入 Merchant ID
                </div>

                <div className="space-y-2">
                  <Label>Merchant ID</Label>
                  <Input
                    placeholder={`请输入 ${selectedPsp === 'opn' ? 'Opn' : '2C2P'} Merchant ID`}
                    value={merchantRef}
                    onChange={(e) => setMerchantRef(e.target.value)}
                    data-testid="input-merchant-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    可在 {selectedPsp === 'opn' ? 'Opn Dashboard' : '2C2P Merchant Portal'} 中找到您的 Merchant ID
                  </p>
                </div>
              </TabsContent>
            </Tabs>
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
              提交中...
            </>
          ) : onboardingMode === 'manual_id' ? (
            '确认配置'
          ) : (
            '提交审核'
          )}
        </Button>

        <p className="text-[10px] text-center text-muted-foreground px-4">
          {onboardingMode === 'manual_id' 
            ? '配置完成后即可生成收款二维码' 
            : '提交后 PSP 将在 1-3 个工作日内完成审核'}
          。资金由 PSP 直接结算到您的银行账户，刷刷平台不触碰资金。
        </p>
      </main>

      <MerchantBottomNav />
    </div>
  );
}
