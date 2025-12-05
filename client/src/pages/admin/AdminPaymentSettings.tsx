import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { ArrowLeft, CreditCard, Users, QrCode, Save, Upload, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLanguage } from '@/contexts/LanguageContext';

interface PaymentConfig {
  id: number;
  storeId: number;
  provider: string;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  promptpayId: string | null;
  qrCodeUrl: string | null;
  isActive: boolean;
}

interface MembershipRule {
  id: number;
  storeId: number;
  silverThreshold: string;
  goldThreshold: string;
  platinumThreshold: string;
  pointsDivisor: number;
  welcomeCampaignId: number | null;
}

interface Store {
  id: number;
  name: string;
  brand: string | null;
}

export default function AdminPaymentSettings() {
  const [, params] = useRoute('/admin/stores/:id/payment');
  const storeId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const { t } = useLanguage();

  const [paymentForm, setPaymentForm] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    promptpayId: '',
    qrCodeUrl: '',
    isActive: true,
  });

  const [membershipForm, setMembershipForm] = useState({
    silverThreshold: '500',
    goldThreshold: '2000',
    platinumThreshold: '5000',
    pointsDivisor: 10,
  });

  const { data: storeData } = useQuery<{ success: boolean; data: Store }>({
    queryKey: ['/api/admin/stores', storeId],
    enabled: !!storeId,
  });

  const { data: configData, isLoading } = useQuery<{
    success: boolean;
    data: {
      paymentConfig: PaymentConfig | null;
      membershipRule: MembershipRule | null;
    };
  }>({
    queryKey: ['/api/admin/stores', storeId, 'payment'],
    enabled: !!storeId,
  });

  const [formInitialized, setFormInitialized] = useState(false);

  useEffect(() => {
    if (configData?.data && !formInitialized) {
      const { paymentConfig, membershipRule } = configData.data;
      if (paymentConfig) {
        setPaymentForm({
          bankName: paymentConfig.bankName || '',
          accountNumber: paymentConfig.accountNumber || '',
          accountName: paymentConfig.accountName || '',
          promptpayId: paymentConfig.promptpayId || '',
          qrCodeUrl: paymentConfig.qrCodeUrl || '',
          isActive: paymentConfig.isActive,
        });
      }
      if (membershipRule) {
        setMembershipForm({
          silverThreshold: membershipRule.silverThreshold,
          goldThreshold: membershipRule.goldThreshold,
          platinumThreshold: membershipRule.platinumThreshold,
          pointsDivisor: membershipRule.pointsDivisor,
        });
      }
      setFormInitialized(true);
    }
  }, [configData, formInitialized]);

  const paymentMutation = useMutation({
    mutationFn: async (data: typeof paymentForm) => {
      return apiRequest('PUT', `/api/admin/stores/${storeId}/payment`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores', storeId, 'payment'] });
      toast({ title: t('payment.saveSuccess'), description: t('payment.savePaymentSuccess') });
    },
    onError: () => {
      toast({ title: t('payment.saveError'), description: t('payment.retryLater'), variant: 'destructive' });
    },
  });

  const membershipMutation = useMutation({
    mutationFn: async (data: typeof membershipForm) => {
      return apiRequest('PUT', `/api/admin/stores/${storeId}/membership-rules`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores', storeId, 'payment'] });
      toast({ title: t('payment.saveSuccess'), description: t('payment.saveMembershipSuccess') });
    },
    onError: () => {
      toast({ title: t('payment.saveError'), description: t('payment.retryLater'), variant: 'destructive' });
    },
  });

  const handleUploadQrCode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      setPaymentForm((prev) => ({ ...prev, qrCodeUrl: result.fileUrl }));
      toast({ title: t('common.success'), description: t('payment.qrCode') });
    } catch {
      toast({ title: t('payment.saveError'), description: t('payment.retryLater'), variant: 'destructive' });
    }
  };

  const paymentPageUrl = `${window.location.origin}/pay/${storeId}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('common.success'), description: t('payment.qrCode') });
  };

  const store = storeData?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center h-14 px-4 gap-4">
          <Link href="/admin/stores">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold">{t('payment.settings')}</h1>
            {store && <p className="text-sm text-muted-foreground">{store.name}</p>}
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              {t('payment.qrCode')}
            </CardTitle>
            <CardDescription>
              {t('payment.scanToPay')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input value={paymentPageUrl} readOnly className="flex-1" data-testid="input-payment-url" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(paymentPageUrl)} data-testid="button-copy-url">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={paymentPageUrl} target="_blank" rel="noopener noreferrer" data-testid="link-payment-page">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('payment.generateQr')}
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="payment">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payment" data-testid="tab-payment">
              <CreditCard className="w-4 h-4 mr-2" />
              {t('payment.bankAccount')}
            </TabsTrigger>
            <TabsTrigger value="membership" data-testid="tab-membership">
              <Users className="w-4 h-4 mr-2" />
              {t('payment.membershipSettings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('payment.promptpayLabel')}</CardTitle>
                <CardDescription>{t('payment.scanToPay')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="promptpayId">{t('payment.promptpayId')}</Label>
                    <Input
                      id="promptpayId"
                      placeholder={t('payment.accountNumberPlaceholder')}
                      value={paymentForm.promptpayId}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, promptpayId: e.target.value }))}
                      data-testid="input-promptpay-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountName">{t('payment.accountName')}</Label>
                    <Input
                      id="accountName"
                      placeholder={t('payment.accountNamePlaceholder')}
                      value={paymentForm.accountName}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, accountName: e.target.value }))}
                      data-testid="input-account-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('payment.qrCode')}</Label>
                  <div className="flex items-center gap-4">
                    {paymentForm.qrCodeUrl ? (
                      <div className="w-32 h-32 border rounded-md overflow-hidden">
                        <img src={paymentForm.qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-32 h-32 border rounded-md flex items-center justify-center bg-muted">
                        <QrCode className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="qrUpload" className="cursor-pointer">
                        <Button variant="outline" asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            {t('payment.uploadQrCode')}
                          </span>
                        </Button>
                      </Label>
                      <input id="qrUpload" type="file" accept="image/*" className="hidden" onChange={handleUploadQrCode} />
                      <p className="text-xs text-muted-foreground mt-2">{t('payment.uploadHint')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isActive">{t('payment.paymentEnabled')}</Label>
                    <p className="text-sm text-muted-foreground">{t('payment.paymentNotEnabled')}</p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={paymentForm.isActive}
                    onCheckedChange={(checked) => setPaymentForm((prev) => ({ ...prev, isActive: checked }))}
                    data-testid="switch-is-active"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('payment.bankAccount')}</CardTitle>
                <CardDescription>{t('payment.accountNamePlaceholder')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">{t('payment.bankName')}</Label>
                    <Input
                      id="bankName"
                      placeholder={t('payment.bankNamePlaceholder')}
                      value={paymentForm.bankName}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, bankName: e.target.value }))}
                      data-testid="input-bank-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">{t('payment.accountNumber')}</Label>
                    <Input
                      id="accountNumber"
                      placeholder={t('payment.accountNumberPlaceholder')}
                      value={paymentForm.accountNumber}
                      onChange={(e) => setPaymentForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                      data-testid="input-account-number"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              onClick={() => paymentMutation.mutate(paymentForm)}
              disabled={paymentMutation.isPending}
              data-testid="button-save-payment"
            >
              <Save className="w-4 h-4 mr-2" />
              {paymentMutation.isPending ? t('common.saving') : t('payment.savePaymentSettings')}
            </Button>
          </TabsContent>

          <TabsContent value="membership" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('payment.tierRules')}</CardTitle>
                <CardDescription>{t('payment.pointsPerCurrencyDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="silverThreshold">{t('payment.tierSilver')} ({t('payment.minPoints')})</Label>
                    <Input
                      id="silverThreshold"
                      type="number"
                      value={membershipForm.silverThreshold}
                      onChange={(e) => setMembershipForm((prev) => ({ ...prev, silverThreshold: e.target.value }))}
                      data-testid="input-silver-threshold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goldThreshold">{t('payment.tierGold')} ({t('payment.minPoints')})</Label>
                    <Input
                      id="goldThreshold"
                      type="number"
                      value={membershipForm.goldThreshold}
                      onChange={(e) => setMembershipForm((prev) => ({ ...prev, goldThreshold: e.target.value }))}
                      data-testid="input-gold-threshold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platinumThreshold">Platinum ({t('payment.minPoints')})</Label>
                    <Input
                      id="platinumThreshold"
                      type="number"
                      value={membershipForm.platinumThreshold}
                      onChange={(e) => setMembershipForm((prev) => ({ ...prev, platinumThreshold: e.target.value }))}
                      data-testid="input-platinum-threshold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('payment.pointsPerCurrency')}</CardTitle>
                <CardDescription>{t('payment.pointsPerCurrencyDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="pointsDivisor">{t('payment.pointsPerCurrencyDesc')}</Label>
                  <Input
                    id="pointsDivisor"
                    type="number"
                    value={membershipForm.pointsDivisor}
                    onChange={(e) => setMembershipForm((prev) => ({ ...prev, pointsDivisor: parseInt(e.target.value) || 10 }))}
                    data-testid="input-points-divisor"
                  />
                  <p className="text-sm text-muted-foreground">{t('payment.pointsPerCurrencyDesc')}</p>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              onClick={() => membershipMutation.mutate(membershipForm)}
              disabled={membershipMutation.isPending}
              data-testid="button-save-membership"
            >
              <Save className="w-4 h-4 mr-2" />
              {membershipMutation.isPending ? t('common.saving') : t('payment.saveMembershipRules')}
            </Button>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
