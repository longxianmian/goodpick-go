import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Menu,
  ChevronRight,
  ChevronDown,
  Users,
  UserPlus,
  Shield,
  Store,
  Settings,
  BarChart3,
  Crown,
  User,
  Zap,
  Cog,
  BadgeCheck,
  Copy,
  Bell,
  Package,
  Wallet,
  ClipboardList,
  TrendingUp,
  Calendar,
  ShoppingBag,
  CircleDollarSign,
  FileText,
  AlertCircle,
  LogIn,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MerchantBottomNav } from '@/components/MerchantBottomNav';
import { DrawerMenu } from '@/components/DrawerMenu';
import { MerchantChatFloatingButton } from '@/components/MerchantChatFloatingButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

type ModuleType = 'staff' | 'operations' | 'assets';

export default function MeOwner() {
  const { t } = useLanguage();
  const { user, userRoles, userToken, setActiveRole, activeRole, hasRole, isUserAuthenticated, authPhase } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleType>('staff');
  
  const isTestAccount = user?.isTestAccount === true;
  
  const ownerRoles = userRoles.filter(r => r.role === 'owner');
  
  const { data: myStoresData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/stores/my'],
    enabled: !!user,
  });
  
  const myStores = myStoresData?.data || [];
  const primaryStore = myStores[0];
  
  const allRoleOptions = [
    { role: 'consumer', label: t('roles.consumer'), icon: User, path: '/me', color: 'text-blue-500' },
    { role: 'creator', label: t('roles.creator'), icon: Zap, path: '/creator/me', color: 'text-pink-500' },
    { role: 'owner', label: t('roles.owner'), icon: Store, path: '/merchant/me', color: 'text-orange-500' },
    { role: 'operator', label: t('roles.operator'), icon: Cog, path: '/merchant', color: 'text-purple-500' },
    { role: 'verifier', label: t('roles.verifier'), icon: BadgeCheck, path: '/verifier', color: 'text-green-500' },
    { role: 'member', label: t('roles.member'), icon: Crown, path: '/me', color: 'text-yellow-500' },
    { role: 'sysadmin', label: t('roles.sysadmin'), icon: Shield, path: '/sysadmin', color: 'text-red-500' },
  ];
  
  const availableRoleOptions = allRoleOptions.filter(option => 
    hasRole(option.role as any)
  );

  const handleSwitchRole = (role: string, path: string) => {
    setActiveRole(role as any);
    setRoleMenuOpen(false);
    navigate(path);
  };

  const handleCopyToken = async () => {
    if (!userToken) {
      toast({
        title: t('common.error'),
        description: '请先登录',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(userToken);
      toast({
        title: '已复制 Token',
        description: '在 Replit 预览窗口登录页面点击"粘贴Token登录"即可同步',
      });
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = userToken;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: '已复制 Token',
        description: '在 Replit 预览窗口登录页面点击"粘贴Token登录"即可同步',
      });
    }
  };

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };

  const moduleButtons = [
    { key: 'staff' as ModuleType, label: t('owner.staff'), icon: Users, color: 'bg-blue-500' },
    { key: 'operations' as ModuleType, label: t('owner.operations'), icon: ClipboardList, color: 'bg-green-500' },
    { key: 'assets' as ModuleType, label: t('owner.assets'), icon: Package, color: 'bg-orange-500' },
  ];

  if (authPhase === 'booting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <MerchantBottomNav />
      </div>
    );
  }

  if (!isUserAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-[#38B03B] text-white">
          <div className="flex items-center justify-center h-12 px-4">
            <h1 className="text-lg font-bold">{t('owner.myTitle')}</h1>
          </div>
        </header>
        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">{t('merchant.loginRequired')}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t('merchant.loginRequiredDesc')}</p>
          <Link href="/me">
            <Button className="gap-2" data-testid="button-go-login">
              <LogIn className="w-4 h-4" />
              {t('userCenter.login')}
            </Button>
          </Link>
        </main>
        <MerchantBottomNav />
      </div>
    );
  }

  if (ownerRoles.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-[#38B03B] text-white">
          <div className="flex items-center justify-center h-12 px-4">
            <h1 className="text-lg font-bold">{t('owner.myTitle')}</h1>
          </div>
        </header>
        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <Crown className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">{t('owner.noOwnerRole')}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t('owner.noOwnerRoleDesc')}</p>
          <Link href="/merchant/store-create">
            <Button className="gap-2" data-testid="button-create-store">
              <Store className="w-4 h-4" />
              {t('merchant.createStore')}
            </Button>
          </Link>
        </main>
        <MerchantBottomNav />
      </div>
    );
  }

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'staff':
        return (
          <div className="space-y-4">
            <Card className="border-[#38B03B]/30 bg-gradient-to-r from-[#38B03B]/5 to-transparent">
              <CardContent className="p-0">
                <div 
                  className="flex items-center gap-4 p-4 cursor-pointer hover-elevate active-elevate-2"
                  onClick={handleComingSoon}
                  data-testid="button-add-staff"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#38B03B] flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{t('owner.addStaff')}</div>
                    <div className="text-xs text-muted-foreground">{t('owner.addStaffDesc')}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <div className="py-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">{t('owner.noStaffYet')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('owner.addStaffHint')}</p>
            </div>
          </div>
        );
        
      case 'operations':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=operations')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">{t('owner.orderManagement')}</span>
                  <span className="text-xs text-muted-foreground">{t('owner.viewOrders')}</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=operations')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <BadgeCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">{t('owner.verifyRecords')}</span>
                  <span className="text-xs text-muted-foreground">{t('owner.viewVerifyHistory')}</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=operations')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium">{t('owner.activityCalendar')}</span>
                  <span className="text-xs text-muted-foreground">{t('owner.scheduleAndPlan')}</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=operations')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium">{t('owner.businessSettings')}</span>
                  <span className="text-xs text-muted-foreground">{t('owner.manageStatus')}</span>
                </CardContent>
              </Card>
            </div>
          </div>
        );
        
      case 'assets':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=assets')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">{t('owner.productManagement')}</span>
                  <span className="text-xs text-muted-foreground">{t('owner.manageProducts')}</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=assets')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium">{t('owner.campaignManagement')}</span>
                  <span className="text-xs text-muted-foreground">{t('owner.createEditCampaigns')}</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=assets')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CircleDollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">{t('owner.transactions')}</span>
                  <span className="text-xs text-muted-foreground">{t('owner.viewTransactions')}</span>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => navigate('/merchant/operations?tab=assets')}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium">{t('owner.withdrawal')}</span>
                  <span className="text-xs text-muted-foreground">{t('owner.withdrawBalance')}</span>
                </CardContent>
              </Card>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-gradient-to-b from-[#38B03B] to-[#2d8c2f] text-white">
        <header className="flex items-center justify-between h-12 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => setDrawerOpen(true)}
            data-testid="button-drawer-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-base font-semibold" data-testid="text-page-title">
            {t('owner.myTitle')}
          </h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 relative"
            onClick={handleComingSoon}
            data-testid="button-notifications"
          >
            <Bell className="w-5 h-5" />
          </Button>
        </header>
        
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14 border-2 border-white/30">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="text-lg font-bold bg-white/20 text-white">
                {user?.displayName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-base font-bold truncate" data-testid="text-user-name">
                  {user?.displayName || 'User'}
                </h2>
                {isTestAccount && availableRoleOptions.length > 1 && (
                  <DropdownMenu open={roleMenuOpen} onOpenChange={setRoleMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] gap-0.5 bg-white/20 hover:bg-white/30 text-white"
                        data-testid="button-switch-role"
                      >
                        <span>{allRoleOptions.find(r => r.role === activeRole)?.label || t('roles.owner')}</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {t('common.switchRole')}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableRoleOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <DropdownMenuItem
                            key={option.role}
                            onClick={() => handleSwitchRole(option.role, option.path)}
                            className={`gap-2 cursor-pointer ${activeRole === option.role ? 'bg-accent' : ''}`}
                            data-testid={`menu-role-${option.role}`}
                          >
                            <IconComponent className={`w-4 h-4 ${option.color}`} />
                            <span>{option.label}</span>
                            {activeRole === option.role && (
                              <Badge variant="outline" className="ml-auto text-[10px]">{t('common.current')}</Badge>
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px] gap-0.5 bg-amber-500/20 border-amber-300/50 text-white">
                  <Crown className="w-2.5 h-2.5" />
                  {t('owner.role')}
                </Badge>
                {isTestAccount && (
                  <Badge variant="outline" className="text-[10px] gap-0.5 bg-white/20 border-white/30 text-white">
                    <Shield className="w-2.5 h-2.5" />
                    测试
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] gap-1 text-white/80 hover:text-white hover:bg-white/20 h-7 px-2" 
              onClick={handleCopyToken}
              data-testid="button-copy-token"
            >
              <Copy className="w-3 h-3" />
              Token
            </Button>
          </div>
        </div>
        
        {ownerRoles.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {ownerRoles.map((store) => (
                <Badge 
                  key={store.storeId} 
                  variant="outline" 
                  className="text-[10px] gap-1 bg-white/10 border-white/30 text-white"
                >
                  <Store className="w-2.5 h-2.5" />
                  {store.storeName}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {moduleButtons.map((btn) => {
            const IconComponent = btn.icon;
            const isActive = activeModule === btn.key;
            return (
              <Button
                key={btn.key}
                variant={isActive ? 'default' : 'outline'}
                className={`h-auto py-3 flex flex-col gap-1.5 ${isActive ? btn.color + ' text-white border-0' : ''}`}
                onClick={() => setActiveModule(btn.key)}
                data-testid={`button-module-${btn.key}`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="text-xs font-medium">{btn.label}</span>
              </Button>
            );
          })}
        </div>

        {renderModuleContent()}
      </main>

      <MerchantBottomNav />
      <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
      {primaryStore && <MerchantChatFloatingButton storeId={primaryStore.id} />}
    </div>
  );
}
