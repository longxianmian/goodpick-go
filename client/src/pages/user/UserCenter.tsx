import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Globe, Lock, ChevronRight, Smartphone } from 'lucide-react';
import { SiLine, SiGoogle, SiApple } from 'react-icons/si';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserBottomNav } from '@/components/UserBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function UserCenter() {
  const { t } = useLanguage();
  const { user, authPhase, userToken, logoutUser } = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const isLoggedIn = !!userToken && !!user;

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

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-muted/30 pb-20">
        <header className="sticky top-0 z-40 bg-background border-b">
          <div className="flex items-center justify-center h-12 px-4">
            <h1 className="text-base font-semibold" data-testid="text-page-title">{t('userCenter.title')}</h1>
          </div>
        </header>

        <main className="px-4 py-4 max-w-lg mx-auto">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg font-medium bg-primary/10 text-primary">
                    {user?.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold" data-testid="text-user-name">
                    {user?.displayName || 'User'}
                  </h2>
                  <p className="text-sm text-muted-foreground">{t('profile.boundLine')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="p-0">
              <Link href="/my-coupons">
                <div className="flex items-center justify-between p-4 hover-elevate active-elevate-2 cursor-pointer">
                  <span className="text-sm font-medium">{t('userCenter.myCoupons')}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Link href="/settings/language">
                <div className="flex items-center justify-between p-4 hover-elevate active-elevate-2 cursor-pointer border-b">
                  <span className="text-sm">{t('userCenter.language')}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/help">
                <div className="flex items-center justify-between p-4 hover-elevate active-elevate-2 cursor-pointer border-b">
                  <span className="text-sm">{t('userCenter.help')}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/about">
                <div className="flex items-center justify-between p-4 hover-elevate active-elevate-2 cursor-pointer border-b">
                  <span className="text-sm">{t('userCenter.about')}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
              <div 
                className="flex items-center justify-between p-4 hover-elevate active-elevate-2 cursor-pointer text-destructive"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <span className="text-sm">{t('profile.logout')}</span>
                <ChevronRight className="w-5 h-5" />
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
