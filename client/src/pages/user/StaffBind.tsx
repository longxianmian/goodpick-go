import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface PresetInfo {
  storeName: string;
  storeAddress: string;
  staffName: string;
  staffId: string;
  phone: string;
}

export default function StaffBind() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const [token, setToken] = useState('');
  const [presetInfo, setPresetInfo] = useState<PresetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState(false);
  const [bindSuccess, setBindSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('token');
    const urlLang = params.get('lang');

    // Set language from URL if provided
    if (urlLang && ['zh-cn', 'en-us', 'th-th'].includes(urlLang)) {
      setLanguage(urlLang as 'zh-cn' | 'en-us' | 'th-th');
    }

    if (!authToken) {
      setError(t('staffBind.missingToken'));
      setLoading(false);
      return;
    }

    setToken(authToken);
    verifyToken(authToken);

    // Check if LIFF is already logged in (user came back from LINE OAuth)
    // Wait a bit for LIFF to initialize
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).liff) {
        const liff = (window as any).liff;
        if (liff.isLoggedIn()) {
          // User is already logged in, execute binding automatically
          executeBinding(authToken);
        }
      }
    }, 1500);
  }, [setLanguage]);

  const verifyToken = async (authToken: string) => {
    try {
      const res = await fetch(`/api/staff/bind/verify?token=${encodeURIComponent(authToken)}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.message || t('staffBind.invalidToken'));
        setLoading(false);
        return;
      }

      setPresetInfo(data.data);
      setLoading(false);
    } catch (err) {
      console.error('Verify token error:', err);
      setError(t('staffBind.invalidToken'));
      setLoading(false);
    }
  };

  const executeBinding = async (authToken: string) => {
    try {
      setBinding(true);

      if (typeof window !== 'undefined' && (window as any).liff) {
        const liff = (window as any).liff;

        // Get ID token
        const idToken = liff.getIDToken();
        if (!idToken) {
          throw new Error('Failed to get LINE ID token');
        }

        // Execute binding
        const res = await fetch('/api/staff/bind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authToken: authToken,
            lineIdToken: idToken,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          setError(data.message || t('staffBind.failed'));
          toast({
            title: t('staffBind.failed'),
            description: data.message || t('staffBind.phoneVerificationDesc'),
            variant: 'destructive',
          });
          setBinding(false);
          return;
        }

        setBindSuccess(true);
        toast({
          title: t('staffBind.success'),
          description: t('staffBind.successDesc'),
        });

        // Redirect to staff home after 2 seconds
        setTimeout(() => {
          navigate('/staff/redeem');
        }, 2000);
      }
    } catch (err) {
      console.error('Binding error:', err);
      setError(t('staffBind.failed'));
      setBinding(false);
    }
  };

  const handleLineLogin = async () => {
    try {
      setBinding(true);

      // Check if LIFF is available
      if (typeof window !== 'undefined' && (window as any).liff) {
        const liff = (window as any).liff;

        console.log('handleLineLogin called', {
          isLoggedIn: liff.isLoggedIn(),
          token,
          language,
        });

        if (!liff.isLoggedIn()) {
          // Save bind token and current URL params to localStorage
          console.log('Saving to localStorage and calling liff.login()');
          localStorage.setItem('staff_bind_token', token);
          localStorage.setItem('staff_bind_lang', language);
          localStorage.setItem('staff_bind_pending', 'true');
          
          // Redirect to LINE login (will use default LIFF endpoint)
          liff.login();
          return;
        }

        // Already logged in, execute binding directly
        console.log('Already logged in, executing binding...');
        executeBinding(token);
      } else {
        // LIFF not available, show error
        setError(t('staffBind.mustUseLine'));
        toast({
          title: t('common.error'),
          description: t('staffBind.mustUseLine'),
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('LINE login error:', err);
      setError(err instanceof Error ? err.message : t('staffBind.failed'));
      toast({
        title: t('common.error'),
        description: t('staffBind.failed'),
        variant: 'destructive',
      });
    } finally {
      setBinding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>{t('staffBind.failed')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={() => navigate('/')}
              data-testid="button-back-home"
            >
              {t('staffBind.backHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bindSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle>{t('staffBind.success')}</CardTitle>
            <CardDescription>
              {t('staffBind.successDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {presetInfo && (
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('staffBind.store')}:</span>
                  <span className="font-medium">{presetInfo.storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('staffBind.name')}:</span>
                  <span className="font-medium">{presetInfo.staffName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('staffBind.id')}:</span>
                  <span className="font-medium">{presetInfo.staffId}</span>
                </div>
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground">
              {t('staffBind.redirecting')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>{t('staffBind.title')}</CardTitle>
          <CardDescription>
            {t('staffBind.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {presetInfo && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{t('staffBind.store')}</div>
                  <div className="font-medium">{presetInfo.storeName}</div>
                  <div className="text-sm text-muted-foreground">{presetInfo.storeAddress}</div>
                </div>
                <div className="border-t pt-3">
                  <div className="text-xs text-muted-foreground mb-1">{t('staffBind.staffInfo')}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('staffBind.name')}:</span>
                      <span className="ml-2 font-medium">{presetInfo.staffName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('staffBind.id')}:</span>
                      <span className="ml-2 font-medium">{presetInfo.staffId}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-muted-foreground">{t('staffBind.phone')}:</span>
                    <span className="ml-2 font-medium">{presetInfo.phone}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <div className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</div>
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <div className="font-medium mb-1">{t('staffBind.phoneVerificationRequired')}</div>
                    <div className="text-blue-700 dark:text-blue-300">
                      {t('staffBind.phoneVerificationDesc')}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleLineLogin}
                disabled={binding}
                data-testid="button-line-login"
              >
                {binding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('staffBind.authorizing')}
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    {t('staffBind.authorizeButton')}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
