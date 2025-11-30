import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Menu, 
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  Clock,
  ChevronRight,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Bell,
  Shield,
  FileText,
  Zap,
  ArrowRightLeft
} from 'lucide-react';

export default function CreatorAccount() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { user, setActiveRole } = useAuth();
  
  const mockEarnings = {
    thisMonth: 12580,
    lastMonth: 10260,
    pending: 3680,
    withdrawable: 8900,
    total: 86500,
  };

  const mockSettlements = [
    { id: 1, amount: 5000, date: '2024-11-25', status: 'completed' },
    { id: 2, amount: 3260, date: '2024-11-18', status: 'completed' },
    { id: 3, amount: 2000, date: '2024-11-10', status: 'processing' },
  ];

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + t('merchant.units.wan');
    }
    return num.toLocaleString();
  };

  const handleSwitchToConsumer = () => {
    setActiveRole('consumer');
    setLocation('/me');
  };

  const menuItems = [
    { icon: Bell, label: t('creatorAccount.notifications'), path: '/creator/notifications' },
    { icon: Wallet, label: t('creatorAccount.paymentSettings'), path: '/creator/payment' },
    { icon: Shield, label: t('creatorAccount.accountSecurity'), path: '/creator/security' },
    { icon: FileText, label: t('creatorAccount.incomeRecords'), path: '/creator/income-records' },
    { icon: Settings, label: t('common.settings'), path: '/settings' },
    { icon: HelpCircle, label: t('common.help'), path: '/help' },
  ];

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-gradient-to-b from-[#ff6b6b] to-[#ee5a5a] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            onClick={() => setLocation('/creator')}
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <span className="text-lg font-semibold">{t('creatorAccount.title')}</span>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white"
            data-testid="button-menu"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </header>

        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-white/30">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-white/20 text-white text-xl">
                {user?.displayName?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{user?.displayName || t('creator.defaultName')}</h2>
                <Badge className="bg-pink-500/20 text-pink-200 border-pink-400/30">
                  <Zap className="w-3 h-3 mr-1" />
                  {t('creator.badge')}
                </Badge>
              </div>
              <p className="text-sm text-white/70 mt-1">
                ID: SH{String(user?.id || 10001).padStart(6, '0')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 py-4 space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('creatorAccount.earningsOverview')}</span>
              </div>
              <Button variant="ghost" size="sm" data-testid="button-view-details">
                {t('creatorAccount.viewDetails')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30" data-testid="stat-this-month">
                <div className="text-xs text-muted-foreground mb-1">{t('creatorAccount.thisMonth')}</div>
                <div className="text-xl font-bold text-green-600">{t('common.currencySymbol')}{formatNumber(mockEarnings.thisMonth)}</div>
                <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+22.6%</span>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30" data-testid="stat-withdrawable">
                <div className="text-xs text-muted-foreground mb-1">{t('creatorAccount.withdrawable')}</div>
                <div className="text-xl font-bold text-blue-600">{t('common.currencySymbol')}{formatNumber(mockEarnings.withdrawable)}</div>
                <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" data-testid="button-withdraw">
                  {t('creatorAccount.withdraw')}
                </Button>
              </div>
              
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30" data-testid="stat-pending">
                <div className="text-xs text-muted-foreground mb-1">{t('creatorAccount.pending')}</div>
                <div className="text-lg font-bold text-amber-600">{t('common.currencySymbol')}{formatNumber(mockEarnings.pending)}</div>
              </div>
              
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30" data-testid="stat-total">
                <div className="text-xs text-muted-foreground mb-1">{t('creatorAccount.totalEarnings')}</div>
                <div className="text-lg font-bold text-purple-600">{t('common.currencySymbol')}{formatNumber(mockEarnings.total)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#ff6b6b]" />
                <span className="text-sm font-semibold">{t('creatorAccount.recentSettlements')}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {mockSettlements.map((settlement) => (
                <div 
                  key={settlement.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`settlement-${settlement.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {t('common.currencySymbol')}{formatNumber(settlement.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">{settlement.date}</div>
                    </div>
                  </div>
                  <Badge variant={settlement.status === 'completed' ? 'secondary' : 'outline'}>
                    {settlement.status === 'completed' ? t('creatorAccount.completed') : t('creatorAccount.processing')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1">
              {menuItems.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg hover-elevate cursor-pointer"
                  onClick={() => setLocation(item.path)}
                  data-testid={`menu-item-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div 
              className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 cursor-pointer"
              onClick={handleSwitchToConsumer}
              data-testid="button-switch-account"
            >
              <div className="flex items-center gap-3">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="text-sm font-medium">{t('creatorAccount.switchToPersonal')}</div>
                  <div className="text-xs text-muted-foreground">{t('creatorAccount.switchHint')}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </main>

      <RoleAwareBottomNav forceRole="creator" />
    </div>
  );
}
