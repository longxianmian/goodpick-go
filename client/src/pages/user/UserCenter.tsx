import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  ArrowLeft, 
  Globe, 
  Lock, 
  ChevronRight, 
  Smartphone,
  Ticket,
  Store,
  Sparkles,
  Settings,
  HelpCircle,
  Info,
  Bell,
  Shield,
  Briefcase,
  QrCode,
  Star,
  Heart,
  MessageSquare,
  Clock,
  Gift
} from 'lucide-react';
import { SiLine, SiGoogle, SiApple } from 'react-icons/si';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function UserCenter() {
  const { t } = useLanguage();
  const { user, authPhase, userToken, logoutUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const isLoggedIn = !!userToken && !!user;
  
  // TODO: 从后端API获取真实数据
  const hasDiscoverId = false;
  const hasShuaId = false;
  const isStaff = true; // 暂时设为true以显示工作台入口
  const couponCount = 3;
  const favoriteCount = 12;
  const followCount = 5;
  const historyCount = 28;

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
        <UserBottomNav />
      </div>
    );
  }

  const handleComingSoon = () => {
    toast({
      title: t('common.comingSoon'),
      description: t('common.featureInDevelopment'),
    });
  };

  const getIdentityBadges = () => {
    const badges = [];
    badges.push(
      <Badge key="line" variant="outline" className="text-[10px] gap-1">
        <SiLine className="w-3 h-3" />
        {t('drawer.lineBound')}
      </Badge>
    );
    if (hasDiscoverId) {
      badges.push(
        <Badge key="discover" variant="secondary" className="text-[10px] gap-1">
          <Store className="w-3 h-3" />
          {t('drawer.discoverOpened')}
        </Badge>
      );
    }
    if (hasShuaId) {
      badges.push(
        <Badge key="shua" variant="secondary" className="text-[10px] gap-1">
          <Sparkles className="w-3 h-3" />
          {t('drawer.shuaOpened')}
        </Badge>
      );
    }
    return badges;
  };

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-muted/30 pb-20">
        {/* 顶部用户卡片区域 - 带渐变背景 */}
        <div className="bg-gradient-to-b from-[#38B03B] to-[#2d8c2f] text-white">
          <header className="flex items-center justify-between h-12 px-4">
            <div className="w-9" />
            <h1 className="text-base font-semibold" data-testid="text-page-title">
              {t('userCenter.title')}
            </h1>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => navigate('/settings')}
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
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
                  {getIdentityBadges()}
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
          {/* 员工工作台入口 */}
          {isStaff && (
            <Card className="border-[#38B03B]/30 bg-gradient-to-r from-[#38B03B]/5 to-transparent">
              <CardContent className="p-0">
                <Link href="/staff">
                  <div className="flex items-center gap-4 p-4 cursor-pointer hover-elevate active-elevate-2" data-testid="link-staff-workstation">
                    <div className="w-12 h-12 rounded-xl bg-[#38B03B] flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{t('userCenter.staffWorkstation')}</div>
                      <div className="text-xs text-muted-foreground">{t('userCenter.staffWorkstationDesc')}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* 我的服务 */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-semibold mb-3">{t('userCenter.myServices')}</div>
              <div className="grid grid-cols-4 gap-4">
                <Link href="/my-coupons">
                  <div className="flex flex-col items-center gap-1.5 cursor-pointer" data-testid="link-my-coupons">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-orange-500" />
                    </div>
                    <span className="text-xs">{t('userCenter.coupons')}</span>
                  </div>
                </Link>
                <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={handleComingSoon}>
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-red-500" />
                  </div>
                  <span className="text-xs">{t('userCenter.favorites')}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={handleComingSoon}>
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-xs">{t('userCenter.history')}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={handleComingSoon}>
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Star className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="text-xs">{t('userCenter.reviews')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 创作者中心 */}
          <Card>
            <CardContent className="p-0">
              <div className="px-4 pt-4 pb-2">
                <div className="text-sm font-semibold">{t('userCenter.creatorCenter')}</div>
              </div>
              <div 
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover-elevate active-elevate-2"
                onClick={handleComingSoon}
              >
                <Store className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm">{t('drawer.applyDiscover')}</div>
                  <div className="text-[11px] text-muted-foreground">{t('drawer.applyDiscoverDesc')}</div>
                </div>
                {hasDiscoverId ? (
                  <Badge variant="secondary" className="text-[10px]">{t('drawer.opened')}</Badge>
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <Separator className="mx-4" />
              <div 
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover-elevate active-elevate-2"
                onClick={handleComingSoon}
              >
                <Sparkles className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm">{t('drawer.applyShua')}</div>
                  <div className="text-[11px] text-muted-foreground">{t('drawer.applyShuaDesc')}</div>
                </div>
                {hasShuaId ? (
                  <Badge variant="secondary" className="text-[10px]">{t('drawer.opened')}</Badge>
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* 设置与帮助 */}
          <Card>
            <CardContent className="p-0">
              <Link href="/settings/language">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover-elevate active-elevate-2">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-sm">{t('userCenter.language')}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
              <Separator className="mx-4" />
              <div 
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover-elevate active-elevate-2"
                onClick={handleComingSoon}
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 text-sm">{t('userCenter.notifications')}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <Separator className="mx-4" />
              <div 
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover-elevate active-elevate-2"
                onClick={handleComingSoon}
              >
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 text-sm">{t('drawer.privacy')}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <Separator className="mx-4" />
              <Link href="/help">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover-elevate active-elevate-2">
                  <HelpCircle className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-sm">{t('userCenter.help')}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
              <Separator className="mx-4" />
              <Link href="/about">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover-elevate active-elevate-2">
                  <Info className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-sm">{t('userCenter.about')}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* 退出登录 */}
          <Card>
            <CardContent className="p-0">
              <div 
                className="flex items-center justify-center gap-2 px-4 py-3 cursor-pointer hover-elevate active-elevate-2 text-destructive"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <span className="text-sm font-medium">{t('profile.logout')}</span>
              </div>
            </CardContent>
          </Card>
        </main>

        <UserBottomNav />
      </div>
    );
  }

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

      <UserBottomNav />
    </div>
  );
}
