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
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ChevronLeft,
  Shield,
  Smartphone,
  Mail,
  Key,
  Lock,
  Check,
  AlertCircle,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SiLine, SiGoogle, SiApple } from 'react-icons/si';

interface SecurityItem {
  id: string;
  icon: any;
  title: string;
  description: string;
  status: 'linked' | 'unlinked' | 'enabled' | 'disabled';
  action?: string;
}

export default function AccountSecurity() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isLineLinked = !!(user as any)?.lineId;
  const userPhone = (user as any)?.phone || '';
  
  const securityItems: SecurityItem[] = [
    { 
      id: 'line', 
      icon: SiLine, 
      title: 'LINE', 
      description: isLineLinked ? t('security.linked') : t('security.notLinked'),
      status: isLineLinked ? 'linked' : 'unlinked',
      action: isLineLinked ? undefined : t('security.link')
    },
    { 
      id: 'google', 
      icon: SiGoogle, 
      title: 'Google', 
      description: t('security.notLinked'),
      status: 'unlinked',
      action: t('security.link')
    },
    { 
      id: 'apple', 
      icon: SiApple, 
      title: 'Apple ID', 
      description: t('security.notLinked'),
      status: 'unlinked',
      action: t('security.link')
    },
  ];

  const handlePasswordChange = () => {
    setShowPasswordDialog(false);
    toast({ title: t('common.success'), description: t('security.passwordUpdated') });
  };

  const handlePhoneBind = () => {
    setShowPhoneDialog(false);
    toast({ title: t('common.success'), description: t('security.phoneLinked') });
  };

  const handleTwoFactorToggle = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    toast({ 
      title: t('common.success'), 
      description: enabled ? t('security.twoFactorEnabled') : t('security.twoFactorDisabled')
    });
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
          <span className="text-lg font-semibold">{t('security.title')}</span>
          <div className="w-9" />
        </header>
      </div>

      <main className="px-4 py-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('security.loginMethods')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {securityItems.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
                data-testid={`security-item-${item.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.id === 'line' ? 'bg-green-100 dark:bg-green-900/30' :
                    item.id === 'google' ? 'bg-red-100 dark:bg-red-900/30' :
                    'bg-gray-100 dark:bg-gray-900/30'
                  }`}>
                    <item.icon className={`w-5 h-5 ${
                      item.id === 'line' ? 'text-green-500' :
                      item.id === 'google' ? 'text-red-500' :
                      'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </div>
                {item.status === 'linked' ? (
                  <Badge className="bg-green-500 text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    {t('security.linked')}
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" data-testid={`button-link-${item.id}`}>
                    {item.action}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('security.accountSecurity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div 
              className="flex items-center justify-between py-3 border-b cursor-pointer"
              onClick={() => setShowPhoneDialog(true)}
              data-testid="item-phone"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">{t('security.phoneNumber')}</div>
                  <div className="text-xs text-muted-foreground">
                    {userPhone || t('security.notSet')}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>

            <div 
              className="flex items-center justify-between py-3 border-b cursor-pointer"
              onClick={() => setShowPasswordDialog(true)}
              data-testid="item-password"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
                  <Key className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">{t('security.password')}</div>
                  <div className="text-xs text-muted-foreground">{t('security.changePassword')}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
                  <Shield className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">{t('security.twoFactor')}</div>
                  <div className="text-xs text-muted-foreground">{t('security.twoFactorDesc')}</div>
                </div>
              </div>
              <Switch 
                checked={twoFactorEnabled} 
                onCheckedChange={handleTwoFactorToggle}
                data-testid="switch-two-factor"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-medium text-blue-800 dark:text-blue-200">{t('security.securityTips')}</div>
                <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                  <li>{t('security.tip1')}</li>
                  <li>{t('security.tip2')}</li>
                  <li>{t('security.tip3')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('security.changePassword')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('security.currentPassword')}</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder={t('security.enterCurrentPassword')}
                  data-testid="input-current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('security.newPassword')}</Label>
              <Input 
                type="password" 
                placeholder={t('security.enterNewPassword')}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('security.confirmPassword')}</Label>
              <Input 
                type="password" 
                placeholder={t('security.enterConfirmPassword')}
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handlePasswordChange} className="bg-[#38B03B]">
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('security.bindPhone')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('security.phoneNumber')}</Label>
              <Input 
                type="tel" 
                placeholder={t('security.enterPhoneNumber')}
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('security.verificationCode')}</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder={t('security.enterCode')}
                  data-testid="input-code"
                />
                <Button variant="outline" data-testid="button-send-code">
                  {t('security.sendCode')}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhoneDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handlePhoneBind} className="bg-[#38B03B]">
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
