import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  ensureLiffReady, 
  getLiff, 
  isLiffLoggedIn, 
  isInLineApp, 
  redirectToLineLogin,
  getCampaignFromQuery
} from '@/lib/liffClient';

interface LineLoginButtonProps {
  returnTo?: string;
  className?: string;
  children?: React.ReactNode;
  /** 是否显示外部 H5 样式（大按钮 + 提示文字） */
  showExternalH5Style?: boolean;
}

export function LineLoginButton({ returnTo, className, children, showExternalH5Style }: LineLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [liffReady, setLiffReady] = useState(false);
  const [isInLineClient, setIsInLineClient] = useState(false);
  
  // 快速检测是否在 LINE App 内（不依赖 LIFF SDK）
  const isInLine = isInLineApp();
  const { loginUser } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    const initLiff = async () => {
      try {
        // 如果明确在外部浏览器（非 LINE App），可以跳过 LIFF 初始化加速加载
        if (!isInLine) {
          console.log('[LineLoginButton] Not in LINE App, skip LIFF init for faster loading');
          setLiffReady(false);
          setIsInLineClient(false);
          return;
        }
        
        const state = await ensureLiffReady();
        console.log('[LineLoginButton] LIFF state:', {
          isInClient: state.isInClient,
          isLoggedIn: state.isLoggedIn,
        });
        
        setLiffReady(true);
        setIsInLineClient(state.isInClient);
        
        // 如果在 LINE 应用内且已登录，自动处理登录
        if (state.isInClient && state.isLoggedIn) {
          console.log('[LineLoginButton] In LINE app and logged in, auto-login');
          await handleLiffLogin();
        }
      } catch (e) {
        console.error('[LineLoginButton] LIFF init error:', e);
        // 初始化失败，将使用 OAuth 回退
      }
    };

    initLiff();
  }, [isInLine]);

  const handleLiffLogin = async () => {
    try {
      setLoading(true);
      const liff = getLiff();
      
      if (!liff) {
        throw new Error('LIFF not available');
      }
      
      const idToken = liff.getIDToken();
      
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
          duration: 3000,
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

    // [三进制诊断 Q1] 登录前状态日志
    const liffBeforeLogin = getLiff();
    console.log('[LIFF] before login', {
      href: window.location.href,
      isInClient: liffBeforeLogin && typeof liffBeforeLogin.isInClient === 'function' 
        ? liffBeforeLogin.isInClient() : undefined,
      isLoggedIn: liffBeforeLogin && typeof liffBeforeLogin.isLoggedIn === 'function' 
        ? liffBeforeLogin.isLoggedIn() : undefined,
      liffReady,
      isInLineClient,
      isInLine,
    });

    try {
      // 只有在 LINE 应用内才使用 LIFF 登录
      if ((isInLine || isInLineClient) && liffReady) {
        const liff = getLiff();
        
        if (liff && isLiffLoggedIn()) {
          console.log('[LineLogin] In LINE app, using LIFF login');
          await handleLiffLogin();
        } else if (liff) {
          console.log('[LineLogin] In LINE app, calling liff.login()');
          liff.login();
        } else {
          await handleExternalLogin();
        }
      } else {
        // 外部浏览器使用 OAuth 流程（会尝试拉起 LINE App）
        console.log('[LineLogin] External browser, using OAuth (will try to open LINE App)');
        await handleExternalLogin();
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
  
  /**
   * 外部 H5 登录：直接跳转 LINE OAuth（会尝试拉起 LINE App）
   */
  const handleExternalLogin = async () => {
    const fromChannel = getCampaignFromQuery();
    console.log('[External Login] Redirecting to LINE OAuth, fromChannel:', fromChannel);
    
    redirectToLineLogin({
      redirectPath: returnTo || window.location.pathname,
      fromChannel,
    });
  };

  const isDev = import.meta.env.DEV || window.location.hostname.includes('replit');

  // 开发环境：只有在非 LINE App 内才显示测试登录选项
  // 如果在 LINE App 内打开，即使是开发环境也使用正常的 LIFF 登录
  if (isDev && !isInLine) {
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

  // LINE 图标 SVG
  const LineIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
    </svg>
  );

  // 外部 H5 环境（非 LINE App 内）且需要显示特殊样式
  const shouldShowExternalStyle = showExternalH5Style && !isInLine && !isInLineClient;

  if (shouldShowExternalStyle) {
    return (
      <div className="flex flex-col items-center gap-4 w-full" data-testid="external-login-container">
        <Button 
          className={`w-full h-14 text-lg bg-[#06C755] hover:bg-[#05B34D] text-white ${className || ''}`}
          onClick={handleLogin}
          disabled={loading}
          data-testid="button-line-login-external"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <>
              <LineIcon />
              <span>{t('auth.lineLoginExternal') || '用 LINE 登录'}</span>
              <ExternalLink className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center px-4">
          {t('auth.externalLoginHint') || '从抖音 / FB / IG 打开的用户，请点击上方按钮，用 LINE 授权后继续使用本服务'}
        </p>
      </div>
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
          <LineIcon />
          {t('auth.lineLogin')}
        </>
      )}
    </Button>
  );
}
