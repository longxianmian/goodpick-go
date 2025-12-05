import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

declare global {
  interface Window {
    liff: any;
  }
}

interface LineLoginButtonProps {
  returnTo?: string;
  className?: string;
  children?: React.ReactNode;
}

export function LineLoginButton({ returnTo, className, children }: LineLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [liffReady, setLiffReady] = useState(false);
  const [isInLineApp, setIsInLineApp] = useState(false);
  const [liffId, setLiffId] = useState<string>('');
  const { loginUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    const initLiff = async () => {
      try {
        const configRes = await fetch('/api/config');
        const configData = await configRes.json();
        const fetchedLiffId = configData.data?.liffId;
        
        if (fetchedLiffId) {
          setLiffId(fetchedLiffId);
          
          if (!window.liff) {
            const script = document.createElement('script');
            script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
            script.async = true;
            script.onload = async () => {
              try {
                await window.liff.init({ liffId: fetchedLiffId });
                setLiffReady(true);
                setIsInLineApp(window.liff.isInClient());
                
                if (window.liff.isLoggedIn()) {
                  await handleLiffLogin();
                }
              } catch (e) {
                console.error('[LIFF] init error:', e);
              }
            };
            document.body.appendChild(script);
          } else {
            try {
              if (!window.liff.ready) {
                await window.liff.init({ liffId: fetchedLiffId });
              }
              setLiffReady(true);
              setIsInLineApp(window.liff.isInClient());
              
              if (window.liff.isLoggedIn()) {
                await handleLiffLogin();
              }
            } catch (e) {
              console.error('[LIFF] init error:', e);
            }
          }
        }
      } catch (e) {
        console.error('[LineLoginButton] config fetch error:', e);
      }
    };

    initLiff();
  }, []);

  const handleLiffLogin = async () => {
    try {
      setLoading(true);
      const idToken = window.liff.getIDToken();
      
      if (!idToken) {
        throw new Error('No ID token from LIFF');
      }

      const res = await fetch('/api/auth/line/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('userToken', data.token);
        loginUser(data.token, data.user);
        
        toast({
          title: t('common.success'),
          description: `${t('common.welcome')}, ${data.user.displayName}`,
        });

        navigate(returnTo || '/me');
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (e: any) {
      console.error('[LIFF Login] error:', e);
      toast({
        title: t('common.error'),
        description: e.message || 'Login failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);

    try {
      if (liffReady && liffId) {
        if (window.liff.isLoggedIn()) {
          await handleLiffLogin();
        } else {
          const redirectUri = `${window.location.origin}${returnTo || '/me'}`;
          window.liff.login({ redirectUri });
        }
      } else {
        const response = await fetch('/api/auth/line/init-oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            returnTo: returnTo || '/me',
            state: JSON.stringify({ returnTo: returnTo || '/me' })
          }),
        });

        const data = await response.json();

        if (data.success && data.lineLoginUrl) {
          window.location.href = data.lineLoginUrl;
        } else {
          throw new Error(data.message || 'Failed to init OAuth');
        }
      }
    } catch (e: any) {
      console.error('[LineLogin] error:', e);
      toast({
        title: t('common.error'),
        description: e.message || 'Login failed',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const isDev = import.meta.env.DEV || window.location.hostname.includes('replit');

  if (isDev) {
    return (
      <Button 
        className={className}
        onClick={() => navigate('/dev/login')}
        disabled={loading}
        data-testid="button-line-login"
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children || t('auth.goLogin')}
      </Button>
    );
  }

  return (
    <Button 
      className={className}
      onClick={handleLogin}
      disabled={loading}
      data-testid="button-line-login"
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children || (
        <>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          {t('auth.lineLogin')}
        </>
      )}
    </Button>
  );
}
