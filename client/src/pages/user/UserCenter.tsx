import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  ArrowLeft, 
  Globe, 
  Lock, 
  ChevronRight, 
  Smartphone,
  Ticket,
  ShoppingCart,
  Receipt,
  Wallet,
  CreditCard,
  Coins,
  Gift,
  Menu
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

export default function UserCenter() {
  const { t } = useLanguage();
  const { user, authPhase, userToken } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const isLoggedIn = !!userToken && !!user;
  
  // TODO: 从后端API获取真实数据
  const couponCount = 3;
  const favoriteCount = 12;
  const followCount = 5;
  const historyCount = 28;
  
  // 会员卡数据（待接入后端）
  const memberCards: { id: number; storeName: string; storeImage: string; level: string; points: number }[] = [];
  
  // 钱包数据（待接入后端）
  const walletData = {
    points: 1280,
    coupons: 3,
    balance: 0,
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

  if (authPhase === 'booting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 pb-20">
        <header className="flex items-center h-12 px-4">
          <Skeleton className="w-6 h-6" />
          <Skeleton className="h-5 w-16 mx-auto" />
        </header>
        <div className="flex flex-col items-center justify-center px-6 py-8">
          <Skeleton className="w-20 h-20 rounded-2xl mb-6" />
          <Skeleton className="h-7 w-40 mb-2" />
          <Skeleton className="h-5 w-56" />
        </div>
        <RoleAwareBottomNav forceRole="consumer" />
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-muted/30 pb-20">
        {/* 顶部用户卡片区域 - 带渐变背景 */}
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
              {t('userCenter.title')}
            </h1>
            <div className="w-9" />
          </header>
          
          <div className="px-4 py-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-2 border-white/30">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl font-bold bg-white/20 text-white">
                  {user?.displayName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1" data-testid="text-user-name">
                  {user?.displayName || 'User'}
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px] gap-1 bg-white/10 border-white/30 text-white">
                    <SiLine className="w-3 h-3" />
                    {t('drawer.lineBound')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          {/* 数据统计栏 */}
          <div className="flex items-center justify-around py-4 bg-white/10">
            <Link href="/my-coupons">
              <div className="text-center cursor-pointer" data-testid="link-coupons-count">
                <div className="text-xl font-bold">{couponCount}</div>
                <div className="text-xs opacity-90">{t('userCenter.myCoupons')}</div>
              </div>
            </Link>
            <div className="text-center cursor-pointer" onClick={handleComingSoon}>
              <div className="text-xl font-bold">{favoriteCount}</div>
              <div className="text-xs opacity-90">{t('userCenter.favorites')}</div>
            </div>
            <div className="text-center cursor-pointer" onClick={handleComingSoon}>
              <div className="text-xl font-bold">{followCount}</div>
              <div className="text-xs opacity-90">{t('userCenter.following')}</div>
            </div>
            <div className="text-center cursor-pointer" onClick={handleComingSoon}>
              <div className="text-xl font-bold">{historyCount}</div>
              <div className="text-xs opacity-90">{t('userCenter.history')}</div>
            </div>
          </div>
        </div>

        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
          {/* 会员卡区域 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#38B03B]" />
                  <span className="text-sm font-semibold">{t('consumer.memberCards')}</span>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleComingSoon}>
                  {t('consumer.viewAll')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              {memberCards.length > 0 ? (
                <div className="space-y-2">
                  {memberCards.map((card) => (
                    <div 
                      key={card.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={card.storeImage} />
                        <AvatarFallback>{card.storeName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{card.storeName}</div>
                        <div className="text-xs text-muted-foreground">{card.level}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-amber-600">{card.points}</div>
                        <div className="text-[10px] text-muted-foreground">{t('consumer.points')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <div className="text-sm">{t('consumer.noMemberCards')}</div>
                  <div className="text-xs mt-1">{t('consumer.joinMerchant')}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 购物区域 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="w-5 h-5 text-[#38B03B]" />
                <span className="text-sm font-semibold">{t('consumer.shopping')}</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div 
                  className="flex flex-col items-center gap-1.5 cursor-pointer"
                  onClick={handleComingSoon}
                  data-testid="link-cart"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-blue-500" />
                  </div>
                  <span className="text-xs">{t('consumer.cart')}</span>
                </div>
                <div 
                  className="flex flex-col items-center gap-1.5 cursor-pointer"
                  onClick={handleComingSoon}
                  data-testid="link-orders"
                >
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className="text-xs">{t('consumer.orders')}</span>
                </div>
                <Link href="/my-coupons">
                  <div 
                    className="flex flex-col items-center gap-1.5 cursor-pointer"
                    data-testid="link-my-coupons"
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Ticket className="w-6 h-6 text-purple-500" />
                    </div>
                    <span className="text-xs">{t('consumer.coupons')}</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 钱包区域 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#38B03B]" />
                  <span className="text-sm font-semibold">{t('consumer.wallet')}</span>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleComingSoon}>
                  {t('consumer.viewAll')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div 
                  className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 cursor-pointer hover-elevate"
                  onClick={handleComingSoon}
                >
                  <Coins className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                  <div className="text-lg font-bold text-amber-600">{walletData.points}</div>
                  <div className="text-[10px] text-muted-foreground">{t('consumer.points')}</div>
                </div>
                <div 
                  className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 cursor-pointer hover-elevate"
                  onClick={handleComingSoon}
                >
                  <Gift className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                  <div className="text-lg font-bold text-purple-600">{walletData.coupons}</div>
                  <div className="text-[10px] text-muted-foreground">{t('consumer.coupons')}</div>
                </div>
                <div 
                  className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20 cursor-pointer hover-elevate"
                  onClick={handleComingSoon}
                >
                  <Wallet className="w-6 h-6 mx-auto mb-1 text-green-500" />
                  <div className="text-lg font-bold text-green-600">{t('common.currencySymbol')}{walletData.balance}</div>
                  <div className="text-[10px] text-muted-foreground">{t('consumer.balance')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        <RoleAwareBottomNav forceRole="consumer" />
        <DrawerMenu open={drawerOpen} onOpenChange={setDrawerOpen} />
      </div>
    );
  }

  // 未登录状态 - 显示登录页面
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 pb-20">
      <header className="flex items-center h-12 px-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
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
            <Smartphone className="w-5 h-5 mr-3 text-muted-foreground" />
            {t('login.phoneLogin')}
          </Button>
        </div>

        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground mb-2">
            {t('login.termsNotice')}
          </p>
          <div className="flex items-center justify-center gap-3 text-xs">
            <a href="/terms" className="text-primary hover:underline" data-testid="link-terms">
              {t('login.termsLink')}
            </a>
            <a href="/privacy" className="text-primary hover:underline" data-testid="link-privacy">
              {t('login.privacyLink')}
            </a>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Globe className="w-4 h-4" />
          <Lock className="w-4 h-4" />
          <span>{t('login.secureLogin')}</span>
        </div>
      </main>

      <RoleAwareBottomNav forceRole="consumer" />
    </div>
  );
}
