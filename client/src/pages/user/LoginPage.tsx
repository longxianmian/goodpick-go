import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2, ArrowLeft, Smartphone, Mail, Globe } from 'lucide-react';
import { SiLine, SiGoogle, SiApple } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type LoginMethod = 'line' | 'google' | 'apple' | 'phone';

export default function LoginPage() {
  const { t } = useLanguage();
  const { user, authPhase } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [loadingMethod, setLoadingMethod] = useState<LoginMethod | null>(null);
  const [isInLiff, setIsInLiff] = useState(false);

  useEffect(() => {
    const checkLiffEnvironment = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isLine = userAgent.includes('line');
      setIsInLiff(isLine);
    };
    checkLiffEnvironment();
  }, []);

  useEffect(() => {
    if (authPhase === 'ready' && user) {
      navigate('/me');
    }
  }, [authPhase, user, navigate]);

  const handleLineLogin = async () => {
    try {
      setLoadingMethod('line');
      console.log('[LoginPage] 发起 LINE OAuth 登录');
      
      const res = await fetch('/api/auth/line/init-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });

      const data = await res.json();

      if (!data.success || !data.redirectUrl) {
        throw new Error(data.message || 'Failed to initialize OAuth');
      }

      console.log('[LoginPage] 跳转到 LINE 授权页面');
      window.location.href = data.redirectUrl;
    } catch (error: any) {
      console.error('[LoginPage] LINE 登录失败:', error);
      setLoadingMethod(null);
      toast({
        title: t('common.error'),
        description: error.message || t('login.failed'),
        variant: 'destructive',
      });
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingMethod('google');
    toast({
      title: t('login.comingSoon'),
      description: t('login.googleComingSoon'),
    });
    setTimeout(() => setLoadingMethod(null), 1000);
  };

  const handleAppleLogin = async () => {
    setLoadingMethod('apple');
    toast({
      title: t('login.comingSoon'),
      description: t('login.appleComingSoon'),
    });
    setTimeout(() => setLoadingMethod(null), 1000);
  };

  const handlePhoneLogin = async () => {
    setLoadingMethod('phone');
    toast({
      title: t('login.comingSoon'),
      description: t('login.phoneComingSoon'),
    });
    setTimeout(() => setLoadingMethod(null), 1000);
  };

  const handleBack = () => {
    navigate('/me');
  };

  if (authPhase === 'booting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-12 px-4">
          <button 
            onClick={handleBack}
            className="p-1 -ml-1"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-base font-medium pr-6" data-testid="text-page-title">
            {t('login.title')}
          </h1>
        </div>
      </header>

      <main className="px-4 py-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-3xl font-bold text-primary-foreground">刷</span>
          </div>
          <h2 className="text-xl font-semibold mb-2" data-testid="text-welcome">
            {t('login.welcome')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('login.subtitle')}
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="text-xs text-muted-foreground text-center mb-2">
              {t('login.recommendedMethod')}
            </div>

            {isInLiff ? (
              <Button
                className="w-full h-12 bg-[#06C755] hover:bg-[#05b34d] text-white"
                onClick={handleLineLogin}
                disabled={loadingMethod !== null}
                data-testid="button-login-line"
              >
                {loadingMethod === 'line' ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <SiLine className="w-5 h-5 mr-2" />
                )}
                {t('login.lineOneClick')}
              </Button>
            ) : (
              <Button
                className="w-full h-12 bg-[#06C755] hover:bg-[#05b34d] text-white"
                onClick={handleLineLogin}
                disabled={loadingMethod !== null}
                data-testid="button-login-line"
              >
                {loadingMethod === 'line' ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <SiLine className="w-5 h-5 mr-2" />
                )}
                {t('login.lineLogin')}
              </Button>
            )}

            <div className="text-[11px] text-center text-muted-foreground">
              {isInLiff ? t('login.lineHintLiff') : t('login.lineHintWeb')}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 my-6">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">{t('login.orOtherMethods')}</span>
          <Separator className="flex-1" />
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleGoogleLogin}
            disabled={loadingMethod !== null}
            data-testid="button-login-google"
          >
            {loadingMethod === 'google' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <SiGoogle className="w-5 h-5 mr-2" />
            )}
            {t('login.googleLogin')}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleAppleLogin}
            disabled={loadingMethod !== null}
            data-testid="button-login-apple"
          >
            {loadingMethod === 'apple' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <SiApple className="w-5 h-5 mr-2" />
            )}
            {t('login.appleLogin')}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handlePhoneLogin}
            disabled={loadingMethod !== null}
            data-testid="button-login-phone"
          >
            {loadingMethod === 'phone' ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Smartphone className="w-5 h-5 mr-2" />
            )}
            {t('login.phoneLogin')}
          </Button>
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-xs text-center text-muted-foreground">
            {t('login.termsNotice')}
          </p>
          <div className="flex justify-center gap-4 text-xs">
            <button 
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => navigate('/terms')}
              data-testid="link-terms"
            >
              {t('login.termsLink')}
            </button>
            <button 
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => navigate('/privacy')}
              data-testid="link-privacy"
            >
              {t('login.privacyLink')}
            </button>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Globe className="w-4 h-4" />
            <span>{t('login.secureLogin')}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
