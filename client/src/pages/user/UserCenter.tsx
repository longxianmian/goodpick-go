import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronRight, 
  ChevronDown,
  Settings,
  ShoppingCart,
  Receipt,
  Coins,
  Wallet,
  Menu,
  User,
  Zap,
  Store,
  BadgeCheck,
  Cog,
  Crown,
  Shield
} from 'lucide-react';
import { SiLine, SiGoogle, SiApple } from 'react-icons/si';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleAwareBottomNav } from '@/components/RoleAwareBottomNav';
import { DrawerMenu } from '@/components/DrawerMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MembershipData {
  id: number;
  tier: string;
  points: number;
  totalAmount: string;
  visitCount: number;
  lastVisitAt: string | null;
  joinedAt: string;
  storeId: number;
  storeName: string;
  storeBrand: string | null;
  storeImageUrl: string | null;
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

type TabType = "cart" | "orders" | "points" | "wallet";
type IdentityType = "shua" | "discover";

export default function UserCenter() {
  const { t } = useLanguage();
  const { user, authPhase, userToken, logoutUser, setActiveRole, activeRole, hasRole } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<TabType>("cart");
  const [identity, setIdentity] = useState<IdentityType>("shua");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  
  const isLoggedIn = !!userToken && !!user;
  const isTestAccount = user?.isTestAccount === true;
  
  // 获取用户会员卡数据
  const { data: membershipsData } = useQuery<{ success: boolean; data: MembershipData[] }>({
    queryKey: ['/api/me/memberships'],
    enabled: isLoggedIn,
  });
  const memberships = membershipsData?.data || [];
  
  const allRoleOptions = [
    { role: 'consumer', label: t('roles.consumer'), icon: User, path: '/me', color: 'text-blue-500' },
    { role: 'creator', label: t('roles.creator'), icon: Zap, path: '/creator/me', color: 'text-pink-500' },
    { role: 'owner', label: t('roles.owner'), icon: Store, path: '/merchant', color: 'text-orange-500' },
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

  const handleLineLogin = async () => {
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/line/init-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      
      const data = await response.json();
      
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast({
          title: t('login.failed'),
          description: data.message || t('common.error'),
          variant: 'destructive',
        });
        setIsLoggingIn(false);
      }
    } catch (error: any) {
      console.error('[UserCenter] LINE OAuth init failed:', error);
      toast({
        title: t('login.failed'),
        description: error.message || t('common.error'),
        variant: 'destructive',
      });
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = () => {
    toast({
      title: t('login.comingSoon'),
      description: t('login.googleComingSoon'),
    });
  };

  const handleAppleLogin = () => {
    toast({
      title: t('login.comingSoon'),
      description: t('login.appleComingSoon'),
    });
  };

  const handlePhoneLogin = () => {
    toast({
      title: t('login.comingSoon'),
      description: t('login.phoneComingSoon'),
    });
  };

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast({
        title: t('profile.logoutSuccess'),
        description: t('profile.logoutSuccessDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const tabItems = [
    { key: "cart" as TabType, label: t('consumer.cart'), icon: ShoppingCart },
    { key: "orders" as TabType, label: t('consumer.orders'), icon: Receipt },
    { key: "points" as TabType, label: t('consumer.pointsCoupons'), icon: Coins },
    { key: "wallet" as TabType, label: t('consumer.wallet'), icon: Wallet },
  ];

  const renderTabContent = () => {
    switch (tab) {
      case "cart":
        return (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{t('consumer.cartGroupHint')}</div>
            {[1, 2].map((store) => (
              <Card key={store}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-medium text-sm">{t('consumer.mockStoreName')} {store}</div>
                    <Button variant="ghost" size="sm" className="text-xs h-auto p-0" onClick={handleComingSoon}>
                      {t('consumer.visitStore')}
                    </Button>
                  </div>
                  {[1, 2].map((item) => (
                    <div key={item} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-muted" />
                        <div>
                          <div className="text-xs">{t('consumer.mockProduct')} {item}</div>
                          <div className="text-[11px] text-muted-foreground">{t('consumer.mockProductSpec')}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs">{t('common.currencySymbol')}399</div>
                        <div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                          <button className="px-1.5 rounded-full border">-</button>
                          <span>1</span>
                          <button className="px-1.5 rounded-full border">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case "orders":
        return (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
              {[t('consumer.orderAll'), t('consumer.orderPending'), t('consumer.orderToUse'), t('consumer.orderCompleted'), t('consumer.orderRefund')].map((s) => (
                <Badge key={s} variant="secondary" className="whitespace-nowrap">{s}</Badge>
              ))}
            </div>
            {[1, 2, 3].map((o) => (
              <Card key={o}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">{t('consumer.mockStoreName')} {o}</span>
                    <span className="text-orange-500">{t('consumer.orderCompleted')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-muted" />
                      <div>
                        <div className="text-xs">{t('consumer.mockOrderItem')}</div>
                        <div className="text-[11px] text-muted-foreground">{t('consumer.mockOrderCount')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs">{t('consumer.paidAmount')} {t('common.currencySymbol')}1,288</div>
                      <div className="text-[11px] text-muted-foreground">2025-11-28 19:30</div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 text-[11px] mt-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleComingSoon}>{t('consumer.buyAgain')}</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleComingSoon}>{t('consumer.viewDetails')}</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case "points":
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#38B03B] to-emerald-600 rounded-xl p-3 text-white flex justify-between items-center">
              <div>
                <div className="text-xs opacity-80">{t('consumer.platformPoints')}</div>
                <div className="text-xl font-semibold">12,680</div>
              </div>
              <Button variant="ghost" size="sm" className="bg-white/15 text-white text-xs" onClick={handleComingSoon}>
                {t('consumer.pointsExchange')}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{t('consumer.merchantPoints')}</div>
              {[1, 2, 3].map((s) => (
                <Card key={s}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted" />
                      <div>
                        <div className="text-xs">{t('consumer.mockStoreName')} {s}</div>
                        <div className="text-[11px] text-muted-foreground">{t('consumer.platinumMember')}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div>{t('consumer.points')} 3,28{s}</div>
                      <div className="text-[11px] text-[#38B03B] cursor-pointer" onClick={handleComingSoon}>
                        {t('consumer.viewDetails')} <ChevronRight className="inline w-3 h-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">{t('consumer.myCoupons')}</div>
                <div className="flex gap-2 text-[11px] text-muted-foreground">
                  <span className="text-[#38B03B]">{t('consumer.couponAvailable')}</span>
                  <span>{t('consumer.couponUsed')}</span>
                  <span>{t('consumer.couponExpired')}</span>
                </div>
              </div>
              {[1, 2].map((c) => (
                <Card key={c}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="space-y-1 text-xs">
                      <div>{t('consumer.mockCouponName')}</div>
                      <div className="text-[11px] text-orange-500">{t('consumer.mockCouponValue')}</div>
                      <div className="text-[11px] text-muted-foreground">{t('consumer.applicableStore')}: {c}</div>
                    </div>
                    <div className="text-right text-[11px]">
                      <div>{t('consumer.remaining')} 2 {t('consumer.sheets')}</div>
                      <div className="text-muted-foreground">{t('consumer.validUntil')} 2025-12-31</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case "wallet":
        return (
          <div className="space-y-3">
            <Card>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{t('consumer.availableBalance')}</div>
                  <div className="text-xl font-semibold">{t('common.currencySymbol')} 528.00</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{t('consumer.redPacketCoupons')}: 3 {t('consumer.sheets')}</div>
                  <div className="text-[#38B03B] mt-1 cursor-pointer" onClick={handleComingSoon}>
                    {t('consumer.viewDetails')} <ChevronRight className="inline w-3 h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs">{t('consumer.transactionHistory')}</div>
                  <div className="text-[11px] text-muted-foreground">{t('consumer.last30Days')}</div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div>
                        <div>{t('consumer.mockTransactionName')}</div>
                        <div className="text-[11px] text-muted-foreground">2025-11-2{i} 20:15</div>
                      </div>
                      <div className={i % 2 === 0 ? "text-[#38B03B]" : "text-muted-foreground"}>
                        {i % 2 === 0 ? `+ ${t('common.currencySymbol')}30.00` : `- ${t('common.currencySymbol')}399.00`}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  if (authPhase === 'booting') {
    return (
      <div className="min-h-screen bg-muted/30 pb-20">
        <header className="flex items-center justify-between h-12 px-4 bg-background border-b">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="w-6 h-6" />
        </header>
        <div className="px-4 pt-3 space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <RoleAwareBottomNav forceRole="consumer" />
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-muted/30 pb-20">
        <header className="flex items-center justify-between h-12 px-4 bg-background border-b">
          <div className="text-base font-semibold" data-testid="text-page-title">{t('userCenter.title')}</div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setDrawerOpen(true)}
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </header>

        <div className="px-4 pt-2 pb-4 space-y-2">
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 cursor-pointer" data-testid="avatar-user">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-muted">
                    {user?.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-medium cursor-pointer" data-testid="text-user-name">
                      {user?.displayName || 'User'}
                    </div>
                    {isTestAccount ? (
                      <DropdownMenu open={roleMenuOpen} onOpenChange={setRoleMenuOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-6 px-2 text-[11px] gap-1"
                            data-testid="button-switch-role"
                          >
                            <span>{allRoleOptions.find(r => r.role === activeRole)?.label || t('roles.consumer')}</span>
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
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1"
                        onClick={() => setIdentity((prev) => (prev === "shua" ? "discover" : "shua"))}
                        data-testid="button-switch-identity"
                      >
                        <span>{identity === "shua" ? t('consumer.shuaId') : t('consumer.discoverId')}</span>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <SiLine className="w-3 h-3" />
                      {t('drawer.lineBound')}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{t('consumer.verified')}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-sm font-medium">{t('consumer.myMemberCards')}</div>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0" onClick={handleComingSoon}>
                  {t('common.more')} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {memberships.length > 0 ? memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="min-w-[160px] h-24 rounded-xl bg-gradient-to-br from-[#38B03B] to-emerald-600 text-white p-2.5 flex flex-col justify-between flex-shrink-0 cursor-pointer"
                    onClick={handleComingSoon}
                    data-testid={`card-member-${membership.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6 border border-white/30">
                        <AvatarImage src={membership.storeImageUrl || undefined} />
                        <AvatarFallback className="bg-white/20 text-white text-[10px]">
                          {membership.storeName?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs font-semibold truncate flex-1">{membership.storeName}</div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="opacity-80 text-[11px]">{t('consumer.points')}</span>
                      <span className="text-lg font-semibold">{membership.points.toLocaleString()}</span>
                      <span className="text-[10px] opacity-70 ml-auto">{membership.tier || t('consumer.platinumMember')}</span>
                    </div>
                  </div>
                )) : (
                  <div className="w-full text-center py-4 text-sm text-muted-foreground">
                    {t('consumer.noMemberCards')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex mb-3 gap-1 bg-muted/50 rounded-lg p-1">
                {tabItems.map((item) => (
                  <button
                    key={item.key}
                    className={`flex-1 py-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      tab === item.key
                        ? "bg-background text-[#38B03B] shadow-sm"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => setTab(item.key)}
                    data-testid={`tab-${item.key}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="text-xs">
                {renderTabContent()}
              </div>
            </CardContent>
          </Card>
        </div>

        <RoleAwareBottomNav forceRole="consumer" />
        <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 pb-20">
      <header className="flex items-center h-12 px-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Button>
        </Link>
        <h1 className="flex-1 text-center text-base font-semibold pr-9" data-testid="text-page-title">
          {t('login.title')}
        </h1>
      </header>

      <main className="px-6 py-4 max-w-md mx-auto">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[#38B03B] flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold tracking-tight">shua</span>
          </div>
          <h2 className="text-xl font-bold mb-1" data-testid="text-welcome">
            {t('login.welcome')}
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            {t('login.slogan')}
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-xs text-center text-muted-foreground mb-3">
              {t('login.recommendedMethod')}
            </p>
            <Button
              onClick={handleLineLogin}
              disabled={isLoggingIn}
              className="w-full bg-[#06C755] hover:bg-[#05b34d] text-white h-12 text-base font-medium"
              data-testid="button-line-login"
            >
              <SiLine className="w-5 h-5 mr-2" />
              {isLoggingIn ? t('common.loading') : t('login.lineLogin')}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              {t('login.lineHintWeb')}
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{t('login.orOtherMethods')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-3 mb-8">
          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            className="w-full h-12 text-base font-normal justify-start px-4"
            data-testid="button-google-login"
          >
            <SiGoogle className="w-5 h-5 mr-3 text-[#4285F4]" />
            {t('login.googleLogin')}
          </Button>
          <Button
            variant="outline"
            onClick={handleAppleLogin}
            className="w-full h-12 text-base font-normal justify-start px-4"
            data-testid="button-apple-login"
          >
            <SiApple className="w-5 h-5 mr-3" />
            {t('login.appleLogin')}
          </Button>
          <Button
            variant="outline"
            onClick={handlePhoneLogin}
            className="w-full h-12 text-base font-normal justify-start px-4"
            data-testid="button-phone-login"
          >
            <Menu className="w-5 h-5 mr-3 text-muted-foreground" />
            {t('login.phoneLogin')}
          </Button>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            {t('login.agreementHint')}{' '}
            <Link href="/terms" className="text-primary underline">{t('login.terms')}</Link>
            {' '}{t('login.and')}{' '}
            <Link href="/privacy" className="text-primary underline">{t('login.privacy')}</Link>
          </p>
        </div>
      </main>

      <RoleAwareBottomNav forceRole="consumer" />
    </div>
  );
}
