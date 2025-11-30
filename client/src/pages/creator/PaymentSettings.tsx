import { useState } from 'react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft,
  Wallet,
  CreditCard,
  Building2,
  Plus,
  Check,
  AlertCircle,
  Pencil,
  Trash2,
  Shield,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethod {
  id: number;
  type: 'bank' | 'promptpay' | 'line_pay';
  name: string;
  accountNumber: string;
  isDefault: boolean;
  verified: boolean;
}

export default function PaymentSettings() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('bank');
  const [autoWithdraw, setAutoWithdraw] = useState(false);
  const [minWithdrawAmount, setMinWithdrawAmount] = useState('1000');

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: 1, type: 'bank', name: '泰国银行', accountNumber: '**** **** **** 1234', isDefault: true, verified: true },
    { id: 2, type: 'promptpay', name: 'PromptPay', accountNumber: '098-***-7890', isDefault: false, verified: true },
  ]);

  const handleSetDefault = (id: number) => {
    setPaymentMethods(methods => 
      methods.map(m => ({ ...m, isDefault: m.id === id }))
    );
    toast({ title: t('common.success'), description: t('paymentSettings.defaultUpdated') });
  };

  const handleDeleteMethod = (id: number) => {
    setPaymentMethods(methods => methods.filter(m => m.id !== id));
    toast({ title: t('common.success'), description: t('paymentSettings.methodDeleted') });
  };

  const handleAddMethod = () => {
    setShowAddDialog(false);
    toast({ title: t('common.success'), description: t('paymentSettings.methodAdded') });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Building2 className="w-5 h-5" />;
      case 'promptpay': return <CreditCard className="w-5 h-5" />;
      case 'line_pay': return <Wallet className="w-5 h-5" />;
      default: return <Wallet className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bank': return t('paymentSettings.bankTransfer');
      case 'promptpay': return 'PromptPay';
      case 'line_pay': return 'LINE Pay';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-6">
      <div className="bg-gradient-to-b from-[#ff6b6b] to-[#ee5a5a] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            onClick={() => setLocation('/creator/me')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-lg font-semibold">{t('paymentSettings.title')}</span>
          <div className="w-9" />
        </header>
      </div>

      <main className="px-4 py-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{t('paymentSettings.paymentMethods')}</CardTitle>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid="button-add-method">
                    <Plus className="w-4 h-4 mr-1" />
                    {t('paymentSettings.addMethod')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('paymentSettings.addPaymentMethod')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t('paymentSettings.methodType')}</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger data-testid="select-method-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank">{t('paymentSettings.bankTransfer')}</SelectItem>
                          <SelectItem value="promptpay">PromptPay</SelectItem>
                          <SelectItem value="line_pay">LINE Pay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedType === 'bank' && (
                      <>
                        <div className="space-y-2">
                          <Label>{t('paymentSettings.bankName')}</Label>
                          <Input placeholder={t('paymentSettings.enterBankName')} data-testid="input-bank-name" />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('paymentSettings.accountNumber')}</Label>
                          <Input placeholder={t('paymentSettings.enterAccountNumber')} data-testid="input-account-number" />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('paymentSettings.accountName')}</Label>
                          <Input placeholder={t('paymentSettings.enterAccountName')} data-testid="input-account-name" />
                        </div>
                      </>
                    )}

                    {selectedType === 'promptpay' && (
                      <div className="space-y-2">
                        <Label>{t('paymentSettings.phoneNumber')}</Label>
                        <Input placeholder={t('paymentSettings.enterPhoneNumber')} data-testid="input-phone" />
                      </div>
                    )}

                    {selectedType === 'line_pay' && (
                      <div className="space-y-2">
                        <Label>LINE ID</Label>
                        <Input placeholder={t('paymentSettings.enterLineId')} data-testid="input-line-id" />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleAddMethod} className="bg-[#38B03B]">
                      {t('common.confirm')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentMethods.map((method) => (
              <div 
                key={method.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                data-testid={`payment-method-${method.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    method.type === 'bank' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500' :
                    method.type === 'promptpay' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-500' :
                    'bg-green-100 dark:bg-green-900/30 text-green-500'
                  }`}>
                    {getTypeIcon(method.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{method.name}</span>
                      {method.isDefault && (
                        <Badge className="text-xs bg-[#38B03B]">{t('paymentSettings.default')}</Badge>
                      )}
                      {method.verified && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          {t('paymentSettings.verified')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{method.accountNumber}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!method.isDefault && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleSetDefault(method.id)}
                      data-testid={`button-set-default-${method.id}`}
                    >
                      {t('paymentSettings.setDefault')}
                    </Button>
                  )}
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => handleDeleteMethod(method.id)}
                    data-testid={`button-delete-${method.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('paymentSettings.withdrawSettings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{t('paymentSettings.autoWithdraw')}</div>
                <div className="text-xs text-muted-foreground">{t('paymentSettings.autoWithdrawDesc')}</div>
              </div>
              <Switch 
                checked={autoWithdraw} 
                onCheckedChange={setAutoWithdraw}
                data-testid="switch-auto-withdraw"
              />
            </div>

            {autoWithdraw && (
              <div className="space-y-2">
                <Label>{t('paymentSettings.minWithdrawAmount')}</Label>
                <Select value={minWithdrawAmount} onValueChange={setMinWithdrawAmount}>
                  <SelectTrigger data-testid="select-min-amount">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500">{t('common.currencySymbol')}500</SelectItem>
                    <SelectItem value="1000">{t('common.currencySymbol')}1,000</SelectItem>
                    <SelectItem value="2000">{t('common.currencySymbol')}2,000</SelectItem>
                    <SelectItem value="5000">{t('common.currencySymbol')}5,000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-amber-800 dark:text-amber-200">{t('paymentSettings.notice')}</div>
                <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                  <li>{t('paymentSettings.noticeItem1')}</li>
                  <li>{t('paymentSettings.noticeItem2')}</li>
                  <li>{t('paymentSettings.noticeItem3')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
